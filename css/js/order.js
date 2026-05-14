// ===== 快捷添加 =====
function quickAddWithAmount(text, button) {
  const input = document.querySelector('.source-order-input');
  if (!input) return;
  const lines = input.value.trim().split('\n').filter(l => l.trim());
  const idx = lines.findIndex(l => l.includes(text) && (l.includes('各数') || l.includes('各号')));
  if (idx !== -1) {
    lines.splice(idx, 1);
    button.classList.remove('active');
  } else {
    lines.push(`${text} 各数`);
    button.classList.add('active');
  }
  input.value = lines.join('\n');
  convertOrderText();
}

// ===== 获取自定义配置 =====
function getReplacePresets() { try { return JSON.parse(localStorage.getItem('replacePresets') || '[]'); } catch (e) { return []; } }
function getCategoryAliases() { try { return JSON.parse(localStorage.getItem('categoryAliases') || '[]'); } catch (e) { return []; } }
function getCustomPrefixes() { try { return JSON.parse(localStorage.getItem('customPrefixes') || '[]'); } catch (e) { return []; } }
function getCustomSuffixes() { try { return JSON.parse(localStorage.getItem('customSuffixes') || '[]'); } catch (e) { return []; } }
function getCustomAmountSuffixes() { try { return JSON.parse(localStorage.getItem('customAmountSuffixes') || '[]'); } catch (e) { return []; } }

function removeSeparators() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e);
  const cleaned = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '');
  ta.value = ta.value.substring(0, s) + cleaned + ta.value.substring(e);
  convertOrderText();
}

function replaceSeparators() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e);
  const replaced = sel.replace(/[\s,，.。、+\-*＊\/\\|]+/g, '-');
  ta.value = ta.value.substring(0, s) + replaced + ta.value.substring(e);
  convertOrderText();
}

// ===== 应用别名和预设 =====
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
  p.forEach(x => { if (x.old && x.new) r = r.split(x.old).join(x.new); });
  return r;
}

// ===== 语义转换 =====
async function semanticReplace() {
  const ta = document.querySelector('.source-order-input');
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  if (s === e) { showToast('请先选择文本'); return; }
  const sel = ta.value.substring(s, e);
  const cfg = getAllConfigData();
  const vc = getAllValidCategories(cfg);
  const tokens = sel.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim());
  const matched = tokens.filter(t => vc.has(t));
  if (!matched.length) { showToast('未识别有效分类'); return; }
  let sets = matched.map(cat => {
    let nums = [];
    if (cfg.shengxiaoAttr[cat]) {
      cfg.shengxiaoAttr[cat].forEach(z => { if (cfg.zodiac[z]) nums.push(...cfg.zodiac[z].map(n => n.toString().padStart(2, '0'))); });
    }
    const dir = cfg.wuxing[cat] || cfg.bose[cat] || cfg.banbo[cat] || cfg.danshuang[cat] || cfg.weishu[cat] || cfg.daxiaodanshuang[cat] || cfg.daxiao[cat] || cfg.heshu[cat] || cfg.toushu[cat] || cfg.menshu[cat] || cfg.duanwei[cat] || cfg.hedahexiao[cat] || cfg.weidaweixiao[cat] || cfg.hewei[cat] || cfg.heshudanshuang[cat] || cfg.toushuDanshuang[cat];
    if (dir) nums.push(...dir.map(n => n.toString().padStart(2, '0')));
    if (cfg.zodiac[cat]) nums.push(...cfg.zodiac[cat].map(n => n.toString().padStart(2, '0')));
    return new Set(nums);
  });
  let inter = sets[0];
  for (let i = 1; i < sets.length; i++) inter = new Set([...inter].filter(x => sets[i].has(x)));
  const res = [...inter].sort((a, b) => parseInt(a) - parseInt(b));
  if (!res.length) { showToast('无共同号码'); return; }
  const str = res.join('-');
  const cf = await confirm(`转换结果：${str}\n是否替换选中文本？`);
  if (cf) { ta.value = ta.value.substring(0, s) + str + ta.value.substring(e); convertOrderText(); }
}

