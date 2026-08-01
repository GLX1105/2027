// ===== recognizeEngine.js - 订单识别完整流水线（预处理→匹配→解析→显示） =====

// ===== 辅助：自定义金额前后缀、前缀、替换预设、分类缩写读取 =====
function getCustomAmountSuffixes() { try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; } }
function getCustomAmountPrefixes() { try { return JSON.parse(localStorage.getItem('customAmountPrefixes') || '[]'); } catch (e) { return []; } }
function getCustomPrefixes() { try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; } }
function getReplacePresets() { try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; } }
function getCategoryAliases() { try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; } }
function getCustomSuffixes() { try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; } }

// ===== 关键字列表与金额匹配相关正则构建 =====
const KW_LIST = ['每一注', '每组各', '每个数', '各数', '各组', '每组', '每数', '每号', '各号', '号各', '各码', '各注', '个号', '个数', '组各', '各下', '各买', '一注', '个组', '每个', '各', '组', '注', '名', '=', '＝', '下', '买', '个', '共', '每', '打', '投', '号', '各号码', '每个号', '每个号码', '个号码', '各号各', '个号各', '每号', '每号码'];

// 金额匹配正则部分
const moneyKwPart = `(?:${KW_LIST.join('|')})`;
const moneySuffixPart = '(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)';
const AMT_GROUP = `(?:\\d+(?:\\.\\d+)?|[一二三四五六七八九十百千两]+)`;
const AMT_RE_STR = `${AMT_GROUP}(?:${moneySuffixPart})?`;
const END_AMT_RE = new RegExp(`(?:${moneyKwPart}\\s*)?${AMT_GROUP}(?:${moneySuffixPart})?(?:\\s|$)`);

// 分隔符
const SEP_CHARS = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]+';
const SEP = `[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]*`;

// 金额提取辅助函数（供匹配中使用）
function extractAmtAndKw(fullText) {
  // 从文本末尾提取金额，可能带有金额后缀
  const suffixList = [...new Set([...getCustomAmountSuffixes(), '米', '元', '块', '角', '分', '厘', '眯', '咪', '井', '#', '快', '斤'])];
  const suffixPattern = suffixList.length ? `(?:${suffixList.join('|')})?` : '';
  const amtRegex = new RegExp(`(${AMT_GROUP})\\s*(${suffixPattern})\\s*$`);
  const m = fullText.match(amtRegex);
  if (!m) return { amt: 0, kw: '' };
  const amt = toNum(m[1]);
  const beforeAmt = fullText.substring(0, m.index).trim();
  // 查找关键字
  let kw = '';
  for (const k of KW_LIST) {
    if (beforeAmt.includes(k)) { kw = k; break; }
  }
  return { amt, kw };
}

// 判断区间重叠
function isOverlap(start, end, intervals) {
  return intervals.some(iv => start < iv.end && end > iv.start);
}

// 键转所有号码
function keyToAllNums(key) {
  if (!D[key]) return [];
  const val = D[key];
  if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
    const ns = [];
    for (const z of val) {
      if (ZODIAC_NUMS[z]) { ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => ns.push(n)); }
    }
    return ns.sort((a, b) => parseInt(a) - parseInt(b));
  }
  return val.split(/[\s,，]+/).filter(n => n.trim());
}

// ===== 第一部分：预处理 =====

const _playPunctPatterns = buildPlayPatterns();
const _playPunctRegex = new RegExp(
    `(${_playPunctPatterns.join('|')})[，。！？；：、,\\.\\!\\?;:]`,
    'g'
);

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

function step_removePlayPunctuation(txt) {
    return txt.replace(_playPunctRegex, '$1');
}

// 应用分类缩写
function applyCategoryAliases(text) {
  const a = getCategoryAliases();
  if (!a.length) return text;
  const s = [...a].sort((x, y) => y.alias.length - x.alias.length);
  let r = text;
  s.forEach(x => { if (x.alias && x.target) r = r.split(x.alias).join(x.target); });
  return r;
}

