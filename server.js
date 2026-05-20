const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // 根目录存放 index.html

// 数据库初始化
const db = new Database('data.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
  
  CREATE TABLE IF NOT EXISTS card_keys (
    code TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    expire_days INTEGER NOT NULL,
    used_by INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (used_by) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS report_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS configs (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// 预置管理员账号
const adminUsername = '17776192265';
const adminPassword = '150408';
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO users (username, password, role, status) VALUES (?,?,?,?)').run(adminUsername, hash, 'admin', 'active');
  console.log('管理员账号已创建');
}

// ------------------ 默认配置数据 ------------------
const defaultConfigs = {
  zodiac: { shu:'07 19 31 43', niu:'06 18 30 42', hu:'05 17 29 41', tu2:'04 16 28 40', long:'03 15 27 39', she:'02 14 26 38', ma:'01 13 25 37 49', yang:'12 24 36 48', hou:'11 23 35 47', ji:'10 22 34 46', gou:'09 21 33 45', zhu:'08 20 32 44' },
  shengxiaoAttr: { sx_jiaqin:'牛 马 羊 鸡 狗 猪', sx_yeshou:'鼠 虎 兔 龙 蛇 猴', sx_jimei:'兔 龙 蛇 马 羊 鸡', sx_xiongchou:'鼠 牛 虎 猴 狗 猪', sx_yinxing:'鼠 龙 蛇 马 狗 猪', sx_yangxing:'牛 虎 兔 羊 猴 鸡', sx_tianxiao:'兔 马 猴 猪 牛 龙', sx_dixiao:'蛇 羊 鸡 狗 鼠 虎', sx_danbi:'鼠 龙 马 蛇 鸡 猪', sx_shuangbi:'虎 猴 狗 兔 羊 牛', sx_baibian:'鼠 牛 虎 鸡 狗 猪' },
  wuxing: { jin:'04 05 12 13 26 27 34 35 42 43', mu:'08 09 16 17 24 25 38 39 46 47', shui:'01 14 15 22 23 30 31 44 45', huo:'02 03 10 11 18 19 32 33 40 41 48 49', tu:'06 07 20 21 28 29 36 37' },
  bose: { hongbo:'01 02 07 08 12 13 18 19 23 24 29 30 34 35 40 45 46', lanbo:'03 04 09 10 14 15 20 25 26 31 36 37 41 42 47 48', lvbo:'05 06 11 16 17 21 22 27 28 32 33 38 39 43 44 49' },
  banbo: { hongshuang:'02 08 12 18 24 30 34 40 46', hongdan:'01 07 13 19 23 29 35 45', lanshuang:'04 10 14 20 26 36 42 48', landan:'03 09 15 25 31 37 41 47', lvshuang:'06 16 22 28 32 38 44', lvdan:'05 11 17 21 27 33 39 43 49' },
  danshuang: { danshu:'01 03 05 07 09 11 13 15 17 19 21 23 25 27 29 31 33 35 37 39 41 43 45 47 49', shuangshu:'02 04 06 08 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48' },
  weishu: {}, daxiaodanshuang: {}, daxiao: {}, heshu: {}, toushu: {}, menshu: {}, duanwei: {}, hedahexiao: {}, weidaweixiao: {}, hewei: {}, heshudanshuang: {}, toushuDanshuang: {}
};

// 补充默认值
for (let i = 0; i <= 9; i++) defaultConfigs.weishu[`ws_${i}`] = [...Array(i===0?4:5)].map((_,j)=> `${j*10 + (i||10)}`.padStart(2,'0')).join(' ');
for (let i = 1; i <= 13; i++) {
  const nums = []; for (let n=1; n<=49; n++) { const h = Math.floor((n%100)/10)+Math.floor(n%10); if (h === i) nums.push(n); }
  defaultConfigs.heshu[`hs_${String(i).padStart(2,'0')}`] = nums.map(n=>String(n).padStart(2,'0')).join(' ');
}
for (let i = 0; i <= 4; i++) defaultConfigs.toushu[`ts_${i}`] = [...Array(10)].map((_,j)=> String(i*10 + j + 1).padStart(2,'0')).filter(n=>parseInt(n)<=49).join(' ');
for (let i = 1; i <= 5; i++) {
  const n = i===1?9:i===2?9:i===3?9:i===4?10:12;
  const start = [0,1,10,19,28,38][i];
  defaultConfigs.menshu[`ms_${i}`] = [...Array(n)].map((_,j)=> String(start+j).padStart(2,'0')).join(' ');
}
for (let i = 1; i <= 7; i++) {
  const start = (i-1)*7+1; const nums = [];
  for (let j=0; j<7; j++) { const val = start+j; if (val<=49) nums.push(String(val).padStart(2,'0')); }
  defaultConfigs.duanwei[`dw_${i}`] = nums.join(' ');
}
defaultConfigs.hedahexiao = { hdx_hexiao:'01 02 03 04 05 06 10 11 12 13 14 15 20 21 22 23 24 30 31 32 33 40 41 42', hdx_heda:'07 08 09 16 17 18 19 25 26 27 28 29 34 35 36 37 38 39 43 44 45 46 47 48 49' };
defaultConfigs.weidaweixiao = { wdx_weixiao:'01 02 03 04 10 11 12 13 14 20 21 22 23 24 30 31 32 33 34 40 41 42 43 44', wdx_weida:'05 06 07 08 09 15 16 17 18 19 25 26 27 28 29 35 36 37 38 39 45 46 47 48 49' };
for (let i = 0; i <= 9; i++) {
  const nums = []; for (let n=1; n<=49; n++) { const h = Math.floor((n%100)/10)+Math.floor(n%10); if (h%10 === i) nums.push(n); }
  defaultConfigs.hewei[`hw_${i}`] = nums.map(n=>String(n).padStart(2,'0')).join(' ');
}
defaultConfigs.heshudanshuang = { hsd_hsd:'01 03 05 07 09 10 12 14 16 18 21 23 25 27 29 30 32 34 36 38 41 43 45 47 49', hsd_hss:'02 04 06 08 11 13 15 17 19 20 22 24 26 28 31 33 35 37 39 40 42 44 46 48' };
for (let i = 0; i <= 4; i++) {
  defaultConfigs.toushuDanshuang[`tds_${i}dan`] = [...Array(10)].map((_,j)=> String(i*10 + j + 1)).filter(n=>parseInt(n)<=49 && parseInt(n)%2===1).map(n=>String(n).padStart(2,'0')).join(' ');
  defaultConfigs.toushuDanshuang[`tds_${i}shuang`] = [...Array(10)].map((_,j)=> String(i*10 + j + 1)).filter(n=>parseInt(n)<=49 && parseInt(n)%2===0).map(n=>String(n).padStart(2,'0')).join(' ');
}
defaultConfigs.daxiaodanshuang = { dadan:'25 27 29 31 33 35 37 39 41 43 45 47 49', dashuang:'26 28 30 32 34 36 38 40 42 44 46 48', xiaodan:'01 03 05 07 09 11 13 15 17 19 21 23', xiaoshuang:'02 04 06 08 10 12 14 16 18 20 22 24' };
defaultConfigs.daxiao = { dx_xiao:'01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24', dx_da:'25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49' };

function initConfigs() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM configs').get().cnt;
  if (count === 0) {
    const insert = db.prepare('INSERT OR REPLACE INTO configs (key, value) VALUES (?,?)');
    for (const [group, items] of Object.entries(defaultConfigs)) {
      for (const [id, val] of Object.entries(items)) {
        insert.run(`config_${id}`, val);
      }
    }
    console.log('默认配置已写入数据库');
  }
}
initConfigs();

// 系统设置初始化
if (!db.prepare("SELECT key FROM system_settings WHERE key='start_zodiac'").get()) {
  db.prepare("INSERT INTO system_settings VALUES ('start_zodiac', '马')").run();
  db.prepare("INSERT INTO system_settings VALUES ('config_password', '891105')").run();
}

// JWT 中间件
const JWT_SECRET = process.env.JWT_SECRET || 'hk-mc-secret-key-change-me';
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未提供令牌' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '令牌无效' });
    req.user = user;
    next();
  });
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  next();
}

