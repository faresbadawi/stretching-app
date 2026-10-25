// Oberflächen: Start, Programme, Bibliothek, Einstellungen sowie die zugehörigen Editoren.
import * as st from './store.js';
import * as snd from './sound.js';
import { startTraining } from './training.js';
import * as push from './notifications.js';
import { t, tm, LANGS, catLabel, locale } from './i18n.js';
import {
  $, h, fill, icon, iconBtn, thumb, placeholder, stepper, toggle, row, chips,
  openSheet, confirmDialog, toast, minutesLabel, cropImage
} from './ui.js';

const TABS = [
  { key: 'home', icon: 'tabHome' },
  { key: 'plans', icon: 'tabPlans' },
  { key: 'library', icon: 'tabLibrary' },
  { key: 'settings', icon: 'tabSettings' }
];
const exCount = (n) => t('exercises.n', { n });
let currentTab = 'home';
let offlineReady = false;
export function setOfflineReady(v) { offlineReady = v; const el = $('offline-status'); if (el) el.textContent = v ? t('status.offline') : ''; }
const lib = { q: '', filter: 'all' };

function renderTabs() {
  $('tabbar').setAttribute('aria-label', t('nav.label'));
  $('tabbar').replaceChildren(...TABS.map((tab) =>
    h('button', { type: 'button', 'data-tab': tab.key, class: tab.key === currentTab ? 'active' : '', onclick: () => showTab(tab.key) }, icon(tab.icon), t('tab.' + tab.key))));
}

export function initViews() {
  renderAll();
  showTab('home');
  st.onChange(renderAll);
  document.addEventListener('training-closed', () => showTab('home'));
}

const scrollMemory = {};
export function showTab(name) {
  scrollMemory[currentTab] = window.scrollY;
  currentTab = name;
  for (const tab of TABS) $('view-' + tab.key).hidden = tab.key !== name;
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo(0, scrollMemory[name] || 0);
}

export function renderAll() {
  renderTabs();
  renderHome(); renderPlans(); renderLibrary(); renderSettings();
}

/* =============== Start =============== */

// Kurzer Statussatz unter der Begrüßung: heute fällig, schon trainiert oder nächster Trainingstag.
function todayLine() {
  const days = st.settings().remindDays;
  const todayIdx = (new Date().getDay() + 6) % 7;
  if (st.weekInfo().days.find((d) => d.today)?.done) return t('home.todayDone');
  if (days.includes(todayIdx)) return t('home.todayDue');
  for (let k = 1; k <= 7; k++) {
    const idx = (todayIdx + k) % 7;
    if (days.includes(idx)) return t('home.next', { day: t('day.full.' + idx) });
  }
  return t('home.sub');
}

function greeting() {
  const hr = new Date().getHours();
  return t(hr < 5 ? 'greet.night' : hr < 11 ? 'greet.morning' : hr < 17 ? 'greet.day' : hr < 22 ? 'greet.evening' : 'greet.night');
}

function openHistory() {
  const recent = st.history().slice(-30).reverse();
  openSheet({
    title: t('history.title'),
    body: recent.length ? h('ul', { class: 'hist' }, recent.map((e) => {
      const d = new Date(e.t);
      return h('li', {}, h('div', { class: 'dot' }, icon('check')),
        h('div', {}, h('b', {}, e.nameKey ? t('wk.' + e.nameKey) : (e.name && e.name !== 'Training' ? e.name : t('history.default'))),
          h('small', {}, d.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + minutesLabel(e.seconds || 600))));
    })) : h('div', { class: 'empty' }, icon('clock'), h('p', {}, t('history.empty')))
  });
}

