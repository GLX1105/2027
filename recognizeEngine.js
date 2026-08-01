// ===== recognizeEngine.js - 订单识别完整流水线（预处理→匹配→解析→显示） =====

// ===== 辅助函数 =====
function getCustomAmountSuffixes() { try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; } }
function getCustomAmountPrefixes() { try { return JSON.parse(localStorage.getItem('customAmountPrefixes') || '[]'); } catch (e) { return []; } }
function getCustomPrefixes() { try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; } }
function getReplacePresets() { try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; } }
function getCategoryAliases() { try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; } }
function getCustomSuffixes() { try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; } }

// ===== 关键字列表 =====
var KW_LIST = ['每一注', '每组各', '每个数', '各数', '各组', '每组', '每数', '每号', '各号', '号各', '各码', '各注', '个号', '个数', '组各', '各下', '各买', '一注', '个组', '每个', '各', '组', '注', '名', '=', '＝', '下', '买', '个', '共', '每', '打', '投', '号', '各号码', '每个号', '每个号码', '个号码', '各号各', '个号各', '每号', '每号码'];
var KW_GROUP = KW_LIST.join('|');
var moneySuffixPart = '(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)';
var AMT_GROUP = '(?:\\d+(?:\\.\\d+)?|[一二三四五六七八九十百千两]+)';
var AMT_RE_STR = AMT_GROUP + '(?:' + moneySuffixPart + ')?';
var END_AMT_RE = new RegExp('(?:' + KW_GROUP + '\\s*)?' + AMT_GROUP + '(?:' + moneySuffixPart + ')?(?:\\s|$)');
var SEP_CHARS = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]+';
var SEP = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]*';

function extractAmtAndKw(fullText) {
    var suffixList = ['米','元','块','角','分','厘','眯','咪','井','#','快','斤'].concat(getCustomAmountSuffixes());
    var uniqueSuffixes = [];
    for (var i=0; i<suffixList.length; i++) {
        if (uniqueSuffixes.indexOf(suffixList[i]) === -1) uniqueSuffixes.push(suffixList[i]);
    }
    var suffixPattern = uniqueSuffixes.length ? '(?:' + uniqueSuffixes.join('|') + ')?' : '';
    var amtRegex = new RegExp('(' + AMT_GROUP + ')\\s*(' + suffixPattern + ')\\s*$');
    var m = fullText.match(amtRegex);
    if (!m) return { amt: 0, kw: '' };
    var amt = toNum(m[1]);
    var beforeAmt = fullText.substring(0, m.index).trim();
    var kw = '';
    for (var i=0; i<KW_LIST.length; i++) {
        if (beforeAmt.indexOf(KW_LIST[i]) !== -1) { kw = KW_LIST[i]; break; }
    }
    return { amt: amt, kw: kw };
}

function isOverlap(start, end, intervals) {
    for (var i=0; i<intervals.length; i++) {
        if (start < intervals[i].end && end > intervals[i].start) return true;
    }
    return false;
}

function keyToAllNums(key) {
    if (!D[key]) return [];
    var val = D[key];
    if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        var ns = [];
        for (var i=0; i<val.length; i++) {
            var z = val[i];
            if (ZODIAC_NUMS[z]) {
                var arr = ZODIAC_NUMS[z].split(/[\s,，]+/);
                for (var j=0; j<arr.length; j++) ns.push(arr[j]);
            }
        }
        return ns.sort(function(a,b){ return parseInt(a)-parseInt(b); });
    }
    return val.split(/[\s,，]+/).filter(function(n){ return n.trim(); });
}

// ===== 预处理 =====
function applyCategoryAliases(text) {
    var a = getCategoryAliases();
    if (!a.length) return text;
    var s = [].concat(a).sort(function(x,y){ return y.alias.length - x.alias.length; });
    var r = text;
    for (var i=0; i<s.length; i++) {
        if (s[i].alias && s[i].target) r = r.split(s[i].alias).join(s[i].target);
    }
    return r;
}

function applyReplacePresets(text) {
    var p = getReplacePresets();
    var r = text;
    for (var i=0; i<p.length; i++) {
        if (p[i].old && p[i].new) r = r.split(p[i].old).join(p[i].new);
    }
    return r;
}

