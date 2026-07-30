/* ===== render.js - DOM 渲染函数（表格、卡片、统计图表、智能决策、兑奖统计、连肖统计） ===== */

// ===== 基础表格渲染 =====
function renderAllTablesPlaceholder() {
  const tbody = document.getElementById('tableBody');
  if (tbody) {
    let html = '';
    for (let i = 1; i <= 49; i++) {
      const num = i.toString().padStart(2, '0');
      const zodiac = currentZodiacMap[num] || '';
      const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text');
      html += `<tr class="${cls}"><td>${num}${zodiac}</td><td>0</td><td>0</td><td>${num}</td><td>${i}</td></tr>`;
    }
    tbody.innerHTML = html;
  }
  const reportTbody = document.getElementById('reportTableBody');
  if (reportTbody) {
    let html = '';
    for (let i = 1; i <= 49; i++) {
      const num = i.toString().padStart(2, '0');
      const zodiac = currentZodiacMap[num] || '';
      const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text');
      html += `<tr class="${cls}"><td>${num}${zodiac}</td><td>0</td><td>0</td><td>${num}</td><td>${i}</td></tr>`;
    }
    reportTbody.innerHTML = html;
  }
  renderFrequencyCards();
  renderAmountFrequencyCards();
  renderReportAmountTable();
  renderOriginalAmountTable();
}

function generateRiskTable() {
  const sw = document.getElementById('riskReportSwitcher')?.value;
  let data;
  if (sw === 'total') data = tableBetData;
  else if (sw === 'user') { const u = document.getElementById('viewUserSelect')?.value; data = userBetData[u] || {}; }
  else data = reportBetData;
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  let total = 0;
  const mul = parseFloat(document.getElementById('multipleVal')?.value) || 1;
  const rr = parseFloat(document.getElementById('rebateRate')?.value) || 0;
  let list = [];
  for (let n in data) { const b = data[n]; total += b; list.push({ num: n, bet: b }); }
  for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); if (!data[n]) list.push({ num: n, bet: 0 }); }
  list.sort((a, b) => b.bet - a.bet);
  const reb = (total * rr / 100).toFixed(2);
  list.forEach((item, idx) => {
    const { num, bet } = item;
    const risk = Math.round(total - bet * mul - parseFloat(reb));
    const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text');
    const tr = document.createElement('tr');
    tr.className = cls;
    tr.innerHTML = `<td>${num}${currentZodiacMap[num] || ''}</td><td>${bet}</td><td>${risk}</td><td>${num}</td><td>${idx + 1}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('totalBet').textContent = total;
  document.getElementById('totalRebate').textContent = reb;
}

function applyReportCap() { generateReportTable(); }

function generateReportTable() {
  const cap = document.getElementById('reportCapInput');
  let cv = parseFloat(cap?.value);
  if (isNaN(cv) || cv <= 0) cap.value = '';
  const data = reportBetData;
  const tbody = document.getElementById('reportTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const mul = parseFloat(document.getElementById('reportMultipleVal')?.value) || 1;
  const rr = parseFloat(document.getElementById('reportRebateRate')?.value) || 0;
  let total = 0;
  reportRiskData = {};
  let list = [];
  for (let n in data) {
    let b = data[n];
    if (!isNaN(cv) && cv > 0 && b > cv) b = cv;
    total += b;
    list.push({ num: n, bet: b });
  }
  for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); if (!data[n]) list.push({ num: n, bet: 0 }); }
  list.sort((a, b) => b.bet - a.bet);
  const reb = (total * rr / 100).toFixed(2);
  list.forEach((item, idx) => {
    const { num, bet } = item;
    const risk = Math.round(total - bet * mul - parseFloat(reb));
    reportRiskData[num] = risk;
    const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text');
    const tr = document.createElement('tr');
    tr.className = cls;
    tr.innerHTML = `<td>${num}${currentZodiacMap[num] || ''}</td><td>${bet}</td><td>${risk}</td><td>${num}</td><td>${idx + 1}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('reportTotalBet').textContent = total;
  document.getElementById('reportTotalRebate').textContent = reb;
  const info = document.getElementById('reportCapInfo');
  if (!isNaN(cv) && cv > 0) {
    const exc = [];
    for (let n in data) { if (data[n] > cv) exc.push({ num: n, exceed: data[n] - cv }); }
    if (exc.length > 0) {
      exc.sort((a, b) => a.exceed - b.exceed);
      let txt = ''; let te = 0;
      exc.forEach(x => { txt += `${x.num}各${x.exceed}米<br>`; te += x.exceed; });
      txt += `合计${te}`;
      info.innerHTML = txt;
    } else { info.textContent = '无超出的号码'; }
  } else { info.textContent = ''; }
  if (Object.keys(data).length > 0) { const max = Math.max(...Object.values(data)); cap.placeholder = max; }
}

async function copyReportCapText() {
  const info = document.getElementById('reportCapInfo');
  const txt = info.innerText || info.textContent;
  if (!txt || txt === '无超出的号码') { showToast('没有可复制的文本'); return; }
  navigator.clipboard.writeText(txt).then(() => showToast('已复制')).catch(() => showToast('复制失败'));
}

async function screenshotTable(tid) {
  const tbl = document.getElementById(tid);
  if (!tbl) { showToast('表格不存在'); return; }
  try {
    const canvas = await html2canvas(tbl, { backgroundColor: '#ffffff', scale: 2, logging: false });
    canvas.toBlob(async blob => {
      if (!blob) { showToast('生成图片失败'); return; }
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); } catch (e) { showToast('复制失败'); }
    }, 'image/png');
  } catch (e) { showToast('截图失败'); }
}

function renderReportAmountTable() {
  const tbl = document.getElementById('reportAmountTable');
  if (!tbl) return;
  tbl.innerHTML = '';
  const cols = [...Array(5)].map((_, c) => Array.from({ length: c === 4 ? 9 : 10 }, (_, r) => (c * 10 + r + 1).toString().padStart(2, '0')));
  let th = '<thead><tr>';
  for (let c = 0; c < 5; c++) th += '<th>号码</th><th>金额</th>';
  th += '</tr></thead>';
  let tb = '<tbody>';
  for (let r = 0; r < 10; r++) {
    tb += '<tr>';
    for (let c = 0; c < 5; c++) {
      const n = cols[c][r] || '';
      if (n) {
        const a = reportAmountData[n] || 0;
        const cls = redNumbers.includes(n) ? 'red-text' : (blueNumbers.includes(n) ? 'blue-text' : 'green-text');
        tb += `<td class="${cls}">${n}</td><td class="black-text">${a || ''}</td>`;
      } else { tb += '<td></td><td></td>'; }
    }
    tb += '</tr>';
  }
  tb += '</tbody>';
  tbl.innerHTML = th + tb;
  updateReportAmountTotal();
}

function updateReportAmountTotal() {
  const box = document.getElementById('reportAmountTotalBox');
  const span = document.getElementById('reportAmountTotalValue');
  let total = 0;
  for (let n in reportAmountData) total += reportAmountData[n] || 0;
  if (total > 0) { span.textContent = total; box.style.display = 'inline-flex'; } else { box.style.display = 'none'; }
}

function renderFrequencyCards() {
  const nt = document.getElementById('numberFreqTable');
  if (!nt) return;
  nt.innerHTML = '';
  const cols = [...Array(5)].map((_, c) => Array.from({ length: c === 4 ? 9 : 10 }, (_, r) => (c * 10 + r + 1).toString().padStart(2, '0')));
  let th = '<thead><tr>';
  for (let c = 0; c < 5; c++) th += '<th>号码</th><th>次数</th>';
  th += '</tr></thead>';
  let tb = '<tbody>';
  for (let r = 0; r < 10; r++) {
    tb += '<tr>';
    for (let c = 0; c < 5; c++) {
      const n = cols[c][r] || '';
      if (n) {
        const cnt = numberCount[n] || 0;
        const cls = redNumbers.includes(n) ? 'red-text' : (blueNumbers.includes(n) ? 'blue-text' : 'green-text');
        tb += `<td class="${cls}">${n}</td><td class="black-text">${cnt || ''}</td>`;
      } else { tb += '<td></td><td></td>'; }
    }
    tb += '</tr>';
  }
  tb += '</tbody>';
  nt.innerHTML = th + tb;

  const zt = document.getElementById('zodiacFreqTable');
  if (!zt) return;
  zt.innerHTML = '';
  const lz = ['鼠', '牛', '虎', '兔', '龙', '蛇'], rz = ['马', '羊', '猴', '鸡', '狗', '猪'];
  const zcm = { '鼠': 'red-text', '兔': 'red-text', '马': 'red-text', '鸡': 'red-text', '虎': 'blue-text', '蛇': 'blue-text', '猴': 'blue-text', '猪': 'blue-text', '牛': 'green-text', '龙': 'green-text', '羊': 'green-text', '狗': 'green-text' };
  let zth = '<thead><tr><th>生肖</th><th>次数</th><th>金额</th><th>上报</th><th>生肖</th><th>次数</th><th>金额</th><th>上报</th></tr></thead>', ztb = '<tbody>';
  for (let r = 0; r < 6; r++) {
    const l = lz[r], r2 = rz[r];
    const lc = zodiacCount[l] || 0, rc = zodiacCount[r2] || 0;
    const la = zodiacDirectAmount[l] || 0, ra = zodiacDirectAmount[r2] || 0;
    const lrp = zodiacReportAmount[l] || 0, rrp = zodiacReportAmount[r2] || 0;
    ztb += `<tr><td class="${zcm[l]}">${l}</td><td class="black-text">${lc || ''}</td><td class="amount-red-text">${la || ''}</td><td class="report-red-text">${lrp || ''}</td><td class="${zcm[r2]}">${r2}</td><td class="black-text">${rc || ''}</td><td class="amount-red-text">${ra || ''}</td><td class="report-red-text">${rrp || ''}</td></tr>`;
  }
  ztb += '</tbody>';
  zt.innerHTML = zth + ztb;
}

function renderAmountFrequencyCards() {
  const nt = document.getElementById('numberAmountFreqTable');
  if (!nt) return;
  nt.innerHTML = '';
  const cols = [...Array(5)].map((_, c) => Array.from({ length: c === 4 ? 9 : 10 }, (_, r) => (c * 10 + r + 1).toString().padStart(2, '0')));
  let th = '<thead><tr>';
  for (let c = 0; c < 5; c++) th += '<th>号码</th><th>次数</th>';
  th += '</tr></thead>';
  let tb = '<tbody>';
  for (let r = 0; r < 10; r++) {
    tb += '<tr>';
    for (let c = 0; c < 5; c++) {
      const n = cols[c][r] || '';
      if (n) {
        const cnt = numberAmountCount[n] || 0;
        const cls = redNumbers.includes(n) ? 'red-text' : (blueNumbers.includes(n) ? 'blue-text' : 'green-text');
        tb += `<td class="${cls}">${n}</td><td class="black-text">${cnt || ''}</td>`;
      } else { tb += '<td></td><td></td>'; }
    }
    tb += '</tr>';
  }
  tb += '</tbody>';
  nt.innerHTML = th + tb;

  const zt = document.getElementById('zodiacAmountFreqTable');
  if (!zt) return;
  zt.innerHTML = '';
  const lz = ['鼠', '牛', '虎', '兔', '龙', '蛇'], rz = ['马', '羊', '猴', '鸡', '狗', '猪'];
  const zcm = { '鼠': 'red-text', '兔': 'red-text', '马': 'red-text', '鸡': 'red-text', '虎': 'blue-text', '蛇': 'blue-text', '猴': 'blue-text', '猪': 'blue-text', '牛': 'green-text', '龙': 'green-text', '羊': 'green-text', '狗': 'green-text' };
  let zth = '<thead><tr><th>生肖</th><th>次数</th><th>金额</th><th>上报</th><th>生肖</th><th>次数</th><th>金额</th><th>上报</th></tr></thead>', ztb = '<tbody>';
  for (let r = 0; r < 6; r++) {
    const l = lz[r], r2 = rz[r];
    const lc = zodiacAmountCount[l] || 0, rc = zodiacAmountCount[r2] || 0;
    const la = zodiacFilteredAmount[l] || 0, ra = zodiacFilteredAmount[r2] || 0;
    const lrp = zodiacFilteredReportAmount[l] || 0, rrp = zodiacFilteredReportAmount[r2] || 0;
    ztb += `<tr><td class="${zcm[l]}">${l}</td><td class="black-text">${lc || ''}</td><td class="amount-red-text">${la || ''}</td><td class="report-red-text">${lrp || ''}</td><td class="${zcm[r2]}">${r2}</td><td class="black-text">${rc || ''}</td><td class="amount-red-text">${ra || ''}</td><td class="report-red-text">${rrp || ''}</td></tr>`;
  }
  ztb += '</tbody>';
  zt.innerHTML = zth + ztb;
}

