/**
 * BibleOps Premium - Main JavaScript
 * Shared utilities and helper functions
 */

// API base URL
const API_BASE = window.location.origin;

// Get auth token from storage
function getAuthToken() {
    return localStorage.getItem('bibleops_token') || sessionStorage.getItem('bibleops_token');
}

// Get current user from storage
function getCurrentUser() {
    const userStr = localStorage.getItem('bibleops_user') || sessionStorage.getItem('bibleops_user');
    return userStr ? JSON.parse(userStr) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Logout function
function logout() {
    localStorage.removeItem('bibleops_token');
    localStorage.removeItem('bibleops_user');
    sessionStorage.removeItem('bibleops_token');
    sessionStorage.removeItem('bibleops_user');
    window.location.href = '/premium/login.html';
}

// Redirect if not authenticated (for protected pages)
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/premium/login.html';
    }
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (response.status === 401) {
        // Token expired or invalid
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    return response;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Show error message
function showError(message, elementId = 'errorMessage') {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Hide error message
function hideError(elementId = 'errorMessage') {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Show success message
function showSuccess(message, elementId = 'successMessage') {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

// Hide success message
function hideSuccess(elementId = 'successMessage') {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

// Export for use in other scripts
window.BibleOpsApp = {
    getAuthToken,
    getCurrentUser,
    isAuthenticated,
    logout,
    requireAuth,
    apiRequest,
    formatDate,
    formatCurrency,
    showError,
    hideError,
    showSuccess,
    hideSuccess
};
