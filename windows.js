/* ===== windows.js - 弹窗 HTML 生成（识别弹窗、订单/上报记录、回收站、日志、数据库、赔率、兑奖、连肖统计、开奖记录） ===== */

// ===== 识别弹窗 =====
function showRecognizeModal() {
  if (document.getElementById('recognizeWin')) return;
  const regionLabel = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港';
  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'recognizeWin';
  win.style.width = '850px';
  win.style.height = '650px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';
  win.setAttribute('data-orig-width', '850px');
  win.setAttribute('data-orig-height', '650px');
  _dotRegion = _dotRegion || 'auto';
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
            <span onclick="setDotRegion('auto')" id="dotSmart" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="智能识别"><span style="width:7px;height:7px;border-radius:50%;"></span>智能</span>
            <span onclick="setDotRegion('macau')" id="dotMacau" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="澳门"><span style="width:7px;height:7px;border-radius:50%;"></span>澳</span>
            <span onclick="setDotRegion('hongkong')" id="dotHongkong" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="香港"><span style="width:7px;height:7px;border-radius:50%;"></span>港</span>
            <span onclick="setDotRegion('yuegang')" id="dotYuegang" style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;transition:all 0.2s;" title="粤港"><span style="width:7px;height:7px;border-radius:50%;"></span>粤</span>
          </div>
          <button class="btn btn-prefix btn-sm" onclick="showPrefixManager()">前缀</button>
          <button class="btn btn-amount-prefix btn-sm" onclick="showAmountPrefixManager()">金额前缀</button>
          <button class="btn btn-amount-prefix2 btn-sm" onclick="showAmountSuffixManager()">金额后缀</button>
        </div>
        <div class="order-input-container" style="flex:1;">
          <div class="input-column"><div class="box-label">订单输入框</div><textarea class="source-order-input" oninput="performRecognition(this.value)"></textarea></div>
          <div class="result-column"><div class="box-label">识别结果</div><div class="result-area-new"><div class="result-content" id="orderResult" contenteditable="false"></div></div></div>
        </div>
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
  document.body.appendChild(win);
  updateSelects();
  const textarea = win.querySelector('.source-order-input');
  if (textarea) {
    const draftKey = `recognizeDraft_${currentRegion}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) { textarea.value = draft; performRecognition(draft); }
    textarea.addEventListener('dragover', (e) => { e.preventDefault(); });
    textarea.addEventListener('drop', (e) => { e.preventDefault(); const data = e.dataTransfer.getData('text/plain'); if (data) { textarea.value = data; performRecognition(data); showToast('已拖入文本'); } });
  }
  makeWindowDraggable('recognizeWin');
  highestZ += 1; win.style.zIndex = highestZ;
  win.setAttribute('data-window-type', 'recognize');
  setTimeout(() => { if (typeof setDotRegion === 'function') setDotRegion(_dotRegion || 'auto'); }, 100);
  if (window.innerWidth > 768) { const container = document.getElementById('catShortcutsContainer'); if (container) container.classList.add('show'); }
}

function closeRecognizeModal() {
  const textarea = document.querySelector('.source-order-input');
  if (textarea) { const draftKey = `recognizeDraft_${currentRegion}`; localStorage.setItem(draftKey, textarea.value); }
  const win = document.getElementById('recognizeWin');
  if (win) win.remove();
}

// ===== 订单记录弹窗 =====
async function showOrderRecord(filter = 'all') {
  try {
    const recs = await getOrderRecords();
    const users = getUsers();
    const reports = await getReportOrderRecords();
    const fd = document.getElementById('filterDate')?.value;
    const fRecs = fd ? recs.filter(r => r.date === fd) : recs;
    const fReps = fd ? reports.filter(r => r.date === fd) : reports;
    if (document.getElementById('orderWin')) document.getElementById('orderWin').remove();

    const w = document.createElement('div');
    w.className = 'floating-window';
    w.id = 'orderWin';
    w.style.width = '750px';
    w.style.height = '600px';
    w.style.left = '50%';
    w.style.top = '50%';
    w.style.transform = 'translate(-50%, -50%)';

    let html = `<div class="modal-header"><h3>下单记录 <span style="font-size:12px;font-weight:normal;">(共${fRecs.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('orderWin')">🗖</button><button onclick="document.getElementById('orderWin').remove()">×</button></div></div>`;
    html += `<div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
    html += `<div style="margin-bottom:6px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;">
      <select id="recordUserFilter" onchange="showOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;">
        <option value="all" ${filter === 'all' ? 'selected' : ''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u === filter ? 'selected' : ''}>${u}</option>`);
    html += `</select>
      <button onclick="checkAll()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button>
      <button onclick="uncheckAll()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button>
      <button onclick="deleteChecked()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button>
      <span style="display:flex;align-items:center;gap:3px;margin-left:auto;">
        <span id="orderStatsContainer" style="margin-right:4px;"></span>
        <span style="display:flex;align-items:center;gap:2px;"><span>对奖:</span><input type="text" id="prizeNumberInput" maxlength="2" oninput="applyPrizeFilter()" style="padding:4px;border-radius:4px;border:1px solid #ccc;width:50px;text-align:center;"></span>
      </span>
    </div>`;
    html += `<div id="orderListContainer" style="flex:1; overflow-y:auto;">`;

    const fin = (filter === 'all') ? fRecs : fRecs.filter(r => r.user === filter);
    _orderListAllData = fin;
    _orderListPage = 0;

    if (fin.length === 0) {
      html += `<div style="padding:20px;text-align:center;color:#666;">暂无订单记录</div>`;
    } else {
      const pageSize = _orderListPageSize;
      const pageData = fin.slice(0, pageSize);
      pageData.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp);
        const ud = it.user || '未知';
        const col = getUserColor(ud);
        const ta = it.totalAmount || 0;
        let contentHtml = it.content.replace(/\n/g, '<br>');
        html += `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${contentHtml}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`;
      });
      if (fin.length > pageSize) {
        html += `<div style="text-align:center;padding:10px;" id="loadMoreOrdersBtn"><button onclick="loadMoreOrders()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`;
      }
    }
    html += `</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('orderWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;

    w.innerHTML = html;
    document.body.appendChild(w);
    makeWindowDraggable('orderWin');
    highestZ += 1;
    w.style.zIndex = highestZ;

    const uv = filter || 'all';
    const userOrders = uv === 'all' ? fRecs : fRecs.filter(r => r.user === uv);
    const userReports = uv === 'all' ? fReps : fReps.filter(r => r.user === uv);
    renderOrderStats(userOrders, userReports, uv, '');
  } catch (e) { showToast('加载失败'); }
}

function loadMoreOrders() {
  _orderListPage = (_orderListPage || 0) + 1;
  const container = document.getElementById('orderListContainer');
  if (!container) return;
  const allData = _orderListAllData || [];
  const pageSize = _orderListPageSize;
  const start = _orderListPage * pageSize;
  const pageData = allData.slice(start, start + pageSize);
  const oldBtn = document.getElementById('loadMoreOrdersBtn');
  if (oldBtn) oldBtn.remove();

  let html = '';
  pageData.forEach(it => {
    const ts = formatTimestampToCST(it.timestamp);
    const ud = it.user || '未知';
    const col = getUserColor(ud);
    const ta = it.totalAmount || 0;
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
    const record = await new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    const result = await deleteOrderRecordFromIDB(id);
    if (result) {
      if (record) {
        addOperationLog('delete_order', record.content, currentRegion, record.user, record.totalAmount || 0);
        deductPingtexiaoFromContent(record.content);
      }
      await updateTableFromRecords();
      calculateStorageUsage();
      showOrderRecord();
      updateRecycleCount();
      if (document.getElementById('lianxiaoStatsWin')) { refreshLianxiaoStats(); }
      showToast('已移入回收站');
    } else {
      showToast('删除失败，记录可能已不存在');
    }
  } catch (e) { console.error('删除订单异常', e); showToast('删除异常'); }
}

async function deleteChecked() {
  const ids = [];
  document.querySelectorAll('.order-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定要删除选中的 ${ids.length} 条记录吗？（可到回收站恢复）`))) return;
  try {
    const details = [];
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (record) details.push(record);
    }
    await batchDeleteOrderRecordFromIDB(ids);
    details.forEach(rec => {
      addOperationLog('delete_order', rec.content, currentRegion, rec.user, rec.totalAmount || 0);
      deductPingtexiaoFromContent(rec.content);
    });
    await updateTableFromRecords();
    calculateStorageUsage();
    showOrderRecord();
    updateRecycleCount();
    if (document.getElementById('lianxiaoStatsWin')) { refreshLianxiaoStats(); }
    showToast(`已将 ${ids.length} 条移入回收站`);
  } catch (e) { console.error('批量删除异常', e); showToast('批量删除异常'); }
}

