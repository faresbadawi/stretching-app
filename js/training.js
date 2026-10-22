// Trainingsablauf: Timer, Phasen (Bereit / Dehnen / Pause), Anzeige, Signale.
import { buildSegments, totalSeconds, settings, addHistory, weekInfo } from './store.js';
import * as snd from './sound.js';
import { $, h, icon, thumb, fmtTime, openSheet, confirmDialog, confetti } from './ui.js';
import { exerciseDetail } from './views.js';

const RING = 2 * Math.PI * 136;
let s = null; // laufende Sitzung

const setIcon = (el, name) => el.replaceChildren(icon(name));

export function initTraining() {
  setIcon($('t-stop'), 'close');
  setIcon($('t-info'), 'info');
  setIcon($('t-prev'), 'prev');
  setIcon($('t-skip'), 'next');
  setIcon($('t-toggle'), 'pause');
  $('done-icon').replaceChildren(icon('trophy'));

  $('t-toggle').addEventListener('click', () => setPaused(!s.paused));
  $('t-skip').addEventListener('click', () => {
    if (s.paused) setPaused(false);
    if (s.i >= s.segs.length - 1) return finish();
    jumpTo(s.i + 1);
  });
  $('t-prev').addEventListener('click', () => {
    if (s.paused) setPaused(false);
    if (s.segs[s.i].type === 'work' && elapsed() > 2000) return jumpTo(s.i);
    let k = s.i - 1;
    while (k > 0 && s.segs[k].type !== 'work') k--;
    jumpTo(k);
  });
  $('t-stop').addEventListener('click', async () => {
    const wasPaused = s.paused;
    setPaused(true);
    const ok = await confirmDialog('Das Training wird nicht gezählt.', { ok: 'Beenden', title: 'Training beenden?' });
    if (ok) stop(); else if (!wasPaused && s) setPaused(false);
  });
  $('t-info').addEventListener('click', () => {
    if (!s) return;
    const wasPaused = s.paused;
    setPaused(true);
    exerciseDetail(s.segs[s.i].ex, { readOnly: true, onClose: () => { if (!wasPaused && s) setPaused(false); } });
  });
  $('done-close').addEventListener('click', () => {
    $('done').hidden = true;
    document.dispatchEvent(new CustomEvent('training-closed'));
  });

  document.addEventListener('visibilitychange', () => {
    if (!s) return;
    if (document.hidden) setPaused(true);
    else if (!s.paused) requestWakeLock();
  });
  document.addEventListener('keydown', (e) => {
    if (!s || document.querySelector('dialog[open]')) return;
    if (e.code === 'Space') { e.preventDefault(); setPaused(!s.paused); }
    else if (e.code === 'ArrowRight') $('t-skip').click();
    else if (e.code === 'ArrowLeft') $('t-prev').click();
  });
}

/* ---------- Wake Lock ---------- */

