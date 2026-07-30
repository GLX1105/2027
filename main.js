// ===== main.js - 系统入口，页面初始化、事件绑定、快捷键、定时器 =====

// ===== 地区切换核心逻辑 =====
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

async function switchRiskReport() {
  const val = document.getElementById('riskReportSwitcher').value;
  document.querySelectorAll('#riskTable .selected-row, #reportTable .selected-row').forEach(el => el.classList.remove('selected-row'));
  if (val === 'total') {
    document.getElementById('riskSection').style.display = '';
    document.getElementById('reportSection').style.display = 'none';
    document.getElementById('viewUserSelect').style.display = 'none';
  } else if (val === 'user') {
    document.getElementById('riskSection').style.display = '';
    document.getElementById('reportSection').style.display = 'none';
    document.getElementById('viewUserSelect').style.display = 'inline-block';
  } else if (val === 'report') {
    document.getElementById('riskSection').style.display = 'none';
    document.getElementById('reportSection').style.display = '';
  }
  await updateTableFromRecords();
}

async function changeStartZodiac() {
  const select = document.getElementById('startZodiacSelect');
  const newZodiac = select.value;
  const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马';
  if (newZodiac === savedZodiac) return;
  const inputPwd = await prompt("请输入本年生肖切换密码：", "");
  if (inputPwd !== YEAR_ZODIAC_PASSWORD) { await alert("密码错误"); select.value = savedZodiac; return; }
  localStorage.setItem('selectedStartZodiac', newZodiac);
  currentZodiacMap = buildZodiacMap(newZodiac);
  refreshAll();
}

// ===== 最大亏损计算 =====
function computeMaxLoss() {
  const data = window._cachedMaxLossData;
  if (!data || data.length === 0) return 0;

  const oddsData = getOddsData();
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  const numPayout = {};
  let totalOrderAmount = 0;

  data.forEach(item => {
    const { category, numbers, unitAmount } = item;
    if (!unitAmount || unitAmount <= 0) return;

    if (category === '特码') {
      const { odds } = getOddsForType('特码', oddsData);
      numbers.forEach(token => {
        let expanded;
        if (/^\d{1,2}$/.test(token) && parseInt(token) >= 1 && parseInt(token) <= 49) {
          expanded = [String(parseInt(token)).padStart(2, '0')];
        } else if (ZODIAC_NUMS[token]) {
          expanded = (ZODIAC_NUMS[token] || '').split(/[\s,，]+/);
        } else if (D[token]) {
          expanded = keyToAllNums(token) || [token];
        } else {
          expanded = [token];
        }
        expanded.forEach(num => {
          numPayout[num] = (numPayout[num] || 0) + unitAmount * odds;
        });
        totalOrderAmount += expanded.length * unitAmount;
      });
    }
    else if (category === '特肖') {
      numbers.forEach(zodiac => {
        const isBenming = zodiac === curYearZodiac;
        const type = isBenming ? '特肖本年肖' : '特肖';
        const { odds } = getOddsForType(type, oddsData);
        const nums = (ZODIAC_NUMS[zodiac] || '').split(/[\s,，]+/);
        const payout = unitAmount * odds;
        nums.forEach(num => {
          numPayout[num] = (numPayout[num] || 0) + payout;
        });
      });
      totalOrderAmount += numbers.length * unitAmount;
    }
  });

  if (totalOrderAmount === 0) return 0;

  let maxPayout = 0;
  for (const num in numPayout) {
    if (numPayout[num] > maxPayout) maxPayout = numPayout[num];
  }

  const rebateRate = parseFloat(document.getElementById('rebateRate')?.value) || 4;
  const maxLoss = Math.round(totalOrderAmount - totalOrderAmount * (rebateRate / 100) - maxPayout);
  return maxLoss;
}

function updateMaxLossDisplay() {
  const display = document.getElementById('maxLossDisplay');
  if (!display) return;
  const maxLoss = computeMaxLoss();
  if (maxLoss !== 0) {
    display.textContent = '最大亏损：' + maxLoss;
    display.style.display = 'inline';
  } else {
    display.textContent = '';
    display.style.display = 'none';
  }
}

