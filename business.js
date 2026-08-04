// ===== business.js - 核心业务逻辑 =====

// 注意：getReplacePresets, getCategoryAliases, applyCategoryAliases, applyReplacePresets 已移至 dict.js

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

// ===== 玩法名称标准化 =====
function normalizePlayType(playType) {
  const map = {
    '2连肖':'二连肖','3连肖':'三连肖','4连肖':'四连肖','5连肖':'五连肖',
    '2连尾':'二连尾','3连尾':'三连尾','4连尾':'四连尾','5连尾':'五连尾',
    '5不中':'五不中','6不中':'六不中','7不中':'七不中','8不中':'八不中',
    '9不中':'九不中','10不中':'十不中','11不中':'十一不中','12不中':'十二不中',
    '2中2':'二中二','3中3':'三中三',
    '二连肖':'二连肖','三连肖':'三连肖','四连肖':'四连肖','五连肖':'五连肖',
    '二连尾':'二连尾','三连尾':'三连尾','四连尾':'四连尾','五连尾':'五连尾',
    '五不中':'五不中','六不中':'六不中','七不中':'七不中','八不中':'八不中',
    '九不中':'九不中','十不中':'十不中','十一不中':'十一不中','十二不中':'十二不中',
    '二中二':'二中二','三中三':'三中三','特碰':'特碰',
    '平特肖':'平特肖','平特尾':'平特尾','平码':'平码','特码':'特码','特肖':'特肖'
  };
  return map[playType] || playType;
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
    // 上报记录
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

// ===== 特碰兑奖处理函数（下单）第一个=特码，第二个在正码中 =====
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

// ===== 新版兑奖处理函数 =====
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

// ===== 上报兑奖处理函数 =====
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

// ===== 旧版兑奖处理函数（兼容旧格式） =====
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

// ===== 上报兑奖旧版处理函数 =====
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

function getOddsForType(type, oddsData) {
  const defaults = {
    '特码':{odds:47,rebate:4},
    '特肖':{odds:11,rebate:4},
    '特肖本年肖':{odds:10,rebate:4},
    '平特肖':{odds:2,rebate:4},'平特肖带主肖':{odds:1.8,rebate:4},'二连肖':{odds:4,rebate:4},'二连肖带主肖':{odds:3.5,rebate:4},
    '三连肖':{odds:10,rebate:4},'三连肖带主肖':{odds:9,rebate:4},'四连肖':{odds:30,rebate:4},'四连肖带主肖':{odds:25,rebate:4},
    '五连肖':{odds:100,rebate:4},'五连肖带主肖':{odds:90,rebate:4},'平特尾':{odds:1.8,rebate:4},'平特尾零尾':{odds:2,rebate:4},
    '二连尾':{odds:3,rebate:4},'二连尾零尾':{odds:3.5,rebate:4},'三连尾':{odds:6,rebate:4},'三连尾零尾':{odds:6.5,rebate:4},
    '四连尾':{odds:14,rebate:4},'四连尾零尾':{odds:15,rebate:4},'五连尾':{odds:28,rebate:4},'五连尾零尾':{odds:30,rebate:4},
    '五不中':{odds:2,rebate:4},'六不中':{odds:2.5,rebate:4},'七不中':{odds:3,rebate:4},'八不中':{odds:3.5,rebate:4},
    '九不中':{odds:4,rebate:4},'十不中':{odds:5,rebate:4},'十一不中':{odds:6,rebate:4},'十二不中':{odds:7,rebate:4},
    '二中二':{odds:60,rebate:4},'三中三':{odds:600,rebate:4},'平码':{odds:7,rebate:4},
    '特碰':{odds:120,rebate:4},
    '包红波':{odds:2.6,rebate:4},'包蓝波':{odds:2.7,rebate:4},'包绿波':{odds:2.7,rebate:4},
    '包红单':{odds:5,rebate:4},'包红双':{odds:4.7,rebate:4},'包红大':{odds:6,rebate:4},'包红小':{odds:4,rebate:4},
    '包蓝单':{odds:5,rebate:4},'包蓝双':{odds:5,rebate:4},'包蓝大':{odds:4.7,rebate:4},'包蓝小':{odds:6,rebate:4},
    '包绿单':{odds:5,rebate:4},'包绿双':{odds:5,rebate:4},'包绿大':{odds:5,rebate:4},'包绿小':{odds:6,rebate:4},
    '包单':{odds:1.8,rebate:4},'包双':{odds:1.8,rebate:4},'包大':{odds:1.8,rebate:4},'包小':{odds:1.8,rebate:4},
    '包家禽':{odds:1.8,rebate:4},'包野兽':{odds:1.8,rebate:4}
  };
  const saved = oddsData[type] || {};
  return {
    odds: parseFloat(saved.odds) || defaults[type]?.odds || 1,
    rebate: parseFloat(saved.rebate) || defaults[type]?.rebate || 4
  };
}
// ===== business.js 续：连肖识别输入处理、截图、连肖统计、订单保存等 =====

// ===== 连肖识别输入处理（旧版保持不变） =====
function comboRemoveSeparators() { const ta = document.getElementById('comboInput'); if (!ta) return; const s = ta.selectionStart, e = ta.selectionEnd; if (s === e) { showToast('请先选择文本'); return; } const sel = ta.value.substring(s, e); const cleaned = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, ''); ta.value = ta.value.substring(0, s) + cleaned + ta.value.substring(e); }
async function pasteComboOrder() { try { const text = await navigator.clipboard.readText(); if (text) { const ta = document.getElementById('comboInput'); if (ta) { ta.value = text; } } } catch(err) { showToast('无法访问剪贴板'); } }

// ===== 截图全部 =====
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

// ===== 截图单个卡片 =====
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

// ===== 截图风险卡片 =====
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
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('卡片截图已复制'); } catch(e) { showToast('复制失败'); }
    }, 'image/png');
  } catch(e) { showToast('截图失败'); }
}

// ===== 连肖统计函数 =====
async function refreshLianxiaoStats() {
  const container = document.getElementById('lianxiaoStatsContainer');
  if (!container) return;
  if (!db) { container.innerHTML = '数据库不可用'; return; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  
  const tx = db.transaction([STORE_NAME], 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const all = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
  });
  
  const allOrders = all.filter(r => r.region === currentRegion && r.date === fd);
  const records = [];
  allOrders.forEach(order => {
    const lines = order.content.split('\n');
    lines.forEach(line => {
      const newMatch = line.match(/^(.+?):(.+?)\s+各(?:数|组|)\s*(\d+)$/);
      if (newMatch) {
        const playType = normalizePlayType(newMatch[1]);
        if (playType !== '特码') {
          records.push({ content: line, user: order.user, date: order.date });
        }
        return;
      }
      const oldMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
      if (oldMatch) {
        records.push({ content: line, user: order.user, date: order.date });
      }
    });
  });
  
  if (records.length === 0) {
    container.innerHTML = '<div style="color:#666;text-align:center;padding:10px;">暂无其他订单数据</div>';
    document.getElementById('lianxiaoStatsTotal').innerHTML = '';
    return;
  }
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';

  let drawNumbers = [];
  let drawZodiacs = [];
  const fdYear = fd.substring(0, 4);
  let storageKey = `comboDrawRecord_${currentRegion}_${fdYear}`;
  let savedData = {};
  try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) { }
  if (Object.keys(savedData).length === 0) {
    storageKey = `drawRecord_${currentRegion}_${fdYear}`;
    try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) { }
  }
  const currentIssue = getCurrentIssueNumber(parseInt(fdYear), fd);
  if (currentIssue) {
    const issueId = currentIssue.toString().padStart(2, '0');
    const entry = savedData[issueId];
    if (entry && entry.numbers && Array.isArray(entry.numbers)) {
      entry.numbers.forEach(n => {
        if (n && /^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) {
          drawNumbers.push(n);
          const zodiac = currentZodiacMap[n] || '';
          if (zodiac) drawZodiacs.push(zodiac);
        }
      });
    } else if (entry && entry.number && entry.number.trim()) {
      const n = entry.number.trim().padStart(2, '0');
      if (/^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) {
        drawNumbers.push(n);
        const zodiac = currentZodiacMap[n] || '';
        if (zodiac) drawZodiacs.push(zodiac);
      }
    }
  }
  const drawZodiacsSet = new Set(drawZodiacs);
  const drawNumbersSet = new Set(drawNumbers);
  const drawNumbersZhengma = drawNumbers.slice(0, 6);

  const stats = {};
  let grandTotal = 0;
  let orderCountLianxiao = records.length;
  
  records.forEach(rec => {
    const line = rec.content;
    const newMatch = line.match(/^(.+?):(.+?)\s+(各(?:组|))\s*(\d+)$/);
    if (newMatch) {
      const playType = normalizePlayType(newMatch[1]);
      const content = newMatch[2];
      const amount = parseInt(newMatch[4]) || 0;
      
      if (playType === '特肖') {
        const zodiacs = content.split('-').filter(z => z.trim());
        zodiacs.forEach(z => {
          if (!stats['特肖']) stats['特肖'] = { withYear: new Map(), withoutYear: new Map() };
          const hasYear = z === curYearZodiac;
          const target = hasYear ? stats['特肖'].withYear : stats['特肖'].withoutYear;
          target.set(z, (target.get(z) || 0) + amount);
          grandTotal += amount;
        });
        return;
      }
      
      if (playType === '特碰' || playType === '二中二') {
        const comboType = playType === '特碰' ? 'tePeng' : 'zhong2';
        const cleaned = content.replace(/[()]/g, '');
        const combos = cleaned.split(/\s+/).filter(c => c.trim());
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        combos.forEach(c => {
          stats[comboType].withYear.set(c, (stats[comboType].withYear.get(c) || 0) + amount);
          grandTotal += amount;
        });
        return;
      }
      
      if (playType.startsWith('包')) {
        const attr = content.trim();
        if (!attr || !D[attr]) return;
        if (!stats['bao']) stats['bao'] = { withYear: new Map(), withoutYear: new Map() };
        stats['bao'].withYear.set(attr, (stats['bao'].withYear.get(attr) || 0) + amount);
        grandTotal += amount;
        return;
      }
      
      const groups = content.split(/\s+/);
      groups.forEach(group => {
        const rawGroup = group.replace(/^\(|\)$/g, '');
        const tokens = rawGroup.split('-');
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') {
          tokens.forEach(token => {
            const comboType = playType === '平特肖' ? 'pingtexiao' : (playType === '平特尾' ? 'pingtewei' : 'pingma');
            if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
            const cleanToken = token.trim();
            if (comboType === 'pingtexiao') {
              const hasYear = cleanToken === curYearZodiac;
              (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(cleanToken, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(cleanToken) || 0) + amount);
            } else if (comboType === 'pingtewei') {
              const hasZero = cleanToken.replace('尾', '') === '0';
              (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(cleanToken, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(cleanToken) || 0) + amount);
            } else {
              stats[comboType].withYear.set(cleanToken, (stats[comboType].withYear.get(cleanToken) || 0) + amount);
            }
            grandTotal += amount;
          });
        } else if (tokens.every(t => /^[\u4e00-\u9fa5]$/.test(t) && ZODIAC_NUMS[t])) {
          const comboType = `lianxiao${tokens.length}`;
          if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
          const hasYear = tokens.some(t => t === curYearZodiac);
          const comboKey = tokens.join('-');
          (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
          grandTotal += amount;
        } else if (tokens.every(t => /^\d+尾$/.test(t))) {
          const comboType = `lianwei${tokens.length}`;
          if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
          const hasZero = tokens.some(t => t.replace('尾', '') === '0');
          const comboKey = tokens.join('-');
          (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
          grandTotal += amount;
        } else if (tokens.every(t => /^\d{2}$/.test(t))) {
          const comboType = tokens.length === 1 ? 'pingma' : (tokens.length === 2 ? 'zhong2' : (tokens.length === 3 ? 'zhong3' : 'buzhong' + tokens.length));
          if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
          const comboKey = tokens.join('-');
          stats[comboType].withYear.set(comboKey, (stats[comboType].withYear.get(comboKey) || 0) + amount);
          grandTotal += amount;
        }
      });
      return;
    }
    const oldMatch = line.match(/^(.+?)\s*(?:各组|各)\s*(\d+)$/);
    if (!oldMatch) return;
    const content = oldMatch[1];
    const amount = parseInt(oldMatch[2]) || 0;
    const groups = content.split(/\s+/);
    groups.forEach(group => {
      const rawGroup = group.replace(/^\(|\)$/g, '');
      const tokens = rawGroup.split('-');
      if (tokens.length === 1 && ZODIAC_NUMS[tokens[0]]) {
        const comboType = 'pingtexiao';
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasYear = tokens[0] === curYearZodiac;
        (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(tokens[0], ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(tokens[0]) || 0) + amount);
        grandTotal += amount;
      } else if (tokens.length === 1 && tokens[0].includes('尾')) {
        const comboType = 'pingtewei';
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasZero = tokens[0].replace('尾', '') === '0';
        (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(tokens[0], ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(tokens[0]) || 0) + amount);
        grandTotal += amount;
      } else if (tokens.some(t => ZODIAC_NUMS[t])) {
        const comboType = `lianxiao${tokens.length}`;
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasYear = tokens.some(t => t === curYearZodiac);
        const comboKey = tokens.join('-');
        (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
        grandTotal += amount;
      } else if (tokens.some(t => t.includes('尾'))) {
        const comboType = `lianwei${tokens.length}`;
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasZero = tokens.some(t => t.replace('尾', '') === '0');
        const comboKey = tokens.join('-');
        (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
        grandTotal += amount;
      } else {
        const comboType = tokens.length === 1 ? 'pingma' : (tokens.length === 2 ? 'zhong2' : (tokens.length === 3 ? 'zhong3' : 'buzhong' + tokens.length));
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const comboKey = tokens.join('-');
        stats[comboType].withYear.set(comboKey, (stats[comboType].withYear.get(comboKey) || 0) + amount);
        grandTotal += amount;
      }
    });
  });

  const oddsData = getOddsData();
  const defaults = {
    '特码': { odds: 47, rebate: 4 },
    '特肖': { odds: 11, rebate: 4 },
    '特肖本年肖': { odds: 10, rebate: 4 },
    'pingtexiao': { odds: 2, rebate: 4 }, 'pingtexiao带主肖': { odds: 1.8, rebate: 4 }, 'lianxiao2': { odds: 4, rebate: 4 }, 'lianxiao2带主肖': { odds: 3.5, rebate: 4 },
    'lianxiao3': { odds: 10, rebate: 4 }, 'lianxiao3带主肖': { odds: 9, rebate: 4 }, 'lianxiao4': { odds: 30, rebate: 4 }, 'lianxiao4带主肖': { odds: 25, rebate: 4 },
    'lianxiao5': { odds: 100, rebate: 4 }, 'lianxiao5带主肖': { odds: 90, rebate: 4 }, 'pingtewei': { odds: 1.8, rebate: 4 }, 'pingtewei零尾': { odds: 2, rebate: 4 },
    'lianwei2': { odds: 3, rebate: 4 }, 'lianwei2零尾': { odds: 3.5, rebate: 4 }, 'lianwei3': { odds: 6, rebate: 4 }, 'lianwei3零尾': { odds: 6.5, rebate: 4 },
    'lianwei4': { odds: 14, rebate: 4 }, 'lianwei4零尾': { odds: 15, rebate: 4 }, 'lianwei5': { odds: 28, rebate: 4 }, 'lianwei5零尾': { odds: 30, rebate: 4 },
    'buzhong5': { odds: 2, rebate: 4 }, 'buzhong6': { odds: 2.5, rebate: 4 }, 'buzhong7': { odds: 3, rebate: 4 }, 'buzhong8': { odds: 3.5, rebate: 4 },
    'buzhong9': { odds: 4, rebate: 4 }, 'buzhong10': { odds: 5, rebate: 4 }, 'buzhong11': { odds: 6, rebate: 4 }, 'buzhong12': { odds: 7, rebate: 4 },
    'zhong2': { odds: 60, rebate: 4 }, 'zhong3': { odds: 600, rebate: 4 }, 'pingma': { odds: 7, rebate: 4 },
    'tePeng': { odds: 120, rebate: 4 }
  };
  function getPlayOdds(type, hasSpecial) {
    let key = type;
    if (hasSpecial && type === 'pingtexiao') key = 'pingtexiao带主肖';
    else if (hasSpecial && type.startsWith('lianxiao')) key = type + '带主肖';
    else if (hasSpecial && type === 'pingtewei') key = 'pingtewei零尾';
    else if (hasSpecial && type.startsWith('lianwei')) key = type + '零尾';
    const saved = oddsData[key] || {};
    return { odds: parseFloat(saved.odds) || defaults[key]?.odds || 1, rebate: parseFloat(saved.rebate) || defaults[key]?.rebate || 4 };
  }

  let grandPL = 0;
  const cardsArray = [];
  const order = ['特肖', 'tePeng', 'pingtexiao', 'lianxiao2', 'lianxiao3', 'lianxiao4', 'lianxiao5', 'buzhong5', 'buzhong6', 'buzhong7', 'buzhong8', 'buzhong9', 'buzhong10', 'buzhong11', 'buzhong12', 'pingma', 'pingtewei', 'lianwei2', 'lianwei3', 'lianwei4', 'lianwei5', 'zhong2', 'zhong3', 'bao'];

  order.forEach((type) => {
    if (!stats[type]) return;
    const data = stats[type];
    const cardId = `comboCard_${type}`;
    let totalGroups = 0, totalAmount = 0, cardPL = 0, totalHitAmount = 0;
    const isBao = (type === 'bao');
    const isTePeng = (type === 'tePeng');

    let tablesHtml = '';

    function renderTable(map, hasSpecial) {
      if (map.size === 0) return '';
      let html2 = '';
      const headerLabel = isBao ? '属性' : (isTePeng ? '组合' : (type === '特肖' || type.startsWith('lianxiao') || type === 'pingtexiao' ? '生肖' : (type.includes('wei') ? '尾数' : '组合')));
      html2 += '<table style="width:100%;"><tr><th style="text-align:center;">' + headerLabel + '</th><th style="text-align:center;">金额</th><th style="text-align:center;">中奖</th><th style="text-align:center;">盈亏</th></tr>';
      map.forEach((v, k) => {
        const displayKey = k.replace(/^\(|\)$/g, '');
        const tokens = displayKey.split('-');
        let hit = false;
        let odds, rebate;
        if (isBao) {
          const baoType = '包' + displayKey;
          const baoOdds = getOddsForType(baoType, oddsData);
          odds = baoOdds.odds; rebate = baoOdds.rebate;
          if (drawNumbers.length > 0 && D[displayKey]) {
            const attrNums = (D[displayKey] || '').split(/[\s,，]+/).filter(n => n.trim());
            const teMa = drawNumbers[6] || '';
            hit = attrNums.includes(teMa);
          }
        } else if (isTePeng) {
          const baoOdds = getOddsForType('特碰', oddsData);
          odds = baoOdds.odds; rebate = baoOdds.rebate;
          if (drawNumbers.length > 0) {
            const teMa = drawNumbers[6] || '';
            hit = (tokens.length === 2 && tokens[0].padStart(2, '0') === teMa && drawNumbersZhengma.includes(tokens[1].padStart(2, '0')));
          }
        } else {
          const { odds: o, rebate: r } = getPlayOdds(type, hasSpecial);
          odds = o; rebate = r;
          if (type === '特肖') { const teMaZodiac = drawZodiacs.length > 0 ? (currentZodiacMap[drawNumbers[6]] || '') : ''; hit = teMaZodiac === k; }
          else if (type === 'pingtexiao') { hit = drawZodiacsSet.has(k); }
          else if (type === 'pingtewei') { hit = drawZodiacs.length > 0 && tokens.some(t => { const d = t.replace('尾', ''); for (let i = 0; i <= 4; i++) { const n = (i * 10 + parseInt(d)).toString().padStart(2, '0'); if (drawNumbersSet.has(n)) return true; } return false; }); }
          else if (type === 'pingma' || type === 'zhong2' || type === 'zhong3') { const zhengma = drawNumbers.slice(0, 6); hit = tokens.every(t => zhengma.includes(t)); }
          else if (type.startsWith('buzhong')) { hit = !tokens.some(t => drawNumbersSet.has(t)); }
          else if (type.startsWith('lianxiao')) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
          else if (type.startsWith('lianwei')) { hit = tokens.every(t => { const d = t.replace('尾', ''); for (let i = 0; i <= 4; i++) { const n = (i * 10 + parseInt(d)).toString().padStart(2, '0'); if (drawNumbersSet.has(n)) return true; } return false; }); }
        }
        let pl = 0;
        if (drawZodiacs.length > 0 || drawNumbers.length > 0) {
          if (type === '特肖') {
            pl = hit ? (v - v * (rebate / 100) - v * odds) : (v - v * (rebate / 100));
          } else {
            pl = hit ? (v - v * (rebate / 100) - v * odds) : (v - v * (rebate / 100));
          }
        }
        cardPL += pl;
        if (hit) totalHitAmount += v;
        html2 += `<tr><td style="text-align:center;">${displayKey}</td><td style="text-align:center;">${v}</td><td style="text-align:center;">${hit ? `<span class="amount-red-text">${v}</span>` : ''}</td><td style="text-align:center;${pl > 0 ? 'color:#27ae60;' : (pl < 0 ? 'color:#e74c3c;' : '')}">${pl !== 0 ? Math.round(pl) : ''}</td></tr>`;
        totalGroups++; totalAmount += v;
      });
      html2 += '</table>';
      return html2;
    }

    if (type === '特肖') {
      if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 本命年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); }
      if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 普通生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); }
    } else if (type === 'pingtexiao') {
      if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含本年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); }
      if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 其他生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); }
    } else if (type === 'pingtewei') {
      if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含0尾 ──</div>'; tablesHtml += renderTable(data.withYear, true); }
      if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 其他尾数 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); }
    } else if (type.startsWith('lianxiao')) {
      if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含本年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); }
      if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 不含本年生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); }
    } else if (type.startsWith('lianwei')) {
      if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含0尾 ──</div>'; tablesHtml += renderTable(data.withYear, true); }
      if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 不含0尾 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); }
    } else {
      if (data.withYear.size > 0) { tablesHtml += renderTable(data.withYear, false); }
    }

    grandPL += cardPL;
    const roundedCardPL = Math.round(cardPL);

    let cardBgStyle = '';
    if (drawZodiacs.length > 0 || drawNumbers.length > 0) {
      if (cardPL <= -500) cardBgStyle = 'background:#fff0f0;';
      else if (cardPL < 0) cardBgStyle = 'background:#fff8f8;';
      else if (cardPL > 500) cardBgStyle = 'background:#f0fff0;';
      else if (cardPL > 0) cardBgStyle = 'background:#f8fff8;';
    }

    let cardLabel = isBao ? '包' : (isTePeng ? '特碰' : (type === 'zhong2' ? '二中二' : (type === 'zhong3' ? '三中三' : getComboTypeLabel(type))));
    let cardHtml = `<div class="freq-card" id="${cardId}" style="break-inside:avoid; margin-bottom:10px; min-width:180px;${cardBgStyle}">`;
    cardHtml += `<div class="freq-title" style="display:flex; align-items:center; justify-content:space-between;"><span>${cardLabel}</span><button class="btn" style="background:#27ae60;color:#fff;padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;" onclick="screenshotSingleComboCard('${cardId}')">截图</button></div>`;

    cardHtml += `<div style="max-height:400px;overflow-y:auto;">${tablesHtml}</div>`;
    cardHtml += `<div style="border-top:1px solid #ddd;margin-top:4px;padding-top:4px;font-size:11px;text-align:center;">小计：${totalGroups}组 金额：${totalAmount}`;
    if (drawZodiacs.length > 0 || drawNumbers.length > 0) {
      cardHtml += ` 中：${totalHitAmount}`;
      cardHtml += ` 盈亏：<span style="color:${roundedCardPL > 0 ? '#27ae60' : (roundedCardPL < 0 ? '#e74c3c' : '')};">${roundedCardPL > 0 ? roundedCardPL : (roundedCardPL < 0 ? roundedCardPL : '')}</span>`;
    }
    cardHtml += '</div></div>';
    cardsArray.push({ html: cardHtml, groups: totalGroups });
  });

  cardsArray.sort((a, b) => a.groups - b.groups);
  container.innerHTML = cardsArray.map(c => c.html).join('') || '<div style="color:#666;text-align:center;padding:10px;">暂无其他订单数据</div>';
  const roundedGrandPL = Math.round(grandPL);
  let totalHtml = `<span style="color:#0000ff;">总下单金额：</span><span style="color:#0000ff;">${grandTotal}</span>`;
  totalHtml += ` &nbsp; <span style="color:#0000ff;">总订单数：</span><span style="color:#0000ff;">${orderCountLianxiao}</span>`;
  if (drawZodiacs.length > 0 || drawNumbers.length > 0) {
    totalHtml += ` &nbsp; <span style="color:#0000ff;">总盈亏：</span><span style="color:${roundedGrandPL > 0 ? '#27ae60' : (roundedGrandPL < 0 ? '#e74c3c' : '')};">${roundedGrandPL > 0 ? roundedGrandPL : (roundedGrandPL < 0 ? roundedGrandPL : '')}</span>`;
  }
  document.getElementById('lianxiaoStatsTotal').innerHTML = totalHtml;
}

