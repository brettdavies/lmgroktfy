import { expect } from 'bun:test';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dir, '../../../..');
export const SMOKE = join(ROOT, 'scripts/release/surface-smoke.sh');
export const PREFLIGHT = join(ROOT, 'scripts/release/preflight.sh');
export const STAGING_CHECK = join(ROOT, 'scripts/release/staging-check.sh');

export const STAGING = 'https://dev.lmgroktfy.com';
export const ID = 'dummy-id.access';
export const SECRET = 'cfast_dummysecret';
export const ID_HEADER = `CF-Access-Client-Id: ${ID}"`;
export const SECRET_HEADER = `CF-Access-Client-Secret: ${SECRET}"`;
export const CREDENTIALS = { CF_ACCESS_CLIENT_ID: ID, CF_ACCESS_CLIENT_SECRET: SECRET };
export const SMOKE_REQUESTS = 7;
export const ACCESS_LOGIN =
  '302 https://team.cloudflareaccess.com/cdn-cgi/access/login/dev.lmgroktfy.com';
export const BAD_VALUES = [
  ['a quote', 'abc"def'],
  ['a newline that adds a url', 'abc\nurl = "http://127.0.0.1:9/x"'],
  ['a space', 'abc def'],
  ['a backslash', 'abc\\def'],
];

export type Run = { exitCode: number; output: string; log: string[] };

export function count(lines: string[], matches: (line: string) => boolean): number {
  return lines.filter(matches).length;
}

export const isCall = (line: string) => line.startsWith('CALL ');
export const isArgv = (line: string) => line.startsWith('ARGV ');
export const namesHeader = (line: string) => line.includes('CF-Access-Client');
export const argvHoldsSecret = (line: string) => isArgv(line) && line.includes(SECRET);
export const holdsSecretInEnv = (line: string) => line.includes('secret-env=set');

export function expectHeadersOnEveryRequest(log: string[]): void {
  expect(count(log, (line) => line.endsWith(ID_HEADER))).toBe(SMOKE_REQUESTS);
  expect(count(log, (line) => line.endsWith(SECRET_HEADER))).toBe(SMOKE_REQUESTS);
}

// The stubs search their whole environment for the dummy value, so a token exported
// under any variable name shows up, not only under its original one.
const SECRET_IN_ENV = `"$(env | grep -qF -- '${SECRET}' && echo set)"`;

// Records what each curl call was handed, including the config it read from -K and
// whether that config came through a pipe, and makes no network call. A call with no
// -K answers $STUB_HEADERLESS, the `<status> <redirect>` a gated host gives a request
// with no credentials. A call with -K answers $STUB_RESPONSE when it is set, and
// otherwise like a refused connection.
const CURL_STUB = `{
  printf 'CALL first=%s secret-env=%s\\n' "\${1:-}" ${SECRET_IN_ENV}
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
exit 7`;

// With $STUB_NESTED_PREFLIGHT set, the test suite step runs a whole inner preflight and
// then fails, the shape of these test files running under `preflight.sh mechanics`.
const BUN_STUB = `printf 'BUN secret-env=%s\\n' ${SECRET_IN_ENV} >>"$STUB_LOG"
if [[ -n "\${STUB_NESTED_PREFLIGHT:-}" && "$*" == "run test:all" ]]; then
  env -u STUB_NESTED_PREFLIGHT "$STUB_NESTED_PREFLIGHT" mechanics >/dev/null 2>&1
  echo outer-failure-detail
  exit 1
fi`;

const OP_STUB = `printf 'OP %s\\n' "$2" >>"$STUB_LOG"
if [[ -n "\${STUB_OP_FAIL:-}" ]]; then exit 1; fi
case "$2" in
  */client_id) printf '%s\\n' '${ID}' ;;
  */client_secret) printf '%s\\n' "\${STUB_OP_SECRET-${SECRET}}" ;;
  *) exit 1 ;;
esac`;

function writeStub(dir: string, name: string, body: string): void {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o700);
}

export function makeHarness() {
  const scratch = mkdtempSync(join(tmpdir(), 'release-scripts-'));
  const stubLog = join(scratch, 'stub.log');
  const stubs = join(scratch, 'stubs');
  const opOnly = join(scratch, 'op-only');
  mkdirSync(stubs);
  mkdirSync(opOnly);

  writeStub(stubs, 'curl', CURL_STUB);
  writeStub(stubs, 'bun', BUN_STUB);
  writeStub(stubs, 'jaq', 'exit 0');
  writeStub(stubs, 'gh', `printf 'GH secret-env=%s\\n' ${SECRET_IN_ENV} >>"$STUB_LOG"`);
  writeStub(
    stubs,
    'mktemp',
    `printf 'MKTEMP secret-env=%s\\n' ${SECRET_IN_ENV} >>"$STUB_LOG"\nexec "$REAL_MKTEMP" "$@"`
  );
  writeStub(stubs, 'op', OP_STUB);
  writeStub(opOnly, 'op', OP_STUB);

  function run(cmd: string[], env: Record<string, string> = {}, cwd = ROOT): Run {
    writeFileSync(stubLog, '');
    const child = Bun.spawnSync({
      cmd,
      cwd,
      env: {
        PATH: `${stubs}:${process.env.PATH}`,
        HOME: process.env.HOME ?? scratch,
        STUB_LOG: stubLog,
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
      log: readFileSync(stubLog, 'utf-8').split('\n'),
    };
  }

  return {
    scratch,
    stubLog,
    opOnly,
    run,
    cleanup: () => rmSync(scratch, { recursive: true, force: true }),
  };
}