// Alle Programme als Karten zum Durchwischen; die sichtbare Karte ist das aktive Programm.
function heroCard(w) {
  const items = st.resolveItems(w);
  const canStart = items.length > 0;
  return h('div', { class: 'hero' },
    h('i', { class: 'hero-blob' }),
    h('div', { class: 'hero-label' }, t('hero.label')),
    h('h2', {}, st.wname(w)),
    h('div', { class: 'hero-meta' },
      h('span', {}, icon('figure'), exCount(items.length)),
      h('span', {}, icon('clock'), canStart ? minutesLabel(st.workoutSeconds(w)) : '–')),
    h('div', { class: 'hero-thumbs' }, items.slice(0, 6).map((it) => thumb(it.ex)), items.length > 6 ? h('div', { class: 'more' }, '+' + (items.length - 6)) : null),
    h('button', { type: 'button', class: 'btn light big', disabled: !canStart, onclick: () => startTraining(w) }, icon('play'), canStart ? t('hero.start') : t('hero.add')));
}

function heroCarousel() {
  const list = st.workouts();
  if (!list.length) return h('div', { class: 'hero' }, h('h2', {}, t('hero.none')));
  const activeId = st.activeWorkout()?.id;
  const track = h('div', { class: 'hero-track', role: 'region', 'aria-label': t('hero.label') }, list.map((w) => h('div', { class: 'hero-slide', 'data-id': w.id }, heroCard(w))));
  const dots = h('div', { class: 'hero-dots' }, list.map((w) => h('i', { class: w.id === activeId ? 'on' : '' })));
  const slides = () => [...track.children];
  const current = () => {
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
    let best = 0; let bestD = Infinity;
    slides().forEach((el, i) => { const r = el.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
    return best;
  };
  let timer = null;
  track.addEventListener('scroll', () => {
    const i = current();
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    clearTimeout(timer);
    timer = setTimeout(() => { const id = list[current()]?.id; if (id && id !== st.activeWorkout()?.id) st.setActiveWorkout(id); }, 220);
  }, { passive: true });
  // Nach dem Einfügen an die aktive Karte springen
  requestAnimationFrame(() => { const el = slides()[Math.max(0, list.findIndex((w) => w.id === activeId))]; if (el) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' }); });
  return h('div', { class: 'hero-wrap' }, track, list.length > 1 ? dots : null);
}

function renderHome() {
  const root = $('view-home');
  const active = st.activeWorkout();
  const info = st.weekInfo();
  const tot = st.totals();
  const streak = st.streakWeeks();

  fill(root,
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, greeting()), h('p', {}, todayLine())),
      streak > 0 ? h('div', { class: 'streak', title: t('streak.title') }, icon('flame'), t('streak.n', { n: streak })) : null),

    heroCarousel(),

    h('div', { class: 'week' },
      h('div', { class: 'week-top' }, h('b', {}, t('week.title')),
        h('span', { class: info.count >= info.goal ? 'goal ok' : 'goal' }, `${Math.min(info.count, 99)} / ${info.goal}`)),
      h('div', { class: 'week-days' }, info.days.map((d) =>
        h('div', { class: 'day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') }, d.label, h('i', {}, icon('check')))))),

    h('div', { class: 'statline' },
      h('div', {}, h('strong', {}, tot.sessions), h('span', {}, t('stat.sessions'))),
      h('div', {}, h('strong', {}, tot.minutes), h('span', {}, t('stat.minutes'))),
      h('div', {}, h('strong', {}, streak), h('span', {}, t('stat.streak')))),
    h('button', { type: 'button', class: 'link', onclick: openHistory }, t('history.show')));
}

/* =============== Programme =============== */

