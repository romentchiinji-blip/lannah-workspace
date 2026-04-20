/* ═══════════════════════════════════════════════════
   LOGIN GATE
   Passwords are hashed with SHA-256 — never stored as plaintext.
═══════════════════════════════════════════════════ */

(function () {
  // SHA-256 hashes of the passwords
  // Winner2002 -> hash below
  // Lannah2002 -> hash below
  const VALID_HASHES = new Set([
    '4a6626761a2e6ad72a149f288b4c8305723493ae3713f2943159db9109d7759e',  // Elijah
    '2777bdb48a99aff801daf631c2518f8270617b4bdcb51de12e54800f81717a7d'   // Lannah
  ]);

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  const SESSION_KEY = 'lannah_auth';

  function isAuthed() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    const app = document.getElementById('appWrapper');
    if (app) {
      app.style.display = '';
      // Re-run all renders now that DOM is visible
      setTimeout(() => {
        if (typeof renderTasks    === 'function') renderTasks();
        if (typeof renderCalendar === 'function') renderCalendar();
        if (typeof updateStats    === 'function') updateStats();
        // accounts are rendered inline on page load
        if (typeof renderRecent   === 'function') renderRecent();
      }, 0);
    }
  }

  window.tryLogin = async function () {
    const pass = document.getElementById('loginPass').value;
    const hash = await sha256(pass);
    const card = document.querySelector('.login-card');
    const err  = document.getElementById('loginError');
    if (VALID_HASHES.has(hash)) {
      sessionStorage.setItem(SESSION_KEY, '1');
      showApp();
    } else {
      err.classList.remove('hidden');
      card.classList.remove('shake');
      void card.offsetWidth; // reflow to restart animation
      card.classList.add('shake');
      document.getElementById('loginPass').value = '';
    }
  };

  // On load — check session
  if (isAuthed()) {
    showApp();
  }
})();

/* ═══════════════════════════════════════════════════
   LANNAH'S WORKSPACE — app.js
═══════════════════════════════════════════════════ */

/* ── THEME ──────────────────────────────────────────── */
(function () {
  const r = document.documentElement;
  r.setAttribute('data-theme', 'dark');
  let d = 'dark';
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    d = d === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    btn.innerHTML = d === 'dark'
      ? `<svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  });
})();

/* ── DATE ───────────────────────────────────────────── */
(function () {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
  });
})();

/* ── GLOBAL STATE ───────────────────────────────────── */
let stats = { days: 0, passed: 0, failed: 0, rewritten: 0 };

// ── localStorage helpers ─────────────────────────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// workedDays: Set of 'YYYY-MM-DD' strings — persisted
let workedDays = new Set(lsGet('lannah_worked_days', []));
stats.days = workedDays.size;

function saveWorkedDays() {
  lsSet('lannah_worked_days', [...workedDays]);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/* ── STATS ──────────────────────────────────────────── */
function updateStats() {
  document.getElementById('statDaysWorked').textContent = stats.days;
  document.getElementById('statPassed').textContent = stats.passed;
  document.getElementById('statFailed').textContent = stats.failed;
  document.getElementById('statRewritten').textContent = stats.rewritten;
  document.getElementById('trackerBadge').textContent = stats.days;
}
updateStats();

/* ── TOAST ──────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, icon = '✨') {
  const t = document.getElementById('toast');
  t.innerHTML = `<span style="font-size:1.1rem">${icon}</span> ${msg}`;
  t.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ── NAVIGATION ─────────────────────────────────────── */
const PAGE_NAMES = {
  dashboard: 'Home',
  tracker: 'Work Tracker',
  scan: 'Scan Video',
  metadata: 'Metadata',
  tasks: 'Task for Today'
};

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  const nv = document.querySelector(`[data-page="${page}"]`);
  if (nv) nv.classList.add('active');
  const crumb = document.getElementById('crumb');
  if (crumb) crumb.textContent = PAGE_NAMES[page] || page;
  if (window.innerWidth <= 800) {
    document.getElementById('sidebar').classList.remove('open');
  }
  if (page === 'tracker') renderCalendar();
}

/* ── HAMBURGER ──────────────────────────────────────── */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ── ADD ACCOUNT MODAL ──────────────────────────────── */
const backdrop = document.getElementById('backdrop');
document.getElementById('addAccountBtn').addEventListener('click', () => backdrop.classList.remove('hidden'));
document.getElementById('modalClose').addEventListener('click', () => backdrop.classList.add('hidden'));
backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.add('hidden'); });
document.getElementById('modalSubmit').addEventListener('click', () => {
  const input = document.getElementById('newAccountInput');
  const name = input.value.trim();
  if (!name) return;
  const handle = name.startsWith('@') ? name : '@' + name;
  const li = document.createElement('li');
  li.className = 'account-item';
  li.innerHTML = `<span class="account-dot"></span><span>${handle}</span>`;
  document.getElementById('accountsList').appendChild(li);
  input.value = '';
  backdrop.classList.add('hidden');
  showToast(`${handle} added!`, '✅');
});

/* ═══════════════════════════════════════════════════
   WORK TRACKER — "Period Black Girl" Button
═══════════════════════════════════════════════════ */

function markWorkDay() {
  const key = todayKey();
  const alreadyWorked = workedDays.has(key);

  if (alreadyWorked) {
    showToast("You already logged today! You're doing amazing 🌟", '🖤');
    return;
  }

  workedDays.add(key);
  saveWorkedDays();
  stats.days = workedDays.size;
  updateStats();
  renderWorkLog();
  renderCalendar();
  updatePBGButtons();

  showToast("Day logged! You showed up today. Period. 🖤✨", '✓');
}

function updatePBGButtons() {
  const worked = workedDays.has(todayKey());
  const heroBtn = document.getElementById('pbgBtnTracker');
  const dashBtn = document.getElementById('pbgBtnDash');
  const label = document.getElementById('pbgTodayLabel');

  if (heroBtn) {
    heroBtn.classList.toggle('worked-today', worked);
    heroBtn.innerHTML = worked
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Today is logged ✓`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> I Worked Today ✓`;
  }
  if (dashBtn) {
    dashBtn.classList.toggle('pressed', worked);
    dashBtn.innerHTML = worked
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Logged Today!`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> I Worked Today`;
  }
  if (label) {
    const today = new Date();
    label.textContent = worked
      ? `✓ Logged for ${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
      : '';
  }
}

/* ── CALENDAR ───────────────────────────────────────── */
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function shiftMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  const label = document.getElementById('calMonthLabel');
  if (!grid || !label) return;

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  label.textContent = `${monthNames[calMonth]} ${calYear}`;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  grid.innerHTML = '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;
    if (dateStr === todayStr) cell.classList.add('today');
    if (workedDays.has(dateStr)) cell.classList.add('worked');
    grid.appendChild(cell);
  }
}

