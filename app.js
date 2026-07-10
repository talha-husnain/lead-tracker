/* ============================================================
   Lead Tracker — application logic (vanilla JS, no dependencies)
   Data is stored locally in your browser and can be linked to a
   real file on disk + exported to JSON/CSV so nothing is ever lost.
   ============================================================ */
'use strict';

/* ----------------------- Constants ----------------------- */
const STORAGE_KEY = 'leadtracker.db.v1';
const SCHEMA_VERSION = 1;

const DEFAULT_STATUSES = [
  { id: 'new',         label: 'New Lead',          color: '#2a78d6' },
  { id: 'contacted',   label: 'Contacted',         color: '#4a3aa7' },
  { id: 'meeting',     label: 'Meeting Scheduled', color: '#1baf7a' },
  { id: 'met',         label: 'Meeting Done',      color: '#eb6834' },
  { id: 'proposal',    label: 'Proposal Sent',     color: '#eda100' },
  { id: 'negotiation', label: 'Negotiation',       color: '#e87ba4' },
  { id: 'won',         label: 'Won',               color: '#0ca30c', terminal: 'won' },
  { id: 'lost',        label: 'Lost',              color: '#d03b3b', terminal: 'lost' },
  { id: 'hold',        label: 'On Hold',           color: '#898781' },
];

const PRIORITIES = [
  { id: 'hot',  label: 'Hot',  color: '#d03b3b' },
  { id: 'warm', label: 'Warm', color: '#eda100' },
  { id: 'cold', label: 'Cold', color: '#2a78d6' },
];

const SOURCES = ['LinkedIn', 'Referral', 'Website', 'Cold Email', 'Cold Call',
  'Instagram', 'Facebook', 'Upwork', 'Event / Conference', 'Inbound', 'Other'];

const DEFAULT_TEMPLATES = [
  { id: 'after-meeting', name: 'After a meeting', subject: 'Great connecting, {firstName}',
    body: "Hi {firstName},\n\nThank you for taking the time to meet today — I really enjoyed learning more about {company} and what you're working toward.\n\nAs discussed, here are the next steps:\n•\n•\n\nI'll follow up with more detail shortly. In the meantime, let me know if any questions come up.\n\nBest,\n{me}\n{myCompany}" },
  { id: 'proposal', name: 'Proposal follow-up', subject: 'Proposal for {company}',
    body: "Hi {firstName},\n\nFollowing up on the proposal I sent over for {company}. I'd love to hear your thoughts and answer any questions.\n\nAre you free for a quick call this week?\n\nBest,\n{me}\n{myCompany}" },
  { id: 'checkin', name: 'Gentle check-in', subject: 'Checking in, {firstName}',
    body: "Hi {firstName},\n\nJust circling back on my last note — I know things get busy! Is now a good time to pick this back up?\n\nHappy to work around your schedule.\n\nBest,\n{me}\n{myCompany}" },
  { id: 'breakup', name: 'Break-up (last try)', subject: 'Should I close your file?',
    body: "Hi {firstName},\n\nI haven't heard back, so I don't want to keep filling your inbox. If the timing isn't right, no problem at all — just reply and I'll reach out down the road.\n\nWishing {company} all the best,\n{me}\n{myCompany}" },
];

/* ----------------------- State ----------------------- */
let DB = null;
let fsHandle = null;         // FileSystemFileHandle when a data file is linked
let saveTimer = null;

const state = {
  view: 'dashboard',
  search: '',
  filterStatus: 'all',
  filterPriority: 'all',
  filterSource: 'all',
  sort: 'followup',
  selectedId: null,
  selected: new Set(),
};

/* ----------------------- Utilities ----------------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function uid() {
  return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function nowISO() { return new Date().toISOString(); }

function fmtMoney(n) {
  const v = Number(n) || 0;
  if (!v) return '—';
  return '$' + v.toLocaleString('en-US');
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function relDays(dateStr) {
  // returns integer days from today (negative = overdue)
  if (!dateStr) return null;
  const a = new Date(dateStr + 'T00:00:00');
  const b = new Date(todayStr() + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}
function initials(name) {
  const p = (name || '?').trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}
function colorFor(name) {
  const palette = ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e87ba4', '#eb6834', '#008300', '#e34948'];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
function statusById(id) { return DB.statuses.find(s => s.id === id) || DB.statuses[0]; }
function prioById(id) { return PRIORITIES.find(p => p.id === id) || PRIORITIES[2]; }
function withAlpha(hex, a) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ----------------------- Persistence ----------------------- */
function freshDB() {
  return {
    version: SCHEMA_VERSION,
    leads: [],
    statuses: DEFAULT_STATUSES.map(s => ({ ...s })),
    settings: {
      theme: null, lastBackup: null, fileLinked: false, notify: false,
      goal: 0, senderName: '', senderCompany: 'BrandLux Media',
      templates: DEFAULT_TEMPLATES.map(t => ({ ...t })),
    },
  };
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.leads)) return null;
    if (!Array.isArray(data.statuses) || !data.statuses.length) data.statuses = DEFAULT_STATUSES.map(s => ({ ...s }));
    data.settings = Object.assign(
      { theme: null, goal: 0, notify: false, senderName: '', senderCompany: 'BrandLux Media', templates: DEFAULT_TEMPLATES.map(t => ({ ...t })) },
      data.settings || {}
    );
    if (!Array.isArray(data.settings.templates) || !data.settings.templates.length) data.settings.templates = DEFAULT_TEMPLATES.map(t => ({ ...t }));
    data.leads.forEach(l => { if (!Array.isArray(l.links)) l.links = []; if (!Array.isArray(l.notes)) l.notes = []; });
    return data;
  } catch (e) { console.warn('load failed', e); return null; }
}

function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); }
  catch (e) { toast('⚠ Could not save locally: ' + e.message); }
}

// Save to localStorage immediately; debounce writing to the linked file.
function save() {
  saveLocal();
  if (fsHandle) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeToFile, 600);
  }
}

/* ---- File System Access API (optional real-file persistence) ---- */
function fsSupported() { return typeof window.showSaveFilePicker === 'function'; }

async function writeToFile() {
  if (!fsHandle) return;
  try {
    const perm = await fsHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;
    const w = await fsHandle.createWritable();
    await w.write(JSON.stringify(DB, null, 2));
    await w.close();
  } catch (e) { console.warn('file write failed', e); }
}

async function linkDataFile() {
  if (!fsSupported()) {
    toast('This browser can’t auto-save to a file — use “Download backup” instead.');
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'lead-tracker-data.json',
      types: [{ description: 'Lead Tracker data', accept: { 'application/json': ['.json'] } }],
    });
    fsHandle = handle;
    await idbSet('fileHandle', handle);
    DB.settings.fileLinked = true;
    saveLocal();
    await writeToFile();
    toast('🔗 Data file linked — changes now auto-save to disk.');
    renderBanner();
  } catch (e) {
    if (e && e.name !== 'AbortError') toast('Could not link file: ' + e.message);
  }
}

async function tryRestoreFileLink() {
  if (!fsSupported()) return;
  try {
    const handle = await idbGet('fileHandle');
    if (!handle) return;
    fsHandle = handle;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      const file = await handle.getFile();
      const text = await file.text();
      if (text && text.trim()) {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.leads)) { DB = data; saveLocal(); }
      }
    } else {
      // needs a user gesture to re-grant; surface a reconnect button
      DB.settings.fileNeedsReconnect = true;
    }
  } catch (e) { console.warn('restore link failed', e); }
}

async function reconnectFile() {
  if (!fsHandle) return linkDataFile();
  try {
    const perm = await fsHandle.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      const file = await fsHandle.getFile();
      const text = await file.text();
      if (text && text.trim()) {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.leads)) { DB = data; }
      }
      DB.settings.fileNeedsReconnect = false;
      save(); renderBanner(); render();
      toast('🔗 Reconnected — auto-save is on.');
    }
  } catch (e) { toast('Reconnect failed: ' + e.message); }
}

/* ---- tiny IndexedDB kv store (only used to remember the file handle) ---- */
function idbOpen() {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open('leadtracker', 1); }
    catch (e) { return reject(e); }
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, val) {
  try {
    const db = await idbOpen();
    await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, key);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  } catch (e) { /* file-link memory unavailable; ignore */ }
}
async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((res, rej) => {
      const tx = db.transaction('kv', 'readonly');
      const r = tx.objectStore('kv').get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  } catch (e) { return null; }
}

/* ----------------------- Backup / Export / Import ----------------------- */
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupJSON() {
  DB.settings.lastBackup = nowISO();
  saveLocal();
  const stamp = todayStr();
  downloadFile(`lead-tracker-backup-${stamp}.json`, JSON.stringify(DB, null, 2), 'application/json');
  toast('⬇ Backup downloaded.');
  renderBanner();
}

function exportCSV() {
  const cols = ['Name', 'Email', 'Phone', 'Company', 'Title', 'Source', 'Source URL',
    'Status', 'Priority', 'Value', 'Tags', 'Next Follow-up', 'Created', 'Updated', 'Notes'];
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = DB.leads.map(l => [
    l.name, l.email, l.phone, l.company, l.title, l.source, l.sourceUrl,
    statusById(l.status).label, prioById(l.priority).label, l.value || '',
    (l.tags || []).join('; '), l.nextFollowUp || '',
    fmtDate(l.createdAt), fmtDate(l.updatedAt),
    (l.notes || []).map(n => `[${fmtDate(n.at)}] ${n.text}`).join('  •  '),
  ].map(q).join(','));
  downloadFile(`lead-tracker-${todayStr()}.csv`, [cols.map(q).join(','), ...rows].join('\r\n'), 'text/csv');
  toast('↧ CSV exported — open it in Excel.');
}

function restoreBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.leads)) throw new Error('Not a valid backup file.');
        if (!Array.isArray(data.statuses) || !data.statuses.length) data.statuses = DEFAULT_STATUSES.map(s => ({ ...s }));
        if (!confirm(`Restore ${data.leads.length} leads from this backup? This replaces your current data.`)) return;
        DB = data; if (!DB.settings) DB.settings = {};
        save(); render(); renderBanner();
        toast('⬆ Backup restored.');
      } catch (e) { alert('Could not restore: ' + e.message); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* ----------------------- Lead operations ----------------------- */
function getLead(id) { return DB.leads.find(l => l.id === id); }

function upsertLead(data) {
  const now = nowISO();
  if (data.id) {
    const l = getLead(data.id);
    Object.assign(l, data, { updatedAt: now });
    return l;
  }
  const lead = {
    id: uid(),
    name: '', email: '', phone: '', company: '', title: '',
    source: 'LinkedIn', sourceUrl: '', status: DB.statuses[0].id,
    priority: 'warm', value: 0, tags: [], nextFollowUp: '',
    notes: [], links: [], createdAt: now, updatedAt: now,
    ...data,
  };
  DB.leads.unshift(lead);
  return lead;
}

function deleteLead(id) {
  const l = getLead(id); if (!l) return;
  const index = DB.leads.indexOf(l);
  DB.leads.splice(index, 1);
  state.selected.delete(id);
  if (state.selectedId === id) closeDrawer();
  save(); render(); renderBanner();
  toastAction(`Deleted “${l.name || 'lead'}”.`, 'Undo', () => {
    DB.leads.splice(Math.min(index, DB.leads.length), 0, l);
    save(); render(); renderBanner(); toast('Restored.');
  });
}

function addNote(id, text) {
  const l = getLead(id); if (!l || !text.trim()) return;
  l.notes = l.notes || [];
  l.notes.unshift({ id: uid(), text: text.trim(), at: nowISO() });
  l.updatedAt = nowISO();
  save(); openDrawer(id); render();
}

function deleteNote(leadId, noteId) {
  const l = getLead(leadId); if (!l) return;
  l.notes = (l.notes || []).filter(n => n.id !== noteId);
  save(); openDrawer(leadId);
}

function setStatus(id, statusId) {
  const l = getLead(id); if (!l) return;
  const st = statusById(statusId);
  l.status = statusId; l.updatedAt = nowISO();
  if (st.terminal) { l.closedAt = nowISO(); save(); render(); renderBanner(); openTerminalModal(id, st); return; }
  save(); render(); renderBanner();
  if (state.selectedId === id) openDrawer(id);
}

/* ----------------------- Filtering / sorting ----------------------- */
function visibleLeads() {
  let list = DB.leads.slice();
  const q = state.search.trim().toLowerCase();
  if (q) {
    list = list.filter(l => [l.name, l.email, l.company, l.title, l.source, (l.tags || []).join(' '),
      (l.notes || []).map(n => n.text).join(' ')].join(' ').toLowerCase().includes(q));
  }
  if (state.filterStatus !== 'all') list = list.filter(l => l.status === state.filterStatus);
  if (state.filterPriority !== 'all') list = list.filter(l => l.priority === state.filterPriority);
  if (state.filterSource !== 'all') list = list.filter(l => l.source === state.filterSource);

  const stOrder = {}; DB.statuses.forEach((s, i) => stOrder[s.id] = i);
  const prOrder = { hot: 0, warm: 1, cold: 2 };
  const sorters = {
    followup: (a, b) => followupRank(a) - followupRank(b),
    name: (a, b) => (a.name || '').localeCompare(b.name || ''),
    created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    status: (a, b) => (stOrder[a.status] ?? 99) - (stOrder[b.status] ?? 99),
    priority: (a, b) => (prOrder[a.priority] ?? 9) - (prOrder[b.priority] ?? 9),
    value: (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0),
  };
  list.sort(sorters[state.sort] || sorters.followup);
  return list;
}
function followupRank(l) {
  // leads with a due date sort first (soonest/overdue first); none go last
  const d = relDays(l.nextFollowUp);
  if (d === null) return 1e9;
  return d;
}
function isOpenLead(l) { return !statusById(l.status).terminal; }

/* ----------------------- Rendering: shell ----------------------- */
function render() {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === state.view));
  const app = $('#app');
  if (!DB.leads.length && state.view !== 'board') { app.innerHTML = emptyStateHTML(); return; }
  if (state.view === 'dashboard') app.innerHTML = dashboardHTML();
  else if (state.view === 'leads') app.innerHTML = leadsHTML();
  else if (state.view === 'board') app.innerHTML = boardHTML();
  else if (state.view === 'reports') app.innerHTML = reportsHTML();
  if (state.view === 'board') wireBoard();
  renderBulkBar();
}

function emptyStateHTML() {
  return `<div class="empty card card-pad">
    <div class="empty-mark">🎯</div>
    <h2>Welcome to your Lead Tracker</h2>
    <p>Capture every lead, track meeting follow-ups so none slip through, and watch your pipeline
       move from first contact to won — all stored right here on your computer.</p>
    <div>
      <button class="btn btn-primary" data-action="add-lead"><span class="plus">+</span> Add your first lead</button>
      <button class="btn btn-ghost" data-action="sample">✨ Load sample data</button>
    </div>
  </div>`;
}

