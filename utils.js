// ===== utils.js - 通用工具函数（数字转换、组合、排序、时间格式化等） =====

// ===== 数字转换 =====
function toNum(s) {
    if (!s) return 0;
    s = String(s).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    const m = { 零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 贰: 2, 两: 2, 三: 3, 叁: 3, 四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陆: 6, 七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9 };
    const u = { 十: 10, 拾: 10, 百: 100, 佰: 100, 千: 1000, 仟: 1000, 万: 10000 };
    let r = 0, c = 0, t = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (m[ch] !== undefined) {
            t = m[ch];
        } else if (u[ch] !== undefined) {
            const ut = u[ch];
            if (t === 0 && (ch === '十' || ch === '拾')) t = 1;
            if (ut >= 10000) {
                c = (c + t) * ut;
                r += c;
                c = 0;
            } else {
                c += t * ut;
            }
            t = 0;
        }
    }
    r += c + t;
    return r || 0;
}

// ===== 排序函数 =====
function sortNDash(s) {
    const ns = s.split('-').map(n => parseInt(n)).filter(n => !isNaN(n));
    ns.sort((a, b) => a - b);
    return ns.map(n => String(n).padStart(2, '0')).join('-');
}

function sortZ(s) {
    const cs = s.split('');
    cs.sort((a, b) => ZODIAC.indexOf(a) - ZODIAC.indexOf(b));
    return cs.join('');
}

// ===== 组合函数 =====
function combos(arr, k) {
    const res = [];
    function bt(st, cur) {
        if (cur.length === k) { res.push([...cur]); return; }
        for (let i = st; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); }
    }
    bt(0, []);
    return res;
}

function combosNoSort(arr, k) {
    const res = [];
    function bt(st, cur) {
        if (cur.length === k) { res.push([...cur]); return; }
        for (let i = st; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); }
    }
    bt(0, []);
    return res;
}

function zCombos(zStr, k) {
    const cs = zStr.split('');
    return combos(cs, k).map(c => sortZ(c.join('')));
}

function zCombosKeepOrder(zStr, k) {
    const cs = zStr.split('');
    return combosNoSort(cs, k).map(c => c.join(''));
}

function tailC(tStr, k) {
    const ns = tStr.split(/[,\-，]/).filter(n => n.trim());
    return combos(ns, k).map(c => {
        const s = c.slice().sort((a, b) => parseInt(a) - parseInt(b));
        return s.map(d => d + '尾').join('-');
    });
}

function tailCKeepOrder(tStr, k) {
    const ns = tStr.split(/[,\-，]/).filter(n => n.trim());
    return combosNoSort(ns, k).map(c => c.join('尾-') + '尾');
}

// ===== 字典查询辅助 =====
function zodiacToNums(zStr) {
    const ns = [];
    for (const z of zStr) {
        if (D[z]) D[z].split(/[\s,，]+/).forEach(n => ns.push(n));
    }
    return ns.sort((a, b) => parseInt(a) - parseInt(b));
}

function extractNums(txt) {
    return (txt.match(/\d+/g) || []).map(n => parseInt(n)).filter(n => n >= 1 && n <= 49).map(n => String(n).padStart(2, '0'));
}

function extractZodiacs(txt) {
    return (txt.match(new RegExp(`[${ZODIAC}]`, 'g')) || []);
}

function findInvalidNums(txt) {
    if (!txt) return [];
    const allNums = (txt.match(/\d+/g) || []).map(n => parseInt(n));
    return allNums.filter(n => n > 49);
}

function keyToAllNums(key) {
    if (!D[key]) return [];
    const val = D[key];
    if (/[鼠牛虎兔龙蛇马羊猴鸡狗猪]/.test(val)) {
        const ns = [];
        for (const z of val) {
            if (ZODIAC_NUMS[z]) {
                ZODIAC_NUMS[z].split(/[\s,，]+/).forEach(n => ns.push(n));
            }
        }
        return ns.sort((a, b) => parseInt(a) - parseInt(b));
    }
    return val.split(/[\s,，]+/).filter(n => n.trim());
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

// ===== 日期时间 =====
function getTodayCST() {
    const now = new Date();
    const offset = 8 * 60;
    const localTime = now.getTime() + (now.getTimezoneOffset() + offset) * 60000;
    const cstDate = new Date(localTime);
    return `${cstDate.getFullYear()}-${String(cstDate.getMonth()+1).padStart(2,'0')}-${String(cstDate.getDate()).padStart(2,'0')}`;
}

function buildZodiacMap(startZodiac) {
    const map = {};
    const startIndex = zodiacOrder.indexOf(startZodiac);
    const idx = startIndex !== -1 ? startIndex : 0;
    for (let i = 1; i <= 49; i++) {
        map[i.toString().padStart(2, '0')] = zodiacOrder[(idx + i - 1) % 12];
    }
    return map;
}

function formatTimestampToCST(iso) {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Shanghai'
    }).format(d);
}

