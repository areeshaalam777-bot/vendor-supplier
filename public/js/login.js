document.addEventListener('DOMContentLoaded', () => {
  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authAlert = document.getElementById('auth-alert');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnRegSubmit = document.getElementById('btn-reg-submit');

  // Password visibility toggles
  const btnToggleLoginPwd = document.getElementById('btn-toggle-login-pwd');
  const toggleLoginIcon = document.getElementById('toggle-login-icon');
  const loginPasswordInput = document.getElementById('login-password');

  const btnToggleRegPwd = document.getElementById('btn-toggle-reg-pwd');
  const toggleRegIcon = document.getElementById('toggle-reg-icon');
  const regPasswordInput = document.getElementById('reg-password');

  if (btnToggleLoginPwd && loginPasswordInput) {
    btnToggleLoginPwd.addEventListener('click', () => {
      const isPwd = loginPasswordInput.type === 'password';
      loginPasswordInput.type = isPwd ? 'text' : 'password';
      toggleLoginIcon.className = isPwd ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  }

  if (btnToggleRegPwd && regPasswordInput) {
    btnToggleRegPwd.addEventListener('click', () => {
      const isPwd = regPasswordInput.type === 'password';
      regPasswordInput.type = isPwd ? 'text' : 'password';
      toggleRegIcon.className = isPwd ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    });
  }

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

  // Handle Login Form Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      showAlert('Please enter both username and password.', 'danger');
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
        showAlert('Authentication successful! Loading dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 300);
      } else {
        showAlert(result.message || 'Invalid username or password.', 'danger');
      }
    } catch (err) {
      console.error('Login error:', err);
      showAlert('Unable to connect to server. Please check your connection and ensure the server is active.', 'danger');
    } finally {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.innerHTML = `<span>Access Private Scorecard</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
  });

  // Handle Registration Form Submit
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
      showAlert('Please fill in all required fields (Business Name, Username, Password).', 'danger');
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
        showAlert('Account created successfully! Loading your scorecard ledger...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 400);
      } else {
        showAlert(result.message || 'Failed to create business account.', 'danger');
      }
    } catch (err) {
      console.error('Registration error:', err);
      showAlert('Connection error. Please try again.', 'danger');
    } finally {
      btnRegSubmit.disabled = false;
      btnRegSubmit.innerHTML = `<span>Register Business & Start Logging</span> <i class="fa-solid fa-check"></i>`;
    }
  });

  function showAlert(msg, type = 'danger') {
    authAlert.textContent = msg;
    authAlert.className = `alert alert-${type}`;
    authAlert.style.display = 'block';
  }
});
