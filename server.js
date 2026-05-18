const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_DEFAULT_PASSWORD = '150408';

const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');

// ========== 数据库初始化 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    activated INTEGER DEFAULT 0,
    activated_at TEXT,
    card_id INTEGER,
    can_manage_cards INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    code_hash TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    expire_days INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    creator TEXT DEFAULT 'admin',
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user TEXT NOT NULL,
    orderer TEXT DEFAULT '',
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS report_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user TEXT NOT NULL,
    orderer TEXT DEFAULT '',
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user, key)
  );

  CREATE TABLE IF NOT EXISTS card_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    detail TEXT DEFAULT '',
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS active_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 为已有表添加可能缺失的字段
try { db.exec('ALTER TABLE users ADD COLUMN can_manage_cards INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE cards ADD COLUMN code_hash TEXT DEFAULT \'\''); } catch(e) {}
try { db.exec('ALTER TABLE cards ADD COLUMN creator TEXT DEFAULT \'admin\''); } catch(e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN orderer TEXT DEFAULT \'\''); } catch(e) {}
try { db.exec('ALTER TABLE report_orders ADD COLUMN orderer TEXT DEFAULT \'\''); } catch(e) {}

// ========== 启动时清理过期令牌 ==========
db.prepare('DELETE FROM active_tokens WHERE expires_at < ?').run(new Date().toISOString());

// ========== 自动创建管理员账户 ==========
const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('17776192265');
if (!adminUser) {
  const hash = bcrypt.hashSync(ADMIN_DEFAULT_PASSWORD, 10);
  db.prepare('INSERT INTO users (username, password_hash, role, activated, created_at) VALUES (?, ?, ?, 1, ?)').run('17776192265', hash, 'admin', new Date().toISOString());
  console.log('管理员账户已创建: 17776192265');
}

// 修补已有卡密的哈希值（迁移）
const cardsWithoutHash = db.prepare('SELECT id, code FROM cards WHERE code_hash = \'\' OR code_hash IS NULL').all();
for (const c of cardsWithoutHash) {
  const hash = bcrypt.hashSync(c.code, 10);
  db.prepare('UPDATE cards SET code_hash = ? WHERE id = ?').run(hash, c.id);
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

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

function requireCardManagePermission(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && !req.user.canManageCards)) {
    return res.status(403).json({ error: '无卡密管理权限' });
  }
  next();
}

// ========== 激活码生成工具 ==========
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

// ========== 内置分类数据 ==========
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

let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

