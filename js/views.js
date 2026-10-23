// Oberflächen: Start, Programme, Bibliothek, Einstellungen sowie die zugehörigen Editoren.
import * as st from './store.js';
import * as snd from './sound.js';
import { startTraining } from './training.js';
import {
  $, h, fill, icon, iconBtn, thumb, placeholder, stepper, toggle, row, chips,
  openSheet, confirmDialog, toast, minutesLabel, resizeImage
} from './ui.js';

const TABS = [
  { key: 'home', label: 'Start', icon: 'tabHome' },
  { key: 'plans', label: 'Programme', icon: 'tabPlans' },
  { key: 'library', label: 'Bibliothek', icon: 'tabLibrary' },
  { key: 'settings', label: 'Optionen', icon: 'tabSettings' }
];
let currentTab = 'home';
let offlineReady = false;
export function setOfflineReady(v) { offlineReady = v; const el = $('offline-status'); if (el) el.textContent = v ? 'Offline verfügbar' : ''; }
const lib = { q: '', filter: 'all' };

export function initViews() {
  $('tabbar').replaceChildren(...TABS.map((t) =>
    h('button', { type: 'button', 'data-tab': t.key, onclick: () => showTab(t.key) }, icon(t.icon), t.label)));
  renderAll();
  showTab('home');
  st.onChange(renderAll);
  document.addEventListener('training-closed', () => showTab('home'));
}

export function showTab(name) {
  currentTab = name;
  for (const t of TABS) $('view-' + t.key).hidden = t.key !== name;
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo(0, 0);
}

export function renderAll() {
  renderHome(); renderPlans(); renderLibrary(); renderSettings();
}

/* =============== Start =============== */

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Gute Nacht' : hr < 11 ? 'Guten Morgen' : hr < 17 ? 'Hallo' : hr < 22 ? 'Guten Abend' : 'Gute Nacht';
}

function openProgramPicker() {
  const sheet = openSheet({ title: 'Programm wählen', body: h('div') });
  const active = st.activeWorkout();
  sheet.body.replaceChildren(...st.workouts().map((w) => {
    const items = st.resolveItems(w);
    return h('button', { type: 'button', class: 'ex-row pick' + (active && w.id === active.id ? ' on' : ''), style: 'width:100%;text-align:left',
      onclick: () => { st.setActiveWorkout(w.id); sheet.close(); } },
      h('div', { class: 'name' }, h('b', {}, w.name), h('small', {}, `${items.length} Übungen · ${items.length ? minutesLabel(st.workoutSeconds(w)) : '–'}`)),
      h('div', { class: 'tick' }, icon('check')));
  }));
}

function openHistory() {
  const recent = st.history().slice(-30).reverse();
  openSheet({
    title: 'Verlauf',
    body: recent.length ? h('ul', { class: 'hist' }, recent.map((e) => {
      const d = new Date(e.t);
      return h('li', {}, h('div', { class: 'dot' }, icon('check')),
        h('div', {}, h('b', {}, e.name || 'Training'),
          h('small', {}, d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + minutesLabel(e.seconds || 600))));
    })) : h('div', { class: 'empty' }, icon('clock'), h('p', {}, 'Noch kein Training abgeschlossen.'))
  });
}