function renderOriginalAmountTable() {
  const tbl = document.getElementById('originalAmountTable');
  if (!tbl) return;
  const cols = [...Array(5)].map((_, c) => Array.from({ length: c === 4 ? 9 : 10 }, (_, r) => (c * 10 + r + 1).toString().padStart(2, '0')));
  let th = '<thead><tr>';
  for (let c = 0; c < 5; c++) th += '<th>号码</th><th>次数</th><th>金额</th><th>上报</th>';
  th += '</tr></thead>';
  let tb = '<tbody>';
  for (let r = 0; r < 10; r++) {
    tb += '<tr>';
    for (let c = 0; c < 5; c++) {
      const n = cols[c][r] || '';
      if (n) {
        const cnt = numberCount[n] || 0;
        const amt = directOrderAmount[n] || 0;
        const rpt = directReportAmount[n] || 0;
        const cls = redNumbers.includes(n) ? 'red-text' : (blueNumbers.includes(n) ? 'blue-text' : 'green-text');
        tb += `<td class="${cls}">${n}</td>`;
        tb += `<td class="black-text">${cnt > 0 ? cnt : ''}</td>`;
        tb += `<td class="amount-red-text">${amt > 0 ? amt : ''}</td>`;
        tb += `<td class="report-red-text">${rpt > 0 ? rpt : ''}</td>`;
      } else { tb += '<td></td><td></td><td></td><td></td>'; }
    }
    tb += '</tr>';
  }
  tb += '</tbody>';
  tbl.innerHTML = th + tb;
  updateDirectAmountTotals();
}

function updateDirectAmountTotals() {
  let orderTotal = 0;
  let reportTotal = 0;
  for (let n in directOrderAmount) { orderTotal += directOrderAmount[n] || 0; }
  for (let n in directReportAmount) { reportTotal += directReportAmount[n] || 0; }
  const orderBox = document.getElementById('directOrderTotalBox');
  const orderSpan = document.getElementById('directOrderTotalAmount');
  if (orderBox && orderSpan) {
    if (orderTotal > 0) { orderSpan.textContent = orderTotal; orderBox.style.display = 'inline-flex'; } else { orderBox.style.display = 'none'; }
  }
  const reportBox = document.getElementById('directReportTotalBox');
  const reportSpan = document.getElementById('directReportTotalAmount');
  if (reportBox && reportSpan) {
    if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; }
  }
}

function updateOrderTotalDisplay() {
  const re = document.getElementById('orderResult');
  const box = document.getElementById('orderTotalAmountBox');
  const span = document.getElementById('orderTotalAmount');
  const lineCountSpan = document.getElementById('orderLineCount');
  if (!re || !box || !span) return;
  const pureLines = window._pureOrderLines || [];
  if (pureLines.length === 0) { box.style.display = 'none'; if (lineCountSpan) lineCountSpan.style.display = 'none'; return; }
  let total = 0;
  let validLineCount = pureLines.length;
  pureLines.forEach(line => {
    if (line.startsWith('特肖:')) {
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if (match) { const zodiacs = match[1].split('-').filter(z => z.trim()); const amt = parseInt(match[2]) || 0; total += zodiacs.length * amt; }
    } else if (line.startsWith('特碰:')) {
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if (match) { const cleaned = match[1].replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim()); total += groups.length * (parseInt(match[2]) || 0); }
    } else if (line.startsWith('包')) {
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) { total += parseInt(match[3]) || 0; }
    } else if (line.startsWith('特码:')) {
      const { numbers, amount } = countItemsInLine(line);
      const cnt = numbers.length;
      if (cnt > 0 && amount > 0) total += cnt * amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) {
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') {
          const items = content.split('-').filter(i => i.trim());
          total += items.length * amt;
        } else {
          const cleaned = content.replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c => c.trim());
          total += groups.length * amt;
        }
      }
    }
  });
  span.textContent = total;
  if (total > 0) {
    box.style.display = 'inline-flex';
    if (lineCountSpan) { lineCountSpan.innerHTML = '<span style="color:#000;">' + validLineCount + '</span>行'; lineCountSpan.style.display = 'inline'; }
  } else {
    box.style.display = 'none';
    if (lineCountSpan) lineCountSpan.style.display = 'none';
  }
}

function computeCurrentOrderTotal() {
  const pureLines = window._pureOrderLines || [];
  let total = 0;
  pureLines.forEach(line => {
    if (line.startsWith('特肖:')) {
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if (match) { const zodiacs = match[1].split('-').filter(z => z.trim()); const amt = parseInt(match[2]) || 0; total += zodiacs.length * amt; }
    } else if (line.startsWith('特碰:')) {
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if (match) { const cleaned = match[1].replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim()); total += groups.length * (parseInt(match[2]) || 0); }
    } else if (line.startsWith('包')) {
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) { total += parseInt(match[3]) || 0; }
    } else if (line.startsWith('特码:')) {
      const { numbers, amount } = countItemsInLine(line);
      const cnt = numbers.length;
      if (cnt > 0) total += cnt * amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) {
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') {
          const items = content.split('-').filter(i => i.trim());
          total += items.length * amt;
        } else {
          const cleaned = content.replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c => c.trim());
          total += groups.length * amt;
        }
      }
    }
  });
  return total;
}

function updateAmountDisplays() {
  const nb = document.getElementById('numberTotalBox');
  const zb = document.getElementById('zodiacTotalBox');
  if (numberOrderTotal > 0) {
    document.getElementById('numberTotalAmount').textContent = numberOrderTotal;
    nb.style.display = 'inline-flex';
  } else { nb.style.display = 'none'; }
  let zodiacTotal = 0;
  for (let z in zodiacDirectAmount) { zodiacTotal += zodiacDirectAmount[z] || 0; }
  if (zodiacTotal > 0) {
    document.getElementById('zodiacTotalAmount').textContent = zodiacTotal;
    zb.style.display = 'inline-flex';
  } else { zb.style.display = 'none'; }
}

// ===== 平特肖表格 =====
function getPingtexiaoKey() {
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  return `pingtexiao_${currentRegion}_${fd}`;
}

function getPingtexiaoData() {
  try { return JSON.parse(localStorage.getItem(getPingtexiaoKey()) || '{}'); } catch (e) { return {}; }
}

function savePingtexiaoData(data) {
  localStorage.setItem(getPingtexiaoKey(), JSON.stringify(data));
}

function renderPingtexiaoTable() {
  const container = document.getElementById('pingtexiaoTableContainer');
  if (!container) return;
  const data = getPingtexiaoData();
  const leftZodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇'];
  const rightZodiacs = ['马', '羊', '猴', '鸡', '狗', '猪'];
  const zcm = { '鼠': 'red-text', '兔': 'red-text', '马': 'red-text', '鸡': 'red-text', '虎': 'blue-text', '蛇': 'blue-text', '猴': 'blue-text', '猪': 'blue-text', '牛': 'green-text', '龙': 'green-text', '羊': 'green-text', '狗': 'green-text' };
  let html = '<table class="freq-table"><thead><tr>';
  html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>';
  html += '<th>生肖</th><th>金额</th><th>上报</th><th>剩余</th>';
  html += '</tr></thead><tbody>';
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
  html += '</tbody></table>';
  container.innerHTML = html;
  updatePingtexiaoTotal();
}

function fillPingtexiao() {
  const resultEl = document.getElementById('orderResult');
  if (!resultEl) { showToast('识别结果为空'); return; }
  const text = resultEl.innerText.trim();
  if (!text) { showToast('识别结果为空'); return; }
  const lines = text.split('\n');
  const zodiacAmounts = {};
  lines.forEach(line => {
    const { zodiacs, amount } = countItemsInLine(line);
    if (zodiacs.length > 0 && amount > 0) {
      zodiacs.forEach(z => { zodiacAmounts[z] = (zodiacAmounts[z] || 0) + amount; });
    }
  });
  const matchedZodiacs = Object.keys(zodiacAmounts);
  if (matchedZodiacs.length === 0) { showToast('未找到生肖数据'); return; }
  const data = getPingtexiaoData();
  matchedZodiacs.forEach(z => {
    if (!data[z]) data[z] = { amount: '', report: '' };
    const oldAmount = parseFloat(data[z].amount) || 0;
    data[z].amount = (oldAmount + zodiacAmounts[z]).toString();
  });
  savePingtexiaoData(data);
  renderPingtexiaoTable();
  updatePingtexiaoTotal();
  const si = document.querySelector('.source-order-input');
  if (si) si.value = '';
  if (resultEl) resultEl.innerHTML = '';
  updateOrderTotalDisplay();
  showToast(`已填充 ${matchedZodiacs.length} 个生肖到平特肖`);
}

function finishPtEdit(input) {
  if (input.hasAttribute('readonly')) return;
  input.setAttribute('readonly', 'readonly');
  input.style.border = '1px solid transparent';
  input.style.background = 'transparent';
  updatePtRemain(input);
  savePingtexiaoCell();
}

