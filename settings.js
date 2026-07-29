/* ===== settings.js - 配置管理（替换预设、分类缩写、前缀/后缀管理、语义转换、输入框工具） ===== */

// ===== 读取/写入 localStorage 的工具函数 =====
function getReplacePresets() {
  try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; }
}

function getCategoryAliases() {
  try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; }
}

function getCustomPrefixes() {
  try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; }
}

function getCustomSuffixes() {
  try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; }
}

function getCustomAmountSuffixes() {
  try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; }
}

function getCustomAmountPrefixes() {
  try { return JSON.parse(localStorage.getItem('customAmountPrefixes') || '[]'); } catch (e) { return []; }
}

function saveCustomAmountPrefixes(list) {
  localStorage.setItem('customAmountPrefixes', JSON.stringify(list));
}

// ===== 替换预设管理弹窗 =====
function showReplacePreset() {
  if (document.getElementById('replacePresetWin')) return;
  const p = getReplacePresets();
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'replacePresetWin';
  w.style.width = '500px';
  w.style.height = '450px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>替换预设</h3><div style="display:flex;align-items:center;gap:8px;margin-left:auto;"><button onclick="resetPresetsToDefault()" title="恢复默认预设" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">🔄</button><div class="window-controls"><button onclick="maximizeWindow('replacePresetWin')">🗖</button><button onclick="document.getElementById('replacePresetWin').remove()">×</button></div></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="presetOld" placeholder="原文字" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="presetNew" placeholder="替换为" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addReplacePreset()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="presetList"></div></div><div class="modal-footer"><button onclick="document.getElementById('replacePresetWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderPresetList();
  makeWindowDraggable('replacePresetWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
  document.getElementById('presetOld').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { document.getElementById('presetNew').focus(); }
  });
  document.getElementById('presetNew').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { addReplacePreset(); }
  });
}