function checkAll() { document.querySelectorAll('.order-check').forEach(cb => cb.checked = true); }
function uncheckAll() { document.querySelectorAll('.order-check').forEach(cb => cb.checked = false); }

function copySingleOrderById(id) {
  const el = document.querySelector(`.order-content[data-id="${id}"]`);
  if (!el) { showToast('未找到订单内容'); return; }
  navigator.clipboard.writeText(el.innerText).then(() => { showToast('已复制到剪贴板'); }).catch(() => { showToast('复制失败'); });
}

function batchCopyOrders(selector) {
  const checked = document.querySelectorAll(selector + ':checked');
  if (checked.length === 0) { showToast('请先选择订单'); return; }
  const contents = [];
  checked.forEach(cb => {
    const id = cb.dataset.id;
    if (id) {
      const el = document.querySelector(`.order-content[data-id="${id}"]`);
      if (el) contents.push(el.innerText);
    }
  });
  if (contents.length === 0) { showToast('无有效内容'); return; }
  navigator.clipboard.writeText(contents.join('\n')).then(() => { showToast(`已复制 ${contents.length} 条订单`); }).catch(() => { showToast('复制失败'); });
}

// ===== 上报记录弹窗 =====
async function showReportOrderRecord(filter = 'all') {
  try {
    const recs = await getReportOrderRecords();
    const users = getUsers();
    if (document.getElementById('reportWin')) document.getElementById('reportWin').remove();
    const fd = document.getElementById('filterDate')?.value;
    const df = fd ? recs.filter(r => r.date === fd) : recs;
    const fin = (filter === 'all') ? df : df.filter(r => r.user === filter);
    _reportListAllData = fin;
    _reportListPage = 0;

    const w = document.createElement('div');
    w.className = 'floating-window';
    w.id = 'reportWin';
    w.style.width = '700px';
    w.style.height = '500px';
    w.style.left = '50%';
    w.style.top = '50%';
    w.style.transform = 'translate(-50%, -50%)';

    let html = `<div class="modal-header"><h3>上报数据 <span style="font-size:12px;font-weight:normal;">(共${fin.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('reportWin')">🗖</button><button onclick="document.getElementById('reportWin').remove()">×</button></div></div>`;
    html += `<div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
    html += `<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;">
      <select id="reportRecordUserFilter" onchange="showReportOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;">
        <option value="all" ${filter === 'all' ? 'selected' : ''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u === filter ? 'selected' : ''}>${u}</option>`);
    html += `</select>
      <button onclick="checkAllReport()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button>
      <button onclick="uncheckAllReport()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button>
      <button onclick="deleteCheckedReport()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button>
    </div>`;
    html += `<div id="reportOrderListContainer" style="flex:1; overflow-y:auto;">`;

    if (fin.length === 0) {
      html += `<div style="padding:20px;text-align:center;color:#666;">暂无上报记录</div>`;
    } else {
      const pageSize = _orderListPageSize || 50;
      const pageData = fin.slice(0, pageSize);
      pageData.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp);
        const ud = it.user || '未知';
        const ta = it.totalAmount || 0;
        html += `<div class="order-item"><input type="checkbox" class="report-order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${it.content.replace(/\n/g, '<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:red;">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteReportOrderRecord('${it.id}')">删除</button></div>`;
      });
      if (fin.length > pageSize) {
        html += `<div style="text-align:center;padding:10px;" id="loadMoreReportsBtn"><button onclick="loadMoreReports()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`;
      }
    }
    html += `</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.report-order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('reportWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;

    w.innerHTML = html;
    document.body.appendChild(w);
    makeWindowDraggable('reportWin');
    highestZ += 1;
    w.style.zIndex = highestZ;
  } catch (e) { showToast('加载失败'); }
}

function loadMoreReports() {
  _reportListPage = (_reportListPage || 0) + 1;
  const container = document.getElementById('reportOrderListContainer');
  if (!container) return;
  const allData = _reportListAllData || [];
  const pageSize = _orderListPageSize || 50;
  const start = _reportListPage * pageSize;
  const pageData = allData.slice(start, start + pageSize);
  const oldBtn = document.getElementById('loadMoreReportsBtn');
  if (oldBtn) oldBtn.remove();

  let html = '';
  pageData.forEach(it => {
    const ts = formatTimestampToCST(it.timestamp);
    const ud = it.user || '未知';
    const ta = it.totalAmount || 0;
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
      await updateTableFromRecords();
      calculateStorageUsage();
      const userFilter = document.getElementById('reportRecordUserFilter')?.value || 'all';
      await showReportOrderRecord(userFilter);
      updateRecycleCount();
      showToast('已移入回收站');
    } else {
      showToast('删除失败，记录可能已不存在');
    }
  } catch (e) { console.error('删除上报异常', e); showToast('删除异常'); }
}

async function deleteCheckedReport() {
  const ids = [];
  document.querySelectorAll('.report-order-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定要删除选中的 ${ids.length} 条上报记录吗？（可到回收站恢复）`))) return;
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
  } catch (e) { console.error('批量删除异常', e); showToast('批量删除异常'); }
}

function checkAllReport() { document.querySelectorAll('.report-order-check').forEach(cb => cb.checked = true); }
function uncheckAllReport() { document.querySelectorAll('.report-order-check').forEach(cb => cb.checked = false); }

