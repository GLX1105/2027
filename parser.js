// ===== parser.js - 订单识别引擎 =====

// ===== 识别所需的全局正则组件 =====
const SEP_CHARS = '[\\s,，.。、+\\-*＊\\/\\\\|]+';
const SEP = SEP_CHARS;
const AMT_RE_STR = '\\d+|[一二三四五六七八九十百千两]+';
const AMT_GROUP = `(${AMT_RE_STR})`;
const KW_GROUP = `(${KW_LIST.join('|')})`;
const END_AMT_RE = new RegExp(`(${KW_GROUP})?${SEP}?${AMT_GROUP}\\s*$`);

function extractAmtAndKw(text) {
  const kwMatch = text.match(new RegExp(`(${KW_LIST.join('|')})`));
  const kw = kwMatch ? kwMatch[1] : '';
  const amtMatch = text.match(/(\d+|[一二三四五六七八九十百千两]+)\s*$/);
  const amt = amtMatch ? toNum(amtMatch[1]) : 0;
  return { amt, kw };
}

function collectSpecialMatches(text) {
  const Z = ZODIAC;
  const allMatches = [];

  function isOverlap(start, end, intervals) {
    return intervals.some(iv => start < iv.end && end > iv.start);
  }

  function itemsToNums(items) {
    const nums = [];
    for (const item of items) {
      if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]+$/.test(item)) {
        for (const ch of item) {
          if (ZODIAC_NUMS[ch]) nums.push(...ZODIAC_NUMS[ch].split(/[\s,，]+/));
        }
      } else if (/^\d+尾$/.test(item)) {
        const d = item.replace('尾', '');
        if (D[d + '尾']) nums.push(...D[d + '尾'].split(/[\s,，]+/));
      } else if (/^\d{1,2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(String(parseInt(item)).padStart(2, '0'));
      }
    }
    return [...new Set(nums)].sort((a, b) => parseInt(a) - parseInt(b));
  }

  function handleDragMatch(leftPart, rightPart, amt, kw, catName) {
    const leftItems = leftPart.split(new RegExp(SEP_CHARS + '+')).filter(s => s.trim());
    const rightItems = rightPart.split(new RegExp(SEP_CHARS + '+')).filter(s => s.trim());
    if (leftItems.length === 0 || rightItems.length === 0) return null;
    const leftNums = itemsToNums(leftItems);
    const rightNums = itemsToNums(rightItems);
    if (leftNums.length === 0 || rightNums.length === 0) return null;
    const pairs = [];
    for (const a of leftNums) {
      for (const b of rightNums) {
        if (a !== b) pairs.push(a + '-' + b);
      }
    }
    if (pairs.length === 0) return null;
    const warnings = [];
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: catName || '二中二', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  }

  const multiMatches = [];
  const lockedIntervals = [];

  // ===== 修复6：连肖无关键字整行及带关键字版本 (优先级最高) =====
  const reLianXiaoNoKw = new RegExp(
      `^[\\s]*((?:[${Z}]+))[\\s]*([二三四五2345两])` +
      `(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)` +
      `[\\s]*(?:(${KW_GROUP})\\s*)?(${AMT_GROUP})\\s*$`,
      'gm'
  );
  let mLX;
  while ((mLX = reLianXiaoNoKw.exec(text)) !== null) {
      const full = mLX[0].trim();
      const zPart = mLX[1];
      const k = toNum(mLX[2].replace(/[^0-9二三四五两]/g, ''));
      if (!k || k < 2 || k > 5) continue;
      const kw = mLX[4] || '';
      const amt = toNum(mLX[5] || mLX[6]);
      if (!amt || amt <= 0) continue;
      const zChars = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []).join('');
      if (zChars.length !== k) {
          const warnings = [`${zChars}：连肖数(${k})与生肖数(${zChars.length})不匹配`];
          multiMatches.push({ start: mLX.index, end: mLX.index + mLX[0].length, result: { cat: k + '连肖', nums: [], amt, cnt: 0, total: 0, kw, warnings } });
          lockedIntervals.push({ start: mLX.index, end: mLX.index + mLX[0].length });
          continue;
      }
      const comb = zCombosKeepOrder(zChars, k);
      const warnings = [];
      if (!kw && comb.length > 1) warnings.push('缺少金额关键字');
      multiMatches.push({ start: mLX.index, end: mLX.index + mLX[0].length, result: { cat: k + '连肖', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw: kw || '各组', warnings } });
      lockedIntervals.push({ start: mLX.index, end: mLX.index + mLX[0].length });
  }

  // ===== 修复6补：玩法在前，生肖在后的无关键字连肖 =====
  const reLianXiaoNoKw2 = new RegExp(
      `^[\\s]*([二三四五2345两])` +
      `(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)` +
      `[\\s，,]*((?:[${Z}]+))\\s*(${AMT_GROUP})\\s*$`,
      'gm'
  );
  let mLX2;
  while ((mLX2 = reLianXiaoNoKw2.exec(text)) !== null) {
      if (isOverlap(mLX2.index, mLX2.index + mLX2[0].length, lockedIntervals)) continue;
      const k = toNum(mLX2[1].replace(/[^0-9二三四五两]/g, ''));
      if (!k || k < 2 || k > 5) continue;
      const zPart = mLX2[2];
      const amt = toNum(mLX2[3] || mLX2[4]);
      if (!amt || amt <= 0) continue;
      const zChars = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []).join('');
      if (zChars.length !== k) {
          const warnings = [`${zChars}：连肖数(${k})与生肖数(${zChars.length})不匹配`];
          multiMatches.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length, result: { cat: k + '连肖', nums: [], amt, cnt: 0, total: 0, kw: '', warnings } });
          lockedIntervals.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length });
          continue;
      }
      const comb = zCombosKeepOrder(zChars, k);
      const warnings = [];
      if (comb.length > 1) warnings.push('缺少金额关键字');
      multiMatches.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length, result: { cat: k + '连肖', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw: '各组', warnings } });
      lockedIntervals.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length });
  }

  const reMultiLX = new RegExp(`([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)${SEP}((?:[${Z}]+${SEP_CHARS}+)+[${Z}]+)[\\s]*(?=${KW_GROUP})${KW_GROUP}${SEP}${AMT_GROUP}`, 'g');
  let m;
  while ((m = reMultiLX.exec(text)) !== null) {
    const full = m[0];
    const { amt, kw } = extractAmtAndKw(full);
    if (!amt || amt <= 0) continue;
    const k = toNum(m[1].replace(/[^0-9二三四五两]/g, ''));
    if (!k || k < 2 || k > 5) continue;
    const zPart = m[2];
    const groups = zPart.split(new RegExp(SEP_CHARS + '+')).filter(g => g.trim().length >= k);
    if (groups.length <= 1) continue;
    const allCombos = [];
    for (const zg of groups) {
      const zChars = zg.trim();
      if (zChars.length === k) {
        allCombos.push(...zCombosKeepOrder(zChars, k));
      }
    }
    if (allCombos.length === 0) continue;
    const warnings = [];
    if (allCombos.length > 1 && !kw) warnings.push('缺少金额关键字');
    multiMatches.push({
      start: m.index,
      end: m.index + m[0].length,
      result: { cat: k + '连肖', nums: allCombos, amt, cnt: allCombos.length, total: amt * allCombos.length, kw, warnings }
    });
    lockedIntervals.push({ start: m.index, end: m.index + m[0].length });
  }

  const reMultiLW = new RegExp(`([二三四五2345])(?:连尾|尾连)${SEP}((?:\\d+尾${SEP_CHARS}+)+\\d+尾)[\\s]*(?=${KW_GROUP})${KW_GROUP}${SEP}${AMT_GROUP}`, 'g');
  while ((m = reMultiLW.exec(text)) !== null) {
    const full = m[0];
    const { amt, kw } = extractAmtAndKw(full);
    if (!amt || amt <= 0) continue;
    const k = toNum(m[1]);
    if (!k || k < 2 || k > 5) continue;
    const tailPart = m[2];
    const groups = tailPart.split(new RegExp(SEP_CHARS + '+')).filter(g => g.trim().length > 0);
    if (groups.length <= 1) continue;
    const allCombos = [];
    for (const g of groups) {
      const digits = (g.match(/\d/g) || []);
      if (digits.length === k) {
        allCombos.push(...tailCKeepOrder(digits.join(','), k));
      }
    }
    if (allCombos.length === 0) continue;
    const warnings = [];
    if (allCombos.length > 1 && !kw) warnings.push('缺少金额关键字');
    multiMatches.push({
      start: m.index,
      end: m.index + m[0].length,
      result: { cat: k + '连尾', nums: allCombos, amt, cnt: allCombos.length, total: amt * allCombos.length, kw, warnings }
    });
    lockedIntervals.push({ start: m.index, end: m.index + m[0].length });
  }

  const addMatch = (re, handler) => {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (isOverlap(m.index, m.index + m[0].length, lockedIntervals)) continue;
      const info = handler(m);
      if (info) {
        allMatches.push({ start: m.index, end: m.index + m[0].length, result: info });
      }
    }
  };

  // ===== 特肖前缀识别 =====
  addMatch(new RegExp(`特肖${SEP}((?:[${Z}]+${SEP_CHARS}*)+?)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full);
    if (!amt || amt <= 0) return null;
    const zPart = m[1]; const zodiacs = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []);
    if (zodiacs.length === 0) return null;
    const warnings = [];
    if (zodiacs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '特肖', nums: zodiacs, amt, cnt: zodiacs.length, total: amt * zodiacs.length, kw: kw || '各', warnings };
  });

  // ===== 包玩法识别 =====
  const BAO_ATTRS = ['红波','蓝波','绿波','红单','红双','蓝单','蓝双','绿单','绿双','红大','红小','蓝大','蓝小','绿大','绿小','单','双','大','小','家禽','野兽'];
  const BAO_ATTRS_SORTED = [...BAO_ATTRS].sort((a, b) => b.length - a.length);
  addMatch(new RegExp(`包${SEP}(${BAO_ATTRS_SORTED.join('|')})\\s*(\\d+)`, 'g'), m => {
    const full = m[0]; const attr = m[1]; const amt = toNum(m[2]);
    if (!amt || amt <= 0) return null;
    if (full.includes('各')) return { cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['包玩法不允许使用"各"关键字'], rawLine: full };
    return { cat: '包' + attr, nums: [attr], amt, cnt: 1, total: amt, kw: '各' };
  });

  // ===== 特碰：碰法 =====
  addMatch(new RegExp(`特碰${SEP}((?:[${Z}]+|\\d+尾|\\d{1,2})(?:${SEP_CHARS}+(?:[${Z}]+|\\d+尾|\\d{1,2}))*)${SEP_CHARS}*(?:碰)${SEP_CHARS}*((?:[${Z}]+|\\d+尾|\\d{1,2})(?:${SEP_CHARS}+(?:[${Z}]+|\\d+尾|\\d{1,2}))*?)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const leftPart = m[1], rightPart = m[2];
    return handleDragMatch(leftPart, rightPart, amt, kw, '特碰');
  });

  // 二中二拖法
  addMatch(new RegExp(`[二2]中[二2]${SEP}((?:[${Z}]+|\\d+尾|\\d{1,2})(?:${SEP_CHARS}+(?:[${Z}]+|\\d+尾|\\d{1,2}))*)${SEP_CHARS}*(?:拖|托)${SEP_CHARS}*((?:[${Z}]+|\\d+尾|\\d{1,2})(?:${SEP_CHARS}+(?:[${Z}]+|\\d+尾|\\d{1,2}))*?)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const leftPart = m[1], rightPart = m[2];
    return handleDragMatch(leftPart, rightPart, amt, kw, '二中二');
  });

  // 复式二中二
  addMatch(new RegExp(`复[式试]?[二2]中[二2]${SEP}((?:\\d+${SEP_CHARS}+)+\\d+)(?!${SEP_CHARS}*[拖托碰])[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const pairs = combosNoSort(nums, 2).map(c => c.join('-'));
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '二中二', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  });

  // 非复式二中二
  addMatch(new RegExp(`[二2]中[二2]${SEP}((?:\\d{1,2}${SEP_CHARS}+\\d{1,2}${SEP_CHARS}*)+)(?!${SEP_CHARS}*[拖托碰])[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const numPart = m[1]; const invalidNums = findInvalidNums(numPart);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const pairs = [];
    const pr = new RegExp(`(\\d{1,2})${SEP_CHARS}+(\\d{1,2})`, 'g');
    let pm;
    while ((pm = pr.exec(numPart)) !== null) {
      pairs.push(pm[1] + '-' + pm[2]);
    }
    if (pairs.length === 0) {
      const nums = extractNums(numPart);
      if (nums.length % 2 !== 0 || nums.length === 0) {
        warnings.push(`号码数(${nums.length})与二中二不匹配`);
        return { cat: '二中二', nums: [], amt, cnt: 0, total: 0, kw, warnings };
      }
      const uniq = [...new Set(nums)].sort((a, b) => parseInt(a) - parseInt(b));
      combosNoSort(uniq, 2).forEach(c => pairs.push(c.join('-')));
    }
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '二中二', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  });

  // ===== 特碰：复式 =====
  addMatch(new RegExp(`复[式试]?特碰${SEP}((?:\\d+${SEP_CHARS}+)+\\d+)(?!${SEP_CHARS}*[拖托碰])[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const pairs = combosNoSort(nums, 2).map(c => c.join('-'));
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '特碰', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  });

  // ===== 特碰：数字直接配对 =====
  addMatch(new RegExp(`特碰${SEP}((?:\\d{1,2}${SEP_CHARS}+\\d{1,2}${SEP_CHARS}*)+)(?!${SEP_CHARS}*[拖托碰])[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const numPart = m[1]; const invalidNums = findInvalidNums(numPart);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const pairs = [];
    const pr = new RegExp(`(\\d{1,2})${SEP_CHARS}+(\\d{1,2})`, 'g');
    let pm;
    while ((pm = pr.exec(numPart)) !== null) {
      pairs.push(pm[1] + '-' + pm[2]);
    }
    if (pairs.length === 0) {
      const nums = extractNums(numPart);
      if (nums.length % 2 !== 0 || nums.length === 0) {
        warnings.push(`号码数(${nums.length})与特碰不匹配`);
        return { cat: '特碰', nums: [], amt, cnt: 0, total: 0, kw, warnings };
      }
      const uniq = [...new Set(nums)].sort((a, b) => parseInt(a) - parseInt(b));
      combosNoSort(uniq, 2).forEach(c => pairs.push(c.join('-')));
    }
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '特碰', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  });

  // 复式三中三
  addMatch(new RegExp(`复[式试]?[三3]中[三3]${SEP}((?:\\d+${SEP_CHARS}+)+\\d+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const triples = combosNoSort(nums, 3).map(c => c.join('-'));
    if (triples.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '三中三', nums: triples, amt, cnt: triples.length, total: amt * triples.length, kw, warnings };
  });

  // 非复式三中三
  addMatch(new RegExp(`[三3]中[三3]${SEP}((?:\\d{1,2}${SEP_CHARS}+\\d{1,2}${SEP_CHARS}+\\d{1,2}${SEP_CHARS}*)+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const numPart = m[1]; const invalidNums = findInvalidNums(numPart);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const triples = [];
    const tr = new RegExp(`(\\d{1,2})${SEP_CHARS}+(\\d{1,2})${SEP_CHARS}+(\\d{1,2})`, 'g');
    let tm;
    while ((tm = tr.exec(numPart)) !== null) {
      triples.push(tm[1] + '-' + tm[2] + '-' + tm[3]);
    }
    if (triples.length === 0) {
      const nums = extractNums(numPart);
      if (nums.length % 3 !== 0 || nums.length === 0) {
        warnings.push(`号码数(${nums.length})与三中三不匹配`);
        return { cat: '三中三', nums: [], amt, cnt: 0, total: 0, kw, warnings };
      }
      const uniq = [...new Set(nums)].sort((a, b) => parseInt(a) - parseInt(b));
      combosNoSort(uniq, 3).forEach(c => triples.push(c.join('-')));
    }
    if (triples.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '三中三', nums: triples, amt, cnt: triples.length, total: amt * triples.length, kw, warnings };
  });

  // 复式连肖
  addMatch(new RegExp(`([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)${SEP}复[式试]?${SEP}((?:[${Z}]+))\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const k = toNum(m[1].replace(/[^0-9二三四五两]/g, '')); if (!k || k < 2 || k > 5) return null;
    const zPart = m[2].trim(); const zChars = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []).join('');
    if (!zChars || zChars.length < k) return null;
    const comb = zCombosKeepOrder(zChars, k);
    const warnings = [];
    if (!kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw, warnings };
  });

  // ===== 第7点：生肖串 + N + 连肖 + 复试 + 关键字 + 金额 =====
  addMatch(new RegExp(
      `((?:[${Z}]+))` +
      `[\\s]*([二三四五2345两])` +
      `(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)` +
      `${SEP}复[式试]?` +
      `[\\s]*(${KW_GROUP})${SEP}${AMT_GROUP}`, 'g'
  ), m => {
      const full = m[0];
      const { amt, kw } = extractAmtAndKw(full);
      if (!amt || amt <= 0) return null;
      const zPart = m[1];
      const k = toNum(m[2].replace(/[^0-9二三四五两]/g, ''));
      if (!k || k < 2 || k > 5) return null;
      const zChars = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []).join('');
      if (zChars.length < k) return null;
      const comb = zCombosKeepOrder(zChars, k);
      if (comb.length === 0) return null;
      const warnings = [];
      if (!kw) warnings.push('缺少金额关键字');
      return {
          cat: k + '连肖',
          nums: comb,
          amt, cnt: comb.length,
          total: amt * comb.length,
          kw, warnings
      };
  });

  // 非复式连肖（生肖串 + 连肖 + N）
  addMatch(new RegExp(`((?:[${Z}]+))[\\s]*(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)${SEP}([二三四五2345两])\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const zPart = m[1]; const zChars = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []).join('');
    const k = toNum(m[2].replace(/[^0-9二三四五两]/g, '')); if (!k || k < 2 || k > 5) return null;
    const warnings = [];
    const afterEnd = text.substring(m.index + m[0].length);
    if (!kw && /^\s*[鼠牛虎兔龙蛇马羊猴鸡狗猪]+/.test(afterEnd)) return null;
    if (zChars.length !== k) {
      warnings.push(`${zChars}：连肖数(${k})与生肖数(${zChars.length})不匹配`);
      return { cat: k + '连肖', nums: [], amt, cnt: 0, total: 0, kw, warnings };
    }
    const groups = zPart.split(new RegExp(SEP_CHARS + '+')).filter(g => g.trim().length >= k);
    const results = [];
    for (const zg of groups) { results.push(...zCombosKeepOrder(zg, k)); }
    const cnt = results.length || 0;
    if (cnt > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: results, amt, cnt, total: amt * cnt, kw, warnings };
  });

  // 复式连尾
  addMatch(new RegExp(`([二三四五2345])(?:连尾|尾连)${SEP}复[式试]?${SEP}((?:\\d+尾${SEP_CHARS}+)+\\d+尾)\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const k = toNum(m[1]); if (!k || k < 2 || k > 5) return null;
    const tailPart = m[2]; const digits = (tailPart.match(/\d/g) || []);
    if (digits.length < k) return null;
    const comb = tailCKeepOrder(digits.join(','), k);
    const warnings = [];
    if (!kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw, warnings };
  });

  // 非复式连尾（尾数串 + 连尾 + N）
  addMatch(new RegExp(`((?:\\d+尾${SEP_CHARS}+)+\\d+尾)[\\s]*(?:连尾|尾连)${SEP}([二三四五2345])\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const tailPart = m[1]; const digits = (tailPart.match(/\d/g) || []);
    const k = toNum(m[2]); if (!k || k < 2 || k > 5) return null;
    const warnings = [];
    const afterEnd = text.substring(m.index + m[0].length);
    if (!kw && /^\s*\d+尾/.test(afterEnd)) return null;
    if (digits.length !== k) {
      warnings.push(`${digits.map(d => d + '尾').join('')}：连尾数(${k})与尾数数量(${digits.length})不匹配`);
      return { cat: k + '连尾', nums: [], amt, cnt: 0, total: 0, kw, warnings };
    }
    const comb = tailCKeepOrder(digits.join(','), k);
    if (comb.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw, warnings };
  });

  // 宽松复式连肖
  addMatch(new RegExp(`复[式试]?([二三四五2345两])?(?:连肖|平连|连)${SEP}((?:[${Z}]+${SEP_CHARS}*)+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const kDigit = m[1] ? toNum(m[1].replace(/[^0-9二三四五两]/g, '')) : null;
    const zPart = m[2].trim(); const zChars = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []).join('');
    if (!zChars || zChars.length < 2) return null;
    const k = kDigit || Math.min(zChars.length, 5);
    if (k < 2 || k > 5 || zChars.length < k) return null;
    const comb = zCombosKeepOrder(zChars, k);
    const warnings = [];
    if (comb.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw, warnings };
  });

  // 宽松复式连尾
  addMatch(new RegExp(`复[式试]?([二三四五2345])?(?:连尾|尾连)${SEP}((?:\\d+${SEP_CHARS}*尾${SEP_CHARS}*)+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const kDigit = m[1] ? toNum(m[1]) : null;
    const tailPart = m[2]; const digits = (tailPart.match(/\d/g) || []);
    const k = kDigit || Math.min(digits.length, 5);
    if (k < 2 || k > 5 || digits.length < k) return null;
    const comb = tailCKeepOrder(digits.join(','), k);
    const warnings = [];
    if (comb.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw, warnings };
  });

  // N不中
  addMatch(/([五六七八九十]|十一|十二|[5-9]|1[0-2])不[中出]\s*((?:\d{1,2}[\s,\-，、./]*)+)\s*[下共买个—来=＝\/各组四各]*\s*(\d+|[一二三四五六七八九十百千两]+)/g, m => {
    const cn = { 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 };
    let k = cn[m[1]] || parseInt(m[1]); if (!k || k < 5 || k > 12) return null;
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[2]); const invalidNums = findInvalidNums(m[2]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    if (nums.length !== k) {
      warnings.push(`号码数(${nums.length})与不中数(${k})不匹配`);
      return { cat: k + '不中', nums: [], amt, cnt: 0, total: 0, kw, warnings };
    }
    const cbs = combos(nums, k).map(c => c.join('-'));
    if (cbs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: k + '不中', nums: cbs, amt, cnt: cbs.length, total: amt * cbs.length, kw, warnings };
  });

  // 非复式连肖（N连肖 + 生肖串，多组匹配）
  addMatch(new RegExp(`([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)[\\s]*((?:[${Z}]+(?:${SEP_CHARS}+[${Z}]+)*))${SEP}(?:(?=${KW_GROUP})${KW_GROUP}${SEP}${AMT_GROUP}|${END_AMT_RE})`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const k = toNum(m[1].replace(/[^0-9二三四五两]/g, '')); if (!k || k < 2 || k > 5) return null;
    const zPart = m[2]; const warnings = [];
    const afterEnd = text.substring(m.index + m[0].length);
    if (!kw && /^\s*[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(afterEnd)) return null;
    const groups = zPart.split(new RegExp(SEP_CHARS + '+')).filter(g => g.trim().length > 0);
    const validCombos = [];
    const invalidGroups = [];
    for (const g of groups) {
      const zs = g.trim();
      if (zs.length === k) {
        validCombos.push(...zCombosKeepOrder(zs, k));
      } else {
        invalidGroups.push(zs);
      }
    }
    if (invalidGroups.length > 0) {
      invalidGroups.forEach(zs => { warnings.push(`${zs}：连肖数(${k})与生肖数(${zs.length})不匹配`); });
    }
    if (validCombos.length > 0) {
      const cnt = validCombos.length;
      if (cnt > 1 && !kw) warnings.push('缺少金额关键字');
      return { cat: k + '连肖', nums: validCombos, amt, cnt, total: amt * cnt, kw, warnings };
    } else {
      return { cat: k + '连肖', nums: [], amt, cnt: 0, total: 0, kw, warnings };
    }
  });

  // 非复式连尾（N连尾 + 尾数串，多组匹配）
  addMatch(new RegExp(`([二三四五2345])(?:连尾|尾连)[\\s]*((?:\\d+${SEP_CHARS}*尾(?:${SEP_CHARS}+\\d+${SEP_CHARS}*尾)*)+)${SEP}(?:(?=${KW_GROUP})${KW_GROUP}${SEP}${AMT_GROUP}|${END_AMT_RE})`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const k = toNum(m[1]); if (!k || k < 2 || k > 5) return null;
    const tailPart = m[2]; const digits = (tailPart.match(/\d/g) || []);
    const warnings = [];
    const afterEnd = text.substring(m.index + m[0].length);
    if (!kw && /^\s*\d+尾/.test(afterEnd)) return null;
    if (digits.length !== k) {
      warnings.push(`${digits.map(d => d + '尾').join('')}：连尾数(${k})与尾数数量(${digits.length})不匹配`);
      return { cat: k + '连尾', nums: [], amt, cnt: 0, total: 0, kw, warnings };
    }
    const comb = tailCKeepOrder(digits.join(','), k);
    if (comb.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt, cnt: comb.length, total: amt * comb.length, kw, warnings };
  });

  // 平特肖
  addMatch(new RegExp(`(?:平特(?:一肖|肖)?|[1一]肖中|平肖|平码[肖]?|一肖|独肖)${SEP}((?:[${Z}]+${SEP_CHARS}*)+)\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const zs = extractZodiacs(m[1]);
    const warnings = [];
    if (zs.length >= 2 && !kw) { warnings.push('缺少金额关键字'); }
    return { cat: '平特肖', nums: zs, amt, cnt: zs.length, total: amt * zs.length, kw, warnings };
  });

  // 平特尾
  addMatch(new RegExp(`(?:平特(?:一尾|尾)?|平尾|尾中)${SEP}((?:\\d+尾${SEP_CHARS}*)+)\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const tails = (m[1].match(/\d/g) || []).map(d => d + '尾');
    const warnings = [];
    if (tails.length >= 2 && !kw) { warnings.push('缺少金额关键字'); }
    return { cat: '平特尾', nums: tails, amt, cnt: tails.length, total: amt * tails.length, kw, warnings };
  });

  // 平码
  addMatch(new RegExp(`(?:平码|独平)${SEP}((?:\\d+${SEP_CHARS}*)+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    if (nums.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '平码', nums, amt, cnt: nums.length, total: amt * nums.length, kw, warnings };
  });

  // ===== 新增：号码对 + 玩法名在后（如 "08-12 二中二 各组100"） =====
  addMatch(new RegExp(
      `((?:\\d{1,2}${SEP_CHARS}+\\d{1,2}${SEP_CHARS}*)+)` +
      `[\\s]*([二2]中[二2]|[三3]中[三3]|特碰)` +
      `[\\s]*(${KW_GROUP})${SEP}${AMT_GROUP}`, 'g'
  ), m => {
      const full = m[0];
      const { amt, kw } = extractAmtAndKw(full);
      if (!amt || amt <= 0) return null;
      const numPart = m[1];
      const playName = m[2].trim();
      const invalidNums = findInvalidNums(numPart);
      const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
      const pairs = [];
      const pr = new RegExp(`(\\d{1,2})${SEP_CHARS}+(\\d{1,2})`, 'g');
      let pm;
      while ((pm = pr.exec(numPart)) !== null) {
          pairs.push(pm[1] + '-' + pm[2]);
      }
      if (pairs.length === 0) {
          const nums = extractNums(numPart);
          if (nums.length < 2) {
              warnings.push(`号码数不足`);
              return { cat: playName, nums: [], amt, cnt: 0, total: 0, kw, warnings };
          }
          if (playName === '二中二' || playName === '特碰') {
              combosNoSort(nums, 2).forEach(c => pairs.push(c.join('-')));
          } else if (playName === '三中三') {
              if (nums.length < 3) {
                  warnings.push(`号码数不足`);
                  return { cat: playName, nums: [], amt, cnt: 0, total: 0, kw, warnings };
              }
              combosNoSort(nums, 3).forEach(c => pairs.push(c.join('-')));
          }
      }
      if (pairs.length === 0) return null;
      if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
      return { cat: playName, nums: pairs, amt, cnt: pairs.length,
               total: amt * pairs.length, kw, warnings };
  });

  // ===== 第11点：号码串 + 复式玩法 顺序（复式二中二/三中三/特碰） =====
  addMatch(new RegExp(
      `((?:\\d+${SEP_CHARS}+)+\\d+)` +
      `[\\s]*(复[式试]?(?:[二2]中[二2]|[三3]中[三3]|特碰))` +
      `[\\s]*(${KW_GROUP})${SEP}${AMT_GROUP}`, 'g'
  ), m => {
      const full = m[0];
      const { amt, kw } = extractAmtAndKw(full);
      if (!amt || amt <= 0) return null;
      const nums = extractNums(m[1]);
      const playPart = m[2].trim();
      const invalidNums = findInvalidNums(m[1]);
      const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
      let cat = '';
      let k = 0;
      if (/[二2]中[二2]/.test(playPart)) { cat = '二中二'; k = 2; }
      else if (/[三3]中[三3]/.test(playPart)) { cat = '三中三'; k = 3; }
      else if (/特碰/.test(playPart)) { cat = '特碰'; k = 2; }
      if (!cat || nums.length < k) {
          warnings.push(`号码数不足`);
          return { cat: cat || playPart, nums: [], amt, cnt: 0, total: 0, kw, warnings };
      }
      const pairs = combosNoSort(nums, k).map(c => c.join('-'));
      if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
      return { cat, nums: pairs, amt, cnt: pairs.length,
               total: amt * pairs.length, kw, warnings };
  });

  allMatches.push(...multiMatches);

  allMatches.sort((a, b) => a.start - b.start);
  const deduped = [];
  let lastEnd = 0;
  for (const match of allMatches) {
    if (match.start >= lastEnd) {
      deduped.push(match);
      lastEnd = match.end;
    }
  }
  return deduped;
}

function processOneLine(line) {
  if (!line.trim()) return [];

  // ===== 号码-金额对识别（优先处理） =====
  const defaultSuffixes = ['米', '元', '块', '角', '分', '厘'];
  const userSuffixes = getCustomAmountSuffixes();
  const combinedSuffixes = [...new Set([...defaultSuffixes, ...userSuffixes])];
  const suffixList = combinedSuffixes.length ? combinedSuffixes.join('|') : '';
  const suffixPattern = suffixList ? `(?:${suffixList})?` : '';
  const amtPart = `((?:\\d+|[一二三四五六七八九十百千两]+)${suffixPattern})`;
  const numPart = '(\\d{1,2})';
  const sepPart = `[\\s,\\-.。、+\\-*＊\\/\\\\|]+`;
  const pairRe = new RegExp(`^\\s*${numPart}\\s*${sepPart}\\s*${amtPart}\\s*$`);
  const pairMatch = line.match(pairRe);
  if (pairMatch) {
    const num = pairMatch[1].padStart(2, '0');
    let amtStr = pairMatch[2];
    if (suffixList) {
      const suffixRe = new RegExp(`(${suffixList})$`);
      amtStr = amtStr.replace(suffixRe, '');
    }
    const amt = toNum(amtStr);
    if (parseInt(num) >= 1 && parseInt(num) <= 49 && amt > 0) {
      return [{ cat: '特码', nums: [num], amt, cnt: 1, total: amt, kw: '各', warnings: [] }];
    }
  }
  // ===== 号码-金额对识别结束 =====

  const ZODIAC_SET = new Set('鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''));

  // ===== 放宽 tryMatchTeXiao =====
  function tryMatchTeXiao(content) {
    if (!content || !content.trim()) return null;
    if (/特码/.test(content)) return null;
    // ===== 新增：直接跳过含"号各"的内容 =====
    if (/号各|号\s*各/.test(content)) return null;
    
    const trimmed = content.trim();
    const shxMatch = trimmed.match(new RegExp(`(.+?)(各肖|各(?!数|号|组|码|注|下|买))\\s*(\\d+)`));
    if (!shxMatch) return null;
    const rawContent = shxMatch[1]; const amtRaw = parseInt(shxMatch[3]) || 0; const kw = shxMatch[2] || '';
    if (amtRaw <= 0) return null;
    // ===== 新增：关键字含"号"就退出 =====
    if (kw && kw.includes('号')) return null;
    
    const zodiacChars = []; for (const ch of rawContent) { if (ZODIAC_SET.has(ch)) zodiacChars.push(ch); }
    if (zodiacChars.length > 0) {
      const cnt = zodiacChars.length; const total = amtRaw * cnt;
      const warnings = []; if (cnt > 1 && !kw) warnings.push('缺少金额关键字');
      return { cat: '特肖', nums: zodiacChars, amt: amtRaw, cnt: cnt, total: total, kw: kw || '各', warnings };
    }
    return null;
  }

  const specialMatches = collectSpecialMatches(line);
  const results = [];
  let lastEnd = 0;

  for (const m of specialMatches) {
    if (m.start > lastEnd) {
      const content = line.substring(lastEnd, m.start);
      let subLast = 0;
      const kwReLocal = new RegExp(`(${KW_LIST.join('|')})\\s*(${AMT_RE_STR})`, 'g');
      let subMatch;
      while ((subMatch = kwReLocal.exec(content)) !== null) {
        const subContent = content.substring(subLast, subMatch.index);
        
        // ===== 范围号码识别 =====
        if (subContent.includes('到') || (subMatch[0] && subMatch[0].includes('到'))) {
          const combined = subContent + (subMatch ? subMatch[0] : '');
          const rangeMatch = combined.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            const amt = toNum(subMatch[2]);
            const kw = subMatch[1];
            
            if (!kw) {
              results.push({
                cat: '__unrecognized__',
                nums: [],
                amt: 0, cnt: 0, total: 0, kw: '',
                warnings: ['缺少金额关键字'],
                rawLine: combined.trim()
              });
            } else if (start >= 1 && end <= 49 && start <= end) {
              const nums = [];
              for (let i = start; i <= end; i++) {
                nums.push(String(i).padStart(2, '0'));
              }
              results.push({
                cat: '特码',
                nums: nums,
                amt: amt,
                cnt: nums.length,
                total: amt * nums.length,
                kw: kw,
                warnings: []
              });
            } else {
              results.push({
                cat: '__unrecognized__',
                nums: [],
                amt: 0, cnt: 0, total: 0, kw: '',
                warnings: ['号码范围无效，请检查'],
                rawLine: combined.trim()
              });
            }
            subLast = subMatch.index + subMatch[0].length;
            continue;
          }
        }
        
        const teXiaoResult = tryMatchTeXiao(subContent + subMatch[0]);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          const seg = parseTeMaSegment(subContent);
          if (seg) {
            const amt = toNum(subMatch[2]);
            const kw = subMatch[1];
            const cnt = seg.allNumsArr ? seg.allNumsArr.length : seg.totalCount;
            results.push({ cat: '特码', nums: seg.displayItems, amt, cnt: cnt, total: amt * cnt, kw, warnings: seg.warnings || [] });
          }
        }
        subLast = subMatch.index + subMatch[0].length;
      }
    }
    results.push(m.result);
    lastEnd = m.end;
  }

  if (lastEnd < line.length) {
    const content = line.substring(lastEnd);
    let subLast = 0;
    const kwReLocal = new RegExp(`(${KW_LIST.join('|')})\\s*(${AMT_RE_STR})`, 'g');
    let subMatch;
    while ((subMatch = kwReLocal.exec(content)) !== null) {
      const subContent = content.substring(subLast, subMatch.index);
      
      // ===== 范围号码识别 =====
      if (subContent.includes('到') || (subMatch[0] && subMatch[0].includes('到'))) {
        const combined = subContent + (subMatch ? subMatch[0] : '');
        const rangeMatch = combined.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          const amt = toNum(subMatch[2]);
          const kw = subMatch[1];
          
          if (!kw) {
            results.push({
              cat: '__unrecognized__',
              nums: [],
              amt: 0, cnt: 0, total: 0, kw: '',
              warnings: ['缺少金额关键字'],
              rawLine: combined.trim()
            });
          } else if (start >= 1 && end <= 49 && start <= end) {
            const nums = [];
            for (let i = start; i <= end; i++) {
              nums.push(String(i).padStart(2, '0'));
            }
            results.push({
              cat: '特码',
              nums: nums,
              amt: amt,
              cnt: nums.length,
              total: amt * nums.length,
              kw: kw,
              warnings: []
            });
          } else {
            results.push({
              cat: '__unrecognized__',
              nums: [],
              amt: 0, cnt: 0, total: 0, kw: '',
              warnings: ['号码范围无效，请检查'],
              rawLine: combined.trim()
            });
          }
          subLast = subMatch.index + subMatch[0].length;
          continue;
        }
      }
      
      const teXiaoResult = tryMatchTeXiao(subContent + subMatch[0]);
      if (teXiaoResult) {
        results.push(teXiaoResult);
      } else {
        const seg = parseTeMaSegment(subContent);
        if (seg) {
          const amt = toNum(subMatch[2]);
          const kw = subMatch[1];
          const cnt = seg.allNumsArr ? seg.allNumsArr.length : seg.totalCount;
          results.push({ cat: '特码', nums: seg.displayItems, amt, cnt: cnt, total: amt * cnt, kw, warnings: seg.warnings || [] });
        }
      }
      subLast = subMatch.index + subMatch[0].length;
    }
    if (subLast < content.length) {
      const remaining = content.substring(subLast).trim();
      
      // ===== 残留内容也检查范围号码 =====
      if (remaining.includes('到')) {
        const rangeMatch = remaining.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          const amtMatch = remaining.match(/(各(?:数|号|组|码|注|下|买)?)\s*(\d+)/);
          if (amtMatch) {
            const amt = toNum(amtMatch[2]);
            if (start >= 1 && end <= 49 && start <= end && amt > 0) {
              const nums = [];
              for (let i = start; i <= end; i++) {
                nums.push(String(i).padStart(2, '0'));
              }
              results.push({
                cat: '特码',
                nums: nums,
                amt: amt,
                cnt: nums.length,
                total: amt * nums.length,
                kw: amtMatch[1],
                warnings: []
              });
            } else {
              results.push({
                cat: '__unrecognized__',
                nums: [],
                amt: 0, cnt: 0, total: 0, kw: '',
                warnings: ['号码范围无效，请检查'],
                rawLine: remaining
              });
            }
          } else {
            results.push({
              cat: '__unrecognized__',
              nums: [],
              amt: 0, cnt: 0, total: 0, kw: '',
              warnings: ['缺少金额关键字'],
              rawLine: remaining
            });
          }
        }
      } else if (remaining && containsDictElement(remaining)) {
        const teXiaoResult = tryMatchTeXiao(remaining);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          results.push({
            cat: '__unrecognized__',
            nums: [],
            amt: 0, cnt: 0, total: 0, kw: '',
            warnings: ['缺少金额关键字或有效玩法'],
            rawLine: remaining
          });
        }
      }
    }
  }

  if (specialMatches.length === 0 && results.length === 0) {
    // ===== 整行检查范围号码 =====
    if (line.includes('到')) {
      const rangeMatch = line.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        const amtMatch = line.match(/(各(?:数|号|组|码|注|下|买)?)\s*(\d+)/);
        
        if (amtMatch) {
          const amt = toNum(amtMatch[2]);
          if (start >= 1 && end <= 49 && start <= end && amt > 0) {
            const nums = [];
            for (let i = start; i <= end; i++) {
              nums.push(String(i).padStart(2, '0'));
            }
            return [{
              cat: '特码',
              nums: nums,
              amt: amt,
              cnt: nums.length,
              total: amt * nums.length,
              kw: amtMatch[1],
              warnings: []
            }];
          } else {
            return [{
              cat: '__unrecognized__',
              nums: [],
              amt: 0, cnt: 0, total: 0, kw: '',
              warnings: ['号码范围无效，请检查'],
              rawLine: line.trim()
            }];
          }
        } else {
          return [{
            cat: '__unrecognized__',
            nums: [],
            amt: 0, cnt: 0, total: 0, kw: '',
            warnings: ['缺少金额关键字'],
            rawLine: line.trim()
          }];
        }
      }
    }
    
    const teXiaoResult = tryMatchTeXiao(line);
    if (teXiaoResult) {
      return [teXiaoResult];
    }
    let subLast = 0;
    const kwReLocal = new RegExp(`(${KW_LIST.join('|')})\\s*(${AMT_RE_STR})`, 'g');
    let subMatch;
    while ((subMatch = kwReLocal.exec(line)) !== null) {
      const subContent = line.substring(subLast, subMatch.index);
      const seg = parseTeMaSegment(subContent);
      if (seg) {
        const amt = toNum(subMatch[2]);
        const kw = subMatch[1];
        const cnt = seg.allNumsArr ? seg.allNumsArr.length : seg.totalCount;
        results.push({ cat: '特码', nums: seg.displayItems, amt, cnt: cnt, total: amt * cnt, kw, warnings: seg.warnings || [] });
      }
      subLast = subMatch.index + subMatch[0].length;
    }
    if (subLast < line.length) {
      const remaining = line.substring(subLast).trim();
      if (remaining && containsDictElement(remaining)) {
        const teXiaoResult = tryMatchTeXiao(remaining);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          results.push({
            cat: '__unrecognized__',
            nums: [],
            amt: 0, cnt: 0, total: 0, kw: '',
            warnings: ['缺少金额关键字或有效玩法'],
            rawLine: remaining
          });
        }
      }
    }
  }

  return results;
}

