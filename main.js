/* ===== main.js - 系统初始化、登录认证、地区切换、顶层流程编排 ===== */

// ===== 赔率相关 =====
function getOddsData() {
  try { return JSON.parse(localStorage.getItem('comboOddsData') || '{}'); } catch (e) { return {}; }
}

function getOddsForType(type, oddsData) {
  const defaults = {
    '特码': { odds: 47, rebate: 4 },
    '特肖': { odds: 11, rebate: 4 },
    '特肖本年肖': { odds: 10, rebate: 4 },
    '平特肖': { odds: 2, rebate: 4 }, '平特肖带主肖': { odds: 1.8, rebate: 4 },
    '二连肖': { odds: 4, rebate: 4 }, '二连肖带主肖': { odds: 3.5, rebate: 4 },
    '三连肖': { odds: 10, rebate: 4 }, '三连肖带主肖': { odds: 9, rebate: 4 },
    '四连肖': { odds: 30, rebate: 4 }, '四连肖带主肖': { odds: 25, rebate: 4 },
    '五连肖': { odds: 100, rebate: 4 }, '五连肖带主肖': { odds: 90, rebate: 4 },
    '平特尾': { odds: 1.8, rebate: 4 }, '平特尾零尾': { odds: 2, rebate: 4 },
    '二连尾': { odds: 3, rebate: 4 }, '二连尾零尾': { odds: 3.5, rebate: 4 },
    '三连尾': { odds: 6, rebate: 4 }, '三连尾零尾': { odds: 6.5, rebate: 4 },
    '四连尾': { odds: 14, rebate: 4 }, '四连尾零尾': { odds: 15, rebate: 4 },
    '五连尾': { odds: 28, rebate: 4 }, '五连尾零尾': { odds: 30, rebate: 4 },
    '五不中': { odds: 2, rebate: 4 }, '六不中': { odds: 2.5, rebate: 4 },
    '七不中': { odds: 3, rebate: 4 }, '八不中': { odds: 3.5, rebate: 4 },
    '九不中': { odds: 4, rebate: 4 }, '十不中': { odds: 5, rebate: 4 },
    '十一不中': { odds: 6, rebate: 4 }, '十二不中': { odds: 7, rebate: 4 },
    '二中二': { odds: 60, rebate: 4 }, '三中三': { odds: 600, rebate: 4 },
    '平码': { odds: 7, rebate: 4 },
    '特碰': { odds: 120, rebate: 4 },
    '包红波': { odds: 2.6, rebate: 4 }, '包蓝波': { odds: 2.7, rebate: 4 }, '包绿波': { odds: 2.7, rebate: 4 },
    '包红单': { odds: 5, rebate: 4 }, '包红双': { odds: 4.7, rebate: 4 },
    '包红大': { odds: 6, rebate: 4 }, '包红小': { odds: 4, rebate: 4 },
    '包蓝单': { odds: 5, rebate: 4 }, '包蓝双': { odds: 5, rebate: 4 },
    '包蓝大': { odds: 4.7, rebate: 4 }, '包蓝小': { odds: 6, rebate: 4 },
    '包绿单': { odds: 5, rebate: 4 }, '包绿双': { odds: 5, rebate: 4 },
    '包绿大': { odds: 5, rebate: 4 }, '包绿小': { odds: 6, rebate: 4 },
    '包单': { odds: 1.8, rebate: 4 }, '包双': { odds: 1.8, rebate: 4 },
    '包大': { odds: 1.8, rebate: 4 }, '包小': { odds: 1.8, rebate: 4 },
    '包家禽': { odds: 1.8, rebate: 4 }, '包野兽': { odds: 1.8, rebate: 4 }
  };
  const saved = oddsData[type] || {};
  return {
    odds: parseFloat(saved.odds) || defaults[type]?.odds || 1,
    rebate: parseFloat(saved.rebate) || defaults[type]?.rebate || 4
  };
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
        expanded.forEach(num => { numPayout[num] = (numPayout[num] || 0) + unitAmount * odds; });
        totalOrderAmount += expanded.length * unitAmount;
      });
    } else if (category === '特肖') {
      numbers.forEach(zodiac => {
        const isBenming = zodiac === curYearZodiac;
        const type = isBenming ? '特肖本年肖' : '特肖';
        const { odds } = getOddsForType(type, oddsData);
        const nums = (ZODIAC_NUMS[zodiac] || '').split(/[\s,，]+/);
        const payout = unitAmount * odds;
        nums.forEach(num => { numPayout[num] = (numPayout[num] || 0) + payout; });
      });
      totalOrderAmount += numbers.length * unitAmount;
    }
  });
  if (totalOrderAmount === 0) return 0;
  let maxPayout = 0;
  for (const num in numPayout) { if (numPayout[num] > maxPayout) maxPayout = numPayout[num]; }
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