// ===== 回收站弹窗 =====
async function showRecycleBin() {
  const existingWin = document.getElementById('recycleWin');
  if (existingWin) existingWin.remove();

  const allRecords = await getRecycleBinRecords();
  const records = allRecords.filter(r => r.region === currentRegion);

  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'recycleWin';
  win.style.width = '750px';
  win.style.height = '550px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';

  let html = `<div class="modal-header"><h3>🗑️ 回收站</h3><div class="window-controls"><button onclick="maximizeWindow('recycleWin')">🗖</button><button onclick="document.getElementById('recycleWin').remove()">×</button></div></div>`;
  html += `<div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
  html += `<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;">
    <button onclick="checkAllRecycle()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button>
    <button onclick="uncheckAllRecycle()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button>
    <button onclick="restoreCheckedRecycle()" style="padding:6px 12px;background:#27ae60;color:#fff;border:none;border-radius:4px;">恢复选中</button>
    <button onclick="deleteCheckedRecycle()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">彻底删除</button>
    <button onclick="emptyRecycleBin()" style="padding:6px 12px;background:#8e44ad;color:#fff;border:none;border-radius:4px;margin-left:auto;">清空回收站</button>
  </div>`;
  html += `<div id="recycleListContainer" style="flex:1; overflow-y:auto;">`;

  if (records.length === 0) {
    html += `<div style="padding:20px;text-align:center;color:#666;">回收站为空</div>`;
  } else {
    records.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    records.forEach(rec => {
      const ts = formatTimestampToCST(rec.deletedAt);
      const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖');
      const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad');
      html += `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g, '<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`;
    });
  }
  html += `</div></div><div class="modal-footer" style="justify-content:space-between;"><span style="font-size:12px;color:#666;" id="recycleStorageInfo"></span><button onclick="document.getElementById('recycleWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;

  win.innerHTML = html;
  document.body.appendChild(win);
  updateRecycleStorageInfo();
  makeWindowDraggable('recycleWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
  updateRecycleCount();
}

function updateRecycleStorageInfo() {
  const span = document.getElementById('recycleStorageInfo');
  if (!span) return;
  getRecycleBinRecords().then(allRecords => {
    const records = allRecords.filter(r => r.region === currentRegion);
    let bytes = 0;
    records.forEach(r => bytes += JSON.stringify(r).length * 2);
    const usedMB = (bytes / (1024 * 1024)).toFixed(2);
    span.textContent = `回收站占用：${usedMB} MB（共${records.length}条记录）`;
  });
}

function checkAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = true); }
function uncheckAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = false); }

async function refreshRecycleList() {
  const container = document.getElementById('recycleListContainer');
  if (!container) return;
  const allRecords = await getRecycleBinRecords();
  const records = allRecords.filter(r => r.region === currentRegion);
  if (records.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">回收站为空</div>';
  } else {
    records.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    container.innerHTML = records.map(rec => {
      const ts = formatTimestampToCST(rec.deletedAt);
      const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖');
      const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad');
      return `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g, '<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`;
    }).join('');
  }
  updateRecycleStorageInfo();
  updateRecycleCount();
}

async function restoreRecycleRecord(id) {
  if (!(await confirm('确定恢复该记录吗？'))) return;
  try {
    const records = await getRecycleBinRecords();
    const record = records.find(r => r.id === id);
    if (!record) { showToast('记录不存在'); return; }
    if (record.type === 'order') {
      await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region);
    } else if (record.type === 'report') {
      await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region);
    } else if (record.type === 'combo') {
      await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp);
    }
    await deleteFromRecycleBin(id);
    addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0);
    await updateTableFromRecords();
    calculateStorageUsage();
    refreshRecycleList();
    showToast('已恢复');
  } catch (e) { showToast('恢复失败'); }
}

async function permanentlyDeleteRecycleRecord(id) {
  if (!(await confirm('确定彻底删除吗？此操作不可恢复！'))) return;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readonly');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  await deleteFromRecycleBin(id);
  if (record) {
    addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0);
  } else {
    addOperationLog('permanent_delete', '记录详情未知');
  }
  await updateTableFromRecords();
  calculateStorageUsage();
  refreshRecycleList();
  showToast('已彻底删除');
}

async function restoreCheckedRecycle() {
  const ids = [];
  document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定恢复选中的 ${ids.length} 条记录吗？`))) return;

  const records = await getRecycleBinRecords();
  let count = 0;
  for (const id of ids) {
    const record = records.find(r => r.id === id);
    if (!record) continue;
    if (record.type === 'order') {
      await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region);
    } else if (record.type === 'report') {
      await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region);
    } else if (record.type === 'combo') {
      await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp);
    }
    addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0);
    await deleteFromRecycleBin(id);
    count++;
  }
  await updateTableFromRecords();
  calculateStorageUsage();
  refreshRecycleList();
  showToast(`已恢复 ${count} 条`);
}

async function deleteCheckedRecycle() {
  const ids = [];
  document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id)));
  if (ids.length === 0) { showToast('请选择'); return; }
  if (!(await confirm(`确定彻底删除选中的 ${ids.length} 条记录吗？此操作不可恢复！`))) return;

  const records = await getRecycleBinRecords();
  for (const id of ids) {
    const record = records.find(r => r.id === id);
    if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); }
  }
  await batchDeleteFromRecycleBin(ids);
  await updateTableFromRecords();
  calculateStorageUsage();
  refreshRecycleList();
  showToast(`已彻底删除 ${ids.length} 条`);
}

async function emptyRecycleBin() {
  if (!(await confirm('确定清空整个回收站吗？此操作不可恢复！'))) return;
  const pwd = await prompt("输入清空密码：", "");
  if (pwd !== PASSWORD) { await alert("密码错误"); return; }
  await clearRecycleBin(currentRegion);
  addOperationLog('reset', '清空回收站');
  await updateTableFromRecords();
  calculateStorageUsage();
  refreshRecycleList();
  showToast('回收站已清空');
}

// ===== 操作日志弹窗 =====
async function showOperationLog() {
  if (document.getElementById('operationLogWin')) return;
  const allLogs = await getAllLogs();
  allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  _allLogs = allLogs;
  _logPage = 0;

  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'operationLogWin';
  win.style.width = '800px';
  win.style.height = '600px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';

  let html = `<div class="modal-header"><h3>📋 操作日志</h3><div class="window-controls"><button onclick="maximizeWindow('operationLogWin')">🗖</button><button onclick="document.getElementById('operationLogWin').remove()">×</button></div></div>`;
  html += `<div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 60px);">`;
  html += `<div style="margin-bottom:10px;display:flex;gap:12px;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;">
    <select id="logTypeFilter" onchange="filterOperationLog()" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;">
      <option value="all">全部操作</option><option value="save_order">保存订单</option><option value="save_report">保存上报</option>
      <option value="delete_order">删除订单</option><option value="delete_report">删除上报</option><option value="restore">恢复记录</option>
      <option value="permanent_delete">彻底删除</option><option value="reset">清空数据</option><option value="export">导出数据</option>
      <option value="import">导入数据</option><option value="switch">切换地区</option><option value="login">登录</option>
    </select>
    <input type="date" id="logDateFilter" onchange="filterOperationLog()" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;" value="${getTodayCST()}">
    <button onclick="filterOperationLog()" style="padding:4px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">筛选</button>
    <button onclick="clearOperationLog()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;margin-left:auto;">清除全部日志</button>
  </div>`;
  html += `<div id="operationLogList" style="flex:1; overflow-y:auto;"></div></div>`;

  win.innerHTML = html;
  document.body.appendChild(win);
  makeWindowDraggable('operationLogWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
  updateLogCount();
  renderLogPage();
}

