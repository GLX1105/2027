// ===== duiJiang.js - 兑奖窗口专用逻辑（开奖录入、盈亏计算、结果展示） =====

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
            if (i < 7) {
              const next = document.getElementById('drawNum' + (i + 1));
              if (next) { next.focus(); next.select(); }
            }
          }
        });
      }
    }
  }, 100);
  refreshDuiJiangStats();
}

// ===== 录开奖输入处理 =====
function onDrawInputPlain(idx) {
  const input = document.getElementById('drawNum' + idx);
  const zodiacSpan = document.getElementById('drawZodiac' + idx);
  if (!input || !zodiacSpan) return;
  let val = input.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0, 2);
  input.value = val;
  if (val.length === 2) {
    const num = val.padStart(2, '0');
    const intVal = parseInt(num);
    if (intVal >= 1 && intVal <= 49) {
      const zodiac = currentZodiacMap[num] || '';
      zodiacSpan.textContent = zodiac;
      zodiacSpan.className = 'draw-zodiac-plain ' + getZodiacColorClass(zodiac);
      input.className = 'draw-number-input-plain ' + getNumberColorClass(num);
      return;
    }
  }
  zodiacSpan.textContent = '';
  zodiacSpan.className = 'draw-zodiac-plain';
  input.className = 'draw-number-input-plain';
}

function enableDrawEdit() {
  window._lianxiaoEditEnabled = true;
  for (let i = 1; i <= 7; i++) { const inp = document.getElementById('drawNum' + i); if (inp) inp.disabled = false; }
  showToast('已进入编辑模式');
}