function renderPlans() {
  const root = $('view-plans');
  const ws = st.workouts();
  fill(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, t('plans.title')), h('p', {}, t('plans.sub'))),
      iconBtn('plus', t('plans.new'), () => openWorkoutEditor(null))),
    ws.length ? ws.map((w) => {
      const items = st.resolveItems(w);
      return h('div', { class: 'card plan-item' },
        h('div', { class: 'top' },
          h('div', {}, h('h3', {}, st.wname(w)),
            h('div', { class: 'meta' }, `${exCount(items.length)} · ${items.length ? minutesLabel(st.workoutSeconds(w)) : '–'} · ${t('plans.rest', { n: w.rest })}`)),
          iconBtn('copy', t('common.copy'), () => { st.duplicateWorkout(w.id); toast(t('plans.dup')); }, 'sm'),
          iconBtn('trash', t('common.delete'), async () => {
            if (await confirmDialog(t('plans.del', { name: st.wname(w) }))) st.deleteWorkout(w.id);
          }, 'sm danger')),
        h('div', { class: 'thumbs' }, items.slice(0, 7).map((it) => thumb(it.ex)), items.length > 7 ? h('div', { class: 'more' }, '+' + (items.length - 7)) : null),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', onclick: () => openWorkoutEditor(w) }, icon('edit'), t('common.edit')),
          h('button', { type: 'button', class: 'btn primary', disabled: !items.length, onclick: () => { st.setActiveWorkout(w.id); startTraining(w); } }, icon('play'), t('hero.start'))));
    }) : h('div', { class: 'empty' }, icon('tabPlans'), h('p', {}, t('plans.empty'))),
    h('button', { type: 'button', class: 'btn primary', style: 'margin-top:6px', onclick: () => openWorkoutEditor(null) }, icon('plus'), t('plans.new')));
}

function openWorkoutEditor(existing) {
  const d = existing ? structuredClone(existing) : st.newWorkout();
  const shownName = existing ? st.wname(existing) : d.name;
  d.name = shownName;
  const body = h('div');
  const save = () => {
    d.name = d.name.trim() || t('editor.defaultName');
    // Unveränderter Standardname bleibt übersetzbar, ein eigener Name nicht.
    if (d.nameKey && d.name !== shownName) d.nameKey = null;
    d.items = d.items.filter((it) => st.getExercise(it.id));
    st.saveWorkout(d);
    sheet.close();
    toast(t('editor.saved'));
  };
  const sheet = openSheet({
    title: existing ? t('editor.edit') : t('editor.new'),
    tall: true,
    body,
    foot: [h('button', { type: 'button', class: 'btn primary', onclick: save }, icon('check'), t('common.save'))]
  });

  const move = (i, dir) => { [d.items[i], d.items[i + dir]] = [d.items[i + dir], d.items[i]]; draw(); };
  function draw() {
    const items = d.items.map((it) => ({ it, ex: st.getExercise(it.id) })).filter((x) => x.ex);
    const secs = st.workoutSeconds({ ...d, items: d.items });
    fill(body, 
      h('label', { class: 'field' }, h('span', {}, t('editor.name')),
        h('input', { type: 'text', value: d.name, maxlength: 40, oninput: (e) => { d.name = e.target.value; } })),
      h('div', { class: 'card', style: 'box-shadow:none' },
        row(t('editor.duration'), stepper({ value: d.duration, min: 10, max: 180, step: 5, unit: ' s', label: t('editor.duration'), onChange: (v) => { d.duration = v; draw(); } }), t('editor.durationHint')),
        row(t('editor.rest'), stepper({ value: d.rest, min: 0, max: 60, step: 5, unit: ' s', label: t('editor.rest'), onChange: (v) => { d.rest = v; draw(); } }))),
      h('div', { class: 'summary' }, h('span', {}, exCount(items.length)), h('span', {}, items.length ? minutesLabel(secs) : '–')),
      items.length ? items.map(({ it, ex }, i) =>
        h('div', { class: 'ex-row' },
          thumb(ex),
          h('div', { class: 'name' }, h('b', {}, ex.name), h('small', {}, catLabel(ex.category) + (ex.perSide ? ' · ' + t('pill.sides') : ''))),
          iconBtn('close', t('common.remove'), () => { d.items.splice(i, 1); draw(); }, 'sm danger'),
          h('div', { class: 'line2' },
            stepper({ value: it.duration || ex.duration || d.duration, min: 10, max: 180, step: 5, unit: ' s', label: t('aria.time'), onChange: (v) => { it.duration = v; } }),
            h('div', { class: 'btn-row', style: 'gap:6px;flex:none' },
              iconBtn('up', t('aria.up'), () => move(i, -1), 'sm'),
              iconBtn('down', t('aria.down'), () => move(i, 1), 'sm'))))) :
        h('div', { class: 'empty' }, icon('tabLibrary'), h('p', {}, t('editor.addHint'))),
      h('button', { type: 'button', class: 'btn', onclick: () => openPicker((ids) => { ids.forEach((id) => d.items.push({ id, duration: null })); draw(); }) }, icon('plus'), t('editor.add')));
    body.querySelectorAll('.ex-row').forEach((r, i) => {
      const [up, down] = r.querySelectorAll('.line2 .icon-btn');
      up.disabled = i === 0;
      down.disabled = i === items.length - 1;
    });
  }
  draw();
}

