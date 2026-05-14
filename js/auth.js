// ===== 自验证卡密认证系统 =====
const ADMIN_PASSWORD = "150408";
const CARD_KEYS_STORE = 'cardKeys';
const SESSION_KEY = 'authSession';
const CARD_SECRET = "XK9mP2wQ7vL5";

function getCardKeys() {
  try { return JSON.parse(localStorage.getItem(CARD_KEYS_STORE) || '[]'); } catch (e) { return []; }
}
function saveCardKeys(keys) {
  localStorage.setItem(CARD_KEYS_STORE, JSON.stringify(keys));
}

function getAuthSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
function setAuthSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function clearAuthSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// 生成卡密
function generateSelfVerifyingCard(expireDays) {
  const now = Date.now();
  const expireMs = expireDays * 86400000;
  const raw = `${now}-${expireMs}-${CARD_SECRET}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0');
  const payload = now.toString(36).toUpperCase() + '-' + expireMs.toString(36).toUpperCase();
  return `${payload}-${hash}`;
}

// 验证卡密
function verifySelfVerifyingCard(code) {
  const parts = code.split('-');
  if (parts.length !== 3) return { valid: false, reason: '卡密格式错误' };
  const payload = parts[0] + '-' + parts[1];
  const providedHash = parts[2];
  const now = Date.now();
  let createTime, expireMs;
  try {
    createTime = parseInt(parts[0], 36);
    expireMs = parseInt(parts[1], 36);
  } catch (e) {
    return { valid: false, reason: '卡密无效' };
  }
  if (isNaN(createTime) || isNaN(expireMs)) return { valid: false, reason: '卡密无效' };
  const expireTime = createTime + expireMs;
  if (now > expireTime) return { valid: false, reason: '卡密已过期' };
  const raw = `${createTime}-${expireMs}-${CARD_SECRET}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  const computedHash = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0');
  if (computedHash !== providedHash) return { valid: false, reason: '卡密验证失败' };
  const keys = getCardKeys();
  const found = keys.find(k => k.code === code);
  if (found && found.status === 'disabled') return { valid: false, reason: '卡密已被禁用' };
  if (!found) {
    keys.push({ code, status: 'active', createTime: new Date(createTime).toISOString(), expireDays: Math.ceil(expireMs / 86400000) });
    saveCardKeys(keys);
  }
  return { valid: true, card: { code, status: 'active' } };
}

function checkCardAccess(code) { return verifySelfVerifyingCard(code); }

function isAdmin() {
  const session = getAuthSession();
  return session && session.role === 'admin';
}

function checkCurrentAccess() {
  const session = getAuthSession();
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (session.role === 'card' && session.cardCode) {
    const result = verifySelfVerifyingCard(session.cardCode);
    if (!result.valid) {
      clearAuthSession();
      return false;
    }
    return true;
  }
  return false;
}

function showLoginScreen() {
  const overlay = document.createElement('div');
  overlay.className = 'login-overlay';
  overlay.id = 'loginOverlay';
  overlay.innerHTML = `
    <div class="login-box">
      <h3>🔐 系统登录</h3>
      <input type="password" id="loginPassword" placeholder="管理员密码">
      <button class="btn" style="background:#2c3e50;color:#fff;" id="adminLoginBtn">管理员登录</button>
      <hr style="margin:15px 0;">
      <input type="text" id="cardCodeInput" placeholder="卡密">
      <button class="btn" style="background:#e67e22;color:#fff;" id="cardLoginBtn">卡密登录</button>
      <div class="link" id="switchToCard">使用卡密登录</div>
      <div class="link" id="switchToAdmin" style="display:none;">管理员登录</div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('adminLoginBtn').onclick = () => {
    const pwd = document.getElementById('loginPassword').value.trim();
    if (pwd === ADMIN_PASSWORD) {
      setAuthSession({ role: 'admin' });
      overlay.remove();
      initMainSystem();
    } else {
      showToast('管理员密码错误');
    }
  };

  document.getElementById('cardLoginBtn').onclick = () => {
    const code = document.getElementById('cardCodeInput').value.trim().toUpperCase();
    if (!code) { showToast('请输入卡密'); return; }
    const result = checkCardAccess(code);
    if (result.valid) {
      setAuthSession({ role: 'card', cardCode: code });
      overlay.remove();
      initMainSystem();
    } else {
      showToast(result.reason);
    }
  };
}

function logout() {
  clearAuthSession();
  location.reload();
}

function initMainSystem() {
  document.getElementById('mainContent').style.display = '';
  if (isAdmin()) {
    document.getElementById('cardMgrBtn').style.display = '';
  }
  window._systemReady();
}