function containsDictElement(str) {
  if (!str) return false;
  const nums = str.match(/\d+/g);
  if (nums) {
    for (const n of nums) {
      const intVal = parseInt(n);
      if (intVal >= 1 && intVal <= 49) return true;
    }
  }
  if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(str)) return true;
  if (/\d+尾/.test(str)) return true;
  const dictKeywords = ['金','木','水','火','土','红波','蓝波','绿波','红单','红双','蓝单','蓝双','绿单','绿双',
    '单数','双数','家禽','野兽','平特肖','平特尾','连肖','连尾','二中二','三中三','不中','特码','特肖','特碰',
    '红','蓝','绿','单','双','大','小','各','各数','各号','各组','到'];
  for (const kw of dictKeywords) {
    if (str.includes(kw)) return true;
  }
  return false;
}

// ===== 增强版继承函数（支持无分隔符生肖串拆分 + 特肖覆盖 + 继承标记） =====
function applyInlineInheritance(lineResults, lastInheritablePlay = null) {
  if (!lineResults || lineResults.length === 0) return { results: lineResults, lastPlay: lastInheritablePlay };

  const inheritableCats = {
    '平特肖': { type: 'zodiac', count: 1 },
    '平特尾': { type: 'tail', count: 1 }
  };
  for (let i = 2; i <= 5; i++) {
    inheritableCats[i + '连肖'] = { type: 'zodiac', count: i };
    inheritableCats[i + '连尾'] = { type: 'tail', count: i };
  }

  // 1. 确定本行的继承源
  let inheritedPlay = lastInheritablePlay;
  for (const r of lineResults) {
    if (r.cat !== '__unrecognized__' && inheritableCats[r.cat]) {
      inheritedPlay = { cat: r.cat, kw: r.kw || '', ...inheritableCats[r.cat] };
      break;
    }
  }

  // 2. 遍历处理
  const processed = [];
  for (const r of lineResults) {
    // ----- 特肖结果覆盖为连肖 -----
    if (inheritedPlay && inheritedPlay.type === 'zodiac' && inheritedPlay.count >= 2 && r.cat === '特肖') {
      const zodiacs = r.nums || [];
      if (zodiacs.length === inheritedPlay.count && (r.kw || '') === (inheritedPlay.kw || '')) {
        const comboStr = zodiacs.join('-');
        processed.push({
          cat: inheritedPlay.cat,
          nums: [comboStr],
          amt: r.amt,
          cnt: 1,
          total: r.amt,
          kw: inheritedPlay.kw || '各组',
          warnings: [],
          rawLine: r.rawLine || '',
          _inherited: true
        });
        continue;
      }
    }

    if (r.cat !== '__unrecognized__') {
      processed.push(r);
      continue;
    }

    if (!inheritedPlay) {
      processed.push(r);
      continue;
    }

    // 提取内容和金额
    const raw = (r.rawLine || '').trim();
    if (!raw) {
      processed.push(r);
      continue;
    }

    // 提取金额数字（最后一个数字）
    const amtMatch = raw.match(/(\d+)\s*$/);
    if (!amtMatch) {
      processed.push(r);
      continue;
    }
    const amt = parseInt(amtMatch[1]) || 0;
    if (amt <= 0) {
      processed.push(r);
      continue;
    }

    // 提取内容（去掉金额部分）
    let content = raw.substring(0, amtMatch.index).trim();
    if (!content) {
      processed.push(r);
      continue;
    }

    // 提取内容中的关键字
    let contentKw = '';
    for (const kw of KW_LIST) {
      if (content.includes(kw)) {
        contentKw = kw;
        break;
      }
    }

    // 关键字一致性检查
    const inheritedKw = inheritedPlay.kw || '';
    if (contentKw !== inheritedKw) {
      r.warnings = [`关键字不一致（需要"${inheritedKw || '无关键字'}"，实际"${contentKw || '无关键字'}"）`];
      processed.push(r);
      continue;
    }

    // 清理内容中的关键字
    let cleanContent = content;
    if (contentKw) {
      cleanContent = content.replace(new RegExp(contentKw), '').trim();
    }
    // 清理分隔符
    cleanContent = cleanContent.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '-');

    // 格式匹配检查
    let matched = false;
    if (inheritedPlay.type === 'zodiac') {
      // 先尝试按分隔符拆分
      let items = cleanContent.split('-').filter(i => i.trim());
      
      // 如果拆分后数量不匹配，尝试把整串当纯生肖逐字符拆分
      if (items.length !== inheritedPlay.count) {
        const pureZodiacStr = cleanContent.replace(/[^鼠牛虎兔龙蛇马羊猴鸡狗猪]/g, '');
        if (pureZodiacStr.length === inheritedPlay.count) {
          // 拆成单个生肖数组
          items = pureZodiacStr.split('');
        }
      }

      if (inheritedPlay.count === 1) {
        // 平特肖：单个生肖
        if (items.length === 1 && /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(items[0].trim())) {
          processed.push({
            cat: inheritedPlay.cat, nums: [items[0].trim()], amt: amt,
            cnt: 1, total: amt, kw: inheritedPlay.kw || '各', warnings: [],
            rawLine: raw,
            _inherited: true
          });
          matched = true;
        }
      } else {
        // 连肖：N个生肖
        if (items.length === inheritedPlay.count && items.every(i => /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(i.trim()))) {
          const comboStr = items.map(i => i.trim()).join('-');
          processed.push({
            cat: inheritedPlay.cat, nums: [comboStr], amt: amt,
            cnt: 1, total: amt, kw: inheritedPlay.kw || '各组', warnings: [],
            rawLine: raw,
            _inherited: true
          });
          matched = true;
        }
      }
    } else if (inheritedPlay.type === 'tail') {
      // 先尝试按分隔符拆分
      let items = cleanContent.split('-').filter(i => /\d+尾/.test(i.trim()));
      
      // 如果拆分后数量不匹配，尝试把整串当纯数字尾数逐字符拆分
      if (items.length !== inheritedPlay.count) {
        const pureDigits = cleanContent.replace(/[^0-9]/g, '');
        if (pureDigits.length === inheritedPlay.count) {
          items = pureDigits.split('').map(d => d + '尾');
        }
      }

      if (inheritedPlay.count === 1) {
        // 平特尾：单个尾数
        if (items.length === 1 && /\d+尾$/.test(items[0].trim())) {
          processed.push({
            cat: inheritedPlay.cat, nums: [items[0].trim()], amt: amt,
            cnt: 1, total: amt, kw: inheritedPlay.kw || '各', warnings: [],
            rawLine: raw,
            _inherited: true
          });
          matched = true;
        }
      } else {
        // 连尾：N个尾数
        if (items.length === inheritedPlay.count && items.every(i => /\d+尾$/.test(i.trim()))) {
          const comboStr = items.map(i => i.trim()).join('-');
          processed.push({
            cat: inheritedPlay.cat, nums: [comboStr], amt: amt,
            cnt: 1, total: amt, kw: inheritedPlay.kw || '各组', warnings: [],
            rawLine: raw,
            _inherited: true
          });
          matched = true;
        }
      }
    }

    if (!matched) {
      r.warnings = [`格式不匹配（需要${inheritedPlay.count}个${inheritedPlay.type === 'zodiac' ? '生肖' : '尾数'}）`];
      processed.push(r);
    }
  }

  // 3. 确定传递给下一行的继承源
  let outgoingPlay = lastInheritablePlay;
  for (let i = lineResults.length - 1; i >= 0; i--) {
    const r = lineResults[i];
    if (r.cat !== '__unrecognized__' && inheritableCats[r.cat]) {
      outgoingPlay = { cat: r.cat, kw: r.kw || '', ...inheritableCats[r.cat] };
      break;
    }
  }

  return { results: processed, lastPlay: outgoingPlay };
}

