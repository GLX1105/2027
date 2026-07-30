// ===== uiWindow.js - 通用浮动窗口管理（创建、拖拽、最大化、对话框、数据库弹窗、识别弹窗、截图等） =====

// ===== 自定义对话框系统 =====
function showCustomDialog({ title = '提示', message = '', type = 'alert', defaultValue = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div'); overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `<div class="custom-dialog-box"><div class="custom-dialog-title">${title}</div><div class="custom-dialog-message">${message}</div>${type==='prompt'?`<input class="custom-dialog-input" type="text" value="${defaultValue}" placeholder="${placeholder}" id="custom-dialog-input">`:''}<div class="custom-dialog-buttons">${type==='confirm'||type==='prompt'?'<button class="custom-dialog-btn cancel" id="custom-dialog-cancel">取消</button>':''}<button class="custom-dialog-btn confirm" id="custom-dialog-confirm">确定</button></div></div>`;
    document.body.appendChild(overlay);
    const confirmBtn = overlay.querySelector('#custom-dialog-confirm');
    const cancelBtn = overlay.querySelector('#custom-dialog-cancel');
    const inputEl = overlay.querySelector('#custom-dialog-input');
    const close = (result) => { document.body.removeChild(overlay); resolve(result); };
    confirmBtn.onclick = () => { if (type === 'prompt') close(inputEl.value); else if (type === 'confirm') close(true); else close(undefined); };
    if (cancelBtn) cancelBtn.onclick = () => { if (type === 'confirm') close(false); else if (type === 'prompt') close(null); else close(undefined); };
    if (inputEl) { inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirmBtn.click(); }); inputEl.focus(); }
  });
}

function showToast(message) {
  const toast = document.createElement('div'); toast.className = 'toast-message'; toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { document.body.removeChild(toast); }, 300); }, 1500);
}

async function customAlert(message) { await showCustomDialog({ title: '提示', message, type: 'alert' }); }
async function customConfirm(message) { return await showCustomDialog({ title: '请确认', message, type: 'confirm' }); }
async function customPrompt(message, defaultValue = '') { return await showCustomDialog({ title: '请输入', message, type: 'prompt', defaultValue }); }

// 覆盖原生弹窗
window.alert = async (msg) => { await customAlert(msg); };
window.confirm = async (msg) => { return await customConfirm(msg); };
window.prompt = async (msg, def) => { return await customPrompt(msg, def); };

// ===== 浮动窗口拖拽（只允许标题栏拖拽 + 边界弹回） =====
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

    const minVisible = 50;
    if (startTop < 0) { win.style.top = '0px'; win.style.transform = 'none'; startTop = 0; }
    if (startLeft < -win.offsetWidth + minVisible) { win.style.left = (-win.offsetWidth + minVisible) + 'px'; win.style.transform = 'none'; startLeft = -win.offsetWidth + minVisible; }
    if (startLeft > window.innerWidth - minVisible) { win.style.left = (window.innerWidth - minVisible) + 'px'; win.style.transform = 'none'; startLeft = window.innerWidth - minVisible; }

    win.style.cursor = 'grabbing';
    e.preventDefault();
  }

  header.addEventListener('mousedown', onMouseDown);

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
    if (newTop < 0) newTop = 0;
    if (newTop > screenHeight - minVisible) newTop = screenHeight - minVisible;

    win.style.left = newLeft + 'px';
    win.style.top = newTop + 'px';
    win.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    win.style.cursor = '';

    const rect = win.getBoundingClientRect();
    const winWidth = win.offsetWidth;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const minVisible = 50;

    if (rect.top < 0) { win.style.top = '0px'; win.style.transform = 'none'; }
    if (rect.left < -winWidth + minVisible) { win.style.left = (-winWidth + minVisible) + 'px'; win.style.transform = 'none'; }
    if (rect.left > screenWidth - minVisible) { win.style.left = (screenWidth - minVisible) + 'px'; win.style.transform = 'none'; }
    if (rect.top > screenHeight - minVisible) { win.style.top = (screenHeight - minVisible) + 'px'; win.style.transform = 'none'; }
  });

  win.addEventListener('mousedown', () => { highestZ += 1; win.style.zIndex = highestZ; });
}

