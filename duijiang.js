// ===== duijiang.js - 兑奖窗口与连肖统计（开奖录入、盈亏计算、结果展示） =====

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

// ===== 连肖统计核心函数 =====
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

// ===== 特肖兑奖处理函数 =====
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
    if (zodiacs.includes(drawTeMaZodiac)) { hitZodiac = drawTeMaZodiac; hitAmt = amt; }
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
    if (zodiacs.includes(drawTeMaZodiac)) { hitZodiac = drawTeMaZodiac; hitAmt = amt; }
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

// ===== 特碰兑奖处理函数 =====
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
        if (first === drawTeMa && drawNumbersZhengma.includes(second)) hitCount++;
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
        if (first === drawTeMa && drawNumbersZhengma.includes(second)) hitCount++;
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

// ===== 包玩法兑奖处理函数 =====
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
    if (comboType === '平特肖') { hasYearZodiac = tokens.some(t => t === curYearZodiac); }
    else if (comboType === '平特尾') { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
    else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) { hasYearZodiac = tokens.some(t => t === curYearZodiac); }
    else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
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
    if (comboType === '平特肖') { hasYearZodiac = tokens.some(t => t === curYearZodiac); }
    else if (comboType === '平特尾') { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
    else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) { hasYearZodiac = tokens.some(t => t === curYearZodiac); }
    else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
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