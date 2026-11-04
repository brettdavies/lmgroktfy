import { afterAll, describe, expect, test } from 'bun:test';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SECURITY_HEADERS } from '../../src/lib/security-headers.ts';

const ROOT = resolve(import.meta.dir, '../../../..');
const SMOKE = join(ROOT, 'scripts/release/surface-smoke.sh');
const PREFLIGHT = join(ROOT, 'scripts/release/preflight.sh');
const STAGING_CURL = join(ROOT, 'scripts/release/staging-curl.sh');
const RUNBOOK = readFileSync(join(ROOT, 'RELEASES-PREFLIGHT.md'), 'utf-8');

const STAGING = 'https://dev.lmgroktfy.com';
const ID = 'dummy-id.access';
const SECRET = 'cfast_dummysecret';
const ID_HEADER = `CF-Access-Client-Id: ${ID}"`;
const SECRET_HEADER = `CF-Access-Client-Secret: ${SECRET}"`;
const CREDENTIALS = { CF_ACCESS_CLIENT_ID: ID, CF_ACCESS_CLIENT_SECRET: SECRET };
const SMOKE_REQUESTS = 7;
const ACCESS_LOGIN = '302 https://team.cloudflareaccess.com/cdn-cgi/access/login/dev.lmgroktfy.com';
const NOT_ACCESS = [
  ['the page itself', '200 '],
  ['a redirect that stays on the host', '302 https://dev.lmgroktfy.com/elsewhere'],
  ['a redirect to another host that is not Access', '302 https://example.com/'],
  ['a 403', '403 '],
  ['a 401', '401 '],
  ['no answer', '000 '],
];
const BAD_VALUES = [
  ['a quote', 'abc"def'],
  ['a newline that adds a url', 'abc\nurl = "http://127.0.0.1:9/x"'],
  ['a space', 'abc def'],
  ['a backslash', 'abc\\def'],
];

const SCRATCH = mkdtempSync(join(tmpdir(), 'release-access-token-'));
const STUB_LOG = join(SCRATCH, 'stub.log');
const STUBS = join(SCRATCH, 'stubs');
const OP_ONLY = join(SCRATCH, 'op-only');
mkdirSync(STUBS);
mkdirSync(OP_ONLY);

function stub(name: string, body: string, dir = STUBS): void {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o700);
}

// Records what each curl call was handed, including the config it read from -K and
// whether that config came through a pipe, and makes no network call. A call with
// no -K answers $STUB_HEADERLESS, the `<status> <redirect>` a gated host gives a
// request with no credentials. A call with -K answers $STUB_RESPONSE when it is set,
// and otherwise like a refused connection.
stub(
  'curl',
  `{
  printf 'CALL first=%s secret-env=%s\\n' "\${1:-}" "\${CF_ACCESS_CLIENT_SECRET:+set}"
  printf 'ARGV %s\\n' "$*"
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "-K" ]]; then
      if [[ -p "$2" ]]; then echo 'CONFIG-KIND=pipe'; else echo 'CONFIG-KIND=file'; fi
      cat "$2"
      config=yes
    fi
    shift
  done
} >>"$STUB_LOG"
if [[ -z "\${config:-}" && -n "\${STUB_HEADERLESS:-}" ]]; then
  printf '%s' "$STUB_HEADERLESS"
  exit 0
fi
if [[ -n "\${config:-}" && -n "\${STUB_RESPONSE+set}" ]]; then
  printf '%s' "$STUB_RESPONSE"
  exit 0
fi
printf '000'
exit 7`
);
// With $STUB_NESTED_PREFLIGHT set, the test suite step runs a whole inner preflight
// and then fails, the shape of this test file running under `preflight.sh mechanics`.
stub(
  'bun',
  `printf 'BUN secret-env=%s\\n' "\${CF_ACCESS_CLIENT_SECRET:+set}" >>"$STUB_LOG"
if [[ -n "\${STUB_NESTED_PREFLIGHT:-}" && "$*" == "run test:all" ]]; then
  env -u STUB_NESTED_PREFLIGHT "$STUB_NESTED_PREFLIGHT" mechanics >/dev/null 2>&1
  echo outer-failure-detail
  exit 1
fi`
);
stub('jaq', 'exit 0');
stub(
  'mktemp',
  `printf 'MKTEMP secret-env=%s\\n' "\${CF_ACCESS_CLIENT_SECRET:+set}" >>"$STUB_LOG"
exec "$REAL_MKTEMP" "$@"`
);
const OP_STUB = `printf 'OP %s\\n' "$2" >>"$STUB_LOG"
if [[ -n "\${STUB_OP_FAIL:-}" ]]; then exit 1; fi
case "$2" in
  */client_id) printf '%s\\n' '${ID}' ;;
  */client_secret) printf '%s\\n' "\${STUB_OP_SECRET:-${SECRET}}" ;;
  *) exit 1 ;;
esac`;
stub('op', OP_STUB);
stub('op', OP_STUB, OP_ONLY);

