import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  argvHoldsSecret,
  BAD_VALUES,
  count,
  CREDENTIALS,
  expectHeadersOnEveryRequest,
  holdsSecretInEnv,
  ID,
  isArgv,
  isCall,
  makeHarness,
  namesHeader,
  SECRET,
  SMOKE,
  SMOKE_REQUESTS,
  STAGING,
} from './release-harness.ts';

const { run, scratch, cleanup } = makeHarness();
afterAll(cleanup);

describe('surface-smoke.sh Access headers', () => {
  test('reach the staging URL on every request, through a pipe behind -q', () => {
    const { log } = run([SMOKE, STAGING], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line === 'CONFIG-KIND=pipe')).toBe(SMOKE_REQUESTS);
    expect(count(log, (line) => line === 'CONFIG-KIND=file')).toBe(0);
    expect(count(log, (line) => isCall(line) && !line.startsWith('CALL first=-q '))).toBe(0);
    expect(count(log, argvHoldsSecret)).toBe(0);
    expect(count(log, holdsSecretInEnv)).toBe(0);
  });

  test('accept a trailing slash on the staging URL, with no doubled slash in the requests', () => {
    const { log } = run([SMOKE, `${STAGING}/`], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => isArgv(line) && line.endsWith(`${STAGING}/llms.txt`))).toBe(1);
  });

  test('read route statuses past a proxy CONNECT response', () => {
    const { log } = run([SMOKE, STAGING], CREDENTIALS);
    const routes = log.filter((line) => isArgv(line) && line.includes('-D -'));

    expect(routes).toHaveLength(5);
    expect(count(routes, (line) => !line.includes('--suppress-connect-headers'))).toBe(0);
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

  test.each([
    ['the page itself', '200 '],
    ['a redirect that stays on the host', '302 https://dev.lmgroktfy.com/elsewhere'],
    ['a redirect to another host that is not Access', '302 https://example.com/'],
    ['a 403', '403 '],
    ['a 401', '401 '],
    ['no answer', '000 '],
  ])(
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
      const resultFile = join(scratch, 'result');
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

describe('surface-smoke.sh config under real curl', () => {
  test('carries both headers to a loopback server', async () => {
    const configLines = run([SMOKE, STAGING], CREDENTIALS).log.filter(
      (line) => namesHeader(line) && !isArgv(line)
    );
    const configPath = join(scratch, 'captured-config');
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