// ==================== 工具函数 ====================
function getConfigData() {
  const rows = db.prepare('SELECT key, value FROM configs').all();
  const config = { zodiac: {}, shengxiaoAttr: {}, wuxing: {}, bose: {}, banbo: {}, danshuang: {}, weishu: {}, daxiaodanshuang: {}, daxiao: {}, heshu: {}, toushu: {}, menshu: {}, duanwei: {}, hedahexiao: {}, weidaweixiao: {}, hewei: {}, heshudanshuang: {}, toushuDanshuang: {} };
  const mapping = {
    zodiac: ['shu','niu','hu','tu2','long','she','ma','yang','hou','ji','gou','zhu'],
    shengxiaoAttr: ['sx_jiaqin','sx_yeshou','sx_jimei','sx_xiongchou','sx_yinxing','sx_yangxing','sx_tianxiao','sx_dixiao','sx_danbi','sx_shuangbi','sx_baibian'],
    wuxing: ['jin','mu','shui','huo','tu'],
    bose: ['hongbo','lanbo','lvbo'],
    banbo: ['hongshuang','hongdan','lanshuang','landan','lvshuang','lvdan'],
    danshuang: ['danshu','shuangshu'],
    weishu: [...Array(10).keys()].map(i=>`ws_${i}`),
    daxiaodanshuang: ['dadan','dashuang','xiaodan','xiaoshuang'],
    daxiao: ['dx_xiao','dx_da'],
    heshu: [...Array(13).keys()].map(i=>`hs_${String(i+1).padStart(2,'0')}`),
    toushu: [...Array(5).keys()].map(i=>`ts_${i}`),
    menshu: [...Array(5).keys()].map(i=>`ms_${i+1}`),
    duanwei: [...Array(7).keys()].map(i=>`dw_${i+1}`),
    hedahexiao: ['hdx_hexiao','hdx_heda'],
    weidaweixiao: ['wdx_weixiao','wdx_weida'],
    hewei: [...Array(10).keys()].map(i=>`hw_${i}`),
    heshudanshuang: ['hsd_hsd','hsd_hss'],
    toushuDanshuang: [...Array(5).keys()].reduce((acc,i)=>acc.concat([`tds_${i}dan`,`tds_${i}shuang`]),[])
  };
  rows.forEach(row => {
    const key = row.key.replace('config_', '');
    const val = row.value;
    for (const [group, ids] of Object.entries(mapping)) {
      if (ids.includes(key)) {
        config[group][key] = val;
        break;
      }
    }
  });
  // 转换字符串为数组
  const parseNumbers = (str) => str.split(/\s+/).filter(n => /^\d+$/.test(n));
  const parseStrings = (str) => str.split(/\s+/);
  for (const group in config) {
    for (const key in config[group]) {
      if (['shengxiaoAttr'].includes(group)) config[group][key] = parseStrings(config[group][key]);
      else config[group][key] = parseNumbers(config[group][key]);
    }
  }
  return config;
}

