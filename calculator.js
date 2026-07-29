/* ===== calculator.js - 金额计算纯函数（合计、盈亏、项目数统计） ===== */

function countItemsInLine(line) {
  const teXiaoMatch = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
  if (teXiaoMatch) {
    const zodiacsStr = teXiaoMatch[1];
    const amt = parseInt(teXiaoMatch[2]) || 0;
    const zodiacs = zodiacsStr.split('-').map(z => z.trim()).filter(z => z);
    return { numbers: [], zodiacs: zodiacs, amount: amt, playType: '特肖', zodiacCount: zodiacs.length };
  }
  
  const baoMatch = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
  if (baoMatch) {
    const attr = baoMatch[2].trim();
    const amt = parseInt(baoMatch[3]) || 0;
    return { numbers: [], zodiacs: [], amount: amt, playType: '包' + attr };
  }

  const tepengMatch = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
  if (tepengMatch) {
    const content = tepengMatch[1].trim();
    const amt = parseInt(tepengMatch[2]) || 0;
    const groups = content.split(/\s+/).filter(g => g.trim());
    const nums = [];
    groups.forEach(g => {
      const cleaned = g.replace(/[()]/g, '');
      const tokens = cleaned.split('-');
      tokens.forEach(t => {
        if (/^\d{2}$/.test(t)) nums.push(t);
      });
    });
    return { numbers: nums, zodiacs: [], amount: amt, playType: '特碰' };
  }
  
  const newMatch = line.match(/^(.+?):(.+?)\s+(各(?:数|))\s*(\d+)$/);
  if (newMatch) {
    const playType = newMatch[1];
    const content = newMatch[2];
    const amt = parseInt(newMatch[4]) || 0;
    if (playType !== '特码') {
      return { numbers: [], zodiacs: [], amount: 0, playType };
    }
    const items = content.split('-').map(i => i.trim()).filter(i => i);
    const nums = [];
    const zods = [];
    items.forEach(item => {
      if (/^\d{2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item);
      } else if (/^\d$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item.padStart(2, '0'));
      } else if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
        zods.push(item);
        ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0')));
      } else if (D[item]) {
        const val = D[item];
        if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
          if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
            zods.push(item);
            ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0')));
          } else {
            for (const z of val) {
              if (ZODIAC_NUMS[z]) {
                zods.push(z);
                ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0')));
              }
            }
          }
        } else {
          val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0')));
        }
      }
    });
    return { numbers: nums, zodiacs: [...new Set(zods)], amount: amt, playType };
  }
  const oldMatch = line.match(/^(.+?)\s+各(?:数|)\s*(\d+)$/);
  if (oldMatch) {
    const content = oldMatch[1];
    const amt = parseInt(oldMatch[2]) || 0;
    const items = content.split('-').map(i => i.trim()).filter(i => i);
    const nums = [];
    const zods = [];
    items.forEach(item => {
      if (/^\d{2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item);
      } else if (/^\d$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item.padStart(2, '0'));
      } else if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
        zods.push(item);
        ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0')));
      } else if (D[item]) {
        const val = D[item];
        if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
          if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
            zods.push(item);
            ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0')));
          } else {
            for (const z of val) {
              if (ZODIAC_NUMS[z]) {
                zods.push(z);
                ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => nums.push(n.padStart(2, '0')));
              }
            }
          }
        } else {
          val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => nums.push(n.padStart(2, '0')));
        }
      }
    });
    return { numbers: nums, zodiacs: [...new Set(zods)], amount: amt };
  }
  return { numbers: [], zodiacs: [], amount: 0 };
}

function calcOrderTotal(pureLines) {
  if (!pureLines || pureLines.length === 0) return 0;
  let total = 0;
  pureLines.forEach(line => {
    if (line.startsWith('特肖:')) {
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if (match) {
        const zodiacs = match[1].split('-').filter(z => z.trim());
        const amt = parseInt(match[2]) || 0;
        total += zodiacs.length * amt;
      }
    } else if (line.startsWith('特碰:')) {
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if (match) {
        const cleaned = match[1].replace(/[()]/g, '');
        const groups = cleaned.split(/\s+/).filter(c => c.trim());
        total += groups.length * (parseInt(match[2]) || 0);
      }
    } else if (line.startsWith('包')) {
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) {
        total += parseInt(match[3]) || 0;
      }
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
  return total;
}

function processCurrentOrder(input, user, isNormal, date = null) {
  const lines = input.split('\n').filter(l => l.trim());
  lines.forEach(line => {
    if (/^特肖:(.+?)\s+各\s*(\d+)$/.test(line)) orderCountAll++;
    else if (/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/.test(line)) orderCountAll++;
    else if (/^包.+?:(.+?)\s+各\s*(\d+)$/.test(line)) orderCountAll++;
    else if (/^特碰:(.+?)\s+各\s*(\d+)$/.test(line)) orderCountAll++;
    else {
      const { amount, playType } = countItemsInLine(line);
      if (amount > 0 && (!playType || playType === '特码')) orderCountAll++;
    }
  });
  updateTableFromRecords();
}