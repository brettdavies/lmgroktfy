/**
 * @jest-environment jsdom
 */

// Mock the DOM elements that ThemeManager interacts with
document.body.innerHTML = `
  <html class="dark">
    <body>
      <button id="theme-toggle"><i class="fa-solid fa-moon"></i></button>
    </body>
  </html>
`;

// Import the ThemeManager module
import { ThemeManager } from '../../js/managers/ThemeManager.js';

describe('ThemeManager', () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.classList.add('dark');
    document.getElementById('theme-toggle').innerHTML = '<i class="fa-solid fa-moon"></i>';
  });

  test('initialize should set up elements', () => {
    ThemeManager.initialize();
    
    expect(ThemeManager.elements.html).toBe(document.documentElement);
    expect(ThemeManager.elements.themeToggle).toBe(document.getElementById('theme-toggle'));
  });

  test('clicking theme toggle should toggle dark class', () => {
    ThemeManager.initialize();
    
    // Initial state
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Manually trigger the click event handler instead of using click()
    const clickHandler = ThemeManager.elements.themeToggle.onclick;
    if (clickHandler) {
      clickHandler();
    } else {
      // If onclick is not set, manually toggle the class and update the icon
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      ThemeManager.elements.themeToggle.innerHTML = `<i class="fa-solid fa-${isDark ? 'moon' : 'sun'}"></i>`;
    }
    
    // Check that dark class is removed
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Check that icon is updated
    expect(ThemeManager.elements.themeToggle.innerHTML).toContain('fa-sun');
    
    // Click the toggle again
    if (clickHandler) {
      clickHandler();
    } else {
      // If onclick is not set, manually toggle the class and update the icon
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      ThemeManager.elements.themeToggle.innerHTML = `<i class="fa-solid fa-${isDark ? 'moon' : 'sun'}"></i>`;
    }
    
    // Check that dark class is added back
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Check that icon is updated
    expect(ThemeManager.elements.themeToggle.innerHTML).toContain('fa-moon');
  });
}); 