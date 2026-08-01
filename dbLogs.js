// ===== dbLogs.js - 操作日志的写入、读取、分页、清理 =====

async function addOperationLog(action, detail, regionOverride = null, orderUser = null, orderTotal = 0) {
  if (!db) return;
  const session = getAuthSession();
  const username = session ? (session.role === 'admin' ? '管理员' : '卡密用户') : '未知';
  const now = new Date();
  const cstTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const cstTimestamp = cstTime.toISOString().replace('Z', '+08:00');
  const record = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    timestamp: cstTimestamp, user: username, action: action,
    detail: detail, orderUser: orderUser, orderTotal: orderTotal,
    region: regionOverride || currentRegion
  };
  try {
    const tx = db.transaction([LOG_STORE_NAME], 'readwrite');
    const store = tx.objectStore(LOG_STORE_NAME);
    store.add(record);
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      const allLogs = allReq.result;
      if (allLogs.length > 1000) {
        const sorted = allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const earliestDate = sorted[0].timestamp.slice(0, 10);
        sorted.forEach(log => { if (log.timestamp.slice(0, 10) === earliestDate) store.delete(log.id); });
      }
    };
  } catch (e) {}
}

async function getAllLogs() {
  return new Promise((resolve) => {
    if (!db) resolve([]);
    const tx = db.transaction([LOG_STORE_NAME], 'readonly');
    const store = tx.objectStore(LOG_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
  });
}

async function clearAllLogs() {
  return new Promise((resolve) => {
    if (!db) { resolve(false); return; }
    const tx = db.transaction([LOG_STORE_NAME], 'readwrite');
    const store = tx.objectStore(LOG_STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

async function updateLogCount() {
  const span = document.getElementById('logCount');
  if (!span) return;
  try { const logs = await getAllLogs(); span.textContent = logs.length; } catch (e) { span.textContent = '0'; }
}

async function showOperationLog() {
  if (document.getElementById('operationLogWin')) return;
  const allLogs = await getAllLogs();
  allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  window._allLogs = allLogs; window._logPage = 0; window._logPageSize = 50;
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'operationLogWin';
  win.style.width = '800px'; win.style.height = '600px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
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
  win.innerHTML = html; document.body.appendChild(win);
  makeWindowDraggable('operationLogWin'); highestZ += 1; win.style.zIndex = highestZ;
  updateLogCount(); renderLogPage();
}

function renderLogPage() {
  const container = document.getElementById('operationLogList');
  if (!container) return;
  const filter = document.getElementById('logTypeFilter')?.value || 'all';
  const dateFilter = document.getElementById('logDateFilter')?.value || '';
  let filteredLogs = window._allLogs || [];
  if (filter !== 'all') filteredLogs = filteredLogs.filter(log => log.action === filter);
  if (dateFilter) filteredLogs = filteredLogs.filter(log => log.timestamp.slice(0, 10) === dateFilter);
  const pageSize = window._logPageSize; const start = 0;
  const pageLogs = filteredLogs.slice(start, start + pageSize);
  const actionLabels = { 'save_order':'保存订单','save_report':'保存上报','delete_order':'删除订单','delete_report':'删除上报','restore':'恢复记录','permanent_delete':'彻底删除','reset':'清空数据','export':'导出数据','import':'导入数据','switch':'切换地区','login':'登录','logout':'退出登录' };
  const actionColors = { 'save_order':'log-type-save','save_report':'log-type-save','delete_order':'log-type-delete','delete_report':'log-type-delete','restore':'log-type-restore','permanent_delete':'log-type-delete','reset':'log-type-reset','export':'log-type-export','import':'log-type-export','switch':'log-type-switch','login':'log-type-login','logout':'log-type-login' };
  let html = '';
  if (pageLogs.length === 0) { html = '<div style="padding:20px;text-align:center;color:#666;">暂无操作日志</div>'; }
  else {
    pageLogs.forEach(log => {
      const ts = formatTimestampToCST(log.timestamp);
      const actionLabel = actionLabels[log.action] || log.action;
      const colorClass = actionColors[log.action] || 'log-type-login';
      const orderContent = log.detail || ''; const orderUser = log.orderUser || ''; const orderTotal = log.orderTotal || 0;
      html += `<div class="order-item log-item" data-date="${log.timestamp.slice(0,10)}" data-action="${log.action}">
        <div class="order-content">${orderContent.replace(/\n/g,'<br>')}</div>
        <div class="order-info"><span class="order-total" style="color:#000;">${orderTotal>0?'合计：'+orderTotal:''}</span>
        <span class="order-meta"><span style="color:#2980b9;">${orderUser?'用户：'+orderUser:''}</span> &nbsp; <span class="log-type-tag ${colorClass}">${actionLabel}</span> &nbsp; ${ts}</span></div></div>`;
    });
    if (start + pageSize < filteredLogs.length) {
      html += `<div style="text-align:center;padding:10px;" id="loadMoreBtn"><button onclick="loadMoreLogs()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${start+pageSize}/${filteredLogs.length}）</button></div>`;
    }
  }
  container.innerHTML = html;
}

function loadMoreLogs() {
  window._logPage = (window._logPage || 0) + 1;
  const container = document.getElementById('operationLogList'); if (!container) return;
  const filter = document.getElementById('logTypeFilter')?.value || 'all';
  const dateFilter = document.getElementById('logDateFilter')?.value || '';
  let filteredLogs = window._allLogs || [];
  if (filter !== 'all') filteredLogs = filteredLogs.filter(log => log.action === filter);
  if (dateFilter) filteredLogs = filteredLogs.filter(log => log.timestamp.slice(0, 10) === dateFilter);
  const pageSize = window._logPageSize; const currentPage = window._logPage;
  const start = currentPage * pageSize; const pageLogs = filteredLogs.slice(start, start + pageSize);
  const actionLabels = { 'save_order':'保存订单','save_report':'保存上报','delete_order':'删除订单','delete_report':'删除上报','restore':'恢复记录','permanent_delete':'彻底删除','reset':'清空数据','export':'导出数据','import':'导入数据','switch':'切换地区','login':'登录','logout':'退出登录' };
  const actionColors = { 'save_order':'log-type-save','save_report':'log-type-save','delete_order':'log-type-delete','delete_report':'log-type-delete','restore':'log-type-restore','permanent_delete':'log-type-delete','reset':'log-type-reset','export':'log-type-export','import':'log-type-export','switch':'log-type-switch','login':'log-type-login','logout':'log-type-login' };
  const oldBtn = document.getElementById('loadMoreBtn'); if (oldBtn) oldBtn.remove();
  let html = '';
  pageLogs.forEach(log => {
    const ts = formatTimestampToCST(log.timestamp);
    const actionLabel = actionLabels[log.action] || log.action;
    const colorClass = actionColors[log.action] || 'log-type-login';
    const orderContent = log.detail || ''; const orderUser = log.orderUser || ''; const orderTotal = log.orderTotal || 0;
    html += `<div class="order-item log-item" data-date="${log.timestamp.slice(0,10)}" data-action="${log.action}">
      <div class="order-content">${orderContent.replace(/\n/g,'<br>')}</div>
      <div class="order-info"><span class="order-total" style="color:#000;">${orderTotal>0?'合计：'+orderTotal:''}</span>
      <span class="order-meta"><span style="color:#2980b9;">${orderUser?'用户：'+orderUser:''}</span> &nbsp; <span class="log-type-tag ${colorClass}">${actionLabel}</span> &nbsp; ${ts}</span></div></div>`;
  });
  container.insertAdjacentHTML('beforeend', html);
  if (start + pageSize < filteredLogs.length) {
    container.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:10px;" id="loadMoreBtn"><button onclick="loadMoreLogs()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${start+pageSize}/${filteredLogs.length}）</button></div>`);
  }
}

function filterOperationLog() { window._logPage = 0; renderLogPage(); }

async function clearOperationLog() {
  if (!(await confirm('确定清除全部操作日志吗？'))) return;
  await clearAllLogs(); await updateLogCount();
  const win = document.getElementById('operationLogWin'); if (win) win.remove();
  showToast('操作日志已清除');
}