const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CONFIG_PASSWORD = process.env.CONFIG_PASSWORD;
const ZODIAC_PASSWORD = process.env.ZODIAC_PASSWORD;

// 工具函数：解析路径
function parsePath(path) {
  const parts = path.replace('/.netlify/functions/api', '').replace('/api', '').split('/').filter(Boolean);
  return parts;
}

// 获取 JWT token
function getToken(event) {
  const auth = event.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function jsonResponse(data, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data)
  };
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function getBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

function generateCardCode() {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
}

// ========== 数据存储辅助函数（使用 Blobs） ==========

async function getBlobStore() {
  // 使用站点 ID 作为命名空间
  return getStore('hk-macau-data');
}

async function loadCollection(collectionName) {
  const store = await getBlobStore();
  try {
    const data = await store.get(collectionName);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveCollection(collectionName, data) {
  const store = await getBlobStore();
  await store.setJSON(collectionName, data);
}

// ============ 路由处理 ============

exports.handler = async (event) => {
  const path = parsePath(event.path);
  const route = path.join('/');
  const method = event.httpMethod;
  const body = await getBody(event);
  const token = getToken(event);
  const decoded = verifyToken(token);

  // 权限检查
  const requireAdmin = () => {
    if (!decoded || decoded.role !== 'admin') {
      return jsonResponse({ error: '无权限' }, 403);
    }
    return null;
  };

  const requireLogin = () => {
    if (!decoded) {
      return jsonResponse({ error: '请先登录' }, 401);
    }
    return null;
  };

  try {
    // 加载各个“集合”
    const users = await loadCollection('users');
    const cards = await loadCollection('cards');
    const config = await loadCollection('config'); // 配置对象，可能不是数组
    const orders = await loadCollection('orders');
    const reports = await loadCollection('reports');
    const recycleBin = await loadCollection('recycle_bin');

    // ==================== 登录/注册 ====================

    // 管理员登录
    if (route === 'admin-login' && method === 'POST') {
      const { account, password } = body;
      if (account === ADMIN_ACCOUNT && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return jsonResponse({ token, username: 'admin', role: 'admin' });
      }
      return errorResponse('账号或密码错误', 401);
    }

    // 用户注册（含卡密激活）
    if (route === 'auth-register' && method === 'POST') {
      const { username, password, card } = body;
      if (!username || !password || !card) return errorResponse('缺少参数');
      if (username === 'admin') return errorResponse('用户名不可用');

      if (users.find(u => u.username === username)) return errorResponse('用户名已存在');

      const cardDoc = cards.find(c => c.code === card && c.status === 'unused');
      if (!cardDoc) return errorResponse('卡密无效或已被使用');
      if (Date.now() > new Date(cardDoc.createdAt).getTime() + cardDoc.expireDays * 86400000) {
        return errorResponse('卡密已过期');
      }

      const hash = await bcrypt.hash(password, 10);
      users.push({
        username,
        passwordHash: hash,
        cardCode: card,
        cardStatus: 'active',
        createdAt: new Date().toISOString()
      });

      // 更新卡密状态
      const cardIndex = cards.indexOf(cardDoc);
      cards[cardIndex].status = 'used';
      cards[cardIndex].usedBy = username;
      cards[cardIndex].usedAt = new Date().toISOString();

      await saveCollection('users', users);
      await saveCollection('cards', cards);

      const userToken = jwt.sign({ role: 'user', username }, JWT_SECRET, { expiresIn: '7d' });
      return jsonResponse({ token: userToken, username, role: 'user' });
    }

    // 用户登录
    if (route === 'auth-login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) return errorResponse('缺少参数');
      if (username === 'admin') return errorResponse('请使用管理员登录');

      const user = users.find(u => u.username === username);
      if (!user) return errorResponse('用户名或密码错误', 401);

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return errorResponse('用户名或密码错误', 401);

      const cardDoc = cards.find(c => c.code === user.cardCode);
      if (cardDoc && cardDoc.status === 'disabled') {
        return jsonResponse({ error: 'card_disabled', message: '卡密已被禁用，请联系管理员' }, 403);
      }
      if (user.cardStatus === 'expired') {
        return jsonResponse({ error: 'card_expired', message: '卡密已过期', needReactivate: true }, 403);
      }

      const userToken = jwt.sign({ role: 'user', username }, JWT_SECRET, { expiresIn: '7d' });
      return jsonResponse({ token: userToken, username, role: 'user' });
    }

    // 卡密重新激活
    if (route === 'auth-reactivate' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { card } = body;
      if (!card) return errorResponse('缺少卡密');

      const username = decoded.username;
      const user = users.find(u => u.username === username);
      if (!user) return errorResponse('用户不存在');

      const newCard = cards.find(c => c.code === card && c.status === 'unused');
      if (!newCard) return errorResponse('卡密无效或已被使用');
      if (Date.now() > new Date(newCard.createdAt).getTime() + newCard.expireDays * 86400000) {
        return errorResponse('卡密已过期');
      }

      // 旧卡密标记为 replaced
      const oldCard = cards.find(c => c.code === user.cardCode);
      if (oldCard) oldCard.status = 'replaced';
      // 绑定新卡密
      user.cardCode = card;
      user.cardStatus = 'active';
      const newCardIndex = cards.indexOf(newCard);
      cards[newCardIndex].status = 'used';
      cards[newCardIndex].usedBy = username;
      cards[newCardIndex].usedAt = new Date().toISOString();

      await saveCollection('users', users);
      await saveCollection('cards', cards);

      return jsonResponse({ success: true });
    }

    // ==================== 卡密管理（管理员） ====================

    if (route === 'admin-generate-card' && method === 'POST') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { expireDays = 30 } = body;
      const code = generateCardCode();
      cards.push({ code, status: 'unused', createdAt: new Date().toISOString(), expireDays, usedBy: null });
      await saveCollection('cards', cards);
      return jsonResponse({ code });
    }

    if (route === 'admin-get-cards' && method === 'GET') {
      const perm = requireAdmin();
      if (perm) return perm;
      cards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return jsonResponse(cards);
    }

    if (route === 'admin-disable-card' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { code } = body;
      const cardDoc = cards.find(c => c.code === code);
      if (cardDoc) {
        cardDoc.status = 'disabled';
        if (cardDoc.usedBy) {
          const user = users.find(u => u.username === cardDoc.usedBy);
          if (user) user.cardStatus = 'disabled';
        }
      }
      await saveCollection('cards', cards);
      await saveCollection('users', users);
      return jsonResponse({ success: true });
    }

    if (route === 'admin-enable-card' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { code } = body;
      const cardDoc = cards.find(c => c.code === code);
      if (cardDoc) {
        const expired = Date.now() > new Date(cardDoc.createdAt).getTime() + cardDoc.expireDays * 86400000;
        cardDoc.status = expired ? 'expired' : (cardDoc.status === 'used' ? 'used' : 'unused');
        if (cardDoc.usedBy) {
          const user = users.find(u => u.username === cardDoc.usedBy);
          if (user) user.cardStatus = expired ? 'expired' : 'active';
        }
      }
      await saveCollection('cards', cards);
      await saveCollection('users', users);
      return jsonResponse({ success: true });
    }

    if (route === 'admin-delete-card' && method === 'DELETE') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { code } = body;
      const index = cards.findIndex(c => c.code === code);
      if (index !== -1) cards.splice(index, 1);
      await saveCollection('cards', cards);
      return jsonResponse({ success: true });
    }

    // ==================== 会员管理（管理员） ====================

    if (route === 'admin-get-users' && method === 'GET') {
      const perm = requireAdmin();
      if (perm) return perm;
      const result = users.filter(u => u.username !== 'admin').map(u => {
        const card = cards.find(c => c.code === u.cardCode);
        return {
          username: u.username,
          cardCode: u.cardCode,
          cardStatus: card ? card.status : 'unknown',
          expireDays: card ? card.expireDays : 0,
          createdAt: u.createdAt,
          cardCreatedAt: card ? card.createdAt : null
        };
      });
      return jsonResponse(result);
    }

    if (route === 'admin-disable-user' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { username } = body;
      const user = users.find(u => u.username === username);
      if (user) {
        user.cardStatus = 'disabled';
        const card = cards.find(c => c.code === user.cardCode);
        if (card) card.status = 'disabled';
      }
      await saveCollection('users', users);
      await saveCollection('cards', cards);
      return jsonResponse({ success: true });
    }

    if (route === 'admin-enable-user' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { username } = body;
      const user = users.find(u => u.username === username);
      if (user) {
        const card = cards.find(c => c.code === user.cardCode);
        const expired = card ? Date.now() > new Date(card.createdAt).getTime() + card.expireDays * 86400000 : false;
        user.cardStatus = expired ? 'expired' : 'active';
        if (card) card.status = expired ? 'expired' : 'used';
      }
      await saveCollection('users', users);
      await saveCollection('cards', cards);
      return jsonResponse({ success: true });
    }

    if (route === 'admin-delete-user' && method === 'DELETE') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { username } = body;
      const userIndex = users.findIndex(u => u.username === username);
      if (userIndex !== -1) {
        const user = users[userIndex];
        // 释放卡密
        const card = cards.find(c => c.code === user.cardCode);
        if (card) {
          card.status = 'unused';
          card.usedBy = null;
        }
        users.splice(userIndex, 1);
        // 删除该用户的订单和上报
        for (let i = orders.length - 1; i >= 0; i--) {
          if (orders[i].username === username) orders.splice(i, 1);
        }
        for (let i = reports.length - 1; i >= 0; i--) {
          if (reports[i].username === username) reports.splice(i, 1);
        }
      }
      await saveCollection('users', users);
      await saveCollection('cards', cards);
      await saveCollection('orders', orders);
      await saveCollection('reports', reports);
      return jsonResponse({ success: true });
    }

    // ==================== 配置管理 ====================

    if (route === 'config' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      return jsonResponse(config || {});
    }

    if (route === 'config' && method === 'PUT') {
      const perm = requireLogin();
      if (perm) return perm;
      const { password, data } = body;
      if (password !== CONFIG_PASSWORD) return errorResponse('密码错误', 403);
      await saveCollection('config', data);
      return jsonResponse({ success: true });
    }

    // ==================== 密码验证 ====================

    if (route === 'verify-password' && method === 'POST') {
      const { type, password } = body;
      if (type === 'config' && password === CONFIG_PASSWORD) return jsonResponse({ valid: true });
      if (type === 'zodiac' && password === ZODIAC_PASSWORD) return jsonResponse({ valid: true });
      if (type === 'admin' && password === ADMIN_PASSWORD) return jsonResponse({ valid: true });
      return jsonResponse({ valid: false });
    }

    // ==================== 订单解析（占位，后续补逻辑） ====================

    if (route === 'orders-parse' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      return jsonResponse({ lines: [] });
    }

    // ==================== 订单操作 ====================

    if (route === 'orders-save' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { content, user, date, totalAmount, region, rawContent } = body;
      const doc = {
        id: Date.now().toString(36) + crypto.randomBytes(4).toString('hex'),
        content,
        rawContent: rawContent || content,
        user: user || decoded.username,
        username: decoded.username,
        date: date || new Date().toISOString().slice(0, 10),
        totalAmount: totalAmount || 0,
        region: region || 'macau',
        timestamp: new Date().toISOString(),
        type: 'order'
      };
      orders.push(doc);
      await saveCollection('orders', orders);
      return jsonResponse({ success: true, id: doc.id });
    }

    if (route === 'orders-list' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      const { date, region, user } = event.queryStringParameters || {};
      let filtered = orders.slice();
      if (decoded.role !== 'admin') filtered = filtered.filter(o => o.username === decoded.username);
      if (date) filtered = filtered.filter(o => o.date === date);
      if (region) filtered = filtered.filter(o => o.region === region);
      if (user && decoded.role === 'admin') filtered = filtered.filter(o => o.user === user);
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return jsonResponse(filtered);
    }

    if (route === 'orders-delete' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const index = orders.findIndex(o => o.id === id);
      if (index === -1) return errorResponse('订单不存在');
      if (decoded.role !== 'admin' && orders[index].username !== decoded.username) return errorResponse('无权限', 403);
      const deletedOrder = orders.splice(index, 1)[0];
      recycleBin.push({ ...deletedOrder, deletedAt: new Date().toISOString() });
      await saveCollection('orders', orders);
      await saveCollection('recycle_bin', recycleBin);
      return jsonResponse({ success: true });
    }

    // ==================== 上报操作 ====================

    if (route === 'reports-save' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { content, user, date, totalAmount, region } = body;
      const doc = {
        id: Date.now().toString(36) + crypto.randomBytes(4).toString('hex'),
        content,
        user: user || decoded.username,
        username: decoded.username,
        date: date || new Date().toISOString().slice(0, 10),
        totalAmount: totalAmount || 0,
        region: region || 'macau',
        timestamp: new Date().toISOString(),
        type: 'report'
      };
      reports.push(doc);
      await saveCollection('reports', reports);
      return jsonResponse({ success: true, id: doc.id });
    }

    if (route === 'reports-list' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      const { date, region, user } = event.queryStringParameters || {};
      let filtered = reports.slice();
      if (decoded.role !== 'admin') filtered = filtered.filter(r => r.username === decoded.username);
      if (date) filtered = filtered.filter(r => r.date === date);
      if (region) filtered = filtered.filter(r => r.region === region);
      if (user && decoded.role === 'admin') filtered = filtered.filter(r => r.user === user);
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return jsonResponse(filtered);
    }

    if (route === 'reports-delete' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const index = reports.findIndex(r => r.id === id);
      if (index === -1) return errorResponse('上报记录不存在');
      if (decoded.role !== 'admin' && reports[index].username !== decoded.username) return errorResponse('无权限', 403);
      const deletedReport = reports.splice(index, 1)[0];
      recycleBin.push({ ...deletedReport, deletedAt: new Date().toISOString() });
      await saveCollection('reports', reports);
      await saveCollection('recycle_bin', recycleBin);
      return jsonResponse({ success: true });
    }

    // ==================== 统计数据（占位） ====================

    if (route === 'statistics' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      return jsonResponse({
        tableBetData: {},
        reportBetData: {},
        numberCount: {},
        zodiacCount: {},
        numberOrderTotal: 0,
        zodiacWeightedTotal: 0
      });
    }

    // ==================== 回收站 ====================

    if (route === 'recycle-list' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      let items = recycleBin.slice();
      if (decoded.role !== 'admin') items = items.filter(i => i.username === decoded.username);
      items.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      return jsonResponse(items);
    }

    if (route === 'recycle-restore' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const index = recycleBin.findIndex(r => r.id === id);
      if (index === -1) return errorResponse('记录不存在');
      const item = recycleBin[index];
      if (decoded.role !== 'admin' && item.username !== decoded.username) return errorResponse('无权限', 403);
      recycleBin.splice(index, 1);
      if (item.type === 'order') {
        delete item.deletedAt;
        orders.push(item);
        await saveCollection('orders', orders);
      } else {
        delete item.deletedAt;
        reports.push(item);
        await saveCollection('reports', reports);
      }
      await saveCollection('recycle_bin', recycleBin);
      return jsonResponse({ success: true });
    }

    if (route === 'recycle-delete' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const index = recycleBin.findIndex(r => r.id === id);
      if (index === -1) return errorResponse('记录不存在');
      if (decoded.role !== 'admin' && recycleBin[index].username !== decoded.username) return errorResponse('无权限', 403);
      recycleBin.splice(index, 1);
      await saveCollection('recycle_bin', recycleBin);
      return jsonResponse({ success: true });
    }

    if (route === 'recycle-clear' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { password } = body;
      if (password !== CONFIG_PASSWORD) return errorResponse('密码错误', 403);
      if (decoded.role === 'admin') {
        await saveCollection('recycle_bin', []);
      } else {
        const filtered = recycleBin.filter(i => i.username !== decoded.username);
        await saveCollection('recycle_bin', filtered);
      }
      return jsonResponse({ success: true });
    }

    return errorResponse('未知接口', 404);

  } catch (err) {
    console.error('API Error:', err);
    return errorResponse('服务器内部错误', 500);
  }
};