function tokenizeAndJoin(content) {
  const cfg = getAllConfigData();
  const vc = getAllValidCategories(cfg);
  const tokens = content.split(/[\s,，.。、+\-*＊\/\\|]+/).filter(t => t.trim()).map(t => t.trim());
  const res = [];
  tokens.forEach(t => {
    const tm = t.match(/^(\d{2,})尾$/);
    const hm = t.match(/^(\d{2,})头$/);
    if (tm) { const ds = tm[1].split('').map(d => d + '尾'); res.push(...ds); }
    else if (hm) { const ds = hm[1].split('').map(d => d + '头'); res.push(...ds); }
    else if (/^\d{1,2}$/.test(t)) { const n = parseInt(t); if (n >= 1 && n <= 49) res.push(t.length === 1 ? '0' + t : t); }
    else if (vc.has(t)) { res.push(t); }
    else if (/^[\u4e00-\u9fa5]+$/.test(t)) { const cs = t.match(/[\u4e00-\u9fa5]/g) || []; if (cs.every(c => vc.has(c))) res.push(...cs); }
  });
  return res.join('-');
}

function convertOrderText() {
  const inputEl = document.querySelector('.source-order-input');
  if (!inputEl) return;
  let text = applyCategoryAliases(applyReplacePresets(inputEl.value.trim()));
  const resultEl = document.getElementById('orderResult');
  if (!resultEl) return;
  if (!text) { resultEl.value = ''; updateOrderTotalDisplay(); return; }
  const lines = text.split('\n'); const resultLines = [];
  const AMP = '(?:各|各号|号|个|=|各数|每数|每号|个号|每个号|各码|各号码)';
  const IGN = ['奥特', '特码', '澳门特码', '特', '奥', '澳', '澳门', '澳門', '澳門特碼', '澳门特码', '澳門特码', ':', '。', '.', '新', ',', '新', '新奥', '门', '，', '新澳', '新特', '新澳特', '特碼'];
  const cusPre = getCustomPrefixes();
  const allPre = [...IGN, ...cusPre];
  const cusSuf = getCustomSuffixes();
  const baseSuf = '元块咪斤#،。\\s';
  const cusAmtSuf = getCustomAmountSuffixes();
  const allAmtChars = [...new Set([...baseSuf.split(''), ...cusAmtSuf])].join('');
  const AMTS = `[${allAmtChars}]*`;
  function cn2n(s) {
    const m = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000 };
    let sum = 0, tmp = 0;
    for (let c of s) {
      const v = m[c];
      if (v === 10 || v === 100 || v === 1000) { if (tmp === 0) tmp = 1; tmp *= v; sum += tmp; tmp = 0; }
      else if (v !== undefined) { if (tmp > 0) { sum += tmp; tmp = 0; } tmp = v; }
    }
    sum += tmp; return sum;
  }
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    let cl = line;
    allPre.forEach(p => { if (cl.startsWith(p)) cl = cl.substring(p.length).trim(); });
    cusSuf.forEach(s => { if (cl.endsWith(s)) cl = cl.slice(0, -s.length).trim(); });
    cl = cl.replace(/([一二三四五六七八九十百千]+)/g, (m) => cn2n(m));
    const op = new RegExp(`(${AMP}\\d+${AMTS})`, 'g');
    const om = cl.match(op);
    if (om && om.length > 0) {
      let rl = cl;
      om.forEach(om => {
        const oi = rl.indexOf(om);
        if (oi !== -1) {
          const cont = rl.substring(0, oi).trim();
          const am = om.match(/(\d+)/);
          if (am) {
            const amt = am[1];
            if (cont) { const jo = tokenizeAndJoin(cont); if (jo) resultLines.push(`${jo} 各数 ${amt}`); }
            rl = rl.substring(oi + om.length);
          }
        }
      });
      if (rl.trim()) { const jo = tokenizeAndJoin(rl.trim()); if (jo) resultLines.push(`${jo} 各数 0`); }
    } else {
      const pat = new RegExp(`^(.+?)${AMP}(\\d+)$`);
      const m = cl.match(pat);
      if (m) { const jo = tokenizeAndJoin(m[1].trim()); if (jo) resultLines.push(`${jo} 各数 ${m[2]}`); }
      else {
        const sp = new RegExp(`(\\d+)(?:号|${AMP})(\\d+)$`);
        const sm = cl.match(sp);
        if (sm) { let num = sm[1].trim(); if (parseInt(num) >= 1 && parseInt(num) <= 49) { num = num.length === 1 ? `0${num}` : num; resultLines.push(`${num} 各数 ${sm[2]}`); } }
        else { const jo = tokenizeAndJoin(cl); if (jo) resultLines.push(`${jo} 各数 0`); }
      }
    }
  });
  resultEl.value = resultLines.join('\n');
  updateOrderTotalDisplay();
}

