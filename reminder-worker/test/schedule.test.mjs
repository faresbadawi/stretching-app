import test from 'node:test';
import assert from 'node:assert/strict';
import { isDue, localParts, validSettings, timeFor } from '../src/schedule.js';

const sub = (o = {}) => ({ days: [0, 2, 4], time: '18:00', tz: 'Europe/Berlin', lastSent: null, lastTrained: null, ...o });

test('localParts: Berliner Zeit im Winter (UTC+1)', () => {
  // Mittwoch 2026-01-14 17:00 UTC = 18:00 Berlin
  const p = localParts(new Date('2026-01-14T17:00:00Z'), 'Europe/Berlin');
  assert.deepEqual(p, { day: 2, minutes: 1080, date: '2026-01-14' });
});
test('localParts: Sommerzeit (UTC+2) und Tageswechsel', () => {
  const p = localParts(new Date('2026-07-14T22:30:00Z'), 'Europe/Berlin'); // Dienstag 22:30 UTC = Mittwoch 00:30
  assert.equal(p.day, 2); assert.equal(p.date, '2026-07-15'); assert.equal(p.minutes, 30);
});
test('fällig am Trainingstag zur Uhrzeit', () => {
  assert.equal(isDue(sub(), new Date('2026-01-14T17:00:00Z')), true);   // Mi 18:00
  assert.equal(isDue(sub(), new Date('2026-01-14T17:20:00Z')), true);   // bis 30 min später
  assert.equal(isDue(sub(), new Date('2026-01-14T17:31:00Z')), false);
  assert.equal(isDue(sub(), new Date('2026-01-14T16:55:00Z')), false);  // zu früh
});
test('nicht fällig an anderen Tagen', () => {
  assert.equal(isDue(sub(), new Date('2026-01-15T17:00:00Z')), false); // Donnerstag
});
test('nicht fällig, wenn schon erinnert oder trainiert', () => {
  assert.equal(isDue(sub({ lastSent: '2026-01-14' }), new Date('2026-01-14T17:00:00Z')), false);
  assert.equal(isDue(sub({ lastTrained: '2026-01-14' }), new Date('2026-01-14T17:00:00Z')), false);
  assert.equal(isDue(sub({ lastSent: '2026-01-12' }), new Date('2026-01-14T17:00:00Z')), true);
});
test('Zeitzone des Nutzers zählt', () => {
  assert.equal(isDue(sub({ tz: 'America/New_York' }), new Date('2026-01-14T23:00:00Z')), true); // 18:00 New York
});
test('validSettings', () => {
  assert.equal(validSettings({ days: [0, 3], time: '07:30', tz: 'Europe/Berlin' }), true);
  assert.equal(validSettings({ days: [], time: '07:30', tz: 'Europe/Berlin' }), false);
  assert.equal(validSettings({ days: [7], time: '07:30', tz: 'Europe/Berlin' }), false);
  assert.equal(validSettings({ days: [1], time: '25:00', tz: 'Europe/Berlin' }), false);
  assert.equal(validSettings({ days: [1], time: '07:30', tz: 'Nope/Zone' }), false);
});

test('eigene Uhrzeit pro Tag', () => {
  const s = sub({ times: { 2: '07:00' } }); // Mittwoch 07:00, sonst 18:00
  assert.equal(timeFor(s, 2), '07:00'); assert.equal(timeFor(s, 0), '18:00');
  assert.equal(isDue(s, new Date('2026-01-14T06:00:00Z')), true);   // Mi 07:00 Berlin
  assert.equal(isDue(s, new Date('2026-01-14T17:00:00Z')), false);  // 18:00 gilt nicht mehr am Mittwoch
  assert.equal(validSettings({ days: [2], time: '18:00', times: { 2: '07:00' }, tz: 'Europe/Berlin' }), true);
  assert.equal(validSettings({ days: [2], time: '18:00', times: { 9: '07:00' }, tz: 'Europe/Berlin' }), false);
  assert.equal(validSettings({ days: [2], time: '18:00', times: { 2: '7:00' }, tz: 'Europe/Berlin' }), false);
});