function preprocess(txt) {
    var c = txt;
    c = c.replace(/[\uFF01-\uFF5E]/g, function(ch){ return String.fromCharCode(ch.charCodeAt(0)-0xFEE0); });
    c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    c = c.replace(/[oO]/g, '0').replace(/[liI！!]/g, '1');
    c = c.replace(/(\d) ([。！？；，])/g, '$1$2');
    c = c.replace(/[。！？；，]/g, ' ');
    c = applyCategoryAliases(c);
    c = applyReplacePresets(c);
    var reps = {
        '夏式':'复式','復式':'复式','复制':'复式','復制':'复式','复习':'复式','复试':'复式','复示':'复式','覆式':'复式','複试':'复式',
        '友':'有','尤':'龙','虑':'虎','坡':'波','午':'牛','綠':'绿','孑':'子','监':'蓝','俏':'肖','串肖':'连肖','连/肖':'连肖',
        '一连肖':'平特肖','一连':'平特','⑤':'5','|':'1','肉':'','藍':'蓝','录':'绿','碌':'绿','禄':'绿','啵':'波','○':'0','σ':'0','莲':'连','联':'连',
        '连消':'连肖','车肖':'连肖','拾':'十','佰':'百','仟':'千','大数':'大','来':'下','单号':'单','双号':'双','大号':'大','小号':'小',
        '家肖':'家禽','野肖':'野兽','老鼠':'鼠','老虎':'虎','双数数字':'双','和数单':'合数单','和数':'合数','小数':'小','双数':'双',
        '单数':'单','合数小':'合小','合数大':'合大','≡':'三','山':'三','俩':'二','毎':'每','五中四':'复式4肖','二全中':'二中二',
        '三全中':'三中三','復制':'复式','鳮':'鸡','単':'单','組':'组','平待':'平特','泼':'波','肖连':'连肖','消':'肖','〇':'0',
        'l':'1','I':'1','壹':'一','贰':'二','叁':'三','肆':'四','陆':'六','柒':'七','捌':'八','玖':'九','伍':'五','免':'兔','拘':'狗',
        '馬':'马','龍':'龙','雞':'鸡','豬':'猪','候':'猴','侯':'猴','兔子':'兔','猴子':'猴','子':'鼠','老蛇':'蛇',
        '二中二复':'复式二中二','二中二复式':'复式二中二',
        '红波小':'红小','红波大':'红大','绿波小':'绿小','绿波大':'绿大',
        '蓝波小':'蓝小','兰小':'蓝小','兰波小':'蓝小',
        '蓝波大':'蓝大','兰大':'蓝大','兰波大':'蓝大',
        '尾数小':'小尾','尾数大':'大尾',
        '平特一肖':'平特肖','平特二肖':'平特肖','平特三肖':'平特肖',
        '复试三肖':'复式三连肖','三肖复式':'三连肖复式',
        '复试三尾':'复式三连尾','三尾复式':'三连尾复式','复3尾':'复三尾','复三尾':'复式三连尾',
        '复试二中二':'复式二中二','二中二复试':'复式二中二','2中2复试':'复式二中二','复试2中2':'复式二中二',
        '复试三中三':'复式三中三','三中三复试':'复式三中三','3中3复试':'复式三中三','复试3中3':'复式三中三',
        '三三二二串':'复三复二','三三二二':'复三复二','家属':'家肖',
        '复3':'复三','复三':'复式三','复3尾':'复三尾'
    };
    for (var k in reps) c = c.split(k).join(reps[k]);
    ['天天彩','天天采','天天','天彩','天采','总单'].forEach(function(s){ c = c.split(s).join(''); });
    c = c.replace(/澳门\d+期/g, '');
    c = c.replace(/[^\dA-Za-z\u4e00-\u9fa5\s,\-，\=＝\.]/g, ' ');
    c = c.replace(/\n/g, '[[[NL]]]');
    c = c.replace(/[\s]{2,}/g, ' ');
    c = c.replace(/\[\[\[NL\]\]\]/g, '\n');
    return c.trim();
}

