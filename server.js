const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '150408';
const CLEAR_PASSWORD = process.env.CLEAR_PASSWORD || '891105';
const YEAR_ZODIAC_PASSWORD = process.env.YEAR_ZODIAC_PASSWORD || '150408';
const EDIT_CONFIG_PASSWORD = process.env.EDIT_CONFIG_PASSWORD || '891105';

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    activated INTEGER DEFAULT 0,
    activated_at TEXT,
    card_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    expire_days INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_by TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS report_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_by TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(owner, name)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    UNIQUE(owner, key)
  );
`);

// ========== 工具函数 ==========
function generateActivationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let seg = '';
    for (let j = 0; j < 4; j++) {
      seg += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(seg);
  }
  return 'HKMC-' + segments.join('-');
}

// 默认配置
const DEFAULT_CONFIG = {
  zodiac: {
    鼠: ["07","19","31","43"], 牛: ["06","18","30","42"], 虎: ["05","17","29","41"],
    兔: ["04","16","28","40"], 龙: ["03","15","27","39"], 蛇: ["02","14","26","38"],
    马: ["01","13","25","37","49"], 羊: ["12","24","36","48"], 猴: ["11","23","35","47"],
    鸡: ["10","22","34","46"], 狗: ["09","21","33","45"], 猪: ["08","20","32","44"]
  },
  shengxiaoAttr: {
    家禽: ["牛","马","羊","鸡","狗","猪"], 野兽: ["鼠","虎","兔","龙","蛇","猴"],
    吉美: ["兔","龙","蛇","马","羊","鸡"], 凶丑: ["鼠","牛","虎","猴","狗","猪"],
    阴性: ["鼠","龙","蛇","马","狗","猪"], 阳性: ["牛","虎","兔","羊","猴","鸡"],
    天肖: ["兔","马","猴","猪","牛","龙"], 地肖: ["蛇","羊","鸡","狗","鼠","虎"],
    单笔: ["鼠","龙","马","蛇","鸡","猪"], 双笔: ["虎","猴","狗","兔","羊","牛"],
    白边: ["鼠","牛","虎","鸡","狗","猪"]
  },
  wuxing: {
    金: ["04","05","12","13","26","27","34","35","42","43"],
    木: ["08","09","16","17","24","25","38","39","46","47"],
    水: ["01","14","15","22","23","30","31","44","45"],
    火: ["02","03","10","11","18","19","32","33","40","41","48","49"],
    土: ["06","07","20","21","28","29","36","37"]
  },
  bose: {
    红波: ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"],
    蓝波: ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"],
    绿波: ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"]
  },
  banbo: {
    红双: ["02","08","12","18","24","30","34","40","46"], 红单: ["01","07","13","19","23","29","35","45"],
    蓝双: ["04","10","14","20","26","36","42","48"], 蓝单: ["03","09","15","25","31","37","41","47"],
    绿双: ["06","16","22","28","32","38","44"], 绿单: ["05","11","17","21","27","33","39","43","49"]
  },
  danshuang: {
    单数: ["01","03","05","07","09","11","13","15","17","19","21","23","25","27","29","31","33","35","37","39","41","43","45","47","49"],
    双数: ["02","04","06","08","10","12","14","16","18","20","22","24","26","28","30","32","34","36","38","40","42","44","46","48"]
  },
  weishu: {},
  daxiaodanshuang: {
    大单: ["25","27","29","31","33","35","37","39","41","43","45","47","49"],
    大双: ["26","28","30","32","34","36","38","40","42","44","46","48"],
    小单: ["01","03","05","07","09","11","13","15","17","19","21","23"],
    小双: ["02","04","06","08","10","12","14","16","18","20","22","24"]
  },
  daxiao: {
    小: ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"],
    大: ["25","26","27","28","29","30","31","32","33","34","35","36","37","38","39","40","41","42","43","44","45","46","47","48","49"]
  },
  heshu: {
    "01合": ["01","10"],"02合": ["02","11","20"],"03合": ["03","12","21","30"],
    "04合": ["04","13","22","31","40"],"05合": ["05","14","23","32","41"],
    "06合": ["06","15","24","33","42"],"07合": ["07","16","25","34","43"],
    "08合": ["08","17","26","35","44"],"09合": ["09","18","27","36","45"],
    "10合": ["19","28","37","46"],"11合": ["29","38","47"],"12合": ["39","48"],"13合": ["49"]
  },
  toushu: {
    "0头": ["01","02","03","04","05","06","07","08","09"],
    "1头": ["10","11","12","13","14","15","16","17","18","19"],
    "2头": ["20","21","22","23","24","25","26","27","28","29"],
    "3头": ["30","31","32","33","34","35","36","37","38","39"],
    "4头": ["40","41","42","43","44","45","46","47","48","49"]
  },
  menshu: {
    "1门": ["01","02","03","04","05","06","07","08","09"],
    "2门": ["10","11","12","13","14","15","16","17","18"],
    "3门": ["19","20","21","22","23","24","25","26","27"],
    "4门": ["28","29","30","31","32","33","34","35","36","37"],
    "5门": ["38","39","40","41","42","43","44","45","46","47","48","49"]
  },
  duanwei: {
    "1段": ["01","02","03","04","05","06","07"],"2段": ["08","09","10","11","12","13","14"],
    "3段": ["15","16","17","18","19","20","21"],"4段": ["22","23","24","25","26","27","28"],
    "5段": ["29","30","31","32","33","34","35"],"6段": ["36","37","38","39","40","41","42"],
    "7段": ["43","44","45","46","47","48","49"]
  },
  hedahexiao: {
    合小: ["01","02","03","04","05","06","10","11","12","13","14","15","20","21","22","23","24","30","31","32","33","40","41","42"],
    合大: ["07","08","09","16","17","18","19","25","26","27","28","29","34","35","36","37","38","39","43","44","45","46","47","48","49"]
  },
  weidaweixiao: {
    尾小: ["01","02","03","04","10","11","12","13","14","20","21","22","23","24","30","31","32","33","34","40","41","42","43","44"],
    尾大: ["05","06","07","08","09","15","16","17","18","19","25","26","27","28","29","35","36","37","38","39","45","46","47","48","49"]
  },
  hewei: {
    "0合尾": ["19","28","37","46"],"1合尾": ["01","10","29","38","47"],
    "2合尾": ["02","11","20","39","48"],"3合尾": ["03","12","21","30","49"],
    "4合尾": ["04","13","22","31","40"],"5合尾": ["05","14","23","32","41"],
    "6合尾": ["06","15","24","33","42"],"7合尾": ["07","16","25","34","43"],
    "8合尾": ["08","17","26","35","44"],"9合尾": ["09","18","27","36","45"]
  },
  heshudanshuang: {
    合数单: ["01","03","05","07","09","10","12","14","16","18","21","23","25","27","29","30","32","34","36","38","41","43","45","47","49"],
    合数双: ["02","04","06","08","11","13","15","17","19","20","22","24","26","28","31","33","35","37","39","40","42","44","46","48"]
  },
  toushuDanshuang: {
    "0头单": ["01","03","05","07","09"],"0头双": ["02","04","06","08"],
    "1头单": ["11","13","15","17","19"],"1头双": ["10","12","14","16","18"],
    "2头单": ["21","23","25","27","29"],"2头双": ["20","22","24","26","28"],
    "3头单": ["31","33","35","37","39"],"3头双": ["30","32","34","36","38"],
    "4头单": ["41","43","45","47","49"],"4头双": ["40","42","44","46","48"]
  }
};

for (let i = 0; i <= 9; i++) {
  const key = i + '尾';
  DEFAULT_CONFIG.weishu[key] = [];
  for (let j = 1; j <= 49; j++) {
    const num = j.toString().padStart(2, '0');
    if (num.endsWith(i.toString())) DEFAULT_CONFIG.weishu[key].push(num);
  }
}

function mergeConfig(custom) {
  if (!custom) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  if (custom.weishu) Object.assign(merged.weishu, custom.weishu);
  return merged;
}

function getAllValidCategories(config) {
  const s = new Set();
  for (const key in config.zodiac) s.add(key);
  for (const key in config.shengxiaoAttr) s.add(key);
  for (const key in config.wuxing) s.add(key);
  for (const key in config.bose) s.add(key);
  for (const key in config.banbo) s.add(key);
  for (const key in config.danshuang) s.add(key);
  for (const key in config.weishu) s.add(key);
  for (const key in config.daxiaodanshuang) s.add(key);
  for (const key in config.daxiao) s.add(key);
  for (const key in config.heshu) s.add(key);
  for (const key in config.toushu) s.add(key);
  for (const key in config.menshu) s.add(key);
  for (const key in config.duanwei) s.add(key);
  for (const key in config.hedahexiao) s.add(key);
  for (const key in config.weidaweixiao) s.add(key);
  for (const key in config.hewei) s.add(key);
  for (const key in config.heshudanshuang) s.add(key);
  for (const key in config.toushuDanshuang) s.add(key);
  return s;
}

function getNumberListForCategory(cat, config) {
  const nums = [];
  if (config.shengxiaoAttr[cat]) {
    config.shengxiaoAttr[cat].forEach(z => {
      if (config.zodiac[z]) nums.push(...config.zodiac[z].map(n => n.padStart(2, '0')));
    });
  }
  const sources = [
    config.wuxing, config.bose, config.banbo, config.danshuang,
    config.weishu, config.daxiaodanshuang, config.daxiao, config.heshu,
    config.toushu, config.menshu, config.duanwei, config.hedahexiao,
    config.weidaweixiao, config.hewei, config.heshudanshuang,
    config.toushuDanshuang, config.zodiac
  ];
  for (const src of sources) {
    if (src && src[cat]) nums.push(...src[cat].map(n => n.padStart(2, '0')));
  }
  return [...new Set(nums)];
}

function parseLine(line, config) {
  const m = line.match(/([\u4e00-\u9fa5\d\-]+)\s+各数\s+(\d+)/);
  if (!m) return { numbers: [], zodiacs: [], amount: 0 };
  const cont = m[1];
  const amt = parseInt(m[2]) || 0;
  const items = cont.split('-').map(i => i.trim()).filter(i => i);
  const nums = new Set();
  const zods = new Set();
  items.forEach(item => {
    if (/^\d+$/.test(item)) {
      nums.add(item.padStart(2, '0'));
    } else if (config.shengxiaoAttr[item]) {
      config.shengxiaoAttr[item].forEach(z => zods.add(z));
    } else if (config.zodiac[item]) {
      zods.add(item);
    } else {
      const n = getNumberListForCategory(item, config);
      if (n.length) n.forEach(num => nums.add(num));
    }
  });
  return { numbers: [...nums], zodiacs: [...zods], amount: amt };
}

// ========== 认证中间件 ==========
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '令牌无效' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// ========== 用户认证 ==========
app.post('/api/auth/admin', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, role: 'admin' });
  }
  res.status(401).json({ error: '管理员密码错误' });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写完整信息' });
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) return res.status(400).json({ error: '用户名已存在' });
  const passwordHash = bcrypt.hashSync(password, 10);
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, passwordHash, timestamp);
  res.json({ success: true, message: '注册成功，请使用激活码激活' });
});

app.post('/api/auth/activate', (req, res) => {
  const { username, cardCode } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ error: '用户不存在' });
  const card = db.prepare('SELECT * FROM cards WHERE code = ? AND status = ?').get(cardCode, 'active');
  if (!card) return res.status(400).json({ error: '激活码无效' });
  const cardCreated = new Date(card.created_at).getTime();
  const cardExpireMs = card.expire_days * 86400000;
  if (Date.now() > cardCreated + cardExpireMs) {
    db.prepare('UPDATE cards SET status = ? WHERE id = ?').run('expired', card.id);
    return res.status(400).json({ error: '激活码已过期' });
  }
  const nowISO = new Date().toISOString();
  db.prepare('UPDATE users SET activated = 1, activated_at = ?, card_id = ? WHERE id = ?').run(nowISO, card.id, user.id);
  db.prepare('UPDATE cards SET status = ?, user_id = ? WHERE id = ?').run('used', user.id, card.id);
  res.json({ success: true, message: '激活成功，请登录' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (user.role === 'admin') {
    const token = jwt.sign({ id: user.id, username: user.username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username: user.username, role: 'admin' });
  }
  if (user.activated === 0) {
    return res.status(403).json({ error: '账号未激活', needActivation: true });
  }
  if (user.card_id) {
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(user.card_id);
    if (card) {
      const activatedAt = new Date(user.activated_at).getTime();
      const expireMs = card.expire_days * 86400000;
      if (Date.now() > activatedAt + expireMs) {
        db.prepare('UPDATE users SET activated = 2 WHERE id = ?').run(user.id);
        return res.status(403).json({ error: '激活已过期', needActivation: true });
      }
    }
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, username: user.username, role: user.role });
});

// ========== 卡密管理（管理员） ==========
app.get('/api/cards', authenticateToken, requireAdmin, (req, res) => {
  const cards = db.prepare(`SELECT cards.*, users.username FROM cards LEFT JOIN users ON cards.user_id = users.id ORDER BY cards.created_at DESC`).all();
  res.json(cards);
});

app.post('/api/cards/generate', authenticateToken, requireAdmin, (req, res) => {
  const { expireDays } = req.body;
  const code = generateActivationCode();
  db.prepare('INSERT INTO cards (code, status, expire_days, created_at) VALUES (?, ?, ?, ?)').run(code, 'active', expireDays, new Date().toISOString());
  res.json({ success: true, code });
});

app.post('/api/cards/:id/disable', authenticateToken, requireAdmin, (req, res) => {
  db.prepare('UPDATE cards SET status = ? WHERE id = ?').run('disabled', req.params.id);
  res.json({ success: true });
});

// ========== 标签管理 ==========
app.get('/api/tags', authenticateToken, (req, res) => {
  const tags = db.prepare('SELECT name FROM tags WHERE owner = ? ORDER BY name').all(req.user.username).map(r => r.name);
  res.json(tags);
});

app.post('/api/tags', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '标签名不能为空' });
  try {
    db.prepare('INSERT INTO tags (name, owner, created_at) VALUES (?, ?, ?)').run(name, req.user.username, new Date().toISOString());
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: '标签已存在' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tags', authenticateToken, (req, res) => {
  const { name } = req.body;
  db.prepare('DELETE FROM tags WHERE name = ? AND owner = ?').run(name, req.user.username);
  res.json({ success: true });
});

// ========== 订单 API（使用标签） ==========
app.get('/api/orders', authenticateToken, (req, res) => {
  const { date, tag } = req.query;
  let query = 'SELECT * FROM orders WHERE created_by = ?';
  const params = [req.user.username];
  if (date) { query += ' AND date = ?'; params.push(date); }
  if (tag) { query += ' AND tag = ?'; params.push(tag); }
  if (req.user.role === 'admin' && !tag) {
    query = 'SELECT * FROM orders';
    params.length = 0;
    if (date) { query += ' WHERE date = ?'; params.push(date); }
  }
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { content, tag, date, totalAmount } = req.body;
  if (!content || !tag) return res.status(400).json({ error: '缺少必要字段' });
  const timestamp = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO orders (content, tag, created_by, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(content, tag, req.user.username, date, totalAmount || 0, timestamp);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (req.user.role !== 'admin' && order.created_by !== req.user.username) {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  const transaction = db.transaction(() => {
    const del = db.prepare('DELETE FROM orders WHERE id = ?');
    ids.forEach(id => del.run(id));
  });
  transaction();
  res.json({ success: true });
});

// ========== 上报订单 API ==========
app.get('/api/report-orders', authenticateToken, (req, res) => {
  const { date, tag } = req.query;
  let query = 'SELECT * FROM report_orders WHERE created_by = ?';
  const params = [req.user.username];
  if (date) { query += ' AND date = ?'; params.push(date); }
  if (tag) { query += ' AND tag = ?'; params.push(tag); }
  if (req.user.role === 'admin' && !tag) {
    query = 'SELECT * FROM report_orders';
    params.length = 0;
    if (date) { query += ' WHERE date = ?'; params.push(date); }
  }
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

app.post('/api/report-orders', authenticateToken, (req, res) => {
  const { content, tag, date, totalAmount } = req.body;
  if (!content || !tag) return res.status(400).json({ error: '缺少必要字段' });
  const timestamp = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO report_orders (content, tag, created_by, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(content, tag, req.user.username, date, totalAmount || 0, timestamp);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.delete('/api/report-orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT * FROM report_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '记录不存在' });
  if (req.user.role !== 'admin' && order.created_by !== req.user.username) {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM report_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/report-orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  const transaction = db.transaction(() => {
    const del = db.prepare('DELETE FROM report_orders WHERE id = ?');
    ids.forEach(id => del.run(id));
  });
  transaction();
  res.json({ success: true });
});

// ========== 识别接口 ==========
app.post('/api/recognize', authenticateToken, (req, res) => {
  const { text, config: customConfig } = req.body;
  if (!text) return res.json({ result: '' });
  const config = mergeConfig(customConfig || {});
  const vc = getAllValidCategories(config);
  const HARD_AMP_LIST = ['各','各号','号','个','=','各数','每数','每号','个号','每个号','各码','各号码'];
  const AMP_ORIGINAL = '(?:' + HARD_AMP_LIST.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')';
  const allPre = ['奥特','特码','澳门特码','特','奥','澳','澳门','澳門','澳門特碼','澳门特码','澳門特码',':','。','.','新',',','新','新奥','门','，','新澳','新特','新澳特','特碼'];

  function cn2n(s) {
    const m={'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100,'千':1000};
    let sum=0,tmp=0;
    for(let c of s) {
      const v=m[c];
      if(v===10||v===100||v===1000) {
        if(tmp===0)tmp=1;
        tmp*=v; sum+=tmp; tmp=0;
      } else if(v!==undefined) {
        if(tmp>0){sum+=tmp;tmp=0;}
        tmp=v;
      }
    }
    sum+=tmp; return sum;
  }

  function tokenizeAndJoin(content) {
    const tokens = content.split(/[^\u4e00-\u9fa5\d]+/).filter(t => t.trim()).map(t => t.trim());
    const res = [];
    tokens.forEach(t => {
      const tm = t.match(/^(\d{2,})尾$/);
      const hm = t.match(/^(\d{2,})头$/);
      if (tm) { const ds = tm[1].split('').map(d => d + '尾'); res.push(...ds); }
      else if (hm) { const ds = hm[1].split('').map(d => d + '头'); res.push(...ds); }
      else if (/^\d{1,2}$/.test(t)) { const n = parseInt(t); if (n >= 1 && n <= 49) res.push(t.length === 1 ? '0' + t : t); }
      else if (vc.has(t)) { res.push(t); }
      else if (/^[\u4e00-\u9fa5]+$/.test(t)) {
        const cs = t.match(/[\u4e00-\u9fa5]/g) || [];
        if (cs.every(c => vc.has(c))) res.push(...cs);
      }
    });
    return res.join('-');
  }

  const lines = text.split('\n');
  const resultLines = [];
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    const pairMatch = line.match(/^(\d{1,2})[^\d\s]+(\d+)$/);
    if (pairMatch) {
      let num = pairMatch[1]; const amount = pairMatch[2];
      if (num.length === 1) num = '0' + num;
      resultLines.push(`${num} 各数 ${amount}`);
      return;
    }
    let cl = line;
    allPre.forEach(p => { if (cl.startsWith(p)) cl = cl.substring(p.length).trim(); });
    cl = cl.replace(/[^\u4e00-\u9fa5\d]+$/, '');
    cl = cl.replace(/([一二三四五六七八九十百千]+)/g, (m) => cn2n(m));
    while (cl && !/^[\d\u4e00-\u9fa5]/.test(cl)) { cl = cl.substring(1).trim(); }
    const leadingChineseMatch = cl.match(/^([\u4e00-\u9fa5]+)/);
    if (leadingChineseMatch) {
      const leadingChinese = leadingChineseMatch[1];
      let isValidPrefix = false;
      for (let i = 1; i <= leadingChinese.length; i++) {
        if (vc.has(leadingChinese.substring(0, i))) { isValidPrefix = true; break; }
      }
      if (!isValidPrefix) cl = cl.substring(leadingChinese.length).trim();
    }
    const op = new RegExp(`(${AMP_ORIGINAL}\\d+)`, 'g');
    const om = cl.match(op);
    if (om && om.length > 0) {
      let rl = cl;
      om.forEach(om => {
        const oi = rl.indexOf(om);
        if (oi !== -1) {
          const cont = rl.substring(0, oi).trim();
          const am = om.match(/(\d+)/);
          if (am) {
            const amt = am[1];
            if (cont) { const jo = tokenizeAndJoin(cont); if (jo) resultLines.push(`${jo} 各数 ${amt}`); }
            rl = rl.substring(oi + om.length);
          }
        }
      });
      if (rl.trim()) { const jo = tokenizeAndJoin(rl.trim()); if (jo) resultLines.push(`${jo} 各数 0`); }
    } else {
      const pat = new RegExp(`^(.+?)${AMP_ORIGINAL}(\\d+)$`);
      const m = cl.match(pat);
      if (m) { const jo = tokenizeAndJoin(m[1].trim()); if (jo) resultLines.push(`${jo} 各数 ${m[2]}`); }
      else {
        const sp = new RegExp(`(\\d+)(?:号|${AMP_ORIGINAL})(\\d+)$`);
        const sm = cl.match(sp);
        if (sm) {
          let num = sm[1].trim();
          if (parseInt(num) >= 1 && parseInt(num) <= 49) {
            num = num.length === 1 ? `0${num}` : num;
            resultLines.push(`${num} 各数 ${sm[2]}`);
          }
        } else {
          const jo = tokenizeAndJoin(cl); if (jo) resultLines.push(`${jo} 各数 0`);
        }
      }
    }
  });
  res.json({ result: resultLines.join('\n') });
});

// ========== 高亮接口 ==========
app.post('/api/highlight', authenticateToken, (req, res) => {
  const { content, targetNum, config: customConfig } = req.body;
  if (!content || !targetNum) return res.json({ highlighted: content });
  const config = mergeConfig(customConfig || {});
  const t = targetNum.toString().padStart(2, '0');
  const lines = content.split('\n');
  const highlightedLines = lines.map(line => {
    const m = line.match(/^(.+?)\s+各数\s+(\d+)$/);
    if (!m) return line;
    const cont = m[1];
    const amt = m[2];
    const parts = cont.split(/(-| )/).filter(p => p);
    const highlightedParts = parts.map(p => {
      if (p === '-' || p === ' ') return p;
      let isMatch = false;
      if (/^\d{1,2}$/.test(p)) {
        isMatch = p.padStart(2, '0') === t;
      } else {
        const nums = getNumberListForCategory(p, config);
        isMatch = nums.includes(t);
      }
      return isMatch ? `<span class="highlight-number">${p}</span>` : p;
    });
    return highlightedParts.join('') + ` 各数 ${amt}`;
  });
  res.json({ highlighted: highlightedLines.join('\n') });
});

// ========== 统计+风险计算接口 ==========
app.get('/api/calculate', authenticateToken, (req, res) => {
  const { date, rebateRate = 4, multiple = 47, numAmountMin = 1, numAmountMax = 50000, zodiacAmountMin = 1, zodiacAmountMax = 50000, startZodiac = '马', config: customConfig } = req.query;
  const config = mergeConfig(customConfig ? JSON.parse(customConfig) : {});
  const zodiacOrder = ['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];
  const startIndex = zodiacOrder.indexOf(startZodiac);
  const currentZodiacMap = {};
  for (let i = 1; i <= 49; i++) currentZodiacMap[i.toString().padStart(2,'0')] = zodiacOrder[(startIndex + i - 1) % 12];

  let orders, reportOrders;
  if (req.user.role === 'admin') {
    orders = date ? db.prepare('SELECT * FROM orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM orders').all();
    reportOrders = date ? db.prepare('SELECT * FROM report_orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM report_orders').all();
  } else {
    orders = date ? db.prepare('SELECT * FROM orders WHERE date = ? AND created_by = ?').all(date, req.user.username) : db.prepare('SELECT * FROM orders WHERE created_by = ?').all(req.user.username);
    reportOrders = date ? db.prepare('SELECT * FROM report_orders WHERE date = ? AND created_by = ?').all(date, req.user.username) : db.prepare('SELECT * FROM report_orders WHERE created_by = ?').all(req.user.username);
  }

  const betData = {};
  const numberCount = {}, zodiacCount = {};
  const numberAmountCount = {}, zodiacAmountCount = {};
  const reportAmountData = {};
  let numberOrderTotal = 0, zodiacWeightedTotal = 0;

  orders.forEach(order => {
    order.content.split('\n').filter(l => l.trim()).forEach(line => {
      const { numbers, zodiacs, amount } = parseLine(line, config);
      if (zodiacs.length > 0) {
        zodiacs.forEach(z => {
          const w = z === startZodiac ? 5 : 4;
          zodiacWeightedTotal += amount * w;
        });
      } else if (numbers.length > 0) {
        numberOrderTotal += numbers.length * amount;
      }
      numbers.forEach(num => {
        betData[num] = (betData[num] || 0) + amount;
        numberCount[num] = (numberCount[num] || 0) + 1;
        if (amount >= numAmountMin && amount <= numAmountMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1;
      });
      zodiacs.forEach(z => {
        zodiacCount[z] = (zodiacCount[z] || 0) + 1;
        if (amount >= zodiacAmountMin && amount <= zodiacAmountMax) zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1;
        (config.zodiac[z] || []).forEach(n => {
          const num = n.padStart(2, '0');
          betData[num] = (betData[num] || 0) + amount;
        });
      });
    });
  });

  reportOrders.forEach(order => {
    order.content.split('\n').filter(l => l.trim()).forEach(line => {
      const { numbers, zodiacs, amount } = parseLine(line, config);
      numbers.forEach(num => {
        betData[num] = (betData[num] || 0) - amount;
        reportAmountData[num] = (reportAmountData[num] || 0) + amount;
      });
      zodiacs.forEach(z => {
        (config.zodiac[z] || []).forEach(n => {
          const num = n.padStart(2, '0');
          betData[num] = (betData[num] || 0) - amount;
          reportAmountData[num] = (reportAmountData[num] || 0) + amount;
        });
      });
    });
  });

  const list = [];
  for (let i = 1; i <= 49; i++) {
    const num = i.toString().padStart(2, '0');
    list.push({
      num,
      zodiac: currentZodiacMap[num] || '',
      bet: betData[num] || 0,
      numberCount: numberCount[num] || 0,
      numberAmountCount: numberAmountCount[num] || 0,
      reportAmount: reportAmountData[num] || 0
    });
  }
  list.sort((a, b) => b.bet - a.bet);
  const totalBet = list.reduce((s, i) => s + i.bet, 0);
  const rebate = (totalBet * rebateRate / 100).toFixed(2);
  const result = list.map((item, idx) => ({
    ...item,
    risk: Math.round(totalBet - item.bet * multiple - parseFloat(rebate)),
    rank: idx + 1
  }));

  const zodiacList = zodiacOrder.map(z => ({
    name: z,
    count: zodiacCount[z] || 0,
    amountCount: zodiacAmountCount[z] || 0
  }));

  res.json({
    list: result,
    totalBet,
    totalRebate: rebate,
    numberOrderTotal,
    zodiacWeightedTotal,
    zodiacList,
    reportAmountData
  });
});

// ========== 密码验证接口 ==========
app.post('/api/verify-password', authenticateToken, (req, res) => {
  const { type, password } = req.body;
  let valid = false;
  if (type === 'clear') valid = (password === CLEAR_PASSWORD);
  else if (type === 'editConfig') valid = (password === EDIT_CONFIG_PASSWORD);
  else if (type === 'yearZodiac') valid = (password === YEAR_ZODIAC_PASSWORD);
  else if (type === 'database') valid = (password === CLEAR_PASSWORD); // 数据库查看也用清空密码
  res.json({ valid });
});

// ========== 清空数据接口 ==========
app.post('/api/clear-data', authenticateToken, (req, res) => {
  const { password } = req.body;
  if (password !== CLEAR_PASSWORD) return res.status(403).json({ error: '密码错误' });
  if (req.user.role === 'admin') {
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM report_orders').run();
  } else {
    db.prepare('DELETE FROM orders WHERE created_by = ?').run(req.user.username);
    db.prepare('DELETE FROM report_orders WHERE created_by = ?').run(req.user.username);
  }
  res.json({ success: true });
});

// ========== 用户配置同步接口 ==========
app.get('/api/settings', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings WHERE owner = ?').all(req.user.username);
  const settings = {};
  rows.forEach(r => { settings[r.key] = JSON.parse(r.value); });
  res.json(settings);
});

app.post('/api/settings', authenticateToken, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: '缺少key' });
  const jsonValue = JSON.stringify(value);
  db.prepare('INSERT OR REPLACE INTO settings (owner, key, value) VALUES (?, ?, ?)').run(req.user.username, key, jsonValue);
  res.json({ success: true });
});

// ========== 静态文件 ==========
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