// ===== 生肖映射 =====
function buildZodiacMap(startZodiac) {
  const map = {};
  const startIndex = zodiacOrder.indexOf(startZodiac);
  const idx = startIndex !== -1 ? startIndex : 0;
  for (let i = 1; i <= 49; i++) map[i.toString().padStart(2, '0')] = zodiacOrder[(idx + i - 1) % 12];
  return map;
}

const YEAR_ZODIAC_PASSWORD_ENC = "MTUwNDA4";
const YEAR_ZODIAC_PASSWORD = decodePassword(YEAR_ZODIAC_PASSWORD_ENC);

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
    sourceInput.value = '';
    const resultEl = document.getElementById('orderResult');
    if (resultEl) resultEl.innerHTML = '';
    updateOrderTotalDisplay();
  }
  const orderWin = document.getElementById('orderWin'); if (orderWin) orderWin.remove();
  const reportWin = document.getElementById('reportWin'); if (reportWin) reportWin.remove();
  setCurrentRegion(region);
  clearMemoryData();
  await updateTableFromRecords();
  updateSelects();
  updateRecycleCount();
  updateRecentDrawTexts();
  renderSmartDecision();
  addOperationLog('switch', `切换至${region === 'macau' ? '澳门' : region === 'hongkong' ? '香港' : '粤港'}`, region);
  showToast(`已切换至${region === 'macau' ? '澳门' : region === 'hongkong' ? '香港' : '粤港'}`);
}

// ===== 工具函数 =====
function getTodayCST() {
  const now = new Date();
  const offset = 8 * 60;
  const localTime = now.getTime() + (now.getTimezoneOffset() + offset) * 60000;
  const cstDate = new Date(localTime);
  return `${cstDate.getFullYear()}-${String(cstDate.getMonth() + 1).padStart(2, '0')}-${String(cstDate.getDate()).padStart(2, '0')}`;
}

function formatTimestampToCST(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Shanghai'
  }).format(d);
}

function formatDateMD(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getUserColor(u) {
  let h = 0;
  for (let i = 0; i < u.length; i++) h = u.charCodeAt(i) + ((h << 5) - h);
  const hue = (h % 360 + 360) % 360;
  return `hsl(${hue},70%,45%)`;
}

function getZodiacColorClass(zodiac) {
  if (!zodiac) return '';
  const redSet = new Set(['鼠', '兔', '马', '鸡']);
  const blueSet = new Set(['虎', '蛇', '猴', '猪']);
  const greenSet = new Set(['牛', '龙', '羊', '狗']);
  if (redSet.has(zodiac)) return 'red-text';
  if (blueSet.has(zodiac)) return 'blue-text';
  if (greenSet.has(zodiac)) return 'green-text';
  return '';
}

function getNumberColorClass(num) {
  if (redNumbers.includes(num)) return 'red-text';
  if (blueNumbers.includes(num)) return 'blue-text';
  if (greenNumbers.includes(num)) return 'green-text';
  return '';
}

function normalizePlayType(playType) {
  const map = {
    '2连肖': '二连肖', '3连肖': '三连肖', '4连肖': '四连肖', '5连肖': '五连肖',
    '2连尾': '二连尾', '3连尾': '三连尾', '4连尾': '四连尾', '5连尾': '五连尾',
    '5不中': '五不中', '6不中': '六不中', '7不中': '七不中', '8不中': '八不中',
    '9不中': '九不中', '10不中': '十不中', '11不中': '十一不中', '12不中': '十二不中',
    '2中2': '二中二', '3中3': '三中三',
    '二连肖': '二连肖', '三连肖': '三连肖', '四连肖': '四连肖', '五连肖': '五连肖',
    '二连尾': '二连尾', '三连尾': '三连尾', '四连尾': '四连尾', '五连尾': '五连尾',
    '五不中': '五不中', '六不中': '六不中', '七不中': '七不中', '八不中': '八不中',
    '九不中': '九不中', '十不中': '十不中', '十一不中': '十一不中', '十二不中': '十二不中',
    '二中二': '二中二', '三中三': '三中三', '特碰': '特碰',
    '平特肖': '平特肖', '平特尾': '平特尾', '平码': '平码', '特码': '特码', '特肖': '特肖'
  };
  return map[playType] || playType;
}

// ===== 保存订单 =====
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
          const playType = match[1];
          const content = match[2];
          const amt = parseInt(match[3]) || 0;
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
  window._pureOrderLines = []; window._pureOrderRegions = [];
  updateOrderTotalDisplay();
  const md = document.getElementById('maxLossDisplay'); if (md) { md.textContent = ''; md.style.display = 'none'; }
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));

  await updateTableFromRecords();
  calculateStorageUsage(); showStorageDrawerTemporary(5000); renderSmartDecision(); updateSingleBetDisplay();
  updateOrderCountDisplay();
  renderPingtexiaoTable(); updatePingtexiaoTotal();
  showToast('已保存下单（' + savedCount + '个地区）');
}

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
          const playType = match[1];
          const content = match[2];
          const amt = parseInt(match[3]) || 0;
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
  window._pureOrderLines = []; window._pureOrderRegions = [];
  updateOrderTotalDisplay();
  const md = document.getElementById('maxLossDisplay'); if (md) { md.textContent = ''; md.style.display = 'none'; }
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));

  await updateTableFromRecords();
  calculateStorageUsage(); showStorageDrawerTemporary(5000); renderSmartDecision();
  renderPingtexiaoTable(); updatePingtexiaoTotal();
  showToast('已上报成功（' + savedCount + '个地区）');
  setTimeout(() => { const toast = document.querySelector('.toast-message.show'); if (toast) toast.style.color = '#ff0000'; }, 10);
}

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