function renderLogPage() {
  const container = document.getElementById('operationLogList');
  if (!container) return;
  const filter = document.getElementById('logTypeFilter')?.value || 'all';
  const dateFilter = document.getElementById('logDateFilter')?.value || '';
  let filteredLogs = _allLogs || [];
  if (filter !== 'all') filteredLogs = filteredLogs.filter(log => log.action === filter);
  if (dateFilter) filteredLogs = filteredLogs.filter(log => log.timestamp.slice(0, 10) === dateFilter);

  const pageSize = _logPageSize;
  const pageLogs = filteredLogs.slice(0, pageSize);

  const actionLabels = {
    'save_order': '保存订单', 'save_report': '保存上报', 'delete_order': '删除订单', 'delete_report': '删除上报',
    'restore': '恢复记录', 'permanent_delete': '彻底删除', 'reset': '清空数据', 'export': '导出数据',
    'import': '导入数据', 'switch': '切换地区', 'login': '登录', 'logout': '退出登录'
  };
  const actionColors = {
    'save_order': 'log-type-save', 'save_report': 'log-type-save', 'delete_order': 'log-type-delete', 'delete_report': 'log-type-delete',
    'restore': 'log-type-restore', 'permanent_delete': 'log-type-delete', 'reset': 'log-type-reset', 'export': 'log-type-export',
    'import': 'log-type-export', 'switch': 'log-type-switch', 'login': 'log-type-login', 'logout': 'log-type-login'
  };

  let html = '';
  if (pageLogs.length === 0) {
    html = '<div style="padding:20px;text-align:center;color:#666;">暂无操作日志</div>';
  } else {
    pageLogs.forEach(log => {
      const ts = formatTimestampToCST(log.timestamp);
      const actionLabel = actionLabels[log.action] || log.action;
      const colorClass = actionColors[log.action] || 'log-type-login';
      const orderContent = log.detail || '';
      const orderUser = log.orderUser || '';
      const orderTotal = log.orderTotal || 0;
      html += `<div class="order-item log-item" data-date="${log.timestamp.slice(0, 10)}" data-action="${log.action}">
        <div class="order-content">${orderContent.replace(/\n/g, '<br>')}</div>
        <div class="order-info"><span class="order-total" style="color:#000;">${orderTotal > 0 ? '合计：' + orderTotal : ''}</span>
        <span class="order-meta"><span style="color:#2980b9;">${orderUser ? '用户：' + orderUser : ''}</span> &nbsp; <span class="log-type-tag ${colorClass}">${actionLabel}</span> &nbsp; ${ts}</span></div></div>`;
    });
    if (pageSize < filteredLogs.length) {
      html += `<div style="text-align:center;padding:10px;" id="loadMoreBtn"><button onclick="loadMoreLogs()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${filteredLogs.length}）</button></div>`;
    }
  }
  container.innerHTML = html;
}

function loadMoreLogs() {
  _logPage = (_logPage || 0) + 1;
  const container = document.getElementById('operationLogList');
  if (!container) return;
  const filter = document.getElementById('logTypeFilter')?.value || 'all';
  const dateFilter = document.getElementById('logDateFilter')?.value || '';
  let filteredLogs = _allLogs || [];
  if (filter !== 'all') filteredLogs = filteredLogs.filter(log => log.action === filter);
  if (dateFilter) filteredLogs = filteredLogs.filter(log => log.timestamp.slice(0, 10) === dateFilter);

  const pageSize = _logPageSize;
  const start = _logPage * pageSize;
  const pageLogs = filteredLogs.slice(start, start + pageSize);
  const oldBtn = document.getElementById('loadMoreBtn');
  if (oldBtn) oldBtn.remove();

  const actionLabels = {
    'save_order': '保存订单', 'save_report': '保存上报', 'delete_order': '删除订单', 'delete_report': '删除上报',
    'restore': '恢复记录', 'permanent_delete': '彻底删除', 'reset': '清空数据', 'export': '导出数据',
    'import': '导入数据', 'switch': '切换地区', 'login': '登录', 'logout': '退出登录'
  };
  const actionColors = {
    'save_order': 'log-type-save', 'save_report': 'log-type-save', 'delete_order': 'log-type-delete', 'delete_report': 'log-type-delete',
    'restore': 'log-type-restore', 'permanent_delete': 'log-type-delete', 'reset': 'log-type-reset', 'export': 'log-type-export',
    'import': 'log-type-export', 'switch': 'log-type-switch', 'login': 'log-type-login', 'logout': 'log-type-login'
  };

  let html = '';
  pageLogs.forEach(log => {
    const ts = formatTimestampToCST(log.timestamp);
    const actionLabel = actionLabels[log.action] || log.action;
    const colorClass = actionColors[log.action] || 'log-type-login';
    const orderContent = log.detail || '';
    const orderUser = log.orderUser || '';
    const orderTotal = log.orderTotal || 0;
    html += `<div class="order-item log-item" data-date="${log.timestamp.slice(0, 10)}" data-action="${log.action}">
      <div class="order-content">${orderContent.replace(/\n/g, '<br>')}</div>
      <div class="order-info"><span class="order-total" style="color:#000;">${orderTotal > 0 ? '合计：' + orderTotal : ''}</span>
      <span class="order-meta"><span style="color:#2980b9;">${orderUser ? '用户：' + orderUser : ''}</span> &nbsp; <span class="log-type-tag ${colorClass}">${actionLabel}</span> &nbsp; ${ts}</span></div></div>`;
  });
  container.insertAdjacentHTML('beforeend', html);
  if (start + pageSize < filteredLogs.length) {
    container.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:10px;" id="loadMoreBtn"><button onclick="loadMoreLogs()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${start + pageSize}/${filteredLogs.length}）</button></div>`);
  }
}

function filterOperationLog() { _logPage = 0; renderLogPage(); }

async function clearOperationLog() {
  if (!(await confirm('确定清除全部操作日志吗？'))) return;
  await clearAllLogs();
  await updateLogCount();
  const win = document.getElementById('operationLogWin');
  if (win) win.remove();
  showToast('操作日志已清除');
}

// ===== 数据库弹窗 =====
const PASSWORD_ENC = "ODkxMTA1";
const PASSWORD = decodePassword(PASSWORD_ENC);

async function showDatabase() {
  const pwd = await prompt("请输入数据库密码：", "");
  if (pwd === PASSWORD) {
    const modal = document.getElementById('databaseModal');
    if (!modal) return;
    modal.style.display = 'flex';
    highestZ += 1;
    modal.style.zIndex = highestZ;
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
    const entries = Object.entries(sec.data);
    if (entries.length === 0) continue;
    html += `<div class="config-section"><div class="config-section-title" style="font-size:14px;font-weight:bold;margin-bottom:8px;">${sec.title} (${entries.length}条)</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px;">`;
    for (let [k, v] of entries) {
      html += `<div style="display:flex;justify-content:space-between;padding:4px 8px;background:#f5f6fa;border-radius:4px;font-size:12px;"><span style="color:#4a90c4;font-weight:bold;">${k}</span><span style="color:#3a7ab5;font-family:Consolas,monospace;">${v}</span></div>`;
    }
    html += '</div></div>';
  }
  content.innerHTML = html;
}

