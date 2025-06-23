function initializeThemeToggleBtn() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark-mode');
    const sunIcon = document.querySelector('.theme-icon.bi-sun');
    const moonIcon = document.querySelector('.theme-icon.bi-moon');
    const themeText = document.querySelector('.theme-text');

    if (sunIcon && moonIcon && themeText) {
        sunIcon.classList.toggle('d-none', isDark);
        moonIcon.classList.toggle('d-none', !isDark);
        themeText.textContent = isDark ? 'Toggle Light Mode' : 'Toggle Dark Mode';
    }
}