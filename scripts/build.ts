#!/usr/bin/env bun
/**
 * Build script for the LMGROKTFY monorepo.
 * Builds shared, client, and web packages in order.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { $ } from 'bun';

const ROOT_DIR = join(import.meta.dir, '..');
const PACKAGES_DIR = join(ROOT_DIR, 'packages');
const LOCALES_DIR = join(ROOT_DIR, 'locales');

async function buildShared(): Promise<void> {
  console.log('📦 Building @lmgroktfy/shared...');
  await $`bun run --cwd ${join(PACKAGES_DIR, 'shared')} build`;
  console.log('✅ @lmgroktfy/shared built successfully\n');
}

async function buildClient(): Promise<void> {
  console.log('📦 Building @lmgroktfy/client...');

  const clientDir = join(PACKAGES_DIR, 'client');
  const clientSrc = join(clientDir, 'src', 'index.ts');
  const clientStylesSrc = join(clientDir, 'src', 'styles', 'main.css');
  const clientDist = join(clientDir, 'dist');
  const sharedSrc = join(PACKAGES_DIR, 'shared', 'src', 'index.ts');

  // Clean dist directory
  if (existsSync(clientDist)) {
    rmSync(clientDist, { recursive: true });
  }
  mkdirSync(clientDist, { recursive: true });

  // Bundle client code with Bun, resolving workspace package
  const result = await Bun.build({
    entrypoints: [clientSrc],
    outdir: clientDist,
    minify: true,
    target: 'browser',
    format: 'esm',
    naming: 'app.js',
    plugins: [
      {
        name: 'resolve-workspace',
        setup(build) {
          build.onResolve({ filter: /^@lmgroktfy\/shared$/ }, () => {
            return { path: sharedSrc };
          });
        },
      },
    ],
  });

  if (!result.success) {
    console.error('Build errors:', result.logs);
    throw new Error('Client build failed');
  }

  // Build Tailwind CSS
  await $`bunx @tailwindcss/cli -i ${clientStylesSrc} -o ${join(clientDist, 'styles.css')} --minify`;

  console.log('✅ @lmgroktfy/client built successfully\n');
}

async function buildWeb(): Promise<void> {
  console.log('📦 Building @lmgroktfy/web...');

  const webDir = join(PACKAGES_DIR, 'web');
  const webPublic = join(webDir, 'public');
  const clientPublic = join(PACKAGES_DIR, 'client', 'public');
  const clientDist = join(PACKAGES_DIR, 'client', 'dist');

  // Clean and create public directory
  if (existsSync(webPublic)) {
    rmSync(webPublic, { recursive: true });
  }
  mkdirSync(webPublic, { recursive: true });
  mkdirSync(join(webPublic, 'js'), { recursive: true });
  mkdirSync(join(webPublic, 'css'), { recursive: true });
  mkdirSync(join(webPublic, 'locales'), { recursive: true });

  // Copy client public files to web public
  cpSync(join(clientPublic, 'index.html'), join(webPublic, 'index.html'));

  // Copy favicon if it exists
  const faviconPath = join(clientPublic, 'favicon.svg');
  if (existsSync(faviconPath)) {
    cpSync(faviconPath, join(webPublic, 'favicon.svg'));
  }

  // Copy bundled JS to web public
  cpSync(join(clientDist, 'app.js'), join(webPublic, 'js', 'app.js'));

  // Copy built CSS to web public
  cpSync(join(clientDist, 'styles.css'), join(webPublic, 'css', 'styles.css'));

  // Copy locale files
  if (existsSync(LOCALES_DIR)) {
    cpSync(LOCALES_DIR, join(webPublic, 'locales'), { recursive: true });
  }

  // Build TypeScript for the worker
  await $`bun run --cwd ${webDir} build`;

  console.log('✅ @lmgroktfy/web built successfully\n');
}

async function main(): Promise<void> {
  console.log('🚀 Starting build process...\n');

  const startTime = Date.now();

  try {
    await buildShared();
    await buildClient();
    await buildWeb();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Build completed in ${elapsed}s`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();
