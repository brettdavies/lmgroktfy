import { afterAll, describe, expect, test } from 'bun:test';
import { cpSync } from 'node:fs';
import { join } from 'node:path';
import {
  count,
  CREDENTIALS,
  expectHeadersOnEveryRequest,
  holdsSecretInEnv,
  ID,
  isCall,
  makeHarness,
  PREFLIGHT,
  ROOT,
  SECRET,
} from './release-harness.ts';

const { run, scratch, cleanup } = makeHarness();
afterAll(cleanup);

// A closed environment: GIT_DIR, exported by git to its hooks, outranks -C and would
// point these commands at the repository under test.
function git(args: string[]): void {
  Bun.spawnSync(['git', ...args], {
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' },
  });
}

// A throwaway repository holding the release scripts, for runs that must not touch this
// checkout: drift.sh, which `all` runs, fetches.
function scriptsInScratchRepo(name: string): string {
  const copy = join(scratch, name);
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

describe('preflight.sh', () => {
  test('reads the token itself, and passes it to the smoke and to nothing the delegation helper starts', () => {
    const { log } = run([PREFLIGHT, 'surface-smoke']);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line.startsWith('MKTEMP '))).toBeGreaterThan(0);
    expect(count(log, holdsSecretInEnv)).toBe(0);
  });

  test('fails the gate on a rejected value', () => {
    const { exitCode, log } = run([PREFLIGHT, 'surface-smoke'], { STUB_OP_SECRET: 'abc"def' });

    expect(exitCode).toBe(1);
    expect(count(log, isCall)).toBe(0);
  });

  test('restarts without a token in its environment, and reads its own', () => {
    const smoke = run([PREFLIGHT, 'surface-smoke'], { ...CREDENTIALS, STUB_OP_FAIL: '1' });
    const mechanics = run([PREFLIGHT, 'mechanics'], CREDENTIALS);

    expect(smoke.output).toContain('restarting without CF_ACCESS_CLIENT_ID');
    expect(count(smoke.log, (line) => line.includes('CF-Access-Client'))).toBe(0);
    // With no token the transport gate fails on the login, so a failed op read stays red.
    expect(smoke.exitCode).toBe(1);
    expect(count(mechanics.log, (line) => line.startsWith('BUN '))).toBeGreaterThan(0);
    expect(count(mechanics.log, holdsSecretInEnv)).toBe(0);
    expect(count(mechanics.log, (line) => line.includes('parent-env=set'))).toBe(0);
  }, 60_000);

  test('hides the token from everything `all` starts, before and after the smoke', () => {
    const copy = scriptsInScratchRepo('all');

    const { log } = run([join(copy, 'scripts/release/preflight.sh'), 'all'], CREDENTIALS, copy);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line.startsWith('BUN '))).toBeGreaterThan(0);
    expect(count(log, holdsSecretInEnv)).toBe(0);
    expect(count(log, (line) => line.includes('parent-env=set'))).toBe(0);
  }, 60_000);

  test('keeps the detail of a failing step when a nested preflight runs inside it', () => {
    const { output } = run([PREFLIGHT, 'mechanics'], { STUB_NESTED_PREFLIGHT: PREFLIGHT });

    expect(output).toContain('outer-failure-detail');
  }, 60_000);

  test('does not export the token when its variable names are already exported', () => {
    const { log } = run([PREFLIGHT, 'surface-smoke'], {
      id: 'preset',
      secret: 'preset',
      ACCESS_ID: 'preset',
      ACCESS_SECRET: 'preset',
      ACCESS_HEADERS: 'preset',
    });

    expectHeadersOnEveryRequest(log);
    expect(count(log, holdsSecretInEnv)).toBe(0);
  });

  test('does not print the token under bash -x', () => {
    const { log, output } = run(['bash', '-x', PREFLIGHT, 'surface-smoke']);

    expectHeadersOnEveryRequest(log);
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(ID);
  });
});