// ===== 保存下单 =====
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
      hasDuplicate = true;
      duplicateRegions.push(regionLabels[region] || region);
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
      const playType = match[1];
      const content = match[2];
      const amt = parseInt(match[3]) || 0;
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
          const cleaned = match[1].replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c => c.trim());
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
            const items = content.split('-').filter(i => i.trim());
            totalAmount += items.length * amt;
          } else {
            const cleaned = content.replace(/[()]/g, '');
            const groups = cleaned.split(/\s+/).filter(c => c.trim());
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
      hasDuplicate = true;
      duplicateRegions.push(regionLabels[region] || region);
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
      const playType = match[1];
      const content = match[2];
      const amt = parseInt(match[3]) || 0;
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
          const cleaned = match[1].replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c => c.trim());
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
            const items = content.split('-').filter(i => i.trim());
            totalAmount += items.length * amt;
          } else {
            const cleaned = content.replace(/[()]/g, '');
            const groups = cleaned.split(/\s+/).filter(c => c.trim());
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

// ===== 订单记录窗口 =====
window._orderListAllData = [];
window._orderListPage = 0;
window._orderListPageSize = 50;

async function showOrderRecord(filter = 'all') {
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
      const pageSize = window._orderListPageSize; const pageData = fin.slice(0, pageSize);
      pageData.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0;
        let contentHtml = it.content.replace(/\n/g, '<br>');
        html += `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${contentHtml}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`;
      });
      if (fin.length > pageSize) { html += `<div style="text-align:center;padding:10px;" id="loadMoreOrdersBtn"><button onclick="loadMoreOrders()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`; }
    }
    html += `</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('orderWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
    w.innerHTML = html; document.body.appendChild(w); makeWindowDraggable('orderWin'); highestZ += 1; w.style.zIndex = highestZ;
    const uv = filter || 'all';
    const userOrders = uv === 'all' ? fRecs : fRecs.filter(r => r.user === uv);
    const userReports = uv === 'all' ? fReps : fReps.filter(r => r.user === uv);
    renderOrderStats(userOrders, userReports, uv, '');
  } catch (e) { showToast('加载失败'); }
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
  } catch (e) { console.error('删除订单异常', e); showToast('删除异常'); }
}

async function deleteChecked() {
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
  } catch (e) { console.error('批量删除异常', e); showToast('批量删除异常'); }
}

function copySingleOrderById(id) { const el = document.querySelector(`.order-content[data-id="${id}"]`); if (!el) { showToast('未找到订单内容'); return; } navigator.clipboard.writeText(el.innerText).then(() => { showToast('已复制到剪贴板'); }).catch(() => { showToast('复制失败'); }); }
function batchCopyOrders(selector) { const checked = document.querySelectorAll(selector + ':checked'); if (checked.length === 0) { showToast('请先选择订单'); return; } const contents = []; checked.forEach(cb => { const id = cb.dataset.id; if (id) { const el = document.querySelector(`.order-content[data-id="${id}"]`); if (el) contents.push(el.innerText); } }); if (contents.length === 0) { showToast('无有效内容'); return; } navigator.clipboard.writeText(contents.join('\n')).then(() => { showToast(`已复制 ${contents.length} 条订单`); }).catch(() => { showToast('复制失败'); }); }
function checkAll() { document.querySelectorAll('.order-check').forEach(cb => cb.checked = true); }
function uncheckAll() { document.querySelectorAll('.order-check').forEach(cb => cb.checked = false); }

// ===== 上报记录窗口 =====
async function showReportOrderRecord(filter = 'all') {
  try {
    const recs = await getReportOrderRecords(), users = getUsers();
    if (document.getElementById('reportWin')) document.getElementById('reportWin').remove();
    const fd = document.getElementById('filterDate')?.value;
    const df = fd ? recs.filter(r => r.date === fd) : recs;
    const fin = (filter === 'all') ? df : df.filter(r => r.user === filter);
    window._reportListAllData = fin; window._reportListPage = 0;
    const w = document.createElement('div'); w.className = 'floating-window'; w.id = 'reportWin';
    w.style.width = '700px'; w.style.height = '500px'; w.style.left = '50%'; w.style.top = '50%'; w.style.transform = 'translate(-50%, -50%)';
    let html = `<div class="modal-header"><h3>上报数据 <span style="font-size:12px;font-weight:normal;">(共${fin.length}单)</span></h3><div class="window-controls"><button onclick="maximizeWindow('reportWin')">🗖</button><button onclick="document.getElementById('reportWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; height: calc(100% - 120px);">`;
    html += `<div style="margin-bottom:10px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;position:sticky;top:0;background:rgba(255,255,255,0.9);z-index:2;padding:5px 0;"><select id="reportRecordUserFilter" onchange="showReportOrderRecord(this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;"><option value="all" ${filter==='all'?'selected':''}>全部用户</option>`;
    users.forEach(u => html += `<option value="${u}" ${u===filter?'selected':''}>${u}</option>`);
    html += `</select><button onclick="checkAllReport()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">全选</button><button onclick="uncheckAllReport()" style="padding:6px 12px;background:#6c757d;color:#fff;border:none;border-radius:4px;">取消全选</button><button onclick="deleteCheckedReport()" style="padding:6px 12px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">批量删除</button></div>`;
    html += `<div id="reportOrderListContainer" style="flex:1; overflow-y:auto;">`;
    if (fin.length === 0) html += `<div style="padding:20px;text-align:center;color:#666;">暂无上报记录</div>`;
    else {
      const pageSize = window._orderListPageSize || 50; const pageData = fin.slice(0, pageSize);
      pageData.forEach(it => {
        const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', ta = it.totalAmount || 0;
        html += `<div class="order-item"><input type="checkbox" class="report-order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${it.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:red;">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteReportOrderRecord('${it.id}')">删除</button></div>`;
      });
      if (fin.length > pageSize) { html += `<div style="text-align:center;padding:10px;" id="loadMoreReportsBtn"><button onclick="loadMoreReports()" style="padding:6px 20px;background:#007bff;color:#fff;border:none;border-radius:4px;cursor:pointer;">加载更多（${pageSize}/${fin.length}）</button></div>`; }
    }
    html += `</div></div><div class="modal-footer"><button onclick="batchCopyOrders('.report-order-check')" style="padding:8px 16px;background:#8e44ad;color:#fff;border:none;border-radius:4px;">批量复制</button><button onclick="document.getElementById('reportWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
    w.innerHTML = html; document.body.appendChild(w); makeWindowDraggable('reportWin'); highestZ += 1; w.style.zIndex = highestZ;
  } catch (e) { showToast('加载失败'); }
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
  } catch (e) { console.error('删除上报异常', e); showToast('删除异常'); }
}

async function deleteCheckedReport() {
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

// ===== 清空按钮逻辑 =====
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
  } catch (e) {} finally { resetLock = false; }
}

// ===== 拖拽选择（表格行） =====
window.dragSelectionActive = false;
function enableRowDragSelect(tableId) {
  const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody');
  if (!tbody) return;
  let startRow = null; let endRow = null;
  function clearSelection() { tbody.querySelectorAll('tr.selected-row').forEach(tr => tr.classList.remove('selected-row')); }
  function selectRows(row1, row2) { if (!row1 || !row2) return; const rows = Array.from(tbody.querySelectorAll('tr')); const idx1 = rows.indexOf(row1); const idx2 = rows.indexOf(row2); if (idx1 === -1 || idx2 === -1) return; const minIdx = Math.min(idx1, idx2); const maxIdx = Math.max(idx1, idx2); for (let i = minIdx; i <= maxIdx; i++) { rows[i].classList.add('selected-row'); } }
  tbody.addEventListener('mousedown', (e) => { if (e.button !== 0) return; if (e.ctrlKey || e.shiftKey) return; const targetRow = e.target.closest('tr'); if (!targetRow) return; window.dragSelectionActive = true; clearSelection(); startRow = targetRow; endRow = targetRow; targetRow.classList.add('selected-row'); e.preventDefault(); });
  document.addEventListener('mousemove', (e) => { if (!window.dragSelectionActive) return; const target = document.elementFromPoint(e.clientX, e.clientY); if (!target) return; const tr = target.closest('tr'); if (!tr || tr.parentElement !== tbody) return; if (tr !== endRow) { endRow = tr; clearSelection(); selectRows(startRow, endRow); } });
  document.addEventListener('mouseup', () => { if (window.dragSelectionActive) { window.dragSelectionActive = false; startRow = null; endRow = null; } });
  let longPressTimer = null; let longPressTriggered = false; let touchStartY = 0; let touchStartX = 0;
  tbody.addEventListener('touchstart', (e) => { const targetRow = e.target.closest('tr'); if (!targetRow) return; longPressTriggered = false; touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; if (longPressTimer) clearTimeout(longPressTimer); longPressTimer = setTimeout(() => { longPressTriggered = true; window.dragSelectionActive = true; clearSelection(); startRow = targetRow; endRow = targetRow; targetRow.classList.add('selected-row'); }, 1000); }, { passive: true });
  tbody.addEventListener('touchmove', (e) => { if (!longPressTriggered) { const dy = Math.abs(e.touches[0].clientY - touchStartY); const dx = Math.abs(e.touches[0].clientX - touchStartX); if (dy > 10 || dx > 10) { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } } return; } if (!window.dragSelectionActive) return; e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY); if (!target) return; const tr = target.closest('tr'); if (!tr || tr.parentElement !== tbody) return; if (tr !== endRow) { endRow = tr; clearSelection(); selectRows(startRow, endRow); } }, { passive: false });
  tbody.addEventListener('touchend', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } if (window.dragSelectionActive) { window.dragSelectionActive = false; startRow = null; endRow = null; } longPressTriggered = false; });
}

// ===== 数据导出 =====
async function exportData() {
  try {
    const orders = await getAllOrdersUnfiltered(); const reports = await getAllReportsUnfiltered();
    const logs = await getAllLogs(); const recycleRecords = await getRecycleBinRecords();
    const comboRecords = await getComboOrders();
    const drawRecords = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('drawRecord_')) { drawRecords[key] = localStorage.getItem(key); } }
    const comboDrawRecords = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('comboDrawRecord_')) { comboDrawRecords[key] = localStorage.getItem(key); } }
    const pingtexiao = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('pingtexiao_')) { pingtexiao[key] = localStorage.getItem(key); } }
    const pingtexiaoHighlights = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('ptHighlight_')) { pingtexiaoHighlights[key] = localStorage.getItem(key); } }
    const users = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('users_')) { users[key] = localStorage.getItem(key); } }
    const presets = localStorage.getItem('replacePresets') || '[]'; const aliases = localStorage.getItem('categoryAliases') || '[]'; const oddsData = localStorage.getItem('comboOddsData') || '{}';
    const data = { version: 7, orders, reports, logs, recycleRecords, comboRecords, drawRecords, comboDrawRecords, pingtexiao, pingtexiaoHighlights, users, replacePresets: JSON.parse(presets), categoryAliases: JSON.parse(aliases), oddsData: JSON.parse(oddsData), exportTime: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `港澳识别数据_全部_${getTodayCST()}.json`;
    const a = document.createElement('a'); a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    addOperationLog('export', '导出全部数据（含日志/回收站/用户/配置/连肖）');
    showToast('导出成功：' + fileName); showStorageDrawerTemporary(5000);
  } catch (e) { showToast('导出失败'); }
}

// ===== 数据导入 =====
async function importData() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) { document.body.removeChild(inp); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.orders || !data.reports) { showToast('无效格式'); document.body.removeChild(inp); return; }
        if (!data.version || data.version < 7) { const cf = await confirm(`备份文件版本（${data.version || '未知'}）低于当前版本（7），导入可能导致数据异常，是否继续？`); if (!cf) { document.body.removeChild(inp); return; } }
        const recycleCount = data.recycleRecords ? data.recycleRecords.length : 0;
        const comboCount = data.comboRecords ? data.comboRecords.length : 0;
        const userCount = data.users ? Object.keys(data.users).length : 0;
        const pingtexiaoCount = data.pingtexiao ? Object.keys(data.pingtexiao).length : 0;
        const highlightCount = data.pingtexiaoHighlights ? Object.keys(data.pingtexiaoHighlights).length : 0;
        const totalToImport = data.orders.length + data.reports.length + (data.drawRecords ? Object.keys(data.drawRecords).length : 0) + (data.comboDrawRecords ? Object.keys(data.comboDrawRecords).length : 0) + pingtexiaoCount + highlightCount + recycleCount + comboCount + userCount + (data.replacePresets ? data.replacePresets.length : 0) + (data.categoryAliases ? data.categoryAliases.length : 0);
        if (totalToImport === 0) { showToast('文件中没有数据'); document.body.removeChild(inp); return; }
        let confirmMsg = `文件包含 ${data.orders.length} 条订单，${data.reports.length} 条上报，${data.logs ? data.logs.length : 0} 条日志，${recycleCount} 条回收站记录，${comboCount} 条连肖订单，${userCount} 组用户数据。是否导入？`;
        const cf = await confirm(confirmMsg); if (!cf) { document.body.removeChild(inp); return; }
        const eo = await getAllOrdersUnfiltered(); const er = await getAllReportsUnfiltered(); const eco = await getComboOrders();
        let so = 0, no = 0;
        for (const r of data.orders) { const region = r.region || currentRegion; const dup = eo.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if (dup) { so++; continue; } try { await saveOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.timestamp, region); no++; } catch (e) { console.error('导入订单失败', e); } }
        let sr = 0, nr = 0;
        for (const r of data.reports) { const region = r.region || currentRegion; const dup = er.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if (dup) { sr++; continue; } try { await saveReportOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.timestamp, region); nr++; } catch (e) { console.error('导入上报失败', e); } }
        let sco = 0, nco = 0;
        if (data.comboRecords && Array.isArray(data.comboRecords)) { for (const r of data.comboRecords) { const region = r.region || currentRegion; const dup = eco.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if (dup) { sco++; continue; } try { await saveComboOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.comboType || '', r.timestamp); nco++; } catch (e) { console.error('导入连肖订单失败', e); } } }
        if (data.logs && Array.isArray(data.logs)) { const existingLogs = await getAllLogs(); const existingIds = new Set(existingLogs.map(l => l.id)); for (const log of data.logs) { if (!existingIds.has(log.id)) { await new Promise((resolve) => { const tx = db.transaction([LOG_STORE_NAME], 'readwrite'); const store = tx.objectStore(LOG_STORE_NAME); store.add(log); tx.oncomplete = () => resolve(); }); } } }
        if (data.recycleRecords && Array.isArray(data.recycleRecords)) { const existingRecycle = await getRecycleBinRecords(); const existingRecycleIds = new Set(existingRecycle.map(r => r.id)); for (const rec of data.recycleRecords) { if (!existingRecycleIds.has(rec.id)) { await new Promise((resolve) => { const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); store.add(rec); tx.oncomplete = () => resolve(); }); } } }
        if (data.users) { for (const [key, value] of Object.entries(data.users)) { if (!localStorage.getItem(key)) { localStorage.setItem(key, value); } } }
        let dcImported = 0; if (data.drawRecords) { for (const [key, value] of Object.entries(data.drawRecords)) { const existing = localStorage.getItem(key); if (existing) { try { const existingData = JSON.parse(existing); const newData = JSON.parse(value); let changed = false; for (const [issue, entry] of Object.entries(newData)) { if (existingData[issue] && existingData[issue].number && existingData[issue].number.trim()) { if (entry.pl !== undefined && entry.pl !== '') { existingData[issue].pl = entry.pl; changed = true; } } else { existingData[issue] = entry; changed = true; } } if (changed) { localStorage.setItem(key, JSON.stringify(existingData)); dcImported++; } } catch (e) { localStorage.setItem(key, value); dcImported++; } } else { localStorage.setItem(key, value); dcImported++; } } }
        let comboDrawImported = 0; if (data.comboDrawRecords) { for (const [key, value] of Object.entries(data.comboDrawRecords)) { if (!localStorage.getItem(key)) { localStorage.setItem(key, value); comboDrawImported++; } } }
        let ptImported = 0, ptSkipped = 0; if (data.pingtexiao) { for (const [key, value] of Object.entries(data.pingtexiao)) { if (localStorage.getItem(key)) { ptSkipped++; } else { localStorage.setItem(key, value); ptImported++; } } }
        let hlImported = 0; if (data.pingtexiaoHighlights) { for (const [key, value] of Object.entries(data.pingtexiaoHighlights)) { localStorage.setItem(key, value); hlImported++; } }
        if (data.oddsData) { if (!localStorage.getItem('comboOddsData')) { localStorage.setItem('comboOddsData', JSON.stringify(data.oddsData)); } }
        let presetImported = 0, aliasImported = 0;
        if (data.replacePresets && Array.isArray(data.replacePresets)) { const currentPresets = getReplacePresets(); data.replacePresets.forEach(p => { if (!currentPresets.some(x => x.old === p.old)) { currentPresets.push(p); presetImported++; } }); localStorage.setItem('replacePresets', JSON.stringify(currentPresets)); }
        if (data.categoryAliases && Array.isArray(data.categoryAliases)) { const currentAliases = getCategoryAliases(); data.categoryAliases.forEach(a => { if (!currentAliases.some(x => x.alias === a.alias)) { currentAliases.push(a); aliasImported++; } }); localStorage.setItem('categoryAliases', JSON.stringify(currentAliases)); }
        await updateTableFromRecords(); calculateStorageUsage(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision();
        addOperationLog('import', `导入${no + nr + nco}条订单/上报/连肖记录`);
        let msg = `成功导入 ${no + nr + nco} 条记录，${dcImported} 组开奖记录，${comboDrawImported} 组录开奖记录，${recycleCount} 条回收站记录，${comboCount} 条连肖订单，${userCount} 组用户数据。`;
        if (ptImported > 0) msg += `\n导入平特肖数据 ${ptImported} 组。`;
        if (ptSkipped > 0) msg += `\n跳过平特肖数据 ${ptSkipped} 组（已存在）。`;
        if (hlImported > 0) msg += `\n导入平特肖高亮标记 ${hlImported} 组。`;
        if (presetImported > 0) msg += `\n新增 ${presetImported} 条替换预设。`;
        if (aliasImported > 0) msg += `\n新增 ${aliasImported} 条分类缩写。`;
        if (so + sr + sco > 0) msg += `\n跳过 ${so + sr + sco} 条重复记录。`;
        showToast(msg); document.body.removeChild(inp); showStorageDrawerTemporary(5000);
      } catch (err) { showToast('导入失败'); document.body.removeChild(inp); }
    };
    reader.onerror = () => { showToast('读取失败'); document.body.removeChild(inp); };
    reader.readAsText(file);
  };
  inp.addEventListener('cancel', () => { document.body.removeChild(inp); });
  inp.click();
}

// ===== 解析超额文本（截断阈值解析） =====
let currentParseMethod = parseInt(localStorage.getItem('savedParseMethod') || '0');
function parseExcessText(text, method) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const items = [];
  for (const line of lines) { const match = line.match(/(\d{2})各(\d+)米/); if (match) { items.push({ num: match[1], amount: parseInt(match[2]) }); } }
  if (items.length === 0) return '';
  items.sort((a, b) => b.amount - a.amount);
  const parseItems = (method) => {
    const data = items.map(item => ({ ...item }));
    const result = [];
    if (method === 0) {
      while (data.some(d => d.amount > 0)) { const maxAmount = Math.max(...data.map(d => d.amount)); if (maxAmount <= 0) break; const group = []; for (const d of data) { if (d.amount > 0 && (maxAmount - d.amount) <= maxAmount * 0.4) { group.push(d.num); } } const groupAmount = Math.min(...group.map(n => data.find(d => d.num === n).amount)); for (const n of group) { const d = data.find(d => d.num === n); d.amount -= groupAmount; } result.push(`${group.join('-')}各数${groupAmount}`); }
    } else if (method === 1) {
      while (data.some(d => d.amount > 0)) { let bestAmount = 0; let bestCount = 0; for (let i = 0; i < data.length; i++) { const candidate = data[i].amount; if (candidate <= 0) continue; let count = 0; for (const d of data) { if (d.amount >= candidate) count++; } if (count > bestCount || (count === bestCount && candidate < bestAmount)) { bestCount = count; bestAmount = candidate; } } if (bestCount === 0) break; const group = []; for (const d of data) { if (d.amount >= bestAmount) { group.push(d.num); d.amount -= bestAmount; } } result.push(`${group.join('-')}各数${bestAmount}`); }
    } else if (method === 2) {
      const levels = [50, 10, 5, 2, 1]; for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } }
    } else if (method === 3) {
      for (let lv = 100; lv >= 1; lv--) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } }
    } else if (method === 4) {
      const levels = []; for (let lv = 100; lv >= 5; lv -= 5) levels.push(lv); levels.push(3, 2, 1); for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } }
    }
    return result.join('\n');
  };
  return parseItems(method);
}
function switchParseMethod() { const text = document.getElementById('reportCapInfo').innerText; if (!text || text === '无超出的号码') { showToast('当前没有超额文本'); document.getElementById('parseResultArea').innerText = ''; return; } const result = parseExcessText(text, currentParseMethod); document.getElementById('parseResultArea').innerText = result; const methodNames = ['聚类分组', '贪心合并', '固定50→10→5→2→1', '100递减', '固定100→...→1']; showToast(`当前方案：${methodNames[currentParseMethod]}`); currentParseMethod = (currentParseMethod + 1) % 5; localStorage.setItem('savedParseMethod', currentParseMethod); }
function copyOrderGroup() { const text = document.getElementById('parseResultArea').innerText; if (!text) { showToast('没有解析结果'); return; } navigator.clipboard.writeText(text).then(() => showToast('订单组已复制')); }

// ===== 连肖统计窗口 =====
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

// ===== 回收站窗口 =====
async function showRecycleBin() {
  const existingWin = document.getElementById('recycleWin'); if (existingWin) existingWin.remove();
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
    records.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    records.forEach(rec => {
      const ts = formatTimestampToCST(rec.deletedAt); const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖'); const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad');
      html += `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`;
    });
  }
  html += `</div></div><div class="modal-footer" style="justify-content:space-between;"><span style="font-size:12px;color:#666;" id="recycleStorageInfo"></span><button onclick="document.getElementById('recycleWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`;
  win.innerHTML = html; document.body.appendChild(win); updateRecycleStorageInfo();
  makeWindowDraggable('recycleWin'); highestZ += 1; win.style.zIndex = highestZ;
  updateRecycleCount();
}

