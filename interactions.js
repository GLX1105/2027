/* ===== interactions.js - 控件交互（行拖拽多选、开奖记录输入、地区圆点、标记、输入框工具等） ===== */

// ===== 行拖拽多选（风险/净风险表格） =====
function enableRowDragSelect(tableId) {
  const tbody = document.getElementById(tableId === 'riskTable' ? 'tableBody' : 'reportTableBody');
  if (!tbody) return;
  let startRow = null;
  let endRow = null;

  function clearSelection() {
    tbody.querySelectorAll('tr.selected-row').forEach(tr => tr.classList.remove('selected-row'));
  }

  function selectRows(row1, row2) {
    if (!row1 || !row2) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const idx1 = rows.indexOf(row1);
    const idx2 = rows.indexOf(row2);
    if (idx1 === -1 || idx2 === -1) return;
    const minIdx = Math.min(idx1, idx2);
    const maxIdx = Math.max(idx1, idx2);
    for (let i = minIdx; i <= maxIdx; i++) {
      rows[i].classList.add('selected-row');
    }
  }

  tbody.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.ctrlKey || e.shiftKey) return;
    const targetRow = e.target.closest('tr');
    if (!targetRow) return;
    dragSelectionActive = true;
    clearSelection();
    startRow = targetRow;
    endRow = targetRow;
    targetRow.classList.add('selected-row');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragSelectionActive) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return;
    const tr = target.closest('tr');
    if (!tr || tr.parentElement !== tbody) return;
    if (tr !== endRow) {
      endRow = tr;
      clearSelection();
      selectRows(startRow, endRow);
    }
  });

  document.addEventListener('mouseup', () => {
    if (dragSelectionActive) {
      dragSelectionActive = false;
      startRow = null;
      endRow = null;
    }
  });

  // 移动端长按拖拽支持
  let longPressTimer = null;
  let longPressTriggered = false;
  let touchStartY = 0;
  let touchStartX = 0;

  tbody.addEventListener('touchstart', (e) => {
    const targetRow = e.target.closest('tr');
    if (!targetRow) return;
    longPressTriggered = false;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      dragSelectionActive = true;
      clearSelection();
      startRow = targetRow;
      endRow = targetRow;
      targetRow.classList.add('selected-row');
    }, 1000);
  }, { passive: true });

  tbody.addEventListener('touchmove', (e) => {
    if (!longPressTriggered) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      if (dy > 10 || dx > 10) {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
      return;
    }
    if (!dragSelectionActive) return;
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;
    const tr = target.closest('tr');
    if (!tr || tr.parentElement !== tbody) return;
    if (tr !== endRow) {
      endRow = tr;
      clearSelection();
      selectRows(startRow, endRow);
    }
  }, { passive: false });

  tbody.addEventListener('touchend', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (dragSelectionActive) {
      dragSelectionActive = false;
      startRow = null;
      endRow = null;
    }
    longPressTriggered = false;
  });
}

function handleTableRowClick(event) {
  if (dragSelectionActive) return;
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
  if (selectedRows.length === 0) {
    showToast('请先选择号码');
    return;
  }
  const ids = selectedRows
    .map(row => {
      const cells = row.querySelectorAll('td');
      return cells[3] ? cells[3].textContent.trim() : '';
    })
    .filter(id => id && /^\d+$/.test(id));
  if (ids.length === 0) {
    showToast('无有效号码');
    return;
  }
  const uniqueIds = [...new Set(ids)];
  const text = uniqueIds.join('-') + '各号';
  navigator.clipboard.writeText(text)
    .then(() => showToast('已复制: ' + text))
    .catch(() => showToast('复制失败'));
}

