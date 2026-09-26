// Форма острова: высоты, влажность, озёра и вулкан. Чистый JS без three.js,
// поэтому тот же код можно запускать на сервере для будущего мультиплеера.
import { createNoise2D } from './noise.js';

export const SIZE = 1000;
export const HALF = SIZE / 2;
export const VOLCANO = { x: 215, z: -185, r: 125 };
export const LAKES = [
  { x: -135, z: 55, r: 46 },
  { x: 115, z: 150, r: 30 },
  { x: -30, z: -215, r: 24 },
];

const nA = createNoise2D(7);
const nB = createNoise2D(21);
const nC = createNoise2D(99);
const nD = createNoise2D(5);

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function fbm(x, z) {
  let sum = 0, amp = 1, f = 1;
  for (let i = 0; i < 5; i++) { sum += nA(x * f, z * f) * amp; amp *= 0.5; f *= 2.03; }
  return sum;
}

export function coastRadius(x, z) {
  const a = Math.atan2(z, x);
  const c = Math.cos(a), s = Math.sin(a);
  return HALF * 0.8 + nB(c * 1.4 + 3, s * 1.4 - 2) * 65 + nB(c * 4, s * 4) * 18;
}

export function heightAt(x, z) {
  const d = Math.hypot(x, z) / coastRadius(x, z);
  const land = 1 - smoothstep(0.72, 1.04, d);
  let h = 9 + fbm(x * 0.0032, z * 0.0032) * 12;
  const ridge = 1 - Math.abs(nC(x * 0.0055, z * 0.0055));
  const mountains = smoothstep(0.05, 0.55, nD(x * 0.0018 + 4, z * 0.0018 - 7));
  h += ridge * ridge * ridge * 60 * mountains;
  h += nA(x * 0.03, z * 0.03) * 0.8;
  const vd = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
  if (vd < VOLCANO.r) {
    const t = 1 - vd / VOLCANO.r;
    h += Math.pow(t, 1.7) * 100;
    if (vd < 24) h -= Math.pow(1 - vd / 24, 1.5) * 42;
  }
  h = h * land - (1 - land) * 22;
  for (const L of LAKES) {
    const ld = Math.hypot(x - L.x, z - L.z);
    if (ld < L.r * 1.6) {
      const t = smoothstep(L.r * 1.6, L.r * 0.5, ld);
      h = h * (1 - t) - 5 * t;
    }
  }
  return h;
}

export function moistureAt(x, z) {
  return nD(x * 0.004 - 11, z * 0.004 + 3);
}

export function slopeAt(x, z) {
  const e = 1.5;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

// Вода внутри острова пресная, у побережья — солёная.
export function isFresh(x, z) {
  return Math.hypot(x, z) < coastRadius(x, z) * 0.7;
}

export function volcanoDist(x, z) {
  return Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
}
