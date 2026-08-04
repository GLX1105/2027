// ===== ui.js - 用户界面与窗口管理 =====

// ===== 密码解码函数（与认证相关，放在ui.js中） =====
function decodePassword(encoded) { return atob(encoded); }

// ===== 卡密认证 =====
const ADMIN_PASSWORD_ENC = "MTUwNDA4"; const ADMIN_PASSWORD = decodePassword(ADMIN_PASSWORD_ENC);
const CARD_KEYS_STORE = 'cardKeys'; const SESSION_KEY = 'authSession';
const CARD_SECRET_ENC = "WEs5bVAyd1E3dkw1"; const CARD_SECRET = decodePassword(CARD_SECRET_ENC);
function getCardKeys() { try { return JSON.parse(localStorage.getItem(CARD_KEYS_STORE) || '[]'); } catch (e) { return []; } }
function saveCardKeys(keys) { localStorage.setItem(CARD_KEYS_STORE, JSON.stringify(keys)); }
function getAuthSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
function setAuthSession(session) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function clearAuthSession() { sessionStorage.removeItem(SESSION_KEY); }
function generateSelfVerifyingCard(expireDays) { const now = Date.now(); const expireMs = expireDays * 86400000; const raw = `${now}-${expireMs}-${CARD_SECRET}`; let hash = 0; for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; } hash = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0'); return `${now.toString(36).toUpperCase()}-${expireMs.toString(36).toUpperCase()}-${hash}`; }
function verifySelfVerifyingCard(code) { const parts = code.split('-'); if (parts.length !== 3) return { valid: false, reason: '卡密格式错误' }; const payload = parts[0] + '-' + parts[1]; const providedHash = parts[2]; const now = Date.now(); let createTime, expireMs; try { createTime = parseInt(parts[0], 36); expireMs = parseInt(parts[1], 36); } catch (e) { return { valid: false, reason: '卡密无效' }; } if (isNaN(createTime) || isNaN(expireMs)) return { valid: false, reason: '卡密无效' }; if (now > createTime + expireMs) return { valid: false, reason: '卡密已过期' }; const raw = `${createTime}-${expireMs}-${CARD_SECRET}`; let hash = 0; for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; } const computedHash = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0'); if (computedHash !== providedHash) return { valid: false, reason: '卡密验证失败' }; const keys = getCardKeys(); const found = keys.find(k => k.code === code); if (found && found.status === 'disabled') return { valid: false, reason: '卡密已被禁用' }; if (!found) { keys.push({ code, status: 'active', createTime: new Date(createTime).toISOString(), expireDays: Math.ceil(expireMs / 86400000) }); saveCardKeys(keys); } return { valid: true, card: { code, status: 'active' } }; }
function checkCardAccess(code) { return verifySelfVerifyingCard(code); }
function isAdmin() { const session = getAuthSession(); return session && session.role === 'admin'; }
function checkCurrentAccess() { const session = getAuthSession(); if (!session) return false; if (session.role === 'admin') return true; if (session.role === 'card' && session.cardCode) { const result = verifySelfVerifyingCard(session.cardCode); if (!result.valid) { clearAuthSession(); return false; } return true; } return false; }
function showLoginScreen() { const overlay = document.createElement('div'); overlay.className = 'login-overlay'; overlay.id = 'loginOverlay'; overlay.innerHTML = `<div class="login-box"><h3>🔐 系统登录</h3><input type="password" id="loginPassword" placeholder="管理员密码"><button class="btn" style="background:#2c3e50;color:#fff;" id="adminLoginBtn">管理员登录</button><hr style="margin:15px 0;"><input type="text" id="cardCodeInput" placeholder="卡密"><button class="btn" style="background:#e67e22;color:#fff;" id="cardLoginBtn">卡密登录</button><div class="link" id="switchToCard">使用卡密登录</div><div class="link" id="switchToAdmin" style="display:none;">管理员登录</div></div>`; document.body.appendChild(overlay);
  document.getElementById('loginPassword').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('adminLoginBtn').click(); });
  document.getElementById('cardCodeInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('cardLoginBtn').click(); });
  document.getElementById('adminLoginBtn').onclick = () => { const pwd = document.getElementById('loginPassword').value.trim(); if (pwd === ADMIN_PASSWORD) { setAuthSession({ role: 'admin' }); overlay.remove(); initMainSystem(); } else showToast('管理员密码错误'); };
  document.getElementById('cardLoginBtn').onclick = () => { const code = document.getElementById('cardCodeInput').value.trim().toUpperCase(); if (!code) { showToast('请输入卡密'); return; } const result = checkCardAccess(code); if (result.valid) { setAuthSession({ role: 'card', cardCode: code }); overlay.remove(); initMainSystem(); } else showToast(result.reason); };
  setTimeout(() => { document.getElementById('loginPassword').focus(); }, 100);
}
function logout() { clearAuthSession(); location.reload(); }
function initMainSystem() { document.getElementById('mainContent').style.display = ''; if (isAdmin()) document.getElementById('cardMgrBtn').style.display = ''; window._systemReady(); }

// ===== 自定义对话框系统 =====
function showCustomDialog({ title = '提示', message = '', type = 'alert', defaultValue = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div'); overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `<div class="custom-dialog-box"><div class="custom-dialog-title">${title}</div><div class="custom-dialog-message">${message}</div>${type==='prompt'?`<input class="custom-dialog-input" type="text" value="${defaultValue}" placeholder="${placeholder}" id="custom-dialog-input">`:''}<div class="custom-dialog-buttons">${type==='confirm'||type==='prompt'?'<button class="custom-dialog-btn cancel" id="custom-dialog-cancel">取消</button>':''}<button class="custom-dialog-btn confirm" id="custom-dialog-confirm">确定</button></div></div>`;
    document.body.appendChild(overlay);
    const confirmBtn = overlay.querySelector('#custom-dialog-confirm'); const cancelBtn = overlay.querySelector('#custom-dialog-cancel'); const inputEl = overlay.querySelector('#custom-dialog-input');
    const close = (result) => { document.body.removeChild(overlay); resolve(result); };
    confirmBtn.onclick = () => { if (type === 'prompt') close(inputEl.value); else if (type === 'confirm') close(true); else close(undefined); };
    if (cancelBtn) cancelBtn.onclick = () => { if (type === 'confirm') close(false); else if (type === 'prompt') close(null); else close(undefined); };
    if (inputEl) { inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirmBtn.click(); }); inputEl.focus(); }
  });
}
function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast-message'; toast.textContent = message; document.body.appendChild(toast); requestAnimationFrame(() => { toast.classList.add('show'); }); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { document.body.removeChild(toast); }, 300); }, 1500); }
async function customAlert(message) { await showCustomDialog({ title: '提示', message, type: 'alert' }); }
async function customConfirm(message) { return await showCustomDialog({ title: '请确认', message, type: 'confirm' }); }
async function customPrompt(message, defaultValue = '') { return await showCustomDialog({ title: '请输入', message, type: 'prompt', defaultValue }); }
window.alert = async (msg) => { await customAlert(msg); };
window.confirm = async (msg) => { return await customConfirm(msg); };
window.prompt = async (msg, def) => { return await customPrompt(msg, def); };

// ===== 存储抽屉控制 =====
let storageDrawerTimer = null;
function toggleStorageDrawer() {
  const panel = document.getElementById('storagePanel');
  if (!panel) return;
  const isShowing = panel.classList.contains('show');
  if (isShowing) {
    panel.classList.remove('show');
    if (storageDrawerTimer) { clearTimeout(storageDrawerTimer); storageDrawerTimer = null; }
  } else {
    panel.classList.add('show');
    updateLogCount();
  }
}
function showStorageDrawerTemporary(duration = 5000) {
  const panel = document.getElementById('storagePanel');
  if (!panel) return;
  panel.classList.add('show');
  updateLogCount();
  if (storageDrawerTimer) clearTimeout(storageDrawerTimer);
  storageDrawerTimer = setTimeout(() => {
    panel.classList.remove('show');
    storageDrawerTimer = null;
  }, duration);
}

document.addEventListener('click', function(e) {
  const drawer = document.getElementById('storageDrawer');
  if (!drawer) return;
  const panel = document.getElementById('storagePanel');
  if (!panel || !panel.classList.contains('show')) return;
  if (!drawer.contains(e.target)) {
    panel.classList.remove('show');
    if (storageDrawerTimer) { clearTimeout(storageDrawerTimer); storageDrawerTimer = null; }
  }
});

// ===== 地区切换核心逻辑 =====
let currentRegion = localStorage.getItem('currentRegion') || 'macau';
function getCurrentRegion() { return currentRegion; }
function setCurrentRegion(region) {
  currentRegion = region;
  localStorage.setItem('currentRegion', region);
  document.getElementById('btnMacau').classList.toggle('region-active', region === 'macau');
  document.getElementById('btnHongkong').classList.toggle('region-active', region === 'hongkong');
  document.getElementById('btnYuegang').classList.toggle('region-active', region === 'yuegang');
  const navbar = document.getElementById('mainNavbar');
  if (navbar) {
    if (region === 'macau') navbar.style.borderBottomColor = '#e74c3c';
    else if (region === 'hongkong') navbar.style.borderBottomColor = '#3498db';
    else if (region === 'yuegang') navbar.style.borderBottomColor = '#27ae60';
  }
  document.body.setAttribute('data-region', region);
}

async function switchRegion(region) {
  if (region === currentRegion) return;
  const recognizeWin = document.getElementById('recognizeWin');
  const sourceInput = document.querySelector('.source-order-input');
  if (recognizeWin && sourceInput && sourceInput.value.trim()) {
    const confirmed = await confirm('识别弹窗中有未保存的订单内容，切换地区将清空输入，确定切换吗？');
    if (!confirmed) return;
    sourceInput.value = ''; const resultEl = document.getElementById('orderResult'); if (resultEl) resultEl.innerHTML = ''; updateOrderTotalDisplay();
  }
  const orderWin = document.getElementById('orderWin'); if (orderWin) orderWin.remove();
  const reportWin = document.getElementById('reportWin'); if (reportWin) reportWin.remove();
  setCurrentRegion(region); clearMemoryData(); await updateTableFromRecords(); updateSelects(); updateRecycleCount(); updateRecentDrawTexts(); renderSmartDecision();
  addOperationLog('switch', `切换至${region === 'macau' ? '澳门' : region === 'hongkong' ? '香港' : '粤港'}`, region);
  showToast(`已切换至${region === 'macau' ? '澳门' : region === 'hongkong' ? '香港' : '粤港'}`);
}

function clearMemoryData() { tableBetData = {}; userBetData = {}; reportBetData = {}; reportAmountData = {}; reportRiskData = {}; numberCount = {}; zodiacCount = {}; numberAmountCount = {}; zodiacAmountCount = {}; zodiacDirectAmount = {}; zodiacFilteredAmount = {}; zodiacReportAmount = {}; zodiacFilteredReportAmount = {}; numberOrderTotal = 0; zodiacWeightedTotal = 0; originalOrderAmount = {}; directOrderAmount = {}; directReportAmount = {}; }

// ===== 浮动窗口控制（只允许标题栏拖拽 + 边界弹回） =====
let highestZ = 2000;
function makeWindowDraggable(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  const header = win.querySelector('.modal-header') || win.querySelector('.database-modal-header');
  if (!header) return;
  let isDragging = false, startX, startY, startLeft, startTop;

  function onMouseDown(e) {
    if (e.target.closest('.window-controls')) return;
    if (e.target.closest('input, textarea, button, select, [contenteditable="true"]')) return;
    if (e.offsetX > e.target.clientWidth || e.offsetY > e.target.clientHeight) return;
    isDragging = true;
    const rect = win.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    // 如果窗口已经越界，先拉回安全位置再开始拖拽
    const minVisible = 50;
    if (startTop < 0) {
      win.style.top = '0px';
      win.style.transform = 'none';
      startTop = 0;
    }
    if (startLeft < -win.offsetWidth + minVisible) {
      win.style.left = (-win.offsetWidth + minVisible) + 'px';
      win.style.transform = 'none';
      startLeft = -win.offsetWidth + minVisible;
    }
    if (startLeft > window.innerWidth - minVisible) {
      win.style.left = (window.innerWidth - minVisible) + 'px';
      win.style.transform = 'none';
      startLeft = window.innerWidth - minVisible;
    }

    win.style.cursor = 'grabbing';
    e.preventDefault();
  }

  header.addEventListener('mousedown', onMouseDown);

  // 双击标题栏重置窗口到中央
  header.addEventListener('dblclick', function(e) {
    if (e.target.closest('.window-controls')) return;
    if (e.target.closest('input, textarea, button, select')) return;
    win.style.left = '50%';
    win.style.top = '50%';
    win.style.transform = 'translate(-50%, -50%)';
    win.style.right = '';
    win.style.bottom = '';
    showToast('窗口已重置到中央');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    const winWidth = win.offsetWidth;
    const winHeight = win.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const minVisible = 50;

    if (newLeft < -winWidth + minVisible) newLeft = -winWidth + minVisible;
    if (newLeft > screenWidth - minVisible) newLeft = screenWidth - minVisible;
    if (newTop < 5) newTop = 5;
    if (newTop > screenHeight - minVisible) newTop = screenHeight - minVisible;

    win.style.left = newLeft + 'px';
    win.style.top = newTop + 'px';
    win.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    win.style.cursor = '';

    // 松开鼠标后兜底修正
    const rect = win.getBoundingClientRect();
    const winWidth = win.offsetWidth;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const minVisible = 50;

    if (rect.top < 5) {
      win.style.top = '5px';
      win.style.transform = 'none';
    }
    if (rect.left < -winWidth + minVisible) {
      win.style.left = (-winWidth + minVisible) + 'px';
      win.style.transform = 'none';
    }
    if (rect.left > screenWidth - minVisible) {
      win.style.left = (screenWidth - minVisible) + 'px';
      win.style.transform = 'none';
    }
    if (rect.top > screenHeight - minVisible) {
      win.style.top = (screenHeight - minVisible) + 'px';
      win.style.transform = 'none';
    }
  });

  win.addEventListener('mousedown', () => { highestZ += 1; win.style.zIndex = highestZ; });
}

// ===== 最大化窗口 =====
function maximizeWindow(winId) { const win = document.getElementById(winId); if (!win) return; const isMaximized = win.getAttribute('data-maximized') === 'true'; if (isMaximized) { const origWidth = win.getAttribute('data-orig-width'); const origHeight = win.getAttribute('data-orig-height'); const origLeft = win.getAttribute('data-orig-left'); const origTop = win.getAttribute('data-orig-top'); const origTransform = win.getAttribute('data-orig-transform'); if (origWidth) win.style.width = origWidth; if (origHeight) win.style.height = origHeight; if (origLeft) win.style.left = origLeft; if (origTop) win.style.top = origTop; if (origTransform !== null) win.style.transform = origTransform; win.style.right = ''; win.style.bottom = ''; win.setAttribute('data-maximized', 'false'); win.style.resize = 'both'; win.style.overflow = 'auto'; } else { const rect = win.getBoundingClientRect(); win.setAttribute('data-orig-width', win.style.width || (rect.width + 'px')); win.setAttribute('data-orig-height', win.style.height || (rect.height + 'px')); win.setAttribute('data-orig-left', win.style.left || (rect.left + 'px')); win.setAttribute('data-orig-top', win.style.top || (rect.top + 'px')); win.setAttribute('data-orig-transform', win.style.transform || ''); win.style.left = '0'; win.style.top = '0'; win.style.right = '0'; win.style.bottom = '0'; win.style.width = 'auto'; win.style.height = 'auto'; win.style.transform = 'none'; win.setAttribute('data-maximized', 'true'); win.style.resize = 'none'; win.style.overflow = 'auto'; } }

// ===== 数据库弹窗 =====
const PASSWORD_ENC = "ODkxMTA1"; const PASSWORD = decodePassword(PASSWORD_ENC);
async function showDatabase() { const pwd = await prompt("请输入数据库密码：",""); if (pwd === PASSWORD) { const modal = document.getElementById('databaseModal'); if (!modal) return; modal.style.display = 'flex'; highestZ += 1; modal.style.zIndex = highestZ; renderDatabaseContent(); makeWindowDraggable('databaseModalBox'); } else { await alert("密码错误"); } }
function hideDatabase() { const modal = document.getElementById('databaseModal'); if (modal) modal.style.display = 'none'; }

