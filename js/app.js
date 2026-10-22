// Dehnen – Stretching-PWA. Reines JavaScript, kein Build-Schritt nötig.

const SETTINGS_KEY = 'stretch.settings.v1';
const HISTORY_KEY = 'stretch.history.v1';
const WEEKLY_GOAL = 3;
const RING_LENGTH = 2 * Math.PI * 140;

const DEFAULTS = {
  duration: 30,   // Sekunden pro Übung
  rest: 10,       // Sekunden Pause
  sound: true,
  vibrate: true,
  variant: 'man', // Bildvariante, siehe data/exercises.json
  order: [],      // Übungs-IDs in gewählter Reihenfolge
  enabled: {},    // id -> true/false (fehlt: defaultEnabled der Übung)
  reminders: null // reserviert für spätere Push-Benachrichtigungen
};

const $ = (id) => document.getElementById(id);

let data = { variants: {}, exercises: [] };
let settings = loadSettings();

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return { ...DEFAULTS }; }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* z. B. privater Modus */ }
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function addHistory() {
  const h = loadHistory();
  h.push(new Date().toISOString());
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-200))); } catch { /* ignorieren */ }
}

/* ---------- Übungsdaten ---------- */

function orderedExercises() {
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const ids = settings.order.filter((id) => byId.has(id));
  for (const e of data.exercises) if (!ids.includes(e.id)) ids.push(e.id);
  return ids.map((id) => byId.get(id));
}
function isEnabled(ex) {
  return ex.id in settings.enabled ? settings.enabled[ex.id] : ex.defaultEnabled !== false;
}
function planExercises() { return orderedExercises().filter(isEnabled); }
function imageFor(ex) {
  return ex.images[settings.variant] || ex.images.man || Object.values(ex.images)[0];
}

function buildSegments() {
  const plan = planExercises();
  const segs = [];
  if (!plan.length) return segs;
  segs.push({ type: 'prep', ex: plan[0], dur: Math.max(settings.rest, 5) });
  plan.forEach((ex, i) => {
    const sides = ex.perSide ? 2 : 1;
    const dur = ex.perSide ? Math.max(5, Math.round(settings.duration / 2)) : settings.duration;
    for (let s = 0; s < sides; s++) segs.push({ type: 'work', ex, idx: i, side: s, sides, dur });
    if (i < plan.length - 1 && settings.rest > 0) segs.push({ type: 'rest', ex: plan[i + 1], dur: settings.rest });
  });
  return segs;
}
function totalSeconds(segs) { return segs.reduce((n, s) => n + s.dur, 0); }
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/* ---------- Navigation ---------- */

function showView(name) {
  for (const v of ['home', 'exercises', 'settings']) $('view-' + v).hidden = v !== name;
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  window.scrollTo(0, 0);
}
document.querySelectorAll('#tabbar button').forEach((b) => b.addEventListener('click', () => {
  showView(b.dataset.view);
}));

/* ---------- Start-Seite ---------- */