async function saveDrawNumbers() {
  window._lianxiaoEditEnabled = false;
  const numbers = [];
  for (let i = 1; i <= 7; i++) {
    const inp = document.getElementById('drawNum' + i);
    if (inp) { let val = inp.value.trim(); if (/^\d$/.test(val)) val = '0' + val; if (/^\d{2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 49) { numbers.push(val); } else { numbers.push(''); } inp.disabled = true; }
  }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const issueNumber = getCurrentIssueNumber(year, fd);
  if (!issueNumber) { showToast('无法获取期号'); return; }
  const issueId = issueNumber.toString().padStart(2, '0');
  const storageKey = `comboDrawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
  savedData[issueId] = { number: numbers[6] || numbers.join(',') || '', numbers: numbers, pl: '' };
  localStorage.setItem(storageKey, JSON.stringify(savedData));
  refreshLianxiaoStats(); showToast('开奖号码已保存，统计已刷新');
}

async function saveDuiJiangDraw() {
  await saveDrawNumbers();
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear();
  const m = fd.match(/^(\d{4})/);
  if (m) year = parseInt(m[1]);
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
      if (plCell) {
        const plText = plCell.textContent.trim();
        if (plText !== '' && !isNaN(parseFloat(plText))) netPL = plText;
      }
    }
  }
  if (teMaFormatted || netPL !== '') {
    const storageKey = `drawRecord_${currentRegion}_${year}`;
    let savedData = {};
    try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
    if (!savedData[issueId]) savedData[issueId] = { number: '', pl: '' };
    if (teMaFormatted) savedData[issueId].number = teMaFormatted;
    if (netPL !== '') savedData[issueId].pl = netPL;
    localStorage.setItem(storageKey, JSON.stringify(savedData));
  }
  refreshDuiJiangStats();
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

// ===== 兑奖统计核心函数 =====
function refreshDuiJiangStats() {
  const orderBody = document.getElementById('duiJiangOrderBody');
  const reportBody = document.getElementById('duiJiangReportBody');
  const finalBody = document.getElementById('duiJiangFinalBody');
  if (!orderBody || !reportBody || !finalBody) return;

  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const storageKey = `comboDrawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
  const issueNumber = getCurrentIssueNumber(year, fd);
  const issueId = issueNumber ? issueNumber.toString().padStart(2, '0') : '';
  const entry = issueId ? (savedData[issueId] || {}) : {};
  const hasDrawNumbers = entry && entry.numbers && entry.numbers.length > 0;
  const drawNumbers = []; const drawZodiacs = [];
  if (hasDrawNumbers) {
    entry.numbers.forEach(n => { if (n && /^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) { drawNumbers.push(n); const z = currentZodiacMap[n] || ''; if (z) drawZodiacs.push(z); } });
  }
  const hasValidDraw = drawNumbers.length > 0;
  const drawTeMa = drawNumbers[6] || '';
  const drawTeMaZodiac = drawTeMa ? (currentZodiacMap[drawTeMa] || '') : '';

  const allOrdersPromise = getOrderRecords().then(recs => recs.filter(r => r.date === fd && r.region === currentRegion));
  const allReportsPromise = getReportOrderRecords().then(recs => recs.filter(r => r.date === fd && r.region === currentRegion));
  const allComboPromise = getComboOrders().then(recs => recs.filter(r => r.date === fd && r.region === currentRegion));

  Promise.all([allOrdersPromise, allReportsPromise, allComboPromise]).then(([orders, reports, combos]) => {
    const oddsData = getOddsData();
    const drawZodiacsSet = new Set(drawZodiacs);
    const drawNumbersSet = new Set(drawNumbers);
    const drawNumbersZhengma = drawNumbers.slice(0, 6);

    let totalOrderCount = orders.length + combos.length;

    const userStats = {};
    const allRecords = [...orders, ...combos];
    allRecords.forEach(rec => {
      const user = rec.user || '未知';
      if (!userStats[user]) userStats[user] = { orderTotal: 0, orderRebate: 0, orderHitByType: {}, orderPL: 0, reportTotal: 0, reportRebate: 0, reportHitByType: {}, reportPL: 0 };
      const lines = rec.content.split('\n');
      lines.forEach(line => {
        const newMatch = line.match(/^(.+?):(.+?)\s+各(?:数|组|)\s*(\d+)$/);
        if (newMatch) {
          let playType = newMatch[1];
          const content = newMatch[2];
          const amt = parseInt(newMatch[3]) || 0;
          playType = normalizePlayType(playType);
          if (playType === '特肖') {
            processTexiaoLineDuijiang(userStats[user], content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw);
          } else if (playType === '特码') {
            processNormalLineDuijiangNew(userStats[user], content, amt, drawTeMa, hasValidDraw);
          } else if (playType === '特碰') {
            processTepengLineDuijiang(userStats[user], content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw);
          } else if (playType.startsWith('包')) {
            processBaoLineDuijiang(userStats[user], playType, content, amt, drawTeMa, hasValidDraw);
          } else {
            processComboLineDuijiangNew(userStats[user], playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw);
          }
          return;
        }
        const comboMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
        if (comboMatch) { processComboLineDuijiangOld(userStats[user], comboMatch, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, drawTeMa, hasValidDraw); return; }
        const normalMatch = line.match(/^(.+?)\s+各数\s+(\d+)$/);
        if (normalMatch) { processNormalLineDuijiangOld(userStats[user], normalMatch, drawTeMa, hasValidDraw); }
      });
    });
    reports.forEach(rec => {
      const user = rec.user || '未知';
      if (!userStats[user]) userStats[user] = { orderTotal: 0, orderRebate: 0, orderHitByType: {}, orderPL: 0, reportTotal: 0, reportRebate: 0, reportHitByType: {}, reportPL: 0 };
      const lines = rec.content.split('\n');
      lines.forEach(line => {
        const newMatch = line.match(/^(.+?):(.+?)\s+各(?:数|组|)\s*(\d+)$/);
        if (newMatch) {
          let playType = newMatch[1];
          const content = newMatch[2];
          const amt = parseInt(newMatch[3]) || 0;
          playType = normalizePlayType(playType);
          if (playType === '特肖') {
            processTexiaoLineDuijiangReport(userStats[user], content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw);
          } else if (playType === '特码') {
            processReportLineDuijiangNew(userStats[user], content, amt, drawTeMa, hasValidDraw);
          } else if (playType === '特碰') {
            processTepengLineDuijiangReport(userStats[user], content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw);
          } else if (playType.startsWith('包')) {
            processBaoLineDuijiangReport(userStats[user], playType, content, amt, drawTeMa, hasValidDraw);
          } else {
            processComboLineDuijiangNewReport(userStats[user], playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw);
          }
          return;
        }
        const comboMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
        if (comboMatch) { processComboLineDuijiangOldReport(userStats[user], comboMatch, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, drawTeMa, hasValidDraw); return; }
        const normalMatch = line.match(/^(.+?)\s+各数\s+(\d+)$/);
        if (normalMatch) { processReportLineDuijiangOld(userStats[user], normalMatch, drawTeMa, hasValidDraw); }
      });
    });

    const orderCountEl = document.getElementById('duiJiangOrderCount');
    if (orderCountEl) { orderCountEl.textContent = '(共' + totalOrderCount + '单)'; }

    let orderHtml = '', reportHtml = '';
    let sumOrderTotal = 0, sumOrderRebate = 0, sumOrderPL = 0;
    let sumReportTotal = 0, sumReportRebate = 0, sumReportPL = 0;
    let sumOrderHitByType = {}, sumReportHitByType = {};

    const sortedUsers = Object.keys(userStats).sort();
    if (sortedUsers.length === 0) { orderBody.innerHTML = '<tr><td colspan="5">当天无数据</td></tr>'; reportBody.innerHTML = orderBody.innerHTML; finalBody.innerHTML = '<tr><td colspan="4">当天无数据</td></tr>'; return; }
    sortedUsers.forEach(user => {
      const s = userStats[user];
      sumOrderTotal += s.orderTotal; sumOrderRebate += s.orderRebate; sumOrderPL += s.orderPL;
      sumReportTotal += s.reportTotal; sumReportRebate += s.reportRebate; sumReportPL += s.reportPL;
      for (const [type, amt] of Object.entries(s.orderHitByType)) { sumOrderHitByType[type] = (sumOrderHitByType[type] || 0) + amt; }
      for (const [type, amt] of Object.entries(s.reportHitByType)) { sumReportHitByType[type] = (sumReportHitByType[type] || 0) + amt; }

      const orderHitDetail = hasValidDraw ? buildHitDetail(s.orderHitByType) : '';
      const reportHitDetail = hasValidDraw ? buildHitDetail(s.reportHitByType) : '';
      const orderPL = hasValidDraw ? Math.round(s.orderPL) : 0;
      const reportPL = hasValidDraw ? Math.round(s.reportPL) : 0;
      const orderPLColor = orderPL > 0 ? 'color:#008000;' : (orderPL < 0 ? 'color:#ff0000;' : '');
      const reportPLColor = reportPL > 0 ? 'color:#008000;' : (reportPL < 0 ? 'color:#ff0000;' : '');
      orderHtml += `<tr><td>${user}</td><td>${s.orderTotal > 0 ? s.orderTotal : ''}</td><td>${s.orderRebate > 0 ? Math.round(s.orderRebate) : ''}</td><td style="color:#ff0000;">${orderHitDetail}</td><td style="${orderPLColor}">${hasValidDraw && orderPL !== 0 ? orderPL : ''}</td></tr>`;
      reportHtml += `<tr><td>${user}</td><td>${s.reportTotal > 0 ? s.reportTotal : ''}</td><td>${s.reportRebate > 0 ? Math.round(s.reportRebate) : ''}</td><td style="color:#ff0000;">${reportHitDetail}</td><td style="${reportPLColor}">${hasValidDraw && reportPL !== 0 ? reportPL : ''}</td></tr>`;
    });
    const orderPL = hasValidDraw ? Math.round(sumOrderPL) : 0;
    const reportPL = hasValidDraw ? Math.round(sumReportPL) : 0;
    const orderPLColor = orderPL > 0 ? 'color:#008000;' : (orderPL < 0 ? 'color:#ff0000;' : '');
    const reportPLColor = reportPL > 0 ? 'color:#008000;' : (reportPL < 0 ? 'color:#ff0000;' : '');
    const sumOrderHitDetail = hasValidDraw ? buildHitDetail(sumOrderHitByType) : '';
    const sumReportHitDetail = hasValidDraw ? buildHitDetail(sumReportHitByType) : '';
    orderHtml += `<tr style="background-color:#fef9e7;"><td>所有用户</td><td>${sumOrderTotal > 0 ? sumOrderTotal : ''}</td><td>${sumOrderRebate > 0 ? Math.round(sumOrderRebate) : ''}</td><td style="color:#ff0000;">${sumOrderHitDetail}</td><td style="${orderPLColor}">${hasValidDraw && orderPL !== 0 ? orderPL : ''}</td></tr>`;
    reportHtml += `<tr style="background-color:#fef9e7;"><td>所有用户</td><td>${sumReportTotal > 0 ? sumReportTotal : ''}</td><td>${sumReportRebate > 0 ? Math.round(sumReportRebate) : ''}</td><td style="color:#ff0000;">${sumReportHitDetail}</td><td style="${reportPLColor}">${hasValidDraw && reportPL !== 0 ? reportPL : ''}</td></tr>`;
    orderBody.innerHTML = orderHtml; reportBody.innerHTML = reportHtml;
    const netAmount = sumOrderTotal - sumReportTotal;
    const netRebate = Math.round(sumOrderRebate - sumReportRebate);
    const netPL = hasValidDraw ? Math.round(sumOrderPL - sumReportPL) : 0;
    const netPLColor = netPL > 0 ? 'color:#008000;' : (netPL < 0 ? 'color:#ff0000;' : '');
    const netHitByType = {};
    if (hasValidDraw) {
      for (const [type, amt] of Object.entries(sumOrderHitByType)) { netHitByType[type] = (netHitByType[type] || 0) + amt; }
      for (const [type, amt] of Object.entries(sumReportHitByType)) { netHitByType[type] = (netHitByType[type] || 0) - amt; }
    }
    const netHitDetail = hasValidDraw ? buildHitDetail(netHitByType) : '';
    finalBody.innerHTML = `<tr><td>${netAmount > 0 ? netAmount : ''}</td><td>${netRebate !== 0 ? netRebate : ''}</td><td style="color:#ff0000;">${netHitDetail}</td><td style="${netPLColor}">${hasValidDraw && netPL !== 0 ? netPL : ''}</td></tr>`;
  });
}

function buildHitDetail(hitByType) {
  const parts = [];
  const orderedTypes = ['特码','特肖','特肖本年肖','平特肖','平特肖带主肖','二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖','平特尾','平特尾零尾','二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾','五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中','二中二','三中三','平码','特碰'];
  const baoTypes = ['包红波','包蓝波','包绿波','包红单','包红双','包蓝单','包蓝双','包绿单','包绿双','包红大','包红小','包蓝大','包蓝小','包绿大','包绿小','包单','包双','包大','包小','包家禽','包野兽'];
  const allOrderedTypes = [...orderedTypes, ...baoTypes];
  for (const type of allOrderedTypes) {
    if (hitByType[type] && hitByType[type] > 0) {
      parts.push(type + Math.round(hitByType[type]));
    }
  }
  return parts.length > 0 ? parts.join('，') : '';
}

// ===== 特肖兑奖处理函数（下单） =====
function processTexiaoLineDuijiang(stats, content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw) {
  const zodiacs = content.split('-').map(z => z.trim()).filter(z => z);
  if (zodiacs.length === 0) return;
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  const totalAmt = zodiacs.length * amt;
  const rebate = 4;
  stats.orderTotal += totalAmt;
  stats.orderRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMaZodiac) {
    let hitZodiac = null;
    let hitAmt = 0;
    if (zodiacs.includes(drawTeMaZodiac)) {
      hitZodiac = drawTeMaZodiac;
      hitAmt = amt;
    }
    if (hitZodiac) {
      const isBenming = hitZodiac === curYearZodiac;
      const playType = isBenming ? '特肖本年肖' : '特肖';
      const odds = isBenming ? 10 : 11;
      stats.orderHitByType[playType] = (stats.orderHitByType[playType] || 0) + hitAmt;
      stats.orderPL += totalAmt - totalAmt * (rebate / 100) - hitAmt * odds;
    } else {
      stats.orderPL += totalAmt - totalAmt * (rebate / 100);
    }
  }
}

