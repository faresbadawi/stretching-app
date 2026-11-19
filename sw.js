// Service Worker: legt alle App-Dateien beim ersten Besuch im Cache ab -> komplett offline nutzbar.
// Die Liste unten wird von `node tools/update-sw.mjs` erzeugt (vor jedem Veröffentlichen ausführen).
/* BEGIN GENERATED */
const CACHE = 'stretching-57086a54a7';
const FILES = [
  "./",
  "./audio/applause.mp3",
  "./audio/voice/ar/complete.mp3",
  "./audio/voice/ar/get-ready.mp3",
  "./audio/voice/ar/rest.mp3",
  "./audio/voice/ar/switch.mp3",
  "./audio/voice/de/complete.mp3",
  "./audio/voice/de/get-ready.mp3",
  "./audio/voice/de/rest.mp3",
  "./audio/voice/de/switch.mp3",
  "./audio/voice/en/complete.mp3",
  "./audio/voice/en/get-ready.mp3",
  "./audio/voice/en/rest.mp3",
  "./audio/voice/en/switch.mp3",
  "./css/style.css",
  "./data/exercises.json",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./images/man/abrollen-start.webp",
  "./images/man/abrollen.webp",
  "./images/man/adduktoren-stehend.webp",
  "./images/man/band-adduktoren.webp",
  "./images/man/band-beinrueckseite.webp",
  "./images/man/band-brust.webp",
  "./images/man/band-hintere-schulter.webp",
  "./images/man/band-latissimus.webp",
  "./images/man/band-oberschenkel-aussen.webp",
  "./images/man/band-schulter.webp",
  "./images/man/band-sprunggelenk.webp",
  "./images/man/band-trizeps.webp",
  "./images/man/band-vierer.webp",
  "./images/man/band-wade.webp",
  "./images/man/bank-adduktoren.webp",
  "./images/man/bank-beinrueckseite.webp",
  "./images/man/bank-brust.webp",
  "./images/man/bank-couch.webp",
  "./images/man/bank-kindspose.webp",
  "./images/man/bank-latissimus.webp",
  "./images/man/bank-split.webp",
  "./images/man/bank-sprunggelenk.webp",
  "./images/man/bank-vierer-gesaess.webp",
  "./images/man/bank-wade.webp",
  "./images/man/beine-an-der-wand.webp",
  "./images/man/beinheben-start.webp",
  "./images/man/beinheben.webp",
  "./images/man/beinrueckseite-wand.webp",
  "./images/man/beinschwingen-seitlich-start.webp",
  "./images/man/beinschwingen-seitlich.webp",
  "./images/man/beinschwingen-start.webp",
  "./images/man/beinschwingen.webp",
  "./images/man/bequemer-sitz.webp",
  "./images/man/berghaltung.webp",
  "./images/man/brustoeffnung.webp",
  "./images/man/drehung-liegend.webp",
  "./images/man/dreieck.webp",
  "./images/man/eidechse.webp",
  "./images/man/entspannungslage.webp",
  "./images/man/fisch.webp",
  "./images/man/frosch.webp",
  "./images/man/graetsche.webp",
  "./images/man/halber-spagat-start.webp",
  "./images/man/halber-spagat.webp",
  "./images/man/handgelenke.webp",
  "./images/man/happy-baby.webp",
  "./images/man/heldensitz.webp",
  "./images/man/herabschauender-hund.webp",
  "./images/man/heraufschauender-hund.webp",
  "./images/man/hueftbeuger-dehnung.webp",
  "./images/man/hueftbeuger-wippen-start.webp",
  "./images/man/hueftbeuger-wippen.webp",
  "./images/man/hund-ausfallschritt-start.webp",
  "./images/man/hund-ausfallschritt.webp",
  "./images/man/hund-fersenwippen-start.webp",
  "./images/man/hund-fersenwippen.webp",
  "./images/man/kamel.webp",
  "./images/man/katzen-kuh-dehnung.webp",
  "./images/man/katzenbuckel.webp",
  "./images/man/kindspose.webp",
  "./images/man/kinn-zurueck.webp",
  "./images/man/knie-zur-brust.webp",
  "./images/man/kobra-stretch.webp",
  "./images/man/kopf-zum-knie.webp",
  "./images/man/kuhgesicht.webp",
  "./images/man/nacken-dehnen.webp",
  "./images/man/nadeloehr-wechsel-start.webp",
  "./images/man/nadeloehr-wechsel.webp",
  "./images/man/nadeloehr.webp",
  "./images/man/oberschenkel-liegend.webp",
  "./images/man/oberschenkelvorderseite.webp",
  "./images/man/pflug.webp",
  "./images/man/pyramide.webp",
  "./images/man/rumpf-drehen.webp",
  "./images/man/rumpfdrehung.webp",
  "./images/man/saege-start.webp",
  "./images/man/saege.webp",
  "./images/man/schmetterling-liegend.webp",
  "./images/man/schmetterlingssitz.webp",
  "./images/man/schulter-stretch.webp",
  "./images/man/seitbeuge-wechsel-start.webp",
  "./images/man/seitbeuge-wechsel.webp",
  "./images/man/seitbeuge.webp",
  "./images/man/sitz-90-90-zurueck.webp",
  "./images/man/sitz-90-90.webp",
  "./images/man/sphinx.webp",
  "./images/man/standspagat.webp",
  "./images/man/taube.webp",
  "./images/man/tiefe-hocke.webp",
  "./images/man/tiefer-ausfallschritt.webp",
  "./images/man/trizeps.webp",
  "./images/man/vorbeuge-aufrichten-start.webp",
  "./images/man/vorbeuge-aufrichten.webp",
  "./images/man/vorbeuge-sitzend.webp",
  "./images/man/vorwaertsbeuge.webp",
  "./images/man/wadendehnung.webp",
  "./images/man/wechsel-90-90-start.webp",
  "./images/man/wechsel-90-90.webp",
  "./images/man/weite-vorbeuge.webp",
  "./images/man/welpe.webp",
  "./images/man/wirbelsaeule-drehen-start.webp",
  "./images/man/wirbelsaeule-drehen.webp",
  "./images/man/wirbelsaeule-vorbeuge-start.webp",
  "./images/man/wirbelsaeule-vorbeuge.webp",
  "./images/man/worlds-greatest-stretch-start.webp",
  "./images/man/worlds-greatest-stretch.webp",
  "./index.html",
  "./js/app.js",
  "./js/config.js",
  "./js/i18n.js",
  "./js/lang/ar.js",
  "./js/lang/de.js",
  "./js/lang/en.js",
  "./js/notifications.js",
  "./js/sound.js",
  "./js/store.js",
  "./js/training.js",
  "./js/ui.js",
  "./js/views.js",
  "./manifest.webmanifest"
];
/* END GENERATED */

self.addEventListener('install', (event) => {
  // cache: 'reload' umgeht den HTTP-Cache des Browsers/Servers, damit nie alte und neue Dateien gemischt werden.
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(FILES.map((f) => fetch(new Request(f, { cache: 'reload' })).then((res) => {
        if (!res.ok) throw new Error(f + ' ' + res.status);
        return cache.put(f, res);
      }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('stretching-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Bilder und Icons: Cache zuerst (ändern sich nie). Alles andere: Netz zuerst, Cache als Offline-Rückfall.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isAsset = /\/(images|icons)\//.test(req.url);
  event.respondWith(
    isAsset
      ? caches.match(req).then((hit) => hit || fetch(req))
      : fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});

// --- Push-Erinnerungen ---
self.addEventListener('push', (event) => {
  let d = { title: 'Zeit zum Dehnen', body: 'Dein Dehnprogramm wartet auf dich.' };
  try { if (event.data) d = { ...d, ...event.data.json() }; } catch { /* Standardtext */ }
  event.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'dehnen-reminder', data: { url: './' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  })());
});