// ===== 地区关键字列表 =====
const REGION_KEYWORDS = {
  'macau': ['澳', '奥', '澳门', '奥门', '门', 'mc', 'MC', 'Mc'],
  'hongkong': ['港', '香', '香港', 'hk', 'HK', 'Hk'],
  'yuegang': ['粤', '粤港', 'yg', 'YG', 'Yg']
};
const REGION_LABELS = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

// ===== 提取地区关键字 =====
function extractRegion(line) {
  const allKeywords = [];
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    for (const kw of keywords) {
      allKeywords.push({ region, keyword: kw, len: kw.length });
    }
  }
  allKeywords.sort((a, b) => b.len - a.len);

  for (const { region, keyword } of allKeywords) {
    const idx = line.indexOf(keyword);
    if (idx !== -1) {
      // 只检查前面是否紧挨汉字（防止匹配到非独立的关键字，如"澳"匹配到"澳门"中间的"澳"）
      if (idx > 0 && /[\u4e00-\u9fa5]/.test(line.charAt(idx - 1))) {
        continue;
      }
      // 不再检查后面是否紧挨汉字，只要包含关键字就提取
      const remaining = (line.substring(0, idx) + line.substring(idx + keyword.length)).trim();
      return { region, remaining };
    }
  }
  return null;
}

