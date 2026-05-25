const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { connectDB } = require('./utils/db');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CONFIG_PASSWORD = process.env.CONFIG_PASSWORD;
const ZODIAC_PASSWORD = process.env.ZODIAC_PASSWORD;

// ============ 工具函数 ============

function parsePath(path) {
  // path 格式: /.netlify/functions/api/something 或 /api/something
  const parts = path.replace('/.netlify/functions/api', '').replace('/api', '').split('/').filter(Boolean);
  return parts;
}

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

// ============ 路由处理 ============

exports.handler = async (event) => {
  const path = parsePath(event.path);
  const route = path.join('/');
  const method = event.httpMethod;
  const body = await getBody(event);
  const token = getToken(event);
  const decoded = verifyToken(token);

  // 管理员权限检查
  const requireAdmin = () => {
    if (!decoded || decoded.role !== 'admin') {
      return { statusCode: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: '无权限' }) };
    }
    return null;
  };

  // 登录权限检查
  const requireLogin = () => {
    if (!decoded) {
      return { statusCode: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: '请先登录' }) };
    }
    return null;
  };

  try {
    const db = await connectDB();
    const usersCol = db.collection('users');
    const cardsCol = db.collection('cards');
    const configCol = db.collection('config');
    const ordersCol = db.collection('orders');
    const reportsCol = db.collection('reports');
    const recycleCol = db.collection('recycle_bin');

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

      // 检查用户名
      const existUser = await usersCol.findOne({ username });
      if (existUser) return errorResponse('用户名已存在');

      // 检查卡密
      const cardDoc = await cardsCol.findOne({ code: card, status: 'unused' });
      if (!cardDoc) return errorResponse('卡密无效或已被使用');
      if (Date.now() > new Date(cardDoc.createdAt).getTime() + cardDoc.expireDays * 86400000) {
        return errorResponse('卡密已过期');
      }

      // 创建用户
      const hash = await bcrypt.hash(password, 10);
      await usersCol.insertOne({
        username,
        passwordHash: hash,
        cardCode: card,
        cardStatus: 'active',
        createdAt: new Date()
      });

      // 标记卡密已使用
      await cardsCol.updateOne({ code: card }, { $set: { status: 'used', usedBy: username, usedAt: new Date() } });

      const userToken = jwt.sign({ role: 'user', username }, JWT_SECRET, { expiresIn: '7d' });
      return jsonResponse({ token: userToken, username, role: 'user' });
    }

    // 用户登录
    if (route === 'auth-login' && method === 'POST') {
      const { username, password } = body;
      if (!username || !password) return errorResponse('缺少参数');
      if (username === 'admin') return errorResponse('请使用管理员登录');

      const user = await usersCol.findOne({ username });
      if (!user) return errorResponse('用户名或密码错误', 401);

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return errorResponse('用户名或密码错误', 401);

      // 检查卡密状态
      const cardDoc = await cardsCol.findOne({ code: user.cardCode });
      if (cardDoc && cardDoc.status === 'disabled') {
        return jsonResponse({ error: 'card_disabled', message: '卡密已被禁用，请联系管理员' }, 403);
      }
      if (user.cardStatus === 'expired') {
        return jsonResponse({ error: 'card_expired', message: '卡密已过期', needReactivate: true }, 403);
      }

      const userToken = jwt.sign({ role: 'user', username }, JWT_SECRET, { expiresIn: '7d' });
      return jsonResponse({ token: userToken, username, role: 'user' });
    }

    // 卡密重新激活（过期续期）
    if (route === 'auth-reactivate' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { card } = body;
      if (!card) return errorResponse('缺少卡密');

      const username = decoded.username;
      const user = await usersCol.findOne({ username });
      if (!user) return errorResponse('用户不存在');

      // 检查新卡密
      const newCard = await cardsCol.findOne({ code: card, status: 'unused' });
      if (!newCard) return errorResponse('卡密无效或已被使用');
      if (Date.now() > new Date(newCard.createdAt).getTime() + newCard.expireDays * 86400000) {
        return errorResponse('卡密已过期');
      }

      // 释放旧卡密（可选：标记为 replaced）
      await cardsCol.updateOne({ code: user.cardCode }, { $set: { status: 'replaced' } });

      // 绑定新卡密
      await usersCol.updateOne({ username }, { $set: { cardCode: card, cardStatus: 'active' } });
      await cardsCol.updateOne({ code: card }, { $set: { status: 'used', usedBy: username, usedAt: new Date() } });

      return jsonResponse({ success: true });
    }

    // ==================== 卡密管理（管理员） ====================

    if (route === 'admin-generate-card' && method === 'POST') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { expireDays = 30 } = body;
      const code = generateCardCode();
      await cardsCol.insertOne({ code, status: 'unused', createdAt: new Date(), expireDays, usedBy: null });
      return jsonResponse({ code });
    }

    if (route === 'admin-get-cards' && method === 'GET') {
      const perm = requireAdmin();
      if (perm) return perm;
      const cards = await cardsCol.find().sort({ createdAt: -1 }).toArray();
      return jsonResponse(cards);
    }

    if (route === 'admin-disable-card' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { code } = body;
      await cardsCol.updateOne({ code }, { $set: { status: 'disabled' } });
      // 同步禁用对应用户
      const cardDoc = await cardsCol.findOne({ code });
      if (cardDoc && cardDoc.usedBy) {
        await usersCol.updateOne({ username: cardDoc.usedBy }, { $set: { cardStatus: 'disabled' } });
      }
      return jsonResponse({ success: true });
    }

    if (route === 'admin-enable-card' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { code } = body;
      const cardDoc = await cardsCol.findOne({ code });
      if (cardDoc) {
        // 如果是已使用的卡密，检查过期
        if (cardDoc.status === 'used') {
          const expired = Date.now() > new Date(cardDoc.createdAt).getTime() + cardDoc.expireDays * 86400000;
          await cardsCol.updateOne({ code }, { $set: { status: expired ? 'expired' : 'used' } });
          if (cardDoc.usedBy) {
            await usersCol.updateOne({ username: cardDoc.usedBy }, { $set: { cardStatus: expired ? 'expired' : 'active' } });
          }
        } else {
          await cardsCol.updateOne({ code }, { $set: { status: 'unused' } });
        }
      }
      return jsonResponse({ success: true });
    }

    if (route === 'admin-delete-card' && method === 'DELETE') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { code } = body;
      await cardsCol.deleteOne({ code });
      return jsonResponse({ success: true });
    }

    // ==================== 会员管理（管理员） ====================

    if (route === 'admin-get-users' && method === 'GET') {
      const perm = requireAdmin();
      if (perm) return perm;
      const users = await usersCol.find({ username: { $ne: 'admin' } }).toArray();
      const result = await Promise.all(users.map(async (u) => {
        const card = await cardsCol.findOne({ code: u.cardCode });
        return {
          username: u.username,
          cardCode: u.cardCode,
          cardStatus: card ? card.status : 'unknown',
          expireDays: card ? card.expireDays : 0,
          createdAt: u.createdAt,
          cardCreatedAt: card ? card.createdAt : null
        };
      }));
      return jsonResponse(result);
    }

    if (route === 'admin-disable-user' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { username } = body;
      const user = await usersCol.findOne({ username });
      if (user) {
        await usersCol.updateOne({ username }, { $set: { cardStatus: 'disabled' } });
        await cardsCol.updateOne({ code: user.cardCode }, { $set: { status: 'disabled' } });
      }
      return jsonResponse({ success: true });
    }

    if (route === 'admin-enable-user' && method === 'PUT') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { username } = body;
      const user = await usersCol.findOne({ username });
      if (user) {
        const cardDoc = await cardsCol.findOne({ code: user.cardCode });
        const expired = cardDoc ? Date.now() > new Date(cardDoc.createdAt).getTime() + cardDoc.expireDays * 86400000 : false;
        await usersCol.updateOne({ username }, { $set: { cardStatus: expired ? 'expired' : 'active' } });
        if (cardDoc) {
          await cardsCol.updateOne({ code: user.cardCode }, { $set: { status: expired ? 'expired' : 'used' } });
        }
      }
      return jsonResponse({ success: true });
    }

    if (route === 'admin-delete-user' && method === 'DELETE') {
      const perm = requireAdmin();
      if (perm) return perm;
      const { username } = body;
      const user = await usersCol.findOne({ username });
      if (user) {
        await cardsCol.updateOne({ code: user.cardCode }, { $set: { status: 'unused', usedBy: null } });
        await usersCol.deleteOne({ username });
        // 同时删除该用户的所有订单和上报
        await ordersCol.deleteMany({ username });
        await reportsCol.deleteMany({ username });
      }
      return jsonResponse({ success: true });
    }

    // ==================== 配置管理 ====================

    if (route === 'config' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      const config = await configCol.findOne({ _id: 'global' });
      return jsonResponse(config ? config.data : {});
    }

    if (route === 'config' && method === 'PUT') {
      const perm = requireLogin();
      if (perm) return perm;
      const { password, data } = body;
      if (password !== CONFIG_PASSWORD) return errorResponse('密码错误', 403);
      await configCol.updateOne({ _id: 'global' }, { $set: { data, updatedAt: new Date() } }, { upsert: true });
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

    // ==================== 订单解析 ====================

    if (route === 'orders-parse' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      // 这个接口只是占位，实际解析逻辑后续补上
      return jsonResponse({ lines: [] });
    }

    // ==================== 订单操作 ====================

    if (route === 'orders-save' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { content, user, date, totalAmount, region, rawContent } = body;
      const doc = {
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
      await ordersCol.insertOne(doc);
      return jsonResponse({ success: true, id: doc._id });
    }

    if (route === 'orders-list' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      const { date, region, user } = event.queryStringParameters || {};
      const filter = {};
      if (decoded.role !== 'admin') filter.username = decoded.username;
      if (date) filter.date = date;
      if (region) filter.region = region;
      if (user && decoded.role === 'admin') filter.user = user;
      const orders = await ordersCol.find(filter).sort({ timestamp: -1 }).toArray();
      return jsonResponse(orders);
    }

    if (route === 'orders-delete' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const order = await ordersCol.findOne({ _id: id });
      if (!order) return errorResponse('订单不存在');
      if (decoded.role !== 'admin' && order.username !== decoded.username) return errorResponse('无权限', 403);
      // 移到回收站
      await recycleCol.insertOne({ ...order, deletedAt: new Date().toISOString(), originalId: id });
      await ordersCol.deleteOne({ _id: id });
      return jsonResponse({ success: true });
    }

    // ==================== 上报操作 ====================

    if (route === 'reports-save' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { content, user, date, totalAmount, region } = body;
      const doc = {
        content,
        user: user || decoded.username,
        username: decoded.username,
        date: date || new Date().toISOString().slice(0, 10),
        totalAmount: totalAmount || 0,
        region: region || 'macau',
        timestamp: new Date().toISOString(),
        type: 'report'
      };
      await reportsCol.insertOne(doc);
      return jsonResponse({ success: true, id: doc._id });
    }

    if (route === 'reports-list' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      const { date, region, user } = event.queryStringParameters || {};
      const filter = {};
      if (decoded.role !== 'admin') filter.username = decoded.username;
      if (date) filter.date = date;
      if (region) filter.region = region;
      if (user && decoded.role === 'admin') filter.user = user;
      const reports = await reportsCol.find(filter).sort({ timestamp: -1 }).toArray();
      return jsonResponse(reports);
    }

    if (route === 'reports-delete' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const report = await reportsCol.findOne({ _id: id });
      if (!report) return errorResponse('上报记录不存在');
      if (decoded.role !== 'admin' && report.username !== decoded.username) return errorResponse('无权限', 403);
      await recycleCol.insertOne({ ...report, deletedAt: new Date().toISOString(), originalId: id });
      await reportsCol.deleteOne({ _id: id });
      return jsonResponse({ success: true });
    }

    // ==================== 统计数据 ====================

    if (route === 'statistics' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      // 占位，后续补计算逻辑
      return jsonResponse({
        tableBetData: {},
        reportBetData: {},
        numberCount: {},
        zodiacCount: {},
        numberAmountCount: {},
        zodiacAmountCount: {},
        reportAmountData: {},
        reportRiskData: {},
        numberOrderTotal: 0,
        zodiacWeightedTotal: 0,
        orders: [],
        reports: []
      });
    }

    // ==================== 回收站 ====================

    if (route === 'recycle-list' && method === 'GET') {
      const perm = requireLogin();
      if (perm) return perm;
      const filter = {};
      if (decoded.role !== 'admin') filter.username = decoded.username;
      const items = await recycleCol.find(filter).sort({ deletedAt: -1 }).toArray();
      return jsonResponse(items);
    }

    if (route === 'recycle-restore' && method === 'POST') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const item = await recycleCol.findOne({ _id: id });
      if (!item) return errorResponse('记录不存在');
      if (decoded.role !== 'admin' && item.username !== decoded.username) return errorResponse('无权限', 403);
      if (item.type === 'order') {
        await ordersCol.insertOne({ ...item, _id: item.originalId });
      } else {
        await reportsCol.insertOne({ ...item, _id: item.originalId });
      }
      await recycleCol.deleteOne({ _id: id });
      return jsonResponse({ success: true });
    }

    if (route === 'recycle-delete' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { id } = body;
      const item = await recycleCol.findOne({ _id: id });
      if (!item) return errorResponse('记录不存在');
      if (decoded.role !== 'admin' && item.username !== decoded.username) return errorResponse('无权限', 403);
      await recycleCol.deleteOne({ _id: id });
      return jsonResponse({ success: true });
    }

    if (route === 'recycle-clear' && method === 'DELETE') {
      const perm = requireLogin();
      if (perm) return perm;
      const { password } = body;
      if (password !== CONFIG_PASSWORD) return errorResponse('密码错误', 403);
      const filter = {};
      if (decoded.role !== 'admin') filter.username = decoded.username;
      await recycleCol.deleteMany(filter);
      return jsonResponse({ success: true });
    }

    return errorResponse('未知接口', 404);

  } catch (err) {
    console.error('API Error:', err);
    return errorResponse('服务器内部错误', 500);
  }
};