function renderHome() {
  const root = $('view-home');
  const active = st.activeWorkout();
  const info = st.weekInfo();
  const tot = st.totals();
  const streak = st.streakWeeks();
  const items = active ? st.resolveItems(active) : [];
  const canStart = items.length > 0;

  fill(root,
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, greeting()), h('p', {}, 'Zeit für deinen Rücken.')),
      streak > 0 ? h('div', { class: 'streak', title: 'Wochen in Folge mit erreichtem Wochenziel' }, icon('flame'), streak + (streak === 1 ? ' Woche' : ' Wochen')) : null),

    h('div', { class: 'hero' },
      h('i', { class: 'hero-blob' }),
      h('div', { class: 'hero-label' }, 'Dein Programm'),
      h('h2', {}, active ? active.name : 'Kein Programm'),
      h('div', { class: 'hero-meta' },
        h('span', {}, icon('figure'), `${items.length} Übungen`),
        h('span', {}, icon('clock'), canStart ? minutesLabel(st.workoutSeconds(active)) : '–')),
      h('div', { class: 'hero-thumbs' }, items.slice(0, 6).map((it) => thumb(it.ex)), items.length > 6 ? h('div', { class: 'more' }, '+' + (items.length - 6)) : null),
      h('button', { type: 'button', class: 'btn light big', disabled: !canStart, onclick: () => startTraining(active) }, icon('play'), canStart ? 'Starten' : 'Übungen hinzufügen'),
      st.workouts().length > 1 ? h('button', { type: 'button', class: 'hero-switch', onclick: openProgramPicker }, 'Anderes Programm wählen', icon('down')) : null),

    h('div', { class: 'week' },
      h('div', { class: 'week-top' }, h('b', {}, 'Diese Woche'),
        h('span', { class: info.count >= info.goal ? 'goal ok' : 'goal' }, `${Math.min(info.count, 99)} / ${info.goal}`)),
      h('div', { class: 'week-days' }, info.days.map((d) =>
        h('div', { class: 'day' + (d.done ? ' done' : '') + (d.today ? ' today' : '') }, d.label, h('i', {}, icon('check')))))),

    h('div', { class: 'statline' },
      h('div', {}, h('strong', {}, tot.sessions), h('span', {}, 'Trainings')),
      h('div', {}, h('strong', {}, tot.minutes), h('span', {}, 'Minuten')),
      h('div', {}, h('strong', {}, streak), h('span', {}, 'Wochen-Serie'))),
    h('button', { type: 'button', class: 'link', onclick: openHistory }, 'Verlauf anzeigen'));
}

/* =============== Programme =============== */

function renderPlans() {
  const root = $('view-plans');
  const ws = st.workouts();
  fill(root, 
    h('header', { class: 'page-head' },
      h('div', {}, h('h1', {}, 'Programme'), h('p', {}, 'Stelle dein Training aus der Bibliothek zusammen.')),
      iconBtn('plus', 'Neues Programm', () => openWorkoutEditor(null))),
    ws.length ? ws.map((w) => {
      const items = st.resolveItems(w);
      return h('div', { class: 'card plan-item' },
        h('div', { class: 'top' },
          h('div', {}, h('h3', {}, w.name),
            h('div', { class: 'meta' }, `${items.length} Übungen · ${items.length ? minutesLabel(st.workoutSeconds(w)) : '–'} · Pause ${w.rest} s`)),
          iconBtn('copy', 'Duplizieren', () => { st.duplicateWorkout(w.id); toast('Programm dupliziert'); }, 'sm'),
          iconBtn('trash', 'Löschen', async () => {
            if (await confirmDialog(`„${w.name}“ wird gelöscht. Die Übungen bleiben in der Bibliothek.`)) st.deleteWorkout(w.id);
          }, 'sm danger')),
        h('div', { class: 'thumbs' }, items.slice(0, 7).map((it) => thumb(it.ex)), items.length > 7 ? h('div', { class: 'more' }, '+' + (items.length - 7)) : null),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', onclick: () => openWorkoutEditor(w) }, icon('edit'), 'Bearbeiten'),
          h('button', { type: 'button', class: 'btn primary', disabled: !items.length, onclick: () => { st.setActiveWorkout(w.id); startTraining(w); } }, icon('play'), 'Starten')));
    }) : h('div', { class: 'empty' }, icon('tabPlans'), h('p', {}, 'Noch kein Programm. Lege dein erstes an.')),
    h('button', { type: 'button', class: 'btn primary', style: 'margin-top:6px', onclick: () => openWorkoutEditor(null) }, icon('plus'), 'Neues Programm'));
}