function getComboTypeLabel(type) {
  const map = { '特肖': '特肖', 'tePeng': '特碰', pingtexiao: '平特肖', pingtewei: '平特尾', lianxiao2: '二连肖', lianxiao3: '三连肖', lianxiao4: '四连肖', lianxiao5: '五连肖', zhong2: '二中二', zhong3: '三中三', pingma: '平码', lianwei2: '二连尾', lianwei3: '三连尾', lianwei4: '四连尾', lianwei5: '五连尾', buzhong5: '五不中', buzhong6: '六不中', buzhong7: '七不中', buzhong8: '八不中', buzhong9: '九不中', buzhong10: '十不中', buzhong11: '十一不中', buzhong12: '十二不中' };
  return map[type] || type;
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
      if (newMatch) {
        const playType = normalizePlayType(newMatch[1]);
        return playType !== '特码';
      }
      const oldMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
      return !!oldMatch;
    });
  });
  toDelete.forEach(r => store.delete(r.id));
  refreshLianxiaoStats();
  showToast('已清空全部其他订单');
}

function initIndexedDB() { return new Promise((resolve) => { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onerror = () => { dbAvailable = false; document.getElementById('dbWarning').style.display = 'block'; const dbStatusEl = document.getElementById('dbStatus'); if (dbStatusEl) { dbStatusEl.textContent = '异常'; dbStatusEl.style.color = '#e74c3c'; } resolve(false); }; request.onsuccess = (event) => { db = event.target.result; dbAvailable = true; document.getElementById('dbWarning').style.display = 'none'; const dbStatusEl = document.getElementById('dbStatus'); if (dbStatusEl) { dbStatusEl.textContent = '正常'; dbStatusEl.style.color = '#27ae60'; } resolve(true); }; request.onupgradeneeded = (event) => { db = event.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) { db.createObjectStore(STORE_NAME, { keyPath: 'id' }); } if (!db.objectStoreNames.contains(REPORT_STORE_NAME)) { db.createObjectStore(REPORT_STORE_NAME, { keyPath: 'id' }); } if (!db.objectStoreNames.contains(RECYCLE_STORE_NAME)) { db.createObjectStore(RECYCLE_STORE_NAME, { keyPath: 'id' }); } if (!db.objectStoreNames.contains(LOG_STORE_NAME)) { db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' }); } if (!db.objectStoreNames.contains(COMBO_STORE_NAME)) { db.createObjectStore(COMBO_STORE_NAME, { keyPath: 'id' }); } const tx = event.target.transaction; const orderStore = tx.objectStore(STORE_NAME); const reportStore = tx.objectStore(REPORT_STORE_NAME); const addRegion = (store) => { const allReq = store.getAll(); allReq.onsuccess = () => { const records = allReq.result; records.forEach(r => { if (!r.region) { r.region = 'macau'; store.put(r); } }); }; }; addRegion(orderStore); addRegion(reportStore); }; }); }
async function getAllOrdersUnfiltered() { return new Promise((resolve) => { if (!db) resolve([]); const tx = db.transaction([STORE_NAME], 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); }); }
async function getAllReportsUnfiltered() { return new Promise((resolve) => { if (!db) resolve([]); const tx = db.transaction([REPORT_STORE_NAME], 'readonly'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); }); }
async function getOrderRecords() { const all = await getAllOrdersUnfiltered(); return all.filter(r => r.region === currentRegion); }
async function getReportOrderRecords() { const all = await getAllReportsUnfiltered(); return all.filter(r => r.region === currentRegion); }
async function getComboOrders() { return new Promise((resolve) => { if (!db) resolve([]); const tx = db.transaction([COMBO_STORE_NAME], 'readonly'); const store = tx.objectStore(COMBO_STORE_NAME); const req = store.getAll(); req.onsuccess = (e) => resolve((e.target.result || []).filter(r => r.region === currentRegion)); }); }

async function saveOrderRecordToIDB(content, user, date, totalAmount = 0, ts = null, regionOverride = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), content, user, date, totalAmount, region: regionOverride || currentRegion, timestamp: ts || new Date().toISOString() };
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    showToast('保存失败，请重试');
    return false;
  }
}
async function saveReportOrderRecordToIDB(content, user, date, totalAmount = 0, ts = null, regionOverride = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), content, user, date, totalAmount, region: regionOverride || currentRegion, timestamp: ts || new Date().toISOString() };
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
      const store = tx.objectStore(REPORT_STORE_NAME);
      store.add(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    showToast('保存失败，请重试');
    return false;
  }
}
async function saveComboOrderRecordToIDB(content, user, date, totalAmount = 0, comboType = '', ts = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), content, user, date, totalAmount, comboType, region: currentRegion, timestamp: ts || new Date().toISOString() };
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
      const store = tx.objectStore(COMBO_STORE_NAME);
      store.add(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    showToast('保存失败，请重试');
    return false;
  }
}

// ===== 操作日志函数 =====
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