// ===== 重置功能 =====
async function resetTable() {
  if (resetLock) return;
  resetLock = true;
  try {
    const regionName = currentRegion === 'macau' ? '澳门' : currentRegion === 'hongkong' ? '香港' : '粤港';
    const confirmed = await confirm(`确定清空当前地区（${regionName}）的所有订单和上报数据吗？此操作不可恢复。`);
    if (!confirmed) { resetLock = false; return; }
    const pwd = await prompt("输入清空密码：", "");
    if (pwd !== PASSWORD) { await alert("密码错误"); resetLock = false; return; }
    clearMemoryData();
    await clearAllOrderRecordsFromIDB(currentRegion);
    await clearAllReportOrderRecordsFromIDB(currentRegion);
    await clearAllComboOrderRecordsFromIDB(currentRegion);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`pingtexiao_${currentRegion}_`)) localStorage.removeItem(key);
      if (key && key.startsWith(`ptHighlight_${currentRegion}_`)) localStorage.removeItem(key);
    }
    renderAllTablesPlaceholder();
    calculateStorageUsage();
    updateAmountDisplays();
    renderPingtexiaoTable();
    addOperationLog('reset', `清空${regionName}所有订单和上报记录`);
    showToast(`已清空${regionName}的所有订单和上报记录`);
  } catch (e) {} finally { resetLock = false; }
}

// ===== 北京时间更新 =====
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

