// Zentrale Datenhaltung: Übungs-Bibliothek, Programme, Verlauf, Einstellungen.
// Alles liegt im localStorage; Fotos eigener Übungen separat unter stretch.img.<id>.

import { lang, t } from './i18n.js';

const KEY = 'stretch.v2';
const IMG_PREFIX = 'stretch.img.';

export const DEFAULT_SETTINGS = {
  sound: true,
  volume: 0.7,
  countdown: true,
  voice: true,
  vibrate: true,
  keepAwake: true,
  prep: 10,
  weeklyGoal: 3,          // = Anzahl der Trainingstage (remindDays)
  remindOn: false,        // Push-Erinnerung eingeschaltet
  remindDays: [0, 2, 4],  // Trainingstage, Mo = 0 … So = 6
  remindTime: '18:00',    // Uhrzeit der Erinnerung
  lang: 'auto',           // 'auto' | 'de' | 'en' | 'ar'
  theme: 'auto',
  accent: 'blue',
  variant: 'man'
};

let base = { variants: {}, exercises: [] };
let state = null;
const imgs = new Map();
const listeners = new Set();

export const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

function parse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export async function init() {
  base = await (await fetch('data/exercises.json')).json();
  const s = parse(KEY, {});
  const v1 = parse('stretch.settings.v1', null);
  state = {
    settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    custom: s.custom || [],
    edits: s.edits || {},
    hidden: s.hidden || [],
    favorites: s.favorites || [],
    workouts: s.workouts || null,
    activeWorkout: s.activeWorkout || null,
    history: s.history || []
  };
  if (!s.settings && v1) {
    state.settings.sound = v1.sound ?? true;
    state.settings.vibrate = v1.vibrate ?? true;
  }
  if (!s.history) {
    state.history = parse('stretch.history.v1', []).map((t) => ({ t, name: 'Training', seconds: 600, count: 15 }));
  }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(IMG_PREFIX)) imgs.set(k.slice(IMG_PREFIX.length), localStorage.getItem(k));
  }
  if (!state.workouts) state.workouts = defaultWorkouts(v1?.duration ?? 30, v1?.rest ?? 10);
  // Mitgelieferte Programme behalten ihren Namen nur, solange er nicht geändert wurde (dann wird er übersetzt).
  const GERMAN_DEFAULT = { 'w-rueken': 'Rücken-Programm', 'w-buero': 'Büro-Kurzpause', 'w-beine': 'Beine & Hüfte' };
  for (const w of state.workouts) if (w.nameKey === undefined) w.nameKey = GERMAN_DEFAULT[w.id] === w.name ? w.id : null;
  if (!state.workouts.some((w) => w.id === state.activeWorkout)) state.activeWorkout = state.workouts[0]?.id ?? null;
  if (!(s.settings && s.settings.remindDays)) state.settings.remindDays = spreadDays(state.settings.weeklyGoal);
  state.settings.weeklyGoal = state.settings.remindDays.length;
  if (!base.variants[state.settings.variant]) {
    // Frühere Version hatte eine weibliche Variante (rosa); sie wurde entfernt.
    if (state.settings.variant === 'woman' && state.settings.accent === 'pink') state.settings.accent = 'blue';
    state.settings.variant = 'man';
  }
  save();
}

function defaultWorkouts(duration, rest) {
  const mk = (id, name, ids) => ({ id, name, nameKey: id, duration, rest, items: ids.map((x) => ({ id: x, duration: null })) });
  const main = base.exercises.filter((e) => e.defaultEnabled !== false).map((e) => e.id);
  return [
    mk('w-rueken', 'Rücken-Programm', main),
    mk('w-buero', 'Büro-Kurzpause', ['nacken-dehnen', 'schulterkreisen', 'schulter-stretch', 'brustoeffnung', 'rumpfdrehung', 'seitbeuge']),
    mk('w-beine', 'Beine & Hüfte', ['hueftbeuger-dehnung', 'oberschenkelvorderseite', 'wadendehnung', 'schmetterlingssitz', 'vorwaertsbeuge', 'herabschauender-hund', 'kindspose'])
  ];
}

export function onChange(fn) { listeners.add(fn); }
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Speicher voll / privater Modus */ }
}
function commit() { save(); listeners.forEach((fn) => fn()); }

export const settings = () => state.settings;

// Anzeigename eines Programms: mitgelieferte, unveränderte Programme werden übersetzt.
export const wname = (w) => (w.nameKey ? t('wk.' + w.nameKey) : w.name);