function renderDatabaseContent() {
  const content = document.getElementById('databaseModalContent');
  if (!content) return;
  const sections = [
    { title: '基础生肖', data: ZODIAC_NUMS },
    { title: '五行', data: { '金': D['金'], '木': D['木'], '水': D['水'], '火': D['火'], '土': D['土'] } },
    { title: '属性肖', data: {} },
    { title: '大小单双', data: { '单': D['单'], '双': D['双'], '大': D['大'], '小': D['小'], '小单': D['小单'], '大单': D['大单'], '小双': D['小双'], '大双': D['大双'] } },
    { title: '合数单双', data: { '合单': D['合单'], '合双': D['合双'], '合大': D['合大'], '合小': D['合小'] } },
    { title: '波色', data: { '红波': D['红波'], '红大': D['红大'], '红小': D['红小'], '红单': D['红单'], '红双': D['红双'], '蓝波': D['蓝波'], '蓝大': D['蓝大'], '蓝小': D['蓝小'], '蓝单': D['蓝单'], '蓝双': D['蓝双'], '绿波': D['绿波'], '绿大': D['绿大'], '绿小': D['绿小'], '绿单': D['绿单'], '绿双': D['绿双'] } },
    { title: '头数', data: {} },
    { title: '尾数', data: {} },
    { title: '岁数', data: {} },
    { title: '合数', data: {} },
    { title: '其他属性码', data: {} }
  ];
  for (let k of Object.keys(ATTR_TO_ZODIACS)) sections[2].data[k] = ATTR_TO_ZODIACS[k];
  for (let h = 0; h <= 4; h++) { sections[6].data[h + '头'] = D[h + '头']; sections[6].data[h + '头单'] = D[h + '头单']; sections[6].data[h + '头双'] = D[h + '头双']; }
  for (let i = 0; i <= 9; i++) sections[7].data[i + '尾'] = D[i + '尾'];
  sections[7].data['小尾'] = D['小尾']; sections[7].data['大尾'] = D['大尾'];
  const cnT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  for (let i = 0; i <= 9; i++) sections[7].data[cnT[i] + '尾'] = D[cnT[i] + '尾'];
  for (let [k, v] of Object.entries(AGE_TO_NUMS)) {
    const nums = v.split(/[\s,，]+/);
    const zs = nums.map(n => NUM_TO_ZODIAC[n] || n).filter((val, i, a) => a.indexOf(val) === i);
    sections[8].data[k] = zs.join('');
  }
  for (let i = 1; i <= 13; i++) sections[9].data[i + '合'] = D[i + '合'];
  const otherKeys = ['反数', '内围码', '外围码', '前码', '后码', '左边码', '右边码', '楼上码', '楼下码', '风码', '雨码', '深码', '浅码', '拼码', '搏码', '高码', '低码', '长码', '短码', '黑码', '白码', '冷码', '热码', '爱码', '恨码', '顺码', '逆码', '天码', '地码'];
  for (let k of otherKeys) if (D[k] && !sections[10].data[k]) sections[10].data[k] = D[k];
  let html = '<h2 style="text-align:center;color:#1a1a2e;margin-bottom:15px;">号码数据库</h2>';
  for (let sec of sections) {
    const entries = Object.entries(sec.data); if (entries.length === 0) continue;
    html += `<div class="config-section"><div class="config-section-title" style="font-size:14px;font-weight:bold;margin-bottom:8px;">${sec.title} (${entries.length}条)</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">`;
    for (let [k, v] of entries) {
      html += `<div style="display:flex;justify-content:space-between;padding:4px 8px;background:#f5f6fa;border-radius:4px;font-size:12px;"><span style="color:#4a90c4;font-weight:bold;">${k}</span><span style="color:#3a7ab5;font-family:Consolas,monospace;">${v}</span></div>`;
    }
    html += '</div></div>';
  }
  content.innerHTML = html;
}

// ===== 插入分类文字 =====
function insertCategoryText(text) {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + text + ta.value.substring(end);
  ta.focus();
  ta.setSelectionRange(start + text.length, start + text.length);
  performRecognition(ta.value);
}

// ===== 地区圆点切换函数 =====
function setDotRegion(region) {
  window._dotRegion = region;
  const dotSmart = document.getElementById('dotSmart');
  const dotMacau = document.getElementById('dotMacau');
  const dotHongkong = document.getElementById('dotHongkong');
  const dotYuegang = document.getElementById('dotYuegang');
  
  if (dotSmart) {
    if (region === 'auto') {
      dotSmart.style.background = '#8e44ad'; dotSmart.style.color = '#fff'; dotSmart.style.border = '1px solid #8e44ad';
      if (dotSmart.querySelector('span')) dotSmart.querySelector('span').style.background = '#fff';
    } else {
      dotSmart.style.background = 'transparent'; dotSmart.style.color = '#8e44ad'; dotSmart.style.border = '1px solid #8e44ad';
      if (dotSmart.querySelector('span')) { dotSmart.querySelector('span').style.background = 'transparent'; dotSmart.querySelector('span').style.border = '1px solid #8e44ad'; }
    }
  }
  if (dotMacau) {
    if (region === 'macau') {
      dotMacau.style.background = '#e74c3c'; dotMacau.style.color = '#fff'; dotMacau.style.border = '1px solid #e74c3c';
      if (dotMacau.querySelector('span')) dotMacau.querySelector('span').style.background = '#fff';
    } else {
      dotMacau.style.background = 'transparent'; dotMacau.style.color = '#e74c3c'; dotMacau.style.border = '1px solid #e74c3c';
      if (dotMacau.querySelector('span')) { dotMacau.querySelector('span').style.background = 'transparent'; dotMacau.querySelector('span').style.border = '1px solid #e74c3c'; }
    }
  }
  if (dotHongkong) {
    if (region === 'hongkong') {
      dotHongkong.style.background = '#3498db'; dotHongkong.style.color = '#fff'; dotHongkong.style.border = '1px solid #3498db';
      if (dotHongkong.querySelector('span')) dotHongkong.querySelector('span').style.background = '#fff';
    } else {
      dotHongkong.style.background = 'transparent'; dotHongkong.style.color = '#3498db'; dotHongkong.style.border = '1px solid #3498db';
      if (dotHongkong.querySelector('span')) { dotHongkong.querySelector('span').style.background = 'transparent'; dotHongkong.querySelector('span').style.border = '1px solid #3498db'; }
    }
  }
  if (dotYuegang) {
    if (region === 'yuegang') {
      dotYuegang.style.background = '#27ae60'; dotYuegang.style.color = '#fff'; dotYuegang.style.border = '1px solid #27ae60';
      if (dotYuegang.querySelector('span')) dotYuegang.querySelector('span').style.background = '#fff';
    } else {
      dotYuegang.style.background = 'transparent'; dotYuegang.style.color = '#27ae60'; dotYuegang.style.border = '1px solid #27ae60';
      if (dotYuegang.querySelector('span')) { dotYuegang.querySelector('span').style.background = 'transparent'; dotYuegang.querySelector('span').style.border = '1px solid #27ae60'; }
    }
  }
}

// ===== 标记地区函数 =====
function markRegion(region) {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  if (start === end) { showToast('请先选择文本'); return; }
  const selectedText = ta.value.substring(start, end);
  if (!selectedText.trim()) { showToast('请先选择文本'); return; }
  
  const prefixMap = { 'macau': '澳', 'hongkong': '港', 'yuegang': '粤' };
  const prefix = prefixMap[region] || '';
  
  const allPrefixes = ['澳', '奥', '澳门', '奥门', '门', '港', '香', '香港', '粤', '粤港'];
  const allPrefixesSorted = [...allPrefixes].sort((a, b) => b.length - a.length);
  
  const lines = selectedText.split('\n');
  const markedLines = lines.map(line => {
    let trimmed = line.trim();
    if (!trimmed) return line;
    
    for (const p of allPrefixesSorted) {
      if (trimmed.startsWith(p)) {
        trimmed = trimmed.substring(p.length).trim();
        break;
      }
    }
    
    const leadingSpace = line.match(/^(\s*)/)[1];
    return leadingSpace + prefix + trimmed;
  });
  
  const markedText = markedLines.join('\n');
  ta.value = ta.value.substring(0, start) + markedText + ta.value.substring(end);
  performRecognition(ta.value);
  const regionLabels = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };
  showToast('已标记为' + (regionLabels[region] || region));
}

// ===== 识别弹窗 =====
function showRecognizeModal() {
  if (document.getElementById('recognizeWin')) return;
  const regionLabel = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港';
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'recognizeWin';
  win.style.width = '850px'; win.style.height = '650px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.setAttribute('data-orig-width', '850px'); win.setAttribute('data-orig-height', '650px');
  window._dotRegion = window._dotRegion || 'auto';
  const catWords = '各 各号 单 双 大 小 鼠 牛 虎 兔 龙 蛇 马 羊 猴 鸡 狗 猪 金 木 水 火 土 红波 蓝波 绿波 红单 红双 蓝单 蓝双 绿单 绿双 单数 双数 家禽 野兽 二中二 三中三 平特肖 平特尾 二连肖 三连肖 四连肖 五连肖 二连尾 三连尾 四连尾 五连尾 五不中 六不中 七不中 八不中 九不中 十不中 十一不中 十二不中 二中特 三中二 特串 复试';
  const catSpans = catWords.split(' ').map(w => `<span class="cat-insert-text" onclick="insertCategoryText('${w}')">${w}</span>`).join(' ');
  win.innerHTML = `
    <div class="modal-header">${regionLabel}订单输入<div class="window-controls"><button onclick="maximizeWindow('recognizeWin')">🗖</button><button onclick="closeRecognizeModal()">×</button></div></div>
    <div class="modal-body" style="display:flex; flex-direction:column; gap:10px;">
      <div class="card recognize-card" style="flex:1; display:flex; flex-direction:column;">
        <div class="card-title" style="display:flex; align-items:center; gap:5px;">
          <select id="orderUserSelect" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;font-size:13px;"></select>
          <div class="amount-stat-box" id="orderTotalAmountBox" style="display:none;"><span>合计：</span><span id="orderTotalAmount">0</span><span id="orderLineCount" style="margin-left:10px;font-weight:normal;font-size:13px;display:none;"></span></div>
          <span id="maxLossDisplay"></span>
          <div style="display:flex; align-items:center; gap:6px; margin-left:auto; margin-right:4px;">
            <span onclick="setDotRegion('auto')" id="dotSmart" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="智能识别">
              <span style="width:7px;height:7px;border-radius:50%;"></span>智能
            </span>
            <span onclick="setDotRegion('macau')" id="dotMacau" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="澳门">
              <span style="width:7px;height:7px;border-radius:50%;"></span>澳
            </span>
            <span onclick="setDotRegion('hongkong')" id="dotHongkong" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="香港">
              <span style="width:7px;height:7px;border-radius:50%;"></span>港
            </span>
            <span onclick="setDotRegion('yuegang')" id="dotYuegang" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="粤港">
              <span style="width:7px;height:7px;border-radius:50%;"></span>粤
            </span>
          </div>
          <button class="btn btn-prefix btn-sm" onclick="showPrefixManager()">前缀</button>
          <button class="btn btn-amount-prefix btn-sm" onclick="showAmountPrefixManager()">金额前缀</button>
          <button class="btn btn-amount-prefix2 btn-sm" onclick="showAmountSuffixManager()">金额后缀</button>
        </div>
        <div class="order-input-container" style="flex:1;"><div class="input-column"><div class="box-label">订单输入框</div><textarea class="source-order-input" oninput="performRecognition(this.value)"></textarea></div><div class="result-column"><div class="box-label">识别结果</div><div class="result-area-new"><div class="result-content" id="orderResult" contenteditable="false"></div></div></div></div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-paste" onclick="pasteOrder()">粘贴订单</button>
          <button class="btn btn-save-order" onclick="saveOrder()">保存下单</button>
          <button class="btn btn-report" onclick="saveReportOrder()" style="background:#e74c3c;color:#fff;">上报</button>
          <button class="btn btn-clear" onclick="clearAllInput()">清空</button>
          <button class="btn btn-replace-sep btn-sm" onclick="replaceSeparators()">换分隔</button>
          <button class="btn btn-remove-sep btn-sm" onclick="removeSeparators()">去分隔</button>
          <button class="btn btn-mark btn-sm" onclick="markSelection()">标记</button>
          <button class="btn btn-cancel btn-sm" onclick="semanticReplace()">语义转换</button>
          <button class="btn btn-sm" onclick="markRegion('macau')" style="background:#e74c3c;color:#fff;">标澳</button>
          <button class="btn btn-sm" onclick="markRegion('hongkong')" style="background:#3498db;color:#fff;">标港</button>
          <button class="btn btn-sm" onclick="markRegion('yuegang')" style="background:#27ae60;color:#fff;">标粤</button>
          <span id="invalidTokensDisplay" style="color:red; font-size:12px; display:none; white-space:pre-line; margin-left:auto;"></span>
        </div>
        <div class="cat-shortcuts-container" id="catShortcutsContainer" style="font-size:12px;line-height:1.6;margin-top:6px;">${catSpans}</div>
      </div>
    </div>`;
  document.body.appendChild(win); updateSelects();
  const textarea = win.querySelector('.source-order-input');
  if (textarea) { const draftKey = `recognizeDraft_${currentRegion}`; const draft = localStorage.getItem(draftKey); if (draft) { textarea.value = draft; performRecognition(draft); } textarea.addEventListener('dragover', (e) => { e.preventDefault(); }); textarea.addEventListener('drop', (e) => { e.preventDefault(); const data = e.dataTransfer.getData('text/plain'); if (data) { textarea.value = data; performRecognition(data); showToast('已拖入文本'); } }); }
  makeWindowDraggable('recognizeWin'); highestZ += 1; win.style.zIndex = highestZ;
  win.setAttribute('data-window-type', 'recognize');
  
  setTimeout(() => { if (typeof setDotRegion === 'function') setDotRegion(window._dotRegion || 'auto'); }, 100);

  if (window.innerWidth > 768) {
    const container = document.getElementById('catShortcutsContainer');
    if (container) container.classList.add('show');
  }
}

function closeRecognizeModal() { const textarea = document.querySelector('.source-order-input'); if (textarea) { const draftKey = `recognizeDraft_${currentRegion}`; localStorage.setItem(draftKey, textarea.value); } const win = document.getElementById('recognizeWin'); if (win) win.remove(); }

function markSelection() { const ta = document.querySelector('.source-order-input'); if (!ta) return; const start = ta.selectionStart, end = ta.selectionEnd; if (start === end) { showToast('请先选择文本'); return; } const selectedText = ta.value.substring(start, end); const tokens = selectedText.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim()); if (tokens.length === 0) { showToast('所选内容无有效文字'); return; } const merged = tokens.join('-'); ta.value = ta.value.substring(0, start) + merged + ta.value.substring(end); performRecognition(ta.value); }

// ===== 订单记录展示窗口 =====
window._orderListAllData = [];
window._orderListPage = 0;
window._orderListPageSize = 50;

async function showOrderRecord(filter='all'){ try{ const recs=await getOrderRecords(),users=getUsers(),today=getTodayCST(); const reports=await getReportOrderRecords(); const fd=document.getElementById('filterDate')?.value; const fRecs=fd?recs.filter(r=>r.date===fd):recs; const fReps=fd?reports.filter(r=>r.date===fd):reports; if(document.getElementById('orderWin'))document.getElementById('orderWin').remove(); const w=document.createElement('div'); w.className='floating-window'; w.id='orderWin'; w.style.width='750px'; w.style.height='600px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)'; let html=`<div class="modal-header"><h3>下单记录 <span style="font-size:12px;font-weight:normal;">(共${fRecs.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('orderWin')">🗖</button><button onclick="document.getElementById('orderWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
  html+=`<div style="margin-bottom:6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><select id="recordUserFilter" onchange="showOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter==='all'?'selected':''}>全部用户</option>`;
  users.forEach(u=>html+=`<option value="${u}" ${u===filter?'selected':''}>${u}</option>`);
  html+=`</select><button onclick="checkAll()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAll()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteChecked()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button>`;
  html+=`<span style="display:flex;align-items:center;gap:3px;margin-left:auto;"><span id="orderStatsContainer" style="margin-right:4px;"></span><span style="display:flex;align-items:center;gap:2px;"><span>对奖:</span><input type="text" id="prizeNumberInput" maxlength="2" oninput="applyPrizeFilter()" style="padding:4px;border-radius:4px;border:1px solid #ccc;width:50px;text-align:center;"></span></span>`;
  html+=`</div><div id="orderListContainer" style="flex:1; overflow-y:auto;">`;
  const fin=(filter==='all')?fRecs:fRecs.filter(r=>r.user===filter);
  window._orderListAllData = fin;
  window._orderListPage = 0;
  if(fin.length===0)html+=`<div style="padding:20px;text-align:center;color:#666;">暂无订单记录</div>`;
  else{ const pageSize = window._orderListPageSize; const pageData = fin.slice(0, pageSize); pageData.forEach(it=>{ const ts=formatTimestampToCST(it.timestamp),ud=it.user||'未知',col=getUserColor(ud),ta=it.totalAmount||0;
    let contentHtml = it.content.replace(/\n/g,'<br>');
    html+=`<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${contentHtml}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`;
  }); if (fin.length > pageSize) { html += `<div style="text-align:center;padding:10px;" id="loadMoreOrdersBtn"><button onclick="loadMoreOrders()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`; } }
  html+=`</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('orderWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  w.innerHTML=html; document.body.appendChild(w); makeWindowDraggable('orderWin'); highestZ+=1; w.style.zIndex=highestZ;
  const uv = filter || 'all';
  const userOrders = uv === 'all' ? fRecs : fRecs.filter(r => r.user === uv); const userReports = uv === 'all' ? fReps : fReps.filter(r => r.user === uv); renderOrderStats(userOrders, userReports, uv, '');
  }catch(e){showToast('加载失败');} }

function loadMoreOrders() {
  window._orderListPage = (window._orderListPage || 0) + 1;
  const container = document.getElementById('orderListContainer');
  if (!container) return;
  const allData = window._orderListAllData || [];
  const pageSize = window._orderListPageSize;
  const start = window._orderListPage * pageSize;
  const pageData = allData.slice(start, start + pageSize);
  const oldBtn = document.getElementById('loadMoreOrdersBtn');
  if (oldBtn) oldBtn.remove();
  let html = '';
  pageData.forEach(it => {
    const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0;
    let contentHtml = it.content.replace(/\n/g, '<br>');
    html += `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${contentHtml}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`;
  });
  container.insertAdjacentHTML('beforeend', html);
  if (start + pageSize < allData.length) {
    container.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:10px;" id="loadMoreOrdersBtn"><button onclick="loadMoreOrders()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${start + pageSize}/${allData.length}）</button></div>`);
  }
}

