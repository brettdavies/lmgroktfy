/**
 * Manages theme switching and persistence
 * @namespace ThemeManager
 */
import { UIState } from './UIState.js';

export const ThemeManager = {
    /**
     * Available themes
     */
    themes: {
        LIGHT: 'light',
        DARK: 'dark',
        SYSTEM: 'system'
    },
    
    /**
     * Current theme
     */
    currentTheme: null,
    
    /**
     * Initialize the theme manager
     */
    initialize() {
        // Set up theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }
        
        // Set up theme selector if it exists
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        // Load saved theme
        this.loadTheme();
        
        // Listen for system preference changes
        this.setupSystemPreferenceListener();
    },
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = this.getTheme();
        
        if (currentTheme === this.themes.LIGHT || currentTheme === this.themes.SYSTEM) {
            this.setTheme(this.themes.DARK);
        } else {
            this.setTheme(this.themes.LIGHT);
        }
    },
    
    /**
     * Set a specific theme
     * @param {string} theme - The theme to set (light, dark, or system)
     */
    setTheme(theme) {
        // Validate theme
        if (!Object.values(this.themes).includes(theme)) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }
        
        this.currentTheme = theme;
        
        // If theme is system, determine based on system preference
        let effectiveTheme = theme;
        if (theme === this.themes.SYSTEM) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = prefersDark ? this.themes.DARK : this.themes.LIGHT;
        }
        
        // Apply theme classes using UIState
        if (effectiveTheme === this.themes.DARK) {
            // Apply dark theme
            UIState.addClass(document.documentElement, 'dark');
            UIState.removeClass(document.documentElement, 'light');
            UIState.addClass(document.body, 'dark-theme');
            UIState.removeClass(document.body, 'light-theme');
            UIState.setAttribute(document.documentElement, 'data-theme', 'dark');
        } else {
            // Apply light theme
            UIState.addClass(document.documentElement, 'light');
            UIState.removeClass(document.documentElement, 'dark');
            UIState.addClass(document.body, 'light-theme');
            UIState.removeClass(document.body, 'dark-theme');
            UIState.setAttribute(document.documentElement, 'data-theme', 'light');
        }
        
        // Update theme toggle button if it exists
        this.updateThemeToggleButton(effectiveTheme);
        
        // Update theme selector if it exists
        this.updateThemeSelector(this.currentTheme);
        
        // Save theme preference
        this.saveTheme(this.currentTheme);
        
        // Dispatch theme change event
        this.dispatchThemeChangeEvent(effectiveTheme);
    },
    
    /**
     * Get the current theme
     * @returns {string} The current theme
     */
    getTheme() {
        if (this.currentTheme) {
            return this.currentTheme;
        }
        
        // Check HTML element for data-theme attribute
        const dataTheme = document.documentElement.getAttribute('data-theme');
        if (dataTheme) {
            return dataTheme === 'dark' ? this.themes.DARK : this.themes.LIGHT;
        }
        
        // Check HTML element for dark/light class
        if (document.documentElement.classList.contains('dark')) {
            return this.themes.DARK;
        } else if (document.documentElement.classList.contains('light')) {
            return this.themes.LIGHT;
        }
        
        // Check body classes
        if (document.body.classList.contains('dark-theme')) {
            return this.themes.DARK;
        } else if (document.body.classList.contains('light-theme')) {
            return this.themes.LIGHT;
        }
        
        // Default to system
        return this.themes.SYSTEM;
    },
    
    /**
     * Save theme preference to localStorage
     * @param {string} theme - The theme to save
     */
    saveTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    },
    
    /**
     * Load theme preference from localStorage
     */
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme');
            
            if (savedTheme) {
                this.setTheme(savedTheme);
            } else {
                // Default to system preference
                this.setTheme(this.themes.SYSTEM);
            }
        } catch (error) {
            console.error('Failed to load theme preference:', error);
            // Default to system preference
            this.setTheme(this.themes.SYSTEM);
        }
    },
    
    /**
     * Update the theme toggle button
     * @param {string} theme - The current theme
     */
    updateThemeToggleButton(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        // Update button icon or text
        if (theme === this.themes.DARK) {
            UIState.setText(themeToggle, '☀️'); // Sun icon for switching to light
            UIState.setAttribute(themeToggle, 'aria-label', 'Switch to light theme');
            UIState.setAttribute(themeToggle, 'title', 'Switch to light theme');
        } else {
            UIState.setText(themeToggle, '🌙'); // Moon icon for switching to dark
            UIState.setAttribute(themeToggle, 'aria-label', 'Switch to dark theme');
            UIState.setAttribute(themeToggle, 'title', 'Switch to dark theme');
        }
    },
    
    /**
     * Update the theme selector
     * @param {string} theme - The current theme
     */
    updateThemeSelector(theme) {
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;
        
        // Set the selector value
        UIState.setAttribute(themeSelector, 'value', theme);
    },
    
    /**
     * Set up listener for system preference changes
     */
    setupSystemPreferenceListener() {
        if (!window.matchMedia) return;
        
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Add change listener
        mediaQuery.addEventListener('change', (e) => {
            // Only update if theme is set to system
            if (this.currentTheme === this.themes.SYSTEM) {
                const theme = e.matches ? this.themes.DARK : this.themes.LIGHT;
                this.setTheme(this.themes.SYSTEM); // This will apply the correct theme based on system preference
            }
        });
    },
    
    /**
     * Dispatch a theme change event
     * @param {string} theme - The new theme
     */
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themechange', {
            detail: { theme }
        });
        document.dispatchEvent(event);
    },
    
    /**
     * Check if the browser supports dark mode
     * @returns {boolean} Whether dark mode is supported
     */
    isDarkModeSupported() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all';
    },
    
    /**
     * Check if the system prefers dark mode
     * @returns {boolean} Whether the system prefers dark mode
     */
    systemPrefersDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}; 