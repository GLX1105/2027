// ===== main.js - 系统入口，页面初始化、事件绑定、快捷键、定时器 =====

// ===== 全局变量 =====
let currentRegion = localStorage.getItem('currentRegion') || 'macau';

// ===== 地区切换 =====
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

// ===== 标记选择 =====
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

// ===== 粘贴订单 =====
async function pasteOrder() {
  try { const text = await navigator.clipboard.readText(); if (text) { const si = document.querySelector('.source-order-input'); if (si) { si.value = text; performRecognition(text); } } }
  catch(err) { showToast('无法访问剪贴板'); }
}

// ===== 清空全部输入 =====
function clearAllInput() {
  const si = document.querySelector('.source-order-input'); if (si) si.value = '';
  const re = document.getElementById('orderResult'); if (re) re.innerHTML = '';
  window._pureOrderLines = [];
  window._pureOrderRegions = [];
  updateOrderTotalDisplay();
  const md = document.getElementById('maxLossDisplay'); if (md) { md.textContent = ''; md.style.display = 'none'; }
  const box = document.getElementById('orderTotalAmountBox'); if (box) box.style.display = 'none';
  const lineCountSpan = document.getElementById('orderLineCount'); if (lineCountSpan) lineCountSpan.style.display = 'none';
}

// ===== 去分隔符 =====
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

// ===== 换分隔符 =====
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

// ===== 前缀管理 =====
function showPrefixManager() {
  if (document.getElementById('prefixWin')) return;
  const prefixes = getCustomPrefixes();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'prefixWin';
  w.style.width = '500px'; w.style.height = '400px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%,-50%)';
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
  const p = getCustomPrefixes(); if (p.includes(v)) { showToast('已存在'); return; }
  p.push(v); localStorage.setItem('customPrefixes', JSON.stringify(p));
  document.getElementById('newPrefix').value = ''; renderPrefixList();
}

async function deletePrefix(i) {
  if (!(await confirm('确定删除？'))) return;
  const p = getCustomPrefixes(); p.splice(i, 1);
  localStorage.setItem('customPrefixes', JSON.stringify(p)); renderPrefixList();
}