let wakeLock = null;
async function requestWakeLock() {
  if (!settings().keepAwake) return;
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

/* ---------- Ablauf ---------- */

export function startTraining(workout) {
  const segs = buildSegments(workout);
  if (!segs.length) return;
  snd.unlock();
  requestWakeLock();
  const count = segs.filter((x) => x.type === 'work' && x.side === 0).length;
  s = { w: workout, segs, count, i: 0, startTs: performance.now(), elapsedAtPause: 0, paused: false, lastLeft: null, timer: null, total: totalSeconds(segs) };
  $('t-progress').replaceChildren(...Array.from({ length: count }, () => h('i')));
  document.body.classList.add('busy');
  const tr = $('training');
  tr.hidden = false;
  tr.classList.remove('paused');
  setIcon($('t-toggle'), 'pause');
  enter(false);
  s.timer = setInterval(tick, 100);
  tick();
}

function stop() {
  if (!s) return;
  clearInterval(s.timer);
  s = null;
  snd.stopSpeech();
  releaseWakeLock();
  $('training').hidden = true;
  document.body.classList.remove('busy');
}

const elapsed = () => (s.paused ? s.elapsedAtPause : performance.now() - s.startTs);

function enter(playCue = true) {
  const seg = s.segs[s.i];
  s.lastLeft = null;
  const tr = $('training');
  tr.classList.remove('work', 'rest', 'prep');
  tr.classList.add(seg.type);

  const ex = seg.ex;
  const card = $('t-card');
  card.classList.remove('swap');
  void card.offsetWidth;
  card.classList.add('swap');
  const img = $('t-img');
  img.hidden = !ex.image;
  if (ex.image) img.src = ex.image;
  $('t-ph').hidden = !!ex.image;
  $('t-ph').replaceChildren(icon('figure'));
  $('t-name').textContent = ex.name;
  $('t-cat').textContent = ex.category || '';
  $('t-badge').textContent = seg.type === 'work' ? '' : seg.type === 'prep' ? 'Erste Übung' : 'Als Nächstes';
  card.classList.toggle('dim', seg.type !== 'work');

  $('t-phase').textContent = seg.type === 'prep' ? 'Bereit?' : seg.type === 'rest' ? 'Pause' : seg.sides > 1 ? `Seite ${seg.side + 1} von 2` : 'Dehnen';
  const n = seg.type === 'prep' ? 1 : seg.idx + 1;
  $('t-sub').textContent = `Übung ${n} von ${s.count}`;
  $('circle').classList.toggle('breathe', seg.type === 'rest');

  const bars = $('t-progress').children;
  const cur = seg.type === 'prep' ? 0 : seg.idx;
  [...bars].forEach((b, k) => { b.className = k < cur ? 'done' : k === cur ? 'cur' : ''; });

  renderNext(seg);

  if (seg.type === 'prep') {
    snd.cue.prep();
    snd.speak(ex.nameEn ? `Get ready. First: ${ex.nameEn}.` : 'Get ready.', 350);
  } else if (playCue) {
    if (seg.type === 'work') {
      if (seg.side > 0) { snd.cue.side(); snd.speak('Switch sides.', 500); } else snd.cue.start();
    } else {
      snd.cue.rest();
      snd.speak(ex.nameEn ? `Rest. Next: ${ex.nameEn}.` : 'Rest.', 600);
    }
  }
}

function renderNext(seg) {
  const el = $('t-next');
  if (seg.type !== 'work') {
    el.replaceChildren(h('div', { class: 'tip' }, seg.ex.description || 'Atme ruhig und lockere dich.'));
    return;
  }
  if (seg.sides > 1 && seg.side === 0) {
    el.replaceChildren(h('div', { class: 'nx' }, h('div', {}, h('small', {}, 'Danach'), h('b', {}, 'Seite wechseln'))));
    return;
  }
  const next = s.segs.slice(s.i + 1).find((x) => x.type === 'work');
  el.replaceChildren(next
    ? h('div', { class: 'nx' }, thumb(next.ex), h('div', {}, h('small', {}, 'Als Nächstes'), h('b', {}, next.ex.name)))
    : h('div', { class: 'nx' }, h('div', {}, h('small', {}, 'Fast geschafft'), h('b', {}, 'Letzte Übung'))));
}

function tick() {
  if (!s || s.paused) return;
  let seg = s.segs[s.i];
  let el = elapsed();
  while (el >= seg.dur * 1000) {
    if (s.i >= s.segs.length - 1) { finish(); return; }
    s.startTs += seg.dur * 1000;
    s.i++;
    enter();
    seg = s.segs[s.i];
    el = elapsed();
  }
  const left = Math.ceil((seg.dur * 1000 - el) / 1000);
  if (left !== s.lastLeft) {
    const first = s.lastLeft === null;
    s.lastLeft = left;
    const t = $('t-time');
    t.textContent = left >= 100 ? fmtTime(left) : left;
    if (left <= 3 && left >= 1) {
      if (!first) snd.cue.tick(left);
      t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse');
    }
    renderTotals(el);
  }
  $('ring').style.strokeDashoffset = String(RING * (el / (seg.dur * 1000)));
}

function renderTotals(el) {
  const before = s.segs.slice(0, s.i).reduce((n, x) => n + x.dur, 0);
  $('t-remaining').textContent = 'Noch ' + fmtTime(s.total - before - el / 1000);
}

function setPaused(p) {
  if (!s || s.paused === p) return;
  if (p) {
    s.elapsedAtPause = performance.now() - s.startTs;
    s.paused = true;
    releaseWakeLock();
    snd.stopSpeech();
  } else {
    s.startTs = performance.now() - s.elapsedAtPause;
    s.paused = false;
    snd.unlock();
    requestWakeLock();
  }
  $('training').classList.toggle('paused', p);
  setIcon($('t-toggle'), p ? 'play' : 'pause');
  $('t-toggle').setAttribute('aria-label', p ? 'Fortsetzen' : 'Pause');
}

function jumpTo(i) {
  s.i = Math.max(0, Math.min(s.segs.length - 1, i));
  s.startTs = performance.now();
  s.elapsedAtPause = 0;
  enter();
  tick();
}

function finish() {
  const w = s.w;
  const seconds = s.total;
  const count = s.count;
  snd.cue.finish();
  snd.speak('Workout complete.', 1200);
  stop();
  addHistory({ workoutId: w.id, name: w.name, seconds, count });
  $('done-text').textContent = `${w.name}: ${count} Übungen in ca. ${Math.max(1, Math.round(seconds / 60))} Minuten.`;
  const info = weekInfo();
  $('done-week').replaceChildren(
    h('div', { class: 'week-days' }, info.days.map((d) => h('div', { class: 'day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') }, d.label, h('i', {}, icon('check'))))),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, (100 * info.count) / info.goal)}%` })),
    h('p', { class: 'small', style: 'margin:8px 0 0' }, `${info.count} von ${info.goal} Trainings diese Woche`));
  $('done').hidden = false;
  confetti();
}