async function deleteOrderRecord(id) {
  if (!(await confirm('确定删除？（可到回收站恢复）'))) return;
  try {
    const record = await new Promise((resolve) => { const tx = db.transaction([STORE_NAME], 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); });
    const result = await deleteOrderRecordFromIDB(id);
    if (result) {
      if (record) {
        addOperationLog('delete_order', record.content, currentRegion, record.user, record.totalAmount || 0);
        deductPingtexiaoFromContent(record.content);
      }
      await updateTableFromRecords(); calculateStorageUsage();
      showOrderRecord(); updateRecycleCount();
      if (document.getElementById('lianxiaoStatsWin')) { refreshLianxiaoStats(); }
      showToast('已移入回收站');
    } else { showToast('删除失败，记录可能已不存在'); }
  } catch(e) { console.error('删除订单异常', e); showToast('删除异常'); }
}

async function deleteChecked(){
  const ids=[]; document.querySelectorAll('.order-check:checked').forEach(cb=>ids.push(String(cb.dataset.id)));
  if(ids.length===0){showToast('请选择');return;}
  if(!(await confirm(`确定要删除选中的 ${ids.length} 条记录吗？（可到回收站恢复）`))) return;
  try {
    const details = [];
    for (const id of ids) { const record = await new Promise((resolve) => { const tx = db.transaction([STORE_NAME], 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (record) details.push(record); }
    await batchDeleteOrderRecordFromIDB(ids);
    details.forEach(rec => {
      addOperationLog('delete_order', rec.content, currentRegion, rec.user, rec.totalAmount || 0);
      deductPingtexiaoFromContent(rec.content);
    });
    await updateTableFromRecords(); calculateStorageUsage();
    showOrderRecord(); updateRecycleCount();
    if (document.getElementById('lianxiaoStatsWin')) { refreshLianxiaoStats(); }
    showToast(`已将 ${ids.length} 条移入回收站`);
  } catch(e) { console.error('批量删除异常', e); showToast('批量删除异常'); }
}

function clearAllInput(){ 
  const si=document.querySelector('.source-order-input'); if(si)si.value=''; 
  const re=document.getElementById('orderResult'); if(re)re.innerHTML=''; 
  window._pureOrderLines = []; 
  window._pureOrderRegions = [];
  updateOrderTotalDisplay(); 
  const md=document.getElementById('maxLossDisplay'); if(md){md.textContent='';md.style.display='none';}
  const box = document.getElementById('orderTotalAmountBox'); if(box) box.style.display='none';
  const lineCountSpan = document.getElementById('orderLineCount'); if(lineCountSpan) lineCountSpan.style.display='none';
}

async function showReportOrderRecord(filter='all'){ try{ const recs=await getReportOrderRecords(),users=getUsers(); if(document.getElementById('reportWin'))document.getElementById('reportWin').remove(); const fd=document.getElementById('filterDate')?.value; const df=fd?recs.filter(r=>r.date===fd):recs; const fin=(filter==='all')?df:df.filter(r=>r.user===filter); window._reportListAllData = fin; window._reportListPage = 0; const w=document.createElement('div'); w.className='floating-window'; w.id='reportWin'; w.style.width='700px'; w.style.height='500px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)'; let html=`<div class="modal-header"><h3>上报数据 <span style="font-size:12px;font-weight:normal;">(共${fin.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('reportWin')">🗖</button><button onclick="document.getElementById('reportWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`; html+=`<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><select id="reportRecordUserFilter" onchange="showReportOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter==='all'?'selected':''}>全部用户</option>`; users.forEach(u=>html+=`<option value="${u}" ${u===filter?'selected':''}>${u}</option>`); html+=`</select><button onclick="checkAllReport()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAllReport()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteCheckedReport()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button></div>`; html+=`<div id="reportOrderListContainer" style="flex:1; overflow-y:auto;">`; if(fin.length===0)html+=`<div style="padding:20px;text-align:center;color:#666;">暂无上报记录</div>`; else{ const pageSize = window._orderListPageSize || 50; const pageData = fin.slice(0, pageSize); pageData.forEach(it=>{ const ts=formatTimestampToCST(it.timestamp),ud=it.user||'未知',ta=it.totalAmount||0; html+=`<div class="order-item"><input type="checkbox" class="report-order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${it.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:red;">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteReportOrderRecord('${it.id}')">删除</button></div>`; }); if (fin.length > pageSize) { html += `<div style="text-align:center;padding:10px;" id="loadMoreReportsBtn"><button onclick="loadMoreReports()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`; } } html+=`</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.report-order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('reportWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; w.innerHTML=html; document.body.appendChild(w); makeWindowDraggable('reportWin'); highestZ+=1; w.style.zIndex=highestZ; }catch(e){showToast('加载失败');} }

function loadMoreReports() {
  window._reportListPage = (window._reportListPage || 0) + 1;
  const container = document.getElementById('reportOrderListContainer');
  if (!container) return;
  const allData = window._reportListAllData || [];
  const pageSize = window._orderListPageSize || 50;
  const start = window._reportListPage * pageSize;
  const pageData = allData.slice(start, start + pageSize);
  const oldBtn = document.getElementById('loadMoreReportsBtn');
  if (oldBtn) oldBtn.remove();
  let html = '';
  pageData.forEach(it => {
    const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', ta = it.totalAmount || 0;
    html += `<div class="order-item"><input type="checkbox" class="report-order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${it.content.replace(/\n/g, '<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:red;">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteReportOrderRecord('${it.id}')">删除</button></div>`;
  });
  container.insertAdjacentHTML('beforeend', html);
  if (start + pageSize < allData.length) {
    container.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:10px;" id="loadMoreReportsBtn"><button onclick="loadMoreReports()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${start + pageSize}/${allData.length}）</button></div>`);
  }
}

async function deleteReportOrderRecord(id) {
  if (!(await confirm('确定删除？（可到回收站恢复）'))) return;
  try {
    const record = await new Promise((resolve) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
      const store = tx.objectStore(REPORT_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    const result = await deleteReportOrderRecordFromIDB(id);
    if (result) {
      if (record) {
        addOperationLog('delete_report', record.content, currentRegion, record.user, record.totalAmount || 0);
        deductPingtexiaoFromReportContent(record.content);
      }
      await updateTableFromRecords(); calculateStorageUsage();
      const userFilter = document.getElementById('reportRecordUserFilter')?.value || 'all';
      await showReportOrderRecord(userFilter);
      updateRecycleCount();
      showToast('已移入回收站');
    } else {
      showToast('删除失败，记录可能已不存在');
    }
  } catch(e) {
    console.error('删除上报异常', e);
    showToast('删除异常');
  }
}

async function deleteCheckedReport(){
  const ids=[]; document.querySelectorAll('.report-order-check:checked').forEach(cb=>ids.push(String(cb.dataset.id)));
  if(ids.length===0){showToast('请选择');return;}
  if(!(await confirm(`确定要删除选中的 ${ids.length} 条上报记录吗？（可到回收站恢复）`))) return;
  try {
    const details = [];
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
        const store = tx.objectStore(REPORT_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (record) details.push(record);
    }
    await batchDeleteReportOrderRecordFromIDB(ids);
    details.forEach(rec => {
      addOperationLog('delete_report', rec.content, currentRegion, rec.user, rec.totalAmount || 0);
      deductPingtexiaoFromReportContent(rec.content);
    });
    await updateTableFromRecords();
    calculateStorageUsage();
    const userFilter = document.getElementById('reportRecordUserFilter')?.value || 'all';
    await showReportOrderRecord(userFilter);
    updateRecycleCount();
    showToast(`已将 ${ids.length} 条移入回收站`);
  } catch(e) { console.error('批量删除异常', e); showToast('批量删除异常'); }
}

function checkAll(){ document.querySelectorAll('.order-check').forEach(cb=>cb.checked=true); }
function uncheckAll(){ document.querySelectorAll('.order-check').forEach(cb=>cb.checked=false); }
function checkAllReport(){ document.querySelectorAll('.report-order-check').forEach(cb=>cb.checked=true); }
function uncheckAllReport(){ document.querySelectorAll('.report-order-check').forEach(cb=>cb.checked=false); }

// ===== 清空重置按钮 =====
let resetLock = false; let resetLongPressTimer = null;
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('mousedown', () => { resetLongPressTimer = setTimeout(async () => { resetLongPressTimer = null; const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！'); if (!confirmed) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearAllOrderRecordsFromIDB(); await clearAllReportOrderRecordsFromIDB(); await clearAllComboOrderRecordsFromIDB(); clearMemoryData(); renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); addOperationLog('reset', '清空全部数据（长按）'); showToast('已清空香港和澳门全部数据'); }, 3000); });
  resetBtn.addEventListener('mouseup', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
  resetBtn.addEventListener('mouseleave', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
  resetBtn.addEventListener('touchstart', (e) => { resetLongPressTimer = setTimeout(async () => { resetLongPressTimer = null; const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！'); if (!confirmed) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearAllOrderRecordsFromIDB(); await clearAllReportOrderRecordsFromIDB(); await clearAllComboOrderRecordsFromIDB(); clearMemoryData(); renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); addOperationLog('reset', '清空全部数据（长按）'); showToast('已清空香港和澳门全部数据'); }, 3000); e.preventDefault(); });
  resetBtn.addEventListener('touchend', (e) => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
  resetBtn.addEventListener('touchcancel', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
}

async function resetTable(){
  if (resetLock) return; resetLock = true;
  try {
    const regionName = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港';
    const confirmed = await confirm(`确定清空当前地区（${regionName}）的所有订单和上报数据吗？此操作不可恢复。`);
    if (!confirmed) { resetLock = false; return; }
    const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); resetLock = false; return; }
    clearMemoryData();
    await clearAllOrderRecordsFromIDB(currentRegion); await clearAllReportOrderRecordsFromIDB(currentRegion); await clearAllComboOrderRecordsFromIDB(currentRegion);
    for (let i = localStorage.length - 1; i >= 0; i--) { const key = localStorage.key(i); if (key && key.startsWith(`pingtexiao_${currentRegion}_`)) localStorage.removeItem(key); if (key && key.startsWith(`ptHighlight_${currentRegion}_`)) localStorage.removeItem(key); }
    renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); renderPingtexiaoTable();
    addOperationLog('reset', `清空${regionName}所有订单和上报记录`); showToast(`已清空${regionName}的所有订单和上报记录`);
  } catch(e) {} finally { resetLock = false; }
}

async function pasteOrder(){ try{ const text=await navigator.clipboard.readText(); if(text){const si=document.querySelector('.source-order-input');if(si){si.value=text;performRecognition(text);}} } catch(err){showToast('无法访问剪贴板');} }

function copySingleOrderById(id) { const el = document.querySelector(`.order-content[data-id="${id}"]`); if (!el) { showToast('未找到订单内容'); return; } navigator.clipboard.writeText(el.innerText).then(() => { showToast('已复制到剪贴板'); }).catch(() => { showToast('复制失败'); }); }
function batchCopyOrders(selector) { const checked = document.querySelectorAll(selector + ':checked'); if (checked.length === 0) { showToast('请先选择订单'); return; } const contents = []; checked.forEach(cb => { const id = cb.dataset.id; if (id) { const el = document.querySelector(`.order-content[data-id="${id}"]`); if (el) contents.push(el.innerText); } }); if (contents.length === 0) { showToast('无有效内容'); return; } navigator.clipboard.writeText(contents.join('\n')).then(() => { showToast(`已复制 ${contents.length} 条订单`); }).catch(() => { showToast('复制失败'); }); }

// ===== 平特肖填充 =====
function fillPingtexiao() { const resultEl = document.getElementById('orderResult'); if (!resultEl) { showToast('识别结果为空'); return; } const text = resultEl.innerText.trim(); if (!text) { showToast('识别结果为空'); return; } const lines = text.split('\n'); const zodiacAmounts = {}; lines.forEach(line => { const { zodiacs, amount } = countItemsInLine(line); if (zodiacs.length > 0 && amount > 0) { zodiacs.forEach(z => { zodiacAmounts[z] = (zodiacAmounts[z] || 0) + amount; }); } }); const matchedZodiacs = Object.keys(zodiacAmounts); if (matchedZodiacs.length === 0) { showToast('未找到生肖数据'); return; } const data = getPingtexiaoData(); matchedZodiacs.forEach(z => { if (!data[z]) data[z] = { amount: '', report: '' }; const oldAmount = parseFloat(data[z].amount) || 0; data[z].amount = (oldAmount + zodiacAmounts[z]).toString(); }); savePingtexiaoData(data); renderPingtexiaoTable(); updatePingtexiaoTotal(); const si = document.querySelector('.source-order-input'); if (si) si.value = ''; if (resultEl) resultEl.innerHTML = ''; updateOrderTotalDisplay(); showToast(`已填充 ${matchedZodiacs.length} 个生肖到平特肖`); }

// ===== 回收站窗口 =====
async function showRecycleBin() { const existingWin = document.getElementById('recycleWin'); if (existingWin) existingWin.remove(); const allRecords = await getRecycleBinRecords(); const records = allRecords.filter(r => r.region === currentRegion); const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'recycleWin'; win.style.width = '750px'; win.style.height = '550px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)'; let html = `<div class="modal-header"><h3>🗑️ 回收站</h3><div class="window-controls"><button onclick="maximizeWindow('recycleWin')">🗖</button><button onclick="document.getElementById('recycleWin').remove()">×</button></div></div>`; html += `<div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`; html += `<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><button onclick="checkAllRecycle()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAllRecycle()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="restoreCheckedRecycle()" style="padding:6px 12px;background:#27ae60;color:#fff;border:none;border-radius:4px;">恢复选中</button><button onclick="deleteCheckedRecycle()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">彻底删除</button><button onclick="emptyRecycleBin()" style="padding:6px 12px;background:#8e44ad;color:#fff;border:none;border-radius:4px;margin-left:auto;">清空回收站</button></div>`; html += `<div id="recycleListContainer" style="flex:1; overflow-y:auto;">`; if (records.length === 0) { html += `<div style="padding:20px;text-align:center;color:#666;">回收站为空</div>`; } else { records.sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt)); records.forEach(rec => { const ts = formatTimestampToCST(rec.deletedAt); const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖'); const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad'); html += `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`; }); } html += `</div></div><div class="modal-footer" style="justify-content:space-between;"><span style="font-size:12px;color:#666;" id="recycleStorageInfo"></span><button onclick="document.getElementById('recycleWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; win.innerHTML = html; document.body.appendChild(win); updateRecycleStorageInfo(); makeWindowDraggable('recycleWin'); highestZ += 1; win.style.zIndex = highestZ; updateRecycleCount(); }
function updateRecycleStorageInfo() { const span = document.getElementById('recycleStorageInfo'); if (!span) return; getRecycleBinRecords().then(allRecords => { const records = allRecords.filter(r => r.region === currentRegion); let bytes = 0; records.forEach(r => bytes += JSON.stringify(r).length * 2); const usedMB = (bytes / (1024*1024)).toFixed(2); span.textContent = `回收站占用：${usedMB} MB（共${records.length}条记录）`; }); }
async function updateRecycleCount() { const span = document.getElementById('recycleCount'); if (!span) return; try { const allRecords = await getRecycleBinRecords(); const count = allRecords.filter(r => r.region === currentRegion).length; if (count > 0) { span.textContent = count; span.style.display = 'inline-block'; } else { span.style.display = 'none'; } } catch(e) { span.style.display = 'none'; } }
function checkAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = true); }
function uncheckAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = false); }