// ===== 赔率弹窗 =====
function showOddsWin() {
  if (document.getElementById('oddsWin')) return;
  const savedOdds = getOddsData();
  const defaults = {
    '特码':{odds:'47',rebate:'4'}, '特肖':{odds:'11',rebate:'4'}, '特肖本年肖':{odds:'10',rebate:'4'},
    '平特肖':{odds:'2',rebate:'4'},'平特肖带主肖':{odds:'1.8',rebate:'4'},'二连肖':{odds:'4',rebate:'4'},'二连肖带主肖':{odds:'3.5',rebate:'4'},
    '三连肖':{odds:'10',rebate:'4'},'三连肖带主肖':{odds:'9',rebate:'4'},'四连肖':{odds:'30',rebate:'4'},'四连肖带主肖':{odds:'25',rebate:'4'},
    '五连肖':{odds:'100',rebate:'4'},'五连肖带主肖':{odds:'90',rebate:'4'},'平特尾':{odds:'1.8',rebate:'4'},'平特尾零尾':{odds:'2',rebate:'4'},
    '二连尾':{odds:'3',rebate:'4'},'二连尾零尾':{odds:'3.5',rebate:'4'},'三连尾':{odds:'6',rebate:'4'},'三连尾零尾':{odds:'6.5',rebate:'4'},
    '四连尾':{odds:'14',rebate:'4'},'四连尾零尾':{odds:'15',rebate:'4'},'五连尾':{odds:'28',rebate:'4'},'五连尾零尾':{odds:'30',rebate:'4'},
    '五不中':{odds:'2',rebate:'4'},'六不中':{odds:'2.5',rebate:'4'},'七不中':{odds:'3',rebate:'4'},'八不中':{odds:'3.5',rebate:'4'},
    '九不中':{odds:'4',rebate:'4'},'十不中':{odds:'5',rebate:'4'},'十一不中':{odds:'6',rebate:'4'},'十二不中':{odds:'7',rebate:'4'},
    '二中二':{odds:'60',rebate:'4'},'三中三':{odds:'600',rebate:'4'},'平码':{odds:'7',rebate:'4'},
    '特碰':{odds:'120',rebate:'4'},
    '包红波':{odds:'2.6',rebate:'4'},'包蓝波':{odds:'2.7',rebate:'4'},'包绿波':{odds:'2.7',rebate:'4'},
    '包红单':{odds:'5',rebate:'4'},'包红双':{odds:'4.7',rebate:'4'},'包红大':{odds:'6',rebate:'4'},'包红小':{odds:'4',rebate:'4'},
    '包蓝单':{odds:'5',rebate:'4'},'包蓝双':{odds:'5',rebate:'4'},'包蓝大':{odds:'4.7',rebate:'4'},'包蓝小':{odds:'6',rebate:'4'},
    '包绿单':{odds:'5',rebate:'4'},'包绿双':{odds:'5',rebate:'4'},'包绿大':{odds:'5',rebate:'4'},'包绿小':{odds:'6',rebate:'4'},
    '包单':{odds:'1.8',rebate:'4'},'包双':{odds:'1.8',rebate:'4'},'包大':{odds:'1.8',rebate:'4'},'包小':{odds:'1.8',rebate:'4'},
    '包家禽':{odds:'1.8',rebate:'4'},'包野兽':{odds:'1.8',rebate:'4'}
  };
  const types = Object.keys(defaults);
  let rows = '';
  types.forEach(t => {
    const saved = savedOdds[t] || {};
    const oddsVal = saved.odds || defaults[t].odds;
    const rebateVal = saved.rebate || defaults[t].rebate;
    rows += `<tr><td style="text-align:center;padding:3px;"><input type="text" class="odds-input" data-type="${t}" data-field="name" value="${t}" style="width:80px;text-align:center;border:none;background:transparent;outline:none;" disabled></td><td><input type="text" class="odds-input" data-type="${t}" data-field="odds" value="${oddsVal}" style="width:60px;text-align:center;border:none;background:transparent;outline:none;" disabled></td><td><input type="text" class="odds-input" data-type="${t}" data-field="rebate" value="${rebateVal}" style="width:60px;text-align:center;border:none;background:transparent;outline:none;" disabled></td></tr>`;
  });

  const win = document.createElement('div');
  win.className = 'floating-window';
  win.id = 'oddsWin';
  win.style.width = '550px';
  win.style.height = '650px';
  win.style.left = '50%';
  win.style.top = '50%';
  win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `<div class="modal-header"><h3>赔率设置</h3><div class="window-controls"><button onclick="maximizeWindow('oddsWin')">🗖</button><button onclick="document.getElementById('oddsWin').remove()">×</button></div></div><div class="modal-body" style="overflow-y:auto;"><table style="width:100%;"><thead><tr><th style="text-align:center;">玩法</th><th style="text-align:center;">赔率</th><th style="text-align:center;">反水%</th></tr></thead><tbody>${rows}</tbody></table></div><div class="modal-footer"><button class="btn" style="background:#f39c12;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="enableOddsEdit()">修改</button><button class="btn" style="background:#28a745;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="saveOddsData()">保存</button><button class="btn" style="background:#3498db;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="resetOddsToDefault()">恢复默认</button><button class="btn" style="background:#6c757d;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="document.getElementById('oddsWin').remove()">关闭</button></div>`;
  document.body.appendChild(win);
  makeWindowDraggable('oddsWin');
  highestZ += 1;
  win.style.zIndex = highestZ;
}

