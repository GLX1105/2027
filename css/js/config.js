// ===== 系统分类定义 =====
const SYSTEM_CATEGORIES = [
  { id: 'shu', label: '鼠', group: '十二生肖' }, { id: 'niu', label: '牛', group: '十二生肖' }, { id: 'hu', label: '虎', group: '十二生肖' }, { id: 'tu2', label: '兔', group: '十二生肖' }, { id: 'long', label: '龙', group: '十二生肖' }, { id: 'she', label: '蛇', group: '十二生肖' },
  { id: 'ma', label: '马', group: '十二生肖' }, { id: 'yang', label: '羊', group: '十二生肖' }, { id: 'hou', label: '猴', group: '十二生肖' }, { id: 'ji', label: '鸡', group: '十二生肖' }, { id: 'gou', label: '狗', group: '十二生肖' }, { id: 'zhu', label: '猪', group: '十二生肖' },
  { id: 'sx_jiaqin', label: '家禽', group: '生肖属性' }, { id: 'sx_yeshou', label: '野兽', group: '生肖属性' }, { id: 'sx_jimei', label: '吉美', group: '生肖属性' }, { id: 'sx_xiongchou', label: '凶丑', group: '生肖属性' },
  { id: 'sx_yinxing', label: '阴性', group: '生肖属性' }, { id: 'sx_yangxing', label: '阳性', group: '生肖属性' }, { id: 'sx_tianxiao', label: '天肖', group: '生肖属性' }, { id: 'sx_dixiao', label: '地肖', group: '生肖属性' },
  { id: 'sx_danbi', label: '单笔', group: '生肖属性' }, { id: 'sx_shuangbi', label: '双笔', group: '生肖属性' }, { id: 'sx_baibian', label: '白边', group: '生肖属性' },
  { id: 'jin', label: '金', group: '五行' }, { id: 'mu', label: '木', group: '五行' }, { id: 'shui', label: '水', group: '五行' }, { id: 'huo', label: '火', group: '五行' }, { id: 'tu', label: '土', group: '五行' },
  { id: 'hongbo', label: '红波', group: '波色' }, { id: 'lanbo', label: '蓝波', group: '波色' }, { id: 'lvbo', label: '绿波', group: '波色' },
  { id: 'hongshuang', label: '红双', group: '半波' }, { id: 'hongdan', label: '红单', group: '半波' }, { id: 'lanshuang', label: '蓝双', group: '半波' }, { id: 'landan', label: '蓝单', group: '半波' }, { id: 'lvshuang', label: '绿双', group: '半波' }, { id: 'lvdan', label: '绿单', group: '半波' },
  { id: 'danshu', label: '单数', group: '单双属性' }, { id: 'shuangshu', label: '双数', group: '单双属性' },
  ...[...Array(10).keys()].map(i => ({ id: `ws_${i}`, label: `${i}尾`, group: '尾数' })),
  { id: 'dadan', label: '大单', group: '大小单双' }, { id: 'dashuang', label: '大双', group: '大小单双' }, { id: 'xiaodan', label: '小单', group: '大小单双' }, { id: 'xiaoshuang', label: '小双', group: '大小单双' },
  { id: 'dx_xiao', label: '小', group: '大小' }, { id: 'dx_da', label: '大', group: '大小' },
  ...[...Array(13).keys()].map(i => ({ id: `hs_${(i+1).toString().padStart(2,'0')}`, label: `${i+1}合`, group: '合数' })),
  ...[...Array(5).keys()].map(i => ({ id: `ts_${i}`, label: `${i}头`, group: '头数' })),
  ...[...Array(5).keys()].map(i => ({ id: `ms_${i+1}`, label: `${i+1}门`, group: '门数' })),
  ...[...Array(7).keys()].map(i => ({ id: `dw_${i+1}`, label: `${i+1}段`, group: '段位' })),
  { id: 'hdx_hexiao', label: '合小', group: '合大&合小' }, { id: 'hdx_heda', label: '合大', group: '合大&合小' },
  { id: 'wdx_weixiao', label: '尾小', group: '尾大&尾小' }, { id: 'wdx_weida', label: '尾大', group: '尾大&尾小' },
  { id: 'bds_xiaodan', label: '小单', group: '半单双' }, { id: 'bds_xiaoshuang', label: '小双', group: '半单双' }, { id: 'bds_dadan', label: '大单', group: '半单双' }, { id: 'bds_dashuang', label: '大双', group: '半单双' },
  ...[...Array(10).keys()].map(i => ({ id: `hw_${i}`, label: `${i}合尾`, group: '合尾' })),
  { id: 'hsd_hsd', label: '合数单', group: '合数单&双' }, { id: 'hsd_hss', label: '合数双', group: '合数单&双' },
  ...[...Array(5).keys()].map(i => ([{ id: `tds_${i}dan`, label: `${i}头单`, group: '头数单与双' }, { id: `tds_${i}shuang`, label: `${i}头双`, group: '头数单与双' }])).flat()
];