// ===== 特殊玩法匹配（简化但保留核心功能） =====
function collectSpecialMatches(text) {
    var allMatches = [];
    var Z = ZODIAC;
    var lockedIntervals = [];

    function itemsToNums(items) {
        var nums = [];
        for (var i=0; i<items.length; i++) {
            var item = items[i];
            if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]+$/.test(item)) {
                for (var j=0; j<item.length; j++) {
                    if (ZODIAC_NUMS[item[j]]) {
                        var arr = ZODIAC_NUMS[item[j]].split(/[\s,，]+/);
                        for (var k=0; k<arr.length; k++) nums.push(arr[k]);
                    }
                }
            } else if (/^\d+尾$/.test(item)) {
                var d = item.replace('尾','');
                if (D[d+'尾']) {
                    var arr = D[d+'尾'].split(/[\s,，]+/);
                    for (var k=0; k<arr.length; k++) nums.push(arr[k]);
                }
            } else if (/^\d{1,2}$/.test(item) && parseInt(item)>=1 && parseInt(item)<=49) {
                nums.push(String(parseInt(item)).padStart(2,'0'));
            }
        }
        var uniq = [];
        for (var i=0; i<nums.length; i++) {
            if (uniq.indexOf(nums[i]) === -1) uniq.push(nums[i]);
        }
        return uniq.sort(function(a,b){ return parseInt(a)-parseInt(b); });
    }

    function handleDragMatch(leftPart, rightPart, amt, kw, catName) {
        var leftItems = leftPart.split(new RegExp(SEP_CHARS+'+')).filter(function(s){ return s.trim(); });
        var rightItems = rightPart.split(new RegExp(SEP_CHARS+'+')).filter(function(s){ return s.trim(); });
        if (leftItems.length===0 || rightItems.length===0) return null;
        var leftNums = itemsToNums(leftItems);
        var rightNums = itemsToNums(rightItems);
        if (leftNums.length===0 || rightNums.length===0) return null;
        var pairs = [];
        for (var a=0; a<leftNums.length; a++) {
            for (var b=0; b<rightNums.length; b++) {
                if (leftNums[a] !== rightNums[b]) pairs.push(leftNums[a]+'-'+rightNums[b]);
            }
        }
        if (pairs.length===0) return null;
        var warnings = [];
        if (pairs.length>1 && !kw) warnings.push('缺少金额关键字');
        return { cat: catName||'二中二', nums: pairs, amt: amt, cnt: pairs.length, total: amt*pairs.length, kw: kw, warnings: warnings };
    }

    var multiMatches = [];

    // 连肖
    var reLianXiaoNoKw = new RegExp('^[\\s]*((?:['+Z+']+))[\\s]*([二三四五2345两])(?:连肖|连[肖]?|肖连|肖全中|连?肖|肖中|连)[\\s]*(?:('+KW_GROUP+')\\s*)?('+AMT_GROUP+')\\s*$', 'gm');
    var mLX;
    while ((mLX = reLianXiaoNoKw.exec(text)) !== null) {
        var zPart = mLX[1];
        var k = toNum(mLX[2].replace(/[^0-9二三四五两]/g,''));
        if (!k || k<2 || k>5) continue;
        var kw = mLX[4] || '';
        var amt = toNum(mLX[5] || mLX[6]);
        if (!amt || amt<=0) continue;
        var zChars = (zPart.match(new RegExp('['+Z+']','g')) || []).join('');
        if (zChars.length !== k) continue;
        var comb = zCombosKeepOrder(zChars, k);
        var warnings = [];
        if (!kw && comb.length>1) warnings.push('缺少金额关键字');
        multiMatches.push({ start: mLX.index, end: mLX.index+mLX[0].length, result: { cat: k+'连肖', nums: comb, amt: amt, cnt: comb.length, total: amt*comb.length, kw: kw||'各组', warnings: warnings } });
        lockedIntervals.push({ start: mLX.index, end: mLX.index+mLX[0].length });
    }

    var addMatch = function(re, handler) {
        var m;
        while ((m = re.exec(text)) !== null) {
            if (isOverlap(m.index, m.index+m[0].length, lockedIntervals)) continue;
            var info = handler(m);
            if (info) allMatches.push({ start: m.index, end: m.index+m[0].length, result: info });
        }
    };

    // 特肖
    addMatch(new RegExp('特肖'+SEP+'((?:['+Z+']+'+SEP_CHARS+'*)+?)[\\s]*'+END_AMT_RE.source, 'g'), function(m){
        var full = m[0];
        var amtKw = extractAmtAndKw(full);
        if (!amtKw.amt || amtKw.amt<=0) return null;
        var zodiacs = (m[1].match(new RegExp('['+Z+']','g')) || []);
        if (zodiacs.length===0) return null;
        var warnings = [];
        if (zodiacs.length>1 && !amtKw.kw) warnings.push('缺少金额关键字');
        return { cat: '特肖', nums: zodiacs, amt: amtKw.amt, cnt: zodiacs.length, total: amtKw.amt*zodiacs.length, kw: amtKw.kw||'各', warnings: warnings };
    });

    // 平特肖
    addMatch(new RegExp('(?:平特(?:一肖|肖)?|[1一]肖中|平肖|平码[肖]?|一肖|独肖)'+SEP+'((?:['+Z+']+'+SEP_CHARS+'*)+)\\s*'+END_AMT_RE.source, 'g'), function(m){
        var full = m[0];
        var amtKw = extractAmtAndKw(full);
        if (!amtKw.amt || amtKw.amt<=0) return null;
        var zs = extractZodiacs(m[1]);
        var warnings = [];
        if (zs.length>=2 && !amtKw.kw) warnings.push('缺少金额关键字');
        return { cat: '平特肖', nums: zs, amt: amtKw.amt, cnt: zs.length, total: amtKw.amt*zs.length, kw: amtKw.kw, warnings: warnings };
    });

    for (var i=0; i<multiMatches.length; i++) allMatches.push(multiMatches[i]);
    allMatches.sort(function(a,b){ return a.start - b.start; });
    var deduped = [];
    var lastEnd = 0;
    for (var i=0; i<allMatches.length; i++) {
        if (allMatches[i].start >= lastEnd) { deduped.push(allMatches[i]); lastEnd = allMatches[i].end; }
    }
    return deduped;
}

