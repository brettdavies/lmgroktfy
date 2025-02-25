import { test as base } from '@playwright/test';

/**
 * Extended test fixture that provides a mockApi object
 * for easier API mocking in tests
 */
export const test = base.extend({
  mockApi: async ({ page }, use) => {
    // Create a mockApi object with helper methods
    const mockApi = {
      /**
       * Add a route handler for the specified URL pattern
       * @param {string|RegExp} url - URL or pattern to match
       * @param {Function} handler - Handler function for the route
       */
      addRoute: async (url, handler) => {
        await page.route(url, handler);
      },
      
      /**
       * Remove a previously added route
       * @param {string|RegExp} url - URL or pattern to remove
       */
      removeRoute: async (url) => {
        await page.unroute(url);
      }
    };
    
    // Provide the mockApi object to the test
    await use(mockApi);
  }
});

// Re-export expect from the base test
export { expect } from '@playwright/test'; 