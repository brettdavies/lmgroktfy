import { afterAll, describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SECURITY_HEADERS } from '../../src/lib/security-headers.ts';
import {
  argvHoldsSecret,
  BAD_VALUES,
  count,
  expectHeadersOnEveryRequest,
  holdsSecretInEnv,
  ID,
  isArgv,
  isCall,
  makeHarness,
  ROOT,
  SECRET,
  SECRET_HEADER,
  STAGING_CHECK,
} from './release-harness.ts';

const { run, scratch, stubLog, opOnly, cleanup } = makeHarness();
afterAll(cleanup);

const CHECKS = ['agent-json', 'security-headers', 'site-key'];
const CHECK_PATHS: Record<string, string[]> = {
  'agent-json': ['/.well-known/agent.json'],
  'security-headers': ['/', '/preflight-smoke'],
  'site-key': ['/'],
};
const NAMES = Object.keys(SECURITY_HEADERS);
const SITE_KEY =
  readFileSync(join(ROOT, 'apps/web/src/lib/turnstile-sitekey.ts'), 'utf-8').match(
    /STAGING_SITE_KEY = '([^']+)'/
  )?.[1] ?? '';
const RUNBOOK = readFileSync(join(ROOT, 'RELEASES-PREFLIGHT.md'), 'utf-8');
const SCRIPT = readFileSync(STAGING_CHECK, 'utf-8');

type Seen = { path: string; id: string | null; secret: string | null };
type ServeOptions = {
  withToken?: (path: string) => Response;
  withoutToken?: (path: string) => Response;
  env?: Record<string, string>;
  home?: string;
  traced?: boolean;
};

const redirect = (location: string) =>
  new Response(null, { status: 302, headers: { Location: location } });
const accessLogin = () => redirect('/cdn-cgi/access/login/staging');
const page = (headers: string[], body = '', status = 200) =>
  new Response(body, {
    status,
    headers: headers.map((name): [string, string] => [name, 'x']),
  });

// A response that passes every check, carrying values no check may print.
const healthy = (path: string) => {
  const headers = new Headers({
    'Set-Cookie': 'CF_Authorization=dummycookie',
    'X-Marker': 'dummyheadervalue',
  });
  for (const name of NAMES) {
    headers.set(name, 'dummyheadervalue');
  }
  if (path.endsWith('agent.json')) {
    headers.set('Content-Type', 'application/json');
    return new Response('{"marker":"dummybody"}', { headers });
  }
  return new Response(`<div data-sitekey="${SITE_KEY}">dummybody</div>`, { headers });
};

let copies = 0;