function getAllValidCategories(cfg) {
  const s = new Set();
  Object.keys(cfg.zodiac).forEach(k => s.add(k));
  Object.keys(cfg.shengxiaoAttr).forEach(k => s.add(k));
  Object.keys(cfg.wuxing).forEach(k => s.add(k));
  Object.keys(cfg.bose).forEach(k => s.add(k));
  Object.keys(cfg.banbo).forEach(k => s.add(k));
  Object.keys(cfg.danshuang).forEach(k => s.add(k));
  Object.keys(cfg.weishu).forEach(k => s.add(k));
  Object.keys(cfg.daxiaodanshuang).forEach(k => s.add(k));
  Object.keys(cfg.daxiao).forEach(k => s.add(k));
  Object.keys(cfg.heshu).forEach(k => s.add(k));
  Object.keys(cfg.toushu).forEach(k => s.add(k));
  Object.keys(cfg.menshu).forEach(k => s.add(k));
  Object.keys(cfg.duanwei).forEach(k => s.add(k));
  Object.keys(cfg.hedahexiao).forEach(k => s.add(k));
  Object.keys(cfg.weidaweixiao).forEach(k => s.add(k));
  Object.keys(cfg.hewei).forEach(k => s.add(k));
  Object.keys(cfg.heshudanshuang).forEach(k => s.add(k));
  Object.keys(cfg.toushuDanshuang).forEach(k => s.add(k));
  return s;
}

// ===== 保存订单 =====
async function saveOrder() {
  const user = document.getElementById('orderUserSelect')?.value;
  if (!user) { showToast('请选择用户'); return; }
  let input = document.getElementById('orderResult')?.value.trim() || document.querySelector('.source-order-input')?.value.trim();
  if (!input) return;
  const vl = input.split('\n').filter(l => { const m = l.match(/各数\s+(\d+)/); return m && parseInt(m[1]) > 0; });
  if (!vl.length) { showToast('订单无效'); return; }
  const content = vl.join('\n');
  const date = document.getElementById('orderDate')?.value || getTodayCST();
  const total = computeCurrentOrderTotal();
  await saveOrderRecordToIDB(content, user, date, total);
  processCurrentOrder(content, user, true, date);
  const si = document.querySelector('.source-order-input'); if (si) si.value = '';
  const re = document.getElementById('orderResult'); if (re) re.value = '';
  updateOrderTotalDisplay();
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
}

async function saveReportOrder() {
  const user = document.getElementById('orderUserSelect')?.value;
  if (!user) { showToast('请选择用户'); return; }
  let input = document.getElementById('orderResult')?.value.trim() || document.querySelector('.source-order-input')?.value.trim();
  if (!input) return;
  const vl = input.split('\n').filter(l => { const m = l.match(/各数\s+(\d+)/); return m && parseInt(m[1]) > 0; });
  if (!vl.length) { showToast('订单无效'); return; }
  const content = vl.join('\n');
  const date = document.getElementById('orderDate')?.value || getTodayCST();
  const total = computeCurrentOrderTotal();
  await saveReportOrderRecordToIDB(content, user, date, total);
  processCurrentOrder(content, user, false, date);
  const si = document.querySelector('.source-order-input'); if (si) si.value = '';
  const re = document.getElementById('orderResult'); if (re) re.value = '';
  updateOrderTotalDisplay();
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
}

function countItemsInLine(line, cfg, keys) {
  const m = line.match(/([\u4e00-\u9fa5\d\-]+)\s+各数\s+(\d+)/);
  if (!m) return { numbers: [], zodiacs: [], amount: 0 };
  let cont = m[1]; const amt = parseInt(m[2]) || 0;
  const items = cont.split('-').map(i => i.trim()).filter(i => i);
  const nums = [], zods = [];
  items.forEach(item => {
    if (/^\d+$/.test(item)) nums.push(item.padStart(2, '0'));
    else if (cfg.shengxiaoAttr[item]) { const zs = cfg.shengxiaoAttr[item] || []; zs.forEach(z => zods.push(z)); }
    else if (cfg.zodiac[item]) zods.push(item);
    else if (cfg.toushuDanshuang && cfg.toushuDanshuang[item]) { (cfg.toushuDanshuang[item] || []).forEach(n => nums.push(n.padStart(2, '0'))); }
    else {
      const nl = cfg.wuxing[item] || cfg.bose[item] || cfg.banbo[item] || cfg.danshuang[item] || cfg.weishu[item] || cfg.daxiaodanshuang[item] || cfg.daxiao[item] || cfg.heshu[item] || cfg.toushu[item] || cfg.menshu[item] || cfg.duanwei[item] || cfg.hedahexiao[item] || cfg.weidaweixiao[item] || cfg.hewei[item] || cfg.heshudanshuang[item] || cfg.toushuDanshuang[item];
      if (nl) nl.forEach(n => nums.push(n.padStart(2, '0')));
    }
  });
  return { numbers: nums, zodiacs: zods, amount: amt };
}

