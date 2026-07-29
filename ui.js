/* ===== ui.js - 纯 UI 基础组件（对话框、Toast、窗口拖拽/最大化、存储抽屉、截图） ===== */

// ===== 自定义对话框系统（覆盖原生 alert/confirm/prompt） =====
function showCustomDialog({ title = '提示', message = '', type = 'alert', defaultValue = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `<div class="custom-dialog-box"><div class="custom-dialog-title">${title}</div><div class="custom-dialog-message">${message}</div>${type === 'prompt' ? `<input class="custom-dialog-input" type="text" value="${defaultValue}" placeholder="${placeholder}" id="custom-dialog-input">` : ''}<div class="custom-dialog-buttons">${type === 'confirm' || type === 'prompt' ? '<button class="custom-dialog-btn cancel" id="custom-dialog-cancel">取消</button>' : ''}<button class="custom-dialog-btn confirm" id="custom-dialog-confirm">确定</button></div></div>`;
    document.body.appendChild(overlay);
    const confirmBtn = overlay.querySelector('#custom-dialog-confirm');
    const cancelBtn = overlay.querySelector('#custom-dialog-cancel');
    const inputEl = overlay.querySelector('#custom-dialog-input');
    const close = (result) => { document.body.removeChild(overlay); resolve(result); };
    confirmBtn.onclick = () => {
      if (type === 'prompt') close(inputEl.value);
      else if (type === 'confirm') close(true);
      else close(undefined);
    };
    if (cancelBtn) cancelBtn.onclick = () => {
      if (type === 'confirm') close(false);
      else if (type === 'prompt') close(null);
      else close(undefined);
    };
    if (inputEl) {
      inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirmBtn.click(); });
      inputEl.focus();
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { document.body.removeChild(toast); }, 300);
  }, 1500);
}

async function customAlert(message) { await showCustomDialog({ title: '提示', message, type: 'alert' }); }
async function customConfirm(message) { return await showCustomDialog({ title: '请确认', message, type: 'confirm' }); }
async function customPrompt(message, defaultValue = '') { return await showCustomDialog({ title: '请输入', message, type: 'prompt', defaultValue }); }

// 覆盖原生方法
window.alert = async (msg) => { await customAlert(msg); };
window.confirm = async (msg) => { return await customConfirm(msg); };
window.prompt = async (msg, def) => { return await customPrompt(msg, def); };

// ===== 浮动窗口拖拽与最大化 =====
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
    win.style.right = '';
    win.style.bottom = '';
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

// ===== 存储抽屉控制 =====
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

// ===== 截图函数 =====
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
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('卡片截图已复制'); } catch (e) { showToast('复制失败'); }
    }, 'image/png');
  } catch (e) { showToast('截图失败'); }
}