// ===== 特肖兑奖处理函数（上报） =====
function processTexiaoLineDuijiangReport(stats, content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw) {
  const zodiacs = content.split('-').map(z => z.trim()).filter(z => z);
  if (zodiacs.length === 0) return;
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  const totalAmt = zodiacs.length * amt;
  const rebate = 4;
  stats.reportTotal += totalAmt;
  stats.reportRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMaZodiac) {
    let hitZodiac = null;
    let hitAmt = 0;
    if (zodiacs.includes(drawTeMaZodiac)) {
      hitZodiac = drawTeMaZodiac;
      hitAmt = amt;
    }
    if (hitZodiac) {
      const isBenming = hitZodiac === curYearZodiac;
      const playType = isBenming ? '特肖本年肖' : '特肖';
      const odds = isBenming ? 10 : 11;
      stats.reportHitByType[playType] = (stats.reportHitByType[playType] || 0) + hitAmt;
      stats.reportPL += totalAmt - totalAmt * (rebate / 100) - hitAmt * odds;
    } else {
      stats.reportPL += totalAmt - totalAmt * (rebate / 100);
    }
  }
}

// ===== 特碰兑奖处理函数（下单） =====
function processTepengLineDuijiang(stats, content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw) {
  const cleaned = content.replace(/[()]/g, '');
  const combos = cleaned.split(/\s+/).filter(c => c.trim());
  if (combos.length === 0) return;
  const { odds, rebate } = getOddsForType('特碰', getOddsData());
  const totalAmt = combos.length * amt;
  stats.orderTotal += totalAmt;
  stats.orderRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) {
    let hitCount = 0;
    combos.forEach(combo => {
      const tokens = combo.split('-');
      if (tokens.length === 2) {
        const first = tokens[0].padStart(2, '0');
        const second = tokens[1].padStart(2, '0');
        if (first === drawTeMa && drawNumbersZhengma.includes(second)) {
          hitCount++;
        }
      }
    });
    if (hitCount > 0) {
      stats.orderHitByType['特碰'] = (stats.orderHitByType['特碰'] || 0) + hitCount * amt;
      stats.orderPL += totalAmt - totalAmt * (rebate / 100) - hitCount * amt * odds;
    } else {
      stats.orderPL += totalAmt - totalAmt * (rebate / 100);
    }
  }
}