async function refreshRecycleList() { const container = document.getElementById('recycleListContainer'); if (!container) return; const allRecords = await getRecycleBinRecords(); const records = allRecords.filter(r => r.region === currentRegion); if (records.length === 0) { container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">回收站为空</div>'; } else { records.sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt)); container.innerHTML = records.map(rec => { const ts = formatTimestampToCST(rec.deletedAt); const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖'); const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad'); return `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`; }).join(''); } updateRecycleStorageInfo(); updateRecycleCount(); }

async function restoreRecycleRecord(id) { if (!(await confirm('确定恢复该记录吗？'))) return; try { const records = await getRecycleBinRecords(); const record = records.find(r => r.id === id); if (!record) { showToast('记录不存在'); return; } if (record.type === 'order') { await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'report') { await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'combo') { await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp); } await deleteFromRecycleBin(id); addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('已恢复'); } catch(e) { showToast('恢复失败'); } }
async function permanentlyDeleteRecycleRecord(id) { if (!(await confirm('确定彻底删除吗？此操作不可恢复！'))) return; const record = await new Promise((resolve) => { const tx = db.transaction([RECYCLE_STORE_NAME], 'readonly'); const store = tx.objectStore(RECYCLE_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); await deleteFromRecycleBin(id); if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); } else { addOperationLog('permanent_delete', '记录详情未知'); } clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('已彻底删除'); }
async function restoreCheckedRecycle() { const ids = []; document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id))); if (ids.length === 0) { showToast('请选择'); return; } if (!(await confirm(`确定恢复选中的 ${ids.length} 条记录吗？`))) return; const records = await getRecycleBinRecords(); let count = 0; for (const id of ids) { const record = records.find(r => r.id === id); if (!record) continue; if (record.type === 'order') { await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'report') { await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'combo') { await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp); } addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0); await deleteFromRecycleBin(id); count++; } clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast(`已恢复 ${count} 条`); }
async function deleteCheckedRecycle() { const ids = []; document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id))); if (ids.length === 0) { showToast('请选择'); return; } if (!(await confirm(`确定彻底删除选中的 ${ids.length} 条记录吗？此操作不可恢复！`))) return; const records = await getRecycleBinRecords(); for (const id of ids) { const record = records.find(r => r.id === id); if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); } } await batchDeleteFromRecycleBin(ids); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast(`已彻底删除 ${ids.length} 条`); }
async function emptyRecycleBin() { if (!(await confirm('确定清空整个回收站吗？此操作不可恢复！'))) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearRecycleBin(currentRegion); addOperationLog('reset', '清空回收站'); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('回收站已清空'); }
async function autoCleanRecycleBin() { try { const records = await getRecycleBinRecords(); const now = Date.now(); const expireMs = RECYCLE_RETENTION_DAYS * 24 * 60 * 60 * 1000; for (const record of records) { const deletedTime = new Date(record.deletedAt).getTime(); if (now - deletedTime > expireMs) { await deleteFromRecycleBin(record.id); } } updateRecycleCount(); } catch(e) {} }

// ===== 辅助函数 =====
function formatTimestampToCST(iso){ const d=new Date(iso); return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Asia/Shanghai'}).format(d); }
function getUserColor(u){ let h=0; for(let i=0;i<u.length;i++)h=u.charCodeAt(i)+((h<<5)-h); const hue=(h%360+360)%360; return`hsl(${hue},70%,45%)`; }
function getZodiacColorClass(zodiac) { if (!zodiac) return ''; const redSet = new Set(['鼠','兔','马','鸡']); const blueSet = new Set(['虎','蛇','猴','猪']); const greenSet = new Set(['牛','龙','羊','狗']); if (redSet.has(zodiac)) return 'red-text'; if (blueSet.has(zodiac)) return 'blue-text'; if (greenSet.has(zodiac)) return 'green-text'; return ''; }
function getNumberColorClass(num) { if (redNumbers.includes(num)) return 'red-text'; if (blueNumbers.includes(num)) return 'blue-text'; if (greenNumbers.includes(num)) return 'green-text'; return ''; }

function isTokenMatching(token,targetNum){ const t=targetNum.padStart(2,'0'); if(/^\d{1,2}$/.test(token))return token.padStart(2,'0')===t; if(D[token]){const nums=keyToAllNums(token);return nums.includes(t);} return false; }
function highlightContent(content,targetNum){ if(!targetNum)return content; const t=targetNum.padStart(2,'0'); const parts=[];let tmp=''; for(const ch of content){if(ch==='-'||ch===' '){if(tmp)parts.push(tmp);parts.push(ch);tmp='';}else{tmp+=ch;}} if(tmp)parts.push(tmp); return parts.map(p=>{if(p==='-'||p===' ')return p;if(isTokenMatching(p,targetNum))return`<span class="highlight-number">${p}</span>`;return p;}).join(''); }
function orderContainsTarget(content,targetNum){ if(!targetNum)return true; const t=targetNum.padStart(2,'0'); const lines=content.split('\n'); for(const line of lines){ if(!line.startsWith('特码:')) continue; const m=line.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); if(!m)continue; const cont=m[1]; const parts=[];let tmp=''; for(const ch of cont){if(ch==='-'||ch===' '){if(tmp)parts.push(tmp);tmp='';}else{tmp+=ch;}} if(tmp)parts.push(tmp); for(const p of parts){if(p!=='-'&&p!==' '&&isTokenMatching(p,targetNum))return true;} } return false; }
function getSpecialAmountFromOrder(content, prizeNum) { if (!prizeNum) return 0; const targetNum = prizeNum.padStart(2, '0'); const lines = content.split('\n'); let total = 0; for (const line of lines) { const match = line.match(/^(.+?):(.+?)\s+各(?:数|)\s*(\d+)$/); if (!match) continue; const tokensPart = match[2]; const amount = parseInt(match[3]) || 0; const tokens = tokensPart.split('-').map(t => t.trim()).filter(t => t); for (const token of tokens) { if (isTokenMatching(token, targetNum)) { total += amount; } } } return total; }

function renderOrderStats(allOrders, allReports, filterUser, prizeNum) {
  const container = document.getElementById('orderStatsContainer');
  if (!container) return;
  const mul = parseFloat(document.getElementById('multipleVal')?.value) || 1;
  const rr = parseFloat(document.getElementById('rebateRate')?.value) || 0;
  let totalAmountSum = 0;
  allOrders.forEach(it => { totalAmountSum += it.totalAmount || 0; });
  let reportTotalAmount = 0;
  allReports.forEach(it => { reportTotalAmount += it.totalAmount || 0; });
  let totalSpecial = 0, reportSpecial = 0, hitCount = 0;
  if (prizeNum) {
    const num = prizeNum.padStart(2, '0');
    allOrders.forEach(it => {
      totalSpecial += getSpecialAmountFromOrder(it.content, prizeNum);
      if (orderContainsTarget(it.content, prizeNum)) hitCount++;
    });
    allReports.forEach(it => {
      reportSpecial += getSpecialAmountFromOrder(it.content, prizeNum);
    });
  }
  const totalProfit = Math.round(totalAmountSum - totalAmountSum * (rr / 100) - totalSpecial * mul);
  const reportProfit = Math.round(reportTotalAmount - reportTotalAmount * (rr / 100) - reportSpecial * mul);
  const netProfit = totalProfit - reportProfit;
  const showStats = prizeNum && prizeNum.trim() !== '';
  let html = '<div class="stats-block">';
  html += '<div class="stats-row">';
  if (totalAmountSum > 0) { html += `<span class="stat-col"><span class="slabel">总额:</span><span class="stat-val-amount">${totalAmountSum}</span></span>`; }
  if (showStats) {
    html += `<span class="stat-col"><span class="slabel">总特:</span><span class="stat-val-special">${totalSpecial}</span></span>`;
    const tp = Math.round(totalProfit);
    const tlabel = tp >= 0 ? '总盈' : '总亏';
    const tcls = tp >= 0 ? 'stat-val-profit' : 'stat-val-loss';
    html += `<span class="stat-col"><span class="slabel">${tlabel}:</span><span class="${tcls}">${tp}</span></span>`;
    html += `<span class="stat-col"><span class="slabel">中:</span><span class="stat-val-count">${hitCount}条</span></span>`;
  }
  html += '</div><div class="stats-row">';
  if (reportTotalAmount > 0) { html += `<span class="stat-col"><span class="slabel">上报金额:</span><span class="stat-val-amount">${reportTotalAmount}</span></span>`; }
  if (showStats) {
    html += `<span class="stat-col"><span class="slabel">上报特:</span><span class="stat-val-special">${reportSpecial}</span></span>`;
    const rp = Math.round(reportProfit);
    const rlabel = rp >= 0 ? '报盈' : '报亏';
    const rcls = rp >= 0 ? 'stat-val-profit' : 'stat-val-loss';
    html += `<span class="stat-col"><span class="slabel">${rlabel}:</span><span class="${rcls}">${rp}</span></span>`;
    const np = Math.round(netProfit);
    const nlabel = np >= 0 ? '盈' : '亏';
    const ncls = np >= 0 ? 'stat-val-profit' : 'stat-val-loss';
    html += `<span class="stat-col"><span class="slabel">${nlabel}:</span><span class="${ncls}">${np}</span></span>`;
  }
  html += '</div></div>';
  container.innerHTML = html;
}

async function applyPrizeFilter(){ const pi=document.getElementById('prizeNumberInput'),uf=document.getElementById('recordUserFilter'); if(!pi||!uf) return; const sd = document.getElementById('filterDate')?.value; const pn=pi.value.trim(),uv=uf.value; const recs=await getOrderRecords(); const reports=await getReportOrderRecords(); const fRecs = sd ? recs.filter(r=>r.date===sd) : recs; const fReps = sd ? reports.filter(r=>r.date===sd) : reports; const userOrders = uv==='all' ? fRecs : fRecs.filter(r=>r.user===uv); const userReports = uv==='all' ? fReps : fReps.filter(r=>r.user===uv); let filtered=pn ? [] : [...userOrders]; if(pn){ for(const it of userOrders){ if(orderContainsTarget(it.content,pn)) filtered.push(it); } } const cont=document.getElementById('orderListContainer'); if(!cont)return; if(filtered.length===0){cont.innerHTML='<div style="padding:20px;text-align:center;color:#666;">暂无匹配订单</div>';} else{ cont.innerHTML=filtered.map(it=>{ const ts=formatTimestampToCST(it.timestamp),ud=it.user||'未知',col=getUserColor(ud),ta=it.totalAmount||0; const lines=it.content.split('\n'); const hl=lines.map(l=>{ const m=l.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); if(!m)return l; const cont=m[1],amt=m[2]; const hc=highlightContent(cont,pn); return`特码:${hc} 各数 ${amt}`; }).join('<br>'); return`<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${hl}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`; }).join(''); } renderOrderStats(userOrders, userReports, uv, pn); }