// ===== 默认配置 =====
const DEFAULT_CONFIG = {
  jin:'04 05 12 13 26 27 34 35 42 43', mu:'08 09 16 17 24 25 38 39 46 47', shui:'01 14 15 22 23 30 31 44 45', huo:'02 03 10 11 18 19 32 33 40 41 48 49', tu:'06 07 20 21 28 29 36 37',
  shu:'07 19 31 43', niu:'06 18 30 42', hu:'05 17 29 41', tu2:'04 16 28 40', long:'03 15 27 39', she:'02 14 26 38', ma:'01 13 25 37 49', yang:'12 24 36 48', hou:'11 23 35 47', ji:'10 22 34 46', gou:'09 21 33 45', zhu:'08 20 32 44',
  sx_jiaqin:'牛 马 羊 鸡 狗 猪', sx_yeshou:'鼠 虎 兔 龙 蛇 猴', sx_jimei:'兔 龙 蛇 马 羊 鸡', sx_xiongchou:'鼠 牛 虎 猴 狗 猪', sx_yinxing:'鼠 龙 蛇 马 狗 猪', sx_yangxing:'牛 虎 兔 羊 猴 鸡',
  sx_tianxiao:'兔 马 猴 猪 牛 龙', sx_dixiao:'蛇 羊 鸡 狗 鼠 虎', sx_danbi:'鼠 龙 马 蛇 鸡 猪', sx_shuangbi:'虎 猴 狗 兔 羊 牛', sx_baibian:'鼠 牛 虎 鸡 狗 猪',
  hongbo:'01 02 07 08 12 13 18 19 23 24 29 30 34 35 40 45 46', lanbo:'03 04 09 10 14 15 20 25 26 31 36 37 41 42 47 48', lvbo:'05 06 11 16 17 21 22 27 28 32 33 38 39 43 44 49',
  hongshuang:'02 08 12 18 24 30 34 40 46', hongdan:'01 07 13 19 23 29 35 45', lanshuang:'04 10 14 20 26 36 42 48', landan:'03 09 15 25 31 37 41 47', lvshuang:'06 16 22 28 32 38 44', lvdan:'05 11 17 21 27 33 39 43 49',
  danshu:'01 03 05 07 09 11 13 15 17 19 21 23 25 27 29 31 33 35 37 39 41 43 45 47 49', shuangshu:'02 04 06 08 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48',
  ws_0:'10 20 30 40', ws_1:'01 11 21 31 41', ws_2:'02 12 22 32 42', ws_3:'03 13 23 33 43', ws_4:'04 14 24 34 44', ws_5:'05 15 25 35 45', ws_6:'06 16 26 36 46', ws_7:'07 17 27 37 47', ws_8:'08 18 28 38 48', ws_9:'09 19 29 39 49',
  dadan:'25 27 29 31 33 35 37 39 41 43 45 47 49', dashuang:'26 28 30 32 34 36 38 40 42 44 46 48', xiaodan:'01 03 05 07 09 11 13 15 17 19 21 23', xiaoshuang:'02 04 06 08 10 12 14 16 18 20 22 24',
  dx_xiao:'01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24', dx_da:'25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49',
  hs_01:'01 10', hs_02:'02 11 20', hs_03:'03 12 21 30', hs_04:'04 13 22 31 40', hs_05:'05 14 23 32 41', hs_06:'06 15 24 33 42', hs_07:'07 16 25 34 43', hs_08:'08 17 26 35 44', hs_09:'09 18 27 36 45',
  hs_10:'19 28 37 46', hs_11:'29 38 47', hs_12:'39 48', hs_13:'49',
  ts_0:'01 02 03 04 05 06 07 08 09', ts_1:'10 11 12 13 14 15 16 17 18 19', ts_2:'20 21 22 23 24 25 26 27 28 29', ts_3:'30 31 32 33 34 35 36 37 38 39', ts_4:'40 41 42 43 44 45 46 47 48 49',
  ms_1:'01 02 03 04 05 06 07 08 09', ms_2:'10 11 12 13 14 15 16 17 18', ms_3:'19 20 21 22 23 24 25 26 27', ms_4:'28 29 30 31 32 33 34 35 36 37', ms_5:'38 39 40 41 42 43 44 45 46 47 48 49',
  dw_1:'01 02 03 04 05 06 07', dw_2:'08 09 10 11 12 13 14', dw_3:'15 16 17 18 19 20 21', dw_4:'22 23 24 25 26 27 28', dw_5:'29 30 31 32 33 34 35', dw_6:'36 37 38 39 40 41 42', dw_7:'43 44 45 46 47 48 49',
  hdx_hexiao:'01 02 03 04 05 06 10 11 12 13 14 15 20 21 22 23 24 30 31 32 33 40 41 42', hdx_heda:'07 08 09 16 17 18 19 25 26 27 28 29 34 35 36 37 38 39 43 44 45 46 47 48 49',
  wdx_weixiao:'01 02 03 04 10 11 12 13 14 20 21 22 23 24 30 31 32 33 34 40 41 42 43 44', wdx_weida:'05 06 07 08 09 15 16 17 18 19 25 26 27 28 29 35 36 37 38 39 45 46 47 48 49',
  bds_xiaodan:'01 03 05 07 09 11 13 15 17 19 21 23', bds_xiaoshuang:'02 04 06 08 10 12 14 16 18 20 22 24', bds_dadan:'25 27 29 31 33 35 37 39 41 43 45 47 49', bds_dashuang:'26 28 30 32 34 36 38 40 42 44 46 48',
  hw_0:'19 28 37 46', hw_1:'01 10 29 38 47', hw_2:'02 11 20 39 48', hw_3:'03 12 21 30 49', hw_4:'04 13 22 31 40', hw_5:'05 14 23 32 41', hw_6:'06 15 24 33 42', hw_7:'07 16 25 34 43', hw_8:'08 17 26 35 44', hw_9:'09 18 27 36 45',
  hsd_hsd:'01 03 05 07 09 10 12 14 16 18 21 23 25 27 29 30 32 34 36 38 41 43 45 47 49', hsd_hss:'02 04 06 08 11 13 15 17 19 20 22 24 26 28 31 33 35 37 39 40 42 44 46 48',
  tds_0dan:'01 03 05 07 09', tds_0shuang:'02 04 06 08', tds_1dan:'11 13 15 17 19', tds_1shuang:'10 12 14 16 18', tds_2dan:'21 23 25 27 29', tds_2shuang:'20 22 24 26 28',
  tds_3dan:'31 33 35 37 39', tds_3shuang:'30 32 34 36 38', tds_4dan:'41 43 45 47 49', tds_4shuang:'40 42 44 46 48'
};