// ===== 回收站数据操作 =====
async function getRecycleBinRecords() { return new Promise((resolve) => { if (!db) resolve([]); const tx = db.transaction([RECYCLE_STORE_NAME],'readonly'); const store = tx.objectStore(RECYCLE_STORE_NAME); const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); }); }
async function moveToRecycleBin(record, type) { return new Promise((resolve) => { if (!db) { resolve(false); return; } const tx = db.transaction([RECYCLE_STORE_NAME],'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); const recycleRecord = { id: record.id, type: type, content: record.content, user: record.user, date: record.date, totalAmount: record.totalAmount || 0, region: record.region || currentRegion, timestamp: record.timestamp, deletedAt: new Date().toISOString() }; const req = store.add(recycleRecord); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); }
async function deleteFromRecycleBin(id) { return new Promise((resolve) => { if (!db) { resolve(false); return; } const tx = db.transaction([RECYCLE_STORE_NAME],'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); }
async function clearRecycleBin(region = null) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([RECYCLE_STORE_NAME],'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); if (region) { const allReq = store.getAll(); allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); }; } else { const req = store.clear(); req.onsuccess = () => resolve(true); } }); }
async function batchDeleteFromRecycleBin(ids) { return new Promise((resolve) => { if (!db) { resolve(false); return; } const tx = db.transaction([RECYCLE_STORE_NAME],'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); let count = 0; ids.forEach(id => { const req = store.delete(id); req.onsuccess = () => { count++; if (count === ids.length) resolve(true); }; req.onerror = () => { console.error('彻底删除失败', id); }; }); }); }

// ===== 单条删除函数 =====
async function deleteOrderRecordFromIDB(id) { if (!db || !dbAvailable) return false; const record = await new Promise((resolve) => { const tx = db.transaction([STORE_NAME], 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (!record) return false; await moveToRecycleBin(record, 'order'); await new Promise((resolve) => { const tx = db.transaction([STORE_NAME], 'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); return true; }
async function deleteReportOrderRecordFromIDB(id) { if (!db || !dbAvailable) return false; const record = await new Promise((resolve) => { const tx = db.transaction([REPORT_STORE_NAME], 'readonly'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (!record) return false; await moveToRecycleBin(record, 'report'); await new Promise((resolve) => { const tx = db.transaction([REPORT_STORE_NAME], 'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); return true; }
async function deleteComboOrderRecordFromIDB(id) { if (!db || !dbAvailable) return false; const record = await new Promise((resolve) => { const tx = db.transaction([COMBO_STORE_NAME], 'readonly'); const store = tx.objectStore(COMBO_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (!record) return false; await moveToRecycleBin(record, 'combo'); await new Promise((resolve) => { const tx = db.transaction([COMBO_STORE_NAME], 'readwrite'); const store = tx.objectStore(COMBO_STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); return true; }

// ===== 批量删除函数 =====
async function batchDeleteOrderRecordFromIDB(ids) { if (!db || !dbAvailable) return false; try { for (const id of ids) { const record = await new Promise((resolve) => { const tx = db.transaction([STORE_NAME], 'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (record) { await moveToRecycleBin(record, 'order'); await new Promise((resolve) => { const tx = db.transaction([STORE_NAME], 'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); } } return true; } catch (e) { console.error('批量删除订单失败', e); return false; } }
async function batchDeleteReportOrderRecordFromIDB(ids) { if (!db || !dbAvailable) return false; try { for (const id of ids) { const record = await new Promise((resolve) => { const tx = db.transaction([REPORT_STORE_NAME], 'readonly'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (record) { await moveToRecycleBin(record, 'report'); await new Promise((resolve) => { const tx = db.transaction([REPORT_STORE_NAME], 'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); } } return true; } catch (e) { console.error('批量删除上报记录失败', e); return false; } }
async function batchDeleteComboOrderRecordFromIDB(ids) { if (!db || !dbAvailable) return false; try { for (const id of ids) { const record = await new Promise((resolve) => { const tx = db.transaction([COMBO_STORE_NAME], 'readonly'); const store = tx.objectStore(COMBO_STORE_NAME); const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); if (record) { await moveToRecycleBin(record, 'combo'); await new Promise((resolve) => { const tx = db.transaction([COMBO_STORE_NAME], 'readwrite'); const store = tx.objectStore(COMBO_STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false); }); } } return true; } catch (e) { console.error('批量删除连肖记录失败', e); return false; } }

// ===== 清空函数 =====
async function clearAllOrderRecordsFromIDB(region = null) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([STORE_NAME],'readwrite'); const store = tx.objectStore(STORE_NAME); if (region) { const allReq = store.getAll(); allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); }; } else { const req = store.clear(); req.onsuccess = () => resolve(true); } }); }
async function clearAllReportOrderRecordsFromIDB(region = null) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([REPORT_STORE_NAME],'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); if (region) { const allReq = store.getAll(); allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); }; } else { const req = store.clear(); req.onsuccess = () => resolve(true); } }); }
async function clearAllComboOrderRecordsFromIDB(region = null) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([COMBO_STORE_NAME],'readwrite'); const store = tx.objectStore(COMBO_STORE_NAME); if (region) { const allReq = store.getAll(); allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); }; } else { const req = store.clear(); req.onsuccess = () => resolve(true); } }); }

async function calculateStorageUsage() { const records = await getOrderRecords(); const reportRecords = await getReportOrderRecords(); const comboRecords = await getComboOrders(); const orderCount = records.length + reportRecords.length + comboRecords.length; let usedBytes = 0; records.forEach(r => usedBytes += JSON.stringify(r).length * 2); reportRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2); comboRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2); const usedMB = (usedBytes / (1024*1024)).toFixed(2); const maxStorage = 50*1024*1024; const freeMB = ((maxStorage - usedBytes) / (1024*1024)).toFixed(2); document.getElementById('orderCount').textContent = orderCount; document.getElementById('usedSpace').textContent = `${usedMB} MB`; document.getElementById('freeSpace').textContent = `${freeMB} MB`; const filterDate = document.getElementById('filterDate')?.value || getTodayCST(); const todayRecords = records.filter(r => r.date === filterDate); document.getElementById('todayOrderCount').textContent = todayRecords.length; updateLogCount(); }

function getUsers() { const key = `users_${currentRegion}`; return JSON.parse(localStorage.getItem(key) || '[]'); }
function saveUsers(users) { const key = `users_${currentRegion}`; localStorage.setItem(key, JSON.stringify(users)); }
function addUser(name) { const users = getUsers(); if (users.includes(name)) { showToast('用户已存在'); return false; } users.push(name); saveUsers(users); return true; }
async function deleteUser(name) { let users = getUsers(); users = users.filter(u => u !== name); saveUsers(users); if (userBetData[name]) delete userBetData[name]; rebuildTotal(); refreshAll(); }
function rebuildTotal() { tableBetData = {}; for (const u in userBetData) for (const n in userBetData[u]) tableBetData[n] = (tableBetData[n]||0) + userBetData[u][n]; }
function refreshAll() { updateSelects(); updateTableFromRecords(); }
function updateSelects() { const users = getUsers(); const orderSel = document.getElementById('orderUserSelect'); if (orderSel) { orderSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; orderSel.appendChild(o); }); } const comboUserSel = document.getElementById('comboUserSelect'); if (comboUserSel) { comboUserSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; comboUserSel.appendChild(o); }); } const viewSel = document.getElementById('viewUserSelect'); if (viewSel) { viewSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; viewSel.appendChild(o); }); } }

//===== 快捷添加与分词 =====
function quickAddWithAmount(text, button) { const input = document.querySelector('.source-order-input'); if (!input) return; const lines = input.value.trim().split('\n').filter(l=>l.trim()); const idx = lines.findIndex(l=> l.includes(text) && (l.includes('各数')||l.includes('各号'))); if (idx !== -1) { lines.splice(idx,1); button.classList.remove('active'); } else { lines.push(`${text} 各数 `); button.classList.add('active'); } input.value = lines.join('\n'); performRecognition(input.value); const lastIndex = input.value.lastIndexOf('各数'); if (lastIndex !== -1) { const pos = lastIndex + 2; input.focus(); input.setSelectionRange(pos, pos); } }
function getCustomPrefixes() { try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; } }
function getCustomSuffixes() { try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; } }
function getCustomAmountSuffixes() { try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; } }
function getCustomAmountPrefixes() { try { return JSON.parse(localStorage.getItem('customAmountPrefixes') || '[]'); } catch (e) { return []; } }
function saveCustomAmountPrefixes(list) { localStorage.setItem('customAmountPrefixes', JSON.stringify(list)); }

function removeSeparators() { const ta = document.querySelector('.source-order-input'); if(!ta) return; const s=ta.selectionStart,e=ta.selectionEnd; if(s===e){showToast('请先选择文本');return;} const sel=ta.value.substring(s,e); const cleaned=sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g,''); ta.value=ta.value.substring(0,s)+cleaned+ta.value.substring(e); performRecognition(ta.value); }
function replaceSeparators() { const ta=document.querySelector('.source-order-input'); if(!ta) return; const s=ta.selectionStart,e=ta.selectionEnd; if(s===e){showToast('请先选择文本');return;} const sel=ta.value.substring(s,e); const replaced=sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g,'-'); ta.value=ta.value.substring(0,s)+replaced+ta.value.substring(e); performRecognition(ta.value); }

// ===== 前缀管理 =====
function showPrefixManager() { if(document.getElementById('prefixWin'))return; const prefixes=getCustomPrefixes(); const w=document.createElement('div'); w.className='floating-window'; w.id='prefixWin'; w.style.width='500px'; w.style.height='400px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)'; w.innerHTML=`<div class="modal-header"><h3>前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('prefixWin')">🗖</button><button onclick="document.getElementById('prefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newPrefix" placeholder="新增行首忽略词" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addPrefix()" style="padding:6px 12px;background:#3498db;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="prefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('prefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; document.body.appendChild(w); renderPrefixList(); makeWindowDraggable('prefixWin'); highestZ+=1; w.style.zIndex=highestZ;
  document.getElementById('newPrefix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addPrefix(); } });
}
function renderPrefixList(){ const p=getCustomPrefixes(); const c=document.getElementById('prefixList'); if(!c)return; c.innerHTML=p.length===0?'<div style="text-align:center;color:#666;padding:10px;">暂无自定义前缀</div>':p.map((x,i)=>`<div class="replace-preset-item"><span>${x}</span><button onclick="deletePrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join(''); }
async function addPrefix(){ const v=document.getElementById('newPrefix')?.value.trim(); if(!v){showToast('请输入前缀');return;} const p=getCustomPrefixes(); if(p.includes(v)){showToast('已存在');return;} p.push(v); localStorage.setItem('customPrefixes',JSON.stringify(p)); document.getElementById('newPrefix').value=''; renderPrefixList(); }
async function deletePrefix(i){ if(!(await confirm('确定删除？')))return; const p=getCustomPrefixes(); p.splice(i,1); localStorage.setItem('customPrefixes',JSON.stringify(p)); renderPrefixList(); }

// ===== 金额前缀管理 =====
function showAmountPrefixManager() { if(document.getElementById('amountPrefixWin'))return; const list = getCustomAmountPrefixes(); const w=document.createElement('div'); w.className='floating-window'; w.id='amountPrefixWin'; w.style.width='500px'; w.style.height='450px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)'; w.innerHTML=`<div class="modal-header"><h3>金额前缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountPrefixWin')">🗖</button><button onclick="document.getElementById('amountPrefixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountPrefix" placeholder="新增金额前缀（如 投、买）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountPrefix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountPrefixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountPrefixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; document.body.appendChild(w); renderAmountPrefixList(); makeWindowDraggable('amountPrefixWin'); highestZ+=1; w.style.zIndex=highestZ;
  document.getElementById('newAmountPrefix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addAmountPrefix(); } });
}
function renderAmountPrefixList() { const list = getCustomAmountPrefixes(); const container = document.getElementById('amountPrefixList'); if(!container)return; container.innerHTML = list.length===0 ? '<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额前缀</div>' : list.map((x,i) => `<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountPrefix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join(''); }
async function addAmountPrefix() { const v = document.getElementById('newAmountPrefix')?.value.trim(); if(!v){ showToast('请输入金额前缀'); return; } const list = getCustomAmountPrefixes(); if(list.includes(v)){ showToast('已存在'); return; } list.push(v); saveCustomAmountPrefixes(list); document.getElementById('newAmountPrefix').value = ''; renderAmountPrefixList(); showToast('已添加（即时生效）'); }
async function deleteAmountPrefix(i) { if(!(await confirm('确定删除？')))return; const list = getCustomAmountPrefixes(); list.splice(i,1); saveCustomAmountPrefixes(list); renderAmountPrefixList(); }

// ===== 金额后缀管理 =====
function showAmountSuffixManager() { if(document.getElementById('amountSuffixWin'))return; const s=getCustomAmountSuffixes(); const w=document.createElement('div'); w.className='floating-window'; w.id='amountSuffixWin'; w.style.width='500px'; w.style.height='400px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)'; w.innerHTML=`<div class="modal-header"><h3>金额后缀管理</h3><div class="window-controls"><button onclick="maximizeWindow('amountSuffixWin')">🗖</button><button onclick="document.getElementById('amountSuffixWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;display:flex;gap:6px;"><input type="text" id="newAmountSuffix" placeholder="新增后缀(如米、斤)" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><button onclick="addAmountSuffix()" style="padding:6px 12px;background:#e67e22;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="amountSuffixList"></div></div><div class="modal-footer"><button onclick="document.getElementById('amountSuffixWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; document.body.appendChild(w); renderAmountSuffixList(); makeWindowDraggable('amountSuffixWin'); highestZ+=1; w.style.zIndex=highestZ;
  document.getElementById('newAmountSuffix').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addAmountSuffix(); } });
}
function renderAmountSuffixList(){ const s=getCustomAmountSuffixes(); const c=document.getElementById('amountSuffixList'); if(!c)return; c.innerHTML=s.length===0?'<div style="text-align:center;color:#666;padding:10px;">暂无自定义金额后缀</div>':s.map((x,i)=>`<div class="replace-preset-item"><span>${x}</span><button onclick="deleteAmountSuffix(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join(''); }
async function addAmountSuffix(){ const v=document.getElementById('newAmountSuffix')?.value.trim(); if(!v){showToast('请输入后缀');return;} const s=getCustomAmountSuffixes(); if(s.includes(v)){showToast('已存在');return;} s.push(v); localStorage.setItem('customAmountSuffixes',JSON.stringify(s)); document.getElementById('newAmountSuffix').value=''; renderAmountSuffixList(); }
async function deleteAmountSuffix(i){ if(!(await confirm('确定删除？')))return; const s=getCustomAmountSuffixes(); s.splice(i,1); localStorage.setItem('customAmountSuffixes',JSON.stringify(s)); renderAmountSuffixList(); }

// ===== 分类缩写管理 =====
function showCategoryAliases() { if(document.getElementById('categoryAliasWin'))return; const a=getCategoryAliases(); const w=document.createElement('div'); w.className='floating-window'; w.id='categoryAliasWin'; w.style.width='500px'; w.style.height='450px'; w.style.left='50%'; w.style.top='50%'; w.style.transform='translate(-50%,-50%)'; w.innerHTML=`<div class="modal-header"><h3>分类缩写</h3><div class="window-controls"><button onclick="maximizeWindow('categoryAliasWin')">🗖</button><button onclick="document.getElementById('categoryAliasWin').remove()">×</button></div></div><div class="modal-body"><div style="margin-bottom:12px;"><div style="display:flex;gap:6px;margin-bottom:8px;"><input type="text" id="aliasOld" placeholder="缩写（如 红蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"><span style="align-self:center;">→</span><input type="text" id="aliasNew" placeholder="正规分类（如 红波-蓝波）" style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;"></div><button onclick="addCategoryAlias()" style="padding:6px 12px;background:#007bff;color:#fff;border:none;border-radius:4px;">添加</button></div><div id="aliasList"></div></div><div class="modal-footer"><button onclick="document.getElementById('categoryAliasWin').remove()" style="padding:8px 16px;background:#6c757d;color:#fff;border:none;border-radius:4px;">关闭</button></div>`; document.body.appendChild(w); renderAliasList(); makeWindowDraggable('categoryAliasWin'); highestZ+=1; w.style.zIndex=highestZ;
  document.getElementById('aliasOld').addEventListener('keypress', (e) => { if (e.key === 'Enter') { document.getElementById('aliasNew').focus(); } });
  document.getElementById('aliasNew').addEventListener('keypress', (e) => { if (e.key === 'Enter') { addCategoryAlias(); } });
}
function renderAliasList(){ const a=getCategoryAliases(); const c=document.getElementById('aliasList'); if(!c)return; c.innerHTML=a.length===0?'<div style="text-align:center;color:#666;padding:10px;">暂无分类缩写</div>':a.map((x,i)=>`<div class="replace-preset-item"><span>${x.alias} → ${x.target}</span><button onclick="deleteCategoryAlias(${i})" style="margin-left:auto;padding:2px 8px;background:#e74c3c;color:#fff;border:none;border-radius:3px;">删除</button></div>`).join(''); }
async function addCategoryAlias(){ const alias=document.getElementById('aliasOld')?.value.trim(); const target=document.getElementById('aliasNew')?.value.trim(); if(!alias||!target){showToast('请输入缩写和目标分类');return;} const a=getCategoryAliases(); if(a.some(x=>x.alias===alias)){showToast('该缩写已存在');return;} a.push({alias,target}); a.sort((x,y)=>y.alias.length-x.alias.length); localStorage.setItem('categoryAliases',JSON.stringify(a)); document.getElementById('aliasOld').value=''; document.getElementById('aliasNew').value=''; renderAliasList(); }
async function deleteCategoryAlias(i){ if(!(await confirm('确定删除？')))return; const a=getCategoryAliases(); a.splice(i,1); localStorage.setItem('categoryAliases',JSON.stringify(a)); renderAliasList(); }

// ===== 替换预设管理 =====
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

async function resetPresetsToDefault(){
  if(!(await confirm('确定恢复替换预设和分类缩写为默认值吗？当前自定义数据将被覆盖。')))return;
  const defaultPresets=[
    {"old":"兰","new":"蓝"},{"old":"录","new":"绿"},{"old":"碌","new":"绿"},{"old":"禄","new":"绿"},{"old":"拦","new":"蓝"},{"old":"篮","new":"蓝"},{"old":"免","new":"兔"},{"old":"午","new":"牛"},{"old":"侯","new":"猴"},{"old":"㺅","new":"猴"},{"old":"名","new":"各"}
  ];
  const defaultAliases=[
{"alias":"红色","target":"红波"},{"alias":"蓝色","target":"蓝波"},{"alias":"绿色","target":"绿波"},{"alias":"兰波","target":"蓝波"},{"alias":"录波","target":"绿波"},{"alias":"金行","target":"金"},{"alias":"木行","target":"木"},{"alias":"水行","target":"水"},{"alias":"火行","target":"火"},{"alias":"土行","target":"土"},{"alias":"红蓝","target":"红波-蓝波"},{"alias":"红绿","target":"红波-绿波"},{"alias":"蓝绿","target":"蓝波-绿波"},{"alias":"火土","target":"火-土"},{"alias":"红蓝波","target":"红波-蓝波"},{"alias":"红绿波","target":"红波-绿波"},{"alias":"蓝绿波","target":"蓝波-绿波"},{"alias":"大单小双","target":"大单-小双"},{"alias":"大双小单","target":"大双-小单"},{"alias":"金木水","target":"金-木-水"},{"alias":"家肖","target":"家禽"},{"alias":"野肖","target":"野兽"},{"alias":"号各","target":"各号"},{"alias":"小数","target":"小"},{"alias":"大数","target":"大"},{"alias":"合单","target":"合数单"},{"alias":"合双","target":"合数双"},{"alias":"大尾","target":"尾大"},{"alias":"小尾","target":"尾小"},{"alias":"大数单","target":"大单"},{"alias":"大数双","target":"大双"},{"alias":"小数单","target":"小单"},{"alias":"小数双","target":"小双"},{"alias":"红波单","target":"红单"},{"alias":"红波双","target":"红双"},{"alias":"蓝波单","target":"蓝单"},{"alias":"蓝波双","target":"蓝双"},{"alias":"绿波单","target":"绿单"},{"alias":"绿波双","target":"绿双"},{"alias":"老虎","target":"虎"},{"alias":"老鼠","target":"鼠"},{"alias":"兔子","target":"兔"},{"alias":"大号","target":"大"},{"alias":"小号","target":"小"}
  ];
  localStorage.setItem('replacePresets',JSON.stringify(defaultPresets));
  localStorage.setItem('categoryAliases',JSON.stringify(defaultAliases));
  renderPresetList(); showToast('已恢复默认替换预设和分类缩写');
}

// ===== 升级版语义转换 =====
function semanticReplace() { 
  const ta=document.querySelector('.source-order-input'); 
  if(!ta)return; 
  const s=ta.selectionStart,e=ta.selectionEnd; 
  if(s===e){showToast('请先选择文本');return;} 
  const sel=ta.value.substring(s,e).trim(); 
  if(!sel){showToast('请先选择文本');return;}

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

// ===== 保存订单 =====
async function saveOrder(){ 
  const user=document.getElementById('orderUserSelect')?.value; 
  if(!user){showToast('请选择用户');return;} 
  const pureLines = window._pureOrderLines; 
  const pureRegions = window._pureOrderRegions || [];
  if(!pureLines || pureLines.length === 0){showToast('订单无效');return;} 
  const date=document.getElementById('filterDate')?.value||getTodayCST(); 
  
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

  // 平特肖数据处理
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
      if(line.startsWith('特肖:')){
        const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
        if(match){ totalAmount += match[1].split('-').filter(z => z.trim()).length * (parseInt(match[2]) || 0); }
      } else if(line.startsWith('包')){
        const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
        if(match){ totalAmount += parseInt(match[3]) || 0; }
      } else if(line.startsWith('特碰:')){
        const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
        if(match){
          const cleaned = match[1].replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c => c.trim());
          totalAmount += groups.length * (parseInt(match[2]) || 0);
        }
      } else if(line.startsWith('特码:')){
        const{numbers,amount}=countItemsInLine(line);
        if(numbers.length>0 && amount>0) totalAmount += numbers.length * amount;
      } else {
        const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
        if(match){
          const playType = match[1];
          const content = match[2];
          const amt = parseInt(match[3]) || 0;
          if(playType==='平特肖'||playType==='平特尾'||playType==='平码'){
            const items = content.split('-').filter(i=>i.trim());
            totalAmount += items.length * amt;
          } else {
            const cleaned = content.replace(/[()]/g, '');
            const groups = cleaned.split(/\s+/).filter(c=>c.trim());
            totalAmount += groups.length * amt;
          }
        }
      }
    });
    await saveOrderRecordToIDB(content, user, date, totalAmount, null, region);
    addOperationLog('save_order', content, region, user, totalAmount);
    savedCount++;
  }
  
  const si=document.querySelector('.source-order-input'); if(si)si.value=''; 
  const resultEl=document.getElementById('orderResult'); if(resultEl)resultEl.innerHTML=''; 
  window._pureOrderLines = []; 
  window._pureOrderRegions = [];
  updateOrderTotalDisplay(); 
  const md=document.getElementById('maxLossDisplay'); if(md){md.textContent='';md.style.display='none';} 
  document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active')); 
  
  await updateTableFromRecords();
  calculateStorageUsage(); showStorageDrawerTemporary(5000); renderSmartDecision(); updateSingleBetDisplay(); 
  updateOrderCountDisplay();
  renderPingtexiaoTable(); updatePingtexiaoTotal();
  showToast('已保存下单（' + savedCount + '个地区）');
}

// ===== 保存上报订单 =====
async function saveReportOrder(){ 
  const user=document.getElementById('orderUserSelect')?.value; 
  if(!user){showToast('请选择用户');return;} 
  const pureLines = window._pureOrderLines; 
  const pureRegions = window._pureOrderRegions || [];
  if(!pureLines || pureLines.length === 0){showToast('订单无效');return;} 
  const date=document.getElementById('filterDate')?.value||getTodayCST(); 
  
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

  // 平特肖数据处理
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
      if(line.startsWith('特肖:')){
        const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
        if(match){ totalAmount += match[1].split('-').filter(z => z.trim()).length * (parseInt(match[2]) || 0); }
      } else if(line.startsWith('包')){
        const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
        if(match){ totalAmount += parseInt(match[3]) || 0; }
      } else if(line.startsWith('特碰:')){
        const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
        if(match){
          const cleaned = match[1].replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c => c.trim());
          totalAmount += groups.length * (parseInt(match[2]) || 0);
        }
      } else if(line.startsWith('特码:')){
        const{numbers,amount}=countItemsInLine(line);
        if(numbers.length>0 && amount>0) totalAmount += numbers.length * amount;
      } else {
        const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
        if(match){
          const playType = match[1];
          const content = match[2];
          const amt = parseInt(match[3]) || 0;
          if(playType==='平特肖'||playType==='平特尾'||playType==='平码'){
            const items = content.split('-').filter(i=>i.trim());
            totalAmount += items.length * amt;
          } else {
            const cleaned = content.replace(/[()]/g, '');
            const groups = cleaned.split(/\s+/).filter(c=>c.trim());
            totalAmount += groups.length * amt;
          }
        }
      }
    });
    await saveReportOrderRecordToIDB(content, user, date, totalAmount, null, region);
    addOperationLog('save_report', content, region, user, totalAmount);
    savedCount++;
  }
  
  const si=document.querySelector('.source-order-input'); if(si)si.value=''; 
  const resultEl=document.getElementById('orderResult'); if(resultEl)resultEl.innerHTML=''; 
  window._pureOrderLines = []; 
  window._pureOrderRegions = [];
  updateOrderTotalDisplay(); 
  const md=document.getElementById('maxLossDisplay'); if(md){md.textContent='';md.style.display='none';} 
  document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active')); 
  
  await updateTableFromRecords();
  calculateStorageUsage(); showStorageDrawerTemporary(5000); renderSmartDecision(); 
  renderPingtexiaoTable(); updatePingtexiaoTotal();
  showToast('已上报成功（' + savedCount + '个地区）'); 
  setTimeout(() => { const toast = document.querySelector('.toast-message.show'); if (toast) toast.style.color = '#ff0000'; }, 10); 
}
// ===== business.js 续：表格渲染与数据更新 =====

function updateOrderCountDisplay() {
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  getOrderRecords().then(orders => {
    const todayOrders = orders.filter(r => r.date === fd);
    const countEl = document.getElementById('duiJiangOrderCount');
    if (countEl) { countEl.textContent = '(共' + todayOrders.length + '单)'; }
  });
}

async function updateTableFromRecords(){
  try{
    const fd=document.getElementById('filterDate')?.value;
    const recs=await getOrderRecords();
    const reps=await getReportOrderRecords();
    const riskSwitcher = document.getElementById('riskReportSwitcher')?.value || 'total';
    const viewUser = document.getElementById('viewUserSelect')?.value;
    let filterUser = null;
    if (riskSwitcher === 'user' && viewUser) { filterUser = viewUser; }
    
    tableBetData={};userBetData={};reportBetData={};reportAmountData={};reportRiskData={};
    numberCount={};zodiacCount={};numberAmountCount={};zodiacAmountCount={};
    zodiacDirectAmount={};zodiacFilteredAmount={};
    zodiacReportAmount={};zodiacFilteredReportAmount={};
    numberOrderTotal=0;zodiacWeightedTotal=0; orderCountAll=0;
    originalOrderAmount={}; directOrderAmount={}; directReportAmount={};
    const nMin=parseInt(document.getElementById('numAmountMin')?.value)||1,nMax=parseInt(document.getElementById('numAmountMax')?.value)||50000;
    const zMin=parseInt(document.getElementById('zodiacAmountMin')?.value)||1,zMax=parseInt(document.getElementById('zodiacAmountMax')?.value)||50000;
    const curZod=localStorage.getItem('selectedStartZodiac')||'马';
    const fRecs=fd?recs.filter(r=>r.date===fd):recs;
    const fReps=fd?reps.filter(r=>r.date===fd):reps;
    const fRecsFiltered = filterUser ? fRecs.filter(r => r.user === filterUser) : fRecs;
    const fRepsFiltered = filterUser ? fReps.filter(r => r.user === filterUser) : fReps;
    
    function expandKeyToZodiacs(key) {
      if (!D[key]) return [];
      const val = D[key];
      if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]+$/.test(val)) return val.split('');
      if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(key) && ZODIAC_NUMS[key]) return [key];
      return [];
    }
    
    function expandKeyToNums(key) {
      if (!D[key]) return [];
      const val = D[key];
      if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]+$/.test(val)) return [];
      return val.split(/[\s,，]+/).filter(n => n.trim());
    }

    fRecsFiltered.forEach(rec=>{ try{
      if(!userBetData[rec.user])userBetData[rec.user]={};
      rec.content.split('\n').filter(l=>l.trim()).forEach(line=>{
        const teXiaoMatch = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
        if (teXiaoMatch) {
          const zodiacsStr = teXiaoMatch[1];
          const amtRaw = parseInt(teXiaoMatch[2]) || 0;
          if (amtRaw <= 0) return;
          orderCountAll++;
          const zodiacs = zodiacsStr.split('-').map(z => z.trim()).filter(z => z);
          zodiacs.forEach(z => {
            const isBenming = z === curZod;
            const perNumAmt = Math.round(amtRaw / (isBenming ? 5 : 4));
            if (perNumAmt <= 0) return;
            const nums = (ZODIAC_NUMS[z] || '').split(/[\s,，]+/);
            nums.forEach(num => {
              const numPadded = num.padStart(2, '0');
              userBetData[rec.user][numPadded] = (userBetData[rec.user][numPadded] || 0) + perNumAmt;
              tableBetData[numPadded] = (tableBetData[numPadded] || 0) + perNumAmt;
              reportBetData[numPadded] = (reportBetData[numPadded] || 0) + perNumAmt;
              originalOrderAmount[numPadded] = (originalOrderAmount[numPadded] || 0) + perNumAmt;
            });
            zodiacCount[z] = (zodiacCount[z] || 0) + 1;
            zodiacDirectAmount[z] = (zodiacDirectAmount[z] || 0) + amtRaw;
            if (perNumAmt >= zMin && perNumAmt <= zMax) {
              zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1;
              zodiacFilteredAmount[z] = (zodiacFilteredAmount[z] || 0) + amtRaw;
            }
          });
          return;
        }
        
        const tepengMatch = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
        if (tepengMatch) {
          const cleaned = tepengMatch[1].replace(/[()]/g, '');
          const combos = cleaned.split(/\s+/).filter(c => c.trim());
          const amtRaw = parseInt(tepengMatch[2]) || 0;
          if (amtRaw <= 0) return;
          orderCountAll++;
          combos.forEach(combo => {
            const tokens = combo.split('-');
            if (tokens.length === 2) {
              const n1 = tokens[0].padStart(2, '0');
              const n2 = tokens[1].padStart(2, '0');
              [n1, n2].forEach(num => {
                userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amtRaw;
                tableBetData[num] = (tableBetData[num] || 0) + amtRaw;
                reportBetData[num] = (reportBetData[num] || 0) + amtRaw;
                originalOrderAmount[num] = (originalOrderAmount[num] || 0) + amtRaw;
                directOrderAmount[num] = (directOrderAmount[num] || 0) + amtRaw;
                numberOrderTotal += amtRaw;
                numberCount[num] = (numberCount[num] || 0) + 1;
                if (amtRaw >= nMin && amtRaw <= nMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
              });
            }
          });
          return;
        }
        
        const baoMatch = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
        if (baoMatch) {
          const attr = baoMatch[2].trim();
          const amt = parseInt(baoMatch[3]) || 0;
          if (amt <= 0 || !D[attr]) return;
          orderCountAll++;
          if (attr === '家禽' || attr === '野兽') {
            const zodiacList = expandKeyToZodiacs(attr);
            if (zodiacList.length === 0) return;
            const perZodiacAmt = Math.round(amt / zodiacList.length);
            zodiacList.forEach(z => {
              zodiacCount[z] = (zodiacCount[z] || 0) + 1;
              zodiacDirectAmount[z] = (zodiacDirectAmount[z] || 0) + perZodiacAmt;
              const nums = (ZODIAC_NUMS[z] || '').split(/[\s,，]+/);
              const perNumAmt = Math.round(perZodiacAmt / nums.length);
              nums.forEach(num => {
                const numPadded = num.padStart(2, '0');
                userBetData[rec.user][numPadded] = (userBetData[rec.user][numPadded] || 0) + perNumAmt;
                tableBetData[numPadded] = (tableBetData[numPadded] || 0) + perNumAmt;
                reportBetData[numPadded] = (reportBetData[numPadded] || 0) + perNumAmt;
                originalOrderAmount[numPadded] = (originalOrderAmount[numPadded] || 0) + perNumAmt;
              });
            });
          } else {
            const numList = (D[attr] || '').split(/[\s,，]+/).filter(n => n.trim());
            if (numList.length === 0) return;
            const perNumAmt = Math.round(amt / numList.length);
            numList.forEach(n => {
              const numPadded = n.padStart(2, '0');
              numberCount[numPadded] = (numberCount[numPadded] || 0) + 1;
              if (perNumAmt >= nMin && perNumAmt <= nMax) numberAmountCount[numPadded] = (numberAmountCount[numPadded] || 0) + 1;
              userBetData[rec.user][numPadded] = (userBetData[rec.user][numPadded] || 0) + perNumAmt;
              tableBetData[numPadded] = (tableBetData[numPadded] || 0) + perNumAmt;
              reportBetData[numPadded] = (reportBetData[numPadded] || 0) + perNumAmt;
              originalOrderAmount[numPadded] = (originalOrderAmount[numPadded] || 0) + perNumAmt;
              directOrderAmount[numPadded] = (directOrderAmount[numPadded] || 0) + perNumAmt;
              numberOrderTotal += perNumAmt;
            });
          }
          return;
        }
        
        let content, amt;
        const teMaMatch = line.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/);
        if (teMaMatch) {
          content = teMaMatch[1];
          amt = parseInt(teMaMatch[2]) || 0;
        } else {
          const oldMatch = line.match(/^(.+?)\s+各(?:数|)\s*(\d+)$/);
          if (oldMatch && !/^特肖:/.test(line) && !/^包/.test(line) && !/^特碰:/.test(line) && !/[:：]/.test(line)) {
            content = oldMatch[1];
            amt = parseInt(oldMatch[2]) || 0;
          } else {
            return;
          }
        }
        if (amt <= 0) return;
        orderCountAll++;
        const items = content.split('-').map(i => i.trim()).filter(i => i);

        items.forEach(item => {
          if (/^\d{1,2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
            const num = item.padStart(2, '0');
            numberCount[num] = (numberCount[num] || 0) + 1;
            if (amt >= nMin && amt <= nMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
            userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amt;
            tableBetData[num] = (tableBetData[num] || 0) + amt;
            reportBetData[num] = (reportBetData[num] || 0) + amt;
            originalOrderAmount[num] = (originalOrderAmount[num] || 0) + amt;
            directOrderAmount[num] = (directOrderAmount[num] || 0) + amt;
            numberOrderTotal += amt;
            return;
          }

          if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(item)) {
            zodiacCount[item] = (zodiacCount[item] || 0) + 1;
            const zNumCount = (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).length || 0;
            zodiacDirectAmount[item] = (zodiacDirectAmount[item] || 0) + amt * zNumCount;
            if (amt >= zMin && amt <= zMax) {
              zodiacAmountCount[item] = (zodiacAmountCount[item] || 0) + 1;
              zodiacFilteredAmount[item] = (zodiacFilteredAmount[item] || 0) + amt * zNumCount;
            }
            (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => {
              const num = n.padStart(2, '0');
              userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amt;
              tableBetData[num] = (tableBetData[num] || 0) + amt;
              reportBetData[num] = (reportBetData[num] || 0) + amt;
              originalOrderAmount[num] = (originalOrderAmount[num] || 0) + amt;
            });
            return;
          }

          if (D[item]) {
            const zodiacList = expandKeyToZodiacs(item);
            if (zodiacList.length > 0) {
              zodiacList.forEach(z => {
                zodiacCount[z] = (zodiacCount[z] || 0) + 1;
                const zNumCount = (ZODIAC_NUMS[z] || '').split(/[\s,，]+/).length || 0;
                zodiacDirectAmount[z] = (zodiacDirectAmount[z] || 0) + amt * zNumCount;
                if (amt >= zMin && amt <= zMax) {
                  zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1;
                  zodiacFilteredAmount[z] = (zodiacFilteredAmount[z] || 0) + amt * zNumCount;
                }
                (ZODIAC_NUMS[z] || '').split(/[\s,，]+/).forEach(n => {
                  const num = n.padStart(2, '0');
                  userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amt;
                  tableBetData[num] = (tableBetData[num] || 0) + amt;
                  reportBetData[num] = (reportBetData[num] || 0) + amt;
                  originalOrderAmount[num] = (originalOrderAmount[num] || 0) + amt;
                });
              });
              return;
            }
            const numList = expandKeyToNums(item);
            if (numList.length > 0) {
              numList.forEach(n => {
                const num = n.padStart(2, '0');
                numberCount[num] = (numberCount[num] || 0) + 1;
                if (amt >= nMin && amt <= nMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
                userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amt;
                tableBetData[num] = (tableBetData[num] || 0) + amt;
                reportBetData[num] = (reportBetData[num] || 0) + amt;
                originalOrderAmount[num] = (originalOrderAmount[num] || 0) + amt;
                directOrderAmount[num] = (directOrderAmount[num] || 0) + amt;
                numberOrderTotal += amt;
              });
            }
          }
        });
      });
    } catch(e) {} });

    fRepsFiltered.forEach(rec=>{ try{
      const user=rec.user;
      rec.content.split('\n').filter(l=>l.trim()).forEach(line=>{
        const teXiaoMatch = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
        if (teXiaoMatch) {
          const zodiacsStr = teXiaoMatch[1];
          const amtRaw = parseInt(teXiaoMatch[2]) || 0;
          if (amtRaw <= 0) return;
          const zodiacs = zodiacsStr.split('-').map(z => z.trim()).filter(z => z);
          zodiacs.forEach(z => {
            const isBenming = z === curZod;
            const perNumAmt = Math.round(amtRaw / (isBenming ? 5 : 4));
            if (perNumAmt <= 0) return;
            const nums = (ZODIAC_NUMS[z] || '').split(/[\s,，]+/);
            nums.forEach(num => {
              const numPadded = num.padStart(2, '0');
              reportBetData[numPadded] = (reportBetData[numPadded] || 0) - perNumAmt;
              reportAmountData[numPadded] = (reportAmountData[numPadded] || 0) + perNumAmt;
              if (user && userBetData[user]) userBetData[user][numPadded] = (userBetData[user][numPadded] || 0) - perNumAmt;
            });
            zodiacReportAmount[z] = (zodiacReportAmount[z] || 0) + amtRaw;
            if (perNumAmt >= zMin && perNumAmt <= zMax) zodiacFilteredReportAmount[z] = (zodiacFilteredReportAmount[z] || 0) + amtRaw;
          });
          return;
        }

        const tepengMatch = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
        if (tepengMatch) {
          const cleaned = tepengMatch[1].replace(/[()]/g, '');
          const combos = cleaned.split(/\s+/).filter(c => c.trim());
          const amtRaw = parseInt(tepengMatch[2]) || 0;
          if (amtRaw <= 0) return;
          combos.forEach(combo => {
            const tokens = combo.split('-');
            if (tokens.length === 2) {
              [tokens[0].padStart(2, '0'), tokens[1].padStart(2, '0')].forEach(num => {
                reportBetData[num] = (reportBetData[num] || 0) - amtRaw;
                reportAmountData[num] = (reportAmountData[num] || 0) + amtRaw;
                if (user && userBetData[user]) userBetData[user][num] = (userBetData[user][num] || 0) - amtRaw;
                directReportAmount[num] = (directReportAmount[num] || 0) + amtRaw;
              });
            }
          });
          return;
        }

        const baoMatch = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
        if (baoMatch) {
          const attr = baoMatch[2].trim();
          const amt = parseInt(baoMatch[3]) || 0;
          if (amt <= 0 || !D[attr]) return;
          if (attr === '家禽' || attr === '野兽') {
            const zodiacList = expandKeyToZodiacs(attr);
            if (zodiacList.length === 0) return;
            const perZodiacAmt = Math.round(amt / zodiacList.length);
            zodiacList.forEach(z => {
              zodiacReportAmount[z] = (zodiacReportAmount[z] || 0) + perZodiacAmt;
              const nums = (ZODIAC_NUMS[z] || '').split(/[\s,，]+/);
              const perNumAmt = Math.round(perZodiacAmt / nums.length);
              nums.forEach(num => {
                const numPadded = num.padStart(2, '0');
                reportBetData[numPadded] = (reportBetData[numPadded] || 0) - perNumAmt;
                reportAmountData[numPadded] = (reportAmountData[numPadded] || 0) + perNumAmt;
                if (user && userBetData[user]) userBetData[user][numPadded] = (userBetData[user][numPadded] || 0) - perNumAmt;
              });
            });
          } else {
            const numList = (D[attr] || '').split(/[\s,，]+/).filter(n => n.trim());
            if (numList.length === 0) return;
            const perNumAmt = Math.round(amt / numList.length);
            numList.forEach(n => {
              const numPadded = n.padStart(2, '0');
              reportBetData[numPadded] = (reportBetData[numPadded] || 0) - perNumAmt;
              reportAmountData[numPadded] = (reportAmountData[numPadded] || 0) + perNumAmt;
              if (user && userBetData[user]) userBetData[user][numPadded] = (userBetData[user][numPadded] || 0) - perNumAmt;
              directReportAmount[numPadded] = (directReportAmount[numPadded] || 0) + perNumAmt;
            });
          }
          return;
        }

        const { numbers, zodiacs, amount, playType } = countItemsInLine(line);
        if (!amount || amount <= 0) return;
        if (playType && playType !== '特码') return;

        numbers.forEach(num => {
          reportBetData[num] = (reportBetData[num] || 0) - amount;
          reportAmountData[num] = (reportAmountData[num] || 0) + amount;
          if (user && userBetData[user]) userBetData[user][num] = (userBetData[user][num] || 0) - amount;
          if (zodiacs.length === 0) directReportAmount[num] = (directReportAmount[num] || 0) + amount;
        });

        zodiacs.forEach(z => {
          const zNumCount = (ZODIAC_NUMS[z] || '').split(/[\s,，]+/).length || 0;
          zodiacReportAmount[z] = (zodiacReportAmount[z] || 0) + amount * zNumCount;
          if (amount >= zMin && amount <= zMax) zodiacFilteredReportAmount[z] = (zodiacFilteredReportAmount[z] || 0) + amount * zNumCount;
        });
      });
    } catch(e) {} });

    generateRiskTable(); generateReportTable(); renderFrequencyCards(); renderAmountFrequencyCards();
    renderReportAmountTable(); renderOriginalAmountTable(); updateReportAmountTotal(); updateAmountDisplays();
    renderPingtexiaoTable(); updatePingtexiaoTotal();
    calculateStorageUsage(); renderSmartDecision(); updateSingleBetDisplay(); updateOrderCountDisplay();
  } catch(e) {}
}

function updateDirectAmountTotals() {
  let orderTotal = 0; let reportTotal = 0;
  for (let n in directOrderAmount) { orderTotal += directOrderAmount[n] || 0; }
  for (let n in directReportAmount) { reportTotal += directReportAmount[n] || 0; }
  const orderBox = document.getElementById('directOrderTotalBox'); const orderSpan = document.getElementById('directOrderTotalAmount');
  if (orderBox && orderSpan) { if (orderTotal > 0) { orderSpan.textContent = orderTotal; orderBox.style.display = 'inline-flex'; } else { orderBox.style.display = 'none'; } }
  const reportBox = document.getElementById('directReportTotalBox'); const reportSpan = document.getElementById('directReportTotalAmount');
  if (reportBox && reportSpan) { if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; } }
}

function renderOriginalAmountTable() { const tbl = document.getElementById('originalAmountTable'); if (!tbl) return; const cols = [...Array(5)].map((_,c)=>Array.from({length:c===4?9:10},(_,r)=>(c*10+r+1).toString().padStart(2,'0'))); let th = '<thead><tr>'; for (let c=0;c<5;c++) th += '<th>号码</th><th>次数</th><th>金额</th><th>上报</th>'; th += '</tr></thead>'; let tb = '<tbody>'; for (let r=0;r<10;r++) { tb += '<tr>'; for (let c=0;c<5;c++) { const n = cols[c][r] || ''; if (n) { const cnt = numberCount[n] || 0; const amt = directOrderAmount[n] || 0; const rpt = directReportAmount[n] || 0; const cls = redNumbers.includes(n) ? 'red-text' : (blueNumbers.includes(n) ? 'blue-text' : 'green-text'); tb += `<td class="${cls}">${n}</td>`; tb += `<td class="black-text">${cnt > 0 ? cnt : ''}</td>`; tb += `<td class="amount-red-text">${amt > 0 ? amt : ''}</td>`; tb += `<td class="report-red-text">${rpt > 0 ? rpt : ''}</td>`; } else { tb += '<td></td><td></td><td></td><td></td>'; } } tb += '</tr>'; } tb += '</tbody>'; tbl.innerHTML = th + tb; updateDirectAmountTotals(); }

function updateOrderTotalDisplay(){
  const re=document.getElementById('orderResult'); const box=document.getElementById('orderTotalAmountBox'); const span=document.getElementById('orderTotalAmount'); const lineCountSpan=document.getElementById('orderLineCount');
  if(!re||!box||!span)return;
  const pureLines = window._pureOrderLines || [];
  if(pureLines.length === 0){ box.style.display='none'; if(lineCountSpan) lineCountSpan.style.display='none'; return; }
  let total=0; let validLineCount=pureLines.length;
  pureLines.forEach(line=>{
    if(line.startsWith('特肖:')){
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const zodiacs = match[1].split('-').filter(z => z.trim());
        const amt = parseInt(match[2]) || 0;
        total += zodiacs.length * amt;
      }
    } else if(line.startsWith('特碰:')){
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const cleaned = match[1].replace(/[()]/g, '');
        const groups = cleaned.split(/\s+/).filter(c => c.trim());
        const amtRaw = parseInt(match[2]) || 0;
        total += groups.length * amtRaw;
      }
    } else if(line.startsWith('包')){
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        const amtRaw = parseInt(match[3]) || 0;
        total += amtRaw;
      }
    } else if(line.startsWith('特码:')){
      const{numbers,amount}=countItemsInLine(line);
      const cnt=numbers.length;
      if(cnt>0 && amount>0) total+=cnt*amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3])||0;
        if(playType==='平特肖'||playType==='平特尾'||playType==='平码'){
          const items = content.split('-').filter(i=>i.trim());
          total += items.length * amt;
        } else {
          const cleaned = content.replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c=>c.trim());
          total += groups.length * amt;
        }
      }
    }
  });
  span.textContent=total;
  if(total>0){ box.style.display='inline-flex'; if(lineCountSpan){ lineCountSpan.innerHTML = '<span style="color:#000;">' + validLineCount + '</span>行'; lineCountSpan.style.display = 'inline'; } }
  else { box.style.display='none'; if(lineCountSpan) lineCountSpan.style.display='none'; }
}
function computeCurrentOrderTotal(){ 
  const pureLines = window._pureOrderLines || []; 
  let total=0; 
  pureLines.forEach(line=>{
    if(line.startsWith('特肖:')){
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const zodiacs = match[1].split('-').filter(z => z.trim());
        const amt = parseInt(match[2]) || 0;
        total += zodiacs.length * amt;
      }
    } else if(line.startsWith('特碰:')){
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const cleaned = match[1].replace(/[()]/g, '');
        const groups = cleaned.split(/\s+/).filter(c => c.trim());
        total += groups.length * (parseInt(match[2]) || 0);
      }
    } else if(line.startsWith('包')){
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        total += parseInt(match[3]) || 0;
      }
    } else if(line.startsWith('特码:')){
      const{numbers,amount}=countItemsInLine(line);
      const cnt=numbers.length;
      if(cnt>0) total+=cnt*amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3])||0;
        if(playType==='平特肖'||playType==='平特尾'||playType==='平码'){
          const items = content.split('-').filter(i=>i.trim());
          total += items.length * amt;
        } else {
          const cleaned = content.replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c=>c.trim());
          total += groups.length * amt;
        }
      }
    }
  });
  return total; 
}
function updateAmountDisplays(){ 
  const nb=document.getElementById('numberTotalBox'); 
  const zb=document.getElementById('zodiacTotalBox'); 
  if(numberOrderTotal>0){
    document.getElementById('numberTotalAmount').textContent=numberOrderTotal;
    nb.style.display='inline-flex';
  } else { nb.style.display='none'; } 
  let zodiacTotal = 0;
  for (let z in zodiacDirectAmount) { zodiacTotal += zodiacDirectAmount[z] || 0; }
  if(zodiacTotal > 0){
    document.getElementById('zodiacTotalAmount').textContent = zodiacTotal;
    zb.style.display = 'inline-flex';
  } else { zb.style.display = 'none'; } 
}
function updateReportAmountTotal(){ const box=document.getElementById('reportAmountTotalBox'); const span=document.getElementById('reportAmountTotalValue'); let total=0; for(let n in reportAmountData)total+=reportAmountData[n]||0; if(total>0){span.textContent=total;box.style.display='inline-flex';}else{box.style.display='none';} }