function formatDateMD(dateStr) { const d = new Date(dateStr + 'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}`; }

// ===== 开奖记录窗口 =====
async function showDrawRecord() { const old = document.getElementById('drawRecordWin'); if (old) old.remove(); let year = new Date().getFullYear(); const fd = document.getElementById('filterDate')?.value; if (fd) { const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); } const startDate = new Date(year, 0, 1); const endDate = new Date(year, 11, 31); if (isNaN(startDate) || isNaN(endDate)) { showToast('日期无效'); return; } const rows = []; let issue = 1; const cur = new Date(startDate); while (cur <= endDate) { rows.push({ date: formatDateMD(cur.toISOString().slice(0,10)), issue: issue.toString().padStart(2, '0'), fullDate: cur.toISOString().slice(0,10) }); cur.setDate(cur.getDate() + 1); issue++; } const totalIssues = issue - 1; const groups = Math.ceil(totalIssues / 100); const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const monthlyPL = new Array(12).fill(0); for (const iid in savedData) { const entry = savedData[iid]; if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum); const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl); if (!isNaN(plVal)) monthlyPL[month] += plVal; } } } let totalPLSum = 0; for (let m = 0; m < 12; m++) totalPLSum += monthlyPL[m]; let monthlyInnerHtml = '<table class="monthly-summary-table" style="width:100%;margin:0;border:none;"><tbody>'; for (let m = 0; m < 12; m++) { const val = monthlyPL[m]; let valText = ''; if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`; monthlyInnerHtml += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m+1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`; } let totalText = ''; if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`; monthlyInnerHtml += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`; monthlyInnerHtml += '</tbody></table>'; let tableHtml = '<div class="draw-table-wrap"><table class="draw-table"><thead><tr>'; for (let g = 0; g < groups; g++) { tableHtml += '<th>期号</th><th>号码</th><th>生肖</th><th>盈亏</th>'; } tableHtml += '</tr></thead><tbody>'; const monthlyRowsNeeded = 13; const startRow = 87; for (let r = 0; r < 100; r++) { tableHtml += '<tr>'; for (let g = 0; g < groups; g++) { const idx = g * 100 + r; if (g === 3 && r >= startRow && r < startRow + monthlyRowsNeeded) { if (r === startRow) { tableHtml += `<td colspan="4" rowspan="${monthlyRowsNeeded}" style="vertical-align:top;padding:2px;">${monthlyInnerHtml}</td>`; } } else if (g === 3 && r >= startRow + monthlyRowsNeeded) { tableHtml += '<td></td><td></td><td></td><td></td>'; } else if (idx < rows.length) { const row = rows[idx]; const iid = row.issue; const savedEntry = savedData[iid] || {}; const savedNumber = savedEntry.number || ''; const savedPL = savedEntry.pl || ''; const isReadOnly = !!savedNumber; tableHtml += `<td>${iid}期</td>`; const numVal = savedNumber ? savedNumber.padStart(2, '0') : ''; const numColorClass = savedNumber ? getNumberColorClass(numVal) : ''; const inputDisabled = isReadOnly ? 'disabled' : ''; tableHtml += `<td><input type="text" class="draw-number-input draw-num-${iid} ${numColorClass}" value="${savedNumber}" ${inputDisabled} oninput="onDrawNumberInput(this, '${iid}')" maxlength="2"></td>`; const zodiac = savedNumber ? (currentZodiacMap[numVal] || '') : ''; const zColorClass = getZodiacColorClass(zodiac); tableHtml += `<td><span class="draw-zodiac-${iid} ${zColorClass}">${zodiac}</span></td>`; let plColorClass = ''; if (savedPL !== '') { const plVal = parseFloat(savedPL); if (!isNaN(plVal)) { if (plVal > 0) plColorClass = ' green-text'; else if (plVal < 0) plColorClass = ' red-text'; } } tableHtml += `<td><input type="text" class="draw-pl-input draw-pl-${iid}${plColorClass}" value="${savedPL}" ${inputDisabled} oninput="updatePlColor(this)" maxlength="7"></td>`; } else { tableHtml += '<td></td><td></td><td></td><td></td>'; } } tableHtml += '</tr>'; } tableHtml += '</tbody></table></div>'; const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'drawRecordWin'; win.style.width = Math.min(groups * 170 + 40, window.innerWidth - 20) + 'px'; win.style.height = '650px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)'; const savedCount = localStorage.getItem(`recentDrawCount_${currentRegion}`) || ''; const regionLabel = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港'; win.innerHTML = `<div class="modal-header"><h3>开奖记录（${regionLabel} ${year}年阳历）</h3><div class="window-controls"><button onclick="maximizeWindow('drawRecordWin')">🗖</button><button onclick="document.getElementById('drawRecordWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; gap:10px;"><div class="card" style="flex:1; display:flex; flex-direction:column;"><div class="card-title" style="display:flex; align-items:center; gap:8px;"><span>开奖号码记录</span><input type="number" id="recentDrawCountInput" placeholder="留空不显示" value="${savedCount}" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;font-size:13px;"><button class="btn btn-primary" onclick="saveRecentDrawCount()" style="padding:4px 12px;font-size:12px;min-height:28px;">保存</button></div><div style="overflow:auto; flex:1;">${tableHtml}</div></div><div style="display:flex; gap:10px; justify-content:center; padding:10px;"><button class="btn btn-primary" onclick="editDrawRecord()">修改</button><button class="btn btn-save-order" onclick="saveDrawRecord(${year})">保存</button><button class="btn btn-danger" onclick="clearAllDrawRecords(${year})" style="background:#e74c3c;color:#fff;">清空全部</button></div></div>`; document.body.appendChild(win); makeWindowDraggable('drawRecordWin'); highestZ += 1; win.style.zIndex = highestZ; updateRecentDrawTexts(); setTimeout(() => { const allNumInputs = win.querySelectorAll('.draw-number-input'); const allPlInputs = win.querySelectorAll('.draw-pl-input'); const allInputs = [...allNumInputs, ...allPlInputs].sort((a, b) => { const trA = a.closest('tr'); const trB = b.closest('tr'); const rows = [...win.querySelectorAll('.draw-table tbody tr')]; if (trA !== trB) return rows.indexOf(trA) - rows.indexOf(trB); const tdsA = [...trA.querySelectorAll('td')]; const tdsB = [...trB.querySelectorAll('td')]; const tdA = a.closest('td'); const tdB = b.closest('td'); return tdsA.indexOf(tdA) - tdsB.indexOf(tdB); }); const enabledInputs = allInputs.filter(inp => !inp.disabled); enabledInputs.forEach((inp, i) => { inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); const nextIdx = i + 1; if (nextIdx < enabledInputs.length) { const next = enabledInputs[nextIdx]; next.focus(); next.select(); } } }); }); }, 200); }
function updatePlColor(input) { const match = input.className.match(/draw-pl-(\d+)/); const issueClass = match ? match[0] : ''; const val = input.value.trim(); let colorClass = ''; if (val !== '' && val !== '-') { const num = parseFloat(val); if (!isNaN(num)) { if (num > 0) colorClass = ' green-text'; else if (num < 0) colorClass = ' red-text'; } } input.className = 'draw-pl-input' + (issueClass ? ' ' + issueClass : '') + colorClass; }
async function clearAllDrawRecords(year) { if (!(await confirm(`确定清空${currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港'} ${year}年全部开奖号码吗？此操作不可恢复！`))) return; const storageKey = `drawRecord_${currentRegion}_${year}`; localStorage.removeItem(storageKey); showToast('已清空'); showDrawRecord(); updateRecentDrawTexts(); renderSmartDecision(); }
function onDrawNumberInput(input, issueId) { let val = input.value.replace(/\D/g, ''); if (val.length > 2) val = val.slice(0, 2); input.value = val; const zodiacSpan = document.querySelector(`.draw-zodiac-${issueId}`); if (!zodiacSpan) return; if (val.length === 2) { const num = val.padStart(2, '0'); const intVal = parseInt(num); if (intVal >= 1 && intVal <= 49) { const zodiac = currentZodiacMap[num] || ''; zodiacSpan.textContent = zodiac; zodiacSpan.className = `draw-zodiac-${issueId} ${getZodiacColorClass(zodiac)}`; input.className = `draw-number-input draw-num-${issueId} ${getNumberColorClass(num)}`; return; } } zodiacSpan.textContent = ''; zodiacSpan.className = `draw-zodiac-${issueId}`; input.className = `draw-number-input draw-num-${issueId}`; }
function editDrawRecord() { document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = false); document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = false); showToast('已进入编辑模式'); }
async function saveDrawRecord(year) { const data = {}; const plInputs = document.querySelectorAll('.draw-pl-input'); plInputs.forEach(input => { const issueId = input.className.match(/draw-pl-(\d+)/)?.[1]; if (issueId) { data[issueId] = { number: '', pl: input.value.trim() }; } }); const numberInputs = document.querySelectorAll('.draw-number-input'); numberInputs.forEach(input => { const issueId = input.className.match(/draw-num-(\d+)/)?.[1]; if (issueId) { let num = input.value.trim(); if (/^\d$/.test(num)) num = '0' + num; if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) num = ''; if (!data[issueId]) data[issueId] = { number: num, pl: '' }; else data[issueId].number = num; } }); const storageKey = `drawRecord_${currentRegion}_${year}`; localStorage.setItem(storageKey, JSON.stringify(data)); document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = true); document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = true); const monthlyPL = new Array(12).fill(0); for (const iid in data) { const entry = data[iid]; if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum); const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl); if (!isNaN(plVal)) monthlyPL[month] += plVal; } } } const summaryTable = document.querySelector('.monthly-summary-table'); if (summaryTable) { let html = '<tbody>'; let totalPLSum = 0; for (let m = 0; m < 12; m++) { const val = monthlyPL[m]; totalPLSum += val; let valText = ''; if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`; html += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m+1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`; } let totalText = ''; if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`; html += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`; html += '</tbody>'; summaryTable.innerHTML = html; } updateRecentDrawTexts(); renderSmartDecision(); showToast('保存成功'); }
function saveRecentDrawCount() { const input = document.getElementById('recentDrawCountInput'); if (!input) return; const rawVal = input.value.trim(); if (rawVal === '') { localStorage.removeItem(`recentDrawCount_${currentRegion}`); updateRecentDrawTexts(); renderSmartDecision(); showToast('已清空期数设置'); return; } const val = parseInt(rawVal); if (isNaN(val) || val < 1) { showToast('请输入有效的期数'); return; } localStorage.setItem(`recentDrawCount_${currentRegion}`, val.toString()); updateRecentDrawTexts(); renderSmartDecision(); showToast(`已设置显示最近${val}期`); }
function getCurrentIssueNumber(year, targetDateStr) { const target = new Date(targetDateStr + 'T00:00:00'); const start = new Date(year, 0, 1); if (isNaN(target) || isNaN(start)) return null; if (target < start) return null; const diff = target - start; const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; return dayOfYear; }
function updateRecentDrawTexts() { updateRecentDrawNumbers(); updateRecentZodiacStats(); updateFilterDateDrawInfo(); }
function updateRecentDrawNumbers() { const container = document.getElementById('recentDrawNumbers'); if (!container) return; const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; } const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; } const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; } const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const entries = []; for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; entries.push({ num, zodiac }); } } } if (entries.length === 0) { container.style.display = 'none'; return; } let html = ''; entries.forEach((entry, idx) => { if (idx > 0) html += '、'; html += `<span class="num ${getNumberColorClass(entry.num)}">${entry.num}</span>`; html += `<span class="slash">/</span>`; html += `<span class="${getZodiacColorClass(entry.zodiac)}">${entry.zodiac}</span>`; }); container.innerHTML = html; container.style.display = ''; }
function updateRecentZodiacStats() { const container = document.getElementById('recentZodiacStats'); if (!container) return; const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; } const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; } const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; } const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const zodiacList = []; for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; if (zodiac) zodiacList.push(zodiac); } } } if (zodiacList.length === 0) { container.style.display = 'none'; return; } const freq = {}; zodiacList.forEach(z => { freq[z] = (freq[z] || 0) + 1; }); const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]); const repeated = []; const single = []; sorted.forEach(([zodiac, cnt]) => { if (cnt > 1) { repeated.push({ zodiac, cnt }); } else { single.push(zodiac); } }); let html = ''; repeated.forEach(item => { html += `<div>${item.cnt}次：<span class="${getZodiacColorClass(item.zodiac)}">${item.zodiac}</span></div>`; }); if (single.length > 0) { const singleSpans = single.map(z => `<span class="${getZodiacColorClass(z)}">${z}</span>`).join('、'); html += `<div>${singleSpans}</div>`; } container.innerHTML = html; container.style.display = ''; }
function updateFilterDateDrawInfo() { const span = document.getElementById('filterDateDrawInfo'); if (!span) return; const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const issueNumber = getCurrentIssueNumber(year, fd); if (!issueNumber) { span.style.display = 'none'; return; } const issueId = issueNumber.toString().padStart(2, '0'); const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const entry = savedData[issueId]; if (!entry || !entry.number || !entry.number.trim()) { span.style.display = 'none'; return; } const num = entry.number.trim().padStart(2, '0'); if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) { span.style.display = 'none'; return; } const zodiac = currentZodiacMap[num] || ''; span.innerHTML = `<span class="num ${getNumberColorClass(num)}">${num}</span><span class="slash" style="color:#000;">/</span><span class="${getZodiacColorClass(zodiac)}">${zodiac}</span>`; span.style.display = ''; }

// ===== 平特肖渲染 =====
function getPingtexiaoKey() { const fd = document.getElementById('filterDate')?.value || getTodayCST(); return `pingtexiao_${currentRegion}_${fd}`; }
function getPingtexiaoData() { try { return JSON.parse(localStorage.getItem(getPingtexiaoKey()) || '{}'); } catch (e) { return {}; } }
function savePingtexiaoData(data) { localStorage.setItem(getPingtexiaoKey(), JSON.stringify(data)); }

function renderPingtexiaoTable() { const container = document.getElementById('pingtexiaoTableContainer'); if (!container) return; const data = getPingtexiaoData(); const leftZodiacs = ['鼠','牛','虎','兔','龙','蛇']; const rightZodiacs = ['马','羊','猴','鸡','狗','猪']; const zcm = {'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; let html = '<table class="freq-table"><thead><tr>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '</tr></thead><tbody>'; for (let r = 0; r < 6; r++) { html += '<tr>'; [leftZodiacs[r], rightZodiacs[r]].forEach(zodiac => { const d = data[zodiac] || { amount: '', report: '' }; const amountVal = d.amount !== undefined && d.amount !== '' && parseFloat(d.amount) !== 0 ? d.amount : ''; const reportVal = d.report !== undefined && d.report !== '' && parseFloat(d.report) !== 0 ? d.report : ''; const remainVal = (amountVal !== '') ? (parseFloat(amountVal) - (reportVal !== '' ? parseFloat(reportVal) : 0)) : 0; const remain = remainVal !== 0 ? remainVal : ''; html += `<td class="${zcm[zodiac] || ''}">${zodiac}</td>`; html += `<td><input type="number" class="pt-edit-input amount-red-text" data-zodiac="${zodiac}" data-field="amount" value="${amountVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`; html += `<td><input type="number" class="pt-edit-input pt-report-text" data-zodiac="${zodiac}" data-field="report" value="${reportVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`; html += `<td style="font-size:12px;">${remain !== '' ? remain : ''}</td>`; }); html += '</tr>'; } html += '</tbody></table>'; container.innerHTML = html; updatePingtexiaoTotal(); }
function finishPtEdit(input) { if (input.hasAttribute('readonly')) return; input.setAttribute('readonly', 'readonly'); input.style.border = '1px solid transparent'; input.style.background = 'transparent'; updatePtRemain(input); savePingtexiaoCell(); }
function updatePtRemain(input) { const row = input.closest('tr'); if (!row) return; const zodiac = input.dataset.zodiac; const cells = row.cells; let amountVal = '', reportVal = ''; for (let i = 0; i < cells.length; i++) { const amountInput = cells[i].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="amount"]`); if (amountInput) { amountVal = amountInput.value.trim(); const reportInput = cells[i+1].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="report"]`); if (reportInput) reportVal = reportInput.value.trim(); const remainCell = cells[i+2]; if (remainCell) { const a = amountVal !== '' ? parseFloat(amountVal) : 0; const r = reportVal !== '' ? parseFloat(reportVal) : 0; remainCell.textContent = amountVal !== '' ? (a - r) : ''; } break; } } updatePingtexiaoTotal(); }
function savePingtexiaoCell() { const data = getPingtexiaoData(); document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].amount = input.value.trim(); }); document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].report = input.value.trim(); }); savePingtexiaoData(data); updatePingtexiaoTotal(); }
function updatePingtexiaoTotal() { let amountTotal = 0, reportTotal = 0; document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) amountTotal += v; }); document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) reportTotal += v; }); const amountBox = document.getElementById('ptAmountTotalBox'); const amountSpan = document.getElementById('ptAmountTotal'); const reportBox = document.getElementById('ptReportTotalBox'); const reportSpan = document.getElementById('ptReportTotal'); if (amountBox && amountSpan) { if (amountTotal > 0) { amountSpan.textContent = amountTotal; amountBox.style.display = 'inline-flex'; } else { amountBox.style.display = 'none'; } } if (reportBox && reportSpan) { if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; } } }

// ===== 自定义筛选与单挑 =====
let zodiacRankVisible = false;
function toggleZodiacRank() { zodiacRankVisible = !zodiacRankVisible; updateCardA(); showToast(zodiacRankVisible ? '生肖排行已展开' : '生肖排行已收起'); }
let singleBetVisible = false;
function toggleSingleBet() { singleBetVisible = !singleBetVisible; const row = document.getElementById('singleBetRow'); if (row) { if (singleBetVisible) { updateSingleBetDisplay(); } else { row.style.display = 'none'; } } showToast(singleBetVisible ? '单挑已展开' : '单挑已收起'); }
async function updateSingleBetDisplay() {
  const row = document.getElementById('singleBetRow');
  const display = document.getElementById('singleBetDisplay');
  if (!row || !display) return;
  if (!singleBetVisible) { row.style.display = 'none'; return; }

  const orders = await getOrderRecords();
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  const filteredOrders = orders.filter(r => r.date === fd);
  const singleCount = {};

  filteredOrders.forEach(order => {
    const lines = order.content.split('\n').filter(l => l.trim());
    lines.forEach(l => {
      const newMatch = l.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/);
      if (newMatch) {
        const content = newMatch[1];
        const amt = parseInt(newMatch[2]) || 0;
        if (amt <= 0) return;
        const items = content.split('-').map(i => i.trim()).filter(i => i);
        if (items.length === 1 && /^\d{1,2}$/.test(items[0])) {
          const num = items[0].padStart(2, '0');
          if (parseInt(num) >= 1 && parseInt(num) <= 49) {
            singleCount[num] = (singleCount[num] || 0) + 1;
          }
        }
        return;
      }
      const oldMatch = l.match(/^(\d{2})\s+各(?:数|)\s*(\d+)$/);
      if (oldMatch && parseInt(oldMatch[2]) > 0) {
        singleCount[oldMatch[1]] = (singleCount[oldMatch[1]] || 0) + 1;
      }
    });
  });

  const singleNums = Object.keys(singleCount);
  if (singleNums.length > 0) {
    const sorted = singleNums.sort((a, b) => parseInt(a) - parseInt(b));
    function getNumCls(n) { if (redNumbers.includes(n)) return 'red-text'; if (blueNumbers.includes(n)) return 'blue-text'; if (greenNumbers.includes(n)) return 'green-text'; return ''; }
    display.innerHTML = sorted.map(n => {
      const cnt = singleCount[n];
      return `<span class="${getNumCls(n)}">${n}${cnt >= 2 ? '(' + cnt + '次)' : ''}</span>`;
    }).join(' ');
    row.style.display = '';
  } else {
    display.innerHTML = '<span style="color:#888;">暂无</span>';
    row.style.display = '';
  }
}
function copySingleBetNums() { const display = document.getElementById('singleBetDisplay'); if (!display) return; const spans = display.querySelectorAll('span'); const nums = Array.from(spans).map(s => s.textContent.replace(/\(\d+次\)/, '').trim()).filter(t => /^\d{2}$/.test(t)); if (nums.length === 0) { showToast('暂无号码'); return; } navigator.clipboard.writeText(nums.join('-')).then(() => { showToast('已复制：' + nums.join('-')); }).catch(() => { showToast('复制失败'); }); }