function openWorkoutEditor(existing) {
  const d = existing ? structuredClone(existing) : st.newWorkout();
  const body = h('div');
  const save = () => {
    d.name = d.name.trim() || 'Mein Programm';
    d.items = d.items.filter((it) => st.getExercise(it.id));
    st.saveWorkout(d);
    sheet.close();
    toast('Programm gespeichert');
  };
  const sheet = openSheet({
    title: existing ? 'Programm bearbeiten' : 'Neues Programm',
    tall: true,
    body,
    foot: [h('button', { type: 'button', class: 'btn primary', onclick: save }, icon('check'), 'Speichern')]
  });

  const move = (i, dir) => { [d.items[i], d.items[i + dir]] = [d.items[i + dir], d.items[i]]; draw(); };
  function draw() {
    const items = d.items.map((it) => ({ it, ex: st.getExercise(it.id) })).filter((x) => x.ex);
    const secs = st.workoutSeconds({ ...d, items: d.items });
    fill(body, 
      h('label', { class: 'field' }, h('span', {}, 'Name'),
        h('input', { type: 'text', value: d.name, maxlength: 40, oninput: (e) => { d.name = e.target.value; } })),
      h('div', { class: 'card', style: 'box-shadow:none' },
        row('Dauer pro Übung', stepper({ value: d.duration, min: 10, max: 180, step: 5, unit: ' s', label: 'Dauer', onChange: (v) => { d.duration = v; draw(); } }), 'Gilt, wenn bei der Übung keine eigene Zeit steht'),
        row('Pause dazwischen', stepper({ value: d.rest, min: 0, max: 60, step: 5, unit: ' s', label: 'Pause', onChange: (v) => { d.rest = v; draw(); } }))),
      h('div', { class: 'summary' }, h('span', {}, `${items.length} Übungen`), h('span', {}, items.length ? minutesLabel(secs) : '–')),
      items.length ? items.map(({ it, ex }, i) =>
        h('div', { class: 'ex-row' },
          thumb(ex),
          h('div', { class: 'name' }, h('b', {}, ex.name), h('small', {}, ex.category + (ex.perSide ? ' · links & rechts' : ''))),
          iconBtn('close', 'Entfernen', () => { d.items.splice(i, 1); draw(); }, 'sm danger'),
          h('div', { class: 'line2' },
            stepper({ value: it.duration || ex.duration || d.duration, min: 10, max: 180, step: 5, unit: ' s', label: 'Zeit', onChange: (v) => { it.duration = v; } }),
            h('div', { class: 'btn-row', style: 'gap:6px;flex:none' },
              iconBtn('up', 'Nach oben', () => move(i, -1), 'sm' + (i === 0 ? ' x' : '')),
              iconBtn('down', 'Nach unten', () => move(i, 1), 'sm'))))) :
        h('div', { class: 'empty' }, icon('tabLibrary'), h('p', {}, 'Füge Übungen aus der Bibliothek hinzu.')),
      h('button', { type: 'button', class: 'btn', onclick: () => openPicker((ids) => { ids.forEach((id) => d.items.push({ id, duration: null })); draw(); }) }, icon('plus'), 'Übungen hinzufügen'));
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
  const btn = h('button', { type: 'button', class: 'btn primary', disabled: true }, 'Hinzufügen');
  const sheet = openSheet({
    title: 'Übungen auswählen',
    tall: true,
    body: h('div', {},
      h('div', { class: 'search' }, icon('search'), h('input', { type: 'search', placeholder: 'Suchen …', oninput: (e) => { q = e.target.value; draw(); } })),
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
        h('div', { class: 'name' }, h('b', {}, ex.name), h('small', {}, ex.category)),
        h('div', { class: 'tick' }, icon('check')));
    }) : [h('div', { class: 'empty' }, 'Nichts gefunden.')]));
    btn.disabled = !picked.length;
    btn.textContent = picked.length ? `${picked.length} hinzufügen` : 'Hinzufügen';
  }
  draw();
}

/* =============== Bibliothek =============== */

