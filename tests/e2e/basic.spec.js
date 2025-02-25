const { test, expect } = require('@playwright/test');

test.describe('Basic functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads correctly', async ({ page }) => {
    // Check that the title is correct
    await expect(page).toHaveTitle('Let me Grok that for you');
    
    // Check that the main elements are visible
    await expect(page.locator('h1')).toContainText('Let me Grok that for you');
    await expect(page.locator('#question-input')).toBeVisible();
    await expect(page.locator('#submit-button')).toBeVisible();
    await expect(page.locator('#submit-button')).toBeDisabled();
  });

  test('submits question and displays answer', async ({ page }) => {
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
    
    // Type a question
    await page.fill('#question-input', 'What is the meaning of life?');
    
    // Check that submit button is enabled
    await expect(page.locator('#submit-button')).toBeEnabled();
    
    // Submit the form
    await page.click('#submit-button');
    
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
    await expect(page.locator('#question-display')).toContainText('What is the meaning of life?');
    
    // Verify URL was updated
    expect(page.url()).toContain('What%20is%20the%20meaning%20of%20life%3F');
    
    // Verify action buttons are visible
    await expect(page.locator('#continue-link')).toBeVisible();
    await expect(page.locator('#use-grok-button')).toBeVisible();
    await expect(page.locator('#copy-question-answer-button')).toBeVisible();
    await expect(page.locator('#copy-answer-button')).toBeVisible();
    await expect(page.locator('#share-button')).toBeVisible();
    await expect(page.locator('#share-on-x-button')).toBeVisible();
  });
  
  test('theme toggle works', async ({ page }) => {
    // Check initial theme
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Toggle theme
    await page.click('#theme-toggle');
    
    // Check theme changed
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    
    // Toggle theme back
    await page.click('#theme-toggle');
    
    // Check theme changed back
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
  
  test('help modal opens and closes', async ({ page }) => {
    // Check that help modal is not visible initially
    await expect(page.locator('#help_modal')).not.toBeVisible();
    
    // Open help modal
    await page.click('button[title="How to use"]');
    
    // Check that help modal is visible
    await expect(page.locator('#help_modal')).toBeVisible();
    await expect(page.locator('#help_modal h2')).toContainText('How to Use LMGROKTFY');
    
    // Close help modal
    await page.click('#help_modal form[method="dialog"] button');
    
    // Check that help modal is not visible
    await expect(page.locator('#help_modal')).not.toBeVisible();
  });

  test('clicking home link and submitting a new question works correctly', async ({ page, mockApi }) => {
    // Set up API mock
    await mockApi.addRoute('/api/grok', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ answer: 'This is a test answer' })
      });
    });

    // Navigate to the page
    await page.goto('/');

    // Submit first question
    await page.fill('#question-input', 'First test question');
    await page.click('button[type="submit"]');

    // Wait for the response to be displayed
    await page.waitForSelector('#response:not(.hidden)');
    
    // Verify first answer is displayed
    await expect(page.locator('#question-display')).toHaveText('First test question');
    await expect(page.locator('#answer')).toHaveText('This is a test answer');

    // Click the home link to reset
    await page.click('.home-link');

    // Verify the UI is reset
    await expect(page.locator('#response')).toHaveClass(/hidden/);
    await expect(page.locator('#question-form')).not.toHaveClass(/hidden/);
    await expect(page.locator('#question-input')).toHaveValue('');

    // Submit second question
    await page.fill('#question-input', 'Second test question');
    await page.click('button[type="submit"]');

    // Wait for the response to be displayed
    await page.waitForSelector('#response:not(.hidden)');
    
    // Verify second answer is displayed
    await expect(page.locator('#question-display')).toHaveText('Second test question');
    await expect(page.locator('#answer')).toHaveText('This is a test answer');
  });
}); 