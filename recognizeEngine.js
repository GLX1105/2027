// ===== recognizeEngine.js - 订单识别完整流水线（预处理→匹配→解析→显示） =====

// ===== 辅助函数 =====
function getCustomAmountSuffixes() { try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; } }
function getCustomAmountPrefixes() { try { return JSON.parse(localStorage.getItem('customAmountPrefixes') || '[]'); } catch (e) { return []; } }
function getCustomPrefixes() { try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; } }
function getReplacePresets() { try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; } }
function getCategoryAliases() { try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; } }
function getCustomSuffixes() { try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; } }

// ===== 关键字列表 =====
const KW_LIST = ['每一注', '每组各', '每个数', '各数', '各组', '每组', '每数', '每号', '各号', '号各', '各码', '各注', '个号', '个数', '组各', '各下', '各买', '一注', '个组', '每个', '各', '组', '注', '名', '=', '＝', '下', '买', '个', '共', '每', '打', '投', '号', '各号码', '每个号', '每个号码', '个号码', '各号各', '个号各', '每号', '每号码'];
const KW_GROUP = KW_LIST.join('|');

// ===== 金额匹配 =====
const moneySuffixPart = '(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)';
const AMT_GROUP = '(?:\\d+(?:\\.\\d+)?|[一二三四五六七八九十百千两]+)';
const AMT_RE_STR = AMT_GROUP + '(?:' + moneySuffixPart + ')?';
const END_AMT_RE = new RegExp('(?:' + KW_GROUP + '\\s*)?' + AMT_GROUP + '(?:' + moneySuffixPart + ')?(?:\\s|$)');

// ===== 分隔符（原始定义，不修改） =====
const SEP_CHARS = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]+';
const SEP = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]*';

// ===== 安全分隔符（用于拼接，不包含末尾的 +） =====
const _SC = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]';

// ===== 金额提取 =====
function extractAmtAndKw(fullText) {
  const suffixList = [...new Set([...getCustomAmountSuffixes(), '米', '元', '块', '角', '分', '厘', '眯', '咪', '井', '#', '快', '斤'])];
  const suffixPattern = suffixList.length ? '(?:' + suffixList.join('|') + ')?' : '';
  const amtRegex = new RegExp('(' + AMT_GROUP + ')\\s*(' + suffixPattern + ')\\s*$');
  const m = fullText.match(amtRegex);
  if (!m) return { amt: 0, kw: '' };
  const amt = toNum(m[1]);
  const beforeAmt = fullText.substring(0, m.index).trim();
  let kw = '';
  for (const k of KW_LIST) { if (beforeAmt.includes(k)) { kw = k; break; } }
  return { amt, kw };
}

// ===== 区间重叠判断 =====
function isOverlap(start, end, intervals) {
  return intervals.some(function(iv) { return start < iv.end && end > iv.start; });
}

// ===== 键转所有号码 =====
function keyToAllNums(key) {
  if (!D[key]) return [];
  var val = D[key];
  if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
    var ns = [];
    for (var i = 0; i < val.length; i++) {
      var z = val[i];
      if (ZODIAC_NUMS[z]) {
        var arr = ZODIAC_NUMS[z].split(/[\s,，]+/);
        for (var j = 0; j < arr.length; j++) ns.push(arr[j]);
      }
    }
    return ns.sort(function(a, b) { return parseInt(a) - parseInt(b); });
  }
  return val.split(/[\s,，]+/).filter(function(n) { return n.trim(); });
}

// ===== 玩法名正则预处理 =====
var _playPunctPatterns = (function() {
  var patterns = [];
  for (var i = 0; i < PLAY_NAMES_LIST.length; i++) {
    var name = PLAY_NAMES_LIST[i];
    patterns.push(name);
    for (var j = 2; j <= 5; j++) { patterns.push(j + name); }
  }
  patterns.sort(function(a, b) { return b.length - a.length; });
  return patterns;
})();

var _playPunctRegex = new RegExp('(' + _playPunctPatterns.join('|') + ')[，。！？；：、,\\.\\!\\?;:]', 'g');

function step_removePlayPunctuation(txt) { return txt.replace(_playPunctRegex, '$1'); }

// ===== 应用分类缩写 =====
function applyCategoryAliases(text) {
  var a = getCategoryAliases();
  if (!a.length) return text;
  var s = [].concat(a).sort(function(x, y) { return y.alias.length - x.alias.length; });
  var r = text;
  for (var i = 0; i < s.length; i++) {
    if (s[i].alias && s[i].target) r = r.split(s[i].alias).join(s[i].target);
  }
  return r;
}

// ===== 应用替换预设 =====
function applyReplacePresets(text) {
  var p = getReplacePresets();
  var r = text;
  for (var i = 0; i < p.length; i++) {
    if (p[i].old && p[i].new) r = r.split(p[i].old).join(p[i].new);
  }
  return r;
}

// ===== 预处理主函数 =====
function preprocess(txt) {
  var c = txt;
  c = c.replace(/[\uFF01-\uFF5E]/g, function(ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); });
  c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  c = c.replace(/[oO]/g, '0');
  c = c.replace(/[liI！!]/g, '1');
  c = c.replace(/(\d) ([。！？；，])/g, '$1$2');
  var reMoneyKw = new RegExp('(?:' + KW_GROUP + '\\s*\\d+(?:\\.\\d+)?)\\s*([。！？；，])', 'g');
  c = c.replace(reMoneyKw, '$1\n');
  var reMoneySuffix = new RegExp('(\\d+(?:\\.\\d+)?\\s*' + moneySuffixPart + ')\\s*([。！？；，])', 'g');
  c = c.replace(reMoneySuffix, '$1\n');
  c = c.replace(/[。！？；，]/g, ' ');
  c = step_removePlayPunctuation(c);
  c = applyCategoryAliases(c);
  c = applyReplacePresets(c);

  // ===== 替换表 =====
  var reps = {
    '夏式': '复式', '復式': '复式', '复制': '复式', '復制': '复式', '复习': '复式', '复试': '复式', '复示': '复式', '覆式': '复式', '複试': '复式',
    '友': '有', '尤': '龙', '虑': '虎', '坡': '波', '午': '牛', '綠': '绿', '孑': '子', '监': '蓝', '俏': '肖', '串肖': '连肖', '连/肖': '连肖',
    '一连肖': '平特肖', '一连': '平特', '⑤': '5', '|': '1', '肉': '', '藍': '蓝', '录': '绿', '碌': '绿', '禄': '绿', '啵': '波', '○': '0', 'σ': '0', '莲': '连', '联': '连',
    '连消': '连肖', '车肖': '连肖', '拾': '十', '佰': '百', '仟': '千', '大数': '大', '来': '下', '单号': '单', '双号': '双', '大号': '大', '小号': '小',
    '家肖': '家禽', '野肖': '野兽', '老鼠': '鼠', '老虎': '虎', '双数数字': '双', '和数单': '合数单', '和数': '合数', '小数': '小', '双数': '双',
    '单数': '单', '合数小': '合小', '合数大': '合大', '≡': '三', '山': '三', '俩': '二', '毎': '每', '五中四': '复式4肖', '二全中': '二中二',
    '三全中': '三中三', '復制': '复式', '鳮': '鸡', '単': '单', '組': '组', '平待': '平特', '泼': '波', '肖连': '连肖', '消': '肖', '〇': '0',
    'l': '1', 'I': '1', '壹': '一', '贰': '二', '叁': '三', '肆': '四', '陆': '六', '柒': '七', '捌': '八', '玖': '九', '伍': '五', '免': '兔', '拘': '狗',
    '馬': '马', '龍': '龙', '雞': '鸡', '豬': '猪', '候': '猴', '侯': '猴', '兔子': '兔', '猴子': '猴', '子': '鼠', '老蛇': '蛇',
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
  for (var k in reps) c = c.split(k).join(reps[k]);
  ['天天彩', '天天采', '天天', '天彩', '天采', '总单'].forEach(function(s) { c = c.split(s).join(''); });
  c = c.replace(/澳门\d+期/g, '');
  c = c.replace(/[^\dA-Za-z\u4e00-\u9fa5\s,\-，\=＝\.]/g, ' ');
  c = c.replace(/\n/g, '[[[NL]]]');
  c = c.replace(/[\s]{2,}/g, ' ');
  c = c.replace(/\[\[\[NL\]\]\]/g, '\n');
  c = c.replace(/((?:\d[\s,，.。、+\-*＊\/\\|]*)+)头/g, function(match, digits) {
    var nums = (digits.match(/\d/g) || []);
    if (nums.length >= 2) return nums.map(function(n) { return n + '头'; }).join('-');
    return match;
  });
  c = c.replace(/((?:\d[\s,，.。、+\-*＊\/\\|]*)+)尾/g, function(match, digits) {
    var nums = (digits.match(/\d/g) || []);
    if (nums.length >= 2) return nums.map(function(n) { return n + '尾'; }).join('-');
    return match;
  });
  return c.trim();
}