// ===== 系统初始化 =====
window.onload = async () => {
  setCurrentRegion(currentRegion);
  const dbInitOk = await initIndexedDB();
  if (!dbInitOk) {
    document.getElementById('dbWarning').style.display = 'block';
    const dbStatusEl = document.getElementById('dbStatus');
    if (dbStatusEl) { dbStatusEl.textContent = '异常'; dbStatusEl.style.color = '#e74c3c'; }
  }

  // 初始化默认预设
  if (!localStorage.getItem('replacePresets')) {
    const defaultPresets = [
      { "old": "兰", "new": "蓝" }, { "old": "录", "new": "绿" }, { "old": "碌", "new": "绿" },
      { "old": "禄", "new": "绿" }, { "old": "拦", "new": "蓝" }, { "old": "篮", "new": "蓝" },
      { "old": "免", "new": "兔" }, { "old": "午", "new": "牛" }, { "old": "侯", "new": "猴" },
      { "old": "㺅", "new": "猴" }, { "old": "名", "new": "各" }
    ];
    localStorage.setItem('replacePresets', JSON.stringify(defaultPresets));
  }
  if (!localStorage.getItem('categoryAliases')) {
    const defaultAliases = [
      { "alias": "红色", "target": "红波" }, { "alias": "蓝色", "target": "蓝波" }, { "alias": "绿色", "target": "绿波" },
      { "alias": "兰波", "target": "蓝波" }, { "alias": "录波", "target": "绿波" }, { "alias": "金行", "target": "金" },
      { "alias": "木行", "target": "木" }, { "alias": "水行", "target": "水" }, { "alias": "火行", "target": "火" }, { "alias": "土行", "target": "土" },
      { "alias": "红蓝", "target": "红波-蓝波" }, { "alias": "红绿", "target": "红波-绿波" }, { "alias": "蓝绿", "target": "蓝波-绿波" },
      { "alias": "火土", "target": "火-土" }, { "alias": "红蓝波", "target": "红波-蓝波" }, { "alias": "红绿波", "target": "红波-绿波" },
      { "alias": "蓝绿波", "target": "蓝波-绿波" }, { "alias": "大单小双", "target": "大单-小双" }, { "alias": "大双小单", "target": "大双-小单" },
      { "alias": "金木水", "target": "金-木-水" }, { "alias": "家肖", "target": "家禽" }, { "alias": "野肖", "target": "野兽" },
      { "alias": "号各", "target": "各号" }, { "alias": "小数", "target": "小" }, { "alias": "大数", "target": "大" },
      { "alias": "合单", "target": "合数单" }, { "alias": "合双", "target": "合数双" }, { "alias": "大尾", "target": "尾大" }, { "alias": "小尾", "target": "尾小" },
      { "alias": "大数单", "target": "大单" }, { "alias": "大数双", "target": "大双" }, { "alias": "小数单", "target": "小单" }, { "alias": "小数双", "target": "小双" },
      { "alias": "红波单", "target": "红单" }, { "alias": "红波双", "target": "红双" }, { "alias": "蓝波单", "target": "蓝单" }, { "alias": "蓝波双", "target": "蓝双" },
      { "alias": "绿波单", "target": "绿单" }, { "alias": "绿波双", "target": "绿双" }, { "alias": "老虎", "target": "虎" }, { "alias": "老鼠", "target": "鼠" },
      { "alias": "兔子", "target": "兔" }, { "alias": "大号", "target": "大" }, { "alias": "小号", "target": "小" }
    ];
    localStorage.setItem('categoryAliases', JSON.stringify(defaultAliases));
  }

  const today = getTodayCST();
  const filterDateEl2 = document.getElementById('filterDate');
  if (filterDateEl2) filterDateEl2.value = today;

  const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马';
  document.getElementById('startZodiacSelect').value = savedZodiac;
  currentZodiacMap = buildZodiacMap(savedZodiac);
  updateSelects();
  renderAllTablesPlaceholder();
  enableRowDragSelect('riskTable');
  enableRowDragSelect('reportTable');

  await autoCleanRecycleBin();
  setInterval(autoCleanRecycleBin, 24 * 60 * 60 * 1000);
  updateRecycleCount();

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  window._systemReady = async () => {
    await updateTableFromRecords();
    calculateStorageUsage();
    updateOrderTotalDisplay();
    updateReportAmountTotal();
    updateRecentDrawTexts();
    renderPingtexiaoTable();
    updateCardA();
    renderSmartDecision();
    addOperationLog('login', '系统登录');
  };

  if (!checkCurrentAccess()) {
    showLoginScreen();
  } else {
    if (isAdmin()) document.getElementById('cardMgrBtn').style.display = '';
    await window._systemReady();
  }

  // 监听金额范围输入
  const fixRangeInput = (id) => {
    const el = document.getElementById(id);
    if (el) { el.addEventListener('input', () => { updateTableFromRecords(); }); }
  };
  fixRangeInput('numAmountMin');
  fixRangeInput('numAmountMax');
  fixRangeInput('zodiacAmountMin');
  fixRangeInput('zodiacAmountMax');

  // 风险报告事件监听
  document.getElementById('rebateRate')?.addEventListener('input', generateRiskTable);
  document.getElementById('multipleVal')?.addEventListener('input', generateRiskTable);
  document.getElementById('reportRebateRate')?.addEventListener('input', generateReportTable);
  document.getElementById('reportMultipleVal')?.addEventListener('input', generateReportTable);
  document.getElementById('startZodiacSelect')?.addEventListener('change', changeStartZodiac);

  const filterDateEl = document.getElementById('filterDate');
  if (filterDateEl) {
    filterDateEl.addEventListener('change', () => {
      updateTableFromRecords();
      if (document.getElementById('orderWin')) { applyPrizeFilter(); }
      applyReportCap();
      updateRecentDrawTexts();
      renderPingtexiaoTable();
      updateCardA();
      const duiJiangWin = document.getElementById('duiJiangWin');
      if (duiJiangWin) { showDuiJiangWin(); }
    });
    filterDateEl.addEventListener('input', updateTableFromRecords);
  }

  // 清空按钮长按事件
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('mousedown', () => {
      resetLongPressTimer = setTimeout(async () => {
        resetLongPressTimer = null;
        const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！');
        if (!confirmed) return;
        const pwd = await prompt("输入清空密码：", "");
        if (pwd !== PASSWORD) { await alert("密码错误"); return; }
        await clearAllOrderRecordsFromIDB();
        await clearAllReportOrderRecordsFromIDB();
        await clearAllComboOrderRecordsFromIDB();
        clearMemoryData();
        renderAllTablesPlaceholder();
        calculateStorageUsage();
        updateAmountDisplays();
        addOperationLog('reset', '清空全部数据（长按）');
        showToast('已清空香港和澳门全部数据');
      }, 3000);
    });
    resetBtn.addEventListener('mouseup', () => {
      if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; }
    });
    resetBtn.addEventListener('mouseleave', () => {
      if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; }
    });
    resetBtn.addEventListener('touchstart', (e) => {
      resetLongPressTimer = setTimeout(async () => {
        resetLongPressTimer = null;
        const confirmed = await confirm('长按清空：确定要清空香港和澳门全部订单和上报数据吗？此操作不可恢复！');
        if (!confirmed) return;
        const pwd = await prompt("输入清空密码：", "");
        if (pwd !== PASSWORD) { await alert("密码错误"); return; }
        await clearAllOrderRecordsFromIDB();
        await clearAllReportOrderRecordsFromIDB();
        await clearAllComboOrderRecordsFromIDB();
        clearMemoryData();
        renderAllTablesPlaceholder();
        calculateStorageUsage();
        updateAmountDisplays();
        addOperationLog('reset', '清空全部数据（长按）');
        showToast('已清空香港和澳门全部数据');
      }, 3000);
      e.preventDefault();
    });
    resetBtn.addEventListener('touchend', (e) => {
      if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; resetTable(); e.preventDefault(); }
    });
    resetBtn.addEventListener('touchcancel', () => {
      if (resetLongPressTimer) { clearTimeout(resetLongPressTimer); resetLongPressTimer = null; }
    });
  }

  // 全局键盘快捷键
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
    if (e.key === 'Escape' && !isInputFocused) {
      if (closeTopWindow()) { e.preventDefault(); } else {
        document.querySelectorAll('#riskTable tr.selected-row, #reportTable tr.selected-row').forEach(tr => tr.classList.remove('selected-row'));
        e.preventDefault();
      }
      return;
    }
    if (e.ctrlKey && e.key === 'v') { if (recognizeWin && !isInputFocused) { e.preventDefault(); pasteOrder(); } return; }
    if (e.ctrlKey && e.key === 'Delete') { if (recognizeWin) { e.preventDefault(); clearAllInput(); } return; }
    if (e.key === 'F5') { e.preventDefault(); updateTableFromRecords(); showToast('数据已刷新'); return; }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportData(); return; }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); importData(); return; }
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); showDatabase(); return; }
  });

  // 自动应用截断阈值（初始化后生成报告表）
  const originalApplyReportCap = applyReportCap;
  applyReportCap = function() {
    originalApplyReportCap();
    const info = document.getElementById('reportCapInfo').innerText;
    if (!info || info === '无超出的号码') { document.getElementById('parseResultArea').innerText = ''; }
  };

  // 对奖输入框颜色样式
  (function() {
    const originalApplyPrizeFilter = applyPrizeFilter;
    applyPrizeFilter = async function() {
      await originalApplyPrizeFilter.apply(this, arguments);
      const input = document.getElementById('prizeNumberInput');
      if (!input) return;
      let val = input.value.trim();
      if (val === '') { input.className = ''; return; }
      if (/^\d$/.test(val)) val = '0' + val;
      if (/^\d{2}$/.test(val) && parseInt(val) >= 1 && parseInt(val) <= 49) {
        const cls = redNumbers.includes(val) ? 'red-text' : (blueNumbers.includes(val) ? 'blue-text' : 'green-text');
        input.className = cls;
      } else { input.className = ''; }
    };
  })();

  // render.js 中 generateReportTable / updateTableFromRecords / switchRegion 完成后的钩子
  (function() {
    const originalGenerateReportTable = generateReportTable;
    generateReportTable = function() {
      originalGenerateReportTable.apply(this, arguments);
      updateCardA();
      renderSmartDecision();
    };
  })();

  (function() {
    const originalUpdateTableFromRecords = updateTableFromRecords;
    updateTableFromRecords = async function() {
      await originalUpdateTableFromRecords.apply(this, arguments);
      await computeSurge();
      renderPingtexiaoTable();
      updateCardA();
      renderSmartDecision();
    };
  })();

  (function() {
    const originalSwitchRegion = switchRegion;
    switchRegion = async function(region) {
      await originalSwitchRegion.apply(this, arguments);
      renderPingtexiaoTable();
      updateCardA();
      renderSmartDecision();
    };
  })();
};