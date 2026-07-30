// ===== display.js - 识别结果渲染、格式化输出、金额总计显示 =====

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

function updateOrderTotalDisplay(){
  const re=document.getElementById('orderResult'); const box=document.getElementById('orderTotalAmountBox'); const span=document.getElementById('orderTotalAmount'); const lineCountSpan=document.getElementById('orderLineCount');
  if(!re||!box||!span)return;
  const pureLines = window._pureOrderLines || [];
  if(pureLines.length === 0){ box.style.display='none'; if(lineCountSpan) lineCountSpan.style.display='none'; return; }
  let total=0; let validLineCount=pureLines.length;
  pureLines.forEach(line=>{
    if(line.startsWith('特肖:')){
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const zodiacs = match[1].split('-').filter(z => z.trim());
        const amt = parseInt(match[2]) || 0;
        total += zodiacs.length * amt;
      }
    } else if(line.startsWith('特碰:')){
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const cleaned = match[1].replace(/[()]/g, '');
        const groups = cleaned.split(/\s+/).filter(c => c.trim());
        const amtRaw = parseInt(match[2]) || 0;
        total += groups.length * amtRaw;
      }
    } else if(line.startsWith('包')){
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        const amtRaw = parseInt(match[3]) || 0;
        total += amtRaw;
      }
    } else if(line.startsWith('特码:')){
      const{numbers,amount}=countItemsInLine(line);
      const cnt=numbers.length;
      if(cnt>0 && amount>0) total+=cnt*amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3])||0;
        if(playType==='平特肖'||playType==='平特尾'||playType==='平码'){
          const items = content.split('-').filter(i=>i.trim());
          total += items.length * amt;
        } else {
          const cleaned = content.replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c=>c.trim());
          total += groups.length * amt;
        }
      }
    }
  });
  span.textContent=total;
  if(total>0){ box.style.display='inline-flex'; if(lineCountSpan){ lineCountSpan.innerHTML = '<span style="color:#000;">' + validLineCount + '</span>行'; lineCountSpan.style.display = 'inline'; } }
  else { box.style.display='none'; if(lineCountSpan) lineCountSpan.style.display='none'; }
}