function formatDateMD(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth()+1}/${d.getDate()}`;
}

function getCurrentIssueNumber(year, targetDateStr) {
    const target = new Date(targetDateStr + 'T00:00:00');
    const start = new Date(year, 0, 1);
    if (isNaN(target) || isNaN(start)) return null;
    if (target < start) return null;
    const diff = target - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return dayOfYear;
}

// ===== 颜色与样式 =====
function getUserColor(u) {
    let h = 0;
    for (let i = 0; i < u.length; i++) h = u.charCodeAt(i) + ((h << 5) - h);
    const hue = (h % 360 + 360) % 360;
    return `hsl(${hue}, 70%, 45%)`;
}

function getZodiacColorClass(zodiac) {
    if (!zodiac) return '';
    const redSet = new Set(['鼠','兔','马','鸡']);
    const blueSet = new Set(['虎','蛇','猴','猪']);
    const greenSet = new Set(['牛','龙','羊','狗']);
    if (redSet.has(zodiac)) return 'red-text';
    if (blueSet.has(zodiac)) return 'blue-text';
    if (greenSet.has(zodiac)) return 'green-text';
    return '';
}

function getNumberColorClass(num) {
    if (redNumbers.includes(num)) return 'red-text';
    if (blueNumbers.includes(num)) return 'blue-text';
    if (greenNumbers.includes(num)) return 'green-text';
    return '';
}

// ===== 缓存 =====
function getCacheKey(region, date, filterUser) {
    return `${region}|${date}|${filterUser || 'all'}`;
}

function clearStatsCache() {
    statsCache.clear();
}

// ===== 配置读写 =====
function getReplacePresets() {
    try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; }
}
function getCategoryAliases() {
    try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; }
}
function getCustomPrefixes() {
    try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; }
}
function getCustomSuffixes() {
    try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; }
}
function getCustomAmountSuffixes() {
    try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; }
}
function getCustomAmountPrefixes() {
    try { return JSON.parse(localStorage.getItem('customAmountPrefixes') || '[]'); } catch (e) { return []; }
}
function saveCustomAmountPrefixes(list) {
    localStorage.setItem('customAmountPrefixes', JSON.stringify(list));
}
function getUsers() {
    const key = `users_${currentRegion}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}
function saveUsers(users) {
    const key = `users_${currentRegion}`;
    localStorage.setItem(key, JSON.stringify(users));
}
function addUser(name) {
    const users = getUsers();
    if (users.includes(name)) { showToast('用户已存在'); return false; }
    users.push(name);
    saveUsers(users);
    return true;
}
async function deleteUser(name) {
    let users = getUsers();
    users = users.filter(u => u !== name);
    saveUsers(users);
    if (userBetData[name]) delete userBetData[name];
    rebuildTotal();
    refreshAll();
}

// ===== 平特肖存储键 =====
function getPingtexiaoKey() {
    const fd = document.getElementById('filterDate')?.value || getTodayCST();
    return `pingtexiao_${currentRegion}_${fd}`;
}
function getPingtexiaoData() {
    try { return JSON.parse(localStorage.getItem(getPingtexiaoKey()) || '{}'); } catch (e) { return {}; }
}
function savePingtexiaoData(data) {
    localStorage.setItem(getPingtexiaoKey(), JSON.stringify(data));
}