function filterItems() {
  return [
    { key: 'all', label: 'Alle' },
    { key: 'fav', label: 'Favoriten', iconName: 'star' },
    { key: 'own', label: 'Eigene' },
    ...st.categories().map((c) => ({ key: 'cat:' + c, label: c }))
  ];
}
function filterExercises(q, filter) {
  const needle = q.trim().toLowerCase();
  return st.allExercises().filter((e) => {
    if (filter === 'fav' && !e.favorite) return false;
    if (filter === 'own' && e.builtin) return false;
    if (filter.startsWith('cat:') && e.category !== filter.slice(4)) return false;
    return !needle || `${e.name} ${e.category} ${e.description}`.toLowerCase().includes(needle);
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
        !ex.builtin ? h('span', { class: 'own' }, 'Eigene') : null,
        iconBtn('star', ex.favorite ? 'Favorit entfernen' : 'Als Favorit markieren', (e) => { e.stopPropagation(); st.toggleFavorite(ex.id); }, 'sm fav' + (ex.favorite ? ' on' : '')),
        h('div', { class: 'info' }, h('b', {}, ex.name), h('small', {}, ex.category)))) :
      [h('div', { class: 'empty', style: 'grid-column:1/-1' }, icon('search'), h('p', {}, 'Keine Übungen gefunden.'))]));
  };
  const hidden = st.hiddenExercises();
  fill(root, 
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Bibliothek'), h('p', {}, `${st.allExercises().length} Übungen`))),
    h('div', { class: 'search' }, icon('search'),
      h('input', { type: 'search', placeholder: 'Übung suchen …', value: lib.q, oninput: (e) => { lib.q = e.target.value; drawGrid(); } })),
    bar, grid,
    hidden.length ? h('button', { type: 'button', class: 'btn ghost', style: 'margin-top:16px', onclick: () => openRestore() }, `Gelöschte Übungen (${hidden.length}) wiederherstellen`) : null,
    h('button', { type: 'button', class: 'fab', 'aria-label': 'Neue Übung', onclick: () => openExerciseEditor(null) }, icon('plus')));
  drawGrid();
}

function openRestore() {
  const body = h('div');
  const sheet = openSheet({ title: 'Gelöschte Übungen', body });
  const draw = () => {
    const hid = st.hiddenExercises();
    if (!hid.length) return sheet.close();
    fill(body, ...hid.map((ex) => h('div', { class: 'ex-row' }, thumb(ex),
      h('div', { class: 'name' }, h('b', {}, ex.name), h('small', {}, ex.category)),
      h('button', { type: 'button', class: 'btn', style: 'width:auto;padding:8px 14px', onclick: () => { st.restoreExercise(ex.id); draw(); } }, 'Zurück'))));
  };
  draw();
}

