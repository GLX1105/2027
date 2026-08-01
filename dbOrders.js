// ===== dbOrders.js - 订单/上报/连肖记录的 CRUD、回收站操作 =====

async function saveOrderRecordToIDB(content, user, date, totalAmount = 0, ts = null, regionOverride = null) {
  if (!db || !dbAvailable) { showToast('数据库不可用，操作无法保存'); return false; }
  const record = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), content, user, date, totalAmount, region: regionOverride || currentRegion, timestamp: ts || new Date().toISOString() };
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
  const record = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), content, user, date, totalAmount, region: regionOverride || currentRegion, timestamp: ts || new Date().toISOString() };
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
  const record = { id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), content, user, date, totalAmount, comboType, region: currentRegion, timestamp: ts || new Date().toISOString() };
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

// ===== 单条删除函数 =====
async function deleteOrderRecordFromIDB(id) {
  if (!db || !dbAvailable) return false;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
  });
  if (!record) return false;
  await moveToRecycleBin(record, 'order');
  await new Promise((resolve) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false);
  });
  return true;
}

async function deleteReportOrderRecordFromIDB(id) {
  if (!db || !dbAvailable) return false;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
    const store = tx.objectStore(REPORT_STORE_NAME);
    const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
  });
  if (!record) return false;
  await moveToRecycleBin(record, 'report');
  await new Promise((resolve) => {
    const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
    const store = tx.objectStore(REPORT_STORE_NAME);
    const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false);
  });
  return true;
}

async function deleteComboOrderRecordFromIDB(id) {
  if (!db || !dbAvailable) return false;
  const record = await new Promise((resolve) => {
    const tx = db.transaction([COMBO_STORE_NAME], 'readonly');
    const store = tx.objectStore(COMBO_STORE_NAME);
    const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
  });
  if (!record) return false;
  await moveToRecycleBin(record, 'combo');
  await new Promise((resolve) => {
    const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
    const store = tx.objectStore(COMBO_STORE_NAME);
    const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false);
  });
  return true;
}

// ===== 批量删除函数 =====
async function batchDeleteOrderRecordFromIDB(ids) {
  if (!db || !dbAvailable) return false;
  try {
    for (const id of ids) {
      const record = await new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
      });
      if (record) {
        await moveToRecycleBin(record, 'order');
        await new Promise((resolve) => {
          const tx = db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false);
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
        const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
      });
      if (record) {
        await moveToRecycleBin(record, 'report');
        await new Promise((resolve) => {
          const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
          const store = tx.objectStore(REPORT_STORE_NAME);
          const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false);
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
        const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null);
      });
      if (record) {
        await moveToRecycleBin(record, 'combo');
        await new Promise((resolve) => {
          const tx = db.transaction([COMBO_STORE_NAME], 'readwrite');
          const store = tx.objectStore(COMBO_STORE_NAME);
          const req = store.delete(id); req.onsuccess = () => resolve(true); req.onerror = () => resolve(false);
        });
      }
    }
    return true;
  } catch (e) { console.error('批量删除连肖记录失败', e); return false; }
}

// ===== 清空函数 =====
async function clearAllOrderRecordsFromIDB(region = null) {
  return new Promise((resolve) => {
    if (!db) resolve(false);
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (region) {
      const allReq = store.getAll();
      allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); };
    } else {
      const req = store.clear(); req.onsuccess = () => resolve(true);
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
      allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); };
    } else {
      const req = store.clear(); req.onsuccess = () => resolve(true);
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
      allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); };
    } else {
      const req = store.clear(); req.onsuccess = () => resolve(true);
    }
  });
}

// ===== 回收站操作 =====
async function getRecycleBinRecords() {
  return new Promise((resolve) => {
    if (!db) resolve([]);
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readonly');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    const req = store.getAll(); req.onsuccess = (e) => resolve(e.target.result || []);
  });
}

async function moveToRecycleBin(record, type) {
  return new Promise((resolve) => {
    if (!db) { resolve(false); return; }
    const tx = db.transaction([RECYCLE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(RECYCLE_STORE_NAME);
    const recycleRecord = {
      id: record.id, type: type,
      content: record.content, user: record.user, date: record.date,
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
      allReq.onsuccess = () => { const records = allReq.result.filter(r => r.region === region); records.forEach(r => store.delete(r.id)); resolve(true); };
    } else {
      const req = store.clear(); req.onsuccess = () => resolve(true);
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
      req.onsuccess = () => { count++; if (count === ids.length) resolve(true); };
      req.onerror = () => { console.error('彻底删除失败', id); };
    });
  });
}