function updatePtRemain(input) {
  const row = input.closest('tr');
  if (!row) return;
  const zodiac = input.dataset.zodiac;
  const cells = row.cells;
  let amountVal = '', reportVal = '';
  for (let i = 0; i < cells.length; i++) {
    const amountInput = cells[i].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="amount"]`);
    if (amountInput) {
      amountVal = amountInput.value.trim();
      const reportInput = cells[i + 1].querySelector(`.pt-edit-input[data-zodiac="${zodiac}"][data-field="report"]`);
      if (reportInput) reportVal = reportInput.value.trim();
      const remainCell = cells[i + 2];
      if (remainCell) {
        const a = amountVal !== '' ? parseFloat(amountVal) : 0;
        const r = reportVal !== '' ? parseFloat(reportVal) : 0;
        remainCell.textContent = amountVal !== '' ? (a - r) : '';
      }
      break;
    }
  }
  updatePingtexiaoTotal();
}

function savePingtexiaoCell() {
  const data = getPingtexiaoData();
  document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => {
    const zodiac = input.dataset.zodiac;
    if (!data[zodiac]) data[zodiac] = { amount: '', report: '' };
    data[zodiac].amount = input.value.trim();
  });
  document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => {
    const zodiac = input.dataset.zodiac;
    if (!data[zodiac]) data[zodiac] = { amount: '', report: '' };
    data[zodiac].report = input.value.trim();
  });
  savePingtexiaoData(data);
  updatePingtexiaoTotal();
}

function updatePingtexiaoTotal() {
  let amountTotal = 0, reportTotal = 0;
  document.querySelectorAll('.pt-edit-input[data-field="amount"]').forEach(input => {
    const v = parseFloat(input.value.trim());
    if (!isNaN(v)) amountTotal += v;
  });
  document.querySelectorAll('.pt-edit-input[data-field="report"]').forEach(input => {
    const v = parseFloat(input.value.trim());
    if (!isNaN(v)) reportTotal += v;
  });
  const amountBox = document.getElementById('ptAmountTotalBox');
  const amountSpan = document.getElementById('ptAmountTotal');
  const reportBox = document.getElementById('ptReportTotalBox');
  const reportSpan = document.getElementById('ptReportTotal');
  if (amountBox && amountSpan) {
    if (amountTotal > 0) { amountSpan.textContent = amountTotal; amountBox.style.display = 'inline-flex'; } else { amountBox.style.display = 'none'; }
  }
  if (reportBox && reportSpan) {
    if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; } else { reportBox.style.display = 'none'; }
  }
}

function updateOrderCountDisplay() {
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  getOrderRecords().then(orders => {
    const todayOrders = orders.filter(r => r.date === fd);
    const countEl = document.getElementById('duiJiangOrderCount');
    if (countEl) { countEl.textContent = '(共' + todayOrders.length + '单)'; }
  });
}

// ===== 自定义筛选卡片 =====
function toggleZodiacRank() { zodiacRankVisible = !zodiacRankVisible; updateCardA(); showToast(zodiacRankVisible ? '生肖排行已展开' : '生肖排行已收起'); }

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
        const content = newMatch[1]; const amt = parseInt(newMatch[2]) || 0;
        if (amt <= 0) return;
        const items = content.split('-').map(i => i.trim()).filter(i => i);
        if (items.length === 1 && /^\d{1,2}$/.test(items[0])) {
          const num = items[0].padStart(2, '0');
          if (parseInt(num) >= 1 && parseInt(num) <= 49) { singleCount[num] = (singleCount[num] || 0) + 1; }
        }
        return;
      }
      const oldMatch = l.match(/^(\d{2})\s+各(?:数|)\s*(\d+)$/);
      if (oldMatch && parseInt(oldMatch[2]) > 0) { singleCount[oldMatch[1]] = (singleCount[oldMatch[1]] || 0) + 1; }
    });
  });
  const singleNums = Object.keys(singleCount);
  if (singleNums.length > 0) {
    const sorted = singleNums.sort((a, b) => parseInt(a) - parseInt(b));
    function getNumCls(n) { if (redNumbers.includes(n)) return 'red-text'; if (blueNumbers.includes(n)) return 'blue-text'; if (greenNumbers.includes(n)) return 'green-text'; return ''; }
    display.innerHTML = sorted.map(n => { const cnt = singleCount[n]; return `<span class="${getNumCls(n)}">${n}${cnt >= 2 ? '(' + cnt + '次)' : ''}</span>`; }).join(' ');
    row.style.display = '';
  } else { display.innerHTML = '<span style="color:#888;">暂无</span>'; row.style.display = ''; }
}

function copySingleBetNums() {
  const display = document.getElementById('singleBetDisplay');
  if (!display) return;
  const spans = display.querySelectorAll('span');
  const nums = Array.from(spans).map(s => s.textContent.replace(/\(\d+次\)/, '').trim()).filter(t => /^\d{2}$/.test(t));
  if (nums.length === 0) { showToast('暂无号码'); return; }
  navigator.clipboard.writeText(nums.join('-')).then(() => { showToast('已复制：' + nums.join('-')); }).catch(() => { showToast('复制失败'); });
}

function updateCardA() {
  const contentEl = document.getElementById('cardAContent');
  if (!contentEl) return;
  let html = '';
  const filterInput = document.getElementById('filterInputCardA');
  const filterText = filterInput ? filterInput.value.trim() : '';
  if (filterText) {
    const tokens = filterText.split(/\s+/).filter(t => t);
    let targetNums = new Set();
    tokens.forEach(token => {
      if (/^\d{1,2}$/.test(token)) { const n = token.padStart(2, '0'); if (parseInt(n) >= 1 && parseInt(n) <= 49) targetNums.add(n); }
      else if (ZODIAC_NUMS[token]) { ZODIAC_NUMS[token].split(/[\s,，]+/).forEach(n => targetNums.add(n.padStart(2, '0'))); }
      else if (D[token]) { const nums = keyToAllNums(token); nums.forEach(n => targetNums.add(n.padStart(2, '0'))); }
    });
    if (targetNums.size > 0) {
      const negativeNums = [];
      for (const num of targetNums) { if (reportRiskData[num] !== undefined && reportRiskData[num] < 0) { negativeNums.push(num); } }
      if (negativeNums.length > 0) {
        html += '<div style="margin-bottom:4px;"><b>添加筛选：</b>';
        negativeNums.sort((a, b) => parseInt(a) - parseInt(b));
        negativeNums.forEach((num, idx) => { const cls = redNumbers.includes(num) ? 'red-text' : (blueNumbers.includes(num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${num}</span>`; if (idx < negativeNums.length - 1) html += '-'; });
        html += '</div>';
      }
    }
  }
  const topNInput = document.getElementById('topNInput');
  const nVal = topNInput ? parseInt(topNInput.value) : NaN;
  if (!isNaN(nVal) && nVal > 0) {
    const entries = Object.entries(numberAmountCount).map(([num, cnt]) => ({ num, cnt: cnt || 0 }));
    for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); if (!numberAmountCount[n]) entries.push({ num: n, cnt: 0 }); }
    const sortedDesc = [...entries].sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num));
    const idxDesc = Math.min(nVal - 1, sortedDesc.length - 1);
    const cutoffDesc = sortedDesc[idxDesc]?.cnt ?? 0;
    const activeNums = sortedDesc.filter(e => e.cnt >= cutoffDesc && e.cnt > 0);
    activeNums.sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num));
    const sortedAsc = [...entries].sort((a, b) => a.cnt - b.cnt || parseInt(a.num) - parseInt(b.num));
    const idxAsc = Math.min(nVal - 1, sortedAsc.length - 1);
    const cutoffAsc = sortedAsc[idxAsc]?.cnt ?? 0;
    let inactiveNums = sortedAsc.filter(e => e.cnt <= cutoffAsc);
    inactiveNums.sort((a, b) => b.cnt - a.cnt || parseInt(a.num) - parseInt(b.num));
    if (activeNums.length > 0) {
      html += '<div style="margin-bottom:4px;"><b>活跃次数：</b>';
      activeNums.forEach((e, idx) => { const cls = redNumbers.includes(e.num) ? 'red-text' : (blueNumbers.includes(e.num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${e.num}</span>`; if (idx < activeNums.length - 1) html += '-'; });
      html += '</div>';
    }
    if (inactiveNums.length > 0) {
      html += '<div style="margin-bottom:4px;"><b>不活跃次数：</b>';
      inactiveNums.forEach((e, idx) => { const cls = redNumbers.includes(e.num) ? 'red-text' : (blueNumbers.includes(e.num) ? 'blue-text' : 'green-text'); html += `<span class="${cls}">${e.num}</span>`; if (idx < inactiveNums.length - 1) html += '-'; });
      html += '</div>';
    }
  }
  if (zodiacRankVisible) {
    const zodiacOrderFixed = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    const zcm = { '鼠': 'red-text', '兔': 'red-text', '马': 'red-text', '鸡': 'red-text', '虎': 'blue-text', '蛇': 'blue-text', '猴': 'blue-text', '猪': 'blue-text', '牛': 'green-text', '龙': 'green-text', '羊': 'green-text', '狗': 'green-text' };
    const zCountEntries = zodiacOrderFixed.map(z => ({ zodiac: z, cnt: zodiacAmountCount[z] || 0 }));
    zCountEntries.sort((a, b) => b.cnt - a.cnt);
    html += '<div style="margin-bottom:4px;"><b>生肖活跃：</b>';
    zCountEntries.forEach((e, idx) => { html += `<span class="${zcm[e.zodiac] || ''}">${e.zodiac}</span>`; if (idx < zCountEntries.length - 1) html += '、'; });
    html += '</div>';
    const zAmtEntries = zodiacOrderFixed.map(z => ({ zodiac: z, amt: zodiacFilteredAmount[z] || 0 }));
    zAmtEntries.sort((a, b) => b.amt - a.amt);
    html += '<div style="margin-bottom:4px;"><b>金额排行：</b>';
    zAmtEntries.forEach((e, idx) => { html += `<span class="${zcm[e.zodiac] || ''}">${e.zodiac}</span>`; if (idx < zAmtEntries.length - 1) html += '、'; });
    html += '</div>';
  }
  contentEl.innerHTML = html;
  if (singleBetVisible) updateSingleBetDisplay();
}

function copyCardANumbers(type) {
  const contentEl = document.getElementById('cardAContent');
  if (!contentEl) return;
  const lines = [];
  let currentLine = [];
  Array.from(contentEl.childNodes).forEach(node => {
    if (node.nodeName === 'SPAN') { currentLine.push(node); }
    else if (node.nodeName === 'BR') { if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } }
    else if (node.nodeName === 'DIV') {
      Array.from(node.childNodes).forEach(child => { if (child.nodeName === 'SPAN') { currentLine.push(child); } else if (child.nodeName === 'BR') { if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; } } });
      if (currentLine.length > 0) { lines.push(currentLine); currentLine = []; }
    }
  });
  if (currentLine.length > 0) lines.push(currentLine);
  const filterText = document.getElementById('filterInputCardA')?.value.trim();
  const topNVal = parseInt(document.getElementById('topNInput')?.value);
  let targetLineIndex = -1;
  let lineIdx = 0;
  if (filterText) { if (type === 'risk') targetLineIndex = lineIdx; lineIdx++; }
  if (!isNaN(topNVal) && topNVal > 0) { if (type === 'active') targetLineIndex = lineIdx; lineIdx++; if (type === 'inactive') targetLineIndex = lineIdx; lineIdx++; }
  if (targetLineIndex < 0 || targetLineIndex >= lines.length) { showToast('对应行暂无数据'); return; }
  const targetNodes = lines[targetLineIndex];
  const items = targetNodes.map(span => span.textContent.trim()).filter(t => t && /^\d{2}$/.test(t));
  if (items.length === 0) { showToast('没有可复制的项目'); return; }
  const text = items.join('-');
  navigator.clipboard.writeText(text).then(() => { showToast('已复制: ' + text); }).catch(() => { showToast('复制失败'); });
}

// ===== 智能决策中心 =====
function toggleHeat() { heatVisible = !heatVisible; renderSmartDecision(); }
function toggleAdvice() { adviceVisible = !adviceVisible; renderSmartDecision(); }
async function toggleSurge() { surgeVisible = !surgeVisible; if (surgeVisible) { await computeSurge(); renderSmartDecision(); } else renderSmartDecision(); }

async function computeSurge() {
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  const allOrders = await getOrderRecords();
  const todayOrders = allOrders.filter(o => o.date === fd);
  if (todayOrders.length === 0) { _surgeResult = []; return; }
  const userOrders = {};
  todayOrders.forEach(o => { if (!userOrders[o.user]) userOrders[o.user] = []; userOrders[o.user].push(o); });
  const countThreshold = surgeThreshold / 100;
  const amountThreshold = surgeAmountThreshold / 100;
  const result = [];
  for (const [user, orders] of Object.entries(userOrders)) {
    if (orders.length < surgeMinOrders) continue;
    const totalOrders = orders.length;
    const numCount = {}; const numAmount = {};
    for (let i = 1; i <= 49; i++) { const n = i.toString().padStart(2, '0'); numCount[n] = 0; numAmount[n] = 0; }
    let totalAmount = 0;
    orders.forEach(o => {
      const lines = o.content.split('\n');
      let orderCovered = new Set();
      lines.forEach(line => {
        const { numbers, amount } = countItemsInLine(line);
        const amtPerNum = amount;
        numbers.forEach(num => { orderCovered.add(num); numAmount[num] = (numAmount[num] || 0) + amtPerNum; totalAmount += amtPerNum; });
      });
      orderCovered.forEach(n => { numCount[n] = (numCount[n] || 0) + 1; });
    });
    const countTriggered = [];
    for (const [num, cnt] of Object.entries(numCount)) { if (totalOrders > 0 && cnt / totalOrders >= countThreshold) { countTriggered.push({ num, ratio: cnt / totalOrders }); } }
    countTriggered.sort((a, b) => b.ratio - a.ratio);
    const amountTriggered = [];
    for (const [num, amt] of Object.entries(numAmount)) { if (totalAmount > 0 && amt / totalAmount >= amountThreshold) { amountTriggered.push({ num, ratio: amt / totalAmount }); } }
    amountTriggered.sort((a, b) => b.ratio - a.ratio);
    if (countTriggered.length > 0 || amountTriggered.length > 0) { result.push({ user, countItems: countTriggered, amountItems: amountTriggered, totalOrders, totalAmount }); }
  }
  result.sort((a, b) => (b.countItems.length + b.amountItems.length) - (a.countItems.length + a.amountItems.length));
  _surgeResult = result;
}

function copyUserSurgeNums(username) {
  if (!_surgeResult || _surgeResult.length === 0) { showToast('暂无号码'); return; }
  const userData = _surgeResult.find(u => u.user === username);
  if (!userData) { showToast('该用户暂无数据'); return; }
  const nums = new Set();
  userData.countItems.forEach(i => nums.add(i.num));
  userData.amountItems.forEach(i => nums.add(i.num));
  const arr = [...nums].sort((a, b) => parseInt(a) - parseInt(b));
  navigator.clipboard.writeText(arr.join(' ')).then(() => { showToast('已复制' + username + '的号码'); }).catch(() => showToast('复制失败'));
}

function copyAllSurgeNums() {
  if (!_surgeResult || _surgeResult.length === 0) { showToast('暂无号码'); return; }
  const allNums = new Set();
  _surgeResult.forEach(user => { user.countItems.forEach(i => allNums.add(i.num)); user.amountItems.forEach(i => allNums.add(i.num)); });
  const arr = [...allNums].sort((a, b) => parseInt(a) - parseInt(b));
  navigator.clipboard.writeText(arr.join(' ')).then(() => { showToast('已复制全部号码'); }).catch(() => showToast('复制失败'));
}

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
  if(heatVisible){
    heatHtml='<div style="font-size:11px;">';
    heatHtml+=`<div style="margin-bottom:4px;color:#666;">📊 开奖热度分析（最近${actualPeriod}期，共${drawList.length}条记录）</div>`;
    const zodiacAll=['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const zodiacItems=zodiacAll.map(z=>({name:z,cnt:zodiacCountLocal[z]||0})); zodiacItems.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>生肖：</b>';
    zodiacItems.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/12*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass} ${getZodiacCls(item.name)}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(zodiacSeq,zodiacIssueSeq,'生肖',getZodiacCls)+'</div>';
    const boseList=['红波','蓝波','绿波'].map(b=>({name:b,cnt:boseCount[b]||0}));boseList.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>波色：</b>';
    boseList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/3*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass} ${getBoseCls(item.name)}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(boseSeq,boseIssueSeq,'波色',getBoseCls)+'</div>';
    const weishuList=[];for(let i=0;i<=9;i++)weishuList.push({name:i+'尾',cnt:weishuCount[i+'尾']||0});weishuList.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>尾数：</b>';
    weishuList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/10*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(weishuSeq,weishuIssueSeq,'尾数','')+'</div>';
    const toushuList=[];for(let i=0;i<=4;i++)toushuList.push({name:i+'头',cnt:toushuCount[i+'头']||0});toushuList.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>头数：</b>';
    toushuList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/5*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(toushuSeq,toushuIssueSeq,'头数','')+'</div>';
    const jysxList=[{name:'家禽',cnt:jiaqinCount},{name:'野兽',cnt:yeshouCount}];jysxList.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>家禽/野兽：</b>';
    jysxList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(jysxSeq,jysxIssueSeq,'','')+'</div>';
    const dsList=[{name:'单',cnt:danCount},{name:'双',cnt:shuangCount}];dsList.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>单双：</b>';
    dsList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(dsSeq,dsIssueSeq,'','')+'</div>';
    const dxList=[{name:'小',cnt:xiaoCount},{name:'大',cnt:daCount}];dxList.sort((a,b)=>b.cnt-a.cnt);
    heatHtml+='<div style="margin-bottom:4px;"><b>大小：</b>';
    dxList.forEach(item=>{const tag=item.cnt>=Math.max(drawList.length/2*1.5,3)?'hot':(item.cnt===0?'cold':'');const tagClass=tag==='hot'?'hot-item':(tag==='cold'?'cold-item':'normal-item');const prefix=tag==='hot'?'🔥':(tag==='cold'?'❄️':'');heatHtml+=`<span class="${tagClass}">${prefix}${item.name}(${item.cnt}次)</span> `;});
    heatHtml+='</div><div style="margin-bottom:6px;font-size:10px;color:#666;">'+analyzeStreak(dxSeq,dxIssueSeq,'','')+'</div>';
    heatHtml+='</div>';
  }
  const reportBets=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');const bet=reportBetData[n]||0;if(bet>0)reportBets.push({num:n,bet});}
  const avgBet=reportBets.length>0?(reportBets.reduce((s,it)=>s+it.bet,0)/reportBets.length):0;
  const multiplier=parseFloat(document.getElementById('urgentMultiplierInput')?.value||'1.3');
  let urgentNums=[];
  if(reportBets.length>0){urgentNums=reportBets.filter(item=>item.bet>avgBet*multiplier).sort((a,b)=>b.bet-a.bet).map(item=>item.num);}
  const recent6Zodiacs=[];
  for(let i=currentIssue-1;i>=1&&recent6Zodiacs.length<6;i--){
    const issueId=i.toString().padStart(2,'0');const entry=savedData[issueId];
    if(entry&&entry.number&&entry.number.trim()){
      const num=entry.number.trim().padStart(2,'0');
      if(/^\d{2}$/.test(num)&&parseInt(num)>=1&&parseInt(num)<=49){
        const z=currentZodiacMap[num]||'';
        if(z&&!recent6Zodiacs.includes(z))recent6Zodiacs.push(z);
      }
    }
  }
  let zodiacMonitorNums=[];
  if(recent6Zodiacs.length>0){
    const allZodiacNums=new Set();
    recent6Zodiacs.forEach(z=>{(ZODIAC_NUMS[z]||'').split(/[\s,，]+/).forEach(n=>allZodiacNums.add(n.padStart(2,'0')));});
    zodiacMonitorNums=[...allZodiacNums].filter(n=>reportRiskData[n]!==undefined&&reportRiskData[n]<0).sort((a,b)=>(reportRiskData[a]||0)-(reportRiskData[b]||0));
  }
  const betNums=[];
  for(let i=1;i<=49;i++){
    const n=i.toString().padStart(2,'0');
    const risk=reportRiskData[n];
    if((risk===undefined||risk>=0)&&(numCount[n]||0)===0)betNums.push(n);
  }
  function getColdItems(countMap,allKeys){return allKeys.filter(k=>(countMap[k]||0)===0);}
  const coldZodiacs=getColdItems(zodiacCountLocal,['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']);
  const coldBoses=getColdItems(boseCount,['红波','蓝波','绿波']);
  const coldWeishus=getColdItems(weishuCount,Array.from({length:10},(_,i)=>i+'尾'));
  const coldToushus=getColdItems(toushuCount,Array.from({length:5},(_,i)=>i+'头'));
  const coldJYSX=getColdItems({'家禽':jiaqinCount,'野兽':yeshouCount},['家禽','野兽']);
  const coldDS=getColdItems({'单':danCount,'双':shuangCount},['单','双']);
  const coldDX=getColdItems({'小':xiaoCount,'大':daCount},['小','大']);
  function getNumsByZodiac(z){return(ZODIAC_NUMS[z]||'').split(/[\s,，]+/).map(n=>n.padStart(2,'0'));}
  function getNumsByBose(b){return(D[b]||'').split(/[\s,，]+/).filter(n=>n.trim()).map(n=>n.padStart(2,'0'));}
  function getNumsByWeishu(w){const d=w.replace('尾','');return Array.from({length:5},(_,i)=>(i*10+parseInt(d)).toString().padStart(2,'0')).filter(n=>parseInt(n)>=1&&parseInt(n)<=49);}
  function getNumsByToushu(t){const d=t.replace('头','');return Array.from({length:10},(_,i)=>(parseInt(d)*10+i+1).toString().padStart(2,'0')).filter(n=>parseInt(n)>=1&&parseInt(n)<=49);}
  function getNumsByDS(ds){const result=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if((ds==='单'&&i%2===1)||(ds==='双'&&i%2===0))result.push(n);}return result;}
  function getNumsByJYSX(jy){const zs=ATTR_TO_ZODIACS[jy]||'';const result=[];for(const z of zs){result.push(...getNumsByZodiac(z));}return[...new Set(result)];}
  function getNumsByDX(dx){const result=[];for(let i=1;i<=49;i++){const n=i.toString().padStart(2,'0');if((dx==='小'&&i<=24)||(dx==='大'&&i>=25))result.push(n);}return result;}
  function buildColdRow(label,coldItems,getNumsFn){
    if(coldItems.length===0)return'';
    const allNums=new Set();
    for(const item of coldItems){const nums=getNumsFn(item);nums.forEach(n=>{if(reportRiskData[n]!==undefined&&reportRiskData[n]<0){allNums.add(n);}});}
    if(allNums.size===0)return'';
    const sortedNums=[...allNums].sort((a,b)=>parseInt(a)-parseInt(b));
    const numSpans=sortedNums.map(n=>{const cls=(redNumbers.includes(n)?'red-text':(blueNumbers.includes(n)?'blue-text':'green-text'));return`<span class="${cls}">${n}</span>`;}).join(' ');
    const numsForCopy=sortedNums.join('-');
    return`<div style="margin-bottom:4px;"><b>${label}：${coldItems.join('、')}：</b>${numSpans} <button class="copy-advice-btn" onclick="copyNumsToClipboard('${numsForCopy}')">📋复制</button></div>`;
  }
  let coldMonitorHtml='';
  coldMonitorHtml+=buildColdRow('冷生肖',coldZodiacs,getNumsByZodiac);
  coldMonitorHtml+=buildColdRow('冷波色',coldBoses,getNumsByBose);
  coldMonitorHtml+=buildColdRow('冷尾数',coldWeishus,getNumsByWeishu);
  coldMonitorHtml+=buildColdRow('冷头数',coldToushus,getNumsByToushu);
  coldMonitorHtml+=buildColdRow('冷家禽野兽',coldJYSX,getNumsByJYSX);
  coldMonitorHtml+=buildColdRow('冷单双',coldDS,getNumsByDS);
  coldMonitorHtml+=buildColdRow('冷大小',coldDX,getNumsByDX);
  let allColdNums=new Set();
  const coldPairs=[{items:coldZodiacs,fn:getNumsByZodiac},{items:coldBoses,fn:getNumsByBose},{items:coldWeishus,fn:getNumsByWeishu},{items:coldToushus,fn:getNumsByToushu},{items:coldJYSX,fn:getNumsByJYSX},{items:coldDS,fn:getNumsByDS},{items:coldDX,fn:getNumsByDX}];
  coldPairs.forEach(pair=>{pair.items.forEach(item=>{const nums=pair.fn(item);nums.forEach(n=>{if(reportRiskData[n]!==undefined&&reportRiskData[n]<0){allColdNums.add(n);}});});});
  if(allColdNums.size>0){const sortedAll=[...allColdNums].sort((a,b)=>parseInt(a)-parseInt(b));coldMonitorHtml+=`<div style="margin-top:6px;"><button class="copy-advice-btn" onclick="copyNumsToClipboard('${sortedAll.join('-')}')">📋复制全部冷门号码</button></div>`;}
  let adviceHtml='';
  if(adviceVisible){
    adviceHtml='<div style="font-size:11px;">';
    adviceHtml+='<div style="margin-bottom:2px;color:#666;">🎯 智能建议</div>';
    adviceHtml+='<table style="width:100%;border-collapse:collapse;font-size:11px;"><tr>';
    adviceHtml+='<td style="width:50%;vertical-align:top;padding:4px;border:1px solid #eee;">';
    adviceHtml+='<div class="advice-urgent" style="margin-bottom:6px;">';
    adviceHtml+=`<b>🚨 紧急抛售（基于净风险，倍数：<input type="number" id="urgentMultiplierInput" value="${multiplier}" min="0.1" step="0.1" style="width:45px;padding:1px 3px;font-size:11px;border:1px solid #ccc;border-radius:3px;" onchange="renderSmartDecision()"> 均值：${avgBet.toFixed(0)}）</b><br>`;
    if(urgentNums.length>0){adviceHtml+='号码：'+urgentNums.map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');adviceHtml+=` <button class="copy-advice-btn" onclick="copyNumsToClipboard([${urgentNums.map(n=>"'"+n+"'").join(',')}])">📋复制</button>`;}else adviceHtml+='<span style="color:#888;">暂无</span>';
    adviceHtml+='</div>';
    adviceHtml+='<div class="advice-monitor" style="margin-bottom:6px;">';
    adviceHtml+='<b>🔍 最近生肖监控（往前6个不重复生肖）</b><br>';
    if(zodiacMonitorNums.length>0){adviceHtml+='生肖：'+recent6Zodiacs.map(z=>`<span class="${getZodiacCls(z)}">${z}</span>`).join(' ')+'<br>';adviceHtml+='净风险号码：'+zodiacMonitorNums.map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');adviceHtml+=` <button class="copy-advice-btn" onclick="copyNumsToClipboard([${zodiacMonitorNums.map(n=>"'"+n+"'").join(',')}])">📋复制</button>`;}else adviceHtml+='<span style="color:#888;">暂无</span>';
    adviceHtml+='</div>';
    adviceHtml+='<div class="advice-bet" style="margin-bottom:6px;">';
    adviceHtml+='<b>📈 加注建议（正常风险+冷）</b><br>';
    if(betNums.length>0){adviceHtml+='号码：'+betNums.slice(0,10).map(n=>`<span class="${getNumCls(n)}">${n}</span>`).join(' ');}else adviceHtml+='<span style="color:#888;">暂无</span>';
    adviceHtml+='</div>';
    adviceHtml+='</td>';
    adviceHtml+='<td style="width:50%;vertical-align:top;padding:4px;border:1px solid #eee;">';
    adviceHtml+='<div class="advice-monitor" style="margin-bottom:6px;">';
    adviceHtml+='<b>❄️ 冷门监控（冷维度 × 净风险负数）</b><br>';
    if(coldMonitorHtml){adviceHtml+=coldMonitorHtml;}else{adviceHtml+='<span style="color:#888;">暂无冷门净风险号码</span>';}
    adviceHtml+='</div>';
    adviceHtml+='</td></tr></table></div>';
  }
  let surgeHtml='';
  if(surgeVisible){
    surgeHtml='<div style="font-size:11px;">';
    surgeHtml+=`<div style="margin-bottom:4px;"><b>⏱ 暴增监控</b><span style="margin-left:8px;">条数阈值：<input type="number" value="${surgeThreshold}" min="10" max="100" style="width:50px;font-size:11px;text-align:center;" onchange="surgeThreshold=parseInt(this.value);localStorage.setItem('surgeThreshold',surgeThreshold);computeSurge().then(()=>renderSmartDecision());">%</span><span style="margin-left:8px;">金额阈值：<input type="number" value="${surgeAmountThreshold}" min="0" max="100" step="0.1" style="width:55px;font-size:11px;text-align:center;" onchange="surgeAmountThreshold=parseFloat(this.value);localStorage.setItem('surgeAmountThreshold',surgeAmountThreshold);computeSurge().then(()=>renderSmartDecision());">%</span><span style="margin-left:8px;">最少${surgeMinOrders}条订单</span></div>`;
    if(_surgeResult&&_surgeResult.length>0){
      _surgeResult.forEach(user=>{
        const username=user.user;
        surgeHtml+=`<div style="margin-bottom:4px;"><b>${username}:</b> `;
        const countItems=user.countItems||[];
        const amountItems=user.amountItems||[];
        if(countItems.length>0){surgeHtml+='(条) ';countItems.sort((a,b)=>b.ratio-a.ratio);countItems.forEach(item=>{surgeHtml+=`<span class="${getNumCls(item.num)}">${item.num}</span> `;});}
        if(amountItems.length>0){surgeHtml+='(金) ';amountItems.sort((a,b)=>b.ratio-a.ratio);amountItems.forEach(item=>{surgeHtml+=`<span class="${getNumCls(item.num)}">${item.num}</span> `;});}
        surgeHtml+=`<button class="copy-advice-btn" onclick="copyUserSurgeNums('${username}')" style="margin-left:4px;">📋复制</button>`;
        surgeHtml+='</div>';
      });
      surgeHtml+='<button class="copy-advice-btn" onclick="copyAllSurgeNums()">📋复制全部号码</button>';
    }else{surgeHtml+='<div style="color:#888;">暂无暴增</div>';}
    surgeHtml+='</div>';
  }
  let finalHtml='';
  finalHtml+=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap;">`;
  finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${heatVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleHeat()">开奖热度分析</button>`;
  finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${adviceVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleAdvice()">智能建议</button>`;
  finalHtml+=`<button class="btn-copy" style="padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;background:${surgeVisible?'#2ecc71':'#95a5a6'};color:#fff;border:none;cursor:pointer;" onclick="toggleSurge()">暴增监控</button>`;
  finalHtml+=`</div>`;
  if(heatVisible)finalHtml+=heatHtml;
  if(adviceVisible)finalHtml+=adviceHtml;
  if(surgeVisible)finalHtml+=surgeHtml;
  if(!heatVisible&&!adviceVisible&&!surgeVisible){finalHtml+='<div style="color:#888;font-size:12px;text-align:center;padding:10px;">点击上方按钮查看分析</div>';}
  container.innerHTML=finalHtml;
}

function insertNumToRecognize(num) {
  const ta = document.querySelector('.source-order-input');
  if (!ta) { showRecognizeModal(); setTimeout(() => { const ta2 = document.querySelector('.source-order-input'); if (ta2) { ta2.value = num; performRecognition(num); } }, 300); return; }
  ta.value = ta.value.trim() ? ta.value.trim() + '-' + num : num;
  performRecognition(ta.value);
  showToast('已填入号码：' + num);
}

function copyNumsToClipboard(nums) {
  if (!nums || nums.length === 0) { showToast('暂无号码'); return; }
  const str = Array.isArray(nums) ? nums.join('-') : nums;
  navigator.clipboard.writeText(str).then(() => { showToast('已复制：' + str); }).catch(() => { showToast('复制失败'); });
}

// ===== 连肖统计 =====
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
      if (newMatch) {
        const playType = normalizePlayType(newMatch[1]);
        if (playType !== '特码') { records.push({ content: line, user: order.user, date: order.date }); }
        return;
      }
      const oldMatch = line.match(/^(.+?)\s+各组\s+(\d+)$/);
      if (oldMatch) { records.push({ content: line, user: order.user, date: order.date }); }
    });
  });
  
  if (records.length === 0) {
    container.innerHTML = '<div style="color:#666;text-align:center;padding:10px;">暂无其他订单数据</div>';
    document.getElementById('lianxiaoStatsTotal').innerHTML = '';
    return;
  }
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';

  let drawNumbers = []; let drawZodiacs = [];
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
      entry.numbers.forEach(n => { if (n && /^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) { drawNumbers.push(n); const zodiac = currentZodiacMap[n] || ''; if (zodiac) drawZodiacs.push(zodiac); } });
    } else if (entry && entry.number && entry.number.trim()) {
      const n = entry.number.trim().padStart(2, '0');
      if (/^\d{2}$/.test(n) && parseInt(n) >= 1 && parseInt(n) <= 49) { drawNumbers.push(n); const zodiac = currentZodiacMap[n] || ''; if (zodiac) drawZodiacs.push(zodiac); }
    }
  }
  const drawZodiacsSet = new Set(drawZodiacs);
  const drawNumbersSet = new Set(drawNumbers);
  const drawNumbersZhengma = drawNumbers.slice(0, 6);

  const stats = {}; let grandTotal = 0; let orderCountLianxiao = records.length;
  
  records.forEach(rec => {
    const line = rec.content;
    const newMatch = line.match(/^(.+?):(.+?)\s+(各(?:组|))\s*(\d+)$/);
    if (newMatch) {
      const playType = normalizePlayType(newMatch[1]); const content = newMatch[2]; const amount = parseInt(newMatch[4]) || 0;
      
      if (playType === '特肖') {
        const zodiacs = content.split('-').filter(z => z.trim());
        zodiacs.forEach(z => {
          if (!stats['特肖']) stats['特肖'] = { withYear: new Map(), withoutYear: new Map() };
          const hasYear = z === curYearZodiac;
          const target = hasYear ? stats['特肖'].withYear : stats['特肖'].withoutYear;
          target.set(z, (target.get(z) || 0) + amount); grandTotal += amount;
        }); return;
      }
      
      if (playType === '特碰' || playType === '二中二') {
        const comboType = playType === '特碰' ? 'tePeng' : 'zhong2';
        const cleaned = content.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        combos.forEach(c => { stats[comboType].withYear.set(c, (stats[comboType].withYear.get(c) || 0) + amount); grandTotal += amount; });
        return;
      }
      
      if (playType.startsWith('包')) {
        const attr = content.trim(); if (!attr || !D[attr]) return;
        if (!stats['bao']) stats['bao'] = { withYear: new Map(), withoutYear: new Map() };
        stats['bao'].withYear.set(attr, (stats['bao'].withYear.get(attr) || 0) + amount); grandTotal += amount;
        return;
      }
      
      const groups = content.split(/\s+/);
      groups.forEach(group => {
        const rawGroup = group.replace(/^\(|\)$/g, ''); const tokens = rawGroup.split('-');
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') {
          tokens.forEach(token => {
            const comboType = playType === '平特肖' ? 'pingtexiao' : (playType === '平特尾' ? 'pingtewei' : 'pingma');
            if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
            const cleanToken = token.trim();
            if (comboType === 'pingtexiao') { const hasYear = cleanToken === curYearZodiac; (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(cleanToken, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(cleanToken) || 0) + amount); }
            else if (comboType === 'pingtewei') { const hasZero = cleanToken.replace('尾', '') === '0'; (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(cleanToken, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(cleanToken) || 0) + amount); }
            else { stats[comboType].withYear.set(cleanToken, (stats[comboType].withYear.get(cleanToken) || 0) + amount); }
            grandTotal += amount;
          });
        } else if (tokens.every(t => /^[\u4e00-\u9fa5]$/.test(t) && ZODIAC_NUMS[t])) {
          const comboType = `lianxiao${tokens.length}`;
          if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
          const hasYear = tokens.some(t => t === curYearZodiac); const comboKey = tokens.join('-');
          (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
          grandTotal += amount;
        } else if (tokens.every(t => /^\d+尾$/.test(t))) {
          const comboType = `lianwei${tokens.length}`;
          if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
          const hasZero = tokens.some(t => t.replace('尾', '') === '0'); const comboKey = tokens.join('-');
          (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
          grandTotal += amount;
        } else if (tokens.every(t => /^\d{2}$/.test(t))) {
          const comboType = tokens.length === 1 ? 'pingma' : (tokens.length === 2 ? 'zhong2' : (tokens.length === 3 ? 'zhong3' : 'buzhong' + tokens.length));
          if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
          const comboKey = tokens.join('-'); stats[comboType].withYear.set(comboKey, (stats[comboType].withYear.get(comboKey) || 0) + amount);
          grandTotal += amount;
        }
      });
      return;
    }
    const oldMatch = line.match(/^(.+?)\s*(?:各组|各)\s*(\d+)$/);
    if (!oldMatch) return;
    const content = oldMatch[1]; const amount = parseInt(oldMatch[2]) || 0;
    const groups = content.split(/\s+/);
    groups.forEach(group => {
      const rawGroup = group.replace(/^\(|\)$/g, ''); const tokens = rawGroup.split('-');
      if (tokens.length === 1 && ZODIAC_NUMS[tokens[0]]) {
        const comboType = 'pingtexiao'; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasYear = tokens[0] === curYearZodiac;
        (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(tokens[0], ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(tokens[0]) || 0) + amount);
        grandTotal += amount;
      } else if (tokens.length === 1 && tokens[0].includes('尾')) {
        const comboType = 'pingtewei'; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasZero = tokens[0].replace('尾', '') === '0';
        (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(tokens[0], ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(tokens[0]) || 0) + amount);
        grandTotal += amount;
      } else if (tokens.some(t => ZODIAC_NUMS[t])) {
        const comboType = `lianxiao${tokens.length}`; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasYear = tokens.some(t => t === curYearZodiac); const comboKey = tokens.join('-');
        (hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasYear ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
        grandTotal += amount;
      } else if (tokens.some(t => t.includes('尾'))) {
        const comboType = `lianwei${tokens.length}`; if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const hasZero = tokens.some(t => t.replace('尾', '') === '0'); const comboKey = tokens.join('-');
        (hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).set(comboKey, ((hasZero ? stats[comboType].withYear : stats[comboType].withoutYear).get(comboKey) || 0) + amount);
        grandTotal += amount;
      } else {
        const comboType = tokens.length === 1 ? 'pingma' : (tokens.length === 2 ? 'zhong2' : (tokens.length === 3 ? 'zhong3' : 'buzhong' + tokens.length));
        if (!stats[comboType]) stats[comboType] = { withYear: new Map(), withoutYear: new Map() };
        const comboKey = tokens.join('-'); stats[comboType].withYear.set(comboKey, (stats[comboType].withYear.get(comboKey) || 0) + amount);
        grandTotal += amount;
      }
    });
  });

  const oddsData = getOddsData();
  const defaults = {
    '特码': { odds: 47, rebate: 4 }, '特肖': { odds: 11, rebate: 4 }, '特肖本年肖': { odds: 10, rebate: 4 },
    'pingtexiao': { odds: 2, rebate: 4 }, 'pingtexiao带主肖': { odds: 1.8, rebate: 4 }, 'lianxiao2': { odds: 4, rebate: 4 }, 'lianxiao2带主肖': { odds: 3.5, rebate: 4 },
    'lianxiao3': { odds: 10, rebate: 4 }, 'lianxiao3带主肖': { odds: 9, rebate: 4 }, 'lianxiao4': { odds: 30, rebate: 4 }, 'lianxiao4带主肖': { odds: 25, rebate: 4 },
    'lianxiao5': { odds: 100, rebate: 4 }, 'lianxiao5带主肖': { odds: 90, rebate: 4 }, 'pingtewei': { odds: 1.8, rebate: 4 }, 'pingtewei零尾': { odds: 2, rebate: 4 },
    'lianwei2': { odds: 3, rebate: 4 }, 'lianwei2零尾': { odds: 3.5, rebate: 4 }, 'lianwei3': { odds: 6, rebate: 4 }, 'lianwei3零尾': { odds: 6.5, rebate: 4 },
    'lianwei4': { odds: 14, rebate: 4 }, 'lianwei4零尾': { odds: 15, rebate: 4 }, 'lianwei5': { odds: 28, rebate: 4 }, 'lianwei5零尾': { odds: 30, rebate: 4 },
    'buzhong5': { odds: 2, rebate: 4 }, 'buzhong6': { odds: 2.5, rebate: 4 }, 'buzhong7': { odds: 3, rebate: 4 }, 'buzhong8': { odds: 3.5, rebate: 4 },
    'buzhong9': { odds: 4, rebate: 4 }, 'buzhong10': { odds: 5, rebate: 4 }, 'buzhong11': { odds: 6, rebate: 4 }, 'buzhong12': { odds: 7, rebate: 4 },
    'zhong2': { odds: 60, rebate: 4 }, 'zhong3': { odds: 600, rebate: 4 }, 'pingma': { odds: 7, rebate: 4 }, 'tePeng': { odds: 120, rebate: 4 }
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

  let grandPL = 0; const cardsArray = [];
  const order = ['特肖', 'tePeng', 'pingtexiao', 'lianxiao2', 'lianxiao3', 'lianxiao4', 'lianxiao5', 'buzhong5', 'buzhong6', 'buzhong7', 'buzhong8', 'buzhong9', 'buzhong10', 'buzhong11', 'buzhong12', 'pingma', 'pingtewei', 'lianwei2', 'lianwei3', 'lianwei4', 'lianwei5', 'zhong2', 'zhong3', 'bao'];

  order.forEach((type) => {
    if (!stats[type]) return;
    const data = stats[type]; const cardId = `comboCard_${type}`;
    let totalGroups = 0, totalAmount = 0, cardPL = 0, totalHitAmount = 0;
    const isBao = (type === 'bao'); const isTePeng = (type === 'tePeng');
    let tablesHtml = '';

    function renderTable(map, hasSpecial) {
      if (map.size === 0) return '';
      let html2 = '';
      const headerLabel = isBao ? '属性' : (isTePeng ? '组合' : (type === '特肖' || type.startsWith('lianxiao') || type === 'pingtexiao' ? '生肖' : (type.includes('wei') ? '尾数' : '组合')));
      html2 += '<table style="width:100%;"><tr><th style="text-align:center;">' + headerLabel + '</th><th style="text-align:center;">金额</th><th style="text-align:center;">中奖</th><th style="text-align:center;">盈亏</th></tr>';
      map.forEach((v, k) => {
        const displayKey = k.replace(/^\(|\)$/g, ''); const tokens = displayKey.split('-');
        let hit = false; let odds, rebate;
        if (isBao) { const baoType = '包' + displayKey; const baoOdds = getOddsForType(baoType, oddsData); odds = baoOdds.odds; rebate = baoOdds.rebate; if (drawNumbers.length > 0 && D[displayKey]) { const attrNums = (D[displayKey] || '').split(/[\s,，]+/).filter(n => n.trim()); const teMa = drawNumbers[6] || ''; hit = attrNums.includes(teMa); } }
        else if (isTePeng) { const baoOdds = getOddsForType('特碰', oddsData); odds = baoOdds.odds; rebate = baoOdds.rebate; if (drawNumbers.length > 0) { const teMa = drawNumbers[6] || ''; hit = (tokens.length === 2 && tokens[0].padStart(2, '0') === teMa && drawNumbersZhengma.includes(tokens[1].padStart(2, '0'))); } }
        else { const { odds: o, rebate: r } = getPlayOdds(type, hasSpecial); odds = o; rebate = r;
          if (type === '特肖') { const teMaZodiac = drawZodiacs.length > 0 ? (currentZodiacMap[drawNumbers[6]] || '') : ''; hit = teMaZodiac === k; }
          else if (type === 'pingtexiao') { hit = drawZodiacsSet.has(k); }
          else if (type === 'pingtewei') { hit = drawZodiacs.length > 0 && tokens.some(t => { const d = t.replace('尾', ''); for (let i = 0; i <= 4; i++) { const n = (i * 10 + parseInt(d)).toString().padStart(2, '0'); if (drawNumbersSet.has(n)) return true; } return false; }); }
          else if (type === 'pingma' || type === 'zhong2' || type === 'zhong3') { const zhengma = drawNumbers.slice(0, 6); hit = tokens.every(t => zhengma.includes(t)); }
          else if (type.startsWith('buzhong')) { hit = !tokens.some(t => drawNumbersSet.has(t)); }
          else if (type.startsWith('lianxiao')) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
          else if (type.startsWith('lianwei')) { hit = tokens.every(t => { const d = t.replace('尾', ''); for (let i = 0; i <= 4; i++) { const n = (i * 10 + parseInt(d)).toString().padStart(2, '0'); if (drawNumbersSet.has(n)) return true; } return false; }); }
        }
        let pl = 0;
        if (drawZodiacs.length > 0 || drawNumbers.length > 0) { pl = hit ? (v - v * (rebate / 100) - v * odds) : (v - v * (rebate / 100)); }
        cardPL += pl; if (hit) totalHitAmount += v;
        html2 += `<tr><td style="text-align:center;">${displayKey}</td><td style="text-align:center;">${v}</td><td style="text-align:center;">${hit ? `<span class="amount-red-text">${v}</span>` : ''}</td><td style="text-align:center;${pl > 0 ? 'color:#27ae60;' : (pl < 0 ? 'color:#e74c3c;' : '')}">${pl !== 0 ? Math.round(pl) : ''}</td></tr>`;
        totalGroups++; totalAmount += v;
      });
      html2 += '</table>'; return html2;
    }

    if (type === '特肖') { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 本命年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 普通生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type === 'pingtexiao') { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含本年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 其他生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type === 'pingtewei') { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含0尾 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 其他尾数 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type.startsWith('lianxiao')) { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含本年生肖 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 不含本年生肖 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else if (type.startsWith('lianwei')) { if (data.withYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;">── 含0尾 ──</div>'; tablesHtml += renderTable(data.withYear, true); } if (data.withoutYear.size > 0) { tablesHtml += '<div style="font-size:11px;color:#333;margin-top:4px;">── 不含0尾 ──</div>'; tablesHtml += renderTable(data.withoutYear, false); } }
    else { if (data.withYear.size > 0) { tablesHtml += renderTable(data.withYear, false); } }

    grandPL += cardPL; const roundedCardPL = Math.round(cardPL);
    let cardBgStyle = '';
    if (drawZodiacs.length > 0 || drawNumbers.length > 0) { if (cardPL <= -500) cardBgStyle = 'background:#fff0f0;'; else if (cardPL < 0) cardBgStyle = 'background:#fff8f8;'; else if (cardPL > 500) cardBgStyle = 'background:#f0fff0;'; else if (cardPL > 0) cardBgStyle = 'background:#f8fff8;'; }
    let cardLabel = isBao ? '包' : (isTePeng ? '特碰' : (type === 'zhong2' ? '二中二' : (type === 'zhong3' ? '三中三' : getComboTypeLabel(type))));
    let cardHtml = `<div class="freq-card" id="${cardId}" style="break-inside:avoid; margin-bottom:10px; min-width:180px;${cardBgStyle}">`;
    cardHtml += `<div class="freq-title" style="display:flex; align-items:center; justify-content:space-between;"><span>${cardLabel}</span><button class="btn" style="background:#27ae60;color:#fff;padding:2px 8px;font-size:11px;min-height:auto;border-radius:20px;" onclick="screenshotSingleComboCard('${cardId}')">截图</button></div>`;
    cardHtml += `<div style="max-height:400px;overflow-y:auto;">${tablesHtml}</div>`;
    cardHtml += `<div style="border-top:1px solid #ddd;margin-top:4px;padding-top:4px;font-size:11px;text-align:center;">小计：${totalGroups}组 金额：${totalAmount}`;
    if (drawZodiacs.length > 0 || drawNumbers.length > 0) { cardHtml += ` 中：${totalHitAmount}`; cardHtml += ` 盈亏：<span style="color:${roundedCardPL > 0 ? '#27ae60' : (roundedCardPL < 0 ? '#e74c3c' : '')};">${roundedCardPL > 0 ? roundedCardPL : (roundedCardPL < 0 ? roundedCardPL : '')}</span>`; }
    cardHtml += '</div></div>';
    cardsArray.push({ html: cardHtml, groups: totalGroups });
  });

  cardsArray.sort((a, b) => a.groups - b.groups);
  container.innerHTML = cardsArray.map(c => c.html).join('') || '<div style="color:#666;text-align:center;padding:10px;">暂无其他订单数据</div>';
  const roundedGrandPL = Math.round(grandPL);
  let totalHtml = `<span style="color:#0000ff;">总下单金额：</span><span style="color:#0000ff;">${grandTotal}</span>`;
  totalHtml += ` &nbsp; <span style="color:#0000ff;">总订单数：</span><span style="color:#0000ff;">${orderCountLianxiao}</span>`;
  if (drawZodiacs.length > 0 || drawNumbers.length > 0) { totalHtml += ` &nbsp; <span style="color:#0000ff;">总盈亏：</span><span style="color:${roundedGrandPL > 0 ? '#27ae60' : (roundedGrandPL < 0 ? '#e74c3c' : '')};">${roundedGrandPL > 0 ? roundedGrandPL : (roundedGrandPL < 0 ? roundedGrandPL : '')}</span>`; }
  document.getElementById('lianxiaoStatsTotal').innerHTML = totalHtml;
}

function getComboTypeLabel(type) {
  const map = { '特肖': '特肖', 'tePeng': '特碰', pingtexiao: '平特肖', pingtewei: '平特尾', lianxiao2: '二连肖', lianxiao3: '三连肖', lianxiao4: '四连肖', lianxiao5: '五连肖', zhong2: '二中二', zhong3: '三中三', pingma: '平码', lianwei2: '二连尾', lianwei3: '三连尾', lianwei4: '四连尾', lianwei5: '五连尾', buzhong5: '五不中', buzhong6: '六不中', buzhong7: '七不中', buzhong8: '八不中', buzhong9: '九不中', buzhong10: '十不中', buzhong11: '十一不中', buzhong12: '十二不中' };
  return map[type] || type;
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

// ===== 兑奖统计 =====
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
          let playType = newMatch[1]; const content = newMatch[2]; const amt = parseInt(newMatch[3]) || 0;
          playType = normalizePlayType(playType);
          if (playType === '特肖') { processTexiaoLineDuijiang(userStats[user], content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw); }
          else if (playType === '特码') { processNormalLineDuijiangNew(userStats[user], content, amt, drawTeMa, hasValidDraw); }
          else if (playType === '特碰') { processTepengLineDuijiang(userStats[user], content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw); }
          else if (playType.startsWith('包')) { processBaoLineDuijiang(userStats[user], playType, content, amt, drawTeMa, hasValidDraw); }
          else { processComboLineDuijiangNew(userStats[user], playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw); }
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
          let playType = newMatch[1]; const content = newMatch[2]; const amt = parseInt(newMatch[3]) || 0;
          playType = normalizePlayType(playType);
          if (playType === '特肖') { processTexiaoLineDuijiangReport(userStats[user], content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw); }
          else if (playType === '特码') { processReportLineDuijiangNew(userStats[user], content, amt, drawTeMa, hasValidDraw); }
          else if (playType === '特碰') { processTepengLineDuijiangReport(userStats[user], content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw); }
          else if (playType.startsWith('包')) { processBaoLineDuijiangReport(userStats[user], playType, content, amt, drawTeMa, hasValidDraw); }
          else { processComboLineDuijiangNewReport(userStats[user], playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw); }
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
    if (hasValidDraw) { for (const [type, amt] of Object.entries(sumOrderHitByType)) { netHitByType[type] = (netHitByType[type] || 0) + amt; } for (const [type, amt] of Object.entries(sumReportHitByType)) { netHitByType[type] = (netHitByType[type] || 0) - amt; } }
    const netHitDetail = hasValidDraw ? buildHitDetail(netHitByType) : '';
    finalBody.innerHTML = `<tr><td>${netAmount > 0 ? netAmount : ''}</td><td>${netRebate !== 0 ? netRebate : ''}</td><td style="color:#ff0000;">${netHitDetail}</td><td style="${netPLColor}">${hasValidDraw && netPL !== 0 ? netPL : ''}</td></tr>`;
  });
}

function buildHitDetail(hitByType) {
  const parts = [];
  const orderedTypes = ['特码','特肖','特肖本年肖','平特肖','平特肖带主肖','二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖','平特尾','平特尾零尾','二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾','五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中','二中二','三中三','平码','特碰'];
  const baoTypes = ['包红波','包蓝波','包绿波','包红单','包红双','包蓝单','包蓝双','包绿单','包绿双','包红大','包红小','包蓝大','包蓝小','包绿大','包绿小','包单','包双','包大','包小','包家禽','包野兽'];
  const allOrderedTypes = [...orderedTypes, ...baoTypes];
  for (const type of allOrderedTypes) { if (hitByType[type] && hitByType[type] > 0) { parts.push(type + Math.round(hitByType[type])); } }
  return parts.length > 0 ? parts.join('，') : '';
}

// 兑奖各玩法处理函数（下单）
function processTexiaoLineDuijiang(stats, content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw) {
  const zodiacs = content.split('-').map(z => z.trim()).filter(z => z);
  if (zodiacs.length === 0) return;
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  const totalAmt = zodiacs.length * amt; const rebate = 4;
  stats.orderTotal += totalAmt; stats.orderRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMaZodiac) {
    let hitZodiac = null; let hitAmt = 0;
    if (zodiacs.includes(drawTeMaZodiac)) { hitZodiac = drawTeMaZodiac; hitAmt = amt; }
    if (hitZodiac) {
      const isBenming = hitZodiac === curYearZodiac;
      const playType = isBenming ? '特肖本年肖' : '特肖';
      const odds = isBenming ? 10 : 11;
      stats.orderHitByType[playType] = (stats.orderHitByType[playType] || 0) + hitAmt;
      stats.orderPL += totalAmt - totalAmt * (rebate / 100) - hitAmt * odds;
    } else { stats.orderPL += totalAmt - totalAmt * (rebate / 100); }
  }
}
function processTepengLineDuijiang(stats, content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw) {
  const cleaned = content.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  if (combos.length === 0) return;
  const { odds, rebate } = getOddsForType('特碰', getOddsData());
  const totalAmt = combos.length * amt; stats.orderTotal += totalAmt; stats.orderRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) {
    let hitCount = 0;
    combos.forEach(combo => { const tokens = combo.split('-'); if (tokens.length === 2) { if (tokens[0].padStart(2, '0') === drawTeMa && drawNumbersZhengma.includes(tokens[1].padStart(2, '0'))) { hitCount++; } } });
    if (hitCount > 0) { stats.orderHitByType['特碰'] = (stats.orderHitByType['特碰'] || 0) + hitCount * amt; stats.orderPL += totalAmt - totalAmt * (rebate / 100) - hitCount * amt * odds; }
    else { stats.orderPL += totalAmt - totalAmt * (rebate / 100); }
  }
}
function processBaoLineDuijiang(stats, playType, content, amt, drawTeMa, hasValidDraw) {
  const attr = content.trim(); if (!attr || !D[attr]) return;
  const baoType = '包' + attr; const { odds, rebate } = getOddsForType(baoType, getOddsData());
  const totalAmt = amt; stats.orderTotal += totalAmt; stats.orderRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) { const attrNums = (D[attr] || '').split(/[\s,，]+/).filter(n => n.trim()); const hit = attrNums.includes(drawTeMa); if (hit) { stats.orderHitByType[baoType] = (stats.orderHitByType[baoType] || 0) + amt; stats.orderPL += totalAmt - totalAmt * (rebate / 100) - amt * odds; } else { stats.orderPL += totalAmt - totalAmt * (rebate / 100); } }
}
function processNormalLineDuijiangNew(stats, content, amt, drawTeMa, hasValidDraw) {
  const items = content.split('-').map(i => i.trim()).filter(i => i); const nums = [];
  items.forEach(item => { if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); } else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } else if (D[item]) { const val = D[item]; if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) { for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } } else { val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0'))); } } });
  const { odds, rebate } = getOddsForType('特码', getOddsData());
  const totalCount = nums.length; stats.orderTotal += totalCount * amt; stats.orderRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) { let hitAmount = 0; nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } }); if (hitAmount > 0) { stats.orderHitByType['特码'] = (stats.orderHitByType['特码'] || 0) + hitAmount; } stats.orderPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds); }
}
function processComboLineDuijiangNew(stats, playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw) {
  playType = normalizePlayType(playType); const cleaned = content.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => { const tokens = combo.split('-'); let comboType = playType; let hasYearZodiac = false; let hasZeroWei = false;
    if (comboType === '平特肖') { hasYearZodiac = tokens.some(t => t === curYearZodiac); } else if (comboType === '平特尾') { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); } else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) { hasYearZodiac = tokens.some(t => t === curYearZodiac); } else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
    if (hasYearZodiac) { if (comboType === '平特肖') comboType = '平特肖带主肖'; else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖'; }
    if (hasZeroWei) { if (comboType === '平特尾') comboType = '平特尾零尾'; else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾'; }
    const { odds, rebate } = getOddsForType(comboType, getOddsData()); const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1; stats.orderTotal += effectiveCount * amt; stats.orderRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) { let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) { if (isPerItem) { let hitCount = 0; if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; } else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; } else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; } if (hitCount > 0) { stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + hitCount * amt; } stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds); } else { stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + amt; stats.orderPL += amt - amt * (rebate / 100) - (amt * odds); } } else { stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100); } }
  });
}

