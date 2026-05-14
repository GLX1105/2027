// ===== 识别弹窗 =====
function showRecognizeModal() {
  if (document.getElementById('recognizeWin')) return;
  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'recognizeWin';
  win.style.width = '850px';
  win.style.height = '650px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `
    <div class="modal-header">订单输入<div class="window-controls"><button onclick="maximizeWindow('recognizeWin')">🗖</button><button onclick="pinWindow('recognizeWin')">📌</button><button onclick="document.getElementById('recognizeWin').remove()">×</button></div></div>
    <div class="modal-body" style="display:flex; flex-direction:column; gap:10px;">
      <div class="card recognize-card" style="flex:1; display:flex; flex-direction:column;">
        <div class="card-title" style="display:flex; align-items:center; gap:5px;">
          <select id="orderUserSelect" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;font-size:13px;"></select>
          <input type="date" id="orderDate" style="padding:4px;border-radius:4px;border:1px solid #ccc;margin-left:8px;">
          <div class="amount-stat-box" id="orderTotalAmountBox" style="display:none;"><span>合计：</span><span id="orderTotalAmount">0</span></div>
          <button class="btn btn-prefix" onclick="showPrefixManager()" style="margin-left:auto;">前缀</button>
          <button class="btn btn-suffix" onclick="showSuffixManager()">后缀</button>
          <button class="btn btn-amount-prefix" onclick="showAmountSuffixManager()">金额后缀</button>
        </div>
        <div class="order-input-container" style="flex:1;">
          <div class="input-column"><div class="box-label">订单输入框</div><textarea class="source-order-input" placeholder="" oninput="convertOrderText()"></textarea></div>
          <div class="result-column"><div class="box-label">识别结果</div><div class="result-area-new"><textarea class="result-content" id="orderResult" readonly></textarea></div></div>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-paste" onclick="pasteOrder()">粘贴订单</button><button class="btn btn-save-order" onclick="saveOrder()">保存下单</button><button class="btn btn-report" onclick="saveReportOrder()">上报</button><button class="btn btn-clear" onclick="clearAllInput()">清空</button><button class="btn btn-replace-sep" onclick="replaceSeparators()">换分隔</button><button class="btn btn-remove-sep" onclick="removeSeparators()">去分隔</button><button class="btn btn-cancel" onclick="semanticReplace()">语义转换</button>
        </div>
      </div>
      <div class="card category-card"><div class="card-title">分类快捷选择</div><div class="btn-group">
          <button class="category-btn" onclick="quickAddWithAmount('家禽', this)">家禽</button><button class="category-btn" onclick="quickAddWithAmount('野兽', this)">野兽</button><button class="category-btn" onclick="quickAddWithAmount('红波', this)">红波</button><button class="category-btn" onclick="quickAddWithAmount('蓝波', this)">蓝波</button><button class="category-btn" onclick="quickAddWithAmount('绿波', this)">绿波</button><button class="category-btn" onclick="quickAddWithAmount('红双', this)">红双</button><button class="category-btn" onclick="quickAddWithAmount('红单', this)">红单</button><button class="category-btn" onclick="quickAddWithAmount('蓝双', this)">蓝双</button><button class="category-btn" onclick="quickAddWithAmount('蓝单', this)">蓝单</button><button class="category-btn" onclick="quickAddWithAmount('绿双', this)">绿双</button><button class="category-btn" onclick="quickAddWithAmount('绿单', this)">绿单</button><button class="category-btn" onclick="quickAddWithAmount('单数', this)">单数</button><button class="category-btn" onclick="quickAddWithAmount('双数', this)">双数</button><button class="category-btn" onclick="quickAddWithAmount('鼠', this)">鼠</button><button class="category-btn" onclick="quickAddWithAmount('牛', this)">牛</button><button class="category-btn" onclick="quickAddWithAmount('虎', this)">虎</button><button class="category-btn" onclick="quickAddWithAmount('兔', this)">兔</button><button class="category-btn" onclick="quickAddWithAmount('龙', this)">龙</button><button class="category-btn" onclick="quickAddWithAmount('蛇', this)">蛇</button><button class="category-btn" onclick="quickAddWithAmount('马', this)">马</button><button class="category-btn" onclick="quickAddWithAmount('羊', this)">羊</button><button class="category-btn" onclick="quickAddWithAmount('猴', this)">猴</button><button class="category-btn" onclick="quickAddWithAmount('鸡', this)">鸡</button><button class="category-btn" onclick="quickAddWithAmount('狗', this)">狗</button><button class="category-btn" onclick="quickAddWithAmount('猪', this)">猪</button><button class="category-btn" onclick="quickAddWithAmount('金', this)">金</button><button class="category-btn" onclick="quickAddWithAmount('木', this)">木</button><button class="category-btn" onclick="quickAddWithAmount('水', this)">水</button><button class="category-btn" onclick="quickAddWithAmount('火', this)">火</button><button class="category-btn" onclick="quickAddWithAmount('土', this)">土</button>
        </div></div>
    </div>`;
  document.body.appendChild(win);
  updateSelects();
  const today = getTodayCST();
  const dateInput = win.querySelector('#orderDate');
  if (dateInput) dateInput.value = today;
  makeWindowDraggable('recognizeWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
}

// ===== 数据库弹窗 =====
async function showDatabase() {
  const pwd = await prompt("请输入数据库密码：", "");
  if (pwd === PASSWORD) {
    const modal = document.getElementById('databaseModal');
    if (!modal) return;
    modal.style.display = 'flex';
    highestZ += 1;
    modal.style.zIndex = highestZ;
    renderCustomConfigContainer();
    makeWindowDraggable('databaseModalBox');
  } else {
    await alert("密码错误");
  }
}
function hideDatabase() {
  const modal = document.getElementById('databaseModal');
  if (modal) modal.style.display = 'none';
}

// ===== 前缀管理 =====
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
  w.innerHTML = `<div class="modal-header"><h3>前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('prefixWin')">🗖</button><button onclick="pinWindow('prefixWin')">📌</button><button onclick="document.getElementById('prefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newPrefix" placeholder="新增行首忽略词" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addPrefix()" style="padding:6px 12px;background:#3498db;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="prefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('prefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderPrefixList();
  makeWindowDraggable('prefixWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
}
function renderPrefixList() {
  const p = getCustomPrefixes();
  const c = document.getElementById('prefixList');
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

// ===== 后缀管理 =====
function showSuffixManager() {
  if (document.getElementById('suffixWin')) return;
  const s = getCustomSuffixes();
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'suffixWin';
  w.style.width = '500px';
  w.style.height = '400px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>后缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('suffixWin')">🗖</button><button onclick="pinWindow('suffixWin')">📌</button><button onclick="document.getElementById('suffixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newSuffix" placeholder="新增行尾忽略词" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addSuffix()" style="padding:6px 12px;background:#1abc9c;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="suffixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('suffixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderSuffixList();
  makeWindowDraggable('suffixWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
}
function renderSuffixList() {
  const s = getCustomSuffixes();
  const c = document.getElementById('suffixList');
  if (!c) return;
  c.innerHTML = s.length === 0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义后缀</div>' : s.map((x, i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteSuffix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join('');
}
async function addSuffix() {
  const v = document.getElementById('newSuffix')?.value.trim();
  if (!v) { showToast('请输入后缀'); return; }
  const s = getCustomSuffixes();
  if (s.includes(v)) { showToast('已存在'); return; }
  s.push(v);
  localStorage.setItem('customSuffixes', JSON.stringify(s));
  document.getElementById('newSuffix').value = '';
  renderSuffixList();
}
async function deleteSuffix(i) {
  if (!(await confirm('确定删除？'))) return;
  const s = getCustomSuffixes();
  s.splice(i, 1);
  localStorage.setItem('customSuffixes', JSON.stringify(s));
  renderSuffixList();
}

// ===== 金额后缀管理 =====
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
  w.innerHTML = `<div class="modal-header"><h3>金额后缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountSuffixWin')">🗖</button><button onclick="pinWindow('amountSuffixWin')">📌</button><button onclick="document.getElementById('amountSuffixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountSuffix" placeholder="新增后缀(如米、斤)" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountSuffix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountSuffixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountSuffixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderAmountSuffixList();
  makeWindowDraggable('amountSuffixWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
}
function renderAmountSuffixList() {
  const s = getCustomAmountSuffixes();
  const c = document.getElementById('amountSuffixList');
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
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'categoryAliasWin';
  w.style.width = '500px';
  w.style.height = '450px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>分类缩写</h3><div class="window-controls"><button onclick="maximizeWindow('categoryAliasWin')">🗖</button><button onclick="pinWindow('categoryAliasWin')">📌</button><button onclick="document.getElementById('categoryAliasWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="aliasOld" placeholder="缩写（如 红蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="aliasNew" placeholder="正规分类（如 红波-蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addCategoryAlias()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="aliasList"></div></div><div class="modal-footer"><button onclick="document.getElementById('categoryAliasWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderAliasList();
  makeWindowDraggable('categoryAliasWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
}
function renderAliasList() {
  const a = getCategoryAliases();
  const c = document.getElementById('aliasList');
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
  const w = document.createElement('div');
  w.className = 'floating-window';
  w.id = 'replacePresetWin';
  w.style.width = '500px';
  w.style.height = '450px';
  w.style.left = '50%';
  w.style.top = '50%';
  w.style.transform = 'translate(-50%, -50%)';
  w.innerHTML = `<div class="modal-header"><h3>替换预设</h3><div class="window-controls"><button onclick="maximizeWindow('replacePresetWin')">🗖</button><button onclick="pinWindow('replacePresetWin')">📌</button><button onclick="document.getElementById('replacePresetWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="presetOld" placeholder="原文字" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="presetNew" placeholder="替换为" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addReplacePreset()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="presetList"></div></div><div class="modal-footer"><button onclick="document.getElementById('replacePresetWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w);
  renderPresetList();
  makeWindowDraggable('replacePresetWin');
  highestZ += 1;
  w.style.zIndex = highestZ;
}
function renderPresetList() {
  const p = getReplacePresets();
  const c = document.getElementById('presetList');
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

// ===== 订单记录弹窗 =====
async function applyPrizeFilter() {
  const di = document.getElementById('recordDateFilter'), pi = document.getElementById('prizeNumberInput'), uf = document.getElementById('recordUserFilter');
  if (!di || !pi || !uf) return;
  const sd = di.value, pn = pi.value.trim(), uv = uf.value;
  const recs = await getOrderRecords();
  let filtered = uv === 'all' ? recs : recs.filter(r => r.user === uv);
  if (sd) filtered = filtered.filter(r => r.date === sd);
  const cfg = getAllConfigData();
  let final = [];
  if (pn) { for (const it of filtered) { if (orderContainsTarget(it.content, pn, cfg)) final.push(it); } }
  else { final = filtered; }
  const cont = document.getElementById('orderListContainer');
  if (!cont) return;
  if (final.length === 0) { cont.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">暂无匹配订单</div>'; return; }
  cont.innerHTML = final.map(it => {
    const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0;
    const lines = it.content.split('\n');
    const hl = lines.map(l => { const m = l.match(/^(.+?)\s+各数\s+(\d+)$/); if (!m) return l; const cont = m[1], amt = m[2]; const hc = highlightContent(cont, pn, cfg); return `${hc} 各数 ${amt}`; }).join('<br>');
    return `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content">${hl}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-del" onclick="deleteOrderRecord(${it.id})">删除</button></div>`;
  }).join('');
}

async function showOrderRecord(filter = 'all') {
  try {
    const recs = await getOrderRecords(), users = getUsers(), today = getTodayCST();
    if (document.getElementById('orderWin')) document.getElementById('orderWin').remove();
    const w = document.createElement('div');
    w.className = 'floating-window';
    w.id = 'orderWin';
    w.style.width = '750px';
    w.style.height = '600px';
    w.style.left = '50%';
    w.style.top = '50%';
    w.style.transform = 'translate(-50%, -50%)';
    let html = `<div class="modal-header"><h3>下单记录</h3><div class="window-controls"><button onclick="maximizeWindow('orderWin')">🗖</button><button onclick="pinWindow('orderWin')">📌</button><button onclick="document.getElementById('orderWin').remove()">×</button></div></div><div class="modal-body">`;
    html += `<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><select id="recordUserFilter" onchange="applyPrizeFilter()" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter === 'all' ? 'selected' : ''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u === filter ? 'selected' : ''}>${u}</option>`);
    html += `</select><button onclick="checkAll()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAll()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteChecked()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button><span style="margin-left:auto;">日期：</span><input type="date" id="recordDateFilter" value="${today}" onchange="applyPrizeFilter()" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;width:140px;"><span>对奖：</span><input type="text" id="prizeNumberInput" placeholder="号码" maxlength="2" oninput="applyPrizeFilter()" style="padding:4px;border-radius:4px;border:1px solid #ccc;width:50px;"></div><div id="orderListContainer">`;
    const df = recs.filter(r => r.date === today);
    const fin = (filter === 'all') ? df : df.filter(r => r.user === filter);
    if (fin.length === 0) html += `<div style="padding:20px;text-align:center;color:#666;">暂无订单记录</div>`;
    else {
      fin.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0;
        html += `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content">${it.content.replace(/\n/g, '<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-del" onclick="deleteOrderRecord(${it.id})">删除</button></div>`;
      });
    }
    html += `</div></div><div class="modal-footer"><button onclick="document.getElementById('orderWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
    w.innerHTML = html;
    document.body.appendChild(w);
    makeWindowDraggable('orderWin');
    highestZ += 1;
    w.style.zIndex = highestZ;
  } catch (e) { showToast('加载失败'); }
}

async function deleteOrderRecord(id) {
  if (!(await confirm('确定删除？'))) return;
  await deleteOrderRecordFromIDB(id);
  await updateTableFromRecords();
  calculateStorageUsage();
  showOrderRecord();
}

// ===== 上报记录弹窗 =====
async function showReportOrderRecord(filter = 'all') {
  try {
    const recs = await getReportOrderRecords(), users = getUsers();
    if (document.getElementById('reportWin')) document.getElementById('reportWin').remove();
    const fd = document.getElementById('filterDate')?.value;
    const df = fd ? recs.filter(r => r.date === fd) : recs;
    const fin = (filter === 'all') ? df : df.filter(r => r.user === filter);
    const w = document.createElement('div');
    w.className = 'floating-window';
    w.id = 'reportWin';
    w.style.width = '700px';
    w.style.height = '500px';
    w.style.left = '50%';
    w.style.top = '50%';
    w.style.transform = 'translate(-50%, -50%)';
    let html = `<div class="modal-header"><h3>上报数据</h3><div class="window-controls"><button onclick="maximizeWindow('reportWin')">🗖</button><button onclick="pinWindow('reportWin')">📌</button><button onclick="document.getElementById('reportWin').remove()">×</button></div></div><div class="modal-body">`;
    html += `<div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><select id="reportRecordUserFilter" onchange="showReportOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter === 'all' ? 'selected' : ''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u === filter ? 'selected' : ''}>${u}</option>`);
    html += `</select><button onclick="checkAllReport()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAllReport()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteCheckedReport()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button></div>`;
    if (fin.length === 0) html += `<div style="padding:20px;text-align:center;color:#666;">暂无上报记录</div>`;
    else {
      fin.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', ta = it.totalAmount || 0;
        html += `<div class="order-item"><input type="checkbox" class="report-order-check" data-id="${it.id}"><div class="order-content">${it.content.replace(/\n/g, '<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:red;">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-del" onclick="deleteReportOrderRecord(${it.id})">删除</button></div>`;
      });
    }
    html += `</div><div class="modal-footer"><button onclick="document.getElementById('reportWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
    w.innerHTML = html;
    document.body.appendChild(w);
    makeWindowDraggable('reportWin');
    highestZ += 1;
    w.style.zIndex = highestZ;
  } catch (e) { showToast('加载失败'); }
}

async function deleteReportOrderRecord(id) {
  if (!(await confirm('确定删除？'))) return;
  await deleteReportOrderRecordFromIDB(id);
  await updateTableFromRecords();
  calculateStorageUsage();
  showReportOrderRecord();
}

// ===== 批量操作 =====
function checkAll() { document.querySelectorAll('.order-check').forEach(cb => cb.checked = true); }
function uncheckAll() { document.querySelectorAll('.order-check').forEach(cb => cb.checked = false); }
function checkAllReport() { document.querySelectorAll('.report-order-check').forEach(cb => cb.checked = true); }
function uncheckAllReport() { document.querySelectorAll('.report-order-check').forEach(cb => cb.checked = false); }
async function deleteChecked() {
  const ids = [];
  document.querySelectorAll('.order-check:checked').forEach(cb => ids.push(Number(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  await batchDeleteOrderRecord(ids);
}
async function deleteCheckedReport() {
  const ids = [];
  document.querySelectorAll('.report-order-check:checked').forEach(cb => ids.push(Number(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  await batchDeleteReportOrderRecord(ids);
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
  win.innerHTML = `<div class="modal-header"><h3>管理用户</h3><div class="window-controls"><button onclick="maximizeWindow('userManagerWin')">🗖</button><button onclick="pinWindow('userManagerWin')">📌</button><button onclick="document.getElementById('userManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newUserName" placeholder="用户名" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addUserAction()" style="padding:6px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="userList"></div></div><div class="modal-footer"><button onclick="document.getElementById('userManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win);
  renderUserList();
  makeWindowDraggable('userManagerWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
}
function renderUserList() {
  const users = getUsers();
  const container = document.getElementById('userList');
  if (!container) return;
  if (users.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无用户</div>'; return; }
  container.innerHTML = users.map(u => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:5px;border:1px solid #eee;border-radius:4px;"><span style="flex:1;">${u}</span><button onclick="deleteUserAction('${u}')" style="background:#e74c3c;color:#fff;border:none;padding:2px 8px;border-radius:3px;">删除</button></div>`).join('');
}
async function addUserAction() {
  const name = document.getElementById('newUserName')?.value.trim();
  if (!name) { showToast('请输入用户名'); return; }
  if (addUser(name)) { document.getElementById('newUserName').value = ''; renderUserList(); updateSelects(); showToast('用户添加成功'); }
}
async function deleteUserAction(name) {
  if (!(await confirm(`确定删除用户"${name}"及其数据吗？`))) return;
  deleteUser(name);
  renderUserList();
  updateSelects();
  showToast('用户已删除');
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
  win.innerHTML = `<div class="modal-header"><h3>🔑 卡密管理</h3><div class="window-controls"><button onclick="maximizeWindow('cardManagerWin')">🗖</button><button onclick="pinWindow('cardManagerWin')">📌</button><button onclick="document.getElementById('cardManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><input type="number" id="expireDaysInput" placeholder="有效天数" value="30" min="1" style="padding:5px;border-radius:4px;border:1px solid #ccc;width:80px;"><span>天</span><button onclick="generateCardKey()" style="padding:6px 15px;background:#28a745;color:#fff;border:none;border-radius:4px;">生成卡密</button></div><div id="cardListContainer"></div></div><div class="modal-footer"><button onclick="document.getElementById('cardManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
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
  if (keys.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无卡密</div>'; return; }
  container.innerHTML = keys.map((card, idx) => {
    const created = card.createTime ? new Date(card.createTime).toLocaleString('zh-CN') : '未知';
    const expired = card.expireDays ? `有效${card.expireDays}天` : '永久';
    const statusClass = { active: 'green', disabled: 'red', expired: 'gray' }[card.status] || 'gray';
    const statusText = card.status === 'active' ? '启用' : card.status === 'disabled' ? '禁用' : '过期';
    return `<div style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-weight:bold;font-size:16px;">${card.code}</span><span style="color:${statusClass};font-size:12px;">[${statusText}]</span><span style="font-size:11px;color:#666;">创建:${created} ${expired}</span><div style="margin-left:auto;display:flex;gap:5px;">${card.status === 'active' ? `<button onclick="disableCard(${idx})" style="background:#f39c12;color:#fff;border:none;padding:3px 8px;border-radius:3px;">禁用</button>` : ''}${card.status === 'disabled' ? `<button onclick="enableCard(${idx})" style="background:#2ecc71;color:#fff;border:none;padding:3px 8px;border-radius:3px;">启用</button>` : ''}<button onclick="deleteCard(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:3px 8px;border-radius:3px;">删除</button></div></div>`;
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
async function disableCard(index) { if (!(await confirm('确定禁用该卡密？'))) return; const keys = getCardKeys(); keys[index].status = 'disabled'; saveCardKeys(keys); renderCardList(); }
async function enableCard(index) { const keys = getCardKeys(); keys[index].status = 'active'; saveCardKeys(keys); renderCardList(); }
async function deleteCard(index) { if (!(await confirm('确定删除该卡密？'))) return; const keys = getCardKeys(); keys.splice(index, 1); saveCardKeys(keys); renderCardList(); }

// ===== 存储空间计算 =====
async function calculateStorageUsage() {
  const records = await getOrderRecords();
  const reportRecords = await getReportOrderRecords();
  const orderCount = records.length + reportRecords.length;
  let usedBytes = 0;
  records.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  reportRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  usedBytes += JSON.stringify(getAllConfigData()).length * 2;
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
  const maxStorage = 50 * 1024 * 1024;
  const freeMB = ((maxStorage - usedBytes) / (1024 * 1024)).toFixed(2);
  document.getElementById('orderCount').textContent = orderCount;
  document.getElementById('usedSpace').textContent = `${usedMB} MB`;
  document.getElementById('freeSpace').textContent = `${freeMB} MB`;
}