// ===== 金额前缀管理 =====
function showAmountPrefixManager() {
  if (document.getElementById('amountPrefixWin')) return;
  const list = getCustomAmountPrefixes();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'amountPrefixWin';
  w.style.width = '500px'; w.style.height = '450px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%,-50%)';
  w.innerHTML = `<div class="modal-header"><h3>金额前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountPrefixWin')">🗖</button><button onclick="document.getElementById('amountPrefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountPrefix" placeholder="新增金额前缀（如 投、买）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountPrefix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountPrefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountPrefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderAmountPrefixList(); makeWindowDraggable('amountPrefixWin'); highestZ += 1; w.style.zIndex = highestZ;
  document.getElementById('newAmountPrefix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addAmountPrefix(); } });
}

function renderAmountPrefixList() {
  const list = getCustomAmountPrefixes(); const container = document.getElementById('amountPrefixList');
  if (!container) return;
  container.innerHTML = list.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额前缀</div>' : list.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountPrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}

function saveCustomAmountPrefixes(list) { localStorage.setItem('customAmountPrefixes', JSON.stringify(list)); }

async function addAmountPrefix() {
  const v = document.getElementById('newAmountPrefix')?.value.trim();
  if (!v) { showToast('请输入金额前缀'); return; }
  const list = getCustomAmountPrefixes(); if (list.includes(v)) { showToast('已存在'); return; }
  list.push(v); saveCustomAmountPrefixes(list);
  document.getElementById('newAmountPrefix').value = ''; renderAmountPrefixList();
  showToast('已添加（即时生效）');
}

async function deleteAmountPrefix(i) {
  if (!(await confirm('确定删除？'))) return;
  const list = getCustomAmountPrefixes(); list.splice(i, 1);
  saveCustomAmountPrefixes(list); renderAmountPrefixList();
}

// ===== 金额后缀管理 =====
function showAmountSuffixManager() {
  if (document.getElementById('amountSuffixWin')) return;
  const s = getCustomAmountSuffixes();
  const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'amountSuffixWin';
  w.style.width = '500px'; w.style.height = '400px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%,-50%)';
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
  const s = getCustomAmountSuffixes(); if (s.includes(v)) { showToast('已存在'); return; }
  s.push(v); localStorage.setItem('customAmountSuffixes', JSON.stringify(s));
  document.getElementById('newAmountSuffix').value = ''; renderAmountSuffixList();
}

async function deleteAmountSuffix(i) {
  if (!(await confirm('确定删除？'))) return;
  const s = getCustomAmountSuffixes(); s.splice(i, 1);
  localStorage.setItem('customAmountSuffixes', JSON.stringify(s)); renderAmountSuffixList();
}

// ===== 替换预设管理 =====
async function resetPresetsToDefault() {
  if (!(await confirm('确定恢复替换预设和分类缩写为默认值吗？当前自定义数据将被覆盖。'))) return;
  const defaultPresets = [
    {"old":"兰","new":"蓝"},{"old":"录","new":"绿"},{"old":"碌","new":"绿"},{"old":"禄","new":"绿"},{"old":"拦","new":"蓝"},{"old":"篮","new":"蓝"},{"old":"免","new":"兔"},{"old":"午","new":"牛"},{"old":"侯","new":"猴"},{"old":"㺅","new":"猴"},{"old":"名","new":"各"}
  ];
  const defaultAliases = [
    {"alias":"红色","target":"红波"},{"alias":"蓝色","target":"蓝波"},{"alias":"绿色","target":"绿波"},{"alias":"兰波","target":"蓝波"},{"alias":"录波","target":"绿波"},{"alias":"金行","target":"金"},{"alias":"木行","target":"木"},{"alias":"水行","target":"水"},{"alias":"火行","target":"火"},{"alias":"土行","target":"土"},{"alias":"红蓝","target":"红波-蓝波"},{"alias":"红绿","target":"红波-绿波"},{"alias":"蓝绿","target":"蓝波-绿波"},{"alias":"火土","target":"火-土"},{"alias":"红蓝波","target":"红波-蓝波"},{"alias":"红绿波","target":"红波-绿波"},{"alias":"蓝绿波","target":"蓝波-绿波"},{"alias":"大单小双","target":"大单-小双"},{"alias":"大双小单","target":"大双-小单"},{"alias":"金木水","target":"金-木-水"},{"alias":"家肖","target":"家禽"},{"alias":"野肖","target":"野兽"},{"alias":"号各","target":"各号"},{"alias":"小数","target":"小"},{"alias":"大数","target":"大"},{"alias":"合单","target":"合数单"},{"alias":"合双","target":"合数双"},{"alias":"大尾","target":"尾大"},{"alias":"小尾","target":"尾小"},{"alias":"大数单","target":"大单"},{"alias":"大数双","target":"大双"},{"alias":"小数单","target":"小单"},{"alias":"小数双","target":"小双"},{"alias":"红波单","target":"红单"},{"alias":"红波双","target":"红双"},{"alias":"蓝波单","target":"蓝单"},{"alias":"蓝波双","target":"蓝双"},{"alias":"绿波单","target":"绿单"},{"alias":"绿波双","target":"绿双"},{"alias":"老虎","target":"虎"},{"alias":"老鼠","target":"鼠"},{"alias":"兔子","target":"兔"},{"alias":"大号","target":"大"},{"alias":"小号","target":"小"}
  ];
  localStorage.setItem('replacePresets', JSON.stringify(defaultPresets));
  localStorage.setItem('categoryAliases', JSON.stringify(defaultAliases));
  renderPresetList(); showToast('已恢复默认替换预设和分类缩写');
}

// ===== 保存订单 =====
async function saveOrder() {
  const user = document.getElementById('orderUserSelect')?.value;
  if (!user) { showToast('请选择用户'); return; }
  const pureLines = window._pureOrderLines;
  const pureRegions = window._pureOrderRegions || [];
  if (!pureLines || pureLines.length === 0) { showToast('订单无效'); return; }
  const date = document.getElementById('filterDate')?.value || getTodayCST();

  const regionGroups = {};
  pureLines.forEach((line, i) => {
    const region = pureRegions[i] || currentRegion;
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(line);
  });

  const regionLabels = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

  const existingOrders = (await getOrderRecords()).filter(r => r.date === date && r.user === user);
  let hasDuplicate = false;
  let duplicateRegions = [];

  for (const [region, lines] of Object.entries(regionGroups)) {
    const content = lines.join('\n');
    if (existingOrders.some(o => o.content === content && o.region === region)) {
      hasDuplicate = true; duplicateRegions.push(regionLabels[region] || region);
    }
  }

  if (hasDuplicate) {
    const confirmed = await confirm(`该用户今天已在${duplicateRegions.join('、')}保存过相同的订单，确定再次保存吗？`);
    if (!confirmed) { return; }
  }

  const pingtexiaoData = getPingtexiaoData();
  let ptChanged = false;
  pureLines.forEach(line => {
    const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
    if (match) {
      const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
      if (playType === '平特肖' || normalizePlayType(playType) === '平特肖') {
        const items = content.split('-').filter(i => i.trim());
        items.forEach(item => {
          const cleanItem = item.trim();
          if (/^[\u4e00-\u9fa5]$/.test(cleanItem) && ZODIAC_NUMS[cleanItem]) {
            if (!pingtexiaoData[cleanItem]) pingtexiaoData[cleanItem] = { amount: '', report: '' };
            pingtexiaoData[cleanItem].amount = ((parseFloat(pingtexiaoData[cleanItem].amount) || 0) + amt).toString();
            ptChanged = true;
          }
        });
      }
    }
  });
  if (ptChanged) { savePingtexiaoData(pingtexiaoData); }

  let savedCount = 0;
  for (const [region, lines] of Object.entries(regionGroups)) {
    const content = lines.join('\n');
    let totalAmount = 0;
    lines.forEach(line => {
      if (line.startsWith('特肖:')) {
        const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
        if (match) { totalAmount += match[1].split('-').filter(z => z.trim()).length * (parseInt(match[2]) || 0); }
      } else if (line.startsWith('包')) {
        const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
        if (match) { totalAmount += parseInt(match[3]) || 0; }
      } else if (line.startsWith('特碰:')) {
        const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
        if (match) {
          const cleaned = match[1].replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim());
          totalAmount += groups.length * (parseInt(match[2]) || 0);
        }
      } else if (line.startsWith('特码:')) {
        const { numbers, amount } = countItemsInLine(line);
        if (numbers.length > 0 && amount > 0) totalAmount += numbers.length * amount;
      } else {
        const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
        if (match) {
          const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
          if (playType === '平特肖' || playType === '平特尾' || playType === '平码') {
            const items = content.split('-').filter(i => i.trim()); totalAmount += items.length * amt;
          } else {
            const cleaned = content.replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim());
            totalAmount += groups.length * amt;
          }
        }
      }
    });
    await saveOrderRecordToIDB(content, user, date, totalAmount, null, region);
    addOperationLog('save_order', content, region, user, totalAmount);
    savedCount++;
  }

  const si = document.querySelector('.source-order-input'); if (si) si.value = '';
  const resultEl = document.getElementById('orderResult'); if (resultEl) resultEl.innerHTML = '';
  window._pureOrderLines = [];
  window._pureOrderRegions = [];
  updateOrderTotalDisplay();
  const md = document.getElementById('maxLossDisplay'); if (md) { md.textContent = ''; md.style.display = 'none'; }
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));

  await updateTableFromRecords();
  calculateStorageUsage(); showStorageDrawerTemporary(5000); renderSmartDecision(); updateSingleBetDisplay();
  updateOrderCountDisplay();
  renderPingtexiaoTable(); updatePingtexiaoTotal();
  showToast('已保存下单（' + savedCount + '个地区）');
}

// ===== 保存上报 =====
async function saveReportOrder() {
  const user = document.getElementById('orderUserSelect')?.value;
  if (!user) { showToast('请选择用户'); return; }
  const pureLines = window._pureOrderLines;
  const pureRegions = window._pureOrderRegions || [];
  if (!pureLines || pureLines.length === 0) { showToast('订单无效'); return; }
  const date = document.getElementById('filterDate')?.value || getTodayCST();

  const regionGroups = {};
  pureLines.forEach((line, i) => {
    const region = pureRegions[i] || currentRegion;
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(line);
  });

  const regionLabels = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

  const existingReports = (await getReportOrderRecords()).filter(r => r.date === date && r.user === user);
  let hasDuplicate = false;
  let duplicateRegions = [];

  for (const [region, lines] of Object.entries(regionGroups)) {
    const content = lines.join('\n');
    if (existingReports.some(o => o.content === content && o.region === region)) {
      hasDuplicate = true; duplicateRegions.push(regionLabels[region] || region);
    }
  }

  if (hasDuplicate) {
    const confirmed = await confirm(`该用户今天已在${duplicateRegions.join('、')}上报过相同的内容，确定再次上报吗？`);
    if (!confirmed) { return; }
  }

  const pingtexiaoData = getPingtexiaoData();
  let ptChanged = false;
  pureLines.forEach(line => {
    const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
    if (match) {
      const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
      if (playType === '平特肖' || normalizePlayType(playType) === '平特肖') {
        const items = content.split('-').filter(i => i.trim());
        items.forEach(item => {
          const cleanItem = item.trim();
          if (/^[\u4e00-\u9fa5]$/.test(cleanItem) && ZODIAC_NUMS[cleanItem]) {
            if (!pingtexiaoData[cleanItem]) pingtexiaoData[cleanItem] = { amount: '', report: '' };
            pingtexiaoData[cleanItem].report = ((parseFloat(pingtexiaoData[cleanItem].report) || 0) + amt).toString();
            ptChanged = true;
          }
        });
      }
    }
  });
  if (ptChanged) { savePingtexiaoData(pingtexiaoData); }

  let savedCount = 0;
  for (const [region, lines] of Object.entries(regionGroups)) {
    const content = lines.join('\n');
    let totalAmount = 0;
    lines.forEach(line => {
      if (line.startsWith('特肖:')) {
        const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
        if (match) { totalAmount += match[1].split('-').filter(z => z.trim()).length * (parseInt(match[2]) || 0); }
      } else if (line.startsWith('包')) {
        const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
        if (match) { totalAmount += parseInt(match[3]) || 0; }
      } else if (line.startsWith('特碰:')) {
        const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
        if (match) {
          const cleaned = match[1].replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim());
          totalAmount += groups.length * (parseInt(match[2]) || 0);
        }
      } else if (line.startsWith('特码:')) {
        const { numbers, amount } = countItemsInLine(line);
        if (numbers.length > 0 && amount > 0) totalAmount += numbers.length * amount;
      } else {
        const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
        if (match) {
          const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
          if (playType === '平特肖' || playType === '平特尾' || playType === '平码') {
            const items = content.split('-').filter(i => i.trim()); totalAmount += items.length * amt;
          } else {
            const cleaned = content.replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim());
            totalAmount += groups.length * amt;
          }
        }
      }
    });
    await saveReportOrderRecordToIDB(content, user, date, totalAmount, null, region);
    addOperationLog('save_report', content, region, user, totalAmount);
    savedCount++;
  }

  const si = document.querySelector('.source-order-input'); if (si) si.value = '';
  const resultEl = document.getElementById('orderResult'); if (resultEl) resultEl.innerHTML = '';
  window._pureOrderLines = [];
  window._pureOrderRegions = [];
  updateOrderTotalDisplay();
  const md = document.getElementById('maxLossDisplay'); if (md) { md.textContent = ''; md.style.display = 'none'; }
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));

  await updateTableFromRecords();
  calculateStorageUsage(); showStorageDrawerTemporary(5000); renderSmartDecision();
  renderPingtexiaoTable(); updatePingtexiaoTotal();
  showToast('已上报成功（' + savedCount + '个地区）');
  setTimeout(() => { const toast = document.querySelector('.toast-message.show'); if (toast) toast.style.color = '#ff0000'; }, 10);
}

// ===== 平特肖扣除函数 =====
function deductPingtexiaoFromContent(content) {
  const pingtexiaoData = getPingtexiaoData();
  let changed = false;
  const lines = content.split('\n');
  lines.forEach(line => {
    const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
    if (!match) return;
    const playType = normalizePlayType(match[1]);
    if (playType !== '平特肖') return;
    const combosStr = match[2];
    const amt = parseInt(match[3]) || 0;
    const cleaned = combosStr.replace(/[()]/g, '');
    const items = cleaned.split('-').filter(i => i.trim());
    items.forEach(item => {
      if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
        if (pingtexiaoData[item]) {
          const oldAmount = parseFloat(pingtexiaoData[item].amount) || 0;
          const newAmount = Math.max(0, oldAmount - amt);
          pingtexiaoData[item].amount = newAmount.toString();
          changed = true;
        }
      }
    });
  });
  if (changed) { savePingtexiaoData(pingtexiaoData); renderPingtexiaoTable(); updatePingtexiaoTotal(); }
}

function deductPingtexiaoFromReportContent(content) {
  const pingtexiaoData = getPingtexiaoData();
  let changed = false;
  const lines = content.split('\n');
  lines.forEach(line => {
    const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
    if (!match) return;
    const playType = normalizePlayType(match[1]);
    if (playType !== '平特肖') return;
    const combosStr = match[2];
    const amt = parseInt(match[3]) || 0;
    const cleaned = combosStr.replace(/[()]/g, '');
    const items = cleaned.split('-').filter(i => i.trim());
    items.forEach(item => {
      if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
        if (pingtexiaoData[item]) {
          const oldReport = parseFloat(pingtexiaoData[item].report) || 0;
          const newReport = Math.max(0, oldReport - amt);
          pingtexiaoData[item].report = newReport.toString();
          changed = true;
        }
      }
    });
  });
  if (changed) { savePingtexiaoData(pingtexiaoData); renderPingtexiaoTable(); updatePingtexiaoTotal(); }
}

// ===== 平特肖填充 =====
function fillPingtexiao() {
  const resultEl = document.getElementById('orderResult');
  if (!resultEl) { showToast('识别结果为空'); return; }
  const text = resultEl.innerText.trim();
  if (!text) { showToast('识别结果为空'); return; }
  const lines = text.split('\n');
  const zodiacAmounts = {};
  lines.forEach(line => {
    const { zodiacs, amount } = countItemsInLine(line);
    if (zodiacs.length > 0 && amount > 0) { zodiacs.forEach(z => { zodiacAmounts[z] = (zodiacAmounts[z] || 0) + amount; }); }
  });
  const matchedZodiacs = Object.keys(zodiacAmounts);
  if (matchedZodiacs.length === 0) { showToast('未找到生肖数据'); return; }
  const data = getPingtexiaoData();
  matchedZodiacs.forEach(z => {
    if (!data[z]) data[z] = { amount: '', report: '' };
    const oldAmount = parseFloat(data[z].amount) || 0;
    data[z].amount = (oldAmount + zodiacAmounts[z]).toString();
  });
  savePingtexiaoData(data); renderPingtexiaoTable(); updatePingtexiaoTotal();
  const si = document.querySelector('.source-order-input'); if (si) si.value = '';
  if (resultEl) resultEl.innerHTML = '';
  updateOrderTotalDisplay();
  showToast(`已填充 ${matchedZodiacs.length} 个生肖到平特肖`);
}

// ===== 计算存储使用量 =====
async function calculateStorageUsage() {
  const records = await getOrderRecords(); const reportRecords = await getReportOrderRecords(); const comboRecords = await getComboOrders();
  const orderCount = records.length + reportRecords.length + comboRecords.length;
  let usedBytes = 0;
  records.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  reportRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  comboRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
  const maxStorage = 50 * 1024 * 1024;
  const freeMB = ((maxStorage - usedBytes) / (1024 * 1024)).toFixed(2);
  document.getElementById('orderCount').textContent = orderCount;
  document.getElementById('usedSpace').textContent = `${usedMB} MB`;
  document.getElementById('freeSpace').textContent = `${freeMB} MB`;
  const filterDate = document.getElementById('filterDate')?.value || getTodayCST();
  const todayRecords = records.filter(r => r.date === filterDate);
  document.getElementById('todayOrderCount').textContent = todayRecords.length;
  updateLogCount();
}

// ===== 用户管理 =====
function getUsers() { const key = `users_${currentRegion}`; return JSON.parse(localStorage.getItem(key) || '[]'); }
function saveUsers(users) { const key = `users_${currentRegion}`; localStorage.setItem(key, JSON.stringify(users)); }
function addUser(name) { const users = getUsers(); if (users.includes(name)) { showToast('用户已存在'); return false; } users.push(name); saveUsers(users); return true; }
async function deleteUser(name) { let users = getUsers(); users = users.filter(u => u !== name); saveUsers(users); if (userBetData[name]) delete userBetData[name]; rebuildTotal(); refreshAll(); }
function rebuildTotal() { tableBetData = {}; for (const u in userBetData) for (const n in userBetData[u]) tableBetData[n] = (tableBetData[n] || 0) + userBetData[u][n]; }
function refreshAll() { updateSelects(); updateTableFromRecords(); }
function updateSelects() {
  const users = getUsers();
  const orderSel = document.getElementById('orderUserSelect'); if (orderSel) { orderSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; orderSel.appendChild(o); }); }
  const comboUserSel = document.getElementById('comboUserSelect'); if (comboUserSel) { comboUserSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; comboUserSel.appendChild(o); }); }
  const viewSel = document.getElementById('viewUserSelect'); if (viewSel) { viewSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; viewSel.appendChild(o); }); }
}

// ===== 表格行拖拽选择 =====
window.dragSelectionActive = false;
function enableRowDragSelect(tableId) {
  const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody');
  if (!tbody) return;
  let startRow = null; let endRow = null;
  function clearSelection() { tbody.querySelectorAll('tr.selected-row').forEach(tr => tr.classList.remove('selected-row')); }
  function selectRows(row1, row2) {
    if (!row1 || !row2) return; const rows = Array.from(tbody.querySelectorAll('tr'));
    const idx1 = rows.indexOf(row1); const idx2 = rows.indexOf(row2);
    if (idx1 === -1 || idx2 === -1) return;
    const minIdx = Math.min(idx1, idx2); const maxIdx = Math.max(idx1, idx2);
    for (let i = minIdx; i <= maxIdx; i++) { rows[i].classList.add('selected-row'); }
  }
  tbody.addEventListener('mousedown', (e) => { if (e.button !== 0) return; if (e.ctrlKey || e.shiftKey) return; const targetRow = e.target.closest('tr'); if (!targetRow) return; window.dragSelectionActive = true; clearSelection(); startRow = targetRow; endRow = targetRow; targetRow.classList.add('selected-row'); e.preventDefault(); });
  document.addEventListener('mousemove', (e) => { if (!window.dragSelectionActive) return; const target = document.elementFromPoint(e.clientX, e.clientY); if (!target) return; const tr = target.closest('tr'); if (!tr || tr.parentElement !== tbody) return; if (tr !== endRow) { endRow = tr; clearSelection(); selectRows(startRow, endRow); } });
  document.addEventListener('mouseup', () => { if (window.dragSelectionActive) { window.dragSelectionActive = false; startRow = null; endRow = null; } });
  let longPressTimer = null; let longPressTriggered = false; let touchStartY = 0; let touchStartX = 0;
  tbody.addEventListener('touchstart', (e) => { const targetRow = e.target.closest('tr'); if (!targetRow) return; longPressTriggered = false; touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; if (longPressTimer) clearTimeout(longPressTimer); longPressTimer = setTimeout(() => { longPressTriggered = true; window.dragSelectionActive = true; clearSelection(); startRow = targetRow; endRow = targetRow; targetRow.classList.add('selected-row'); }, 1000); }, { passive: true });
  tbody.addEventListener('touchmove', (e) => { if (!longPressTriggered) { const dy = Math.abs(e.touches[0].clientY - touchStartY); const dx = Math.abs(e.touches[0].clientX - touchStartX); if (dy > 10 || dx > 10) { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } } return; } if (!window.dragSelectionActive) return; e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (!target) return; const tr = target.closest('tr'); if (!tr || tr.parentElement !== tbody) return; if (tr !== endRow) { endRow = tr; clearSelection(); selectRows(startRow, endRow); } }, { passive: false });
  tbody.addEventListener('touchend', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } if (window.dragSelectionActive) { window.dragSelectionActive = false; startRow = null; endRow = null; } longPressTriggered = false; });
}

function copySelectedNumbers(tableId) {
  const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody');
  if (!tbody) return;
  const selectedRows = Array.from(tbody.querySelectorAll('tr.selected-row'));
  if (selectedRows.length === 0) { showToast('请先选择号码'); return; }
  const ids = selectedRows.map(row => { const cells = row.querySelectorAll('td'); return cells[3] ? cells[3].textContent.trim() : ''; }).filter(id => id && /^\d+$/.test(id));
  if (ids.length === 0) { showToast('无有效号码'); return; }
  const uniqueIds = [...new Set(ids)];
  const text = uniqueIds.join('-') + '各号';
  navigator.clipboard.writeText(text).then(() => { showToast('已复制: ' + text); }).catch(() => { showToast('复制失败'); });
}

// ===== 重置/清空 =====
let resetLock = false;
let resetLongPressTimer = null;

async function resetTable() {
  if (resetLock) return; resetLock = true;
  try {
    const regionName = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港';
    const confirmed = await confirm(`确定清空当前地区（${regionName}）的所有订单和上报数据吗？此操作不可恢复。`);
    if (!confirmed) { resetLock = false; return; }
    const pwd = await prompt("输入清空密码：", ""); if (pwd !== PASSWORD) { await alert("密码错误"); resetLock = false; return; }
    clearMemoryData();
    await clearAllOrderRecordsFromIDB(currentRegion); await clearAllReportOrderRecordsFromIDB(currentRegion); await clearAllComboOrderRecordsFromIDB(currentRegion);
    for (let i = localStorage.length - 1; i >= 0; i--) { const key = localStorage.key(i); if (key && key.startsWith(`pingtexiao_${currentRegion}_`)) localStorage.removeItem(key); if (key && key.startsWith(`ptHighlight_${currentRegion}_`)) localStorage.removeItem(key); }
    renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); renderPingtexiaoTable();
    addOperationLog('reset', `清空${regionName}所有订单和上报记录`); showToast(`已清空${regionName}的所有订单和上报记录`);
  } catch(e) {} finally { resetLock = false; }
}

// ===== 导出导入 =====
async function exportData() {
  try {
    const orders = await getAllOrdersUnfiltered(); const reports = await getAllReportsUnfiltered(); const logs = await getAllLogs(); const recycleRecords = await getRecycleBinRecords(); const comboRecords = await getComboOrders();
    const drawRecords = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('drawRecord_')) { drawRecords[key] = localStorage.getItem(key); } }
    const comboDrawRecords = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('comboDrawRecord_')) { comboDrawRecords[key] = localStorage.getItem(key); } }
    const pingtexiao = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('pingtexiao_')) { pingtexiao[key] = localStorage.getItem(key); } }
    const pingtexiaoHighlights = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('ptHighlight_')) { pingtexiaoHighlights[key] = localStorage.getItem(key); } }
    const users = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('users_')) { users[key] = localStorage.getItem(key); } }
    const presets = localStorage.getItem('replacePresets') || '[]'; const aliases = localStorage.getItem('categoryAliases') || '[]'; const oddsData = localStorage.getItem('comboOddsData') || '{}';
    const data = { version: 7, orders, reports, logs, recycleRecords, comboRecords, drawRecords, comboDrawRecords, pingtexiao, pingtexiaoHighlights, users, replacePresets: JSON.parse(presets), categoryAliases: JSON.parse(aliases), oddsData: JSON.parse(oddsData), exportTime: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const fileName = `港澳识别数据_全部_${getTodayCST()}.json`;
    const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    addOperationLog('export', '导出全部数据（含日志/回收站/用户/配置/连肖）'); showToast('导出成功：' + fileName); showStorageDrawerTemporary(5000);
  } catch(e) { showToast('导出失败'); }
}

async function importData() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.style.display = 'none'; document.body.appendChild(inp);
  inp.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) { document.body.removeChild(inp); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.orders || !data.reports) { showToast('无效格式'); document.body.removeChild(inp); return; }
        if (!data.version || data.version < 7) { const cf = await confirm(`备份文件版本（${data.version || '未知'}）低于当前版本（7），导入可能导致数据异常，是否继续？`); if (!cf) { document.body.removeChild(inp); return; } }
        const recycleCount = data.recycleRecords ? data.recycleRecords.length : 0; const comboCount = data.comboRecords ? data.comboRecords.length : 0; const userCount = data.users ? Object.keys(data.users).length : 0;
        const pingtexiaoCount = data.pingtexiao ? Object.keys(data.pingtexiao).length : 0; const highlightCount = data.pingtexiaoHighlights ? Object.keys(data.pingtexiaoHighlights).length : 0;
        const totalToImport = data.orders.length + data.reports.length + (data.drawRecords ? Object.keys(data.drawRecords).length : 0) + (data.comboDrawRecords ? Object.keys(data.comboDrawRecords).length : 0) + pingtexiaoCount + highlightCount + recycleCount + comboCount + userCount + (data.replacePresets ? data.replacePresets.length : 0) + (data.categoryAliases ? data.categoryAliases.length : 0);
        if (totalToImport === 0) { showToast('文件中没有数据'); document.body.removeChild(inp); return; }
        let confirmMsg = `文件包含 ${data.orders.length} 条订单，${data.reports.length} 条上报，${data.logs ? data.logs.length : 0} 条日志，${recycleCount} 条回收站记录，${comboCount} 条连肖订单，${userCount} 组用户数据。是否导入？`;
        const cf = await confirm(confirmMsg); if (!cf) { document.body.removeChild(inp); return; }
        const eo = await getAllOrdersUnfiltered(); const er = await getAllReportsUnfiltered(); const eco = await getComboOrders();
        let so = 0, no = 0;
        for (const r of data.orders) { const region = r.region || currentRegion; const dup = eo.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if (dup) { so++; continue; } try { await saveOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.timestamp, region); no++; } catch(e) { console.error('导入订单失败', e); } }
        let sr = 0, nr = 0;
        for (const r of data.reports) { const region = r.region || currentRegion; const dup = er.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if (dup) { sr++; continue; } try { await saveReportOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.timestamp, region); nr++; } catch(e) { console.error('导入上报失败', e); } }
        let sco = 0, nco = 0;
        if (data.comboRecords && Array.isArray(data.comboRecords)) { for (const r of data.comboRecords) { const region = r.region || currentRegion; const dup = eco.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if (dup) { sco++; continue; } try { await saveComboOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.comboType || '', r.timestamp); nco++; } catch(e) { console.error('导入连肖订单失败', e); } } }
        if (data.logs && Array.isArray(data.logs)) { const existingLogs = await getAllLogs(); const existingIds = new Set(existingLogs.map(l => l.id)); for (const log of data.logs) { if (!existingIds.has(log.id)) { await new Promise((resolve) => { const tx = db.transaction([LOG_STORE_NAME], 'readwrite'); const store = tx.objectStore(LOG_STORE_NAME); store.add(log); tx.oncomplete = () => resolve(); }); } } }
        if (data.recycleRecords && Array.isArray(data.recycleRecords)) { const existingRecycle = await getRecycleBinRecords(); const existingRecycleIds = new Set(existingRecycle.map(r => r.id)); for (const rec of data.recycleRecords) { if (!existingRecycleIds.has(rec.id)) { await new Promise((resolve) => { const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); store.add(rec); tx.oncomplete = () => resolve(); }); } } }
        if (data.users) { for (const [key, value] of Object.entries(data.users)) { if (!localStorage.getItem(key)) { localStorage.setItem(key, value); } } }
        let dcImported = 0;
        if (data.drawRecords) { for (const [key, value] of Object.entries(data.drawRecords)) { const existing = localStorage.getItem(key); if (existing) { try { const existingData = JSON.parse(existing); const newData = JSON.parse(value); let changed = false; for (const [issue, entry] of Object.entries(newData)) { if (existingData[issue] && existingData[issue].number && existingData[issue].number.trim()) { if (entry.pl !== undefined && entry.pl !== '') { existingData[issue].pl = entry.pl; changed = true; } } else { existingData[issue] = entry; changed = true; } } if (changed) { localStorage.setItem(key, JSON.stringify(existingData)); dcImported++; } } catch(e) { localStorage.setItem(key, value); dcImported++; } } else { localStorage.setItem(key, value); dcImported++; } } }
        let comboDrawImported = 0;
        if (data.comboDrawRecords) { for (const [key, value] of Object.entries(data.comboDrawRecords)) { if (!localStorage.getItem(key)) { localStorage.setItem(key, value); comboDrawImported++; } } }
        let ptImported = 0, ptSkipped = 0;
        if (data.pingtexiao) { for (const [key, value] of Object.entries(data.pingtexiao)) { if (localStorage.getItem(key)) { ptSkipped++; } else { localStorage.setItem(key, value); ptImported++; } } }
        let hlImported = 0;
        if (data.pingtexiaoHighlights) { for (const [key, value] of Object.entries(data.pingtexiaoHighlights)) { localStorage.setItem(key, value); hlImported++; } }
        if (data.oddsData) { if (!localStorage.getItem('comboOddsData')) { localStorage.setItem('comboOddsData', JSON.stringify(data.oddsData)); } }
        let presetImported = 0, aliasImported = 0;
        if (data.replacePresets && Array.isArray(data.replacePresets)) { const currentPresets = getReplacePresets(); data.replacePresets.forEach(p => { if (!currentPresets.some(x => x.old === p.old)) { currentPresets.push(p); presetImported++; } }); localStorage.setItem('replacePresets', JSON.stringify(currentPresets)); }
        if (data.categoryAliases && Array.isArray(data.categoryAliases)) { const currentAliases = getCategoryAliases(); data.categoryAliases.forEach(a => { if (!currentAliases.some(x => x.alias === a.alias)) { currentAliases.push(a); aliasImported++; } }); localStorage.setItem('categoryAliases', JSON.stringify(currentAliases)); }
        await updateTableFromRecords(); calculateStorageUsage(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision();
        addOperationLog('import', `导入${no + nr + nco}条订单/上报/连肖记录`);
        let msg = `成功导入 ${no + nr + nco} 条记录，${dcImported} 组开奖记录，${comboDrawImported} 组录开奖记录，${recycleCount} 条回收站记录，${comboCount} 条连肖订单，${userCount} 组用户数据。`;
        if (ptImported > 0) msg += `\n导入平特肖数据 ${ptImported} 组。`; if (ptSkipped > 0) msg += `\n跳过平特肖数据 ${ptSkipped} 组（已存在）。`; if (hlImported > 0) msg += `\n导入平特肖高亮标记 ${hlImported} 组。`; if (presetImported > 0) msg += `\n新增 ${presetImported} 条替换预设。`; if (aliasImported > 0) msg += `\n新增 ${aliasImported} 条分类缩写。`; if (so + sr + sco > 0) msg += `\n跳过 ${so + sr + sco} 条重复记录。`;
        showToast(msg); document.body.removeChild(inp); showStorageDrawerTemporary(5000);
      } catch(err) { showToast('导入失败'); document.body.removeChild(inp); }
    };
    reader.onerror = () => { showToast('读取失败'); document.body.removeChild(inp); };
    reader.readAsText(file);
  };
  inp.addEventListener('cancel', () => { document.body.removeChild(inp); });
  inp.click();
}

// ===== 开奖记录窗口 =====
async function showDrawRecord() {
  const old = document.getElementById('drawRecordWin'); if (old) old.remove();
  let year = new Date().getFullYear(); const fd = document.getElementById('filterDate')?.value; if (fd) { const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); }
  const startDate = new Date(year, 0, 1); const endDate = new Date(year, 11, 31);
  if (isNaN(startDate) || isNaN(endDate)) { showToast('日期无效'); return; }
  const rows = []; let issue = 1; const cur = new Date(startDate);
  while (cur <= endDate) {
    rows.push({ date: formatDateMD(cur.toISOString().slice(0, 10)), issue: issue.toString().padStart(2, '0'), fullDate: cur.toISOString().slice(0, 10) });
    cur.setDate(cur.getDate() + 1); issue++;
  }
  const totalIssues = issue - 1; const groups = Math.ceil(totalIssues / 100);
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const monthlyPL = new Array(12).fill(0);
  for (const iid in savedData) {
    const entry = savedData[iid];
    if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') {
      const num = entry.number.trim().padStart(2, '0');
      if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) {
        const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum);
        const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl);
        if (!isNaN(plVal)) monthlyPL[month] += plVal;
      }
    }
  }
  let totalPLSum = 0; for (let m = 0; m < 12; m++) totalPLSum += monthlyPL[m];
  let monthlyInnerHtml = '<table class="monthly-summary-table" style="width:100%;margin:0;border:none;"><tbody>';
  for (let m = 0; m < 12; m++) {
    const val = monthlyPL[m]; let valText = '';
    if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`;
    monthlyInnerHtml += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m + 1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`;
  }
  let totalText = '';
  if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`;
  monthlyInnerHtml += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`;
  monthlyInnerHtml += '</tbody></table>';
  let tableHtml = '<div class="draw-table-wrap"><table class="draw-table"><thead><tr>';
  for (let g = 0; g < groups; g++) { tableHtml += '<th>期号</th><th>号码</th><th>生肖</th><th>盈亏</th>'; }
  tableHtml += '</tr></thead><tbody>';
  const monthlyRowsNeeded = 13; const startRow = 87;
  for (let r = 0; r < 100; r++) {
    tableHtml += '<tr>';
    for (let g = 0; g < groups; g++) {
      const idx = g * 100 + r;
      if (g === 3 && r >= startRow && r < startRow + monthlyRowsNeeded) {
        if (r === startRow) { tableHtml += `<td colspan="4" rowspan="${monthlyRowsNeeded}" style="vertical-align:top;padding:2px;">${monthlyInnerHtml}</td>`; }
      } else if (g === 3 && r >= startRow + monthlyRowsNeeded) {
        tableHtml += '<td></td><td></td><td></td><td></td>';
      } else if (idx < rows.length) {
        const row = rows[idx]; const iid = row.issue; const savedEntry = savedData[iid] || {};
        const savedNumber = savedEntry.number || ''; const savedPL = savedEntry.pl || '';
        const isReadOnly = !!savedNumber;
        tableHtml += `<td>${iid}期</td>`;
        const numVal = savedNumber ? savedNumber.padStart(2, '0') : '';
        const numColorClass = savedNumber ? getNumberColorClass(numVal) : '';
        const inputDisabled = isReadOnly ? 'disabled' : '';
        tableHtml += `<td><input type="text" class="draw-number-input draw-num-${iid} ${numColorClass}" value="${savedNumber}" ${inputDisabled} oninput="onDrawNumberInput(this, '${iid}')" maxlength="2"></td>`;
        const zodiac = savedNumber ? (currentZodiacMap[numVal] || '') : '';
        const zColorClass = getZodiacColorClass(zodiac);
        tableHtml += `<td><span class="draw-zodiac-${iid} ${zColorClass}">${zodiac}</span></td>`;
        let plColorClass = '';
        if (savedPL !== '') { const plVal = parseFloat(savedPL); if (!isNaN(plVal)) { if (plVal > 0) plColorClass = ' green-text'; else if (plVal < 0) plColorClass = ' red-text'; } }
        tableHtml += `<td><input type="text" class="draw-pl-input draw-pl-${iid}${plColorClass}" value="${savedPL}" ${inputDisabled} oninput="updatePlColor(this)" maxlength="7"></td>`;
      } else { tableHtml += '<td></td><td></td><td></td><td></td>'; }
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody></table></div>';
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'drawRecordWin';
  win.style.width = Math.min(groups * 170 + 40, window.innerWidth - 20) + 'px'; win.style.height = '650px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  const savedCount = localStorage.getItem(`recentDrawCount_${currentRegion}`) || '';
  const regionLabel = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港';
  win.innerHTML = `<div class="modal-header"><h3>开奖记录（${regionLabel} ${year}年阳历）</h3><div class="window-controls"><button onclick="maximizeWindow('drawRecordWin')">🗖</button><button onclick="document.getElementById('drawRecordWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; gap:10px;"><div class="card" style="flex:1; display:flex; flex-direction:column;"><div class="card-title" style="display:flex; align-items:center; gap:8px;"><span>开奖号码记录</span><input type="number" id="recentDrawCountInput" placeholder="留空不显示" value="${savedCount}" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;font-size:13px;"><button class="btn btn-primary" onclick="saveRecentDrawCount()" style="padding:4px 12px;font-size:12px;min-height:28px;">保存</button></div><div style="overflow:auto; flex:1;">${tableHtml}</div></div><div style="display:flex; gap:10px; justify-content:center; padding:10px;"><button class="btn btn-primary" onclick="editDrawRecord()">修改</button><button class="btn btn-save-order" onclick="saveDrawRecord(${year})">保存</button><button class="btn btn-danger" onclick="clearAllDrawRecords(${year})" style="background:#e74c3c;color:#fff;">清空全部</button></div></div>`;
  document.body.appendChild(win);
  makeWindowDraggable('drawRecordWin'); highestZ += 1; win.style.zIndex = highestZ;
  updateRecentDrawTexts();
  setTimeout(() => {
    const allNumInputs = win.querySelectorAll('.draw-number-input'); const allPlInputs = win.querySelectorAll('.draw-pl-input');
    const allInputs = [...allNumInputs, ...allPlInputs].sort((a, b) => {
      const trA = a.closest('tr'); const trB = b.closest('tr'); const rows = [...win.querySelectorAll('.draw-table tbody tr')];
      if (trA !== trB) return rows.indexOf(trA) - rows.indexOf(trB);
      const tdsA = [...trA.querySelectorAll('td')]; const tdsB = [...trB.querySelectorAll('td')];
      const tdA = a.closest('td'); const tdB = b.closest('td'); return tdsA.indexOf(tdA) - tdsB.indexOf(tdB);
    });
    const enabledInputs = allInputs.filter(inp => !inp.disabled);
    enabledInputs.forEach((inp, i) => { inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); const nextIdx = i + 1; if (nextIdx < enabledInputs.length) { const next = enabledInputs[nextIdx]; next.focus(); next.select(); } } }); });
  }, 200);
}

