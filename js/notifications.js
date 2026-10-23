// Push-Erinnerungen: Abo im Browser anlegen und Tage/Uhrzeit an den Erinnerungs-Server (Cloudflare Worker) melden.
import { settings, updateSettings } from './store.js';
import { REMINDER_API, VAPID_PUBLIC_KEY } from './config.js';
import { lang } from './i18n.js';

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const configured = () => Boolean(REMINDER_API && VAPID_PUBLIC_KEY);

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin';

function keyBytes(b64url) {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function post(path, body) {
  const res = await fetch(REMINDER_API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `push.server:${res.status}`);
  return json;
}

async function getSubscription(create) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  return sub;
}

// Tage, Uhrzeit und Zeitzone an den Server melden.
export async function sync(existing) {
  const S = settings();
  const sub = existing || (await getSubscription(false));
  if (!sub) return;
  await post('/subscribe', { subscription: sub.toJSON(), days: S.remindDays, time: S.remindTime, tz: timeZone(), lang: lang() });
}

export async function enable() {
  if (!supported()) throw new Error('push.unsupported');
  if (!configured()) throw new Error('plan.hint.noserver');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('push.denied');
  const sub = await getSubscription(true);
  await sync(sub);
  updateSettings({ remindOn: true });
}

export async function disable() {
  updateSettings({ remindOn: false });
  try {
    const sub = await getSubscription(false);
    if (sub) {
      try { await post('/unsubscribe', { endpoint: sub.endpoint }); } catch { /* Server nicht erreichbar */ }
      await sub.unsubscribe();
    }
  } catch { /* ignorieren */ }
}

// Beim Start: Abo erneuern (läuft sonst nach Monaten ab) und Einstellungen abgleichen.
export async function refresh() {
  if (!settings().remindOn || !supported() || !configured() || Notification.permission !== 'granted') return;
  try { await sync(await getSubscription(true)); } catch { /* offline */ }
}

// Nach einem abgeschlossenen Training: heute nicht mehr erinnern.
export async function markTrained() {
  if (!settings().remindOn || !configured()) return;
  try {
    const sub = await getSubscription(false);
    if (sub) await post('/trained', { endpoint: sub.endpoint });
  } catch { /* offline */ }
}

export async function sendTest() {
  const sub = await getSubscription(false);
  if (!sub) throw new Error('push.off');
  await post('/test', { endpoint: sub.endpoint });
}
