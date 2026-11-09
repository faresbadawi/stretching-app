// Einstieg: Daten laden, Darstellung anwenden, Oberflächen und Service Worker starten.
import * as st from './store.js';
import { initViews, setOfflineReady } from './views.js';
import { initTraining, labelTraining } from './training.js';
import { setLang, resolveLang, applyStatic } from './i18n.js';
import { refresh as refreshReminders } from './notifications.js';


function applyAppearance() {
  const S = st.settings();
  const root = document.documentElement;
  if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = S.theme;
  root.dataset.accent = S.accent;
  // Statusleiste des Geräts in der Farbe des Hintergrunds (hell/dunkel)
  document.querySelector('meta[name=theme-color]').content = getComputedStyle(root).getPropertyValue('--bg').trim() || '#f4f5f8';
  setLang(resolveLang(S.lang));
  applyStatic();
  labelTraining();
}

// Kurzes Vibrations-Feedback bei Knöpfen (nur wenn Vibration eingeschaltet ist)
document.addEventListener('click', (e) => {
  if (st.settings && navigator.vibrate && e.target.closest?.('.btn, .icon-btn, .chip, .dp, .tabbar button, .t-ctl, .stepper button')) {
    try { if (st.settings().vibrate) navigator.vibrate(8); } catch { /* noch nicht geladen */ }
  }
}, true);

async function init() {
  try {
    await st.init();
  } catch {
    document.getElementById('main').textContent = 'Übungsdaten konnten nicht geladen werden.';
    return;
  }
  applyAppearance();
  st.onChange(applyAppearance);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyAppearance);
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
