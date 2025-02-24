// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Mobile Safari (iPad)',
      use: { ...devices['iPad (gen 7)'] },
    },
    
    // Additional mobile devices
    {
      name: 'Mobile Safari (iPhone SE)',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'Mobile Chrome (Galaxy S8)',
      use: { ...devices['Galaxy S8'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx http-server . -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
}); 