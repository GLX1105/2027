// ===== odds.js - 赔率设置窗口、默认赔率管理、读写操作 =====

function showOddsWin() {
  if (document.getElementById('oddsWin')) return;
  const savedOdds = getOddsData();
  const defaults = {
    '特码':{odds:'47',rebate:'4'},
    '特肖':{odds:'11',rebate:'4'},
    '特肖本年肖':{odds:'10',rebate:'4'},
    '平特肖':{odds:'2',rebate:'4'},'平特肖带主肖':{odds:'1.8',rebate:'4'},'二连肖':{odds:'4',rebate:'4'},'二连肖带主肖':{odds:'3.5',rebate:'4'},
    '三连肖':{odds:'10',rebate:'4'},'三连肖带主肖':{odds:'9',rebate:'4'},'四连肖':{odds:'30',rebate:'4'},'四连肖带主肖':{odds:'25',rebate:'4'},
    '五连肖':{odds:'100',rebate:'4'},'五连肖带主肖':{odds:'90',rebate:'4'},'平特尾':{odds:'1.8',rebate:'4'},'平特尾零尾':{odds:'2',rebate:'4'},
    '二连尾':{odds:'3',rebate:'4'},'二连尾零尾':{odds:'3.5',rebate:'4'},'三连尾':{odds:'6',rebate:'4'},'三连尾零尾':{odds:'6.5',rebate:'4'},
    '四连尾':{odds:'14',rebate:'4'},'四连尾零尾':{odds:'15',rebate:'4'},'五连尾':{odds:'28',rebate:'4'},'五连尾零尾':{odds:'30',rebate:'4'},
    '五不中':{odds:'2',rebate:'4'},'六不中':{odds:'2.5',rebate:'4'},'七不中':{odds:'3',rebate:'4'},'八不中':{odds:'3.5',rebate:'4'},
    '九不中':{odds:'4',rebate:'4'},'十不中':{odds:'5',rebate:'4'},'十一不中':{odds:'6',rebate:'4'},'十二不中':{odds:'7',rebate:'4'},
    '二中二':{odds:'60',rebate:'4'},'三中三':{odds:'600',rebate:'4'},'平码':{odds:'7',rebate:'4'},
    '特碰':{odds:'120',rebate:'4'},
    '包红波':{odds:'2.6',rebate:'4'},'包蓝波':{odds:'2.7',rebate:'4'},'包绿波':{odds:'2.7',rebate:'4'},
    '包红单':{odds:'5',rebate:'4'},'包红双':{odds:'4.7',rebate:'4'},'包红大':{odds:'6',rebate:'4'},'包红小':{odds:'4',rebate:'4'},
    '包蓝单':{odds:'5',rebate:'4'},'包蓝双':{odds:'5',rebate:'4'},'包蓝大':{odds:'4.7',rebate:'4'},'包蓝小':{odds:'6',rebate:'4'},
    '包绿单':{odds:'5',rebate:'4'},'包绿双':{odds:'5',rebate:'4'},'包绿大':{odds:'5',rebate:'4'},'包绿小':{odds:'6',rebate:'4'},
    '包单':{odds:'1.8',rebate:'4'},'包双':{odds:'1.8',rebate:'4'},'包大':{odds:'1.8',rebate:'4'},'包小':{odds:'1.8',rebate:'4'},
    '包家禽':{odds:'1.8',rebate:'4'},'包野兽':{odds:'1.8',rebate:'4'}
  };
  const types = Object.keys(defaults);
  let rows = '';
  types.forEach(t => {
    const saved = savedOdds[t] || {};
    const oddsVal = saved.odds || defaults[t].odds;
    const rebateVal = saved.rebate || defaults[t].rebate;
    rows += `<tr><td style="text-align:center;padding:3px;"><input type="text" class="odds-input" data-type="${t}" data-field="name" value="${t}" style="width:80px;text-align:center;border:none;background:transparent;outline:none;" disabled></td><td><input type="text" class="odds-input" data-type="${t}" data-field="odds" value="${oddsVal}" style="width:60px;text-align:center;border:none;background:transparent;outline:none;" disabled></td><td><input type="text" class="odds-input" data-type="${t}" data-field="rebate" value="${rebateVal}" style="width:60px;text-align:center;border:none;background:transparent;outline:none;" disabled></td></tr>`;
  });
  const win = document.createElement('div'); win.className = 'floating-window'; win.id = 'oddsWin';
  win.style.width = '550px'; win.style.height = '650px'; win.style.left = '50%'; win.style.top = '50%'; win.style.transform = 'translate(-50%, -50%)';
  win.innerHTML = `
    <div class="modal-header"><h3>赔率设置</h3><div class="window-controls"><button onclick="maximizeWindow('oddsWin')">🗖</button><button onclick="document.getElementById('oddsWin').remove()">×</button></div></div>
    <div class="modal-body" style="overflow-y:auto;">
      <table style="width:100%;"><thead><tr><th style="text-align:center;">玩法</th><th style="text-align:center;">赔率</th><th style="text-align:center;">反水%</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="modal-footer">
      <button class="btn" style="background:#f39c12;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="enableOddsEdit()">修改</button>
      <button class="btn" style="background:#28a745;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="saveOddsData()">保存</button>
      <button class="btn" style="background:#3498db;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="resetOddsToDefault()">恢复默认</button>
      <button class="btn" style="background:#6c757d;color:#fff;padding:4px 12px;font-size:12px;min-height:28px;" onclick="document.getElementById('oddsWin').remove()">关闭</button>
    </div>`;
  document.body.appendChild(win);
  makeWindowDraggable('oddsWin'); highestZ += 1; win.style.zIndex = highestZ;
}

