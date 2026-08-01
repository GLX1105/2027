// ===== recognizeEngine.js - 订单识别完整流水线 =====

// 辅助函数
function getCustomAmountSuffixes() { try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; } }
function getReplacePresets() { try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; } }
function getCategoryAliases() { try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; } }

// 关键字
var KW_LIST = ['每一注','每组各','每个数','各数','各组','每组','每数','每号','各号','号各','各码','各注','个号','个数','组各','各下','各买','一注','个组','每个','各','组','注','名','=','＝','下','买','个','共','每','打','投','号','各号码','每个号','每个号码','个号码','各号各','个号各','每号','每号码'];
var KW_GROUP = KW_LIST.join('|');
var moneySuffixPart = '(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)';
var AMT_GROUP = '(?:\\d+(?:\\.\\d+)?|[一二三四五六七八九十百千两]+)';
var AMT_RE_STR = AMT_GROUP + '(?:' + moneySuffixPart + ')?';
var END_AMT_RE = new RegExp('(?:' + KW_GROUP + '\\s*)?' + AMT_GROUP + '(?:' + moneySuffixPart + ')?(?:\\s|$)');
var SEP_CHARS = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]+';
var SEP = '[\\s,\\-\\—\\.\\。\\、\\+\\-\\*＊\\/\\\\|]*';

function extractAmtAndKw(fullText) {
    var suffixList = ['米','元','块','角','分','厘','眯','咪','井','#','快','斤'].concat(getCustomAmountSuffixes());
    var uniqueSuffixes = []; for (var i=0; i<suffixList.length; i++) if (uniqueSuffixes.indexOf(suffixList[i]) === -1) uniqueSuffixes.push(suffixList[i]);
    var suffixPattern = uniqueSuffixes.length ? '(?:' + uniqueSuffixes.join('|') + ')?' : '';
    var amtRegex = new RegExp('(' + AMT_GROUP + ')\\s*(' + suffixPattern + ')\\s*$');
    var m = fullText.match(amtRegex);
    if (!m) return { amt: 0, kw: '' };
    var amt = toNum(m[1]);
    var beforeAmt = fullText.substring(0, m.index).trim();
    var kw = '';
    for (var i=0; i<KW_LIST.length; i++) { if (beforeAmt.indexOf(KW_LIST[i]) !== -1) { kw = KW_LIST[i]; break; } }
    return { amt: amt, kw: kw };
}

function preprocess(txt) {
    var c = txt;
    c = c.replace(/[\uFF01-\uFF5E]/g, function(ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); });
    c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    c = c.replace(/[oO]/g, '0').replace(/[liI！!]/g, '1');
    c = c.replace(/(\d) ([。！？；，])/g, '$1$2');
    var reps = { '夏式':'复式','復式':'复式','复制':'复式','復制':'复式','复习':'复式','复试':'复式','复示':'复式','覆式':'复式','複试':'复式',
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
        '复3':'复三','复三':'复式三','复3尾':'复三尾' };
    for (var k in reps) c = c.split(k).join(reps[k]);
    ['天天彩','天天采','天天','天彩','天采','总单'].forEach(function(s){ c = c.split(s).join(''); });
    c = c.replace(/澳门\d+期/g, '');
    c = c.replace(/[^\dA-Za-z\u4e00-\u9fa5\s,\-，\=＝\.]/g, ' ');
    c = c.replace(/\n/g, '[[[NL]]]');
    c = c.replace(/[\s]{2,}/g, ' ');
    c = c.replace(/\[\[\[NL\]\]\]/g, '\n');
    return c.trim();
}

function processOneLine(line) {
    if (!line.trim()) return [];
    // 优先处理 "号码-金额" 对
    var pairMatch = line.match(/^\s*(\d{1,2})\s+(\d+)\s*$/);
    if (pairMatch) {
        var num = pairMatch[1].padStart(2, '0');
        var amt = parseInt(pairMatch[2]) || 0;
        if (parseInt(num) >= 1 && parseInt(num) <= 49 && amt > 0) {
            return [{ cat: '特码', nums: [num], amt: amt, cnt: 1, total: amt, kw: '各', warnings: [] }];
        }
    }
    // 简单的特码匹配（如 "01各100"）
    var teMaMatch = line.match(/^(.+?)\s+各(?:数|)\s*(\d+)$/);
    if (teMaMatch) {
        var content = teMaMatch[1];
        var amt = parseInt(teMaMatch[2]) || 0;
        var items = content.split('-');
        var nums = [];
        for (var i=0; i<items.length; i++) {
            var it = items[i].trim();
            if (/^\d{1,2}$/.test(it)) nums.push(it.padStart(2,'0'));
        }
        if (nums.length > 0) {
            return [{ cat: '特码', nums: nums, amt: amt, cnt: nums.length, total: amt * nums.length, kw: '各', warnings: [] }];
        }
    }
    return [];
}

function performRecognition(text) {
    var resultDiv = document.getElementById('orderResult');
    if (!text || !text.trim()) {
        if (resultDiv) resultDiv.innerHTML = '';
        window._pureOrderLines = [];
        return;
    }
    var processedText = preprocess(text);
    var lines = processedText.split('\n');
    var allResults = [];
    for (var i=0; i<lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var parsed = processOneLine(line);
        for (var j=0; j<parsed.length; j++) allResults.push(parsed[j]);
    }
    var mergedArray = allResults.map(function(r) {
        return {
            category: r.cat, numbers: r.nums, unitAmount: r.amt,
            totalCount: r.cnt, totalAmount: r.total, kw: r.kw || '', warnings: r.warnings || [],
            rawLine: r.rawLine || '', region: currentRegion || 'macau'
        };
    });
    if (resultDiv) {
        if (mergedArray.length === 0) {
            resultDiv.innerHTML = text ? '<div class="result-line">' + text + '</div>' : '';
            window._pureOrderLines = [];
        } else {
            var html = '';
            var pureLines = [];
            for (var i=0; i<mergedArray.length; i++) {
                var r = mergedArray[i];
                var numStr = r.numbers.join('-');
                html += '<div class="result-line">' + r.category + ':' + numStr + ' 各 ' + Math.round(r.unitAmount) + '</div>';
                pureLines.push(r.category + ':' + numStr + ' 各 ' + Math.round(r.unitAmount));
            }
            resultDiv.innerHTML = html;
            window._pureOrderLines = pureLines;
        }
    }
    if (typeof updateOrderTotalDisplay === 'function') updateOrderTotalDisplay();
    if (typeof updateMaxLossDisplay === 'function') updateMaxLossDisplay();
}