function performRecognition(text) {
  const resultDiv = document.getElementById('orderResult');
  if (!text || !text.trim()) {
    if (resultDiv) resultDiv.innerHTML = '';
    window._pureOrderLines = [];
    window._pureOrderRegions = [];
    window._cachedMaxLossData = [];
    updateOrderTotalDisplay();
    updateMaxLossDisplay();
    return;
  }
  let processedText = text;
  processedText = applyReplacePresets(processedText);
  processedText = applyCategoryAliases(processedText);
  processedText = preprocess(processedText);
  const lines = processedText.split('\n');
  const allResults = [];
  const lineRegions = [];
  let currentLineRegion = currentRegion;
  
  // 圆点强制地区模式
  const dotRegion = window._dotRegion || 'auto';

  // 跨行继承上下文
  let lastInheritablePlay = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    let orderLine = line;
    
    if (dotRegion !== 'auto') {
      currentLineRegion = dotRegion;
    } else {
      const extracted = extractRegion(line);
      if (extracted) {
        currentLineRegion = extracted.region;
        orderLine = extracted.remaining;
      }
    }
    lineRegions.push(currentLineRegion);

    if (!orderLine.trim()) continue;

    const parsed = processOneLine(orderLine);
    let lineResults = [];
    if (parsed.length === 0) {
      if (containsDictElement(orderLine)) {
        lineResults.push({
          cat: '__unrecognized__',
          nums: [],
          amt: 0, cnt: 0, total: 0, kw: '',
          warnings: ['缺少金额关键字或有效玩法'],
          rawLine: orderLine.trim()
        });
      }
    } else {
      lineResults.push(...parsed);
    }
    if (lineResults.length > 0) {
      const inheritResult = applyInlineInheritance(lineResults, lastInheritablePlay);
      lineResults = inheritResult.results;
      lastInheritablePlay = inheritResult.lastPlay;
      lineResults.forEach(r => { r.region = currentLineRegion; });
      allResults.push(...lineResults);
    }
  }

  const mergedArray = allResults.map(r => ({
    category: r.cat, numbers: r.nums, unitAmount: r.amt,
    totalCount: r.cnt, totalAmount: r.total, kw: r.kw || '', warnings: r.warnings || [],
    rawLine: r.rawLine || '',
    region: r.region || currentRegion,
    _inherited: r._inherited || false
  }));

  if (resultDiv) {
    if (mergedArray.length === 0) {
      resultDiv.innerHTML = text ? `<div class="result-line">${text}</div>` : '';
      window._pureOrderLines = [];
      window._pureOrderRegions = [];
      window._cachedMaxLossData = [];
    } else {
      displayResults(mergedArray, resultDiv);
    }
  }
  updateOrderTotalDisplay();
  updateMaxLossDisplay();
}

