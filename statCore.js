// ===== statCore.js - 全局统计数据累加（tableBetData、numberCount 等）、主更新逻辑 =====

function clearMemoryData() {
  tableBetData = {};
  userBetData = {};
  reportBetData = {};
  reportAmountData = {};
  reportRiskData = {};
  numberCount = {};
  zodiacCount = {};
  numberAmountCount = {};
  zodiacAmountCount = {};
  zodiacDirectAmount = {};
  zodiacFilteredAmount = {};
  zodiacReportAmount = {};
  zodiacFilteredReportAmount = {};
  numberOrderTotal = 0;
  zodiacWeightedTotal = 0;
  originalOrderAmount = {};
  directOrderAmount = {};
  directReportAmount = {};
  orderCountAll = 0;
}

function rebuildTotal() {
  tableBetData = {};
  for (const u in userBetData) {
    for (const n in userBetData[u]) {
      tableBetData[n] = (tableBetData[n] || 0) + userBetData[u][n];
    }
  }
}

function refreshAll() {
  updateSelects();
  updateTableFromRecords();
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

    tableBetData = {};
    userBetData = {};
    reportBetData = {};
    reportAmountData = {};
    reportRiskData = {};
    numberCount = {};
    zodiacCount = {};
    numberAmountCount = {};
    zodiacAmountCount = {};
    zodiacDirectAmount = {};
    zodiacFilteredAmount = {};
    zodiacReportAmount = {};
    zodiacFilteredReportAmount = {};
    numberOrderTotal = 0;
    zodiacWeightedTotal = 0;
    orderCountAll = 0;
    originalOrderAmount = {};
    directOrderAmount = {};
    directReportAmount = {};

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
      } catch (e) {}
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
      } catch (e) {}
    });

    generateRiskTable();
    generateReportTable();
    renderFrequencyCards();
    renderAmountFrequencyCards();
    renderReportAmountTable();
    renderOriginalAmountTable();
    updateReportAmountTotal();
    updateAmountDisplays();
    renderPingtexiaoTable();
    updatePingtexiaoTotal();
    calculateStorageUsage();
    renderSmartDecision();
    updateSingleBetDisplay();
    updateOrderCountDisplay();
  } catch (e) {}
}