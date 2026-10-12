// Square-wave beeps (the AudioContext is created on the first button press, as browsers require).
import { store } from "../core/store.js";

let actx = null;
export function unlockAudio() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
}

export function beep(freq = 880, dur = 0.05, type = "square", vol = 0.035) {
  if (!actx || !store.state || !store.state.sound) return;
  try {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* ignore */ }
}
export const jingle = () => [784, 988, 1175].forEach((f, i) => setTimeout(() => beep(f, 0.07), i * 90));
export const callBeep = () => [0, 120, 240].forEach(d => setTimeout(() => beep(1046, 0.05), d));
export const good = () => beep(1175, 0.06);
export const bad = () => beep(260, 0.1);
export const click = dial => beep(dial ? 1500 : 1200, 0.02);