function getAllValidCategories(config) {
  const s = new Set();
  Object.keys(config.zodiac).forEach(k => s.add(k));
  Object.keys(config.shengxiaoAttr).forEach(k => s.add(k));
  Object.keys(config.wuxing).forEach(k => s.add(k));
  Object.keys(config.bose).forEach(k => s.add(k));
  Object.keys(config.banbo).forEach(k => s.add(k));
  Object.keys(config.danshuang).forEach(k => s.add(k));
  Object.keys(config.weishu).forEach(k => s.add(k));
  Object.keys(config.daxiaodanshuang).forEach(k => s.add(k));
  Object.keys(config.daxiao).forEach(k => s.add(k));
  Object.keys(config.heshu).forEach(k => s.add(k));
  Object.keys(config.toushu).forEach(k => s.add(k));
  Object.keys(config.menshu).forEach(k => s.add(k));
  Object.keys(config.duanwei).forEach(k => s.add(k));
  Object.keys(config.hedahexiao).forEach(k => s.add(k));
  Object.keys(config.weidaweixiao).forEach(k => s.add(k));
  Object.keys(config.hewei).forEach(k => s.add(k));
  Object.keys(config.heshudanshuang).forEach(k => s.add(k));
  Object.keys(config.toushuDanshuang).forEach(k => s.add(k));
  return s;
}

function getNumberListForCategory(cat, config) {
  const nums = [];
  if (config.shengxiaoAttr[cat]) {
    config.shengxiaoAttr[cat].forEach(z => { if (config.zodiac[z]) nums.push(...config.zodiac[z]); });
  }
  const dir = config.wuxing[cat] || config.bose[cat] || config.banbo[cat] || config.danshuang[cat] || config.weishu[cat] || config.daxiaodanshuang[cat] || config.daxiao[cat] || config.heshu[cat] || config.toushu[cat] || config.menshu[cat] || config.duanwei[cat] || config.hedahexiao[cat] || config.weidaweixiao[cat] || config.hewei[cat] || config.heshudanshuang[cat] || config.toushuDanshuang[cat];
  if (dir) nums.push(...dir);
  if (config.zodiac[cat]) nums.push(...config.zodiac[cat]);
  return [...new Set(nums)];
}