// 兑奖各玩法处理函数（上报）
function processTexiaoLineDuijiangReport(stats, content, amt, drawTeMaZodiac, drawTeMa, hasValidDraw) {
  const zodiacs = content.split('-').map(z => z.trim()).filter(z => z); if (zodiacs.length === 0) return;
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马'; const totalAmt = zodiacs.length * amt; const rebate = 4;
  stats.reportTotal += totalAmt; stats.reportRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMaZodiac) { let hitZodiac = null; let hitAmt = 0; if (zodiacs.includes(drawTeMaZodiac)) { hitZodiac = drawTeMaZodiac; hitAmt = amt; } if (hitZodiac) { const isBenming = hitZodiac === curYearZodiac; const playType = isBenming ? '特肖本年肖' : '特肖'; const odds = isBenming ? 10 : 11; stats.reportHitByType[playType] = (stats.reportHitByType[playType] || 0) + hitAmt; stats.reportPL += totalAmt - totalAmt * (rebate / 100) - hitAmt * odds; } else { stats.reportPL += totalAmt - totalAmt * (rebate / 100); } }
}
function processTepengLineDuijiangReport(stats, content, amt, drawTeMa, drawNumbersZhengma, hasValidDraw) {
  const cleaned = content.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim()); if (combos.length === 0) return;
  const { odds, rebate } = getOddsForType('特碰', getOddsData()); const totalAmt = combos.length * amt; stats.reportTotal += totalAmt; stats.reportRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) { let hitCount = 0; combos.forEach(combo => { const tokens = combo.split('-'); if (tokens.length === 2) { if (tokens[0].padStart(2, '0') === drawTeMa && drawNumbersZhengma.includes(tokens[1].padStart(2, '0'))) { hitCount++; } } }); if (hitCount > 0) { stats.reportHitByType['特碰'] = (stats.reportHitByType['特碰'] || 0) + hitCount * amt; stats.reportPL += totalAmt - totalAmt * (rebate / 100) - hitCount * amt * odds; } else { stats.reportPL += totalAmt - totalAmt * (rebate / 100); } }
}
function processBaoLineDuijiangReport(stats, playType, content, amt, drawTeMa, hasValidDraw) {
  const attr = content.trim(); if (!attr || !D[attr]) return; const baoType = '包' + attr; const { odds, rebate } = getOddsForType(baoType, getOddsData());
  const totalAmt = amt; stats.reportTotal += totalAmt; stats.reportRebate += totalAmt * (rebate / 100);
  if (hasValidDraw && drawTeMa) { const attrNums = (D[attr] || '').split(/[\s,，]+/).filter(n => n.trim()); const hit = attrNums.includes(drawTeMa); if (hit) { stats.reportHitByType[baoType] = (stats.reportHitByType[baoType] || 0) + amt; stats.reportPL += totalAmt - totalAmt * (rebate / 100) - amt * odds; } else { stats.reportPL += totalAmt - totalAmt * (rebate / 100); } }
}
function processReportLineDuijiangNew(stats, content, amt, drawTeMa, hasValidDraw) {
  const items = content.split('-').map(i => i.trim()).filter(i => i); const nums = [];
  items.forEach(item => { if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); } else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } else if (D[item]) { const val = D[item]; if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) { for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } } else { val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0'))); } } });
  const { odds, rebate } = getOddsForType('特码', getOddsData()); const totalCount = nums.length;
  stats.reportTotal += totalCount * amt; stats.reportRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) { let hitAmount = 0; nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } }); if (hitAmount > 0) { stats.reportHitByType['特码'] = (stats.reportHitByType['特码'] || 0) + hitAmount; } stats.reportPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds); }
}
function processComboLineDuijiangNewReport(stats, playType, content, amt, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, hasValidDraw) {
  playType = normalizePlayType(playType); const cleaned = content.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => { const tokens = combo.split('-'); let comboType = playType; let hasYearZodiac = false; let hasZeroWei = false;
    if (comboType === '平特肖') { hasYearZodiac = tokens.some(t => t === curYearZodiac); } else if (comboType === '平特尾') { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); } else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) { hasYearZodiac = tokens.some(t => t === curYearZodiac); } else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) { hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
    if (hasYearZodiac) { if (comboType === '平特肖') comboType = '平特肖带主肖'; else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖'; }
    if (hasZeroWei) { if (comboType === '平特尾') comboType = '平特尾零尾'; else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾'; }
    const { odds, rebate } = getOddsForType(comboType, getOddsData()); const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1; stats.reportTotal += effectiveCount * amt; stats.reportRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) { let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) { if (isPerItem) { let hitCount = 0; if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; } else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; } else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; } if (hitCount > 0) { stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + hitCount * amt; } stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds); } else { stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + amt; stats.reportPL += amt - amt * (rebate / 100) - (amt * odds); } } else { stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100); } }
  });
}