function updatePlColor(input) { const match = input.className.match(/draw-pl-(\d+)/); const issueClass = match ? match[0] : ''; const val = input.value.trim(); let colorClass = ''; if (val !== '' && val !== '-') { const num = parseFloat(val); if (!isNaN(num)) { if (num > 0) colorClass = ' green-text'; else if (num < 0) colorClass = ' red-text'; } } input.className = 'draw-pl-input' + (issueClass ? ' ' + issueClass : '') + colorClass; }

async function clearAllDrawRecords(year) { if (!(await confirm(`确定清空${currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港'} ${year}年全部开奖号码吗？此操作不可恢复！`))) return; const storageKey = `drawRecord_${currentRegion}_${year}`; localStorage.removeItem(storageKey); showToast('已清空'); showDrawRecord(); updateRecentDrawTexts(); renderSmartDecision(); }

function onDrawNumberInput(input, issueId) { let val = input.value.replace(/\D/g, ''); if (val.length > 2) val = val.slice(0, 2); input.value = val; const zodiacSpan = document.querySelector(`.draw-zodiac-${issueId}`); if (!zodiacSpan) return; if (val.length === 2) { const num = val.padStart(2, '0'); const intVal = parseInt(num); if (intVal >= 1 && intVal <= 49) { const zodiac = currentZodiacMap[num] || ''; zodiacSpan.textContent = zodiac; zodiacSpan.className = `draw-zodiac-${issueId} ${getZodiacColorClass(zodiac)}`; input.className = `draw-number-input draw-num-${issueId} ${getNumberColorClass(num)}`; return; } } zodiacSpan.textContent = ''; zodiacSpan.className = `draw-zodiac-${issueId}`; input.className = `draw-number-input draw-num-${issueId}`; }