function renderPresetList() {
  const p = getReplacePresets();
  const c = document.getElementById('presetList');
  if (!c) return;
  c.innerHTML = p.length === 0
    ? '<div style="text-align:center;color:#666;padding:10px;">暂无替换预设</div>'
    : p.map((x, i) => `<div class="replace-preset-item"><span>${x.old} → ${x.new}</span><button onclick="deleteReplacePreset(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
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
    { "old": "兰", "new": "蓝" }, { "old": "录", "new": "绿" }, { "old": "碌", "new": "绿" },
    { "old": "禄", "new": "绿" }, { "old": "拦", "new": "蓝" }, { "old": "篮", "new": "蓝" },
    { "old": "免", "new": "兔" }, { "old": "午", "new": "牛" }, { "old": "侯", "new": "猴" },
    { "old": "㺅", "new": "猴" }, { "old": "名", "new": "各" }
  ];
  const defaultAliases = [
    { "alias": "红色", "target": "红波" }, { "alias": "蓝色", "target": "蓝波" }, { "alias": "绿色", "target": "绿波" },
    { "alias": "兰波", "target": "蓝波" }, { "alias": "录波", "target": "绿波" }, { "alias": "金行", "target": "金" },
    { "alias": "木行", "target": "木" }, { "alias": "水行", "target": "水" }, { "alias": "火行", "target": "火" }, { "alias": "土行", "target": "土" },
    { "alias": "红蓝", "target": "红波-蓝波" }, { "alias": "红绿", "target": "红波-绿波" }, { "alias": "蓝绿", "target": "蓝波-绿波" },
    { "alias": "火土", "target": "火-土" }, { "alias": "红蓝波", "target": "红波-蓝波" }, { "alias": "红绿波", "target": "红波-绿波" },
    { "alias": "蓝绿波", "target": "蓝波-绿波" }, { "alias": "大单小双", "target": "大单-小双" }, { "alias": "大双小单", "target": "大双-小单" },
    { "alias": "金木水", "target": "金-木-水" }, { "alias": "家肖", "target": "家禽" }, { "alias": "野肖", "target": "野兽" },
    { "alias": "号各", "target": "各号" }, { "alias": "小数", "target": "小" }, { "alias": "大数", "target": "大" },
    { "alias": "合单", "target": "合数单" }, { "alias": "合双", "target": "合数双" }, { "alias": "大尾", "target": "尾大" }, { "alias": "小尾", "target": "尾小" },
    { "alias": "大数单", "target": "大单" }, { "alias": "大数双", "target": "大双" }, { "alias": "小数单", "target": "小单" }, { "alias": "小数双", "target": "小双" },
    { "alias": "红波单", "target": "红单" }, { "alias": "红波双", "target": "红双" }, { "alias": "蓝波单", "target": "蓝单" }, { "alias": "蓝波双", "target": "蓝双" },
    { "alias": "绿波单", "target": "绿单" }, { "alias": "绿波双", "target": "绿双" }, { "alias": "老虎", "target": "虎" }, { "alias": "老鼠", "target": "鼠" },
    { "alias": "兔子", "target": "兔" }, { "alias": "大号", "target": "大" }, { "alias": "小号", "target": "小" }
  ];
  localStorage.setItem('replacePresets', JSON.stringify(defaultPresets));
  localStorage.setItem('categoryAliases', JSON.stringify(defaultAliases));
  renderPresetList();
  showToast('已恢复默认替换预设和分类缩写');
}

// ===== 预处理中应用的替换函数 =====
function applyReplacePresets(text) {
  const p = getReplacePresets();
  let r = text;
  p.forEach(x => {
    if (x.old && x.new) {
      const escapedOld = x.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOld, 'g');
      r = r.replace(regex, x.new);
    }
  });
  return r;
}

function applyCategoryAliases(text) {
  const a = getCategoryAliases();
  if (!a.length) return text;
  const s = [...a].sort((x, y) => y.alias.length - x.alias.length);
  let r = text;
  s.forEach(x => {
    if (x.alias && x.target) r = r.split(x.alias).join(x.target);
  });
  return r;
}

// ===== 分类缩写管理弹窗 =====
function showCategoryAliases() {
  if (document.getElementById('categoryAliasWin')) return;
  const a = getCategoryAliases();
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'categoryAliasWin';
  w.style.width = '500px';
  w.style.height = '450px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>分类缩写</h3><div class="window-controls"><button onclick="maximizeWindow('categoryAliasWin')">🗖</button><button onclick="document.getElementById('categoryAliasWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="aliasOld" placeholder="缩写（如 红蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="aliasNew" placeholder="正规分类（如 红波-蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addCategoryAlias()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="aliasList"></div></div><div class="modal-footer"><button onclick="document.getElementById('categoryAliasWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderAliasList();
  makeWindowDraggable('categoryAliasWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
  document.getElementById('aliasOld').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { document.getElementById('aliasNew').focus(); }
  });
  document.getElementById('aliasNew').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { addCategoryAlias(); }
  });
}

function renderAliasList() {
  const a = getCategoryAliases();
  const c = document.getElementById('aliasList');
  if (!c) return;
  c.innerHTML = a.length === 0
    ? '<div style="text-align:center;color:#666;padding:10px;">暂无分类缩写</div>'
    : a.map((x, i) => `<div class="replace-preset-item"><span>${x.alias} → ${x.target}</span><button onclick="deleteCategoryAlias(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
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

// ===== 前缀管理弹窗 =====
function showPrefixManager() {
  if (document.getElementById('prefixWin')) return;
  const prefixes = getCustomPrefixes();
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'prefixWin';
  w.style.width = '500px';
  w.style.height = '400px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('prefixWin')">🗖</button><button onclick="document.getElementById('prefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newPrefix" placeholder="新增行首忽略词" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addPrefix()" style="padding:6px 12px;background:#3498db;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="prefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('prefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderPrefixList();
  makeWindowDraggable('prefixWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
  document.getElementById('newPrefix').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { addPrefix(); }
  });
}

function renderPrefixList() {
  const p = getCustomPrefixes();
  const c = document.getElementById('prefixList');
  if (!c) return;
  c.innerHTML = p.length === 0
    ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义前缀</div>'
    : p.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deletePrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
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

// ===== 金额前缀管理弹窗 =====
function showAmountPrefixManager() {
  if (document.getElementById('amountPrefixWin')) return;
  const list = getCustomAmountPrefixes();
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'amountPrefixWin';
  w.style.width = '500px';
  w.style.height = '450px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>金额前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountPrefixWin')">🗖</button><button onclick="document.getElementById('amountPrefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountPrefix" placeholder="新增金额前缀（如 投、买）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountPrefix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountPrefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountPrefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderAmountPrefixList();
  makeWindowDraggable('amountPrefixWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
  document.getElementById('newAmountPrefix').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { addAmountPrefix(); }
  });
}

function renderAmountPrefixList() {
  const list = getCustomAmountPrefixes();
  const container = document.getElementById('amountPrefixList');
  if (!container) return;
  container.innerHTML = list.length === 0
    ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额前缀</div>'
    : list.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountPrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
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

// ===== 金额后缀管理弹窗 =====
function showAmountSuffixManager() {
  if (document.getElementById('amountSuffixWin')) return;
  const s = getCustomAmountSuffixes();
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'amountSuffixWin';
  w.style.width = '500px';
  w.style.height = '400px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>金额后缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountSuffixWin')">🗖</button><button onclick="document.getElementById('amountSuffixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountSuffix" placeholder="新增后缀(如米、斤)" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountSuffix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountSuffixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountSuffixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderAmountSuffixList();
  makeWindowDraggable('amountSuffixWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
  document.getElementById('newAmountSuffix').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { addAmountSuffix(); }
  });
}

function renderAmountSuffixList() {
  const s = getCustomAmountSuffixes();
  const c = document.getElementById('amountSuffixList');
  if (!c) return;
  c.innerHTML = s.length === 0
    ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额后缀</div>'
    : s.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountSuffix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
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
          matched = true;
          break;
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

// ===== 输入框工具函数 =====
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

function clearAllInput() {
  const si = document.querySelector('.source-order-input');
  if (si) si.value = '';
  const re = document.getElementById('orderResult');
  if (re) re.innerHTML = '';
  window._pureOrderLines = [];
  window._pureOrderRegions = [];
  updateOrderTotalDisplay();
  const md = document.getElementById('maxLossDisplay');
  if (md) { md.textContent = ''; md.style.display = 'none'; }
  const box = document.getElementById('orderTotalAmountBox');
  if (box) box.style.display = 'none';
  const lineCountSpan = document.getElementById('orderLineCount');
  if (lineCountSpan) lineCountSpan.style.display = 'none';
}

async function pasteOrder() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      const si = document.querySelector('.source-order-input');
      if (si) { si.value = text; performRecognition(text); }
    }
  } catch (err) { showToast('无法访问剪贴板'); }
}

// ===== 连肖输入框工具函数 =====
function comboRemoveSeparators() {
  const ta = document.getElementById('comboInput');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e);
  const cleaned = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '');
  ta.value = ta.value.substring(0, s) + cleaned + ta.value.substring(e);
}

async function pasteComboOrder() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      const ta = document.getElementById('comboInput');
      if (ta) { ta.value = text; }
    }
  } catch (err) { showToast('无法访问剪贴板'); }
}

// ===== 快捷添加带金额项目 =====
function quickAddWithAmount(text, button) {
  const input = document.querySelector('.source-order-input');
  if (!input) return;
  const lines = input.value.trim().split('\n').filter(l => l.trim());
  const idx = lines.findIndex(l => l.includes(text) && (l.includes('各数') || l.includes('各号')));
  if (idx !== -1) {
    lines.splice(idx, 1);
    button.classList.remove('active');
  } else {
    lines.push(`${text} 各数 `);
    button.classList.add('active');
  }
  input.value = lines.join('\n');
  performRecognition(input.value);
  const lastIndex = input.value.lastIndexOf('各数');
  if (lastIndex !== -1) {
    const pos = lastIndex + 2;
    input.focus();
    input.setSelectionRange(pos, pos);
  }
}