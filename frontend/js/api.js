/**
 * js/api.js — Centralized API configuration and interceptors.
 */

// Auto-detect API base:
// 1. If window.BACKEND_URL is set (via config.js), use it
// 2. If on localhost, use localhost:3001
// 3. Otherwise assume frontend and backend are on the same domain (same Render service)
const API_BASE = (window.BACKEND_URL)
  ? `${window.BACKEND_URL}/api`
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : `${window.location.protocol}//${window.location.hostname}/api`;



/**
 * Perform a fetch request with JWT authentication.
 * Automatically handles 401 Unauthorized by redirecting to login.
 */
async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : ''
  };

  // Only set Content-Type to JSON if we aren't sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Check for PDF or other binary responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }

    const data = await response.json();

    if (response.status === 401) {
      // Token expired or invalid
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

/** Check if user is logged in. If not, redirect to login page. */
function checkAuth() {
  const token = sessionStorage.getItem('token');
  const path = window.location.pathname;
  
  // Public paths that do NOT require auth
  const isPublicPath = path.endsWith('login.html') || path.endsWith('index.html') || path === '/' || path === '';
  
  if (!token && !isPublicPath) {
    // Attempting to access protected route without token -> redirect to login
    window.location.href = 'login.html';
  }
}

/** Check if current user is an admin. Redirect if not. */
function checkAdmin() {
  const userStr = sessionStorage.getItem('user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }
  
  const user = JSON.parse(userStr);
  if (user.role !== 'ADMIN') {
    window.location.href = 'dashboard.html';
  }
}

/** Handle logout */
function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  window.location.href = 'index.html'; // Redirect to landing page on logout
}

/** Setup UI with user info (sidebar, topbar) */
function setupUserUI() {
  const userStr = sessionStorage.getItem('user');
  if (!userStr) return;
  const user = JSON.parse(userStr);

  // New sidebar IDs
  const nameEl   = document.getElementById('user-display-name');
  const roleEl   = document.getElementById('user-display-role');
  const initEl   = document.getElementById('user-initial');

  if (nameEl) nameEl.textContent = user.fullName || user.username || 'User';
  if (roleEl) roleEl.textContent = user.role || 'OPERATOR';
  if (initEl && (user.fullName || user.username)) {
    initEl.textContent = (user.fullName || user.username).charAt(0).toUpperCase();
  }

  // Legacy IDs (fallback)
  const nameEl2   = document.getElementById('sidebar-user-name');
  const roleEl2   = document.getElementById('sidebar-user-role');
  const avatarEl2 = document.getElementById('sidebar-user-avatar');
  if (nameEl2) nameEl2.textContent = user.fullName;
  if (roleEl2) roleEl2.textContent = user.role;
  if (avatarEl2 && user.fullName) avatarEl2.textContent = user.fullName.charAt(0).toUpperCase();

  // Hide admin link & Management header if not admin
  const adminLinks = document.querySelectorAll('a[href="admin.html"]');
  adminLinks.forEach(link => {
    if (user.role !== 'ADMIN') {
      link.style.display = 'none';
      // Hide the preceding section header label if present
      let prev = link.previousElementSibling;
      while (prev) {
        if (prev.classList.contains('nav-section-label')) {
          prev.style.display = 'none';
          break;
        }
        prev = prev.previousElementSibling;
      }
    }
  });
}

// Global utility for showing alerts
function showAlert(message, type = 'error', containerId = 'alert-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.className = `alert alert-${type} visible`;
  container.innerHTML = `
    <span class="alert-icon">${type === 'error' ? '⚠️' : '✅'}</span>
    <span class="alert-msg">${message}</span>
  `;
}