afterAll(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

type Run = { exitCode: number; output: string; log: string[] };

function run(cmd: string[], env: Record<string, string> = {}, cwd = ROOT): Run {
  writeFileSync(STUB_LOG, '');
  const child = Bun.spawnSync({
    cmd,
    cwd,
    env: {
      PATH: `${STUBS}:${process.env.PATH}`,
      HOME: process.env.HOME ?? SCRATCH,
      STUB_LOG,
      STUB_HEADERLESS: ACCESS_LOGIN,
      REAL_MKTEMP: Bun.which('mktemp') ?? 'mktemp',
      ...env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: child.exitCode,
    output: `${child.stdout.toString()}${child.stderr.toString()}`,
    log: readFileSync(STUB_LOG, 'utf-8').split('\n'),
  };
}

function count(lines: string[], matches: (line: string) => boolean): number {
  return lines.filter(matches).length;
}

const isCall = (line: string) => line.startsWith('CALL ');
const isArgv = (line: string) => line.startsWith('ARGV ');
const namesHeader = (line: string) => line.includes('CF-Access-Client');
const argvHoldsSecret = (line: string) => isArgv(line) && line.includes(SECRET);

function expectHeadersOnEveryRequest(log: string[]): void {
  expect(count(log, (line) => line.endsWith(ID_HEADER))).toBe(SMOKE_REQUESTS);
  expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(SMOKE_REQUESTS);
}

function runbookBlock(pattern: RegExp): string {
  const match = RUNBOOK.match(pattern);
  if (!match) {
    throw new Error(`RELEASES-PREFLIGHT.md has no block matching ${pattern}`);
  }
  return match[0];
}

function git(args: string[]): void {
  Bun.spawnSync(['git', ...args]);
}

// A throwaway repository holding the release scripts, for runs that must not touch
// this checkout: drift.sh, which `all` runs, fetches.
function scriptsInScratchRepo(name: string): string {
  const copy = join(SCRATCH, name);
  cpSync(join(ROOT, 'scripts/release'), join(copy, 'scripts/release'), { recursive: true });
  git(['init', '-q', copy]);
  git([
    '-C',
    copy,
    '-c',
    'user.name=test',
    '-c',
    'user.email=test@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--allow-empty',
    '-qm',
    'scratch',
  ]);
  return copy;
}

describe('surface-smoke.sh Access headers', () => {
  test('reach the staging URL on every request, through a pipe behind -q', () => {
    const { log } = run([SMOKE, STAGING], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line === 'CONFIG-KIND=pipe')).toBe(SMOKE_REQUESTS);
    expect(count(log, (line) => line === 'CONFIG-KIND=file')).toBe(0);
    expect(count(log, (line) => isCall(line) && !line.startsWith('CALL first=-q '))).toBe(0);
    expect(count(log, argvHoldsSecret)).toBe(0);
    expect(count(log, (line) => line.includes('secret-env=set'))).toBe(0);
  });

  test('accept a trailing slash on the staging URL, with no doubled slash in the requests', () => {
    const { log } = run([SMOKE, `${STAGING}/`], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => isArgv(line) && line.endsWith(`${STAGING}/llms.txt`))).toBe(1);
  });

  test('go out only after the Worker route answers with the Access login, without them', () => {
    const { exitCode, log } = run([SMOKE, STAGING], CREDENTIALS);
    const argvs = log.filter(isArgv);

    expect(argvs[0]).not.toContain('-K');
    expect(argvs[0]?.endsWith(`${STAGING}/api/grok`)).toBe(true);
    expect(count(argvs, (line) => line.includes('-K'))).toBe(SMOKE_REQUESTS);
    // Every credentialed request fails under this stub, the shape of a rejected token.
    expect(exitCode).toBe(1);
  });

  test.each(NOT_ACCESS)(
    'are withheld, and the run fails, when the host answers without them with %s',
    (_name, answer) => {
      const { exitCode, log, output } = run([SMOKE, STAGING], {
        ...CREDENTIALS,
        STUB_HEADERLESS: answer,
      });

      expect(exitCode).toBe(1);
      expect(output).toContain('so the token was withheld');
      expect(count(log, namesHeader)).toBe(0);
    }
  );

  test.each([
    ['production', 'https://lmgroktfy.com'],
    ['plain http', 'http://dev.lmgroktfy.com'],
    ['a look-alike suffix', 'https://dev.lmgroktfy.com.evil.example'],
    ['userinfo naming staging', 'https://dev.lmgroktfy.com@evil.example'],
    ['a path naming staging', 'https://evil.example/dev.lmgroktfy.com'],
    ['a curl URL glob', 'https://dev.lmgroktfy.com:{443/,x@evil.example/}'],
    ['another port', 'https://dev.lmgroktfy.com:8443'],
    ['another spelling of the host', 'https://DEV.lmgroktfy.com'],
  ])('stay off %s, with a warning', (_name, target) => {
    const { log, output } = run([SMOKE, target], CREDENTIALS);

    expect(count(log, (line) => line.startsWith('CALL first=-q '))).toBe(SMOKE_REQUESTS);
    expect(count(log, namesHeader)).toBe(0);
    expect(output).toContain('sending no Access headers');
  });

  test.each([
    ['id', { CF_ACCESS_CLIENT_ID: ID }],
    ['secret', { CF_ACCESS_CLIENT_SECRET: SECRET }],
  ])('are not sent when only the %s is set', (_name, env) => {
    const { log, output } = run([SMOKE, STAGING], env);

    expect(count(log, (line) => line.startsWith('CALL first=-q '))).toBe(SMOKE_REQUESTS);
    expect(count(log, namesHeader)).toBe(0);
    expect(output).not.toContain('sending no Access headers');
  });

  test('do not print under bash -x', () => {
    const { log, output } = run(['bash', '-x', SMOKE, STAGING], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(ID);
  });

  test.each(BAD_VALUES)(
    'reject a secret holding %s before any request, as a counted failure',
    (_name, value) => {
      const resultFile = join(SCRATCH, 'result');
      writeFileSync(resultFile, '');

      const { exitCode, log, output } = run([SMOKE, STAGING, '--result-file', resultFile], {
        CF_ACCESS_CLIENT_ID: ID,
        CF_ACCESS_CLIENT_SECRET: value,
      });

      expect(exitCode).toBe(2);
      expect(readFileSync(resultFile, 'utf-8')).toBe('0 1 0\n');
      expect(count(log, isCall)).toBe(0);
      expect(output).not.toContain('abc');
    }
  );

  test('reject a malformed id the same way', () => {
    const { exitCode, log } = run([SMOKE, STAGING], {
      CF_ACCESS_CLIENT_ID: 'abc"def',
      CF_ACCESS_CLIENT_SECRET: SECRET,
    });

    expect(exitCode).toBe(2);
    expect(count(log, isCall)).toBe(0);
  });

  test('accept the id and secret formats Cloudflare issues', () => {
    const { log } = run([SMOKE, STAGING], {
      CF_ACCESS_CLIENT_ID: '0123456789abcdef0123456789abcdef.access',
      CF_ACCESS_CLIENT_SECRET: 'cfast_AbC123xyzAbC123xyzAbC123xyzAbC123xyzAbCd12345678',
    });

    expect(count(log, (line) => line.includes('CF-Access-Client-Secret'))).toBe(SMOKE_REQUESTS);
  });
});

describe('preflight.sh', () => {
  test('passes the token to the staging smoke and to nothing the delegation helper starts', () => {
    const { log } = run([PREFLIGHT, 'surface-smoke'], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line.startsWith('MKTEMP '))).toBeGreaterThan(0);
    expect(count(log, (line) => line.includes('secret-env=set'))).toBe(0);
  });

  test('fails the gate on a rejected value', () => {
    const { exitCode, log } = run([PREFLIGHT, 'surface-smoke'], {
      CF_ACCESS_CLIENT_ID: ID,
      CF_ACCESS_CLIENT_SECRET: 'abc"def',
    });

    expect(exitCode).toBe(1);
    expect(count(log, isCall)).toBe(0);
  });

  test.each([
    ['no scheme', 'dev.lmgroktfy.com'],
    ['an unsupported scheme', 'ftp://dev.lmgroktfy.com'],
  ])('fails when --staging-url has %s, because nothing was smoked', (_name, url) => {
    const { exitCode, log, output } = run([PREFLIGHT, '--staging-url', url, 'surface-smoke']);

    expect(exitCode).toBe(1);
    expect(output).toContain('recorded no gates');
    expect(count(log, isCall)).toBe(0);
  });

  test('fails when the smoke script cannot run', () => {
    const copy = join(SCRATCH, 'not-executable');
    cpSync(join(ROOT, 'scripts/release'), join(copy, 'scripts/release'), { recursive: true });
    chmodSync(join(copy, 'scripts/release/surface-smoke.sh'), 0o600);

    const { exitCode, output } = run([join(copy, 'scripts/release/preflight.sh'), 'surface-smoke']);

    expect(exitCode).toBe(1);
    expect(output).toContain('surface-smoke.sh is missing or not executable');
  });

  test('fails when drift.sh cannot run', () => {
    const copy = scriptsInScratchRepo('drift-not-executable');
    chmodSync(join(copy, 'scripts/release/drift.sh'), 0o600);

    const { exitCode, output } = run(
      [join(copy, 'scripts/release/preflight.sh'), 'drift'],
      {},
      copy
    );

    expect(exitCode).toBe(1);
    expect(output).toContain('drift.sh is missing or not executable');
  });

  test('fails when drift.sh exits without recording anything', () => {
    const copy = scriptsInScratchRepo('drift-records-nothing');
    git(['-C', copy, 'update-ref', 'refs/remotes/origin/dev', 'HEAD']);
    writeFileSync(join(copy, 'scripts/release/drift.sh'), '#!/usr/bin/env bash\nexit 2\n');

    const { exitCode, output } = run(
      [join(copy, 'scripts/release/preflight.sh'), 'drift'],
      {},
      copy
    );

    expect(exitCode).toBe(1);
    expect(output).toContain('recorded no gates');
  });

  test('hides the token from everything `all` starts, before and after the smoke', () => {
    const copy = scriptsInScratchRepo('all');

    const { log } = run([join(copy, 'scripts/release/preflight.sh'), 'all'], CREDENTIALS, copy);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line.startsWith('BUN '))).toBeGreaterThan(0);
    expect(count(log, (line) => line.includes('secret-env=set'))).toBe(0);
  }, 60_000);

  test('keeps the detail of a failing step when a nested preflight runs inside it', () => {
    const { output } = run([PREFLIGHT, 'mechanics'], { STUB_NESTED_PREFLIGHT: PREFLIGHT });

    expect(output).toContain('outer-failure-detail');
  }, 60_000);

  test('does not print the token under bash -x', () => {
    const { log, output } = run(['bash', '-x', PREFLIGHT, 'surface-smoke'], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(ID);
  });
});

