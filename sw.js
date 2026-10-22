// Service Worker: legt alle App-Dateien beim ersten Besuch im Cache ab -> komplett offline nutzbar.
// Die Liste unten wird von `node tools/update-sw.mjs` erzeugt (vor jedem Veröffentlichen ausführen).
/* BEGIN GENERATED */
const CACHE = 'stretching-8f54838be4';
const FILES = [
  "./",
  "./css/style.css",
  "./data/exercises.json",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./images/man/beinheben.webp",
  "./images/man/brustoeffnung.webp",
  "./images/man/herabschauender-hund.webp",
  "./images/man/hueftbeuger-dehnung.webp",
  "./images/man/katzen-kuh-dehnung.webp",
  "./images/man/kindspose.webp",
  "./images/man/kobra-stretch.webp",
  "./images/man/nacken-dehnen.webp",
  "./images/man/oberschenkelvorderseite.webp",
  "./images/man/rumpfdrehung.webp",
  "./images/man/schmetterlingssitz.webp",
  "./images/man/schulter-stretch.webp",
  "./images/man/schulterkreisen.webp",
  "./images/man/seitbeuge.webp",
  "./images/man/vorwaertsbeuge.webp",
  "./images/man/wadendehnung.webp",
  "./index.html",
  "./js/app.js",
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
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('stretching-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(event.request).catch(() => (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});

// --- Vorbereitung für spätere Push-Benachrichtigungen (noch nicht aktiv) ---
// self.addEventListener('push', (event) => {
//   const d = event.data ? event.data.json() : { title: 'Zeit zum Dehnen!', body: 'Dein 10-Minuten-Programm wartet.' };
//   event.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }));
// });
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close();
//   event.waitUntil(self.clients.openWindow('./'));
// });
