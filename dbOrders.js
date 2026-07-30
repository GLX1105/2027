// ===== dbOrders.js - 订单/上报/连肖记录的 CRUD、回收站操作、存储空间计算 =====

// ===== 保存记录 =====
async function saveOrderRecordToIDB(content, user, date, totalAmount = 0, ts = null, regionOverride = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    content,
    user,
    date,
    totalAmount,
    region: regionOverride || currentRegion,
    timestamp: ts || new Date().toISOString()
  };
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    showToast('保存失败，请重试');
    return false;
  }
}

async function saveReportOrderRecordToIDB(content, user, date, totalAmount = 0, ts = null, regionOverride = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    content,
    user,
    date,
    totalAmount,
    region: regionOverride || currentRegion,
    timestamp: ts || new Date().toISOString()
  };
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
      const store = tx.objectStore(REPORT_STORE_NAME);
      store.add(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    showToast('保存失败，请重试');
    return false;
  }
}

async function saveComboOrderRecordToIDB(content, user, date, totalAmount = 0, comboType = '', ts = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    content,
    user,
    date,
    totalAmount,
    comboType,
    region: currentRegion,
    timestamp: ts || new Date().toISOString()
  };
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
      const store = tx.objectStore(COMBO_STORE_NAME);
      store.add(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    showToast('保存失败，请重试');
    return false;
  }
}

// ===== 单条删除（移到回收站） =====
async function deleteOrderRecordFromIDB(id) {
  if (!db || !dbAvailable) return false;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!record) return false;
  await moveToRecycleBin(record, 'order');
  await new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
  return true;
}