function processCurrentOrder(input, user, isNormal, date = null) {
  const cfg = getAllConfigData();
  const keys = getAllValidCategories(cfg);
  const lines = input.split('\n').filter(l => l.trim());
  if (!userBetData[user]) userBetData[user] = {};
  const curZod = localStorage.getItem('selectedStartZodiac') || '马';
  lines.forEach(line => {
    const { numbers, zodiacs, amount } = countItemsInLine(line, cfg, keys);
    const nMin = parseInt(document.getElementById('numAmountMin')?.value) || 1, nMax = parseInt(document.getElementById('numAmountMax')?.value) || 50000;
    const zMin = parseInt(document.getElementById('zodiacAmountMin')?.value) || 1, zMax = parseInt(document.getElementById('zodiacAmountMax')?.value) || 50000;
    if (isNormal) {
      if (zodiacs.length > 0) { zodiacs.forEach(z => { const w = z === curZod ? 5 : 4; zodiacWeightedTotal += amount * w; }); }
      else if (numbers.length > 0) { numberOrderTotal += numbers.length * amount; }
    }
    numbers.forEach(num => {
      if (isNormal) {
        userBetData[user][num] = (userBetData[user][num] || 0) + amount;
        tableBetData[num] = (tableBetData[num] || 0) + amount;
        reportBetData[num] = (reportBetData[num] || 0) + amount;
        numberCount[num] = (numberCount[num] || 0) + 1;
        if (amount >= nMin && amount <= nMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
      } else {
        userBetData[user][num] = (userBetData[user][num] || 0) - amount;
        reportBetData[num] = (reportBetData[num] || 0) - amount;
        reportAmountData[num] = (reportAmountData[num] || 0) + amount;
      }
    });
    zodiacs.forEach(z => {
      if (isNormal) {
        zodiacCount[z] = (zodiacCount[z] || 0) + 1;
        if (amount >= zMin && amount <= zMax) zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1;
        (cfg.zodiac[z] || []).forEach(n => {
          const num = n.padStart(2, '0');
          userBetData[user][num] = (userBetData[user][num] || 0) + amount;
          tableBetData[num] = (tableBetData[num] || 0) + amount;
          reportBetData[num] = (reportBetData[num] || 0) + amount;
        });
      } else {
        (cfg.zodiac[z] || []).forEach(n => {
          const num = n.padStart(2, '0');
          userBetData[user][num] = (userBetData[user][num] || 0) - amount;
          reportBetData[num] = (reportBetData[num] || 0) - amount;
          reportAmountData[num] = (reportAmountData[num] || 0) + amount;
        });
      }
    });
  });
  generateRiskTable();
  generateReportTable();
  renderFrequencyCards();
  renderAmountFrequencyCards();
  renderReportAmountTable();
  updateReportAmountTotal();
  updateAmountDisplays();
}

async function updateTableFromRecords() {
  try {
    const fd = document.getElementById('filterDate')?.value;
    tableBetData = {}; userBetData = {}; reportBetData = {}; reportAmountData = {};
    numberCount = {}; zodiacCount = {}; numberAmountCount = {}; zodiacAmountCount = {};
    numberOrderTotal = 0; zodiacWeightedTotal = 0;
    const recs = await getOrderRecords();
    const reps = await getReportOrderRecords();
    const cfg = getAllConfigData();
    const keys = getAllValidCategories(cfg);
    const nMin = parseInt(document.getElementById('numAmountMin')?.value) || 1, nMax = parseInt(document.getElementById('numAmountMax')?.value) || 50000;
    const zMin = parseInt(document.getElementById('zodiacAmountMin')?.value) || 1, zMax = parseInt(document.getElementById('zodiacAmountMax')?.value) || 50000;
    const curZod = localStorage.getItem('selectedStartZodiac') || '马';
    const fRecs = fd ? recs.filter(r => r.date === fd) : recs;
    const fReps = fd ? reps.filter(r => r.date === fd) : reps;
    fRecs.forEach(rec => {
      if (!userBetData[rec.user]) userBetData[rec.user] = {};
      rec.content.split('\n').filter(l => l.trim()).forEach(line => {
        const { numbers, zodiacs, amount } = countItemsInLine(line, cfg, keys);
        if (zodiacs.length > 0) { zodiacs.forEach(z => { const w = z === curZod ? 5 : 4; zodiacWeightedTotal += amount * w; }); }
        else if (numbers.length > 0) { numberOrderTotal += numbers.length * amount; }
        numbers.forEach(num => {
          userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amount;
          tableBetData[num] = (tableBetData[num] || 0) + amount;
          reportBetData[num] = (reportBetData[num] || 0) + amount;
          numberCount[num] = (numberCount[num] || 0) + 1;
          if (amount >= nMin && amount <= nMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
        });
        zodiacs.forEach(z => {
          zodiacCount[z] = (zodiacCount[z] || 0) + 1;
          if (amount >= zMin && amount <= zMax) zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1;
          (cfg.zodiac[z] || []).forEach(n => {
            const num = n.padStart(2, '0');
            userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) + amount;
            tableBetData[num] = (tableBetData[num] || 0) + amount;
            reportBetData[num] = (reportBetData[num] || 0) + amount;
          });
        });
      });
    });
    fReps.forEach(rec => {
      rec.content.split('\n').filter(l => l.trim()).forEach(line => {
        const { numbers, zodiacs, amount } = countItemsInLine(line, cfg, keys);
        numbers.forEach(num => {
          userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) - amount;
          reportBetData[num] = (reportBetData[num] || 0) - amount;
          reportAmountData[num] = (reportAmountData[num] || 0) + amount;
        });
        zodiacs.forEach(z => {
          (cfg.zodiac[z] || []).forEach(n => {
            const num = n.padStart(2, '0');
            userBetData[rec.user][num] = (userBetData[rec.user][num] || 0) - amount;
            reportBetData[num] = (reportBetData[num] || 0) - amount;
            reportAmountData[num] = (reportAmountData[num] || 0) + amount;
          });
        });
      });
    });
    generateRiskTable();
    generateReportTable();
    renderFrequencyCards();
    renderAmountFrequencyCards();
    renderReportAmountTable();
    updateReportAmountTotal();
    updateAmountDisplays();
  } catch (e) { console.error(e); }
}

