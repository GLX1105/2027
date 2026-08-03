// ===== windows.js - 通用浮动窗口管理、识别弹窗、订单记录窗、回收站等 =====

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

    if (rect.top < 0) {
      win.style.top = '0px';
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

// ===== 订单记录窗口 =====
window._orderListAllData = [];
window._orderListPage = 0;
window._orderListPageSize = 50;

async function showOrderRecord(filter='all') {
  try {
    const recs = await getOrderRecords(), users = getUsers(), today = getTodayCST();
    const reports = await getReportOrderRecords();
    const fd = document.getElementById('filterDate')?.value;
    const fRecs = fd ? recs.filter(r => r.date === fd) : recs;
    const fReps = fd ? reports.filter(r => r.date === fd) : reports;
    if (document.getElementById('orderWin')) document.getElementById('orderWin').remove();
    const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'orderWin';
    w.style.width = '750px'; w.style.height = '600px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
    let html = `<div class="modal-header"><h3>下单记录 <span style="font-size:12px;font-weight:normal;">(共${fRecs.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('orderWin')">🗖</button><button onclick="document.getElementById('orderWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
    html += `<div style="margin-bottom:6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><select id="recordUserFilter" onchange="showOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter==='all'?'selected':''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u===filter?'selected':''}>${u}</option>`);
    html += `</select><button onclick="checkAll()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAll()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteChecked()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button>`;
    html += `<span style="display:flex;align-items:center;gap:3px;margin-left:auto;"><span id="orderStatsContainer" style="margin-right:4px;"></span><span style="display:flex;align-items:center;gap:2px;"><span>对奖:</span><input type="text" id="prizeNumberInput" maxlength="2" oninput="applyPrizeFilter()" style="padding:4px;border-radius:4px;border:1px solid #ccc;width:50px;text-align:center;"></span></span>`;
    html += `</div><div id="orderListContainer" style="flex:1; overflow-y:auto;">`;
    const fin = (filter === 'all') ? fRecs : fRecs.filter(r => r.user === filter);
    window._orderListAllData = fin;
    window._orderListPage = 0;
    if (fin.length === 0) html += `<div style="padding:20px;text-align:center;color:#666;">暂无订单记录</div>`;
    else {
      const pageSize = window._orderListPageSize;
      const pageData = fin.slice(0, pageSize);
      pageData.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0;
        let contentHtml = it.content.replace(/\n/g, '<br>');
        html += `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${contentHtml}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`;
      });
      if (fin.length > pageSize) {
        html += `<div style="text-align:center;padding:10px;" id="loadMoreOrdersBtn"><button onclick="loadMoreOrders()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`;
      }
    }
    html += `</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('orderWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
    w.innerHTML = html; document.body.appendChild(w);
    makeWindowDraggable('orderWin'); highestZ += 1; w.style.zIndex = highestZ;
    const uv = filter || 'all';
    const userOrders = uv === 'all' ? fRecs : fRecs.filter(r => r.user === uv);
    const userReports = uv === 'all' ? fReps : fReps.filter(r => r.user === uv);
    renderOrderStats(userOrders, userReports, uv, '');
  } catch(e) { showToast('加载失败'); }
}

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

function copySingleOrderById(id) { const el = document.querySelector(`.order-content[data-id="${id}"]`); if (!el) { showToast('未找到订单内容'); return; } navigator.clipboard.writeText(el.innerText).then(() => { showToast('已复制到剪贴板'); }).catch(() => { showToast('复制失败'); }); }
function batchCopyOrders(selector) { const checked = document.querySelectorAll(selector + ':checked'); if (checked.length === 0) { showToast('请先选择订单'); return; } const contents = []; checked.forEach(cb => { const id = cb.dataset.id; if (id) { const el = document.querySelector(`.order-content[data-id="${id}"]`); if (el) contents.push(el.innerText); } }); if (contents.length === 0) { showToast('无有效内容'); return; } navigator.clipboard.writeText(contents.join('\n')).then(() => { showToast(`已复制 ${contents.length} 条订单`); }).catch(() => { showToast('复制失败'); }); }

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
  const ids = []; document.querySelectorAll('.order-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定要删除选中的 ${ids.length} 条记录吗？（可到回收站恢复）`))) return;
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

function checkAll(){ document.querySelectorAll('.order-check').forEach(cb => cb.checked = true); }
function uncheckAll(){ document.querySelectorAll('.order-check').forEach(cb => cb.checked = false); }