// ===== 读取所有配置 =====
function getAllConfigData() {
  const configData = {
    zodiac:{}, shengxiaoAttr:{}, wuxing:{}, bose:{}, banbo:{}, danshuang:{}, weishu:{},
    daxiaodanshuang:{}, daxiao:{}, heshu:{}, toushu:{}, menshu:{}, duanwei:{},
    hedahexiao:{}, weidaweixiao:{}, hewei:{}, heshudanshuang:{}, toushuDanshuang:{}
  };
  const ids = {
    zodiac: { shu:'鼠', niu:'牛', hu:'虎', tu2:'兔', long:'龙', she:'蛇', ma:'马', yang:'羊', hou:'猴', ji:'鸡', gou:'狗', zhu:'猪' },
    shengxiaoAttr: { sx_jiaqin:'家禽', sx_yeshou:'野兽', sx_jimei:'吉美', sx_xiongchou:'凶丑', sx_yinxing:'阴性', sx_yangxing:'阳性', sx_tianxiao:'天肖', sx_dixiao:'地肖', sx_danbi:'单笔', sx_shuangbi:'双笔', sx_baibian:'白边' },
    wuxing: { jin:'金', mu:'木', shui:'水', huo:'火', tu:'土' },
    bose: { hongbo:'红波', lanbo:'蓝波', lvbo:'绿波' },
    banbo: { hongshuang:'红双', hongdan:'红单', lanshuang:'蓝双', landan:'蓝单', lvshuang:'绿双', lvdan:'绿单' },
    danshuang: { danshu:'单数', shuangshu:'双数' },
    weishu: {}, daxiaodanshuang: { dadan:'大单', dashuang:'大双', xiaodan:'小单', xiaoshuang:'小双' },
    daxiao: { dx_xiao:'小', dx_da:'大' },
    heshu: {}, toushu: {}, menshu: {}, duanwei: {}, hedahexiao: { hdx_hexiao:'合小', hdx_heda:'合大' },
    weidaweixiao: { wdx_weixiao:'尾小', wdx_weida:'尾大' },
    hewei: {}, heshudanshuang: { hsd_hsd:'合数单', hsd_hss:'合数双' },
    toushuDanshuang: {}
  };
  for (let i = 0; i <= 9; i++) ids.weishu[`ws_${i}`] = `${i}尾`;
  for (let i = 1; i <= 13; i++) ids.heshu[`hs_${i.toString().padStart(2,'0')}`] = `${i}合`;
  for (let i = 0; i <= 4; i++) ids.toushu[`ts_${i}`] = `${i}头`;
  for (let i = 1; i <= 5; i++) ids.menshu[`ms_${i}`] = `${i}门`;
  for (let i = 1; i <= 7; i++) ids.duanwei[`dw_${i}`] = `${i}段`;
  for (let i = 0; i <= 9; i++) ids.hewei[`hw_${i}`] = `${i}合尾`;
  for (let i = 0; i <= 4; i++) {
    ids.toushuDanshuang[`tds_${i}dan`] = `${i}头单`;
    ids.toushuDanshuang[`tds_${i}shuang`] = `${i}头双`;
  }
  for (const [group, groupIds] of Object.entries(ids)) {
    for (const [id, label] of Object.entries(groupIds)) {
      const el = document.getElementById(`config_${id}`);
      if (!el) continue;
      const val = el.value.trim();
      if (group === 'zodiac' || group === 'wuxing' || group === 'bose' || group === 'banbo' ||
          group === 'danshuang' || group === 'weishu' || group === 'daxiaodanshuang' ||
          group === 'daxiao' || group === 'heshu' || group === 'toushu' || group === 'menshu' ||
          group === 'duanwei' || group === 'hedahexiao' || group === 'weidaweixiao' ||
          group === 'hewei' || group === 'heshudanshuang' || group === 'toushuDanshuang') {
        configData[group][label] = val.split(/\s+/).filter(n => /^\d+$/.test(n));
      } else if (group === 'shengxiaoAttr') {
        configData[group][label] = val.split(/\s+/);
      }
    }
  }
  const customCats = loadCustomCategories();
  customCats.forEach((cat, idx) => {
    const el = document.getElementById(`config_custom_${idx}`);
    if (el) {
      const val = el.value.trim();
      configData.weishu[cat.label] = val.split(/\s+/).filter(n => /^\d+$/.test(n));
    }
  });
  return configData;
}