function containsDictElement(str) {
    if (!str) return false;
    var nums = str.match(/\d+/g);
    if (nums) {
        for (var i=0; i<nums.length; i++) {
            if (parseInt(nums[i])>=1 && parseInt(nums[i])<=49) return true;
        }
    }
    if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(str)) return true;
    if (/\d+尾/.test(str)) return true;
    return false;
}

function processOneLine(line) {
    if (!line.trim()) return [];

    // 号码-金额对
    var defaultSuffixes = ['米','元','块','角','分','厘'];
    var userSuffixes = getCustomAmountSuffixes();
    var combined = defaultSuffixes.concat(userSuffixes);
    var uniq = [];
    for (var i=0; i<combined.length; i++) { if (uniq.indexOf(combined[i])===-1) uniq.push(combined[i]); }
    var suffixList = uniq.length ? uniq.join('|') : '';
    var suffixPattern = suffixList ? '(?:'+suffixList+')?' : '';
    var pairRe = new RegExp('^\\s*(\\d{1,2})\\s+((?:\\d+|[一二三四五六七八九十百千两]+)'+suffixPattern+')\\s*$');
    var pairMatch = line.match(pairRe);
    if (pairMatch) {
        var num = pairMatch[1].padStart(2,'0');
        var amt = toNum(pairMatch[2].replace(new RegExp('('+suffixList+')$'), ''));
        if (parseInt(num)>=1 && parseInt(num)<=49 && amt>0) {
            return [{ cat: '特码', nums: [num], amt: amt, cnt: 1, total: amt, kw: '各', warnings: [] }];
        }
    }

    // 特码: XX 各数 XX
    var teMaMatch = line.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/);
    if (teMaMatch) {
        var content = teMaMatch[1];
        var amt = parseInt(teMaMatch[2]) || 0;
        if (amt<=0) return [];
        var items = content.split('-').map(function(i){ return i.trim(); }).filter(function(i){ return i; });
        var nums = [];
        for (var i=0; i<items.length; i++) {
            if (/^\d{1,2}$/.test(items[i])) nums.push(items[i].padStart(2,'0'));
            else if (ZODIAC_NUMS[items[i]]) {
                var arr = ZODIAC_NUMS[items[i]].split(/[\s,，]+/);
                for (var j=0; j<arr.length; j++) nums.push(arr[j].padStart(2,'0'));
            }
        }
        if (nums.length>0) {
            return [{ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt*nums.length, kw: '各数', warnings: [] }];
        }
        return [];
    }

    // 特肖: XX 各 XX
    var teXiaoMatch = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
    if (teXiaoMatch) {
        var zodiacs = teXiaoMatch[1].split('-').map(function(z){ return z.trim(); }).filter(function(z){ return z; });
        var amt = parseInt(teXiaoMatch[2]) || 0;
        if (amt>0 && zodiacs.length>0) {
            return [{ cat: '特肖', nums: zodiacs, amt: amt, cnt: zodiacs.length, total: amt*zodiacs.length, kw: '各', warnings: [] }];
        }
    }

    // 普通 XX 各数 XX
    var normalMatch = line.match(/^(.+?)\s+各(?:数|)\s*(\d+)$/);
    if (normalMatch) {
        var content = normalMatch[1];
        var amt = parseInt(normalMatch[2]) || 0;
        if (amt<=0) return [];
        var items = content.split('-').map(function(i){ return i.trim(); }).filter(function(i){ return i; });
        var nums = [];
        for (var i=0; i<items.length; i++) {
            if (/^\d{1,2}$/.test(items[i])) nums.push(items[i].padStart(2,'0'));
            else if (ZODIAC_NUMS[items[i]]) {
                var arr = ZODIAC_NUMS[items[i]].split(/[\s,，]+/);
                for (var j=0; j<arr.length; j++) nums.push(arr[j].padStart(2,'0'));
            }
        }
        if (nums.length>0) {
            return [{ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt*nums.length, kw: '各数', warnings: [] }];
        }
    }

    // 复杂匹配
    var specialMatches = collectSpecialMatches(line);
    var results = [];
    for (var i=0; i<specialMatches.length; i++) {
        results.push(specialMatches[i].result);
    }
    return results;
}

