// ===== parser.js - 单行订单解析（processOneLine）、继承上下文处理 =====

// ===== 以下常量供 matchers.js 中的 collectSpecialMatches 使用 =====
const SEP = '[\\s,\\-.。、+\\-*＊\\/\\\\|]';
const SEP_CHARS = '[\\s,\\-.。、+\\-*＊\\/\\\\|]';
const KW_GROUP = `(?:${KW_LIST.join('|')})`;
const AMT_GROUP = '(\\d+(?:\\.\\d+)?(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)?)';
const AMT_RE_STR = `(${KW_GROUP})?\\s*(${AMT_GROUP})`;
const END_AMT_RE = `(${AMT_GROUP})\\s*$`;

function extractAmtAndKw(fullText) {
  const kwMatch = fullText.match(new RegExp(`(${KW_GROUP})\\s*(${AMT_GROUP})`));
  if (kwMatch) {
    return { kw: kwMatch[1], amt: toNum(kwMatch[2]) };
  }
  const amtMatch = fullText.match(new RegExp(AMT_GROUP));
  if (amtMatch) {
    return { kw: '', amt: toNum(amtMatch[0]) };
  }
  return { kw: '', amt: 0 };
}

function parseTeMaSegment(content) {
  if (!content || !content.trim()) return null;
  const items = content.split('-').map(i => i.trim()).filter(i => i);
  const allNums = [];
  const displayItems = [];
  const warnings = [];
  items.forEach(item => {
    if (/^\d{1,2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
      const num = item.padStart(2, '0');
      allNums.push(num);
      displayItems.push(num);
    } else if (ZODIAC_NUMS[item]) {
      const nums = (ZODIAC_NUMS[item] || '').split(/[\s,，]+/);
      nums.forEach(n => {
        allNums.push(n.padStart(2, '0'));
        displayItems.push(n.padStart(2, '0'));
      });
    } else if (D[item]) {
      const val = D[item];
      if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        for (const z of val) {
          if (ZODIAC_NUMS[z]) {
            ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => {
              allNums.push(n.padStart(2, '0'));
              displayItems.push(n.padStart(2, '0'));
            });
          }
        }
      } else {
        val.split(/[\s,，]+/).filter(n => n.trim()).forEach(n => {
          allNums.push(n.padStart(2, '0'));
          displayItems.push(n.padStart(2, '0'));
        });
      }
    }
  });
  if (allNums.length === 0) return null;
  return { allNumsArr: allNums, displayItems, totalCount: allNums.length, warnings };
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

  const ZODIAC_SET = new Set('鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''));

  function tryMatchTeXiao(content) {
    if (!content || !content.trim()) return null;
    if (/特码/.test(content)) return null;
    if (/号各|号\s*各/.test(content)) return null;
    
    const trimmed = content.trim();
    const shxMatch = trimmed.match(new RegExp(`(.+?)(各肖|各(?!数|号|组|码|注|下|买))\\s*(\\d+)`));
    if (!shxMatch) return null;
    const rawContent = shxMatch[1]; const amtRaw = parseInt(shxMatch[3]) || 0; const kw = shxMatch[2] || '';
    if (amtRaw <= 0) return null;
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

  let inheritedPlay = lastInheritablePlay;
  for (const r of lineResults) {
    if (r.cat !== '__unrecognized__' && inheritableCats[r.cat]) {
      inheritedPlay = { cat: r.cat, kw: r.kw || '', ...inheritableCats[r.cat] };
      break;
    }
  }

  const processed = [];
  for (const r of lineResults) {
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

    const raw = (r.rawLine || '').trim();
    if (!raw) {
      processed.push(r);
      continue;
    }

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

    let content = raw.substring(0, amtMatch.index).trim();
    if (!content) {
      processed.push(r);
      continue;
    }

    let contentKw = '';
    for (const kw of KW_LIST) {
      if (content.includes(kw)) {
        contentKw = kw;
        break;
      }
    }

    const inheritedKw = inheritedPlay.kw || '';
    if (contentKw !== inheritedKw) {
      r.warnings = [`关键字不一致（需要"${inheritedKw || '无关键字'}"，实际"${contentKw || '无关键字'}"）`];
      processed.push(r);
      continue;
    }

    let cleanContent = content;
    if (contentKw) {
      cleanContent = content.replace(new RegExp(contentKw), '').trim();
    }
    cleanContent = cleanContent.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '-');

    let matched = false;
    if (inheritedPlay.type === 'zodiac') {
      let items = cleanContent.split('-').filter(i => i.trim());
      if (items.length !== inheritedPlay.count) {
        const pureZodiacStr = cleanContent.replace(/[^鼠牛虎兔龙蛇马羊猴鸡狗猪]/g, '');
        if (pureZodiacStr.length === inheritedPlay.count) {
          items = pureZodiacStr.split('');
        }
      }

      if (inheritedPlay.count === 1) {
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
      let items = cleanContent.split('-').filter(i => /\d+尾/.test(i.trim()));
      if (items.length !== inheritedPlay.count) {
        const pureDigits = cleanContent.replace(/[^0-9]/g, '');
        if (pureDigits.length === inheritedPlay.count) {
          items = pureDigits.split('').map(d => d + '尾');
        }
      }

      if (inheritedPlay.count === 1) {
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
      if (idx > 0 && /[\u4e00-\u9fa5]/.test(line.charAt(idx - 1))) {
        continue;
      }
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
  let processedText = preprocess(text);
  const lines = processedText.split('\n');
  const allResults = [];
  const lineRegions = [];
  let currentLineRegion = currentRegion;
  
  const dotRegion = window._dotRegion || 'auto';

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