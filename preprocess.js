// ===== preprocess.js - 用户输入文本的清洗、纠错、别名替换与格式化 =====

// ===== 预构建玩法名正则（模块顶层只执行一次） =====
const PLAY_NAMES_LIST = [
    '连肖', '连尾', '二中二', '三中三', '特碰', '不中',
    '平特肖', '平特尾', '特肖', '特码', '平码'
];

function buildPlayPatterns() {
    const patterns = [];
    for (const name of PLAY_NAMES_LIST) {
        patterns.push(name);
        for (let i = 2; i <= 5; i++) {
            patterns.push(i + name);
        }
    }
    patterns.sort((a, b) => b.length - a.length);
    return patterns;
}

// 预生成一个用于删除玩法名后标点的正则
const _playPunctPatterns = buildPlayPatterns();
const _playPunctRegex = new RegExp(
    `(${_playPunctPatterns.join('|')})[，。！？；：、,\\.\\!\\?;:]`,
    'g'
);

function step_removePlayPunctuation(txt) {
    return txt.replace(_playPunctRegex, '$1');
}

// ===== 预处理主函数 =====
function preprocess(txt) {
  let c = txt;
  c = c.replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // ===== 字符容错：o/O -> 0，l/i/I/！/! -> 1 =====
  c = c.replace(/[oO]/g, '0');
  c = c.replace(/[liI！!]/g, '1');

  // ===== 修复5：中文标点处理 =====
  const moneyKwPart = `(?:${KW_LIST.join('|')})`;
  const moneySuffixPart = '(?:米|元|块|角|分|厘|眯|咪|井|#|快|斤)';
  c = c.replace(/(\d) ([。！？；，])/g, '$1$2');
  const reMoneyKw = new RegExp(`(${moneyKwPart}\\s*\\d+(?:\\.\\d+)?)\\s*([。！？；，])`, 'g');
  c = c.replace(reMoneyKw, '$1\n');
  const reMoneySuffix = new RegExp(`(\\d+(?:\\.\\d+)?\\s*${moneySuffixPart})\\s*([。！？；，])`, 'g');
  c = c.replace(reMoneySuffix, '$1\n');
  c = c.replace(/[。！？；，]/g, ' ');

  // ===== 删除玩法名后面紧跟的标点符号 =====
  c = step_removePlayPunctuation(c);

  // ===== 常见错字/别名替换 =====
  const reps = {
    夏式: '复式', 復式: '复式', 复制: '复式', 復制: '复式', 复习: '复式', 复试: '复式', 复示: '复式', 覆式: '复式', 複试: '复式',
    友: '有', 尤: '龙', 虑: '虎', 坡: '波', 午: '牛', 綠: '绿', 孑: '子', 监: '蓝', 俏: '肖', 串肖: '连肖', '连/肖': '连肖',
    一连肖: '平特肖', 一连: '平特', '⑤': '5', '|': '1', 肉: '', 藍: '蓝', 录: '绿', 碌: '绿', 禄: '绿', 啵: '波', '○': '0', σ: '0', 莲: '连', 联: '连',
    连消: '连肖', 车肖: '连肖', 拾: '十', 佰: '百', 仟: '千', 大数: '大', 来: '下', 单号: '单', 双号: '双', 大号: '大', 小号: '小',
    家肖: '家禽', 野肖: '野兽', 老鼠: '鼠', 老虎: '虎', '双数数字': '双', 和数单: '合数单', 和数: '合数', 小数: '小', 双数: '双',
    单数: '单', 合数小: '合小', 合数大: '合大', '≡': '三', 山: '三', 俩: '二', 毎: '每', 五中四: '复式4肖', 二全中: '二中二',
    三全中: '三中三', 復制: '复式', 鳮: '鸡', 単: '单', 組: '组', 平待: '平特', 泼: '波', 肖连: '连肖', 消: '肖', '〇': '0',
    l: '1', I: '1', 壹: '一', 贰: '二', 叁: '三', 肆: '四', 陆: '六', 柒: '七', 捌: '八', 玖: '九', 伍: '五', 免: '兔', 拘: '狗',
    馬: '马', 龍: '龙', 雞: '鸡', 豬: '猪', 候: '猴', 侯: '猴', 兔子: '兔', 猴子: '猴', 子: '鼠', 老蛇: '蛇',
    // 生僻字 / 异体字容错
    '𤠣': '猴', '竜': '龙', '鷄': '鸡', '猎': '猪',
    // 二中二复容错
    '二中二复': '复式二中二', '二中二复式': '复式二中二',
    // 波色大小
    '红波小': '红小', '红波大': '红大', '绿波小': '绿小', '绿波大': '绿大',
    '蓝波小': '蓝小', '兰小': '蓝小', '兰波小': '蓝小',
    '蓝波大': '蓝大', '兰大': '蓝大', '兰波大': '蓝大',
    // 尾数
    '尾数小': '小尾', '尾数大': '大尾',
    // 平特
    '平特一肖': '平特肖', '平特二肖': '平特肖', '平特三肖': '平特肖',
    // 复式连肖
    '复试三肖': '复式三连肖', '三肖复式': '三连肖复式',
    // 复式连尾
    '复试三尾': '复式三连尾', '三尾复式': '三连尾复式', '复3尾': '复三尾', '复三尾': '复式三连尾',
    // 二中二
    '复试二中二': '复式二中二', '二中二复试': '复式二中二', '2中2复试': '复式二中二', '复试2中2': '复式二中二',
    // 三中三
    '复试三中三': '复式三中三', '三中三复试': '复式三中三', '3中3复试': '复式三中三', '复试3中3': '复式三中三',
    // 其他
    '三三二二串': '复三复二', '三三二二': '复三复二', '家属': '家肖',
    '复3': '复三', '复三': '复式三', '复3尾': '复三尾'
  };
  for (const [k, v] of Object.entries(reps)) c = c.split(k).join(v);
  ['天天彩', '天天采', '天天', '天彩', '天采', '总单'].forEach(s => c = c.split(s).join(''));
  c = c.replace(/澳门\d+期/g, '');
  c = c.replace(/[。！？；]/g, ' ');
  c = c.replace(/[^\dA-Za-z\u4e00-\u9fa5\s,\-，\=＝\.]/g, ' ');
  c = c.replace(/\n/g, '[[[NL]]]');
  c = c.replace(/[\s]{2,}/g, ' ');
  c = c.replace(/\[\[\[NL\]\]\]/g, '\n');
  
  // 头数连写
  c = c.replace(/((?:\d[\s,，.。、+\-*＊\/\\|]*)+)头/g, (match, digits) => {
    const nums = (digits.match(/\d/g) || []);
    if (nums.length >= 2) return nums.map(n => n + '头').join('-');
    return match;
  });
  // 尾数连写
  c = c.replace(/((?:\d[\s,，.。、+\-*＊\/\\|]*)+)尾/g, (match, digits) => {
    const nums = (digits.match(/\d/g) || []);
    if (nums.length >= 2) return nums.map(n => n + '尾').join('-');
    return match;
  });
  
  return c.trim();
}