function lockAllInputs() { document.querySelectorAll('.config-input').forEach(el => el.disabled = true); }
function unlockAllInputs() { document.querySelectorAll('.config-input').forEach(el => el.disabled = false); }
function initDataConfig() { lockAllInputs(); renderCustomConfigContainer(); }

async function enableEditConfig() {
  if ((await prompt("输入修改密码：")) === PASSWORD) {
    unlockAllInputs();
    showToast("解锁成功");
  } else {
    showToast("密码错误");
  }
}

async function saveDataConfig() {
  if ((await prompt("输入保存密码：")) !== PASSWORD) { showToast("密码错误"); return; }
  const newConfig = {};
  document.querySelectorAll('.config-input').forEach(el => {
    const id = el.id.replace('config_', '');
    if (!id.startsWith('custom_')) newConfig[id] = el.value.trim();
  });
  localStorage.setItem('customDataConfigObj', JSON.stringify(newConfig));
  const cats = loadCustomCategories();
  cats.forEach((c, i) => {
    const el = document.getElementById(`config_custom_${i}`);
    if (el) c.value = el.value.trim();
  });
  saveCustomCategories(cats);
  lockAllInputs();
  showToast("保存成功");
}

async function resetDataConfig() {
  if ((await prompt("输入密码：")) !== PASSWORD) { showToast("密码错误"); return; }
  localStorage.removeItem('customDataConfigObj');
  location.reload();
}