// ===== 特殊玩法匹配 =====
function collectSpecialMatches(text) {
  var Z = ZODIAC;
  var allMatches = [];

  function itemsToNums(items) {
    var nums = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]+$/.test(item)) {
        for (var j = 0; j < item.length; j++) {
          var ch = item[j];
          if (ZODIAC_NUMS[ch]) {
            var arr = ZODIAC_NUMS[ch].split(/[\s,，]+/);
            for (var k = 0; k < arr.length; k++) nums.push(arr[k]);
          }
        }
      } else if (/^\d+尾$/.test(item)) {
        var d = item.replace('尾', '');
        if (D[d + '尾']) {
          var arr2 = D[d + '尾'].split(/[\s,，]+/);
          for (var k2 = 0; k2 < arr2.length; k2++) nums.push(arr2[k2]);
        }
      } else if (/^\d{1,2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(String(parseInt(item)).padStart(2, '0'));
      }
    }
    return [...new Set(nums)].sort(function(a, b) { return parseInt(a) - parseInt(b); });
  }

  function handleDragMatch(leftPart, rightPart, amt, kw, catName) {
    var leftItems = leftPart.split(new RegExp(SEP_CHARS + '+')).filter(function(s) { return s.trim(); });
    var rightItems = rightPart.split(new RegExp(SEP_CHARS + '+')).filter(function(s) { return s.trim(); });
    if (leftItems.length === 0 || rightItems.length === 0) return null;
    var leftNums = itemsToNums(leftItems);
    var rightNums = itemsToNums(rightItems);
    if (leftNums.length === 0 || rightNums.length === 0) return null;
    var pairs = [];
    for (var a = 0; a < leftNums.length; a++) {
      for (var b = 0; b < rightNums.length; b++) {
        if (leftNums[a] !== rightNums[b]) pairs.push(leftNums[a] + '-' + rightNums[b]);
      }
    }
    if (pairs.length === 0) return null;
    var warnings = [];
    if (pairs.length > 1 && !kw) warnings.push('缺少金额关键字');
    return { cat: catName || '二中二', nums: pairs, amt: amt, cnt: pairs.length, total: amt * pairs.length, kw: kw, warnings: warnings };
  }

  var multiMatches = [];
  var lockedIntervals = [];

  // 连肖无关键字整行
  var reLianXiaoNoKw = new RegExp(
    '^[\\s]*((?:[' + Z + ']+))[\\s]*([二三四五2345两])' +
    '(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)' +
    '[\\s]*(?:(' + KW_GROUP + ')\\s*)?(' + AMT_GROUP + ')\\s*$', 'gm');
  var mLX;
  while ((mLX = reLianXiaoNoKw.exec(text)) !== null) {
    var full = mLX[0].trim();
    var zPart = mLX[1];
    var k = toNum(mLX[2].replace(/[^0-9二三四五两]/g, ''));
    if (!k || k < 2 || k > 5) continue;
    var kw = mLX[4] || '';
    var amt = toNum(mLX[5] || mLX[6]);
    if (!amt || amt <= 0) continue;
    var zChars = (zPart.match(new RegExp('[' + Z + ']', 'g')) || []).join('');
    if (zChars.length !== k) {
      multiMatches.push({ start: mLX.index, end: mLX.index + mLX[0].length, result: { cat: k + '连肖', nums: [], amt: amt, cnt: 0, total: 0, kw: kw, warnings: [zChars + '：连肖数(' + k + ')与生肖数(' + zChars.length + ')不匹配'] } });
      lockedIntervals.push({ start: mLX.index, end: mLX.index + mLX[0].length });
      continue;
    }
    var comb = zCombosKeepOrder(zChars, k);
    var warnings = [];
    if (!kw && comb.length > 1) warnings.push('缺少金额关键字');
    multiMatches.push({ start: mLX.index, end: mLX.index + mLX[0].length, result: { cat: k + '连肖', nums: comb, amt: amt, cnt: comb.length, total: amt * comb.length, kw: kw || '各组', warnings: warnings } });
    lockedIntervals.push({ start: mLX.index, end: mLX.index + mLX[0].length });
  }

  // 玩法在前的无关键字连肖
  var reLianXiaoNoKw2 = new RegExp(
    '^[\\s]*([二三四五2345两])' +
    '(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)' +
    '[\\s，,]*((?:[' + Z + ']+))\\s*(' + AMT_GROUP + ')\\s*$', 'gm');
  var mLX2;
  while ((mLX2 = reLianXiaoNoKw2.exec(text)) !== null) {
    if (isOverlap(mLX2.index, mLX2.index + mLX2[0].length, lockedIntervals)) continue;
    var k2 = toNum(mLX2[1].replace(/[^0-9二三四五两]/g, ''));
    if (!k2 || k2 < 2 || k2 > 5) continue;
    var zPart2 = mLX2[2];
    var amt2 = toNum(mLX2[3] || mLX2[4]);
    if (!amt2 || amt2 <= 0) continue;
    var zChars2 = (zPart2.match(new RegExp('[' + Z + ']', 'g')) || []).join('');
    if (zChars2.length !== k2) {
      multiMatches.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length, result: { cat: k2 + '连肖', nums: [], amt: amt2, cnt: 0, total: 0, kw: '', warnings: [zChars2 + '：连肖数(' + k2 + ')与生肖数(' + zChars2.length + ')不匹配'] } });
      lockedIntervals.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length });
      continue;
    }
    var comb2 = zCombosKeepOrder(zChars2, k2);
    var warnings2 = [];
    if (comb2.length > 1) warnings2.push('缺少金额关键字');
    multiMatches.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length, result: { cat: k2 + '连肖', nums: comb2, amt: amt2, cnt: comb2.length, total: amt2 * comb2.length, kw: '各组', warnings: warnings2 } });
    lockedIntervals.push({ start: mLX2.index, end: mLX2.index + mLX2[0].length });
  }

  // 多组连肖（修复：使用 _SC 避免 ++ 错误）
  var reMultiLX = new RegExp(
    '([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)' + SEP +
    '((?:[' + Z + ']+' + SEP_CHARS + ')+[' + Z + ']+)' +
    '[\\s]*(?=' + KW_GROUP + ')' + KW_GROUP + SEP + AMT_GROUP, 'g');
  var m;
  while ((m = reMultiLX.exec(text)) !== null) {
    var full3 = m[0];
    var amtKw3 = extractAmtAndKw(full3);
    if (!amtKw3.amt || amtKw3.amt <= 0) continue;
    var k3 = toNum(m[1].replace(/[^0-9二三四五两]/g, ''));
    if (!k3 || k3 < 2 || k3 > 5) continue;
    var zPart3 = m[2];
    var groups3 = zPart3.split(new RegExp(SEP_CHARS + '+')).filter(function(g) { return g.trim().length >= k3; });
    if (groups3.length <= 1) continue;
    var allCombos3 = [];
    for (var i3 = 0; i3 < groups3.length; i3++) {
      var zChars3 = groups3[i3].trim();
      if (zChars3.length === k3) {
        var arr3 = zCombosKeepOrder(zChars3, k3);
        for (var j3 = 0; j3 < arr3.length; j3++) allCombos3.push(arr3[j3]);
      }
    }
    if (allCombos3.length === 0) continue;
    var warnings3 = [];
    if (allCombos3.length > 1 && !amtKw3.kw) warnings3.push('缺少金额关键字');
    multiMatches.push({ start: m.index, end: m.index + m[0].length, result: { cat: k3 + '连肖', nums: allCombos3, amt: amtKw3.amt, cnt: allCombos3.length, total: amtKw3.amt * allCombos3.length, kw: amtKw3.kw, warnings: warnings3 } });
    lockedIntervals.push({ start: m.index, end: m.index + m[0].length });
  }

  // 多组连尾（修复）
  var reMultiLW = new RegExp(
    '([二三四五2345])(?:连尾|尾连)' + SEP +
    '((?:\\d+尾' + SEP_CHARS + ')+\\d+尾)' +
    '[\\s]*(?=' + KW_GROUP + ')' + KW_GROUP + SEP + AMT_GROUP, 'g');
  while ((m = reMultiLW.exec(text)) !== null) {
    var full4 = m[0];
    var amtKw4 = extractAmtAndKw(full4);
    if (!amtKw4.amt || amtKw4.amt <= 0) continue;
    var k4 = toNum(m[1]);
    if (!k4 || k4 < 2 || k4 > 5) continue;
    var tailPart4 = m[2];
    var groups4 = tailPart4.split(new RegExp(SEP_CHARS + '+')).filter(function(g) { return g.trim().length > 0; });
    if (groups4.length <= 1) continue;
    var allCombos4 = [];
    for (var i4 = 0; i4 < groups4.length; i4++) {
      var digits4 = (groups4[i4].match(/\d/g) || []);
      if (digits4.length === k4) {
        var arr4 = tailCKeepOrder(digits4.join(','), k4);
        for (var j4 = 0; j4 < arr4.length; j4++) allCombos4.push(arr4[j4]);
      }
    }
    if (allCombos4.length === 0) continue;
    var warnings4 = [];
    if (allCombos4.length > 1 && !amtKw4.kw) warnings4.push('缺少金额关键字');
    multiMatches.push({ start: m.index, end: m.index + m[0].length, result: { cat: k4 + '连尾', nums: allCombos4, amt: amtKw4.amt, cnt: allCombos4.length, total: amtKw4.amt * allCombos4.length, kw: amtKw4.kw, warnings: warnings4 } });
    lockedIntervals.push({ start: m.index, end: m.index + m[0].length });
  }

  // ===== addMatch 包装函数 =====
  function addMatch(re, handler) {
    var m;
    while ((m = re.exec(text)) !== null) {
      if (isOverlap(m.index, m.index + m[0].length, lockedIntervals)) continue;
      var info = handler(m);
      if (info) {
        allMatches.push({ start: m.index, end: m.index + m[0].length, result: info });
      }
    }
  }

  // ===== 特肖前缀识别 =====
  addMatch(new RegExp('特肖' + SEP + '((?:[' + Z + ']+' + SEP_CHARS + '*)+?)' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var zPart = m[1];
    var zodiacs = (zPart.match(new RegExp('[' + Z + ']', 'g')) || []);
    if (zodiacs.length === 0) return null;
    var warnings = [];
    if (zodiacs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '特肖', nums: zodiacs, amt: amtKw.amt, cnt: zodiacs.length, total: amtKw.amt * zodiacs.length, kw: amtKw.kw || '各', warnings: warnings };
  });

  // ===== 包玩法识别 =====
  var BAO_ATTRS = ['红波','蓝波','绿波','红单','红双','蓝单','蓝双','绿单','绿双','红大','红小','蓝大','蓝小','绿大','绿小','单','双','大','小','家禽','野兽'];
  var BAO_ATTRS_SORTED = [].concat(BAO_ATTRS).sort(function(a, b) { return b.length - a.length; });
  addMatch(new RegExp('包' + SEP + '(' + BAO_ATTRS_SORTED.join('|') + ')\\s*(\\d+)', 'g'), function(m) {
    var full = m[0];
    var attr = m[1];
    var amt = toNum(m[2]);
    if (!amt || amt <= 0) return null;
    if (full.indexOf('各') !== -1) return { cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['包玩法不允许使用"各"关键字'], rawLine: full };
    return { cat: '包' + attr, nums: [attr], amt: amt, cnt: 1, total: amt, kw: '各' };
  });

  // ===== 特碰：碰法 =====
  addMatch(new RegExp(
    '特碰' + SEP +
    '((?:[' + Z + ']+|\\d+尾|\\d{1,2})(?:' + SEP_CHARS + '+(?:[' + Z + ']+|\\d+尾|\\d{1,2}))*)' +
    SEP_CHARS + '*(?:碰)' + SEP_CHARS + '*' +
    '((?:[' + Z + ']+|\\d+尾|\\d{1,2})(?:' + SEP_CHARS + '+(?:[' + Z + ']+|\\d+尾|\\d{1,2}))*?)' +
    '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    return handleDragMatch(m[1], m[2], amtKw.amt, amtKw.kw, '特碰');
  });

  // 二中二拖法
  addMatch(new RegExp(
    '[二2]中[二2]' + SEP +
    '((?:[' + Z + ']+|\\d+尾|\\d{1,2})(?:' + SEP_CHARS + '+(?:[' + Z + ']+|\\d+尾|\\d{1,2}))*)' +
    SEP_CHARS + '*(?:拖|托)' + SEP_CHARS + '*' +
    '((?:[' + Z + ']+|\\d+尾|\\d{1,2})(?:' + SEP_CHARS + '+(?:[' + Z + ']+|\\d+尾|\\d{1,2}))*?)' +
    '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    return handleDragMatch(m[1], m[2], amtKw.amt, amtKw.kw, '二中二');
  });

  // 复式二中二
  addMatch(new RegExp('复[式试]?[二2]中[二2]' + SEP + '((?:\\d+' + SEP_CHARS + ')+\\d+)(?!' + SEP_CHARS + '*[拖托碰])' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var nums = extractNums(m[1]);
    var invalidNums = findInvalidNums(m[1]);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var pairs = combosNoSort(nums, 2).map(function(c) { return c.join('-'); });
    if (pairs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '二中二', nums: pairs, amt: amtKw.amt, cnt: pairs.length, total: amtKw.amt * pairs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 非复式二中二
  addMatch(new RegExp('[二2]中[二2]' + SEP + '((?:\\d{1,2}' + SEP_CHARS + '+\\d{1,2}' + SEP_CHARS + '*)+)(?!' + SEP_CHARS + '*[拖托碰])' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var numPart = m[1];
    var invalidNums = findInvalidNums(numPart);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var pairs = [];
    var pr = new RegExp('(\\d{1,2})' + SEP_CHARS + '+(\\d{1,2})', 'g');
    var pm;
    while ((pm = pr.exec(numPart)) !== null) {
      pairs.push(pm[1] + '-' + pm[2]);
    }
    if (pairs.length === 0) {
      var nums = extractNums(numPart);
      if (nums.length % 2 !== 0 || nums.length === 0) {
        warnings.push('号码数(' + nums.length + ')与二中二不匹配');
        return { cat: '二中二', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
      }
      var uniq = [...new Set(nums)].sort(function(a, b) { return parseInt(a) - parseInt(b); });
      combosNoSort(uniq, 2).forEach(function(c) { pairs.push(c.join('-')); });
    }
    if (pairs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '二中二', nums: pairs, amt: amtKw.amt, cnt: pairs.length, total: amtKw.amt * pairs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 复式特碰
  addMatch(new RegExp('复[式试]?特碰' + SEP + '((?:\\d+' + SEP_CHARS + ')+\\d+)(?!' + SEP_CHARS + '*[拖托碰])' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var nums = extractNums(m[1]);
    var invalidNums = findInvalidNums(m[1]);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var pairs = combosNoSort(nums, 2).map(function(c) { return c.join('-'); });
    if (pairs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '特碰', nums: pairs, amt: amtKw.amt, cnt: pairs.length, total: amtKw.amt * pairs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 特碰数字直接配对
  addMatch(new RegExp('特碰' + SEP + '((?:\\d{1,2}' + SEP_CHARS + '+\\d{1,2}' + SEP_CHARS + '*)+)(?!' + SEP_CHARS + '*[拖托碰])' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var numPart = m[1];
    var invalidNums = findInvalidNums(numPart);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var pairs = [];
    var pr = new RegExp('(\\d{1,2})' + SEP_CHARS + '+(\\d{1,2})', 'g');
    var pm;
    while ((pm = pr.exec(numPart)) !== null) {
      pairs.push(pm[1] + '-' + pm[2]);
    }
    if (pairs.length === 0) {
      var nums = extractNums(numPart);
      if (nums.length % 2 !== 0 || nums.length === 0) {
        warnings.push('号码数(' + nums.length + ')与特碰不匹配');
        return { cat: '特碰', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
      }
      var uniq = [...new Set(nums)].sort(function(a, b) { return parseInt(a) - parseInt(b); });
      combosNoSort(uniq, 2).forEach(function(c) { pairs.push(c.join('-')); });
    }
    if (pairs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '特碰', nums: pairs, amt: amtKw.amt, cnt: pairs.length, total: amtKw.amt * pairs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 复式三中三
  addMatch(new RegExp('复[式试]?[三3]中[三3]' + SEP + '((?:\\d+' + SEP_CHARS + ')+\\d+)' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var nums = extractNums(m[1]);
    var invalidNums = findInvalidNums(m[1]);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var triples = combosNoSort(nums, 3).map(function(c) { return c.join('-'); });
    if (triples.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '三中三', nums: triples, amt: amtKw.amt, cnt: triples.length, total: amtKw.amt * triples.length, kw: amtKw.kw, warnings: warnings };
  });

  // 非复式三中三
  addMatch(new RegExp('[三3]中[三3]' + SEP + '((?:\\d{1,2}' + SEP_CHARS + '+\\d{1,2}' + SEP_CHARS + '+\\d{1,2}' + SEP_CHARS + '*)+)' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var numPart = m[1];
    var invalidNums = findInvalidNums(numPart);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var triples = [];
    var tr = new RegExp('(\\d{1,2})' + SEP_CHARS + '+(\\d{1,2})' + SEP_CHARS + '+(\\d{1,2})', 'g');
    var tm;
    while ((tm = tr.exec(numPart)) !== null) {
      triples.push(tm[1] + '-' + tm[2] + '-' + tm[3]);
    }
    if (triples.length === 0) {
      var nums = extractNums(numPart);
      if (nums.length % 3 !== 0 || nums.length === 0) {
        warnings.push('号码数(' + nums.length + ')与三中三不匹配');
        return { cat: '三中三', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
      }
      var uniq = [...new Set(nums)].sort(function(a, b) { return parseInt(a) - parseInt(b); });
      combosNoSort(uniq, 3).forEach(function(c) { triples.push(c.join('-')); });
    }
    if (triples.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '三中三', nums: triples, amt: amtKw.amt, cnt: triples.length, total: amtKw.amt * triples.length, kw: amtKw.kw, warnings: warnings };
  });

  // 复式连肖
  addMatch(new RegExp('([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)' + SEP + '复[式试]?' + SEP + '((?:[' + Z + ']+))\\s*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var k = toNum(m[1].replace(/[^0-9二三四五两]/g, ''));
    if (!k || k < 2 || k > 5) return null;
    var zPart = m[2].trim();
    var zChars = (zPart.match(new RegExp('[' + Z + ']', 'g')) || []).join('');
    if (!zChars || zChars.length < k) return null;
    var comb = zCombosKeepOrder(zChars, k);
    var warnings = [];
    if (!amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // 生肖串 + N + 连肖 + 复试 + 关键字 + 金额
  addMatch(new RegExp(
    '((?:[' + Z + ']+))' +
    '[\\s]*([二三四五2345两])' +
    '(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)' +
    SEP + '复[式试]?' +
    '[\\s]*(' + KW_GROUP + ')' + SEP + AMT_GROUP, 'g'
  ), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var zPart = m[1];
    var k = toNum(m[2].replace(/[^0-9二三四五两]/g, ''));
    if (!k || k < 2 || k > 5) return null;
    var zChars = (zPart.match(new RegExp('[' + Z + ']', 'g')) || []).join('');
    if (zChars.length < k) return null;
    var comb = zCombosKeepOrder(zChars, k);
    if (comb.length === 0) return null;
    var warnings = [];
    if (!amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // 非复式连肖（生肖串 + 连肖 + N）
  addMatch(new RegExp('((?:[' + Z + ']+))[\\s]*(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)' + SEP + '([二三四五2345两])\\s*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var zPart = m[1];
    var zChars = (zPart.match(new RegExp('[' + Z + ']', 'g')) || []).join('');
    var k = toNum(m[2].replace(/[^0-9二三四五两]/g, ''));
    if (!k || k < 2 || k > 5) return null;
    var warnings = [];
    var afterEnd = text.substring(m.index + m[0].length);
    if (!amtKw.kw && /^\s*[鼠牛虎兔龙蛇马羊猴鸡狗猪]+/.test(afterEnd)) return null;
    if (zChars.length !== k) {
      warnings.push(zChars + '：连肖数(' + k + ')与生肖数(' + zChars.length + ')不匹配');
      return { cat: k + '连肖', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
    }
    var groups = zPart.split(new RegExp(SEP_CHARS + '+')).filter(function(g) { return g.trim().length >= k; });
    var results = [];
    for (var i = 0; i < groups.length; i++) {
      var arr = zCombosKeepOrder(groups[i], k);
      for (var j = 0; j < arr.length; j++) results.push(arr[j]);
    }
    var cnt = results.length || 0;
    if (cnt > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: results, amt: amtKw.amt, cnt: cnt, total: amtKw.amt * cnt, kw: amtKw.kw, warnings: warnings };
  });

  // 复式连尾
  addMatch(new RegExp('([二三四五2345])(?:连尾|尾连)' + SEP + '复[式试]?' + SEP + '((?:\\d+尾' + SEP_CHARS + ')+\\d+尾)\\s*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var k = toNum(m[1]);
    if (!k || k < 2 || k > 5) return null;
    var tailPart = m[2];
    var digits = (tailPart.match(/\d/g) || []);
    if (digits.length < k) return null;
    var comb = tailCKeepOrder(digits.join(','), k);
    var warnings = [];
    if (!amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // 非复式连尾（尾数串 + 连尾 + N）
  addMatch(new RegExp('((?:\\d+尾' + SEP_CHARS + ')+\\d+尾)[\\s]*(?:连尾|尾连)' + SEP + '([二三四五2345])\\s*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var tailPart = m[1];
    var digits = (tailPart.match(/\d/g) || []);
    var k = toNum(m[2]);
    if (!k || k < 2 || k > 5) return null;
    var warnings = [];
    var afterEnd = text.substring(m.index + m[0].length);
    if (!amtKw.kw && /^\s*\d+尾/.test(afterEnd)) return null;
    if (digits.length !== k) {
      warnings.push(digits.map(function(d) { return d + '尾'; }).join('') + '：连尾数(' + k + ')与尾数数量(' + digits.length + ')不匹配');
      return { cat: k + '连尾', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
    }
    var comb = tailCKeepOrder(digits.join(','), k);
    if (comb.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // 宽松复式连肖
  addMatch(new RegExp('复[式试]?([二三四五2345两])?(?:连肖|平连|连)' + SEP + '((?:[' + Z + ']+' + SEP_CHARS + '*)+)' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var kDigit = m[1] ? toNum(m[1].replace(/[^0-9二三四五两]/g, '')) : null;
    var zPart = m[2].trim();
    var zChars = (zPart.match(new RegExp('[' + Z + ']', 'g')) || []).join('');
    if (!zChars || zChars.length < 2) return null;
    var k = kDigit || Math.min(zChars.length, 5);
    if (k < 2 || k > 5 || zChars.length < k) return null;
    var comb = zCombosKeepOrder(zChars, k);
    var warnings = [];
    if (comb.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连肖', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // 宽松复式连尾
  addMatch(new RegExp('复[式试]?([二三四五2345])?(?:连尾|尾连)' + SEP + '((?:\\d+' + SEP_CHARS + '*尾' + SEP_CHARS + '*)+)' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var kDigit = m[1] ? toNum(m[1]) : null;
    var tailPart = m[2];
    var digits = (tailPart.match(/\d/g) || []);
    var k = kDigit || Math.min(digits.length, 5);
    if (k < 2 || k > 5 || digits.length < k) return null;
    var comb = tailCKeepOrder(digits.join(','), k);
    var warnings = [];
    if (comb.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // N不中
  addMatch(/([五六七八九十]|十一|十二|[5-9]|1[0-2])不[中出]\s*((?:\d{1,2}[\s,\-，、./]*)+)\s*[下共买个—来=＝\/各组四各]*\s*(\d+|[一二三四五六七八九十百千两]+)/g, function(m) {
    var cn = { '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12 };
    var k = cn[m[1]] || parseInt(m[1]);
    if (!k || k < 5 || k > 12) return null;
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var nums = extractNums(m[2]);
    var invalidNums = findInvalidNums(m[2]);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    if (nums.length !== k) {
      warnings.push('号码数(' + nums.length + ')与不中数(' + k + ')不匹配');
      return { cat: k + '不中', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
    }
    var cbs = combos(nums, k).map(function(c) { return c.join('-'); });
    if (cbs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '不中', nums: cbs, amt: amtKw.amt, cnt: cbs.length, total: amtKw.amt * cbs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 非复式连肖（N连肖 + 生肖串，多组匹配）
  addMatch(new RegExp('([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)[\\s]*((?:[' + Z + ']+(?:' + SEP_CHARS + '+[' + Z + ']+)*))' + SEP + '(?:(?=' + KW_GROUP + ')' + KW_GROUP + SEP + AMT_GROUP + '|' + END_AMT_RE.source + ')', 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var k = toNum(m[1].replace(/[^0-9二三四五两]/g, ''));
    if (!k || k < 2 || k > 5) return null;
    var zPart = m[2];
    var warnings = [];
    var afterEnd = text.substring(m.index + m[0].length);
    if (!amtKw.kw && /^\s*[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(afterEnd)) return null;
    var groups = zPart.split(new RegExp(SEP_CHARS + '+')).filter(function(g) { return g.trim().length > 0; });
    var validCombos = [];
    var invalidGroups = [];
    for (var i = 0; i < groups.length; i++) {
      var zs = groups[i].trim();
      if (zs.length === k) {
        var arr = zCombosKeepOrder(zs, k);
        for (var j = 0; j < arr.length; j++) validCombos.push(arr[j]);
      } else {
        invalidGroups.push(zs);
      }
    }
    if (invalidGroups.length > 0) {
      for (var i2 = 0; i2 < invalidGroups.length; i2++) {
        warnings.push(invalidGroups[i2] + '：连肖数(' + k + ')与生肖数(' + invalidGroups[i2].length + ')不匹配');
      }
    }
    if (validCombos.length > 0) {
      var cnt = validCombos.length;
      if (cnt > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
      return { cat: k + '连肖', nums: validCombos, amt: amtKw.amt, cnt: cnt, total: amtKw.amt * cnt, kw: amtKw.kw, warnings: warnings };
    } else {
      return { cat: k + '连肖', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
    }
  });

  // 非复式连尾（N连尾 + 尾数串，多组匹配）
  addMatch(new RegExp('([二三四五2345])(?:连尾|尾连)[\\s]*((?:\\d+' + SEP_CHARS + '*尾(?:' + SEP_CHARS + '+\\d+' + SEP_CHARS + '*尾)*)+)' + SEP + '(?:(?=' + KW_GROUP + ')' + KW_GROUP + SEP + AMT_GROUP + '|' + END_AMT_RE.source + ')', 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var k = toNum(m[1]);
    if (!k || k < 2 || k > 5) return null;
    var tailPart = m[2];
    var digits = (tailPart.match(/\d/g) || []);
    var warnings = [];
    var afterEnd = text.substring(m.index + m[0].length);
    if (!amtKw.kw && /^\s*\d+尾/.test(afterEnd)) return null;
    if (digits.length !== k) {
      warnings.push(digits.map(function(d) { return d + '尾'; }).join('') + '：连尾数(' + k + ')与尾数数量(' + digits.length + ')不匹配');
      return { cat: k + '连尾', nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
    }
    var comb = tailCKeepOrder(digits.join(','), k);
    if (comb.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: k + '连尾', nums: comb, amt: amtKw.amt, cnt: comb.length, total: amtKw.amt * comb.length, kw: amtKw.kw, warnings: warnings };
  });

  // 平特肖
  addMatch(new RegExp('(?:平特(?:一肖|肖)?|[1一]肖中|平肖|平码[肖]?|一肖|独肖)' + SEP + '((?:[' + Z + ']+' + SEP_CHARS + '*)+)\\s*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var zs = extractZodiacs(m[1]);
    var warnings = [];
    if (zs.length >= 2 && !amtKw.kw) { warnings.push('缺少金额关键字'); }
    return { cat: '平特肖', nums: zs, amt: amtKw.amt, cnt: zs.length, total: amtKw.amt * zs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 平特尾
  addMatch(new RegExp('(?:平特(?:一尾|尾)?|平尾|尾中)' + SEP + '((?:\\d+尾' + SEP_CHARS + '*)+)\\s*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var tails = (m[1].match(/\d/g) || []).map(function(d) { return d + '尾'; });
    var warnings = [];
    if (tails.length >= 2 && !amtKw.kw) { warnings.push('缺少金额关键字'); }
    return { cat: '平特尾', nums: tails, amt: amtKw.amt, cnt: tails.length, total: amtKw.amt * tails.length, kw: amtKw.kw, warnings: warnings };
  });

  // 平码
  addMatch(new RegExp('(?:平码|独平)' + SEP + '((?:\\d+' + SEP_CHARS + '*)+)' + '[\\s]*' + END_AMT_RE.source, 'g'), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var nums = extractNums(m[1]);
    var invalidNums = findInvalidNums(m[1]);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    if (nums.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: '平码', nums: nums, amt: amtKw.amt, cnt: nums.length, total: amtKw.amt * nums.length, kw: amtKw.kw, warnings: warnings };
  });

  // 号码对 + 玩法名在后
  addMatch(new RegExp(
    '((?:\\d{1,2}' + SEP_CHARS + '+\\d{1,2}' + SEP_CHARS + '*)+)' +
    '[\\s]*([二2]中[二2]|[三3]中[三3]|特碰)' +
    '[\\s]*(' + KW_GROUP + ')' + SEP + AMT_GROUP, 'g'
  ), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var numPart = m[1];
    var playName = m[2].trim();
    var invalidNums = findInvalidNums(numPart);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var pairs = [];
    var pr = new RegExp('(\\d{1,2})' + SEP_CHARS + '+(\\d{1,2})', 'g');
    var pm;
    while ((pm = pr.exec(numPart)) !== null) {
      pairs.push(pm[1] + '-' + pm[2]);
    }
    if (pairs.length === 0) {
      var nums = extractNums(numPart);
      if (nums.length < 2) {
        warnings.push('号码数不足');
        return { cat: playName, nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
      }
      if (playName === '二中二' || playName === '特碰') {
        combosNoSort(nums, 2).forEach(function(c) { pairs.push(c.join('-')); });
      } else if (playName === '三中三') {
        if (nums.length < 3) {
          warnings.push('号码数不足');
          return { cat: playName, nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
        }
        combosNoSort(nums, 3).forEach(function(c) { pairs.push(c.join('-')); });
      }
    }
    if (pairs.length === 0) return null;
    if (pairs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: playName, nums: pairs, amt: amtKw.amt, cnt: pairs.length, total: amtKw.amt * pairs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 号码串 + 复式玩法 顺序
  addMatch(new RegExp(
    '((?:\\d+' + SEP_CHARS + ')+\\d+)' +
    '[\\s]*(复[式试]?(?:[二2]中[二2]|[三3]中[三3]|特碰))' +
    '[\\s]*(' + KW_GROUP + ')' + SEP + AMT_GROUP, 'g'
  ), function(m) {
    var full = m[0];
    var amtKw = extractAmtAndKw(full);
    if (!amtKw.amt || amtKw.amt <= 0) return null;
    var nums = extractNums(m[1]);
    var playPart = m[2].trim();
    var invalidNums = findInvalidNums(m[1]);
    var warnings = invalidNums.length ? ['无效号码: ' + invalidNums.join(', ')] : [];
    var cat = '';
    var k = 0;
    if (/[二2]中[二2]/.test(playPart)) { cat = '二中二'; k = 2; }
    else if (/[三3]中[三3]/.test(playPart)) { cat = '三中三'; k = 3; }
    else if (/特碰/.test(playPart)) { cat = '特碰'; k = 2; }
    if (!cat || nums.length < k) {
      warnings.push('号码数不足');
      return { cat: cat || playPart, nums: [], amt: amtKw.amt, cnt: 0, total: 0, kw: amtKw.kw, warnings: warnings };
    }
    var pairs = combosNoSort(nums, k).map(function(c) { return c.join('-')); });
    if (pairs.length > 1 && !amtKw.kw) warnings.push('缺少金额关键字');
    return { cat: cat, nums: pairs, amt: amtKw.amt, cnt: pairs.length, total: amtKw.amt * pairs.length, kw: amtKw.kw, warnings: warnings };
  });

  // 合并所有匹配
  for (var i = 0; i < multiMatches.length; i++) allMatches.push(multiMatches[i]);

  allMatches.sort(function(a, b) { return a.start - b.start; });
  var deduped = [];
  var lastEnd = 0;
  for (var i = 0; i < allMatches.length; i++) {
    if (allMatches[i].start >= lastEnd) {
      deduped.push(allMatches[i]);
      lastEnd = allMatches[i].end;
    }
  }
  return deduped;
}

// ===== 第三部分：单行解析与继承 =====

function containsDictElement(str) {
  if (!str) return false;
  var nums = str.match(/\d+/g);
  if (nums) {
    for (var i = 0; i < nums.length; i++) {
      var intVal = parseInt(nums[i]);
      if (intVal >= 1 && intVal <= 49) return true;
    }
  }
  if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(str)) return true;
  if (/\d+尾/.test(str)) return true;
  var dictKeywords = ['金','木','水','火','土','红波','蓝波','绿波','红单','红双','蓝单','蓝双','绿单','绿双',
    '单数','双数','家禽','野兽','平特肖','平特尾','连肖','连尾','二中二','三中三','不中','特码','特肖','特碰',
    '红','蓝','绿','单','双','大','小','各','各数','各号','各组','到'];
  for (var i = 0; i < dictKeywords.length; i++) {
    if (str.indexOf(dictKeywords[i]) !== -1) return true;
  }
  return false;
}

function processOneLine(line) {
  if (!line.trim()) return [];

  var defaultSuffixes = ['米', '元', '块', '角', '分', '厘'];
  var userSuffixes = getCustomAmountSuffixes();
  var combinedSuffixes = defaultSuffixes.concat(userSuffixes);
  var uniqueSuffixes = [];
  for (var i = 0; i < combinedSuffixes.length; i++) {
    if (uniqueSuffixes.indexOf(combinedSuffixes[i]) === -1) uniqueSuffixes.push(combinedSuffixes[i]);
  }
  var suffixList = uniqueSuffixes.length ? uniqueSuffixes.join('|') : '';
  var suffixPattern = suffixList ? '(?:' + suffixList + ')?' : '';
  var amtPart = '((?:\\d+|[一二三四五六七八九十百千两]+)' + suffixPattern + ')';
  var numPart = '(\\d{1,2})';
  var sepPart = '[\\s,\\-.。、+\\-*＊\\/\\\\|]+';
  var pairRe = new RegExp('^\\s*' + numPart + '\\s*' + sepPart + '\\s*' + amtPart + '\\s*$');
  var pairMatch = line.match(pairRe);
  if (pairMatch) {
    var num = pairMatch[1].padStart(2, '0');
    var amtStr = pairMatch[2];
    if (suffixList) {
      var suffixRe = new RegExp('(' + suffixList + ')$');
      amtStr = amtStr.replace(suffixRe, '');
    }
    var amt = toNum(amtStr);
    if (parseInt(num) >= 1 && parseInt(num) <= 49 && amt > 0) {
      return [{ cat: '特码', nums: [num], amt: amt, cnt: 1, total: amt, kw: '各', warnings: [] }];
    }
  }

  var ZODIAC_SET = new Set('鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''));

  function tryMatchTeXiao(content) {
    if (!content || !content.trim()) return null;
    if (/特码/.test(content)) return null;
    if (/号各|号\s*各/.test(content)) return null;
    var trimmed = content.trim();
    var shxMatch = trimmed.match(new RegExp('(.+?)(各肖|各(?!数|号|组|码|注|下|买))\\s*(\\d+)'));
    if (!shxMatch) return null;
    var rawContent = shxMatch[1];
    var amtRaw = parseInt(shxMatch[3]) || 0;
    var kw = shxMatch[2] || '';
    if (amtRaw <= 0) return null;
    if (kw && kw.indexOf('号') !== -1) return null;
    var zodiacChars = [];
    for (var i = 0; i < rawContent.length; i++) {
      if (ZODIAC_SET.has(rawContent[i])) zodiacChars.push(rawContent[i]);
    }
    if (zodiacChars.length > 0) {
      var cnt = zodiacChars.length;
      var total = amtRaw * cnt;
      var warnings = [];
      if (cnt > 1 && !kw) warnings.push('缺少金额关键字');
      return { cat: '特肖', nums: zodiacChars, amt: amtRaw, cnt: cnt, total: total, kw: kw || '各', warnings: warnings };
    }
    return null;
  }

  var specialMatches = collectSpecialMatches(line);
  var results = [];
  var lastEnd = 0;

  for (var i = 0; i < specialMatches.length; i++) {
    var m = specialMatches[i];
    if (m.start > lastEnd) {
      var content = line.substring(lastEnd, m.start);
      var subLast = 0;
      var kwReLocal = new RegExp('(' + KW_GROUP + ')\\s*(' + AMT_RE_STR + ')', 'g');
      var subMatch;
      while ((subMatch = kwReLocal.exec(content)) !== null) {
        var subContent = content.substring(subLast, subMatch.index);
        if (subContent.indexOf('到') !== -1 || (subMatch[0] && subMatch[0].indexOf('到') !== -1)) {
          var combined = subContent + (subMatch ? subMatch[0] : '');
          var rangeMatch = combined.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
          if (rangeMatch) {
            var start = parseInt(rangeMatch[1]);
            var end = parseInt(rangeMatch[2]);
            var rangeAmt = toNum(subMatch[2]);
            var rangeKw = subMatch[1];
            if (!rangeKw) {
              results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: combined.trim() });
            } else if (start >= 1 && end <= 49 && start <= end) {
              var nums = [];
              for (var j = start; j <= end; j++) nums.push(String(j).padStart(2, '0'));
              results.push({ cat: '特码', nums: nums, amt: rangeAmt, cnt: nums.length, total: rangeAmt * nums.length, kw: rangeKw, warnings: [] });
            } else {
              results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: combined.trim() });
            }
            subLast = subMatch.index + subMatch[0].length;
            continue;
          }
        }
        var teXiaoResult = tryMatchTeXiao(subContent + subMatch[0]);
        if (teXiaoResult) { results.push(teXiaoResult); }
        subLast = subMatch.index + subMatch[0].length;
      }
    }
    results.push(m.result);
    lastEnd = m.end;
  }

  if (lastEnd < line.length) {
    var content = line.substring(lastEnd);
    var subLast = 0;
    var kwReLocal = new RegExp('(' + KW_GROUP + ')\\s*(' + AMT_RE_STR + ')', 'g');
    var subMatch;
    while ((subMatch = kwReLocal.exec(content)) !== null) {
      var subContent = content.substring(subLast, subMatch.index);
      if (subContent.indexOf('到') !== -1 || (subMatch[0] && subMatch[0].indexOf('到') !== -1)) {
        var combined = subContent + (subMatch ? subMatch[0] : '');
        var rangeMatch = combined.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
        if (rangeMatch) {
          var start = parseInt(rangeMatch[1]);
          var end = parseInt(rangeMatch[2]);
          var rangeAmt = toNum(subMatch[2]);
          var rangeKw = subMatch[1];
          if (!rangeKw) {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: combined.trim() });
          } else if (start >= 1 && end <= 49 && start <= end) {
            var nums = [];
            for (var j = start; j <= end; j++) nums.push(String(j).padStart(2, '0'));
            results.push({ cat: '特码', nums: nums, amt: rangeAmt, cnt: nums.length, total: rangeAmt * nums.length, kw: rangeKw, warnings: [] });
          } else {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: combined.trim() });
          }
          subLast = subMatch.index + subMatch[0].length;
          continue;
        }
      }
      var teXiaoResult = tryMatchTeXiao(subContent + subMatch[0]);
      if (teXiaoResult) { results.push(teXiaoResult); }
      subLast = subMatch.index + subMatch[0].length;
    }
    if (subLast < content.length) {
      var remaining = content.substring(subLast).trim();
      if (remaining.indexOf('到') !== -1) {
        var rangeMatch = remaining.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
        if (rangeMatch) {
          var start = parseInt(rangeMatch[1]);
          var end = parseInt(rangeMatch[2]);
          var amtMatch = remaining.match(/(各(?:数|号|组|码|注|下|买)?)\s*(\d+)/);
          if (amtMatch) {
            var rangeAmt = toNum(amtMatch[2]);
            if (start >= 1 && end <= 49 && start <= end && rangeAmt > 0) {
              var nums = [];
              for (var j = start; j <= end; j++) nums.push(String(j).padStart(2, '0'));
              results.push({ cat: '特码', nums: nums, amt: rangeAmt, cnt: nums.length, total: rangeAmt * nums.length, kw: amtMatch[1], warnings: [] });
            } else {
              results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: remaining });
            }
          } else {
            results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: remaining });
          }
        }
      } else if (remaining && containsDictElement(remaining)) {
        var teXiaoResult = tryMatchTeXiao(remaining);
        if (teXiaoResult) {
          results.push(teXiaoResult);
        } else {
          results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字或有效玩法'], rawLine: remaining });
        }
      }
    }
  }

  if (specialMatches.length === 0 && results.length === 0) {
    if (line.indexOf('到') !== -1) {
      var rangeMatch = line.match(/(\d{1,2})\s*到\s*(\d{1,2})/);
      if (rangeMatch) {
        var start = parseInt(rangeMatch[1]);
        var end = parseInt(rangeMatch[2]);
        var amtMatch = line.match(/(各(?:数|号|组|码|注|下|买)?)\s*(\d+)/);
        if (amtMatch) {
          var rangeAmt = toNum(amtMatch[2]);
          if (start >= 1 && end <= 49 && start <= end && rangeAmt > 0) {
            var nums = [];
            for (var j = start; j <= end; j++) nums.push(String(j).padStart(2, '0'));
            return [{ cat: '特码', nums: nums, amt: rangeAmt, cnt: nums.length, total: rangeAmt * nums.length, kw: amtMatch[1], warnings: [] }];
          } else {
            return [{ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['号码范围无效，请检查'], rawLine: line.trim() }];
          }
        } else {
          return [{ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字'], rawLine: line.trim() }];
        }
      }
    }
    var teXiaoResult = tryMatchTeXiao(line);
    if (teXiaoResult) return [teXiaoResult];
    var subLast = 0;
    var kwReLocal = new RegExp('(' + KW_GROUP + ')\\s*(' + AMT_RE_STR + ')', 'g');
    var subMatch;
    while ((subMatch = kwReLocal.exec(line)) !== null) {
      subLast = subMatch.index + subMatch[0].length;
    }
    if (subLast < line.length) {
      var remaining = line.substring(subLast).trim();
      if (remaining && containsDictElement(remaining)) {
        var teXiaoResult2 = tryMatchTeXiao(remaining);
        if (teXiaoResult2) {
          results.push(teXiaoResult2);
        } else {
          results.push({ cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '', warnings: ['缺少金额关键字或有效玩法'], rawLine: remaining });
        }
      }
    }
  }

  return results;
}

function applyInlineInheritance(lineResults, lastInheritablePlay) {
  if (!lineResults || lineResults.length === 0) return { results: lineResults, lastPlay: lastInheritablePlay || null };
  if (lastInheritablePlay === undefined) lastInheritablePlay = null;

  var inheritableCats = { '平特肖': { type: 'zodiac', count: 1 }, '平特尾': { type: 'tail', count: 1 } };
  for (var i = 2; i <= 5; i++) {
    inheritableCats[i + '连肖'] = { type: 'zodiac', count: i };
    inheritableCats[i + '连尾'] = { type: 'tail', count: i };
  }

  var inheritedPlay = lastInheritablePlay;
  for (var i = 0; i < lineResults.length; i++) {
    var r = lineResults[i];
    if (r.cat !== '__unrecognized__' && inheritableCats[r.cat]) {
      inheritedPlay = { cat: r.cat, kw: r.kw || '', type: inheritableCats[r.cat].type, count: inheritableCats[r.cat].count };
      break;
    }
  }

  var processed = [];
  for (var i = 0; i < lineResults.length; i++) {
    var r = lineResults[i];
    if (inheritedPlay && inheritedPlay.type === 'zodiac' && inheritedPlay.count >= 2 && r.cat === '特肖') {
      var zodiacs = r.nums || [];
      if (zodiacs.length === inheritedPlay.count && (r.kw || '') === (inheritedPlay.kw || '')) {
        var comboStr = zodiacs.join('-');
        processed.push({ cat: inheritedPlay.cat, nums: [comboStr], amt: r.amt, cnt: 1, total: r.amt, kw: inheritedPlay.kw || '各组', warnings: [], rawLine: r.rawLine || '', _inherited: true });
        continue;
      }
    }
    if (r.cat !== '__unrecognized__') { processed.push(r); continue; }
    if (!inheritedPlay) { processed.push(r); continue; }

    var raw = (r.rawLine || '').trim();
    if (!raw) { processed.push(r); continue; }
    var amtMatch = raw.match(/(\d+)\s*$/);
    if (!amtMatch) { processed.push(r); continue; }
    var amt = parseInt(amtMatch[1]) || 0;
    if (amt <= 0) { processed.push(r); continue; }
    var content = raw.substring(0, amtMatch.index).trim();
    if (!content) { processed.push(r); continue; }
    var contentKw = '';
    for (var j = 0; j < KW_LIST.length; j++) { if (content.indexOf(KW_LIST[j]) !== -1) { contentKw = KW_LIST[j]; break; } }
    var inheritedKw = inheritedPlay.kw || '';
    if (contentKw !== inheritedKw) {
      r.warnings = ['关键字不一致（需要"' + (inheritedKw || '无关键字') + '"，实际"' + (contentKw || '无关键字') + '"）'];
      processed.push(r); continue;
    }
    var cleanContent = content;
    if (contentKw) { cleanContent = content.replace(new RegExp(contentKw), '').trim(); }
    cleanContent = cleanContent.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '-');

    var matched = false;
    if (inheritedPlay.type === 'zodiac') {
      var items = cleanContent.split('-').filter(function(it) { return it.trim(); });
      if (items.length !== inheritedPlay.count) {
        var pureZodiacStr = cleanContent.replace(/[^鼠牛虎兔龙蛇马羊猴鸡狗猪]/g, '');
        if (pureZodiacStr.length === inheritedPlay.count) { items = pureZodiacStr.split(''); }
      }
      if (inheritedPlay.count === 1) {
        if (items.length === 1 && /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(items[0].trim())) {
          processed.push({ cat: inheritedPlay.cat, nums: [items[0].trim()], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      } else {
        if (items.length === inheritedPlay.count && items.every(function(it) { return /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(it.trim()); })) {
          var comboStr = items.map(function(it) { return it.trim(); }).join('-');
          processed.push({ cat: inheritedPlay.cat, nums: [comboStr], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各组', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      }
    } else if (inheritedPlay.type === 'tail') {
      var items = cleanContent.split('-').filter(function(it) { return /\d+尾/.test(it.trim()); });
      if (items.length !== inheritedPlay.count) {
        var pureDigits = cleanContent.replace(/[^0-9]/g, '');
        if (pureDigits.length === inheritedPlay.count) { items = pureDigits.split('').map(function(d) { return d + '尾'; }); }
      }
      if (inheritedPlay.count === 1) {
        if (items.length === 1 && /\d+尾$/.test(items[0].trim())) {
          processed.push({ cat: inheritedPlay.cat, nums: [items[0].trim()], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      } else {
        if (items.length === inheritedPlay.count && items.every(function(it) { return /\d+尾$/.test(it.trim()); })) {
          var comboStr = items.map(function(it) { return it.trim(); }).join('-');
          processed.push({ cat: inheritedPlay.cat, nums: [comboStr], amt: amt, cnt: 1, total: amt, kw: inheritedPlay.kw || '各组', warnings: [], rawLine: raw, _inherited: true });
          matched = true;
        }
      }
    }
    if (!matched) {
      r.warnings = ['格式不匹配（需要' + inheritedPlay.count + '个' + (inheritedPlay.type === 'zodiac' ? '生肖' : '尾数') + '）'];
      processed.push(r);
    }
  }

  var outgoingPlay = lastInheritablePlay;
  for (var i = lineResults.length - 1; i >= 0; i--) {
    var r = lineResults[i];
    if (r.cat !== '__unrecognized__' && inheritableCats[r.cat]) {
      outgoingPlay = { cat: r.cat, kw: r.kw || '', type: inheritableCats[r.cat].type, count: inheritableCats[r.cat].count };
      break;
    }
  }
  return { results: processed, lastPlay: outgoingPlay };
}

var REGION_KEYWORDS = {
  'macau': ['澳', '奥', '澳门', '奥门', '门', 'mc', 'MC', 'Mc'],
  'hongkong': ['港', '香', '香港', 'hk', 'HK', 'Hk'],
  'yuegang': ['粤', '粤港', 'yg', 'YG', 'Yg']
};
var REGION_LABELS = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

function extractRegion(line) {
  var allKeywords = [];
  for (var region in REGION_KEYWORDS) {
    var keywords = REGION_KEYWORDS[region];
    for (var i = 0; i < keywords.length; i++) {
      allKeywords.push({ region: region, keyword: keywords[i], len: keywords[i].length });
    }
  }
  allKeywords.sort(function(a, b) { return b.len - a.len; });
  for (var i = 0; i < allKeywords.length; i++) {
    var kw = allKeywords[i];
    var idx = line.indexOf(kw.keyword);
    if (idx !== -1) {
      if (idx > 0 && /[\u4e00-\u9fa5]/.test(line.charAt(idx - 1))) { continue; }
      var remaining = (line.substring(0, idx) + line.substring(idx + kw.keyword.length)).trim();
      return { region: kw.region, remaining: remaining };
    }
  }
  return null;
}

function performRecognition(text) {
  var resultDiv = document.getElementById('orderResult');
  if (!text || !text.trim()) {
    if (resultDiv) resultDiv.innerHTML = '';
    window._pureOrderLines = [];
    window._pureOrderRegions = [];
    window._cachedMaxLossData = [];
    updateOrderTotalDisplay();
    updateMaxLossDisplay();
    return;
  }
  var processedText = preprocess(text);
  var lines = processedText.split('\n');
  var allResults = [];
  var lineRegions = [];
  var currentLineRegion = currentRegion;
  var dotRegion = window._dotRegion || 'auto';
  var lastInheritablePlay = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!line.trim()) { continue; }
    var orderLine = line;
    if (dotRegion !== 'auto') {
      currentLineRegion = dotRegion;
    } else {
      var extracted = extractRegion(line);
      if (extracted) {
        currentLineRegion = extracted.region;
        orderLine = extracted.remaining;
      }
    }
    lineRegions.push(currentLineRegion);
    if (!orderLine.trim()) continue;

    var parsed = processOneLine(orderLine);
    var lineResults = [];
    if (parsed.length === 0) {
      if (containsDictElement(orderLine)) {
        lineResults.push({
          cat: '__unrecognized__', nums: [], amt: 0, cnt: 0, total: 0, kw: '',
          warnings: ['缺少金额关键字或有效玩法'], rawLine: orderLine.trim()
        });
      }
    } else {
      for (var j = 0; j < parsed.length; j++) lineResults.push(parsed[j]);
    }
    if (lineResults.length > 0) {
      var inheritResult = applyInlineInheritance(lineResults, lastInheritablePlay);
      lineResults = inheritResult.results;
      lastInheritablePlay = inheritResult.lastPlay;
      for (var k = 0; k < lineResults.length; k++) { lineResults[k].region = currentLineRegion; }
      for (var k = 0; k < lineResults.length; k++) allResults.push(lineResults[k]);
    }
  }

  var mergedArray = [];
  for (var i = 0; i < allResults.length; i++) {
    var r = allResults[i];
    mergedArray.push({
      category: r.cat, numbers: r.nums, unitAmount: r.amt,
      totalCount: r.cnt, totalAmount: r.total, kw: r.kw || '', warnings: r.warnings || [],
      rawLine: r.rawLine || '', region: r.region || currentRegion, _inherited: r._inherited || false
    });
  }

  if (resultDiv) {
    if (mergedArray.length === 0) {
      resultDiv.innerHTML = text ? '<div class="result-line">' + text + '</div>' : '';
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
  var total = 0;
  var html = '';
  var pureLines = [];
  var pureRegions = [];
  var maxLossData = [];
  var regionColorMap = { 'macau': '#e74c3c', 'hongkong': '#3498db', 'yuegang': '#27ae60' };

  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r.category === '__unrecognized__') {
      var regionLabel = REGION_LABELS[r.region] || '';
      var warnText = (r.warnings && r.warnings.length) ? r.warnings.join('；') : '缺少金额关键字或有效玩法';
      if (r.region && r.region !== currentRegion && !r.warnings.length) {
        html += '<div class="result-line"><span style="color:' + (regionColorMap[r.region] || '#333') + ';">' + regionLabel + '·</span>' + r.rawLine + ' <span style="color:red;">[已提取地区' + regionLabel + '，但内容无法识别]</span></div>';
      } else {
        html += '<div class="result-line"><span style="color:' + (r.region !== currentRegion ? (regionColorMap[r.region] || '#e74c3c') : '#000') + ';">' + regionLabel + '·</span>' + r.rawLine + ' <span style="color:red;">[' + warnText + ']</span></div>';
      }
      continue;
    }
    total += r.totalAmount;
    var regionLabel = REGION_LABELS[r.region] || '';
    var isCurrentRegion = r.region === currentRegion;
    var regionColor = isCurrentRegion ? 'color:#000;' : 'color:' + (regionColorMap[r.region] || '#333') + ';';
    var kwDisplay = (r.category === '特码') ? '各数' : '各';
    var amountStr = kwDisplay + Math.round(r.unitAmount);
    var info = r.totalCount > 1 ? '(' + r.totalCount + '注, 共' + Math.round(r.totalAmount) + ')' : '(共' + Math.round(r.totalAmount) + ')';
    var numStr = formatNums(r.category, r.numbers);
    var line = '<span style="' + regionColor + '">' + regionLabel + '·</span>' + r.category + ':' + numStr + amountStr + ' ' + info;
    if (r._inherited) { line += ' <span style="color:#27ae60;">[继承]</span>'; }
    if (r.warnings && r.warnings.length) { line += ' <span style="color:red;">[' + r.warnings.join('；') + ']</span>'; }
    html += '<div class="result-line">' + line + '</div>';
    var pureNumStr = formatNums(r.category, r.numbers);
    pureLines.push(r.category + ':' + pureNumStr + ' ' + kwDisplay + ' ' + Math.round(r.unitAmount));
    pureRegions.push(r.region);
    if (r.category === '特码' || r.category === '特肖') {
      maxLossData.push({ category: r.category, numbers: r.numbers, unitAmount: Math.round(r.unitAmount) });
    }
  }

  container.innerHTML = html;
  window._pureOrderLines = pureLines;
  window._pureOrderRegions = pureRegions;
  window._cachedMaxLossData = maxLossData;
}

function formatNums(cat, numsArr) {
  var simpleCats = ['特码', '特肖', '平特肖', '平码', '平特尾'];
  if (simpleCats.indexOf(cat) !== -1) return numsArr.join('-');
  if (cat.indexOf('包') === 0) return numsArr.join('-');
  if (cat.indexOf('连肖') !== -1) return numsArr.map(function(g) {
    if (g.indexOf('-') !== -1) return '(' + g + ')';
    return '(' + g.split('').join('-') + ')';
  }).join(' ');
  return numsArr.map(function(g) { return '(' + g + ')'; }).join(' ');
}

function countItemsInLine(line) {
  var teXiaoMatch = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
  if (teXiaoMatch) {
    var zodiacsStr = teXiaoMatch[1];
    var amt = parseInt(teXiaoMatch[2]) || 0;
    var zodiacs = zodiacsStr.split('-').map(function(z) { return z.trim(); }).filter(function(z) { return z; });
    return { numbers: [], zodiacs: zodiacs, amount: amt, playType: '特肖', zodiacCount: zodiacs.length };
  }
  var baoMatch = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
  if (baoMatch) {
    var attr = baoMatch[2].trim();
    var amt = parseInt(baoMatch[3]) || 0;
    return { numbers: [], zodiacs: [], amount: amt, playType: '包' + attr };
  }
  var tepengMatch = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
  if (tepengMatch) {
    var content = tepengMatch[1].trim();
    var amt = parseInt(tepengMatch[2]) || 0;
    var groups = content.split(/\s+/).filter(function(g) { return g.trim(); });
    var nums = [];
    groups.forEach(function(g) {
      var cleaned = g.replace(/[()]/g, '');
      var tokens = cleaned.split('-');
      tokens.forEach(function(t) { if (/^\d{2}$/.test(t)) nums.push(t); });
    });
    return { numbers: nums, zodiacs: [], amount: amt, playType: '特碰' };
  }
  var newMatch = line.match(/^(.+?):(.+?)\s+(各(?:数|))\s*(\d+)$/);
  if (newMatch) {
    var playType = newMatch[1];
    var content = newMatch[2];
    var amt = parseInt(newMatch[4]) || 0;
    if (playType !== '特码') { return { numbers: [], zodiacs: [], amount: 0, playType: playType }; }
    var items = content.split('-').map(function(i) { return i.trim(); }).filter(function(i) { return i; });
    var nums = [];
    var zods = [];
    items.forEach(function(item) {
      if (/^\d{2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item);
      } else if (/^\d$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item.padStart(2, '0'));
      } else if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
        zods.push(item);
        ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(function(n) { nums.push(n.padStart(2, '0')); });
      } else if (D[item]) {
        var val = D[item];
        if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
          if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
            zods.push(item);
            ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(function(n) { nums.push(n.padStart(2, '0')); });
          } else {
            for (var j = 0; j < val.length; j++) {
              var z = val[j];
              if (ZODIAC_NUMS[z]) {
                zods.push(z);
                ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(function(n) { nums.push(n.padStart(2, '0')); });
              }
            }
          }
        } else {
          val.split(/[\s,，]+/).filter(function(n) { return n.trim(); }).forEach(function(n) { nums.push(n.padStart(2, '0')); });
        }
      }
    });
    return { numbers: nums, zodiacs: zods.filter(function(v, i, a) { return a.indexOf(v) === i; }), amount: amt, playType: playType };
  }
  var oldMatch = line.match(/^(.+?)\s+各(?:数|)\s*(\d+)$/);
  if (oldMatch) {
    var content = oldMatch[1];
    var amt = parseInt(oldMatch[2]) || 0;
    var items = content.split('-').map(function(i) { return i.trim(); }).filter(function(i) { return i; });
    var nums = [];
    var zods = [];
    items.forEach(function(item) {
      if (/^\d{2}$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item);
      } else if (/^\d$/.test(item) && parseInt(item) >= 1 && parseInt(item) <= 49) {
        nums.push(item.padStart(2, '0'));
      } else if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
        zods.push(item);
        ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(function(n) { nums.push(n.padStart(2, '0')); });
      } else if (D[item]) {
        var val = D[item];
        if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
          if (/^[\u4e00-\u9fa5]$/.test(item) && ZODIAC_NUMS[item]) {
            zods.push(item);
            ZODIAC_NUMS[item].split(/[\s,，]+/).forEach(function(n) { nums.push(n.padStart(2, '0')); });
          } else {
            for (var j = 0; j < val.length; j++) {
              var z = val[j];
              if (ZODIAC_NUMS[z]) {
                zods.push(z);
                ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(function(n) { nums.push(n.padStart(2, '0')); });
              }
            }
          }
        } else {
          val.split(/[\s,，]+/).filter(function(n) { return n.trim(); }).forEach(function(n) { nums.push(n.padStart(2, '0')); });
        }
      }
    });
    return { numbers: nums, zodiacs: zods.filter(function(v, i, a) { return a.indexOf(v) === i; }), amount: amt };
  }
  return { numbers: [], zodiacs: [], amount: 0 };
}

function processCurrentOrder(input, user, isNormal, date) {
  var lines = input.split('\n').filter(function(l) { return l.trim(); });
  lines.forEach(function(line) {
    if (/^特肖:(.+?)\s+各\s*(\d+)$/.test(line)) orderCountAll++;
    else if (/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/.test(line)) orderCountAll++;
    else if (/^包.+?:(.+?)\s+各\s*(\d+)$/.test(line)) orderCountAll++;
    else if (/^特碰:(.+?)\s+各\s*(\d+)$/.test(line)) orderCountAll++;
    else {
      var result = countItemsInLine(line);
      if (result.amount > 0 && (!result.playType || result.playType === '特码')) orderCountAll++;
    }
  });
  updateTableFromRecords();
}

function updateOrderTotalDisplay() {
  var re = document.getElementById('orderResult');
  var box = document.getElementById('orderTotalAmountBox');
  var span = document.getElementById('orderTotalAmount');
  var lineCountSpan = document.getElementById('orderLineCount');
  if (!re || !box || !span) return;
  var pureLines = window._pureOrderLines || [];
  if (pureLines.length === 0) { box.style.display = 'none'; if (lineCountSpan) lineCountSpan.style.display = 'none'; return; }
  var total = 0;
  var validLineCount = pureLines.length;
  pureLines.forEach(function(line) {
    if (line.indexOf('特肖:') === 0) {
      var match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if (match) { var zodiacs = match[1].split('-').filter(function(z) { return z.trim(); }); var amt = parseInt(match[2]) || 0; total += zodiacs.length * amt; }
    } else if (line.indexOf('特碰:') === 0) {
      var match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if (match) { var cleaned = match[1].replace(/[()]/g, ''); var groups = cleaned.split(/\s+/).filter(function(c) { return c.trim(); }); var amtRaw = parseInt(match[2]) || 0; total += groups.length * amtRaw; }
    } else if (line.indexOf('包') === 0) {
      var match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) { var amtRaw = parseInt(match[3]) || 0; total += amtRaw; }
    } else if (line.indexOf('特码:') === 0) {
      var result = countItemsInLine(line); var cnt = result.numbers.length; if (cnt > 0 && result.amount > 0) total += cnt * result.amount;
    } else {
      var match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) {
        var playType = match[1]; var content = match[2]; var amt = parseInt(match[3]) || 0;
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') { var items = content.split('-').filter(function(i) { return i.trim(); }); total += items.length * amt; }
        else { var cleaned = content.replace(/[()]/g, ''); var groups = cleaned.split(/\s+/).filter(function(c) { return c.trim(); }); total += groups.length * amt; }
      }
    }
  });
  span.textContent = total;
  if (total > 0) { box.style.display = 'inline-flex'; if (lineCountSpan) { lineCountSpan.innerHTML = '<span style="color:#000;">' + validLineCount + '</span>行'; lineCountSpan.style.display = 'inline'; } }
  else { box.style.display = 'none'; if (lineCountSpan) lineCountSpan.style.display = 'none'; }
}

function computeCurrentOrderTotal() {
  var pureLines = window._pureOrderLines || [];
  var total = 0;
  pureLines.forEach(function(line) {
    if (line.indexOf('特肖:') === 0) {
      var match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if (match) { var zodiacs = match[1].split('-').filter(function(z) { return z.trim(); }); var amt = parseInt(match[2]) || 0; total += zodiacs.length * amt; }
    } else if (line.indexOf('特碰:') === 0) {
      var match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if (match) { var cleaned = match[1].replace(/[()]/g, ''); var groups = cleaned.split(/\s+/).filter(function(c) { return c.trim(); }); total += groups.length * (parseInt(match[2]) || 0); }
    } else if (line.indexOf('包') === 0) {
      var match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) { total += parseInt(match[3]) || 0; }
    } else if (line.indexOf('特码:') === 0) {
      var result = countItemsInLine(line); var cnt = result.numbers.length; if (cnt > 0) total += cnt * result.amount;
    } else {
      var match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if (match) {
        var playType = match[1]; var content = match[2]; var amt = parseInt(match[3]) || 0;
        if (playType === '平特肖' || playType === '平特尾' || playType === '平码') { var items = content.split('-').filter(function(i) { return i.trim(); }); total += items.length * amt; }
        else { var cleaned = content.replace(/[()]/g, ''); var groups = cleaned.split(/\s+/).filter(function(c) { return c.trim(); }); total += groups.length * amt; }
      }
    }
  });
  return total;
}

function updateOrderCountDisplay() {
  var fd = document.getElementById('filterDate') ? document.getElementById('filterDate').value : getTodayCST();
  getOrderRecords().then(function(orders) {
    var todayOrders = orders.filter(function(r) { return r.date === fd; });
    var countEl = document.getElementById('duiJiangOrderCount');
    if (countEl) { countEl.textContent = '(共' + todayOrders.length + '单)'; }
  });
}