function renderAllTablesPlaceholder() { const tbody = document.getElementById('tableBody'); if (tbody) { let html = ''; for (let i=1; i<=49; i++) { const num = i.toString().padStart(2,'0'); const zodiac = currentZodiacMap[num] || ''; const cls = redNumbers.includes(num)?'red-text':(blueNumbers.includes(num)?'blue-text':'green-text'); html += `<tr class="${cls}"><td>${num}${zodiac}</td><td>0</td><td>0</td><td>${num}</td><td>${i}</td></tr>`; } tbody.innerHTML = html; } const reportTbody = document.getElementById('reportTableBody'); if (reportTbody) { let html = ''; for (let i=1; i<=49; i++) { const num = i.toString().padStart(2,'0'); const zodiac = currentZodiacMap[num] || ''; const cls = redNumbers.includes(num)?'red-text':(blueNumbers.includes(num)?'blue-text':'green-text'); html += `<tr class="${cls}"><td>${num}${zodiac}</td><td>0</td><td>0</td><td>${num}</td><td>${i}</td></tr>`; } reportTbody.innerHTML = html; } renderFrequencyCards(); renderAmountFrequencyCards(); renderReportAmountTable(); renderOriginalAmountTable(); }

function handleTableRowClick(event){ if (window.dragSelectionActive) return; const td = event.target.closest('td'); if(!td) return; const tr = td.closest('tr'); if(!tr) return; const tbody = tr.parentElement; tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row')); tr.classList.add('selected-row'); }

function generateRiskTable(){ const sw=document.getElementById('riskReportSwitcher')?.value; let data; if(sw==='total')data=tableBetData; else if(sw==='user'){const u=document.getElementById('viewUserSelect')?.value;data=userBetData[u]||{};} else data=reportBetData; const tbody=document.getElementById('tableBody'); if(!tbody)return; tbody.innerHTML=''; let total=0; const mul=parseFloat(document.getElementById('multipleVal')?.value)||1; const rr=parseFloat(document.getElementById('rebateRate')?.value)||0; let list=[]; for(let n in data){const b=data[n];total+=b;list.push({num:n,bet:b});} for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if(!data[n])list.push({num:n,bet:0});} list.sort((a,b)=>b.bet-a.bet); const reb=(total*rr/100).toFixed(2); list.forEach((item,idx)=>{ const{num,bet}=item; const risk=Math.round(total-bet*mul-parseFloat(reb)); const cls=redNumbers.includes(num)?'red-text':(blueNumbers.includes(num)?'blue-text':'green-text'); const tr=document.createElement('tr'); tr.className=cls; tr.innerHTML=`<td>${num}${currentZodiacMap[num]||''}</td><td>${bet}</td><td>${risk}</td><td>${num}</td><td>${idx+1}</td>`; tbody.appendChild(tr); }); document.getElementById('totalBet').textContent=total; document.getElementById('totalRebate').textContent=reb; }
function applyReportCap(){ generateReportTable(); }
function generateReportTable(){
  const cap=document.getElementById('reportCapInput'); let cv=parseFloat(cap?.value); if(isNaN(cv)||cv<=0)cap.value=''; const data=reportBetData; const tbody=document.getElementById('reportTableBody'); if(!tbody)return; tbody.innerHTML=''; const mul=parseFloat(document.getElementById('reportMultipleVal')?.value)||1; const rr=parseFloat(document.getElementById('reportRebateRate')?.value)||0; let total=0; reportRiskData={}; let list=[]; for(let n in data){ let b=data[n]; if(!isNaN(cv)&&cv>0&&b>cv)b=cv; total+=b; list.push({num:n,bet:b}); } for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if(!(n in data))list.push({num:n,bet:0});} list.sort((a,b)=>b.bet-a.bet); const reb=(total*rr/100).toFixed(2); list.forEach((item,idx)=>{ const{num,bet}=item; const risk=Math.round(total-bet*mul-parseFloat(reb)); reportRiskData[num]=risk; const cls=redNumbers.includes(num)?'red-text':(blueNumbers.includes(num)?'blue-text':'green-text'); const tr=document.createElement('tr'); tr.className=cls; tr.innerHTML=`<td>${num}${currentZodiacMap[num]||''}</td><td>${bet}</td><td>${risk}<td>${num}</td><td>${idx+1}</td>`; tbody.appendChild(tr); }); document.getElementById('reportTotalBet').textContent=total; document.getElementById('reportTotalRebate').textContent=reb; const info=document.getElementById('reportCapInfo'); if(!isNaN(cv)&&cv>0){ const exc=[]; for(let n in data){if(data[n]>cv)exc.push({num:n,exceed:data[n]-cv});} if(exc.length>0){ exc.sort((a,b)=>a.exceed-b.exceed); let txt='';let te=0; exc.forEach(x=>{txt+=`${x.num}各${x.exceed}米<br>`;te+=x.exceed;}); txt+=`合计${te}`; info.innerHTML=txt; }else{info.textContent='无超出的号码';} }else{info.textContent='';} if(Object.keys(data).length>0){const max=Math.max(...Object.values(data));cap.placeholder=max;}
}
async function copyReportCapText(){ const info=document.getElementById('reportCapInfo'); const txt=info.innerText||info.textContent; if(!txt||txt==='无超出的号码'){showToast('没有可复制的文本');return;} navigator.clipboard.writeText(txt).then(()=>showToast('已复制')).catch(()=>showToast('复制失败')); }
async function screenshotTable(tid){ const tbl=document.getElementById(tid); if(!tbl){showToast('表格不存在');return;} try{ const canvas=await html2canvas(tbl,{backgroundColor:'#ffffff',scale:2,logging:false}); canvas.toBlob(async blob=>{ if(!blob){showToast('生成图片失败');return;} try{ const item=new ClipboardItem({'image/png':blob}); await navigator.clipboard.write([item]); showToast('截图已复制'); }catch(e){showToast('复制失败'); } },'image/png'); }catch(e){showToast('截图失败');} }
function renderReportAmountTable(){ const tbl=document.getElementById('reportAmountTable'); if(!tbl)return; tbl.innerHTML=''; const cols=[...Array(5)].map((_,c)=>Array.from({length:c===4?9:10},(_,r)=>(c*10+r+1).toString().padStart(2,'0'))); let th='<thead><tr>'; for(let c=0;c<5;c++)th+='<th>号码</th><th>金额</th>'; th+='</tr></thead>'; let tb='<tbody>'; for(let r=0;r<10;r++){ tb+='<tr>'; for(let c=0;c<5;c++){ const n=cols[c][r]||''; if(n){ const a=reportAmountData[n]||0; const cls=redNumbers.includes(n)?'red-text':(blueNumbers.includes(n)?'blue-text':'green-text'); tb+=`<td class="${cls}">${n}</td><td class="black-text">${a||''}</td>`; }else{tb+='<td></td><td></td>';} } tb+='</tr>'; } tb+='</tbody>'; tbl.innerHTML=th+tb; updateReportAmountTotal(); }