function updateCardA() { const contentEl = document.getElementById('cardAContent'); if (!contentEl) return; let html = ''; const filterInput = document.getElementById('filterInputCardA'); const filterText = filterInput ? filterInput.value.trim() : ''; if (filterText) { const tokens = filterText.split(/\s+/).filter(t => t); let targetNums = new Set(); tokens.forEach(token => { if (/^\d{1,2}$/.test(token)) { const n = token.padStart(2, '0'); if (parseInt(n) >= 1 && parseInt(n) <= 49) targetNums.add(n); } else if (ZODIAC_NUMS[token]) { ZODIAC_NUMS[token].split(/[\s,，]+/).forEach(n => targetNums.add(n.padStart(2, '0'))); } else if (D[token]) { const nums = keyToAllNums(token); nums.forEach(n => targetNums.add(n.padStart(2, '0'))); } }); if (targetNums.size > 0) { const negativeNums = []; for (const num of targetNums) { if (reportRiskData[num] !== undefined && reportRiskData[num] < 0) { negativeNums.push(num); } } if (negativeNums.length > 0) { html += '<div style="margin-bottom:4px;"><b>添加筛选：</b>'; negativeNums.sort((a, b) => parseInt(a) - parseInt(b)); negativeNums.forEach((num, idx) => { const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${num}</span>`; if (idx < negativeNums.length - 1) html += '-'; }); html += '</div>'; } } } const topNInput = document.getElementById('topNInput'); const nVal = topNInput ? parseInt(topNInput.value) : NaN; if (!isNaN(nVal) && nVal > 0) { const entries = Object.entries(numberAmountCount).map(([num, cnt]) => ({ num, cnt: cnt || 0 })); for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); if (!numberAmountCount[n]) entries.push({ num: n, cnt: 0 }); } const sortedDesc = [...entries].sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num)); const idxDesc = Math.min(nVal - 1, sortedDesc.length - 1); const cutoffDesc = sortedDesc[idxDesc]?.cnt ?? 0; const activeNums = sortedDesc.filter(e => e.cnt >= cutoffDesc && e.cnt > 0); activeNums.sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num)); const sortedAsc = [...entries].sort((a, b) => a.cnt - b.cnt || parseInt(a.num) - parseInt(b.num)); const idxAsc = Math.min(nVal - 1, sortedAsc.length - 1); const cutoffAsc = sortedAsc[idxAsc]?.cnt ?? 0; let inactiveNums = sortedAsc.filter(e => e.cnt <= cutoffAsc); inactiveNums.sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num)); if (activeNums.length > 0) { html += '<div style="margin-bottom:4px;"><b>活跃次数：</b>'; activeNums.forEach((e, idx) => { const cls = redNumbers.includes(e.num) ? 'red-text' : (blueNumbers.includes(e.num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${e.num}</span>`; if (idx < activeNums.length - 1) html += '-'; }); html += '</div>'; } if (inactiveNums.length > 0) { html += '<div style="margin-bottom:4px;"><b>不活跃次数：</b>'; inactiveNums.forEach((e, idx) => { const cls = redNumbers.includes(e.num) ? 'red-text' : (blueNumbers.includes(e.num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${e.num}</span>`; if (idx < inactiveNums.length - 1) html += '-'; }); html += '</div>'; } } if (zodiacRankVisible) { const zodiacOrderFixed = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']; const zcm = {'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; const zCountEntries = zodiacOrderFixed.map(z => ({ zodiac: z, cnt: zodiacAmountCount[z] || 0 })); zCountEntries.sort((a, b) => b.cnt - a.cnt); html += '<div style="margin-bottom:4px;"><b>生肖活跃：</b>'; zCountEntries.forEach((e, idx) => { html += `<span class="${zcm[e.zodiac] || ''}">${e.zodiac}</span>`; if (idx < zCountEntries.length - 1) html += '、'; }); html += '</div>'; const zAmtEntries = zodiacOrderFixed.map(z => ({ zodiac: z, amt: zodiacFilteredAmount[z] || 0 })); zAmtEntries.sort((a, b) => b.amt - a.amt); html += '<div style="margin-bottom:4px;"><b>金额排行：</b>'; zAmtEntries.forEach((e, idx) => { html += `<span class="${zcm[e.zodiac] || ''}">${e.zodiac}</span>`; if (idx < zAmtEntries.length - 1) html += '、'; }); html += '</div>'; } contentEl.innerHTML = html; if (singleBetVisible) updateSingleBetDisplay(); }
function copyCardANumbers(type) { const contentEl = document.getElementById('cardAContent'); if (!contentEl) return; const lines = []; let currentLine = []; Array.from(contentEl.childNodes).forEach(node => { if (node.nodeName === 'SPAN') { currentLine.push(node); } else if (node.nodeName === 'BR') { if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } else if (node.nodeName === 'DIV') { Array.from(node.childNodes).forEach(child => { if (child.nodeName === 'SPAN') { currentLine.push(child); } else if (child.nodeName === 'BR') { if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } }); if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } }); if (currentLine.length > 0) lines.push(currentLine); const filterText = document.getElementById('filterInputCardA')?.value.trim(); const topNVal = parseInt(document.getElementById('topNInput')?.value); let targetLineIndex = -1; let lineIdx = 0; if (filterText) { if (type === 'risk') targetLineIndex = lineIdx; lineIdx++; } if (!isNaN(topNVal) && topNVal > 0) { if (type === 'active') targetLineIndex = lineIdx; lineIdx++; if (type === 'inactive') targetLineIndex = lineIdx; lineIdx++; } if (targetLineIndex < 0 || targetLineIndex >= lines.length) { showToast('对应行暂无数据'); return; } const targetNodes = lines[targetLineIndex]; const items = targetNodes.map(span => span.textContent.trim()).filter(t => t && /^\d{2}$/.test(t)); if (items.length === 0) { showToast('没有可复制的项目'); return; } const text = items.join('-'); navigator.clipboard.writeText(text).then(() => { showToast('已复制: ' + text); }).catch(() => { showToast('复制失败'); }); }

// ===== 智能决策中心 =====
let heatVisible = false; let adviceVisible = false; let surgeVisible = false;
let surgeThreshold = parseInt(localStorage.getItem('surgeThreshold') || '50'); let surgeAmountThreshold = parseFloat(localStorage.getItem('surgeAmountThreshold') || '4'); let surgeMinOrders = 3;
async function computeSurge() { const fd = document.getElementById('filterDate')?.value || getTodayCST(); const allOrders = await getOrderRecords(); const todayOrders = allOrders.filter(o => o.date === fd); if (todayOrders.length === 0) { window._surgeResult = []; return; } const userOrders = {}; todayOrders.forEach(o => { if (!userOrders[o.user]) userOrders[o.user] = []; userOrders[o.user].push(o); }); const countThreshold = surgeThreshold / 100; const amountThreshold = surgeAmountThreshold / 100; const result = []; for (const [user, orders] of Object.entries(userOrders)) { if (orders.length < surgeMinOrders) continue; const totalOrders = orders.length; const numCount = {}; const numAmount = {}; for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); numCount[n] = 0; numAmount[n] = 0; } let totalAmount = 0; orders.forEach(o => { const lines = o.content.split('\n'); let orderCovered = new Set(); lines.forEach(line => { const { numbers, amount } = countItemsInLine(line); const amtPerNum = amount; numbers.forEach(num => { orderCovered.add(num); numAmount[num] = (numAmount[num] || 0) + amtPerNum; totalAmount += amtPerNum; }); }); orderCovered.forEach(n => { numCount[n] = (numCount[n] || 0) + 1; }); }); const countTriggered = []; for (const [num, cnt] of Object.entries(numCount)) { if (totalOrders > 0 && cnt / totalOrders >= countThreshold) { countTriggered.push({ num, ratio: cnt / totalOrders }); } } countTriggered.sort((a, b) => b.ratio - a.ratio); const amountTriggered = []; for (const [num, amt] of Object.entries(numAmount)) { if (totalAmount > 0 && amt / totalAmount >= amountThreshold) { amountTriggered.push({ num, ratio: amt / totalAmount }); } } amountTriggered.sort((a, b) => b.ratio - a.ratio); if (countTriggered.length > 0 || amountTriggered.length > 0) { result.push({ user, countItems: countTriggered, amountItems: amountTriggered, totalOrders, totalAmount }); } } result.sort((a, b) => (b.countItems.length + b.amountItems.length) - (a.countItems.length + a.amountItems.length)); window._surgeResult = result; }
function toggleHeat() { heatVisible = !heatVisible; renderSmartDecision(); }
function toggleAdvice() { adviceVisible = !adviceVisible; renderSmartDecision(); }
async function toggleSurge() { surgeVisible = !surgeVisible; if (surgeVisible) { await computeSurge(); renderSmartDecision(); } else renderSmartDecision(); }
function copyUserSurgeNums(username) { if (!window._surgeResult || window._surgeResult.length === 0) { showToast('暂无号码'); return; } const userData = window._surgeResult.find(u => u.user === username); if (!userData) { showToast('该用户暂无数据'); return; } const nums = new Set(); userData.countItems.forEach(i => nums.add(i.num)); userData.amountItems.forEach(i => nums.add(i.num)); const arr = [...nums].sort((a, b) => parseInt(a) - parseInt(b)); navigator.clipboard.writeText(arr.join(' ')).then(() => { showToast('已复制' + username + '的号码'); }).catch(() => showToast('复制失败')); }
function copyAllSurgeNums() { if (!window._surgeResult || window._surgeResult.length === 0) { showToast('暂无号码'); return; } const allNums = new Set(); window._surgeResult.forEach(user => { user.countItems.forEach(i => allNums.add(i.num)); user.amountItems.forEach(i => allNums.add(i.num)); }); const arr = [...allNums].sort((a, b) => parseInt(a) - parseInt(b)); navigator.clipboard.writeText(arr.join(' ')).then(() => { showToast('已复制全部号码'); }).catch(() => showToast('复制失败')); }

function renderSmartDecision() {
  const container = document.getElementById('smartDecisionContent');
  if (!container) return;
  const periodInput = document.getElementById('smartPeriodInput');
  let period = 10;
  if (periodInput && periodInput.value.trim()) { period = parseInt(periodInput.value) || 10; }
  else { const savedCount = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (savedCount) period = parseInt(savedCount) || 10; if (periodInput) periodInput.value = period; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const currentIssue = getCurrentIssueNumber(year, fd);
  if (!currentIssue) { container.innerHTML = ''; return; }
  const drawList = []; const drawIssueMap = []; const numCount = {};
  for (let i = currentIssue - period; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { drawList.push(num); drawIssueMap.push({ num, issue: issueId }); numCount[num] = (numCount[num] || 0) + 1; } } }
  if (drawList.length === 0) { container.innerHTML = '无开奖数据'; return; }
  const actualPeriod = Math.min(period, currentIssue - 1);
  const zodiacCountLocal = {}; const boseCount = {}; const weishuCount = {}; const toushuCount = {};
  let jiaqinCount = 0, yeshouCount = 0; let danCount = 0, shuangCount = 0; let xiaoCount = 0, daCount = 0;
  const zodiacSeq = []; const zodiacIssueSeq = []; const boseSeq = []; const boseIssueSeq = [];
  const weishuSeq = []; const weishuIssueSeq = []; const toushuSeq = []; const toushuIssueSeq = [];
  const jysxSeq = []; const jysxIssueSeq = []; const dsSeq = []; const dsIssueSeq = []; const dxSeq = []; const dxIssueSeq = [];
  drawIssueMap.forEach(({num, issue}) => {
    const z = currentZodiacMap[num] || '';
    if (z) { zodiacCountLocal[z] = (zodiacCountLocal[z] || 0) + 1; zodiacSeq.push(z); zodiacIssueSeq.push(issue); }
    const intNum = parseInt(num);
    let b = ''; if (redNumbers.includes(num)) b = '红波'; else if (blueNumbers.includes(num)) b = '蓝波'; else if (greenNumbers.includes(num)) b = '绿波';
    boseCount[b] = (boseCount[b] || 0) + 1; boseSeq.push(b); boseIssueSeq.push(issue);
    const ws = num.slice(-1) + '尾'; weishuCount[ws] = (weishuCount[ws] || 0) + 1; weishuSeq.push(ws); weishuIssueSeq.push(issue);
    const ts = num[0] + '头'; toushuCount[ts] = (toushuCount[ts] || 0) + 1; toushuSeq.push(ts); toushuIssueSeq.push(issue);
    const jy = (z && (ATTR_TO_ZODIACS['家禽'] || '').includes(z)) ? '家禽' : '野兽';
    if (jy === '家禽') jiaqinCount++; else yeshouCount++; jysxSeq.push(jy); jysxIssueSeq.push(issue);
    const ds = intNum % 2 === 1 ? '单' : '双'; if (ds === '单') danCount++; else shuangCount++; dsSeq.push(ds); dsIssueSeq.push(issue);
    const dx = intNum <= 24 ? '小' : '大'; if (dx === '小') xiaoCount++; else daCount++; dxSeq.push(dx); dxIssueSeq.push(issue);
  });
  function analyzeStreak(seq, issueSeq, name, clsFn) { if (seq.length === 0) return ''; const lastItem = seq[seq.length-1]; let streak = 0; for (let i=seq.length-1;i>=0;i--) { if (seq[i]===lastItem) streak++; else break; } const cls = typeof clsFn==='function'?clsFn(lastItem):''; if (streak>=2) { const startIssue=issueSeq[issueSeq.length-streak]; const endIssue=issueSeq[issueSeq.length-1]; const issueRange=startIssue===endIssue?`第${startIssue}期`:`第${startIssue}-${endIssue}期`; if (streak>=4) return `<span style="color:#e74c3c;font-weight:bold;">⚠ ${name}连续${streak}期<span class="${cls}">${lastItem}</span>（${issueRange}）</span>`; return `<span style="color:#f39c12;">📈 ${name}连续${streak}期<span class="${cls}">${lastItem}</span>（${issueRange}）</span>`; } return `<span style="color:#888;">${name}<span class="${cls}">${lastItem}</span>（第${issueSeq[issueSeq.length-1]}期）</span>`; }
  function getNumCls(n) { if (redNumbers.includes(n)) return 'red-text'; if (blueNumbers.includes(n)) return 'blue-text'; if (greenNumbers.includes(n)) return 'green-text'; return ''; }
  function getZodiacCls(z) { const redSet=new Set(['鼠','兔','马','鸡']); const blueSet=new Set(['虎','蛇','猴','猪']); const greenSet=new Set(['牛','龙','羊','狗']); if(redSet.has(z))return'red-text';if(blueSet.has(z))return'blue-text';if(greenSet.has(z))return'green-text';return'';}
  function getBoseCls(b) { if(b==='红波')return'red-text';if(b==='蓝波')return'blue-text';if(b==='绿波')return'green-text';return''; }
  let heatHtml='';
  if(heatVisible){ heatHtml='<div style="font-size:11px;">'; heatHtml+=`<div style="margin-bottom:4px;color:#666;">📊 开奖热度分析（最近${actualPeriod}期，共${drawList.length}条记录）</div>`; const zodiacAll=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']; const zodiacItems=zodiacAll.map(z=>({name:z,cnt:zodiacCountLocal[z]||0})); zodiacItems.sort((a,b)=>b.cnt-a.cnt); heatHtml+='<div style="margin-bottom:4px;"><b>生肖：</b>'; zodiacItems.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/12*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass} ${getZodiacCls(item.name)}">${prefix}${item.name}(${item.cnt}次)</span> `;}); heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(zodiacSeq,zodiacIssueSeq,'生肖',getZodiacCls)+'</div>'; const boseList=['红波','蓝波','绿波'].map(b=>({name:b,cnt:boseCount[b]||0}));boseList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>波色：</b>';boseList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/3*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass} ${getBoseCls(item.name)}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(boseSeq,boseIssueSeq,'波色',getBoseCls)+'</div>'; const weishuList=[];for(let i=0;i<=9;i++)weishuList.push({name:i+'尾',cnt:weishuCount[i+'尾']||0});weishuList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>尾数：</b>';weishuList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/10*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(weishuSeq,weishuIssueSeq,'尾数','')+'</div>'; const toushuList=[];for(let i=0;i<=4;i++)toushuList.push({name:i+'头',cnt:toushuCount[i+'头']||0});toushuList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>头数：</b>';toushuList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/5*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(toushuSeq,toushuIssueSeq,'头数','')+'</div>'; const jysxList=[{name:'家禽',cnt:jiaqinCount},{name:'野兽',cnt:yeshouCount}];jysxList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>家禽/野兽：</b>';jysxList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(jysxSeq,jysxIssueSeq,'','')+'</div>'; const dsList=[{name:'单',cnt:danCount},{name:'双',cnt:shuangCount}];dsList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>单双：</b>';dsList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(dsSeq,dsIssueSeq,'','')+'</div>'; const dxList=[{name:'小',cnt:xiaoCount},{name:'大',cnt:daCount}];dxList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>大小：</b>';dxList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(dxSeq,dxIssueSeq,'','')+'</div>'; heatHtml+='</div>'; }
  const reportBets=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');const bet=reportBetData[n]||0;if(bet>0)reportBets.push({num:n,bet});} const avgBet=reportBets.length>0?(reportBets.reduce((s,it)=>s+it.bet,0)/reportBets.length):0;const multiplier=parseFloat(document.getElementById('urgentMultiplierInput')?.value||'1.3');let urgentNums=[];if(reportBets.length>0){urgentNums=reportBets.filter(item=>item.bet>avgBet*multiplier).sort((a,b)=>b.bet-a.bet).map(item=>item.num);} const recent6Zodiacs=[];for(let i=currentIssue-1;i>=1&&recent6Zodiacs.length<6;i--){const issueId=i.toString().padStart(2,'0');const entry=savedData[issueId];if(entry&&entry.number&&entry.number.trim()){const num=entry.number.trim().padStart(2,'0');if(/^\d{2}$/.test(num)&&parseInt(num)>=1&&parseInt(num)<=49){const z=currentZodiacMap[num]||'';if(z&&!recent6Zodiacs.includes(z))recent6Zodiacs.push(z);}}} let zodiacMonitorNums=[];if(recent6Zodiacs.length>0){const allZodiacNums=new Set();recent6Zodiacs.forEach(z=>{(ZODIAC_NUMS[z]||'').split(/[\s,，]+/).forEach(n=>allZodiacNums.add(n.padStart(2,'0')));});zodiacMonitorNums=[...allZodiacNums].filter(n=>reportRiskData[n]!==undefined&&reportRiskData[n]<0).sort((a,b)=>(reportRiskData[a]||0)-(reportRiskData[b]||0));} const betNums=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');const risk=reportRiskData[n];if((risk===undefined||risk>=0)&&(numCount[n]||0)===0)betNums.push(n);} function getColdItems(countMap,allKeys){return allKeys.filter(k=>(countMap[k]||0)===0);} const coldZodiacs=getColdItems(zodiacCountLocal,['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']);const coldBoses=getColdItems(boseCount,['红波','蓝波','绿波']);const coldWeishus=getColdItems(weishuCount,Array.from({length:10},(_,i)=>i+'尾'));const coldToushus=getColdItems(toushuCount,Array.from({length:5},(_,i)=>i+'头'));const coldJYSX=getColdItems({'家禽':jiaqinCount,'野兽':yeshouCount},['家禽','野兽']);const coldDS=getColdItems({'单':danCount,'双':shuangCount},['单','双']);const coldDX=getColdItems({'小':xiaoCount,'大':daCount},['小','大']); function getNumsByZodiac(z){return(ZODIAC_NUMS[z]||'').split(/[\s,，]+/).map(n=>n.padStart(2,'0'));} function getNumsByBose(b){return(D[b]||'').split(/[\s,，]+/).filter(n=>n.trim()).map(n=>n.padStart(2,'0'));} function getNumsByWeishu(w){const d=w.replace('尾','');return Array.from({length:5},(_,i)=>(i*10+parseInt(d)).toString().padStart(2,'0')).filter(n=>parseInt(n)>=1&&parseInt(n)<=49);} function getNumsByToushu(t){const d=t.replace('头','');return Array.from({length:10},(_,i)=>(parseInt(d)*10+i+1).toString().padStart(2,'0')).filter(n=>parseInt(n)>=1&&parseInt(n)<=49);} function getNumsByDS(ds){const result=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if((ds==='单'&&i%2===1)||(ds==='双'&&i%2===0))result.push(n);}return result;} function getNumsByJYSX(jy){const zs=ATTR_TO_ZODIACS[jy]||'';const result=[];for(const z of zs){result.push(...getNumsByZodiac(z));}return[...new Set(result)];} function getNumsByDX(dx){const result=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if((dx==='小'&&i<=24)||(dx==='大'&&i>=25))result.push(n);}return result;} function buildColdRow(label,coldItems,getNumsFn){if(coldItems.length===0)return'';const allNums=new Set();for(const item of coldItems){const nums=getNumsFn(item);nums.forEach(n=>{if(reportRiskData[n]!==undefined&&reportRiskData[n]<0){allNums.add(n);}});}if(allNums.size===0)return'';const sortedNums=[...allNums].sort((a,b)=>parseInt(a)-parseInt(b));const numSpans=sortedNums.map(n=>{const cls=(redNumbers.includes(n)?'red-text':(blueNumbers.includes(n)?'blue-text':'green-text'));return`<span class="${cls}">${n}</span>`;}).join(' ');const numsForCopy=sortedNums.join('-');return`<div style="margin-bottom:4px;"><b>${label}：${coldItems.join('、')}：</b>${numSpans} <button class="copy-advice-btn" onclick="copyNumsToClipboard('${numsForCopy}')">📋复制</button></div>`;} let coldMonitorHtml='';coldMonitorHtml+=buildColdRow('冷生肖',coldZodiacs,getNumsByZodiac);coldMonitorHtml+=buildColdRow('冷波色',coldBoses,getNumsByBose);coldMonitorHtml+=buildColdRow('冷尾数',coldWeishus,getNumsByWeishu);coldMonitorHtml+=buildColdRow('冷头数',coldToushus,getNumsByToushu);coldMonitorHtml+=buildColdRow('冷家禽野兽',coldJYSX,getNumsByJYSX);coldMonitorHtml+=buildColdRow('冷单双',coldDS,getNumsByDS);coldMonitorHtml+=buildColdRow('冷大小',coldDX,getNumsByDX);let allColdNums=new Set();const coldPairs=[{items:coldZodiacs,fn:getNumsByZodiac},{items:coldBoses,fn:getNumsByBose},{items:coldWeishus,fn:getNumsByWeishu},{items:coldToushus,fn:getNumsByToushu},{items:coldJYSX,fn:getNumsByJYSX},{items:coldDS,fn:getNumsByDS},{items:coldDX,fn:getNumsByDX}];coldPairs.forEach(pair=>{pair.items.forEach(item=>{const nums=pair.fn(item);nums.forEach(n=>{if(reportRiskData[n]!==undefined&&reportRiskData[n]<0){allColdNums.add(n);}});});});if(allColdNums.size>0){const sortedAll=[...allColdNums].sort((a,b)=>parseInt(a)-parseInt(b));coldMonitorHtml+=`<div style="margin-top:6px;"><button class="copy-advice-btn" onclick="copyNumsToClipboard('${sortedAll.join('-')}')">📋复制全部冷门号码</button></div>`;} let adviceHtml='';if(adviceVisible){adviceHtml='<div style="font-size:11px;">';adviceHtml+='<div style="margin-bottom:2px;color:#666;">🎯 智能建议</div>';adviceHtml+='<table style="width:100%;border-collapse:collapse;font-size:11px;"><tr>';adviceHtml+='<td style="width:50%;vertical-align:top;padding:4px;border:1px solid #eee;">';adviceHtml+='<div class="advice-urgent" style="margin-bottom:6px;">';adviceHtml+=`<b>🚨 紧急抛售（基于净风险，倍数：<input type="number" id="urgentMultiplierInput" value="${multiplier}" min="0.1" step="0.1" style="width:45px;padding:1px 3px;font-size:11px;border:1px solid #ccc;border-radius:3px;" onchange="renderSmartDecision()"> 均值：${avgBet.toFixed(0)}）</b><br>`;if(urgentNums.length>0){adviceHtml+='号码：'+urgentNums.map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');adviceHtml+=` <button class="copy-advice-btn" onclick="copyNumsToClipboard([${urgentNums.map(n=>"'"+n+"'").join(',')}])">📋复制</button>`;}else adviceHtml+='<span style="color:#888;">暂无</span>';adviceHtml+='</div>';adviceHtml+='<div class="advice-monitor" style="margin-bottom:6px;">';adviceHtml+='<b>🔍 最近生肖监控（往前6个不重复生肖）</b><br>';if(zodiacMonitorNums.length>0){adviceHtml+='生肖：'+recent6Zodiacs.map(z=>`<span class="${getZodiacCls(z)}">${z}</span>`).join(' ')+'<br>';adviceHtml+='净风险号码：'+zodiacMonitorNums.map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');adviceHtml+=` <button class="copy-advice-btn" onclick="copyNumsToClipboard([${zodiacMonitorNums.map(n=>"'"+n+"'").join(',')}])">📋复制</button>`;}else adviceHtml+='<span style="color:#888;">暂无</span>';adviceHtml+='</div>';adviceHtml+='<div class="advice-bet" style="margin-bottom:6px;">';adviceHtml+='<b>📈 加注建议（正常风险+冷）</b><br>';if(betNums.length>0){adviceHtml+='号码：'+betNums.slice(0,10).map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');}else adviceHtml+='<span style="color:#888;">暂无</span>';adviceHtml+='</div>';adviceHtml+='</td>';adviceHtml+='<td style="width:50%;vertical-align:top;padding:4px;border:1px solid #eee;">';adviceHtml+='<div class="advice-monitor" style="margin-bottom:6px;">';adviceHtml+='<b>❄️ 冷门监控（冷维度 × 净风险负数）</b><br>';if(coldMonitorHtml){adviceHtml+=coldMonitorHtml;}else{adviceHtml+='<span style="color:#888;">暂无冷门净风险号码</span>';}adviceHtml+='</div>';adviceHtml+='</td></tr></table></div>';} let surgeHtml='';if(surgeVisible){surgeHtml='<div style="font-size:11px;">';surgeHtml+=`<div style="margin-bottom:4px;"><b>⏱ 暴增监控</b><span style="margin-left:8px;">条数阈值：<input type="number" value="${surgeThreshold}" min="10" max="100" style="width:50px;font-size:11px;text-align:center;" onchange="surgeThreshold=parseInt(this.value);localStorage.setItem('surgeThreshold',surgeThreshold);computeSurge().then(()=>renderSmartDecision());">%</span><span style="margin-left:8px;">金额阈值：<input type="number" value="${surgeAmountThreshold}" min="0" max="100" step="0.1" style="width:55px;font-size:11px;text-align:center;" onchange="surgeAmountThreshold=parseFloat(this.value);localStorage.setItem('surgeAmountThreshold',surgeAmountThreshold);computeSurge().then(()=>renderSmartDecision());">%</span><span style="margin-left:8px;">最少${surgeMinOrders}条订单</span></div>`;if(window._surgeResult&&window._surgeResult.length>0){window._surgeResult.forEach(user=>{const username=user.user;surgeHtml+=`<div style="margin-bottom:4px;"><b>${username}:</b> `;const countItems=user.countItems||[];const amountItems=user.amountItems||[];if(countItems.length>0){surgeHtml+='(条) ';countItems.sort((a,b)=>b.ratio-a.ratio);countItems.forEach(item=>{surgeHtml+=`<span class="${getNumCls(item.num)}">${item.num}</span> `;});}if(amountItems.length>0){surgeHtml+='(金) ';amountItems.sort((a,b)=>b.ratio-a.ratio);amountItems.forEach(item=>{surgeHtml+=`<span class="${getNumCls(item.num)}">${item.num}</span> `;});}surgeHtml+=`<button class="copy-advice-btn" onclick="copyUserSurgeNums('${username}')" style="margin-left:4px;">📋复制</button>`;surgeHtml+='</div>';});surgeHtml+='<button class="copy-advice-btn" onclick="copyAllSurgeNums()">📋复制全部号码</button>';}else{surgeHtml+='<div style="color:#888;">暂无暴增</div>';}surgeHtml+='</div>';} let finalHtml='';finalHtml+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">`;finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${heatVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleHeat()">开奖热度分析</button>`;finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${adviceVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleAdvice()">智能建议</button>`;finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${surgeVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleSurge()">暴增监控</button>`;finalHtml+=`</div>`;if(heatVisible)finalHtml+=heatHtml;if(adviceVisible)finalHtml+=adviceHtml;if(surgeVisible)finalHtml+=surgeHtml;if(!heatVisible&&!adviceVisible&&!surgeVisible){finalHtml+='<div style="color:#888;font-size:12px;text-align:center;padding:10px;">点击上方按钮查看分析</div>';}container.innerHTML=finalHtml;}

function insertNumToRecognize(num) { const ta = document.querySelector('.source-order-input'); if (!ta) { showRecognizeModal(); setTimeout(() => { const ta2 = document.querySelector('.source-order-input'); if (ta2) { ta2.value = num; performRecognition(num); } }, 300); return; } ta.value = ta.value.trim() ? ta.value.trim() + '-' + num : num; performRecognition(ta.value); showToast('已填入号码：' + num); }
function copyNumsToClipboard(nums) { if (!nums || nums.length === 0) { showToast('暂无号码'); return; } const str = Array.isArray(nums) ? nums.join('-') : nums; navigator.clipboard.writeText(str).then(() => { showToast('已复制：' + str); }).catch(() => { showToast('复制失败'); }); }

// ===== 行选择与复制 =====
window.dragSelectionActive = false;
function enableRowDragSelect(tableId) { const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody'); if (!tbody) return; let startRow = null; let endRow = null; function clearSelection() { tbody.querySelectorAll('tr.selected-row').forEach(tr => tr.classList.remove('selected-row')); } function selectRows(row1, row2) { if (!row1 || !row2) return; const rows = Array.from(tbody.querySelectorAll('tr')); const idx1 = rows.indexOf(row1); const idx2 = rows.indexOf(row2); if (idx1 === -1 || idx2 === -1) return; const minIdx = Math.min(idx1, idx2); const maxIdx = Math.max(idx1, idx2); for (let i = minIdx; i <= maxIdx; i++) { rows[i].classList.add('selected-row'); } } tbody.addEventListener('mousedown', (e) => { if (e.button !== 0) return; if (e.ctrlKey || e.shiftKey) return; const targetRow = e.target.closest('tr'); if (!targetRow) return; window.dragSelectionActive = true; clearSelection(); startRow = targetRow; endRow = targetRow; targetRow.classList.add('selected-row'); e.preventDefault(); }); document.addEventListener('mousemove', (e) => { if (!window.dragSelectionActive) return; const target = document.elementFromPoint(e.clientX, e.clientY); if (!target) return; const tr = target.closest('tr'); if (!tr || tr.parentElement !== tbody) return; if (tr !== endRow) { endRow = tr; clearSelection(); selectRows(startRow, endRow); } }); document.addEventListener('mouseup', () => { if (window.dragSelectionActive) { window.dragSelectionActive = false; startRow = null; endRow = null; } }); let longPressTimer = null; let longPressTriggered = false; let touchStartY = 0; let touchStartX = 0; tbody.addEventListener('touchstart', (e) => { const targetRow = e.target.closest('tr'); if (!targetRow) return; longPressTriggered = false; touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; if (longPressTimer) clearTimeout(longPressTimer); longPressTimer = setTimeout(() => { longPressTriggered = true; window.dragSelectionActive = true; clearSelection(); startRow = targetRow; endRow = targetRow; targetRow.classList.add('selected-row'); }, 1000); }, { passive: true }); tbody.addEventListener('touchmove', (e) => { if (!longPressTriggered) { const dy = Math.abs(e.touches[0].clientY - touchStartY); const dx = Math.abs(e.touches[0].clientX - touchStartX); if (dy > 10 || dx > 10) { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } } return; } if (!window.dragSelectionActive) return; e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (!target) return; const tr = target.closest('tr'); if (!tr || tr.parentElement !== tbody) return; if (tr !== endRow) { endRow = tr; clearSelection(); selectRows(startRow, endRow); } }, { passive: false }); tbody.addEventListener('touchend', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } if (window.dragSelectionActive) { window.dragSelectionActive = false; startRow = null; endRow = null; } longPressTriggered = false; }); }
function copySelectedNumbers(tableId) { const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody'); if (!tbody) return; const selectedRows = Array.from(tbody.querySelectorAll('tr.selected-row')); if (selectedRows.length === 0) { showToast('请先选择号码'); return; } const ids = selectedRows.map(row => { const cells = row.querySelectorAll('td'); return cells[3] ? cells[3].textContent.trim() : ''; }).filter(id => id && /^\d+$/.test(id)); if (ids.length === 0) { showToast('无有效号码'); return; } const uniqueIds = [...new Set(ids)]; const text = uniqueIds.join('-') + '各号'; navigator.clipboard.writeText(text).then(() => { showToast('已复制: ' + text); }).catch(() => { showToast('复制失败'); }); }

// ===== 卡密管理窗口 =====
function showCardManager() { if (!isAdmin()) { showToast('需要管理员权限'); return; } if (document.getElementById('cardManagerWin')) return; const keys = getCardKeys(); const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'cardManagerWin'; win.style.width = '650px'; win.style.height = '500px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)'; win.innerHTML = `<div class="modal-header"><h3>🔑 卡密管理</h3><div class="window-controls"><button onclick="maximizeWindow('cardManagerWin')">🗖</button><button onclick="document.getElementById('cardManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><input type="number" id="expireDaysInput" placeholder="有效天数" value="30" min="1" style="padding:5px;border-radius:4px;border:1px solid #ccc;width:80px;"><span>天</span><button onclick="generateCardKey()" style="padding:6px 15px;background:#28a745;color:#fff;border:none;border-radius:4px;">生成卡密</button></div><div id="cardListContainer"></div></div><div class="modal-footer"><button onclick="document.getElementById('cardManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; document.body.appendChild(win); renderCardList(); makeWindowDraggable('cardManagerWin'); highestZ += 1; win.style.zIndex = highestZ; }
function renderCardList() { const keys = getCardKeys(); const container = document.getElementById('cardListContainer'); if (!container) return; if (keys.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无卡密</div>'; return; } container.innerHTML = keys.map((card, idx) => { const created = card.createTime ? new Date(card.createTime).toLocaleString('zh-CN') : '未知'; const expired = card.expireDays ? `有效${card.expireDays}天` : '永久'; const statusClass = { active: 'green', disabled: 'red', expired: 'gray' }[card.status] || 'gray'; const statusText = card.status === 'active' ? '启用' : card.status === 'disabled' ? '禁用' : '过期'; return `<div style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-weight:bold;font-size:16px;">${card.code}</span><span style="color:${statusClass};font-size:12px;">[${statusText}]</span><span style="font-size:11px;color:#666;">创建:${created} ${expired}</span><div style="margin-left:auto;display:flex;gap:5px;">${card.status==='active'?`<button onclick="disableCard(${idx})" style="background:#f39c12;color:#fff;border:none;padding:3px 8px;border-radius:3px;">禁用</button>`:''}${card.status==='disabled'?`<button onclick="enableCard(${idx})" style="background:#2ecc71;color:#fff;border:none;padding:3px 8px;border-radius:3px;">启用</button>`:''}<button onclick="deleteCard(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:3px 8px;border-radius:3px;">删除</button></div></div>`; }).join(''); }
async function generateCardKey() { const expireDays = parseInt(document.getElementById('expireDaysInput')?.value) || 30; if (expireDays < 1) { showToast('有效期至少1天'); return; } const code = generateSelfVerifyingCard(expireDays); const keys = getCardKeys(); if (keys.find(k => k.code === code)) { showToast('卡密生成冲突，请重试'); return; } keys.push({ code, status: 'active', createTime: new Date().toISOString(), expireDays }); saveCardKeys(keys); renderCardList(); showToast(`卡密 ${code} 已生成，有效期${expireDays}天`); }
async function disableCard(index) { if (!(await confirm('确定禁用该卡密？'))) return; const keys = getCardKeys(); keys[index].status = 'disabled'; saveCardKeys(keys); renderCardList(); }
async function enableCard(index) { const keys = getCardKeys(); keys[index].status = 'active'; saveCardKeys(keys); renderCardList(); }
async function deleteCard(index) { if (!(await confirm('确定删除该卡密？'))) return; const keys = getCardKeys(); keys.splice(index, 1); saveCardKeys(keys); renderCardList(); }

// ===== 用户管理窗口 =====
function showUserManager() { if (document.getElementById('userManagerWin')) return; const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'userManagerWin'; win.style.width = '450px'; win.style.height = '400px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)'; win.innerHTML = `<div class="modal-header"><h3>管理用户</h3><div class="window-controls"><button onclick="maximizeWindow('userManagerWin')">🗖</button><button onclick="document.getElementById('userManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newUserName" placeholder="用户名" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addUserAction()" style="padding:6px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="userList"></div></div><div class="modal-footer"><button onclick="document.getElementById('userManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; document.body.appendChild(win); renderUserList(); makeWindowDraggable('userManagerWin'); highestZ += 1; win.style.zIndex = highestZ;
  document.getElementById('newUserName').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addUserAction(); } });
}
function renderUserList() { const users = getUsers(); const container = document.getElementById('userList'); if (!container) return; if (users.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无用户</div>'; return; } container.innerHTML = users.map(u => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:5px;border:1px solid #eee;border-radius:4px;"><span style="flex:1;">${u}</span><button onclick="deleteUserAction('${u}')" style="background:#e74c3c;color:#fff;border:none;padding:2px 8px;border-radius:3px;">删除</button></div>`).join(''); }
async function addUserAction() { const name = document.getElementById('newUserName')?.value.trim(); if (!name) { showToast('请输入用户名'); return; } if (addUser(name)) { document.getElementById('newUserName').value = ''; renderUserList(); updateSelects(); showToast('用户添加成功'); } }
async function deleteUserAction(name) { if (!(await confirm(`确定删除用户"${name}"及其数据吗？`))) return; deleteUser(name); renderUserList(); updateSelects(); showToast('用户已删除'); }

// ===== 截断阈值解析方法切换 =====
let currentParseMethod = parseInt(localStorage.getItem('savedParseMethod') || '0');
function parseExcessText(text, method) { const lines = text.trim().split('\n').filter(l => l.trim()); const items = []; for (const line of lines) { const match = line.match(/(\d{2})各(\d+)米/); if (match) { items.push({ num: match[1], amount: parseInt(match[2]) }); } } if (items.length === 0) return ''; items.sort((a, b) => b.amount - a.amount); const parseItems = (method) => { const data = items.map(item => ({ ...item })); const result = []; if (method === 0) { while (data.some(d => d.amount > 0)) { const maxAmount = Math.max(...data.map(d => d.amount)); if (maxAmount <= 0) break; const group = []; for (const d of data) { if (d.amount > 0 && (maxAmount - d.amount) <= maxAmount * 0.4) { group.push(d.num); } } const groupAmount = Math.min(...group.map(n => data.find(d => d.num === n).amount)); for (const n of group) { const d = data.find(d => d.num === n); d.amount -= groupAmount; } result.push(`${group.join('-')}各数${groupAmount}`); } } else if (method === 1) { while (data.some(d => d.amount > 0)) { let bestAmount = 0; let bestCount = 0; for (let i = 0; i < data.length; i++) { const candidate = data[i].amount; if (candidate <= 0) continue; let count = 0; for (const d of data) { if (d.amount >= candidate) count++; } if (count > bestCount || (count === bestCount && candidate < bestAmount)) { bestCount = count; bestAmount = candidate; } } if (bestCount === 0) break; const group = []; for (const d of data) { if (d.amount >= bestAmount) { group.push(d.num); d.amount -= bestAmount; } } result.push(`${group.join('-')}各数${bestAmount}`); } } else if (method === 2) { const levels = [50, 10, 5, 2, 1]; for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } } } else if (method === 3) { for (let lv = 100; lv >= 1; lv--) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } } } else if (method === 4) { const levels = []; for (let lv = 100; lv >= 5; lv -= 5) levels.push(lv); levels.push(3, 2, 1); for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } } } return result.join('\n'); }; return parseItems(method); }
function switchParseMethod() { const text = document.getElementById('reportCapInfo').innerText; if (!text || text === '无超出的号码') { showToast('当前没有超额文本'); document.getElementById('parseResultArea').innerText = ''; return; } const result = parseExcessText(text, currentParseMethod); document.getElementById('parseResultArea').innerText = result; const methodNames = ['聚类分组', '贪心合并', '固定50→10→5→2→1', '100递减', '固定100→...→1']; showToast(`当前方案：${methodNames[currentParseMethod]}`); currentParseMethod = (currentParseMethod + 1) % 5; localStorage.setItem('savedParseMethod', currentParseMethod); }
function copyOrderGroup() { const text = document.getElementById('parseResultArea').innerText; if (!text) { showToast('没有解析结果'); return; } navigator.clipboard.writeText(text).then(() => showToast('订单组已复制')); }