function applyInlineInheritance(lineResults, lastInheritablePlay) {
    if (!lineResults || lineResults.length===0) return { results: lineResults, lastPlay: lastInheritablePlay || null };
    return { results: lineResults, lastPlay: lastInheritablePlay || null };
}

var REGION_KEYWORDS = {
    'macau': ['澳','奥','澳门','奥门','门','mc','MC','Mc'],
    'hongkong': ['港','香','香港','hk','HK','Hk'],
    'yuegang': ['粤','粤港','yg','YG','Yg']
};
var REGION_LABELS = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

function extractRegion(line) {
    var allKeywords = [];
    for (var region in REGION_KEYWORDS) {
        for (var i=0; i<REGION_KEYWORDS[region].length; i++) {
            allKeywords.push({ region: region, keyword: REGION_KEYWORDS[region][i], len: REGION_KEYWORDS[region][i].length });
        }
    }
    allKeywords.sort(function(a,b){ return b.len - a.len; });
    for (var i=0; i<allKeywords.length; i++) {
        var idx = line.indexOf(allKeywords[i].keyword);
        if (idx !== -1) {
            if (idx>0 && /[\u4e00-\u9fa5]/.test(line.charAt(idx-1))) continue;
            var remaining = (line.substring(0,idx) + line.substring(idx+allKeywords[i].keyword.length)).trim();
            return { region: allKeywords[i].region, remaining: remaining };
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
        if (typeof updateOrderTotalDisplay === 'function') updateOrderTotalDisplay();
        if (typeof updateMaxLossDisplay === 'function') updateMaxLossDisplay();
        return;
    }
    var processedText = preprocess(text);
    var lines = processedText.split('\n');
    var allResults = [];
    var lineRegions = [];
    var currentLineRegion = currentRegion;
    var dotRegion = window._dotRegion || 'auto';
    var lastInheritablePlay = null;

    for (var i=0; i<lines.length; i++) {
        var line = lines[i];
        if (!line.trim()) continue;
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
            for (var j=0; j<parsed.length; j++) lineResults.push(parsed[j]);
        }
        if (lineResults.length > 0) {
            var inheritResult = applyInlineInheritance(lineResults, lastInheritablePlay);
            lineResults = inheritResult.results;
            lastInheritablePlay = inheritResult.lastPlay;
            for (var k=0; k<lineResults.length; k++) { lineResults[k].region = currentLineRegion; }
            for (var k=0; k<lineResults.length; k++) allResults.push(lineResults[k]);
        }
    }

    var mergedArray = [];
    for (var i=0; i<allResults.length; i++) {
        var r = allResults[i];
        mergedArray.push({
            category: r.cat, numbers: r.nums, unitAmount: r.amt,
            totalCount: r.cnt, totalAmount: r.total, kw: r.kw || '', warnings: r.warnings || [],
            rawLine: r.rawLine || '', region: r.region || currentRegion, _inherited: r._inherited || false
        });
    }

    if (resultDiv) {
        if (mergedArray.length === 0) {
            resultDiv.innerHTML = text ? '<div class="result-line">'+text+'</div>' : '';
            window._pureOrderLines = [];
            window._pureOrderRegions = [];
            window._cachedMaxLossData = [];
        } else {
            displayResults(mergedArray, resultDiv);
        }
    }
    if (typeof updateOrderTotalDisplay === 'function') updateOrderTotalDisplay();
    if (typeof updateMaxLossDisplay === 'function') updateMaxLossDisplay();
}

