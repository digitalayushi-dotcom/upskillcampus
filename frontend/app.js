const API_CANDIDATES = (() => {
  const isLiveServer = /^55\d\d$/.test(window.location.port || '');
  if (isLiveServer) return ['http://localhost:5001/api', 'http://localhost:5000/api'];
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) return ['http://localhost:5001/api', 'http://localhost:5000/api'];
  return ['https://nonmischievous-sindy-unofficially.ngrok-free.dev/api'];
})();


// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('cms_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('cms_user')); } catch { return null; }
}
function isLoggedIn() {
  const token = getToken();
  const user = getUser();
  return !!(token && user && user.email);
}

function logout() {
  localStorage.removeItem('cms_token');
  localStorage.removeItem('cms_user');
  window.location.href = 'login.html';
}

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  const token = getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  let res;
  for (const base of API_CANDIDATES) {
    try {
      res = await fetch(base + endpoint, opts);
      break;
    } catch {
      // Try next candidate.
    }
  }
  if (!res) throw new Error('Cannot reach API server. Start backend on port 5000 or 5001.');

  const raw = await res.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      const looksHtml = raw.trim().startsWith('<');
      data = { error: looksHtml ? '' : raw };
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('cms_token');
      localStorage.removeItem('cms_user');
      throw new Error('Session expired. Please login again.');
    }
    if (res.status === 413) {
      throw new Error('Page is too large. Compress image blocks and try again.');
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── NAV RENDER ───────────────────────────────────────────────────────────────
function renderNav(activePage = '') {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const userLabel = user && user.email ? user.email.split('@')[0] : 'user';

  const nav = document.getElementById('nav');
  if (!nav) return;

  nav.innerHTML = `
    <a class="nav-logo" href="blogs.html">Ink<span>.</span>CMS</a>
    <div class="nav-links">
      <a class="nav-link ${activePage === 'blogs' ? 'active' : ''}" href="blogs.html">All Posts</a>
      ${loggedIn ? `
        <a class="nav-link ${activePage === 'editor' ? 'active' : ''}" href="editor.html">Write</a>
        <a class="nav-link ${activePage === 'builder' ? 'active' : ''}" href="builder.html">Page Builder</a>
        <span class="nav-link text-muted font-mono" style="font-size:12px">${userLabel}</span>
        <button class="nav-btn ghost" onclick="logout()">Logout</button>
      ` : `
        <a class="nav-btn ghost" href="login.html">Login</a>
        <a class="nav-btn" href="register.html">Get Started</a>
      `}
    </div>
  `;
}