// ===== 自定义分类管理 =====
function loadCustomCategories() { try { return JSON.parse(localStorage.getItem('customConfigCategories') || '[]'); } catch(e) { return []; } }
function saveCustomCategories(cats) { localStorage.setItem('customConfigCategories', JSON.stringify(cats)); }

function renderCustomConfigContainer() {
  const container = document.getElementById('customConfigContainer');
  if (!container) return;
  const cats = loadCustomCategories();
  if (cats.length === 0) { container.innerHTML = ''; return; }
  let html = `<div class="config-section"><div class="config-section-title">自定义分类</div>`;
  cats.forEach((cat, idx) => {
    html += `<div class="config-item"><div class="config-label">${cat.label}</div><div class="config-colon">：</div><input type="text" class="config-input" id="config_custom_${idx}" value="${cat.value || ''}"><button onclick="deleteCustomCategoryByIndex(${idx})" style="margin-left:5px;background:#dc3545;color:#fff;border:none;border-radius:3px;padding:2px 5px;">删</button></div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

async function addCustomCategory() {
  const label = await prompt('请输入新分类名称（如：大尾）');
  if (!label) return;
  const value = await prompt(`请输入“${label}”对应的号码（空格分隔）`);
  if (value === null) return;
  const cats = loadCustomCategories();
  cats.push({ label, value: value.trim() });
  saveCustomCategories(cats);
  renderCustomConfigContainer();
  showToast('自定义分类已添加，请点击“保存”按钮存储配置');
}

async function deleteCustomCategory() {
  const cats = loadCustomCategories();
  if (cats.length === 0) { showToast('没有可删除的自定义分类'); return; }
  const labels = cats.map((c,i) => `${i+1}. ${c.label}`).join('\n');
  const idxStr = await prompt(`请输入要删除的分类编号：\n${labels}`);
  if (!idxStr) return;
  const idx = parseInt(idxStr) - 1;
  if (isNaN(idx) || idx < 0 || idx >= cats.length) { showToast('无效编号'); return; }
  cats.splice(idx, 1);
  saveCustomCategories(cats);
  renderCustomConfigContainer();
  showToast('自定义分类已删除，请点击“保存”按钮使更改生效');
}

function deleteCustomCategoryByIndex(index) {
  const cats = loadCustomCategories();
  cats.splice(index, 1);
  saveCustomCategories(cats);
  renderCustomConfigContainer();
}
