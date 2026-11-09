// Trainingsablauf: Timer, Phasen (Bereit / Dehnen / Pause), Anzeige, Signale.
import { buildSegments, totalSeconds, settings, addHistory, weekInfo, wname, streakWeeks } from './store.js';
import { t, catLabel } from './i18n.js';
import * as snd from './sound.js';
import { $, h, icon, fmtTime, confirmDialog, confetti } from './ui.js';
import { exerciseDetail, weekDays } from './views.js';
import { markTrained } from './notifications.js';

const RING = 2 * Math.PI * 136;
let s = null; // laufende Sitzung

const setIcon = (el, name) => el.replaceChildren(icon(name));

// Beschriftungen der Knöpfe (bei Sprachwechsel erneut aufrufen)
export function labelTraining() {
  $('t-stop').setAttribute('aria-label', t('aria.stop'));
  $('t-info').setAttribute('aria-label', t('aria.info'));
  $('t-prev').setAttribute('aria-label', t('aria.prev'));
  $('t-skip').setAttribute('aria-label', t('aria.next'));
  $('t-toggle').setAttribute('aria-label', t(s && s.paused ? 'aria.resume' : 'aria.pause'));
}

export function initTraining() {
  setIcon($('t-stop'), 'close');
  setIcon($('t-info'), 'info');
  setIcon($('t-prev'), 'prev');
  setIcon($('t-skip'), 'next');
  setIcon($('t-toggle'), 'pause');
  $('done-icon').replaceChildren(icon('trophy'));
  labelTraining();

  $('t-toggle').addEventListener('click', () => setPaused(!s.paused));
  $('circle').addEventListener('click', () => { if (s) setPaused(!s.paused); });
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
    const ok = await confirmDialog(t('stop.text'), { ok: t('stop.ok'), title: t('stop.title') });
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
    else if (e.code === 'ArrowRight') $(document.documentElement.dir === 'rtl' ? 't-prev' : 't-skip').click();
    else if (e.code === 'ArrowLeft') $(document.documentElement.dir === 'rtl' ? 't-skip' : 't-prev').click();
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
  snd.preloadVoice(['get-ready', 'rest', 'switch', 'complete']);
  const count = segs.filter((x) => x.type === 'work' && x.side === 0).length;
  s = { w: workout, segs, count, i: 0, startTs: performance.now(), elapsedAtPause: 0, paused: false, lastLeft: null, timer: null, total: totalSeconds(segs) };
  // Fortschrittsleiste: ein Abschnitt pro Übung (Vorbereitung und Pause zählen zur folgenden Übung)
  s.groupDur = Array(count).fill(0);
  let before = 0;
  for (const seg of segs) { seg.group = seg.type === 'prep' ? 0 : seg.idx; seg.before = before; before += seg.dur; s.groupDur[seg.group] += seg.dur; }
  s.groupStart = s.groupDur.map((_, g) => s.groupDur.slice(0, g).reduce((a, b) => a + b, 0));
  $('t-bar').replaceChildren(...s.groupDur.map(() => h('span', {}, h('i'))));
  s.bars = [...$('t-bar').querySelectorAll('i')];
  labelTraining();
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
  // Ring ohne Übergang zurücksetzen, sonst läuft er sichtbar rückwärts
  const ring = $('ring');
  ring.style.transition = 'none';
  ring.style.strokeDashoffset = '0';
  void ring.getBoundingClientRect();
  ring.style.transition = '';
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
  $('t-kicker').textContent = seg.type === 'work' ? (ex.category ? catLabel(ex.category) : '') : t(seg.type === 'prep' ? 'kicker.first' : 'kicker.next');
  card.classList.toggle('dim', seg.type !== 'work');

  $('t-phase').textContent = phaseLabel(seg);
  const n = seg.type === 'prep' ? 1 : seg.idx + 1;
  $('t-counter').textContent = t('tr.counter', { a: n, b: s.count });
  $('circle').classList.toggle('breathe', seg.type === 'rest');

  renderNext(seg);

  if (seg.type === 'prep') {
    snd.cue.prep();
    snd.say('get-ready', 350);
  } else if (playCue) {
    if (seg.type === 'work') {
      if (seg.side > 0) { snd.cue.side(); snd.say('switch', 500); } else snd.cue.start();
    } else {
      snd.cue.rest();
      snd.say('rest', 600);
    }
  }
}

const phaseLabel = (seg) => (seg.type === 'prep' ? t('phase.ready') : seg.type === 'rest' ? t('phase.rest') : seg.sides > 1 ? t('phase.side', { a: seg.side + 1 }) : t('phase.stretch'));

function renderNext(seg) {
  const el = $('t-next');
  if (seg.type !== 'work') {
    el.replaceChildren(h('span', {}, seg.ex.description || t('rest.tipFallback')));
    return;
  }
  if (seg.sides > 1 && seg.side === 0) {
    el.replaceChildren(h('span', {}, t('next.label') + ': ', h('b', {}, t('next.switch'))));
    return;
  }
  const next = s.segs.slice(s.i + 1).find((x) => x.type === 'work');
  el.replaceChildren(h('span', {}, next ? [t('next.label') + ': ', h('b', {}, next.ex.name)] : h('b', {}, t('next.last'))));
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
  const done = s.segs[s.i].before + el / 1000;
  $('t-remaining').textContent = t('tr.remaining', { t: fmtTime(s.total - done) });
  s.bars.forEach((bar, g) => {
    const part = Math.max(0, Math.min(1, (done - s.groupStart[g]) / s.groupDur[g]));
    bar.style.width = (100 * part) + '%';
  });
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
  $('t-phase').textContent = p ? t('tr.paused') : phaseLabel(s.segs[s.i]);
  setIcon($('t-toggle'), p ? 'play' : 'pause');
  labelTraining();
}

function jumpTo(i) {
  s.i = Math.max(0, Math.min(s.segs.length - 1, i));
  s.startTs = performance.now();
  s.elapsedAtPause = 0;
  enter();
  tick();
  renderTotals(elapsed());
}

function finish() {
  const w = s.w;
  const seconds = s.total;
  const count = s.count;
  snd.cue.finish();
  // Erst Applaus, dann nach ein paar Sekunden die Abschlussansage
  snd.say('complete', Math.round(snd.cue.finishSeconds * 1000) + 300);
  stop();
  addHistory({ workoutId: w.id, name: wname(w), nameKey: w.nameKey || null, seconds, count });
  markTrained();
  $('done-text').textContent = t('done.text', { name: wname(w), ex: t('exercises.n', { n: count }), m: Math.max(1, Math.round(seconds / 60)) });
  const info = weekInfo();
  const tile = (value, label) => h('div', {}, h('strong', {}, value), h('span', {}, label));
  $('done-stats').replaceChildren(
    tile(Math.max(1, Math.round(seconds / 60)), t('stat.minutes')),
    tile(count, t('stat.exercises')),
    tile(streakWeeks(), t('stat.streak')));
  $('done-week').replaceChildren(
    weekDays(info),
    h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(100, (100 * info.count) / info.goal)}%` })),
    h('p', { class: 'small', style: 'margin:8px 0 0' }, t('done.week', { a: info.count, b: info.goal })));
  $('done').hidden = false;
  confetti();
}