// ===== 上报记录窗口 =====
window._reportListAllData = [];
window._reportListPage = 0;

async function showReportOrderRecord(filter='all'){
  try {
    const recs = await getReportOrderRecords(), users = getUsers();
    if (document.getElementById('reportWin')) document.getElementById('reportWin').remove();
    const fd = document.getElementById('filterDate')?.value;
    const df = fd ? recs.filter(r => r.date === fd) : recs;
    const fin = (filter === 'all') ? df : df.filter(r => r.user === filter);
    window._reportListAllData = fin;
    window._reportListPage = 0;
    const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'reportWin';
    w.style.width = '700px'; w.style.height = '500px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
    let html = `<div class="modal-header"><h3>上报数据 <span style="font-size:12px;font-weight:normal;">(共${fin.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('reportWin')">🗖</button><button onclick="document.getElementById('reportWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
    html += `<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><select id="reportRecordUserFilter" onchange="showReportOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter==='all'?'selected':''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u===filter?'selected':''}>${u}</option>`);
    html += `</select><button onclick="checkAllReport()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAllReport()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteCheckedReport()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button></div>`;
    html += `<div id="reportOrderListContainer" style="flex:1; overflow-y:auto;">`;
    if (fin.length === 0) html += `<div style="padding:20px;text-align:center;color:#666;">暂无上报记录</div>`;
    else {
      const pageSize = window._orderListPageSize || 50;
      const pageData = fin.slice(0, pageSize);
      pageData.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', ta = it.totalAmount || 0;
        html += `<div class="order-item"><input type="checkbox" class="report-order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${it.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:red;">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteReportOrderRecord('${it.id}')">删除</button></div>`;
      });
      if (fin.length > pageSize) {
        html += `<div style="text-align:center;padding:10px;" id="loadMoreReportsBtn"><button onclick="loadMoreReports()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`;
      }
    }
    html += `</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.report-order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('reportWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
    w.innerHTML = html; document.body.appendChild(w);
    makeWindowDraggable('reportWin'); highestZ += 1; w.style.zIndex = highestZ;
  } catch(e) { showToast('加载失败'); }
}

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
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
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
    } else { showToast('删除失败，记录可能已不存在'); }
  } catch(e) { console.error('删除上报异常', e); showToast('删除异常'); }
}

async function deleteCheckedReport(){
  const ids = []; document.querySelectorAll('.report-order-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定要删除选中的 ${ids.length} 条上报记录吗？（可到回收站恢复）`))) return;
  try {
    const details = [];
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
        const store = tx.objectStore(REPORT_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
      });
      if (record) details.push(record);
    }
    await batchDeleteReportOrderRecordFromIDB(ids);
    details.forEach(rec => {
      addOperationLog('delete_report', rec.content, currentRegion, rec.user, rec.totalAmount || 0);
      deductPingtexiaoFromReportContent(rec.content);
    });
    await updateTableFromRecords(); calculateStorageUsage();
    const userFilter = document.getElementById('reportRecordUserFilter')?.value || 'all';
    await showReportOrderRecord(userFilter);
    updateRecycleCount();
    showToast(`已将 ${ids.length} 条移入回收站`);
  } catch(e) { console.error('批量删除异常', e); showToast('批量删除异常'); }
}

function checkAllReport(){ document.querySelectorAll('.report-order-check').forEach(cb => cb.checked = true); }
function uncheckAllReport(){ document.querySelectorAll('.report-order-check').forEach(cb => cb.checked = false); }

// ===== 数据库弹窗 =====
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