/* ── WORK LOG ───────────────────────────────────────── */
function renderWorkLog() {
  const log = document.getElementById('workLog');
  if (!log) return;

  const sorted = [...workedDays].sort((a, b) => b.localeCompare(a));

  if (sorted.length === 0) {
    log.innerHTML = `<div class="log-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>No days logged yet. Press the button above when you work!</p>
    </div>`;
    return;
  }

  log.innerHTML = sorted.map(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const isToday = dateStr === todayKey();
    return `<div class="log-entry" data-date="${dateStr}">
      <div class="log-check">✓</div>
      <div>
        <p class="log-date">${label}${isToday ? ' <span style="color:var(--pink);font-size:10px;font-weight:700">TODAY</span>' : ''}</p>
        <p class="log-time">Logged as worked day 🖤</p>
      </div>
      <button class="log-del" onclick="removeWorkDay('${dateStr}')" title="Remove this day">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');
}

function removeWorkDay(dateStr) {
  workedDays.delete(dateStr);
  saveWorkedDays();
  stats.days = workedDays.size;
  updateStats();
  renderWorkLog();
  renderCalendar();
  updatePBGButtons();
  showToast('Day removed from log.', '🗑');
}

/* ─── INIT TRACKER ──────────────────────────────────── */
updatePBGButtons();
renderWorkLog();
renderCalendar();

/* ═══════════════════════════════════════════════════
   SCAN VIDEO — Meta Guidelines Checker
═══════════════════════════════════════════════════ */

const META_RULES = {
  duration: {
    label: 'Duration',
    check(v) {
      if (!v.duration) return { status:'warn', display:'Unknown', note:'Could not read duration' };
      const s = v.duration;
      if (s < 3) return { status:'fail', display:fmtDur(s), note:'Too short (Reels min 3s)' };
      if (s > 5400) return { status:'fail', display:fmtDur(s), note:'Exceeds 90-minute limit' };
      if (s > 90) return { status:'warn', display:fmtDur(s), note:'Over 90s — use Feed, not Reels' };
      return { status:'pass', display:fmtDur(s), note:'Within Reels limit (3s–90s)' };
    }
  },
  resolution: {
    label: 'Resolution',
    check(v) {
      const { videoWidth: w, videoHeight: h } = v;
      if (!w || !h) return { status:'warn', display:'Unknown', note:'Could not probe resolution' };
      const mn = Math.min(w, h);
      if (mn < 540) return { status:'fail', display:`${w}×${h}`, note:'Below minimum — too low' };
      if (mn < 720) return { status:'warn', display:`${w}×${h}`, note:'Below 720p recommended' };
      const q = mn >= 2160 ? '4K ✓' : mn >= 1080 ? '1080p ✓' : '720p ✓';
      return { status:'pass', display:`${w}×${h}`, note:q };
    }
  },
  aspectRatio: {
    label: 'Aspect Ratio',
    check(v) {
      const { videoWidth: w, videoHeight: h } = v;
      if (!w || !h) return { status:'warn', display:'Unknown', note:'Could not detect' };
      const ratio = w / h;
      const approved = [
        { r:9/16, name:'9:16 Reels ✓' }, { r:1, name:'1:1 Square ✓' },
        { r:4/5, name:'4:5 Portrait ✓' }, { r:16/9, name:'16:9 Landscape ✓' }
      ];
      const match = approved.find(a => Math.abs(ratio - a.r) < 0.03);
      const disp = simplifyRatio(w, h);
      if (match) return { status:'pass', display:disp, note:match.name };
      if (ratio >= 0.5 && ratio <= 2.0) return { status:'warn', display:disp, note:'Non-standard — may crop' };
      return { status:'fail', display:disp, note:'Not supported by Meta' };
    }
  },
  fileSize: {
    label: 'File Size',
    check(v) {
      if (!v.fileSize) return { status:'warn', display:'Unknown', note:'Could not read size' };
      const gb = v.fileSize / 1024 ** 3;
      if (gb > 4) return { status:'fail', display:fmtSize(v.fileSize), note:'Exceeds 4GB limit' };
      return { status:'pass', display:fmtSize(v.fileSize), note:'Under 4GB limit ✓' };
    }
  },
  format: {
    label: 'Format',
    check(v) {
      if (!v.mimeType) return { status:'warn', display:'Unknown', note:'Format undetected' };
      const t = v.mimeType.toLowerCase();
      if (t.includes('mp4') || t.includes('mpeg4')) return { status:'pass', display:'MP4', note:'Ideal for Meta ✓' };
      if (t.includes('mov') || t.includes('quicktime')) return { status:'pass', display:'MOV', note:'Supported ✓' };
      if (t.includes('avi')) return { status:'warn', display:'AVI', note:'Works but MP4 preferred' };
      if (t.includes('mkv')) return { status:'warn', display:'MKV', note:'Limited support — convert to MP4' };
      const ext = v.mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
      return { status:'warn', display:ext, note:'Unknown format — MP4 recommended' };
    }
  }
};

function fmtDur(s) {
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
function fmtSize(b) {
  if (b >= 1024**3) return (b/1024**3).toFixed(2)+' GB';
  if (b >= 1024**2) return (b/1024**2).toFixed(1)+' MB';
  return (b/1024).toFixed(0)+' KB';
}
function simplifyRatio(w, h) { const g = gcd(w,h); return `${w/g}:${h/g}`; }
function gcd(a,b) { return b===0?a:gcd(b,a%b); }

/* ── DROP ZONE (scan) ───────────────────────────────── */
let scanFile = null;
const dropZone = document.getElementById('dropZone');
const videoInput = document.getElementById('videoInput');
const browseBtn = document.getElementById('browseBtn');
const scanResult = document.getElementById('scanResult');
const vPrevWrap = document.getElementById('videoPreviewWrap');
const vPrev = document.getElementById('videoPreview');

browseBtn.addEventListener('click', e => { e.stopPropagation(); videoInput.click(); });
dropZone.addEventListener('click', () => videoInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-active'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-active');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('video/')) startScan(f);
});
videoInput.addEventListener('change', () => { if (videoInput.files[0]) startScan(videoInput.files[0]); });

function startScan(file) {
  scanFile = file;
  scanResult.classList.add('hidden');
  vPrevWrap.classList.remove('hidden');
  const url = URL.createObjectURL(file);
  vPrev.src = url;
  vPrev.onloadedmetadata = () => {
    doScan({ duration: vPrev.duration, videoWidth: vPrev.videoWidth, videoHeight: vPrev.videoHeight, fileSize: file.size, mimeType: file.type, fileName: file.name }, file);
  };
  vPrev.onerror = () => {
    doScan({ duration:null, videoWidth:null, videoHeight:null, fileSize: file.size, mimeType: file.type, fileName: file.name }, file);
  };
}

function doScan(info, file) {
  let fail = false, warn = false;
  const results = {};
  for (const [k, rule] of Object.entries(META_RULES)) {
    const r = rule.check(info);
    results[k] = { label: rule.label, ...r };
    if (r.status === 'fail') fail = true;
    if (r.status === 'warn') warn = true;
  }
  const pass = !fail;
  renderScan(results, pass, warn, info);
  if (pass) stats.passed++; else stats.failed++;
  updateStats();
}

function renderScan(results, pass, warn, info) {
  const vb = document.getElementById('verdictBanner');
  const rd = document.getElementById('resultDetails');
  const ra = document.getElementById('resultActions');

  // Verdict
  let cls, iCls, icon, title, desc;
  if (pass && !warn) {
    cls='vb-pass'; iCls='vbi-pass';
    icon=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    title='✓ CLEARED — READY TO POST';
    desc='Your video passes all Meta guidelines. Rewrite the metadata below before posting to avoid duplicate detection.';
  } else if (pass && warn) {
    cls='vb-warn'; iCls='vbi-warn';
    icon=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    title='⚠ PASS WITH CAUTIONS';
    desc='Passes core rules but has some cautions. Review before posting.';
  } else {
    cls='vb-fail'; iCls='vbi-fail';
    icon=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    title='✗ DOES NOT MEET GUIDELINES';
    desc='This video has issues that may cause rejection or removal by Meta. Fix before posting.';
  }
  vb.className = `verdict-banner ${cls}`;
  vb.innerHTML = `
    <div class="vb-icon ${iCls}">${icon}</div>
    <div><p class="vb-title">${title}</p><p class="vb-desc">${desc}</p></div>`;

  // Details
  let rows = '';
  for (const [, r] of Object.entries(results)) {
    const sc = r.status==='pass'?'ds-pass':r.status==='fail'?'ds-fail':'ds-warn';
    const si = r.status==='pass'?'✓':r.status==='fail'?'✗':'⚠';
    rows += `<div class="detail-row">
      <span class="dl">${r.label}</span>
      <span class="dv">${r.display}</span>
      <span class="ds ${sc}">${si} ${r.note}</span>
    </div>`;
  }
  rows += `<div class="detail-row">
    <span class="dl">File</span>
    <span class="dv" style="font-size:var(--text-xs);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${info.fileName}</span>
    <span></span>
  </div>`;
  rd.innerHTML = rows;

  // Actions
  ra.innerHTML = `
    <button class="act-btn act-primary" onclick="navigateTo('metadata')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      Rewrite Metadata
    </button>
    <button class="act-btn act-ghost" onclick="clearScan()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
      Scan Another
    </button>`;

  scanResult.classList.remove('hidden');
}

function clearScan() {
  scanResult.classList.add('hidden');
  vPrevWrap.classList.add('hidden');
  videoInput.value = '';
  vPrev.src = '';
  scanFile = null;
}

/* ═══════════════════════════════════════════════════
   METADATA REWRITER
═══════════════════════════════════════════════════ */

let metaFile = null;
const mDrop = document.getElementById('metaDropZone');
const mInput = document.getElementById('metaVideoInput');
const mBrowse = document.getElementById('metaBrowseBtn');
const mFileInfo = document.getElementById('metaFileInfo');
const mFileName = document.getElementById('metaFileName');
const mFileSize = document.getElementById('metaFileSize');
const mTable = document.getElementById('metaTableWrap');
const rwBtn = document.getElementById('rewriteBtn');
const rwProg = document.getElementById('rewriteProgress');
const progBar = document.getElementById('progressBar');
const progLbl = document.getElementById('progressLabel');
const rwSuccess = document.getElementById('rewriteSuccess');

mBrowse.addEventListener('click', e => { e.stopPropagation(); mInput.click(); });
mDrop.addEventListener('click', () => mInput.click());
mDrop.addEventListener('dragover', e => { e.preventDefault(); mDrop.classList.add('drag-active'); });
mDrop.addEventListener('dragleave', () => mDrop.classList.remove('drag-active'));
mDrop.addEventListener('drop', e => {
  e.preventDefault(); mDrop.classList.remove('drag-active');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('video/')) loadMeta(f);
});
mInput.addEventListener('change', () => { if (mInput.files[0]) loadMeta(mInput.files[0]); });

function loadMeta(file) {
  metaFile = file;
  mFileName.textContent = file.name;
  mFileSize.textContent = fmtSize(file.size);
  mFileInfo.classList.remove('hidden');
  rwBtn.disabled = false;
  rwSuccess.classList.add('hidden');

  const tmp = document.createElement('video');
  tmp.src = URL.createObjectURL(file);
  tmp.onloadedmetadata = () => { buildMetaTable(file, tmp); URL.revokeObjectURL(tmp.src); };
  tmp.onerror = () => buildMetaTable(file, null);
}

function buildMetaTable(file, vid) {
  const ext = file.name.split('.').pop().toUpperCase();
  const rows = [
    ['File Name', file.name, true],
    ['Format', ext, false],
    ['File Size', fmtSize(file.size), false],
    ['Duration', vid?.duration ? fmtDur(vid.duration) : 'Unknown', false],
    ['Resolution', vid?.videoWidth ? `${vid.videoWidth}×${vid.videoHeight}` : 'Unknown', false],
    ['MIME Type', file.type || 'Unknown', false],
    ['Last Modified', new Date(file.lastModified).toLocaleString(), true],
    ['Creation Date', new Date(file.lastModified).toLocaleString(), true],
    ['GPS / Location', 'Embedded (if present)', true],
    ['Device / Camera', 'Embedded (if present)', true],
    ['Encoder Fingerprint', 'Embedded (if present)', true],
    ['Software', 'Embedded (if present)', true],
  ];

  let html = `<table class="mtable"><thead><tr><th>Field</th><th>Current Value</th><th>Action</th></tr></thead><tbody>`;
  for (const [field, val, willChange] of rows) {
    html += `<tr>
      <td>${field}</td>
      <td>${val}</td>
      <td>${willChange ? '<span class="mtag">Will Rewrite</span>' : '<span style="font-size:10px;color:var(--faint)">Unchanged</span>'}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  mTable.innerHTML = html;
}

/* ── REWRITE ENGINE (Pure JS — no WASM needed) ───────── */

const dlArea      = document.getElementById('dlArea');
const shareBtn    = document.getElementById('shareBtn');
const dlIosTip    = document.getElementById('dlIosTip');
const dlLink      = document.getElementById('downloadLink');
const safariBanner = document.getElementById('safariBanner');
let _blobUrl  = null;
let _blobFile = null;

// Detect if we're inside an iframe (Perplexity app / embedded)
const inIframe = (() => { try { return window.self !== window.top; } catch(e) { return true; } })();
const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Show iframe warning on the metadata page as soon as it loads
if (inIframe) {
  safariBanner.classList.remove('hidden');
}

/* ── Share / Save button handler ────────────────────── */
shareBtn.addEventListener('click', async () => {
  if (!_blobFile) return;
  // Try native Web Share API (iOS Safari, Android Chrome) — this gives
  // the "Save to Photos" / "Save to Files" sheet on iPhone
  if (navigator.canShare && navigator.canShare({ files: [_blobFile] })) {
    try {
      await navigator.share({ files: [_blobFile], title: _blobFile.name });
      return;
    } catch (e) {
      // User cancelled or share failed — fall through to link
      if (e.name === 'AbortError') return;
    }
  }
  // Desktop / browsers without share API — trigger anchor download
  const a = document.createElement('a');
  a.href = _blobUrl;
  a.download = _blobFile.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

function rndStr(n = 10) {
  return Array.from({length:n}, () => Math.random().toString(36)[2]).join('');
}
function rndDate() {
  const base = Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 600;
  return new Date(base).toISOString().replace('T',' ').slice(0,19);
}
function rndEncoder() {
  return ['Lavf58.76.100','Lavf59.20.101','Lavf60.1.101','HandBrake 1.6.0','Lavf58.29.100'][Math.floor(Math.random()*5)];
}

rwBtn.addEventListener('click', async () => {
  if (!metaFile) return;
  rwBtn.disabled = true;
  rwProg.classList.remove('hidden');
  rwSuccess.classList.add('hidden');
  dlArea.classList.add('hidden');
  dlIosTip.style.display = 'none';
  dlLink.style.display = 'none';
  progBar.style.width = '0%';
  progLbl.textContent = 'Reading video…';

  const opts = {
    title:   document.getElementById('optTitle').checked,
    date:    document.getElementById('optDate').checked,
    device:  document.getElementById('optDevice').checked,
    gps:     document.getElementById('optGPS').checked,
    encoder: document.getElementById('optEncoder').checked,
  };

  try {
    await rewriteMeta(opts);
  } catch (err) {
    console.error('Rewrite error:', err);
    showToast('Something went wrong — try again', '⚠️');
    rwBtn.disabled = false;
    rwProg.classList.add('hidden');
  }
});

/* ─── Pure-JS MP4/MOV metadata rewriter ─────────────────
   Strategy:
   1. Read the original file as ArrayBuffer
   2. Walk the ISO Base Media File Format box tree
   3. Find and wipe the udta (user data) box — this holds
      title, creation_time, GPS, device, encoder strings
   4. Patch the file-level creation_time in the mvhd box
   5. Produce a new Blob at the same quality — zero re-encoding
   For non-MP4 formats (webm, avi, etc.) we do a filename
   randomization pass which changes the fingerprint IG sees
   when the file is uploaded.
──────────────────────────────────────────────────────── */

async function rewriteMeta(opts) {
  const ext      = metaFile.name.split('.').pop().toLowerCase();
  const newName  = rndStr(14) + '.' + ext;
  const mimeType = metaFile.type || 'video/mp4';

  progBar.style.width = '8%';
  progLbl.textContent = 'Reading file…';

  // Read into ArrayBuffer — yields to browser between chunks so UI stays alive
  const buf = await metaFile.arrayBuffer();

  progBar.style.width = '18%';
  progLbl.textContent = 'Processing in background…';

  await new Promise((resolve, reject) => {
    const workerUrl = new URL('rewrite-worker.js', location.href).href;
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        progBar.style.width = msg.p + '%';
        progLbl.textContent = msg.label;
      } else if (msg.type === 'done') {
        worker.terminate();
        const blob = new Blob([msg.outBuf], { type: mimeType });
        if (_blobUrl) URL.revokeObjectURL(_blobUrl);
        _blobUrl  = URL.createObjectURL(blob);
        _blobFile = new File([blob], msg.newName, { type: mimeType });
        dlLink.href     = _blobUrl;
        dlLink.download = msg.newName;
        progBar.style.width = '100%';
        progLbl.textContent = 'Done!';
        setTimeout(() => {
          rwProg.classList.add('hidden');
          rwSuccess.classList.remove('hidden');
          if (inIframe) {
            safariBanner.classList.remove('hidden');
            showToast('Open in Safari to save — tap the banner ↗️', '📱');
          } else {
            dlArea.classList.remove('hidden');
            if (isIOS) { dlIosTip.style.display = 'block'; dlLink.style.display = 'inline'; }
            showToast('Video ready — tap Save Video to download 🎬', '✅');
          }
          rwBtn.disabled = false;
          stats.rewritten++;
          updateStats();
        }, 300);
        resolve();
      } else if (msg.type === 'error') {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (err) => { worker.terminate(); reject(err); };
    // Transfer buf to worker — zero-copy, no memory spike even on large 4K files
    worker.postMessage({ buf, opts, newName }, [buf]);
  });
}

function finishRewrite() {} // kept for compat

/* ─── ALL DONE ──────────────────────────────────────── */
console.log('%c🖤 Lannah\'s Workspace — loaded', 'color:#e879a0;font-weight:700;font-size:13px');

/* ═══════════════════════════════════════════════════
   LINK SCANNER — Meta Risk Engine
═══════════════════════════════════════════════════ */

// Update page names map
PAGE_NAMES['linkcheck'] = 'Scan Link';

// ── RISK DATABASE ────────────────────────────────────
// Each domain entry: { level: 'high'|'med'|'low', reason, tip }
const RISKY_DOMAINS = {
  // Link aggregators (very commonly flagged by Meta)
  'link.me':         { level:'high', reason:'Frequently flagged by Meta — heavily used by adult content creators, triggers spam filters', tip:'Use a custom domain redirect instead (e.g. yourname.com → your page)' },
  'linktr.ee':       { level:'high', reason:'Linktree is blocked from Meta paid ads and flagged in many bio contexts due to adult/spam abuse', tip:'Replace with a custom domain or Stan.store for safer routing' },
  'linktree.com':    { level:'high', reason:'Same as linktr.ee — high risk on Meta', tip:'Use a custom domain' },
  'lnk.bio':         { level:'high', reason:'Known link-in-bio aggregator flagged on Meta', tip:'Replace with a personal domain' },
  'beacons.ai':      { level:'med',  reason:'Occasionally flagged — depends on linked destinations', tip:'Keep linked pages policy-compliant' },
  'bio.site':        { level:'med',  reason:'Medium risk — depends on what destinations you link to', tip:'Acceptable if all destination pages are compliant' },
  'tap.bio':         { level:'med',  reason:'Some flagging history on Meta — use cautiously', tip:'Verify destination links are all compliant' },
  'allmylinks.com':  { level:'high', reason:'Heavily associated with adult content profiles — high flag risk', tip:'Use a custom domain' },
  'campsite.bio':    { level:'med',  reason:'Moderate risk depending on content', tip:'Generally safer than Linktree but still flagged occasionally' },
  'instabio.cc':     { level:'high', reason:'High risk — frequently associated with adult/spam content', tip:'Avoid on Meta' },
  'hoo.be':          { level:'med',  reason:'Moderate risk — usage pattern affects risk level', tip:'Acceptable for non-adult content' },
  'msha.ke':         { level:'med',  reason:'Milkshake — moderate risk, depends on content type', tip:'Generally acceptable for compliant content' },
  'solo.to':         { level:'med',  reason:'Medium risk on Meta ads, lower risk organic', tip:'Avoid using in boosted posts' },

  // Adult / subscription platforms
  'onlyfans.com':    { level:'high', reason:'Directly banned from Meta ads — instantly flags ad accounts', tip:'Never post an OnlyFans link directly. Use a custom domain redirect that routes to it' },
  'fansly.com':      { level:'high', reason:'Adult platform — same risk level as OnlyFans on Meta', tip:'Use a redirect through a personal domain' },
  'manyvids.com':    { level:'high', reason:'Adult content platform — flagged by Meta', tip:'Route through a neutral personal domain' },
  'loyalfans.com':   { level:'high', reason:'Adult subscription platform — high Meta flag risk', tip:'Use a personal domain as a redirect' },
  'unfiltrd.com':    { level:'high', reason:'Adult platform — flagged by Meta', tip:'Route through a neutral redirect' },
  'justforfans.com': { level:'high', reason:'Adult platform — high Meta flag risk', tip:'Use a neutral redirect domain' },
  'fanvue.com':      { level:'high', reason:'Adult subscription platform — flagged', tip:'Custom domain redirect recommended' },
  'patreon.com':     { level:'low',  reason:'Generally allowed but depends on content type. Adult tiers can trigger review', tip:'Keep content tiers clearly labeled and non-explicit in promotions' },

  // URL shorteners (often flagged as spam vectors)
  'bit.ly':          { level:'med',  reason:'URL shorteners can trigger spam filters — Meta prefers direct links', tip:'Use your actual domain URL instead of a shortened link' },
  'tinyurl.com':     { level:'med',  reason:'Shorteners raise spam risk on Meta', tip:'Use full domain URLs' },
  't.co':            { level:'med',  reason:'Twitter shortener — Meta may flag due to cross-platform redirect chains', tip:'Use direct destination URLs' },
  'ow.ly':           { level:'med',  reason:'Hootsuite shortener — Meta may flag spam redirects', tip:'Use direct URLs' },
  'rebrand.ly':      { level:'med',  reason:'Redirect chains can trigger spam detection', tip:'Ensure destination is policy-compliant' },
  'cutt.ly':         { level:'med',  reason:'Shortener with some flagging history on Meta', tip:'Use a direct domain URL' },

  // Generally safe
  'instagram.com':   { level:'low',  reason:'Instagram itself — generally safe', tip:'Linking to your own Instagram profile is fine' },
  'facebook.com':    { level:'low',  reason:'Meta-owned — safe to link', tip:'Safe to use in bio and posts' },
  'twitter.com':     { level:'low',  reason:'Generally allowed', tip:'Monitor for any policy changes' },
  'x.com':           { level:'low',  reason:'Same as twitter.com — generally fine', tip:'Direct links are fine' },
  'tiktok.com':      { level:'low',  reason:'Allowed in most contexts', tip:'Fine in bio links' },
  'youtube.com':     { level:'low',  reason:'Generally safe', tip:'Safe to link to YouTube' },
  'youtu.be':        { level:'low',  reason:'YouTube shortener — safe', tip:'Fine to use' },
  'spotify.com':     { level:'low',  reason:'Safe', tip:'Fine to link' },
  'amazon.com':      { level:'low',  reason:'Generally safe — standard retail', tip:'Fine for product links' },
  'stan.store':      { level:'low',  reason:'Generally safer than Linktree for creators — Meta-friendly', tip:'Good Linktree alternative' },
};

const RISKY_KEYWORDS = [
  { kw: 'onlyfans',    severity: 'high', reason: 'URL contains "onlyfans" — instantly flagged by Meta' },
  { kw: 'adult',       severity: 'high', reason: 'URL contains "adult" keyword — raises adult content flags' },
  { kw: 'nsfw',        severity: 'high', reason: 'URL contains "nsfw" — flagged by Meta content filters' },
  { kw: 'xxx',         severity: 'high', reason: 'URL contains explicit keyword' },
  { kw: 'sex',         severity: 'high', reason: 'URL contains explicit keyword — will trigger Meta filter' },
  { kw: 'porn',        severity: 'high', reason: 'Explicit keyword — banned by Meta' },
  { kw: 'escort',      severity: 'high', reason: 'Flagged keyword on Meta' },
  { kw: 'fans',        severity: 'med',  reason: 'URL contains "fans" — often associated with subscription content' },
  { kw: 'subscribe',   severity: 'low',  reason: 'Contains "subscribe" — low risk but monitor' },
];

// Recent scans (in-memory)
let recentScans = [];

// Render reference grid on load
(function buildRiskGrid() {
  const grid = document.getElementById('riskDomainGrid');
  if (!grid) return;
  const groups = { high: [], med: [], low: [] };
  for (const [domain, info] of Object.entries(RISKY_DOMAINS)) {
    groups[info.level].push(domain);
  }
  const labels = { high: '🔴 High Risk', med: '🟡 Caution', low: '🟢 Generally Safe' };
  let html = '';
  for (const level of ['high', 'med', 'low']) {
    for (const d of groups[level]) {
      html += `<span class="domain-tag dt-${level}" title="${RISKY_DOMAINS[d].reason}">${d}</span>`;
    }
  }
  grid.innerHTML = html;
})();

// ── SCAN ENGINE ──────────────────────────────────────
function scanLink() {
  const raw = document.getElementById('linkInput').value.trim();
  if (!raw) { showToast('Paste a link first!', '🔗'); return; }

  let url;
  try {
    // Auto-add protocol if missing
    const withProto = raw.startsWith('http') ? raw : 'https://' + raw;
    url = new URL(withProto);
  } catch {
    showToast('That doesn\'t look like a valid URL.', '⚠️'); return;
  }

  const result = analyzeLink(url, raw);
  renderLinkResult(result, url, raw);

  // Add to recent
  recentScans = recentScans.filter(r => r.raw !== raw);
  recentScans.unshift({ raw, risk: result.overallLevel });
  if (recentScans.length > 5) recentScans.pop();
  renderRecent();

  // Update stats
  if (result.overallLevel === 'low') stats.passed++;
  else stats.failed++;
  updateStats();
}

function analyzeLink(url, raw) {
  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  const fullUrl = raw.toLowerCase();
  const checks = [];

  // 1 — Domain check
  const domainInfo = RISKY_DOMAINS[hostname];
  if (domainInfo) {
    checks.push({
      id: 'domain',
      label: 'Domain reputation',
      icon: domainInfo.level === 'low' ? '✅' : domainInfo.level === 'med' ? '⚠️' : '🚫',
      level: domainInfo.level,
      detail: domainInfo.reason,
      tip: domainInfo.tip,
    });
  } else {
    checks.push({
      id: 'domain',
      label: 'Domain reputation',
      icon: '✅',
      level: 'low',
      detail: `"${hostname}" is not on the known high-risk domain list`,
      tip: 'Custom domains are generally the safest choice on Meta',
    });
  }

  // 2 — Keyword scan in URL path/query
  const pathKeywords = [];
  for (const { kw, severity, reason } of RISKY_KEYWORDS) {
    if (fullUrl.includes(kw)) pathKeywords.push({ kw, severity, reason });
  }
  if (pathKeywords.length > 0) {
    const worst = pathKeywords.reduce((a, b) => riskRank(a.severity) > riskRank(b.severity) ? a : b);
    checks.push({
      id: 'keywords',
      label: 'URL keyword scan',
      icon: worst.severity === 'high' ? '🚫' : '⚠️',
      level: worst.severity,
      detail: pathKeywords.map(k => k.reason).join(' · '),
      tip: 'Rename your page or use a neutral slug that doesn\'t contain flagged keywords',
    });
  } else {
    checks.push({
      id: 'keywords',
      label: 'URL keyword scan',
      icon: '✅',
      level: 'low',
      detail: 'No flagged keywords found in the URL',
      tip: 'Keep URL slugs neutral — avoid words that signal adult or spam content',
    });
  }

  // 3 — Redirect chain risk
  const isShortener = ['bit.ly','tinyurl.com','ow.ly','t.co','rebrand.ly','cutt.ly','short.io'].includes(hostname);
  checks.push({
    id: 'redirect',
    label: 'Redirect chain',
    icon: isShortener ? '⚠️' : '✅',
    level: isShortener ? 'med' : 'low',
    detail: isShortener
      ? 'URL shorteners create redirect chains — Meta flags these as potential spam vectors'
      : 'No URL shortener detected — direct links are preferred by Meta',
    tip: isShortener
      ? 'Use a direct URL to your destination page instead of a shortener'
      : 'Direct links are ideal — keep it this way',
  });

  // 4 — HTTPS check
  const isHTTPS = url.protocol === 'https:';
  checks.push({
    id: 'https',
    label: 'Secure connection (HTTPS)',
    icon: isHTTPS ? '✅' : '🚫',
    level: isHTTPS ? 'low' : 'high',
    detail: isHTTPS
      ? 'HTTPS detected — secure links are required by Meta'
      : 'HTTP links are flagged by Meta — all links must use HTTPS',
    tip: isHTTPS
      ? 'Good — always use HTTPS links'
      : 'Get an SSL certificate for your domain so links start with https://',
  });

  // 5 — Custom domain check
  const isCustomDomain = !domainInfo && !isShortener && hostname !== 'instagram.com' && hostname !== 'facebook.com';
  checks.push({
    id: 'customdomain',
    label: 'Custom domain',
    icon: isCustomDomain ? '✅' : '💡',
    level: isCustomDomain ? 'low' : 'med',
    detail: isCustomDomain
      ? `"${hostname}" looks like a personal/custom domain — this is the safest choice for Meta`
      : 'Not a custom domain. Third-party platforms carry domain-level reputation risk on Meta',
    tip: isCustomDomain
      ? 'Great — custom domains are the gold standard for Meta-safe bio links'
      : 'Consider routing through a personal domain (e.g. lannah.com) that redirects to your page — this is the safest approach',
  });

  // Compute overall risk
  const levels = checks.map(c => riskRank(c.level));
  const maxLevel = Math.max(...levels);
  const overallLevel = maxLevel >= 3 ? 'high' : maxLevel >= 2 ? 'med' : 'low';

  // Risk score (0-100, lower = safer)
  const score = Math.min(100, checks.reduce((sum, c) => sum + (riskRank(c.level) * 22), 0));

  return { checks, overallLevel, score, hostname };
}

function riskRank(level) {
  return level === 'high' ? 3 : level === 'med' ? 2 : 1;
}

function renderLinkResult(result, url, raw) {
  const resultEl = document.getElementById('linkResult');
  const bannerEl = document.getElementById('linkVerdictBanner');
  const detailsEl = document.getElementById('linkResultDetails');
  const tipsEl = document.getElementById('linkTips');

  // Verdict banner
  const isPass = result.overallLevel === 'low';
  const isWarn = result.overallLevel === 'med';
  let bCls, iCls, icon, title, desc;

  if (isPass) {
    bCls='vb-pass'; iCls='vbi-pass';
    icon=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    title='✓ SAFE TO USE ON META';
    desc='This link appears safe based on our checks. No known high-risk domain, keywords, or redirect issues detected.';
  } else if (isWarn) {
    bCls='vb-warn'; iCls='vbi-warn';
    icon=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    title='⚠ USE WITH CAUTION';
    desc='This link has some risk factors. It may cause issues in boosted posts or Meta ads. Review the checks below.';
  } else {
    bCls='vb-fail'; iCls='vbi-fail';
    icon=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    title='🚫 HIGH RISK — DO NOT POST';
    desc='This link is likely to get your post removed, your account flagged, or your ad account restricted by Meta.';
  }

  bannerEl.className = `verdict-banner ${bCls}`;
  bannerEl.innerHTML = `
    <div class="link-score-wrap">
      <div class="score-ring-wrap">
        ${buildScoreRing(result.score, result.overallLevel)}
      </div>
      <div class="score-info">
        <div class="vb-icon ${iCls}" style="display:inline-flex;width:40px;height:40px;border-radius:50%;align-items:center;justify-content:center;margin-bottom:8px;">${icon}</div>
        <p class="score-verdict-title ${result.overallLevel === 'low' ? 'verdict-label-green' : result.overallLevel === 'med' ? '' : 'verdict-label-red'}"
           style="color:${result.overallLevel==='low'?'var(--green)':result.overallLevel==='med'?'var(--amber)':'var(--red)'}">${title}</p>
        <p class="score-verdict-desc">${desc}</p>
        <p style="font-size:var(--text-xs);color:var(--faint);margin-top:6px;word-break:break-all;">${url.href}</p>
      </div>
    </div>`;

  // Detail rows
  let rows = '';
  for (const c of result.checks) {
    const lCls = c.level === 'low' ? 'ri-pass' : c.level === 'med' ? 'ri-warn' : 'ri-fail';
    const bCls2 = c.level === 'low' ? 'rb-pass' : c.level === 'med' ? 'rb-warn' : 'rb-fail';
    const bLabel = c.level === 'low' ? '✓ Safe' : c.level === 'med' ? '⚠ Caution' : '✗ Risk';
    rows += `<div class="risk-row">
      <div class="risk-row-left">
        <div class="risk-icon ${lCls}">${c.icon}</div>
        <div>
          <p class="risk-label">${c.label}</p>
          <p class="risk-detail">${c.detail}</p>
        </div>
      </div>
      <span class="risk-badge ${bCls2}">${bLabel}</span>
    </div>`;
  }
  detailsEl.innerHTML = rows;

  // Tips
  const failedChecks = result.checks.filter(c => c.level !== 'low');
  if (failedChecks.length === 0) {
    tipsEl.innerHTML = `<p class="tips-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      No action needed
    </p>
    <p style="font-size:var(--text-sm);color:var(--muted)">This link looks clean. You can use it in your bio and posts safely.</p>`;
  } else {
    const tipsList = failedChecks.map((c, i) =>
      `<div class="tip-item"><div class="tip-num">${i+1}</div><span>${c.tip}</span></div>`
    ).join('');
    tipsEl.innerHTML = `<p class="tips-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      How to fix it
    </p>
    <div class="tips-list">${tipsList}</div>`;
  }

  resultEl.classList.remove('hidden');
}

function buildScoreRing(score, level) {
  const r = 42, circ = 2 * Math.PI * r;
  // score: 0=safest, 100=riskiest
  // ring fill = how much of circle is "at risk" (more fill = more risk)
  const offset = circ - (score / 100) * circ;
  const stroke = level === 'low' ? 'var(--green)' : level === 'med' ? 'var(--amber)' : 'var(--red)';
  const label = level === 'low' ? 'Safe' : level === 'med' ? 'Caution' : 'Risk';
  const numColor = level === 'low' ? 'var(--green)' : level === 'med' ? 'var(--amber)' : 'var(--red)';
  return `
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle class="score-ring-bg" cx="50" cy="50" r="${r}"/>
      <circle class="score-ring-fill" cx="50" cy="50" r="${r}"
        stroke="${stroke}"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${offset}"
      />
    </svg>
    <div class="score-label">
      <span class="score-num" style="color:${numColor}">${score}</span>
      <span class="score-sub" style="color:${numColor}">${label}</span>
    </div>`;
}

function renderRecent() {
  const el = document.getElementById('linkRecent');
  if (!el || recentScans.length === 0) return;
  el.innerHTML = recentScans.map(s => {
    const col = s.risk === 'low' ? 'var(--green)' : s.risk === 'med' ? 'var(--amber)' : 'var(--red)';
    return `<button class="recent-chip" onclick="document.getElementById('linkInput').value='${s.raw.replace(/'/g,"\\'")}';scanLink()">
      <span class="recent-chip-dot" style="background:${col}"></span>
      ${s.raw.length > 36 ? s.raw.slice(0,36)+'…' : s.raw}
    </button>`;
  }).join('');
}

// Press Enter to scan
document.getElementById('linkInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') scanLink();
});

/* ═══════════════════════════════════════════════════
   TASK FOR TODAY
═══════════════════════════════════════════════════ */

// tasks: array of { id, title, steps: [{text, imgData}] }
let tasks = lsGet('lannah_tasks', []);

function saveTasks() { lsSet('lannah_tasks', tasks); }

function renderTasks() {
  const list = document.getElementById('taskList');
  if (!list) return;
  if (tasks.length === 0) {
    list.innerHTML = `<div class="task-empty">No tasks yet. Add one above! 🌸</div>`;
    return;
  }
  list.innerHTML = tasks.map((t, ti) => `
    <div class="task-card" id="tc-${t.id}">
      <div class="task-card-hdr">
        <span class="task-card-title">${escHtml(t.title)}</span>
        <div class="task-card-btns">
          <button class="task-icon-btn" onclick="addStep(${ti})" title="Add step">+ Step</button>
          <button class="task-icon-btn danger" onclick="deleteTask(${ti})" title="Delete task">&times;</button>
        </div>
      </div>
      <ol class="task-steps">
        ${t.steps.map((s, si) => `
          <li class="task-step">
            ${s.imgData ? `<img class="task-step-img" src="${s.imgData}" alt="step ${si+1}">` : ''}
            <span class="task-step-text">${escHtml(s.text)}</span>
            <button class="task-step-del" onclick="deleteStep(${ti},${si})">&times;</button>
          </li>
        `).join('')}
      </ol>
    </div>
  `).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function addTask() {
  const inp = document.getElementById('newTaskTitle');
  const title = inp ? inp.value.trim() : '';
  if (!title) { showToast('Enter a task title first', '⚠️'); return; }
  tasks.push({ id: Date.now(), title, steps: [] });
  saveTasks();
  renderTasks();
  if (inp) inp.value = '';
  showToast('Task added!', '✅');
}

function deleteTask(ti) {
  tasks.splice(ti, 1);
  saveTasks();
  renderTasks();
}

// Pending step state (image + text per task)
const _stepImg = {};

function taskStepImgChange(ti, inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _stepImg[ti] = e.target.result;
    const prev = document.getElementById(`stepPrev-${ti}`);
    if (prev) { prev.src = e.target.result; prev.classList.remove('hidden'); }
  };
  reader.readAsDataURL(file);
}

function addStep(ti) {
  // Build inline step adder below the task card
  // Check if adder already open
  const existing = document.getElementById(`step-adder-${ti}`);
  if (existing) { existing.remove(); return; }
  const card = document.getElementById(`tc-${tasks[ti].id}`);
  if (!card) return;
  const adder = document.createElement('div');
  adder.className = 'step-adder';
  adder.id = `step-adder-${ti}`;
  adder.innerHTML = `
    <textarea class="step-adder-text" id="stepText-${ti}" placeholder="Describe this step…" rows="2"></textarea>
    <label class="step-img-label">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Add Image
      <input type="file" accept="image/*" class="hidden" onchange="taskStepImgChange(${ti}, this)">
    </label>
    <img id="stepPrev-${ti}" class="step-prev hidden" src="" alt="preview">
    <div class="step-adder-btns">
      <button class="act-btn act-primary" onclick="confirmAddStep(${ti})">Add Step</button>
      <button class="act-btn" onclick="document.getElementById('step-adder-${ti}').remove(); delete _stepImg[${ti}]">Cancel</button>
    </div>
  `;
  card.appendChild(adder);
}

function confirmAddStep(ti) {
  const textEl = document.getElementById(`stepText-${ti}`);
  const text = textEl ? textEl.value.trim() : '';
  if (!text) { showToast('Write a description for this step', '⚠️'); return; }
  tasks[ti].steps.push({ text, imgData: _stepImg[ti] || null });
  delete _stepImg[ti];
  saveTasks();
  renderTasks();
  showToast('Step added!', '✅');
}

function deleteStep(ti, si) {
  tasks[ti].steps.splice(si, 1);
  saveTasks();
  renderTasks();
}

// Init
renderTasks();
