/**
 * 菜花日历 v2 - 单页应用逻辑
 * 布局：顶部里程碑 → 日历 → 事件列表 → 底部输入
 */
const App = (() => {
  let calendarYear, calendarMonth;
  let selectedDate = null;
  let $, $$;

  function init() {
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    selectedDate = Storage.formatDateStr(now);

    $ = (sel) => document.querySelector(sel);
    $$ = (sel) => document.querySelectorAll(sel);

    bindEvents();
    renderAll();
  }

  function bindEvents() {
    // 日历导航
    $('#prevMonth').addEventListener('click', () => changeMonth(-1));
    $('#nextMonth').addEventListener('click', () => changeMonth(1));
    $('#todayBtn').addEventListener('click', goToday);

    // 日历格子点击
    $('#calendarGrid').addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell');
      if (cell && cell.dataset.date) selectDate(cell.dataset.date);
    });

    // 底部输入框
    $('#sendBtn').addEventListener('click', handleSend);
    $('#chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    $('#chatInput').addEventListener('input', autoResize);

    // 事件列表删除
    $('#eventList').addEventListener('click', (e) => {
      const btn = e.target.closest('.evt-delete');
      if (btn) { Storage.deleteEvent(btn.dataset.id); renderEventList(); renderCalendar(); }
    });

    // 里程碑添加
    $('#addMilestoneBtn').addEventListener('click', showMilestoneForm);
    $('#msCancel').addEventListener('click', hideMilestoneForm);
    $('#msSave').addEventListener('click', saveMilestone);
    $('#msFormOverlay').addEventListener('click', (e) => { if (e.target === $('#msFormOverlay')) hideMilestoneForm(); });

    // 里程碑类型切换
    $$('.ms-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.ms-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 修改 placeholder
        const input = $('#msTitle');
        if (btn.dataset.type === 'counter') {
          input.placeholder = '如：入职南威';
        } else {
          input.placeholder = '如：汕头出发';
        }
      });
    });

    // 里程碑删除
    $('#milestoneScroll').addEventListener('click', (e) => {
      const btn = e.target.closest('.ms-del');
      if (btn) { Storage.deleteMilestone(btn.dataset.id); renderMilestones(); }
    });

    // 快速添加事件
    $('#addEvtBtn').addEventListener('click', showQuickAdd);
    $('#quickAddCancel').addEventListener('click', hideQuickAdd);
    $('#quickAddSave').addEventListener('click', saveQuickAdd);
    $('#quickAddOverlay').addEventListener('click', (e) => { if (e.target === $('#quickAddOverlay')) hideQuickAdd(); });
    $('#quickAddAllDay').addEventListener('change', (e) => {
      $('#quickAddTime').disabled = e.target.checked;
    });
  }

  // ==================== 日历渲染 ====================

  function renderCalendar() {
    const grid = $('#calendarGrid');
    const title = $('#calendarTitle');
    const dateMap = Storage.getMonthEventDates(calendarYear, calendarMonth);
    const today = Storage.formatDateStr(new Date());

    title.textContent = `${calendarYear}年${calendarMonth + 1}月`;

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    let html = '';

    // 星期头
    ['日', '一', '二', '三', '四', '五', '六'].forEach(h => {
      html += `<div class="cal-header">${h}</div>`;
    });

    // 上月补白
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="cal-cell dim"><span class="cal-date">${daysInPrevMonth - i}</span></div>`;
    }

    // 本月日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const events = dateMap[dateStr] || [];
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;

      let cls = 'cal-cell';
      if (isToday) cls += ' today';
      if (isSelected) cls += ' selected';

      // 事件缩略
      let evtHtml = '';
      const showCount = Math.min(events.length, 2);
      for (let i = 0; i < showCount; i++) {
        const ev = events[i];
        const color = Parser.categoryColor(ev.category);
        // 手机屏空间小，只显示色条
        evtHtml += `<div class="cal-evt-bar" style="background:${color}"></div>`;
      }
      if (events.length > 2) {
        evtHtml += `<div class="cal-more">+${events.length - 2}</div>`;
      }

      html += `<div class="${cls}" data-date="${dateStr}">
        <span class="cal-date">${d}</span>
        ${events.length > 0 ? `<div class="cal-events">${evtHtml}</div>` : ''}
      </div>`;
    }

    grid.innerHTML = html;
  }

  function selectDate(dateStr) {
    selectedDate = dateStr;
    renderEventList();
    // 更新日历选中样式
    $$('.cal-cell.selected').forEach(c => c.classList.remove('selected'));
    const target = document.querySelector(`.cal-cell[data-date="${dateStr}"]`);
    if (target) target.classList.add('selected');
  }

  function changeMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderCalendar();
  }

  function goToday() {
    const now = new Date();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
    selectedDate = Storage.formatDateStr(now);
    renderCalendar();
    renderEventList();
  }

  // ==================== 事件列表渲染 ====================

  function renderEventList() {
    const list = $('#eventList');
    const titleEl = $('#selectedDateTitle');
    if (!list || !titleEl) return;

    const events = Storage.getEventsByDate(selectedDate);
    const d = new Date(selectedDate + 'T00:00:00');
    const today = Storage.formatDateStr(new Date());
    const dayLabel = selectedDate === today ? ' · 今天' : '';

    titleEl.textContent = Parser.formatDate(d) + dayLabel;

    if (events.length === 0) {
      list.innerHTML = '<div class="empty-hint">没有安排</div>';
      return;
    }

    let html = '';
    events.forEach(ev => {
      const timeStr = ev.time === 'all_day' ? '全天' : (ev.time ? ev.time.slice(0, 5) : '');
      const recLabel = ev.recurring ? ` 🔁${Parser.recurringLabel(ev.recurring)}` : '';
      const catColor = Parser.categoryColor(ev.category);
      html += `
        <div class="evt-item">
          <div class="evt-color-bar" style="background:${catColor}"></div>
          <div class="evt-body">
            <div class="evt-top">
              <span class="evt-time">${timeStr}</span>
              <span class="evt-cat" style="background:${Parser.categoryBg(ev.category)};color:${catColor}">${Parser.categoryLabel(ev.category)}</span>
              ${recLabel ? `<span class="evt-rec">${recLabel}</span>` : ''}
            </div>
            <div class="evt-title">${escHtml(ev.title)}</div>
          </div>
          <button class="evt-delete" data-id="${ev.id}" title="删除">×</button>
        </div>
      `;
    });
    list.innerHTML = html;
  }

  // ==================== 里程碑渲染 ====================

  function renderMilestones() {
    const scroll = $('#milestoneScroll');
    const milestones = Storage.getMilestones();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (milestones.length === 0) {
      scroll.innerHTML = '<span style="color:var(--text-hint);font-size:12px;white-space:nowrap">点击 + 添加倒数日或计日</span>';
      return;
    }

    // 排序：正在进行的在前
    milestones.sort((a, b) => {
      const da = new Date(a.date + 'T00:00:00');
      const db = new Date(b.date + 'T00:00:00');
      // 倒数日：未来最近的在前
      // 计日：最近的在前
      return Math.abs(da - now) - Math.abs(db - now);
    });

    let html = '';
    milestones.forEach(ms => {
      const target = new Date(ms.date + 'T00:00:00');
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

      if (ms.type === 'counter') {
        // 计日（已过多少天）
        const days = diff < 0 ? Math.abs(diff) : 0;
        const label = diff === 0 ? '今天' : `已过`;
        html += `<div class="ms-tag counter">
          <span class="ms-title">${escHtml(ms.title)}</span>
          <span class="ms-label">${label}</span>
          <span class="ms-num">${diff === 0 ? '0' : days}</span>
          <span class="ms-unit">天</span>
          <button class="ms-del" data-id="${ms.id}">×</button>
        </div>`;
      } else {
        // 倒数日
        let label, num;
        if (diff < 0) { label = '已过'; num = Math.abs(diff); }
        else if (diff === 0) { label = '就是'; num = '今天'; }
        else { label = '还有'; num = diff; }
        html += `<div class="ms-tag countdown">
          <span class="ms-title">${escHtml(ms.title)}</span>
          <span class="ms-label">${label}</span>
          <span class="ms-num">${num}</span>
          ${diff !== 0 ? '<span class="ms-unit">天</span>' : ''}
          <button class="ms-del" data-id="${ms.id}">×</button>
        </div>`;
      }
    });
    scroll.innerHTML = html;
  }

  // ==================== 底部输入 ====================

  function handleSend() {
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;

    const events = Parser.parse(text);
    if (events.length === 0) {
      showToast('没有识别到事项，试试：下周一9点 开会');
      return;
    }

    const okEvents = events.filter(e => !e.needsClarify);
    const needClarify = events.filter(e => e.needsClarify);

    if (okEvents.length > 0) {
      Storage.addEvents(okEvents.map(e => ({
        title: e.title,
        date: e.date ? Storage.formatDateStr(e.date) : null,
        time: e.time,
        recurring: e.recurring,
        category: e.category,
      })));
      showToast(`✅ 已添加 ${okEvents.length} 个事项`);
    }

    if (needClarify.length > 0) {
      const names = needClarify.map(e => `「${e.title}」`).join(' ');
      showToast(`⚠️ ${names} 缺少日期`);
    }

    input.value = '';
    autoResize();
    renderCalendar();
    renderEventList();
  }

  function autoResize() {
    const input = $('#chatInput');
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  }

  // ==================== 里程碑表单 ====================

  function showMilestoneForm() {
    $('#msFormOverlay').classList.add('show');
    $('#msTitle').value = '';
    // 默认倒数日，明天
    const activeType = $('.ms-type-btn.active').dataset.type;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (activeType === 'counter') {
      // 计日默认过去日期
      const past = new Date();
      past.setMonth(past.getMonth() - 3);
      $('#msDate').value = Storage.formatDateStr(past);
      $('#msTitle').placeholder = '如：入职南威';
    } else {
      $('#msDate').value = Storage.formatDateStr(tomorrow);
      $('#msTitle').placeholder = '如：汕头出发';
    }
    $('#msTitle').focus();
  }

  function hideMilestoneForm() {
    $('#msFormOverlay').classList.remove('show');
  }

  function saveMilestone() {
    const title = $('#msTitle').value.trim();
    const date = $('#msDate').value;
    const type = $('.ms-type-btn.active').dataset.type;
    if (!title || !date) return;

    Storage.addMilestone({ title, date, type });
    hideMilestoneForm();
    renderMilestones();
    showToast(`✅ 已添加${type === 'counter' ? '计日' : '倒数日'}`);
  }

  // ==================== 快速添加事件 ====================

  function showQuickAdd() {
    $('#quickAddOverlay').classList.add('show');
    $('#quickAddInput').value = '';
    $('#quickAddTime').value = '09:00';
    $('#quickAddAllDay').checked = false;
    $('#quickAddTime').disabled = false;
    const d = new Date(selectedDate + 'T00:00:00');
    $('#quickAddDate').textContent = Parser.formatDate(d);
    $('#quickAddInput').focus();
  }

  function hideQuickAdd() {
    $('#quickAddOverlay').classList.remove('show');
  }

  function saveQuickAdd() {
    const title = $('#quickAddInput').value.trim();
    if (!title) return;
    const isAllDay = $('#quickAddAllDay').checked;
    const time = isAllDay ? 'all_day' : $('#quickAddTime').value;

    Storage.addEvent({
      title,
      date: selectedDate,
      time: time || null,
      category: 'default',
    });

    hideQuickAdd();
    renderCalendar();
    renderEventList();
    showToast('✅ 已添加');
  }

  // ==================== Toast ====================

  function showToast(msg) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  // ==================== 全量渲染 ====================

  function renderAll() {
    renderMilestones();
    renderCalendar();
    renderEventList();
  }

  // ==================== 工具 ====================

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 数据导出
  window.exportData = function() {
    const data = Storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `菜花日历_备份_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  window.importData = function(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Storage.importAll(data);
        renderAll();
        showToast('✅ 数据已导入');
      } catch { showToast('❌ 文件格式错误'); }
    };
    reader.readAsText(file);
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
