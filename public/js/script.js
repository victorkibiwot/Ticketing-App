/* Main JavaScript for Sidebar, Logout, Login, and Create Ticket Forms */

/**
 * Open the sidebar
 */
function openNav() {
    const sidebar = document.getElementById("sidebar");
    const main = document.getElementById("main");
    const topBar = document.querySelector(".top-bar");
    if (sidebar && main && topBar) {
        document.body.classList.add("sidebar-open");
    }
}

/**
 * Close the sidebar
 */
function closeNav() {
    const sidebar = document.getElementById("sidebar");
    const main = document.getElementById("main");
    const topBar = document.querySelector(".top-bar");
    if (sidebar && main && topBar) {
        document.body.classList.remove("sidebar-open");
    }
}

/**
 * Close sidebar on outside click or overlay click
 */
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const burgerMenu = document.querySelector('.burger-menu');
    const overlay = document.querySelector('.sidebar-overlay');

    if (!sidebar || !burgerMenu) return;

    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnBurger = burgerMenu.contains(event.target);
    const isClickOnOverlay = overlay && event.target === overlay;

    if ((isClickOnOverlay || (!isClickInsideSidebar && !isClickOnBurger)) && document.body.classList.contains('sidebar-open')) {
        closeNav();
    }
});


/**
 * Auto-hide alerts after 2 seconds
 */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.style.display = 'none';
        }
    }, 2000);

    // Show URL parameter notifications
    showNotifications();
});

/**
 * Login form submission
 */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const payload = new URLSearchParams(formData);

        submitForm({
            form: loginForm,
            url: '/',
            loadingTitle: 'Logging in...',
            successTitle: 'Login successful!',
            errorTitle: 'Login failed',
            body: payload,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    });
}

/**
 * Create ticket form submission
 */
const createTicketForm = document.getElementById('createticketForm');
if (createTicketForm) {
    const selectedFiles = initFileUpload('attachmentsInput', 'customFileButton', 'fileList');

    createTicketForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', createTicketForm.title.value);
        formData.append('description', createTicketForm.description.value);
        selectedFiles.forEach(file => formData.append('attachments', file));
        formData.append('_csrf', createTicketForm.querySelector('input[name="_csrf"]').value);

        submitForm({
            form: createTicketForm,
            url: '/create-ticket',
            loadingTitle: 'Creating Ticket...',
            successTitle: 'Ticket Created!',
            errorTitle: 'Ticket Creation Failed!',
            body: formData,
            headers: { 'CSRF-Token': createTicketForm.querySelector('input[name="_csrf"]').value }
        });
    });
}

/**
 * Logout handler
 */
const logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
    logoutLink.addEventListener('click', async function (e) {
        e.preventDefault();
        submitForm({
            form: null,
            url: '/logout',
            method: 'GET',
            loadingTitle: 'Logging out...',
            successTitle: 'Logged Out!',
            errorTitle: 'Logout Failed',
        });
    });
}


/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark-mode');
    const themeToggleInput = document.getElementById('themeToggleInput');

    // Update checkbox state
    if (themeToggleInput) {
        themeToggleInput.checked = isDark;
    }

    // Save theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * Get saved theme from localStorage or system preference
 * @returns {string} 'dark' or 'light'
 */
function getCurrentTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (prefersDark ? 'dark' : 'light');
}

function initializeThemeToggleBtn() {
    const themeToggleInput = document.getElementById('themeToggleInput');

    if (themeToggleInput) {
        themeToggleInput.addEventListener('change', toggleTheme);
    }
}

initializeThemeToggleBtn();