// Auswahl aus der Bibliothek mit Suche und Filtern.
function openPicker(onDone) {
  let q = '';
  let filter = 'all';
  const picked = [];
  const list = h('div');
  const bar = h('div');
  const btn = h('button', { type: 'button', class: 'btn primary', disabled: true }, t('picker.add'));
  const sheet = openSheet({
    title: t('picker.title'),
    tall: true,
    body: h('div', {},
      h('div', { class: 'search' }, icon('search'), h('input', { type: 'search', placeholder: t('picker.search'), oninput: (e) => { q = e.target.value; draw(); } })),
      bar, list),
    foot: [btn]
  });
  btn.addEventListener('click', () => { onDone(picked); sheet.close(); });

  function draw() {
    bar.replaceChildren(chips(filterItems(), filter, (k) => { filter = k; draw(); }));
    const exs = filterExercises(q, filter);
    list.replaceChildren(...(exs.length ? exs.map((ex) => {
      const n = picked.filter((x) => x === ex.id).length;
      return h('div', { class: 'ex-row pick' + (n ? ' on' : ''), onclick: () => {
        const at = picked.indexOf(ex.id);
        if (at >= 0) picked.splice(at, 1); else picked.push(ex.id);
        draw();
      } },
        thumb(ex),
        h('div', { class: 'name' }, h('b', {}, ex.name), h('small', {}, catLabel(ex.category))),
        h('div', { class: 'tick' }, icon('check')));
    }) : [h('div', { class: 'empty' }, t('picker.none'))]));
    btn.disabled = !picked.length;
    btn.textContent = picked.length ? t('picker.addN', { n: picked.length }) : t('picker.add');
  }
  draw();
}

/* =============== Bibliothek =============== */

function filterItems() {
  return [
    { key: 'all', label: t('filter.all') },
    { key: 'fav', label: t('filter.fav'), iconName: 'star' },
    { key: 'own', label: t('filter.own') },
    ...st.categories().map((c) => ({ key: 'cat:' + c, label: catLabel(c) }))
  ];
}
function filterExercises(q, filter) {
  const needle = q.trim().toLowerCase();
  return st.allExercises().filter((e) => {
    if (filter === 'fav' && !e.favorite) return false;
    if (filter === 'own' && e.builtin) return false;
    if (filter.startsWith('cat:') && e.category !== filter.slice(4)) return false;
    return !needle || `${e.name} ${catLabel(e.category)} ${e.description}`.toLowerCase().includes(needle);
  });
}

function renderLibrary() {
  const root = $('view-library');
  const grid = h('div', { class: 'grid' });
  const bar = h('div');
  const drawGrid = () => {
    bar.replaceChildren(chips(filterItems(), lib.filter, (k) => { lib.filter = k; drawGrid(); }));
    const exs = filterExercises(lib.q, lib.filter);
    grid.replaceChildren(...(exs.length ? exs.map((ex, i) =>
      h('div', { class: 'ex-card', style: `animation-delay:${Math.min(i, 10) * 25}ms`, role: 'button', tabindex: 0, onclick: () => exerciseDetail(ex) },
        h('span', { class: 'pic' }, ex.image ? h('img', { src: ex.image, alt: '', loading: 'lazy', draggable: 'false' }) : placeholder(ex.category)),
        !ex.builtin ? h('span', { class: 'own' }, t('lib.own')) : null,
        iconBtn('star', ex.favorite ? t('lib.favRemove') : t('lib.favAdd'), (e) => { e.stopPropagation(); st.toggleFavorite(ex.id); }, 'sm fav' + (ex.favorite ? ' on' : '')),
        h('div', { class: 'info' }, h('b', {}, ex.name), h('small', {}, catLabel(ex.category))))) :
      [h('div', { class: 'empty', style: 'grid-column:1/-1' }, icon('search'), h('p', {}, t('lib.none')))]));
  };
  const hidden = st.hiddenExercises();
  fill(root, 
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, t('lib.title')), h('p', {}, exCount(st.allExercises().length)))),
    h('div', { class: 'search' }, icon('search'),
      h('input', { type: 'search', placeholder: t('lib.search'), value: lib.q, oninput: (e) => { lib.q = e.target.value; drawGrid(); } })),
    bar, grid,
    hidden.length ? h('button', { type: 'button', class: 'btn ghost', style: 'margin-top:16px', onclick: () => openRestore() }, t('lib.restore', { n: hidden.length })) : null,
    h('button', { type: 'button', class: 'fab', 'aria-label': t('lib.newAria'), onclick: () => openExerciseEditor(null) }, icon('plus')));
  drawGrid();
}