describe('staging-curl.sh', () => {
  test('probes the route it was given without the token, then sends it through a pipe behind -q', () => {
    const { log } = run([STAGING_CURL, '/some/route', '-o', '/dev/null']);
    const argvs = log.filter(isArgv);

    expect(count(log, (line) => line.startsWith('CALL first=-q '))).toBe(2);
    expect(argvs[0]).not.toContain('-K');
    expect(argvs[0]?.endsWith(`${STAGING}/some/route`)).toBe(true);
    expect(argvs[1]).toContain('-K');
    expect(argvs[1]?.endsWith(`${STAGING}/some/route`)).toBe(true);
    expect(count(log, (line) => line === 'CONFIG-KIND=pipe')).toBe(1);
    expect(count(log, (line) => line.endsWith(ID_HEADER))).toBe(1);
    expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(1);
    expect(count(log, argvHoldsSecret)).toBe(0);
  });

  test('passes the options it allows, and keeps the staging URL last', () => {
    const { log } = run([
      STAGING_CURL,
      '/x',
      '-o',
      '/dev/null',
      '-D',
      '-',
      '-w',
      '%{http_code}',
      '-X',
      'POST',
      '-H',
      'Content-Type: application/json',
      '-d',
      '{}',
      '-I',
      '--suppress-connect-headers',
    ]);

    expect(
      count(
        log,
        (line) =>
          isArgv(line) &&
          line.includes('--suppress-connect-headers') &&
          line.endsWith(`${STAGING}/x`)
      )
    ).toBe(1);
  });

  test.each(NOT_ACCESS)(
    'withholds the token, unread, when the host answers without it with %s',
    (_name, answer) => {
      const { exitCode, log, output } = run([STAGING_CURL, '/'], { STUB_HEADERLESS: answer });

      expect(exitCode).toBe(1);
      expect(output).toContain('so the token was withheld');
      expect(count(log, namesHeader)).toBe(0);
      expect(count(log, (line) => line.startsWith('OP '))).toBe(0);
    }
  );

  test.each([
    ['userinfo', ['@evil.example/']],
    ['a host suffix', ['.evil.example/']],
    ['a bare host as the route', ['evil.example/']],
    ['nothing', []],
    ['a second URL', ['/', 'https://evil.example/']],
    ['a bare second host', ['/', 'evil.example/']],
    ['--url', ['/', '--url', 'evil.example/']],
    ['--next', ['/', '--next', 'evil.example/']],
    ['a config file', ['/', '-K', '/dev/null']],
    ['a proxy', ['/', '-x', 'evil.example:8080']],
    ['following redirects', ['/', '-L']],
    ['verbose output, which prints the token', ['/', '-v']],
    ['a trace, which prints the token', ['/', '--trace-ascii', '-']],
    ['an allowed option with no value', ['/', '-o']],
  ])('refuses %s, before any request', (_name, args) => {
    const { exitCode, log } = run([STAGING_CURL, ...args]);

    expect(exitCode).toBe(2);
    expect(count(log, isCall)).toBe(0);
    expect(count(log, (line) => line.startsWith('OP '))).toBe(0);
  });

  test('sends nothing when op read fails', () => {
    const { exitCode, log } = run([STAGING_CURL, '/'], { STUB_OP_FAIL: '1' });

    expect(exitCode).toBe(1);
    expect(count(log, isCall)).toBe(1);
    expect(count(log, namesHeader)).toBe(0);
  });

  test.each(BAD_VALUES)(
    'refuses a secret from op holding %s, without echoing it',
    (_name, value) => {
      const { exitCode, log, output } = run([STAGING_CURL, '/'], { STUB_OP_SECRET: value });

      expect(exitCode).toBe(2);
      expect(count(log, isCall)).toBe(1);
      expect(count(log, namesHeader)).toBe(0);
      expect(output).not.toContain('abc');
    }
  );

  test('does not print the token under bash -x', () => {
    const { log, output } = run(['bash', '-x', STAGING_CURL, '/']);

    expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(1);
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(ID);
  });

  describe('under real curl, against a loopback server', () => {
    type Seen = { path: string; id: string | null; secret: string | null };

    async function runAgainst(name: string, answer: (seen: Seen) => Response, args: string[]) {
      const seen: Seen[] = [];
      const server = Bun.serve({
        hostname: '127.0.0.1',
        port: 0,
        fetch(request) {
          const entry = {
            path: new URL(request.url).pathname,
            id: request.headers.get('cf-access-client-id'),
            secret: request.headers.get('cf-access-client-secret'),
          };
          seen.push(entry);
          return answer(entry);
        },
      });
      const copy = join(SCRATCH, name);
      cpSync(join(ROOT, 'scripts/release'), join(copy, 'scripts/release'), { recursive: true });
      writeFileSync(
        join(copy, 'scripts/release/release.env'),
        `STAGING_URL_DEFAULT="http://127.0.0.1:${server.port}"\n`
      );
      writeFileSync(STUB_LOG, '');

      try {
        const child = Bun.spawn({
          cmd: [join(copy, 'scripts/release/staging-curl.sh'), ...args],
          env: {
            PATH: `${OP_ONLY}:${process.env.PATH}`,
            HOME: process.env.HOME ?? SCRATCH,
            STUB_LOG,
          },
          stdout: 'pipe',
          stderr: 'ignore',
        });
        const stdout = await new Response(child.stdout).text();
        return { exitCode: await child.exited, stdout, seen };
      } finally {
        server.stop(true);
      }
    }

    const behindAccess = ({ secret }: Seen) =>
      secret
        ? new Response('ok')
        : new Response(null, {
            status: 302,
            headers: { Location: '/cdn-cgi/access/login/staging' },
          });

    test('delivers both headers, only after a request without them', async () => {
      const { exitCode, stdout, seen } = await runAgainst('real-behind-access', behindAccess, [
        '/llms.txt',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code}',
      ]);

      expect(exitCode).toBe(0);
      expect(stdout).toBe('200');
      expect(seen).toEqual([
        { path: '/llms.txt', id: null, secret: null },
        { path: '/llms.txt', id: ID, secret: SECRET },
      ]);
    });

    test('never sends the token when Access is gone', async () => {
      const { exitCode, seen } = await runAgainst('real-no-access', () => new Response('ok'), [
        '/',
      ]);

      expect(exitCode).toBe(1);
      expect(seen).toEqual([{ path: '/', id: null, secret: null }]);
    });

    test('does not follow a redirect with the token', async () => {
      const redirectOnceAdmitted = ({ secret }: Seen) =>
        secret
          ? new Response(null, { status: 302, headers: { Location: '/elsewhere' } })
          : new Response(null, {
              status: 302,
              headers: { Location: '/cdn-cgi/access/login/staging' },
            });

      const { seen } = await runAgainst('real-redirect', redirectOnceAdmitted, [
        '/',
        '-o',
        '/dev/null',
      ]);

      expect(seen).toHaveLength(2);
    });
  });
});

