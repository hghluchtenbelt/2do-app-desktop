const state = { todos: [], projects: [], settings: {} };
let sidebarOpen = false;
let selectedProjectId = null;
let newProjectIcon = '🌱';
let newProjectColor = '#3b82f6';
let currentTab = 'active';
let expandedTaskId = null;
let editingProjectId = null;
let editingPriority = null;
let expandedTimelineProjects = new Set();
let searchQuery = '';
let showArchivedProjects = false;

const ICONS = [
  // Nature / Climate / Weather
  '🌱', '🌍', '🌳', '🌲', '🌴', '🌾', '🌿', '🍀', '🌻', '🌺',
  '🌸', '🌼', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
  '🌩️', '🌨️', '❄️', '☃️', '🌬️', '💨', '💧', '💦', '🌊', '🌀',
  '🌈', '⚡', '🔥', '🌡️', '☔', '🪴', '🎋', '🎍', '🍃', '🍂',
  '🍁', '🐝', '🦋', '🐛', '🐞', '🕷️', '🦗', '🐢', '🦎', '🐍',
  // Agriculture / Farming / Food
  '🚜', '🌽', '🥕', '🥔', '🧅', '🧄', '🍅', '🥬', '🥦', '🫑',
  '🫛', '🫘', '🌶️', '🍆', '🥒', '🍇', '🍎', '🍐', '🍊', '🍋',
  '🍌', '🍉', '🍓', '🫐', '🍑', '🍒', '🥝', '🥥', '🌰', '🐄',
  '🐂', '🐃', '🐖', '🐑', '🐐', '🐓', '🦃', '🦆', '🐎', '🐕',
  '🐈', '🥚', '🥛', '🧀', '🍯', '🍞', '🥖', '🧑‍🌾',
  // General / Work
  '📌', '📋', '📁', '🗂️', '📂', '📦', '🏷️', '🔖', '📎', '📍',
  '💼', '📊', '📈', '📉', '📅', '🗓️', '🗒️', '🗃️', '🗄️', '📇',
  '📝', '✏️', '✒️', '🖊️', '🖋️', '📏', '📐', '✂️', '🔒', '🔓',
  '🔑', '🗝️', '🔔', '🔕', '💡', '🔦', '⚙️', '🔧', '🔨', '⚒️',
  '🛠️', '⭐', '🌟', '✨', '💫', '🎯', '🏆', '🎖️', '🥇', '🎁',
  // Tech / Communication
  '💻', '🖥️', '📱', '⌨️', '🖱️', '🖨️', '📞', '☎️', '📠', '📧',
  '📨', '📬', '📮', '📡', '🔍', '🔎', '🔬', '🔭', '💾', '💿',
  // Money / Business
  '💰', '💵', '💳', '🏦', '🛒', '🛍️', '💎', '⚖️',
  // Documents / Education
  '📄', '📃', '📑', '📰', '📜', '📚', '📖', '📓', '📔', '📕',
  '📗', '📘', '📙', '🎓', '🎒', '🏫', '🧮', '✅', '☑️',
  // People / Health / Activities
  '👤', '👥', '🧑‍💼', '🧑‍🔬', '🧑‍🏫', '🏃', '🚴', '🧘', '☕',
  '🍴', '🏠', '🏢', '🚗', '✈️', '🎵', '🎨', '📷', '🎬', '⏰'
];
const COLORS = [
  // Greens
  '#10b981', '#059669', '#065f46', '#34d399', '#6ee7b7', '#a7f3d0',
  // Teals / Cyans
  '#14b8a6', '#06b6d4', '#22d3ee', '#67e8f9',
  // Blues
  '#3b82f6', '#1d4ed8', '#60a5fa', '#93c5fd',
  // Indigos
  '#6366f1', '#4f46e5', '#a5b4fc',
  // Purples
  '#8b5cf6', '#7c3aed', '#a78bfa', '#c4b5fd',
  // Pinks
  '#ec4899', '#db2777', '#f472b6', '#fbcfe8',
  // Roses / Reds
  '#f43f5e', '#e11d48', '#ef4444', '#fca5a5',
  // Oranges / Ambers
  '#f97316', '#ea580c', '#f59e0b', '#fbbf24',
  // Yellows / Limes
  '#eab308', '#84cc16', '#bef264',
  // Browns / Grays
  '#92400e', '#78716c', '#475569', '#94a3b8'
];

let toastTimeout = null;
function showToast(message, type = 'warning') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const icons = { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️' };
  toast.className = 'toast ' + type;
  toast.querySelector('.toast-icon').textContent = icons[type] || icons.warning;
  toast.querySelector('.toast-text').textContent = message;
  void toast.offsetWidth;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function isDueSoon(dueDate) {
  if (!dueDate) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate + 'T00:00');
  const diff = (due - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}
function isPastDue(dueDate) {
  if (!dueDate) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate + 'T00:00');
  return due < today;
}
function shiftDate(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

// ISO-8601 week: weeks start Monday, week 1 contains the year's first Thursday.
// Returns { year, week } where year is the ISO week-numbering year.
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // shift to the week's Thursday
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: isoYear, week };
}
// Monday (local time) of the ISO week containing `date`.
function isoWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7; // Mon=1..Sun=7
  d.setDate(d.getDate() - dayNum + 1);
  return d;
}

function normalizeTodo(t) {
  return {
    ...t,
    priority: t.priority || 'normal',
    dueDate: t.dueDate || null,
    projectId: t.projectId || null,
    completed: t.completed || false,
    subtasks: t.subtasks || [],
    links: t.links || [],
    notes: t.notes || '',
    repeat: t.repeat || 'none'
  };
}

function getDefaultSettings() {
  return { autoCleanupDays: 0 };
}

