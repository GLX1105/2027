// ===== dbCore.js - IndexedDB 初始化、升级、数据库连接管理 =====

function initIndexedDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbAvailable = false;
      document.getElementById('dbWarning').style.display = 'block';
      const dbStatusEl = document.getElementById('dbStatus');
      if (dbStatusEl) {
        dbStatusEl.textContent = '异常';
        dbStatusEl.style.color = '#e74c3c';
      }
      resolve(false);
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      dbAvailable = true;
      document.getElementById('dbWarning').style.display = 'none';
      const dbStatusEl = document.getElementById('dbStatus');
      if (dbStatusEl) {
        dbStatusEl.textContent = '正常';
        dbStatusEl.style.color = '#27ae60';
      }
      resolve(true);
    };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(REPORT_STORE_NAME)) {
        db.createObjectStore(REPORT_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RECYCLE_STORE_NAME)) {
        db.createObjectStore(RECYCLE_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(LOG_STORE_NAME)) {
        db.createObjectStore(LOG_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(COMBO_STORE_NAME)) {
        db.createObjectStore(COMBO_STORE_NAME, { keyPath: 'id' });
      }
      const tx = event.target.transaction;
      const orderStore = tx.objectStore(STORE_NAME);
      const reportStore = tx.objectStore(REPORT_STORE_NAME);
      const addRegion = (store) => {
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const records = allReq.result;
          records.forEach(r => {
            if (!r.region) {
              r.region = 'macau';
              store.put(r);
            }
          });
        };
      };
      addRegion(orderStore);
      addRegion(reportStore);
    };
  });
}

async function getAllOrdersUnfiltered() {
  return new Promise((resolve) => {
    if (!db) resolve([]);
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
  });
}

async function getAllReportsUnfiltered() {
  return new Promise((resolve) => {
    if (!db) resolve([]);
    const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
    const store = tx.objectStore(REPORT_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
  });
}

async function getOrderRecords() {
  const all = await getAllOrdersUnfiltered();
  return all.filter(r => r.region === currentRegion);
}

async function getReportOrderRecords() {
  const all = await getAllReportsUnfiltered();
  return all.filter(r => r.region === currentRegion);
}

async function getComboOrders() {
  return new Promise((resolve) => {
    if (!db) resolve([]);
    const tx = db.transaction([COMBO_STORE_NAME], 'readonly');
    const store = tx.objectStore(COMBO_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = (e) => resolve((e.target.result || []).filter(r => r.region === currentRegion));
  });
}