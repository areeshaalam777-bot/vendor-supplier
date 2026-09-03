document.addEventListener('DOMContentLoaded', () => {
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authAlert = document.getElementById('auth-alert');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnRegSubmit = document.getElementById('btn-reg-submit');

  // Tab switcher
  tabBtnLogin.addEventListener('click', () => {
    tabBtnLogin.classList.add('active');
    tabBtnRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    authAlert.style.display = 'none';
  });

  tabBtnRegister.addEventListener('click', () => {
    tabBtnRegister.classList.add('active');
    tabBtnLogin.classList.remove('active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    authAlert.style.display = 'none';
  });

  // Check if already authenticated
  fetch('/api/auth/me')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = '/dashboard.html';
      }
    })
    .catch(() => {});

  // Handle Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      showAlert('Please enter both username and password.');
      return;
    }

    btnLoginSubmit.disabled = true;
    btnLoginSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    authAlert.style.display = 'none';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        window.location.href = '/dashboard.html';
      } else {
        showAlert(result.message || 'Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Unable to connect to server. Please ensure server is running.');
    } finally {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.innerHTML = `<span>Access Private Scorecard</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  });

  // Handle Registration
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      business_name: document.getElementById('reg-business-name').value.trim(),
      owner_name: document.getElementById('reg-owner-name').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      city: document.getElementById('reg-city').value,
      market_area: document.getElementById('reg-market').value.trim(),
      trade_category: document.getElementById('reg-trade').value,
      username: document.getElementById('reg-username').value.trim(),
      password: document.getElementById('reg-password').value
    };

    if (!payload.business_name || !payload.username || !payload.password) {
      showAlert('Please fill in all required fields.');
      return;
    }

    btnRegSubmit.disabled = true;
    btnRegSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registering business...`;
    authAlert.style.display = 'none';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        window.location.href = '/dashboard.html';
      } else {
        showAlert(result.message || 'Failed to create business account.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      showAlert('Connection error. Please try again.');
    } finally {
      btnRegSubmit.disabled = false;
      btnRegSubmit.innerHTML = `<span>Register Business & Start Logging</span> <i class="fa-solid fa-check"></i>`;
    }
  });

  function showAlert(msg) {
    authAlert.textContent = msg;
    authAlert.style.display = 'block';
  }
});