function resetOddsToDefault() {
  const defaults = {
    '特码':{odds:'47',rebate:'4'},
    '特肖':{odds:'11',rebate:'4'},
    '特肖本年肖':{odds:'10',rebate:'4'},
    '平特肖':{odds:'2',rebate:'4'},'平特肖带主肖':{odds:'1.8',rebate:'4'},'二连肖':{odds:'4',rebate:'4'},'二连肖带主肖':{odds:'3.5',rebate:'4'},
    '三连肖':{odds:'10',rebate:'4'},'三连肖带主肖':{odds:'9',rebate:'4'},'四连肖':{odds:'30',rebate:'4'},'四连肖带主肖':{odds:'25',rebate:'4'},
    '五连肖':{odds:'100',rebate:'4'},'五连肖带主肖':{odds:'90',rebate:'4'},'平特尾':{odds:'1.8',rebate:'4'},'平特尾零尾':{odds:'2',rebate:'4'},
    '二连尾':{odds:'3',rebate:'4'},'二连尾零尾':{odds:'3.5',rebate:'4'},'三连尾':{odds:'6',rebate:'4'},'三连尾零尾':{odds:'6.5',rebate:'4'},
    '四连尾':{odds:'14',rebate:'4'},'四连尾零尾':{odds:'15',rebate:'4'},'五连尾':{odds:'28',rebate:'4'},'五连尾零尾':{odds:'30',rebate:'4'},
    '五不中':{odds:'2',rebate:'4'},'六不中':{odds:'2.5',rebate:'4'},'七不中':{odds:'3',rebate:'4'},'八不中':{odds:'3.5',rebate:'4'},
    '九不中':{odds:'4',rebate:'4'},'十不中':{odds:'5',rebate:'4'},'十一不中':{odds:'6',rebate:'4'},'十二不中':{odds:'7',rebate:'4'},
    '二中二':{odds:'60',rebate:'4'},'三中三':{odds:'600',rebate:'4'},'平码':{odds:'7',rebate:'4'},
    '特碰':{odds:'120',rebate:'4'},
    '包红波':{odds:'2.6',rebate:'4'},'包蓝波':{odds:'2.7',rebate:'4'},'包绿波':{odds:'2.7',rebate:'4'},
    '包红单':{odds:'5',rebate:'4'},'包红双':{odds:'4.7',rebate:'4'},'包红大':{odds:'6',rebate:'4'},'包红小':{odds:'4',rebate:'4'},
    '包蓝单':{odds:'5',rebate:'4'},'包蓝双':{odds:'5',rebate:'4'},'包蓝大':{odds:'4.7',rebate:'4'},'包蓝小':{odds:'6',rebate:'4'},
    '包绿单':{odds:'5',rebate:'4'},'包绿双':{odds:'5',rebate:'4'},'包绿大':{odds:'5',rebate:'4'},'包绿小':{odds:'6',rebate:'4'},
    '包单':{odds:'1.8',rebate:'4'},'包双':{odds:'1.8',rebate:'4'},'包大':{odds:'1.8',rebate:'4'},'包小':{odds:'1.8',rebate:'4'},
    '包家禽':{odds:'1.8',rebate:'4'},'包野兽':{odds:'1.8',rebate:'4'}
  };
  document.querySelectorAll('.odds-input[data-field="odds"]').forEach(inp => {
    const type = inp.dataset.type;
    if (defaults[type]) inp.value = defaults[type].odds;
  });
  document.querySelectorAll('.odds-input[data-field="rebate"]').forEach(inp => {
    const type = inp.dataset.type;
    if (defaults[type]) inp.value = defaults[type].rebate;
  });
  showToast('已恢复默认赔率，请点击保存以生效');
}

function enableOddsEdit() {
  document.querySelectorAll('.odds-input').forEach(inp => {
    inp.disabled = false;
    inp.style.border = '1px solid #ccc';
    inp.style.background = '#fff';
  });
  showToast('已进入编辑模式');
}

function saveOddsData() {
  const data = {};
  document.querySelectorAll('.odds-input[data-field="odds"]').forEach(inp => {
    const type = inp.dataset.type;
    if (!data[type]) data[type] = { odds: '', rebate: '4' };
    data[type].odds = inp.value.trim();
  });
  document.querySelectorAll('.odds-input[data-field="rebate"]').forEach(inp => {
    const type = inp.dataset.type;
    if (!data[type]) data[type] = { odds: '', rebate: '4' };
    data[type].rebate = inp.value.trim();
  });
  document.querySelectorAll('.odds-input[data-field="name"]').forEach(inp => {
    const type = inp.dataset.type;
    if (!data[type]) data[type] = { odds: '', rebate: '4' };
    data[type].name = inp.value.trim();
  });
  localStorage.setItem('comboOddsData', JSON.stringify(data));
  document.querySelectorAll('.odds-input').forEach(inp => {
    inp.disabled = true;
    inp.style.border = 'none';
    inp.style.background = 'transparent';
  });
  showToast('赔率已保存');
  if (document.getElementById('lianxiaoStatsWin')) refreshLianxiaoStats();
}