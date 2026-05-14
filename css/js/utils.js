// ===== 自定义对话框系统 =====
function showCustomDialog({ title = '提示', message = '', type = 'alert', defaultValue = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
      <div class="custom-dialog-box">
        <div class="custom-dialog-title">${title}</div>
        <div class="custom-dialog-message">${message}</div>
        ${type === 'prompt' ? `<input class="custom-dialog-input" type="text" value="${defaultValue}" placeholder="${placeholder}" id="custom-dialog-input">` : ''}
        <div class="custom-dialog-buttons">
          ${type === 'confirm' || type === 'prompt' ? '<button class="custom-dialog-btn cancel" id="custom-dialog-cancel">取消</button>' : ''}
          <button class="custom-dialog-btn confirm" id="custom-dialog-confirm">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const confirmBtn = overlay.querySelector('#custom-dialog-confirm');
    const cancelBtn = overlay.querySelector('#custom-dialog-cancel');
    const inputEl = overlay.querySelector('#custom-dialog-input');

    const close = (result) => {
      document.body.removeChild(overlay);
      resolve(result);
    };

    confirmBtn.onclick = () => {
      if (type === 'prompt') { close(inputEl.value); }
      else if (type === 'confirm') { close(true); }
      else { close(undefined); }
    };

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        if (type === 'confirm') close(false);
        else if (type === 'prompt') close(null);
        else close(undefined);
      };
    }

    if (inputEl) {
      inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirmBtn.click(); });
      inputEl.focus();
    }
  });
}

// 轻提示 toast 功能
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { document.body.removeChild(toast); }, 300);
  }, 1000);
}

async function customAlert(message) { await showCustomDialog({ title: '提示', message, type: 'alert' }); }
async function customConfirm(message) { return await showCustomDialog({ title: '请确认', message, type: 'confirm' }); }
async function customPrompt(message, defaultValue = '') { return await showCustomDialog({ title: '请输入', message, type: 'prompt', defaultValue }); }

window.alert = async (msg) => { await customAlert(msg); };
window.confirm = async (msg) => { return await customConfirm(msg); };
window.prompt = async (msg, def) => { return await customPrompt(msg, def); };

// ===== 日期工具 =====
function getTodayCST() {
  const now = new Date();
  const offset = 8 * 60;
  const localTime = now.getTime() + (now.getTimezoneOffset() + offset) * 60000;
  const cstDate = new Date(localTime);
  const y = cstDate.getFullYear();
  const m = String(cstDate.getMonth() + 1).padStart(2, '0');
  const d = String(cstDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimestampToCST(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'Asia/Shanghai'
  }).format(d);
}

function getUserColor(u) {
  let h = 0;
  for (let i = 0; i < u.length; i++) h = u.charCodeAt(i) + ((h << 5) - h);
  const hue = (h % 360 + 360) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

// ===== 常量定义 =====
const PASSWORD = "891105";
const YEAR_ZODIAC_PASSWORD = "150408";
const zodiacOrder = ['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
const redNumbers = ['01','02','07','08','12','13','18','19','23','24','29','30','34','35','40','45','46'];
const blueNumbers = ['03','04','09','10','14','15','20','25','26','31','36','37','41','42','47','48'];
const greenNumbers = ['05','06','11','16','17','21','22','27','28','32','33','38','39','43','44','49'];

// ===== IndexedDB 操作（全局 db 变量在 main.js 中初始化）=====
const DB_NAME = 'OrderDatabase';
const DB_VERSION = 3;
const STORE_NAME = 'orders';
const REPORT_STORE_NAME = 'report_orders';
let db = null;

function initIndexedDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => { resolve(false); };
    request.onsuccess = (event) => { db = event.target.result; resolve(true); };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(REPORT_STORE_NAME)) db.createObjectStore(REPORT_STORE_NAME, { keyPath: 'id' });
    };
  });
}