function editDrawRecord() { document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = false); document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = false); showToast('已进入编辑模式'); }

async function saveDrawRecord(year) {
  const data = {}; const plInputs = document.querySelectorAll('.draw-pl-input');
  plInputs.forEach(input => { const issueId = input.className.match(/draw-pl-(\d+)/)?.[1]; if (issueId) { data[issueId] = { number: '', pl: input.value.trim() }; } });
  const numberInputs = document.querySelectorAll('.draw-number-input');
  numberInputs.forEach(input => { const issueId = input.className.match(/draw-num-(\d+)/)?.[1]; if (issueId) { let num = input.value.trim(); if (/^\d$/.test(num)) num = '0' + num; if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) num = ''; if (!data[issueId]) data[issueId] = { number: num, pl: '' }; else data[issueId].number = num; } });
  const storageKey = `drawRecord_${currentRegion}_${year}`; localStorage.setItem(storageKey, JSON.stringify(data));
  document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = true); document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = true);
  const monthlyPL = new Array(12).fill(0);
  for (const iid in data) { const entry = data[iid]; if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum); const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl); if (!isNaN(plVal)) monthlyPL[month] += plVal; } } }
  const summaryTable = document.querySelector('.monthly-summary-table');
  if (summaryTable) {
    let html = '<tbody>'; let totalPLSum = 0;
    for (let m = 0; m < 12; m++) { const val = monthlyPL[m]; totalPLSum += val; let valText = ''; if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`; html += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m + 1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`; }
    let totalText = ''; if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`;
    html += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`; html += '</tbody>'; summaryTable.innerHTML = html;
  }
  updateRecentDrawTexts(); renderSmartDecision(); showToast('保存成功');
}

