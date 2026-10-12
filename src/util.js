// Shared helpers. Randomness goes through `random()` so tests can make it deterministic with setRandom().
let rand = Math.random;
export const setRandom = fn => { rand = fn; };
export const random = () => rand();
export const rnd = (a, b) => a + random() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = arr => arr[Math.floor(random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function hash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* deterministic PRNG for tests */
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