// Remove completed tasks whose completion is older than the configured window.
function applyAutoCleanup() {
  const days = (state.settings && state.settings.autoCleanupDays) || 0;
  if (!days) return 0;
  const cutoff = Date.now() - days * 86400000;
  const before = state.todos.length;
  state.todos = state.todos.filter(t => {
    if (!t.completed) return true;
    const done = t.completedAt ? new Date(t.completedAt).getTime() : 0;
    return !(done && done < cutoff);
  });
  return before - state.todos.length;
}

async function loadData() {
  try {
    const res = await fetch('/api/load-data');
    const data = await res.json();
    state.todos = (data.todos || []).map(normalizeTodo);
    state.projects = (data.projects && data.projects.length > 0) ? data.projects : getDefaultProjects();
    state.settings = Object.assign(getDefaultSettings(), data.settings || {});
    dataLoaded = true;
    const removed = applyAutoCleanup();
    render();
    if (removed > 0) saveData();
    if (data._dataError) {
      showToast('Your saved data could not be read and was backed up. Starting from an empty list.', 'error');
    }
  } catch (e) {
    console.error('Load error:', e);
    state.projects = getDefaultProjects();
    state.settings = getDefaultSettings();
    dataLoaded = true;
    render();
  }
}

function getDefaultProjects() {
  return [
    { id: 'proj_' + uid(), name: 'Administratie', icon: '📋', color: '#3b82f6', archived: false },
    { id: 'proj_' + uid(), name: 'Overig', icon: '📌', color: '#8b5cf6', archived: false },
    { id: 'proj_' + uid(), name: 'Example Project', icon: '🌱', color: '#10b981', archived: false }
  ];
}

function nextRecurDate(dateStr, repeat) {
  const base = dateStr ? new Date(dateStr + 'T00:00') : new Date();
  if (repeat === 'daily') base.setDate(base.getDate() + 1);
  else if (repeat === 'weekly') base.setDate(base.getDate() + 7);
  else if (repeat === 'monthly') base.setMonth(base.getMonth() + 1);
  else return dateStr || null;
  return base.getFullYear() + '-' + String(base.getMonth() + 1).padStart(2, '0') + '-' + String(base.getDate()).padStart(2, '0');
}

// When a repeating task is completed, queue its next occurrence.
function spawnRecurrence(task) {
  if (!task.repeat || task.repeat === 'none') return;
  state.todos.push({
    id: uid(),
    title: task.title,
    priority: task.priority || 'normal',
    dueDate: nextRecurDate(task.dueDate, task.repeat),
    projectId: task.projectId || null,
    completed: false,
    createdAt: new Date().toISOString(),
    notes: task.notes || '',
    links: (task.links || []).map(l => ({ ...l })),
    subtasks: (task.subtasks || []).map(s => ({ text: s.text, done: false })),
    repeat: task.repeat
  });
}

let dataLoaded = false;
let saveTimer = null;

async function saveNow() {
  saveTimer = null;
  if (!dataLoaded) return;
  try {
    const res = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (e) {
    console.error('Save error:', e);
    showToast('Could not save your changes. Check the app and try again.', 'error');
  }
}

// Coalesce rapid mutations (e.g. checking off several subtasks) into a single
// POST. A pending save is flushed when the window is hidden or closed so a
// change is never lost to the debounce window.
function saveData() {
  if (!dataLoaded) {
    console.warn('Skipping save - data not yet loaded');
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 250);
}

function flushSave() {
  if (!dataLoaded || !saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    if (navigator.sendBeacon && navigator.sendBeacon('/api/save-data', blob)) return;
  } catch (e) { /* fall through to fetch */ }
  saveNow();
}

window.addEventListener('beforeunload', flushSave);
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

function render() {
  renderProjects();
  renderTasks();
  updateProjectSelect();
}

function renderProjects() {
  const list = document.getElementById('projectList');
  let html = '<div class="project-item ' + (!selectedProjectId ? 'active' : '') + '" data-id=""><span class="project-dot" style="background:#999;"></span><span class="project-label">All Tasks</span></div>';

  const active = state.projects.filter(p => !p.archived);
  active.forEach(p => {
    const count = state.todos.filter(t => t.projectId === p.id && !t.completed).length;
    html += `<div class="project-item ${selectedProjectId === p.id ? 'active' : ''}" data-id="${p.id}" data-proj-id="${p.id}" draggable="true">
      <span class="proj-drag-handle" title="Drag to reorder">⋮⋮</span>
      <span class="project-dot" style="background:${p.color};"></span>
      <span class="project-label">${p.icon} ${escapeHtml(p.name)}</span>
      <span class="project-count">${count}</span>
      <button class="project-edit" data-edit-proj-id="${p.id}" title="Edit project">✎</button>
      <button class="project-delete" data-proj-id="${p.id}" title="Delete project">✕</button>
    </div>`;
  });

  const archived = state.projects.filter(p => p.archived);
  if (archived.length > 0) {
    html += `<div class="project-section-header" id="archivedToggle">${showArchivedProjects ? '▼' : '▶'} Archived (${archived.length})</div>`;
    if (showArchivedProjects) {
      archived.forEach(p => {
        const count = state.todos.filter(t => t.projectId === p.id && !t.completed).length;
        html += `<div class="project-item archived" data-id="${p.id}">
          <span class="project-dot" style="background:${p.color};"></span>
          <span class="project-label">${p.icon} ${escapeHtml(p.name)}</span>
          <span class="project-count">${count}</span>
          <button class="project-restore" data-restore-proj-id="${p.id}" title="Restore project">↩</button>
        </div>`;
      });
    }
  }

  list.innerHTML = html;
  list.querySelectorAll('.project-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('project-delete') || e.target.classList.contains('project-edit') || e.target.classList.contains('proj-drag-handle') || e.target.classList.contains('project-restore')) return;
      selectedProjectId = el.dataset.id || null;
      render();
    });
  });

  const archivedToggle = document.getElementById('archivedToggle');
  if (archivedToggle) {
    archivedToggle.addEventListener('click', () => {
      showArchivedProjects = !showArchivedProjects;
      renderProjects();
    });
  }

  list.querySelectorAll('.project-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const proj = state.projects.find(p => p.id === btn.dataset.restoreProjId);
      if (proj) { proj.archived = false; saveData(); render(); }
    });
  });

  list.querySelectorAll('.project-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projId = btn.dataset.editProjId;
      const proj = state.projects.find(p => p.id === projId);
      if (!proj) return;
      editingProjectId = projId;
      newProjectIcon = proj.icon;
      newProjectColor = proj.color;
      document.getElementById('projectName').value = proj.name;
      document.getElementById('projectModalTitle').textContent = 'Edit Project';
      document.getElementById('saveProjectBtn').textContent = 'Save';
      const archiveBtn = document.getElementById('archiveProjectBtn');
      archiveBtn.style.display = '';
      archiveBtn.textContent = proj.archived ? 'Unarchive project' : 'Archive project';
      setupProjectModal();
      document.getElementById('projectModal').classList.add('open');
    });
  });

  list.querySelectorAll('.project-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projId = btn.dataset.projId;
      if (confirm('Delete this project? Tasks in this project will not be deleted.')) {
        state.projects = state.projects.filter(p => p.id !== projId);
        if (selectedProjectId === projId) selectedProjectId = null;
        saveData();
        render();
      }
    });
  });

  // Drag-and-drop for projects
  let draggedId = null;
  list.querySelectorAll('.project-item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedId = item.dataset.projId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      list.querySelectorAll('.project-item').forEach(i => i.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (item.dataset.projId !== draggedId) item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetId = item.dataset.projId;
      if (!draggedId || !targetId || draggedId === targetId) return;

      const draggedIdx = state.projects.findIndex(p => p.id === draggedId);
      const targetIdx = state.projects.findIndex(p => p.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return;

      const [moved] = state.projects.splice(draggedIdx, 1);
      state.projects.splice(targetIdx, 0, moved);
      saveData();
      render();
    });
  });
}

