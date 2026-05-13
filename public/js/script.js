let orderRecords = [];
let reportRecords = [];
let users = ["默认用户"];
let currentUser = "默认用户";
let prefixList = [], suffixList = [], amountSuffixList = [];
let categoryAliases = {};
let reportCap = 0;

function initPage() {
  loadData();
  renderUserSelect();
  setTodayDate();
  updateStorageInfo();
  bindEvents();
}

function loadData() {
  orderRecords = JSON.parse(localStorage.getItem("hk_orders") || "[]");
  reportRecords = JSON.parse(localStorage.getItem("hk_reports") || "[]");
  users = JSON.parse(localStorage.getItem("hk_users") || '["默认用户"]');
  prefixList = JSON.parse(localStorage.getItem("hk_prefix") || "[]");
  suffixList = JSON.parse(localStorage.getItem("hk_suffix") || "[]");
  amountSuffixList = JSON.parse(localStorage.getItem("hk_amount_suffix") || "[]");
  categoryAliases = JSON.parse(localStorage.getItem("hk_category_aliases") || "{}");
  currentUser = localStorage.getItem("hk_current_user") || "默认用户";
}

function saveData() {
  localStorage.setItem("hk_orders", JSON.stringify(orderRecords));
  localStorage.setItem("hk_reports", JSON.stringify(reportRecords));
  localStorage.setItem("hk_users", JSON.stringify(users));
  localStorage.setItem("hk_prefix", JSON.stringify(prefixList));
  localStorage.setItem("hk_suffix", JSON.stringify(suffixList));
  localStorage.setItem("hk_amount_suffix", JSON.stringify(amountSuffixList));
  localStorage.setItem("hk_category_aliases", JSON.stringify(categoryAliases));
  localStorage.setItem("hk_current_user", currentUser);
}

function setTodayDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("orderDate").value = today;
  document.getElementById("filterDate").value = today;
}

function renderUserSelect() {
  const sel = document.getElementById("orderUserSelect");
  const viewSel = document.getElementById("viewUserSelect");
  sel.innerHTML = "";
  viewSel.innerHTML = "";
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    sel.appendChild(opt);

    const vOpt = document.createElement("option");
    vOpt.value = u;
    vOpt.textContent = u;
    viewSel.appendChild(vOpt);
  });
  sel.value = currentUser;
}

function convertOrderText() {
  const val = document.querySelector(".source-order-input").value.trim();
  if (!val) {
    document.getElementById("orderResult").value = "";
    return;
  }
  const lines = val.split("\n").map(l => l.trim()).filter(Boolean);
  const res = [];
  lines.forEach(line => {
    let num = line.match(/\d+/);
    let amt = line.match(/\d+$/);
    if (num && amt) res.push(`${num[0]} ${amt[0]}`);
  });
  document.getElementById("orderResult").value = res.join("\n");
  updateStats();
}

function updateStats() {
  const text = document.getElementById("orderResult").value;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let numMap = {}, zodMap = {}, totalAmt = 0;
  lines.forEach(line => {
    let [n, a] = line.split(/\s+/).filter(Boolean);
    if (!n || !a) return;
    n = n.padStart(2, "0");
    a = Number(a);
    totalAmt += a;
    numMap[n] = (numMap[n] || 0) + a;
    const zod = getZodiacByNumber(n);
    if (zod) zodMap[zod] = (zodMap[zod] || 0) + a;
  });
  renderFreqTable("numberFreqTable", numMap);
  renderFreqTable("zodiacFreqTable", zodMap);
  document.getElementById("orderTotalAmount").textContent = totalAmt;
  document.getElementById("orderTotalAmountBox").style.display = "inline-flex";
}

function getZodiacByNumber(n) {
  for (const [z, ns] of Object.entries(zodiacNumbers)) {
    if (ns.split(/\s+/).includes(n)) return z;
  }
  return null;
}

function renderFreqTable(id, map) {
  const t = document.getElementById(id);
  let html = "";
  Object.entries(map).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    html += `<tr><td>${k}</td><td>${v}</td></tr>`;
  });
  t.innerHTML = html;
}

function saveOrder() {
  const user = document.getElementById("orderUserSelect").value;
  const date = document.getElementById("orderDate").value;
  const content = document.getElementById("orderResult").value;
  if (!content) return alert("无订单内容");
  orderRecords.push({ user, date, content, time: new Date().toISOString() });
  saveData();
  updateTableFromRecords();
  alert("保存成功");
}

