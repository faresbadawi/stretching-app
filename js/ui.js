// Kleine UI-Helfer: Elemente bauen, Symbole, Bottom-Sheets, Dialoge, Toasts, Konfetti.

export const $ = (id) => document.getElementById(id);

export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'value' || k === 'checked' || k === 'disabled') e[k] = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

// Ersetzt den Inhalt eines Elements; null/false werden übersprungen.
export function fill(el, ...kids) {
  el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
  return el;
}

// Strich-Symbole (24x24), im Stil von Fitness-Apps. Farbe folgt currentColor.
const P = {
  play: '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor" stroke="none"/>',
  prev: '<path d="M18 6v12L9.5 12 18 6Z" fill="currentColor"/><path d="M6.5 6v12"/>',
  next: '<path d="M6 6v12l8.5-6L6 6Z" fill="currentColor"/><path d="M17.5 6v12"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM14 8l3 3"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7A2.2 2.2 0 0 0 13.3 4.5H6.7A2.2 2.2 0 0 0 4.5 6.7v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8Z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z"/><circle cx="12" cy="13" r="3.4"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 4.5-4.5L13 16l2.5-2.5L20 18"/>',
  flame: '<path d="M12 3c.6 3 4.5 4.8 4.5 9.2A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.8c0-1.6.7-2.7 1.6-3.6.3 1.2.9 1.9 1.7 2.2C10.4 8 10.6 5.4 12 3Z"/><path d="M9.5 17.5c.6 1.7 1.5 2.5 2.5 2.5s1.9-.8 2.5-2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  trophy: '<path d="M8 4.5h8v5a4 4 0 0 1-8 0v-5ZM8 6.5H5.2c0 2.5 1 4 3 4.5M16 6.5h2.8c0 2.5-1 4-3 4.5M12 13.5V17M8.5 19.5h7M10 17h4"/>',
  bolt: '<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12L13 3Z"/>',
  // Tabs
  tabHome: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 4v2.2M20 12h-2.2"/>',
  tabPlans: '<path d="M5 6.5h14M5 12h14M5 17.5h9"/><circle cx="18" cy="17.5" r="1.6" fill="currentColor"/>',
  tabLibrary: '<circle cx="12" cy="5.4" r="1.9"/><path d="M12 8.2v5.3M12 10.2 7 8.6M12 10.2l5-1.6M12 13.5l-3.3 6M12 13.5l3.3 6"/>',
  tabSettings: '<path d="M5 8h9M18 8h1M5 16h1M10 16h9"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  // Sportsymbole (Platzhalter für Übungen ohne Bild)
  figure: '<circle cx="12" cy="5" r="2"/><path d="M12 8v6M12 10 6.5 8.5M12 10l5.5-1.5M12 14l-3.5 6M12 14l3.5 6"/>',
  dumbbell: '<path d="M7 8v8M17 8v8M4.5 10v4M19.5 10v4M7 12h10"/>',
  mat: '<path d="M3.5 15.5 17 14.2l3.5 1.6-13.5 1.3-3.5-1.6Z"/><circle cx="8" cy="9" r="1.8"/><path d="M9.8 9.8 14 13.4"/>',
  volume: '<path d="M5 9.5h3l4-3.5v12l-4-3.5H5v-5ZM15.5 9a4 4 0 0 1 0 6M18 6.8a7 7 0 0 1 0 10.4"/>',
  heart: '<path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 7.8a3.9 3.9 0 0 1 7 2.3c0 5.1-7 9.4-7 9.4Z"/>'
};

export function icon(name, cls = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'ico ' + cls);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.9');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = P[name] || '';
  return s;
}

export function iconBtn(name, label, onClick, cls = '') {
  return h('button', { class: 'icon-btn ' + cls, type: 'button', 'aria-label': label, title: label, onclick: onClick }, icon(name));
}

// Platzhalter für Übungen ohne Bild: Farbfläche mit Sport-Symbol.
export function placeholder(category = '') {
  const sym = /Bein|Hüfte/.test(category) ? 'dumbbell' : /Ganz|Entsp|Rücken/.test(category) ? 'mat' : 'figure';
  return h('div', { class: 'ph' }, icon(sym));
}
export function thumb(ex, cls = 'thumb') {
  return ex.image
    ? h('img', { class: cls, src: ex.image, alt: '', loading: 'lazy', draggable: 'false' })
    : h('div', { class: cls + ' thumb-ph' }, icon('figure'));
}

