import { AxeBuilder } from '@axe-core/playwright';

/**
 * Runs accessibility tests on the current page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} options - Options for axe
 * @returns {Promise<import('axe-core').AxeResults>} - Axe results
 */
async function runA11yTests(page, options = {}) {
  const axeBuilder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('[aria-hidden="true"]'); // Exclude hidden elements
  
  if (options.include) {
    axeBuilder.include(options.include);
  }
  
  return await axeBuilder.analyze();
}

export { runA11yTests }; 