// Runs the real script under real curl against a loopback server that stands in for
// staging behind Access. The stub log is only for the op stub.
async function serve(check: string, options: ServeOptions = {}) {
  const seen: Seen[] = [];
  const { withToken = healthy, withoutToken = accessLogin } = options;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      const secret = request.headers.get('cf-access-client-secret');
      seen.push({ path, id: request.headers.get('cf-access-client-id'), secret });
      return secret ? withToken(path) : withoutToken(path);
    },
  });
  copies += 1;
  const copy = join(scratch, `real-${copies}`);
  cpSync(join(ROOT, 'scripts/release'), join(copy, 'scripts/release'), { recursive: true });
  writeFileSync(
    join(copy, 'scripts/release/release.env'),
    `STAGING_URL_DEFAULT="http://127.0.0.1:${server.port}"\n`
  );
  writeFileSync(stubLog, '');
  const script = join(copy, 'scripts/release/staging-check.sh');

  try {
    const child = Bun.spawn({
      cmd: options.traced ? ['bash', '-x', script, check] : [script, check],
      env: {
        PATH: `${opOnly}:${process.env.PATH}`,
        HOME: options.home ?? scratch,
        STUB_LOG: stubLog,
        ...options.env,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    return { exitCode: await child.exited, stdout, output: `${stdout}${stderr}`, seen };
  } finally {
    server.stop(true);
  }
}

describe('staging-check.sh arguments', () => {
  test.each([
    ['no check', []],
    ['an unknown check', ['hsts-please']],
    ['an extra argument', ['agent-json', 'https://evil.example/']],
    ['a curl option', ['-L']],
  ])('refuses %s, before any request', (_name, args) => {
    const { exitCode, log } = run([STAGING_CHECK, ...args]);

    expect(exitCode).toBe(2);
    expect(count(log, isCall)).toBe(0);
    expect(count(log, (line) => line.startsWith('OP '))).toBe(0);
  });

  test('refuses a staging URL that is not https', async () => {
    const copy = join(scratch, 'not-https');
    mkdirSync(copy);
    cpSync(join(ROOT, 'scripts/release'), join(copy, 'scripts/release'), { recursive: true });
    writeFileSync(
      join(copy, 'scripts/release/release.env'),
      'STAGING_URL_DEFAULT="http://dev.lmgroktfy.com"\n'
    );

    const { exitCode, log } = run([join(copy, 'scripts/release/staging-check.sh'), 'agent-json']);

    expect(exitCode).toBe(2);
    expect(count(log, isCall)).toBe(0);
  });
});

describe.each(CHECKS)('staging-check.sh %s', (check) => {
  const paths = CHECK_PATHS[check] ?? [];

  test('sends the token only after a request without it, on the same fixed paths', async () => {
    const { exitCode, seen } = await serve(check);

    expect(exitCode).toBe(0);
    expect(seen).toEqual(
      paths.flatMap((path) => [
        { path, id: null, secret: null },
        { path, id: ID, secret: SECRET },
      ])
    );
  });

  test('sends the token through a pipe behind -q and -g, with nothing on argv or in the environment', () => {
    const { log } = run([STAGING_CHECK, check], { STUB_RESPONSE: '' });

    expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(paths.length);
    expect(count(log, (line) => line === 'CONFIG-KIND=pipe')).toBe(paths.length);
    expect(count(log, (line) => line === 'CONFIG-KIND=file')).toBe(0);
    expect(count(log, (line) => isCall(line) && !line.startsWith('CALL first=-q '))).toBe(0);
    expect(count(log, (line) => isArgv(line) && !line.includes(' -g '))).toBe(0);
    expect(count(log, argvHoldsSecret)).toBe(0);
    expect(count(log, holdsSecretInEnv)).toBe(0);
  });

  test('does not export the token when its variable names are already exported', () => {
    const { log } = run([STAGING_CHECK, check], {
      STUB_RESPONSE: '',
      id: 'preset',
      secret: 'preset',
    });

    expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(paths.length);
    expect(count(log, holdsSecretInEnv)).toBe(0);
  });

  test('prints no header, cookie, body or credential', async () => {
    const { exitCode, output } = await serve(check);

    expect(exitCode).toBe(0);
    expect(output).toContain(': pass');
    for (const value of [
      'dummycookie',
      'CF_Authorization',
      'dummyheadervalue',
      'dummybody',
      SECRET,
      ID,
    ]) {
      expect(output).not.toContain(value);
    }
  });

  test('prints none of them under bash -x', async () => {
    const { output } = await serve(check, { traced: true });

    expect(output).toContain(': pass');
    for (const value of ['dummycookie', 'dummyheadervalue', 'dummybody', SECRET, ID]) {
      expect(output).not.toContain(value);
    }
  });

  test('fails closed when the token gets a 302, and does not follow it', async () => {
    const { exitCode, stdout, seen } = await serve(check, {
      withToken: () => redirect('/elsewhere'),
    });

    expect(exitCode).toBe(1);
    expect(stdout).toContain('HTTP 302');
    expect(stdout).toContain('FAIL');
    expect(stdout).not.toContain(': pass');
    expect(seen.map(({ path }) => path)).not.toContain('/elsewhere');
  });

  test('ignores the operator curl config', async () => {
    const home = join(scratch, `curlrc-${check}`);
    mkdirSync(home);
    writeFileSync(join(home, '.curlrc'), 'location\nproxy = "http://127.0.0.1:9"\n');

    const { exitCode, seen } = await serve(check, { home });

    expect(exitCode).toBe(0);
    expect(seen).toHaveLength(paths.length * 2);
  });

  test.each([
    ['the page itself', (path: string) => healthy(path)],
    ['a redirect that stays on the host', () => redirect('/elsewhere')],
    ['a redirect to another host that is not Access', () => redirect('http://127.0.0.1:9/')],
    ['a 403', () => new Response(null, { status: 403 })],
    ['a 401', () => new Response(null, { status: 401 })],
  ])(
    'withholds the token, unread, when the host answers without it with %s',
    async (_name, withoutToken) => {
      const { exitCode, stdout, seen } = await serve(check, { withoutToken });

      expect(exitCode).toBe(1);
      expect(stdout).toContain('so the token was withheld');
      expect(seen.filter(({ secret }) => secret !== null)).toEqual([]);
      expect(readFileSync(stubLog, 'utf-8')).not.toContain('OP ');
    }
  );

  test('sends nothing when op read fails', async () => {
    const { exitCode, seen } = await serve(check, { env: { STUB_OP_FAIL: '1' } });

    expect(exitCode).toBe(1);
    expect(seen.filter(({ secret }) => secret !== null)).toEqual([]);
  });

  test.each([...BAD_VALUES, ['nothing', '']])(
    'refuses a secret from op holding %s, without echoing it',
    async (_name, value) => {
      const { exitCode, output, seen } = await serve(check, {
        env: { STUB_OP_SECRET: value ?? '' },
      });

      expect(exitCode).toBe(2);
      expect(seen.filter(({ secret }) => secret !== null)).toEqual([]);
      expect(output).not.toContain('abc');
    }
  );
});

describe('staging-check.sh verdicts', () => {
  test.each([
    ['agent-json', 'agent-json: HTTP 200: pass\n'],
    ['site-key', 'site-key: HTTP 200: pass\n'],
  ])('%s prints the status and the verdict, and nothing else', async (check, expected) => {
    const { stdout, output } = await serve(check);

    expect(stdout).toBe(expected);
    expect(output).toBe(expected);
  });

  test('agent-json fails a response that is not JSON', async () => {
    const { exitCode, stdout } = await serve('agent-json', {
      withToken: () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }),
    });

    expect(exitCode).toBe(1);
    expect(stdout).toBe('agent-json: HTTP 200, not JSON: FAIL\n');
  });

  test('site-key fails a page without the staging key', async () => {
    const { exitCode, stdout } = await serve('site-key', {
      withToken: () => new Response('<div data-sitekey="another-key"></div>'),
    });

    expect(exitCode).toBe(1);
    expect(stdout).toBe('site-key: HTTP 200, no staging site key: FAIL\n');
  });

  test('site-key carries the key the staging build bakes in', () => {
    expect(SITE_KEY).not.toBe('');
    expect(SCRIPT).toContain(`STAGING_SITE_KEY="${SITE_KEY}"`);
  });

  test('security-headers reads the names it requires from SECURITY_HEADERS', () => {
    const pattern = SCRIPT.match(/name ~ \/\^\(([^)]+)\)\$\//)?.[1] ?? '';

    expect(pattern.split('|').sort()).toEqual(NAMES.map((name) => name.toLowerCase()).sort());
  });

  const verdictOn = (response: () => Response) =>
    serve('security-headers', { withToken: response });

  test.each([
    ['canonical case', NAMES],
    ['lower case', NAMES.map((name) => name.toLowerCase())],
    ['upper case', NAMES.map((name) => name.toUpperCase())],
  ])('security-headers passes a 200 with all six and no HSTS, in %s', async (_name, headers) => {
    const { exitCode, stdout } = await verdictOn(() => page(headers));

    expect(exitCode).toBe(0);
    expect(stdout).toBe(
      [
        'security-headers /: HTTP 200, security headers 6/6, HSTS absent: pass',
        'security-headers /preflight-smoke: HTTP 200, security headers 6/6, HSTS absent: pass',
        '',
      ].join('\n')
    );
  });

  test.each([
    [
      'a response carrying HSTS',
      () => page([...NAMES, 'Strict-Transport-Security']),
      'HTTP 200, security headers 6/6, HSTS present',
    ],
    ['a missing header', () => page(NAMES.slice(1)), 'HTTP 200, security headers 5/6, HSTS absent'],
    ['a server error', () => page(NAMES, '', 500), 'HTTP 500, security headers 6/6, HSTS absent'],
  ])('security-headers fails on %s', async (_name, response, verdict) => {
    const { exitCode, stdout } = await verdictOn(response);

    expect(exitCode).toBe(1);
    expect(stdout).toBe(
      [
        `security-headers /: ${verdict}: FAIL`,
        `security-headers /preflight-smoke: ${verdict}: FAIL`,
        '',
      ].join('\n')
    );
  });
});

describe('RELEASES-PREFLIGHT.md Access commands', () => {
  test('name a real item, not a placeholder', () => {
    expect(RUNBOOK).not.toContain('<item-uuid>');
  });

  test('name the same item as staging-check.sh', () => {
    const items = (text: string) => [
      ...new Set([...text.matchAll(/op:\/\/secrets-dev\/([^/]+)\//g)].map((match) => match[1])),
    ];

    expect(items(RUNBOOK)).toHaveLength(1);
    expect(items(SCRIPT)).toEqual(items(RUNBOOK));
  });

  test('the documented smoke command reaches the smoke with the token', () => {
    const block =
      RUNBOOK.match(
        /^CF_ACCESS_CLIENT_ID="\$\(op read [\s\S]*?preflight\.sh surface-smoke$/m
      )?.[0] ?? '';

    expect(block).not.toBe('');
    expectHeadersOnEveryRequest(run(['bash', '-c', block]).log);
  });

  test('document every check, and only the checks that exist', () => {
    const documented = [...RUNBOOK.matchAll(/staging-check\.sh ([a-z-]+)/g)].map(
      (match) => match[1]
    );

    expect([...new Set(documented)].sort()).toEqual([...CHECKS].sort());
  });
});
