/**
 * Manages theme switching functionality and persistence
 * @namespace ThemeManager
 */
export const ThemeManager = {
    /** @type {HTMLElement|null} Theme toggle button element */
    toggle: null,
    
    /** @type {HTMLElement|null} Theme icon element */
    icon: null,

    /**
     * Updates the theme icon based on current theme
     * @param {'dark'|'light'} theme - The current theme
     */
    updateIcon(theme) {
        this.icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    },

    /**
     * Initializes theme management functionality
     * - Sets up DOM references
     * - Restores saved theme preference
     * - Adds theme toggle event listener
     */
    initialize() {
        this.toggle = document.getElementById('theme-toggle');
        this.icon = this.toggle.querySelector('i');

        // Only override the default if there's a saved preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            this.updateIcon(savedTheme);
        } else {
            this.updateIcon('dark');
        }

        this.toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            this.updateIcon(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}; 