// Gleichmäßig über die Woche verteilte Trainingstage (Mo = 0).
const SPREAD = { 1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
export const spreadDays = (n) => SPREAD[Math.min(7, Math.max(1, n))];
export function setTrainingDays(days) {
  const d = [...new Set(days)].sort();
  if (!d.length) return;
  Object.assign(state.settings, { remindDays: d, weeklyGoal: d.length });
  commit();
}
export function updateSettings(patch) { Object.assign(state.settings, patch); commit(); }
export const variants = () => base.variants;

/* ---------- Übungen ---------- */

function imageOf(e) {
  if (imgs.has(e.id)) return imgs.get(e.id);
  if (e.images) return e.images[state.settings.variant] || e.images.man || Object.values(e.images)[0];
  return null;
}
function decorate(e) {
  e.favorite = state.favorites.includes(e.id);
  e.image = imageOf(e);
  e.ownImage = imgs.has(e.id);
  e.edited = e.builtin && !!state.edits[e.id];
  return e;
}
export function allExercises({ includeHidden = false } = {}) {
  const out = [];
  for (const b of base.exercises) {
    if (!includeHidden && state.hidden.includes(b.id)) continue;
    out.push(decorate({ ...b, ...(b.i18n?.[lang()] || {}), ...(state.edits[b.id] || {}), builtin: true }));
  }
  for (const c of state.custom) out.push(decorate({ ...c, builtin: false }));
  return out;
}
export const getExercise = (id) => allExercises({ includeHidden: true }).find((e) => e.id === id) || null;
export const hiddenExercises = () => allExercises({ includeHidden: true }).filter((e) => state.hidden.includes(e.id));
export function categories() {
  const set = new Set(allExercises().map((e) => e.category).filter(Boolean));
  const order = ['Nacken', 'Schultern', 'Arme', 'Rücken', 'Hüfte', 'Beine', 'Ganzkörper', 'Entspannung'];
  return [...order.filter((c) => set.has(c)), ...[...set].filter((c) => !order.includes(c)).sort()];
}
export function allCategories() {
  const order = ['Nacken', 'Schultern', 'Arme', 'Rücken', 'Hüfte', 'Beine', 'Ganzkörper', 'Entspannung'];
  return [...new Set([...order, ...categories()])];
}

export function saveExercise(ex, imageDataUrl) {
  // ex: { id?, name, category, description, steps[], perSide, duration|null }
  const fields = { name: ex.name, category: ex.category, description: ex.description, steps: ex.steps, perSide: ex.perSide, duration: ex.duration || null };
  let id = ex.id;
  if (id && base.exercises.some((b) => b.id === id)) {
    state.edits[id] = fields;
  } else if (id) {
    Object.assign(state.custom.find((c) => c.id === id), fields);
  } else {
    id = 'c-' + newId();
    state.custom.push({ id, ...fields });
  }
  if (imageDataUrl === null) removeImage(id, false);
  else if (imageDataUrl) setImage(id, imageDataUrl);
  commit();
  return id;
}
function setImage(id, dataUrl) {
  imgs.set(id, dataUrl);
  try { localStorage.setItem(IMG_PREFIX + id, dataUrl); } catch { throw new Error('data.storageFull'); }
}
function removeImage(id, doCommit = true) {
  imgs.delete(id);
  try { localStorage.removeItem(IMG_PREFIX + id); } catch { /* ignorieren */ }
  if (doCommit) commit();
}
export function resetEdits(id) { delete state.edits[id]; removeImage(id, false); commit(); }

export function deleteExercise(id) {
  if (base.exercises.some((b) => b.id === id)) {
    if (!state.hidden.includes(id)) state.hidden.push(id);
  } else {
    state.custom = state.custom.filter((c) => c.id !== id);
    removeImage(id, false);
    state.workouts.forEach((w) => { w.items = w.items.filter((it) => it.id !== id); });
  }
  state.favorites = state.favorites.filter((f) => f !== id);
  commit();
}
export function restoreExercise(id) { state.hidden = state.hidden.filter((h) => h !== id); commit(); }
export function toggleFavorite(id) {
  state.favorites = state.favorites.includes(id) ? state.favorites.filter((f) => f !== id) : [...state.favorites, id];
  commit();
}

/* ---------- Programme ---------- */

export const workouts = () => state.workouts;
export const getWorkout = (id) => state.workouts.find((w) => w.id === id) || null;
export const activeWorkout = () => getWorkout(state.activeWorkout) || state.workouts[0] || null;
export function setActiveWorkout(id) { state.activeWorkout = id; commit(); }
export function saveWorkout(w) {
  const i = state.workouts.findIndex((x) => x.id === w.id);
  if (i >= 0) state.workouts[i] = w; else state.workouts.push(w);
  state.activeWorkout = w.id;
  commit();
}
export function deleteWorkout(id) {
  state.workouts = state.workouts.filter((w) => w.id !== id);
  if (state.activeWorkout === id) state.activeWorkout = state.workouts[0]?.id ?? null;
  commit();
}
export function duplicateWorkout(id) {
  const w = structuredClone(getWorkout(id));
  w.id = newId(); w.name = wname(w) + ' (2)'; w.nameKey = null;
  state.workouts.push(w);
  commit();
  return w;
}
export function newWorkout() {
  return { id: newId(), name: t('editor.new'), nameKey: null, duration: 30, rest: 10, items: [] };
}

export function resolveItems(w) {
  const out = [];
  for (const it of w.items) {
    const ex = getExercise(it.id);
    if (!ex || state.hidden.includes(ex.id)) continue;
    out.push({ ex, duration: it.duration || ex.duration || w.duration, custom: !!it.duration });
  }
  return out;
}

export function buildSegments(w) {
  const items = resolveItems(w);
  if (!items.length) return [];
  const S = state.settings;
  const segs = [{ type: 'prep', ex: items[0].ex, dur: S.prep }];
  items.forEach((it, i) => {
    const sides = it.ex.perSide ? 2 : 1;
    // Zwei Seiten: Die Übungszeit wird auf links und rechts verteilt.
    const dur = sides === 2 ? Math.max(5, Math.round(it.duration / 2)) : it.duration;
    for (let s = 0; s < sides; s++) segs.push({ type: 'work', ex: it.ex, idx: i, count: items.length, side: s, sides, dur });
    if (i < items.length - 1 && w.rest > 0) segs.push({ type: 'rest', ex: items[i + 1].ex, idx: i + 1, count: items.length, dur: w.rest });
  });
  return segs;
}
export const totalSeconds = (segs) => segs.reduce((n, s) => n + s.dur, 0);
export const workoutSeconds = (w) => totalSeconds(buildSegments(w));

/* ---------- Verlauf & Statistik ---------- */

export function addHistory(entry) {
  state.history.push({ t: new Date().toISOString(), ...entry });
  state.history = state.history.slice(-500);
  commit();
}
export const history = () => state.history;

// Wochenbeginn: Montag; auf Arabisch Samstag (so üblich in der arabischen Welt).
const weekStartDay = () => (lang() === 'ar' ? 6 : 1);
// Anzeige-Reihenfolge der Wochentage (Index Mo = 0 … So = 6)
export const weekOrder = () => (lang() === 'ar' ? [5, 6, 0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6]);
export function startOfWeek(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() - weekStartDay() + 7) % 7));
}
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function weekInfo() {
  const mon = startOfWeek();
  const done = new Set(state.history.map((h) => new Date(h.t)).filter((d) => d >= mon).map(dayKey));
  const todayKey = dayKey(new Date());
  const days = weekOrder().map((i, pos) => {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + pos);
    return { label: t('day.' + i), done: done.has(dayKey(d)), today: dayKey(d) === todayKey };
  });
  const count = state.history.filter((h) => new Date(h.t) >= mon).length;
  return { days, count, goal: state.settings.weeklyGoal };
}