function updateRecycleStorageInfo() { const span = document.getElementById('recycleStorageInfo'); if (!span) return; getRecycleBinRecords().then(allRecords => { const records = allRecords.filter(r => r.region === currentRegion); let bytes = 0; records.forEach(r => bytes += JSON.stringify(r).length * 2); const usedMB = (bytes / (1024 * 1024)).toFixed(2); span.textContent = `回收站占用：${usedMB} MB（共${records.length}条记录）`; }); }
function checkAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = true); }
function uncheckAllRecycle() { document.querySelectorAll('.recycle-check').forEach(cb => cb.checked = false); }

async function refreshRecycleList() { const container = document.getElementById('recycleListContainer'); if (!container) return; const allRecords = await getRecycleBinRecords(); const records = allRecords.filter(r => r.region === currentRegion); if (records.length === 0) { container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">回收站为空</div>'; } else { records.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)); container.innerHTML = records.map(rec => { const ts = formatTimestampToCST(rec.deletedAt); const typeLabel = rec.type === 'order' ? '下单' : (rec.type === 'report' ? '上报' : '连肖'); const typeColor = rec.type === 'order' ? '#3498db' : (rec.type === 'report' ? '#e67e22' : '#8e44ad'); return `<div class="order-item"><input type="checkbox" class="recycle-check" data-id="${rec.id}"><div class="order-content">${rec.content.replace(/\n/g,'<br>')}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${rec.totalAmount || 0}</span><span class="order-meta"><span style="color:${typeColor};">类型：${typeLabel}</span><span style="color:#e74c3c;">删除：${ts}</span><span>用户：${rec.user || '未知'}</span></span></div><button class="order-del" onclick="restoreRecycleRecord('${rec.id}')" style="background:#27ae60;margin-right:4px;">恢复</button><button class="order-del" onclick="permanentlyDeleteRecycleRecord('${rec.id}')">删除</button></div>`; }).join(''); } updateRecycleStorageInfo(); updateRecycleCount(); }

async function restoreRecycleRecord(id) { if (!(await confirm('确定恢复该记录吗？'))) return; try { const records = await getRecycleBinRecords(); const record = records.find(r => r.id === id); if (!record) { showToast('记录不存在'); return; } if (record.type === 'order') { await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'report') { await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'combo') { await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp); } await deleteFromRecycleBin(id); addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('已恢复'); } catch (e) { showToast('恢复失败'); } }
async function permanentlyDeleteRecycleRecord(id) { if (!(await confirm('确定彻底删除吗？此操作不可恢复！'))) return; const record = await new Promise((resolve) => { const tx = db.transaction([RECYCLE_STORE_NAME], 'readonly'); const store = tx.objectStore(RECYCLE_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); await deleteFromRecycleBin(id); if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); } else { addOperationLog('permanent_delete', '记录详情未知'); } clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('已彻底删除'); }
async function restoreCheckedRecycle() { const ids = []; document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id))); if (ids.length === 0) { showToast('请选择'); return; } if (!(await confirm(`确定恢复选中的 ${ids.length} 条记录吗？`))) return; const records = await getRecycleBinRecords(); let count = 0; for (const id of ids) { const record = records.find(r => r.id === id); if (!record) continue; if (record.type === 'order') { await saveOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'report') { await saveReportOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, record.timestamp, record.region); } else if (record.type === 'combo') { await saveComboOrderRecordToIDB(record.content, record.user, record.date, record.totalAmount || 0, 'combo', record.timestamp); } addOperationLog('restore', record.content, record.region, record.user, record.totalAmount || 0); await deleteFromRecycleBin(id); count++; } clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast(`已恢复 ${count} 条`); }
async function deleteCheckedRecycle() { const ids = []; document.querySelectorAll('.recycle-check:checked').forEach(cb => ids.push(String(cb.dataset.id))); if (ids.length === 0) { showToast('请选择'); return; } if (!(await confirm(`确定彻底删除选中的 ${ids.length} 条记录吗？此操作不可恢复！`))) return; const records = await getRecycleBinRecords(); for (const id of ids) { const record = records.find(r => r.id === id); if (record) { addOperationLog('permanent_delete', record.content, record.region, record.user, record.totalAmount || 0); } } await batchDeleteFromRecycleBin(ids); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast(`已彻底删除 ${ids.length} 条`); }
async function emptyRecycleBin() { if (!(await confirm('确定清空整个回收站吗？此操作不可恢复！'))) return; const pwd = await prompt("输入清空密码：", ""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearRecycleBin(currentRegion); addOperationLog('reset', '清空回收站'); clearStatsCache(); await updateTableFromRecords(); calculateStorageUsage(); refreshRecycleList(); showToast('回收站已清空'); }

// ===== 开奖记录窗口 =====
async function showDrawRecord() { const old = document.getElementById('drawRecordWin'); if (old) old.remove(); let year = new Date().getFullYear(); const fd = document.getElementById('filterDate')?.value; if (fd) { const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); } const startDate = new Date(year, 0, 1); const endDate = new Date(year, 11, 31); if (isNaN(startDate) || isNaN(endDate)) { showToast('日期无效'); return; } const rows = []; let issue = 1; const cur = new Date(startDate); while (cur <= endDate) { rows.push({ date: formatDateMD(cur.toISOString().slice(0, 10)), issue: issue.toString().padStart(2, '0'), fullDate: cur.toISOString().slice(0, 10) }); cur.setDate(cur.getDate() + 1); issue++; } const totalIssues = issue - 1; const groups = Math.ceil(totalIssues / 100); const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const monthlyPL = new Array(12).fill(0); for (const iid in savedData) { const entry = savedData[iid]; if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum); const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl); if (!isNaN(plVal)) monthlyPL[month] += plVal; } } } let totalPLSum = 0; for (let m = 0; m < 12; m++) totalPLSum += monthlyPL[m]; let monthlyInnerHtml = '<table class="monthly-summary-table" style="width:100%;margin:0;border:none;"><tbody>'; for (let m = 0; m < 12; m++) { const val = monthlyPL[m]; let valText = ''; if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`; monthlyInnerHtml += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m+1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`; } let totalText = ''; if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`; monthlyInnerHtml += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`; monthlyInnerHtml += '</tbody></table>'; let tableHtml = '<div class="draw-table-wrap"><table class="draw-table"><thead><tr>'; for (let g = 0; g < groups; g++) { tableHtml += '<th>期号</th><th>号码</th><th>生肖</th><th>盈亏</th>'; } tableHtml += '</tr></thead><tbody>'; const monthlyRowsNeeded = 13; const startRow = 87; for (let r = 0; r < 100; r++) { tableHtml += '<tr>'; for (let g = 0; g < groups; g++) { const idx = g * 100 + r; if (g === 3 && r >= startRow && r < startRow + monthlyRowsNeeded) { if (r === startRow) { tableHtml += `<td colspan="4" rowspan="${monthlyRowsNeeded}" style="vertical-align:top;padding:2px;">${monthlyInnerHtml}</td>`; } } else if (g === 3 && r >= startRow + monthlyRowsNeeded) { tableHtml += '<td></td><td></td><td></td><td></td>'; } else if (idx < rows.length) { const row = rows[idx]; const iid = row.issue; const savedEntry = savedData[iid] || {}; const savedNumber = savedEntry.number || ''; const savedPL = savedEntry.pl || ''; const isReadOnly = !!savedNumber; tableHtml += `<td>${iid}期</td>`; const numVal = savedNumber ? savedNumber.padStart(2, '0') : ''; const numColorClass = savedNumber ? getNumberColorClass(numVal) : ''; const inputDisabled = isReadOnly ? 'disabled' : ''; tableHtml += `<td><input type="text" class="draw-number-input draw-num-${iid} ${numColorClass}" value="${savedNumber}" ${inputDisabled} oninput="onDrawNumberInput(this, '${iid}')" maxlength="2"></td>`; const zodiac = savedNumber ? (currentZodiacMap[numVal] || '') : ''; const zColorClass = getZodiacColorClass(zodiac); tableHtml += `<td><span class="draw-zodiac-${iid} ${zColorClass}">${zodiac}</span></td>`; let plColorClass = ''; if (savedPL !== '') { const plVal = parseFloat(savedPL); if (!isNaN(plVal)) { if (plVal > 0) plColorClass = ' green-text'; else if (plVal < 0) plColorClass = ' red-text'; } } tableHtml += `<td><input type="text" class="draw-pl-input draw-pl-${iid}${plColorClass}" value="${savedPL}" ${inputDisabled} oninput="updatePlColor(this)" maxlength="7"></td>`; } else { tableHtml += '<td></td><td></td><td></td><td></td>'; } } tableHtml += '</tr>'; } tableHtml += '</tbody></table></div>'; const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'drawRecordWin'; win.style.width = Math.min(groups * 170 + 40, window.innerWidth - 20) + 'px'; win.style.height = '650px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)'; const savedCount = localStorage.getItem(`recentDrawCount_${currentRegion}`) || ''; const regionLabel = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港'; win.innerHTML = `<div class="modal-header"><h3>开奖记录（${regionLabel} ${year}年阳历）</h3><div class="window-controls"><button onclick="maximizeWindow('drawRecordWin')">🗖</button><button onclick="document.getElementById('drawRecordWin').remove()">×</button></div></div><div class="modal-body" style="display:flex; flex-direction:column; gap:10px;"><div class="card" style="flex:1; display:flex; flex-direction:column;"><div class="card-title" style="display:flex; align-items:center; gap:8px;"><span>开奖号码记录</span><input type="number" id="recentDrawCountInput" placeholder="留空不显示" value="${savedCount}" style="width:60px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;font-size:13px;"><button class="btn btn-primary" onclick="saveRecentDrawCount()" style="padding:4px 12px;font-size:12px;min-height:28px;">保存</button></div><div style="overflow:auto; flex:1;">${tableHtml}</div></div><div style="display:flex; gap:10px; justify-content:center; padding:10px;"><button class="btn btn-primary" onclick="editDrawRecord()">修改</button><button class="btn btn-save-order" onclick="saveDrawRecord(${year})">保存</button><button class="btn btn-danger" onclick="clearAllDrawRecords(${year})" style="background:#e74c3c;color:#fff;">清空全部</button></div></div>`; document.body.appendChild(win); makeWindowDraggable('drawRecordWin'); highestZ += 1; win.style.zIndex = highestZ; updateRecentDrawTexts(); setTimeout(() => { const allNumInputs = win.querySelectorAll('.draw-number-input'); const allPlInputs = win.querySelectorAll('.draw-pl-input'); const allInputs = [...allNumInputs, ...allPlInputs].sort((a, b) => { const trA = a.closest('tr'); const trB = b.closest('tr'); const rows = [...win.querySelectorAll('.draw-table tbody tr')]; if (trA !== trB) return rows.indexOf(trA) - rows.indexOf(trB); const tdsA = [...trA.querySelectorAll('td')]; const tdsB = [...trB.querySelectorAll('td')]; const tdA = a.closest('td'); const tdB = b.closest('td'); return tdsA.indexOf(tdA) - tdsB.indexOf(tdB); }); const enabledInputs = allInputs.filter(inp => !inp.disabled); enabledInputs.forEach((inp, i) => { inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); const nextIdx = i + 1; if (nextIdx < enabledInputs.length) { const next = enabledInputs[nextIdx]; next.focus(); next.select(); } } }); }); }, 200); }
function updatePlColor(input) { const match = input.className.match(/draw-pl-(\d+)/); const issueClass = match ? match[0] : ''; const val = input.value.trim(); let colorClass = ''; if (val !== '' && val !== '-') { const num = parseFloat(val); if (!isNaN(num)) { if (num > 0) colorClass = ' green-text'; else if (num < 0) colorClass = ' red-text'; } } input.className = 'draw-pl-input' + (issueClass ? ' ' + issueClass : '') + colorClass; }
async function clearAllDrawRecords(year) { if (!(await confirm(`确定清空${currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港'} ${year}年全部开奖号码吗？此操作不可恢复！`))) return; const storageKey = `drawRecord_${currentRegion}_${year}`; localStorage.removeItem(storageKey); showToast('已清空'); showDrawRecord(); updateRecentDrawTexts(); renderSmartDecision(); }
function onDrawNumberInput(input, issueId) { let val = input.value.replace(/\D/g, ''); if (val.length > 2) val = val.slice(0, 2); input.value = val; const zodiacSpan = document.querySelector(`.draw-zodiac-${issueId}`); if (!zodiacSpan) return; if (val.length === 2) { const num = val.padStart(2, '0'); const intVal = parseInt(num); if (intVal >= 1 && intVal <= 49) { const zodiac = currentZodiacMap[num] || ''; zodiacSpan.textContent = zodiac; zodiacSpan.className = `draw-zodiac-${issueId} ${getZodiacColorClass(zodiac)}`; input.className = `draw-number-input draw-num-${issueId} ${getNumberColorClass(num)}`; return; } } zodiacSpan.textContent = ''; zodiacSpan.className = `draw-zodiac-${issueId}`; input.className = `draw-number-input draw-num-${issueId}`; }
function editDrawRecord() { document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = false); document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = false); showToast('已进入编辑模式'); }
async function saveDrawRecord(year) { const data = {}; const plInputs = document.querySelectorAll('.draw-pl-input'); plInputs.forEach(input => { const issueId = input.className.match(/draw-pl-(\d+)/)?.[1]; if (issueId) { data[issueId] = { number: '', pl: input.value.trim() }; } }); const numberInputs = document.querySelectorAll('.draw-number-input'); numberInputs.forEach(input => { const issueId = input.className.match(/draw-num-(\d+)/)?.[1]; if (issueId) { let num = input.value.trim(); if (/^\d$/.test(num)) num = '0' + num; if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) num = ''; if (!data[issueId]) data[issueId] = { number: num, pl: '' }; else data[issueId].number = num; } }); const storageKey = `drawRecord_${currentRegion}_${year}`; localStorage.setItem(storageKey, JSON.stringify(data)); document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = true); document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = true); const monthlyPL = new Array(12).fill(0); for (const iid in data) { const entry = data[iid]; if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const issueNum = parseInt(iid); const issueDate = new Date(year, 0, issueNum); const month = issueDate.getMonth(); const plVal = parseFloat(entry.pl); if (!isNaN(plVal)) monthlyPL[month] += plVal; } } } const summaryTable = document.querySelector('.monthly-summary-table'); if (summaryTable) { let html = '<tbody>'; let totalPLSum = 0; for (let m = 0; m < 12; m++) { const val = monthlyPL[m]; totalPLSum += val; let valText = ''; if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`; else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`; html += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m+1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`; } let totalText = ''; if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`; else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`; html += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`; html += '</tbody>'; summaryTable.innerHTML = html; } updateRecentDrawTexts(); renderSmartDecision(); showToast('保存成功'); }
function saveRecentDrawCount() { const input = document.getElementById('recentDrawCountInput'); if (!input) return; const rawVal = input.value.trim(); if (rawVal === '') { localStorage.removeItem(`recentDrawCount_${currentRegion}`); updateRecentDrawTexts(); renderSmartDecision(); showToast('已清空期数设置'); return; } const val = parseInt(rawVal); if (isNaN(val) || val < 1) { showToast('请输入有效的期数'); return; } localStorage.setItem(`recentDrawCount_${currentRegion}`, val.toString()); updateRecentDrawTexts(); renderSmartDecision(); showToast(`已设置显示最近${val}期`); }
function updateRecentDrawTexts() { updateRecentDrawNumbers(); updateRecentZodiacStats(); updateFilterDateDrawInfo(); }
function updateRecentDrawNumbers() { const container = document.getElementById('recentDrawNumbers'); if (!container) return; const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; } const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; } const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; } const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const entries = []; for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; entries.push({ num, zodiac }); } } } if (entries.length === 0) { container.style.display = 'none'; return; } let html = ''; entries.forEach((entry, idx) => { if (idx > 0) html += '、'; html += `<span class="num ${getNumberColorClass(entry.num)}">${entry.num}</span>`; html += `<span class="slash">/</span>`; html += `<span class="${getZodiacColorClass(entry.zodiac)}">${entry.zodiac}</span>`; }); container.innerHTML = html; container.style.display = ''; }
function updateRecentZodiacStats() { const container = document.getElementById('recentZodiacStats'); if (!container) return; const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; } const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; } const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; } const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const zodiacList = []; for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; if (zodiac) zodiacList.push(zodiac); } } } if (zodiacList.length === 0) { container.style.display = 'none'; return; } const freq = {}; zodiacList.forEach(z => { freq[z] = (freq[z] || 0) + 1; }); const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]); const repeated = []; const single = []; sorted.forEach(([zodiac, cnt]) => { if (cnt > 1) { repeated.push({ zodiac, cnt }); } else { single.push(zodiac); } }); let html = ''; repeated.forEach(item => { html += `<div>${item.cnt}次：<span class="${getZodiacColorClass(item.zodiac)}">${item.zodiac}</span></div>`; }); if (single.length > 0) { const singleSpans = single.map(z => `<span class="${getZodiacColorClass(z)}">${z}</span>`).join('、'); html += `<div>${singleSpans}</div>`; } container.innerHTML = html; container.style.display = ''; }
function updateFilterDateDrawInfo() { const span = document.getElementById('filterDateDrawInfo'); if (!span) return; const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const issueNumber = getCurrentIssueNumber(year, fd); if (!issueNumber) { span.style.display = 'none'; return; } const issueId = issueNumber.toString().padStart(2, '0'); const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const entry = savedData[issueId]; if (!entry || !entry.number || !entry.number.trim()) { span.style.display = 'none'; return; } const num = entry.number.trim().padStart(2, '0'); if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) { span.style.display = 'none'; return; } const zodiac = currentZodiacMap[num] || ''; span.innerHTML = `<span class="num ${getNumberColorClass(num)}">${num}</span><span class="slash" style="color:#000;">/</span><span class="${getZodiacColorClass(zodiac)}">${zodiac}</span>`; span.style.display = ''; }

