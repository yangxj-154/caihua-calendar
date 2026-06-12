/**
 * 菜花日历 - 中文自然语言日期解析器
 * 支持：相对日期、绝对日期、时间段、周期循环、类别识别
 */

const Parser = (() => {
  const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
  const NUM_MAP = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0, '七': 7 };

  // 类别关键词映射
  const CATEGORY_RULES = [
    { cat: 'work',    keys: ['工作', '开会', '会议', '汇报', '展厅', '接待', '领导', '营销', '项目', '团队', '灵枢', '视频', '方案', '排班', '值班', '南威'] },
    { cat: 'study',   keys: ['学习', '考试', '复习', '备考', '事业单位', '刷题', '看书', '课程', '培训'] },
    { cat: 'travel',  keys: ['旅游', '旅行', '出行', '汕头', '出发', '游玩', '探店', '美食'] },
    { cat: 'personal',keys: ['公众号', '无敌菜花', '运动', '健身', '跑步', '游泳', '电影', '个人'] },
  ];

  function now() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function clone(d) { return new Date(d.getTime()); }

  /**
   * 解析单行文本为事件对象
   * @param {string} line - 一行待办文本
   * @returns {{ title: string, date: Date|null, time: string|null, recurring: object|null, category: string, raw: string }}
   */
  function parseLine(line) {
    line = line.trim();
    if (!line) return null;

    let result = {
      title: line,
      date: null,
      time: null,
      recurring: null,
      category: 'default',
      raw: line,
      needsClarify: false,
      clarifyMsg: ''
    };

    // ---- 1. 检测周期循环 ----
    const recurring = detectRecurring(line);
    if (recurring) {
      result.recurring = recurring;
      result.title = line.replace(recurring.matched, '').trim();
    }

    // ---- 2. 检测时间段 ----
    const timeMatch = detectTime(result.title);
    if (timeMatch) {
      result.time = timeMatch.time;
      result.title = result.title.replace(timeMatch.matched, '').trim();
    }

    // ---- 3. 检测日期 ----
    const dateInfo = detectDate(result.title);
    if (dateInfo) {
      result.date = dateInfo.date;
      result.title = result.title.replace(dateInfo.matched, '').trim();
    } else if (!result.recurring) {
      // 没有日期也没有周期，标记需要澄清
      result.needsClarify = true;
      result.clarifyMsg = '这个事项没有日期，你想安排在哪天？';
    }

    // ---- 4. 清理标题 ----
    result.title = result.title
      .replace(/^[,，、。.\s]+/, '')
      .replace(/[,，、。.\s]+$/, '')
      .replace(/^[【\[].*?[】\]]/, '') // 移除开头的【标签】
      .trim();

    if (!result.title) result.title = '(无标题)';

    // ---- 5. 类别识别 ----
    result.category = detectCategory(result.title);

    return result;
  }

  /**
   * 解析多行文本，返回事件列表
   */
  function parse(text) {
    const lines = text.split(/[\n\r]+/).filter(l => l.trim());
    return lines.map(parseLine).filter(Boolean);
  }

  // ==================== 日期检测 ====================

  function detectDate(text) {
    // 相对日期（多日优先匹配）
    const relPatterns = [
      // 多天：周四周五、周六日（取第一天）
      { re: /^周([一二三四五六])周([一二三四五六日天])/, fn: (m) => getThisWeekday(m[1]) },
      { re: /^周([一二三四五六])[日天](?!\S)/, fn: (m) => getThisWeekday(m[1]) }, // 周六日
      // 今天 / 明天 / 后天 / 大后天
      { re: /^今天/, fn: () => clone(now()) },
      { re: /^明天/, fn: () => { const d = clone(now()); d.setDate(d.getDate() + 1); return d; } },
      { re: /^后天/, fn: () => { const d = clone(now()); d.setDate(d.getDate() + 2); return d; } },
      { re: /^大后天/, fn: () => { const d = clone(now()); d.setDate(d.getDate() + 3); return d; } },
      // 下周一~下周日
      { re: /^下周([一二三四五六日天])/, fn: (m) => getNextWeekday(m[1], 1) },
      { re: /^下下週([一二三四五六日天])/, fn: (m) => getNextWeekday(m[1], 2) },
      { re: /^下下周([一二三四五六日天])/, fn: (m) => getNextWeekday(m[1], 2) },
      // 这周X
      { re: /^这周([一二三四五六日天])/, fn: (m) => getThisWeekday(m[1]) },
      { re: /^周([一二三四五六日天])/, fn: (m) => getThisWeekday(m[1]) },
      // 下周（不带具体）
      { re: /^下周(?!\S)/, fn: () => getNextWeekday('一', 1) },
      // 这周（不带具体）
      { re: /^这周(?!\S)/, fn: () => getThisWeekday('一') },
      // 周末（取本周六）
      { re: /^周末/, fn: () => getThisWeekday('六') },
    ];

    for (const { re, fn } of relPatterns) {
      const m = text.match(re);
      if (m) {
        return { date: fn(m), matched: m[0] };
      }
    }

    // 绝对日期：X月X日 / X月X号 / X.X / X-X
    const absMatch = text.match(/^(\d{1,2})月(\d{1,2})[日号]|^(\d{1,2})[\.\-](\d{1,2})(?!\d)/);
    if (absMatch) {
      const month = parseInt(absMatch[1] || absMatch[3]);
      const day = parseInt(absMatch[2] || absMatch[4]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const d = new Date(now().getFullYear(), month - 1, day);
        // 如果日期已过，推到明年
        if (d < now()) {
          d.setFullYear(d.getFullYear() + 1);
        }
        return { date: d, matched: absMatch[0] };
      }
    }

    return null;
  }

  function getThisWeekday(dayChar) {
    const targetDay = NUM_MAP[dayChar];
    const d = clone(now());
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7; // 本周已过，推到下周
    d.setDate(d.getDate() + diff);
    return d;
  }

  function getNextWeekday(dayChar, weeksAhead) {
    const targetDay = NUM_MAP[dayChar];
    const d = clone(now());
    const currentDay = d.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    diff += (weeksAhead - 1) * 7;
    if (weeksAhead === 0) diff -= 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  // ==================== 时间检测 ====================

  function detectTime(text) {
    const patterns = [
      { re: /上午(\d{1,2})点(半|(\d{1,2})分?)?/, fn: (m) => padTime(parseInt(m[1]), m[2] === '半' ? 30 : (m[3] ? parseInt(m[3]) : 0)) },
      { re: /下午(\d{1,2})点(半|(\d{1,2})分?)?/, fn: (m) => padTime(parseInt(m[1]) + 12, m[2] === '半' ? 30 : (m[3] ? parseInt(m[3]) : 0)) },
      { re: /晚上(\d{1,2})点(半|(\d{1,2})分?)?/, fn: (m) => padTime(parseInt(m[1]) + 12, m[2] === '半' ? 30 : (m[3] ? parseInt(m[3]) : 0)) },
      { re: /(\d{1,2}):(\d{2})/, fn: (m) => `${m[1].padStart(2,'0')}:${m[2]}` },
      { re: /全天/, fn: () => 'all_day' },
    ];

    for (const { re, fn } of patterns) {
      const m = text.match(re);
      if (m) {
        return { time: fn(m), matched: m[0] };
      }
    }
    return null;
  }

  function padTime(h, m) {
    if (h === 12) h = 12;  // 中午12点
    if (h > 24) h -= 12;   // 下午/晚上修正
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // ==================== 周期检测 ====================

  function detectRecurring(text) {
    const patterns = [
      { re: /每天/, fn: () => ({ type: 'daily' }) },
      { re: /(每个)?工作日/, fn: () => ({ type: 'weekdays' }) },
      { re: /每周([一二三四五六日天])/, fn: (m) => ({ type: 'weekly', dayOfWeek: NUM_MAP[m[1]] }) },
      { re: /每月(\d{1,2})[日号]/, fn: (m) => ({ type: 'monthly', dayOfMonth: parseInt(m[1]) }) },
      { re: /每个月(\d{1,2})[日号]/, fn: (m) => ({ type: 'monthly', dayOfMonth: parseInt(m[1]) }) },
    ];

    for (const { re, fn } of patterns) {
      const m = text.match(re);
      if (m) {
        return { ...fn(m), matched: m[0] };
      }
    }
    return null;
  }

  // ==================== 类别检测 ====================

  function detectCategory(title) {
    const lower = title.toLowerCase();
    for (const { cat, keys } of CATEGORY_RULES) {
      if (keys.some(k => lower.includes(k))) return cat;
    }
    return 'default';
  }

  // ==================== 工具方法 ====================

  function formatDate(date) {
    if (!date) return '';
    const weekDay = DAY_NAMES[date.getDay()];
    return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} 周${weekDay}`;
  }

  function formatDateShort(date) {
    if (!date) return '';
    return `${date.getMonth()+1}/${date.getDate()}`;
  }

  function recurringLabel(rec) {
    if (!rec) return '';
    switch (rec.type) {
      case 'daily': return '每天';
      case 'weekdays': return '工作日';
      case 'weekly': return `每周${DAY_NAMES[rec.dayOfWeek]}`;
      case 'monthly': return `每月${rec.dayOfMonth}号`;
      default: return '';
    }
  }

  function categoryLabel(cat) {
    const map = { work: '工作', study: '学习', travel: '旅行', personal: '个人', default: '其他' };
    return map[cat] || '其他';
  }

  function categoryColor(cat) {
    const map = { work: '#4A90D9', study: '#FA8C16', travel: '#722ED1', personal: '#52C41A', default: '#8C8C8C' };
    return map[cat] || '#8C8C8C';
  }

  function categoryBg(cat) {
    const map = { work: '#EBF3FC', study: '#FFF3E8', travel: '#F3EAFA', personal: '#EDF9E8', default: '#F0F0F0' };
    return map[cat] || '#F0F0F0';
  }

  return {
    parse, parseLine,
    formatDate, formatDateShort,
    recurringLabel, categoryLabel, categoryColor, categoryBg,
    DAY_NAMES
  };
})();

// 支持模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Parser;
}
