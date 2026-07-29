/* ===== auth.js - 认证与用户管理（密码/卡密登录、用户增删、卡密管理弹窗） ===== */

// ===== 密码解码函数 =====
function decodePassword(encoded) { return atob(encoded); }

// ===== 卡密认证常量与函数 =====
const ADMIN_PASSWORD_ENC = "MTUwNDA4";
const ADMIN_PASSWORD = decodePassword(ADMIN_PASSWORD_ENC);
const CARD_KEYS_STORE = 'cardKeys';
const SESSION_KEY = 'authSession';
const CARD_SECRET_ENC = "WEs5bVAyd1E3dkw1";
const CARD_SECRET = decodePassword(CARD_SECRET_ENC);

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
  return `${now.toString(36).toUpperCase()}-${expireMs.toString(36).toUpperCase()}-${hash}`;
}

function verifySelfVerifyingCard(code) {
  const parts = code.split('-');
  if (parts.length !== 3) return { valid: false, reason: '卡密格式错误' };
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
  if (now > createTime + expireMs) return { valid: false, reason: '卡密已过期' };

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
    keys.push({
      code,
      status: 'active',
      createTime: new Date(createTime).toISOString(),
      expireDays: Math.ceil(expireMs / 86400000)
    });
    saveCardKeys(keys);
  }
  return { valid: true, card: { code, status: 'active' } };
}

function checkCardAccess(code) {
  return verifySelfVerifyingCard(code);
}

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

// ===== 登录界面 =====
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
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('adminLoginBtn').click();
  });
  document.getElementById('cardCodeInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('cardLoginBtn').click();
  });

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
    if (!code) {
      showToast('请输入卡密');
      return;
    }
    const result = checkCardAccess(code);
    if (result.valid) {
      setAuthSession({ role: 'card', cardCode: code });
      overlay.remove();
      initMainSystem();
    } else {
      showToast(result.reason);
    }
  };

  setTimeout(() => {
    document.getElementById('loginPassword').focus();
  }, 100);
}

function logout() {
  clearAuthSession();
  location.reload();
}

function initMainSystem() {
  document.getElementById('mainContent').style.display = '';
  if (isAdmin()) document.getElementById('cardMgrBtn').style.display = '';
  window._systemReady();
}