// ===== 地区圆点切换 =====
function setDotRegion(region) {
  _dotRegion = region;
  const dotSmart = document.getElementById('dotSmart');
  const dotMacau = document.getElementById('dotMacau');
  const dotHongkong = document.getElementById('dotHongkong');
  const dotYuegang = document.getElementById('dotYuegang');

  const setActive = (el, activeColor) => {
    if (!el) return;
    el.style.background = activeColor;
    el.style.color = '#fff';
    el.style.border = `1px solid ${activeColor}`;
    const span = el.querySelector('span');
    if (span) span.style.background = '#fff';
  };
  const setInactive = (el, color) => {
    if (!el) return;
    el.style.background = 'transparent';
    el.style.color = color;
    el.style.border = `1px solid ${color}`;
    const span = el.querySelector('span');
    if (span) {
      span.style.background = 'transparent';
      span.style.border = `1px solid ${color}`;
    }
  };

  if (dotSmart) {
    if (region === 'auto') setActive(dotSmart, '#8e44ad');
    else setInactive(dotSmart, '#8e44ad');
  }
  if (dotMacau) {
    if (region === 'macau') setActive(dotMacau, '#e74c3c');
    else setInactive(dotMacau, '#e74c3c');
  }
  if (dotHongkong) {
    if (region === 'hongkong') setActive(dotHongkong, '#3498db');
    else setInactive(dotHongkong, '#3498db');
  }
  if (dotYuegang) {
    if (region === 'yuegang') setActive(dotYuegang, '#27ae60');
    else setInactive(dotYuegang, '#27ae60');
  }
}

// ===== 标记地区 =====
function markRegion(region) {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (start === end) {
    showToast('请先选择文本');
    return;
  }
  const selectedText = ta.value.substring(start, end);
  if (!selectedText.trim()) {
    showToast('请先选择文本');
    return;
  }
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

// ===== 标记选中文本（合并为连字符） =====
function markSelection() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (start === end) {
    showToast('请先选择文本');
    return;
  }
  const selectedText = ta.value.substring(start, end);
  const tokens = selectedText.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim());
  if (tokens.length === 0) {
    showToast('所选内容无有效文字');
    return;
  }
  const merged = tokens.join('-');
  ta.value = ta.value.substring(0, start) + merged + ta.value.substring(end);
  performRecognition(ta.value);
}

// ===== 插入分类文字 =====
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

// ===== 复制订单组（截断阈值解析结果） =====
function copyOrderGroup() {
  const text = document.getElementById('parseResultArea').innerText;
  if (!text) {
    showToast('没有解析结果');
    return;
  }
  navigator.clipboard.writeText(text).then(() => showToast('订单组已复制'));
}

// ===== 解析方法切换 =====
function switchParseMethod() {
  const text = document.getElementById('reportCapInfo').innerText;
  if (!text || text === '无超出的号码') {
    showToast('当前没有超额文本');
    document.getElementById('parseResultArea').innerText = '';
    return;
  }
  const result = parseExcessText(text, currentParseMethod);
  document.getElementById('parseResultArea').innerText = result;
  const methodNames = ['聚类分组', '贪心合并', '固定50→10→5→2→1', '100递减', '固定100→...→1'];
  showToast(`当前方案：${methodNames[currentParseMethod]}`);
  currentParseMethod = (currentParseMethod + 1) % 5;
  localStorage.setItem('savedParseMethod', currentParseMethod);
}

function parseExcessText(text, method) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const items = [];
  for (const line of lines) {
    const match = line.match(/(\d{2})各(\d+)米/);
    if (match) {
      items.push({ num: match[1], amount: parseInt(match[2]) });
    }
  }
  if (items.length === 0) return '';
  items.sort((a, b) => b.amount - a.amount);

  const parseItems = (method) => {
    const data = items.map(item => ({ ...item }));
    const result = [];
    if (method === 0) {
      while (data.some(d => d.amount > 0)) {
        const maxAmount = Math.max(...data.map(d => d.amount));
        if (maxAmount <= 0) break;
        const group = [];
        for (const d of data) {
          if (d.amount > 0 && (maxAmount - d.amount) <= maxAmount * 0.4) {
            group.push(d.num);
          }
        }
        const groupAmount = Math.min(...group.map(n => data.find(d => d.num === n).amount));
        for (const n of group) {
          const d = data.find(d => d.num === n);
          d.amount -= groupAmount;
        }
        result.push(`${group.join('-')}各数${groupAmount}`);
      }
    } else if (method === 1) {
      while (data.some(d => d.amount > 0)) {
        let bestAmount = 0;
        let bestCount = 0;
        for (let i = 0; i < data.length; i++) {
          const candidate = data[i].amount;
          if (candidate <= 0) continue;
          let count = 0;
          for (const d of data) {
            if (d.amount >= candidate) count++;
          }
          if (count > bestCount || (count === bestCount && candidate < bestAmount)) {
            bestCount = count;
            bestAmount = candidate;
          }
        }
        if (bestCount === 0) break;
        const group = [];
        for (const d of data) {
          if (d.amount >= bestAmount) {
            group.push(d.num);
            d.amount -= bestAmount;
          }
        }
        result.push(`${group.join('-')}各数${bestAmount}`);
      }
    } else if (method === 2) {
      const levels = [50, 10, 5, 2, 1];
      for (const lv of levels) {
        let again = true;
        while (again) {
          again = false;
          const group = [];
          for (const d of data) {
            if (d.amount >= lv) {
              group.push(d.num);
              d.amount -= lv;
              again = true;
            }
          }
          if (group.length > 0) {
            result.push(`${group.join('-')}各数${lv}`);
          }
        }
      }
    } else if (method === 3) {
      for (let lv = 100; lv >= 1; lv--) {
        let again = true;
        while (again) {
          again = false;
          const group = [];
          for (const d of data) {
            if (d.amount >= lv) {
              group.push(d.num);
              d.amount -= lv;
              again = true;
            }
          }
          if (group.length > 0) {
            result.push(`${group.join('-')}各数${lv}`);
          }
        }
      }
    } else if (method === 4) {
      const levels = [];
      for (let lv = 100; lv >= 5; lv -= 5) levels.push(lv);
      levels.push(3, 2, 1);
      for (const lv of levels) {
        let again = true;
        while (again) {
          again = false;
          const group = [];
          for (const d of data) {
            if (d.amount >= lv) {
              group.push(d.num);
              d.amount -= lv;
              again = true;
            }
          }
          if (group.length > 0) {
            result.push(`${group.join('-')}各数${lv}`);
          }
        }
      }
    }
    return result.join('\n');
  };
  return parseItems(method);
}

