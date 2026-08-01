// ===== utils.js - 通用工具函数（数字转换、组合、排序、时间格式化等） =====

// 密码解码函数
function decodePassword(encoded) { return atob(encoded); }

// ===== 自定义对话框系统 =====
function showCustomDialog({ title = '提示', message = '', type = 'alert', defaultValue = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div'); overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `<div class="custom-dialog-box"><div class="custom-dialog-title">${title}</div><div class="custom-dialog-message">${message}</div>${type==='prompt'?`<input class="custom-dialog-input" type="text" value="${defaultValue}" placeholder="${placeholder}" id="custom-dialog-input">`:''}<div class="custom-dialog-buttons">${type==='confirm'||type==='prompt'?'<button class="custom-dialog-btn cancel" id="custom-dialog-cancel">取消</button>':''}<button class="custom-dialog-btn confirm" id="custom-dialog-confirm">确定</button></div></div>`;
    document.body.appendChild(overlay);
    const confirmBtn = overlay.querySelector('#custom-dialog-confirm'); const cancelBtn = overlay.querySelector('#custom-dialog-cancel'); const inputEl = overlay.querySelector('#custom-dialog-input');
    const close = (result) => { document.body.removeChild(overlay); resolve(result); };
    confirmBtn.onclick = () => { if (type === 'prompt') close(inputEl.value); else if (type === 'confirm') close(true); else close(undefined); };
    if (cancelBtn) cancelBtn.onclick = () => { if (type === 'confirm') close(false); else if (type === 'prompt') close(null); else close(undefined); };
    if (inputEl) { inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirmBtn.click(); }); inputEl.focus(); }
  });
}
function showToast(message) { const toast = document.createElement('div'); toast.className = 'toast-message'; toast.textContent = message; document.body.appendChild(toast); requestAnimationFrame(() => { toast.classList.add('show'); }); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { document.body.removeChild(toast); }, 300); }, 1500); }
async function customAlert(message) { await showCustomDialog({ title: '提示', message, type: 'alert' }); }
async function customConfirm(message) { return await showCustomDialog({ title: '请确认', message, type: 'confirm' }); }
async function customPrompt(message, defaultValue = '') { return await showCustomDialog({ title: '请输入', message, type: 'prompt', defaultValue }); }
window.alert = async (msg) => { await customAlert(msg); };
window.confirm = async (msg) => { return await customConfirm(msg); };
window.prompt = async (msg, def) => { return await customPrompt(msg, def); };

// ===== 中文数字与金额转换 =====
function toNum(s) {
  if (!s) return 0;
  s = String(s).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = { 零: 0, 〇: 0, 一: 1, 壹: 1, 二: 2, 贰: 2, 两: 2, 三: 3, 叁: 3, 四: 4, 肆: 4, 五: 5, 伍: 5, 六: 6, 陆: 6, 七: 7, 柒: 7, 八: 8, 捌: 8, 九: 9, 玖: 9 };
  const u = { 十: 10, 拾: 10, 百: 100, 佰: 100, 千: 1000, 仟: 1000, 万: 10000 };
  let r = 0, c = 0, t = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (m[ch] !== undefined) { t = m[ch]; }
    else if (u[ch] !== undefined) {
      const ut = u[ch];
      if (t === 0 && (ch == '十' || ch == '拾')) t = 1;
      if (ut >= 10000) { c = (c + t) * ut; r += c; c = 0; }
      else { c += t * ut; }
      t = 0;
    }
  }
  r += c + t;
  return r || 0;
}

// 号码排序
function sortNDash(s) { const ns = s.split('-').map(n => parseInt(n)).filter(n => !isNaN(n)); ns.sort((a, b) => a - b); return ns.map(n => String(n).padStart(2, '0')).join('-'); }
function sortZ(s) { const cs = s.split(''); cs.sort((a, b) => ZODIAC.indexOf(a) - ZODIAC.indexOf(b)); return cs.join(''); }