function resetOddsToDefault() {
  const defaults = {
    '特码':{odds:'47',rebate:'4'}, '特肖':{odds:'11',rebate:'4'}, '特肖本年肖':{odds:'10',rebate:'4'},
    '平特肖':{odds:'2',rebate:'4'},'平特肖带主肖':{odds:'1.8',rebate:'4'},'二连肖':{odds:'4',rebate:'4'},'二连肖带主肖':{odds:'3.5',rebate:'4'},
    '三连肖':{odds:'10',rebate:'4'},'三连肖带主肖':{odds:'9',rebate:'4'},'四连肖':{odds:'30',rebate:'4'},'四连肖带主肖':{odds:'25',rebate:'4'},
    '五连肖':{odds:'100',rebate:'4'},'五连肖带主肖':{odds:'90',rebate:'4'},'平特尾':{odds:'1.8',rebate:'4'},'平特尾零尾':{odds:'2',rebate:'4'},
    '二连尾':{odds:'3',rebate:'4'},'二连尾零尾':{odds:'3.5',rebate:'4'},'三连尾':{odds:'6',rebate:'4'},'三连尾零尾':{odds:'6.5',rebate:'4'},
    '四连尾':{odds:'14',rebate:'4'},'四连尾零尾':{odds:'15',rebate:'4'},'五连尾':{odds:'28',rebate:'4'},'五连尾零尾':{odds:'30',rebate:'4'},
    '五不中':{odds:'2',rebate:'4'},'六不中':{odds:'2.5',rebate:'4'},'七不中':{odds:'3',rebate:'4'},'八不中':{odds:'3.5',rebate:'4'},
    '九不中':{odds:'4',rebate:'4'},'十不中':{odds:'5',rebate:'4'},'十一不中':{odds:'6',rebate:'4'},'十二不中':{odds:'7',rebate:'4'},
    '二中二':{odds:'60',rebate:'4'},'三中三':{odds:'600',rebate:'4'},'平码':{odds:'7',rebate:'4'},
    '特碰':{odds:'120',rebate:'4'},
    '包红波':{odds:'2.6',rebate:'4'},'包蓝波':{odds:'2.7',rebate:'4'},'包绿波':{odds:'2.7',rebate:'4'},
    '包红单':{odds:'5',rebate:'4'},'包红双':{odds:'4.7',rebate:'4'},'包红大':{odds:'6',rebate:'4'},'包红小':{odds:'4',rebate:'4'},
    '包蓝单':{odds:'5',rebate:'4'},'包蓝双':{odds:'5',rebate:'4'},'包蓝大':{odds:'4.7',rebate:'4'},'包蓝小':{odds:'6',rebate:'4'},
    '包绿单':{odds:'5',rebate:'4'},'包绿双':{odds:'5',rebate:'4'},'包绿大':{odds:'5',rebate:'4'},'包绿小':{odds:'6',rebate:'4'},
    '包单':{odds:'1.8',rebate:'4'},'包双':{odds:'1.8',rebate:'4'},'包大':{odds:'1.8',rebate:'4'},'包小':{odds:'1.8',rebate:'4'},
    '包家禽':{odds:'1.8',rebate:'4'},'包野兽':{odds:'1.8',rebate:'4'}
  };
  document.querySelectorAll('.odds-input[data-field="odds"]').forEach(inp => { const type = inp.dataset.type; if (defaults[type]) inp.value = defaults[type].odds; });
  document.querySelectorAll('.odds-input[data-field="rebate"]').forEach(inp => { const type = inp.dataset.type; if (defaults[type]) inp.value = defaults[type].rebate; });
  showToast('已恢复默认赔率，请点击保存以生效');
}

function enableOddsEdit() {
  document.querySelectorAll('.odds-input').forEach(inp => { inp.disabled = false; inp.style.border = '1px solid #ccc'; inp.style.background = '#fff'; });
  showToast('已进入编辑模式');
}

function saveOddsData() {
  const data = {};
  document.querySelectorAll('.odds-input[data-field="odds"]').forEach(inp => { const type = inp.dataset.type; if (!data[type]) data[type] = { odds: '', rebate: '4' }; data[type].odds = inp.value.trim(); });
  document.querySelectorAll('.odds-input[data-field="rebate"]').forEach(inp => { const type = inp.dataset.type; if (!data[type]) data[type] = { odds: '', rebate: '4' }; data[type].rebate = inp.value.trim(); });
  document.querySelectorAll('.odds-input[data-field="name"]').forEach(inp => { const type = inp.dataset.type; if (!data[type]) data[type] = { odds: '', rebate: '4' }; data[type].name = inp.value.trim(); });
  localStorage.setItem('comboOddsData', JSON.stringify(data));
  document.querySelectorAll('.odds-input').forEach(inp => { inp.disabled = true; inp.style.border = 'none'; inp.style.background = 'transparent'; });
  showToast('赔率已保存');
  if (document.getElementById('lianxiaoStatsWin')) refreshLianxiaoStats();
}