function renderHome() {
  const segs = buildSegments();
  const plan = planExercises();
  $('home-count').textContent = plan.length;
  $('home-minutes').textContent = segs.length ? '≈ ' + Math.round(totalSeconds(segs) / 60) : '–';
  $('btn-start').disabled = !plan.length;

  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const done = loadHistory().filter((d) => new Date(d) >= monday).length;
  const dots = Math.max(WEEKLY_GOAL, done);
  $('week-dots').innerHTML = Array.from({ length: dots }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
  $('week-text').textContent = done >= WEEKLY_GOAL
    ? `Wochenziel erreicht – ${done} Trainings. Stark!`
    : `${done} von ${WEEKLY_GOAL} Trainings geschafft.`;
}

/* ---------- Übungsliste ---------- */

function renderExercises() {
  const list = orderedExercises();
  const ul = $('exercise-list');
  ul.innerHTML = '';
  list.forEach((ex, i) => {
    const li = document.createElement('li');
    li.className = isEnabled(ex) ? '' : 'off';
    li.innerHTML = `
      <input type="checkbox" aria-label="${ex.name} im Programm" ${isEnabled(ex) ? 'checked' : ''}>
      <img src="${imageFor(ex)}" alt="" loading="lazy">
      <button class="name"><b></b><small></small></button>
      <button class="mv up" aria-label="Nach oben" ${i === 0 ? 'disabled' : ''}>▲</button>
      <button class="mv down" aria-label="Nach unten" ${i === list.length - 1 ? 'disabled' : ''}>▼</button>`;
    li.querySelector('b').textContent = ex.name;
    li.querySelector('small').textContent = ex.category + (ex.perSide ? ' · beidseitig' : '');
    li.querySelector('input').addEventListener('change', (e) => {
      settings.enabled[ex.id] = e.target.checked;
      saveSettings(); renderExercises(); renderHome();
    });
    li.querySelector('.name').addEventListener('click', () => openDetail(ex));
    li.querySelector('.up').addEventListener('click', () => move(i, -1));
    li.querySelector('.down').addEventListener('click', () => move(i, 1));
    ul.appendChild(li);
  });
}
function move(i, d) {
  const ids = orderedExercises().map((e) => e.id);
  [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
  settings.order = ids;
  saveSettings(); renderExercises();
}
$('btn-reset-order').addEventListener('click', () => {
  settings.order = []; settings.enabled = {};
  saveSettings(); renderExercises(); renderHome();
});

function openDetail(ex) {
  $('detail-img').src = imageFor(ex);
  $('detail-name').textContent = ex.name;
  $('detail-desc').textContent = ex.description;
  $('detail-steps').innerHTML = '';
  for (const s of ex.steps) { const li = document.createElement('li'); li.textContent = s; $('detail-steps').appendChild(li); }
  $('detail').showModal();
}

/* ---------- Einstellungen ---------- */

function renderSettings() {
  document.querySelectorAll('.stepper').forEach((st) => {
    st.querySelector('output').textContent = settings[st.dataset.key] + st.dataset.unit;
  });
  $('set-sound').checked = settings.sound;
  $('set-vibrate').checked = settings.vibrate;
  const variants = Object.entries(data.variants);
  $('row-variant').hidden = variants.length < 2;
  $('set-variant').innerHTML = variants.map(([k, label]) => `<option value="${k}">${label}</option>`).join('');
  $('set-variant').value = settings.variant;
}
document.querySelectorAll('.stepper').forEach((st) => {
  st.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const min = +st.dataset.min, max = +st.dataset.max, step = +st.dataset.step;
    settings[st.dataset.key] = Math.min(max, Math.max(min, settings[st.dataset.key] + step * +b.dataset.d));
    saveSettings(); renderSettings(); renderHome();
  });
});
$('set-sound').addEventListener('change', (e) => { settings.sound = e.target.checked; saveSettings(); });
$('set-vibrate').addEventListener('change', (e) => { settings.vibrate = e.target.checked; saveSettings(); });
$('set-variant').addEventListener('change', (e) => { settings.variant = e.target.value; saveSettings(); renderExercises(); });
$('btn-reset-settings').addEventListener('click', () => {
  settings = { ...DEFAULTS, order: settings.order, enabled: settings.enabled };
  saveSettings(); renderSettings(); renderHome();
});

/* ---------- Ton & Wake Lock ---------- */

let audioCtx = null;
function unlockAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { audioCtx = null; }
}
function beep(freq, dur = 0.15, delay = 0, vol = 0.35) {
  if (!settings.sound || !audioCtx) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}
function buzz(ms) {
  if (settings.vibrate && navigator.vibrate) navigator.vibrate(ms);
}
const cue = {
  tick: () => beep(660, 0.1),
  work: () => { beep(880, 0.15); beep(1175, 0.25, 0.18); buzz([120, 60, 120]); },
  side: () => { beep(784, 0.15); beep(784, 0.15, 0.2); buzz([100, 60, 100]); },
  rest: () => { beep(440, 0.4); buzz(300); },
  finish: () => { beep(660, 0.18); beep(880, 0.18, 0.2); beep(1175, 0.4, 0.4); buzz([200, 80, 200, 80, 400]); }
};

let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { wakeLock = null; }
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch { /* ignorieren */ }
  wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session && !session.paused) requestWakeLock();
});

/* ---------- Training ---------- */

let session = null; // { segs, i, startTs, elapsedAtPause, paused, lastTick, timer }

function startTraining() {
  const segs = buildSegments();
  if (!segs.length) return;
  unlockAudio();
  requestWakeLock();
  session = { segs, i: 0, startTs: performance.now(), elapsedAtPause: 0, paused: false, lastTick: null, timer: null };
  document.body.classList.add('training-on');
  $('view-training').hidden = false;
  enterSegment(false);
  session.timer = setInterval(tick, 100);
  tick();
}

function stopTraining() {
  if (!session) return;
  clearInterval(session.timer);
  session = null;
  releaseWakeLock();
  $('view-training').hidden = true;
  document.body.classList.remove('training-on');
}

function enterSegment(playCue = true) {
  const seg = session.segs[session.i];
  session.lastTick = null;
  const tr = $('view-training');
  tr.classList.toggle('work', seg.type === 'work');
  tr.classList.toggle('rest', seg.type !== 'work');

  $('t-img').src = imageFor(seg.ex);
  $('t-name').textContent = seg.ex.name;
  $('t-phase').textContent = seg.type === 'prep' ? 'Mach dich bereit'
    : seg.type === 'rest' ? 'Pause – gleich geht es weiter'
    : seg.sides > 1 ? `Seite ${seg.side + 1} von 2` : 'Dehnen';
  $('t-index').textContent = `Übung ${seg.type === 'work' ? seg.idx + 1 : seg.type === 'rest' ? session.segs.find((s, k) => k > session.i && s.type === 'work').idx + 1 : 1} / ${planExercises().length}`;
  renderNext(seg);

  if (playCue) {
    if (seg.type === 'work') (seg.side > 0 ? cue.side : cue.work)();
    else if (seg.type === 'rest') cue.rest();
  } else if (seg.type === 'prep') {
    beep(523, 0.2);
  }
}