async function deleteReportOrderRecordFromIDB(id) {
  if (!db || !dbAvailable) return false;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
    const store = tx.objectStore(REPORT_STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!record) return false;
  await moveToRecycleBin(record, 'report');
  await new Promise((resolve) => {
    const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
    const store = tx.objectStore(REPORT_STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
  return true;
}

async function deleteComboOrderRecordFromIDB(id) {
  if (!db || !dbAvailable) return false;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([COMBO_STORE_NAME], 'readonly');
    const store = tx.objectStore(COMBO_STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!record) return false;
  await moveToRecycleBin(record, 'combo');
  await new Promise((resolve) => {
    const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
    const store = tx.objectStore(COMBO_STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
  return true;
}

// ===== 批量删除 =====
async function batchDeleteOrderRecordFromIDB(ids) {
  if (!db || !dbAvailable) return false;
  try {
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (record) {
        await moveToRecycleBin(record, 'order');
        await new Promise((resolve) => {
          const tx = db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
    }
    return true;
  } catch (e) { console.error('批量删除订单失败', e); return false; }
}

async function batchDeleteReportOrderRecordFromIDB(ids) {
  if (!db || !dbAvailable) return false;
  try {
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
        const store = tx.objectStore(REPORT_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (record) {
        await moveToRecycleBin(record, 'report');
        await new Promise((resolve) => {
          const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
          const store = tx.objectStore(REPORT_STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
    }
    return true;
  } catch (e) { console.error('批量删除上报记录失败', e); return false; }
}

async function batchDeleteComboOrderRecordFromIDB(ids) {
  if (!db || !dbAvailable) return false;
  try {
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([COMBO_STORE_NAME], 'readonly');
        const store = tx.objectStore(COMBO_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (record) {
        await moveToRecycleBin(record, 'combo');
        await new Promise((resolve) => {
          const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
          const store = tx.objectStore(COMBO_STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
    }
    return true;
  } catch (e) { console.error('批量删除连肖记录失败', e); return false; }
}

// ===== 清空记录 =====
async function clearAllOrderRecordsFromIDB(region = null) {
  return new Promise((resolve) => {
    if (!db) resolve(false);
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (region) {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const records = allReq.result.filter(r => r.region === region);
        records.forEach(r => store.delete(r.id));
        resolve(true);
      };
    } else {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
    }
  });
}

async function clearAllReportOrderRecordsFromIDB(region = null) {
  return new Promise((resolve) => {
    if (!db) resolve(false);
    const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
    const store = tx.objectStore(REPORT_STORE_NAME);
    if (region) {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const records = allReq.result.filter(r => r.region === region);
        records.forEach(r => store.delete(r.id));
        resolve(true);
      };
    } else {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
    }
  });
}

async function clearAllComboOrderRecordsFromIDB(region = null) {
  return new Promise((resolve) => {
    if (!db) resolve(false);
    const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
    const store = tx.objectStore(COMBO_STORE_NAME);
    if (region) {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const records = allReq.result.filter(r => r.region === region);
        records.forEach(r => store.delete(r.id));
        resolve(true);
      };
    } else {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
    }
  });
}

// ===== 回收站操作 =====
async function getRecycleBinRecords() {
  return new Promise((resolve) => {
    if (!db) resolve([]);
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readonly');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
  });
}

async function moveToRecycleBin(record, type) {
  return new Promise((resolve) => {
    if (!db) { resolve(false); return; }
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    const recycleRecord = {
      id: record.id,
      type: type,
      content: record.content,
      user: record.user,
      date: record.date,
      totalAmount: record.totalAmount || 0,
      region: record.region || currentRegion,
      timestamp: record.timestamp,
      deletedAt: new Date().toISOString()
    };
    const req = store.add(recycleRecord);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

async function deleteFromRecycleBin(id) {
  return new Promise((resolve) => {
    if (!db) { resolve(false); return; }
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}

async function clearRecycleBin(region = null) {
  return new Promise((resolve) => {
    if (!db) resolve(false);
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    if (region) {
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const records = allReq.result.filter(r => r.region === region);
        records.forEach(r => store.delete(r.id));
        resolve(true);
      };
    } else {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
    }
  });
}

async function batchDeleteFromRecycleBin(ids) {
  return new Promise((resolve) => {
    if (!db) { resolve(false); return; }
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    let count = 0;
    ids.forEach(id => {
      const req = store.delete(id);
      req.onsuccess = () => {
        count++;
        if (count === ids.length) resolve(true);
      };
      req.onerror = () => { console.error('彻底删除失败', id); };
    });
  });
}

async function autoCleanRecycleBin() {
  try {
    const records = await getRecycleBinRecords();
    const now = Date.now();
    const expireMs = RECYCLE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const record of records) {
      const deletedTime = new Date(record.deletedAt).getTime();
      if (now - deletedTime > expireMs) {
        await deleteFromRecycleBin(record.id);
      }
    }
    updateRecycleCount();
  } catch (e) {}
}

// ===== 存储空间计算 =====
async function calculateStorageUsage() {
  const records = await getOrderRecords();
  const reportRecords = await getReportOrderRecords();
  const comboRecords = await getComboOrders();
  const orderCount = records.length + reportRecords.length + comboRecords.length;
  let usedBytes = 0;
  records.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  reportRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  comboRecords.forEach(r => usedBytes += JSON.stringify(r).length * 2);
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
  const maxStorage = 50 * 1024 * 1024;
  const freeMB = ((maxStorage - usedBytes) / (1024 * 1024)).toFixed(2);
  document.getElementById('orderCount').textContent = orderCount;
  document.getElementById('usedSpace').textContent = `${usedMB} MB`;
  document.getElementById('freeSpace').textContent = `${freeMB} MB`;
  const filterDate = document.getElementById('filterDate')?.value || getTodayCST();
  const todayRecords = records.filter(r => r.date === filterDate);
  document.getElementById('todayOrderCount').textContent = todayRecords.length;
  updateLogCount();
}

// ===== 回收站 UI 更新 =====
async function updateRecycleCount() {
  const span = document.getElementById('recycleCount');
  if (!span) return;
  try {
    const allRecords = await getRecycleBinRecords();
    const count = allRecords.filter(r => r.region === currentRegion).length;
    if (count > 0) {
      span.textContent = count;
      span.style.display = 'inline-block';
    } else {
      span.style.display = 'none';
    }
  } catch (e) { span.style.display = 'none'; }
}