function mergeConfig(custom) {
  if (!custom) return currentConfig;
  const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  if (custom.weishu) merged.weishu = { ...DEFAULT_CONFIG.weishu, ...custom.weishu };
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

// ========== 密码验证接口 ==========
app.post('/api/auth/verify-password', authenticateToken, (req, res) => {
  const { password, action } = req.body;
  if (!password) return res.status(400).json({ error: '缺少密码' });
  let valid = false;
  if (action === 'editConfig' || action === 'resetData' || action === 'showDatabase') {
    valid = (password === '891105');
  } else if (action === 'changeZodiac') {
    valid = (password === '150408');
  } else {
    return res.status(400).json({ error: '未知操作' });
  }
  if (valid) res.json({ valid: true });
  else res.status(403).json({ error: '密码错误' });
});

// ========== 用户认证 API ==========
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
  if (!username || !cardCode) return res.status(400).json({ error: '请填写完整信息' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ error: '用户不存在' });
  if (user.activated === 1) {
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(user.card_id);
    if (card) {
      const activatedAt = new Date(user.activated_at).getTime();
      const expireMs = card.expire_days * 86400000;
      if (Date.now() < activatedAt + expireMs) {
        return res.status(400).json({ error: '账号已激活且在有效期内' });
      }
    }
  }
  const activeCards = db.prepare('SELECT * FROM cards WHERE status = ?').all('active');
  let matchedCard = null;
  for (const c of activeCards) {
    if (bcrypt.compareSync(cardCode, c.code_hash)) {
      matchedCard = c;
      break;
    }
  }
  if (!matchedCard) {
    return res.status(400).json({ error: '激活码无效' });
  }
  const cardCreated = new Date(matchedCard.created_at).getTime();
  const cardExpireMs = matchedCard.expire_days * 86400000;
  if (Date.now() > cardCreated + cardExpireMs) {
    db.prepare('UPDATE cards SET status = ? WHERE id = ?').run('expired', matchedCard.id);
    return res.status(400).json({ error: '激活码已过期' });
  }
  const nowISO = new Date().toISOString();
  db.prepare('UPDATE users SET activated = 1, activated_at = ?, card_id = ? WHERE id = ?').run(nowISO, matchedCard.id, user.id);
  db.prepare('UPDATE cards SET status = ?, user_id = ? WHERE id = ?').run('used', user.id, matchedCard.id);
  res.json({ success: true, message: '激活成功，请登录' });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (user.activated === 0 && user.role !== 'admin') {
    return res.status(403).json({ error: '账号未激活', needActivation: true });
  }
  if (user.activated === 2) {
    return res.status(403).json({ error: '账号已被禁用' });
  }
  if (user.role !== 'admin' && user.activated === 1 && user.card_id) {
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(user.card_id);
    if (card) {
      const activatedAt = new Date(user.activated_at).getTime();
      const expireMs = card.expire_days * 86400000;
      if (Date.now() > activatedAt + expireMs) {
        db.prepare('UPDATE users SET activated = 2 WHERE id = ?').run(user.id);
        return res.status(403).json({ error: '激活已过期，请重新激活', needActivation: true });
      }
    }
  }

  // 设备限制检查（管理员除外）
  if (user.role !== 'admin') {
    // 清理该用户过期令牌
    db.prepare('DELETE FROM active_tokens WHERE username = ? AND expires_at < ?').run(username, new Date().toISOString());
    const activeCount = db.prepare('SELECT COUNT(*) as count FROM active_tokens WHERE username = ?').get(username).count;
    let maxDevices = 2;
    // 判断用户类型
    const isDirectCreate = (user.card_id === null);
    if (isDirectCreate) maxDevices = 5;
    if (activeCount >= maxDevices) {
      return res.status(403).json({ error: `已在${activeCount}台设备上登录，最多允许${maxDevices}台，请先退出其他设备` });
    }
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, canManageCards: user.can_manage_cards },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // 记录活跃令牌
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO active_tokens (username, token, expires_at, created_at) VALUES (?, ?, ?, ?)').run(username, token, expiresAt, new Date().toISOString());

  res.json({ token, username: user.username, role: user.role, canManageCards: user.can_manage_cards });
});

// ========== 退出登录 ==========
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    db.prepare('DELETE FROM active_tokens WHERE token = ?').run(token);
  }
  res.json({ success: true });
});