function openRestore() {
  const body = h('div');
  const sheet = openSheet({ title: t('restore.title'), body });
  const draw = () => {
    const hid = st.hiddenExercises();
    if (!hid.length) return sheet.close();
    fill(body, ...hid.map((ex) => h('div', { class: 'ex-row' }, thumb(ex),
      h('div', { class: 'name' }, h('b', {}, ex.name), h('small', {}, catLabel(ex.category))),
      h('button', { type: 'button', class: 'btn', style: 'width:auto;padding:8px 14px', onclick: () => { st.restoreExercise(ex.id); draw(); } }, t('restore.back')))));
  };
  draw();
}

export function exerciseDetail(ex, { readOnly = false, onClose } = {}) {
  const foot = readOnly
    ? [h('button', { type: 'button', class: 'btn primary', onclick: () => sheet.close() }, t('detail.continue'))]
    : [
      iconBtn('trash', t('common.delete'), async () => {
        const ok = await confirmDialog(t(ex.builtin ? 'detail.hideConfirm' : 'detail.deleteConfirm', { name: ex.name }));
        if (ok) { st.deleteExercise(ex.id); sheet.close(); toast(t('detail.deleted')); }
      }, 'danger'),
      iconBtn('star', t('detail.fav'), () => { st.toggleFavorite(ex.id); sheet.close(); }, 'fav' + (ex.favorite ? ' on' : '')),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { sheet.close(); openExerciseEditor(ex); } }, icon('edit'), t('common.edit'))
    ];
  const sheet = openSheet({
    title: ex.name,
    onClose,
    foot,
    body: h('div', {},
      h('div', { class: 'detail-pic' }, ex.image ? h('img', { src: ex.image, alt: ex.name, draggable: 'false' }) : placeholder(ex.category)),
      h('div', {}, h('span', { class: 'pill' }, ex.category ? catLabel(ex.category) : t('detail.noCat')), ex.perSide ? h('span', { class: 'pill' }, t('pill.sides')) : null, ex.duration ? h('span', { class: 'pill' }, ex.duration + ' s') : null),
      ex.description ? h('p', { class: 'muted' }, ex.description) : null,
      ex.steps?.length ? h('ol', { class: 'steps' }, ex.steps.map((x) => h('li', {}, x))) : null)
  });
  return sheet;
}