// Wochen in Folge, in denen das Wochenziel erreicht wurde (laufende Woche zählt mit, sobald erreicht).
export function streakWeeks() {
  const goal = state.settings.weeklyGoal;
  const perWeek = new Map();
  for (const h of state.history) {
    const k = startOfWeek(new Date(h.t)).getTime();
    perWeek.set(k, (perWeek.get(k) || 0) + 1);
  }
  let w = startOfWeek();
  if ((perWeek.get(w.getTime()) || 0) < goal) w = new Date(w.getFullYear(), w.getMonth(), w.getDate() - 7);
  let n = 0;
  while ((perWeek.get(w.getTime()) || 0) >= goal) { n++; w = new Date(w.getFullYear(), w.getMonth(), w.getDate() - 7); }
  return n;
}
export function totals() {
  return { sessions: state.history.length, minutes: Math.round(state.history.reduce((n, h) => n + (h.seconds || 0), 0) / 60) };
}

/* ---------- Backup ---------- */

export function exportData() {
  const images = {};
  imgs.forEach((v, k) => { images[k] = v; });
  return JSON.stringify({ app: 'stretching', version: 2, state, images }, null, 1);
}
export function importData(text) {
  const d = JSON.parse(text);
  if (d.app !== 'stretching' || !d.state) throw new Error('data.notBackup');
  imgs.forEach((_, k) => localStorage.removeItem(IMG_PREFIX + k));
  imgs.clear();
  state = { ...state, ...d.state, settings: { ...DEFAULT_SETTINGS, ...(d.state.settings || {}) } };
  for (const [k, v] of Object.entries(d.images || {})) { imgs.set(k, v); try { localStorage.setItem(IMG_PREFIX + k, v); } catch { /* voll */ } }
  commit();
}
export function resetAll() {
  imgs.forEach((_, k) => localStorage.removeItem(IMG_PREFIX + k));
  imgs.clear();
  state = { ...state, settings: { ...DEFAULT_SETTINGS }, custom: [], edits: {}, hidden: [], favorites: [], history: [], workouts: defaultWorkouts(30, 10) };
  state.activeWorkout = state.workouts[0].id;
  commit();
}