function renderNext(seg) {
  const el = $('t-next');
  el.innerHTML = '';
  const addExercise = (label, ex) => {
    el.innerHTML = `<img alt="" src="${imageFor(ex)}"><div><span>${label}</span><b></b></div>`;
    el.querySelector('b').textContent = ex.name;
  };
  if (seg.type === 'work') {
    if (seg.sides > 1 && seg.side === 0) {
      el.innerHTML = '<div><span>Danach</span><b>Seite wechseln</b></div>';
      return;
    }
    const nextWork = session.segs.slice(session.i + 1).find((s) => s.type === 'work');
    if (nextWork) addExercise('Als Nächstes', nextWork.ex);
    else el.innerHTML = '<div><b>Letzte Übung – gleich geschafft!</b></div>';
  } else {
    el.innerHTML = '<div class="tip"></div>';
    el.firstChild.textContent = seg.ex.description;
  }
}

function currentElapsedMs() {
  return session.paused ? session.elapsedAtPause : performance.now() - session.startTs;
}

function tick() {
  if (!session || session.paused) return;
  let seg = session.segs[session.i];
  let elapsed = currentElapsedMs();
  while (elapsed >= seg.dur * 1000) {
    if (session.i >= session.segs.length - 1) { finishTraining(); return; }
    session.startTs += seg.dur * 1000;
    session.i++;
    enterSegment();
    seg = session.segs[session.i];
    elapsed = currentElapsedMs();
  }
  const left = Math.ceil((seg.dur * 1000 - elapsed) / 1000);
  if (left !== session.lastTick) {
    if (session.lastTick !== null && left <= 3 && left >= 1) cue.tick();
    session.lastTick = left;
    $('t-time').textContent = left;
    renderTotals(elapsed);
  }
  $('ring').style.strokeDashoffset = String(RING_LENGTH * (elapsed / (seg.dur * 1000)));
}

function renderTotals(elapsed) {
  const { segs, i } = session;
  const total = totalSeconds(segs);
  const before = segs.slice(0, i).reduce((n, s) => n + s.dur, 0);
  const done = before + elapsed / 1000;
  $('t-remaining').textContent = 'Noch ' + fmt(total - done);
  $('t-bar-fill').style.width = (100 * done / total) + '%';
}

function setPaused(p) {
  if (!session || session.paused === p) return;
  if (p) {
    session.elapsedAtPause = performance.now() - session.startTs;
    session.paused = true;
    releaseWakeLock();
  } else {
    session.startTs = performance.now() - session.elapsedAtPause;
    session.paused = false;
    unlockAudio();
    requestWakeLock();
  }
  $('t-toggle').textContent = p ? '▶' : '⏸';
  $('t-toggle').setAttribute('aria-label', p ? 'Fortsetzen' : 'Pause');
}

function jumpTo(i) {
  session.i = Math.max(0, Math.min(session.segs.length - 1, i));
  session.startTs = performance.now();
  session.elapsedAtPause = 0;
  enterSegment();
  tick();
}

function finishTraining() {
  const total = totalSeconds(session.segs);
  const count = planExercises().length;
  cue.finish();
  stopTraining();
  addHistory();
  $('done-text').textContent = `${count} Übungen in ca. ${Math.max(1, Math.round(total / 60))} Minuten – gut gemacht.`;
  $('view-done').hidden = false;
  renderHome();
}

$('btn-start').addEventListener('click', startTraining);
$('t-toggle').addEventListener('click', () => setPaused(!session.paused));
$('t-skip').addEventListener('click', () => {
  if (session.paused) setPaused(false);
  if (session.i >= session.segs.length - 1) return finishTraining();
  jumpTo(session.i + 1);
});
$('t-prev').addEventListener('click', () => {
  if (session.paused) setPaused(false);
  const seg = session.segs[session.i];
  if (seg.type === 'work' && currentElapsedMs() > 2000) return jumpTo(session.i);
  let k = session.i - 1;
  while (k > 0 && session.segs[k].type !== 'work') k--;
  jumpTo(k);
});
$('t-stop').addEventListener('click', () => {
  const wasPaused = session.paused;
  setPaused(true);
  if (confirm('Training wirklich beenden?')) stopTraining();
  else if (!wasPaused) setPaused(false);
});
$('done-close').addEventListener('click', () => { $('view-done').hidden = true; showView('home'); });

/* ---------- Start ---------- */

async function init() {
  try {
    data = await (await fetch('data/exercises.json')).json();
  } catch {
    $('view-home').insertAdjacentHTML('afterbegin', '<p class="card">Übungsdaten konnten nicht geladen werden.</p>');
    return;
  }
  if (!data.variants[settings.variant]) settings.variant = 'man';
  renderHome(); renderExercises(); renderSettings();
  showView('home');

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      $('app-version').textContent = 'Offline verfügbar ✓';
    } catch { /* ohne Service Worker (z. B. file://) läuft die App nur online */ }
  }
}
init();