function openExerciseEditor(ex) {
  const d = {
    name: ex?.name || '', category: ex?.category || 'Rücken', description: ex?.description || '',
    steps: (ex?.steps || []).join('\n'), perSide: !!ex?.perSide, duration: ex?.duration || 0,
    image: undefined, newCat: ''
  };
  const body = h('div');
  const currentImage = () => (d.image === undefined ? ex?.image || null : d.image);

  const save = () => {
    const name = d.name.trim();
    if (!name) return toast(t('ex.nameMissing'));
    const category = (d.category === '__new' ? d.newCat.trim() : d.category) || 'Sonstiges';
    try {
      st.saveExercise({
        id: ex?.id, name, category, description: d.description.trim(),
        steps: d.steps.split('\n').map((x) => x.trim()).filter(Boolean), perSide: d.perSide, duration: d.duration || null
      }, d.image);
      sheet.close();
      toast(ex ? t('ex.saved') : t('ex.created'));
    } catch (err) { toast(tm(err.message)); }
  };
  const foot = [];
  if (ex) {
    foot.push(iconBtn('trash', t('common.delete'), async () => {
      if (await confirmDialog(t(ex.builtin ? 'ex.hideConfirm' : 'ex.deleteConfirm'))) {
        st.deleteExercise(ex.id); sheet.close(); toast(t('detail.deleted'));
      }
    }, 'danger'));
  }
  foot.push(h('button', { type: 'button', class: 'btn primary', onclick: save }, icon('check'), t('common.save')));
  const sheet = openSheet({ title: ex ? t('ex.edit') : t('ex.new'), tall: true, body, foot });

  const pick = async (file) => {
    if (!file) return;
    try { const out = await cropImage(file); if (out) { d.image = out; draw(); } } catch (err) { toast(tm(err.message)); }
  };
  const fileInput = (capture) => h('input', { type: 'file', accept: 'image/*', hidden: true, ...(capture ? { capture: 'environment' } : {}), onchange: (e) => { pick(e.target.files[0]); e.target.value = ''; } });
  const gallery = fileInput(false);
  const camera = fileInput(true);

  function draw() {
    const img = currentImage();
    const cats = st.allCategories();
    if (!cats.includes(d.category) && d.category !== '__new') cats.push(d.category);
    fill(body, 
      gallery, camera,
      h('div', { class: 'img-edit' },
        h('div', { class: 'pic' }, img ? h('img', { src: img, alt: '' }) : placeholder(d.category)),
        h('div', { class: 'btns' },
          h('button', { type: 'button', class: 'btn', onclick: () => camera.click() }, icon('camera'), t('ex.photo')),
          h('button', { type: 'button', class: 'btn', onclick: () => gallery.click() }, icon('image'), t('ex.gallery')),
          img && (d.image !== null) && (d.image || ex?.ownImage || !ex?.builtin) ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { d.image = null; draw(); } }, t('ex.removeImg')) : null)),
      h('label', { class: 'field' }, h('span', {}, t('ex.name')),
        h('input', { type: 'text', value: d.name, maxlength: 50, placeholder: t('ex.namePh'), oninput: (e) => { d.name = e.target.value; } })),
      h('label', { class: 'field' }, h('span', {}, t('ex.category')),
        h('select', { onchange: (e) => { d.category = e.target.value; draw(); } },
          cats.map((c) => h('option', { value: c, ...(c === d.category ? { selected: true } : {}) }, catLabel(c))),
          h('option', { value: '__new', ...(d.category === '__new' ? { selected: true } : {}) }, t('ex.newCat')))),
      d.category === '__new' ? h('label', { class: 'field' }, h('span', {}, t('ex.newCatName')),
        h('input', { type: 'text', value: d.newCat, maxlength: 24, oninput: (e) => { d.newCat = e.target.value; } })) : null,
      h('div', { class: 'card', style: 'box-shadow:none' },
        row(t('ex.sides'), toggle(d.perSide, (v) => { d.perSide = v; }), t('ex.sidesHint')),
        row(t('ex.duration'), stepper({ value: d.duration, min: 0, max: 180, step: 5, format: (v) => (v ? v + ' s' : t('ex.durationStd')), label: t('ex.duration'), onChange: (v) => { d.duration = v; } }), t('ex.durationHint'))),
      h('label', { class: 'field' }, h('span', {}, t('ex.desc')),
        h('input', { type: 'text', value: d.description, maxlength: 140, placeholder: t('ex.descPh'), oninput: (e) => { d.description = e.target.value; } })),
      h('label', { class: 'field' }, h('span', {}, t('ex.steps')),
        h('textarea', { value: d.steps, oninput: (e) => { d.steps = e.target.value; } })),
      ex && (ex.edited || ex.ownImage) && ex.builtin
        ? h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
          if (await confirmDialog(t('ex.resetConfirm'), { ok: t('ex.resetOk'), danger: false, title: t('ex.resetTitle') })) { st.resetEdits(ex.id); sheet.close(); toast(t('ex.resetDone')); }
        } }, t('ex.resetBtn')) : null);
  }
  draw();
}