// ========== 修改密码（仅管理员） ==========
app.post('/api/auth/change-password', authenticateToken, requireAdmin, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: '请填写完整信息' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(403).json({ error: '原密码错误' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  res.json({ success: true, message: '密码修改成功' });
});

// ========== 卡密管理（管理员和子账户） ==========
app.post('/api/cards/generate', authenticateToken, requireCardManagePermission, (req, res) => {
  const { expireDays } = req.body;
  if (!expireDays || expireDays < 1) return res.status(400).json({ error: '有效期至少1天' });
  const code = generateActivationCode();
  const codeHash = bcrypt.hashSync(code, 10);
  const creator = req.user.role === 'admin' ? 'admin' : req.user.username;
  db.prepare('INSERT INTO cards (code, code_hash, status, expire_days, created_at, creator) VALUES (?, ?, ?, ?, ?, ?)').run(code, codeHash, 'active', expireDays, new Date().toISOString(), creator);
  db.prepare('INSERT INTO card_logs (operator, action, target, detail, timestamp) VALUES (?, ?, ?, ?, ?)').run(req.user.username, '生成', code, `有效期${expireDays}天`, new Date().toISOString());
  res.json({ success: true, code });
});

app.get('/api/cards', authenticateToken, requireCardManagePermission, (req, res) => {
  const now = Date.now();
  let cards;
  if (req.user.role === 'admin') {
    cards = db.prepare(`SELECT cards.*, users.username, users.activated_at FROM cards LEFT JOIN users ON cards.user_id = users.id ORDER BY cards.created_at DESC`).all();
  } else {
    cards = db.prepare(`SELECT cards.*, users.username, users.activated_at FROM cards LEFT JOIN users ON cards.user_id = users.id WHERE cards.creator = ? ORDER BY cards.created_at DESC`).all(req.user.username);
  }
  const safeCards = cards.map(c => {
    const createdTime = new Date(c.created_at).getTime();
    const expireMs = c.expire_days * 86400000;
    const expireTime = createdTime + expireMs;
    const expired = now > expireTime;
    const daysRemaining = Math.ceil((expireTime - now) / 86400000);
    let activationStatus = '';
    let activatedDate = '';
    if (c.status === 'used' && c.username) {
      activationStatus = '已激活';
      activatedDate = c.activated_at ? new Date(c.activated_at).toLocaleDateString('zh-CN') : '';
    }
    return {
      id: c.id,
      code: c.code,
      status: c.status,
      expire_days: c.expire_days,
      created_at: c.created_at,
      creator: c.creator,
      username: c.username || null,
      expired: expired,
      days_remaining: daysRemaining,
      activation_status: activationStatus,
      activated_date: activatedDate
    };
  });
  res.json(safeCards);
});

app.post('/api/cards/:id/disable', authenticateToken, requireCardManagePermission, (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: '卡密不存在' });
  if (req.user.role !== 'admin' && card.creator !== req.user.username) {
    return res.status(403).json({ error: '无权操作此卡密' });
  }
  db.prepare('UPDATE cards SET status = ? WHERE id = ?').run('disabled', req.params.id);
  db.prepare('INSERT INTO card_logs (operator, action, target, timestamp) VALUES (?, ?, ?, ?)').run(req.user.username, '禁用', card.code, new Date().toISOString());
  res.json({ success: true });
});

app.delete('/api/cards/:id', authenticateToken, requireCardManagePermission, (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: '卡密不存在' });
  if (req.user.role !== 'admin' && card.creator !== req.user.username) {
    return res.status(403).json({ error: '无权操作此卡密' });
  }
  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  db.prepare('INSERT INTO card_logs (operator, action, target, timestamp) VALUES (?, ?, ?, ?)').run(req.user.username, '删除', card.code, new Date().toISOString());
  res.json({ success: true });
});

// ========== 卡密操作日志 ==========
app.get('/api/cards/logs', authenticateToken, requireCardManagePermission, (req, res) => {
  let logs;
  if (req.user.role === 'admin') {
    logs = db.prepare('SELECT * FROM card_logs ORDER BY timestamp DESC').all();
  } else {
    logs = db.prepare('SELECT * FROM card_logs WHERE operator = ? ORDER BY timestamp DESC').all(req.user.username);
  }
  res.json(logs);
});

app.delete('/api/cards/logs/:id', authenticateToken, requireCardManagePermission, (req, res) => {
  const log = db.prepare('SELECT * FROM card_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: '日志不存在' });
  if (req.user.role !== 'admin' && log.operator !== req.user.username) {
    return res.status(403).json({ error: '无权操作此日志' });
  }
  db.prepare('DELETE FROM card_logs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/cards/logs/clear', authenticateToken, requireCardManagePermission, (req, res) => {
  if (req.user.role === 'admin') {
    db.prepare('DELETE FROM card_logs').run();
  } else {
    db.prepare('DELETE FROM card_logs WHERE operator = ?').run(req.user.username);
  }
  res.json({ success: true });
});

// ========== 管理员账户管理 ==========
app.get('/api/admin/accounts', authenticateToken, requireAdmin, (req, res) => {
  const accounts = db.prepare(`
    SELECT u.id, u.username, u.activated, u.can_manage_cards, u.created_at, u.card_id,
           c.code AS card_code, c.expire_days, c.created_at AS card_created_at
    FROM users u
    LEFT JOIN cards c ON u.card_id = c.id
    WHERE u.role = ? AND u.username != ?
  `).all('user', '17776192265');
  const now = Date.now();
  const result = accounts.map(a => {
    let userType = '高级用户';
    if (a.card_id) {
      userType = '普通用户';
    }
    let cardExpired = false;
    if (a.card_created_at && a.expire_days) {
      const expireTime = new Date(a.card_created_at).getTime() + a.expire_days * 86400000;
      cardExpired = now > expireTime;
    }
    return {
      id: a.id,
      username: a.username,
      activated: a.activated,
      can_manage_cards: a.can_manage_cards,
      created_at: a.created_at,
      user_type: userType,
      card_code: a.card_code || null,
      card_expired: cardExpired
    };
  });
  res.json(result);
});

app.post('/api/admin/create-account', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, canManageCards } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: '用户名已存在' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password_hash, role, activated, can_manage_cards, created_at) VALUES (?, ?, ?, 1, ?, ?)').run(username, hash, 'user', canManageCards ? 1 : 0, new Date().toISOString());
  res.json({ success: true, message: '创建成功' });
});