// ===== 特碰兑奖处理函数（上报） =====
function processTepengLineDuijiangReport(stats, content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw) {
  const cleaned = content.replace(/[()]/g, '');
  const combos = cleaned.split(/\s+/).filter(c => c.trim());
  if (combos.length === 0) return;
  const { odds, rebate } = getOddsForType('特碰', getOddsData());
  const totalAmt = combos.length * amt;
  stats.reportTotal += totalAmt;
  stats.reportRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) {
    let hitCount = 0;
    combos.forEach(combo => {
      const tokens = combo.split('-');
      if (tokens.length === 2) {
        const first = tokens[0].padStart(2, '0');
        const second = tokens[1].padStart(2, '0');
        if (first === drawTeMa && drawNumbersZhengma.includes(second)) {
          hitCount++;
        }
      }
    });
    if (hitCount > 0) {
      stats.reportHitByType['特碰'] = (stats.reportHitByType['特碰'] || 0) + hitCount * amt;
      stats.reportPL += totalAmt - totalAmt * (rebate / 100) - hitCount * amt * odds;
    } else {
      stats.reportPL += totalAmt - totalAmt * (rebate / 100);
    }
  }
}

// ===== 包玩法兑奖处理函数（下单） =====
function processBaoLineDuijiang(stats, playType, content, amt, drawTeMa, hasValidDraw) {
  const attr = content.trim();
  if (!attr || !D[attr]) return;
  const baoType = '包' + attr;
  const { odds, rebate } = getOddsForType(baoType, getOddsData());
  const totalAmt = amt;
  stats.orderTotal += totalAmt;
  stats.orderRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) {
    const attrNums = (D[attr] || '').split(/[\s,，]+/).filter(n => n.trim());
    const hit = attrNums.includes(drawTeMa);
    if (hit) {
      stats.orderHitByType[baoType] = (stats.orderHitByType[baoType] || 0) + amt;
      stats.orderPL += totalAmt - totalAmt * (rebate / 100) - amt * odds;
    } else {
      stats.orderPL += totalAmt - totalAmt * (rebate / 100);
    }
  }
}