function computeCurrentOrderTotal(){ 
  const pureLines = window._pureOrderLines || []; 
  let total=0; 
  pureLines.forEach(line=>{
    if(line.startsWith('特肖:')){
      const match = line.match(/^特肖:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const zodiacs = match[1].split('-').filter(z => z.trim());
        const amt = parseInt(match[2]) || 0;
        total += zodiacs.length * amt;
      }
    } else if(line.startsWith('特碰:')){
      const match = line.match(/^特碰:(.+?)\s+各\s*(\d+)$/);
      if(match){
        const cleaned = match[1].replace(/[()]/g, '');
        const groups = cleaned.split(/\s+/).filter(c => c.trim());
        total += groups.length * (parseInt(match[2]) || 0);
      }
    } else if(line.startsWith('包')){
      const match = line.match(/^包(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        total += parseInt(match[3]) || 0;
      }
    } else if(line.startsWith('特码:')){
      const{numbers,amount}=countItemsInLine(line);
      const cnt=numbers.length;
      if(cnt>0) total+=cnt*amount;
    } else {
      const match = line.match(/^(.+?):(.+?)\s+各\s*(\d+)$/);
      if(match){
        const playType = match[1]; const content = match[2]; const amt = parseInt(match[3])||0;
        if(playType==='平特肖'||playType==='平特尾'||playType==='平码'){
          const items = content.split('-').filter(i=>i.trim());
          total += items.length * amt;
        } else {
          const cleaned = content.replace(/[()]/g, '');
          const groups = cleaned.split(/\s+/).filter(c=>c.trim());
          total += groups.length * amt;
        }
      }
    }
  });
  return total; 
}

function updateAmountDisplays(){ 
  const nb=document.getElementById('numberTotalBox'); 
  const zb=document.getElementById('zodiacTotalBox'); 
  if(numberOrderTotal>0){
    document.getElementById('numberTotalAmount').textContent=numberOrderTotal;
    nb.style.display='inline-flex';
  } else { nb.style.display='none'; } 
  let zodiacTotal = 0;
  for (let z in zodiacDirectAmount) { zodiacTotal += zodiacDirectAmount[z] || 0; }
  if(zodiacTotal > 0){
    document.getElementById('zodiacTotalAmount').textContent = zodiacTotal;
    zb.style.display = 'inline-flex';
  } else { zb.style.display = 'none'; } 
}

function updateReportAmountTotal(){ 
  const box=document.getElementById('reportAmountTotalBox'); 
  const span=document.getElementById('reportAmountTotalValue'); 
  let total=0; 
  for(let n in reportAmountData) total += reportAmountData[n] || 0; 
  if(total>0){span.textContent=total;box.style.display='inline-flex';}else{box.style.display='none';} 
}

function updateOrderCountDisplay() {
  const fd = document.getElementById('filterDate')?.value || getTodayCST();
  getOrderRecords().then(orders => {
    const todayOrders = orders.filter(r => r.date === fd);
    const countEl = document.getElementById('duiJiangOrderCount');
    if (countEl) { countEl.textContent = '(共' + todayOrders.length + '单)'; }
  });
}

function clearAllInput(){ 
  const si=document.querySelector('.source-order-input'); if(si)si.value=''; 
  const re=document.getElementById('orderResult'); if(re)re.innerHTML=''; 
  window._pureOrderLines = []; 
  window._pureOrderRegions = [];
  updateOrderTotalDisplay(); 
  const md=document.getElementById('maxLossDisplay'); if(md){md.textContent='';md.style.display='none';}
  const box = document.getElementById('orderTotalAmountBox'); if(box) box.style.display='none';
  const lineCountSpan = document.getElementById('orderLineCount'); if(lineCountSpan) lineCountSpan.style.display='none';
}

function isTokenMatching(token, targetNum){ 
  const t=targetNum.padStart(2,'0'); 
  if(/^\d{1,2}$/.test(token)) return token.padStart(2,'0')===t; 
  if(D[token]){const nums=keyToAllNums(token);return nums.includes(t);} 
  return false; 
}

function highlightContent(content, targetNum){ 
  if(!targetNum) return content; 
  const t=targetNum.padStart(2,'0'); 
  const parts=[];let tmp=''; 
  for(const ch of content){if(ch==='-'||ch===' '){if(tmp)parts.push(tmp);parts.push(ch);tmp='';}else{tmp+=ch;}} 
  if(tmp) parts.push(tmp); 
  return parts.map(p=>{if(p==='-'||p===' ')return p;if(isTokenMatching(p,targetNum))return`<span class="highlight-number">${p}</span>`;return p;}).join(''); 
}

function orderContainsTarget(content, targetNum){ 
  if(!targetNum) return true; 
  const t=targetNum.padStart(2,'0'); 
  const lines=content.split('\n'); 
  for(const line of lines){ 
    if(!line.startsWith('特码:')) continue; 
    const m=line.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); 
    if(!m)continue; 
    const cont=m[1]; 
    const parts=[];let tmp=''; 
    for(const ch of cont){if(ch==='-'||ch===' '){if(tmp)parts.push(tmp);tmp='';}else{tmp+=ch;}} 
    if(tmp) parts.push(tmp); 
    for(const p of parts){if(p!=='-'&&p!==' '&&isTokenMatching(p,targetNum)) return true;} 
  } 
  return false; 
}

function getSpecialAmountFromOrder(content, prizeNum) { 
  if (!prizeNum) return 0; 
  const targetNum = prizeNum.padStart(2, '0'); 
  const lines = content.split('\n'); 
  let total = 0; 
  for (const line of lines) { 
    const match = line.match(/^(.+?):(.+?)\s+各(?:数|)\s*(\d+)$/); 
    if (!match) continue; 
    const tokensPart = match[2]; 
    const amount = parseInt(match[3]) || 0; 
    const tokens = tokensPart.split('-').map(t => t.trim()).filter(t => t); 
    for (const token of tokens) { 
      if (isTokenMatching(token, targetNum)) { 
        total += amount; 
      } 
    } 
  } 
  return total; 
}