// 应用替换预设
function applyReplacePresets(text) {
  const p = getReplacePresets();
  let r = text;
  p.forEach(x => {
    if (x.old && x.new) {
      const escapedOld = x.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedOld, 'g');
      r = r.replace(regex, x.new);
    }
  });
  return r;
}

function preprocess(txt) {
  let c = txt;
  c = c.replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // 字符容错：o/O -> 0，l/i/I/！/! -> 1
  c = c.replace(/[oO]/g, '0');
  c = c.replace(/[liI！!]/g, '1');

  // 中文标点处理
  c = c.replace(/(\d) ([。！？；，])/g, '$1$2');
  const reMoneyKw = new RegExp(`(${moneyKwPart}\\s*\\d+(?:\\.\\d+)?)\\s*([。！？；，])`, 'g');
  c = c.replace(reMoneyKw, '$1\n');
  const reMoneySuffix = new RegExp(`(\\d+(?:\\.\\d+)?\\s*${moneySuffixPart})\\s*([。！？；，])`, 'g');
  c = c.replace(reMoneySuffix, '$1\n');
  c = c.replace(/[。！？；，]/g, ' ');

  // 删除玩法名后面紧跟的标点符号
  c = step_removePlayPunctuation(c);

  // 应用分类缩写和替换预设
  c = applyCategoryAliases(c);
  c = applyReplacePresets(c);

  // 原有替换表
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
    '𤠣': '猴', '竜': '龙', '鷄': '鸡', '猎': '猪',
    '二中二复': '复式二中二', '二中二复式': '复式二中二',
    '红波小': '红小', '红波大': '红大', '绿波小': '绿小', '绿波大': '绿大',
    '蓝波小': '蓝小', '兰小': '蓝小', '兰波小': '蓝小',
    '蓝波大': '蓝大', '兰大': '蓝大', '兰波大': '蓝大',
    '尾数小': '小尾', '尾数大': '大尾',
    '平特一肖': '平特肖', '平特二肖': '平特肖', '平特三肖': '平特肖',
    '复试三肖': '复式三连肖', '三肖复式': '三连肖复式',
    '复试三尾': '复式三连尾', '三尾复式': '三连尾复式', '复3尾': '复三尾', '复三尾': '复式三连尾',
    '复试二中二': '复式二中二', '二中二复试': '复式二中二', '2中2复试': '复式二中二', '复试2中2': '复式二中二',
    '复试三中三': '复式三中三', '三中三复试': '复式三中三', '3中3复试': '复式三中三', '复试3中3': '复式三中三',
    '三三二二串': '复三复二', '三三二二': '复三复二', '家属': '家肖',
    '复3': '复三', '复三': '复式三', '复3尾': '复三尾'
  };
  for (const [k, v] of Object.entries(reps)) c = c.split(k).join(v);
  ['天天彩', '天天采', '天天', '天彩', '天采', '总单'].forEach(s => c = c.split(s).join(''));
  c = c.replace(/澳门\d+期/g, '');
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

// ===== 第二部分：特殊玩法匹配 =====

