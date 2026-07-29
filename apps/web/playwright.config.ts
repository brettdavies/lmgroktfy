import { defineConfig, devices } from '@playwright/test';

/**
 * Drives the interactive island against the production build served by a local
 * static server (`tests/e2e/static-server.ts`). The build is authoritative for
 * the CSP-safe external-script mount; these tests cover runtime behavior. The
 * `/api/grok` call is mocked per-test via route interception, so no real
 * xAI/Turnstile is needed here.
 */

const PORT = Number(process.env.E2E_PORT ?? 4331);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun tests/e2e/static-server.ts',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
