// Deterministic seeded random helpers so the city is the same every visit.

export function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const rng = makeRng(20261120);

export function range(min, max) {
  return min + rng() * (max - min);
}

export function intRange(min, max) {
  return Math.floor(range(min, max + 1));
}

export function pick(list) {
  return list[Math.floor(rng() * list.length)];
}

export function chance(p) {
  return rng() < p;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2d(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// Smallest signed angle from a to b, in radians.
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// Smooth 0..1 easing used for marker pulses and camera blends.
export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