// ===== 兑奖窗口 =====
function showDuiJiangWin() {
  if (document.getElementById('duiJiangWin')) return;
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const issueNumber = getCurrentIssueNumber(year, fd);
  const issueDisplay = issueNumber ? `${issueNumber}期` : '';
  const storageKey = `comboDrawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
  const issueId = issueNumber ? issueNumber.toString().padStart(2, '0') : '';
  const savedEntry = savedData[issueId] || {};
  const savedNumbers = savedEntry.numbers || [];
  const isReadOnly = savedNumbers.length > 0;

  function getNumColorClass(num) { if (!num) return ''; const n = num.padStart(2, '0'); if (redNumbers.includes(n)) return 'red-text'; if (blueNumbers.includes(n)) return 'blue-text'; if (greenNumbers.includes(n)) return 'green-text'; return ''; }

  let drawTableHtml = '<div style="text-align:center; margin-bottom:4px;">录开奖：' + issueDisplay + '</div>';
  drawTableHtml += '<table style="margin:0 auto; border-collapse:collapse;"><tr>';
  for (let i = 0; i < 6; i++) { const num = savedNumbers[i] || ''; const cls = getNumColorClass(num); drawTableHtml += `<td class="pt-num-cell"><input type="text" class="draw-number-input-plain ${cls}" id="drawNum${i+1}" value="${num}" ${isReadOnly?'disabled':''} oninput="onDrawInputPlain(${i+1})" maxlength="2"></td>`; }
  drawTableHtml += '<td class="special-tag-cell">特</td>';
  const num7 = savedNumbers[6] || ''; const cls7 = getNumColorClass(num7);
  drawTableHtml += `<td class="pt-num-cell"><input type="text" class="draw-number-input-plain ${cls7}" id="drawNum7" value="${num7}" ${isReadOnly?'disabled':''} oninput="onDrawInputPlain(7)" maxlength="2"></td>`;
  drawTableHtml += '</tr><tr>';
  for (let i = 0; i < 6; i++) { const num = savedNumbers[i] || ''; const zodiac = num ? (currentZodiacMap[num.padStart(2,'0')] || '') : ''; const zCls = getZodiacColorClass(zodiac); drawTableHtml += `<td class="pt-num-cell"><span class="draw-zodiac-plain ${zCls}" id="drawZodiac${i+1}">${zodiac}</span></td>`; }
  drawTableHtml += '<td class="special-tag-cell">码</td>';
  const zodiac7 = num7 ? (currentZodiacMap[num7.padStart(2,'0')] || '') : ''; const zCls7 = getZodiacColorClass(zodiac7);
  drawTableHtml += `<td class="pt-num-cell"><span class="draw-zodiac-plain ${zCls7}" id="drawZodiac7">${zodiac7}</span></td>`;
  drawTableHtml += '</tr></table>';

  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'duiJiangWin';
  win.style.width = '900px'; win.style.height = '750px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.setAttribute('data-orig-width', '900px'); win.setAttribute('data-orig-height', '750px');
  win.innerHTML = `
    <div class="modal-header">🏆 兑奖窗口<div class="window-controls"><button onclick="maximizeWindow('duiJiangWin')">🗖</button><button onclick="document.getElementById('duiJiangWin').remove()">×</button></div></div>
    <div class="modal-body" style="overflow-y:auto; padding:10px;">
      <div class="duijiang-section-title">📋 下单统计 <span id="duiJiangOrderCount" style="font-size:11px;color:#666;margin-left:8px;"></span> <button class="btn" onclick="screenshotDuiJiangTable('duiJiangOrderTable')" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:#27ae60;color:#fff;border:none;cursor:pointer;margin-left:8px;">截图</button></div>
      <div style="overflow-x:auto;"><table class="duijiang-table" id="duiJiangOrderTable"><thead><tr><th>用户</th><th>下单金额</th><th>返水</th><th>中奖详情</th><th>盈亏</th></tr></thead><tbody id="duiJiangOrderBody"><tr><td colspan="5" style="text-align:center;color:#888;">加载中...</td></tr></tbody></table></div>
      <div class="duijiang-section-title">📤 上报统计 <button class="btn" onclick="screenshotDuiJiangTable('duiJiangReportTable')" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:#27ae60;color:#fff;border:none;cursor:pointer;margin-left:8px;">截图</button></div>
      <div style="overflow-x:auto;"><table class="duijiang-table" id="duiJiangReportTable"><thead><tr><th>用户</th><th>上报金额</th><th>返水</th><th>中奖详情</th><th>盈亏</th></tr></thead><tbody id="duiJiangReportBody"><tr><td colspan="5" style="text-align:center;color:#888;">加载中...</td></tr></tbody></table></div>
      <div class="duijiang-section-title">📊 最终合计 <button class="btn" onclick="screenshotDuiJiangTable('duiJiangFinalTable')" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:#27ae60;color:#fff;border:none;cursor:pointer;margin-left:8px;">截图</button></div>
      <div style="overflow-x:auto;"><table class="duijiang-table" id="duiJiangFinalTable"><thead><tr><th>净金额</th><th>净返水</th><th>中奖详情</th><th>净盈亏</th></tr></thead><tbody id="duiJiangFinalBody"><tr><td colspan="4" style="text-align:center;color:#888;">加载中...</td></tr></tbody></table></div>
      <div class="duijiang-section-title">🎰 录开奖</div>
      ${drawTableHtml}
      <div style="display:flex; gap:6px; margin-top:6px; justify-content:center;">
        <button class="btn" style="background:#f39c12;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="enableDrawEdit()">修改</button>
        <button class="btn" style="background:#28a745;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="saveDuiJiangDraw()">保存兑奖</button>
        <button class="btn" style="background:#8e44ad;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="showOddsWin()">赔率</button>
        <button class="btn" style="background:#3498db;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="screenshotDuiJiangAll()">截图全部</button>
      </div>
    </div>`;
  document.body.appendChild(win);
  makeWindowDraggable('duiJiangWin'); highestZ += 1; win.style.zIndex = highestZ;
  setTimeout(() => {
    for (let i = 1; i <= 7; i++) {
      const inp = document.getElementById('drawNum' + i);
      if (inp) {
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (i < 7) { const next = document.getElementById('drawNum' + (i + 1)); if (next) { next.focus(); next.select(); } }
          }
        });
      }
    }
  }, 100);
  refreshDuiJiangStats();
}

async function saveDuiJiangDraw() {
  await saveDrawNumbers();
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const issueNumber = getCurrentIssueNumber(year, fd);
  if (!issueNumber) { refreshDuiJiangStats(); return; }
  const issueId = issueNumber.toString().padStart(2, '0');
  const teMaInput = document.getElementById('drawNum7');
  const teMa = teMaInput ? teMaInput.value.trim() : '';
  let teMaFormatted = '';
  if (/^\d$/.test(teMa)) teMaFormatted = '0' + teMa;
  else if (/^\d{2}$/.test(teMa) && parseInt(teMa) >= 1 && parseInt(teMa) <= 49) teMaFormatted = teMa;
  const finalBody = document.getElementById('duiJiangFinalBody');
  let netPL = '';
  if (finalBody) {
    const cells = finalBody.querySelectorAll('td');
    if (cells.length >= 4) {
      const plCell = cells[3];
      if (plCell) { const plText = plCell.textContent.trim(); if (plText !== '' && !isNaN(parseFloat(plText))) netPL = plText; }
    }
  }
  if (teMaFormatted || netPL !== '') {
    const storageKey = `drawRecord_${currentRegion}_${year}`;
    let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
    if (!savedData[issueId]) savedData[issueId] = { number: '', pl: '' };
    if (teMaFormatted) savedData[issueId].number = teMaFormatted;
    if (netPL !== '') savedData[issueId].pl = netPL;
    localStorage.setItem(storageKey, JSON.stringify(savedData));
  }
  refreshDuiJiangStats();
}

async function screenshotDuiJiangTable(tableId) {
  const tbl = document.getElementById(tableId); if (!tbl) { showToast('表格不存在'); return; }
  try {
    const canvas = await html2canvas(tbl, { backgroundColor: '#ffffff', scale: 2, logging: false });
    canvas.toBlob(async blob => { if (!blob) { showToast('生成图片失败'); return; } try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); } catch(e) { showToast('复制失败'); } }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

async function screenshotDuiJiangAll() {
  const win = document.getElementById('duiJiangWin'); if (!win) return;
  const modalBody = win.querySelector('.modal-body'); if (!modalBody) return;
  try {
    const origOverflow = modalBody.style.overflow; const origMaxHeight = modalBody.style.maxHeight;
    modalBody.style.overflow = 'visible'; modalBody.style.maxHeight = 'none';
    const canvas = await html2canvas(modalBody, { backgroundColor: '#ffffff', scale: 2, logging: false });
    modalBody.style.overflow = origOverflow; modalBody.style.maxHeight = origMaxHeight;
    canvas.toBlob(async blob => { if (!blob) { showToast('生成图片失败'); return; } try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图全部已复制'); } catch(e) { showToast('复制失败'); } }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

// ===== 连肖统计弹窗 =====
function showLianxiaoStatsWin() {
  if (document.getElementById('lianxiaoStatsWin')) return;
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'lianxiaoStatsWin';
  win.style.width = '900px'; win.style.height = '750px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.setAttribute('data-orig-width', '900px'); win.setAttribute('data-orig-height', '750px');
  win.innerHTML = `
    <div class="modal-header">连肖统计<div class="window-controls"><button onclick="maximizeWindow('lianxiaoStatsWin')">🗖</button><button onclick="document.getElementById('lianxiaoStatsWin').remove()">×</button></div></div>
    <div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 60px);">
      <div id="lianxiaoStatsContainer" style="column-count:4; column-gap:10px; flex:1; overflow-y:auto;"></div>
      <div id="lianxiaoStatsTotal" style="text-align:center; font-weight:bold; font-size:14px; padding:8px; border-top:2px solid #333; margin-top:8px;"></div>
    </div>`;
  document.body.appendChild(win);
  makeWindowDraggable('lianxiaoStatsWin'); highestZ += 1; win.style.zIndex = highestZ;
  refreshLianxiaoStats();
}

async function clearAllComboOrders() {
  if (!(await confirm('确定清空全部其他订单吗？此操作不可恢复！'))) return;
  if (!db) return;
  const tx = db.transaction([STORE_NAME], 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const all = await new Promise(resolve => { const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); });
  const toDelete = all.filter(r => r.region === currentRegion).filter(r => {
    const lines = r.content.split('\n');
    return lines.some(line => {
      const newMatch = line.match(/^(.+?):(.+?)\s+各(?:数|组|)\s*(\d+)$/);
      if (newMatch) { const playType = normalizePlayType(newMatch[1]); return playType !== '特码'; }
      const oldMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
      return !!oldMatch;
    });
  });
  toDelete.forEach(r => store.delete(r.id));
  refreshLianxiaoStats();
  showToast('已清空全部其他订单');
}

// ===== 开奖记录弹窗 =====
async function showDrawRecord() {
  const old = document.getElementById('drawRecordWin'); if (old) old.remove();
  let year = new Date().getFullYear(); const fd = document.getElementById('filterDate')?.value; if (fd) { const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); }
  const startDate = new Date(year, 0, 1); const endDate = new Date(year, 11, 31);
  if (isNaN(startDate) || isNaN(endDate)) { showToast('日期无效'); return; }
  const rows = []; let issue = 1; const cur = new Date(startDate);
  while (cur <= endDate) { rows.push({ date: formatDateMD(cur.toISOString().slice(0,10)), issue: issue.toString().padStart(2, '0'), fullDate: cur.toISOString().slice(0,10) }); cur.setDate(cur.getDate() + 1); issue++; }
  const totalIssues = issue - 1; const groups = Math.ceil(totalIssues / 100);
  const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const monthlyPL = new Array(12).fill(0);
  for (const iid in savedData) { const entry = savedData[iid]; if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum); const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl); if (!isNaN(plVal)) monthlyPL[month] += plVal; } } }
  let totalPLSum = 0; for (let m = 0; m < 12; m++) totalPLSum += monthlyPL[m];
  let monthlyInnerHtml = '<table class="monthly-summary-table" style="width:100%;margin:0;border:none;"><tbody>';
  for (let m = 0; m < 12; m++) { const val = monthlyPL[m]; let valText = ''; if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`; monthlyInnerHtml += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m+1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`; }
  let totalText = ''; if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`;
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
      } else if (g === 3 && r >= startRow + monthlyRowsNeeded) { tableHtml += '<td></td><td></td><td></td><td></td>'; }
      else if (idx < rows.length) {
        const row = rows[idx]; const iid = row.issue; const savedEntry = savedData[iid] || {}; const savedNumber = savedEntry.number || ''; const savedPL = savedEntry.pl || '';
        const isReadOnly = !!savedNumber;
        tableHtml += `<td>${iid}期</td>`;
        const numVal = savedNumber ? savedNumber.padStart(2, '0') : ''; const numColorClass = savedNumber ? getNumberColorClass(numVal) : '';
        tableHtml += `<td><input type="text" class="draw-number-input draw-num-${iid} ${numColorClass}" value="${savedNumber}" ${isReadOnly?'disabled':''} oninput="onDrawNumberInput(this, '${iid}')" maxlength="2"></td>`;
        const zodiac = savedNumber ? (currentZodiacMap[numVal] || '') : ''; const zColorClass = getZodiacColorClass(zodiac);
        tableHtml += `<td><span class="draw-zodiac-${iid} ${zColorClass}">${zodiac}</span></td>`;
        let plColorClass = ''; if (savedPL !== '') { const plVal = parseFloat(savedPL); if (!isNaN(plVal)) { if (plVal > 0) plColorClass = ' green-text'; else if (plVal < 0) plColorClass = ' red-text'; } }
        tableHtml += `<td><input type="text" class="draw-pl-input draw-pl-${iid}${plColorClass}" value="${savedPL}" ${isReadOnly?'disabled':''} oninput="updatePlColor(this)" maxlength="7"></td>`;
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
      return tdsA.indexOf(a.closest('td')) - tdsB.indexOf(b.closest('td'));
    });
    const enabledInputs = allInputs.filter(inp => !inp.disabled);
    enabledInputs.forEach((inp, i) => { inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); const nextIdx = i + 1; if (nextIdx < enabledInputs.length) { const next = enabledInputs[nextIdx]; next.focus(); next.select(); } } }); });
  }, 200);
}

