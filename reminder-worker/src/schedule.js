// Zeitlogik der Erinnerungen (rein, ohne Cloudflare-Abhängigkeiten, daher testbar).

const DAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function validTimeZone(tz) {
  try { new Intl.DateTimeFormat('de-DE', { timeZone: tz }); return true; } catch { return false; }
}

// Wochentag (Mo=0), Minuten seit Mitternacht und Datum (YYYY-MM-DD) in der Zeitzone des Nutzers.
export function localParts(date, tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: validTimeZone(tz) ? tz : 'Europe/Berlin',
    weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return {
    day: DAY_INDEX[parts.weekday],
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`
  };
}

// Fällig: heute ein Trainingstag, Uhrzeit erreicht (bis 30 Minuten später, falls ein Lauf ausfällt),
// heute noch nicht erinnert und noch nicht trainiert.
// Uhrzeit für einen Wochentag: eigene Zeit des Tages, sonst die allgemeine.
export const timeFor = (sub, day) => sub.times?.[day] ?? sub.time;

export function isDue(sub, now = new Date()) {
  const { day, minutes, date } = localParts(now, sub.tz);
  if (!sub.days.includes(day)) return false;
  if (sub.lastSent === date || sub.lastTrained === date) return false;
  const [h, m] = timeFor(sub, day).split(':').map(Number);
  const target = h * 60 + m;
  return minutes >= target && minutes < target + 30;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const validTimes = (times) => times === undefined
  || (times !== null && typeof times === 'object' && !Array.isArray(times)
    && Object.entries(times).every(([d, v]) => /^[0-6]$/.test(d) && typeof v === 'string' && TIME_RE.test(v)));

export function validSettings({ days, time, tz, times }) {
  return validTimes(times) && Array.isArray(days) && days.length > 0 && days.length <= 7 && days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    && typeof time === 'string' && TIME_RE.test(time)
    && typeof tz === 'string' && validTimeZone(tz);
}
