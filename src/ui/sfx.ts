// Synthesised sound effects (no audio files to host).
import type { Rarity } from '../types';

let ctx: AudioContext | null = null;
let muted = localStorage.getItem('ab-muted') === '1';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem('ab-muted', value ? '1' : '0');
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'square', volume = 0.08): void {
  if (muted) return;
  ctx ??= new AudioContext();
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

export const sfx = {
  tick: () => tone(1200, 0, 0.03, 'square', 0.03),
  place: () => {
    tone(180, 0, 0.12, 'sine', 0.2);
    tone(90, 0.02, 0.18, 'sine', 0.15);
  },
  reveal(rarity: Rarity) {
    const notes: Record<Rarity, number[]> = {
      C: [392],
      B: [392, 523],
      A: [392, 523, 659],
      S: [523, 659, 784, 1046],
      SS: [523, 659, 784, 1046, 1318, 1568],
    };
    notes[rarity].forEach((f, i) => tone(f, i * 0.08, 0.35, rarity === 'SS' ? 'sawtooth' : 'triangle', 0.07));
  },
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.3, 'triangle', 0.08)),
};