function collectSpecialMatches(text) {
  const Z = ZODIAC;
  const allMatches = [];

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

  // 连肖无关键字整行及带关键字版本
  const reLianXiaoNoKw = new RegExp(
      `^[\\s]*((?:[${Z}]+))[\\s]*([二三四五2345两])` +
      `(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)` +
      `[\\s]*(?:(${KW_LIST.join('|')})\\s*)?(${AMT_GROUP})\\s*$`,
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

  // 玩法在前，生肖在后的无关键字连肖
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

  // 修复：去掉 SEP_CHARS 后面多余的 +
  const reMultiLX = new RegExp(`([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)${SEP}((?:[${Z}]+${SEP_CHARS})+[${Z}]+)[\\s]*(?=${KW_LIST.join('|')})(?:${KW_LIST.join('|')})${SEP}${AMT_GROUP}`, 'g');
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

  // 修复：去掉 SEP_CHARS 后面多余的 +
  const reMultiLW = new RegExp(`([二三四五2345])(?:连尾|尾连)${SEP}((?:\\d+尾${SEP_CHARS})+\\d+尾)[\\s]*(?=${KW_LIST.join('|')})(?:${KW_LIST.join('|')})${SEP}${AMT_GROUP}`, 'g');
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

  // 特肖前缀识别
  addMatch(new RegExp(`特肖${SEP}((?:[${Z}]+${SEP_CHARS}*)+?)[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full);
    if (!amt || amt <= 0) return null;
    const zPart = m[1]; const zodiacs = (zPart.match(new RegExp(`[${Z}]`, 'g')) || []);
    if (zodiacs.length === 0) return null;
    const warnings = [];
    if (zodiacs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '特肖', nums: zodiacs, amt, cnt: zodiacs.length, total: amt * zodiacs.length, kw: kw || '各', warnings };
  });

  // 包玩法识别
  const BAO_ATTRS = ['红波','蓝波','绿波','红单','红双','蓝单','蓝双','绿单','绿双','红大','红小','蓝大','蓝小','绿大','绿小','单','双','大','小','家禽','野兽'];
  const BAO_ATTRS_SORTED = [...BAO_ATTRS].sort((a, b) => b.length - a.length);
  addMatch(new RegExp(`包${SEP}(${BAO_ATTRS_SORTED.join('|')})\\s*(\\d+)`, 'g'), m => {
    const full = m[0]; const attr = m[1]; const amt = toNum(m[2]);
    if (!amt || amt <= 0) return null;
    if (full.includes('各')) return { cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['包玩法不允许使用"各"关键字'], rawLine: full };
    return { cat: '包' + attr, nums: [attr], amt, cnt: 1, total: amt, kw: '各' };
  });

  // 特碰：碰法
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

  // 复式特碰
  addMatch(new RegExp(`复[式试]?特碰${SEP}((?:\\d+${SEP_CHARS}+)+\\d+)(?!${SEP_CHARS}*[拖托碰])[\\s]*${END_AMT_RE}`, 'g'), m => {
    const full = m[0]; const { amt, kw } = extractAmtAndKw(full); if (!amt || amt <= 0) return null;
    const nums = extractNums(m[1]); const invalidNums = findInvalidNums(m[1]);
    const warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    const pairs = combosNoSort(nums, 2).map(c => c.join('-'));
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: '特碰', nums: pairs, amt, cnt: pairs.length, total: amt * pairs.length, kw, warnings };
  });

  // 特碰数字直接配对
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

  // 生肖串 + N + 连肖 + 复试 + 关键字 + 金额
  addMatch(new RegExp(
      `((?:[${Z}]+))` +
      `[\\s]*([二三四五2345两])` +
      `(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)` +
      `${SEP}复[式试]?` +
      `[\\s]*(${KW_LIST.join('|')})${SEP}${AMT_GROUP}`, 'g'
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
  addMatch(new RegExp(`([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)[\\s]*((?:[${Z}]+(?:${SEP_CHARS}+[${Z}]+)*))${SEP}(?:(?=${KW_LIST.join('|')})(?:${KW_LIST.join('|')})${SEP}${AMT_GROUP}|${END_AMT_RE})`, 'g'), m => {
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
  addMatch(new RegExp(`([二三四五2345])(?:连尾|尾连)[\\s]*((?:\\d+${SEP_CHARS}*尾(?:${SEP_CHARS}+\\d+${SEP_CHARS}*尾)*)+)${SEP}(?:(?=${KW_LIST.join('|')})(?:${KW_LIST.join('|')})${SEP}${AMT_GROUP}|${END_AMT_RE})`, 'g'), m => {
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

  // 号码对 + 玩法名在后
  addMatch(new RegExp(
      `((?:\\d{1,2}${SEP_CHARS}+\\d{1,2}${SEP_CHARS}*)+)` +
      `[\\s]*([二2]中[二2]|[三3]中[三3]|特碰)` +
      `[\\s]*(${KW_LIST.join('|')})${SEP}${AMT_GROUP}`, 'g'
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

  // 号码串 + 复式玩法 顺序
  addMatch(new RegExp(
      `((?:\\d+${SEP_CHARS}+)+\\d+)` +
      `[\\s]*(复[式试]?(?:[二2]中[二2]|[三3]中[三3]|特碰))` +
      `[\\s]*(${KW_LIST.join('|')})${SEP}${AMT_GROUP}`, 'g'
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

// ===== 第三部分：单行解析与继承 =====

function parseTeMaSegment(content) {
  if (!content || !content.trim()) return null;
  return null;
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

function processOneLine(line) {
  if (!line.trim()) return [];

  // 号码-金额对识别（优先处理）
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
        // 范围号码识别
        if (subContent.includes('到') || (subMatch[0] && subMatch[0].includes('到'))) {
          const combined = subContent + (subMatch ? subMatch[0] : '');
          const rangeMatch = combined.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            const amt = toNum(subMatch[2]);
            const kw = subMatch[1];
            if (!kw) {
              results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: combined.trim() });
            } else if (start >= 1 && end <= 49 && start <= end) {
              const nums = [];
              for (let i = start; i <= end; i++) nums.push(String(i).padStart(2, '0'));
              results.push({ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt * nums.length, kw: kw, warnings: [] });
            } else {
              results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: combined.trim() });
            }
            subLast = subMatch.index + subMatch[0].length;
            continue;
          }
        }
        const teXiaoResult = tryMatchTeXiao(subContent + subMatch[0]);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          if (subContent && containsDictElement(subContent)) {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['无法识别的格式'], rawLine: subContent });
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
      // 同样的范围号码处理
      if (subContent.includes('到') || (subMatch[0] && subMatch[0].includes('到'))) {
        const combined = subContent + (subMatch ? subMatch[0] : '');
        const rangeMatch = combined.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          const amt = toNum(subMatch[2]);
          const kw = subMatch[1];
          if (!kw) {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: combined.trim() });
          } else if (start >= 1 && end <= 49 && start <= end) {
            const nums = [];
            for (let i = start; i <= end; i++) nums.push(String(i).padStart(2, '0'));
            results.push({ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt * nums.length, kw: kw, warnings: [] });
          } else {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: combined.trim() });
          }
          subLast = subMatch.index + subMatch[0].length;
          continue;
        }
      }
      const teXiaoResult = tryMatchTeXiao(subContent + subMatch[0]);
      if (teXiaoResult) {
        results.push(teXiaoResult);
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
              for (let i = start; i <= end; i++) nums.push(String(i).padStart(2, '0'));
              results.push({ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt * nums.length, kw: amtMatch[1], warnings: [] });
            } else {
              results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: remaining });
            }
          } else {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: remaining });
          }
        }
      } else if (remaining && containsDictElement(remaining)) {
        const teXiaoResult = tryMatchTeXiao(remaining);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字或有效玩法'], rawLine: remaining });
        }
      }
    }
  }

  if (specialMatches.length === 0 && results.length === 0) {
    // 整行检查范围号码
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
            for (let i = start; i <= end; i++) nums.push(String(i).padStart(2, '0'));
            return [{ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt * nums.length, kw: amtMatch[1], warnings: [] }];
          } else {
            return [{ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: line.trim() }];
          }
        } else {
          return [{ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: line.trim() }];
        }
      }
    }
    const teXiaoResult = tryMatchTeXiao(line);
    if (teXiaoResult) return [teXiaoResult];
    let subLast = 0;
    const kwReLocal = new RegExp(`(${KW_LIST.join('|')})\\s*(${AMT_RE_STR})`, 'g');
    let subMatch;
    while ((subMatch = kwReLocal.exec(line)) !== null) {
      const subContent = line.substring(subLast, subMatch.index);
      // 类似处理
      subLast = subMatch.index + subMatch[0].length;
    }
    if (subLast < line.length) {
      const remaining = line.substring(subLast).trim();
      if (remaining && containsDictElement(remaining)) {
        const teXiaoResult = tryMatchTeXiao(remaining);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字或有效玩法'], rawLine: remaining });
        }
      }
    }
  }

  return results;
}

// 继承处理
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
        processed.push({ cat: inheritedPlay.cat, nums: [comboStr], amt: r.amt, cnt: 1, total: r.amt, kw: inheritedPlay.kw || '各组', warnings: [], rawLine: r.rawLine || '', _inherited: true });
        continue;
      }
    }
    if (r.cat !== '__unrecognized__') {
      processed.push(r);
      continue;
    }
    if (!inheritedPlay) { processed.push(r); continue; }
    const raw = (r.rawLine || '').trim();
    if (!raw) { processed.push(r); continue; }
    const amtMatch = raw.match(/(\d+)\s*$/);
    if (!amtMatch) { processed.push(r); continue; }
    const amt = parseInt(amtMatch[1]) || 0;
    if (amt <= 0) { processed.push(r); continue; }
    let content = raw.substring(0, amtMatch.index).trim();
    if (!content) { processed.push(r); continue; }
    let contentKw = '';
    for (const kw of KW_LIST) { if (content.includes(kw)) { contentKw = kw; break; } }
    const inheritedKw = inheritedPlay.kw || '';
    if (contentKw !== inheritedKw) {
      r.warnings = [`关键字不一致（需要"${inheritedKw || '无关键字'}"，实际"${contentKw || '无关键字'}"）`];
      processed.push(r); continue;
    }
    let cleanContent = content;
    if (contentKw) { cleanContent = content.replace(new RegExp(contentKw), '').trim(); }
    cleanContent = cleanContent.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '-');
    let matched = false;
    if (inheritedPlay.type === 'zodiac') {
      let items = cleanContent.split('-').filter(i => i.trim());
      if (items.length !== inheritedPlay.count) {
        const pureZodiacStr = cleanContent.replace(/[^鼠牛虎兔龙蛇马羊猴鸡狗猪]/g, '');
        if (pureZodiacStr.length === inheritedPlay.count) items = pureZodiacStr.split('');
      }
      if (inheritedPlay.count === 1) {
        if (items.length === 1 && /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(items[0].trim())) {
          processed.push({ cat: inheritedPlay.cat, nums: [items[0].trim()], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      } else {
        if (items.length === inheritedPlay.count && items.every(i => /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(i.trim()))) {
          const comboStr = items.map(i => i.trim()).join('-');
          processed.push({ cat: inheritedPlay.cat, nums: [comboStr], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各组', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      }
    } else if (inheritedPlay.type === 'tail') {
      let items = cleanContent.split('-').filter(i => /\d+尾/.test(i.trim()));
      if (items.length !== inheritedPlay.count) {
        const pureDigits = cleanContent.replace(/[^0-9]/g, '');
        if (pureDigits.length === inheritedPlay.count) items = pureDigits.split('').map(d => d + '尾');
      }
      if (inheritedPlay.count === 1) {
        if (items.length === 1 && /\d+尾$/.test(items[0].trim())) {
          processed.push({ cat: inheritedPlay.cat, nums: [items[0].trim()], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      } else {
        if (items.length === inheritedPlay.count && items.every(i => /\d+尾$/.test(i.trim()))) {
          const comboStr = items.map(i => i.trim()).join('-');
          processed.push({ cat: inheritedPlay.cat, nums: [comboStr], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各组', warnings: [], rawLine: raw, _inherited: true });
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

// 地区提取
const REGION_KEYWORDS = {
  'macau': ['澳', '奥', '澳门', '奥门', '门', 'mc', 'MC', 'Mc'],
  'hongkong': ['港', '香', '香港', 'hk', 'HK', 'Hk'],
  'yuegang': ['粤', '粤港', 'yg', 'YG', 'Yg']
};
const REGION_LABELS = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

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
      if (idx > 0 && /[\u4e00-\u9fa5]/.test(line.charAt(idx - 1))) continue;
      const remaining = (line.substring(0, idx) + line.substring(idx + keyword.length)).trim();
      return { region, remaining };
    }
  }
  return null;
}

// 识别总入口
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
    if (!line.trim()) continue;
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

// ===== 第四部分：结果显示 =====

function displayResults(rs, container) {
  if (!container) container = document.getElementById('orderResult');
  if (!container) return;
  if (rs.length === 0) { container.innerHTML = ''; window._pureOrderLines = []; window._pureOrderRegions = []; window._cachedMaxLossData = []; return; }
  let total = 0; let html = '';
  const pureLines = [];
  const pureRegions = [];
  const maxLossData = [];
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

function updateOrderTotalDisplay() {
  const re = document.getElementById('orderResult');
  const box = document.getElementById('orderTotalAmountBox');
  const span = document.getElementById('orderTotalAmount');
  const lineCountSpan = document.getElementById('orderLineCount');
  if (!re || !box || !span) return;
  const pureLines = window._pureOrderLines || [];
  if (pureLines.length === 0) { box.style.display = 'none'; if (lineCountSpan) lineCountSpan.style.display = 'none'; return; }
  let total = 0; let validLineCount = pureLines.length;
  pureLines.forEach(line => {
    if (line.startsWith('特肖:')) {
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if (match) { const zodiacs = match[1].split('-').filter(z => z.trim()); const amt = parseInt(match[2]) || 0; total += zodiacs.length * amt; }
    } else if (line.startsWith('特碰:')) {
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if (match) { const cleaned = match[1].replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim()); const amtRaw = parseInt(match[2]) || 0; total += groups.length * amtRaw; }
    } else if (line.startsWith('包')) {
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) { const amtRaw = parseInt(match[3]) || 0; total += amtRaw; }
    } else if (line.startsWith('特码:')) {
      const { numbers, amount } = countItemsInLine(line); const cnt = numbers.length; if (cnt > 0 && amount > 0) total += cnt * amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) {
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0;
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') { const items = content.split('-').filter(i => i.trim()); total += items.length * amt; }
        else { const cleaned = content.replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim()); total += groups.length * amt; }
      }
    }
  });
  span.textContent = total;
  if (total > 0) { box.style.display = 'inline-flex'; if (lineCountSpan) { lineCountSpan.innerHTML = '<span style="color:#000;">' + validLineCount + '</span>行'; lineCountSpan.style.display = 'inline'; } }
  else { box.style.display = 'none'; if (lineCountSpan) lineCountSpan.style.display = 'none'; }
}

function computeCurrentOrderTotal() {
  const pureLines = window._pureOrderLines || [];
  let total = 0;
  pureLines.forEach(line => {
    if (line.startsWith('特肖:')) { const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/); if (match) { const zodiacs = match[1].split('-').filter(z => z.trim()); const amt = parseInt(match[2]) || 0; total += zodiacs.length * amt; } }
    else if (line.startsWith('特碰:')) { const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/); if (match) { const cleaned = match[1].replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim()); total += groups.length * (parseInt(match[2]) || 0); } }
    else if (line.startsWith('包')) { const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/); if (match) total += parseInt(match[3]) || 0; }
    else if (line.startsWith('特码:')) { const { numbers, amount } = countItemsInLine(line); const cnt = numbers.length; if (cnt > 0) total += cnt * amount; }
    else { const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/); if (match) { const playType = match[1]; const content = match[2]; const amt = parseInt(match[3]) || 0; if (playType === '平特肖' || playType === '平特尾' || playType === '平码') { const items = content.split('-').filter(i => i.trim()); total += items.length * amt; } else { const cleaned = content.replace(/[()]/g, ''); const groups = cleaned.split(/\s+/).filter(c => c.trim()); total += groups.length * amt; } } }
  });
  return total;
}

function updateOrderCountDisplay() {
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  getOrderRecords().then(orders => {
    const todayOrders = orders.filter(r => r.date === fd);
    const countEl = document.getElementById('duiJiangOrderCount');
    if (countEl) { countEl.textContent = '(共' + todayOrders.length + '单)'; }
  });
}