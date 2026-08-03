// ===== config.js - 全局常量、密码、存储键名、生肖顺序等配置 =====

// 密码（Base64编码）
const ADMIN_PASSWORD_ENC = "MTUwNDA4";
const PASSWORD_ENC = "ODkxMTA1";
const YEAR_ZODIAC_PASSWORD_ENC = "MTUwNDA4";
const CARD_SECRET_ENC = "WEs5bVAyd1E3dkw1";

// 解码后的密码（全局可用）
const ADMIN_PASSWORD = atob(ADMIN_PASSWORD_ENC);
const PASSWORD = atob(PASSWORD_ENC);
const YEAR_ZODIAC_PASSWORD = atob(YEAR_ZODIAC_PASSWORD_ENC);
const CARD_SECRET = atob(CARD_SECRET_ENC);

// IndexedDB 数据库配置
const DB_NAME = 'OrderDatabase';
const DB_VERSION = 7;
const STORE_NAME = 'orders';
const REPORT_STORE_NAME = 'report_orders';
const RECYCLE_STORE_NAME = 'recycle_bin';
const LOG_STORE_NAME = 'operation_log';
const COMBO_STORE_NAME = 'combo_orders';

// 回收站保留天数
const RECYCLE_RETENTION_DAYS = 30;

// 生肖顺序（固定）
const zodiacOrder = ['马','蛇','龙','兔','虎','牛','鼠','猪','狗','鸡','猴','羊'];

// 波色号码分类
const redNumbers = ['01','02','07','08','12','13','18','19','23','24','29','30','34','35','40','45','46'];
const blueNumbers = ['03','04','09','10','14','15','20','25','26','31','36','37','41','42','47','48'];
const greenNumbers = ['05','06','11','16','17','21','22','27','28','32','33','38','39','43','44','49'];

// 卡密存储键
const CARD_KEYS_STORE = 'cardKeys';
const SESSION_KEY = 'authSession';

// 默认地区
const defaultRegion = 'macau';

// 玩法名称列表（用于预处理正则构建）
const PLAY_NAMES_LIST = [
    '连肖', '连尾', '二中二', '三中三', '特碰', '不中',
    '平特肖', '平特尾', '特肖', '特码', '平码'
];

// 金额后缀默认列表
const defaultAmountSuffixes = ['米', '元', '块', '角', '分', '厘'];