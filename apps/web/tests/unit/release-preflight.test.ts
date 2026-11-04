import { afterAll, describe, expect, test } from 'bun:test';
import { chmodSync, cpSync, writeFileSync } from 'node:fs';
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

function git(args: string[]): void {
  Bun.spawnSync(['git', ...args]);
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
  test('passes the token to the staging smoke and to nothing the delegation helper starts', () => {
    const { log } = run([PREFLIGHT, 'surface-smoke'], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(count(log, (line) => line.startsWith('MKTEMP '))).toBeGreaterThan(0);
    expect(count(log, holdsSecretInEnv)).toBe(0);
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
    const copy = join(scratch, 'not-executable');
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
    expect(count(log, holdsSecretInEnv)).toBe(0);
  }, 60_000);

  test('keeps the detail of a failing step when a nested preflight runs inside it', () => {
    const { output } = run([PREFLIGHT, 'mechanics'], { STUB_NESTED_PREFLIGHT: PREFLIGHT });

    expect(output).toContain('outer-failure-detail');
  }, 60_000);

  test('does not export the token when its variable names are already exported', () => {
    const { log } = run([PREFLIGHT, 'surface-smoke'], {
      ...CREDENTIALS,
      ACCESS_CLIENT_ID: 'preset',
      ACCESS_CLIENT_SECRET: 'preset',
      ACCESS_ID: 'preset',
      ACCESS_SECRET: 'preset',
      ACCESS_HEADERS: 'preset',
    });

    expectHeadersOnEveryRequest(log);
    expect(count(log, holdsSecretInEnv)).toBe(0);
  });

  test('does not print the token under bash -x', () => {
    const { log, output } = run(['bash', '-x', PREFLIGHT, 'surface-smoke'], CREDENTIALS);

    expectHeadersOnEveryRequest(log);
    expect(output).not.toContain(SECRET);
    expect(output).not.toContain(ID);
  });
});
