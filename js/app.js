// Einstieg: Daten laden, Darstellung anwenden, Oberflächen und Service Worker starten.
import * as st from './store.js';
import { initViews, setOfflineReady } from './views.js';
import { initTraining } from './training.js';
import { refresh as refreshReminders } from './notifications.js';

const ACCENT_THEME_COLOR = { blue: '#2f7df6', green: '#14a86f', violet: '#7a5cff', orange: '#f2780c', pink: '#e5489b' };

function applyAppearance() {
  const S = st.settings();
  const root = document.documentElement;
  if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = S.theme;
  root.dataset.accent = S.accent;
  document.querySelector('meta[name=theme-color]').content = ACCENT_THEME_COLOR[S.accent] || '#2f7df6';
}

async function init() {
  try {
    await st.init();
  } catch {
    document.getElementById('main').textContent = 'Übungsdaten konnten nicht geladen werden.';
    return;
  }
  applyAppearance();
  st.onChange(applyAppearance);
  initViews();
  initTraining();

  if ('serviceWorker' in navigator) {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      let reloaded = false;
      // Neue App-Version übernommen: Seite einmal neu laden (nicht mitten im Training).
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded || document.body.classList.contains('busy')) return;
        reloaded = true;
        location.reload();
      });
      await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      await navigator.serviceWorker.ready;
      setOfflineReady(true);
      refreshReminders();
    } catch { /* ohne Service Worker (z. B. file://) läuft die App nur online */ }
  }
}
init();
