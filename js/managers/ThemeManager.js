/**
 * Manages theme toggling functionality
 * @namespace ThemeManager
 */
export const ThemeManager = {
    elements: {
        html: null,
        themeToggle: null
    },

    initialize() {
        this.elements.html = document.documentElement;
        this.elements.themeToggle = document.getElementById('theme-toggle');
        
        this.setupEventListeners();
    },

    setupEventListeners() {
        this.elements.themeToggle.addEventListener('click', () => {
            this.elements.html.classList.toggle('dark');
            const isDark = this.elements.html.classList.contains('dark');
            this.elements.themeToggle.innerHTML = `<i class="fa-solid fa-${isDark ? 'moon' : 'sun'}"></i>`;
        });
    }
}; 