function updateProjectSelect() {
  const sel = document.getElementById('projectSelect');
  const taskSel = document.getElementById('taskProject');
  let html = '<option value="">No project</option>';
  state.projects.filter(p => !p.archived).forEach(p => {
    html += `<option value="${p.id}">${p.icon} ${escapeHtml(p.name)}</option>`;
  });
  sel.innerHTML = html;
  if (taskSel) taskSel.innerHTML = html;
}

function renderStats() {
  // Include all completed tasks for total count, but only ones with completedAt for daily breakdown
  const allCompleted = state.todos.filter(t => t.completed);
  const completed = state.todos.filter(t => t.completed && t.completedAt);
  const today = new Date();
  today.setHours(0,0,0,0);

  // Last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push(d);
  }

  // Use local date string (not UTC) to avoid timezone bugs
  const toLocalDateStr = (d) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  const completedLocalDate = (t) => {
    const d = new Date(t.completedAt);
    return toLocalDateStr(d);
  };

  // Count tasks per day
  const dailyCounts = last7Days.map(day => {
    const dayStr = toLocalDateStr(day);
    const tasksOnDay = completed.filter(t => t.completedAt && completedLocalDate(t) === dayStr);
    return {
      date: day,
      count: tasksOnDay.length,
      time: tasksOnDay.reduce((s, t) => s + (t.timeSpent || 0), 0)
    };
  });

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);
  const totalCompleted = allCompleted.length;
  const totalTime = allCompleted.reduce((s, t) => s + (t.timeSpent || 0), 0);
  const todayCount = dailyCounts[dailyCounts.length - 1].count;
  const weekCount = dailyCounts.reduce((s, d) => s + d.count, 0);

  // Stats per project (all completed, regardless of completedAt)
  const byProject = {};
  allCompleted.forEach(t => {
    const pid = t.projectId || 'none';
    if (!byProject[pid]) byProject[pid] = { count: 0, time: 0 };
    byProject[pid].count++;
    byProject[pid].time += t.timeSpent || 0;
  });

  let html = `<div class="stats-view">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${todayCount}</div>
        <div class="stat-label">Completed Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${weekCount}</div>
        <div class="stat-label">This Week</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-value">${totalCompleted}</div>
        <div class="stat-label">Total Done</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">${Math.floor(totalTime/60)}h ${totalTime%60}m</div>
        <div class="stat-label">Time Logged</div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">📈 Tasks Completed (Last 7 Days)</div>`;

  const hasAnyCount = dailyCounts.some(d => d.count > 0);
  if (hasAnyCount) {
    html += `<div class="stats-chart">`;
    dailyCounts.forEach(d => {
      const heightPercent = (d.count / maxCount) * 100;
      const dayName = d.date.toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = d.date.toDateString() === today.toDateString();
      html += `<div class="stats-bar-wrap" title="${d.count} task${d.count !== 1 ? 's' : ''} on ${dayName}">
        <div class="stats-bar-label">${d.count > 0 ? d.count : ''}</div>
        <div class="stats-bar" style="height: ${heightPercent}%; background: ${isToday ? 'linear-gradient(180deg, #7c7efb, #6366f1)' : 'linear-gradient(180deg, #a5b4fc, #818cf8)'};"></div>
        <div class="stats-bar-day">${dayName}</div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="empty" style="padding: 24px;">No tasks completed in the last 7 days yet. Get started!</div>`;
  }
  html += `</div>`;

  // Time logged chart
  const maxTime = Math.max(...dailyCounts.map(d => d.time), 1);
  const hasAnyTime = dailyCounts.some(d => d.time > 0);

  html += `<div class="stats-section">
    <div class="stats-section-title">⏱️ Time Logged (Last 7 Days)</div>`;

  if (hasAnyTime) {
    html += `<div class="stats-chart">`;
    dailyCounts.forEach(d => {
      const heightPercent = (d.time / maxTime) * 100;
      const dayName = d.date.toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = d.date.toDateString() === today.toDateString();
      const hrs = Math.floor(d.time / 60), mins = d.time % 60;
      const timeStr = d.time > 0 ? (hrs > 0 ? `${hrs}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`) : '';
      html += `<div class="stats-bar-wrap" title="${timeStr || '0 min'} on ${dayName}">
        <div class="stats-bar-label" style="font-size: 10px;">${timeStr}</div>
        <div class="stats-bar" style="height: ${heightPercent}%; background: ${isToday ? 'linear-gradient(180deg, #f59e0b, #d97706)' : 'linear-gradient(180deg, #fcd34d, #fbbf24)'};"></div>
        <div class="stats-bar-day">${dayName}</div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="empty" style="padding: 24px;">No time logged yet. Add time when completing tasks!</div>`;
  }
  html += `</div>

    <div class="stats-section">
      <div class="stats-section-title">🏆 By Project</div>
      <div class="stats-projects">`;

  Object.keys(byProject).sort((a, b) => byProject[b].count - byProject[a].count).forEach(pid => {
    const proj = state.projects.find(p => p.id === pid);
    const name = proj ? `${proj.icon} ${escapeHtml(proj.name)}` : '📌 No Project';
    const color = proj ? proj.color : '#999';
    const data = byProject[pid];
    html += `<div class="stats-project-row">
      <div class="stats-project-dot" style="background: ${color};"></div>
      <div class="stats-project-name">${name}</div>
      <div class="stats-project-count">${data.count} tasks</div>
      ${data.time > 0 ? `<div class="stats-project-time">${Math.floor(data.time/60)}h ${data.time%60}m</div>` : ''}
    </div>`;
  });

  if (Object.keys(byProject).length === 0) {
    html += '<div class="empty">No completed tasks yet. Start checking some off!</div>';
  }

  html += `</div></div></div>`;
  return html;
}

function renderTasks() {
  const container = document.getElementById('activeList');

  let todos = [];
  if (currentTab === 'active') {
    todos = selectedProjectId ? state.todos.filter(t => t.projectId === selectedProjectId && !t.completed) : state.todos.filter(t => !t.completed);
  } else if (currentTab === 'timeline') {
    todos = state.todos.filter(t => !t.completed && t.dueDate);
  } else if (currentTab === 'archive') {
    todos = state.todos.filter(t => t.completed);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    todos = todos.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.notes || '').toLowerCase().includes(q) ||
      (t.subtasks || []).some(s => (s.text || '').toLowerCase().includes(q))
    );
  }

  document.getElementById('activeCount').textContent = state.todos.filter(t => !t.completed).length;
  document.getElementById('timelineCount').textContent = state.todos.filter(t => t.dueDate && !t.completed).length;
  document.getElementById('archiveCount').textContent = state.todos.filter(t => t.completed).length;

  if (currentTab === 'stats') {
    container.innerHTML = renderStats();
    return;
  }

  if (todos.length === 0) {
    container.innerHTML = searchQuery
      ? `<div class="empty">No tasks match "${escapeHtml(searchQuery)}"</div>`
      : '<div class="empty">No tasks here yet</div>';
    return;
  }

  let html = '';

  if (currentTab === 'timeline') {
    html = '<div class="timeline-view">';

    const today = new Date();

    // Group todos by ISO week, then by project
    const byWeekProject = {};
    todos.forEach(t => {
      const d = new Date(t.dueDate + 'T00:00');
      const { year, week } = isoWeek(d);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      const pid = t.projectId || 'none';
      if (!byWeekProject[weekKey]) byWeekProject[weekKey] = { date: d, tasks: {} };
      if (!byWeekProject[weekKey].tasks[pid]) byWeekProject[weekKey].tasks[pid] = [];
      byWeekProject[weekKey].tasks[pid].push(t);
    });

    html += '<div class="timeline-projects">';
    Object.keys(byWeekProject).sort().forEach(weekKey => {
      const weekData = byWeekProject[weekKey];
      const weekNum = parseInt(weekKey.slice(-2), 10);
      const weekStart = isoWeekMonday(weekData.date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      html += `<div style="margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--accent);">📆 Week ${weekNum} • ${weekRange}</div>`;

      const projectsInWeek = byWeekProject[weekKey].tasks;
      // Order by sidebar order, then add "No Project" / unknown at the end
      const orderedProjIds = state.projects.filter(p => projectsInWeek[p.id]).map(p => p.id);
      Object.keys(projectsInWeek).forEach(pid => {
        if (!orderedProjIds.includes(pid)) orderedProjIds.push(pid);
      });

      const todayStrLocal = todayStr();
      orderedProjIds.forEach(projId => {
        const proj = state.projects.find(p => p.id === projId);
        const projName = proj ? proj.name : 'No Project';
        const projIcon = proj ? proj.icon : '📌';
        const projColor = proj ? proj.color : '#999';
        const tasks = projectsInWeek[projId].sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        const expandKey = `${weekKey}:${projId}`;
        const isExpanded = expandedTimelineProjects.has(expandKey);

        const overdueCount = tasks.filter(t => isPastDue(t.dueDate)).length;
        const todayCount = tasks.filter(t => t.dueDate === todayStrLocal).length;

      html += `<div class="timeline-project">
        <div class="timeline-project-header timeline-project-toggle ${isExpanded ? 'expanded' : ''}" data-expand-key="${expandKey}" style="border-left: 4px solid ${projColor}; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            <span style="font-size: 20px;">${projIcon}</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 15px;">${escapeHtml(projName)}</div>
              <div style="font-size: 12px; color: var(--text-light); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
                <span>${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
                ${overdueCount > 0 ? `<span class="timeline-badge overdue">⚠️ ${overdueCount} overdue</span>` : ''}
                ${todayCount > 0 ? `<span class="timeline-badge today">⚡ ${todayCount} today</span>` : ''}
              </div>
            </div>
            <span class="timeline-chevron">${isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>`;

      if (isExpanded) {
        html += `<div class="timeline-tasks">`;
        tasks.forEach(t => {
          const d = new Date(t.dueDate + 'T00:00');
          const day = d.getDate();
          const subtaskCount = t.subtasks ? t.subtasks.length : 0;
          const subtaskDone = t.subtasks ? t.subtasks.filter(s => s.done).length : 0;
          const isToday = t.dueDate === todayStr();
          const priorityColor = t.priority === 'high' ? '#ef4444' : (t.priority === 'medium' ? '#f59e0b' : '#10b981');
          const priorityBg = t.priority === 'high' ? '#fff5f5' : (t.priority === 'medium' ? '#fffbf0' : '#f0fdf4');

          html += `<div class="timeline-task" data-id="${t.id}" style="border-left: 4px solid ${priorityColor}; background: ${priorityBg};">
            <div class="checkbox" data-action="toggle-timeline" data-id="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="timeline-task-day" style="background: ${priorityColor}; font-size: 12px;">
              <span>${day}</span>
            </div>
            <div class="timeline-task-content">
              <div style="font-weight: 500; font-size: 14px; display: flex; align-items: center; gap: 6px;">${t.priority !== 'normal' ? `<span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 3px; background: ${priorityColor}; color: white;">${t.priority.toUpperCase()}</span>` : ''} ${escapeHtml(t.title)}</div>
              ${subtaskCount > 0 ? `<div style="font-size: 12px; color: var(--text-light); margin-top: 4px; font-weight: 500;">✓ ${subtaskDone}/${subtaskCount}</div>` : ''}
            </div>
            ${isToday ? '<div style="font-size: 10px; background: var(--accent); color: white; padding: 2px 6px; border-radius: 3px; font-weight: 600;">Today</div>' : ''}
          </div>`;
        });
        html += `</div>`;
      }

        html += '</div>';
      });

      html += '</div>';
    });
    html += '</div></div>';
  } else {
    const renderTaskHtml = (t) => {
      const proj = state.projects.find(p => p.id === t.projectId);
      const dueText = t.dueDate ? new Date(t.dueDate + 'T00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
      const prioClass = t.priority === 'high' ? 'priority-high' : (t.priority === 'medium' ? 'priority-medium' : '');
      const completedClass = t.completed ? 'task-completed' : '';
      const isUrgent = isDueSoon(t.dueDate);
      const isOverdue = isPastDue(t.dueDate);
      return `<div class="task-item ${prioClass} ${completedClass} ${isUrgent ? 'urgent' : ''} ${isOverdue ? 'overdue' : ''}" data-id="${t.id}">
        <div class="task-row">
          <div class="checkbox ${t.completed ? 'checked' : ''}" data-action="toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="task-content">
            <div class="task-title">${isOverdue ? '⚠️ ' : (isUrgent ? '⏰ ' : '')}${escapeHtml(t.title)}</div>
            <div class="task-meta">
              ${proj ? `<span class="badge project">${proj.icon} ${escapeHtml(proj.name)}</span>` : ''}
              ${isOverdue ? '<span class="badge urgent-badge">OVERDUE</span>' : (isUrgent ? '<span class="badge urgent-badge urgent-soon">SOON</span>' : '')}
              ${t.priority !== 'normal' ? `<span class="badge">${t.priority}</span>` : ''}
              ${t.dueDate ? `<span class="badge">${dueText}</span>` : ''}
              ${t.repeat && t.repeat !== 'none' ? `<span class="badge" style="background:#e0e7ff; color:#4f46e5;">🔁 ${t.repeat}</span>` : ''}
              ${t.subtasks && t.subtasks.length > 0 ? `<span class="badge" style="background: #fef3c7; color: #92400e;">✓ ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}</span>` : ''}
            </div>
          </div>
          ${currentTab === 'archive' ? `<button class="task-delete-btn" data-delete-id="${t.id}" title="Delete task">✕</button>` : ''}
        </div>
      </div>`;
    };

    if (currentTab === 'archive') {
      // Archive: simple sorted list
      todos.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')).forEach(t => { html += renderTaskHtml(t); });
    } else {
      // Active: grouped by date buckets
      const todayDate = new Date(); todayDate.setHours(0,0,0,0);
      const tomorrowStr = shiftDate(1);
      const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon...
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endOfWeekStr = shiftDate(daysUntilSunday);
      const todayStrVal = todayStr();

      const buckets = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [], noDate: [] };
      todos.forEach(t => {
        if (!t.dueDate) { buckets.noDate.push(t); return; }
        if (isPastDue(t.dueDate)) { buckets.overdue.push(t); return; }
        if (t.dueDate === todayStrVal) { buckets.today.push(t); return; }
        if (t.dueDate === tomorrowStr) { buckets.tomorrow.push(t); return; }
        if (t.dueDate <= endOfWeekStr) { buckets.thisWeek.push(t); return; }
        buckets.later.push(t);
      });

      const sortByPrio = (a, b) => {
        const prio = { high: 0, medium: 1, normal: 2 };
        const aPrio = prio[a.priority] ?? 2, bPrio = prio[b.priority] ?? 2;
        if (aPrio !== bPrio) return aPrio - bPrio;
        return (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1;
      };
      Object.values(buckets).forEach(arr => arr.sort(sortByPrio));

      const sections = [
        { key: 'overdue',  label: '⚠️ Overdue',   tasks: buckets.overdue,  color: '#dc2626' },
        { key: 'today',    label: '⚡ Today',     tasks: buckets.today,    color: '#f59e0b' },
        { key: 'tomorrow', label: '☀️ Tomorrow',  tasks: buckets.tomorrow, color: '#10b981' },
        { key: 'thisWeek', label: '📆 This Week', tasks: buckets.thisWeek, color: '#3b82f6' },
        { key: 'later',    label: '📅 Later',     tasks: buckets.later,    color: '#8b5cf6' },
        { key: 'noDate',   label: '🗒️ No Date',  tasks: buckets.noDate,   color: '#9ca3af' }
      ];

      sections.forEach(sec => {
        if (sec.tasks.length === 0) return;
        html += `<div class="task-section-header" style="border-left: 3px solid ${sec.color};">
          <span>${sec.label}</span>
          <span class="task-section-count">${sec.tasks.length}</span>
        </div>`;
        sec.tasks.forEach(t => { html += renderTaskHtml(t); });
      });
    }
  }

  container.innerHTML = html;

  container.querySelectorAll('[data-action="toggle"]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.closest('.task-item').dataset.id;
      const t = state.todos.find(x => x.id === id);
      if (t) {
        let justCompleted = false;
        if (!t.completed) {
          if (t.subtasks && t.subtasks.length > 0 && !t.subtasks.every(s => s.done)) {
            const done = t.subtasks.filter(s => s.done).length;
            showToast(`Finish all subtasks first (${done}/${t.subtasks.length} done)`, 'warning');
            return;
          }
          const timeSpent = prompt('How long did this task take? (in minutes, optional)', '');
          t.completed = true;
          t.completedAt = new Date().toISOString();
          const mins = parseInt(timeSpent, 10);
          if (Number.isFinite(mins) && mins > 0 && mins < 1440) t.timeSpent = mins;
          spawnRecurrence(t);
          justCompleted = true;
        } else {
          t.completed = false;
          delete t.completedAt;
        }
        saveData();
        render();
        if (justCompleted) fireConfetti();
      }
    });
  });

  container.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('task-delete-btn')) return;
      openTaskModal(item.dataset.id);
    });
  });

  container.querySelectorAll('.task-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      if (confirm('Delete this task permanently?')) {
        state.todos = state.todos.filter(t => t.id !== id);
        saveData();
        render();
      }
    });
  });

  if (currentTab === 'timeline') {
    container.querySelectorAll('.timeline-task').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="toggle-timeline"]')) return;
        openTaskModal(item.dataset.id);
      });
    });
    container.querySelectorAll('[data-action="toggle-timeline"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.id;
        const t = state.todos.find(x => x.id === id);
        if (!t) return;
        if (t.subtasks && t.subtasks.length > 0 && !t.subtasks.every(s => s.done)) {
          const done = t.subtasks.filter(s => s.done).length;
          showToast(`Finish all subtasks first (${done}/${t.subtasks.length} done)`, 'warning');
          return;
        }
        const timeSpent = prompt('How long did this task take? (in minutes, optional)', '');
        t.completed = true;
        t.completedAt = new Date().toISOString();
        const mins = parseInt(timeSpent, 10);
        if (Number.isFinite(mins) && mins > 0 && mins < 1440) t.timeSpent = mins;
        spawnRecurrence(t);
        saveData();
        render();
        fireConfetti();
      });
    });
    container.querySelectorAll('.timeline-project-toggle').forEach(header => {
      header.addEventListener('click', () => {
        const key = header.dataset.expandKey;
        if (expandedTimelineProjects.has(key)) {
          expandedTimelineProjects.delete(key);
        } else {
          expandedTimelineProjects.add(key);
        }
        render();
      });
    });
  }

  if (currentTab === 'archive') {
    const existingBtn = document.getElementById('clearArchiveBtn');
    if (existingBtn) existingBtn.remove();

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearArchiveBtn';
    clearBtn.textContent = '🗑️ Clear Archive';
    clearBtn.style.cssText = 'padding: 10px 16px; background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%); color: #991b1b; border-radius: 10px; font-weight: 600; font-size: 13px; margin-top: 20px; cursor: pointer; transition: background-color 0.2s, border-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, opacity 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
    clearBtn.addEventListener('mouseover', () => clearBtn.style.transform = 'translateY(-2px)');
    clearBtn.addEventListener('mouseout', () => clearBtn.style.transform = 'translateY(0)');
    clearBtn.addEventListener('click', () => {
      if (confirm('Delete all completed tasks? This cannot be undone.')) {
        state.todos = state.todos.filter(t => !t.completed);
        saveData();
        render();
      }
    });
    container.appendChild(clearBtn);

    const cleanupWrap = document.createElement('div');
    cleanupWrap.style.cssText = 'margin-top: 16px; font-size: 13px; color: var(--text-light); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';
    const currentDays = (state.settings && state.settings.autoCleanupDays) || 0;
    cleanupWrap.innerHTML = 'Auto-delete completed tasks after '
      + '<select id="autoCleanupSelect" style="padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">'
      + [0, 30, 60, 90].map(d => `<option value="${d}" ${d === currentDays ? 'selected' : ''}>${d === 0 ? 'Never' : d + ' days'}</option>`).join('')
      + '</select>';
    container.appendChild(cleanupWrap);
    document.getElementById('autoCleanupSelect').addEventListener('change', (e) => {
      state.settings = state.settings || getDefaultSettings();
      state.settings.autoCleanupDays = parseInt(e.target.value, 10) || 0;
      const removed = applyAutoCleanup();
      saveData();
      render();
      if (removed > 0) showToast(`Removed ${removed} old completed task${removed !== 1 ? 's' : ''}`, 'success');
    });
  }
}

function fireConfetti() {
  if (typeof confetti !== 'function') return;
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

function setupProjectModal() {
  const iconPicker = document.getElementById('iconPicker');
  let html = '';
  ICONS.forEach(icon => {
    html += `<button class="icon-btn ${icon === newProjectIcon ? 'selected' : ''}" data-icon="${icon}">${icon}</button>`;
  });
  iconPicker.innerHTML = html;
  iconPicker.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      iconPicker.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      newProjectIcon = btn.dataset.icon;
    });
  });

  const colorPicker = document.getElementById('colorPicker');
  html = '';
  COLORS.forEach(color => {
    html += `<button class="color-btn ${color === newProjectColor ? 'selected' : ''}" data-color="${color}" style="background:${color};"></button>`;
  });
  colorPicker.innerHTML = html;
  colorPicker.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      colorPicker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      newProjectColor = btn.dataset.color;
    });
  });
}

document.getElementById('menuBtn').addEventListener('click', () => {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
});

document.getElementById('sidebarClose').addEventListener('click', () => {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
});

document.getElementById('overlay').addEventListener('click', () => {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
});

document.getElementById('newProjectBtn').addEventListener('click', () => {
  editingProjectId = null;
  newProjectIcon = ICONS[0];
  newProjectColor = COLORS[0];
  document.getElementById('projectName').value = '';
  document.getElementById('projectModalTitle').textContent = 'Create Project';
  document.getElementById('saveProjectBtn').textContent = 'Create';
  document.getElementById('archiveProjectBtn').style.display = 'none';
  setupProjectModal();
  document.getElementById('projectModal').classList.add('open');
});

document.getElementById('archiveProjectBtn').addEventListener('click', () => {
  const proj = state.projects.find(p => p.id === editingProjectId);
  if (proj) {
    proj.archived = !proj.archived;
    if (proj.archived && selectedProjectId === proj.id) selectedProjectId = null;
  }
  document.getElementById('projectModal').classList.remove('open');
  editingProjectId = null;
  saveData();
  render();
});

document.getElementById('cancelProjectBtn').addEventListener('click', () => {
  document.getElementById('projectModal').classList.remove('open');
  editingProjectId = null;
});

document.getElementById('saveProjectBtn').addEventListener('click', () => {
  const name = document.getElementById('projectName').value.trim();
  if (!name) { showToast('Please enter a project name', 'warning'); return; }

  if (editingProjectId) {
    const proj = state.projects.find(p => p.id === editingProjectId);
    if (proj) {
      proj.name = name;
      proj.icon = newProjectIcon;
      proj.color = newProjectColor;
    }
    editingProjectId = null;
  } else {
    state.projects.push({
      id: 'proj_' + uid(),
      name,
      icon: newProjectIcon,
      color: newProjectColor,
      archived: false
    });
  }

  document.getElementById('projectModal').classList.remove('open');
  saveData();
  render();
});

document.getElementById('addBtn').addEventListener('click', () => {
  const title = document.getElementById('taskInput').value.trim();
  if (!title) return;

  const dueDate = document.getElementById('taskDate').value || null;
  const projectId = document.getElementById('projectSelect').value || null;
  const priority = document.getElementById('prioritySelect').value || 'normal';

  const task = {
    id: uid(),
    title,
    priority,
    dueDate,
    projectId,
    completed: false,
    createdAt: new Date().toISOString()
  };

  state.todos.push(task);
  document.getElementById('taskInput').value = '';
  document.getElementById('projectSelect').value = '';
  document.getElementById('taskDate').value = '';
  document.getElementById('prioritySelect').value = 'normal';
  resetDateSelect();

  saveData();
  render();
});

function resetDateSelect() {
  const sel = document.getElementById('dateSelect');
  const customOpt = sel.querySelector('option[data-custom]');
  if (customOpt) customOpt.remove();
  sel.value = '';
}

document.getElementById('dateSelect').addEventListener('change', (e) => {
  const val = e.target.value;
  const dateInput = document.getElementById('taskDate');
  const sel = e.target;

  // Remove any previous custom date option
  const customOpt = sel.querySelector('option[data-custom]');
  if (customOpt) customOpt.remove();

  if (!val) { dateInput.value = ''; return; }

  if (val === 'today') dateInput.value = todayStr();
  else if (val === 'tomorrow') dateInput.value = shiftDate(1);
  else if (val === 'nextweek') dateInput.value = shiftDate(7);
  else if (val === 'custom') {
    if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
    else dateInput.click();
    sel.value = '';
  }
});

document.getElementById('taskDate').addEventListener('change', (e) => {
  const date = e.target.value;
  if (!date) return;
  const sel = document.getElementById('dateSelect');
  const existing = sel.querySelector('option[data-custom]');
  if (existing) existing.remove();
  const formatted = new Date(date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const opt = document.createElement('option');
  opt.value = 'picked';
  opt.dataset.custom = 'true';
  opt.textContent = '📅 ' + formatted;
  opt.selected = true;
  sel.appendChild(opt);
});

document.getElementById('taskInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab || 'active';
    const addTaskSection = document.getElementById('addTaskSection');
    if (currentTab === 'active') {
      addTaskSection.classList.remove('hidden');
    } else {
      addTaskSection.classList.add('hidden');
    }
    render();
  });
});

function openTaskModal(taskId) {
  const task = state.todos.find(t => t.id === taskId);
  if (!task) return;

  expandedTaskId = taskId;
  editingPriority = task.priority || 'normal';
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskNotes').value = task.notes || '';
  document.getElementById('taskDateEdit').value = task.dueDate || '';
  document.getElementById('taskRepeat').value = task.repeat || 'none';

  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === editingPriority);
  });

  renderSubtasks();
  renderLinks();

  updateProjectSelect();
  document.getElementById('taskProject').value = task.projectId || '';
  document.getElementById('taskModal').classList.add('open');
}

function renderSubtasks() {
  const task = state.todos.find(t => t.id === expandedTaskId);
  if (!task) return;

  const list = document.getElementById('subtaskList');
  if (!task.subtasks || task.subtasks.length === 0) {
    list.innerHTML = '';
    return;
  }

  let html = '';
  task.subtasks.forEach((sub, idx) => {
    html += `<div class="subtask-item ${sub.done ? 'done' : ''}">
      <div class="subtask-check ${sub.done ? 'checked' : ''}" data-subtask="${idx}">
        ${sub.done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
      <span class="subtask-text">${escapeHtml(sub.text)}</span>
      <button class="subtask-remove" data-remove-subtask="${idx}" title="Remove">×</button>
    </div>`;
  });
  list.innerHTML = html;

  list.querySelectorAll('.subtask-check').forEach(cb => {
    cb.addEventListener('click', () => {
      const idx = parseInt(cb.dataset.subtask);
      task.subtasks[idx].done = !task.subtasks[idx].done;
      const allDone = task.subtasks.every(s => s.done);
      saveData();
      renderSubtasks();
      if (allDone && task.subtasks.length > 0) fireConfetti();
    });
  });

  list.querySelectorAll('[data-remove-subtask]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeSubtask);
      task.subtasks.splice(idx, 1);
      saveData();
      renderSubtasks();
    });
  });
}

function renderLinks() {
  const task = state.todos.find(t => t.id === expandedTaskId);
  if (!task) return;

  const list = document.getElementById('linksList');
  if (!task.links || task.links.length === 0) {
    list.innerHTML = '';
    return;
  }

  let html = '';
  task.links.forEach((link, idx) => {
    html += `<div class="link-item">
      <button class="link-open" data-open-link="${idx}" title="Open">
        <strong>${escapeHtml(link.label || 'Link')}</strong><br>
        <small>${escapeHtml(link.url)}</small>
      </button>
      <button data-remove-link="${idx}" style="color: #dc2626; cursor: pointer; font-weight: 600;">×</button>
    </div>`;
  });
  list.innerHTML = html;

  list.querySelectorAll('[data-open-link]').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = task.links[parseInt(btn.dataset.openLink)];
      if (link) openLink(link.url);
    });
  });

  list.querySelectorAll('[data-remove-link]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeLink);
      task.links.splice(idx, 1);
      saveData();
      renderLinks();
    });
  });
}

document.getElementById('addSubtaskBtn').addEventListener('click', () => {
  const task = state.todos.find(t => t.id === expandedTaskId);
  if (!task) return;
  const text = document.getElementById('subtaskInput').value.trim();
  if (!text) return;

  if (!task.subtasks) task.subtasks = [];
  task.subtasks.push({ text, done: false });
  document.getElementById('subtaskInput').value = '';
  saveData();
  renderSubtasks();
});

document.getElementById('subtaskInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('addSubtaskBtn').click();
});

document.getElementById('addLinkBtn').addEventListener('click', () => {
  const task = state.todos.find(t => t.id === expandedTaskId);
  if (!task) return;
  const label = document.getElementById('linkLabel').value.trim();
  const url = document.getElementById('linkUrl').value.trim();
  if (!url) return;

  if (!task.links) task.links = [];
  task.links.push({ label, url });
  document.getElementById('linkLabel').value = '';
  document.getElementById('linkUrl').value = '';
  saveData();
  renderLinks();
});

document.querySelectorAll('.priority-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Stage the choice; it is applied when the task is saved (B9)
    editingPriority = btn.dataset.priority;
    document.querySelectorAll('.priority-btn').forEach(b => {
      b.classList.remove('active');
    });
    btn.classList.add('active');
  });
});

document.getElementById('saveTaskBtn').addEventListener('click', () => {
  const task = state.todos.find(t => t.id === expandedTaskId);
  if (!task) return;

  const newTitle = document.getElementById('taskTitle').value.trim();
  if (!newTitle) { showToast('Task title cannot be empty', 'warning'); return; }

  task.title = newTitle;
  task.notes = document.getElementById('taskNotes').value.trim();
  task.dueDate = document.getElementById('taskDateEdit').value || null;
  task.repeat = document.getElementById('taskRepeat').value || 'none';
  task.projectId = document.getElementById('taskProject').value || null;
  task.priority = editingPriority || 'normal';

  saveData();
  document.getElementById('taskModal').classList.remove('open');
  expandedTaskId = null;
  render();
});

document.getElementById('deleteTaskBtn').addEventListener('click', () => {
  if (!confirm('Delete this task?')) return;
  state.todos = state.todos.filter(t => t.id !== expandedTaskId);
  document.getElementById('taskModal').classList.remove('open');
  expandedTaskId = null;
  saveData();
  render();
});

document.getElementById('closeTaskModal').addEventListener('click', () => {
  document.getElementById('taskModal').classList.remove('open');
  expandedTaskId = null;
});

// F1: live search
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  searchClear.style.display = searchQuery ? '' : 'none';
  renderTasks();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.style.display = 'none';
  renderTasks();
  searchInput.focus();
});

// F2: export / import the whole data file
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '2do-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.todos) || !Array.isArray(data.projects)) throw new Error('bad shape');
      if (!confirm('Replace all current tasks and projects with the imported file?')) { e.target.value = ''; return; }
      state.todos = data.todos.map(normalizeTodo);
      state.projects = data.projects;
      state.settings = Object.assign(getDefaultSettings(), data.settings || {});
      saveData();
      render();
      showToast('Import successful', 'success');
    } catch (err) {
      showToast('Import failed: not a valid 2Do backup', 'error');
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
});

// F3: open a link's URL or file path through the OS default handler
function openLink(target) {
  if (!target) return;
  fetch('/api/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target })
  }).then(res => { if (!res.ok) throw new Error('open failed'); })
    .catch(() => showToast('Could not open this link', 'error'));
}

// F9: keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.modal.open');
    if (openModal) {
      openModal.classList.remove('open');
      expandedTaskId = null;
      editingProjectId = null;
      return;
    }
    if (document.activeElement === searchInput) { searchInput.blur(); return; }
  }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
  else if (e.key === 'n') { e.preventDefault(); if (currentTab === 'active') document.getElementById('taskInput').focus(); }
  else if (e.key >= '1' && e.key <= '4') {
    const tabs = ['active', 'timeline', 'archive', 'stats'];
    const tab = document.querySelector(`.tab[data-tab="${tabs[parseInt(e.key) - 1]}"]`);
    if (tab) tab.click();
  }
});

loadData();