/* =============== Einstellungen =============== */

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function seg(options, value, onPick) {
  return h('div', { class: 'seg' }, options.map(([k, label]) => h('button', { type: 'button', class: k === value ? 'on' : '', onclick: () => onPick(k) }, label)));
}

function renderSettings() {
  const S = st.settings();
  const set = (patch) => st.updateSettings(patch);
  const root = $('view-settings');
  const pushHint = !push.supported() ? t('plan.hint.ios')
    : !push.configured() ? t('plan.hint.noserver')
      : new Set(S.remindDays.map((d) => st.timeFor(d))).size === 1 ? t('plan.hint.ok', { time: st.timeFor(S.remindDays[0]) }) : t('plan.hint.mixed');
  const resync = () => { clearTimeout(resync.t); resync.t = setTimeout(() => { if (st.settings().remindOn) push.sync().catch(() => toast(t('plan.syncFail'))); }, 700); };
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const importer = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { st.importData(await f.text()); toast(t('data.restored')); } catch (err) { toast(tm(err.message) || t('data.invalid')); }
    e.target.value = '';
  } });

  fill(root,
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, t('settings.title')))),

    h('p', { class: 'section-title' }, t('sec.plan')),
    h('div', { class: 'card' },
      row(t('plan.days'), stepper({ value: S.remindDays.length, min: 1, max: 7, step: 1, unit: '×', label: t('plan.days'), onChange: (v) => { st.setTrainingDays(st.spreadDays(v)); resync(); } }), t('plan.daysHint')),
      h('div', { class: 'daypick' }, st.weekOrder().map((i) =>
        h('button', { type: 'button', class: 'dp' + (S.remindDays.includes(i) ? ' on' : ''), 'aria-pressed': S.remindDays.includes(i), 'aria-label': t('day.full.' + i), title: t('day.full.' + i), onclick: () => {
          const days = S.remindDays.includes(i) ? S.remindDays.filter((d) => d !== i) : [...S.remindDays, i];
          if (days.length) { st.setTrainingDays(days); resync(); } else toast(t('plan.minDay'));
        } }, t('day.' + i)))),
      h('p', { class: 'muted small daysum' }, t('plan.selected', { days: st.weekOrder().filter((i) => S.remindDays.includes(i)).map((i) => t('day.full.' + i)).join(t('list.sep')) })),
      row(t('plan.remind'), toggle(S.remindOn, async (on) => {
        try { if (on) await push.enable(); else await push.disable(); toast(t(on ? 'plan.on' : 'plan.off')); } catch (err) { toast(tm(err.message)); }
        renderSettings();
      }, t('plan.remind')), pushHint),
      S.remindOn ? row(t('plan.time'), h('input', { type: 'time', class: 'timebox', value: S.remindTime, 'aria-label': t('plan.time'), onchange: (e) => { if (e.target.value) { set({ remindTime: e.target.value, remindTimes: {} }); resync(); renderSettings(); } } }), t('plan.timeHint')) : null,
      S.remindOn ? h('div', { class: 'daytimes' }, st.weekOrder().filter((i) => S.remindDays.includes(i)).map((i) =>
        row(t('day.full.' + i), h('input', { type: 'time', class: 'timebox', value: st.timeFor(i), 'aria-label': `${t('day.full.' + i)} – ${t('plan.time')}`, onchange: (e) => {
          if (e.target.value) { set({ remindTimes: { ...S.remindTimes, [i]: e.target.value } }); resync(); renderSettings(); }
        } })))) : null,
      S.remindOn ? h('button', { type: 'button', class: 'btn', style: 'margin-top:10px', onclick: async () => {
        try { await push.sendTest(); toast(t('plan.testSent')); } catch (err) { toast(tm(err.message)); }
      } }, t('plan.test')) : null),

    h('p', { class: 'section-title' }, t('sec.sound')),
    h('div', { class: 'card' },
      row(t('snd.sound'), toggle(S.sound, (v) => { set({ sound: v }); }), t('snd.soundHint')),
      row(t('snd.volume'), h('input', { type: 'range', class: 'vol', min: 0.1, max: 1, step: 0.05, value: S.volume, 'aria-label': t('snd.volume'),
        oninput: (e) => { st.settings().volume = +e.target.value; }, onchange: (e) => { set({ volume: +e.target.value }); snd.unlock(); snd.cue.side(); } })),
      row(t('snd.countdown'), toggle(S.countdown, (v) => set({ countdown: v })), t('snd.countdownHint')),
      row(t('snd.voice'), toggle(S.voice, (v) => set({ voice: v })), t('snd.voiceHint')),
      row(t('snd.vibrate'), toggle(S.vibrate, (v) => set({ vibrate: v })), t('snd.vibrateHint')),
      h('button', { type: 'button', class: 'btn', style: 'margin-top:10px', onclick: () => { snd.unlock(); snd.cue.preview(); snd.preloadVoice(['rest']); snd.say('rest', 3300); } }, icon('volume'), t('snd.test'))),

    h('p', { class: 'section-title' }, t('sec.training')),
    h('div', { class: 'card' },
      row(t('tr.prep'), stepper({ value: S.prep, min: 3, max: 30, step: 1, unit: ' s', label: t('tr.prep'), onChange: (v) => set({ prep: v }) }), t('tr.prepHint')),
      row(t('tr.awake'), toggle(S.keepAwake, (v) => set({ keepAwake: v })), t('tr.awakeHint'))),

    h('p', { class: 'section-title' }, t('sec.look')),
    h('div', { class: 'card' },
      row(t('look.lang'), h('select', { 'aria-label': t('look.lang'), onchange: (e) => { set({ lang: e.target.value }); resync(); } },
        h('option', { value: 'auto', ...(S.lang === 'auto' ? { selected: true } : {}) }, t('look.langAuto')),
        LANGS.map(([k, label]) => h('option', { value: k, ...(S.lang === k ? { selected: true } : {}) }, label)))),
      row(t('look.theme'), seg([['auto', t('look.auto')], ['light', t('look.light')], ['dark', t('look.dark')]], S.theme, (k) => set({ theme: k }))),
      row(t('look.color'), h('div', { class: 'swatches' }, [['blue', '#2f7df6'], ['green', '#14a86f'], ['violet', '#7a5cff'], ['orange', '#f2780c'], ['pink', '#e5489b']].map(([k, c]) =>
        h('button', { type: 'button', class: 'swatch' + (S.accent === k ? ' on' : ''), style: `background:${c}`, 'aria-label': k, onclick: () => set({ accent: k }) }))))),

    h('p', { class: 'section-title' }, t('sec.data')),
    h('div', { class: 'card' },
      importer,
      h('p', { class: 'muted small', style: 'margin-top:0' }, t('data.info')),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', onclick: () => download(`stretch-backup-${new Date().toISOString().slice(0, 10)}.json`, st.exportData()) }, t('data.backup')),
        h('button', { type: 'button', class: 'btn', onclick: () => importer.click() }, t('data.restore'))),
      h('button', { type: 'button', class: 'btn danger', style: 'margin-top:10px', onclick: async () => {
        if (await confirmDialog(t('data.resetConfirm'), { ok: t('data.resetOk'), title: t('data.resetTitle') })) { st.resetAll(); toast(t('data.resetDone')); }
      } }, t('data.reset'))),

    !standalone ? h('div', { class: 'card' }, h('h2', {}, t('install.title')),
      h('p', { class: 'muted small', style: 'margin:0' }, t('install.text'))) : null,
    h('p', { id: 'offline-status', class: 'muted small', style: 'text-align:center' }, offlineReady ? t('status.offline') : ''),
    h('p', { class: 'muted small', style: 'text-align:center;margin-top:0' }, t('credits.voice')));
}