// ===== 包玩法兑奖处理函数（上报） =====
function processBaoLineDuijiangReport(stats, playType, content, amt, drawTeMa, hasValidDraw) {
  const attr = content.trim();
  if (!attr || !D[attr]) return;
  const baoType = '包' + attr;
  const { odds, rebate } = getOddsForType(baoType, getOddsData());
  const totalAmt = amt;
  stats.reportTotal += totalAmt;
  stats.reportRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) {
    const attrNums = (D[attr] || '').split(/[\s,，]+/).filter(n => n.trim());
    const hit = attrNums.includes(drawTeMa);
    if (hit) {
      stats.reportHitByType[baoType] = (stats.reportHitByType[baoType] || 0) + amt;
      stats.reportPL += totalAmt - totalAmt * (rebate / 100) - amt * odds;
    } else {
      stats.reportPL += totalAmt - totalAmt * (rebate / 100);
    }
  }
}

// ===== 新版兑奖处理函数（特码下单） =====
function processNormalLineDuijiangNew(stats, content, amt, drawTeMa, hasValidDraw) {
  const items = content.split('-').map(i => i.trim()).filter(i => i);
  const nums = [];
  items.forEach(item => {
    if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); }
    else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
    else if (D[item]) {
      const val = D[item];
      if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
      } else {
        val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0')));
      }
    }
  });
  const { odds, rebate } = getOddsForType('特码', getOddsData());
  const totalCount = nums.length;
  stats.orderTotal += totalCount * amt;
  stats.orderRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) {
    let hitAmount = 0;
    nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } });
    if (hitAmount > 0) { stats.orderHitByType['特码'] = (stats.orderHitByType['特码'] || 0) + hitAmount; }
    stats.orderPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds);
  }
}