function renderFrequencyCards(){ 
  const nt=document.getElementById('numberFreqTable'); if(!nt)return; nt.innerHTML=''; 
  const cols=[...Array(5)].map((_,c)=>Array.from({length:c===4?9:10},(_,r)=>(c*10+r+1).toString().padStart(2,'0'))); 
  let th='<thead><tr>'; for(let c=0;c<5;c++)th+='<th>号码</th><th>次数</th>'; th+='</tr></thead>'; 
  let tb='<tbody>'; for(let r=0;r<10;r++){ tb+='<tr>'; for(let c=0;c<5;c++){ const n=cols[c][r]||''; if(n){ const cnt=numberCount[n]||0; const cls=redNumbers.includes(n)?'red-text':(blueNumbers.includes(n)?'blue-text':'green-text'); tb+=`<td class="${cls}">${n}</td><td class="black-text">${cnt||''}</td>`; }else{tb+='<td></td><td></td>';} } tb+='</tr>'; } tb+='</tbody>'; nt.innerHTML=th+tb; 
  const zt=document.getElementById('zodiacFreqTable'); if(!zt)return; zt.innerHTML=''; 
  const lz=['鼠','牛','虎','兔','龙','蛇'],rz=['马','羊','猴','鸡','狗','猪']; 
  const zcm={'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; 
  let zth='<thead><tr><th>生肖</th><th>次数</th><th>金额</th><th>上报</th><th>生肖</th><th>次数</th><th>金额</th><th>上报</th></tr></thead>',ztb='<tbody>'; 
  for(let r=0;r<6;r++){ 
    const l=lz[r],r2=rz[r]; 
    const lc=zodiacCount[l]||0,rc=zodiacCount[r2]||0; 
    const la=zodiacDirectAmount[l]||0,ra=zodiacDirectAmount[r2]||0; 
    const lrp=zodiacReportAmount[l]||0,rrp=zodiacReportAmount[r2]||0; 
    ztb+=`<tr><td class="${zcm[l]}">${l}</td><td class="black-text">${lc||''}</td><td class="amount-red-text">${la||''}</td><td class="report-red-text">${lrp||''}</td><td class="${zcm[r2]}">${r2}</td><td class="black-text">${rc||''}</td><td class="amount-red-text">${ra||''}</td><td class="report-red-text">${rrp||''}</td></tr>`; 
  } 
  ztb+='</tbody>'; zt.innerHTML=zth+ztb; 
}

function renderAmountFrequencyCards(){ 
  const nt=document.getElementById('numberAmountFreqTable'); if(!nt)return; nt.innerHTML=''; 
  const cols=[...Array(5)].map((_,c)=>Array.from({length:c===4?9:10},(_,r)=>(c*10+r+1).toString().padStart(2,'0'))); 
  let th='<thead><tr>'; for(let c=0;c<5;c++)th+='<th>号码</th><th>次数</th>'; th+='</tr></thead>'; 
  let tb='<tbody>'; for(let r=0;r<10;r++){ tb+='<tr>'; for(let c=0;c<5;c++){ const n=cols[c][r]||''; if(n){ const cnt=numberAmountCount[n]||0; const cls=redNumbers.includes(n)?'red-text':(blueNumbers.includes(n)?'blue-text':'green-text'); tb+=`<td class="${cls}">${n}</td><td class="black-text">${cnt||''}</td>`; }else{tb+='<td></td><td></td>';} } tb+='</tr>'; } tb+='</tbody>'; nt.innerHTML=th+tb; 
  const zt=document.getElementById('zodiacAmountFreqTable'); if(!zt)return; zt.innerHTML=''; 
  const lz=['鼠','牛','虎','兔','龙','蛇'],rz=['马','羊','猴','鸡','狗','猪']; 
  const zcm={'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; 
  let zth='<thead><tr><th>生肖</th><th>次数</th><th>金额</th><th>上报</th><th>生肖</th><th>次数</th><th>金额</th><th>上报</th></tr></thead>',ztb='<tbody>'; 
  for(let r=0;r<6;r++){ 
    const l=lz[r],r2=rz[r]; 
    const lc=zodiacAmountCount[l]||0,rc=zodiacAmountCount[r2]||0; 
    const la=zodiacFilteredAmount[l]||0,ra=zodiacFilteredAmount[r2]||0; 
    const lrp=zodiacFilteredReportAmount[l]||0,rrp=zodiacFilteredReportAmount[r2]||0; 
    ztb+=`<tr><td class="${zcm[l]}">${l}</td><td class="black-text">${lc||''}</td><td class="amount-red-text">${la||''}</td><td class="report-red-text">${lrp||''}</td><td class="${zcm[r2]}">${r2}</td><td class="black-text">${rc||''}</td><td class="amount-red-text">${ra||''}</td><td class="report-red-text">${rrp||''}</td></tr>`; 
  } 
  ztb+='</tbody>'; zt.innerHTML=zth+ztb; 
}

// ===== 平特肖相关函数 =====
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

// ===== 导出导入函数 =====
async function exportData(){ try{ const orders=await getAllOrdersUnfiltered(); const reports=await getAllReportsUnfiltered(); const logs = await getAllLogs(); const recycleRecords = await getRecycleBinRecords(); const comboRecords = await getComboOrders(); const drawRecords = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('drawRecord_')) { drawRecords[key] = localStorage.getItem(key); } } const comboDrawRecords = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('comboDrawRecord_')) { comboDrawRecords[key] = localStorage.getItem(key); } } const pingtexiao = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('pingtexiao_')) { pingtexiao[key] = localStorage.getItem(key); } } const pingtexiaoHighlights = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('ptHighlight_')) { pingtexiaoHighlights[key] = localStorage.getItem(key); } } const users = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('users_')) { users[key] = localStorage.getItem(key); } } const presets = localStorage.getItem('replacePresets') || '[]'; const aliases = localStorage.getItem('categoryAliases') || '[]'; const oddsData = localStorage.getItem('comboOddsData') || '{}'; const data={version:7,orders,reports,logs,recycleRecords,comboRecords,drawRecords,comboDrawRecords,pingtexiao,pingtexiaoHighlights,users,replacePresets:JSON.parse(presets),categoryAliases:JSON.parse(aliases),oddsData:JSON.parse(oddsData),exportTime:new Date().toISOString()}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const fileName = `港澳识别数据_全部_${getTodayCST()}.json`; const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 60000); addOperationLog('export', '导出全部数据（含日志/回收站/用户/配置/连肖）'); showToast('导出成功：' + fileName); showStorageDrawerTemporary(5000); }catch(e){showToast('导出失败');} }
async function importData(){ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.style.display='none'; document.body.appendChild(inp); inp.onchange=async(e)=>{ const file=e.target.files[0]; if(!file){document.body.removeChild(inp);return;} const reader=new FileReader(); reader.onload=async(ev)=>{ try{ const data=JSON.parse(ev.target.result); if(!data.orders||!data.reports){showToast('无效格式');document.body.removeChild(inp);return;} if (!data.version || data.version < 7) { const cf = await confirm(`备份文件版本（${data.version || '未知'}）低于当前版本（7），导入可能导致数据异常，是否继续？`); if (!cf) { document.body.removeChild(inp); return; } } const recycleCount = data.recycleRecords ? data.recycleRecords.length : 0; const comboCount = data.comboRecords ? data.comboRecords.length : 0; const userCount = data.users ? Object.keys(data.users).length : 0; const pingtexiaoCount = data.pingtexiao ? Object.keys(data.pingtexiao).length : 0; const highlightCount = data.pingtexiaoHighlights ? Object.keys(data.pingtexiaoHighlights).length : 0; const totalToImport = data.orders.length + data.reports.length + (data.drawRecords ? Object.keys(data.drawRecords).length : 0) + (data.comboDrawRecords ? Object.keys(data.comboDrawRecords).length : 0) + pingtexiaoCount + highlightCount + recycleCount + comboCount + userCount + (data.replacePresets ? data.replacePresets.length : 0) + (data.categoryAliases ? data.categoryAliases.length : 0); if(totalToImport === 0){ showToast('文件中没有数据'); document.body.removeChild(inp); return; } let confirmMsg = `文件包含 ${data.orders.length} 条订单，${data.reports.length} 条上报，${data.logs ? data.logs.length : 0} 条日志，${recycleCount} 条回收站记录，${comboCount} 条连肖订单，${userCount} 组用户数据。是否导入？`; const cf = await confirm(confirmMsg); if(!cf){document.body.removeChild(inp);return;} const eo=await getAllOrdersUnfiltered(); const er=await getAllReportsUnfiltered(); const eco=await getComboOrders(); let so=0,no=0; for(const r of data.orders){ const region = r.region || currentRegion; const dup = eo.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if(dup){ so++; continue; } try{ await saveOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.timestamp, region); no++; } catch(e){ console.error('导入订单失败', e); } } let sr=0,nr=0; for(const r of data.reports){ const region = r.region || currentRegion; const dup = er.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if(dup){ sr++; continue; } try{ await saveReportOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.timestamp, region); nr++; } catch(e){ console.error('导入上报失败', e); } } let sco=0,nco=0; if (data.comboRecords && Array.isArray(data.comboRecords)) { for(const r of data.comboRecords){ const region = r.region || currentRegion; const dup = eco.find(o => o.content === r.content && o.user === r.user && o.timestamp === r.timestamp && o.region === region); if(dup){ sco++; continue; } try{ await saveComboOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0, r.comboType || '', r.timestamp); nco++; } catch(e){ console.error('导入连肖订单失败', e); } } } if (data.logs && Array.isArray(data.logs)) { const existingLogs = await getAllLogs(); const existingIds = new Set(existingLogs.map(l => l.id)); for (const log of data.logs) { if (!existingIds.has(log.id)) { await new Promise((resolve) => { const tx = db.transaction([LOG_STORE_NAME], 'readwrite'); const store = tx.objectStore(LOG_STORE_NAME); store.add(log); tx.oncomplete = () => resolve(); }); } } } if (data.recycleRecords && Array.isArray(data.recycleRecords)) { const existingRecycle = await getRecycleBinRecords(); const existingRecycleIds = new Set(existingRecycle.map(r => r.id)); for (const rec of data.recycleRecords) { if (!existingRecycleIds.has(rec.id)) { await new Promise((resolve) => { const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite'); const store = tx.objectStore(RECYCLE_STORE_NAME); store.add(rec); tx.oncomplete = () => resolve(); }); } } } if (data.users) { for (const [key, value] of Object.entries(data.users)) { if (!localStorage.getItem(key)) { localStorage.setItem(key, value); } } } let dcImported = 0; if (data.drawRecords) { for (const [key, value] of Object.entries(data.drawRecords)) { const existing = localStorage.getItem(key); if (existing) { try { const existingData = JSON.parse(existing); const newData = JSON.parse(value); let changed = false; for (const [issue, entry] of Object.entries(newData)) { if (existingData[issue] && existingData[issue].number && existingData[issue].number.trim()) { if (entry.pl !== undefined && entry.pl !== '') { existingData[issue].pl = entry.pl; changed = true; } } else { existingData[issue] = entry; changed = true; } } if (changed) { localStorage.setItem(key, JSON.stringify(existingData)); dcImported++; } } catch(e) { localStorage.setItem(key, value); dcImported++; } } else { localStorage.setItem(key, value); dcImported++; } } } let comboDrawImported = 0; if (data.comboDrawRecords) { for (const [key, value] of Object.entries(data.comboDrawRecords)) { if (!localStorage.getItem(key)) { localStorage.setItem(key, value); comboDrawImported++; } } } let ptImported = 0, ptSkipped = 0; if (data.pingtexiao) { for (const [key, value] of Object.entries(data.pingtexiao)) { if (localStorage.getItem(key)) { ptSkipped++; } else { localStorage.setItem(key, value); ptImported++; } } } let hlImported = 0; if (data.pingtexiaoHighlights) { for (const [key, value] of Object.entries(data.pingtexiaoHighlights)) { localStorage.setItem(key, value); hlImported++; } } if (data.oddsData) { if (!localStorage.getItem('comboOddsData')) { localStorage.setItem('comboOddsData', JSON.stringify(data.oddsData)); } } let presetImported = 0, aliasImported = 0; if (data.replacePresets && Array.isArray(data.replacePresets)) { const currentPresets = getReplacePresets(); data.replacePresets.forEach(p => { if (!currentPresets.some(x => x.old === p.old)) { currentPresets.push(p); presetImported++; } }); localStorage.setItem('replacePresets', JSON.stringify(currentPresets)); } if (data.categoryAliases && Array.isArray(data.categoryAliases)) { const currentAliases = getCategoryAliases(); data.categoryAliases.forEach(a => { if (!currentAliases.some(x => x.alias === a.alias)) { currentAliases.push(a); aliasImported++; } }); localStorage.setItem('categoryAliases', JSON.stringify(currentAliases)); } await updateTableFromRecords(); calculateStorageUsage(); renderPingtexiaoTable(); updateCardA(); renderSmartDecision(); addOperationLog('import', `导入${no+nr+nco}条订单/上报/连肖记录`); let msg = `成功导入 ${no+nr+nco} 条记录，${dcImported} 组开奖记录，${comboDrawImported} 组录开奖记录，${recycleCount} 条回收站记录，${comboCount} 条连肖订单，${userCount} 组用户数据。`; if (ptImported > 0) msg += `\n导入平特肖数据 ${ptImported} 组。`; if (ptSkipped > 0) msg += `\n跳过平特肖数据 ${ptSkipped} 组（已存在）。`; if (hlImported > 0) msg += `\n导入平特肖高亮标记 ${hlImported} 组。`; if (presetImported > 0) msg += `\n新增 ${presetImported} 条替换预设。`; if (aliasImported > 0) msg += `\n新增 ${aliasImported} 条分类缩写。`; if(so+sr+sco > 0) msg += `\n跳过 ${so+sr+sco} 条重复记录。`; showToast(msg); document.body.removeChild(inp); showStorageDrawerTemporary(5000); }catch(err){showToast('导入失败');document.body.removeChild(inp);} }; reader.onerror=()=>{showToast('读取失败');document.body.removeChild(inp);}; reader.readAsText(file); }; inp.addEventListener('cancel',()=>{document.body.removeChild(inp);}); inp.click(); }
// ===== business.js 续：自定义筛选与单挑、智能决策、平特肖渲染、开奖记录、初始化等 =====

// ===== 自定义筛选与单挑 =====
let zodiacRankVisible = false;
function toggleZodiacRank() { zodiacRankVisible = !zodiacRankVisible; updateCardA(); showToast(zodiacRankVisible ? '生肖排行已展开' : '生肖排行已收起'); }
let singleBetVisible = false;
function toggleSingleBet() { singleBetVisible = !singleBetVisible; const row = document.getElementById('singleBetRow'); if (row) { if (singleBetVisible) { updateSingleBetDisplay(); } else { row.style.display = 'none'; } } showToast(singleBetVisible ? '单挑已展开' : '单挑已收起'); }
async function updateSingleBetDisplay() {
  const row = document.getElementById('singleBetRow');
  const display = document.getElementById('singleBetDisplay');
  if (!row || !display) return;
  if (!singleBetVisible) { row.style.display = 'none'; return; }

  const orders = await getOrderRecords();
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  const filteredOrders = orders.filter(r => r.date === fd);
  const singleCount = {};

  filteredOrders.forEach(order => {
    const lines = order.content.split('\n').filter(l => l.trim());
    lines.forEach(l => {
      const newMatch = l.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/);
      if (newMatch) {
        const content = newMatch[1];
        const amt = parseInt(newMatch[2]) || 0;
        if (amt <= 0) return;
        const items = content.split('-').map(i => i.trim()).filter(i => i);
        if (items.length === 1 && /^\d{1,2}$/.test(items[0])) {
          const num = items[0].padStart(2, '0');
          if (parseInt(num) >= 1 && parseInt(num) <= 49) {
            singleCount[num] = (singleCount[num] || 0) + 1;
          }
        }
        return;
      }
      const oldMatch = l.match(/^(\d{2})\s+各(?:数|)\s*(\d+)$/);
      if (oldMatch && parseInt(oldMatch[2]) > 0) {
        singleCount[oldMatch[1]] = (singleCount[oldMatch[1]] || 0) + 1;
      }
    });
  });

  const singleNums = Object.keys(singleCount);
  if (singleNums.length > 0) {
    const sorted = singleNums.sort((a, b) => parseInt(a) - parseInt(b));
    function getNumCls(n) { if (redNumbers.includes(n)) return 'red-text'; if (blueNumbers.includes(n)) return 'blue-text'; if (greenNumbers.includes(n)) return 'green-text'; return ''; }
    display.innerHTML = sorted.map(n => {
      const cnt = singleCount[n];
      return `<span class="${getNumCls(n)}">${n}${cnt >= 2 ? '(' + cnt + '次)' : ''}</span>`;
    }).join(' ');
    row.style.display = '';
  } else {
    display.innerHTML = '<span style="color:#888;">暂无</span>';
    row.style.display = '';
  }
}
function copySingleBetNums() { const display = document.getElementById('singleBetDisplay'); if (!display) return; const spans = display.querySelectorAll('span'); const nums = Array.from(spans).map(s => s.textContent.replace(/\(\d+次\)/, '').trim()).filter(t => /^\d{2}$/.test(t)); if (nums.length === 0) { showToast('暂无号码'); return; } navigator.clipboard.writeText(nums.join('-')).then(() => { showToast('已复制：' + nums.join('-')); }).catch(() => { showToast('复制失败'); }); }

function updateCardA() { const contentEl = document.getElementById('cardAContent'); if (!contentEl) return; let html = ''; const filterInput = document.getElementById('filterInputCardA'); const filterText = filterInput ? filterInput.value.trim() : ''; if (filterText) { const tokens = filterText.split(/\s+/).filter(t => t); let targetNums = new Set(); tokens.forEach(token => { if (/^\d{1,2}$/.test(token)) { const n = token.padStart(2, '0'); if (parseInt(n) >= 1 && parseInt(n) <= 49) targetNums.add(n); } else if (ZODIAC_NUMS[token]) { ZODIAC_NUMS[token].split(/[\s,，]+/).forEach(n => targetNums.add(n.padStart(2, '0'))); } else if (D[token]) { const nums = keyToAllNums(token); nums.forEach(n => targetNums.add(n.padStart(2, '0'))); } }); if (targetNums.size > 0) { const negativeNums = []; for (const num of targetNums) { if (reportRiskData[num] !== undefined && reportRiskData[num] < 0) { negativeNums.push(num); } } if (negativeNums.length > 0) { html += '<div style="margin-bottom:4px;"><b>添加筛选：</b>'; negativeNums.sort((a, b) => parseInt(a) - parseInt(b)); negativeNums.forEach((num, idx) => { const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${num}</span>`; if (idx < negativeNums.length - 1) html += '-'; }); html += '</div>'; } } } const topNInput = document.getElementById('topNInput'); const nVal = topNInput ? parseInt(topNInput.value) : NaN; if (!isNaN(nVal) && nVal > 0) { const entries = Object.entries(numberAmountCount).map(([num, cnt]) => ({ num, cnt: cnt || 0 })); for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); if (!numberAmountCount[n]) entries.push({ num: n, cnt: 0 }); } const sortedDesc = [...entries].sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num)); const idxDesc = Math.min(nVal - 1, sortedDesc.length - 1); const cutoffDesc = sortedDesc[idxDesc]?.cnt ?? 0; const activeNums = sortedDesc.filter(e => e.cnt >= cutoffDesc && e.cnt > 0); activeNums.sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num)); const sortedAsc = [...entries].sort((a, b) => a.cnt - b.cnt || parseInt(a.num) - parseInt(b.num)); const idxAsc = Math.min(nVal - 1, sortedAsc.length - 1); const cutoffAsc = sortedAsc[idxAsc]?.cnt ?? 0; let inactiveNums = sortedAsc.filter(e => e.cnt <= cutoffAsc); inactiveNums.sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num)); if (activeNums.length > 0) { html += '<div style="margin-bottom:4px;"><b>活跃次数：</b>'; activeNums.forEach((e, idx) => { const cls = redNumbers.includes(e.num) ? 'red-text' : (blueNumbers.includes(e.num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${e.num}</span>`; if (idx < activeNums.length - 1) html += '-'; }); html += '</div>'; } if (inactiveNums.length > 0) { html += '<div style="margin-bottom:4px;"><b>不活跃次数：</b>'; inactiveNums.forEach((e, idx) => { const cls = redNumbers.includes(e.num) ? 'red-text' : (blueNumbers.includes(e.num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${e.num}</span>`; if (idx < inactiveNums.length - 1) html += '-'; }); html += '</div>'; } } if (zodiacRankVisible) { const zodiacOrderFixed = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']; const zcm = {'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; const zCountEntries = zodiacOrderFixed.map(z => ({ zodiac: z, cnt: zodiacAmountCount[z] || 0 })); zCountEntries.sort((a, b) => b.cnt - a.cnt); html += '<div style="margin-bottom:4px;"><b>生肖活跃：</b>'; zCountEntries.forEach((e, idx) => { html += `<span class="${zcm[e.zodiac] || ''}">${e.zodiac}</span>`; if (idx < zCountEntries.length - 1) html += '、'; }); html += '</div>'; const zAmtEntries = zodiacOrderFixed.map(z => ({ zodiac: z, amt: zodiacFilteredAmount[z] || 0 })); zAmtEntries.sort((a, b) => b.amt - a.amt); html += '<div style="margin-bottom:4px;"><b>金额排行：</b>'; zAmtEntries.forEach((e, idx) => { html += `<span class="${zcm[e.zodiac] || ''}">${e.zodiac}</span>`; if (idx < zAmtEntries.length - 1) html += '、'; }); html += '</div>'; } contentEl.innerHTML = html; if (singleBetVisible) updateSingleBetDisplay(); }
function copyCardANumbers(type) { const contentEl = document.getElementById('cardAContent'); if (!contentEl) return; const lines = []; let currentLine = []; Array.from(contentEl.childNodes).forEach(node => { if (node.nodeName === 'SPAN') { currentLine.push(node); } else if (node.nodeName === 'BR') { if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } else if (node.nodeName === 'DIV') { Array.from(node.childNodes).forEach(child => { if (child.nodeName === 'SPAN') { currentLine.push(child); } else if (child.nodeName === 'BR') { if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } }); if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } }); if (currentLine.length > 0) lines.push(currentLine); const filterText = document.getElementById('filterInputCardA')?.value.trim(); const topNVal = parseInt(document.getElementById('topNInput')?.value); let targetLineIndex = -1; let lineIdx = 0; if (filterText) { if (type === 'risk') targetLineIndex = lineIdx; lineIdx++; } if (!isNaN(topNVal) && topNVal > 0) { if (type === 'active') targetLineIndex = lineIdx; lineIdx++; if (type === 'inactive') targetLineIndex = lineIdx; lineIdx++; } if (targetLineIndex < 0 || targetLineIndex >= lines.length) { showToast('对应行暂无数据'); return; } const targetNodes = lines[targetLineIndex]; const items = targetNodes.map(span => span.textContent.trim()).filter(t => t && /^\d{2}$/.test(t)); if (items.length === 0) { showToast('没有可复制的项目'); return; } const text = items.join('-'); navigator.clipboard.writeText(text).then(() => { showToast('已复制: ' + text); }).catch(() => { showToast('复制失败'); }); }

// ===== 智能决策中心 =====
let heatVisible = false; let adviceVisible = false; let surgeVisible = false;
let surgeThreshold = parseInt(localStorage.getItem('surgeThreshold') || '50'); let surgeAmountThreshold = parseFloat(localStorage.getItem('surgeAmountThreshold') || '4'); let surgeMinOrders = 3;
async function computeSurge() { const fd = document.getElementById('filterDate')?.value || getTodayCST(); const allOrders = await getOrderRecords(); const todayOrders = allOrders.filter(o => o.date === fd); if (todayOrders.length === 0) { window._surgeResult = []; return; } const userOrders = {}; todayOrders.forEach(o => { if (!userOrders[o.user]) userOrders[o.user] = []; userOrders[o.user].push(o); }); const countThreshold = surgeThreshold / 100; const amountThreshold = surgeAmountThreshold / 100; const result = []; for (const [user, orders] of Object.entries(userOrders)) { if (orders.length < surgeMinOrders) continue; const totalOrders = orders.length; const numCount = {}; const numAmount = {}; for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); numCount[n] = 0; numAmount[n] = 0; } let totalAmount = 0; orders.forEach(o => { const lines = o.content.split('\n'); let orderCovered = new Set(); lines.forEach(line => { const { numbers, amount } = countItemsInLine(line); const amtPerNum = amount; numbers.forEach(num => { orderCovered.add(num); numAmount[num] = (numAmount[num] || 0) + amtPerNum; totalAmount += amtPerNum; }); }); orderCovered.forEach(n => { numCount[n] = (numCount[n] || 0) + 1; }); }); const countTriggered = []; for (const [num, cnt] of Object.entries(numCount)) { if (totalOrders > 0 && cnt / totalOrders >= countThreshold) { countTriggered.push({ num, ratio: cnt / totalOrders }); } } countTriggered.sort((a, b) => b.ratio - a.ratio); const amountTriggered = []; for (const [num, amt] of Object.entries(numAmount)) { if (totalAmount > 0 && amt / totalAmount >= amountThreshold) { amountTriggered.push({ num, ratio: amt / totalAmount }); } } amountTriggered.sort((a, b) => b.ratio - a.ratio); if (countTriggered.length > 0 || amountTriggered.length > 0) { result.push({ user, countItems: countTriggered, amountItems: amountTriggered, totalOrders, totalAmount }); } } result.sort((a, b) => (b.countItems.length + b.amountItems.length) - (a.countItems.length + a.amountItems.length)); window._surgeResult = result; }
function toggleHeat() { heatVisible = !heatVisible; renderSmartDecision(); }
function toggleAdvice() { adviceVisible = !adviceVisible; renderSmartDecision(); }
async function toggleSurge() { surgeVisible = !surgeVisible; if (surgeVisible) { await computeSurge(); renderSmartDecision(); } else renderSmartDecision(); }
function copyUserSurgeNums(username) { if (!window._surgeResult || window._surgeResult.length === 0) { showToast('暂无号码'); return; } const userData = window._surgeResult.find(u => u.user === username); if (!userData) { showToast('该用户暂无数据'); return; } const nums = new Set(); userData.countItems.forEach(i => nums.add(i.num)); userData.amountItems.forEach(i => nums.add(i.num)); const arr = [...nums].sort((a, b) => parseInt(a) - parseInt(b)); navigator.clipboard.writeText(arr.join(' ')).then(() => { showToast('已复制' + username + '的号码'); }).catch(() => showToast('复制失败')); }
function copyAllSurgeNums() { if (!window._surgeResult || window._surgeResult.length === 0) { showToast('暂无号码'); return; } const allNums = new Set(); window._surgeResult.forEach(user => { user.countItems.forEach(i => allNums.add(i.num)); user.amountItems.forEach(i => allNums.add(i.num)); }); const arr = [...allNums].sort((a, b) => parseInt(a) - parseInt(b)); navigator.clipboard.writeText(arr.join(' ')).then(() => { showToast('已复制全部号码'); }).catch(() => showToast('复制失败')); }

function renderSmartDecision() {
  const container = document.getElementById('smartDecisionContent');
  if (!container) return;
  const periodInput = document.getElementById('smartPeriodInput');
  let period = 10;
  if (periodInput && periodInput.value.trim()) { period = parseInt(periodInput.value) || 10; }
  else { const savedCount = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (savedCount) period = parseInt(savedCount) || 10; if (periodInput) periodInput.value = period; }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]);
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {}
  const currentIssue = getCurrentIssueNumber(year, fd);
  if (!currentIssue) { container.innerHTML = ''; return; }
  const drawList = []; const drawIssueMap = []; const numCount = {};
  for (let i = currentIssue - period; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { drawList.push(num); drawIssueMap.push({ num, issue: issueId }); numCount[num] = (numCount[num] || 0) + 1; } } }
  if (drawList.length === 0) { container.innerHTML = '无开奖数据'; return; }
  const actualPeriod = Math.min(period, currentIssue - 1);
  const zodiacCountLocal = {}; const boseCount = {}; const weishuCount = {}; const toushuCount = {};
  let jiaqinCount = 0, yeshouCount = 0; let danCount = 0, shuangCount = 0; let xiaoCount = 0, daCount = 0;
  const zodiacSeq = []; const zodiacIssueSeq = []; const boseSeq = []; const boseIssueSeq = [];
  const weishuSeq = []; const weishuIssueSeq = []; const toushuSeq = []; const toushuIssueSeq = [];
  const jysxSeq = []; const jysxIssueSeq = []; const dsSeq = []; const dsIssueSeq = []; const dxSeq = []; const dxIssueSeq = [];
  drawIssueMap.forEach(({num, issue}) => {
    const z = currentZodiacMap[num] || '';
    if (z) { zodiacCountLocal[z] = (zodiacCountLocal[z] || 0) + 1; zodiacSeq.push(z); zodiacIssueSeq.push(issue); }
    const intNum = parseInt(num);
    let b = ''; if (redNumbers.includes(num)) b = '红波'; else if (blueNumbers.includes(num)) b = '蓝波'; else if (greenNumbers.includes(num)) b = '绿波';
    boseCount[b] = (boseCount[b] || 0) + 1; boseSeq.push(b); boseIssueSeq.push(issue);
    const ws = num.slice(-1) + '尾'; weishuCount[ws] = (weishuCount[ws] || 0) + 1; weishuSeq.push(ws); weishuIssueSeq.push(issue);
    const ts = num[0] + '头'; toushuCount[ts] = (toushuCount[ts] || 0) + 1; toushuSeq.push(ts); toushuIssueSeq.push(issue);
    const jy = (z && (ATTR_TO_ZODIACS['家禽'] || '').includes(z)) ? '家禽' : '野兽';
    if (jy === '家禽') jiaqinCount++; else yeshouCount++; jysxSeq.push(jy); jysxIssueSeq.push(issue);
    const ds = intNum % 2 === 1 ? '单' : '双'; if (ds === '单') danCount++; else shuangCount++; dsSeq.push(ds); dsIssueSeq.push(issue);
    const dx = intNum <= 24 ? '小' : '大'; if (dx === '小') xiaoCount++; else daCount++; dxSeq.push(dx); dxIssueSeq.push(issue);
  });
  function analyzeStreak(seq, issueSeq, name, clsFn) { if (seq.length === 0) return ''; const lastItem = seq[seq.length-1]; let streak = 0; for (let i=seq.length-1;i>=0;i--) { if (seq[i]===lastItem) streak++; else break; } const cls = typeof clsFn==='function'?clsFn(lastItem):''; if (streak>=2) { const startIssue=issueSeq[issueSeq.length-streak]; const endIssue=issueSeq[issueSeq.length-1]; const issueRange=startIssue===endIssue?`第${startIssue}期`:`第${startIssue}-${endIssue}期`; if (streak>=4) return `<span style="color:#e74c3c;font-weight:bold;">⚠ ${name}连续${streak}期<span class="${cls}">${lastItem}</span>（${issueRange}）</span>`; return `<span style="color:#f39c12;">📈 ${name}连续${streak}期<span class="${cls}">${lastItem}</span>（${issueRange}）</span>`; } return `<span style="color:#888;">${name}<span class="${cls}">${lastItem}</span>（第${issueSeq[issueSeq.length-1]}期）</span>`; }
  function getNumCls(n) { if (redNumbers.includes(n)) return 'red-text'; if (blueNumbers.includes(n)) return 'blue-text'; if (greenNumbers.includes(n)) return 'green-text'; return ''; }
  function getZodiacCls(z) { const redSet=new Set(['鼠','兔','马','鸡']); const blueSet=new Set(['虎','蛇','猴','猪']); const greenSet=new Set(['牛','龙','羊','狗']); if(redSet.has(z))return'red-text';if(blueSet.has(z))return'blue-text';if(greenSet.has(z))return'green-text';return'';}
  function getBoseCls(b) { if(b==='红波')return'red-text';if(b==='蓝波')return'blue-text';if(b==='绿波')return'green-text';return''; }
  let heatHtml='';
  if(heatVisible){ heatHtml='<div style="font-size:11px;">'; heatHtml+=`<div style="margin-bottom:4px;color:#666;">📊 开奖热度分析（最近${actualPeriod}期，共${drawList.length}条记录）</div>`; const zodiacAll=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']; const zodiacItems=zodiacAll.map(z=>({name:z,cnt:zodiacCountLocal[z]||0})); zodiacItems.sort((a,b)=>b.cnt-a.cnt); heatHtml+='<div style="margin-bottom:4px;"><b>生肖：</b>'; zodiacItems.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/12*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass} ${getZodiacCls(item.name)}">${prefix}${item.name}(${item.cnt}次)</span> `;}); heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(zodiacSeq,zodiacIssueSeq,'生肖',getZodiacCls)+'</div>'; const boseList=['红波','蓝波','绿波'].map(b=>({name:b,cnt:boseCount[b]||0}));boseList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>波色：</b>';boseList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/3*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass} ${getBoseCls(item.name)}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(boseSeq,boseIssueSeq,'波色',getBoseCls)+'</div>'; const weishuList=[];for(let i=0;i<=9;i++)weishuList.push({name:i+'尾',cnt:weishuCount[i+'尾']||0});weishuList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>尾数：</b>';weishuList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/10*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(weishuSeq,weishuIssueSeq,'尾数','')+'</div>'; const toushuList=[];for(let i=0;i<=4;i++)toushuList.push({name:i+'头',cnt:toushuCount[i+'头']||0});toushuList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>头数：</b>';toushuList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/5*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(toushuSeq,toushuIssueSeq,'头数','')+'</div>'; const jysxList=[{name:'家禽',cnt:jiaqinCount},{name:'野兽',cnt:yeshouCount}];jysxList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>家禽/野兽：</b>';jysxList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(jysxSeq,jysxIssueSeq,'','')+'</div>'; const dsList=[{name:'单',cnt:danCount},{name:'双',cnt:shuangCount}];dsList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>单双：</b>';dsList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(dsSeq,dsIssueSeq,'','')+'</div>'; const dxList=[{name:'小',cnt:xiaoCount},{name:'大',cnt:daCount}];dxList.sort((a,b)=>b.cnt-a.cnt);heatHtml+='<div style="margin-bottom:4px;"><b>大小：</b>';dxList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(dxSeq,dxIssueSeq,'','')+'</div>'; heatHtml+='</div>'; }
  const reportBets=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');const bet=reportBetData[n]||0;if(bet>0)reportBets.push({num:n,bet});} const avgBet=reportBets.length>0?(reportBets.reduce((s,it)=>s+it.bet,0)/reportBets.length):0;const multiplier=parseFloat(document.getElementById('urgentMultiplierInput')?.value||'1.3');let urgentNums=[];if(reportBets.length>0){urgentNums=reportBets.filter(item=>item.bet>avgBet*multiplier).sort((a,b)=>b.bet-a.bet).map(item=>item.num);} const recent6Zodiacs=[];for(let i=currentIssue-1;i>=1&&recent6Zodiacs.length<6;i--){const issueId=i.toString().padStart(2,'0');const entry=savedData[issueId];if(entry&&entry.number&&entry.number.trim()){const num=entry.number.trim().padStart(2,'0');if(/^\d{2}$/.test(num)&&parseInt(num)>=1&&parseInt(num)<=49){const z=currentZodiacMap[num]||'';if(z&&!recent6Zodiacs.includes(z))recent6Zodiacs.push(z);}}} let zodiacMonitorNums=[];if(recent6Zodiacs.length>0){const allZodiacNums=new Set();recent6Zodiacs.forEach(z=>{(ZODIAC_NUMS[z]||'').split(/[\s,，]+/).forEach(n=>allZodiacNums.add(n.padStart(2,'0')));});zodiacMonitorNums=[...allZodiacNums].filter(n=>reportRiskData[n]!==undefined&&reportRiskData[n]<0).sort((a,b)=>(reportRiskData[a]||0)-(reportRiskData[b]||0));} const betNums=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');const risk=reportRiskData[n];if((risk===undefined||risk>=0)&&(numCount[n]||0)===0)betNums.push(n);} function getColdItems(countMap,allKeys){return allKeys.filter(k=>(countMap[k]||0)===0);} const coldZodiacs=getColdItems(zodiacCountLocal,['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']);const coldBoses=getColdItems(boseCount,['红波','蓝波','绿波']);const coldWeishus=getColdItems(weishuCount,Array.from({length:10},(_,i)=>i+'尾'));const coldToushus=getColdItems(toushuCount,Array.from({length:5},(_,i)=>i+'头'));const coldJYSX=getColdItems({'家禽':jiaqinCount,'野兽':yeshouCount},['家禽','野兽']);const coldDS=getColdItems({'单':danCount,'双':shuangCount},['单','双']);const coldDX=getColdItems({'小':xiaoCount,'大':daCount},['小','大']); function getNumsByZodiac(z){return(ZODIAC_NUMS[z]||'').split(/[\s,，]+/).map(n=>n.padStart(2,'0'));} function getNumsByBose(b){return(D[b]||'').split(/[\s,，]+/).filter(n=>n.trim()).map(n=>n.padStart(2,'0'));} function getNumsByWeishu(w){const d=w.replace('尾','');return Array.from({length:5},(_,i)=>(i*10+parseInt(d)).toString().padStart(2,'0')).filter(n=>parseInt(n)>=1&&parseInt(n)<=49);} function getNumsByToushu(t){const d=t.replace('头','');return Array.from({length:10},(_,i)=>(parseInt(d)*10+i+1).toString().padStart(2,'0')).filter(n=>parseInt(n)>=1&&parseInt(n)<=49);} function getNumsByDS(ds){const result=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if((ds==='单'&&i%2===1)||(ds==='双'&&i%2===0))result.push(n);}return result;} function getNumsByJYSX(jy){const zs=ATTR_TO_ZODIACS[jy]||'';const result=[];for(const z of zs){result.push(...getNumsByZodiac(z));}return[...new Set(result)];} function getNumsByDX(dx){const result=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if((dx==='小'&&i<=24)||(dx==='大'&&i>=25))result.push(n);}return result;} function buildColdRow(label,coldItems,getNumsFn){if(coldItems.length===0)return'';const allNums=new Set();for(const item of coldItems){const nums=getNumsFn(item);nums.forEach(n=>{if(reportRiskData[n]!==undefined&&reportRiskData[n]<0){allNums.add(n);}});}if(allNums.size===0)return'';const sortedNums=[...allNums].sort((a,b)=>parseInt(a)-parseInt(b));const numSpans=sortedNums.map(n=>{const cls=(redNumbers.includes(n)?'red-text':(blueNumbers.includes(n)?'blue-text':'green-text'));return`<span class="${cls}">${n}</span>`;}).join(' ');const numsForCopy=sortedNums.join('-');return`<div style="margin-bottom:4px;"><b>${label}：${coldItems.join('、')}：</b>${numSpans} <button class="copy-advice-btn" onclick="copyNumsToClipboard('${numsForCopy}')">📋复制</button></div>`;} let coldMonitorHtml='';coldMonitorHtml+=buildColdRow('冷生肖',coldZodiacs,getNumsByZodiac);coldMonitorHtml+=buildColdRow('冷波色',coldBoses,getNumsByBose);coldMonitorHtml+=buildColdRow('冷尾数',coldWeishus,getNumsByWeishu);coldMonitorHtml+=buildColdRow('冷头数',coldToushus,getNumsByToushu);coldMonitorHtml+=buildColdRow('冷家禽野兽',coldJYSX,getNumsByJYSX);coldMonitorHtml+=buildColdRow('冷单双',coldDS,getNumsByDS);coldMonitorHtml+=buildColdRow('冷大小',coldDX,getNumsByDX);let allColdNums=new Set();const coldPairs=[{items:coldZodiacs,fn:getNumsByZodiac},{items:coldBoses,fn:getNumsByBose},{items:coldWeishus,fn:getNumsByWeishu},{items:coldToushus,fn:getNumsByToushu},{items:coldJYSX,fn:getNumsByJYSX},{items:coldDS,fn:getNumsByDS},{items:coldDX,fn:getNumsByDX}];coldPairs.forEach(pair=>{pair.items.forEach(item=>{const nums=pair.fn(item);nums.forEach(n=>{if(reportRiskData[n]!==undefined&&reportRiskData[n]<0){allColdNums.add(n);}});});});if(allColdNums.size>0){const sortedAll=[...allColdNums].sort((a,b)=>parseInt(a)-parseInt(b));coldMonitorHtml+=`<div style="margin-top:6px;"><button class="copy-advice-btn" onclick="copyNumsToClipboard('${sortedAll.join('-')}')">📋复制全部冷门号码</button></div>`;} let adviceHtml='';if(adviceVisible){adviceHtml='<div style="font-size:11px;">';adviceHtml+='<div style="margin-bottom:2px;color:#666;">🎯 智能建议</div>';adviceHtml+='<table style="width:100%;border-collapse:collapse;font-size:11px;"><tr>';adviceHtml+='<td style="width:50%;vertical-align:top;padding:4px;border:1px solid #eee;">';adviceHtml+='<div class="advice-urgent" style="margin-bottom:6px;">';adviceHtml+=`<b>🚨 紧急抛售（基于净风险，倍数：<input type="number" id="urgentMultiplierInput" value="${multiplier}" min="0.1" step="0.1" style="width:45px;padding:1px 3px;font-size:11px;border:1px solid #ccc;border-radius:3px;" onchange="renderSmartDecision()"> 均值：${avgBet.toFixed(0)}）</b><br>`;if(urgentNums.length>0){adviceHtml+='号码：'+urgentNums.map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');adviceHtml+=` <button class="copy-advice-btn" onclick="copyNumsToClipboard([${urgentNums.map(n=>"'"+n+"'").join(',')}])">📋复制</button>`;}else adviceHtml+='<span style="color:#888;">暂无</span>';adviceHtml+='</div>';adviceHtml+='<div class="advice-monitor" style="margin-bottom:6px;">';adviceHtml+='<b>🔍 最近生肖监控（往前6个不重复生肖）</b><br>';if(zodiacMonitorNums.length>0){adviceHtml+='生肖：'+recent6Zodiacs.map(z=>`<span class="${getZodiacCls(z)}">${z}</span>`).join(' ')+'<br>';adviceHtml+='净风险号码：'+zodiacMonitorNums.map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');adviceHtml+=` <button class="copy-advice-btn" onclick="copyNumsToClipboard([${zodiacMonitorNums.map(n=>"'"+n+"'").join(',')}])">📋复制</button>`;}else adviceHtml+='<span style="color:#888;">暂无</span>';adviceHtml+='</div>';adviceHtml+='<div class="advice-bet" style="margin-bottom:6px;">';adviceHtml+='<b>📈 加注建议（正常风险+冷）</b><br>';if(betNums.length>0){adviceHtml+='号码：'+betNums.slice(0,10).map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');}else adviceHtml+='<span style="color:#888;">暂无</span>';adviceHtml+='</div>';adviceHtml+='</td>';adviceHtml+='<td style="width:50%;vertical-align:top;padding:4px;border:1px solid #eee;">';adviceHtml+='<div class="advice-monitor" style="margin-bottom:6px;">';adviceHtml+='<b>❄️ 冷门监控（冷维度 × 净风险负数）</b><br>';if(coldMonitorHtml){adviceHtml+=coldMonitorHtml;}else{adviceHtml+='<span style="color:#888;">暂无冷门净风险号码</span>';}adviceHtml+='</div>';adviceHtml+='</td></tr></table></div>';} let surgeHtml='';if(surgeVisible){surgeHtml='<div style="font-size:11px;">';surgeHtml+=`<div style="margin-bottom:4px;"><b>⏱ 暴增监控</b><span style="margin-left:8px;">条数阈值：<input type="number" value="${surgeThreshold}" min="10" max="100" style="width:50px;font-size:11px;text-align:center;" onchange="surgeThreshold=parseInt(this.value);localStorage.setItem('surgeThreshold',surgeThreshold);computeSurge().then(()=>renderSmartDecision());">%</span><span style="margin-left:8px;">金额阈值：<input type="number" value="${surgeAmountThreshold}" min="0" max="100" step="0.1" style="width:55px;font-size:11px;text-align:center;" onchange="surgeAmountThreshold=parseFloat(this.value);localStorage.setItem('surgeAmountThreshold',surgeAmountThreshold);computeSurge().then(()=>renderSmartDecision());">%</span><span style="margin-left:8px;">最少${surgeMinOrders}条订单</span></div>`;if(window._surgeResult&&window._surgeResult.length>0){window._surgeResult.forEach(user=>{const username=user.user;surgeHtml+=`<div style="margin-bottom:4px;"><b>${username}:</b> `;const countItems=user.countItems||[];const amountItems=user.amountItems||[];if(countItems.length>0){surgeHtml+='(条) ';countItems.sort((a,b)=>b.ratio-a.ratio);countItems.forEach(item=>{surgeHtml+=`<span class="${getNumCls(item.num)}">${item.num}</span> `;});}if(amountItems.length>0){surgeHtml+='(金) ';amountItems.sort((a,b)=>b.ratio-a.ratio);amountItems.forEach(item=>{surgeHtml+=`<span class="${getNumCls(item.num)}">${item.num}</span> `;});}surgeHtml+=`<button class="copy-advice-btn" onclick="copyUserSurgeNums('${username}')" style="margin-left:4px;">📋复制</button>`;surgeHtml+='</div>';});surgeHtml+='<button class="copy-advice-btn" onclick="copyAllSurgeNums()">📋复制全部号码</button>';}else{surgeHtml+='<div style="color:#888;">暂无暴增</div>';}surgeHtml+='</div>';} let finalHtml='';finalHtml+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">`;finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${heatVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleHeat()">开奖热度分析</button>`;finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${adviceVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleAdvice()">智能建议</button>`;finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${surgeVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleSurge()">暴增监控</button>`;finalHtml+=`</div>`;if(heatVisible)finalHtml+=heatHtml;if(adviceVisible)finalHtml+=adviceHtml;if(surgeVisible)finalHtml+=surgeHtml;if(!heatVisible&&!adviceVisible&&!surgeVisible){finalHtml+='<div style="color:#888;font-size:12px;text-align:center;padding:10px;">点击上方按钮查看分析</div>';}container.innerHTML=finalHtml;}

function insertNumToRecognize(num) { const ta = document.querySelector('.source-order-input'); if (!ta) { showRecognizeModal(); setTimeout(() => { const ta2 = document.querySelector('.source-order-input'); if (ta2) { ta2.value = num; performRecognition(num); } }, 300); return; } ta.value = ta.value.trim() ? ta.value.trim() + '-' + num : num; performRecognition(ta.value); showToast('已填入号码：' + num); }
function copyNumsToClipboard(nums) { if (!nums || nums.length === 0) { showToast('暂无号码'); return; } const str = Array.isArray(nums) ? nums.join('-') : nums; navigator.clipboard.writeText(str).then(() => { showToast('已复制：' + str); }).catch(() => { showToast('复制失败'); }); }

// ===== 平特肖渲染 =====
function getPingtexiaoKey() { const fd = document.getElementById('filterDate')?.value || getTodayCST(); return `pingtexiao_${currentRegion}_${fd}`; }
function getPingtexiaoData() { try { return JSON.parse(localStorage.getItem(getPingtexiaoKey()) || '{}'); } catch (e) { return {}; } }
function savePingtexiaoData(data) { localStorage.setItem(getPingtexiaoKey(), JSON.stringify(data)); }

function renderPingtexiaoTable() { const container = document.getElementById('pingtexiaoTableContainer'); if (!container) return; const data = getPingtexiaoData(); const leftZodiacs = ['鼠','牛','虎','兔','龙','蛇']; const rightZodiacs = ['马','羊','猴','鸡','狗','猪']; const zcm = {'鼠':'red-text','兔':'red-text','马':'red-text','鸡':'red-text','虎':'blue-text','蛇':'blue-text','猴':'blue-text','猪':'blue-text','牛':'green-text','龙':'green-text','羊':'green-text','狗':'green-text'}; let html = '<table class="freq-table"><thead><tr>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>'; html += '</tr></thead><tbody>'; for (let r = 0; r < 6; r++) { html += '<tr>'; [leftZodiacs[r], rightZodiacs[r]].forEach(zodiac => { const d = data[zodiac] || { amount: '', report: '' }; const amountVal = d.amount !== undefined && d.amount !== '' && parseFloat(d.amount) !== 0 ? d.amount : ''; const reportVal = d.report !== undefined && d.report !== '' && parseFloat(d.report) !== 0 ? d.report : ''; const remainVal = (amountVal !== '') ? (parseFloat(amountVal) - (reportVal !== '' ? parseFloat(reportVal) : 0)) : 0; const remain = remainVal !== 0 ? remainVal : ''; html += `<td class="${zcm[zodiac] || ''}">${zodiac}</td>`; html += `<td><input type="number" class="pt-edit-input amount-red-text" data-zodiac="${zodiac}" data-field="amount" value="${amountVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`; html += `<td><input type="number" class="pt-edit-input pt-report-text" data-zodiac="${zodiac}" data-field="report" value="${reportVal}" readonly style="width:50px;padding:1px 2px;font-size:12px;text-align:center;border:1px solid transparent;background:transparent;"></td>`; html += `<td style="font-size:12px;">${remain !== '' ? remain : ''}</td>`; }); html += '</tr>'; } html += '</tbody></table>'; container.innerHTML = html; updatePingtexiaoTotal(); }
function finishPtEdit(input) { if (input.hasAttribute('readonly')) return; input.setAttribute('readonly', 'readonly'); input.style.border = '1px solid transparent'; input.style.background = 'transparent'; updatePtRemain(input); savePingtexiaoCell(); }
function updatePtRemain(input) { const row = input.closest('tr'); if (!row) return; const zodiac = input.dataset.zodiac; const cells = row.cells; let amountVal = '', reportVal = ''; for (let i = 0; i < cells.length; i++) { const amountInput = cells[i].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="amount"]`); if (amountInput) { amountVal = amountInput.value.trim(); const reportInput = cells[i+1].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="report"]`); if (reportInput) reportVal = reportInput.value.trim(); const remainCell = cells[i+2]; if (remainCell) { const a = amountVal !== '' ? parseFloat(amountVal) : 0; const r = reportVal !== '' ? parseFloat(reportVal) : 0; remainCell.textContent = amountVal !== '' ? (a - r) : ''; } break; } } updatePingtexiaoTotal(); }
function savePingtexiaoCell() { const data = getPingtexiaoData(); document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].amount = input.value.trim(); }); document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const zodiac = input.dataset.zodiac; if (!data[zodiac]) data[zodiac] = { amount: '', report: '' }; data[zodiac].report = input.value.trim(); }); savePingtexiaoData(data); updatePingtexiaoTotal(); }
function updatePingtexiaoTotal() { let amountTotal = 0, reportTotal = 0; document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) amountTotal += v; }); document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => { const v = parseFloat(input.value.trim()); if (!isNaN(v)) reportTotal += v; }); const amountBox = document.getElementById('ptAmountTotalBox'); const amountSpan = document.getElementById('ptAmountTotal'); const reportBox = document.getElementById('ptReportTotalBox'); const reportSpan = document.getElementById('ptReportTotal'); if (amountBox && amountSpan) { if (amountTotal > 0) { amountSpan.textContent = amountTotal; amountBox.style.display = 'inline-flex'; } else { amountBox.style.display = 'none'; } } if (reportBox && reportSpan) { if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; } } }