// ===== 最大化窗口 =====
function maximizeWindow(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  const isMaximized = win.getAttribute('data-maximized') === 'true';
  if (isMaximized) {
    const origWidth = win.getAttribute('data-orig-width');
    const origHeight = win.getAttribute('data-orig-height');
    const origLeft = win.getAttribute('data-orig-left');
    const origTop = win.getAttribute('data-orig-top');
    const origTransform = win.getAttribute('data-orig-transform');
    if (origWidth) win.style.width = origWidth;
    if (origHeight) win.style.height = origHeight;
    if (origLeft) win.style.left = origLeft;
    if (origTop) win.style.top = origTop;
    if (origTransform !== null) win.style.transform = origTransform;
    win.style.right = ''; win.style.bottom = '';
    win.setAttribute('data-maximized', 'false');
    win.style.resize = 'both';
    win.style.overflow = 'auto';
  } else {
    const rect = win.getBoundingClientRect();
    win.setAttribute('data-orig-width', win.style.width || (rect.width + 'px'));
    win.setAttribute('data-orig-height', win.style.height || (rect.height + 'px'));
    win.setAttribute('data-orig-left', win.style.left || (rect.left + 'px'));
    win.setAttribute('data-orig-top', win.style.top || (rect.top + 'px'));
    win.setAttribute('data-orig-transform', win.style.transform || '');
    win.style.left = '0';
    win.style.top = '0';
    win.style.right = '0';
    win.style.bottom = '0';
    win.style.width = 'auto';
    win.style.height = 'auto';
    win.style.transform = 'none';
    win.setAttribute('data-maximized', 'true');
    win.style.resize = 'none';
    win.style.overflow = 'auto';
  }
}

// ===== 数据库弹窗 =====
async function showDatabase() {
  const pwd = await prompt("请输入数据库密码：","");
  if (pwd === PASSWORD) {
    const modal = document.getElementById('databaseModal');
    if (!modal) return;
    modal.style.display = 'flex';
    highestZ += 1; modal.style.zIndex = highestZ;
    renderDatabaseContent();
    makeWindowDraggable('databaseModalBox');
  } else {
    await alert("密码错误");
  }
}

function hideDatabase() {
  const modal = document.getElementById('databaseModal');
  if (modal) modal.style.display = 'none';
}

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

function closeRecognizeModal() {
  const textarea = document.querySelector('.source-order-input');
  if (textarea) { const draftKey = `recognizeDraft_${currentRegion}`; localStorage.setItem(draftKey, textarea.value); }
  const win = document.getElementById('recognizeWin'); if (win) win.remove();
}

function markSelection() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const start = ta.selectionStart, end = ta.selectionEnd;
  if (start === end) { showToast('请先选择文本'); return; }
  const selectedText = ta.value.substring(start, end);
  const tokens = selectedText.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim());
  if (tokens.length === 0) { showToast('所选内容无有效文字'); return; }
  const merged = tokens.join('-');
  ta.value = ta.value.substring(0, start) + merged + ta.value.substring(end);
  performRecognition(ta.value);
}

// ===== 识别窗口内的辅助操作 =====
async function pasteOrder() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) { const si = document.querySelector('.source-order-input'); if (si) { si.value = text; performRecognition(text); } }
  } catch (err) { showToast('无法访问剪贴板'); }
}

function removeSeparators() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e);
  const cleaned = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '');
  ta.value = ta.value.substring(0, s) + cleaned + ta.value.substring(e);
  performRecognition(ta.value);
}

function replaceSeparators() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e);
  const replaced = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '-');
  ta.value = ta.value.substring(0, s) + replaced + ta.value.substring(e);
  performRecognition(ta.value);
}

