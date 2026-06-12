/**
 * 菜花日历 v2 - 数据存储层 (localStorage)
 * 支持：事件、里程碑（倒数日 + 计日）
 */
const Storage = (() => {
  const KEYS = {
    events: 'caihua_events',
    milestones: 'caihua_milestones'
  };

  // ==================== 事件 ====================

  function getEvents() {
    try { return JSON.parse(localStorage.getItem(KEYS.events) || '[]'); }
    catch { return []; }
  }

  function saveEvents(events) {
    localStorage.setItem(KEYS.events, JSON.stringify(events));
  }

  function addEvent(event) {
    const events = getEvents();
    event.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    event.createdAt = new Date().toISOString();
    events.push(event);
    saveEvents(events);
    return event;
  }

  function addEvents(eventList) {
    const events = getEvents();
    eventList.forEach(e => {
      e.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      e.createdAt = new Date().toISOString();
      events.push(e);
    });
    saveEvents(events);
    return eventList;
  }

  function updateEvent(id, updates) {
    const events = getEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx >= 0) {
      events[idx] = { ...events[idx], ...updates, updatedAt: new Date().toISOString() };
      saveEvents(events);
      return events[idx];
    }
    return null;
  }

  function deleteEvent(id) {
    const events = getEvents().filter(e => e.id !== id);
    saveEvents(events);
  }

  function getEventsByDate(dateStr) {
    const events = getEvents();
    const result = [];
    for (const ev of events) {
      if (ev.recurring) {
        const d = new Date(dateStr + 'T00:00:00');
        if (matchesRecurring(ev, d)) {
          result.push({ ...ev, instanceDate: dateStr });
        }
      } else if (ev.date === dateStr) {
        result.push({ ...ev, instanceDate: dateStr });
      }
    }
    result.sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
    return result;
  }

  function matchesRecurring(event, date) {
    const d = new Date(event.date + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    if (date < d) return false;
    const rec = event.recurring;
    switch (rec.type) {
      case 'daily': return true;
      case 'weekdays': return date.getDay() >= 1 && date.getDay() <= 5;
      case 'weekly': return date.getDay() === rec.dayOfWeek;
      case 'monthly': return date.getDate() === rec.dayOfMonth;
      default: return false;
    }
  }

  function getMonthEventDates(year, month) {
    const events = getEvents();
    const dateMap = {};  // dateStr -> [event summaries with colors]
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    for (const ev of events) {
      if (ev.recurring) {
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
          if (matchesRecurring(ev, new Date(d))) {
            const key = formatDateStr(d);
            if (!dateMap[key]) dateMap[key] = [];
            dateMap[key].push({ title: ev.title, category: ev.category });
          }
        }
      } else if (ev.date) {
        const [y, m] = ev.date.split('-').map(Number);
        if (y === year && m - 1 === month) {
          if (!dateMap[ev.date]) dateMap[ev.date] = [];
          dateMap[ev.date].push({ title: ev.title, category: ev.category });
        }
      }
    }
    return dateMap;
  }

  // ==================== 里程碑（倒数日 + 计日）====================

  function getMilestones() {
    try { return JSON.parse(localStorage.getItem(KEYS.milestones) || '[]'); }
    catch { return []; }
  }

  function saveMilestones(list) {
    localStorage.setItem(KEYS.milestones, JSON.stringify(list));
  }

  function addMilestone(ms) {
    const list = getMilestones();
    ms.id = 'ms_' + Date.now().toString(36);
    ms.createdAt = new Date().toISOString();
    // type: 'countdown' (倒数日) 或 'counter' (计日/正数日)
    if (!ms.type) ms.type = 'countdown';
    list.push(ms);
    saveMilestones(list);
    return ms;
  }

  function deleteMilestone(id) {
    const list = getMilestones().filter(m => m.id !== id);
    saveMilestones(list);
  }

  function updateMilestone(id, updates) {
    const list = getMilestones();
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      saveMilestones(list);
    }
  }

  // ==================== 兼容：旧倒数日数据迁移 ====================

  function migrateOldCountdowns() {
    const oldKey = 'caihua_countdowns';
    const oldData = localStorage.getItem(oldKey);
    if (!oldData) return;

    try {
      const oldList = JSON.parse(oldData);
      if (oldList.length > 0) {
        const current = getMilestones();
        oldList.forEach(cd => {
          current.push({
            id: cd.id || 'ms_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
            title: cd.title,
            date: cd.date,
            type: 'countdown',
            createdAt: cd.createdAt || new Date().toISOString()
          });
        });
        saveMilestones(current);
      }
      localStorage.removeItem(oldKey);
    } catch { /* 忽略 */ }
  }

  // ==================== 工具 ====================

  function formatDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // ==================== 导出/导入 ====================

  function exportAll() {
    return {
      events: getEvents(),
      milestones: getMilestones(),
      exportedAt: new Date().toISOString()
    };
  }

  function importAll(data) {
    if (data.events) saveEvents(data.events);
    if (data.milestones) saveMilestones(data.milestones);
    // 兼容旧格式
    if (data.countdowns && !data.milestones) {
      data.countdowns.forEach(cd => addMilestone({
        title: cd.title, date: cd.date, type: 'countdown'
      }));
    }
  }

  // 初始化时迁移旧数据
  migrateOldCountdowns();

  return {
    getEvents, addEvent, addEvents, updateEvent, deleteEvent,
    getEventsByDate, getMonthEventDates,
    getMilestones, addMilestone, deleteMilestone, updateMilestone,
    formatDateStr,
    exportAll, importAll
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Storage;
}