function parseOrderLine(line, config, keys) {
  const match = line.match(/^(.+?)\s+各数\s+(\d+)$/);
  if (!match) return null;
  const content = match[1];
  const amount = parseInt(match[2]) || 0;
  const items = content.split('-').map(i => i.trim()).filter(i => i);
  const numbers = [], zodiacs = [];
  items.forEach(item => {
    if (/^\d+$/.test(item)) numbers.push(item.padStart(2, '0'));
    else if (config.zodiac[item]) zodiacs.push(item);
    else if (config.shengxiaoAttr[item]) {
      config.shengxiaoAttr[item].forEach(z => zodiacs.push(z));
    } else {
      const nl = getNumberListForCategory(item, config);
      nl.forEach(n => numbers.push(n.padStart(2, '0')));
    }
  });
  return { numbers, zodiacs, amount };
}

function computeStats(date) {
  const config = getConfigData();
  const keys = getAllValidCategories(config);
  const startZodiac = db.prepare("SELECT value FROM system_settings WHERE key='start_zodiac'").get().value;
  const orders = db.prepare("SELECT * FROM orders WHERE date = ?").all(date);
  const reports = db.prepare("SELECT * FROM report_orders WHERE date = ?").all(date);
  const tableBet = {}, userBet = {}, reportBet = {}, reportAmount = {};
  const numberCount = {}, zodiacCount = {}, numberAmountCount = {}, zodiacAmountCount = {};
  let numberOrderTotal = 0, zodiacWeightedTotal = 0;
  orders.forEach(order => {
    const lines = order.content.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const parsed = parseOrderLine(line, config, keys);
      if (!parsed) return;
      const { numbers, zodiacs, amount } = parsed;
      numbers.forEach(num => {
        tableBet[num] = (tableBet[num] || 0) + amount;
        userBet[order.username] = userBet[order.username] || {};
        userBet[order.username][num] = (userBet[order.username][num] || 0) + amount;
        reportBet[num] = (reportBet[num] || 0) + amount;
        numberCount[num] = (numberCount[num] || 0) + 1;
        numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
      });
      zodiacs.forEach(z => {
        zodiacCount[z] = (zodiacCount[z] || 0) + 1;
        zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1;
        const zNums = config.zodiac[z] || [];
        zNums.forEach(n => {
          tableBet[n] = (tableBet[n] || 0) + amount;
          userBet[order.username][n] = (userBet[order.username][n] || 0) + amount;
          reportBet[n] = (reportBet[n] || 0) + amount;
        });
        const weight = z === startZodiac ? 5 : 4;
        zodiacWeightedTotal += amount * weight;
      });
      if (zodiacs.length === 0) numberOrderTotal += numbers.length * amount;
    });
  });
  reports.forEach(rep => {
    const lines = rep.content.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const parsed = parseOrderLine(line, config, keys);
      if (!parsed) return;
      const { numbers, zodiacs, amount } = parsed;
      numbers.forEach(num => {
        reportBet[num] = (reportBet[num] || 0) - amount;
        reportAmount[num] = (reportAmount[num] || 0) + amount;
      });
      zodiacs.forEach(z => {
        const zNums = config.zodiac[z] || [];
        zNums.forEach(n => {
          reportBet[n] = (reportBet[n] || 0) - amount;
          reportAmount[n] = (reportAmount[n] || 0) + amount;
        });
      });
    });
  });
  return {
    tableBet, userBet, reportBet, reportAmount,
    numberCount, zodiacCount, numberAmountCount, zodiacAmountCount,
    numberOrderTotal, zodiacWeightedTotal, startZodiac
  };
}

// ==================== API 路由 ====================
// 注册
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exist) return res.status(400).json({ error: '用户名已存在' });
  const hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (username, password, role, status) VALUES (?,?,?,?)').run(username, hash, 'user', 'pending');
  res.json({ success: true, message: '注册成功，请使用卡密激活' });
});