// ===== 平特肖表格渲染 =====
function renderPingtexiaoTable() { const container = document.getElementById('pingtexiaoTableContainer'); if (!container) return; const data = getPingtexiaoData(); const leftZodiacs = ['鼠','牛','虎','兔','龙','蛇']; const rightZodiacs = ['马','羊','猴','鸡','狗','猪']; const zcm = {'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; let html = '<table class="freq-table"><thead><tr>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '</tr></thead><tbody>'; for (let r = 0; r < 6; r++) { html += '<tr>'; [leftZodiacs[r], rightZodiacs[r]].forEach(zodiac => { const d = data[zodiac] || { amount: '', report: '' }; const amountVal = d.amount !== undefined && d.amount !== '' && parseFloat(d.amount) !== 0 ? d.amount : ''; const reportVal = d.report !== undefined && d.report !== '' && parseFloat(d.report) !== 0 ? d.report : ''; const remainVal = (amountVal !== '') ? (parseFloat(amountVal) - (reportVal !== '' ? parseFloat(reportVal) : 0)) : 0; const remain = remainVal !== 0 ? remainVal : ''; html += `<td class="${zcm[zodiac] || ''}">${zodiac}</td>`; html += `<td><input type="number" class="pt-edit-input amount-red-text" data-zodiac="${zodiac}" data-field="amount" value="${amountVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`; html += `<td><input type="number" class="pt-edit-input pt-report-text" data-zodiac="${zodiac}" data-field="report" value="${reportVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`; html += `<td style="font-size:12px;">${remain !== '' ? remain : ''}</td>`; }); html += '</tr>'; } html += '</tbody></table>'; container.innerHTML = html; updatePingtexiaoTotal(); }
function finishPtEdit(input) { if (input.hasAttribute('readonly')) return; input.setAttribute('readonly', 'readonly'); input.style.border = '1px solid transparent'; input.style.background = 'transparent'; updatePtRemain(input); savePingtexiaoCell(); }
function updatePtRemain(input) { const row = input.closest('tr'); if (!row) return; const zodiac = input.dataset.zodiac; const cells = row.cells; let amountVal = '', reportVal = ''; for (let i = 0; i < cells.length; i++) { const amountInput = cells[i].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="amount"]`); if (amountInput) { amountVal = amountInput.value.trim(); const reportInput = cells[i+1].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="report"]`); if (reportInput) reportVal = reportInput.value.trim(); const remainCell = cells[i+2]; if (remainCell) { const a = amountVal !== '' ? parseFloat(amountVal) : 0; const r = reportVal !== '' ? parseFloat(reportVal) : 0; remainCell.textContent = amountVal !== '' ? (a - r) : ''; } break; } } updatePingtexiaoTotal(); }
function savePingtexiaoCell() { const data = getPingtexiaoData(); document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].amount = input.value.trim(); }); document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].report = input.value.trim(); }); savePingtexiaoData(data); updatePingtexiaoTotal(); }
function updatePingtexiaoTotal() { let amountTotal = 0, reportTotal = 0; document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) amountTotal += v; }); document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) reportTotal += v; }); const amountBox = document.getElementById('ptAmountTotalBox'); const amountSpan = document.getElementById('ptAmountTotal'); const reportBox = document.getElementById('ptReportTotalBox'); const reportSpan = document.getElementById('ptReportTotal'); if (amountBox && amountSpan) { if (amountTotal > 0) { amountSpan.textContent = amountTotal; amountBox.style.display = 'inline-flex'; } else { amountBox.style.display = 'none'; } } if (reportBox && reportSpan) { if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; } } }