function displayResults(rs, container) {
    if (!container) container = document.getElementById('orderResult');
    if (!container) return;
    if (rs.length === 0) {
        container.innerHTML = '';
        window._pureOrderLines = [];
        window._pureOrderRegions = [];
        window._cachedMaxLossData = [];
        return;
    }
    var html = '';
    var pureLines = [];
    var pureRegions = [];
    var maxLossData = [];
    var regionColorMap = { 'macau': '#e74c3c', 'hongkong': '#3498db', 'yuegang': '#27ae60' };

    for (var i=0; i<rs.length; i++) {
        var r = rs[i];
        if (r.category === '__unrecognized__') {
            var regionLabel = REGION_LABELS[r.region] || '';
            var warnText = (r.warnings && r.warnings.length) ? r.warnings.join('；') : '缺少金额关键字或有效玩法';
            html += '<div class="result-line"><span style="color:'+(regionColorMap[r.region]||'#333')+';">'+regionLabel+'·</span>'+r.rawLine+' <span style="color:red;">['+warnText+']</span></div>';
            continue;
        }
        var regionLabel = REGION_LABELS[r.region] || '';
        var isCurrentRegion = r.region === currentRegion;
        var regionColor = isCurrentRegion ? 'color:#000;' : 'color:'+(regionColorMap[r.region]||'#333')+';';
        var kwDisplay = (r.category === '特码') ? '各数' : '各';
        var amountStr = kwDisplay + Math.round(r.unitAmount);
        var info = r.totalCount>1 ? '('+r.totalCount+'注, 共'+Math.round(r.totalAmount)+')' : '(共'+Math.round(r.totalAmount)+')';
        var numStr = formatNums(r.category, r.numbers);
        var line = '<span style="'+regionColor+'">'+regionLabel+'·</span>'+r.category+':'+numStr+amountStr+' '+info;
        if (r._inherited) line += ' <span style="color:#27ae60;">[继承]</span>';
        if (r.warnings && r.warnings.length) line += ' <span style="color:red;">['+r.warnings.join('；')+']</span>';
        html += '<div class="result-line">'+line+'</div>';
        var pureNumStr = formatNums(r.category, r.numbers);
        pureLines.push(r.category+':'+pureNumStr+' '+kwDisplay+' '+Math.round(r.unitAmount));
        pureRegions.push(r.region);
        if (r.category==='特码' || r.category==='特肖') {
            maxLossData.push({ category: r.category, numbers: r.numbers, unitAmount: Math.round(r.unitAmount) });
        }
    }
    container.innerHTML = html;
    window._pureOrderLines = pureLines;
    window._pureOrderRegions = pureRegions;
    window._cachedMaxLossData = maxLossData;
}

