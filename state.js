/* ===== state.js - 全局状态变量声明 ===== */

// 投注数据
var tableBetData = {};
var userBetData = {};
var reportBetData = {};
var reportAmountData = {};
var reportRiskData = {};

// 号码/生肖计数
var numberCount = {};
var zodiacCount = {};
var numberAmountCount = {};
var zodiacAmountCount = {};

// 生肖金额
var zodiacDirectAmount = {};
var zodiacFilteredAmount = {};
var zodiacReportAmount = {};
var zodiacFilteredReportAmount = {};

// 原始订单金额
var originalOrderAmount = {};

// 号码直接金额
var directOrderAmount = {};
var directReportAmount = {};

// 总金额
var numberOrderTotal = 0;
var zodiacWeightedTotal = 0;

// 订单计数
var orderCountAll = 0;

// 地区（初始从 localStorage 读取）
var currentRegion = localStorage.getItem('currentRegion') || 'macau';

// 生肖映射
var currentZodiacMap = {};

// 数据库
var db = null;
var dbAvailable = true;

// 最高 z-index
var highestZ = 2000;

// 解析方法
var currentParseMethod = parseInt(localStorage.getItem('savedParseMethod') || '0');

// 圆点地区
var _dotRegion = 'auto';

// 纯订单行
var _pureOrderLines = [];
var _pureOrderRegions = [];

// 最大亏损缓存
var _cachedMaxLossData = [];

// 连肖编辑
var _lianxiaoEditEnabled = false;

// 暴增阈值
var surgeThreshold = parseInt(localStorage.getItem('surgeThreshold') || '50');
var surgeAmountThreshold = parseFloat(localStorage.getItem('surgeAmountThreshold') || '4');
var surgeMinOrders = 3;

// 暴增结果
var _surgeResult = [];

// 生肖排行/单挑可见
var zodiacRankVisible = false;
var singleBetVisible = false;

// 热度/建议/暴增可见
var heatVisible = false;
var adviceVisible = false;
var surgeVisible = false;

// 订单列表
var _orderListAllData = [];
var _orderListPage = 0;
var _orderListPageSize = 50;

// 上报列表
var _reportListAllData = [];
var _reportListPage = 0;

// 操作日志
var _allLogs = [];
var _logPage = 0;
var _logPageSize = 50;

// 重置锁
var resetLock = false;
var resetLongPressTimer = null;

// 存储抽屉计时器
var storageDrawerTimer = null;

// 拖拽选择
var dragSelectionActive = false;

// 清空内存数据（重置所有统计变量）
function clearMemoryData() {
  tableBetData = {};
  userBetData = {};
  reportBetData = {};
  reportAmountData = {};
  reportRiskData = {};
  numberCount = {};
  zodiacCount = {};
  numberAmountCount = {};
  zodiacAmountCount = {};
  zodiacDirectAmount = {};
  zodiacFilteredAmount = {};
  zodiacReportAmount = {};
  zodiacFilteredReportAmount = {};
  numberOrderTotal = 0;
  zodiacWeightedTotal = 0;
  originalOrderAmount = {};
  directOrderAmount = {};
  directReportAmount = {};
  _cachedMaxLossData = [];
}