// ===== 语义转换 =====
function semanticReplace() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e).trim();
  if (!sel) { showToast('请先选择文本'); return; }

  function expandToNums(text) {
    const resultNums = new Set();
    if (!text || !text.trim()) return resultNums;
    const headRegex = /([\d\s,，.。、+\-*＊\/\\|]+)头/g;
    let headMatch;
    while ((headMatch = headRegex.exec(text)) !== null) {
      const digits = headMatch[1].match(/\d/g);
      if (digits) {
        digits.forEach(d => {
          const key = d + '头';
          if (D[key]) { D[key].split(/[\s,，]+/).forEach(n => { if (n.trim()) resultNums.add(n.trim().padStart(2, '0')); }); }
        });
      }
    }
    const tailRegex = /([\d\s,，.。、+\-*＊\/\\|]+)尾/g;
    let tailMatch;
    while ((tailMatch = tailRegex.exec(text)) !== null) {
      const digits = tailMatch[1].match(/\d/g);
      if (digits) {
        digits.forEach(d => {
          const key = d + '尾';
          if (D[key]) { D[key].split(/[\s,，]+/).forEach(n => { if (n.trim()) resultNums.add(n.trim().padStart(2, '0')); }); }
        });
      }
    }
    const cleanedText = text.replace(/([\d\s,，.。、+\-*＊\/\\|]+)头/g, '').replace(/([\d\s,，.。、+\-*＊\/\\|]+)尾/g, '');
    const tokens = cleanedText.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim());
    tokens.forEach(token => {
      let matched = false;
      const allDictKeys = Object.keys(D).filter(k => !/^\d+$/.test(k) && !/^\d{2}$/.test(k) && k.length > 1);
      allDictKeys.sort((a, b) => b.length - a.length);
      for (const key of allDictKeys) {
        if (token.includes(key)) {
          const nums = keyToAllNums(key);
          nums.forEach(n => resultNums.add(n.padStart(2, '0')));
          matched = true; break;
        }
      }
      if (!matched) {
        for (const ch of token) {
          if (ZODIAC_NUMS[ch]) {
            ZODIAC_NUMS[ch].split(/[\s,，]+/).forEach(n => resultNums.add(n.padStart(2, '0')));
            matched = true;
          }
        }
      }
    });
    return resultNums;
  }

  function extractExcludeNums(text) {
    const nums = new Set();
    const digits = text.match(/\d{1,2}/g);
    if (digits) {
      digits.forEach(d => {
        const intVal = parseInt(d);
        if (intVal >= 1 && intVal <= 49) { nums.add(String(intVal).padStart(2, '0')); }
      });
    }
    return nums;
  }

  let resultNums = new Set();

  if (sel.includes('不要')) {
    const parts = sel.split('不要');
    const beforeText = parts[0] || '';
    const afterText = parts.slice(1).join('不要') || '';
    const includeNums = expandToNums(beforeText);
    const excludeNums = extractExcludeNums(afterText);
    if (includeNums.size === 0) { showToast('未识别到有效分类'); return; }
    includeNums.forEach(n => { if (!excludeNums.has(n)) resultNums.add(n); });
    if (resultNums.size === 0) { showToast('排除后无剩余号码'); return; }
  } else if (sel.includes('的')) {
    const parts = sel.split('的');
    const beforeText = parts[0] || '';
    const afterText = parts.slice(1).join('的') || '';
    const beforeNums = expandToNums(beforeText);
    const afterNums = expandToNums(afterText);
    if (beforeNums.size === 0 || afterNums.size === 0) { showToast('未识别到有效分类'); return; }
    beforeNums.forEach(n => { if (afterNums.has(n)) resultNums.add(n); });
    if (resultNums.size === 0) { showToast('无共同号码'); return; }
  } else {
    const tokens = sel.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim());
    const matched = tokens.filter(t => D[t]);
    if (!matched.length) { showToast('未识别有效分类'); return; }
    let sets = matched.map(cat => { const nums = keyToAllNums(cat); return new Set(nums); });
    let inter = sets[0];
    for (let i = 1; i < sets.length; i++) { inter = new Set([...inter].filter(x => sets[i].has(x))); }
    resultNums = inter;
    if (resultNums.size === 0) { showToast('无共同号码'); return; }
  }

  const sortedNums = [...resultNums].sort((a, b) => parseInt(a) - parseInt(b));
  const str = sortedNums.join('-');
  ta.value = ta.value.substring(0, s) + str + ta.value.substring(e);
  performRecognition(ta.value);
  showToast('语义转换完成：' + str);
}

