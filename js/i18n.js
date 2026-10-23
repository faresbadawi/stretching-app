// Mehrsprachigkeit: Deutsch, Englisch, Arabisch (von rechts nach links).
import de from './lang/de.js';
import en from './lang/en.js';
import ar from './lang/ar.js';

const DICTS = { de, en, ar };
export const LANGS = [['de', 'Deutsch'], ['en', 'English'], ['ar', 'العربية']];
let current = 'de';

// pref: 'auto' | 'de' | 'en' | 'ar'. Bei 'auto' zählt die Sprache des Geräts (andere Sprachen: Englisch).
export function resolveLang(pref) {
  if (DICTS[pref]) return pref;
  const n = (navigator.language || 'de').slice(0, 2).toLowerCase();
  return DICTS[n] ? n : 'en';
}

export function setLang(l) {
  current = DICTS[l] ? l : 'de';
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
  document.title = t('app.title');
}

export const lang = () => current;
export const isRtl = () => current === 'ar';
export const locale = () => ({ de: 'de-DE', en: 'en-GB', ar: 'ar' })[current];

export function t(key, vars = {}) {
  let v = DICTS[current][key] ?? DICTS.de[key] ?? key;
  if (typeof v === 'function') v = v(vars);
  return String(v).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

// Fehlermeldungen tragen einen Übersetzungsschlüssel; unbekannte Texte bleiben unverändert.
export function tm(msg) {
  if (!msg) return msg;
  const [key, n] = msg.split(':');
  return DICTS[current][key] !== undefined ? t(key, { n }) : msg;
}

// Kategorie-Namen: mitgelieferte (deutsche Schlüssel) werden übersetzt, eigene bleiben wie getippt.
export const catLabel = (c) => DICTS[current]['cat.' + c] ?? c;

// Texte im festen HTML (data-i18n, data-i18n-aria).
export function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