// ===== 兑奖窗口及开奖记录输入处理 =====
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
  _lianxiaoEditEnabled = true;
  for (let i = 1; i <= 7; i++) {
    const inp = document.getElementById('drawNum' + i);
    if (inp) inp.disabled = false;
  }
  showToast('已进入编辑模式');
}

async function saveDrawNumbers() {
  _lianxiaoEditEnabled = false;
  const numbers = [];
  for (let i = 1; i <= 7; i++) {
    const inp = document.getElementById('drawNum' + i);
    if (inp) {
      let val = inp.value.trim();
      if (/^\d$/.test(val)) val = '0' + val;
      if (/^\d{2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 49) {
        numbers.push(val);
      } else {
        numbers.push('');
      }
      inp.disabled = true;
    }
  }
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  let year = new Date().getFullYear();
  const m = fd.match(/^(\d{4})/);
  if (m) year = parseInt(m[1]);
  const issueNumber = getCurrentIssueNumber(year, fd);
  if (!issueNumber) {
    showToast('无法获取期号');
    return;
  }
  const issueId = issueNumber.toString().padStart(2, '0');
  const storageKey = `comboDrawRecord_${currentRegion}_${year}`;
  let savedData = {};
  try {
    savedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (e) {}
  savedData[issueId] = {
    number: numbers[6] || numbers.join(',') || '',
    numbers: numbers,
    pl: ''
  };
  localStorage.setItem(storageKey, JSON.stringify(savedData));
  refreshLianxiaoStats();
  showToast('开奖号码已保存，统计已刷新');
}

function onDrawNumberInput(input, issueId) {
  let val = input.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0, 2);
  input.value = val;
  const zodiacSpan = document.querySelector(`.draw-zodiac-${issueId}`);
  if (!zodiacSpan) return;
  if (val.length === 2) {
    const num = val.padStart(2, '0');
    const intVal = parseInt(num);
    if (intVal >= 1 && intVal <= 49) {
      const zodiac = currentZodiacMap[num] || '';
      zodiacSpan.textContent = zodiac;
      zodiacSpan.className = `draw-zodiac-${issueId} ${getZodiacColorClass(zodiac)}`;
      input.className = `draw-number-input draw-num-${issueId} ${getNumberColorClass(num)}`;
      return;
    }
  }
  zodiacSpan.textContent = '';
  zodiacSpan.className = `draw-zodiac-${issueId}`;
  input.className = `draw-number-input draw-num-${issueId}`;
}

function editDrawRecord() {
  document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = false);
  document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = false);
  showToast('已进入编辑模式');
}