// ===== 开奖记录相关函数 =====
function formatDateMD(dateStr) { const d = new Date(dateStr + 'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}`; }
function getCurrentIssueNumber(year, targetDateStr) { const target = new Date(targetDateStr + 'T00:00:00'); const start = new Date(year, 0, 1); if (isNaN(target) || isNaN(start)) return null; if (target < start) return null; const diff = target - start; const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; return dayOfYear; }
function updateRecentDrawTexts() { updateRecentDrawNumbers(); updateRecentZodiacStats(); updateFilterDateDrawInfo(); }
function updateRecentDrawNumbers() { const container = document.getElementById('recentDrawNumbers'); if (!container) return; const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; } const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; } const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; } const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const entries = []; for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; entries.push({ num, zodiac }); } } } if (entries.length === 0) { container.style.display = 'none'; return; } let html = ''; entries.forEach((entry, idx) => { if (idx > 0) html += '、'; html += `<span class="num ${getNumberColorClass(entry.num)}">${entry.num}</span>`; html += `<span class="slash">/</span>`; html += `<span class="${getZodiacColorClass(entry.zodiac)}">${entry.zodiac}</span>`; }); container.innerHTML = html; container.style.display = ''; }
function updateRecentZodiacStats() { const container = document.getElementById('recentZodiacStats'); if (!container) return; const countStr = localStorage.getItem(`recentDrawCount_${currentRegion}`); if (!countStr) { container.style.display = 'none'; return; } const count = parseInt(countStr); if (isNaN(count) || count < 1) { container.style.display = 'none'; return; } const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const currentIssue = getCurrentIssueNumber(year, fd); if (!currentIssue) { container.style.display = 'none'; return; } const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const zodiacList = []; for (let i = currentIssue - count; i < currentIssue; i++) { if (i < 1) continue; const issueId = i.toString().padStart(2, '0'); const entry = savedData[issueId]; if (entry && entry.number && entry.number.trim()) { const num = entry.number.trim().padStart(2, '0'); if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) { const zodiac = currentZodiacMap[num] || ''; if (zodiac) zodiacList.push(zodiac); } } } if (zodiacList.length === 0) { container.style.display = 'none'; return; } const freq = {}; zodiacList.forEach(z => { freq[z] = (freq[z] || 0) + 1; }); const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]); const repeated = []; const single = []; sorted.forEach(([zodiac, cnt]) => { if (cnt > 1) { repeated.push({ zodiac, cnt }); } else { single.push(zodiac); } }); let html = ''; repeated.forEach(item => { html += `<div>${item.cnt}次：<span class="${getZodiacColorClass(item.zodiac)}">${item.zodiac}</span></div>`; }); if (single.length > 0) { const singleSpans = single.map(z => `<span class="${getZodiacColorClass(z)}">${z}</span>`).join('、'); html += `<div>${singleSpans}</div>`; } container.innerHTML = html; container.style.display = ''; }
function updateFilterDateDrawInfo() { const span = document.getElementById('filterDateDrawInfo'); if (!span) return; const fd = document.getElementById('filterDate')?.value || getTodayCST(); let year = new Date().getFullYear(); const m = fd.match(/^(\d{4})/); if (m) year = parseInt(m[1]); const issueNumber = getCurrentIssueNumber(year, fd); if (!issueNumber) { span.style.display = 'none'; return; } const issueId = issueNumber.toString().padStart(2, '0'); const storageKey = `drawRecord_${currentRegion}_${year}`; let savedData = {}; try { savedData = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) {} const entry = savedData[issueId]; if (!entry || !entry.number || !entry.number.trim()) { span.style.display = 'none'; return; } const num = entry.number.trim().padStart(2, '0'); if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) { span.style.display = 'none'; return; } const zodiac = currentZodiacMap[num] || ''; span.innerHTML = `<span class="num ${getNumberColorClass(num)}">${num}</span><span class="slash" style="color:#000;">/</span><span class="${getZodiacColorClass(zodiac)}">${zodiac}</span>`; span.style.display = ''; }