// 组合函数
function combos(arr, k) { const res = []; function bt(st, cur) { if (cur.length === k) { res.push([...cur]); return; } for (let i = st; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); } } bt(0, []); return res; }
function combosNoSort(arr, k) { const res = []; function bt(st, cur) { if (cur.length === k) { res.push([...cur]); return; } for (let i = st; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); } } bt(0, []); return res; }

// 生肖组合
function zCombos(zStr, k) { const cs = zStr.split(''); return combos(cs, k).map(c => sortZ(c.join(''))); }
function zCombosKeepOrder(zStr, k) { const cs = zStr.split(''); return combosNoSort(cs, k).map(c => c.join('')); }

// 尾数组合
function tailC(tStr, k) { const ns = tStr.split(/[,\-，]/).filter(n => n.trim()); return combos(ns, k).map(c => { const s = c.slice().sort((a, b) => parseInt(a) - parseInt(b)); return s.map(d => d + '尾').join('-'); }); }
function tailCKeepOrder(tStr, k) { const ns = tStr.split(/[,\-，]/).filter(n => n.trim()); return combosNoSort(ns, k).map(c => c.join('尾-') + '尾'); }

// 生肖转号码
function zodiacToNums(zStr) { const ns = []; for (const z of zStr) { if (D[z]) D[z].split(/[\s,，]+/).forEach(n => ns.push(n)); } return ns.sort((a, b) => parseInt(a) - parseInt(b)); }

// 提取号码
function extractNums(txt) { return (txt.match(/\d+/g) || []).map(n => parseInt(n)).filter(n => n >= 1 && n <= 49).map(n => String(n).padStart(2, '0')); }
function extractZodiacs(txt) { return (txt.match(new RegExp(`[${ZODIAC}]`, 'g')) || []); }
function findInvalidNums(txt) { if (!txt) return []; const allNums = (txt.match(/\d+/g) || []).map(n => parseInt(n)); return allNums.filter(n => n > 49); }

// 格式化时间（CST）
function formatTimestampToCST(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'Asia/Shanghai' }).format(d);
}

// 获取今日日期字符串（CST）
function getTodayCST() {
  const now = new Date();
  const offset = 8*60;
  const localTime = now.getTime() + (now.getTimezoneOffset() + offset) * 60000;
  const cstDate = new Date(localTime);
  return `${cstDate.getFullYear()}-${String(cstDate.getMonth()+1).padStart(2,'0')}-${String(cstDate.getDate()).padStart(2,'0')}`;
}

// 构建生肖映射
function buildZodiacMap(startZodiac) {
  const map = {};
  const startIndex = zodiacOrder.indexOf(startZodiac);
  const idx = startIndex !== -1 ? startIndex : 0;
  for (let i=1; i<=49; i++) map[i.toString().padStart(2,'0')] = zodiacOrder[(idx+i-1)%12];
  return map;
}

// 根据号码获取颜色类
function getNumberColorClass(num) {
  if (redNumbers.includes(num)) return 'red-text';
  if (blueNumbers.includes(num)) return 'blue-text';
  if (greenNumbers.includes(num)) return 'green-text';
  return '';
}

// 根据生肖获取颜色类
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

// 获取用户颜色
function getUserColor(u) {
  let h = 0;
  for (let i=0; i<u.length; i++) h = u.charCodeAt(i) + ((h<<5)-h);
  const hue = (h%360+360)%360;
  return `hsl(${hue},70%,45%)`;
}

// 格式化日期为月/日
function formatDateMD(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}`;
}

// 获取当前期号（基于年份和日期）
function getCurrentIssueNumber(year, targetDateStr) {
  const target = new Date(targetDateStr + 'T00:00:00');
  const start = new Date(year, 0, 1);
  if (isNaN(target) || isNaN(start)) return null;
  if (target < start) return null;
  const diff = target - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return dayOfYear;
}