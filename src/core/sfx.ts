// Tiny procedural sound effects via the Web Audio API — no audio files needed.
// Browsers block audio until a user gesture, so the context is created lazily.

let ctx: AudioContext | null = null;
let muted = localStorage.getItem('breach_muted') === '1';

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function play(fn: () => void): void {
  if (muted) return;
  fn();
}

export const sfx = {
  walk: () => play(() => tone(220, 0, 0.07, 'triangle', 0.05)),
  talk: () => play(() => tone(440, 0, 0.09, 'sine', 0.06)),
  good: () =>
    play(() => {
      tone(523, 0, 0.1, 'sine', 0.08);
      tone(784, 0.09, 0.14, 'sine', 0.08);
    }),
  bad: () =>
    play(() => {
      tone(196, 0, 0.18, 'sawtooth', 0.06);
      tone(146, 0.08, 0.22, 'sawtooth', 0.06);
    }),
  win: () =>
    play(() => {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.18, 'sine', 0.08));
    }),
  lose: () =>
    play(() => {
      [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sawtooth', 0.07));
    }),

  setMuted(value: boolean): void {
    muted = value;
    localStorage.setItem('breach_muted', value ? '1' : '0');
  },
  isMuted(): boolean {
    return muted;
  },
};