async function saveDrawRecord(year) {
  const data = {};
  const plInputs = document.querySelectorAll('.draw-pl-input');
  plInputs.forEach(input => {
    const issueId = input.className.match(/draw-pl-(\d+)/)?.[1];
    if (issueId) {
      data[issueId] = { number: '', pl: input.value.trim() };
    }
  });
  const numberInputs = document.querySelectorAll('.draw-number-input');
  numberInputs.forEach(input => {
    const issueId = input.className.match(/draw-num-(\d+)/)?.[1];
    if (issueId) {
      let num = input.value.trim();
      if (/^\d$/.test(num)) num = '0' + num;
      if (!/^\d{2}$/.test(num) || parseInt(num) < 1 || parseInt(num) > 49) num = '';
      if (!data[issueId]) data[issueId] = { number: num, pl: '' };
      else data[issueId].number = num;
    }
  });
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  localStorage.setItem(storageKey, JSON.stringify(data));
  document.querySelectorAll('.draw-number-input').forEach(el => el.disabled = true);
  document.querySelectorAll('.draw-pl-input').forEach(el => el.disabled = true);

  // 更新月度汇总
  const monthlyPL = new Array(12).fill(0);
  for (const iid in data) {
    const entry = data[iid];
    if (entry && entry.number && entry.number.trim() && entry.pl !== undefined && entry.pl !== '') {
      const num = entry.number.trim().padStart(2, '0');
      if (/^\d{2}$/.test(num) && parseInt(num) >= 1 && parseInt(num) <= 49) {
        const issueNum = parseInt(iid);
        const issueDate = new Date(year, 0, issueNum);
        const month = issueDate.getMonth();
        const plVal = parseFloat(entry.pl);
        if (!isNaN(plVal)) monthlyPL[month] += plVal;
      }
    }
  }
  const summaryTable = document.querySelector('.monthly-summary-table');
  if (summaryTable) {
    let html = '<tbody>';
    let totalPLSum = 0;
    for (let m = 0; m < 12; m++) {
      const val = monthlyPL[m];
      totalPLSum += val;
      let valText = '';
      if (val > 0) valText = `<span style="color:#27ae60;font-weight:bold;">+${val}</span>`;
      else if (val < 0) valText = `<span style="color:#e74c3c;font-weight:bold;">${val}</span>`;
      html += `<tr><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">${m+1}月</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${valText}</td></tr>`;
    }
    let totalText = '';
    if (totalPLSum > 0) totalText = `<span style="color:#27ae60;font-weight:bold;">+${totalPLSum}</span>`;
    else if (totalPLSum < 0) totalText = `<span style="color:#e74c3c;font-weight:bold;">${totalPLSum}</span>`;
    html += `<tr style="border-top:2px solid #333;"><td style="text-align:left;padding:1px 4px;border:none;font-size:11px;color:#0000ff;">总盈亏</td><td style="text-align:right;padding:1px 4px;border:none;font-size:11px;">${totalText}</td></tr>`;
    html += '</tbody>';
    summaryTable.innerHTML = html;
  }
  updateRecentDrawTexts();
  renderSmartDecision();
  showToast('保存成功');
}

async function clearAllDrawRecords(year) {
  if (!(await confirm(`确定清空${currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港'} ${year}年全部开奖号码吗？此操作不可恢复！`))) return;
  const storageKey = `drawRecord_${currentRegion}_${year}`;
  localStorage.removeItem(storageKey);
  showToast('已清空');
  showDrawRecord();
  updateRecentDrawTexts();
  renderSmartDecision();
}

function updatePlColor(input) {
  const match = input.className.match(/draw-pl-(\d+)/);
  const issueClass = match ? match[0] : '';
  const val = input.value.trim();
  let colorClass = '';
  if (val !== '' && val !== '-') {
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num > 0) colorClass = ' green-text';
      else if (num < 0) colorClass = ' red-text';
    }
  }
  input.className = 'draw-pl-input' + (issueClass ? ' ' + issueClass : '') + colorClass;
}

function saveRecentDrawCount() {
  const input = document.getElementById('recentDrawCountInput');
  if (!input) return;
  const rawVal = input.value.trim();
  if (rawVal === '') {
    localStorage.removeItem(`recentDrawCount_${currentRegion}`);
    updateRecentDrawTexts();
    renderSmartDecision();
    showToast('已清空期数设置');
    return;
  }
  const val = parseInt(rawVal);
  if (isNaN(val) || val < 1) {
    showToast('请输入有效的期数');
    return;
  }
  localStorage.setItem(`recentDrawCount_${currentRegion}`, val.toString());
  updateRecentDrawTexts();
  renderSmartDecision();
  showToast(`已设置显示最近${val}期`);
}