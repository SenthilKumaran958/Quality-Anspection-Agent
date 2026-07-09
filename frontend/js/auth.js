/**
 * js/auth.js — Handles login and registration logic.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // If already logged in, redirect to dashboard
  if (sessionStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
    return;
  }

  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin   = document.getElementById('form-login');
  const formRegister= document.getElementById('form-register');

  // Tab switching
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.style.display = 'block';
    formLogin.style.display = 'none';
  });

  // Login Submit
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formLogin.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    const payload = {
      username: document.getElementById('login-username').value,
      password: document.getElementById('login-password').value
    };

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      handleAuthSuccess(res.data);
    } catch (err) {
      showAlert(err.message, 'error', 'auth-alert');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Register Submit
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formRegister.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    const payload = {
      fullName: document.getElementById('reg-fullname').value,
      email:    document.getElementById('reg-email').value,
      username: document.getElementById('reg-username').value,
      password: document.getElementById('reg-password').value
    };

    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      handleAuthSuccess(res.data);
    } catch (err) {
      showAlert(err.message, 'error', 'auth-alert');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });

});

function handleAuthSuccess(userData) {
  sessionStorage.setItem('token', userData.token);
  sessionStorage.setItem('user', JSON.stringify(userData));
  
  showAlert('Authentication successful! Redirecting...', 'success', 'auth-alert');
  
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}