// ===== 用户管理（增删） =====
function getUsers() {
  const key = `users_${currentRegion}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveUsers(users) {
  const key = `users_${currentRegion}`;
  localStorage.setItem(key, JSON.stringify(users));
}

function addUser(name) {
  const users = getUsers();
  if (users.includes(name)) {
    showToast('用户已存在');
    return false;
  }
  users.push(name);
  saveUsers(users);
  return true;
}

async function deleteUser(name) {
  let users = getUsers();
  users = users.filter(u => u !== name);
  saveUsers(users);
  if (userBetData[name]) delete userBetData[name];
  rebuildTotal();
  refreshAll();
}

function rebuildTotal() {
  tableBetData = {};
  for (const u in userBetData) {
    for (const n in userBetData[u]) {
      tableBetData[n] = (tableBetData[n] || 0) + userBetData[u][n];
    }
  }
}

function refreshAll() {
  updateSelects();
  updateTableFromRecords();
}

function updateSelects() {
  const users = getUsers();
  const orderSel = document.getElementById('orderUserSelect');
  if (orderSel) {
    orderSel.innerHTML = '';
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u;
      o.textContent = u;
      orderSel.appendChild(o);
    });
  }
  const viewSel = document.getElementById('viewUserSelect');
  if (viewSel) {
    viewSel.innerHTML = '';
    users.forEach(u => {
      const o = document.createElement('option');
      o.value = u;
      o.textContent = u;
      viewSel.appendChild(o);
    });
  }
}

// ===== 卡密管理弹窗 =====
function showCardManager() {
  if (!isAdmin()) { showToast('需要管理员权限'); return; }
  if (document.getElementById('cardManagerWin')) return;
  const keys = getCardKeys();
  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'cardManagerWin';
  win.style.width = '650px';
  win.style.height = '500px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>🔑 卡密管理</h3><div class="window-controls"><button onclick="maximizeWindow('cardManagerWin')">🗖</button><button onclick="document.getElementById('cardManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><input type="number" id="expireDaysInput" placeholder="有效天数" value="30" min="1" style="padding:5px;border-radius:4px;border:1px solid #ccc;width:80px;"><span>天</span><button onclick="generateCardKey()" style="padding:6px 15px;background:#28a745;color:#fff;border:none;border-radius:4px;">生成卡密</button></div><div id="cardListContainer"></div></div><div class="modal-footer"><button onclick="document.getElementById('cardManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win);
  renderCardList();
  makeWindowDraggable('cardManagerWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
}

function renderCardList() {
  const keys = getCardKeys();
  const container = document.getElementById('cardListContainer');
  if (!container) return;
  if (keys.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无卡密</div>';
    return;
  }
  container.innerHTML = keys.map((card, idx) => {
    const created = card.createTime ? new Date(card.createTime).toLocaleString('zh-CN') : '未知';
    const expired = card.expireDays ? `有效${card.expireDays}天` : '永久';
    const statusClass = { active: 'green', disabled: 'red', expired: 'gray' }[card.status] || 'gray';
    const statusText = card.status === 'active' ? '启用' : card.status === 'disabled' ? '禁用' : '过期';
    return `<div style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="font-weight:bold;font-size:16px;">${card.code}</span>
      <span style="color:${statusClass};font-size:12px;">[${statusText}]</span>
      <span style="font-size:11px;color:#666;">创建:${created} ${expired}</span>
      <div style="margin-left:auto;display:flex;gap:5px;">
        ${card.status === 'active' ? `<button onclick="disableCard(${idx})" style="background:#f39c12;color:#fff;border:none;padding:3px 8px;border-radius:3px;">禁用</button>` : ''}
        ${card.status === 'disabled' ? `<button onclick="enableCard(${idx})" style="background:#2ecc71;color:#fff;border:none;padding:3px 8px;border-radius:3px;">启用</button>` : ''}
        <button onclick="deleteCard(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:3px 8px;border-radius:3px;">删除</button>
      </div>
    </div>`;
  }).join('');
}

async function generateCardKey() {
  const expireDays = parseInt(document.getElementById('expireDaysInput')?.value) || 30;
  if (expireDays < 1) { showToast('有效期至少1天'); return; }
  const code = generateSelfVerifyingCard(expireDays);
  const keys = getCardKeys();
  if (keys.find(k => k.code === code)) { showToast('卡密生成冲突，请重试'); return; }
  keys.push({ code, status: 'active', createTime: new Date().toISOString(), expireDays });
  saveCardKeys(keys);
  renderCardList();
  showToast(`卡密 ${code} 已生成，有效期${expireDays}天`);
}

async function disableCard(index) {
  if (!(await confirm('确定禁用该卡密？'))) return;
  const keys = getCardKeys();
  keys[index].status = 'disabled';
  saveCardKeys(keys);
  renderCardList();
}

async function enableCard(index) {
  const keys = getCardKeys();
  keys[index].status = 'active';
  saveCardKeys(keys);
  renderCardList();
}

async function deleteCard(index) {
  if (!(await confirm('确定删除该卡密？'))) return;
  const keys = getCardKeys();
  keys.splice(index, 1);
  saveCardKeys(keys);
  renderCardList();
}

// ===== 用户管理弹窗 =====
function showUserManager() {
  if (document.getElementById('userManagerWin')) return;
  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'userManagerWin';
  win.style.width = '450px';
  win.style.height = '400px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>管理用户</h3><div class="window-controls"><button onclick="maximizeWindow('userManagerWin')">🗖</button><button onclick="document.getElementById('userManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newUserName" placeholder="用户名" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addUserAction()" style="padding:6px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="userList"></div></div><div class="modal-footer"><button onclick="document.getElementById('userManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win);
  renderUserList();
  makeWindowDraggable('userManagerWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
  document.getElementById('newUserName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { addUserAction(); }
  });
}

function renderUserList() {
  const users = getUsers();
  const container = document.getElementById('userList');
  if (!container) return;
  if (users.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无用户</div>';
    return;
  }
  container.innerHTML = users.map(u => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:5px;border:1px solid #eee;border-radius:4px;">
      <span style="flex:1;">${u}</span>
      <button onclick="deleteUserAction('${u}')" style="background:#e74c3c;color:#fff;border:none;padding:2px 8px;border-radius:3px;">删除</button>
    </div>`).join('');
}

async function addUserAction() {
  const name = document.getElementById('newUserName')?.value.trim();
  if (!name) { showToast('请输入用户名'); return; }
  if (addUser(name)) {
    document.getElementById('newUserName').value = '';
    renderUserList();
    updateSelects();
    showToast('用户添加成功');
  }
}

async function deleteUserAction(name) {
  if (!(await confirm(`确定删除用户"${name}"及其数据吗？`))) return;
  deleteUser(name);
  renderUserList();
  updateSelects();
  showToast('用户已删除');
}