// 旧版兑奖兼容函数
function processNormalLineDuijiangOld(stats, match, drawTeMa, hasValidDraw) {
  const cont = match[1]; const amt = parseInt(match[2]) || 0; const items = cont.split('-').map(i => i.trim()).filter(i => i); const nums = [];
  items.forEach(item => { if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); } else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } else if (D[item]) { const val = D[item]; if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) { for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } } else { val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0'))); } } });
  const { odds, rebate } = getOddsForType('特码', getOddsData()); const totalCount = nums.length;
  stats.orderTotal += totalCount * amt; stats.orderRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) { let hitAmount = 0; nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } }); if (hitAmount > 0) { stats.orderHitByType['特码'] = (stats.orderHitByType['特码'] || 0) + hitAmount; } stats.orderPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds); }
}
function processComboLineDuijiangOld(stats, match, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, drawTeMa, hasValidDraw) {
  const combosStr = match[1]; const amt = parseInt(match[2]) || 0; const cleaned = combosStr.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => { const tokens = combo.split('-'); let comboType = ''; let hasYearZodiac = false; let hasZeroWei = false;
    if (tokens.length === 1) { if (ZODIAC_NUMS[tokens[0]]) { comboType = '平特肖'; if (tokens[0] === curYearZodiac) hasYearZodiac = true; } else if (tokens[0].includes('尾')) { comboType = '平特尾'; if (tokens[0].replace('尾','') === '0') hasZeroWei = true; } else if (/^\d{2}$/.test(tokens[0])) { comboType = '平码'; } }
    else if (tokens.every(t => ZODIAC_NUMS[t])) { const lxMap = {2:'二连肖',3:'三连肖',4:'四连肖',5:'五连肖'}; comboType = lxMap[tokens.length] || '二连肖'; hasYearZodiac = tokens.some(t => t === curYearZodiac); }
    else if (tokens.every(t => t.includes('尾'))) { const lwMap = {2:'二连尾',3:'三连尾',4:'四连尾',5:'五连尾'}; comboType = lwMap[tokens.length] || '二连尾'; hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
    else if (tokens.every(t => /^\d{2}$/.test(t))) { if (tokens.length === 2) { comboType = '二中二'; } else if (tokens.length === 3) { comboType = '三中三'; } else { const bzMap = {5:'五不中',6:'六不中',7:'七不中',8:'八不中',9:'九不中',10:'十不中',11:'十一不中',12:'十二不中'}; comboType = bzMap[tokens.length] || '五不中'; } }
    if (!comboType) return; comboType = normalizePlayType(comboType);
    if (hasYearZodiac) { if (comboType === '平特肖') comboType = '平特肖带主肖'; else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖'; }
    if (hasZeroWei) { if (comboType === '平特尾') comboType = '平特尾零尾'; else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾'; }
    const { odds, rebate } = getOddsForType(comboType, getOddsData()); const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1; stats.orderTotal += effectiveCount * amt; stats.orderRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) { let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) { if (isPerItem) { let hitCount = 0; if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; } else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; } else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; } if (hitCount > 0) { stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + hitCount * amt; } stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds); } else { stats.orderHitByType[comboType] = (stats.orderHitByType[comboType] || 0) + amt; stats.orderPL += amt - amt * (rebate / 100) - (amt * odds); } } else { stats.orderPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100); } }
  });
}
function processComboLineDuijiangOldReport(stats, match, drawZodiacsSet, drawNumbersSet, drawNumbersZhengma, drawTeMa, hasValidDraw) {
  const combosStr = match[1]; const amt = parseInt(match[2]) || 0; const cleaned = combosStr.replace(/[()]/g, ''); const combos = cleaned.split(/\s+/).filter(c => c.trim());
  const curYearZodiac = document.getElementById('startZodiacSelect')?.value || '马';
  combos.forEach(combo => { const tokens = combo.split('-'); let comboType = ''; let hasYearZodiac = false; let hasZeroWei = false;
    if (tokens.length === 1) { if (ZODIAC_NUMS[tokens[0]]) { comboType = '平特肖'; if (tokens[0] === curYearZodiac) hasYearZodiac = true; } else if (tokens[0].includes('尾')) { comboType = '平特尾'; if (tokens[0].replace('尾','') === '0') hasZeroWei = true; } else if (/^\d{2}$/.test(tokens[0])) { comboType = '平码'; } }
    else if (tokens.every(t => ZODIAC_NUMS[t])) { const lxMap = {2:'二连肖',3:'三连肖',4:'四连肖',5:'五连肖'}; comboType = lxMap[tokens.length] || '二连肖'; hasYearZodiac = tokens.some(t => t === curYearZodiac); }
    else if (tokens.every(t => t.includes('尾'))) { const lwMap = {2:'二连尾',3:'三连尾',4:'四连尾',5:'五连尾'}; comboType = lwMap[tokens.length] || '二连尾'; hasZeroWei = tokens.some(t => t.replace('尾','') === '0'); }
    else if (tokens.every(t => /^\d{2}$/.test(t))) { if (tokens.length === 2) { comboType = '二中二'; } else if (tokens.length === 3) { comboType = '三中三'; } else { const bzMap = {5:'五不中',6:'六不中',7:'七不中',8:'八不中',9:'九不中',10:'十不中',11:'十一不中',12:'十二不中'}; comboType = bzMap[tokens.length] || '五不中'; } }
    if (!comboType) return; comboType = normalizePlayType(comboType);
    if (hasYearZodiac) { if (comboType === '平特肖') comboType = '平特肖带主肖'; else if (['二连肖','三连肖','四连肖','五连肖'].includes(comboType)) comboType = comboType + '带主肖'; }
    if (hasZeroWei) { if (comboType === '平特尾') comboType = '平特尾零尾'; else if (['二连尾','三连尾','四连尾','五连尾'].includes(comboType)) comboType = comboType + '零尾'; }
    const { odds, rebate } = getOddsForType(comboType, getOddsData()); const isPerItem = ['平特肖','平特肖带主肖','平特尾','平特尾零尾','平码'].includes(comboType);
    const effectiveCount = isPerItem ? tokens.length : 1; stats.reportTotal += effectiveCount * amt; stats.reportRebate += effectiveCount * amt * (rebate / 100);
    if (hasValidDraw) { let hit = false;
      if (comboType === '平特肖' || comboType === '平特肖带主肖') { hit = tokens.some(t => drawZodiacsSet.has(t)); }
      else if (comboType === '平特尾' || comboType === '平特尾零尾') { hit = tokens.some(t => { const d = t.replace('尾',''); const tailNums = []; for (let i=0;i<=4;i++) { const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(parseInt(n)>=1&&parseInt(n)<=49) tailNums.push(n); } return tailNums.some(n => drawNumbersSet.has(n)); }); }
      else if (comboType === '平码') { hit = tokens.some(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      else if (['二连肖','二连肖带主肖','三连肖','三连肖带主肖','四连肖','四连肖带主肖','五连肖','五连肖带主肖'].includes(comboType)) { hit = tokens.every(t => drawZodiacsSet.has(t)); }
      else if (['二连尾','二连尾零尾','三连尾','三连尾零尾','四连尾','四连尾零尾','五连尾','五连尾零尾'].includes(comboType)) { hit = tokens.every(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }); }
      else if (['五不中','六不中','七不中','八不中','九不中','十不中','十一不中','十二不中'].includes(comboType)) { hit = !tokens.some(t => drawNumbersSet.has(t.padStart(2,'0'))); }
      else if (comboType === '二中二' || comboType === '三中三') { hit = tokens.every(t => drawNumbersZhengma.includes(t.padStart(2,'0'))); }
      if (hit) { if (isPerItem) { let hitCount = 0; if (comboType === '平特肖' || comboType === '平特肖带主肖') { hitCount = tokens.filter(t => drawZodiacsSet.has(t)).length; } else if (comboType === '平特尾' || comboType === '平特尾零尾') { hitCount = tokens.filter(t => { const d=t.replace('尾',''); for(let i=0;i<=4;i++){ const n=(i*10+parseInt(d)).toString().padStart(2,'0'); if(drawNumbersSet.has(n)) return true; } return false; }).length; } else if (comboType === '平码') { hitCount = tokens.filter(t => drawNumbersZhengma.includes(t.padStart(2,'0'))).length; } if (hitCount > 0) { stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + hitCount * amt; } stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100) - (hitCount * amt * odds); } else { stats.reportHitByType[comboType] = (stats.reportHitByType[comboType] || 0) + amt; stats.reportPL += amt - amt * (rebate / 100) - (amt * odds); } } else { stats.reportPL += effectiveCount * amt - effectiveCount * amt * (rebate / 100); } }
  });
}
function processReportLineDuijiangOld(stats, match, drawTeMa, hasValidDraw) {
  const cont = match[1]; const amt = parseInt(match[2]) || 0; const items = cont.split('-').map(i => i.trim()).filter(i => i); const nums = [];
  items.forEach(item => { if (/^\d+$/.test(item)) { nums.push(item.padStart(2, '0')); } else if (ZODIAC_NUMS[item]) { (ZODIAC_NUMS[item] || '').split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } else if (D[item]) { const val = D[item]; if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) { for (const z of val) { if (ZODIAC_NUMS[z]) ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0'))); } } else { val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0'))); } } });
  const { odds, rebate } = getOddsForType('特码', getOddsData()); const totalCount = nums.length;
  stats.reportTotal += totalCount * amt; stats.reportRebate += totalCount * amt * (rebate / 100);
  if (hasValidDraw) { let hitAmount = 0; nums.forEach(num => { if (num === drawTeMa && drawTeMa) { hitAmount += amt; } }); if (hitAmount > 0) { stats.reportHitByType['特码'] = (stats.reportHitByType['特码'] || 0) + hitAmount; } stats.reportPL += (totalCount * amt) - (totalCount * amt * (rebate / 100)) - (hitAmount * odds); }
}