export function exerciseDetail(ex, { readOnly = false, onClose } = {}) {
  const foot = readOnly
    ? [h('button', { type: 'button', class: 'btn primary', onclick: () => sheet.close() }, 'Weiter trainieren')]
    : [
      iconBtn('trash', 'Löschen', async () => {
        const ok = await confirmDialog(ex.builtin ? `„${ex.name}“ wird ausgeblendet. Du kannst sie später wiederherstellen.` : `„${ex.name}“ wird endgültig gelöscht – auch aus allen Programmen.`);
        if (ok) { st.deleteExercise(ex.id); sheet.close(); toast('Übung gelöscht'); }
      }, 'danger'),
      iconBtn('star', 'Favorit', () => { st.toggleFavorite(ex.id); sheet.close(); }, 'fav' + (ex.favorite ? ' on' : '')),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { sheet.close(); openExerciseEditor(ex); } }, icon('edit'), 'Bearbeiten')
    ];
  const sheet = openSheet({
    title: ex.name,
    onClose,
    foot,
    body: h('div', {},
      h('div', { class: 'detail-pic' }, ex.image ? h('img', { src: ex.image, alt: ex.name, draggable: 'false' }) : placeholder(ex.category)),
      h('div', {}, h('span', { class: 'pill' }, ex.category || 'Ohne Kategorie'), ex.perSide ? h('span', { class: 'pill' }, 'links & rechts') : null, ex.duration ? h('span', { class: 'pill' }, ex.duration + ' s') : null),
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
    if (!name) return toast('Bitte gib einen Namen ein.');
    const category = (d.category === '__new' ? d.newCat.trim() : d.category) || 'Sonstiges';
    try {
      st.saveExercise({
        id: ex?.id, name, category, description: d.description.trim(),
        steps: d.steps.split('\n').map((x) => x.trim()).filter(Boolean), perSide: d.perSide, duration: d.duration || null
      }, d.image);
      sheet.close();
      toast(ex ? 'Änderungen gespeichert' : 'Übung angelegt');
    } catch (err) { toast(err.message); }
  };
  const foot = [];
  if (ex) {
    foot.push(iconBtn('trash', 'Löschen', async () => {
      if (await confirmDialog(ex.builtin ? 'Die Übung wird ausgeblendet und kann wiederhergestellt werden.' : 'Die Übung wird endgültig gelöscht.')) {
        st.deleteExercise(ex.id); sheet.close(); toast('Übung gelöscht');
      }
    }, 'danger'));
  }
  foot.push(h('button', { type: 'button', class: 'btn primary', onclick: save }, icon('check'), 'Speichern'));
  const sheet = openSheet({ title: ex ? 'Übung bearbeiten' : 'Neue Übung', tall: true, body, foot });

  const pick = async (file) => {
    if (!file) return;
    try { d.image = await resizeImage(file); draw(); } catch (err) { toast(err.message); }
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
          h('button', { type: 'button', class: 'btn', onclick: () => camera.click() }, icon('camera'), 'Foto aufnehmen'),
          h('button', { type: 'button', class: 'btn', onclick: () => gallery.click() }, icon('image'), 'Aus Galerie'),
          img && (d.image !== null) && (d.image || ex?.ownImage || !ex?.builtin) ? h('button', { type: 'button', class: 'btn ghost', onclick: () => { d.image = null; draw(); } }, 'Bild entfernen') : null)),
      h('label', { class: 'field' }, h('span', {}, 'Name'),
        h('input', { type: 'text', value: d.name, maxlength: 50, placeholder: 'z. B. Nackenrollen', oninput: (e) => { d.name = e.target.value; } })),
      h('label', { class: 'field' }, h('span', {}, 'Kategorie'),
        h('select', { onchange: (e) => { d.category = e.target.value; draw(); } },
          cats.map((c) => h('option', { value: c, ...(c === d.category ? { selected: true } : {}) }, c)),
          h('option', { value: '__new', ...(d.category === '__new' ? { selected: true } : {}) }, 'Neue Kategorie …'))),
      d.category === '__new' ? h('label', { class: 'field' }, h('span', {}, 'Name der neuen Kategorie'),
        h('input', { type: 'text', value: d.newCat, maxlength: 24, oninput: (e) => { d.newCat = e.target.value; } })) : null,
      h('div', { class: 'card', style: 'box-shadow:none' },
        row('Zwei Seiten (links & rechts)', toggle(d.perSide, (v) => { d.perSide = v; }), 'Die Zeit wird auf beide Seiten verteilt, mit Signal zum Wechseln'),
        row('Eigene Dauer', stepper({ value: d.duration, min: 0, max: 180, step: 5, format: (v) => (v ? v + ' s' : 'Standard'), label: 'Dauer', onChange: (v) => { d.duration = v; } }), 'Überschreibt die Programm-Zeit')),
      h('label', { class: 'field' }, h('span', {}, 'Beschreibung'),
        h('input', { type: 'text', value: d.description, maxlength: 140, placeholder: 'Wofür ist die Übung gut?', oninput: (e) => { d.description = e.target.value; } })),
      h('label', { class: 'field' }, h('span', {}, 'Anleitung (ein Schritt pro Zeile)'),
        h('textarea', { value: d.steps, oninput: (e) => { d.steps = e.target.value; } })),
      ex && (ex.edited || ex.ownImage) && ex.builtin
        ? h('button', { type: 'button', class: 'btn ghost', onclick: async () => {
          if (await confirmDialog('Alle Änderungen an dieser Übung gehen verloren.', { ok: 'Zurücksetzen', danger: false, title: 'Original wiederherstellen?' })) { st.resetEdits(ex.id); sheet.close(); toast('Original wiederhergestellt'); }
        } }, 'Original wiederherstellen') : null);
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
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const importer = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { st.importData(await f.text()); toast('Sicherung eingespielt'); } catch (err) { toast(err.message || 'Datei ungültig'); }
    e.target.value = '';
  } });

  fill(root, 
    h('header', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Optionen'))),

    h('p', { class: 'section-title' }, 'Ton & Signale'),
    h('div', { class: 'card' },
      row('Ton', toggle(S.sound, (v) => { set({ sound: v }); }), 'Glockenklänge bei jedem Wechsel'),
      row('Lautstärke', h('input', { type: 'range', class: 'vol', min: 0.1, max: 1, step: 0.05, value: S.volume, 'aria-label': 'Lautstärke',
        oninput: (e) => { st.settings().volume = +e.target.value; }, onchange: (e) => { set({ volume: +e.target.value }); snd.unlock(); snd.cue.side(); } })),
      row('Countdown 3 · 2 · 1', toggle(S.countdown, (v) => set({ countdown: v })), 'Kurze Klicks vor dem Wechsel'),
      row('Sprachansagen', toggle(S.voice, (v) => set({ voice: v })), 'Kurze Ansagen: Bereit, Pause, Seitenwechsel'),
      row('Vibration', toggle(S.vibrate, (v) => set({ vibrate: v })), 'Nur auf Geräten, die das unterstützen'),
      h('button', { type: 'button', class: 'btn', style: 'margin-top:10px', onclick: () => { snd.unlock(); snd.cue.preview(); snd.preloadVoice(['rest']); snd.say('rest', 3300); } }, icon('volume'), 'Ton testen')),

    h('p', { class: 'section-title' }, 'Training'),
    h('div', { class: 'card' },
      row('Vorbereitung', stepper({ value: S.prep, min: 3, max: 30, step: 1, unit: ' s', label: 'Vorbereitung', onChange: (v) => set({ prep: v }) }), 'Countdown vor der ersten Übung'),
      row('Wochenziel', stepper({ value: S.weeklyGoal, min: 1, max: 7, step: 1, unit: '×', label: 'Wochenziel', onChange: (v) => set({ weeklyGoal: v }) }), 'Trainings pro Woche'),
      row('Bildschirm anlassen', toggle(S.keepAwake, (v) => set({ keepAwake: v })), 'Verhindert die Bildschirmsperre im Training')),

    h('p', { class: 'section-title' }, 'Darstellung'),
    h('div', { class: 'card' },
      row('Design', seg([['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']], S.theme, (k) => set({ theme: k }))),
      row('Farbe', h('div', { class: 'swatches' }, [['blue', '#2f7df6'], ['green', '#14a86f'], ['violet', '#7a5cff'], ['orange', '#f2780c'], ['pink', '#e5489b']].map(([k, c]) =>
        h('button', { type: 'button', class: 'swatch' + (S.accent === k ? ' on' : ''), style: `background:${c}`, 'aria-label': k, onclick: () => set({ accent: k }) }))))),

    h('p', { class: 'section-title' }, 'Daten'),
    h('div', { class: 'card' },
      importer,
      h('p', { class: 'muted small', style: 'margin-top:0' }, 'Deine eigenen Übungen, Programme und Fotos liegen nur auf diesem Gerät. Mit einer Sicherung kannst du sie auf ein anderes Gerät mitnehmen.'),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', onclick: () => download(`dehnen-sicherung-${new Date().toISOString().slice(0, 10)}.json`, st.exportData()) }, 'Sichern'),
        h('button', { type: 'button', class: 'btn', onclick: () => importer.click() }, 'Einspielen')),
      h('button', { type: 'button', class: 'btn danger', style: 'margin-top:10px', onclick: async () => {
        if (await confirmDialog('Eigene Übungen, Programme, Verlauf und Einstellungen werden gelöscht.', { ok: 'Alles löschen', title: 'Alles zurücksetzen?' })) { st.resetAll(); toast('Zurückgesetzt'); }
      } }, 'Alles zurücksetzen')),

    !standalone ? h('div', { class: 'card' }, h('h2', {}, 'Als App installieren'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'iPhone/iPad: In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“. Android: In Chrome Menü ⋮ → „App installieren“.')) : null,
    h('p', { id: 'offline-status', class: 'muted small', style: 'text-align:center' }, offlineReady ? 'Offline verfügbar' : ''));
}
