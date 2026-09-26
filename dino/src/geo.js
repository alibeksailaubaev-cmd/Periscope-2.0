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
  const uvs = new Float32Array(vcount * 2);
  const idx = vcount > 65535 ? new Uint32Array(icount) : new Uint16Array(icount);
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    pos.set(p.array, vo * 3);
    if (n) nor.set(n.array, vo * 3);
    if (c) col.set(c.array, vo * 3);
    if (g.attributes.uv) uvs.set(g.attributes.uv.array, vo * 2);
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
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
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

// Ячейка атласа растительности 2x2: 0 листва, 1 папоротник, 2 хвоя, 3 кора.
export function cellRect(cell) {
  const u0 = (cell % 2) * 0.5, v0 = cell < 2 ? 0.5 : 0;
  return [u0 + 0.004, v0 + 0.004, u0 + 0.496, v0 + 0.496];
}

export function remapUV(g, cell, su = 1, sv = 1) {
  const [u0, v0, u1, v1] = cellRect(cell);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const fu = su === 1 ? uv.getX(i) : (uv.getX(i) * su) % 1, fv = sv === 1 ? uv.getY(i) : (uv.getY(i) * sv) % 1;
    uv.setXY(i, u0 + fu * (u1 - u0), v0 + fv * (v1 - v0));
  }
  return g;
}

// Изогнутая лента-карточка вдоль кривой (лист папоротника, пальмы, ветка).
// pts — точки центральной линии, widths — ширина в каждой точке, side — направление ширины.
export function ribbon(pts, widths, side, cell, color, normal) {
  const [u0, v0, u1, v1] = cellRect(cell);
  const pos = [], uv = [], nor = [], col = [], idx = [];
  const c = new THREE.Color(color);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), w = widths[i];
    const p = pts[i];
    pos.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
    uv.push(u0, v0 + t * (v1 - v0), u1, v0 + t * (v1 - v0));
    const nn = normal(p);
    nor.push(nn.x, nn.y, nn.z, nn.x, nn.y, nn.z);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Плоская карточка с текстурой ячейки атласа.
export function card(center, w, h, quat, cell, color, normal) {
  const g = new THREE.PlaneGeometry(w, h);
  g.applyQuaternion(quat);
  g.translate(center.x, center.y, center.z);
  remapUV(g, cell);
  const nor = g.attributes.normal;
  for (let i = 0; i < nor.count; i++) nor.setXYZ(i, normal.x, normal.y, normal.z);
  return tint(g, color, 0.15);
}