// ===== 订单记录渲染辅助 =====
function isTokenMatching(token, targetNum) { const t = targetNum.padStart(2, '0'); if (/^\d{1,2}$/.test(token)) return token.padStart(2, '0') === t; if (D[token]) { const nums = keyToAllNums(token); return nums.includes(t); } return false; }
function highlightContent(content, targetNum) { if (!targetNum) return content; const t = targetNum.padStart(2, '0'); const parts = []; let tmp = ''; for (const ch of content) { if (ch === '-' || ch === ' ') { if (tmp) parts.push(tmp); parts.push(ch); tmp = ''; } else { tmp += ch; } } if (tmp) parts.push(tmp); return parts.map(p => { if (p === '-' || p === ' ') return p; if (isTokenMatching(p, targetNum)) return `<span class="highlight-number">${p}</span>`; return p; }).join(''); }
function orderContainsTarget(content, targetNum) { if (!targetNum) return true; const t = targetNum.padStart(2, '0'); const lines = content.split('\n'); for (const line of lines) { if (!line.startsWith('特码:')) continue; const m = line.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); if (!m) continue; const cont = m[1]; const parts = []; let tmp = ''; for (const ch of cont) { if (ch === '-' || ch === ' ') { if (tmp) parts.push(tmp); tmp = ''; } else { tmp += ch; } } if (tmp) parts.push(tmp); for (const p of parts) { if (p !== '-' && p !== ' ' && isTokenMatching(p, targetNum)) return true; } } return false; }
function getSpecialAmountFromOrder(content, prizeNum) { if (!prizeNum) return 0; const targetNum = prizeNum.padStart(2, '0'); const lines = content.split('\n'); let total = 0; for (const line of lines) { const match = line.match(/^(.+?):(.+?)\s+各(?:数|)\s*(\d+)$/); if (!match) continue; const tokensPart = match[2]; const amount = parseInt(match[3]) || 0; const tokens = tokensPart.split('-').map(t => t.trim()).filter(t => t); for (const token of tokens) { if (isTokenMatching(token, targetNum)) { total += amount; } } } return total; }
function renderOrderStats(allOrders, allReports, filterUser, prizeNum) {
  const container = document.getElementById('orderStatsContainer'); if (!container) return;
  const mul = parseFloat(document.getElementById('multipleVal')?.value) || 1;
  const rr = parseFloat(document.getElementById('rebateRate')?.value) || 0;
  let totalAmountSum = 0; allOrders.forEach(it => { totalAmountSum += it.totalAmount || 0; });
  let reportTotalAmount = 0; allReports.forEach(it => { reportTotalAmount += it.totalAmount || 0; });
  let totalSpecial = 0, reportSpecial = 0, hitCount = 0;
  if (prizeNum) { const num = prizeNum.padStart(2, '0'); allOrders.forEach(it => { totalSpecial += getSpecialAmountFromOrder(it.content, prizeNum); if (orderContainsTarget(it.content, prizeNum)) hitCount++; }); allReports.forEach(it => { reportSpecial += getSpecialAmountFromOrder(it.content, prizeNum); }); }
  const totalProfit = Math.round(totalAmountSum - totalAmountSum * (rr / 100) - totalSpecial * mul);
  const reportProfit = Math.round(reportTotalAmount - reportTotalAmount * (rr / 100) - reportSpecial * mul);
  const netProfit = totalProfit - reportProfit;
  const showStats = prizeNum && prizeNum.trim() !== '';
  let html = '<div class="stats-block"><div class="stats-row">';
  if (totalAmountSum > 0) { html += `<span class="stat-col"><span class="slabel">总额:</span><span class="stat-val-amount">${totalAmountSum}</span></span>`; }
  if (showStats) { html += `<span class="stat-col"><span class="slabel">总特:</span><span class="stat-val-special">${totalSpecial}</span></span>`; const tp = Math.round(totalProfit); const tlabel = tp >= 0 ? '总盈' : '总亏'; const tcls = tp >= 0 ? 'stat-val-profit' : 'stat-val-loss'; html += `<span class="stat-col"><span class="slabel">${tlabel}:</span><span class="${tcls}">${tp}</span></span>`; html += `<span class="stat-col"><span class="slabel">中:</span><span class="stat-val-count">${hitCount}条</span></span>`; }
  html += '</div><div class="stats-row">';
  if (reportTotalAmount > 0) { html += `<span class="stat-col"><span class="slabel">上报金额:</span><span class="stat-val-amount">${reportTotalAmount}</span></span>`; }
  if (showStats) { html += `<span class="stat-col"><span class="slabel">上报特:</span><span class="stat-val-special">${reportSpecial}</span></span>`; const rp = Math.round(reportProfit); const rlabel = rp >= 0 ? '报盈' : '报亏'; const rcls = rp >= 0 ? 'stat-val-profit' : 'stat-val-loss'; html += `<span class="stat-col"><span class="slabel">${rlabel}:</span><span class="${rcls}">${rp}</span></span>`; const np = Math.round(netProfit); const nlabel = np >= 0 ? '盈' : '亏'; const ncls = np >= 0 ? 'stat-val-profit' : 'stat-val-loss'; html += `<span class="stat-col"><span class="slabel">${nlabel}:</span><span class="${ncls}">${np}</span></span>`; }
  html += '</div></div>';
  container.innerHTML = html;
}
async function applyPrizeFilter() {
  const pi = document.getElementById('prizeNumberInput'), uf = document.getElementById('recordUserFilter');
  if (!pi || !uf) return;
  const sd = document.getElementById('filterDate')?.value; const pn = pi.value.trim(), uv = uf.value;
  const recs = await getOrderRecords(); const reports = await getReportOrderRecords();
  const fRecs = sd ? recs.filter(r => r.date === sd) : recs;
  const fReps = sd ? reports.filter(r => r.date === sd) : reports;
  const userOrders = uv === 'all' ? fRecs : fRecs.filter(r => r.user === uv);
  const userReports = uv === 'all' ? fReps : fReps.filter(r => r.user === uv);
  let filtered = pn ? [] : [...userOrders];
  if (pn) { for (const it of userOrders) { if (orderContainsTarget(it.content, pn)) filtered.push(it); } }
  const cont = document.getElementById('orderListContainer');
  if (!cont) return;
  if (filtered.length === 0) { cont.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">暂无匹配订单</div>'; }
  else { cont.innerHTML = filtered.map(it => { const ts = formatTimestampToCST(it.timestamp), ud = it.user || '未知', col = getUserColor(ud), ta = it.totalAmount || 0; const lines = it.content.split('\n'); const hl = lines.map(l => { const m = l.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); if (!m) return l; const cont = m[1], amt = m[2]; const hc = highlightContent(cont, pn); return `特码:${hc} 各数 ${amt}`; }).join('<br>'); return `<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${hl}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`; }).join(''); }
  renderOrderStats(userOrders, userReports, uv, pn);
}