function saveRecentDrawCount() { const input = document.getElementById('recentDrawCountInput'); if (!input) return; const rawVal = input.value.trim(); if (rawVal === '') { localStorage.removeItem(`recentDrawCount_${currentRegion}`); updateRecentDrawTexts(); renderSmartDecision(); showToast('已清空期数设置'); return; } const val = parseInt(rawVal); if (isNaN(val) || val < 1) { showToast('请输入有效的期数'); return; } localStorage.setItem(`recentDrawCount_${currentRegion}`, val.toString()); updateRecentDrawTexts(); renderSmartDecision(); showToast(`已设置显示最近${val}期`); }

function updateRecentDrawTexts() { updateRecentDrawNumbers(); updateRecentZodiacStats(); updateFilterDateDrawInfo(); }

function updateRecentDrawNumbers() {
  const container = document.getElementById('recentDrawNumbers'); if (!container) return;
  const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; }
  const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; }
  const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const entries = [];
  for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; entries.push({ num, zodiac }); } } }
  if (entries.length === 0) { container.style.display = 'none'; return; }
  let html = ''; entries.forEach((entry, idx) => { if (idx > 0) html += '、'; html += `<span class="num ${getNumberColorClass(entry.num)}">${entry.num}</span>`; html += `<span class="slash">/</span>`; html += `<span class="${getZodiacColorClass(entry.zodiac)}">${entry.zodiac}</span>`; });
  container.innerHTML = html; container.style.display = '';
}