/* ---------- Bedienelemente ---------- */

export function stepper({ value, min, max, step = 1, unit = '', format, onChange, label = '' }) {
  const out = h('output', {}, '');
  const show = () => { out.textContent = format ? format(value) : value + unit; };
  const set = (d) => {
    value = Math.min(max, Math.max(min, value + d * step));
    show(); onChange(value);
  };
  show();
  return h('div', { class: 'stepper', role: 'group', 'aria-label': label },
    h('button', { type: 'button', 'aria-label': 'weniger', onclick: () => set(-1) }, icon('minus')),
    out,
    h('button', { type: 'button', 'aria-label': 'mehr', onclick: () => set(1) }, icon('plus')));
}

export function toggle(checked, onChange, label = '') {
  return h('input', { type: 'checkbox', class: 'switch', checked, 'aria-label': label, onchange: (e) => onChange(e.target.checked) });
}

export function row(label, control, hint) {
  return h('div', { class: 'row' },
    h('div', { class: 'row-text' }, h('div', { class: 'row-label' }, label), hint ? h('div', { class: 'row-hint' }, hint) : null),
    control);
}

export function chips(items, active, onPick) {
  return h('div', { class: 'chips', role: 'tablist' }, items.map(({ key, label, iconName }) =>
    h('button', { type: 'button', class: 'chip' + (key === active ? ' on' : ''), onclick: () => onPick(key) },
      iconName ? icon(iconName) : null, label)));
}

/* ---------- Sheets & Dialoge ---------- */

export function openSheet({ title, body, foot, onClose, tall = false }) {
  const dlg = h('dialog', { class: 'sheet' + (tall ? ' tall' : '') });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dlg.classList.add('closing');
    setTimeout(() => { dlg.close(); dlg.remove(); onClose && onClose(); }, 190);
  };
  dlg.append(
    h('div', { class: 'sheet-grab' }),
    h('div', { class: 'sheet-head' }, h('h2', {}, title || ''), iconBtn('close', 'Schließen', close, 'flat')),
    h('div', { class: 'sheet-body' }, body),
    foot ? h('div', { class: 'sheet-foot' }, foot) : null);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  return { close, dlg, body: dlg.querySelector('.sheet-body') };
}

export function confirmDialog(text, { ok = 'Löschen', danger = true, title = 'Bist du sicher?' } = {}) {
  return new Promise((resolve) => {
    let answer = false;
    const sheet = openSheet({
      title,
      body: h('p', { class: 'muted' }, text),
      foot: [
        h('button', { class: 'btn', type: 'button', onclick: () => sheet.close() }, 'Abbrechen'),
        h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'button', onclick: () => { answer = true; sheet.close(); } }, ok)
      ],
      onClose: () => resolve(answer)
    });
  });
}

let toastTimer = null;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
export const minutesLabel = (sec) => `ca. ${Math.max(1, Math.round(sec / 60))} Min`;

/* ---------- Konfetti ---------- */

export function confetti() {
  const cv = $('confetti');
  if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.style.display = 'block';
  const colors = ['#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#ffffff', '#ff9f1c'];
  const parts = Array.from({ length: 110 }, () => ({
    x: innerWidth / 2, y: innerHeight * 0.42,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[(Math.random() * colors.length) | 0]
  }));
  let frames = 0;
  (function step() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save();
      ctx.translate(p.x * dpr, p.y * dpr); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s * dpr / 2, -p.s * dpr / 3, p.s * dpr, p.s * dpr * 0.6);
      ctx.restore();
    }
    if (++frames < 150) requestAnimationFrame(step);
    else { ctx.clearRect(0, 0, cv.width, cv.height); cv.style.display = 'none'; }
  })();
}

/* ---------- Bilder verkleinern ---------- */

export function resizeImage(file, max = 640) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const c = cv.getContext('2d');
      c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
      c.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      let out = cv.toDataURL('image/webp', 0.82);
      if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', 0.82);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden.')); };
    img.src = url;
  });
}