function displayResults(rs, container) {
  if (!container) container = document.getElementById('orderResult');
  if (!container) return;
  if (rs.length === 0) { container.innerHTML = ''; window._pureOrderLines = []; window._pureOrderRegions = []; window._cachedMaxLossData = []; return; }
  let total = 0; let html = '';
  const pureLines = [];
  const pureRegions = [];
  const maxLossData = [];

  // 地区颜色映射
  const regionColorMap = { 'macau': '#e74c3c', 'hongkong': '#3498db', 'yuegang': '#27ae60' };

  for (const r of rs) {
    if (r.category === '__unrecognized__') {
      const regionLabel = REGION_LABELS[r.region] || '';
      const warnText = (r.warnings && r.warnings.length) ? r.warnings.join('；') : '缺少金额关键字或有效玩法';
      if (r.region && r.region !== currentRegion && !r.warnings.length) {
        html += `<div class="result-line"><span style="color:${regionColorMap[r.region] || '#333'};">${regionLabel}·</span>${r.rawLine} <span style="color:red;">[已提取地区${regionLabel}，但内容无法识别]</span></div>`;
      } else {
        html += `<div class="result-line"><span style="color:${r.region !== currentRegion ? (regionColorMap[r.region] || '#e74c3c') : '#000'};">${regionLabel}·</span>${r.rawLine} <span style="color:red;">[${warnText}]</span></div>`;
      }
      continue;
    }
    total += r.totalAmount;
    const regionLabel = REGION_LABELS[r.region] || '';
    const isCurrentRegion = r.region === currentRegion;
    const regionColor = isCurrentRegion ? 'color:#000;' : `color:${regionColorMap[r.region] || '#333'};`;
    const kwDisplay = (r.category === '特码') ? '各数' : '各';
    const amountStr = `${kwDisplay}${Math.round(r.unitAmount)}`;
    const info = r.totalCount > 1 ? `(${r.totalCount}注, 共${Math.round(r.totalAmount)})` : `(共${Math.round(r.totalAmount)})`;
    const numStr = formatNums(r.category, r.numbers);
    let line = `<span style="${regionColor}">${regionLabel}·</span>${r.category}:${numStr}${amountStr} ${info}`;
    if (r._inherited) {
      line += ` <span style="color:#27ae60;">[继承]</span>`;
    }
    if (r.warnings && r.warnings.length) { line += ` <span style="color:red;">[${r.warnings.join('；')}]</span>`; }
    html += `<div class="result-line">${line}</div>`;
    const pureNumStr = formatNums(r.category, r.numbers);
    pureLines.push(`${r.category}:${pureNumStr} ${kwDisplay} ${Math.round(r.unitAmount)}`);
    pureRegions.push(r.region);

    if (r.category === '特码' || r.category === '特肖') {
      maxLossData.push({
        category: r.category,
        numbers: r.numbers,
        unitAmount: Math.round(r.unitAmount)
      });
    }
  }

  container.innerHTML = html;
  window._pureOrderLines = pureLines;
  window._pureOrderRegions = pureRegions;
  window._cachedMaxLossData = maxLossData;
}

function formatNums(cat, numsArr) {
  const simpleCats = ['特码', '特肖', '平特肖', '平码', '平特尾'];
  if (simpleCats.includes(cat)) return numsArr.join('-');
  if (cat.startsWith('包')) return numsArr.join('-');
  if (cat.includes('连肖')) return numsArr.map(g => {
    if (g.includes('-')) return '(' + g + ')';
    return '(' + g.split('').join('-') + ')';
  }).join(' ');
  return numsArr.map(g => `(` + g + `)`).join(' ');
}

// ===== countItemsInLine（修复：生肖判断在D[item]之前） =====
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

  // 特碰行
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