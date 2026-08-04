// ===== dict.js - 数据字典与核心工具函数 =====

// ===== 订单变量与基础函数 =====
let tableBetData = {}, userBetData = {}, reportBetData = {}, reportAmountData = {}, reportRiskData = {};
let numberCount = {}, zodiacCount = {}, numberAmountCount = {}, zodiacAmountCount = {};
let zodiacDirectAmount = {}, zodiacFilteredAmount = {};
let zodiacReportAmount = {}, zodiacFilteredReportAmount = {};
let numberOrderTotal = 0, zodiacWeightedTotal = 0;
let originalOrderAmount = {};
let directOrderAmount = {};
let directReportAmount = {};
// 订单计数（所有玩法）
let orderCountAll = 0;

const YEAR_ZODIAC_PASSWORD_ENC = "MTUwNDA4"; const YEAR_ZODIAC_PASSWORD = decodePassword(YEAR_ZODIAC_PASSWORD_ENC);
const DB_NAME = 'OrderDatabase', DB_VERSION = 7, STORE_NAME = 'orders', REPORT_STORE_NAME = 'report_orders', RECYCLE_STORE_NAME = 'recycle_bin', LOG_STORE_NAME = 'operation_log', COMBO_STORE_NAME = 'combo_orders';
let db = null;
let dbAvailable = true;
const zodiacOrder = ['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
let currentZodiacMap = {};
const redNumbers = ['01','02','07','08','12','13','18','19','23','24','29','30','34','35','40','45','46'];
const blueNumbers = ['03','04','09','10','14','15','20','25','26','31','36','37','41','42','47','48'];
const greenNumbers = ['05','06','11','16','17','21','22','27','28','32','33','38','39','43','44','49'];
const RECYCLE_RETENTION_DAYS = 30;

// ===== 分层缓存 =====
const statsCache = new Map();
function getCacheKey(region, date, filterUser) { return `${region}|${date}|${filterUser || 'all'}`; }
function clearStatsCache() { statsCache.clear(); }

function getTodayCST() { const now = new Date(); const offset = 8*60; const localTime = now.getTime() + (now.getTimezoneOffset() + offset) * 60000; const cstDate = new Date(localTime); return `${cstDate.getFullYear()}-${String(cstDate.getMonth()+1).padStart(2,'0')}-${String(cstDate.getDate()).padStart(2,'0')}`; }
function buildZodiacMap(startZodiac) { const map = {}; const startIndex = zodiacOrder.indexOf(startZodiac); const idx = startIndex !== -1 ? startIndex : 0; for (let i=1; i<=49; i++) map[i.toString().padStart(2,'0')] = zodiacOrder[(idx+i-1)%12]; return map; }
async function changeStartZodiac() { const select = document.getElementById('startZodiacSelect'); const newZodiac = select.value; const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马'; if (newZodiac === savedZodiac) return; const inputPwd = await prompt("请输入本年生肖切换密码：", ""); if (inputPwd !== YEAR_ZODIAC_PASSWORD) { await alert("密码错误"); select.value = savedZodiac; return; } localStorage.setItem('selectedStartZodiac', newZodiac); currentZodiacMap = buildZodiacMap(newZodiac); refreshAll(); }
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

// ===== 计算最大亏损（仅特码+特肖，按兑奖赔率，不去重） =====
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

// ===== 赔率弹窗（新增特碰赔率120） =====
function showOddsWin() {
  if (document.getElementById('oddsWin')) return;
  const savedOdds = getOddsData();
  const defaults = {
    '特码':{odds:'47',rebate:'4'},
    '特肖':{odds:'11',rebate:'4'},
    '特肖本年肖':{odds:'10',rebate:'4'},
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
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'oddsWin';
  win.style.width = '550px'; win.style.height = '650px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `
    <div class="modal-header"><h3>赔率设置</h3><div class="window-controls"><button onclick="maximizeWindow('oddsWin')">🗖</button><button onclick="document.getElementById('oddsWin').remove()">×</button></div></div>
    <div class="modal-body" style="overflow-y:auto;">
      <table style="width:100%;"><thead><tr><th style="text-align:center;">玩法</th><th style="text-align:center;">赔率</th><th style="text-align:center;">反水%</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="modal-footer">
      <button class="btn" style="background:#f39c12;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="enableOddsEdit()">修改</button>
      <button class="btn" style="background:#28a745;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="saveOddsData()">保存</button>
      <button class="btn" style="background:#3498db;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="resetOddsToDefault()">恢复默认</button>
      <button class="btn" style="background:#6c757d;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="document.getElementById('oddsWin').remove()">关闭</button>
    </div>`;
  document.body.appendChild(win);
  makeWindowDraggable('oddsWin'); highestZ += 1; win.style.zIndex = highestZ;
}

function resetOddsToDefault() {
  const defaults = {
    '特码':{odds:'47',rebate:'4'},
    '特肖':{odds:'11',rebate:'4'},
    '特肖本年肖':{odds:'10',rebate:'4'},
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
  document.querySelectorAll('.odds-input[data-field="odds"]').forEach(inp => {
    const type = inp.dataset.type;
    if (defaults[type]) inp.value = defaults[type].odds;
  });
  document.querySelectorAll('.odds-input[data-field="rebate"]').forEach(inp => {
    const type = inp.dataset.type;
    if (defaults[type]) inp.value = defaults[type].rebate;
  });
  showToast('已恢复默认赔率，请点击保存以生效');
}

function enableOddsEdit() {
  document.querySelectorAll('.odds-input').forEach(inp => { inp.disabled = false; inp.style.border = '1px solid #ccc'; inp.style.background = '#fff'; });
  showToast('已进入编辑模式');
}

function getOddsData() { try { return JSON.parse(localStorage.getItem('comboOddsData') || '{}'); } catch(e) { return {}; } }
function saveOddsData() {
  const data = {};
  document.querySelectorAll('.odds-input[data-field="odds"]').forEach(inp => {
    const type = inp.dataset.type; if (!data[type]) data[type] = { odds: '', rebate: '4' }; data[type].odds = inp.value.trim();
  });
  document.querySelectorAll('.odds-input[data-field="rebate"]').forEach(inp => {
    const type = inp.dataset.type; if (!data[type]) data[type] = { odds: '', rebate: '4' }; data[type].rebate = inp.value.trim();
  });
  document.querySelectorAll('.odds-input[data-field="name"]').forEach(inp => {
    const type = inp.dataset.type; if (!data[type]) data[type] = { odds: '', rebate: '4' }; data[type].name = inp.value.trim();
  });
  localStorage.setItem('comboOddsData', JSON.stringify(data));
  document.querySelectorAll('.odds-input').forEach(inp => { inp.disabled = true; inp.style.border = 'none'; inp.style.background = 'transparent'; });
  showToast('赔率已保存'); if (document.getElementById('lianxiaoStatsWin')) refreshLianxiaoStats();
}

// ===== 新版字典与识别核心 =====
const ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
const ZODIAC_NUMS = { '鼠': '07 19 31 43', '牛': '06 18 30 42', '虎': '05 17 29 41', '兔': '04 16 28 40', '龙': '03 15 27 39', '蛇': '02 14 26 38', '马': '01 13 25 37 49', '羊': '12 24 36 48', '猴': '11 23 35 47', '鸡': '10 22 34 46', '狗': '09 21 33 45', '猪': '08 20 32 44' };
const NUM_TO_ZODIAC = {};
for (let [z, nums] of Object.entries(ZODIAC_NUMS)) nums.split(/[\s,，]+/).forEach(n => NUM_TO_ZODIAC[n] = z);
const ATTR_TO_ZODIACS = { '家禽': '牛马羊鸡狗猪', '家肖': '牛马羊鸡狗猪', '家畜': '牛马羊鸡狗猪', '家': '牛马羊鸡狗猪', '野兽': '鼠虎兔龙蛇猴', '野肖': '鼠虎兔龙蛇猴', '野': '鼠虎兔龙蛇猴', '马边': '马羊猴鸡狗猪', '鼠边': '鼠牛虎兔龙蛇', '单笔画肖': '鼠猪鸡马蛇龙', '双笔画肖': '兔虎牛狗猴羊', '吉肖': '兔鸡羊马蛇龙', '凶肖': '虎牛鼠猪狗猴', '天肖': '兔牛猪猴马龙', '地肖': '虎鼠狗鸡羊蛇', '阴肖': '鼠猪狗马蛇龙', '阳肖': '兔虎牛鸡猴羊', '男肖': '虎牛鼠狗猴马龙', '女肖': '兔猪鸡羊蛇', '朝肖': '兔猴羊马蛇龙', '夕肖': '虎牛鼠猪狗鸡', '前肖': '鼠牛虎兔龙蛇', '后肖': '马羊猴鸡狗猪', '左肖': '鼠牛龙蛇猴鸡', '右肖': '虎兔马羊狗猪', '有偏旁肖': '猪狗鸡猴蛇', '无偏旁肖': '兔虎牛鼠羊马龙' };
const AGE_TO_NUMS = { '1岁': '01 13 25 37 49', '2岁': '02 14 26 38', '3岁': '03 15 27 39', '4岁': '04 16 28 40', '5岁': '05 17 29 41', '6岁': '06 18 30 42', '7岁': '07 19 31 43', '8岁': '08 20 32 44', '9岁': '09 21 33 45', '10岁': '10 22 34 46', '11岁': '11 23 35 47', '12岁': '12 24 36 48' };

function buildDict() {
  const d = {};
  for (let [k, v] of Object.entries(ZODIAC_NUMS)) { d[k] = v; d['老' + k] = v; }
  const groups = { ...ATTR_TO_ZODIACS }; for (let [k, v] of Object.entries(groups)) { d[k] = v; }
  for (let i = 1; i <= 49; i++) { const s = String(i).padStart(2, '0'); d[s] = s; d[String(i)] = s; }
  d['单'] = '01 03 05 07 09 11 13 15 17 19 21 23 25 27 29 31 33 35 37 39 41 43 45 47 49'; d['单数'] = d['单']; d['单号'] = d['单'];
  d['双'] = '02 04 06 08 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48'; d['双数'] = d['双']; d['双号'] = d['双'];
  d['大'] = '25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49'; d['大数'] = d['大']; d['大号'] = d['大'];
  d['小'] = '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24'; d['小数'] = d['小']; d['小号'] = d['小'];
  d['小单'] = '01 03 05 07 09 11 13 15 17 19 21 23'; d['大单'] = '25 27 29 31 33 35 37 39 41 43 45 47 49';
  d['小双'] = '02 04 06 08 10 12 14 16 18 20 22 24'; d['大双'] = '26 28 30 32 34 36 38 40 42 44 46 48';
  d['合单'] = '01 03 05 07 09 10 12 14 16 18 21 23 25 27 29 30 32 34 36 38 41 43 45 47 49'; d['合数单'] = d['合单'];
  d['合双'] = '02 04 06 08 11 13 15 17 19 20 22 24 26 28 31 33 35 37 39 40 42 44 46 48'; d['合数双'] = d['合双'];
  d['合大'] = '07 08 09 16 17 18 19 25 26 27 28 29 34 35 36 37 38 39 43 44 45 46 47 48 49';
  d['合小'] = '01 02 03 04 05 06 10 11 12 13 14 15 20 21 22 23 24 30 31 32 33 40 41 42';
  d['红波'] = '01 02 07 08 12 13 18 19 23 24 29 30 34 35 40 45 46'; d['红'] = d['红波'];
  d['红小'] = '01 02 07 08 12 13 18 19 23 24'; d['红大'] = '29 30 34 35 40 45 46';
  d['红单'] = '01 07 13 19 23 29 35 45'; d['红双'] = '02 08 12 18 24 30 34 40 46';
  d['蓝波'] = '03 04 09 10 14 15 20 25 26 31 36 37 41 42 47 48'; d['蓝'] = d['蓝波']; d['兰波'] = d['蓝波']; d['兰'] = d['蓝波'];
  d['蓝小'] = '03 04 09 10 14 15 20'; d['蓝大'] = '25 26 31 36 37 41 42 47 48';
  d['蓝单'] = '03 09 15 25 31 37 41 47'; d['蓝双'] = '04 10 14 20 26 36 42 48';
  d['绿波'] = '05 06 11 16 17 21 22 27 28 32 33 38 39 43 44 49'; d['绿'] = d['绿波'];
  d['绿小'] = '05 06 11 16 17 21 22'; d['绿大'] = '27 28 32 33 38 39 43 44 49';
  d['绿单'] = '05 11 17 21 27 33 39 43 49'; d['绿双'] = '06 16 22 28 32 38 44';
  d['红波单'] = d['红单']; d['红波双'] = d['红双']; d['红波单数'] = d['红单']; d['红波双数'] = d['红双'];
  d['蓝波单'] = d['蓝单']; d['蓝波双'] = d['蓝双']; d['兰波单'] = d['蓝单']; d['兰波双'] = d['蓝双']; d['兰单'] = d['蓝单']; d['兰双'] = d['蓝双'];
  d['绿波单'] = d['绿单']; d['绿波双'] = d['绿双'];
  const tails = { 0: '10 20 30 40', 1: '01 11 21 31 41', 2: '02 12 22 32 42', 3: '03 13 23 33 43', 4: '04 14 24 34 44', 5: '05 15 25 35 45', 6: '06 16 26 36 46', 7: '07 17 27 37 47', 8: '08 18 28 38 48', 9: '09 19 29 39 49' };
  for (let i = 0; i <= 9; i++) d[i + '尾'] = tails[i];
  const cnT = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']; for (let i = 0; i <= 9; i++) d[cnT[i] + '尾'] = tails[i];
  d['小尾'] = '10 20 30 40 01 11 21 31 41 02 12 22 32 42 03 13 23 33 43 04 14 24 34 44';
  d['大尾'] = '05 15 25 35 45 06 16 26 36 46 07 17 27 37 47 08 18 28 38 48 09 19 29 39 49';
  const arr0 = []; for (let i = 1; i <= 9; i++) arr0.push(String(i).padStart(2, '0'));
  d['0头'] = arr0.join(' '); d['0头单'] = arr0.filter(n => parseInt(n) % 2 === 1).join(' '); d['0头双'] = arr0.filter(n => parseInt(n) % 2 === 0).join(' ');
  for (let h = 1; h <= 4; h++) { const arr = []; for (let i = 0; i < 10; i++) { const n = h * 10 + i; if (n <= 49) arr.push(String(n).padStart(2, '0')); } d[h + '头'] = arr.join(' '); d[h + '头单'] = arr.filter(n => parseInt(n) % 2 === 1).join(' '); d[h + '头双'] = arr.filter(n => parseInt(n) % 2 === 0).join(' '); }
  for (let [k, v] of Object.entries(AGE_TO_NUMS)) { d[k] = v; }
  const hes = { '1合': '01 10', '2合': '02 11 20', '3合': '03 12 21 30', '4合': '04 13 22 31 40', '5合': '05 14 23 32 41', '6合': '06 15 24 33 42', '7合': '07 16 25 34 43', '8合': '08 17 26 35 44', '9合': '09 18 27 36 45', '10合': '19 28 37 46', '11合': '29 38 47', '12合': '39 48', '13合': '49' };
  for (let [k, v] of Object.entries(hes)) d[k] = v;
  const cnHe = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三']; for (let i = 1; i <= 13; i++) d[cnHe[i - 1] + '合'] = hes[i + '合'];
  d['金'] = '04 05 12 13 26 27 34 35 42 43'; d['木'] = '08 09 16 17 24 25 38 39 46 47'; d['水'] = '01 14 15 22 23 30 31 44 45'; d['火'] = '02 03 10 11 18 19 32 33 40 41 48 49'; d['土'] = '06 07 20 21 28 29 36 37';
  d['反数'] = '12 13 14 21 23 24 31 32 34 41 42 43'; d['内围码'] = '09 10 11 12 13 16 17 18 19 20 23 24 25 26 27 30 31 32 33 34 37 38 39 40 41'; d['外围码'] = '01 02 03 04 05 06 07 08 14 15 21 22 28 29 35 36 42 43 44 45 46 47 48 49';
  d['前码'] = '01 02 03 04 05 06 07 08 17 18 19 20 21 22 23 24 33 34 35 36 37 38 39 40'; d['后码'] = '09 10 11 12 13 14 15 16 25 26 27 28 29 30 31 32 41 42 43 44 45 46 47 48 49';
  d['左边码'] = '01 02 03 04 08 09 10 11 15 16 17 18 22 23 24 29 30 31 36 37 38 43 44 45'; d['右边码'] = '05 06 07 12 13 14 19 20 21 25 26 27 28 32 33 34 35 39 40 41 42 46 47 48 49';
  d['楼上码'] = '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 25 26 27 28'; d['楼下码'] = '22 23 24 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49';
  d['风码'] = '03 04 06 08 11 13 14 15 17 19 23 24 26 27 31 33 35 36 37 39 42 44 46 47'; d['雨码'] = '01 02 05 07 09 10 12 16 18 20 21 22 25 28 29 30 32 34 38 40 41 43 45 48 49';
  d['深码'] = '01 02 03 07 08 09 13 14 15 19 20 21 25 26 27 31 32 33 37 38 39 43 44 45 49'; d['浅码'] = '04 05 06 10 11 12 16 17 18 22 23 24 28 29 30 34 35 36 40 41 42 46 47 48';
  d['拼码'] = '04 05 06 12 13 14 15 16 21 22 23 24 25 26 27 28 29 34 35 36 37 38 44 45 46'; d['搏码'] = '01 02 03 07 08 09 10 11 17 18 19 20 30 31 32 33 39 40 41 42 43 47 48 49';
  d['高码'] = '01 04 07 08 09 10 12 17 18 19 25 26 27 28 29 30 34 35 36 37 39 44 45 47 48'; d['低码'] = '02 03 05 06 11 13 14 15 16 20 21 22 23 24 31 32 33 38 40 41 42 43 46 49';
  d['长码'] = '01 05 06 07 08 09 13 14 15 16 17 21 22 23 24 25 30 31 32 38 39 40 46 47 48'; d['短码'] = '02 03 04 10 11 12 18 19 20 26 27 28 29 33 34 35 36 37 41 42 43 44 45 49';
  d['黑码'] = '01 02 05 06 09 10 13 14 17 18 21 22 25 26 29 30 33 34 37 38 41 42 45 46 49'; d['白码'] = '03 04 07 08 11 12 15 16 19 20 23 24 27 28 31 32 35 36 39 40 43 44 47 48';
  d['冷码'] = '01 02 04 05 10 11 12 13 19 20 21 22 28 29 30 31 37 38 39 40 45 46 48 49'; d['热码'] = '03 06 07 08 09 14 15 16 17 18 23 24 25 26 27 32 33 34 35 36 41 42 43 44 47';
  d['爱码'] = '01 05 06 07 08 09 10 13 14 15 16 17 18 19 21 25 26 27 28 30 38 39 46 47 48'; d['恨码'] = '02 03 04 11 12 20 22 23 24 29 31 32 33 34 35 36 37 40 41 42 43 44 45 49';
  d['顺码'] = '01 03 05 08 09 14 16 17 20 22 23 24 25 26 27 28 30 33 34 36 41 42 45 47 49'; d['逆码'] = '02 04 06 07 10 11 12 13 15 18 19 21 29 31 32 35 37 38 39 40 43 44 46 48';
  d['天码'] = '01 04 07 09 10 11 14 17 19 20 21 24 27 29 30 31 34 37 39 40 41 44 47 49'; d['地码'] = '02 03 05 06 08 12 13 15 16 18 22 23 25 26 28 32 33 35 36 38 42 43 45 46 48';
  return d;
}
const D = buildDict();
const KW_LIST = ['每一注', '每组各', '每个数', '各数', '各组', '每组', '每数', '每号', '各号', '号各', '各码', '各注', '个号', '个数', '组各', '各下', '各买', '一注', '个组', '每个', '各', '组', '注', '名', '=', '＝', '下', '买', '个', '共', '每', '打', '投', '号', '各号码', '每个号', '每个号码', '个号码', '各号各', '个号各', '每号', '每号码'];

function keyToAllNums(key) { if (!D[key]) return []; const val = D[key]; if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) { const ns = []; for (const z of val) { if (ZODIAC_NUMS[z]) { ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => ns.push(n)); } } return ns.sort((a, b) => parseInt(a) - parseInt(b)); } return val.split(/[\s,，]+/).filter(n => n.trim()); }
function toNum(s) { if (!s) return 0; s = String(s).trim(); if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s); const m = { 零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 贰: 2, 两: 2, 三: 3, 叁: 3, 四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陆: 6, 七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9 }; const u = { 十: 10, 拾: 10, 百: 100, 佰: 100, 千: 1000, 仟: 1000, 万: 10000 }; let r = 0, c = 0, t = 0; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (m[ch] !== undefined) { t = m[ch]; } else if (u[ch] !== undefined) { const ut = u[ch]; if (t === 0 && (ch == '十' || ch == '拾')) t = 1; if (ut >= 10000) { c = (c + t) * ut; r += c; c = 0; } else { c += t * ut; } t = 0; } } r += c + t; return r || 0; }
function sortNDash(s) { const ns = s.split('-').map(n => parseInt(n)).filter(n => !isNaN(n)); ns.sort((a, b) => a - b); return ns.map(n => String(n).padStart(2, '0')).join('-'); }
function sortZ(s) { const cs = s.split(''); cs.sort((a, b) => ZODIAC.indexOf(a) - ZODIAC.indexOf(b)); return cs.join(''); }
function combos(arr, k) { const res = []; function bt(st, cur) { if (cur.length === k) { res.push([...cur]); return; } for (let i = st; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); } } bt(0, []); return res; }
function combosNoSort(arr, k) { const res = []; function bt(st, cur) { if (cur.length === k) { res.push([...cur]); return; } for (let i = st; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); } } bt(0, []); return res; }
function zCombos(zStr, k) { const cs = zStr.split(''); return combos(cs, k).map(c => sortZ(c.join(''))); }
function zCombosKeepOrder(zStr, k) { const cs = zStr.split(''); return combosNoSort(cs, k).map(c => c.join('')); }
function tailC(tStr, k) { const ns = tStr.split(/[,\-，]/).filter(n => n.trim()); return combos(ns, k).map(c => { const s = c.slice().sort((a, b) => parseInt(a) - parseInt(b)); return s.map(d => d + '尾').join('-'); }); }
function tailCKeepOrder(tStr, k) { const ns = tStr.split(/[,\-，]/).filter(n => n.trim()); return combosNoSort(ns, k).map(c => c.join('尾-') + '尾'); }
function zodiacToNums(zStr) { const ns = []; for (const z of zStr) { if (D[z]) D[z].split(/[\s,，]+/).forEach(n => ns.push(n)); } return ns.sort((a, b) => parseInt(a) - parseInt(b)); }
function extractNums(txt) { return (txt.match(/\d+/g) || []).map(n => parseInt(n)).filter(n => n >= 1 && n <= 49).map(n => String(n).padStart(2, '0')); }
function extractZodiacs(txt) { return (txt.match(new RegExp(`[${ZODIAC}]`, 'g')) || []); }
function findInvalidNums(txt) { if (!txt) return []; const allNums = (txt.match(/\d+/g) || []).map(n => parseInt(n)); return allNums.filter(n => n > 49); }

// ===== 预构建玩法名正则（模块顶层只执行一次） =====
const PLAY_NAMES_LIST = [
    '连肖', '连尾', '二中二', '三中三', '特碰', '不中',
    '平特肖', '平特尾', '特肖', '特码', '平码'
];

function buildPlayPatterns() {
    const patterns = [];
    for (const name of PLAY_NAMES_LIST) {
        patterns.push(name);
        for (let i = 2; i <= 5; i++) {
            patterns.push(i + name);
        }
    }
    patterns.sort((a, b) => b.length - a.length);
    return patterns;
}

// 预生成一个用于删除玩法名后标点的正则（避免每次都重新构建）
const _playPunctPatterns = buildPlayPatterns();
const _playPunctRegex = new RegExp(
    `(${_playPunctPatterns.join('|')})[，。！？；：、,\\.\\!\\?;:]`,
    'g'
);

function step_removePlayPunctuation(txt) {
    return txt.replace(_playPunctRegex, '$1');
}

// ===== 预处理主函数（整合后） =====
function preprocess(txt) {
  let c = txt;
  c = c.replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // ===== 字符容错：o/O -> 0，l/i/I/！/! -> 1 =====
  c = c.replace(/[oO]/g, '0');
  c = c.replace(/[liI！!]/g, '1');

  // ===== 修复5：中文标点处理 =====
  const moneyKwPart = `(?:${KW_LIST.join('|')})`;
  const moneySuffixPart = '(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)';
  c = c.replace(/(\d) ([。！？；，])/g, '$1$2');
  const reMoneyKw = new RegExp(`(${moneyKwPart}\\s*\\d+(?:\\.\\d+)?)\\s*([。！？；，])`, 'g');
  c = c.replace(reMoneyKw, '$1\n');
  const reMoneySuffix = new RegExp(`(\\d+(?:\\.\\d+)?\\s*${moneySuffixPart})\\s*([。！？；，])`, 'g');
  c = c.replace(reMoneySuffix, '$1\n');
  c = c.replace(/[。！？；，]/g, ' ');

  // ===== 新增：删除玩法名后面紧跟的标点符号 =====
  c = step_removePlayPunctuation(c);

  const reps = {
    夏式: '复式', 復式: '复式', 复制: '复式', 復制: '复式', 复习: '复式', 复试: '复式', 复示: '复式', 覆式: '复式', 複试: '复式',
    友: '有', 尤: '龙', 虑: '虎', 坡: '波', 午: '牛', 綠: '绿', 孑: '子', 监: '蓝', 俏: '肖', 串肖: '连肖', '连/肖': '连肖',
    一连肖: '平特肖', 一连: '平特', '⑤': '5', '|': '1', 肉: '', 藍: '蓝', 录: '绿', 碌: '绿', 禄: '绿', 啵: '波', '○': '0', σ: '0', 莲: '连', 联: '连',
    连消: '连肖', 车肖: '连肖', 拾: '十', 佰: '百', 仟: '千', 大数: '大', 来: '下', 单号: '单', 双号: '双', 大号: '大', 小号: '小',
    家肖: '家禽', 野肖: '野兽', 老鼠: '鼠', 老虎: '虎', '双数数字': '双', 和数单: '合数单', 和数: '合数', 小数: '小', 双数: '双',
    单数: '单', 合数小: '合小', 合数大: '合大', '≡': '三', 山: '三', 俩: '二', 毎: '每', 五中四: '复式4肖', 二全中: '二中二',
    三全中: '三中三', 復制: '复式', 鳮: '鸡', 単: '单', 組: '组', 平待: '平特', 泼: '波', 肖连: '连肖', 消: '肖', '〇': '0',
    l: '1', I: '1', 壹: '一', 贰: '二', 叁: '三', 肆: '四', 陆: '六', 柒: '七', 捌: '八', 玖: '九', 伍: '五', 免: '兔', 拘: '狗',
    馬: '马', 龍: '龙', 雞: '鸡', 豬: '猪', 候: '猴', 侯: '猴', 兔子: '兔', 猴子: '猴', 子: '鼠', 老蛇: '蛇',
    // ===== 新增生僻字 / 异体字容错 =====
    '𤠣': '猴', '竜': '龙', '鷄': '鸡', '猎': '猪',
    // ===== 新增：二中二复容错 =====
    '二中二复': '复式二中二', '二中二复式': '复式二中二',
    // 波色大小
    '红波小': '红小', '红波大': '红大', '绿波小': '绿小', '绿波大': '绿大',
    '蓝波小': '蓝小', '兰小': '蓝小', '兰波小': '蓝小',
    '蓝波大': '蓝大', '兰大': '蓝大', '兰波大': '蓝大',
    // 尾数
    '尾数小': '小尾', '尾数大': '大尾',
    // 平特
    '平特一肖': '平特肖', '平特二肖': '平特肖', '平特三肖': '平特肖',
    // 复式连肖
    '复试三肖': '复式三连肖', '三肖复式': '三连肖复式',
    // 复式连尾
    '复试三尾': '复式三连尾', '三尾复式': '三连尾复式', '复3尾': '复三尾', '复三尾': '复式三连尾',
    // 二中二
    '复试二中二': '复式二中二', '二中二复试': '复式二中二', '2中2复试': '复式二中二', '复试2中2': '复式二中二',
    // 三中三
    '复试三中三': '复式三中三', '三中三复试': '复式三中三', '3中3复试': '复式三中三', '复试3中3': '复式三中三',
    // 其他
    '三三二二串': '复三复二', '三三二二': '复三复二', '家属': '家肖',
    '复3': '复三', '复三': '复式三', '复3尾': '复三尾'
  };
  for (const [k, v] of Object.entries(reps)) c = c.split(k).join(v);
  ['天天彩', '天天采', '天天', '天彩', '天采', '总单'].forEach(s => c = c.split(s).join(''));
  c = c.replace(/澳门\d+期/g, '');
  c = c.replace(/[。！？；]/g, ' ');
  c = c.replace(/[^\dA-Za-z\u4e00-\u9fa5\s,\-，\=＝\.]/g, ' ');
  c = c.replace(/\n/g, '[[[NL]]]');
  c = c.replace(/[\s]{2,}/g, ' ');
  c = c.replace(/\[\[\[NL\]\]\]/g, '\n');
  
  // 头数连写
  c = c.replace(/((?:\d[\s,，.。、+\-*＊\/\\|]*)+)头/g, (match, digits) => {
    const nums = (digits.match(/\d/g) || []);
    if (nums.length >= 2) return nums.map(n => n + '头').join('-');
    return match;
  });
  // 尾数连写
  c = c.replace(/((?:\d[\s,，.。、+\-*＊\/\\|]*)+)尾/g, (match, digits) => {
    const nums = (digits.match(/\d/g) || []);
    if (nums.length >= 2) return nums.map(n => n + '尾').join('-');
    return match;
  });
  
  return c.trim();
}