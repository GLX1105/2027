// ===== statCore.js - 全局统计数据累加（tableBetData、numberCount 等） =====

// 全局数据状态
let tableBetData = {}, userBetData = {}, reportBetData = {}, reportAmountData = {}, reportRiskData = {};
let numberCount = {}, zodiacCount = {}, numberAmountCount = {}, zodiacAmountCount = {};
let zodiacDirectAmount = {}, zodiacFilteredAmount = {};
let zodiacReportAmount = {}, zodiacFilteredReportAmount = {};
let numberOrderTotal = 0, zodiacWeightedTotal = 0;
let originalOrderAmount = {};
let directOrderAmount = {};
let directReportAmount = {};
let orderCountAll = 0;

// 分层缓存
const statsCache = new Map();
function getCacheKey(region, date, filterUser) { return `${region}|${date}|${filterUser || 'all'}`; }
function clearStatsCache() { statsCache.clear(); }

function clearMemoryData() {
  tableBetData = {}; userBetData = {}; reportBetData = {}; reportAmountData = {}; reportRiskData = {};
  numberCount = {}; zodiacCount = {}; numberAmountCount = {}; zodiacAmountCount = {};
  zodiacDirectAmount = {}; zodiacFilteredAmount = {};
  zodiacReportAmount = {}; zodiacFilteredReportAmount = {};
  numberOrderTotal = 0; zodiacWeightedTotal = 0;
  originalOrderAmount = {}; directOrderAmount = {}; directReportAmount = {};
}

async function updateTableFromRecords() {
  try {
    const fd = document.getElementById('filterDate')?.value;
    const recs = await getOrderRecords();
    const reps = await getReportOrderRecords();
    const riskSwitcher = document.getElementById('riskReportSwitcher')?.value || 'total';
    const viewUser = document.getElementById('viewUserSelect')?.value;
    let filterUser = null;
    if (riskSwitcher === 'user' && viewUser) { filterUser = viewUser; }

    tableBetData = {}; userBetData = {}; reportBetData = {}; reportAmountData = {}; reportRiskData = {};
    numberCount = {}; zodiacCount = {}; numberAmountCount = {}; zodiacAmountCount = {};
    zodiacDirectAmount = {}; zodiacFilteredAmount = {};
    zodiacReportAmount = {}; zodiacFilteredReportAmount = {};
    numberOrderTotal = 0; zodiacWeightedTotal = 0; orderCountAll = 0;
    originalOrderAmount = {}; directOrderAmount = {}; directReportAmount = {};
    const nMin = parseInt(document.getElementById('numAmountMin')?.value) || 1;
    const nMax = parseInt(document.getElementById('numAmountMax')?.value) || 50000;
    const zMin = parseInt(document.getElementById('zodiacAmountMin')?.value) || 1;
    const zMax = parseInt(document.getElementById('zodiacAmountMax')?.value) || 50000;
    const curZod = localStorage.getItem('selectedStartZodiac') || '马';
    const fRecs = fd ? recs.filter(r => r.date === fd) : recs;
    const fReps = fd ? reps.filter(r => r.date === fd) : reps;
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

    fRecsFiltered.forEach(rec => {
      try {
        if (!userBetData[rec.user]) userBetData[rec.user] = {};
        rec.content.split('\n').filter(l => l.trim()).forEach(line => {
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
      } catch(e) {}
    });

    fRepsFiltered.forEach(rec => {
      try {
        const user = rec.user;
        rec.content.split('\n').filter(l => l.trim()).forEach(line => {
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
      } catch(e) {}
    });

    generateRiskTable(); generateReportTable(); renderFrequencyCards(); renderAmountFrequencyCards();
    renderReportAmountTable(); renderOriginalAmountTable(); updateReportAmountTotal(); updateAmountDisplays();
    renderPingtexiaoTable(); updatePingtexiaoTotal();
    calculateStorageUsage(); renderSmartDecision(); updateSingleBetDisplay(); updateOrderCountDisplay();
  } catch(e) {}
}

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

function updateReportAmountTotal() {
  const box = document.getElementById('reportAmountTotalBox');
  const span = document.getElementById('reportAmountTotalValue');
  let total = 0;
  for (let n in reportAmountData) total += reportAmountData[n] || 0;
  if (total > 0) { span.textContent = total; box.style.display = 'inline-flex'; } else { box.style.display = 'none'; }
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
    const tr = document.createElement('tr'); tr.className = cls;
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
    const tr = document.createElement('tr'); tr.className = cls;
    tr.innerHTML = `<td>${num}${currentZodiacMap[num] || ''}</td><td>${bet}</td><td>${risk}<td>${num}</td><td>${idx + 1}</td>`;
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
      try { const item = new ClipboardItem({ 'image/png': blob }); await navigator.clipboard.write([item]); showToast('截图已复制'); }
      catch(e) { showToast('复制失败'); }
    }, 'image/png');
  } catch(e) { showToast('截图失败'); }
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
      } else { tb += '<td></td><td></td><td></td><td></td>'; }
    }
    tb += '</tr>';
  }
  tb += '</tbody>';
  tbl.innerHTML = th + tb;
  updateDirectAmountTotals();
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
  renderFrequencyCards(); renderAmountFrequencyCards(); renderReportAmountTable(); renderOriginalAmountTable();
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

// ===== 赔率弹窗（原有代码迁移到 odds.js，此处保留引用） =====
// showOddsWin, resetOddsToDefault, enableOddsEdit, getOddsData, saveOddsData, getOddsForType 已在 odds.js 中定义

// ===== 日期切换相关辅助 =====
function switchRiskReport() {
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
  updateTableFromRecords();
}