// ===== 回收站窗口 =====
async function showRecycleBin() {
  const existingWin = document.getElementById('recycleWin');
  if (existingWin) existingWin.remove();
  const allRecords = await getRecycleBinRecords();
  const records = allRecords.filter(r => r.region === currentRegion);
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'recycleWin';
  win.style.width = '750px'; win.style.height = '550px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  let html = `<div class="modal-header"><h3>🗑️ 回收站</h3><div class="window-controls"><button onclick="maximizeWindow('recycleWin')">🗖</button><button onclick="document.getElementById('recycleWin').remove()">×</button></div></div>`;
  html += `<div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
  html += `<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><button onclick="checkAllRecycle()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAllRecycle()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="restoreCheckedRecycle()" style="padding:6px 12px;background:#27ae60;color:#fff;border:none;border-radius:4px;">恢复选中</button><button onclick="deleteCheckedRecycle()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">彻底删除</button><button onclick="emptyRecycleBin()" style="padding:6px 12px;background:#8e44ad;color:#fff;border:none;border-radius:4px;margin-left:auto;">清空回收站</button></div>`;
  html += `<div id="recycleListContainer" style="flex:1; overflow-y:auto;">`;
  if (records.length === 0) { html += `<div style="padding:20px;text-align:center;color:#666;">回收站为空</div>`; }
  else {
    records.sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    records.forEach(rec => {
      const ts = formatTimestampToCST(rec.deletedAt);
      const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖');
      const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad');
      html += `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`;
    });
  }
  html += `</div></div><div class="modal-footer" style="justify-content:space-between;"><span style="font-size:12px;color:#666;" id="recycleStorageInfo"></span><button onclick="document.getElementById('recycleWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  win.innerHTML = html; document.body.appendChild(win);
  updateRecycleStorageInfo(); makeWindowDraggable('recycleWin'); highestZ += 1; win.style.zIndex = highestZ; updateRecycleCount();
}

function updateRecycleStorageInfo() { const span = document.getElementById('recycleStorageInfo'); if (!span) return; getRecycleBinRecords().then(allRecords => { const records = allRecords.filter(r => r.region === currentRegion); let bytes = 0; records.forEach(r => bytes += JSON.stringify(r).length * 2); const usedMB = (bytes / (1024*1024)).toFixed(2); span.textContent = `回收站占用：${usedMB} MB（共${records.length}条记录）`; }); }

async function updateRecycleCount() { const span = document.getElementById('recycleCount'); if (!span) return; try { const allRecords = await getRecycleBinRecords(); const count = allRecords.filter(r => r.region === currentRegion).length; if (count > 0) { span.textContent = count; span.style.display = 'inline-block'; } else { span.style.display = 'none'; } } catch(e) { span.style.display = 'none'; } }

function checkAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = true); }
function uncheckAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = false); }

async function restoreRecycleRecord(id) {
  if (!(await confirm('确定恢复该记录吗？'))) return;
  try {
    const records = await getRecycleBinRecords(); const record = records.find(r => r.id === id);
    if (!record) { showToast('记录不存在'); return; }
    if (record.type === 'order') { await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); }
    else if (record.type === 'report') { await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); }
    else if (record.type === 'combo') { await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp); }
    await deleteFromRecycleBin(id); addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0);
    clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('已恢复');
  } catch(e) { showToast('恢复失败'); }
}

async function permanentlyDeleteRecycleRecord(id) {
  if (!(await confirm('确定彻底删除吗？此操作不可恢复！'))) return;
  const record = await new Promise((resolve) => { const tx = db.transaction([RECYCLE_STORE_NAME], 'readonly'); const store = tx.objectStore(RECYCLE_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); });
  await deleteFromRecycleBin(id);
  if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); }
  else { addOperationLog('permanent_delete', '记录详情未知'); }
  clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('已彻底删除');
}

async function restoreCheckedRecycle() {
  const ids = []; document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定恢复选中的 ${ids.length} 条记录吗？`))) return;
  const records = await getRecycleBinRecords(); let count = 0;
  for (const id of ids) {
    const record = records.find(r => r.id === id); if (!record) continue;
    if (record.type === 'order') { await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); }
    else if (record.type === 'report') { await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); }
    else if (record.type === 'combo') { await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp); }
    addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0);
    await deleteFromRecycleBin(id); count++;
  }
  clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast(`已恢复 ${count} 条`);
}