// ===== 新版兑奖处理函数（连肖等下单） =====
function processComboLineDuijiangNew(stats, playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw) {
  playType = normalizePlayType(playType);
  const cleaned = content.replace(/[()]/g, '');
  const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => {
    const tokens = combo.split('-');
    let comboType = playType;
    let hasYearZodiac = false;
    let hasZeroWei = false;
    if (comboType === '平特肖') {
      hasYearZodiac = tokens.some(t => t === curYearZodiac);
    } else if (comboType === '平特尾') {
      hasZeroWei = tokens.some(t => t.replace('尾','') === '0');
    } else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) {
      hasYearZodiac = tokens.some(t => t === curYearZodiac);
    } else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) {
      hasZeroWei = tokens.some(t => t.replace('尾','') === '0');
    }
    if (hasYearZodiac) {
      if (comboType === '平特肖') comboType = '平特肖带主肖';
      else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖';
    }
    if (hasZeroWei) {
      if (comboType === '平特尾') comboType = '平特尾零尾';
      else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾';
    }
    const { odds, rebate } = getOddsForType(comboType, getOddsData());
    const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1;
    stats.orderTotal += effectiveCount * amt;
    stats.orderRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) {
      let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) {
        if (isPerItem) {
          let hitCount = 0;
          if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; }
          else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; }
          else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; }
          if (hitCount > 0) { stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + hitCount * amt; }
          stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds);
        } else {
          stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + amt;
          stats.orderPL += amt - amt * (rebate / 100) - (amt * odds);
        }
      } else {
        stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100);
      }
    }
  });
}

// ===== 上报兑奖处理函数（连肖等） =====
function processComboLineDuijiangNewReport(stats, playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw) {
  playType = normalizePlayType(playType);
  const cleaned = content.replace(/[()]/g, '');
  const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => {
    const tokens = combo.split('-');
    let comboType = playType;
    let hasYearZodiac = false;
    let hasZeroWei = false;
    if (comboType === '平特肖') {
      hasYearZodiac = tokens.some(t => t === curYearZodiac);
    } else if (comboType === '平特尾') {
      hasZeroWei = tokens.some(t => t.replace('尾','') === '0');
    } else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) {
      hasYearZodiac = tokens.some(t => t === curYearZodiac);
    } else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) {
      hasZeroWei = tokens.some(t => t.replace('尾','') === '0');
    }
    if (hasYearZodiac) {
      if (comboType === '平特肖') comboType = '平特肖带主肖';
      else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖';
    }
    if (hasZeroWei) {
      if (comboType === '平特尾') comboType = '平特尾零尾';
      else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾';
    }
    const { odds, rebate } = getOddsForType(comboType, getOddsData());
    const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1;
    stats.reportTotal += effectiveCount * amt;
    stats.reportRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) {
      let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) {
        if (isPerItem) {
          let hitCount = 0;
          if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; }
          else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; }
          else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; }
          if (hitCount > 0) { stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + hitCount * amt; }
          stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds);
        } else {
          stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + amt;
          stats.reportPL += amt - amt * (rebate / 100) - (amt * odds);
        }
      } else {
        stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100);
      }
    }
  });
}

