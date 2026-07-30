// ===== matchers.js - 特殊玩法匹配（连肖、连尾、二中二、不中等） =====

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

  // ===== 连肖无关键字整行及带关键字版本 (优先级最高) =====
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

  // ===== 玩法在前，生肖在后的无关键字连肖 =====
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

  // ===== 多组连肖带分隔符 =====
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

  // ===== 多组连尾 =====
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

  // ===== 通用匹配辅助 =====
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

  // ===== 二中二拖法 =====
  addMatch(new RegExp(`[二2]中[二2]${SEP}((?:[${Z}]+|\\d+尾|\\d{1,2})(?:${SEP_CHARS}+(?:[${Z}]+|\\d+尾|\\d{1,2}))*)${SEP_CHARS}*(?:拖|托)${SEP_CHARS}*((?:[${Z}]+|\\d+尾|\\d{1,2})(?:${SEP_CHARS}+(?:[${Z}]+|\\d+尾|\\d{1,2}))*?)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const leftPart = m[1], rightPart = m[2];
    return handleDragMatch(leftPart, rightPart, amt, kw, '二中二');
  });

  // ===== 复式二中二 =====
  addMatch(new RegExp(`复[式试]?[二2]中[二2]${SEP}((?:\\d+${SEP_CHARS}+)+\\d+)(?!${SEP_CHARS}*[拖托碰])[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const pairs = combosNoSort(nums, 2).map(c => c.join('-'));
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '二中二', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  });

  // ===== 非复式二中二 =====
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

  // ===== 复式三中三 =====
  addMatch(new RegExp(`复[式试]?[三3]中[三3]${SEP}((?:\\d+${SEP_CHARS}+)+\\d+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const triples = combosNoSort(nums, 3).map(c => c.join('-'));
    if (triples.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '三中三', nums: triples, amt, cnt: triples.length, total: amt * triples.length, kw, warnings };
  });

  // ===== 非复式三中三 =====
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

  // ===== 复式连肖 =====
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

  // ===== 生肖串 + N + 连肖 + 复试 + 关键字 + 金额 =====
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

  // ===== 非复式连肖（生肖串 + 连肖 + N） =====
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

  // ===== 复式连尾 =====
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

  // ===== 非复式连尾（尾数串 + 连尾 + N） =====
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

  // ===== 宽松复式连肖 =====
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

  // ===== 宽松复式连尾 =====
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

  // ===== N不中 =====
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

  // ===== 非复式连肖（N连肖 + 生肖串，多组匹配） =====
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

  // ===== 非复式连尾（N连尾 + 尾数串，多组匹配） =====
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

  // ===== 平特肖 =====
  addMatch(new RegExp(`(?:平特(?:一肖|肖)?|[1一]肖中|平肖|平码[肖]?|一肖|独肖)${SEP}((?:[${Z}]+${SEP_CHARS}*)+)\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const zs = extractZodiacs(m[1]);
    const warnings = [];
    if (zs.length >= 2 && !kw) { warnings.push('缺少金额关键字'); }
    return { cat: '平特肖', nums: zs, amt, cnt: zs.length, total: amt * zs.length, kw, warnings };
  });

  // ===== 平特尾 =====
  addMatch(new RegExp(`(?:平特(?:一尾|尾)?|平尾|尾中)${SEP}((?:\\d+尾${SEP_CHARS}*)+)\\s*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const tails = (m[1].match(/\d/g) || []).map(d => d + '尾');
    const warnings = [];
    if (tails.length >= 2 && !kw) { warnings.push('缺少金额关键字'); }
    return { cat: '平特尾', nums: tails, amt, cnt: tails.length, total: amt * tails.length, kw, warnings };
  });

  // ===== 平码 =====
  addMatch(new RegExp(`(?:平码|独平)${SEP}((?:\\d+${SEP_CHARS}*)+)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    if (nums.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '平码', nums, amt, cnt: nums.length, total: amt * nums.length, kw, warnings };
  });

  // ===== 号码对 + 玩法名在后（如 "08-12 二中二 各组100"） =====
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

  // ===== 号码串 + 复式玩法 顺序（复式二中二/三中三/特碰） =====
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