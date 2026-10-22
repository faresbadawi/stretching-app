// Signaltöne (synthetisiert, offline) und kurze englische Sprachansagen.
import { settings } from './store.js';

let ctx = null;
let master = null;
let reverbIn = null;

export function unlock() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      reverbIn = makeReverb();
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = settings().volume;
  } catch { ctx = null; }
}

// Kleiner Hall für einen warmen, ruhigen Klang.
function makeReverb() {
  const len = Math.floor(ctx.sampleRate * 1.5);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  conv.connect(wet).connect(master);
  return conv;
}

function ready() {
  if (!settings().sound || !ctx) return false;
  master.gain.value = settings().volume;
  return true;
}

// Ein weicher Ton: kurzer Anschlag, sanftes Ausklingen, optional Tonhöhen-Gleiten und Hallanteil.
function tone({ f, t = 0, dur = 0.25, type = 'sine', vol = 0.3, attack = 0.006, slideTo = null, wet = 0.2, lp = 4200 }) {
  if (!ready()) return;
  const t0 = ctx.currentTime + t;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lp;
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(filt).connect(g);
  g.connect(master);
  if (wet > 0) {
    const send = ctx.createGain();
    send.gain.value = wet;
    g.connect(send).connect(reverbIn);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Tiefer, kurzer Schlag für Kraft beim Start.
function thump(t = 0, vol = 0.35) {
  if (!ready()) return;
  const t0 = ctx.currentTime + t;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.16);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.25);
}

// Applaus: viele kurze, gefilterte Rauschstöße, die anschwellen und ausklingen.
function applause(dur = 3.4, vol = 0.45) {
  if (!ready()) return;
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < sr; i++) data[i] = Math.random() * 2 - 1;
  const t0 = ctx.currentTime + 0.5;
  for (let i = 0; i < 170; i++) {
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

/* ---------- Stimme (Browser-Sprachausgabe, Englisch) ---------- */

const FEMALE = /samantha|karen|moira|tessa|fiona|victoria|kate|serena|susan|zira|hazel|jenny|aria|libby|sonia|catherine|allison|ava|female|woman|google us english$/i;
const MALE = /daniel|aaron|arthur|fred|alex|reed|rishi|gordon|oliver|james|guy|ryan|mark|david|george|eddy|thomas|male|man\b|brian|matthew/i;

export function englishVoices() {
  if (!('speechSynthesis' in window)) return [];
  const list = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  // männliche zuerst
  return list.sort((a, b) => Number(MALE.test(b.name)) - Number(MALE.test(a.name)) || a.name.localeCompare(b.name));
}
export function onVoices(cb) {
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', cb);
}
function pickVoice() {
  const en = englishVoices();
  const chosen = settings().voiceName && en.find((v) => v.name === settings().voiceName);
  return chosen || en.find((v) => MALE.test(v.name) && !FEMALE.test(v.name)) || en.find((v) => !FEMALE.test(v.name)) || en[0] || null;
}

export function speak(text, delay = 0) {
  const s = settings();
  if (!s.sound || !s.voice || !text || !('speechSynthesis' in window)) return;
  const run = () => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.pitch = 1;
      u.rate = 0.95;
      u.volume = Math.min(1, s.volume + 0.2);
      const voice = pickVoice();
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      speechSynthesis.speak(u);
    } catch { /* ignorieren */ }
  };
  delay ? setTimeout(run, delay) : run();
}
export function stopSpeech() {
  try { speechSynthesis.cancel(); } catch { /* ignorieren */ }
}

/* ---------- Signale ---------- */

export const cue = {
  // Countdown: kurze, klare Pieptöne wie bei einer Sportuhr
  tick(left) {
    if (!settings().countdown) return;
    tone({ f: 880, dur: 0.11, type: 'sine', vol: 0.32, wet: 0.08 });
    buzz(25);
  },
  // Ruhiger, steigender Einzelton
  prep() { tone({ f: 523, dur: 0.5, type: 'triangle', vol: 0.22, wet: 0.3 }); },
  // Start: kräftiger Schlag, steigende Quinten, langer heller Abschluss
  start() {
    thump(0, 0.3);
    tone({ f: 523, t: 0, dur: 0.28, type: 'triangle', vol: 0.26, wet: 0.25 });
    tone({ f: 784, t: 0.1, dur: 0.28, type: 'triangle', vol: 0.26, wet: 0.25 });
    tone({ f: 1175, t: 0.2, dur: 0.7, type: 'sine', vol: 0.3, wet: 0.35 });
    buzz([90, 50, 90]);
  },
  // Seitenwechsel: zwei helle Töne aufwärts
  side() {
    tone({ f: 784, dur: 0.18, type: 'triangle', vol: 0.26, wet: 0.2 });
    tone({ f: 1046, t: 0.15, dur: 0.4, type: 'triangle', vol: 0.28, wet: 0.3 });
    buzz([70, 50, 70]);
  },
  // Pause: weich absteigend, beruhigend
  rest() {
    tone({ f: 659, dur: 0.55, type: 'triangle', vol: 0.24, wet: 0.4, lp: 2600 });
    tone({ f: 494, t: 0.22, dur: 0.9, type: 'triangle', vol: 0.24, wet: 0.45, lp: 2600 });
    buzz(220);
  },
  // Abschluss: aufsteigender Dur-Lauf, dann voller Akkord, dann Applaus
  finish() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ f, t: i * 0.13, dur: 0.4, type: 'triangle', vol: 0.26, wet: 0.3 }));
    [523, 659, 784, 1046].forEach((f) => tone({ f, t: 0.55, dur: 1.9, type: 'sine', vol: 0.16, attack: 0.04, wet: 0.5 }));
    applause();
    buzz([150, 70, 150, 70, 350]);
  },
  preview() { this.start(); setTimeout(() => this.rest(), 1400); setTimeout(() => this.tick(1), 2800); }
};