// ===== 北京时间更新函数 =====
function updateLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const now = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const str = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    weekdays[now.getDay()] + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
  el.textContent = str;
}

// ===== 页面初始化 =====
window.onload = async () => {
  setCurrentRegion(currentRegion);
  const dbInitOk = await initIndexedDB();
  if (!dbInitOk) { document.getElementById('dbWarning').style.display = 'block'; const dbStatusEl = document.getElementById('dbStatus'); if (dbStatusEl) { dbStatusEl.textContent = '异常'; dbStatusEl.style.color = '#e74c3c'; } }
  if (!localStorage.getItem('replacePresets')) { const defaultPresets = [{"old":"兰","new":"蓝"},{"old":"录","new":"绿"},{"old":"碌","new":"绿"},{"old":"禄","new":"绿"},{"old":"拦","new":"蓝"},{"old":"篮","new":"蓝"},{"old":"免","new":"兔"},{"old":"午","new":"牛"},{"old":"侯","new":"猴"},{"old":"㺅","new":"猴"},{"old":"名","new":"各"}]; localStorage.setItem('replacePresets', JSON.stringify(defaultPresets)); }
  if (!localStorage.getItem('categoryAliases')) { const defaultAliases = [{"alias":"红色","target":"红波"},{"alias":"蓝色","target":"蓝波"},{"alias":"绿色","target":"绿波"},{"alias":"兰波","target":"蓝波"},{"alias":"录波","target":"绿波"},{"alias":"金行","target":"金"},{"alias":"木行","target":"木"},{"alias":"水行","target":"水"},{"alias":"火行","target":"火"},{"alias":"土行","target":"土"},{"alias":"红蓝","target":"红波-蓝波"},{"alias":"红绿","target":"红波-绿波"},{"alias":"蓝绿","target":"蓝波-绿波"},{"alias":"火土","target":"火-土"},{"alias":"红蓝波","target":"红波-蓝波"},{"alias":"红绿波","target":"红波-绿波"},{"alias":"蓝绿波","target":"蓝波-绿波"},{"alias":"大单小双","target":"大单-小双"},{"alias":"大双小单","target":"大双-小单"},{"alias":"金木水","target":"金-木-水"},{"alias":"家肖","target":"家禽"},{"alias":"野肖","target":"野兽"},{"alias":"号各","target":"各号"},{"alias":"小数","target":"小"},{"alias":"大数","target":"大"},{"alias":"合单","target":"合数单"},{"alias":"合双","target":"合数双"},{"alias":"大尾","target":"尾大"},{"alias":"小尾","target":"尾小"},{"alias":"大数单","target":"大单"},{"alias":"大数双","target":"大双"},{"alias":"小数单","target":"小单"},{"alias":"小数双","target":"小双"},{"alias":"红波单","target":"红单"},{"alias":"红波双","target":"红双"},{"alias":"蓝波单","target":"蓝单"},{"alias":"蓝波双","target":"蓝双"},{"alias":"绿波单","target":"绿单"},{"alias":"绿波双","target":"绿双"},{"alias":"老虎","target":"虎"},{"alias":"老鼠","target":"鼠"},{"alias":"兔子","target":"兔"},{"alias":"大号","target":"大"},{"alias":"小号","target":"小"}]; localStorage.setItem('categoryAliases', JSON.stringify(defaultAliases)); }
  const today = getTodayCST(); const filterDateEl2 = document.getElementById('filterDate'); if (filterDateEl2) filterDateEl2.value = today;
  const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马'; document.getElementById('startZodiacSelect').value = savedZodiac;
  currentZodiacMap = buildZodiacMap(savedZodiac); updateSelects(); renderAllTablesPlaceholder();
  enableRowDragSelect('riskTable'); enableRowDragSelect('reportTable');
  await autoCleanRecycleBin(); setInterval(autoCleanRecycleBin, 24 * 60 * 60 * 1000); updateRecycleCount();
  updateLiveClock(); setInterval(updateLiveClock, 1000);
  window._systemReady = async () => { await updateTableFromRecords(); calculateStorageUsage(); updateOrderTotalDisplay(); updateReportAmountTotal(); updateRecentDrawTexts(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); addOperationLog('login', '系统登录'); };
  if (!checkCurrentAccess()) {
    showLoginScreen();
  } else {
    if (isAdmin()) document.getElementById('cardMgrBtn').style.display = '';
    await window._systemReady();
  }
  const fixRangeInput = (id) => { const el = document.getElementById(id); if (el) { el.addEventListener('input', () => { clearStatsCache(); updateTableFromRecords(); }); } };
  fixRangeInput('numAmountMin'); fixRangeInput('numAmountMax'); fixRangeInput('zodiacAmountMin'); fixRangeInput('zodiacAmountMax');

  // ===== 事件监听绑定 =====
  document.getElementById('rebateRate')?.addEventListener('input', generateRiskTable);
  document.getElementById('multipleVal')?.addEventListener('input', generateRiskTable);
  document.getElementById('reportRebateRate')?.addEventListener('input', generateReportTable);
  document.getElementById('reportMultipleVal')?.addEventListener('input', generateReportTable);
  document.getElementById('startZodiacSelect')?.addEventListener('change', changeStartZodiac);

  const filterDateEl = document.getElementById('filterDate');
  if (filterDateEl) { filterDateEl.addEventListener('change', () => { updateTableFromRecords(); if (document.getElementById('orderWin')) { applyPrizeFilter(); } applyReportCap(); updateRecentDrawTexts(); renderPingtexiaoTable(); updateCardA(); const duiJiangWin = document.getElementById('duiJiangWin'); if (duiJiangWin) { showDuiJiangWin(); } }); filterDateEl.addEventListener('input', updateTableFromRecords); }

  const originalApplyReportCap = applyReportCap;
  applyReportCap = function() { originalApplyReportCap(); const info = document.getElementById('reportCapInfo').innerText; if (!info || info === '无超出的号码') { document.getElementById('parseResultArea').innerText = ''; } };

  // ===== 全局函数增强（装饰器） =====
  (function() { const originalFn = generateReportTable; generateReportTable = function() { originalFn.apply(this, arguments); updateCardA(); renderSmartDecision(); }; })();
  (function() { const originalFn = updateTableFromRecords; updateTableFromRecords = async function() { await originalFn.apply(this, arguments); await computeSurge(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); }; })();
  (function() { const originalFn = switchRegion; switchRegion = async function(region) { await originalFn.apply(this, arguments); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); }; })();

  (function() { const originalApplyPrizeFilter = applyPrizeFilter; applyPrizeFilter = async function() { await originalApplyPrizeFilter.apply(this, arguments); const input = document.getElementById('prizeNumberInput'); if (!input) return; let val = input.value.trim(); if (val === '') { input.className = ''; return; } if (/^\d$/.test(val)) val = '0' + val; if (/^\d{2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 49) { const cls = redNumbers.includes(val) ? 'red-text' : (blueNumbers.includes(val) ? 'blue-text' : 'green-text'); input.className = cls; } else { input.className = ''; } }; })();

  // ===== 键盘快捷键 =====
  function closeTopWindow() {
    const recognizeWin = document.getElementById('recognizeWin'); if (recognizeWin) { closeRecognizeModal(); return true; }
    const orderWin = document.getElementById('orderWin'); if (orderWin) { orderWin.remove(); return true; }
    const reportWin = document.getElementById('reportWin'); if (reportWin) { reportWin.remove(); return true; }
    const drawWin = document.getElementById('drawRecordWin'); if (drawWin) { drawWin.remove(); return true; }
    const recycleWin = document.getElementById('recycleWin'); if (recycleWin) { recycleWin.remove(); return true; }
    const operationLogWin = document.getElementById('operationLogWin'); if (operationLogWin) { operationLogWin.remove(); return true; }
    const databaseModal = document.getElementById('databaseModal'); if (databaseModal && databaseModal.style.display === 'flex') { hideDatabase(); return true; }
    const prefixWin = document.getElementById('prefixWin'); if (prefixWin) { prefixWin.remove(); return true; }
    const amountPrefixWin = document.getElementById('amountPrefixWin'); if (amountPrefixWin) { amountPrefixWin.remove(); return true; }
    const amountSuffixWin = document.getElementById('amountSuffixWin'); if (amountSuffixWin) { amountSuffixWin.remove(); return true; }
    const categoryAliasWin = document.getElementById('categoryAliasWin'); if (categoryAliasWin) { categoryAliasWin.remove(); return true; }
    const replacePresetWin = document.getElementById('replacePresetWin'); if (replacePresetWin) { replacePresetWin.remove(); return true; }
    const cardManagerWin = document.getElementById('cardManagerWin'); if (cardManagerWin) { cardManagerWin.remove(); return true; }
    const userManagerWin = document.getElementById('userManagerWin'); if (userManagerWin) { userManagerWin.remove(); return true; }
    const lianxiaoGenerateWin = document.getElementById('lianxiaoGenerateWin'); if (lianxiaoGenerateWin) { lianxiaoGenerateWin.remove(); return true; }
    const lianxiaoStatsWin = document.getElementById('lianxiaoStatsWin'); if (lianxiaoStatsWin) { lianxiaoStatsWin.remove(); return true; }
    const duiJiangWin = document.getElementById('duiJiangWin'); if (duiJiangWin) { duiJiangWin.remove(); return true; }
    const oddsWin = document.getElementById('oddsWin'); if (oddsWin) { oddsWin.remove(); return true; }
    return false;
  }

  document.addEventListener('keydown', function(e) {
    const recognizeWin = document.getElementById('recognizeWin');
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
    if (e.altKey && e.key === '1') { e.preventDefault(); if (recognizeWin) { closeRecognizeModal(); } else { showRecognizeModal(); } return; }
    if (e.altKey && e.key === '2') { e.preventDefault(); if (recognizeWin) { saveReportOrder(); } return; }
    if (e.altKey && e.key === '3') { e.preventDefault(); if (recognizeWin) { saveOrder(); } return; }
    if (e.altKey && e.key === '4') { e.preventDefault(); if (recognizeWin) { const ta = document.querySelector('.source-order-input'); if (ta) ta.focus(); } return; }
    if (e.key === 'Escape' && !isInputFocused) { if (closeTopWindow()) { e.preventDefault(); } else { document.querySelectorAll('#riskTable tr.selected-row, #reportTable tr.selected-row').forEach(tr => tr.classList.remove('selected-row')); e.preventDefault(); } return; }
    if (e.ctrlKey && e.key === 'v') { if (recognizeWin && !isInputFocused) { e.preventDefault(); pasteOrder(); } return; }
    if (e.ctrlKey && e.key === 'Delete') { if (recognizeWin) { e.preventDefault(); clearAllInput(); } return; }
    if (e.key === 'F5') { e.preventDefault(); updateTableFromRecords(); showToast('数据已刷新'); return; }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportData(); return; }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); importData(); return; }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); showDatabase(); return; }
  });
};