// 激活（需要已登录）
app.post('/api/activate', authenticateToken, (req, res) => {
  const { cardCode } = req.body;
  const userId = req.user.id;
  if (req.user.status !== 'pending') return res.status(400).json({ error: '当前无需激活' });
  const card = db.prepare('SELECT * FROM card_keys WHERE code = ? AND status = ?').get(cardCode, 'active');
  if (!card) return res.status(400).json({ error: '卡密无效或已使用' });
  if (card.used_by) return res.status(400).json({ error: '卡密已被使用' });
  db.transaction(() => {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run('active', userId);
    db.prepare('UPDATE card_keys SET status = ?, used_by = ? WHERE code = ?').run('used', userId, cardCode);
  })();
  const user = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(userId);
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, message: '激活成功' });
});

// 登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ error: '用户名或密码错误' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: '用户名或密码错误' });
  if (user.role === 'user' && user.status !== 'active') {
    return res.status(403).json({ error: '账户未激活', needActivate: true, token: jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '1h' }) });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, status: user.status }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, status: user.status } });
});

// 验证令牌
app.get('/api/me', authenticateToken, (req, res) => res.json({ user: req.user }));

// 用户管理
app.get('/api/users', authenticateToken, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, username, role, status FROM users WHERE role != ?').all('admin');
  res.json(users);
});
app.post('/api/users', authenticateToken, adminOnly, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '参数错误' });
  const exist = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exist) return res.status(400).json({ error: '用户已存在' });
  const hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (username, password, role, status) VALUES (?,?,?,?)').run(username, hash, 'user', 'pending');
  res.json({ success: true });
});
app.delete('/api/users/:id', authenticateToken, adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user || user.role === 'admin') return res.status(400).json({ error: '无法删除' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// 卡密管理
app.post('/api/cards', authenticateToken, adminOnly, (req, res) => {
  const { expireDays } = req.body;
  if (!expireDays || expireDays < 1) return res.status(400).json({ error: '有效期至少1天' });
  const code = generateSelfVerifyingCard(expireDays);
  db.prepare('INSERT INTO card_keys (code, status, expire_days) VALUES (?,?,?)').run(code, 'active', expireDays);
  res.json({ code, expireDays });
});
function generateSelfVerifyingCard(expireDays) {
  const CARD_SECRET = "XK9mP2wQ7vL5";
  const now = Date.now();
  const expireMs = expireDays * 86400000;
  const raw = `${now}-${expireMs}-${CARD_SECRET}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
  hash = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0');
  return `${now.toString(36).toUpperCase()}-${expireMs.toString(36).toUpperCase()}-${hash}`;
}
app.get('/api/cards', authenticateToken, adminOnly, (req, res) => {
  const cards = db.prepare('SELECT c.*, u.username as used_by_username FROM card_keys c LEFT JOIN users u ON c.used_by = u.id ORDER BY c.created_at DESC').all();
  res.json(cards);
});
app.put('/api/cards/:code', authenticateToken, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['active','disabled'].includes(status)) return res.status(400).json({ error: '无效状态' });
  db.prepare('UPDATE card_keys SET status = ? WHERE code = ?').run(status, req.params.code);
  res.json({ success: true });
});
app.delete('/api/cards/:code', authenticateToken, adminOnly, (req, res) => {
  db.prepare('DELETE FROM card_keys WHERE code = ?').run(req.params.code);
  res.json({ success: true });
});

// 配置
app.get('/api/config', authenticateToken, (req, res) => res.json(getConfigData()));
app.put('/api/config', authenticateToken, adminOnly, (req, res) => {
  const { password, configs } = req.body;
  const sysPwd = db.prepare("SELECT value FROM system_settings WHERE key='config_password'").get().value;
  if (password !== sysPwd) return res.status(400).json({ error: '配置密码错误' });
  const insert = db.prepare('INSERT OR REPLACE INTO configs (key, value) VALUES (?,?)');
  db.transaction(() => {
    for (const [key, value] of Object.entries(configs)) insert.run(`config_${key}`, value);
  })();
  res.json({ success: true });
});
app.post('/api/config/reset', authenticateToken, adminOnly, (req, res) => {
  db.prepare('DELETE FROM configs').run();
  initConfigs();
  res.json({ success: true });
});

// 下单记录
app.get('/api/orders', authenticateToken, (req, res) => {
  const { date, username } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (date) { query += ' AND date = ?'; params.push(date); }
  if (username) { query += ' AND username = ?'; params.push(username); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});
app.post('/api/orders', authenticateToken, (req, res) => {
  const { content, date, totalAmount } = req.body;
  if (!content || !date) return res.status(400).json({ error: '参数错误' });
  db.prepare('INSERT INTO orders (user_id, username, content, date, total_amount) VALUES (?,?,?,?,?)')
    .run(req.user.id, req.user.username, content, date, totalAmount || 0);
  res.json({ success: true });
});
app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
app.post('/api/orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '参数错误' });
  const del = db.prepare('DELETE FROM orders WHERE id = ?');
  db.transaction(() => ids.forEach(id => del.run(id)))();
  res.json({ success: true });
});

// 上报记录
app.get('/api/reports', authenticateToken, (req, res) => {
  const { date, username } = req.query;
  let query = 'SELECT * FROM report_orders WHERE 1=1';
  const params = [];
  if (date) { query += ' AND date = ?'; params.push(date); }
  if (username) { query += ' AND username = ?'; params.push(username); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});
app.post('/api/reports', authenticateToken, (req, res) => {
  const { content, date, totalAmount } = req.body;
  if (!content || !date) return res.status(400).json({ error: '参数错误' });
  db.prepare('INSERT INTO report_orders (user_id, username, content, date, total_amount) VALUES (?,?,?,?,?)')
    .run(req.user.id, req.user.username, content, date, totalAmount || 0);
  res.json({ success: true });
});
app.delete('/api/reports/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM report_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
app.post('/api/reports/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '参数错误' });
  const del = db.prepare('DELETE FROM report_orders WHERE id = ?');
  db.transaction(() => ids.forEach(id => del.run(id)))();
  res.json({ success: true });
});

// 统计
app.get('/api/stats/risk', authenticateToken, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const stats = computeStats(date);
  const total = Object.values(stats.tableBet).reduce((s, v) => s + v, 0);
  const mul = parseFloat(req.query.mul) || 47;
  const rebateRate = parseFloat(req.query.rebate) || 4;
  const rebate = (total * rebateRate / 100).toFixed(2);
  const list = [];
  for (let n in stats.tableBet) list.push({ num: n, bet: stats.tableBet[n] });
  for (let i = 1; i <= 49; i++) {
    const num = i.toString().padStart(2, '0');
    if (!stats.tableBet[num]) list.push({ num, bet: 0 });
  }
  list.sort((a, b) => b.bet - a.bet);
  const result = list.map((item, idx) => {
    const risk = Math.round(total - item.bet * mul - parseFloat(rebate));
    return { ...item, risk, rank: idx + 1 };
  });
  res.json({ list: result, total, rebate, startZodiac: stats.startZodiac });
});

app.get('/api/stats/report', authenticateToken, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const stats = computeStats(date);
  const total = Object.values(stats.reportBet).reduce((s, v) => s + v, 0);
  const mul = parseFloat(req.query.mul) || 47;
  const rebateRate = parseFloat(req.query.rebate) || 4;
  const rebate = (total * rebateRate / 100).toFixed(2);
  const list = [];
  for (let n in stats.reportBet) list.push({ num: n, bet: stats.reportBet[n] });
  for (let i = 1; i <= 49; i++) {
    const num = i.toString().padStart(2, '0');
    if (!stats.reportBet[num]) list.push({ num, bet: 0 });
  }
  list.sort((a, b) => b.bet - a.bet);
  const result = list.map((item, idx) => {
    const risk = Math.round(total - item.bet * mul - parseFloat(rebate));
    return { ...item, risk, rank: idx + 1 };
  });
  res.json({ list: result, total, rebate });
});

app.get('/api/stats/freq', authenticateToken, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const stats = computeStats(date);
  res.json({
    numberCount: stats.numberCount,
    zodiacCount: stats.zodiacCount,
    numberAmountCount: stats.numberAmountCount,
    zodiacAmountCount: stats.zodiacAmountCount,
    numberOrderTotal: stats.numberOrderTotal,
    zodiacWeightedTotal: stats.zodiacWeightedTotal,
    reportAmount: stats.reportAmount
  });
});

// 系统设置
app.get('/api/settings', authenticateToken, (req, res) => {
  const settings = db.prepare('SELECT * FROM system_settings').all();
  const map = {};
  settings.forEach(s => map[s.key] = s.value);
  res.json(map);
});
app.put('/api/settings', authenticateToken, adminOnly, (req, res) => {
  const { key, value, password } = req.body;
  if (key === 'start_zodiac' && password !== '150408') return res.status(400).json({ error: '密码错误' });
  db.prepare('UPDATE system_settings SET value = ? WHERE key = ?').run(value, key);
  res.json({ success: true });
});

// 启动服务器
app.listen(PORT, () => console.log(`服务器已启动：http://localhost:${PORT}`));
