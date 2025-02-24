const { test, expect } = require('@playwright/test');

test.describe('Mobile-specific functionality', () => {
  // Only run these tests on mobile projects
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile browsers');
    await page.goto('/');
  });

  test('page loads correctly on mobile', async ({ page }) => {
    // Check that the viewport is appropriate for mobile
    const viewport = page.viewportSize();
    console.log(`Testing with viewport: ${viewport.width}x${viewport.height}`);
    
    // Check that the main elements are visible and properly sized for mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#question-input')).toBeVisible();
    
    // Check that the input is properly sized for mobile
    const inputBox = await page.locator('#question-input').boundingBox();
    expect(inputBox.width).toBeLessThanOrEqual(viewport.width - 20); // Allow for padding
  });

  test('submits question and displays answer on mobile', async ({ page }) => {
    // Set up a route handler that waits before responding
    let routeHandler;
    const responsePromise = new Promise(resolve => {
      routeHandler = route => {
        // Store the route for later fulfillment
        resolve(route);
      };
    });
    
    // Mock API response but don't fulfill immediately
    await page.route('/api/grok', routeHandler);
    
    // Type a question using tap and virtual keyboard
    await page.tap('#question-input');
    await page.keyboard.type('Mobile test question');
    
    // Submit the form
    await page.tap('#submit-button');
    
    // Verify loading state appears
    await expect(page.locator('#loading')).toBeVisible();
    
    // Now fulfill the API response
    const route = await responsePromise;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ answer: 'This is a test answer from Grok.' })
    });
    
    // Verify answer is displayed
    await expect(page.locator('#answer')).toContainText('This is a test answer from Grok.');
    
    // Check that the response container is properly sized for mobile
    const responseBox = await page.locator('#response').boundingBox();
    const viewport = page.viewportSize();
    expect(responseBox.width).toBeLessThanOrEqual(viewport.width - 20); // Allow for padding
  });
  
  test('touch interactions work correctly', async ({ page }) => {
    // Test touch tap on theme toggle
    await page.tap('#theme-toggle');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    
    // Test touch tap on help button
    await page.tap('button[title="How to use"]');
    await expect(page.locator('#help_modal')).toBeVisible();
    
    // Close modal with touch
    await page.tap('#help_modal form[method="dialog"] button');
    await expect(page.locator('#help_modal')).not.toBeVisible();
  });
  
  test('responsive layout adapts to orientation change', async ({ page, browserName }) => {
    // Skip this test for browsers that don't support orientation change simulation
    test.skip(browserName !== 'webkit' && browserName !== 'chromium', 'Orientation change simulation is only supported in webkit and chromium');
    
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone 8 portrait
    
    // Check layout in portrait
    await expect(page.locator('main')).toBeVisible();
    const portraitBox = await page.locator('main').boundingBox();
    
    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 }); // iPhone 8 landscape
    
    // Check layout in landscape
    await expect(page.locator('main')).toBeVisible();
    const landscapeBox = await page.locator('main').boundingBox();
    
    // Verify layout adapts to orientation change
    expect(portraitBox.width).not.toEqual(landscapeBox.width);
  });
}); 