function renderOrderStats(allOrders, allReports, filterUser, prizeNum) {
  const container = document.getElementById('orderStatsContainer');
  if (!container) return;
  const mul = parseFloat(document.getElementById('multipleVal')?.value) || 1;
  const rr = parseFloat(document.getElementById('rebateRate')?.value) || 0;
  let totalAmountSum = 0;
  allOrders.forEach(it => { totalAmountSum += it.totalAmount || 0; });
  let reportTotalAmount = 0;
  allReports.forEach(it => { reportTotalAmount += it.totalAmount || 0; });
  let totalSpecial = 0, reportSpecial = 0, hitCount = 0;
  if (prizeNum) {
    const num = prizeNum.padStart(2, '0');
    allOrders.forEach(it => {
      totalSpecial += getSpecialAmountFromOrder(it.content, prizeNum);
      if (orderContainsTarget(it.content, prizeNum)) hitCount++;
    });
    allReports.forEach(it => {
      reportSpecial += getSpecialAmountFromOrder(it.content, prizeNum);
    });
  }
  const totalProfit = Math.round(totalAmountSum - totalAmountSum * (rr / 100) - totalSpecial * mul);
  const reportProfit = Math.round(reportTotalAmount - reportTotalAmount * (rr / 100) - reportSpecial * mul);
  const netProfit = totalProfit - reportProfit;
  const showStats = prizeNum && prizeNum.trim() !== '';
  let html = '<div class="stats-block">';
  html += '<div class="stats-row">';
  if (totalAmountSum > 0) { html += `<span class="stat-col"><span class="slabel">总额:</span><span class="stat-val-amount">${totalAmountSum}</span></span>`; }
  if (showStats) {
    html += `<span class="stat-col"><span class="slabel">总特:</span><span class="stat-val-special">${totalSpecial}</span></span>`;
    const tp = Math.round(totalProfit);
    const tlabel = tp >= 0 ? '总盈' : '总亏';
    const tcls = tp >= 0 ? 'stat-val-profit' : 'stat-val-loss';
    html += `<span class="stat-col"><span class="slabel">${tlabel}:</span><span class="${tcls}">${tp}</span></span>`;
    html += `<span class="stat-col"><span class="slabel">中:</span><span class="stat-val-count">${hitCount}条</span></span>`;
  }
  html += '</div><div class="stats-row">';
  if (reportTotalAmount > 0) { html += `<span class="stat-col"><span class="slabel">上报金额:</span><span class="stat-val-amount">${reportTotalAmount}</span></span>`; }
  if (showStats) {
    html += `<span class="stat-col"><span class="slabel">上报特:</span><span class="stat-val-special">${reportSpecial}</span></span>`;
    const rp = Math.round(reportProfit);
    const rlabel = rp >= 0 ? '报盈' : '报亏';
    const rcls = rp >= 0 ? 'stat-val-profit' : 'stat-val-loss';
    html += `<span class="stat-col"><span class="slabel">${rlabel}:</span><span class="${rcls}">${rp}</span></span>`;
    const np = Math.round(netProfit);
    const nlabel = np >= 0 ? '盈' : '亏';
    const ncls = np >= 0 ? 'stat-val-profit' : 'stat-val-loss';
    html += `<span class="stat-col"><span class="slabel">${nlabel}:</span><span class="${ncls}">${np}</span></span>`;
  }
  html += '</div></div>';
  container.innerHTML = html;
}

function updatePrizeStats(pn) {}

async function applyPrizeFilter(){ 
  const pi=document.getElementById('prizeNumberInput'),uf=document.getElementById('recordUserFilter'); 
  if(!pi||!uf) return; 
  const sd = document.getElementById('filterDate')?.value; 
  const pn=pi.value.trim(),uv=uf.value; 
  const recs=await getOrderRecords(); 
  const reports=await getReportOrderRecords(); 
  const fRecs = sd ? recs.filter(r=>r.date===sd) : recs; 
  const fReps = sd ? reports.filter(r=>r.date===sd) : reports; 
  const userOrders = uv==='all' ? fRecs : fRecs.filter(r=>r.user===uv); 
  const userReports = uv==='all' ? fReps : fReps.filter(r=>r.user===uv); 
  let filtered=pn ? [] : [...userOrders]; 
  if(pn){ for(const it of userOrders){ if(orderContainsTarget(it.content,pn)) filtered.push(it); } } 
  const cont=document.getElementById('orderListContainer'); 
  if(!cont)return; 
  if(filtered.length===0){cont.innerHTML='<div style="padding:20px;text-align:center;color:#666;">暂无匹配订单</div>';} 
  else{ 
    cont.innerHTML=filtered.map(it=>{ 
      const ts=formatTimestampToCST(it.timestamp),ud=it.user||'未知',col=getUserColor(ud),ta=it.totalAmount||0; 
      const lines=it.content.split('\n'); 
      const hl=lines.map(l=>{ 
        const m=l.match(/^特码:(.+?)\s+各(?:数|)\s*(\d+)$/); 
        if(!m)return l; 
        const cont=m[1],amt=m[2]; 
        const hc=highlightContent(cont,pn); 
        return`特码:${hc} 各数 ${amt}`; 
      }).join('<br>'); 
      return`<div class="order-item"><input type="checkbox" class="order-check" data-id="${it.id}"><div class="order-content" data-id="${it.id}">${hl}</div><div class="order-info"><span class="order-total" style="color:#000;">合计：${ta}</span><span class="order-meta"><span style="color:${col};">用户：${ud}</span> &nbsp; ${ts}</span></div><button class="order-copy" onclick="copySingleOrderById('${it.id}')" style="background:#8e44ad;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;padding:4px 10px;white-space:nowrap;margin-right:4px;">复制</button><button class="order-del" onclick="deleteOrderRecord('${it.id}')">删除</button></div>`; 
    }).join(''); 
  } 
  renderOrderStats(userOrders, userReports, uv, pn); 
}