function saveReportOrder() {
  const user = document.getElementById("orderUserSelect").value;
  const date = document.getElementById("orderDate").value;
  const content = document.getElementById("orderResult").value;
  if (!content) return alert("无上报内容");
  reportRecords.push({ user, date, content, time: new Date().toISOString() });
  saveData();
  alert("上报成功");
}

function updateTableFromRecords() {
  generateRiskTable();
}

function generateRiskTable() {
  const date = document.getElementById("filterDate").value;
  const user = document.getElementById("viewUserSelect").value;
  let list = orderRecords.filter(x => x.date === date);
  if (user && user !== "all") list = list.filter(x => x.user === user);
  let map = {};
  list.forEach(x => {
    x.content.split("\n").forEach(line => {
      let [n, a] = line.split(/\s+/).filter(Boolean);
      if (!n || !a) return;
      n = n.padStart(2, "0");
      map[n] = (map[n] || 0) + Number(a);
    });
  });
  renderRiskTable(map);
}

function renderRiskTable(map) {
  const mul = Number(document.getElementById("multipleVal").value) || 47;
  const rebate = Number(document.getElementById("rebateRate").value) || 4;
  let total = 0;
  const arr = Object.entries(map).map(([n, a]) => {
    total += a;
    return { n, a, r: a * mul };
  }).sort((a, b) => b.r - a.r);
  const body = document.getElementById("tableBody");
  let html = "";
  arr.forEach((it, i) => {
    html += `<tr data-num="${it.n}"><td>${it.n}</td><td>${it.a}</td><td>${it.r}</td><td>${currentUser}</td><td>${i + 1}</td></tr>`;
  });
  body.innerHTML = html;
  document.getElementById("totalBet").textContent = total;
  document.getElementById("totalRebate").textContent = (total * rebate / 100).toFixed(2);
}

function clearAllInput() {
  document.querySelector(".source-order-input").value = "";
  document.getElementById("orderResult").value = "";
  updateStats();
}

function resetTable() {
  if (!confirm("确定清空所有订单记录？")) return;
  orderRecords = [];
  reportRecords = [];
  saveData();
  updateTableFromRecords();
  alert("已清空");
}

function exportData() {
  const data = { orders: orderRecords, reports: reportRecords, users, prefixList, suffixList, amountSuffixList, categoryAliases };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `hk_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      const d = JSON.parse(e.target.result);
      orderRecords = d.orders || [];
      reportRecords = d.reports || [];
      users = d.users || ["默认用户"];
      prefixList = d.prefixList || [];
      suffixList = d.suffixList || [];
      amountSuffixList = d.amountSuffixList || [];
      categoryAliases = d.categoryAliases || {};
      saveData();
      renderUserSelect();
      updateTableFromRecords();
      alert("导入成功");
    };
    r.readAsText(f);
  };
  input.click();
}

function showDatabase() {
  document.getElementById("databaseModal").style.display = "block";
}
function hideDatabase() {
  document.getElementById("databaseModal").style.display = "none";
}

function screenshotTable(id) {
  html2canvas(document.getElementById(id)).then(canvas => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${id}_${new Date().getTime()}.png`;
    a.click();
  });
}

function updateStorageInfo() {
  const used = JSON.stringify(localStorage).length / 1024 / 1024;
  document.getElementById("usedSpace").textContent = used.toFixed(2) + " MB";
  document.getElementById("orderCount").textContent = orderRecords.length + reportRecords.length;
}

function bindEvents() {
  document.getElementById("orderUserSelect").addEventListener("change", e => {
    currentUser = e.target.value;
    localStorage.setItem("hk_current_user", currentUser);
  });
}

function switchRiskReport() {
  const v = document.getElementById("riskReportSwitcher").value;
  const userSel = document.getElementById("viewUserSelect");
  const rSection = document.getElementById("reportSection");
  const tSection = document.getElementById("riskSection");
  if (v === "user") {
    userSel.style.display = "inline-block";
    rSection.style.display = "none";
    tSection.style.display = "block";
  } else if (v === "report") {
    userSel.style.display = "none";
    rSection.style.display = "block";
    tSection.style.display = "none";
  } else {
    userSel.style.display = "none";
    rSection.style.display = "none";
    tSection.style.display = "block";
  }
}

function pasteOrder() {
  navigator.clipboard.readText().then(t => {
    document.querySelector(".source-order-input").value = t;
    convertOrderText();
  });
}

function logout() {
  if (confirm("确定退出登录？")) location.reload();
}

function quickAddWithAmount(cat) {
  alert("快捷添加：" + cat);
}

window.onload = initPage;