// ===== 上报兑奖处理函数（特码） =====
function processReportLineDuijiangNew(stats, content, amt, drawTeMa, hasValidDraw) {
  const items = content.split('-').map(i => i.trim()).filter(i => i);
  const nums = [];
  items.forEach(item => {
    if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); }
    else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
    else if (D[item]) {
      const val = D[item];
      if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
      } else {
        val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0')));
      }
    }
  });
  const { odds, rebate } = getOddsForType('特码', getOddsData());
  const totalCount = nums.length;
  stats.reportTotal += totalCount * amt;
  stats.reportRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) {
    let hitAmount = 0;
    nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } });
    if (hitAmount > 0) { stats.reportHitByType['特码'] = (stats.reportHitByType['特码'] || 0) + hitAmount; }
    stats.reportPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds);
  }
}

// ===== 旧版兑奖处理函数 =====
function processNormalLineDuijiangOld(stats, match, drawTeMa, hasValidDraw) {
  const cont = match[1]; const amt = parseInt(match[2]) || 0;
  const items = cont.split('-').map(i => i.trim()).filter(i => i);
  const nums = [];
  items.forEach(item => {
    if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); }
    else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
    else if (D[item]) {
      const val = D[item];
      if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
      } else {
        val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0')));
      }
    }
  });
  const { odds, rebate } = getOddsForType('特码', getOddsData());
  const totalCount = nums.length;
  stats.orderTotal += totalCount * amt;
  stats.orderRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) {
    let hitAmount = 0;
    nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } });
    if (hitAmount > 0) { stats.orderHitByType['特码'] = (stats.orderHitByType['特码'] || 0) + hitAmount; }
    stats.orderPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds);
  }
}

function processComboLineDuijiangOld(stats, match, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, drawTeMa, hasValidDraw) {
  const combosStr = match[1]; const amt = parseInt(match[2]) || 0;
  const cleaned = combosStr.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => {
    const tokens = combo.split('-');
    let comboType = '';
    let hasYearZodiac = false;
    let hasZeroWei = false;
    if (tokens.length === 1) {
      if (ZODIAC_NUMS[tokens[0]]) { comboType = '平特肖'; if (tokens[0] === curYearZodiac) hasYearZodiac = true; }
      else if (tokens[0].includes('尾')) { comboType = '平特尾'; if (tokens[0].replace('尾','') === '0') hasZeroWei = true; }
      else if (/^\d{2}$/.test(tokens[0])) { comboType = '平码'; }
    } else if (tokens.every(t => ZODIAC_NUMS[t])) {
      const lxMap = {2:'二连肖',3:'三连肖',4:'四连肖',5:'五连肖'};
      comboType = lxMap[tokens.length] || '二连肖';
      hasYearZodiac = tokens.some(t => t === curYearZodiac);
    } else if (tokens.every(t => t.includes('尾'))) {
      const lwMap = {2:'二连尾',3:'三连尾',4:'四连尾',5:'五连尾'};
      comboType = lwMap[tokens.length] || '二连尾';
      hasZeroWei = tokens.some(t => t.replace('尾','') === '0');
    } else if (tokens.every(t => /^\d{2}$/.test(t))) {
      if (tokens.length === 2) { comboType = '二中二'; }
      else if (tokens.length === 3) { comboType = '三中三'; }
      else { const bzMap = {5:'五不中',6:'六不中',7:'七不中',8:'八不中',9:'九不中',10:'十不中',11:'十一不中',12:'十二不中'}; comboType = bzMap[tokens.length] || '五不中'; }
    }
    if (!comboType) return;
    comboType = normalizePlayType(comboType);
    if (hasYearZodiac) {
      if (comboType === '平特肖') comboType = '平特肖带主肖';
      else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖';
    }
    if (hasZeroWei) {
      if (comboType === '平特尾') comboType = '平特尾零尾';
      else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾';
    }
    const { odds, rebate } = getOddsForType(comboType, getOddsData());
    const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1;
    stats.orderTotal += effectiveCount * amt;
    stats.orderRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) {
      let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) {
        if (isPerItem) {
          let hitCount = 0;
          if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; }
          else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; }
          else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; }
          if (hitCount > 0) { stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + hitCount * amt; }
          stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds);
        } else {
          stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + amt;
          stats.orderPL += amt - amt * (rebate / 100) - (amt * odds);
        }
      } else {
        stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100);
      }
    }
  });
}