function updateRecentZodiacStats() {
  const container = document.getElementById('recentZodiacStats'); if (!container) return;
  const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; }
  const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; }
  const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const zodiacList = [];
  for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; if (zodiac) zodiacList.push(zodiac); } } }
  if (zodiacList.length === 0) { container.style.display = 'none'; return; }
  const freq = {}; zodiacList.forEach(z => { freq[z] = (freq[z] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const repeated = []; const single = [];
  sorted.forEach(([zodiac, cnt]) => { if (cnt > 1) { repeated.push({ zodiac, cnt }); } else { single.push(zodiac); } });
  let html = ''; repeated.forEach(item => { html += `<div>${item.cnt}次：<span class="${getZodiacColorClass(item.zodiac)}">${item.zodiac}</span></div>`; });
  if (single.length > 0) { const singleSpans = single.map(z => `<span class="${getZodiacColorClass(z)}">${z}</span>`).join('、'); html += `<div>${singleSpans}</div>`; }
  container.innerHTML = html; container.style.display = '';
}

function updateFilterDateDrawInfo() {
  const span = document.getElementById('filterDateDrawInfo'); if (!span) return;
  const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const issueNumber = getCurrentIssueNumber(year, fd); if (!issueNumber) { span.style.display = 'none'; return; }
  const issueId = issueNumber.toString().padStart(2, '0'); const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const entry = savedData[issueId]; if (!entry || !entry.number || !entry.number.trim()) { span.style.display = 'none'; return; }
  const num = entry.number.trim().padStart(2, '0'); if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) { span.style.display = 'none'; return; }
  const zodiac = currentZodiacMap[num] || '';
  span.innerHTML = `<span class="num ${getNumberColorClass(num)}">${num}</span><span class="slash" style="color:#000;">/</span><span class="${getZodiacColorClass(zodiac)}">${zodiac}</span>`; span.style.display = '';
}

// ===== 平特肖相关 =====
function getPingtexiaoKey() { const fd = document.getElementById('filterDate')?.value || getTodayCST(); return `pingtexiao_${currentRegion}_${fd}`; }
function getPingtexiaoData() { try { return JSON.parse(localStorage.getItem(getPingtexiaoKey()) || '{}'); } catch (e) { return {}; } }
function savePingtexiaoData(data) { localStorage.setItem(getPingtexiaoKey(), JSON.stringify(data)); }

function renderPingtexiaoTable() {
  const container = document.getElementById('pingtexiaoTableContainer'); if (!container) return;
  const data = getPingtexiaoData(); const leftZodiacs = ['鼠','牛','虎','兔','龙','蛇']; const rightZodiacs = ['马','羊','猴','鸡','狗','猪'];
  const zcm = {'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'};
  let html = '<table class="freq-table"><thead><tr>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '</tr></thead><tbody>';
  for (let r = 0; r < 6; r++) {
    html += '<tr>';
    [leftZodiacs[r], rightZodiacs[r]].forEach(zodiac => {
      const d = data[zodiac] || { amount: '', report: '' };
      const amountVal = d.amount !== undefined && d.amount !== '' && parseFloat(d.amount) !== 0 ? d.amount : '';
      const reportVal = d.report !== undefined && d.report !== '' && parseFloat(d.report) !== 0 ? d.report : '';
      const remainVal = (amountVal !== '') ? (parseFloat(amountVal) - (reportVal !== '' ? parseFloat(reportVal) : 0)) : 0;
      const remain = remainVal !== 0 ? remainVal : '';
      html += `<td class="${zcm[zodiac] || ''}">${zodiac}</td>`;
      html += `<td><input type="number" class="pt-edit-input amount-red-text" data-zodiac="${zodiac}" data-field="amount" value="${amountVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`;
      html += `<td><input type="number" class="pt-edit-input pt-report-text" data-zodiac="${zodiac}" data-field="report" value="${reportVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`;
      html += `<td style="font-size:12px;">${remain !== '' ? remain : ''}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>'; container.innerHTML = html; updatePingtexiaoTotal();
}

function finishPtEdit(input) { if (input.hasAttribute('readonly')) return; input.setAttribute('readonly', 'readonly'); input.style.border = '1px solid transparent'; input.style.background = 'transparent'; updatePtRemain(input); savePingtexiaoCell(); }

function updatePtRemain(input) {
  const row = input.closest('tr'); if (!row) return; const zodiac = input.dataset.zodiac; const cells = row.cells;
  let amountVal = '', reportVal = '';
  for (let i = 0; i < cells.length; i++) {
    const amountInput = cells[i].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="amount"]`);
    if (amountInput) { amountVal = amountInput.value.trim(); const reportInput = cells[i+1].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="report"]`); if (reportInput) reportVal = reportInput.value.trim();
    const remainCell = cells[i+2]; if (remainCell) { const a = amountVal !== '' ? parseFloat(amountVal) : 0; const r = reportVal !== '' ? parseFloat(reportVal) : 0; remainCell.textContent = amountVal !== '' ? (a - r) : ''; } break; }
  }
  updatePingtexiaoTotal();
}

function savePingtexiaoCell() {
  const data = getPingtexiaoData();
  document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].amount = input.value.trim(); });
  document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].report = input.value.trim(); });
  savePingtexiaoData(data); updatePingtexiaoTotal();
}

function updatePingtexiaoTotal() {
  let amountTotal = 0, reportTotal = 0;
  document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) amountTotal += v; });
  document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) reportTotal += v; });
  const amountBox = document.getElementById('ptAmountTotalBox'); const amountSpan = document.getElementById('ptAmountTotal'); const reportBox = document.getElementById('ptReportTotalBox'); const reportSpan = document.getElementById('ptReportTotal');
  if (amountBox && amountSpan) { if (amountTotal > 0) { amountSpan.textContent = amountTotal; amountBox.style.display = 'inline-flex'; } else { amountBox.style.display = 'none'; } }
  if (reportBox && reportSpan) { if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; } }
}

// ===== 解析超额文本 =====
let currentParseMethod = parseInt(localStorage.getItem('savedParseMethod') || '0');

function parseExcessText(text, method) {
  const lines = text.trim().split('\n').filter(l => l.trim()); const items = [];
  for (const line of lines) { const match = line.match(/(\d{2})各(\d+)米/); if (match) { items.push({ num: match[1], amount: parseInt(match[2]) }); } }
  if (items.length === 0) return '';
  items.sort((a, b) => b.amount - a.amount);
  const parseItems = (method) => {
    const data = items.map(item => ({ ...item })); const result = [];
    if (method === 0) {
      while (data.some(d => d.amount > 0)) { const maxAmount = Math.max(...data.map(d => d.amount)); if (maxAmount <= 0) break; const group = []; for (const d of data) { if (d.amount > 0 && (maxAmount - d.amount) <= maxAmount * 0.4) { group.push(d.num); } } const groupAmount = Math.min(...group.map(n => data.find(d => d.num === n).amount)); for (const n of group) { const d = data.find(d => d.num === n); d.amount -= groupAmount; } result.push(`${group.join('-')}各数${groupAmount}`); }
    } else if (method === 1) {
      while (data.some(d => d.amount > 0)) { let bestAmount = 0; let bestCount = 0; for (let i = 0; i < data.length; i++) { const candidate = data[i].amount; if (candidate <= 0) continue; let count = 0; for (const d of data) { if (d.amount >= candidate) count++; } if (count > bestCount || (count === bestCount && candidate < bestAmount)) { bestCount = count; bestAmount = candidate; } } if (bestCount === 0) break; const group = []; for (const d of data) { if (d.amount >= bestAmount) { group.push(d.num); d.amount -= bestAmount; } } result.push(`${group.join('-')}各数${bestAmount}`); }
    } else if (method === 2) {
      const levels = [50, 10, 5, 2, 1]; for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } }
    } else if (method === 3) {
      for (let lv = 100; lv >= 1; lv--) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } }
    } else if (method === 4) {
      const levels = []; for (let lv = 100; lv >= 5; lv -= 5) levels.push(lv); levels.push(3, 2, 1);
      for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } }
    }
    return result.join('\n');
  };
  return parseItems(method);
}

function switchParseMethod() {
  const text = document.getElementById('reportCapInfo').innerText;
  if (!text || text === '无超出的号码') { showToast('当前没有超额文本'); document.getElementById('parseResultArea').innerText = ''; return; }
  const result = parseExcessText(text, currentParseMethod); document.getElementById('parseResultArea').innerText = result;
  const methodNames = ['聚类分组', '贪心合并', '固定50→10→5→2→1', '100递减', '固定100→...→1'];
  showToast(`当前方案：${methodNames[currentParseMethod]}`); currentParseMethod = (currentParseMethod + 1) % 5; localStorage.setItem('savedParseMethod', currentParseMethod);
}

function copyOrderGroup() { const text = document.getElementById('parseResultArea').innerText; if (!text) { showToast('没有解析结果'); return; } navigator.clipboard.writeText(text).then(() => showToast('订单组已复制')); }

// ===== 订单统计渲染 =====
function isTokenMatching(token, targetNum) { const t = targetNum.padStart(2, '0'); if (/^\d{1,2}$/.test(token)) return token.padStart(2, '0') === t; if (D[token]) { const nums = keyToAllNums(token); return nums.includes(t); } return false; }
function highlightContent(content, targetNum) { if (!targetNum) return content; const t = targetNum.padStart(2, '0'); const parts = []; let tmp = ''; for (const ch of content) { if (ch === '-' || ch === ' ') { if (tmp) parts.push(tmp); parts.push(ch); tmp = ''; } else { tmp += ch; } } if (tmp) parts.push(tmp); return parts.map(p => { if (p === '-' || p === ' ') return p; if (isTokenMatching(p, targetNum)) return `<span class="highlight-number">${p}</span>`; return p; }).join(''); }
function orderContainsTarget(content, targetNum) { if (!targetNum) return true; const t = targetNum.padStart(2, '0'); const lines = content.split('\n'); for (const line of lines) { if (!line.startsWith('特码:')) continue; const m = line.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); if (!m) continue; const cont = m[1]; const parts = []; let tmp = ''; for (const ch of cont) { if (ch === '-' || ch === ' ') { if (tmp) parts.push(tmp); tmp = ''; } else { tmp += ch; } } if (tmp) parts.push(tmp); for (const p of parts) { if (p !== '-' && p !== ' ' && isTokenMatching(p, targetNum)) return true; } } return false; }
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

async function applyPrizeFilter() {
  const pi = document.getElementById('prizeNumberInput'), uf = document.getElementById('recordUserFilter');
  if (!pi || !uf) return; const sd = document.getElementById('filterDate')?.value; const pn = pi.value.trim(), uv = uf.value;
  const recs = await getOrderRecords(); const reports = await getReportOrderRecords();
  const fRecs = sd ? recs.filter(r => r.date === sd) : recs; const fReps = sd ? reports.filter(r => r.date === sd) : reports;
  const userOrders = uv === 'all' ? fRecs : fRecs.filter(r => r.user === uv); const userReports = uv === 'all' ? fReps : fReps.filter(r => r.user === uv);
  let filtered = pn ? [] : [...userOrders];
  if (pn) { for (const it of userOrders) { if (orderContainsTarget(it.content, pn)) filtered.push(it); } }
  const cont = document.getElementById('orderListContainer'); if (!cont) return;
  if (filtered.length === 0) { cont.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">暂无匹配订单</div>'; }
  else { cont.innerHTML = filtered.map(it => { const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0; const lines = it.content.split('\n'); const hl = lines.map(l => { const m = l.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); if (!m) return l; const cont = m[1], amt = m[2]; const hc = highlightContent(cont, pn); return `特码:${hc} 各数 ${amt}`; }).join('<br>'); return `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${hl}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`; }).join(''); }
  renderOrderStats(userOrders, userReports, uv, pn);
}

// ===== 自动清理回收站 =====
async function autoCleanRecycleBin() { try { const records = await getRecycleBinRecords(); const now = Date.now(); const expireMs = RECYCLE_RETENTION_DAYS * 24 * 60 * 60 * 1000; for (const record of records) { const deletedTime = new Date(record.deletedAt).getTime(); if (now - deletedTime > expireMs) { await deleteFromRecycleBin(record.id); } } updateRecycleCount(); } catch(e) {} }

// ===== 北京时间更新 =====
function updateLiveClock() {
  const el = document.getElementById('liveClock'); if (!el) return;
  const now = new Date(); const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const str = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') + ' ' + weekdays[now.getDay()] + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
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

  window._systemReady = async () => {
    await updateTableFromRecords(); calculateStorageUsage(); updateOrderTotalDisplay(); updateReportAmountTotal(); updateRecentDrawTexts(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); addOperationLog('login', '系统登录');
  };

  if (!checkCurrentAccess()) { showLoginScreen(); }
  else { if (isAdmin()) document.getElementById('cardMgrBtn').style.display = ''; await window._systemReady(); }

  const fixRangeInput = (id) => { const el = document.getElementById(id); if (el) { el.addEventListener('input', () => { clearStatsCache(); updateTableFromRecords(); }); } };
  fixRangeInput('numAmountMin'); fixRangeInput('numAmountMax'); fixRangeInput('zodiacAmountMin'); fixRangeInput('zodiacAmountMax');

  document.getElementById('rebateRate')?.addEventListener('input', generateRiskTable);
  document.getElementById('multipleVal')?.addEventListener('input', generateRiskTable);
  document.getElementById('reportRebateRate')?.addEventListener('input', generateReportTable);
  document.getElementById('reportMultipleVal')?.addEventListener('input', generateReportTable);
  document.getElementById('startZodiacSelect')?.addEventListener('change', changeStartZodiac);

  const filterDateEl = document.getElementById('filterDate');
  if (filterDateEl) { filterDateEl.addEventListener('change', () => { updateTableFromRecords(); if (document.getElementById('orderWin')) { applyPrizeFilter(); } applyReportCap(); updateRecentDrawTexts(); renderPingtexiaoTable(); updateCardA(); const duiJiangWin = document.getElementById('duiJiangWin'); if (duiJiangWin) { showDuiJiangWin(); } }); filterDateEl.addEventListener('input', updateTableFromRecords); }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('mousedown', () => { resetLongPressTimer = setTimeout(async () => { resetLongPressTimer = null; const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！'); if (!confirmed) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearAllOrderRecordsFromIDB(); await clearAllReportOrderRecordsFromIDB(); await clearAllComboOrderRecordsFromIDB(); clearMemoryData(); renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); addOperationLog('reset', '清空全部数据（长按）'); showToast('已清空香港和澳门全部数据'); }, 3000); });
    resetBtn.addEventListener('mouseup', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
    resetBtn.addEventListener('mouseleave', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
    resetBtn.addEventListener('touchstart', (e) => { resetLongPressTimer = setTimeout(async () => { resetLongPressTimer = null; const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！'); if (!confirmed) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearAllOrderRecordsFromIDB(); await clearAllReportOrderRecordsFromIDB(); await clearAllComboOrderRecordsFromIDB(); clearMemoryData(); renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); addOperationLog('reset', '清空全部数据（长按）'); showToast('已清空香港和澳门全部数据'); }, 3000); e.preventDefault(); });
    resetBtn.addEventListener('touchend', (e) => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; resetTable(); e.preventDefault(); } });
    resetBtn.addEventListener('touchcancel', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
  }

  (function() { const originalApplyPrizeFilter = applyPrizeFilter; applyPrizeFilter = async function() { await originalApplyPrizeFilter.apply(this, arguments); const input = document.getElementById('prizeNumberInput'); if (!input) return; let val = input.value.trim(); if (val === '') { input.className = ''; return; } if (/^\d$/.test(val)) val = '0' + val; if (/^\d{2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 49) { const cls = redNumbers.includes(val) ? 'red-text' : (blueNumbers.includes(val) ? 'blue-text' : 'green-text'); input.className = cls; } else { input.className = ''; } }; })();

  (function() { const originalFn = generateReportTable; generateReportTable = function() { originalFn.apply(this, arguments); updateCardA(); renderSmartDecision(); }; })();
  (function() { const originalFn = updateTableFromRecords; updateTableFromRecords = async function() { await originalFn.apply(this, arguments); await computeSurge(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); }; })();
  (function() { const originalFn = switchRegion; switchRegion = async function(region) { await originalFn.apply(this, arguments); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); }; })();

  const originalApplyReportCap = applyReportCap;
  applyReportCap = function() { originalApplyReportCap(); const info = document.getElementById('reportCapInfo').innerText; if (!info || info === '无超出的号码') { document.getElementById('parseResultArea').innerText = ''; } };

  async function changeStartZodiac() {
    const select = document.getElementById('startZodiacSelect'); const newZodiac = select.value;
    const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马';
    if (newZodiac === savedZodiac) return;
    const inputPwd = await prompt("请输入本年生肖切换密码：", "");
    if (inputPwd !== YEAR_ZODIAC_PASSWORD) { await alert("密码错误"); select.value = savedZodiac; return; }
    localStorage.setItem('selectedStartZodiac', newZodiac); currentZodiacMap = buildZodiacMap(newZodiac); refreshAll();
  }

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

  document.addEventListener('click', function(e) {
    const drawer = document.getElementById('storageDrawer'); if (!drawer) return;
    const panel = document.getElementById('storagePanel'); if (!panel || !panel.classList.contains('show')) return;
    if (!drawer.contains(e.target)) { panel.classList.remove('show'); if (storageDrawerTimer) { clearTimeout(storageDrawerTimer); storageDrawerTimer = null; } }
  });

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