// Synthetisierte Signale (keine Audiodateien nötig, funktioniert offline) und Sprachansagen.
import { settings } from './store.js';

let ctx = null;
let master = null;

export function unlock() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = settings().volume;
  } catch { ctx = null; }
}

function ready() {
  if (!settings().sound || !ctx) return false;
  master.gain.value = settings().volume;
  return true;
}

// Glockenartiger Klang: Grundton plus Obertöne mit unterschiedlichem Ausklang.
function bell(freq, delay = 0, vol = 0.35, dur = 1.2) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  [[1, 1], [2.01, 0.35], [2.99, 0.18], [4.17, 0.09]].forEach(([mul, amp], k) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mul;
    const d = dur / (1 + k * 0.9);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + d + 0.05);
  });
}

// Kurzer, weicher Klick (Marimba-/Holzton) für den Countdown.
function blip(freq, delay = 0, vol = 0.3) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t0 + 0.12);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.2);
}

// Applaus: viele kurze, gefilterte Rauschstöße, die anschwellen und ausklingen.
function applause(dur = 3.6, vol = 0.55) {
  if (!ready()) return;
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < sr; i++) data[i] = Math.random() * 2 - 1;
  const t0 = ctx.currentTime + 0.05;
  for (let i = 0; i < 190; i++) {
    const t = t0 + Math.random() * dur;
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, (t - t0) / dur)), 0.7);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200 + Math.random() * 2600;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * env * (0.25 + Math.random() * 0.75)), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.05);
    src.connect(bp).connect(g).connect(master);
    src.start(t, Math.random() * 0.8, 0.12);
  }
}

function buzz(pattern) {
  if (settings().vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

// Bevorzugt eine männliche deutsche Stimme; sonst wird die Tonhöhe abgesenkt.
const MALE = /martin|markus|stefan|conrad|hans|yannick|jörg|jorg|thomas|klaus|daniel|dieter|male|männlich/i;
const FEMALE = /anna|petra|marlene|vicki|helena|sabine|female|weiblich|katja|hedda|steffi|amelie|viktoria|linda|elke|google deutsch/i;
function pickVoice() {
  const de = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('de'));
  return de.find((v) => MALE.test(v.name)) || de.find((v) => !FEMALE.test(v.name)) || de[0] || null;
}

export function speak(text, delay = 0) {
  const s = settings();
  if (!s.sound || !s.voice || !('speechSynthesis' in window)) return;
  const run = () => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.pitch = 0.55; // tief
      u.rate = 0.96;  // ruhig und kraftvoll
      u.volume = Math.min(1, s.volume + 0.2);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    } catch { /* ignorieren */ }
  };
  delay ? setTimeout(run, delay) : run();
}
export function stopSpeech() {
  try { speechSynthesis.cancel(); } catch { /* ignorieren */ }
}

export const cue = {
  // Countdown 3-2-1
  tick(left) {
    if (!settings().countdown) return;
    blip(left === 1 ? 1046 : 784, 0, left === 1 ? 0.38 : 0.28);
    buzz(25);
  },
  prep() { bell(660, 0, 0.25, 0.9); },
  start() { bell(523, 0, 0.4, 1.6); bell(784, 0.12, 0.3, 1.4); bell(1046, 0.26, 0.22, 1.2); buzz([90, 50, 90]); },
  side() { bell(659, 0, 0.3, 0.8); bell(880, 0.18, 0.3, 0.9); buzz([70, 50, 70]); },
  rest() { bell(587, 0, 0.3, 1.1); bell(440, 0.2, 0.28, 1.4); buzz(220); },
  finish() {
    [523, 659, 784, 1046].forEach((f, i) => bell(f, i * 0.16, 0.34, 1.8));
    bell(1568, 0.7, 0.2, 2);
    applause();
    buzz([150, 70, 150, 70, 350]);
  },
  preview() { this.start(); setTimeout(() => this.side(), 900); setTimeout(() => this.tick(1), 1700); }
};
