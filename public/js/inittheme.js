function initializeThemeToggleBtn() {
    const themeToggleInput = document.getElementById('themeToggleInput');

    if (themeToggleInput) {
        themeToggleInput.addEventListener('change', toggleTheme);
    }
}