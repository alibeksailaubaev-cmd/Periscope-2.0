// Небольшие помощники для сборки геометрии с цветами вершин.
import * as THREE from './three.js';

export function merge(geos) {
  let vcount = 0, icount = 0;
  for (const g of geos) {
    vcount += g.attributes.position.count;
    icount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vcount * 3);
  const nor = new Float32Array(vcount * 3);
  const col = new Float32Array(vcount * 3).fill(1);
  const idx = vcount > 65535 ? new Uint32Array(icount) : new Uint16Array(icount);
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    pos.set(p.array, vo * 3);
    if (n) nor.set(n.array, vo * 3);
    if (c) col.set(c.array, vo * 3);
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

export function tint(g, color, jitter = 0, rand = Math.random) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const j = 1 + (rand() - 0.5) * jitter;
    a[i * 3] = c.r * j; a[i * 3 + 1] = c.g * j; a[i * 3 + 2] = c.b * j;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export function ell(rx, ry, rz, x = 0, y = 0, z = 0, rotX = 0, rotY = 0, seg = 12) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.6)));
  g.scale(rx, ry, rz);
  if (rotX) g.rotateX(rotX);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

// Конус с основанием в (x,y,z); rotX/rotZ наклоняют остриё.
export function cone(r, h, x, y, z, rotX = 0, rotZ = 0, seg = 7) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(0, h / 2, 0);
  if (rotX) g.rotateX(rotX);
  if (rotZ) g.rotateZ(rotZ);
  g.translate(x, y, z);
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);
// Эллипсоид, вытянутый между точками a и b.
export function limb(a, b, rw, rd, seg = 10, extend = 1.15) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.6)));
  g.scale(rw, (len / 2) * extend, rd);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  const m = va.add(vb).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

// Плавно сужающийся цилиндр от a (радиус r0) к b (радиус r1).
export function taper(a, b, r0, r1, seg = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 3, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  const m = va.add(vb).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}