function processComboLineDuijiangOldReport(stats, match, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, drawTeMa, hasValidDraw) {
  const combosStr = match[1]; const amt = parseInt(match[2]) || 0;
  const cleaned = combosStr.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => {
    const tokens = combo.split('-');
    let comboType = '';
    let hasYearZodiac = false;
    let hasZeroWei = false;
    if (tokens.length === 1) {
      if (ZODIAC_NUMS[tokens[0]]) { comboType = '平特肖'; if (tokens[0] === curYearZodiac) hasYearZodiac = true; }
      else if (tokens[0].includes('尾')) { comboType = '平特尾'; if (tokens[0].replace('尾','') === '0') hasZeroWei = true; }
      else if (/^\d{2}$/.test(tokens[0])) { comboType = '平码'; }
    } else if (tokens.every(t => ZODIAC_NUMS[t])) {
      const lxMap = {2:'二连肖',3:'三连肖',4:'四连肖',5:'五连肖'};
      comboType = lxMap[tokens.length] || '二连肖';
      hasYearZodiac = tokens.some(t => t === curYearZodiac);
    } else if (tokens.every(t => t.includes('尾'))) {
      const lwMap = {2:'二连尾',3:'三连尾',4:'四连尾',5:'五连尾'};
      comboType = lwMap[tokens.length] || '二连尾';
      hasZeroWei = tokens.some(t => t.replace('尾','') === '0');
    } else if (tokens.every(t => /^\d{2}$/.test(t))) {
      if (tokens.length === 2) { comboType = '二中二'; }
      else if (tokens.length === 3) { comboType = '三中三'; }
      else { const bzMap = {5:'五不中',6:'六不中',7:'七不中',8:'八不中',9:'九不中',10:'十不中',11:'十一不中',12:'十二不中'}; comboType = bzMap[tokens.length] || '五不中'; }
    }
    if (!comboType) return;
    comboType = normalizePlayType(comboType);
    if (hasYearZodiac) {
      if (comboType === '平特肖') comboType = '平特肖带主肖';
      else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖';
    }
    if (hasZeroWei) {
      if (comboType === '平特尾') comboType = '平特尾零尾';
      else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾';
    }
    const { odds, rebate } = getOddsForType(comboType, getOddsData());
    const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1;
    stats.reportTotal += effectiveCount * amt;
    stats.reportRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) {
      let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) {
        if (isPerItem) {
          let hitCount = 0;
          if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; }
          else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; }
          else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; }
          if (hitCount > 0) { stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + hitCount * amt; }
          stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds);
        } else {
          stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + amt;
          stats.reportPL += amt - amt * (rebate / 100) - (amt * odds);
        }
      } else {
        stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100);
      }
    }
  });
}

function processReportLineDuijiangOld(stats, match, drawTeMa, hasValidDraw) {
  const cont = match[1]; const amt = parseInt(match[2]) || 0;
  const items = cont.split('-').map(i => i.trim()).filter(i => i);
  const nums = [];
  items.forEach(item => {
    if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); }
    else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
    else if (D[item]) {
      const val = D[item];
      if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); }
      } else {
        val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0')));
      }
    }
  });
  const { odds, rebate } = getOddsForType('特码', getOddsData());
  const totalCount = nums.length;
  stats.reportTotal += totalCount * amt;
  stats.reportRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) {
    let hitAmount = 0;
    nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } });
    if (hitAmount > 0) { stats.reportHitByType['特码'] = (stats.reportHitByType['特码'] || 0) + hitAmount; }
    stats.reportPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds);
  }
}