// ===== 截断阈值解析方法切换 =====
let currentParseMethod = parseInt(localStorage.getItem('savedParseMethod') || '0');
function parseExcessText(text, method) { const lines = text.trim().split('\n').filter(l => l.trim()); const items = []; for (const line of lines) { const match = line.match(/(\d{2})各(\d+)米/); if (match) { items.push({ num: match[1], amount: parseInt(match[2]) }); } } if (items.length === 0) return ''; items.sort((a, b) => b.amount - a.amount); const parseItems = (method) => { const data = items.map(item => ({ ...item })); const result = []; if (method === 0) { while (data.some(d => d.amount > 0)) { const maxAmount = Math.max(...data.map(d => d.amount)); if (maxAmount <= 0) break; const group = []; for (const d of data) { if (d.amount > 0 && (maxAmount - d.amount) <= maxAmount * 0.4) { group.push(d.num); } } const groupAmount = Math.min(...group.map(n => data.find(d => d.num === n).amount)); for (const n of group) { const d = data.find(d => d.num === n); d.amount -= groupAmount; } result.push(`${group.join('-')}各数${groupAmount}`); } } else if (method === 1) { while (data.some(d => d.amount > 0)) { let bestAmount = 0; let bestCount = 0; for (let i = 0; i < data.length; i++) { const candidate = data[i].amount; if (candidate <= 0) continue; let count = 0; for (const d of data) { if (d.amount >= candidate) count++; } if (count > bestCount || (count === bestCount && candidate < bestAmount)) { bestCount = count; bestAmount = candidate; } } if (bestCount === 0) break; const group = []; for (const d of data) { if (d.amount >= bestAmount) { group.push(d.num); d.amount -= bestAmount; } } result.push(`${group.join('-')}各数${bestAmount}`); } } else if (method === 2) { const levels = [50, 10, 5, 2, 1]; for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } } } else if (method === 3) { for (let lv = 100; lv >= 1; lv--) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } } } else if (method === 4) { const levels = []; for (let lv = 100; lv >= 5; lv -= 5) levels.push(lv); levels.push(3, 2, 1); for (const lv of levels) { let again = true; while (again) { again = false; const group = []; for (const d of data) { if (d.amount >= lv) { group.push(d.num); d.amount -= lv; again = true; } } if (group.length > 0) { result.push(`${group.join('-')}各数${lv}`); } } } } return result.join('\n'); }; return parseItems(method); }
function switchParseMethod() { const text = document.getElementById('reportCapInfo').innerText; if (!text || text === '无超出的号码') { showToast('当前没有超额文本'); document.getElementById('parseResultArea').innerText = ''; return; } const result = parseExcessText(text, currentParseMethod); document.getElementById('parseResultArea').innerText = result; const methodNames = ['聚类分组', '贪心合并', '固定50→10→5→2→1', '100递减', '固定100→...→1']; showToast(`当前方案：${methodNames[currentParseMethod]}`); currentParseMethod = (currentParseMethod + 1) % 5; localStorage.setItem('savedParseMethod', currentParseMethod); }
function copyOrderGroup() { const text = document.getElementById('parseResultArea').innerText; if (!text) { showToast('没有解析结果'); return; } navigator.clipboard.writeText(text).then(() => showToast('订单组已复制')); }