// ===== 截图相关函数（通用） =====
async function screenshotRiskCard() {
  const card = document.getElementById('riskReportCard');
  if (!card) { showToast('卡片不存在'); return; }
  try {
    const clone = card.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = card.offsetWidth + 'px';
    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    document.body.appendChild(clone);
    const scrollDivs = clone.querySelectorAll('.table-container, [style*="overflow"]');
    const savedStyles = [];
    scrollDivs.forEach(div => {
      savedStyles.push({ div, overflow: div.style.overflow, maxHeight: div.style.maxHeight });
      div.style.overflow = 'visible';
      div.style.maxHeight = 'none';
    });
    clone.offsetHeight;
    const canvas = await html2canvas(clone, { backgroundColor: '#ffffff', scale: 2, logging: false });
    document.body.removeChild(clone);
    canvas.toBlob(async blob => {
      if (!blob) { showToast('生成图片失败'); return; }
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('卡片截图已复制'); } catch(e) { showToast('复制失败'); }
    }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

async function screenshotLianxiaoStatsAll() {
  const container = document.getElementById('lianxiaoStatsContainer'); if (!container) { showToast('无内容'); return; }
  try {
    const origOverflow = container.style.overflow; const origMaxHeight = container.style.maxHeight;
    container.style.overflow = 'visible'; container.style.maxHeight = 'none';
    const scrollDivs = container.querySelectorAll('div[style*="max-height:400px"]'); const savedStyles = [];
    scrollDivs.forEach(div => { savedStyles.push({ div, overflow: div.style.overflow, maxHeight: div.style.maxHeight }); div.style.overflow = 'visible'; div.style.maxHeight = 'none'; });
    container.offsetHeight;
    const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2, logging: false });
    container.style.overflow = origOverflow; container.style.maxHeight = origMaxHeight;
    savedStyles.forEach(item => { item.div.style.overflow = item.overflow; item.div.style.maxHeight = item.maxHeight; });
    canvas.toBlob(async blob => { if (!blob) { showToast('生成图片失败'); return; } try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); } catch(e) { showToast('复制失败'); } }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

async function screenshotSingleComboCard(cardId) {
  const card = document.getElementById(cardId); if (!card) { showToast('卡片不存在'); return; }
  try {
    const clone = card.cloneNode(true); clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.top = '0'; clone.style.width = card.offsetWidth + 'px'; clone.style.display = 'block'; clone.style.visibility = 'visible'; document.body.appendChild(clone);
    const scrollDiv = clone.querySelector('div[style*="max-height:400px"]'); if (scrollDiv) { scrollDiv.style.overflow = 'visible'; scrollDiv.style.maxHeight = 'none'; }
    clone.offsetHeight;
    const canvas = await html2canvas(clone, { backgroundColor: '#ffffff', scale: 2, logging: false });
    document.body.removeChild(clone);
    canvas.toBlob(async blob => { if (!blob) { showToast('生成图片失败'); return; } try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); } catch(e) { showToast('复制失败'); } }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

// ===== 前缀/后缀管理窗口 =====
function showPrefixManager() {
  if (document.getElementById('prefixWin')) return;
  const prefixes = getCustomPrefixes();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'prefixWin';
  w.style.width = '500px'; w.style.height = '400px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('prefixWin')">🗖</button><button onclick="document.getElementById('prefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newPrefix" placeholder="新增行首忽略词" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addPrefix()" style="padding:6px 12px;background:#3498db;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="prefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('prefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderPrefixList(); makeWindowDraggable('prefixWin'); highestZ += 1; w.style.zIndex = highestZ;
  document.getElementById('newPrefix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addPrefix(); } });
}
function renderPrefixList() {
  const p = getCustomPrefixes(); const c = document.getElementById('prefixList');
  if (!c) return;
  c.innerHTML = p.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义前缀</div>' : p.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deletePrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}
async function addPrefix() {
  const v = document.getElementById('newPrefix')?.value.trim();
  if (!v) { showToast('请输入前缀'); return; }
  const p = getCustomPrefixes();
  if (p.includes(v)) { showToast('已存在'); return; }
  p.push(v);
  localStorage.setItem('customPrefixes', JSON.stringify(p));
  document.getElementById('newPrefix').value = '';
  renderPrefixList();
}
async function deletePrefix(i) {
  if (!(await confirm('确定删除？'))) return;
  const p = getCustomPrefixes();
  p.splice(i, 1);
  localStorage.setItem('customPrefixes', JSON.stringify(p));
  renderPrefixList();
}

function showAmountPrefixManager() {
  if (document.getElementById('amountPrefixWin')) return;
  const list = getCustomAmountPrefixes();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'amountPrefixWin';
  w.style.width = '500px'; w.style.height = '450px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>金额前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountPrefixWin')">🗖</button><button onclick="document.getElementById('amountPrefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountPrefix" placeholder="新增金额前缀（如 投、买）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountPrefix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountPrefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountPrefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderAmountPrefixList(); makeWindowDraggable('amountPrefixWin'); highestZ += 1; w.style.zIndex = highestZ;
  document.getElementById('newAmountPrefix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addAmountPrefix(); } });
}
function renderAmountPrefixList() {
  const list = getCustomAmountPrefixes(); const container = document.getElementById('amountPrefixList');
  if (!container) return;
  container.innerHTML = list.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额前缀</div>' : list.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountPrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}
async function addAmountPrefix() {
  const v = document.getElementById('newAmountPrefix')?.value.trim();
  if (!v) { showToast('请输入金额前缀'); return; }
  const list = getCustomAmountPrefixes();
  if (list.includes(v)) { showToast('已存在'); return; }
  list.push(v);
  saveCustomAmountPrefixes(list);
  document.getElementById('newAmountPrefix').value = '';
  renderAmountPrefixList();
  showToast('已添加（即时生效）');
}
async function deleteAmountPrefix(i) {
  if (!(await confirm('确定删除？'))) return;
  const list = getCustomAmountPrefixes();
  list.splice(i, 1);
  saveCustomAmountPrefixes(list);
  renderAmountPrefixList();
}

function showAmountSuffixManager() {
  if (document.getElementById('amountSuffixWin')) return;
  const s = getCustomAmountSuffixes();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'amountSuffixWin';
  w.style.width = '500px'; w.style.height = '400px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>金额后缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountSuffixWin')">🗖</button><button onclick="document.getElementById('amountSuffixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountSuffix" placeholder="新增后缀(如米、斤)" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountSuffix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountSuffixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountSuffixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderAmountSuffixList(); makeWindowDraggable('amountSuffixWin'); highestZ += 1; w.style.zIndex = highestZ;
  document.getElementById('newAmountSuffix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addAmountSuffix(); } });
}
function renderAmountSuffixList() {
  const s = getCustomAmountSuffixes(); const c = document.getElementById('amountSuffixList');
  if (!c) return;
  c.innerHTML = s.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额后缀</div>' : s.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountSuffix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}
async function addAmountSuffix() {
  const v = document.getElementById('newAmountSuffix')?.value.trim();
  if (!v) { showToast('请输入后缀'); return; }
  const s = getCustomAmountSuffixes();
  if (s.includes(v)) { showToast('已存在'); return; }
  s.push(v);
  localStorage.setItem('customAmountSuffixes', JSON.stringify(s));
  document.getElementById('newAmountSuffix').value = '';
  renderAmountSuffixList();
}
async function deleteAmountSuffix(i) {
  if (!(await confirm('确定删除？'))) return;
  const s = getCustomAmountSuffixes();
  s.splice(i, 1);
  localStorage.setItem('customAmountSuffixes', JSON.stringify(s));
  renderAmountSuffixList();
}

// ===== 分类缩写管理 =====
function showCategoryAliases() {
  if (document.getElementById('categoryAliasWin')) return;
  const a = getCategoryAliases();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'categoryAliasWin';
  w.style.width = '500px'; w.style.height = '450px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>分类缩写</h3><div class="window-controls"><button onclick="maximizeWindow('categoryAliasWin')">🗖</button><button onclick="document.getElementById('categoryAliasWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="aliasOld" placeholder="缩写（如 红蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="aliasNew" placeholder="正规分类（如 红波-蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addCategoryAlias()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="aliasList"></div></div><div class="modal-footer"><button onclick="document.getElementById('categoryAliasWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderAliasList(); makeWindowDraggable('categoryAliasWin'); highestZ += 1; w.style.zIndex = highestZ;
  document.getElementById('aliasOld').addEventListener('keypress', (e) => { if (e.key === 'Enter') { document.getElementById('aliasNew').focus(); } });
  document.getElementById('aliasNew').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addCategoryAlias(); } });
}
function renderAliasList() {
  const a = getCategoryAliases(); const c = document.getElementById('aliasList');
  if (!c) return;
  c.innerHTML = a.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无分类缩写</div>' : a.map((x, i) => `<div class="replace-preset-item"><span>${x.alias} → ${x.target}</span><button onclick="deleteCategoryAlias(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}
async function addCategoryAlias() {
  const alias = document.getElementById('aliasOld')?.value.trim();
  const target = document.getElementById('aliasNew')?.value.trim();
  if (!alias || !target) { showToast('请输入缩写和目标分类'); return; }
  const a = getCategoryAliases();
  if (a.some(x => x.alias === alias)) { showToast('该缩写已存在'); return; }
  a.push({ alias, target });
  a.sort((x, y) => y.alias.length - x.alias.length);
  localStorage.setItem('categoryAliases', JSON.stringify(a));
  document.getElementById('aliasOld').value = '';
  document.getElementById('aliasNew').value = '';
  renderAliasList();
}
async function deleteCategoryAlias(i) {
  if (!(await confirm('确定删除？'))) return;
  const a = getCategoryAliases();
  a.splice(i, 1);
  localStorage.setItem('categoryAliases', JSON.stringify(a));
  renderAliasList();
}

// ===== 替换预设管理 =====
function showReplacePreset() {
  if (document.getElementById('replacePresetWin')) return;
  const p = getReplacePresets();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'replacePresetWin';
  w.style.width = '500px'; w.style.height = '450px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>替换预设</h3><div style="display:flex;align-items:center;gap:8px;margin-left:auto;"><button onclick="resetPresetsToDefault()" title="恢复默认预设" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">🔄</button><div class="window-controls"><button onclick="maximizeWindow('replacePresetWin')">🗖</button><button onclick="document.getElementById('replacePresetWin').remove()">×</button></div></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="presetOld" placeholder="原文字" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="presetNew" placeholder="替换为" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addReplacePreset()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="presetList"></div></div><div class="modal-footer"><button onclick="document.getElementById('replacePresetWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderPresetList(); makeWindowDraggable('replacePresetWin'); highestZ += 1; w.style.zIndex = highestZ;
  document.getElementById('presetOld').addEventListener('keypress', (e) => { if (e.key === 'Enter') { document.getElementById('presetNew').focus(); } });
  document.getElementById('presetNew').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addReplacePreset(); } });
}
function renderPresetList() {
  const p = getReplacePresets(); const c = document.getElementById('presetList');
  if (!c) return;
  c.innerHTML = p.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无替换预设</div>' : p.map((x, i) => `<div class="replace-preset-item"><span>${x.old} → ${x.new}</span><button onclick="deleteReplacePreset(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}
async function addReplacePreset() {
  const o = document.getElementById('presetOld')?.value.trim();
  const n = document.getElementById('presetNew')?.value.trim();
  if (!o || !n) { showToast('请输入原文字和替换文字'); return; }
  const p = getReplacePresets();
  if (p.some(x => x.old === o)) { showToast('已存在'); return; }
  p.push({ old: o, new: n });
  localStorage.setItem('replacePresets', JSON.stringify(p));
  document.getElementById('presetOld').value = '';
  document.getElementById('presetNew').value = '';
  renderPresetList();
}
async function deleteReplacePreset(i) {
  if (!(await confirm('确定删除？'))) return;
  const p = getReplacePresets();
  p.splice(i, 1);
  localStorage.setItem('replacePresets', JSON.stringify(p));
  renderPresetList();
}
async function resetPresetsToDefault() {
  if (!(await confirm('确定恢复替换预设和分类缩写为默认值吗？当前自定义数据将被覆盖。'))) return;
  const defaultPresets = [
    { "old": "兰", "new": "蓝" }, { "old": "录", "new": "绿" }, { "old": "碌", "new": "绿" }, { "old": "禄", "new": "绿" },
    { "old": "拦", "new": "蓝" }, { "old": "篮", "new": "蓝" }, { "old": "免", "new": "兔" }, { "old": "午", "new": "牛" },
    { "old": "侯", "new": "猴" }, { "old": "㺅", "new": "猴" }, { "old": "名", "new": "各" }
  ];
  const defaultAliases = [
    { "alias": "红色", "target": "红波" }, { "alias": "蓝色", "target": "蓝波" }, { "alias": "绿色", "target": "绿波" },
    { "alias": "兰波", "target": "蓝波" }, { "alias": "录波", "target": "绿波" }, { "alias": "金行", "target": "金" },
    { "alias": "木行", "target": "木" }, { "alias": "水行", "target": "水" }, { "alias": "火行", "target": "火" },
    { "alias": "土行", "target": "土" }, { "alias": "红蓝", "target": "红波-蓝波" }, { "alias": "红绿", "target": "红波-绿波" },
    { "alias": "蓝绿", "target": "蓝波-绿波" }, { "alias": "火土", "target": "火-土" }, { "alias": "红蓝波", "target": "红波-蓝波" },
    { "alias": "红绿波", "target": "红波-绿波" }, { "alias": "蓝绿波", "target": "蓝波-绿波" }, { "alias": "大单小双", "target": "大单-小双" },
    { "alias": "大双小单", "target": "大双-小单" }, { "alias": "金木水", "target": "金-木-水" }, { "alias": "家肖", "target": "家禽" },
    { "alias": "野肖", "target": "野兽" }, { "alias": "号各", "target": "各号" }, { "alias": "小数", "target": "小" },
    { "alias": "大数", "target": "大" }, { "alias": "合单", "target": "合数单" }, { "alias": "合双", "target": "合数双" },
    { "alias": "大尾", "target": "尾大" }, { "alias": "小尾", "target": "尾小" }, { "alias": "大数单", "target": "大单" },
    { "alias": "大数双", "target": "大双" }, { "alias": "小数单", "target": "小单" }, { "alias": "小数双", "target": "小双" },
    { "alias": "红波单", "target": "红单" }, { "alias": "红波双", "target": "红双" }, { "alias": "蓝波单", "target": "蓝单" },
    { "alias": "蓝波双", "target": "蓝双" }, { "alias": "绿波单", "target": "绿单" }, { "alias": "绿波双", "target": "绿双" },
    { "alias": "老虎", "target": "虎" }, { "alias": "老鼠", "target": "鼠" }, { "alias": "兔子", "target": "兔" },
    { "alias": "大号", "target": "大" }, { "alias": "小号", "target": "小" }
  ];
  localStorage.setItem('replacePresets', JSON.stringify(defaultPresets));
  localStorage.setItem('categoryAliases', JSON.stringify(defaultAliases));
  renderPresetList();
  showToast('已恢复默认替换预设和分类缩写');
}

// ===== 用户管理窗口 =====
function showUserManager() {
  if (document.getElementById('userManagerWin')) return;
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'userManagerWin';
  win.style.width = '450px'; win.style.height = '400px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>管理用户</h3><div class="window-controls"><button onclick="maximizeWindow('userManagerWin')">🗖</button><button onclick="document.getElementById('userManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newUserName" placeholder="用户名" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addUserAction()" style="padding:6px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="userList"></div></div><div class="modal-footer"><button onclick="document.getElementById('userManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win); renderUserList(); makeWindowDraggable('userManagerWin'); highestZ += 1; win.style.zIndex = highestZ;
  document.getElementById('newUserName').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addUserAction(); } });
}
function renderUserList() {
  const users = getUsers(); const container = document.getElementById('userList');
  if (!container) return;
  if (users.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无用户</div>'; return; }
  container.innerHTML = users.map(u => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:5px;border:1px solid #eee;border-radius:4px;"><span style="flex:1;">${u}</span><button onclick="deleteUserAction('${u}')" style="background:#e74c3c;color:#fff;border:none;padding:2px 8px;border-radius:3px;">删除</button></div>`).join('');
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

// ===== 卡密管理窗口（依赖 auth.js 中的卡密函数） =====
function showCardManager() {
  if (!isAdmin()) { showToast('需要管理员权限'); return; }
  if (document.getElementById('cardManagerWin')) return;
  const keys = getCardKeys();
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'cardManagerWin';
  win.style.width = '650px'; win.style.height = '500px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>🔑 卡密管理</h3><div class="window-controls"><button onclick="maximizeWindow('cardManagerWin')">🗖</button><button onclick="document.getElementById('cardManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><input type="number" id="expireDaysInput" placeholder="有效天数" value="30" min="1" style="padding:5px;border-radius:4px;border:1px solid #ccc;width:80px;"><span>天</span><button onclick="generateCardKey()" style="padding:6px 15px;background:#28a745;color:#fff;border:none;border-radius:4px;">生成卡密</button></div><div id="cardListContainer"></div></div><div class="modal-footer"><button onclick="document.getElementById('cardManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win); renderCardList(); makeWindowDraggable('cardManagerWin'); highestZ += 1; win.style.zIndex = highestZ;
}
function renderCardList() {
  const keys = getCardKeys(); const container = document.getElementById('cardListContainer');
  if (!container) return;
  if (keys.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无卡密</div>'; return; }
  container.innerHTML = keys.map((card, idx) => {
    const created = card.createTime ? new Date(card.createTime).toLocaleString('zh-CN') : '未知';
    const expired = card.expireDays ? `有效${card.expireDays}天` : '永久';
    const statusClass = { active: 'green', disabled: 'red', expired: 'gray' }[card.status] || 'gray';
    const statusText = card.status === 'active' ? '启用' : card.status === 'disabled' ? '禁用' : '过期';
    return `<div style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-weight:bold;font-size:16px;">${card.code}</span><span style="color:${statusClass};font-size:12px;">[${statusText}]</span><span style="font-size:11px;color:#666;">创建:${created} ${expired}</span><div style="margin-left:auto;display:flex;gap:5px;">${card.status==='active'?`<button onclick="disableCard(${idx})" style="background:#f39c12;color:#fff;border:none;padding:3px 8px;border-radius:3px;">禁用</button>`:''}${card.status==='disabled'?`<button onclick="enableCard(${idx})" style="background:#2ecc71;color:#fff;border:none;padding:3px 8px;border-radius:3px;">启用</button>`:''}<button onclick="deleteCard(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:3px 8px;border-radius:3px;">删除</button></div></div>`;
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

// ===== 快捷添加与分词（保留在 uiWindow 以便识别窗口使用） =====
function quickAddWithAmount(text, button) {
  const input = document.querySelector('.source-order-input');
  if (!input) return;
  const lines = input.value.trim().split('\n').filter(l => l.trim());
  const idx = lines.findIndex(l => l.includes(text) && (l.includes('各数') || l.includes('各号')));
  if (idx !== -1) { lines.splice(idx, 1); button.classList.remove('active'); }
  else { lines.push(`${text} 各数 `); button.classList.add('active'); }
  input.value = lines.join('\n');
  performRecognition(input.value);
  const lastIndex = input.value.lastIndexOf('各数');
  if (lastIndex !== -1) { const pos = lastIndex + 2; input.focus(); input.setSelectionRange(pos, pos); }
}

// ===== 全局更新下拉框 =====
function updateSelects() {
  const users = getUsers();
  const orderSel = document.getElementById('orderUserSelect');
  if (orderSel) {
    orderSel.innerHTML = '';
    users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; orderSel.appendChild(o); });
  }
  const comboUserSel = document.getElementById('comboUserSelect');
  if (comboUserSel) {
    comboUserSel.innerHTML = '';
    users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; comboUserSel.appendChild(o); });
  }
  const viewSel = document.getElementById('viewUserSelect');
  if (viewSel) {
    viewSel.innerHTML = '';
    users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; viewSel.appendChild(o); });
  }
}