// ===== 连肖统计核心 =====
async function refreshLianxiaoStats() {
  const container = document.getElementById('lianxiaoStatsContainer');
  if (!container) return;
  if (!db) { container.innerHTML = '数据库不可用'; return; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  const tx = db.transaction([STORE_NAME], 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const all = await new Promise(resolve => { const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); });
  const allOrders = all.filter(r => r.region === currentRegion && r.date === fd);
  const records = [];
  allOrders.forEach(order => {
    const lines = order.content.split('\n');
    lines.forEach(line => {
      const newMatch = line.match(/^(.+?):(.+?)\s+各(?:数|组|)\s*(\d+)$/);
      if (newMatch) { const playType = normalizePlayType(newMatch[1]); if (playType !== '特码') { records.push({ content: line, user: order.user, date: order.date }); } return; }
      const oldMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
      if (oldMatch) { records.push({ content: line, user: order.user, date: order.date }); }
    });
  });
  if (records.length === 0) { container.innerHTML = '<div style="color:#666;text-align:center;padding:10px;">暂无其他订单数据</div>'; document.getElementById('lianxiaoStatsTotal').innerHTML = ''; return; }
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  let drawNumbers = []; let drawZodiacs = [];
  const fdYear = fd.substring(0, 4);
  let storageKey = `comboDrawRecord_${currentRegion}_${fdYear}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  if (Object.keys(savedData).length === 0) { storageKey = `drawRecord_${currentRegion}_${fdYear}`; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} }
  const currentIssue = getCurrentIssueNumber(parseInt(fdYear), fd);
  if (currentIssue) { const issueId = currentIssue.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.numbers && Array.isArray(entry.numbers)) { entry.numbers.forEach(n => { if (n && /^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) { drawNumbers.push(n); const zodiac = currentZodiacMap[n] || ''; if (zodiac) drawZodiacs.push(zodiac); } }); } else if (entry && entry.number && entry.number.trim()) { const n = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) { drawNumbers.push(n); const zodiac = currentZodiacMap[n] || ''; if (zodiac) drawZodiacs.push(zodiac); } } }
  const drawZodiacsSet = new Set(drawZodiacs); const drawNumbersSet = new Set(drawNumbers); const drawNumbersZhengma = drawNumbers.slice(0, 6);
  const stats = {}; let grandTotal = 0; let orderCountLianxiao = records.length;
  records.forEach(rec => {
    const line = rec.content;
    const newMatch = line.match(/^(.+?):(.+?)\s+(各(?:组|))\s*(\d+)$/);
    if (newMatch) {
      const playType = normalizePlayType(newMatch[1]); const content = newMatch[2]; const amount = parseInt(newMatch[4]) || 0;
      if (playType === '特肖') { const zodiacs = content.split('-').filter(z => z.trim()); zodiacs.forEach(z => { if (!stats['特肖']) stats['特肖'] = { withYear: new Map(), withoutYear: new Map() }; const hasYear = z === curYearZodiac; const target = hasYear ? stats['特肖'].withYear : stats['特肖'].withoutYear; target.set(z, (target.get(z) || 0) + amount); grandTotal += amount; }); return; }
      if (playType === '特碰' || playType === '二中二') { const comboType = playType === '特碰' ? 'tePeng' : 'zhong2'; const cleaned = content.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim()); if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; combos.forEach(c => { stats[comboType].withYear.set(c, (stats[comboType].withYear.get(c) || 0) + amount); grandTotal += amount; }); return; }
      if (playType.startsWith('包')) { const attr = content.trim(); if (!attr || !D[attr]) return; if (!stats['bao']) stats['bao'] = { withYear: new Map(), withoutYear: new Map() }; stats['bao'].withYear.set(attr, (stats['bao'].withYear.get(attr) || 0) + amount); grandTotal += amount; return; }
      const groups = content.split(/\s+/);
      groups.forEach(group => {
        const rawGroup = group.replace(/^\(|\)$/g, ''); const tokens = rawGroup.split('-');
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') { tokens.forEach(token => { const comboType = playType === '平特肖' ? 'pingtexiao' : (playType === '平特尾' ? 'pingtewei' : 'pingma'); if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const cleanToken = token.trim(); if (comboType === 'pingtexiao') { const hasYear = cleanToken === curYearZodiac; (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(cleanToken, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(cleanToken) || 0) + amount); } else if (comboType === 'pingtewei') { const hasZero = cleanToken.replace('尾', '') === '0'; (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(cleanToken, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(cleanToken) || 0) + amount); } else { stats[comboType].withYear.set(cleanToken, (stats[comboType].withYear.get(cleanToken) || 0) + amount); } grandTotal += amount; }); }
        else if (tokens.every(t => /^[\u4e00-\u9fa5]$/.test(t) && ZODIAC_NUMS[t])) { const comboType = `lianxiao${tokens.length}`; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const hasYear = tokens.some(t => t === curYearZodiac); const comboKey = tokens.join('-'); (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount); grandTotal += amount; }
        else if (tokens.every(t => /^\d+尾$/.test(t))) { const comboType = `lianwei${tokens.length}`; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const hasZero = tokens.some(t => t.replace('尾', '') === '0'); const comboKey = tokens.join('-'); (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount); grandTotal += amount; }
        else if (tokens.every(t => /^\d{2}$/.test(t))) { const comboType = tokens.length === 1 ? 'pingma' : (tokens.length === 2 ? 'zhong2' : (tokens.length === 3 ? 'zhong3' : 'buzhong' + tokens.length)); if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const comboKey = tokens.join('-'); stats[comboType].withYear.set(comboKey, (stats[comboType].withYear.get(comboKey) || 0) + amount); grandTotal += amount; }
      });
      return;
    }
    const oldMatch = line.match(/^(.+?)\s*(?:各组|各)\s*(\d+)$/);
    if (!oldMatch) return; const content = oldMatch[1]; const amount = parseInt(oldMatch[2]) || 0;
    const groups = content.split(/\s+/);
    groups.forEach(group => {
      const rawGroup = group.replace(/^\(|\)$/g, ''); const tokens = rawGroup.split('-');
      if (tokens.length === 1 && ZODIAC_NUMS[tokens[0]]) { const comboType = 'pingtexiao'; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const hasYear = tokens[0] === curYearZodiac; (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(tokens[0], ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(tokens[0]) || 0) + amount); grandTotal += amount; }
      else if (tokens.length === 1 && tokens[0].includes('尾')) { const comboType = 'pingtewei'; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const hasZero = tokens[0].replace('尾', '') === '0'; (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(tokens[0], ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(tokens[0]) || 0) + amount); grandTotal += amount; }
      else if (tokens.some(t => ZODIAC_NUMS[t])) { const comboType = `lianxiao${tokens.length}`; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const hasYear = tokens.some(t => t === curYearZodiac); const comboKey = tokens.join('-'); (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount); grandTotal += amount; }
      else if (tokens.some(t => t.includes('尾'))) { const comboType = `lianwei${tokens.length}`; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const hasZero = tokens.some(t => t.replace('尾', '') === '0'); const comboKey = tokens.join('-'); (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount); grandTotal += amount; }
      else { const comboType = tokens.length === 1 ? 'pingma' : (tokens.length === 2 ? 'zhong2' : (tokens.length === 3 ? 'zhong3' : 'buzhong' + tokens.length)); if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() }; const comboKey = tokens.join('-'); stats[comboType].withYear.set(comboKey, (stats[comboType].withYear.get(comboKey) || 0) + amount); grandTotal += amount; }
    });
  });
  const oddsData = getOddsData(); const defaults = { '特码': { odds: 47, rebate: 4 }, '特肖': { odds: 11, rebate: 4 }, '特肖本年肖': { odds: 10, rebate: 4 }, 'pingtexiao': { odds: 2, rebate: 4 }, 'pingtexiao带主肖': { odds: 1.8, rebate: 4 }, 'lianxiao2': { odds: 4, rebate: 4 }, 'lianxiao2带主肖': { odds: 3.5, rebate: 4 }, 'lianxiao3': { odds: 10, rebate: 4 }, 'lianxiao3带主肖': { odds: 9, rebate: 4 }, 'lianxiao4': { odds: 30, rebate: 4 }, 'lianxiao4带主肖': { odds: 25, rebate: 4 }, 'lianxiao5': { odds: 100, rebate: 4 }, 'lianxiao5带主肖': { odds: 90, rebate: 4 }, 'pingtewei': { odds: 1.8, rebate: 4 }, 'pingtewei零尾': { odds: 2, rebate: 4 }, 'lianwei2': { odds: 3, rebate: 4 }, 'lianwei2零尾': { odds: 3.5, rebate: 4 }, 'lianwei3': { odds: 6, rebate: 4 }, 'lianwei3零尾': { odds: 6.5, rebate: 4 }, 'lianwei4': { odds: 14, rebate: 4 }, 'lianwei4零尾': { odds: 15, rebate: 4 }, 'lianwei5': { odds: 28, rebate: 4 }, 'lianwei5零尾': { odds: 30, rebate: 4 }, 'buzhong5': { odds: 2, rebate: 4 }, 'buzhong6': { odds: 2.5, rebate: 4 }, 'buzhong7': { odds: 3, rebate: 4 }, 'buzhong8': { odds: 3.5, rebate: 4 }, 'buzhong9': { odds: 4, rebate: 4 }, 'buzhong10': { odds: 5, rebate: 4 }, 'buzhong11': { odds: 6, rebate: 4 }, 'buzhong12': { odds: 7, rebate: 4 }, 'zhong2': { odds: 60, rebate: 4 }, 'zhong3': { odds: 600, rebate: 4 }, 'pingma': { odds: 7, rebate: 4 }, 'tePeng': { odds: 120, rebate: 4 } };
  function getPlayOdds(type, hasSpecial) { let key = type; if (hasSpecial && type === 'pingtexiao') key = 'pingtexiao带主肖'; else if (hasSpecial && type.startsWith('lianxiao')) key = type + '带主肖'; else if (hasSpecial && type === 'pingtewei') key = 'pingtewei零尾'; else if (hasSpecial && type.startsWith('lianwei')) key = type + '零尾'; const saved = oddsData[key] || {}; return { odds: parseFloat(saved.odds) || defaults[key]?.odds || 1, rebate: parseFloat(saved.rebate) || defaults[key]?.rebate || 4 }; }
  let grandPL = 0; const cardsArray = []; const order = ['特肖', 'tePeng', 'pingtexiao', 'lianxiao2', 'lianxiao3', 'lianxiao4', 'lianxiao5', 'buzhong5', 'buzhong6', 'buzhong7', 'buzhong8', 'buzhong9', 'buzhong10', 'buzhong11', 'buzhong12', 'pingma', 'pingtewei', 'lianwei2', 'lianwei3', 'lianwei4', 'lianwei5', 'zhong2', 'zhong3', 'bao'];
  order.forEach((type) => { if (!stats[type]) return; const data = stats[type]; const cardId = `comboCard_${type}`; let totalGroups = 0, totalAmount = 0, cardPL = 0, totalHitAmount = 0; const isBao = (type === 'bao'); const isTePeng = (type === 'tePeng'); let tablesHtml = '';
    function renderTable(map, hasSpecial) { if (map.size === 0) return ''; let html2 = ''; const headerLabel = isBao ? '属性' : (isTePeng ? '组合' : (type === '特肖' || type.startsWith('lianxiao') || type === 'pingtexiao' ? '生肖' : (type.includes('wei') ? '尾数' : '组合'))); html2 += '<table style="width:100%;"><tr><th style="text-align:center;">' + headerLabel + '</th><th style="text-align:center;">金额</th><th style="text-align:center;">中奖</th><th style="text-align:center;">盈亏</th></tr>'; map.forEach((v, k) => { const displayKey = k.replace(/^\(|\)$/g, ''); const tokens = displayKey.split('-'); let hit = false; let odds, rebate; if (isBao) { const baoType = '包' + displayKey; const baoOdds = getOddsForType(baoType, oddsData); odds = baoOdds.odds; rebate = baoOdds.rebate; if (drawNumbers.length > 0 && D[displayKey]) { const attrNums = (D[displayKey] || '').split(/[\s,，]+/).filter(n => n.trim()); const teMa = drawNumbers[6] || ''; hit = attrNums.includes(teMa); } } else if (isTePeng) { const baoOdds = getOddsForType('特碰', oddsData); odds = baoOdds.odds; rebate = baoOdds.rebate; if (drawNumbers.length > 0) { const teMa = drawNumbers[6] || ''; hit = (tokens.length === 2 && tokens[0].padStart(2, '0') === teMa && drawNumbersZhengma.includes(tokens[1].padStart(2, '0'))); } } else { const { odds: o, rebate: r } = getPlayOdds(type, hasSpecial); odds = o; rebate = r; if (type === '特肖') { const teMaZodiac = drawZodiacs.length > 0 ? (currentZodiacMap[drawNumbers[6]] || '') : ''; hit = teMaZodiac === k; } else if (type === 'pingtexiao') { hit = drawZodiacsSet.has(k); } else if (type === 'pingtewei') { hit = drawZodiacs.length > 0 && tokens.some(t => { const d = t.replace('尾', ''); for (let i = 0; i <= 4; i++) { const n = (i * 10 + parseInt(d)).toString().padStart(2, '0'); if (drawNumbersSet.has(n)) return true; } return false; }); } else if (type === 'pingma' || type === 'zhong2' || type === 'zhong3') { const zhengma = drawNumbers.slice(0, 6); hit = tokens.every(t => zhengma.includes(t)); } else if (type.startsWith('buzhong')) { hit = !tokens.some(t => drawNumbersSet.has(t)); } else if (type.startsWith('lianxiao')) { hit = tokens.every(t => drawZodiacsSet.has(t)); } else if (type.startsWith('lianwei')) { hit = tokens.every(t => { const d = t.replace('尾', ''); for (let i = 0; i <= 4; i++) { const n = (i * 10 + parseInt(d)).toString().padStart(2, '0'); if (drawNumbersSet.has(n)) return true; } return false; }); } } let pl = 0; if (drawZodiacs.length > 0 || drawNumbers.length > 0) { if (type === '特肖') { pl = hit ? (v - v * (rebate / 100) - v * odds) : (v - v * (rebate / 100)); } else { pl = hit ? (v - v * (rebate / 100) - v * odds) : (v - v * (rebate / 100)); } } cardPL += pl; if (hit) totalHitAmount += v; html2 += `<tr><td style="text-align:center;">${displayKey}</td><td style="text-align:center;">${v}</td><td style="text-align:center;">${hit ? `<span class="amount-red-text">${v}</span>` : ''}</td><td style="text-align:center;${pl > 0 ? 'color:#27ae60;' : (pl < 0 ? 'color:#e74c3c;' : '')}">${pl !== 0 ? Math.round(pl) : ''}</td></tr>`; totalGroups++; totalAmount += v; }); html2 += '</table>'; return html2; }
    if (type === '特肖') { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 本命年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 普通生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type === 'pingtexiao') { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含本年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 其他生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type === 'pingtewei') { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含0尾 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 其他尾数 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type.startsWith('lianxiao')) { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含本年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 不含本年生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type.startsWith('lianwei')) { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含0尾 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 不含0尾 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else { if (data.withYear.size > 0) { tablesHtml += renderTable(data.withYear, false); } }
    grandPL += cardPL; const roundedCardPL = Math.round(cardPL); let cardBgStyle = ''; if (drawZodiacs.length > 0 || drawNumbers.length > 0) { if (cardPL <= -500) cardBgStyle = 'background:#fff0f0;'; else if (cardPL < 0) cardBgStyle = 'background:#fff8f8;'; else if (cardPL > 500) cardBgStyle = 'background:#f0fff0;'; else if (cardPL > 0) cardBgStyle = 'background:#f8fff8;'; }
    let cardLabel = isBao ? '包' : (isTePeng ? '特碰' : (type === 'zhong2' ? '二中二' : (type === 'zhong3' ? '三中三' : getComboTypeLabel(type))));
    let cardHtml = `<div class="freq-card" id="${cardId}" style="break-inside:avoid; margin-bottom:10px; min-width:180px;${cardBgStyle}">`; cardHtml += `<div class="freq-title" style="display:flex; align-items:center; justify-content:space-between;"><span>${cardLabel}</span><button class="btn" style="background:#27ae60;color:#fff;padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;" onclick="screenshotSingleComboCard('${cardId}')">截图</button></div>`; cardHtml += `<div style="max-height:400px;overflow-y:auto;">${tablesHtml}</div>`; cardHtml += `<div style="border-top:1px solid #ddd;margin-top:4px;padding-top:4px;font-size:11px;text-align:center;">小计：${totalGroups}组 金额：${totalAmount}`; if (drawZodiacs.length > 0 || drawNumbers.length > 0) { cardHtml += ` 中：${totalHitAmount}`; cardHtml += ` 盈亏：<span style="color:${roundedCardPL > 0 ? '#27ae60' : (roundedCardPL < 0 ? '#e74c3c' : '')};">${roundedCardPL > 0 ? roundedCardPL : (roundedCardPL < 0 ? roundedCardPL : '')}</span>`; } cardHtml += '</div></div>'; cardsArray.push({ html: cardHtml, groups: totalGroups }); });
  cardsArray.sort((a, b) => a.groups - b.groups); container.innerHTML = cardsArray.map(c => c.html).join('') || '<div style="color:#666;text-align:center;padding:10px;">暂无其他订单数据</div>';
  const roundedGrandPL = Math.round(grandPL); let totalHtml = `<span style="color:#0000ff;">总下单金额：</span><span style="color:#0000ff;">${grandTotal}</span>`; totalHtml += ` &nbsp; <span style="color:#0000ff;">总订单数：</span><span style="color:#0000ff;">${orderCountLianxiao}</span>`; if (drawZodiacs.length > 0 || drawNumbers.length > 0) { totalHtml += ` &nbsp; <span style="color:#0000ff;">总盈亏：</span><span style="color:${roundedGrandPL > 0 ? '#27ae60' : (roundedGrandPL < 0 ? '#e74c3c' : '')};">${roundedGrandPL > 0 ? roundedGrandPL : (roundedGrandPL < 0 ? roundedGrandPL : '')}</span>`; } document.getElementById('lianxiaoStatsTotal').innerHTML = totalHtml;
}

async function clearAllComboOrders() { if (!(await confirm('确定清空全部其他订单吗？此操作不可恢复！'))) return; if (!db) return; const tx = db.transaction([STORE_NAME], 'readwrite'); const store = tx.objectStore(STORE_NAME); const all = await new Promise(resolve => { const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); }); const toDelete = all.filter(r => r.region === currentRegion).filter(r => { const lines = r.content.split('\n'); return lines.some(line => { const newMatch = line.match(/^(.+?):(.+?)\s+各(?:数|组|)\s*(\d+)$/); if (newMatch) { const playType = normalizePlayType(newMatch[1]); return playType !== '特码'; } const oldMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/); return !!oldMatch; }); }); toDelete.forEach(r => store.delete(r.id)); refreshLianxiaoStats(); showToast('已清空全部其他订单'); }

// ===== 连肖识别输入处理（旧版兼容） =====
function comboRemoveSeparators() { const ta = document.getElementById('comboInput'); if (!ta) return; const s = ta.selectionStart, e = ta.selectionEnd; if (s === e) { showToast('请先选择文本'); return; } const sel = ta.value.substring(s, e); const cleaned = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, ''); ta.value = ta.value.substring(0, s) + cleaned + ta.value.substring(e); }
async function pasteComboOrder() { try { const text = await navigator.clipboard.readText(); if (text) { const ta = document.getElementById('comboInput'); if (ta) { ta.value = text; } } } catch (err) { showToast('无法访问剪贴板'); } }

// ===== 填充平特肖 =====
function fillPingtexiao() { const resultEl = document.getElementById('orderResult'); if (!resultEl) { showToast('识别结果为空'); return; } const text = resultEl.innerText.trim(); if (!text) { showToast('识别结果为空'); return; } const lines = text.split('\n'); const zodiacAmounts = {}; lines.forEach(line => { const { zodiacs, amount } = countItemsInLine(line); if (zodiacs.length > 0 && amount > 0) { zodiacs.forEach(z => { zodiacAmounts[z] = (zodiacAmounts[z] || 0) + amount; }); } }); const matchedZodiacs = Object.keys(zodiacAmounts); if (matchedZodiacs.length === 0) { showToast('未找到生肖数据'); return; } const data = getPingtexiaoData(); matchedZodiacs.forEach(z => { if (!data[z]) data[z] = { amount: '', report: '' }; const oldAmount = parseFloat(data[z].amount) || 0; data[z].amount = (oldAmount + zodiacAmounts[z]).toString(); }); savePingtexiaoData(data); renderPingtexiaoTable(); updatePingtexiaoTotal(); const si = document.querySelector('.source-order-input'); if (si) si.value = ''; if (resultEl) resultEl.innerHTML = ''; updateOrderTotalDisplay(); showToast(`已填充 ${matchedZodiacs.length} 个生肖到平特肖`); }

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

// ===== 页面入口 =====
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
  if (!checkCurrentAccess()) { showLoginScreen(); } else { if (isAdmin()) document.getElementById('cardMgrBtn').style.display = ''; await window._systemReady(); }

  const fixRangeInput = (id) => { const el = document.getElementById(id); if (el) { el.addEventListener('input', () => { clearStatsCache(); updateTableFromRecords(); }); } };
  fixRangeInput('numAmountMin'); fixRangeInput('numAmountMax'); fixRangeInput('zodiacAmountMin'); fixRangeInput('zodiacAmountMax');

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

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('mousedown', () => { resetLongPressTimer = setTimeout(async () => { resetLongPressTimer = null; const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！'); if (!confirmed) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearAllOrderRecordsFromIDB(); await clearAllReportOrderRecordsFromIDB(); await clearAllComboOrderRecordsFromIDB(); clearMemoryData(); renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); addOperationLog('reset', '清空全部数据（长按）'); showToast('已清空香港和澳门全部数据'); }, 3000); });
    resetBtn.addEventListener('mouseup', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
    resetBtn.addEventListener('mouseleave', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
    resetBtn.addEventListener('touchstart', (e) => { resetLongPressTimer = setTimeout(async () => { resetLongPressTimer = null; const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！'); if (!confirmed) return; const pwd = await prompt("输入清空密码：",""); if (pwd !== PASSWORD) { await alert("密码错误"); return; } await clearAllOrderRecordsFromIDB(); await clearAllReportOrderRecordsFromIDB(); await clearAllComboOrderRecordsFromIDB(); clearMemoryData(); renderAllTablesPlaceholder(); calculateStorageUsage(); updateAmountDisplays(); addOperationLog('reset', '清空全部数据（长按）'); showToast('已清空香港和澳门全部数据'); }, 3000); e.preventDefault(); });
    resetBtn.addEventListener('touchend', (e) => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; resetTable(); e.preventDefault(); } });
    resetBtn.addEventListener('touchcancel', () => { if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; } });
  }

  document.getElementById('rebateRate')?.addEventListener('input', generateRiskTable);
  document.getElementById('multipleVal')?.addEventListener('input', generateRiskTable);
  document.getElementById('reportRebateRate')?.addEventListener('input', generateReportTable);
  document.getElementById('reportMultipleVal')?.addEventListener('input', generateReportTable);
  document.getElementById('startZodiacSelect')?.addEventListener('change', changeStartZodiac);

  const filterDateEl = document.getElementById('filterDate');
  if (filterDateEl) { filterDateEl.addEventListener('change', () => { updateTableFromRecords(); if (document.getElementById('orderWin')) { applyPrizeFilter(); } applyReportCap(); updateRecentDrawTexts(); renderPingtexiaoTable(); updateCardA(); const duiJiangWin = document.getElementById('duiJiangWin'); if (duiJiangWin) { showDuiJiangWin(); } }); filterDateEl.addEventListener('input', updateTableFromRecords); }

  (function() { const originalApplyPrizeFilter = applyPrizeFilter; applyPrizeFilter = async function() { await originalApplyPrizeFilter.apply(this, arguments); const input = document.getElementById('prizeNumberInput'); if (!input) return; let val = input.value.trim(); if (val === '') { input.className = ''; return; } if (/^\d$/.test(val)) val = '0' + val; if (/^\d{2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 49) { const cls = redNumbers.includes(val) ? 'red-text' : (blueNumbers.includes(val) ? 'blue-text' : 'green-text'); input.className = cls; } else { input.className = ''; } }; })();

  const originalApplyReportCap = applyReportCap;
  applyReportCap = function() { originalApplyReportCap(); const info = document.getElementById('reportCapInfo').innerText; if (!info || info === '无超出的号码') { document.getElementById('parseResultArea').innerText = ''; } };

  (function() { const originalFn = generateReportTable; generateReportTable = function() { originalFn.apply(this, arguments); updateCardA(); renderSmartDecision(); }; })();
  (function() { const originalFn = updateTableFromRecords; updateTableFromRecords = async function() { await originalFn.apply(this, arguments); await computeSurge(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); }; })();
  (function() { const originalFn = switchRegion; switchRegion = async function(region) { await originalFn.apply(this, arguments); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); }; })();
};