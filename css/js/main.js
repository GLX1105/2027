// ===== 事件绑定 =====
document.getElementById('rebateRate')?.addEventListener('input', generateRiskTable);
document.getElementById('multipleVal')?.addEventListener('input', generateRiskTable);
document.getElementById('reportRebateRate')?.addEventListener('input', generateReportTable);
document.getElementById('reportMultipleVal')?.addEventListener('input', generateReportTable);
document.getElementById('startZodiacSelect')?.addEventListener('change', changeStartZodiac);
document.getElementById('numAmountMin')?.addEventListener('input', updateTableFromRecords);
document.getElementById('numAmountMax')?.addEventListener('input', updateTableFromRecords);
document.getElementById('zodiacAmountMin')?.addEventListener('input', updateTableFromRecords);
document.getElementById('zodiacAmountMax')?.addEventListener('input', updateTableFromRecords);

// ===== 清空、粘贴、切换 =====
async function resetTable() {
  if ((await prompt("输入清空密码：", "")) !== PASSWORD) { await alert("密码错误"); return; }
  tableBetData = {}; userBetData = {}; reportBetData = {}; reportAmountData = {};
  numberCount = {}; zodiacCount = {}; numberAmountCount = {}; zodiacAmountCount = {};
  numberOrderTotal = 0; zodiacWeightedTotal = 0;
  await clearAllOrderRecordsFromIDB();
  await clearAllReportOrderRecordsFromIDB();
  localStorage.removeItem('customDataConfigObj');
  location.reload();
}

function clearAllInput() {
  const si = document.querySelector('.source-order-input');
  if (si) si.value = '';
  const re = document.getElementById('orderResult');
  if (re) re.value = '';
  updateOrderTotalDisplay();
}

async function pasteOrder() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) { const si = document.querySelector('.source-order-input'); if (si) { si.value = text; convertOrderText(); } }
  } catch (err) { showToast('无法访问剪贴板'); }
}

function switchRiskReport() {
  const val = document.getElementById('riskReportSwitcher').value;
  if (val === 'total') {
    document.getElementById('riskSection').style.display = '';
    document.getElementById('reportSection').style.display = 'none';
    document.getElementById('viewUserSelect').style.display = 'none';
    generateRiskTable();
  } else if (val === 'user') {
    document.getElementById('riskSection').style.display = '';
    document.getElementById('reportSection').style.display = 'none';
    document.getElementById('viewUserSelect').style.display = 'inline-block';
    generateRiskTable();
  } else if (val === 'report') {
    document.getElementById('riskSection').style.display = 'none';
    document.getElementById('reportSection').style.display = '';
    generateReportTable();
  }
}

async function changeStartZodiac() {
  const select = document.getElementById('startZodiacSelect');
  const newZodiac = select.value;
  const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马';
  if (newZodiac === savedZodiac) return;
  const inputPwd = await prompt("请输入本年生肖切换密码：", "");
  if (inputPwd !== YEAR_ZODIAC_PASSWORD) { await alert("密码错误"); select.value = savedZodiac; return; }
  localStorage.setItem('selectedStartZodiac', newZodiac);
  currentZodiacMap = buildZodiacMap(newZodiac);
  refreshAll();
}

// ===== 导出导入 =====
async function exportData() {
  try {
    const orders = await getOrderRecords();
    const reports = await getReportOrderRecords();
    const config = localStorage.getItem('customDataConfigObj');
    const presets = localStorage.getItem('replacePresets');
    const aliases = localStorage.getItem('categoryAliases');
    const prefixes = localStorage.getItem('customPrefixes');
    const suffixes = localStorage.getItem('customSuffixes');
    const amountSuffixes = localStorage.getItem('customAmountSuffixes');
    const data = { orders, reports, config, presets, aliases, prefixes, suffixes, amountSuffixes, exportTime: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `港澳识别数据_${getTodayCST()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) { showToast('导出失败'); }
}

async function importData() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.style.display = 'none';
  document.body.appendChild(inp);
  inp.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) { document.body.removeChild(inp); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.orders || !data.reports) { showToast('无效格式'); document.body.removeChild(inp); return; }
        const eo = await getOrderRecords();
        const er = await getReportOrderRecords();
        let so = 0, no = 0;
        for (const r of data.orders) { if (eo.find(o => o.timestamp === r.timestamp && o.content === r.content && o.user === r.user)) so++; else no++; }
        let sr = 0, nr = 0;
        for (const r of data.reports) { if (er.find(o => o.timestamp === r.timestamp && o.content === r.content && o.user === r.user)) sr++; else nr++; }
        const tn = no + nr;
        if (tn === 0) { showToast(`没有新记录。\n当前已有下单${eo.length}条，上报${er.length}条。`); document.body.removeChild(inp); return; }
        const msg = `当前已有：\n下单${eo.length}条\n上报${er.length}条\n\n导入文件：\n下单${data.orders.length}条（重复${so}，新增${no}）\n上报${data.reports.length}条（重复${sr}，新增${nr}）\n\n是否导入新增${tn}条？`;
        const cf = await confirm(msg);
        if (!cf) { document.body.removeChild(inp); return; }
        for (const r of data.orders) { if (!eo.find(o => o.timestamp === r.timestamp && o.content === r.content && o.user === r.user)) await saveOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0); }
        for (const r of data.reports) { if (!er.find(o => o.timestamp === r.timestamp && o.content === r.content && o.user === r.user)) await saveReportOrderRecordToIDB(r.content, r.user, r.date, r.totalAmount || 0); }
        if (data.config) localStorage.setItem('customDataConfigObj', data.config);
        if (data.presets) localStorage.setItem('replacePresets', data.presets);
        if (data.aliases) localStorage.setItem('categoryAliases', data.aliases);
        if (data.prefixes) localStorage.setItem('customPrefixes', data.prefixes);
        if (data.suffixes) localStorage.setItem('customSuffixes', data.suffixes);
        if (data.amountSuffixes) localStorage.setItem('customAmountSuffixes', data.amountSuffixes);
        await updateTableFromRecords();
        calculateStorageUsage();
        showToast(`成功导入${tn}条新记录。`);
        document.body.removeChild(inp);
      } catch (err) { showToast('导入失败'); document.body.removeChild(inp); }
    };
    reader.onerror = () => { showToast('读取失败'); document.body.removeChild(inp); };
    reader.readAsText(file);
  };
  inp.addEventListener('cancel', () => { document.body.removeChild(inp); });
  inp.click();
}

// ===== 启动流程 =====
window.onload = async () => {
  await initIndexedDB();
  initDataConfig();
  const today = getTodayCST();
  const filterDateEl = document.getElementById('filterDate');
  if (filterDateEl) filterDateEl.value = today;
  const savedZodiac = localStorage.getItem('selectedStartZodiac') || '马';
  document.getElementById('startZodiacSelect').value = savedZodiac;
  currentZodiacMap = buildZodiacMap(savedZodiac);
  updateSelects();
  renderAllTablesPlaceholder();

  window._systemReady = async () => {
    await updateTableFromRecords();
    calculateStorageUsage();
    updateOrderTotalDisplay();
    updateReportAmountTotal();
  };

  if (!checkCurrentAccess()) {
    showLoginScreen();
  } else {
    if (isAdmin()) document.getElementById('cardMgrBtn').style.display = '';
    await window._systemReady();
  }
};