/* ----------------------- Rendering: dashboard ----------------------- */
function dashboardHTML() {
  const leads = DB.leads;
  const open = leads.filter(isOpenLead);
  const due = leads.filter(l => isOpenLead(l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0);
  const week = leads.filter(l => { const d = relDays(l.nextFollowUp); return d !== null && d >= 0 && d <= 7; });
  const won = leads.filter(l => statusById(l.status).terminal === 'won');
  const lost = leads.filter(l => statusById(l.status).terminal === 'lost');
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round(won.length / closed * 100) : 0;
  const pipeVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const wonVal = won.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const kpis = [
    { label: 'Open Leads', value: open.length, sub: `${leads.length} total`, cls: '' },
    { label: 'Follow-ups Due', value: due.length, sub: due.length ? 'Needs attention today' : 'All caught up 🎉', cls: due.length ? 'kpi-danger' : 'kpi-good' },
    { label: 'Due This Week', value: week.length, sub: 'Next 7 days', cls: 'kpi-warn' },
    { label: 'Pipeline Value', value: fmtMoney(pipeVal), sub: 'Open opportunities', cls: '' },
    { label: 'Won', value: won.length, sub: `${winRate}% win rate · ${fmtMoney(wonVal)}`, cls: 'kpi-good' },
  ];

  const kpiRow = kpis.map(k => `<div class="kpi ${k.cls}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value tabular">${k.value}</div>
      <div class="kpi-sub">${esc(k.sub)}</div>
    </div>`).join('');

  // attention list (overdue + today + upcoming), open leads only
  const attention = leads.filter(l => isOpenLead(l) && l.nextFollowUp)
    .sort((a, b) => followupRank(a) - followupRank(b)).slice(0, 8);
  const attHTML = attention.length ? attention.map(l => {
    const d = relDays(l.nextFollowUp);
    const cls = d < 0 ? 'overdue' : d === 0 ? 'today' : '';
    const when = d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : `in ${d}d`;
    return `<div class="att-item" data-action="open-lead" data-id="${l.id}">
      <div class="avatar" style="background:${colorFor(l.name)}">${esc(initials(l.name))}</div>
      <div>
        <div class="att-name">${esc(l.name || 'Untitled lead')}</div>
        <div class="att-meta">${esc(statusById(l.status).label)}${l.company ? ' · ' + esc(l.company) : ''}</div>
      </div>
      <div class="att-when ${cls}">${when}</div>
    </div>`;
  }).join('') : `<p style="color:var(--muted)">No follow-ups scheduled. Open a lead and set a “Next follow-up” date.</p>`;

  // pipeline breakdown bars
  const max = Math.max(1, ...DB.statuses.map(s => leads.filter(l => l.status === s.id).length));
  const pipeHTML = DB.statuses.map(s => {
    const n = leads.filter(l => l.status === s.id).length;
    return `<div class="pipe-row">
      <div class="pipe-name"><span class="dot" style="background:${s.color}"></span>${esc(s.label)}</div>
      <div class="pipe-track"><div class="pipe-fill" style="width:${n / max * 100}%;background:${s.color}"></div></div>
      <div class="pipe-count tabular">${n}</div>
    </div>`;
  }).join('');

  // recent activity from notes
  const acts = [];
  leads.forEach(l => (l.notes || []).forEach(n => acts.push({ l, n })));
  acts.sort((a, b) => new Date(b.n.at) - new Date(a.n.at));
  const actHTML = acts.slice(0, 6).map(({ l, n }) => `
    <div class="att-item" data-action="open-lead" data-id="${l.id}">
      <div class="avatar" style="background:${colorFor(l.name)}">${esc(initials(l.name))}</div>
      <div>
        <div class="att-name">${esc(l.name || 'Lead')}</div>
        <div class="att-meta">${esc(n.text).slice(0, 60)}${n.text.length > 60 ? '…' : ''}</div>
      </div>
      <div class="att-when">${esc(fmtDate(n.at))}</div>
    </div>`).join('') || `<p style="color:var(--muted)">No notes yet.</p>`;

  const goal = DB.settings.goal || 0;
  const wonThisMonth = won.filter(l => monthKey(l.closedAt || l.updatedAt) === monthKey(nowISO())).reduce((a, l) => a + (Number(l.value) || 0), 0);
  const goalStrip = goal ? `<div class="card card-pad goal-strip">
      <div class="goal-label"><span class="card-title" style="margin:0">Monthly goal</span> <strong class="tabular">${fmtMoney(wonThisMonth)}</strong> <span style="color:var(--muted)">of ${fmtMoney(goal)}</span></div>
      <div class="meter"><div class="meter-fill" style="width:${Math.min(100, wonThisMonth / goal * 100)}%"></div></div>
      <div class="kpi-sub tabular">${Math.round(wonThisMonth / goal * 100)}%${wonThisMonth >= goal ? ' 🎉' : ''}</div></div>` : '';

  return `
    <div class="view-head"><div class="view-title">Dashboard<small>${esc(greeting())}</small></div>
      <button class="btn btn-primary" data-action="add-lead"><span class="plus">+</span> Add Lead</button></div>
    <div class="kpi-row">${kpiRow}</div>
    ${goalStrip}
    <div class="dash-grid">
      <div>
        <div class="card card-pad" style="margin-bottom:18px">
          <div class="card-title">⏰ Needs attention</div>${attHTML}
        </div>
        <div class="card card-pad">
          <div class="card-title">Recent activity</div>${actHTML}
        </div>
      </div>
      <div class="card card-pad">
        <div class="card-title">Pipeline breakdown</div>${pipeHTML}
      </div>
    </div>`;
}
function greeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const due = DB.leads.filter(l => isOpenLead(l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0).length;
  return due ? `${g} — you have ${due} follow-up${due > 1 ? 's' : ''} to send today.` : `${g} — you’re all caught up.`;
}

/* ----------------------- Rendering: leads table ----------------------- */
function leadsHTML() {
  const list = visibleLeads();
  const statusOpts = ['all', ...DB.statuses.map(s => s.id)]
    .map(v => `<option value="${v}"${state.filterStatus === v ? ' selected' : ''}>${v === 'all' ? 'All statuses' : esc(statusById(v).label)}</option>`).join('');
  const prioOpts = ['all', ...PRIORITIES.map(p => p.id)]
    .map(v => `<option value="${v}"${state.filterPriority === v ? ' selected' : ''}>${v === 'all' ? 'All priorities' : esc(prioById(v).label)}</option>`).join('');
  const srcOpts = ['all', ...SOURCES]
    .map(v => `<option value="${v}"${state.filterSource === v ? ' selected' : ''}>${v === 'all' ? 'All sources' : esc(v)}</option>`).join('');
  const sortOpts = [['followup', 'Follow-up date'], ['updated', 'Recently updated'], ['created', 'Newest'],
    ['name', 'Name A–Z'], ['status', 'Status'], ['priority', 'Priority'], ['value', 'Value']]
    .map(([v, t]) => `<option value="${v}"${state.sort === v ? ' selected' : ''}>${t}</option>`).join('');

  const rows = list.map(l => rowHTML(l)).join('') ||
    `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:40px">No leads match your filters.</td></tr>`;

  return `
    <div class="view-head"><div class="view-title">Leads<small>${list.length} shown · ${DB.leads.length} total</small></div>
      <button class="btn btn-primary" data-action="add-lead"><span class="plus">+</span> Add Lead</button></div>
    <div class="filters">
      <span class="filter-tag">Filter</span>
      <select data-filter="status">${statusOpts}</select>
      <select data-filter="priority">${prioOpts}</select>
      <select data-filter="source">${srcOpts}</select>
      <span class="spacer"></span>
      <span class="filter-tag">Sort by</span>
      <select data-filter="sort">${sortOpts}</select>
    </div>
    <div class="table-wrap"><table class="leads">
      <thead><tr>
        <th class="chk-col"><input type="checkbox" data-sel-all title="Select all"></th>
        <th>Name</th><th>Contact</th><th>Source</th><th>Status</th>
        <th>Priority</th><th>Value</th><th>Next follow-up</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function rowHTML(l) {
  const st = statusById(l.status);
  const pr = prioById(l.priority);
  const stOpts = DB.statuses.map(s => `<option value="${s.id}"${s.id === l.status ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
  const caret = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="${st.color}" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`);
  const src = l.sourceUrl
    ? `<a href="${esc(l.sourceUrl)}" target="_blank" rel="noopener" class="link-out">${esc(l.source || 'Link')} ↗</a>`
    : `<span>${esc(l.source || '—')}</span>`;
  return `<tr data-id="${l.id}"${state.selected.has(l.id) ? ' class="row-sel"' : ''}>
    <td class="chk-col"><input type="checkbox" data-sel="${l.id}"${state.selected.has(l.id) ? ' checked' : ''}></td>
    <td><div class="cell-name" data-action="open-lead" data-id="${l.id}">
      <div class="avatar" style="background:${colorFor(l.name)}">${esc(initials(l.name))}</div>
      <div><div class="nm">${esc(l.name || 'Untitled')}</div>${l.company ? `<div class="co">${esc(l.title ? l.title + ' · ' : '')}${esc(l.company)}</div>` : ''}</div>
    </div></td>
    <td class="cell-contact">${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '<span style="color:var(--muted)">—</span>'}${l.phone ? `<span class="ph">${esc(l.phone)}</span>` : ''}</td>
    <td>${src}</td>
    <td><select class="status-select" data-status-for="${l.id}"
        style="background-color:${withAlpha(st.color, .15)};color:${st.color};background-image:url('data:image/svg+xml,${caret}')">${stOpts}</select></td>
    <td><span class="prio"><span class="dot" style="background:${pr.color}"></span>${pr.label}</span></td>
    <td class="tabular">${fmtMoney(l.value)}</td>
    <td>${followupPill(l)}</td>
    <td><div class="row-actions">
      <button class="icon-btn" data-action="edit-lead" data-id="${l.id}" title="Edit">✎</button>
      <button class="icon-btn danger" data-action="delete-lead" data-id="${l.id}" title="Delete">🗑</button>
    </div></td>
  </tr>`;
}

function followupPill(l) {
  if (!l.nextFollowUp) return `<span class="followup-pill none">— set date</span>`;
  const d = relDays(l.nextFollowUp);
  const cls = d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 7 ? 'soon' : 'soon';
  const txt = d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : fmtDate(l.nextFollowUp);
  return `<span class="followup-pill ${cls}">${txt}</span>`;
}

/* ----------------------- Rendering: board ----------------------- */
function boardHTML() {
  const list = visibleLeads();
  const cols = DB.statuses.map(s => {
    const items = list.filter(l => l.status === s.id);
    const cards = items.map(l => kcardHTML(l)).join('') ||
      `<div style="color:var(--muted);font-size:12px;padding:8px;text-align:center">Drop here</div>`;
    return `<div class="col" data-col="${s.id}">
      <div class="col-head"><span class="dot" style="background:${s.color}"></span>
        <span class="col-title">${esc(s.label)}</span>
        <span class="col-count">${items.length}</span></div>
      <div class="col-body" data-col-body="${s.id}">${cards}</div>
    </div>`;
  }).join('');
  return `
    <div class="view-head"><div class="view-title">Board<small>Drag a card between columns to change its status</small></div>
      <button class="btn btn-primary" data-action="add-lead"><span class="plus">+</span> Add Lead</button></div>
    <div class="board">${cols}</div>`;
}

function kcardHTML(l) {
  const pr = prioById(l.priority);
  const st = statusById(l.status);
  return `<div class="kcard" draggable="true" data-card="${l.id}" style="border-left-color:${st.color}"
      data-action="open-lead" data-id="${l.id}">
    <div class="kcard-top"><span class="dot" style="background:${pr.color}"></span>
      <span class="kcard-name">${esc(l.name || 'Untitled')}</span></div>
    ${l.company ? `<div class="kcard-co">${esc(l.title ? l.title + ' · ' : '')}${esc(l.company)}</div>` : ''}
    <div class="kcard-foot">
      ${l.value ? `<span class="chip val-chip">${fmtMoney(l.value)}</span>` : ''}
      ${l.source ? `<span class="chip">${esc(l.source)}</span>` : ''}
      ${l.nextFollowUp ? followupPill(l) : ''}
    </div>
  </div>`;
}

function wireBoard() {
  let dragId = null;
  $$('.kcard').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.card; card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); dragId = null; });
  });
  $$('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('drag-over');
      if (dragId) setStatus(dragId, col.dataset.col);
    });
  });
}

/* ----------------------- Drawer (lead detail) ----------------------- */
function openDrawer(id) {
  const l = getLead(id); if (!l) return;
  state.selectedId = id;
  const st = statusById(l.status), pr = prioById(l.priority);
  const stOpts = DB.statuses.map(s => `<option value="${s.id}"${s.id === l.status ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
  const d = relDays(l.nextFollowUp);

  const notes = (l.notes || []).map(n => `
    <div class="note">
      <div class="note-time">${esc(fmtDateTime(n.at))}
        <a class="note-del" data-action="del-note" data-id="${l.id}" data-note="${n.id}">delete</a></div>
      <div class="note-text">${esc(n.text)}</div>
    </div>`).join('') || `<p style="color:var(--muted)">No notes yet. Add your meeting notes and follow-up reminders above.</p>`;

  const tags = (l.tags || []).map(t => `<span class="badge" style="background:var(--surface-2)">#${esc(t)}</span>`).join('');

  $('#drawer').innerHTML = `
    <button class="btn btn-icon drawer-close" data-action="close-drawer" aria-label="Close">✕</button>
    <div class="drawer-head">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="avatar" style="width:44px;height:44px;font-size:15px;background:${colorFor(l.name)}">${esc(initials(l.name))}</div>
        <div><div class="d-name">${esc(l.name || 'Untitled lead')}</div>
          <div class="d-sub">${esc([l.title, l.company].filter(Boolean).join(' · ') || 'No company')}</div></div>
      </div>
      <div class="d-tags">
        <span class="badge" style="background:${withAlpha(st.color, .15)};color:${st.color}"><span class="dot" style="background:${st.color}"></span>${esc(st.label)}</span>
        <span class="badge" style="background:${withAlpha(pr.color, .15)};color:${pr.color}"><span class="dot" style="background:${pr.color}"></span>${pr.label}</span>
        ${l.value ? `<span class="badge" style="background:var(--surface-2);color:var(--good-ink)">${fmtMoney(l.value)}</span>` : ''}
        ${tags}
      </div>
      <div class="d-actions">
        <button class="btn btn-ghost btn-sm" data-action="email-tpl" data-id="${l.id}">✉ Follow-up email</button>
        ${l.sourceUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(l.sourceUrl)}" target="_blank" rel="noopener">🔗 ${esc(l.source || 'Profile')}</a>` : ''}
        <button class="btn btn-ghost btn-sm" data-action="edit-lead" data-id="${l.id}">✎ Edit</button>
        ${!st.terminal ? `<button class="btn btn-ghost btn-sm" data-action="mark-won" data-id="${l.id}">🎉 Won</button><button class="btn btn-ghost btn-sm" data-action="mark-lost" data-id="${l.id}">Lost</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-action="delete-lead" data-id="${l.id}">🗑 Delete</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="d-section">
        <h4>Quick update</h4>
        <div class="d-field"><span class="k">Status</span>
          <select class="v" data-status-for="${l.id}" style="flex:1">${stOpts}</select></div>
        <div class="d-field"><span class="k">Next follow-up</span>
          <input class="v" type="date" data-followup-for="${l.id}" value="${esc(l.nextFollowUp || '')}" style="flex:1">
          ${l.nextFollowUp && d <= 0 ? `<span class="followup-pill ${d < 0 ? 'overdue' : 'today'}">${d < 0 ? -d + 'd overdue' : 'Today'}</span>` : ''}
        </div>
        <div class="quick-follow">
          <button class="chip-btn" data-action="snooze" data-id="${l.id}" data-days="today">Today</button>
          <button class="chip-btn" data-action="snooze" data-id="${l.id}" data-days="3">+3 days</button>
          <button class="chip-btn" data-action="snooze" data-id="${l.id}" data-days="7">+1 week</button>
          <button class="chip-btn" data-action="snooze" data-id="${l.id}" data-days="14">+2 weeks</button>
          <button class="chip-btn" data-action="snooze" data-id="${l.id}" data-days="clear">Clear</button>
        </div>
      </div>
      <div class="d-section">
        <h4>Details</h4>
        <div class="d-field"><span class="k">Email</span><span class="v">${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '—'}</span></div>
        <div class="d-field"><span class="k">Phone</span><span class="v">${esc(l.phone || '—')}</span></div>
        <div class="d-field"><span class="k">Source</span><span class="v">${esc(l.source || '—')}</span></div>
        <div class="d-field"><span class="k">Added</span><span class="v">${esc(fmtDate(l.createdAt))}</span></div>
        <div class="d-field"><span class="k">Updated</span><span class="v">${esc(fmtDate(l.updatedAt))}</span></div>
      </div>
      ${(l.links && l.links.length) ? `<div class="d-section"><h4>Links</h4><div class="d-links">${l.links.map(lk => `<a class="btn btn-ghost btn-sm" href="${esc(lk.url)}" target="_blank" rel="noopener">🔗 ${esc(lk.label || lk.url)}</a>`).join('')}</div></div>` : ''}
      <div class="d-section">
        <h4>Notes &amp; follow-ups</h4>
        <form class="note-form" data-note-form="${l.id}">
          <textarea placeholder="Add meeting notes, next steps, what to follow up on…" required></textarea>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start" type="submit">+ Add note</button>
        </form>
        ${notes}
      </div>
    </div>`;
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#overlay').classList.remove('is-hidden');
}
function closeDrawer() {
  state.selectedId = null;
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  if (!$('#modalRoot').children.length) $('#overlay').classList.add('is-hidden');
}

/* ----------------------- Modal: add / edit lead ----------------------- */
function openLeadModal(id) {
  const l = id ? getLead(id) : null;
  const statusOpts = DB.statuses.map(s => `<option value="${s.id}"${l && l.status === s.id ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
  const prioOpts = PRIORITIES.map(p => `<option value="${p.id}"${l && l.priority === p.id ? ' selected' : (!l && p.id === 'warm' ? ' selected' : '')}>${p.label}</option>`).join('');
  const srcOpts = SOURCES.map(s => `<option value="${s}"${l && l.source === s ? ' selected' : ''}>${s}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <h3>${id ? 'Edit lead' : 'Add a new lead'}</h3>
    <div class="sub">${id ? 'Update the details below.' : 'Fill in what you know — you can always add more later.'}</div>
    <form data-lead-form>
      <div class="form-grid">
        <div class="field col-2"><label>Name <span class="req">*</span></label>
          <input name="name" required value="${esc(l?.name || '')}" placeholder="Jane Doe" autofocus></div>
        <div class="field"><label>Email</label><input name="email" type="email" value="${esc(l?.email || '')}" placeholder="jane@company.com"></div>
        <div class="field"><label>Phone</label><input name="phone" value="${esc(l?.phone || '')}" placeholder="+1 …"></div>
        <div class="field"><label>Company</label><input name="company" value="${esc(l?.company || '')}" placeholder="Company / brand"></div>
        <div class="field"><label>Title / role</label><input name="title" value="${esc(l?.title || '')}" placeholder="e.g. Marketing Director"></div>
        <div class="field"><label>Source</label><select name="source">${srcOpts}</select></div>
        <div class="field"><label>Profile / link (LinkedIn, site…)</label><input name="sourceUrl" value="${esc(l?.sourceUrl || '')}" placeholder="https://linkedin.com/in/…"></div>
        <div class="field"><label>Status</label><select name="status">${statusOpts}</select></div>
        <div class="field"><label>Priority</label><select name="priority">${prioOpts}</select></div>
        <div class="field"><label>Deal value ($)</label><input name="value" type="number" min="0" step="any" value="${l?.value || ''}" placeholder="0"></div>
        <div class="field"><label>Next follow-up</label><input name="nextFollowUp" type="date" value="${esc(l?.nextFollowUp || '')}"></div>
        <div class="field col-2"><label>Tags (comma separated)</label><input name="tags" value="${esc((l?.tags || []).join(', '))}" placeholder="enterprise, referral, hot"></div>
        <div class="field col-2"><label>Links (one per line — Label | https://…)</label><textarea name="links" placeholder="Proposal | https://...&#10;Contract | https://...">${esc((l?.links || []).map(x => `${x.label || ''} | ${x.url || ''}`).join('\n'))}</textarea></div>
        ${id ? '' : `<div class="field col-2"><label>First note (optional)</label><textarea name="firstNote" placeholder="Where did you meet? What did you discuss?"></textarea></div>`}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
        <button type="submit" class="btn btn-primary">${id ? 'Save changes' : 'Add lead'}</button>
      </div>
    </form>`;
  showModal(modal);

  modal.querySelector('[data-lead-form]').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = {
      name: f.get('name').trim(), email: f.get('email').trim(), phone: f.get('phone').trim(),
      company: f.get('company').trim(), title: f.get('title').trim(),
      source: f.get('source'), sourceUrl: f.get('sourceUrl').trim(),
      status: f.get('status'), priority: f.get('priority'),
      value: Number(f.get('value')) || 0, nextFollowUp: f.get('nextFollowUp'),
      tags: f.get('tags').split(',').map(t => t.trim()).filter(Boolean),
      links: (f.get('links') || '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
        const i = line.indexOf('|');
        return i >= 0 ? { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() } : { label: line, url: line };
      }),
    };
    if (id) data.id = id;
    // duplicate email warning (new leads only)
    if (!id && data.email) {
      const dup = DB.leads.find(x => x.email && x.email.toLowerCase() === data.email.toLowerCase());
      if (dup && !confirm(`A lead with ${data.email} already exists (“${dup.name}”). Add anyway?`)) return;
    }
    const lead = upsertLead(data);
    const firstNote = f.get('firstNote');
    if (!id && firstNote && firstNote.trim()) lead.notes.unshift({ id: uid(), text: firstNote.trim(), at: nowISO() });
    save(); closeModal(); render();
    toast(id ? 'Lead updated.' : 'Lead added.');
    if (id && state.selectedId === id) openDrawer(id);
  });
}

/* ----------------------- Modal: manage statuses ----------------------- */
function openStatusModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  const rows = () => DB.statuses.map((s, i) => `
    <div class="st-row" data-sid="${s.id}">
      <input type="color" value="${s.color}" data-st-color>
      <input type="text" value="${esc(s.label)}" data-st-label>
      <div class="st-move">
        <button class="icon-btn btn-sm" data-st-up ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="icon-btn btn-sm" data-st-down ${i === DB.statuses.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <button class="icon-btn danger" data-st-del title="Delete">🗑</button>
    </div>`).join('');
  modal.innerHTML = `
    <h3>Pipeline &amp; colors</h3>
    <div class="sub">Rename stages, change their colors, reorder, or add your own. Leads keep their stage when you rename it.</div>
    <div data-st-list>${rows()}</div>
    <button class="btn btn-ghost btn-sm" data-st-add style="margin-top:10px">+ Add stage</button>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button type="button" class="btn btn-primary" data-st-save>Save pipeline</button>
    </div>`;
  showModal(modal);

  const list = modal.querySelector('[data-st-list]');
  const working = DB.statuses.map(s => ({ ...s }));
  const redraw = () => {
    list.innerHTML = working.map((s, i) => `
      <div class="st-row" data-i="${i}">
        <input type="color" value="${s.color}" data-st-color>
        <input type="text" value="${esc(s.label)}" data-st-label>
        <div class="st-move">
          <button class="icon-btn btn-sm" data-st-up ${i === 0 ? 'disabled' : ''}>▲</button>
          <button class="icon-btn btn-sm" data-st-down ${i === working.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <button class="icon-btn danger" data-st-del title="Delete">🗑</button>
      </div>`).join('');
  };
  redraw();

  const syncInputs = () => {
    $$('.st-row', list).forEach((row, i) => {
      working[i].label = row.querySelector('[data-st-label]').value;
      working[i].color = row.querySelector('[data-st-color]').value;
    });
  };
  list.addEventListener('click', e => {
    const row = e.target.closest('.st-row'); if (!row) return;
    const i = +row.dataset.i;
    if (e.target.closest('[data-st-up]') && i > 0) { syncInputs(); [working[i - 1], working[i]] = [working[i], working[i - 1]]; redraw(); }
    else if (e.target.closest('[data-st-down]') && i < working.length - 1) { syncInputs(); [working[i + 1], working[i]] = [working[i], working[i + 1]]; redraw(); }
    else if (e.target.closest('[data-st-del]')) {
      if (working.length <= 2) { toast('Keep at least two stages.'); return; }
      syncInputs(); working.splice(i, 1); redraw();
    }
  });
  modal.querySelector('[data-st-add]').addEventListener('click', () => {
    syncInputs();
    working.push({ id: 'st' + uid(), label: 'New stage', color: '#6d5ef0' });
    redraw();
  });
  modal.querySelector('[data-st-save]').addEventListener('click', () => {
    syncInputs();
    const cleaned = working.filter(s => s.label.trim());
    if (cleaned.length < 2) { toast('Keep at least two stages.'); return; }
    // remap leads whose status no longer exists → first stage
    const ids = new Set(cleaned.map(s => s.id));
    DB.leads.forEach(l => { if (!ids.has(l.status)) l.status = cleaned[0].id; });
    DB.statuses = cleaned;
    save(); closeModal(); render();
    toast('Pipeline saved.');
  });
}

/* ----------------------- Modal helpers ----------------------- */
function showModal(node) {
  $('#modalRoot').innerHTML = '';
  $('#modalRoot').appendChild(node);
  $('#overlay').classList.remove('is-hidden');
  const first = node.querySelector('input,select,textarea');
  if (first) setTimeout(() => first.focus(), 50);
}
function closeModal() {
  $('#modalRoot').innerHTML = '';
  if (!$('#drawer').classList.contains('open')) $('#overlay').classList.add('is-hidden');
}

/* ----------------------- Reminder banner ----------------------- */
function renderBanner() {
  const b = $('#reminderBanner');
  // priority 1: file needs reconnect
  if (DB.settings.fileNeedsReconnect && fsHandle) {
    b.className = 'banner warn';
    b.innerHTML = `<span>🔗 Your data file is linked but needs permission to auto-save this session.</span>
      <span class="banner-actions"><button class="btn btn-sm btn-primary" data-action="reconnect">Reconnect</button></span>`;
    return;
  }
  const due = DB.leads.filter(l => isOpenLead(l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0);
  const overdue = due.filter(l => relDays(l.nextFollowUp) < 0).length;
  if (due.length) {
    b.className = 'banner';
    b.innerHTML = `<span>⏰ <strong>${due.length}</strong> follow-up${due.length > 1 ? 's' : ''} due${overdue ? ` (${overdue} overdue)` : ''} — don’t let these slip.</span>
      <span class="banner-actions"><button class="btn btn-sm btn-ghost" data-action="go-due">Review</button></span>`;
    return;
  }
  // backup nudge if never / >7 days
  const lb = DB.settings.lastBackup;
  const stale = !lb || (Date.now() - new Date(lb).getTime()) > 7 * 86400000;
  if (DB.leads.length >= 3 && stale && !fsHandle) {
    b.className = 'banner';
    b.innerHTML = `<span>💾 Keep your leads safe — download a backup ${lb ? '(last one was ' + fmtDate(lb) + ')' : 'you haven’t backed up yet'}.</span>
      <span class="banner-actions">
        <button class="btn btn-sm btn-primary" data-action="backup">Download backup</button>
        <button class="btn btn-sm btn-ghost" data-action="linkfile">Auto-save to file</button></span>`;
    return;
  }
  b.className = 'banner is-hidden';
  b.innerHTML = '';
}

/* ----------------------- Sample data ----------------------- */
function loadSample() {
  if (DB.leads.length && !confirm('Add sample leads to your tracker? (Your existing leads are kept.)')) return;
  const t = todayStr();
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const samples = [
    { name: 'Sarah Mitchell', company: 'Aurora Skincare', title: 'Founder', email: 'sarah@auroraskin.co', phone: '+1 415 555 0142', source: 'LinkedIn', sourceUrl: 'https://linkedin.com/in/example', status: 'meeting', priority: 'hot', value: 12000, nextFollowUp: day(-1), tags: ['beauty', 'retainer'], notes: [{ id: uid(), text: 'Great discovery call. Wants full social + paid ads. Send proposal by Friday.', at: nowISO() }] },
    { name: 'David Chen', company: 'Peak Fitness', title: 'CMO', email: 'david@peakfit.com', source: 'Referral', status: 'proposal', priority: 'hot', value: 24000, nextFollowUp: day(0), tags: ['fitness'], notes: [{ id: uid(), text: 'Proposal sent. Follow up on pricing questions today.', at: nowISO() }] },
    { name: 'Maria Gonzalez', company: 'Casa Bella Interiors', title: 'Owner', email: 'maria@casabella.design', source: 'Instagram', status: 'contacted', priority: 'warm', value: 8000, nextFollowUp: day(2), tags: ['interiors'], notes: [] },
    { name: 'Tom Baker', company: 'Baker & Co Law', title: 'Partner', email: 'tom@bakerlaw.com', source: 'Cold Email', status: 'new', priority: 'cold', value: 6000, nextFollowUp: day(5), tags: [], notes: [] },
    { name: 'Priya Nair', company: 'Lumen Ventures', title: 'Partner', email: 'priya@lumen.vc', source: 'Event / Conference', status: 'negotiation', priority: 'hot', value: 36000, nextFollowUp: day(1), tags: ['enterprise'], notes: [{ id: uid(), text: 'Negotiating scope. She wants monthly reporting included.', at: nowISO() }] },
    { name: 'James Wright', company: 'Wright Auto Group', title: 'Marketing Lead', email: 'james@wrightauto.com', source: 'Website', status: 'won', priority: 'warm', value: 18000, nextFollowUp: '', tags: ['automotive'], notes: [{ id: uid(), text: 'Signed! Kickoff next week.', at: nowISO() }] },
    { name: 'Elena Petrov', company: 'Nordic Home', title: 'Brand Manager', email: 'elena@nordichome.se', source: 'LinkedIn', status: 'met', priority: 'warm', value: 15000, nextFollowUp: day(3), tags: ['ecommerce'], notes: [] },
    { name: 'Marcus Lee', company: 'FreshBite Foods', title: 'Founder', email: 'marcus@freshbite.co', source: 'Upwork', status: 'lost', priority: 'cold', value: 5000, nextFollowUp: '', tags: [], notes: [{ id: uid(), text: 'Went with an in-house hire. Keep warm for later.', at: nowISO() }] },
  ];
  samples.forEach(s => upsertLead(s));
  save(); render(); renderBanner();
  toast('✨ Sample data loaded — explore, then Clear all when ready.');
}

function clearAll() {
  if (!confirm('Delete ALL leads and reset the pipeline? Download a backup first if unsure. This cannot be undone.')) return;
  if (!confirm('Are you absolutely sure? Everything will be erased.')) return;
  const theme = DB.settings.theme;
  DB = freshDB(); DB.settings.theme = theme;
  save(); closeDrawer(); render(); renderBanner();
  toast('All data cleared.');
}

/* ----------------------- Theme ----------------------- */
function applyTheme(theme) {
  const t = theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  $('#themeToggle').textContent = t === 'dark' ? '☀' : '◐';
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  DB.settings.theme = next; saveLocal(); applyTheme(next);
}

/* ----------------------- Toast ----------------------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('is-hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('is-hidden'), 2800);
}

/* ----------------------- Events ----------------------- */
function switchView(v) { state.view = v; render(); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  // tabs
  const tab = e.target.closest('.tab');
  if (tab) { switchView(tab.dataset.view); return; }

  // data menu open/close
  if (e.target.closest('#dataMenuBtn')) { $('#dataMenu').classList.toggle('is-hidden'); e.stopPropagation(); return; }
  if (!e.target.closest('#dataMenu')) $('#dataMenu').classList.add('is-hidden');

  if (e.target.closest('#themeToggle')) { toggleTheme(); return; }

  if (!el) {
    // click on overlay closes drawer/modal
    if (e.target.id === 'overlay') { closeModal(); closeDrawer(); }
    return;
  }
  const id = el.dataset.id;
  const action = el.dataset.action;
  const map = {
    'add-lead': () => openLeadModal(),
    'open-lead': () => openDrawer(id),
    'edit-lead': () => openLeadModal(id),
    'delete-lead': () => deleteLead(id),
    'close-drawer': () => closeDrawer(),
    'close-modal': () => closeModal(),
    'del-note': () => deleteNote(id, el.dataset.note),
    'backup': () => backupJSON(),
    'restore': () => restoreBackup(),
    'csv': () => exportCSV(),
    'linkfile': () => linkDataFile(),
    'reconnect': () => reconnectFile(),
    'statuses': () => openStatusModal(),
    'sample': () => loadSample(),
    'clear': () => clearAll(),
    'go-due': () => { state.view = 'leads'; state.sort = 'followup'; state.filterStatus = 'all'; render(); },
    'import': () => importCSV(),
    'settings': () => openSettingsModal(),
    'help': () => openHelpModal(),
    'email-tpl': () => openEmailModal(id),
    'snooze': () => quickFollowup(id, el.dataset.days),
    'mark-won': () => setStatus(id, firstTerminal('won')),
    'mark-lost': () => setStatus(id, firstTerminal('lost')),
    'bulk-export': () => bulkExport(),
    'bulk-del': () => bulkDelete(),
    'bulk-clear': () => { state.selected.clear(); render(); },
  };
  if (map[action]) { $('#dataMenu').classList.add('is-hidden'); map[action](); }
});

// change handlers (filters, inline status, follow-up date)
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.filter) {
    const key = { status: 'filterStatus', priority: 'filterPriority', source: 'filterSource', sort: 'sort' }[t.dataset.filter];
    state[key] = t.value; render(); return;
  }
  if (t.dataset.statusFor) { setStatus(t.dataset.statusFor, t.value); return; }
  if (t.dataset.followupFor) {
    const l = getLead(t.dataset.followupFor);
    if (l) { l.nextFollowUp = t.value; l.updatedAt = nowISO(); save(); render(); renderBanner(); if (state.selectedId === l.id) openDrawer(l.id); }
    return;
  }
  if (t.dataset.sel) { toggleSelect(t.dataset.sel, t.checked); return; }
  if (t.hasAttribute('data-sel-all')) { toggleSelectAll(t.checked); return; }
  if (t.hasAttribute('data-bulk-status')) { if (t.value) bulkStatus(t.value); return; }
  if (t.hasAttribute('data-bulk-followup')) { bulkFollowup(t.value); return; }
});

// note form submit + global search
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-note-form]');
  if (form) {
    e.preventDefault();
    const ta = form.querySelector('textarea');
    addNote(form.dataset.noteForm, ta.value);
  }
});

$('#globalSearch').addEventListener('input', e => {
  state.search = e.target.value;
  if (state.view === 'dashboard') state.view = 'leads';
  render();
});

document.addEventListener('keydown', e => {
  const el = document.activeElement;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Escape') { closePalette(); closeModal(); closeDrawer(); $('#dataMenu').classList.add('is-hidden'); return; }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); $('#globalSearch').focus(); }
  else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openLeadModal(); }
  else if (e.key === '?') { openHelpModal(); }
  else if (e.key === '1') switchView('dashboard');
  else if (e.key === '2') switchView('leads');
  else if (e.key === '3') switchView('board');
  else if (e.key === '4') switchView('reports');
});

/* =====================================================================
   FEATURE PACK — reports, email, import, quick-schedule, goals,
   settings, notifications, command palette, bulk actions, undo
   ===================================================================== */

function firstTerminal(kind) {
  const s = DB.statuses.find(x => x.terminal === kind);
  return s ? s.id : DB.statuses[0].id;
}
function addDaysStr(base, n) {
  const d = base ? new Date(base + 'T00:00:00') : new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function monthKey(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function normalizeDate(s) { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d.toISOString().slice(0, 10); }
function dueLeads() { return DB.leads.filter(l => isOpenLead(l) && relDays(l.nextFollowUp) !== null && relDays(l.nextFollowUp) <= 0); }

/* ---- toast with an action button (used for Undo) ---- */
function toastAction(msg, label, cb) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span><button class="toast-btn" id="toastAct">${esc(label)}</button>`;
  t.classList.remove('is-hidden');
  clearTimeout(toastTimer);
  $('#toastAct').onclick = () => { clearTimeout(toastTimer); t.classList.add('is-hidden'); t.innerHTML = ''; cb(); };
  toastTimer = setTimeout(() => { t.classList.add('is-hidden'); t.innerHTML = ''; }, 6500);
}

/* ---- quick follow-up scheduling ---- */
function quickFollowup(id, code) {
  const l = getLead(id); if (!l) return;
  if (code === 'clear') l.nextFollowUp = '';
  else if (code === 'today') l.nextFollowUp = todayStr();
  else l.nextFollowUp = addDaysStr(todayStr(), parseInt(code, 10) || 0);
  l.updatedAt = nowISO();
  save(); render(); renderBanner();
  if (state.selectedId === id) openDrawer(id);
  toast(l.nextFollowUp ? 'Follow-up set for ' + fmtDate(l.nextFollowUp) : 'Follow-up cleared.');
}

/* ---- won / lost details modal ---- */
function openTerminalModal(id, st) {
  const l = getLead(id); if (!l) return;
  const won = st.terminal === 'won';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <h3>${won ? '🎉 Mark as Won' : 'Mark as Lost'}</h3>
    <div class="sub">${won ? 'Congrats! Capture the final details for your reports.' : 'Capture why — useful for reports and re-engaging later.'}</div>
    <form data-terminal-form>
      <div class="form-grid">
        <div class="field"><label>${won ? 'Final deal value ($)' : 'Potential value ($)'}</label>
          <input name="value" type="number" min="0" step="any" value="${l.value || ''}"></div>
        <div class="field"><label>Closed date</label><input name="closedAt" type="date" value="${todayStr()}"></div>
        <div class="field col-2"><label>${won ? 'What closed it? (optional)' : 'Reason lost (optional)'}</label>
          <textarea name="reason" placeholder="${won ? 'e.g. Referral trust + fast turnaround' : 'e.g. Budget / timing / chose a competitor'}"></textarea></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-action="close-modal">Skip</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`;
  showModal(modal);
  modal.querySelector('[data-terminal-form]').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    l.value = Number(f.get('value')) || 0;
    l.closedAt = f.get('closedAt') ? new Date(f.get('closedAt') + 'T00:00:00').toISOString() : nowISO();
    l.wonReason = f.get('reason').trim();
    if (won) l.nextFollowUp = '';
    l.notes.unshift({ id: uid(), text: `${won ? 'Won' : 'Lost'} — ${fmtMoney(l.value)}${l.wonReason ? '. ' + l.wonReason : ''}`, at: nowISO() });
    l.updatedAt = nowISO();
    save(); closeModal(); render(); renderBanner();
    if (state.selectedId === id) openDrawer(id);
    toast(won ? '🎉 Marked as won!' : 'Marked as lost.');
  });
}

/* ---- follow-up email templates ---- */
function fillTemplate(text, l) {
  const first = (l.name || '').trim().split(/\s+/)[0] || 'there';
  return String(text)
    .replace(/{firstName}/g, first).replace(/{name}/g, l.name || 'there')
    .replace(/{company}/g, l.company || 'your team').replace(/{title}/g, l.title || '')
    .replace(/{me}/g, DB.settings.senderName || '').replace(/{myCompany}/g, DB.settings.senderCompany || '');
}
function openEmailModal(id) {
  const l = getLead(id); if (!l) return;
  const tpls = DB.settings.templates;
  const opts = tpls.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <h3>✉ Follow-up email</h3>
    <div class="sub">To ${esc(l.name || 'lead')}${l.email ? ' · ' + esc(l.email) : ' · no email on file'}</div>
    <div class="field"><label>Template</label><select data-tpl-pick>${opts}</select></div>
    <div class="field" style="margin-top:12px"><label>Subject</label><input name="subject"></div>
    <div class="field" style="margin-top:12px"><label>Message</label><textarea name="body" style="min-height:210px"></textarea></div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-action="close-modal">Close</button>
      <button type="button" class="btn btn-ghost" data-email-copy>📋 Copy</button>
      ${l.email ? '<button type="button" class="btn btn-ghost" data-email-open>Open in email app</button>' : ''}
      <button type="button" class="btn btn-primary" data-email-log>Log &amp; snooze 1 week</button>
    </div>`;
  showModal(modal);
  const applyTpl = (i) => {
    const t = tpls[i] || tpls[0]; if (!t) return;
    modal.querySelector('[name=subject]').value = fillTemplate(t.subject, l);
    modal.querySelector('[name=body]').value = fillTemplate(t.body, l);
  };
  applyTpl(0);
  modal.querySelector('[data-tpl-pick]').addEventListener('change', e => applyTpl(+e.target.value));
  modal.querySelector('[data-email-copy]').addEventListener('click', () => {
    const txt = modal.querySelector('[name=body]').value;
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('📋 Copied.'), () => toast('Select the text and copy manually.'));
    else toast('Select the text and copy manually.');
  });
  const openBtn = modal.querySelector('[data-email-open]');
  if (openBtn) openBtn.addEventListener('click', () => {
    const s = encodeURIComponent(modal.querySelector('[name=subject]').value);
    const b = encodeURIComponent(modal.querySelector('[name=body]').value);
    window.location.href = `mailto:${encodeURIComponent(l.email)}?subject=${s}&body=${b}`;
  });
  modal.querySelector('[data-email-log]').addEventListener('click', () => {
    const subj = modal.querySelector('[name=subject]').value;
    l.notes.unshift({ id: uid(), text: 'Sent follow-up: ' + subj, at: nowISO() });
    l.nextFollowUp = addDaysStr(todayStr(), 7); l.updatedAt = nowISO();
    save(); closeModal(); render(); renderBanner();
    if (state.selectedId === id) openDrawer(id);
    toast('Logged — next follow-up in 1 week.');
  });
}

/* ---- CSV import ---- */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => (c || '').trim() !== ''));
}
function importCSV() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.csv,text/csv';
  inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        if (rows.length < 2) throw new Error('No data rows found.');
        const head = rows[0].map(h => h.trim().toLowerCase());
        const find = (...names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
        const col = {
          name: find('name', 'client', 'client name', 'full name', 'contact'),
          email: find('email', 'e-mail', 'email address'), phone: find('phone', 'phone number', 'mobile', 'tel'),
          company: find('company', 'organization', 'business', 'brand'), title: find('title', 'role', 'position', 'job title'),
          source: find('source', 'lead source', 'channel'), sourceUrl: find('source url', 'link', 'profile', 'linkedin', 'url', 'website'),
          status: find('status', 'stage'), priority: find('priority'),
          value: find('value', 'deal value', 'amount', 'budget'), tags: find('tags', 'tag', 'labels'),
          followup: find('next follow-up', 'follow-up', 'follow up', 'followup', 'next follow up'), notes: find('notes', 'note', 'comment', 'comments'),
        };
        if (col.name < 0) throw new Error('Could not find a "Name" column in the CSV.');
        const statusByLabel = {}; DB.statuses.forEach(s => statusByLabel[s.label.toLowerCase()] = s.id);
        let added = 0;
        rows.slice(1).forEach(r => {
          const g = i => (i >= 0 && r[i] != null) ? String(r[i]).trim() : '';
          const name = g(col.name); if (!name) return;
          upsertLead({
            name, email: g(col.email), phone: g(col.phone), company: g(col.company), title: g(col.title),
            source: g(col.source) || 'Other', sourceUrl: g(col.sourceUrl),
            status: statusByLabel[g(col.status).toLowerCase()] || DB.statuses[0].id,
            priority: ({ hot: 'hot', warm: 'warm', cold: 'cold' })[g(col.priority).toLowerCase()] || 'warm',
            value: Number(g(col.value).replace(/[^0-9.]/g, '')) || 0,
            tags: g(col.tags) ? g(col.tags).split(/[;,]/).map(s => s.trim()).filter(Boolean) : [],
            nextFollowUp: normalizeDate(g(col.followup)),
            notes: g(col.notes) ? [{ id: uid(), text: g(col.notes), at: nowISO() }] : [],
          });
          added++;
        });
        save(); render(); renderBanner();
        toast(`⤒ Imported ${added} lead${added !== 1 ? 's' : ''}.`);
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* ---- browser reminder notifications ---- */
async function toggleNotify() {
  if (!('Notification' in window)) { toast('This browser does not support notifications.'); return; }
  if (DB.settings.notify) { DB.settings.notify = false; saveLocal(); toast('🔕 Reminders off.'); return; }
  const p = await Notification.requestPermission();
  if (p === 'granted') { DB.settings.notify = true; saveLocal(); toast('🔔 Reminders on.'); checkReminders(); }
  else toast('Permission blocked — allow notifications in your browser settings.');
}
function checkReminders() {
  if (!DB.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const due = dueLeads();
  if (due.length) { try { new Notification('Lead Tracker — follow-ups due', { body: `${due.length} follow-up${due.length > 1 ? 's' : ''} need attention today.`, tag: 'lt-due' }); } catch (e) { /* ignore */ } }
}

/* ---- settings modal ---- */
function openSettingsModal() {
  const s = DB.settings;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <h3>⚙ Settings</h3>
    <div class="sub">Personalize your tracker, goal, and follow-up email templates.</div>
    <div class="form-grid">
      <div class="field"><label>Your name (email sign-off)</label><input name="senderName" value="${esc(s.senderName || '')}" placeholder="e.g. Alex"></div>
      <div class="field"><label>Your company</label><input name="senderCompany" value="${esc(s.senderCompany || '')}"></div>
      <div class="field"><label>Monthly revenue goal ($)</label><input name="goal" type="number" min="0" step="any" value="${s.goal || ''}" placeholder="e.g. 50000"></div>
      <div class="field"><label>Follow-up reminders</label>
        <button type="button" class="btn btn-ghost" data-toggle-notify>${s.notify ? '🔔 On — click to turn off' : '🔕 Off — click to enable'}</button></div>
    </div>
    <div class="d-section"><h4>Email templates</h4><div data-tpl-list></div>
      <button type="button" class="btn btn-ghost btn-sm" data-tpl-add style="margin-top:8px">+ Add template</button>
      <p style="color:var(--muted);font-size:12px;margin-top:8px">Variables: <code>{firstName}</code> <code>{name}</code> <code>{company}</code> <code>{title}</code> <code>{me}</code> <code>{myCompany}</code></p>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
      <button type="button" class="btn btn-primary" data-settings-save>Save settings</button>
    </div>`;
  showModal(modal);
  const working = s.templates.map(t => ({ ...t }));
  const list = modal.querySelector('[data-tpl-list]');
  const drawTpls = () => {
    list.innerHTML = working.map((t, i) => `
      <div class="tpl-row" data-i="${i}">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <input data-tpl-name value="${esc(t.name)}" placeholder="Template name" style="flex:1">
          <button type="button" class="icon-btn danger" data-tpl-del title="Delete">🗑</button>
        </div>
        <input data-tpl-subject value="${esc(t.subject)}" placeholder="Subject" style="width:100%;margin-bottom:6px">
        <textarea data-tpl-body style="width:100%;min-height:90px">${esc(t.body)}</textarea>
      </div>`).join('') || '<p style="color:var(--muted)">No templates yet.</p>';
  };
  drawTpls();
  const syncTpls = () => $$('.tpl-row', list).forEach((row, i) => {
    working[i].name = row.querySelector('[data-tpl-name]').value;
    working[i].subject = row.querySelector('[data-tpl-subject]').value;
    working[i].body = row.querySelector('[data-tpl-body]').value;
  });
  list.addEventListener('click', e => {
    if (e.target.closest('[data-tpl-del]')) { const row = e.target.closest('.tpl-row'); syncTpls(); working.splice(+row.dataset.i, 1); drawTpls(); }
  });
  modal.querySelector('[data-tpl-add]').addEventListener('click', () => {
    syncTpls(); working.push({ id: 't' + uid(), name: 'New template', subject: 'Hi {firstName}', body: 'Hi {firstName},\n\n\n\nBest,\n{me}' }); drawTpls();
  });
  modal.querySelector('[data-toggle-notify]').addEventListener('click', async e => {
    await toggleNotify(); e.target.textContent = DB.settings.notify ? '🔔 On — click to turn off' : '🔕 Off — click to enable';
  });
  modal.querySelector('[data-settings-save]').addEventListener('click', () => {
    syncTpls();
    s.senderName = modal.querySelector('[name=senderName]').value.trim();
    s.senderCompany = modal.querySelector('[name=senderCompany]').value.trim();
    s.goal = Number(modal.querySelector('[name=goal]').value) || 0;
    s.templates = working.filter(t => t.name.trim());
    if (!s.templates.length) s.templates = DEFAULT_TEMPLATES.map(t => ({ ...t }));
    save(); closeModal(); render(); toast('Settings saved.');
  });
}

/* ---- keyboard shortcuts help ---- */
function openHelpModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  const rows = [['N', 'New lead'], ['/', 'Search'], ['Ctrl / ⌘ + K', 'Command palette'],
    ['1 · 2 · 3 · 4', 'Dashboard · Leads · Board · Reports'], ['?', 'This help'], ['Esc', 'Close']];
  modal.innerHTML = `<h3>⌨ Keyboard shortcuts</h3><div class="sub">Move fast.</div>
    ${rows.map(([k, v]) => `<div class="d-field"><span class="k"><kbd>${esc(k)}</kbd></span><span class="v">${v}</span></div>`).join('')}
    <div class="modal-actions"><button type="button" class="btn btn-primary" data-action="close-modal">Got it</button></div>`;
  showModal(modal);
}

/* ---- command palette (Ctrl / Cmd + K) ---- */
function openPalette() {
  if ($('#palette')) return;
  const wrap = document.createElement('div');
  wrap.id = 'palette'; wrap.className = 'palette-wrap';
  wrap.innerHTML = `<div class="palette"><input class="palette-input" placeholder="Search leads or type a command…" autocomplete="off"><div class="palette-list"></div></div>`;
  document.body.appendChild(wrap);
  const input = wrap.querySelector('.palette-input');
  const listEl = wrap.querySelector('.palette-list');
  const commands = [
    { label: '➕ Add lead', run: () => openLeadModal() },
    { label: '📊 Go to Dashboard', run: () => switchView('dashboard') },
    { label: '📇 Go to Leads', run: () => switchView('leads') },
    { label: '🗂 Go to Board', run: () => switchView('board') },
    { label: '📈 Go to Reports', run: () => switchView('reports') },
    { label: '⬇ Download backup', run: () => backupJSON() },
    { label: '⤒ Import CSV', run: () => importCSV() },
    { label: '↧ Export CSV', run: () => exportCSV() },
    { label: '⚙ Settings', run: () => openSettingsModal() },
    { label: '🌗 Toggle theme', run: () => toggleTheme() },
  ];
  let items = [], sel = 0;
  const draw = (q) => {
    q = q.trim().toLowerCase();
    const leadHits = (q ? DB.leads.filter(l => (l.name + ' ' + l.company + ' ' + l.email).toLowerCase().includes(q)) : DB.leads.slice(0, 5))
      .slice(0, 6).map(l => ({ label: `👤 ${l.name || 'Untitled'}${l.company ? ' · ' + l.company : ''}`, run: () => openDrawer(l.id) }));
    const cmdHits = commands.filter(c => !q || c.label.toLowerCase().includes(q));
    items = [...leadHits, ...cmdHits]; sel = 0;
    listEl.innerHTML = items.map((it, i) => `<div class="palette-item${i === 0 ? ' active' : ''}" data-pi="${i}">${esc(it.label)}</div>`).join('') || '<div class="palette-empty">No matches</div>';
  };
  const paintSel = () => $$('.palette-item', listEl).forEach((el, i) => el.classList.toggle('active', i === sel));
  const exec = i => { const it = items[i]; if (!it) return; closePalette(); it.run(); };
  draw('');
  input.addEventListener('input', () => draw(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); paintSel(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paintSel(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); exec(sel); }
  });
  listEl.addEventListener('click', e => { const it = e.target.closest('[data-pi]'); if (it) exec(+it.dataset.pi); });
  wrap.addEventListener('click', e => { if (e.target === wrap) closePalette(); });
  setTimeout(() => input.focus(), 30);
}
function closePalette() { const p = $('#palette'); if (p) p.remove(); }

/* ---- bulk actions ---- */
function toggleSelect(id, on) { on ? state.selected.add(id) : state.selected.delete(id); renderBulkBar(); }
function toggleSelectAll(on) {
  const ids = visibleLeads().map(l => l.id);
  ids.forEach(i => on ? state.selected.add(i) : state.selected.delete(i));
  render();
}
function renderBulkBar() {
  let bar = $('#bulkBar');
  const n = state.view === 'leads' ? state.selected.size : 0;
  if (!n) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'bulkBar'; bar.className = 'bulk-bar'; document.body.appendChild(bar); }
  const stOpts = ['<option value="">Change status…</option>', ...DB.statuses.map(s => `<option value="${s.id}">${esc(s.label)}</option>`)].join('');
  bar.innerHTML = `<span class="bulk-count"><strong>${n}</strong> selected</span>
    <select data-bulk-status>${stOpts}</select>
    <label class="bulk-follow">Follow-up <input type="date" data-bulk-followup></label>
    <button class="btn btn-ghost btn-sm" data-action="bulk-export">Export</button>
    <button class="btn btn-ghost btn-sm danger-text" data-action="bulk-del">Delete</button>
    <button class="btn btn-ghost btn-sm" data-action="bulk-clear">Clear</button>`;
}
function bulkStatus(statusId) {
  state.selected.forEach(id => { const l = getLead(id); if (l) { l.status = statusId; l.updatedAt = nowISO(); if (statusById(statusId).terminal) l.closedAt = nowISO(); } });
  save(); render(); renderBanner(); toast('Status updated for selection.');
}
function bulkFollowup(dateStr) {
  state.selected.forEach(id => { const l = getLead(id); if (l) { l.nextFollowUp = dateStr; l.updatedAt = nowISO(); } });
  save(); render(); renderBanner(); toast('Follow-up set for selection.');
}
function bulkDelete() {
  const n = state.selected.size;
  if (!confirm(`Delete ${n} selected lead${n > 1 ? 's' : ''}? This cannot be undone.`)) return;
  DB.leads = DB.leads.filter(l => !state.selected.has(l.id));
  state.selected.clear(); save(); render(); renderBanner(); toast(`${n} deleted.`);
}
function bulkExport() {
  const sel = DB.leads.filter(l => state.selected.has(l.id));
  const cols = ['Name', 'Email', 'Phone', 'Company', 'Title', 'Source', 'Status', 'Priority', 'Value', 'Tags', 'Next Follow-up', 'Notes'];
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = sel.map(l => [l.name, l.email, l.phone, l.company, l.title, l.source, statusById(l.status).label,
    prioById(l.priority).label, l.value || '', (l.tags || []).join('; '), l.nextFollowUp || '',
    (l.notes || []).map(n => n.text).join(' • ')].map(q).join(','));
  downloadFile(`lead-tracker-selection-${todayStr()}.csv`, [cols.map(q).join(','), ...rows].join('\r\n'), 'text/csv');
  toast('Exported selection.');
}

/* ---- Reports / analytics ---- */
function reportsHTML() {
  const leads = DB.leads;
  const open = leads.filter(isOpenLead);
  const won = leads.filter(l => statusById(l.status).terminal === 'won');
  const lost = leads.filter(l => statusById(l.status).terminal === 'lost');
  const closed = won.length + lost.length;
  const winRate = closed ? Math.round(won.length / closed * 100) : 0;
  const wonVal = won.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const avg = won.length ? Math.round(wonVal / won.length) : 0;
  const pipeVal = open.reduce((s, l) => s + (Number(l.value) || 0), 0);

  const kpis = [['Pipeline value', fmtMoney(pipeVal)], ['Won revenue', fmtMoney(wonVal)], ['Win rate', winRate + '%'], ['Avg deal size', fmtMoney(avg)]];
  const kpiRow = kpis.map(([label, value]) => `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value tabular">${value}</div></div>`).join('');

  const bar = (label, w, color, val) => `<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div><div class="bar-val tabular">${val}</div></div>`;

  const funnelStages = DB.statuses.filter(s => !s.terminal || s.terminal === 'won');
  const fMax = Math.max(1, ...funnelStages.map(s => leads.filter(l => l.status === s.id).length));
  const funnel = funnelStages.map(s => { const n = leads.filter(l => l.status === s.id).length; return bar(s.label, n / fMax * 100, s.color, n); }).join('');

  const srcMap = {}; leads.forEach(l => { const k = l.source || 'Other'; srcMap[k] = (srcMap[k] || 0) + 1; });
  const srcEntries = Object.entries(srcMap).sort((a, b) => b[1] - a[1]);
  const sMax = Math.max(1, ...srcEntries.map(e => e[1]));
  const bySource = srcEntries.map(([k, v]) => bar(k, v / sMax * 100, '#2a78d6', v)).join('') || '<p style="color:var(--muted)">No data.</p>';

  const openStages = DB.statuses.filter(s => !s.terminal);
  const stageVal = openStages.map(s => leads.filter(l => l.status === s.id).reduce((a, l) => a + (Number(l.value) || 0), 0));
  const vMax = Math.max(1, ...stageVal);
  const valByStage = openStages.map((s, i) => bar(s.label, stageVal[i] / vMax * 100, s.color, fmtMoney(stageVal[i]))).join('');

  const base = new Date(); base.setDate(1);
  const months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(base.getFullYear(), base.getMonth() - i, 1); months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString('en-US', { month: 'short' }) }); }
  const wonByMonth = {}; won.forEach(l => { const k = monthKey(l.closedAt || l.updatedAt); wonByMonth[k] = (wonByMonth[k] || 0) + (Number(l.value) || 0); });
  const mMax = Math.max(1, ...months.map(m => wonByMonth[m.key] || 0));
  const trend = `<div class="trend">${months.map(m => { const v = wonByMonth[m.key] || 0; return `<div class="trend-col"><div class="trend-bar-wrap"><div class="trend-bar" style="height:${Math.max(3, v / mMax * 130)}px" title="${fmtMoney(v)}"></div></div><div class="trend-v tabular">${v ? '$' + Math.round(v / 1000) + 'k' : ''}</div><div class="trend-x">${m.label}</div></div>`; }).join('')}</div>`;

  const goal = DB.settings.goal || 0;
  const wonThisMonth = won.filter(l => monthKey(l.closedAt || l.updatedAt) === monthKey(nowISO())).reduce((a, l) => a + (Number(l.value) || 0), 0);
  const goalCard = goal ? `<div class="card card-pad" style="margin-bottom:18px"><div class="card-title">Monthly goal</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><div class="kpi-value tabular" style="font-size:26px">${fmtMoney(wonThisMonth)}</div><div style="color:var(--muted)">of ${fmtMoney(goal)}</div></div>
    <div class="meter"><div class="meter-fill" style="width:${Math.min(100, wonThisMonth / goal * 100)}%"></div></div>
    <div class="kpi-sub" style="margin-top:8px">${Math.round(wonThisMonth / goal * 100)}% of goal · ${wonThisMonth >= goal ? '🎉 goal hit!' : fmtMoney(goal - wonThisMonth) + ' to go'}</div></div>` : '';

  return `
    <div class="view-head"><div class="view-title">Reports<small>Your pipeline performance</small></div>
      <button class="btn btn-ghost" data-action="settings">⚙ ${goal ? 'Edit goal' : 'Set a goal'}</button></div>
    <div class="kpi-row">${kpiRow}</div>
    ${goalCard}
    <div class="dash-grid">
      <div class="card card-pad"><div class="card-title">Conversion funnel</div>${funnel}</div>
      <div class="card card-pad"><div class="card-title">Leads by source</div>${bySource}</div>
    </div>
    <div class="dash-grid" style="margin-top:18px">
      <div class="card card-pad"><div class="card-title">Open value by stage</div>${valByStage || '<p style="color:var(--muted)">No open value.</p>'}</div>
      <div class="card card-pad"><div class="card-title">Won revenue — last 6 months</div>${trend}</div>
    </div>`;
}

/* ----------------------- Init ----------------------- */
async function init() {
  DB = loadLocal() || freshDB();
  state.selected = new Set();
  applyTheme(DB.settings.theme);
  await tryRestoreFileLink();       // may replace DB from linked file
  applyTheme(DB.settings.theme);
  render();
  renderBanner();
  checkReminders();
  setInterval(checkReminders, 60 * 60 * 1000);
}
init();