async function deleteCheckedRecycle() {
  const ids = []; document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定彻底删除选中的 ${ids.length} 条记录吗？此操作不可恢复！`))) return;
  const records = await getRecycleBinRecords();
  for (const id of ids) { const record = records.find(r => r.id === id); if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); } }
  await batchDeleteFromRecycleBin(ids); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast(`已彻底删除 ${ids.length} 条`);
}

async function emptyRecycleBin() {
  if (!(await confirm('确定清空整个回收站吗？此操作不可恢复！'))) return;
  const pwd = await prompt("输入清空密码：","");
  if (pwd !== PASSWORD) { await alert("密码错误"); return; }
  await clearRecycleBin(currentRegion); addOperationLog('reset', '清空回收站');
  clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('回收站已清空');
}

function refreshRecycleList() { showRecycleBin(); }

// ===== 其他窗口（用户管理、卡密管理、替换预设、分类缩写） =====
function showUserManager() {
  if (document.getElementById('userManagerWin')) return;
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'userManagerWin';
  win.style.width = '450px'; win.style.height = '400px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>管理用户</h3><div class="window-controls"><button onclick="maximizeWindow('userManagerWin')">🗖</button><button onclick="document.getElementById('userManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newUserName" placeholder="用户名" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addUserAction()" style="padding:6px 12px;background:#28a745;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="userList"></div></div><div class="modal-footer"><button onclick="document.getElementById('userManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win); renderUserList(); makeWindowDraggable('userManagerWin'); highestZ += 1; win.style.zIndex = highestZ;
  document.getElementById('newUserName').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addUserAction(); } });
}

function renderUserList() { const users = getUsers(); const container = document.getElementById('userList'); if (!container) return; if (users.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无用户</div>'; return; } container.innerHTML = users.map(u => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:5px;border:1px solid #eee;border-radius:4px;"><span style="flex:1;">${u}</span><button onclick="deleteUserAction('${u}')" style="background:#e74c3c;color:#fff;border:none;padding:2px 8px;border-radius:3px;">删除</button></div>`).join(''); }

async function addUserAction() { const name = document.getElementById('newUserName')?.value.trim(); if (!name) { showToast('请输入用户名'); return; } if (addUser(name)) { document.getElementById('newUserName').value = ''; renderUserList(); updateSelects(); showToast('用户添加成功'); } }
async function deleteUserAction(name) { if (!(await confirm(`确定删除用户"${name}"及其数据吗？`))) return; deleteUser(name); renderUserList(); updateSelects(); showToast('用户已删除'); }

function showCardManager() {
  if (!isAdmin()) { showToast('需要管理员权限'); return; }
  if (document.getElementById('cardManagerWin')) return;
  const keys = getCardKeys();
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'cardManagerWin';
  win.style.width = '650px'; win.style.height = '500px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>🔑 卡密管理</h3><div class="window-controls"><button onclick="maximizeWindow('cardManagerWin')">🗖</button><button onclick="document.getElementById('cardManagerWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><input type="number" id="expireDaysInput" placeholder="有效天数" value="30" min="1" style="padding:5px;border-radius:4px;border:1px solid #ccc;width:80px;"><span>天</span><button onclick="generateCardKey()" style="padding:6px 15px;background:#28a745;color:#fff;border:none;border-radius:4px;">生成卡密</button></div><div id="cardListContainer"></div></div><div class="modal-footer"><button onclick="document.getElementById('cardManagerWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(win); renderCardList(); makeWindowDraggable('cardManagerWin'); highestZ += 1; win.style.zIndex = highestZ;
}

