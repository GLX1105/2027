// ===== tableRender.js - 风险表格、频率卡片、号码金额表格的 DOM 生成 =====

function generateRiskTable() {
  const sw = document.getElementById('riskReportSwitcher')?.value;
  let data;
  if (sw === 'total') data = tableBetData;
  else if (sw === 'user') {
    const u = document.getElementById('viewUserSelect')?.value;
    data = userBetData[u] || {};
  } else data = reportBetData;
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  let total = 0;
  const mul = parseFloat(document.getElementById('multipleVal')?.value) || 1;
  const rr = parseFloat(document.getElementById('rebateRate')?.value) || 0;
  let list = [];
  for (let n in data) {
    const b = data[n];
    total += b;
    list.push({ num: n, bet: b });
  }
  for (let i = 1; i <= 49; i++) {
    const n = i.toString().padStart(2, '0');
    if (!data[n]) list.push({ num: n, bet: 0 });
  }
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

function applyReportCap() {
  generateReportTable();
}

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
  for (let i = 1; i <= 49; i++) {
    const n = i.toString().padStart(2, '0');
    if (!data[n]) list.push({ num: n, bet: 0 });
  }
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
    for (let n in data) {
      if (data[n] > cv) exc.push({ num: n, exceed: data[n] - cv });
    }
    if (exc.length > 0) {
      exc.sort((a, b) => a.exceed - b.exceed);
      let txt = '';
      let te = 0;
      exc.forEach(x => {
        txt += `${x.num}各${x.exceed}米<br>`;
        te += x.exceed;
      });
      txt += `合计${te}`;
      info.innerHTML = txt;
    } else {
      info.textContent = '无超出的号码';
    }
  } else {
    info.textContent = '';
  }
  if (Object.keys(data).length > 0) {
    const max = Math.max(...Object.values(data));
    cap.placeholder = max;
  }
}

async function copyReportCapText() {
  const info = document.getElementById('reportCapInfo');
  const txt = info.innerText || info.textContent;
  if (!txt || txt === '无超出的号码') {
    showToast('没有可复制的文本');
    return;
  }
  navigator.clipboard.writeText(txt).then(() => showToast('已复制')).catch(() => showToast('复制失败'));
}

async function screenshotTable(tid) {
  const tbl = document.getElementById(tid);
  if (!tbl) { showToast('表格不存在'); return; }
  try {
    const canvas = await html2canvas(tbl, { backgroundColor: '#ffffff', scale: 2, logging: false });
    canvas.toBlob(async blob => {
      if (!blob) { showToast('生成图片失败'); return; }
      try {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        showToast('截图已复制');
      } catch (e) { showToast('复制失败'); }
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
      } else {
        tb += '<td></td><td></td><td></td><td></td>';
      }
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
    if (orderTotal > 0) { orderSpan.textContent = orderTotal; orderBox.style.display = 'inline-flex'; }
    else { orderBox.style.display = 'none'; }
  }
  const reportBox = document.getElementById('directReportTotalBox');
  const reportSpan = document.getElementById('directReportTotalAmount');
  if (reportBox && reportSpan) {
    if (reportTotal > 0) { reportSpan.textContent = reportTotal; reportBox.style.display = 'inline-flex'; }
    else { reportBox.style.display = 'none'; }
  }
}

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

function handleTableRowClick(event) {
  if (window.dragSelectionActive) return;
  const td = event.target.closest('td');
  if (!td) return;
  const tr = td.closest('tr');
  if (!tr) return;
  const tbody = tr.parentElement;
  tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected-row'));
  tr.classList.add('selected-row');
}

function copySelectedNumbers(tableId) {
  const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody');
  if (!tbody) return;
  const selectedRows = Array.from(tbody.querySelectorAll('tr.selected-row'));
  if (selectedRows.length === 0) { showToast('请先选择号码'); return; }
  const ids = selectedRows.map(row => {
    const cells = row.querySelectorAll('td');
    return cells[3] ? cells[3].textContent.trim() : '';
  }).filter(id => id && /^\d+$/.test(id));
  if (ids.length === 0) { showToast('无有效号码'); return; }
  const uniqueIds = [...new Set(ids)];
  const text = uniqueIds.join('-') + '各号';
  navigator.clipboard.writeText(text).then(() => { showToast('已复制: ' + text); }).catch(() => { showToast('复制失败'); });
}