app.post('/api/admin/accounts/:id/toggle-status', authenticateToken, requireAdmin, (req, res) => {
  const { activated } = req.body;
  db.prepare('UPDATE users SET activated = ? WHERE id = ?').run(activated, req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/accounts/:id/toggle-card-perm', authenticateToken, requireAdmin, (req, res) => {
  const { canManageCards } = req.body;
  db.prepare('UPDATE users SET can_manage_cards = ? WHERE id = ?').run(canManageCards, req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/accounts/:id', authenticateToken, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'admin') return res.status(403).json({ error: '不能删除管理员' });
  db.prepare('DELETE FROM orders WHERE user = ?').run(user.username);
  db.prepare('DELETE FROM report_orders WHERE user = ?').run(user.username);
  db.prepare('DELETE FROM user_settings WHERE user = ?').run(user.username);
  db.prepare('DELETE FROM cards WHERE creator = ?').run(user.username);
  db.prepare('DELETE FROM active_tokens WHERE username = ?').run(user.username);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ========== 订单 API ==========
app.get('/api/orders', authenticateToken, (req, res) => {
  const { date } = req.query;
  let rows;
  if (req.user.role === 'admin') {
    rows = date ? db.prepare('SELECT * FROM orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM orders').all();
  } else {
    rows = date ? db.prepare('SELECT * FROM orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM orders WHERE user = ?').all(req.user.username);
  }
  res.json(rows);
});

app.post('/api/orders', authenticateToken, (req, res) => {
  const { content, orderer, date, totalAmount } = req.body;
  const user = req.user.username;
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO orders (content, user, orderer, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(content, user, orderer || '', date, totalAmount || 0, timestamp);
  res.json({ success: true });
});

app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT user FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (req.user.role !== 'admin' && order.user !== req.user.username) {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: '请选择订单' });
  const placeholders = ids.map(() => '?').join(',');
  const orders = db.prepare(`SELECT id, user FROM orders WHERE id IN (${placeholders})`).all(...ids);
  for (const order of orders) {
    if (req.user.role !== 'admin' && order.user !== req.user.username) {
      return res.status(403).json({ error: '无权删除' });
    }
  }
  const del = db.prepare('DELETE FROM orders WHERE id = ?');
  const transaction = db.transaction(() => { ids.forEach(id => del.run(id)); });
  transaction();
  res.json({ success: true });
});

app.get('/api/report-orders', authenticateToken, (req, res) => {
  const { date } = req.query;
  let rows;
  if (req.user.role === 'admin') {
    rows = date ? db.prepare('SELECT * FROM report_orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM report_orders').all();
  } else {
    rows = date ? db.prepare('SELECT * FROM report_orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM report_orders WHERE user = ?').all(req.user.username);
  }
  res.json(rows);
});

app.post('/api/report-orders', authenticateToken, (req, res) => {
  const { content, orderer, date, totalAmount } = req.body;
  const user = req.user.username;
  const timestamp = new Date().toISOString();
  db.prepare('INSERT INTO report_orders (content, user, orderer, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(content, user, orderer || '', date, totalAmount || 0, timestamp);
  res.json({ success: true });
});

app.delete('/api/report-orders/:id', authenticateToken, (req, res) => {
  const order = db.prepare('SELECT user FROM report_orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (req.user.role !== 'admin' && order.user !== req.user.username) {
    return res.status(403).json({ error: '无权删除' });
  }
  db.prepare('DELETE FROM report_orders WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/report-orders/batch-delete', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: '请选择订单' });
  const placeholders = ids.map(() => '?').join(',');
  const orders = db.prepare(`SELECT id, user FROM report_orders WHERE id IN (${placeholders})`).all(...ids);
  for (const order of orders) {
    if (req.user.role !== 'admin' && order.user !== req.user.username) {
      return res.status(403).json({ error: '无权删除' });
    }
  }
  const del = db.prepare('DELETE FROM report_orders WHERE id = ?');
  const transaction = db.transaction(() => { ids.forEach(id => del.run(id)); });
  transaction();
  res.json({ success: true });
});

// ========== 识别接口 ==========
app.post('/api/recognize', authenticateToken, (req, res) => {
  try {
    const { text, config: customConfig } = req.body;
    if (!text) return res.json({ result: '' });
    const config = mergeConfig(customConfig || {});
    const lines = text.split('\n');
    const resultLines = [];
    const HARD_AMP_LIST = ['各','各号','号','个','=','各数','每数','每号','个号','每个号','各码','各号码'];
    const AMP_ORIGINAL = '(?:' + HARD_AMP_LIST.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')';
    const allPre = ['奥特','特码','澳门特码','特','奥','澳','澳门','澳門','澳門特碼','澳门特码','澳門特码',':','。','.','新',',','新','新奥','门','，','新澳','新特','新澳特','特碼'];
    const ZODIAC_SET = new Set(Object.keys(config.zodiac));
    const vc = getAllValidCategories(config);

    function cn2n(s) {
      const m={'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100,'千':1000};
      let sum=0,tmp=0;
      for(let c of s) {
        const v=m[c];
        if(v===10||v===100||v===1000) { if(tmp===0)tmp=1; tmp*=v; sum+=tmp; tmp=0; }
        else if(v!==undefined) { if(tmp>0){sum+=tmp;tmp=0;} tmp=v; }
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
        else if (/^[\u4e00-\u9fa5]+$/.test(t)) { const cs = t.match(/[\u4e00-\u9fa5]/g) || []; if (cs.every(c => vc.has(c))) res.push(...cs); }
      });
      return res.join('-');
    }

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
      while (cl && !/^[\d\u4e00-\u9fa5]/.test(cl)) cl = cl.substring(1).trim();
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
          if (sm) { let num = sm[1].trim(); if (parseInt(num) >= 1 && parseInt(num) <= 49) { num = num.length === 1 ? `0${num}` : num; resultLines.push(`${num} 各数 ${sm[2]}`); } }
          else { const jo = tokenizeAndJoin(cl); if (jo) resultLines.push(`${jo} 各数 0`); }
        }
      }
    });
    res.json({ result: resultLines.join('\n') });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ========== 风险计算 ==========
app.post('/api/calculate', authenticateToken, (req, res) => {
  try {
    const { date, config: customConfig, rebateRate = 4, multiple = 47 } = req.body;
    const config = mergeConfig(customConfig || {});
    let orders, reportOrders;
    if (req.user.role === 'admin') {
      orders = date ? db.prepare('SELECT * FROM orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM orders').all();
      reportOrders = date ? db.prepare('SELECT * FROM report_orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM report_orders').all();
    } else {
      orders = date ? db.prepare('SELECT * FROM orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM orders WHERE user = ?').all(req.user.username);
      reportOrders = date ? db.prepare('SELECT * FROM report_orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM report_orders WHERE user = ?').all(req.user.username);
    }
    const betData = {};
    const reportAmountData = {};
    for (const order of orders) {
      const lines = order.content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const { numbers, zodiacs, amount } = parseLine(line, config);
        numbers.forEach(num => { betData[num] = (betData[num] || 0) + amount; });
        zodiacs.forEach(z => {
          (config.zodiac[z] || []).forEach(n => { const num = n.padStart(2, '0'); betData[num] = (betData[num] || 0) + amount; });
        });
      }
    }
    for (const order of reportOrders) {
      const lines = order.content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const { numbers, zodiacs, amount } = parseLine(line, config);
        numbers.forEach(num => { reportAmountData[num] = (reportAmountData[num] || 0) + amount; });
        zodiacs.forEach(z => {
          (config.zodiac[z] || []).forEach(n => { const num = n.padStart(2, '0'); reportAmountData[num] = (reportAmountData[num] || 0) + amount; });
        });
      }
    }
    const list = [];
    for (let i = 1; i <= 49; i++) { const num = i.toString().padStart(2, '0'); list.push({ num, bet: betData[num] || 0 }); }
    list.sort((a, b) => b.bet - a.bet);
    const totalBet = list.reduce((s, i) => s + i.bet, 0);
    const rebate = (totalBet * rebateRate / 100).toFixed(2);
    const result = list.map((item, idx) => ({ num: item.num, bet: item.bet, risk: Math.round(totalBet - item.bet * multiple - parseFloat(rebate)), rank: idx + 1 }));
    res.json({ list: result, totalBet, totalRebate: rebate, reportAmountData });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ========== 频率统计接口 ==========
app.post('/api/frequency', authenticateToken, (req, res) => {
  try {
    const { date, config: customConfig, amountMin, amountMax, zodiacAmountMin, zodiacAmountMax } = req.body;
    const config = mergeConfig(customConfig || {});
    const nMin = parseInt(amountMin) || 1; const nMax = parseInt(amountMax) || 50000;
    const zMin = parseInt(zodiacAmountMin) || 1; const zMax = parseInt(zodiacAmountMax) || 50000;
    let orders;
    if (req.user.role === 'admin') { orders = date ? db.prepare('SELECT * FROM orders WHERE date = ?').all(date) : db.prepare('SELECT * FROM orders').all(); }
    else { orders = date ? db.prepare('SELECT * FROM orders WHERE date = ? AND user = ?').all(date, req.user.username) : db.prepare('SELECT * FROM orders WHERE user = ?').all(req.user.username); }
    const numberCount = {}, zodiacCount = {}, numberAmountCount = {}, zodiacAmountCount = {};
    for (const order of orders) {
      const lines = order.content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const { numbers, zodiacs, amount } = parseLine(line, config);
        numbers.forEach(num => { numberCount[num] = (numberCount[num] || 0) + 1; if (amount >= nMin && amount <= nMax) numberAmountCount[num] = (numberAmountCount[num] || 0) + 1; });
        zodiacs.forEach(z => { zodiacCount[z] = (zodiacCount[z] || 0) + 1; if (amount >= zMin && amount <= zMax) zodiacAmountCount[z] = (zodiacAmountCount[z] || 0) + 1; });
      }
    }
    res.json({ numberCount, zodiacCount, numberAmountCount, zodiacAmountCount });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ========== 对奖高亮接口 ==========
app.post('/api/highlight', authenticateToken, (req, res) => {
  try {
    const { content, targetNum, config: customConfig } = req.body;
    if (!content || !targetNum) return res.json({ highlighted: content });
    const config = mergeConfig(customConfig || {});
    const t = targetNum.toString().padStart(2, '0');
    function highlightParts(contStr) {
      const parts = []; let tmp = '';
      for (const ch of contStr) { if (ch === '-' || ch === ' ') { if (tmp) parts.push(tmp); parts.push(ch); tmp = ''; } else { tmp += ch; } }
      if (tmp) parts.push(tmp);
      return parts.map(p => {
        if (p === '-' || p === ' ') return p;
        let isMatch = false;
        if (/^\d{1,2}$/.test(p)) { isMatch = p.padStart(2, '0') === t; }
        else { const nums = getNumberListForCategory(p, config); isMatch = nums.includes(t); }
        return isMatch ? `<span class="highlight-number">${p}</span>` : p;
      }).join('');
    }
    const lines = content.split('\n');
    const highlightedLines = lines.map(line => { const m = line.match(/^(.+?)\s+各数\s+(\d+)$/); if (m) { return highlightParts(m[1]) + ` 各数 ${m[2]}`; } else { return highlightParts(line); } });
    res.json({ highlighted: highlightedLines.join('\n') });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ========== 用户配置 API ==========
app.get('/api/settings', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM user_settings WHERE user = ?').all(req.user.username);
  const settings = {};
  rows.forEach(row => { try { settings[row.key] = JSON.parse(row.value); } catch (e) { settings[row.key] = row.value; } });
  res.json(settings);
});
app.post('/api/settings', authenticateToken, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: '缺少 key' });
  const valStr = typeof value === 'string' ? value : JSON.stringify(value);
  const existing = db.prepare('SELECT id FROM user_settings WHERE user = ? AND key = ?').get(req.user.username, key);
  if (existing) { db.prepare('UPDATE user_settings SET value = ? WHERE user = ? AND key = ?').run(valStr, req.user.username, key); }
  else { db.prepare('INSERT INTO user_settings (user, key, value) VALUES (?, ?, ?)').run(req.user.username, key, valStr); }
  res.json({ success: true });
});

// ========== 导出导入 API ==========
app.get('/api/export', authenticateToken, (req, res) => {
  let orders, reportOrders;
  if (req.user.role === 'admin') { orders = db.prepare('SELECT * FROM orders').all(); reportOrders = db.prepare('SELECT * FROM report_orders').all(); }
  else { orders = db.prepare('SELECT * FROM orders WHERE user = ?').all(req.user.username); reportOrders = db.prepare('SELECT * FROM report_orders WHERE user = ?').all(req.user.username); }
  const settings = db.prepare('SELECT key, value FROM user_settings WHERE user = ?').all(req.user.username);
  const config = {};
  settings.forEach(s => { try { config[s.key] = JSON.parse(s.value); } catch(e) { config[s.key] = s.value; } });
  res.json({ orders, reportOrders, config, exportTime: new Date().toISOString() });
});
app.post('/api/import', authenticateToken, (req, res) => {
  const { orders, reportOrders, config } = req.body;
  if (!orders && !reportOrders) return res.status(400).json({ error: '无有效数据' });
  const insertOrder = db.prepare('INSERT OR IGNORE INTO orders (content, user, orderer, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
  const insertReport = db.prepare('INSERT OR IGNORE INTO report_orders (content, user, orderer, date, totalAmount, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
  const transaction = db.transaction(() => {
    if (orders) orders.forEach(o => insertOrder.run(o.content, o.user || req.user.username, o.orderer || '', o.date, o.totalAmount || 0, o.timestamp));
    if (reportOrders) reportOrders.forEach(o => insertReport.run(o.content, o.user || req.user.username, o.orderer || '', o.date, o.totalAmount || 0, o.timestamp));
    if (config) {
      for (const key in config) {
        const val = typeof config[key] === 'string' ? config[key] : JSON.stringify(config[key]);
        const existing = db.prepare('SELECT id FROM user_settings WHERE user = ? AND key = ?').get(req.user.username, key);
        if (existing) db.prepare('UPDATE user_settings SET value = ? WHERE user = ? AND key = ?').run(val, req.user.username, key);
        else db.prepare('INSERT INTO user_settings (user, key, value) VALUES (?, ?, ?)').run(req.user.username, key, val);
      }
    }
  });
  transaction();
  res.json({ success: true });
});

// ========== 清空 API ==========
app.post('/api/reset', authenticateToken, (req, res) => {
  if (req.user.role === 'admin') { db.prepare('DELETE FROM orders').run(); db.prepare('DELETE FROM report_orders').run(); }
  else { db.prepare('DELETE FROM orders WHERE user = ?').run(req.user.username); db.prepare('DELETE FROM report_orders WHERE user = ?').run(req.user.username); }
  res.json({ success: true });
});

app.post('/api/config', authenticateToken, (req, res) => { currentConfig = mergeConfig(req.body); res.json({ success: true }); });
app.get('/api/config', authenticateToken, (req, res) => { res.json(currentConfig); });

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