function renderCardList() { const keys = getCardKeys(); const container = document.getElementById('cardListContainer'); if (!container) return; if (keys.length === 0) { container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无卡密</div>'; return; } container.innerHTML = keys.map((card, idx) => { const created = card.createTime ? new Date(card.createTime).toLocaleString('zh-CN') : '未知'; const expired = card.expireDays ? `有效${card.expireDays}天` : '永久'; const statusClass = { active: 'green', disabled: 'red', expired: 'gray' }[card.status] || 'gray'; const statusText = card.status === 'active' ? '启用' : card.status === 'disabled' ? '禁用' : '过期'; return `<div style="border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-weight:bold;font-size:16px;">${card.code}</span><span style="color:${statusClass};font-size:12px;">[${statusText}]</span><span style="font-size:11px;color:#666;">创建:${created} ${expired}</span><div style="margin-left:auto;display:flex;gap:5px;">${card.status==='active'?`<button onclick="disableCard(${idx})" style="background:#f39c12;color:#fff;border:none;padding:3px 8px;border-radius:3px;">禁用</button>`:''}${card.status==='disabled'?`<button onclick="enableCard(${idx})" style="background:#2ecc71;color:#fff;border:none;padding:3px 8px;border-radius:3px;">启用</button>`:''}<button onclick="deleteCard(${idx})" style="background:#e74c3c;color:#fff;border:none;padding:3px 8px;border-radius:3px;">删除</button></div></div>`; }).join(''); }

async function generateCardKey() { const expireDays = parseInt(document.getElementById('expireDaysInput')?.value) || 30; if (expireDays < 1) { showToast('有效期至少1天'); return; } const code = generateSelfVerifyingCard(expireDays); const keys = getCardKeys(); if (keys.find(k => k.code === code)) { showToast('卡密生成冲突，请重试'); return; } keys.push({ code, status: 'active', createTime: new Date().toISOString(), expireDays }); saveCardKeys(keys); renderCardList(); showToast(`卡密 ${code} 已生成，有效期${expireDays}天`); }
async function disableCard(index) { if (!(await confirm('确定禁用该卡密？'))) return; const keys = getCardKeys(); keys[index].status = 'disabled'; saveCardKeys(keys); renderCardList(); }
async function enableCard(index) { const keys = getCardKeys(); keys[index].status = 'active'; saveCardKeys(keys); renderCardList(); }
async function deleteCard(index) { if (!(await confirm('确定删除该卡密？'))) return; const keys = getCardKeys(); keys.splice(index, 1); saveCardKeys(keys); renderCardList(); }

function showReplacePreset() {
  if(document.getElementById('replacePresetWin'))return; const p=getReplacePresets();
  const w=document.createElement('div'); w.className='floating-window'; w.id='replacePresetWin';
  w.style.width='500px'; w.style.height='450px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)';
  w.innerHTML=`<div class="modal-header"><h3>替换预设</h3><div style="display:flex;align-items:center;gap:8px;margin-left:auto;"><button onclick="resetPresetsToDefault()" title="恢复默认预设" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:28px;height:28px;border-radius:4px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">🔄</button><div class="window-controls"><button onclick="maximizeWindow('replacePresetWin')">🗖</button><button onclick="document.getElementById('replacePresetWin').remove()">×</button></div></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="presetOld" placeholder="原文字" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="presetNew" placeholder="替换为" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addReplacePreset()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="presetList"></div></div><div class="modal-footer"><button onclick="document.getElementById('replacePresetWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderPresetList(); makeWindowDraggable('replacePresetWin'); highestZ+=1; w.style.zIndex=highestZ;
  document.getElementById('presetOld').addEventListener('keypress', (e) => { if (e.key === 'Enter') { document.getElementById('presetNew').focus(); } });
  document.getElementById('presetNew').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addReplacePreset(); } });
}

function renderPresetList(){ const p=getReplacePresets(); const c=document.getElementById('presetList'); if(!c)return; c.innerHTML=p.length===0?'<div style="text-align:center;color:#666;padding:10px;">暂无替换预设</div>':p.map((x,i)=>`<div class="replace-preset-item"><span>${x.old} → ${x.new}</span><button onclick="deleteReplacePreset(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join(''); }

async function addReplacePreset(){ const o=document.getElementById('presetOld')?.value.trim(); const n=document.getElementById('presetNew')?.value.trim(); if(!o||!n){showToast('请输入原文字和替换文字');return;} const p=getReplacePresets(); if(p.some(x=>x.old===o)){showToast('已存在');return;} p.push({old:o,new:n}); localStorage.setItem('replacePresets',JSON.stringify(p)); document.getElementById('presetOld').value=''; document.getElementById('presetNew').value=''; renderPresetList(); }
async function deleteReplacePreset(i){ if(!(await confirm('确定删除？')))return; const p=getReplacePresets(); p.splice(i,1); localStorage.setItem('replacePresets',JSON.stringify(p)); renderPresetList(); }

function showCategoryAliases() {
  if(document.getElementById('categoryAliasWin'))return; const a=getCategoryAliases();
  const w=document.createElement('div'); w.className='floating-window'; w.id='categoryAliasWin';
  w.style.width='500px'; w.style.height='450px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)';
  w.innerHTML=`<div class="modal-header"><h3>分类缩写</h3><div class="window-controls"><button onclick="maximizeWindow('categoryAliasWin')">🗖</button><button onclick="document.getElementById('categoryAliasWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="aliasOld" placeholder="缩写（如 红蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="aliasNew" placeholder="正规分类（如 红波-蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addCategoryAlias()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="aliasList"></div></div><div class="modal-footer"><button onclick="document.getElementById('categoryAliasWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  document.body.appendChild(w); renderAliasList(); makeWindowDraggable('categoryAliasWin'); highestZ+=1; w.style.zIndex=highestZ;
  document.getElementById('aliasOld').addEventListener('keypress', (e) => { if (e.key === 'Enter') { document.getElementById('aliasNew').focus(); } });
  document.getElementById('aliasNew').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addCategoryAlias(); } });
}

function renderAliasList(){ const a=getCategoryAliases(); const c=document.getElementById('aliasList'); if(!c)return; c.innerHTML=a.length===0?'<div style="text-align:center;color:#666;padding:10px;">暂无分类缩写</div>':a.map((x,i)=>`<div class="replace-preset-item"><span>${x.alias} → ${x.target}</span><button onclick="deleteCategoryAlias(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join(''); }

async function addCategoryAlias(){ const alias=document.getElementById('aliasOld')?.value.trim(); const target=document.getElementById('aliasNew')?.value.trim(); if(!alias||!target){showToast('请输入缩写和目标分类');return;} const a=getCategoryAliases(); if(a.some(x=>x.alias===alias)){showToast('该缩写已存在');return;} a.push({alias,target}); a.sort((x,y)=>y.alias.length-x.alias.length); localStorage.setItem('categoryAliases',JSON.stringify(a)); document.getElementById('aliasOld').value=''; document.getElementById('aliasNew').value=''; renderAliasList(); }
async function deleteCategoryAlias(i){ if(!(await confirm('确定删除？')))return; const a=getCategoryAliases(); a.splice(i,1); localStorage.setItem('categoryAliases',JSON.stringify(a)); renderAliasList(); }

// ===== 截图函数 =====
async function screenshotRiskCard() {
  const card = document.getElementById('riskReportCard');
  if (!card) { showToast('卡片不存在'); return; }
  try {
    const clone = card.cloneNode(true);
    clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.top = '0';
    clone.style.width = card.offsetWidth + 'px'; clone.style.display = 'block'; clone.style.visibility = 'visible';
    document.body.appendChild(clone);
    const scrollDivs = clone.querySelectorAll('.table-container, [style*="overflow"]');
    const savedStyles = [];
    scrollDivs.forEach(div => {
      savedStyles.push({ div, overflow: div.style.overflow, maxHeight: div.style.maxHeight });
      div.style.overflow = 'visible'; div.style.maxHeight = 'none';
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

async function screenshotTable(tid) {
  const tbl = document.getElementById(tid);
  if (!tbl) { showToast('表格不存在'); return; }
  try {
    const canvas = await html2canvas(tbl, { backgroundColor: '#ffffff', scale: 2, logging: false });
    canvas.toBlob(async blob => {
      if (!blob) { showToast('生成图片失败'); return; }
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); } catch(e) { showToast('复制失败'); }
    }, 'image/png');
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

async function screenshotDuiJiangTable(tableId) {
  const tbl = document.getElementById(tableId);
  if (!tbl) { showToast('表格不存在'); return; }
  try {
    const canvas = await html2canvas(tbl, { backgroundColor: '#ffffff', scale: 2, logging: false });
    canvas.toBlob(async blob => {
      if (!blob) { showToast('生成图片失败'); return; }
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); } catch(e) { showToast('复制失败'); }
    }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

async function screenshotDuiJiangAll() {
  const win = document.getElementById('duiJiangWin');
  if (!win) return;
  const modalBody = win.querySelector('.modal-body');
  if (!modalBody) return;
  try {
    const origOverflow = modalBody.style.overflow;
    const origMaxHeight = modalBody.style.maxHeight;
    modalBody.style.overflow = 'visible';
    modalBody.style.maxHeight = 'none';
    const canvas = await html2canvas(modalBody, { backgroundColor: '#ffffff', scale: 2, logging: false });
    modalBody.style.overflow = origOverflow;
    modalBody.style.maxHeight = origMaxHeight;
    canvas.toBlob(async blob => {
      if (!blob) { showToast('生成图片失败'); return; }
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图全部已复制'); } catch(e) { showToast('复制失败'); }
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

// ===== 其他界面辅助函数（需要全局作用域） =====
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

async function pasteOrder() {
  try { const text = await navigator.clipboard.readText(); if (text) { const si = document.querySelector('.source-order-input'); if (si) { si.value = text; performRecognition(text); } } }
  catch(err) { showToast('无法访问剪贴板'); }
}

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

// ===== 订单统计渲染辅助 =====
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