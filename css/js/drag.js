// ===== 浮动窗口控制 =====
let highestZ = 2000;

function makeWindowDraggable(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  const header = win.querySelector('.modal-header') || win.querySelector('.database-modal-header');
  if (!header) return;

  let isDragging = false, startX, startY, startLeft, startTop;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-controls')) return;
    isDragging = true;
    const rect = win.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    win.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    win.style.left = (startLeft + dx) + 'px';
    win.style.top = (startTop + dy) + 'px';
    win.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      win.style.cursor = '';
    }
  });

  // 点击窗口置顶
  win.addEventListener('mousedown', () => {
    highestZ += 1;
    win.style.zIndex = highestZ;
  });
}

function maximizeWindow(winId) {
  const win = document.getElementById(winId);
  if (!win) return;

  if (win.style.width === '100vw' && win.style.height === '100vh') {
    win.style.width = '';
    win.style.height = '';
    win.style.left = '50%';
    win.style.top = '50%';
    win.style.transform = 'translate(-50%, -50%)';
  } else {
    win.style.width = '100vw';
    win.style.height = '100vh';
    win.style.left = '0';
    win.style.top = '0';
    win.style.transform = 'none';
  }
}

function pinWindow(winId) {
  const win = document.getElementById(winId);
  if (!win) return;
  highestZ += 1;
  win.style.zIndex = highestZ;
  showToast('窗口已置顶');
}