async function getOrderRecords() { return new Promise((resolve) => { if (!db) resolve([]); const tx = db.transaction([STORE_NAME],'readonly'); const store = tx.objectStore(STORE_NAME); const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); }); }
async function getReportOrderRecords() { return new Promise((resolve) => { if (!db) resolve([]); const tx = db.transaction([REPORT_STORE_NAME],'readonly'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []); }); }
async function saveOrderRecordToIDB(content, user, date, totalAmount = 0) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([STORE_NAME],'readwrite'); const store = tx.objectStore(STORE_NAME); const record = { id: Date.now(), content, user, date, totalAmount, timestamp: new Date().toISOString() }; const req = store.add(record); req.onsuccess = () => resolve(true); }); }
async function saveReportOrderRecordToIDB(content, user, date, totalAmount = 0) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([REPORT_STORE_NAME],'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); const record = { id: Date.now(), content, user, date, totalAmount, timestamp: new Date().toISOString() }; const req = store.add(record); req.onsuccess = () => resolve(true); }); }
async function deleteOrderRecordFromIDB(id) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([STORE_NAME],'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); }); }
async function deleteReportOrderRecordFromIDB(id) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([REPORT_STORE_NAME],'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.delete(id); req.onsuccess = () => resolve(true); }); }
async function batchDeleteOrderRecordFromIDB(ids) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([STORE_NAME],'readwrite'); const store = tx.objectStore(STORE_NAME); let count = 0; ids.forEach(id => { const req = store.delete(id); req.onsuccess = () => { count++; if (count === ids.length) resolve(true); }; }); }); }
async function batchDeleteReportOrderRecordFromIDB(ids) { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([REPORT_STORE_NAME],'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); let count = 0; ids.forEach(id => { const req = store.delete(id); req.onsuccess = () => { count++; if (count === ids.length) resolve(true); }; }); }); }
async function clearAllOrderRecordsFromIDB() { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([STORE_NAME],'readwrite'); const store = tx.objectStore(STORE_NAME); const req = store.clear(); req.onsuccess = () => resolve(true); }); }
async function clearAllReportOrderRecordsFromIDB() { return new Promise((resolve) => { if (!db) resolve(false); const tx = db.transaction([REPORT_STORE_NAME],'readwrite'); const store = tx.objectStore(REPORT_STORE_NAME); const req = store.clear(); req.onsuccess = () => resolve(true); }); }

// ===== localStorage 用户管理 =====
function getUsers() { return JSON.parse(localStorage.getItem('users') || '[]'); }
function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
function addUser(name) { const users = getUsers(); if (users.includes(name)) { showToast('用户已存在'); return false; } users.push(name); saveUsers(users); return true; }
async function deleteUser(name) { let users = getUsers(); users = users.filter(u => u !== name); saveUsers(users); if (userBetData[name]) delete userBetData[name]; rebuildTotal(); refreshAll(); }

// ===== 订单数据（全局变量，在 order.js 中操作）=====
let tableBetData = {};
let userBetData = {};
let reportBetData = {};
let reportAmountData = {};
let numberCount = {}, zodiacCount = {}, numberAmountCount = {}, zodiacAmountCount = {};
let numberOrderTotal = 0, zodiacWeightedTotal = 0;

function rebuildTotal() { tableBetData = {}; for (const u in userBetData) for (const n in userBetData[u]) tableBetData[n] = (tableBetData[n]||0) + userBetData[u][n]; }
function refreshAll() { updateSelects(); updateTableFromRecords(); }
function updateSelects() { const users = getUsers(); const orderSel = document.getElementById('orderUserSelect'); if (orderSel) { orderSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; orderSel.appendChild(o); }); } const viewSel = document.getElementById('viewUserSelect'); if (viewSel) { viewSel.innerHTML = ''; users.forEach(u => { const o = document.createElement('option'); o.value = u; o.textContent = u; viewSel.appendChild(o); }); } }

// ===== 当前生肖映射 =====
let currentZodiacMap = {};
function buildZodiacMap(startZodiac) {
  const map = {};
  const startIndex = zodiacOrder.indexOf(startZodiac);
  const idx = startIndex !== -1 ? startIndex : 0;
  for (let i = 1; i <= 49; i++) map[i.toString().padStart(2,'0')] = zodiacOrder[(idx + i - 1) % 12];
  return map;
}