function formatNums(cat, numsArr) {
    var simpleCats = ['特码','特肖','平特肖','平码','平特尾'];
    if (simpleCats.indexOf(cat) !== -1) return numsArr.join('-');
    if (cat.indexOf('包') === 0) return numsArr.join('-');
    if (cat.indexOf('连肖') !== -1) return numsArr.map(function(g){
        if (g.indexOf('-')!==-1) return '('+g+')';
        return '('+g.split('').join('-')+')';
    }).join(' ');
    return numsArr.map(function(g){ return '('+g+')'; }).join(' ');
}

function countItemsInLine(line) {
    var teXiaoMatch = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
    if (teXiaoMatch) {
        var zodiacs = teXiaoMatch[1].split('-').map(function(z){ return z.trim(); }).filter(function(z){ return z; });
        var amt = parseInt(teXiaoMatch[2]) || 0;
        return { numbers: [], zodiacs: zodiacs, amount: amt, playType: '特肖', zodiacCount: zodiacs.length };
    }
    var newMatch = line.match(/^(.+?):(.+?)\s+(各(?:数|))\s*(\d+)$/);
    if (newMatch) {
        var playType = newMatch[1];
        var content = newMatch[2];
        var amt = parseInt(newMatch[4]) || 0;
        if (playType !== '特码') return { numbers: [], zodiacs: [], amount: 0, playType: playType };
        var items = content.split('-').map(function(i){ return i.trim(); }).filter(function(i){ return i; });
        var nums = [];
        for (var i=0; i<items.length; i++) {
            if (/^\d{1,2}$/.test(items[i])) nums.push(items[i].padStart(2,'0'));
            else if (ZODIAC_NUMS[items[i]]) {
                var arr = ZODIAC_NUMS[items[i]].split(/[\s,，]+/);
                for (var j=0; j<arr.length; j++) nums.push(arr[j].padStart(2,'0'));
            }
        }
        return { numbers: nums, zodiacs: [], amount: amt, playType: playType };
    }
    var oldMatch = line.match(/^(.+?)\s+各(?:数|)\s*(\d+)$/);
    if (oldMatch) {
        var content = oldMatch[1];
        var amt = parseInt(oldMatch[2]) || 0;
        var items = content.split('-').map(function(i){ return i.trim(); }).filter(function(i){ return i; });
        var nums = [];
        for (var i=0; i<items.length; i++) {
            if (/^\d{1,2}$/.test(items[i])) nums.push(items[i].padStart(2,'0'));
            else if (ZODIAC_NUMS[items[i]]) {
                var arr = ZODIAC_NUMS[items[i]].split(/[\s,，]+/);
                for (var j=0; j<arr.length; j++) nums.push(arr[j].padStart(2,'0'));
            }
        }
        return { numbers: nums, zodiacs: [], amount: amt };
    }
    return { numbers: [], zodiacs: [], amount: 0 };
}

function updateOrderTotalDisplay() {
    var box = document.getElementById('orderTotalAmountBox');
    var span = document.getElementById('orderTotalAmount');
    var lineCountSpan = document.getElementById('orderLineCount');
    if (!box || !span) return;
    var pureLines = window._pureOrderLines || [];
    if (pureLines.length === 0) { box.style.display = 'none'; if (lineCountSpan) lineCountSpan.style.display = 'none'; return; }
    var total = 0;
    for (var i=0; i<pureLines.length; i++) {
        var match = pureLines[i].match(/\s+各(?:数|)\s*(\d+)$/);
        if (match) total += parseInt(match[1]) || 0;
    }
    span.textContent = total;
    if (total > 0) {
        box.style.display = 'inline-flex';
        if (lineCountSpan) { lineCountSpan.innerHTML = '<span style="color:#000;">'+pureLines.length+'</span>行'; lineCountSpan.style.display = 'inline'; }
    } else {
        box.style.display = 'none';
        if (lineCountSpan) lineCountSpan.style.display = 'none';
    }
}

function computeCurrentOrderTotal() {
    var pureLines = window._pureOrderLines || [];
    var total = 0;
    for (var i=0; i<pureLines.length; i++) {
        var match = pureLines[i].match(/\s+各(?:数|)\s*(\d+)$/);
        if (match) total += parseInt(match[1]) || 0;
    }
    return total;
}

console.log('recognizeEngine.js 已成功加载！');