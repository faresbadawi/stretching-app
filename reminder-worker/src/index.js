// Cloudflare Worker: speichert Push-Abos der Dehnen-App und schickt zur eingestellten Uhrzeit eine Erinnerung.
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { isDue, localParts, validSettings } from './schedule.js';

// Nur echte Push-Dienste der Browser als Ziel erlauben (kein Missbrauch als Weiterleitung).
const PUSH_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];
const MAX_SUBS = 100;
const MAX_AGE = 60 * 60 * 24 * 120; // Abos, die 120 Tage nicht erneuert wurden, verfallen

const LANGS = ['de', 'en', 'ar'];
const TEXTS = {
  de: { title: 'Zeit zum Dehnen', bodies: ['Zeit zum Dehnen – 10 Minuten für deinen Rücken.', 'Dein Dehnprogramm wartet auf dich.', 'Kurze Pause vom Sitzen: Zeit für deine Übungen.'], test: ['Test-Erinnerung', 'So sieht deine Erinnerung aus.'] },
  en: { title: 'Time to stretch', bodies: ['Time to stretch – 10 minutes for your back.', 'Your stretching routine is waiting for you.', 'Take a break from sitting: time for your exercises.'], test: ['Test reminder', 'This is what your reminder looks like.'] },
  ar: { title: 'حان وقت التمدد', bodies: ['حان وقت التمدد – 10 دقائق لظهرك.', 'برنامج التمدد بانتظارك.', 'استرح من الجلوس: حان وقت تمارينك.'], test: ['تذكير تجريبي', 'هكذا سيبدو تذكيرك.'] }
};
const textsFor = (rec) => TEXTS[LANGS.includes(rec.lang) ? rec.lang : 'de'];

const cors = (env, req) => {
  const origin = req.headers.get('origin') || '';
  const ok = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).includes(origin);
  return {
    'access-control-allow-origin': ok ? origin : 'null',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin'
  };
};
const json = (env, req, body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(env, req) } });

async function keyFor(endpoint) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return 'sub:' + [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname))
      && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string'
      && s.endpoint.length < 600 && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
  } catch { return false; }
}

async function push(env, subscription, message) {
  const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const payload = await buildPushPayload({ data: JSON.stringify(message), options: { ttl: 6 * 3600, urgency: 'normal' } }, subscription, vapid);
  return fetch(subscription.endpoint, payload);
}

async function handle(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) });
  if (req.method !== 'POST') return json(env, req, { ok: false, error: 'POST erwartet' }, 405);
  const { pathname } = new URL(req.url);
  let body;
  try {
    const text = await req.text();
    if (text.length > 4000) return json(env, req, { ok: false, error: 'zu groß' }, 413);
    body = JSON.parse(text);
  } catch { return json(env, req, { ok: false, error: 'ungültiges JSON' }, 400); }

  if (pathname === '/subscribe') {
    const { subscription } = body;
    if (!validSubscription(subscription) || !validSettings(body)) return json(env, req, { ok: false, error: 'ungültige Daten' }, 400);
    const key = await keyFor(subscription.endpoint);
    const old = await env.SUBS.get(key, 'json');
    if (!old) {
      const { keys } = await env.SUBS.list({ prefix: 'sub:', limit: MAX_SUBS + 1 });
      if (keys.length >= MAX_SUBS) return json(env, req, { ok: false, error: 'Server voll' }, 429);
    }
    const rec = { subscription: { endpoint: subscription.endpoint, expirationTime: null, keys: subscription.keys },
      days: [...new Set(body.days)].sort(), time: body.time, tz: body.tz, lang: LANGS.includes(body.lang) ? body.lang : 'de', lastSent: old?.lastSent || null, lastTrained: old?.lastTrained || null, lastTest: old?.lastTest || 0 };
    await env.SUBS.put(key, JSON.stringify(rec), { expirationTtl: MAX_AGE });
    return json(env, req, { ok: true });
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  const key = await keyFor(endpoint);
  const rec = await env.SUBS.get(key, 'json');

  if (pathname === '/unsubscribe') {
    await env.SUBS.delete(key);
    return json(env, req, { ok: true });
  }
  if (!rec) return json(env, req, { ok: false, error: 'nicht angemeldet' }, 404);

  if (pathname === '/trained') {
    rec.lastTrained = localParts(new Date(), rec.tz).date;
    await env.SUBS.put(key, JSON.stringify(rec), { expirationTtl: MAX_AGE });
    return json(env, req, { ok: true });
  }
  if (pathname === '/test') {
    if (Date.now() - (rec.lastTest || 0) < 20000) return json(env, req, { ok: false, error: 'bitte kurz warten' }, 429);
    rec.lastTest = Date.now();
    await env.SUBS.put(key, JSON.stringify(rec), { expirationTtl: MAX_AGE });
    const [title, text] = textsFor(rec).test;
    const res = await push(env, rec.subscription, { title, body: text });
    return json(env, req, { ok: res.ok, status: res.status });
  }
  return json(env, req, { ok: false, error: 'unbekannt' }, 404);
}

async function runSchedule(env) {
  const now = new Date();
  let cursor;
  do {
    const page = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const { name } of page.keys) {
      const rec = await env.SUBS.get(name, 'json');
      if (!rec || !isDue(rec, now)) continue;
      try {
        const tx = textsFor(rec);
        const res = await push(env, rec.subscription, { title: tx.title, body: tx.bodies[Math.floor(Math.random() * tx.bodies.length)] });
        if (res.status === 404 || res.status === 410) { await env.SUBS.delete(name); continue; }
        if (res.ok) {
          rec.lastSent = localParts(now, rec.tz).date;
          await env.SUBS.put(name, JSON.stringify(rec), { expirationTtl: MAX_AGE });
        }
      } catch (err) { console.log('push failed', name.slice(0, 12), String(err)); }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export default {
  fetch: (req, env) => handle(req, env).catch((err) => { console.log(String(err)); return json(env, req, { ok: false, error: 'Fehler' }, 500); }),
  scheduled: (event, env, ctx) => { ctx.waitUntil(runSchedule(env)); }
};
