// ===== config.js - 全局常量、密码、存储键名、生肖顺序等配置 =====

// ===== 密码（Base64编码） =====
function decodePassword(encoded) { return atob(encoded); }

const ADMIN_PASSWORD_ENC = "MTUwNDA4";
const ADMIN_PASSWORD = decodePassword(ADMIN_PASSWORD_ENC);

const PASSWORD_ENC = "ODkxMTA1";
const PASSWORD = decodePassword(PASSWORD_ENC);

const YEAR_ZODIAC_PASSWORD_ENC = "MTUwNDA4";
const YEAR_ZODIAC_PASSWORD = decodePassword(YEAR_ZODIAC_PASSWORD_ENC);

const CARD_SECRET_ENC = "WEs5bVAyd1E3dkw1";
const CARD_SECRET = decodePassword(CARD_SECRET_ENC);

// ===== 数据库配置 =====
const DB_NAME = 'OrderDatabase';
const DB_VERSION = 7;
const STORE_NAME = 'orders';
const REPORT_STORE_NAME = 'report_orders';
const RECYCLE_STORE_NAME = 'recycle_bin';
const LOG_STORE_NAME = 'operation_log';
const COMBO_STORE_NAME = 'combo_orders';

// ===== 存储键名 =====
const CARD_KEYS_STORE = 'cardKeys';
const SESSION_KEY = 'authSession';

// ===== 回收站保留天数 =====
const RECYCLE_RETENTION_DAYS = 30;

// ===== 生肖顺序 =====
const zodiacOrder = ['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];

// ===== 波色分类 =====
const redNumbers = ['01','02','07','08','12','13','18','19','23','24','29','30','34','35','40','45','46'];
const blueNumbers = ['03','04','09','10','14','15','20','25','26','31','36','37','41','42','47','48'];
const greenNumbers = ['05','06','11','16','17','21','22','27','28','32','33','38','39','43','44','49'];

// ===== 地区关键字列表 =====
const REGION_KEYWORDS = {
  'macau': ['澳', '奥', '澳门', '奥门', '门', 'mc', 'MC', 'Mc'],
  'hongkong': ['港', '香', '香港', 'hk', 'HK', 'Hk'],
  'yuegang': ['粤', '粤港', 'yg', 'YG', 'Yg']
};
const REGION_LABELS = { 'macau': '澳门', 'hongkong': '香港', 'yuegang': '粤港' };

// ===== 全局状态变量 =====
let db = null;
let dbAvailable = true;
let currentRegion = localStorage.getItem('currentRegion') || 'macau';
let currentZodiacMap = {};
let highestZ = 2000;

// 订单相关全局变量
let tableBetData = {};
let userBetData = {};
let reportBetData = {};
let reportAmountData = {};
let reportRiskData = {};
let numberCount = {};
let zodiacCount = {};
let numberAmountCount = {};
let zodiacAmountCount = {};
let zodiacDirectAmount = {};
let zodiacFilteredAmount = {};
let zodiacReportAmount = {};
let zodiacFilteredReportAmount = {};
let numberOrderTotal = 0;
let zodiacWeightedTotal = 0;
let originalOrderAmount = {};
let directOrderAmount = {};
let directReportAmount = {};
let orderCountAll = 0;

// ===== 分层缓存 =====
const statsCache = new Map();