// ===== 赔率查询 =====
function getOddsData() {
    try { return JSON.parse(localStorage.getItem('comboOddsData') || '{}'); } catch (e) { return {}; }
}
function getOddsForType(type, oddsData) {
    const defaults = {
        '特码':{odds:47,rebate:4},
        '特肖':{odds:11,rebate:4},
        '特肖本年肖':{odds:10,rebate:4},
        '平特肖':{odds:2,rebate:4},'平特肖带主肖':{odds:1.8,rebate:4},'二连肖':{odds:4,rebate:4},'二连肖带主肖':{odds:3.5,rebate:4},
        '三连肖':{odds:10,rebate:4},'三连肖带主肖':{odds:9,rebate:4},'四连肖':{odds:30,rebate:4},'四连肖带主肖':{odds:25,rebate:4},
        '五连肖':{odds:100,rebate:4},'五连肖带主肖':{odds:90,rebate:4},'平特尾':{odds:1.8,rebate:4},'平特尾零尾':{odds:2,rebate:4},
        '二连尾':{odds:3,rebate:4},'二连尾零尾':{odds:3.5,rebate:4},'三连尾':{odds:6,rebate:4},'三连尾零尾':{odds:6.5,rebate:4},
        '四连尾':{odds:14,rebate:4},'四连尾零尾':{odds:15,rebate:4},'五连尾':{odds:28,rebate:4},'五连尾零尾':{odds:30,rebate:4},
        '五不中':{odds:2,rebate:4},'六不中':{odds:2.5,rebate:4},'七不中':{odds:3,rebate:4},'八不中':{odds:3.5,rebate:4},
        '九不中':{odds:4,rebate:4},'十不中':{odds:5,rebate:4},'十一不中':{odds:6,rebate:4},'十二不中':{odds:7,rebate:4},
        '二中二':{odds:60,rebate:4},'三中三':{odds:600,rebate:4},'平码':{odds:7,rebate:4},
        '特碰':{odds:120,rebate:4},
        '包红波':{odds:2.6,rebate:4},'包蓝波':{odds:2.7,rebate:4},'包绿波':{odds:2.7,rebate:4},
        '包红单':{odds:5,rebate:4},'包红双':{odds:4.7,rebate:4},'包红大':{odds:6,rebate:4},'包红小':{odds:4,rebate:4},
        '包蓝单':{odds:5,rebate:4},'包蓝双':{odds:5,rebate:4},'包蓝大':{odds:4.7,rebate:4},'包蓝小':{odds:6,rebate:4},
        '包绿单':{odds:5,rebate:4},'包绿双':{odds:5,rebate:4},'包绿大':{odds:5,rebate:4},'包绿小':{odds:6,rebate:4},
        '包单':{odds:1.8,rebate:4},'包双':{odds:1.8,rebate:4},'包大':{odds:1.8,rebate:4},'包小':{odds:1.8,rebate:4},
        '包家禽':{odds:1.8,rebate:4},'包野兽':{odds:1.8,rebate:4}
    };
    const saved = oddsData[type] || {};
    return {
        odds: parseFloat(saved.odds) || defaults[type]?.odds || 1,
        rebate: parseFloat(saved.rebate) || defaults[type]?.rebate || 4
    };
}

// ===== 别名与替换 =====
function applyCategoryAliases(text) {
    const a = getCategoryAliases();
    if (!a.length) return text;
    const s = [...a].sort((x, y) => y.alias.length - x.alias.length);
    let r = text;
    s.forEach(x => { if (x.alias && x.target) r = r.split(x.alias).join(x.target); });
    return r;
}

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

// ===== 玩法名称标准化 =====
function normalizePlayType(playType) {
    const map = {
        '2连肖':'二连肖','3连肖':'三连肖','4连肖':'四连肖','5连肖':'五连肖',
        '2连尾':'二连尾','3连尾':'三连尾','4连尾':'四连尾','5连尾':'五连尾',
        '5不中':'五不中','6不中':'六不中','7不中':'七不中','8不中':'八不中',
        '9不中':'九不中','10不中':'十不中','11不中':'十一不中','12不中':'十二不中',
        '2中2':'二中二','3中3':'三中三',
        '二连肖':'二连肖','三连肖':'三连肖','四连肖':'四连肖','五连肖':'五连肖',
        '二连尾':'二连尾','三连尾':'三连尾','四连尾':'四连尾','五连尾':'五连尾',
        '五不中':'五不中','六不中':'六不中','七不中':'七不中','八不中':'八不中',
        '九不中':'九不中','十不中':'十不中','十一不中':'十一不中','十二不中':'十二不中',
        '二中二':'二中二','三中三':'三中三','特碰':'特碰',
        '平特肖':'平特肖','平特尾':'平特尾','平码':'平码','特码':'特码','特肖':'特肖'
    };
    return map[playType] || playType;
}

function getComboTypeLabel(type) {
    const map = {
        '特肖': '特肖', 'tePeng': '特碰', pingtexiao: '平特肖', pingtewei: '平特尾',
        lianxiao2: '二连肖', lianxiao3: '三连肖', lianxiao4: '四连肖', lianxiao5: '五连肖',
        zhong2: '二中二', zhong3: '三中三', pingma: '平码',
        lianwei2: '二连尾', lianwei3: '三连尾', lianwei4: '四连尾', lianwei5: '五连尾',
        buzhong5: '五不中', buzhong6: '六不中', buzhong7: '七不中', buzhong8: '八不中',
        buzhong9: '九不中', buzhong10: '十不中', buzhong11: '十一不中', buzhong12: '十二不中'
    };
    return map[type] || type;
}