describe('surface-smoke.sh config under real curl', () => {
  test('carries both headers to a loopback server', async () => {
    const configLines = run([SMOKE, STAGING], CREDENTIALS).log.filter(
      (line) => namesHeader(line) && !isArgv(line)
    );
    const configPath = join(SCRATCH, 'captured-config');
    writeFileSync(configPath, `${configLines.slice(0, 2).join('\n')}\n`);
    const seen: Headers[] = [];
    const server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request) {
        seen.push(request.headers);
        return new Response('ok');
      },
    });

    try {
      const curl = Bun.spawn({
        cmd: [
          'curl',
          '-q',
          '-K',
          configPath,
          '-sS',
          '-o',
          '/dev/null',
          `http://127.0.0.1:${server.port}/`,
        ],
        stdout: 'ignore',
        stderr: 'ignore',
      });

      expect(await curl.exited).toBe(0);
    } finally {
      server.stop(true);
    }
    expect(seen[0]?.get('cf-access-client-id')).toBe(ID);
    expect(seen[0]?.get('cf-access-client-secret')).toBe(SECRET);
  });
});

describe('RELEASES-PREFLIGHT.md Access commands', () => {
  test('name a real item, not a placeholder', () => {
    expect(RUNBOOK).not.toContain('<item-uuid>');
  });

  test('name the same item as staging-curl.sh', () => {
    const items = (text: string) => [
      ...new Set([...text.matchAll(/op:\/\/secrets-dev\/([^/]+)\//g)].map((match) => match[1])),
    ];

    expect(items(RUNBOOK)).toHaveLength(1);
    expect(items(readFileSync(STAGING_CURL, 'utf-8'))).toEqual(items(RUNBOOK));
  });

  test('the documented smoke command reaches the smoke with the token', () => {
    const block = runbookBlock(
      /^CF_ACCESS_CLIENT_ID="\$\(op read [\s\S]*?preflight\.sh surface-smoke$/m
    );

    expectHeadersOnEveryRequest(run(['bash', '-c', block]).log);
  });

  test('the documented agent.json check goes through staging-curl.sh', () => {
    const block = runbookBlock(
      /^ {2}scripts\/release\/staging-curl\.sh \/\.well-known\/agent\.json .*$/m
    ).trim();

    const { log } = run(['bash', '-c', block]);

    expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(1);
    expect(
      count(
        log,
        (line) =>
          isArgv(line) && line.includes('-K') && line.endsWith(`${STAGING}/.well-known/agent.json`)
      )
    ).toBe(1);
  });

  describe('security header check', () => {
    const check = runbookBlock(/^ {2}rc=0\n[\s\S]*?^ {2}echo "exit \$rc"$/m).replace(/^ {2}/gm, '');
    const names = Object.keys(SECURITY_HEADERS);
    const respond = (status: number, headers: string[]) =>
      [`HTTP/2 ${status} `, ...headers.map((name) => `${name}: x`), '', ''].join('\r\n');

    function runCheck(response: string, env: Record<string, string> = {}): string[] {
      return run(['bash', '-c', check], { STUB_RESPONSE: response, ...env })
        .output.trim()
        .split('\n');
    }

    test('reads the names it requires from SECURITY_HEADERS', () => {
      const pattern = check.match(/name ~ \/\^\(([^)]+)\):\$\//)?.[1] ?? '';

      expect(pattern.split('|').sort()).toEqual(names.map((name) => name.toLowerCase()).sort());
    });

    test.each([
      ['canonical case', names],
      ['lower case', names.map((name) => name.toLowerCase())],
      ['upper case', names.map((name) => name.toUpperCase())],
    ])('passes a 200 with all six headers and no HSTS, in %s', (_name, headers) => {
      expect(runCheck(respond(200, headers))).toEqual([
        'HTTP 200, security headers 6/6, HSTS absent',
        'HTTP 200, security headers 6/6, HSTS absent',
        'exit 0',
      ]);
    });

    test.each([
      [
        'the Access login redirect',
        respond(302, []),
        'HTTP 302, security headers 0/6, HSTS absent',
      ],
      [
        'a response carrying HSTS',
        respond(200, [...names, 'Strict-Transport-Security']),
        'HTTP 200, security headers 6/6, HSTS present',
      ],
      [
        'a missing header',
        respond(200, names.slice(1)),
        'HTTP 200, security headers 5/6, HSTS absent',
      ],
      [
        'a duplicated header standing in for a missing one',
        respond(200, [...names.slice(1), names[1] ?? '']),
        'HTTP 200, security headers 5/6, HSTS absent',
      ],
      ['no response at all', '', 'HTTP , security headers 0/6, HSTS absent'],
    ])('fails on %s', (_name, response, expected) => {
      expect(runCheck(response)).toEqual([expected, expected, 'exit 1']);
    });

    test('fails, with the token withheld, when Access is gone', () => {
      const lines = runCheck(respond(200, names), { STUB_HEADERLESS: '200 ' });

      expect(lines).toContain('exit 1');
      expect(lines.filter((line) => line.includes('so the token was withheld'))).toHaveLength(2);
    });
  });
});