function updateOrderTotalDisplay() {
  const re = document.getElementById('orderResult');
  const box = document.getElementById('orderTotalAmountBox');
  const span = document.getElementById('orderTotalAmount');
  if (!re || !box || !span) return;
  const txt = re.value.trim();
  if (!txt) { box.style.display = 'none'; return; }
  const lines = txt.split('\n');
  const cfg = getAllConfigData();
  const keys = getAllValidCategories(cfg);
  let total = 0;
  lines.forEach(line => {
    const { numbers, zodiacs, amount } = countItemsInLine(line, cfg, keys);
    let cnt = numbers.length;
    zodiacs.forEach(z => { cnt += (cfg.zodiac[z] || []).length; });
    if (cnt > 0) total += cnt * amount;
  });
  span.textContent = total;
  box.style.display = 'inline-flex';
}

function computeCurrentOrderTotal() {
  const re = document.getElementById('orderResult');
  if (!re) return 0;
  const txt = re.value.trim();
  if (!txt) return 0;
  const lines = txt.split('\n');
  const cfg = getAllConfigData();
  const keys = getAllValidCategories(cfg);
  let total = 0;
  lines.forEach(line => {
    const { numbers, zodiacs, amount } = countItemsInLine(line, cfg, keys);
    let cnt = numbers.length;
    zodiacs.forEach(z => { cnt += (cfg.zodiac[z] || []).length; });
    if (cnt > 0) total += cnt * amount;
  });
  return total;
}

function updateAmountDisplays() {
  const nb = document.getElementById('numberTotalBox');
  const zb = document.getElementById('zodiacTotalBox');
  if (numberOrderTotal > 0) { document.getElementById('numberTotalAmount').textContent = numberOrderTotal; nb.style.display = 'inline-flex'; } else { nb.style.display = 'none'; }
  if (zodiacWeightedTotal > 0) { document.getElementById('zodiacTotalAmount').textContent = zodiacWeightedTotal; zb.style.display = 'inline-flex'; } else { zb.style.display = 'none'; }
}

function updateReportAmountTotal() {
  const box = document.getElementById('reportAmountTotalBox');
  const span = document.getElementById('reportAmountTotalValue');
  let total = 0;
  for (let n in reportAmountData) total += reportAmountData[n] || 0;
  if (total > 0) { span.textContent = total; box.style.display = 'inline-flex'; } else { box.style.display = 'none'; }
}
