// Signaltöne (synthetisiert, offline) und kurze englische Sprachansagen.
import { settings } from './store.js';
import { lang } from './i18n.js';

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

// Applaus: viele einzelne Klatscher mit eigener Klangfarbe und Position im Raum,
// dazu ein leises Publikums-Rauschen. Dichte steigt schnell an, hält und klingt aus (ca. 4,6 s).
const APPLAUSE_SECONDS = 4.6;
function applause(delay = 0, vol = 0.5) {
  if (!ready()) return;
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * 2, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const t0 = ctx.currentTime + delay;
  const rate = (t) => (t < 0.6 ? 4 + 36 * (t / 0.6) : t < 2.8 ? 40 : 40 * Math.pow(Math.max(0, 1 - (t - 2.8) / (APPLAUSE_SECONDS - 2.8)), 1.6));

  // Publikums-Rauschen als Unterlage
  const bed = ctx.createBufferSource();
  bed.buffer = buf; bed.loop = true;
  const bedFilter = ctx.createBiquadFilter();
  bedFilter.type = 'bandpass'; bedFilter.frequency.value = 900; bedFilter.Q.value = 0.5;
  const bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.0001, t0);
  bedGain.gain.linearRampToValueAtTime(vol * 0.16, t0 + 0.7);
  bedGain.gain.setValueAtTime(vol * 0.16, t0 + 2.8);
  bedGain.gain.linearRampToValueAtTime(0.0001, t0 + APPLAUSE_SECONDS);
  bed.connect(bedFilter).connect(bedGain).connect(master);
  bed.start(t0); bed.stop(t0 + APPLAUSE_SECONDS + 0.1);

  // Einzelne Klatscher
  for (let t = 0; t < APPLAUSE_SECONDS; t += 0.02) {
    const n = rate(t) * 0.02;
    let claps = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    while (claps-- > 0) {
      const at = t0 + t + Math.random() * 0.02;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.7 + Math.random() * 0.7;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + Math.random() * 2900;
      bp.Q.value = 0.7 + Math.random() * 0.9;
      const g = ctx.createGain();
      const peak = vol * (0.25 + Math.random() * 0.75) * 0.5;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03 + Math.random() * 0.05);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      let out = bp.connect(g);
      if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; out = g.connect(pan); }
      src.connect(bp);
      out.connect(master);
      if (reverbIn && Math.random() < 0.5) { const send = ctx.createGain(); send.gain.value = 0.35; out.connect(send).connect(reverbIn); }
      src.start(at, Math.random() * 1.2, 0.12);
    }
  }
}

function buzz(pattern) {
  if (settings().vibrate && navigator.vibrate) navigator.vibrate(pattern);
}

/* ---------- Stimme ---------- */
// Vorab erzeugte, männliche Sprachclips je Sprache (audio/voice/<sprache>/<name>.mp3).

const clips = new Map(); // "sprache/name" -> Promise<AudioBuffer|null>
function loadClip(key) {
  const id = `${lang()}/${key}`;
  if (!clips.has(id)) {
    clips.set(id, fetch(`audio/voice/${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
      .then((buf) => ctx.decodeAudioData(buf))
      .catch(() => null));
  }
  return clips.get(id);
}
export function preloadVoice(keys) {
  if (ctx) { keys.forEach(loadClip); loadApplause(); }
}

// Applaus-Aufnahme (audio/applause.mp3): wird vor dem Training geladen; fehlt sie, bleibt der synthetische Applaus.
let applauseBuf = null;
let applauseTried = false;
function loadApplause() {
  if (applauseBuf || applauseTried || !ctx) return;
  applauseTried = true;
  fetch('audio/applause.mp3')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
    .then((buf) => ctx.decodeAudioData(buf))
    .then((b) => { applauseBuf = b; })
    .catch(() => { applauseBuf = null; });
}
// Echter Applaus, sonst der synthetische
function crowd(delay = 0, vol = 0.5) {
  if (!applauseBuf) { applause(delay, vol); return; }
  if (!ready()) return;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  const src = ctx.createBufferSource();
  src.buffer = applauseBuf;
  src.connect(g).connect(master);
  src.start(ctx.currentTime + delay);
}

let voiceSrc = null;
// keys: ein Name oder eine Liste (der erste vorhandene Clip wird gespielt).
export async function say(keys, delay = 0) {
  const s = settings();
  if (!s.sound || !s.voice || !ctx) return;
  let buf = null;
  for (const k of [].concat(keys)) { buf = await loadClip(k); if (buf) break; }
  if (!buf) return;
  stopSpeech();
  const g = ctx.createGain();
  g.gain.value = 0.95;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(ctx.currentTime + delay / 1000);
  voiceSrc = src;
}
export function stopSpeech() {
  try { voiceSrc?.stop(); } catch { /* ignorieren */ }
  voiceSrc = null;
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
    crowd(0.7);
    buzz([150, 70, 150, 70, 350]);
  },
  get finishSeconds() { return 0.7 + (applauseBuf ? Math.min(applauseBuf.duration, 4.5) : APPLAUSE_SECONDS); },
  preview() { this.start(); setTimeout(() => this.rest(), 1400); setTimeout(() => this.tick(1), 2800); }
};