function updateRecentDrawTexts() {
  updateRecentDrawNumbers();
  updateRecentZodiacStats();
  updateFilterDateDrawInfo();
}

function updateRecentDrawNumbers() {
  const container = document.getElementById('recentDrawNumbers');
  if (!container) return;
  const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`);
  if (!countStr) { container.style.display = 'none'; return; }
  const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const currentIssue = getCurrentIssueNumber(year, fd);
  if (!currentIssue) { container.style.display = 'none'; return; }
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const entries = [];
  for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; entries.push({ num, zodiac }); } } }
  if (entries.length === 0) { container.style.display = 'none'; return; }
  let html = '';
  entries.forEach((entry, idx) => { if (idx > 0) html += '、'; html += `<span class="num ${getNumberColorClass(entry.num)}">${entry.num}</span>`; html += `<span class="slash">/</span>`; html += `<span class="${getZodiacColorClass(entry.zodiac)}">${entry.zodiac}</span>`; });
  container.innerHTML = html; container.style.display = '';
}

function updateRecentZodiacStats() {
  const container = document.getElementById('recentZodiacStats');
  if (!container) return;
  const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`);
  if (!countStr) { container.style.display = 'none'; return; }
  const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const currentIssue = getCurrentIssueNumber(year, fd);
  if (!currentIssue) { container.style.display = 'none'; return; }
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const zodiacList = [];
  for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; if (zodiac) zodiacList.push(zodiac); } } }
  if (zodiacList.length === 0) { container.style.display = 'none'; return; }
  const freq = {}; zodiacList.forEach(z => { freq[z] = (freq[z] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const repeated = []; const single = [];
  sorted.forEach(([zodiac, cnt]) => { if (cnt > 1) { repeated.push({ zodiac, cnt }); } else { single.push(zodiac); } });
  let html = '';
  repeated.forEach(item => { html += `<div>${item.cnt}次：<span class="${getZodiacColorClass(item.zodiac)}">${item.zodiac}</span></div>`; });
  if (single.length > 0) { const singleSpans = single.map(z => `<span class="${getZodiacColorClass(z)}">${z}</span>`).join('、'); html += `<div>${singleSpans}</div>`; }
  container.innerHTML = html; container.style.display = '';
}

function updateFilterDateDrawInfo() {
  const span = document.getElementById('filterDateDrawInfo');
  if (!span) return;
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const issueNumber = getCurrentIssueNumber(year, fd);
  if (!issueNumber) { span.style.display = 'none'; return; }
  const issueId = issueNumber.toString().padStart(2, '0');
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const entry = savedData[issueId];
  if (!entry || !entry.number || !entry.number.trim()) { span.style.display = 'none'; return; }
  const num = entry.number.trim().padStart(2, '0');
  if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) { span.style.display = 'none'; return; }
  const zodiac = currentZodiacMap[num] || '';
  span.innerHTML = `<span class="num ${getNumberColorClass(num)}">${num}</span><span class="slash" style="color:#000;">/</span><span class="${getZodiacColorClass(zodiac)}">${zodiac}</span>`;
  span.style.display = '';
}

function getCurrentIssueNumber(year, targetDateStr) {
  const target = new Date(targetDateStr + 'T00:00:00');
  const start = new Date(year, 0, 1);
  if (isNaN(target) || isNaN(start)) return null;
  if (target < start) return null;
  const diff = target - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return dayOfYear;
}

function getOddsData() {
  try { return JSON.parse(localStorage.getItem('comboOddsData') || '{}'); } catch (e) { return {}; }
}