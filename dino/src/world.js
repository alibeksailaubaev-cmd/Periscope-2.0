// Мир: рельеф, вода, небо со сменой дня и ночи, растительность и достопримечательности.
import * as THREE from './three.js';
import {
  SIZE, VOLCANO, LAKES, heightAt, moistureAt, smoothstep, coastRadius, volcanoDist,
} from './terrain.js';
import { mulberry32, createNoise2D } from './noise.js';
import { merge, tint, ell, cone, limb } from './geo.js';

const col = (h) => new THREE.Color(h);
const PAL = {
  sand: col('#c9b789'), wetSand: col('#857656'), grass: col('#7b8b44'), dry: col('#9c9357'),
  jungle: col('#3b5728'), rock: col('#6f685f'), ash: col('#3a3531'), dark: col('#241f1c'),
};
const vn = createNoise2D(333);

export function terrainColor(x, z, h, slope, out) {
  const m = moistureAt(x, z);
  const v = vn(x * 0.05, z * 0.05) * 0.5 + vn(x * 0.21, z * 0.21) * 0.25;
  if (h < 1.6) {
    out.copy(PAL.wetSand).lerp(PAL.sand, smoothstep(-3, 1.6, h));
  } else {
    out.copy(PAL.dry).lerp(PAL.grass, smoothstep(-0.45, 0.05, m)).lerp(PAL.jungle, smoothstep(0.0, 0.4, m));
    if (h < 3.2) out.lerp(PAL.sand, 1 - smoothstep(1.6, 3.2, h));
    const vd = volcanoDist(x, z);
    out.lerp(PAL.rock, Math.max(smoothstep(0.55, 0.95, slope), smoothstep(42, 62, h)));
    out.lerp(PAL.ash, smoothstep(VOLCANO.r * 0.95, VOLCANO.r * 0.45, vd));
    if (vd < 34) out.lerp(PAL.dark, 0.6);
  }
  return out.multiplyScalar(1 + v * 0.16);
}

// Места, которые можно открыть, исследуя остров.
export const LANDMARKS = [
  { id: 'lake', name: 'Изумрудное озеро', x: LAKES[0].x, z: LAKES[0].z, r: 60,
    text: 'Самый большой пресный водоём острова. Сюда на водопой приходят стада, а значит, и охотники.' },
  { id: 'pond', name: 'Тихая заводь', x: LAKES[1].x, z: LAKES[1].z, r: 42,
    text: 'Небольшое озеро среди холмов. Хорошее место, чтобы напиться, пока рядом никого нет.' },
  { id: 'spring', name: 'Южный родник', x: LAKES[2].x, z: LAKES[2].z, r: 36,
    text: 'Холодная вода у подножия гор. Сюда редко кто добирается.' },
  { id: 'volcano', name: 'Дымящийся вулкан', x: VOLCANO.x, z: VOLCANO.z, r: 45,
    text: 'Кратер всё ещё дышит. Пепел делает склоны бесплодными, а на дне светится лава. Не подходите к ней близко.' },
  { id: 'bones', name: 'Кладбище гигантов', x: -230, z: 150, r: 30,
    text: 'В траве белеют рёбра огромного зауропода. Когда-то такие гиганты бродили по всему материку.' },
  { id: 'nest', name: 'Старое гнездо', x: 10, z: -52, r: 24,
    text: 'Кладка, брошенная много сезонов назад. Скорлупа уже окаменела.' },
  { id: 'pillars', name: 'Каменные столбы', x: -230, z: -130, r: 30,
    text: 'Выветренные колонны песчаника. Ветер и дожди точили их тысячи лет.' },
  { id: 'tree', name: 'Великое дерево', x: -66, z: 220, r: 30,
    text: 'Древнее дерево пережило пожары и засухи. Под его кроной всегда тень.' },
  { id: 'cape', name: 'Мыс заката', x: -300, z: 0, r: 35,
    text: 'Западная оконечность острова. Дальше только открытое море.' },
];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function detailTexture() {
  const n = createNoise2D(4);
  return canvasTex(256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // бесшовный шум: сумма синусов с целыми частотами + мелкое зерно
      const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI * 2;
      let s = Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.3 + Math.sin(v * 5 + Math.cos(u * 4)) * 0.2;
      s += n(Math.cos(u) * 4 + Math.sin(v) * 2, Math.sin(u) * 4 + Math.cos(v) * 2) * 0.35;
      const g = 225 + s * 28 + (Math.random() - 0.5) * 22;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, g));
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
}

function waterNormal() {
  return canvasTex(256, 256, (ctx, w, h) => {
    const hf = (x, y) => {
      const u = (x / w) * Math.PI * 2, v = (y / h) * Math.PI * 2;
      return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * 7 - v * 5) * 0.25 + Math.sin(u * 13 + v * 11) * 0.12 + Math.sin(v * 9 - u * 2) * 0.2;
    };
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = hf(x + 1, y) - hf(x - 1, y), dy = hf(x, y + 1) - hf(x, y - 1);
      const nx = -dx * 3, ny = -dy * 3, nz = 1, l = Math.hypot(nx, ny, nz);
      const i = (y * w + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
}

function softTexture(inner, outer) {
  const t = canvasTex(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, inner); g.addColorStop(1, outer);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------- растения ----------
function araucaria(rand) {
  const g = [];
  const trunk = new THREE.CylinderGeometry(0.2, 0.45, 15, 7);
  trunk.translate(0, 7.5, 0);
  g.push(tint(trunk, '#5b4633', 0.12, rand));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rand();
    const r = 1.2 + rand() * 1.4;
    const y = 12.5 + rand() * 3;
    g.push(tint(ell(2.3, 0.9, 2.3, Math.cos(a) * r, y, Math.sin(a) * r, 0, 0, 8), rand() > 0.5 ? '#2e4824' : '#37532b', 0.2, rand));
  }
  g.push(tint(ell(2.1, 1.3, 2.1, 0, 15.8, 0, 0, 0, 8), '#324d27', 0.2, rand));
  return merge(g);
}

function broadleaf(rand) {
  const g = [];
  const trunk = new THREE.CylinderGeometry(0.28, 0.5, 7, 7);
  trunk.translate(0, 3.5, 0);
  g.push(tint(trunk, '#4f3f2e', 0.12, rand));
  g.push(tint(limb([0, 5, 0], [1.6, 7.5, 0.4], 0.18, 0.18, 6), '#4f3f2e', 0.1, rand));
  g.push(tint(limb([0, 5, 0], [-1.3, 7.8, -0.8], 0.18, 0.18, 6), '#4f3f2e', 0.1, rand));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rand() * 0.6;
    const r = 1.4 + rand() * 1.3;
    g.push(tint(ell(2.2 + rand(), 1.7 + rand() * 0.6, 2.2 + rand(), Math.cos(a) * r, 8 + rand() * 1.8, Math.sin(a) * r, 0, 0, 8),
      ['#415f2c', '#4c6b31', '#3a5528'][i % 3], 0.22, rand));
  }
  g.push(tint(ell(2.6, 2, 2.6, 0, 10, 0, 0, 0, 8), '#48662f', 0.2, rand));
  return merge(g);
}

function cycad(rand) {
  const g = [];
  g.push(tint(limb([0, 0, 0], [0, 2.4, 0], 0.45, 0.45, 8), '#6b5a3d', 0.25, rand));
  for (let i = 0; i < 12; i++) {
    const f = ell(0.32, 0.04, 1.8, 0, 0, 1.7, 0, 0, 6);
    f.rotateX(-0.55 + (i % 2) * 0.35);
    f.rotateY((i / 12) * Math.PI * 2 + rand() * 0.2);
    f.translate(0, 2.4, 0);
    g.push(tint(f, i % 2 ? '#4d7a2f' : '#5a8636', 0.2, rand));
  }
  return merge(g);
}

function palm(rand) {
  const g = [];
  let prev = [0, 0, 0];
  for (let i = 1; i <= 5; i++) {
    const p = [i * i * 0.07, i * 2.1, 0];
    g.push(tint(limb(prev, p, 0.28 - i * 0.02, 0.28 - i * 0.02, 7), '#7a6547', 0.2, rand));
    prev = p;
  }
  for (let i = 0; i < 9; i++) {
    const f = ell(0.35, 0.04, 2.8, 0, 0, 2.5, 0, 0, 6);
    f.rotateX(0.25 + rand() * 0.25);
    f.rotateY((i / 9) * Math.PI * 2);
    f.translate(prev[0], prev[1], prev[2]);
    g.push(tint(f, '#5f8a34', 0.2, rand));
  }
  return merge(g);
}

function fern(rand) {
  const g = [];
  for (let i = 0; i < 10; i++) {
    const f = ell(0.18, 0.025, 0.85, 0, 0, 0.8, 0, 0, 6);
    f.rotateX(-0.75 + rand() * 0.4);
    f.rotateY((i / 10) * Math.PI * 2 + rand() * 0.3);
    f.translate(0, 0.12, 0);
    g.push(tint(f, i % 2 ? '#5f9435' : '#6ea33d', 0.15, rand));
  }
  return merge(g);
}

function grassTuft(rand) {
  const pos = [], colr = [], nor = [];
  const lo = col('#3d5324'), hi = col('#a3a95e');
  for (let i = 0; i < 6; i++) {
    const a = rand() * Math.PI * 2, r = rand() * 0.25;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = 0.45 + rand() * 0.55, w = 0.05 + rand() * 0.04;
    const lean = (rand() - 0.5) * 0.4, dir = rand() * Math.PI;
    const cx = Math.cos(dir) * w, cz = Math.sin(dir) * w;
    pos.push(x - cx, 0, z - cz, x + cx, 0, z + cz, x + lean, h, z + lean * 0.5);
    colr.push(lo.r, lo.g, lo.b, lo.r, lo.g, lo.b, hi.r, hi.g, hi.b);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  return geo;
}

function rock(rand) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const n = createNoise2D(Math.floor(rand() * 1000));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + n(x * 1.3 + z, y * 1.3) * 0.25;
    p.setXYZ(i, x * k * 1.2, y * k * 0.75, z * k);
  }
  g.computeVertexNormals();
  const c = new Float32Array(p.count * 3), base = col('#77716a'), moss = col('#4f5f34'), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    tmp.copy(base).lerp(moss, smoothstep(0.5, 0.9, g.attributes.normal.getY(i)) * 0.8).multiplyScalar(0.85 + rand() * 0.3);
    c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// ---------- мир ----------
export class World {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    this.rand = mulberry32(2024);
    this.time = 0.3;
    this.obstacles = new Map();
    this.ferns = [];
    this.fernGrid = new Map();
    this.uTime = { value: 0 };
    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildWater();
    this.buildVegetation();
    this.buildLandmarks();
    this.buildVolcanoFx();
    this.buildClouds();
    this.setTime(this.time);
  }

  // ---- препятствия ----
  key(x, z) { return `${Math.floor(x / 16)},${Math.floor(z / 16)}`; }
  addObstacle(x, z, r) {
    const k = this.key(x, z);
    if (!this.obstacles.has(k)) this.obstacles.set(k, []);
    this.obstacles.get(k).push({ x, z, r });
  }
  pushOut(p, r) {
    const cx = Math.floor(p.x / 16), cz = Math.floor(p.z / 16);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = this.obstacles.get(`${cx + i},${cz + j}`);
      if (!list) continue;
      for (const o of list) {
        const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = r + o.r;
        if (d < min && d > 0.001) { p.x += (dx / d) * (min - d); p.z += (dz / d) * (min - d); }
      }
    }
  }

  // ---- небо и свет ----
  buildSky() {
    this.skyU = {
      top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunVis: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p; gl_Position.z = p.w * 0.9999; }`,
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float sunVis; varying vec3 vDir;
        void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0);
          vec3 c = mix(horizon, top, pow(y, 0.5));
          if (d.y < 0.0) c = horizon * 0.8;
          float sd = max(dot(d, normalize(sunDir)), 0.0);
          c += sunColor * (pow(sd, 1200.0) * 8.0 + pow(sd, 10.0) * 0.28) * sunVis;
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 16), mat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    const sp = [];
    for (let i = 0; i < 900; i++) {
      const u = this.rand() * Math.PI * 2, v = Math.acos(this.rand() * 0.95);
      sp.push(Math.cos(u) * Math.sin(v) * 1400, Math.cos(v) * 1400, Math.sin(u) * Math.sin(v) * 1400);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
    this.scene.add(this.stars);
    this.scene.fog = new THREE.Fog(0x9fb8c8, 90, 560);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbfd6e8, 0x4a4030, 0.8);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    if (this.quality !== 'low') {
      this.sun.castShadow = true;
      const s = this.quality === 'high' ? 2048 : 1024;
      this.sun.shadow.mapSize.set(s, s);
      const c = this.sun.shadow.camera;
      c.left = c.bottom = -55; c.right = c.top = 55; c.near = 1; c.far = 400;
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.6;
    }
    this.scene.add(this.sun, this.sun.target);
  }

  // Ключевые точки цикла дня: 0 — полночь, 0.5 — полдень.
  static KEYS = [
    [0.0, '#070b16', '#141a28', '#8aa0d0', 0.0, 0.16],
    [0.21, '#0c1322', '#2a2a3a', '#8aa0d0', 0.0, 0.18],
    [0.26, '#3d5a86', '#e39a62', '#ffb070', 1.0, 0.45],
    [0.33, '#4f82b8', '#c9d5d8', '#ffe2b8', 2.0, 0.75],
    [0.5, '#3f79b8', '#b9d0de', '#fff4e0', 2.6, 0.9],
    [0.67, '#4a7ab0', '#c8cfcf', '#ffe0b0', 2.0, 0.75],
    [0.74, '#3a4f7a', '#e0885a', '#ff9a5a', 1.0, 0.45],
    [0.79, '#0e1426', '#2d2536', '#8aa0d0', 0.0, 0.2],
    [1.0, '#070b16', '#141a28', '#8aa0d0', 0.0, 0.16],
  ];

  setTime(t) {
    this.time = ((t % 1) + 1) % 1;
    const K = World.KEYS;
    let i = 0;
    while (i < K.length - 2 && K[i + 1][0] <= this.time) i++;
    const a = K[i], b = K[i + 1];
    const f = (this.time - a[0]) / (b[0] - a[0]);
    const mix = (c1, c2) => new THREE.Color(c1).lerp(new THREE.Color(c2), f);
    this.skyU.top.value.copy(mix(a[1], b[1]));
    this.skyU.horizon.value.copy(mix(a[2], b[2]));
    const sunCol = mix(a[3], b[3]);
    const sunI = a[4] + (b[4] - a[4]) * f;
    const hemiI = a[5] + (b[5] - a[5]) * f;
    const ang = (this.time - 0.25) * Math.PI * 2;
    const elev = Math.sin(ang);
    this.sunDir = new THREE.Vector3(Math.cos(ang) * 0.9, elev, 0.35).normalize();
    this.skyU.sunDir.value.copy(this.sunDir);
    this.skyU.sunColor.value.copy(sunCol);
    this.skyU.sunVis.value = smoothstep(-0.05, 0.08, elev);
    this.night = elev < -0.05;
    // ночью свет даёт луна с противоположной стороны
    this.lightDir = this.night ? this.sunDir.clone().negate() : this.sunDir.clone();
    this.sun.color.copy(this.night ? new THREE.Color('#8fa6d8') : sunCol);
    this.sun.intensity = this.night ? 0.35 : Math.max(0.15, sunI);
    this.hemi.intensity = hemiI * 1.25;
    this.hemi.color.copy(this.skyU.top.value).lerp(new THREE.Color('#ffffff'), 0.35);
    this.scene.fog.color.copy(this.skyU.horizon.value);
    this.scene.background = this.scene.fog.color;
    this.stars.material.opacity = smoothstep(0.0, -0.25, elev);
    if (this.cloudMat) this.cloudMat.color.copy(this.skyU.horizon.value).lerp(new THREE.Color('#ffffff'), this.night ? 0.05 : 0.55);
  }

  // ---- рельеф ----
  buildTerrain() {
    const seg = this.quality === 'low' ? 150 : 210;
    const geo = new THREE.PlaneGeometry(SIZE * 1.3, SIZE * 1.3, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const n = geo.attributes.normal, c = new Float32Array(p.count * 3), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const ny = n.getY(i);
      terrainColor(p.getX(i), p.getZ(i), p.getY(i), Math.sqrt(1 - ny * ny) / Math.max(ny, 0.05), tmp);
      c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const map = detailTexture();
    map.repeat.set(140, 140);
    map.colorSpace = THREE.SRGBColorSpace;
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map, roughness: 0.95 }));
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  buildWater() {
    const nm = waterNormal();
    nm.repeat.set(90, 90);
    this.waterNormal = nm;
    const geo = new THREE.PlaneGeometry(3200, 3200);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x2a6574, transparent: true, opacity: 0.84, roughness: 0.12, metalness: 0.15,
      normalMap: nm, normalScale: new THREE.Vector2(0.45, 0.45),
    }));
    this.water.receiveShadow = this.quality === 'high';
    this.scene.add(this.water);
  }

  vegMaterial() {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17;
          float k = min(position.y, 12.0) * 0.018;
          transformed.x += sin(uTime * 1.3 + ph) * k;
          transformed.z += cos(uTime * 1.1 + ph) * k * 0.6;
        #endif`);
    };
    return m;
  }

  scatter(tries, test) {
    const out = [];
    for (let i = 0; i < tries; i++) {
      const x = (this.rand() - 0.5) * SIZE, z = (this.rand() - 0.5) * SIZE;
      const h = heightAt(x, z);
      if (h < 0.5) continue;
      const e = 1.5;
      const s = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
      const r = test(x, z, h, s, moistureAt(x, z));
      if (r) out.push({ x, z, h, type: r === true ? 0 : r });
    }
    return out;
  }

  instanced(geo, mat, items, scaleFn, shadow, obstacleR) {
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
    mesh.count = items.length;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      const sc = scaleFn(it);
      it.scale = sc;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rand() * Math.PI * 2);
      s.set(sc, sc * (0.9 + this.rand() * 0.2), sc);
      pos.set(it.x, it.h - 0.15, it.z);
      m.compose(pos, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setScalar(0.85 + this.rand() * 0.3));
      if (obstacleR) this.addObstacle(it.x, it.z, obstacleR * sc);
    });
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  buildVegetation() {
    const mat = this.vegMaterial();
    this.vegMat = mat;
    const vd = (x, z) => volcanoDist(x, z) < VOLCANO.r * 0.8;
    const trees = this.scatter(16000, (x, z, h, s, m) => {
      if (s > 0.6 || h > 52 || vd(x, z)) return false;
      if (h < 3) return h > 0.8 && this.rand() < 0.05 ? 4 : false;
      const dens = m > 0.05 ? 0.42 : 0.05;
      if (this.rand() > dens) return false;
      const r = this.rand();
      if (m > 0.05) return r < 0.4 ? 1 : r < 0.7 ? 3 : 2;
      return r < 0.5 ? 2 : 1;
    });
    const shadow = this.quality !== 'low';
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    for (const t of trees) groups[t.type].push(t);
    this.instanced(araucaria(this.rand), mat, groups[1], () => 0.7 + this.rand() * 0.6, shadow, 0.45);
    this.instanced(broadleaf(this.rand), mat, groups[2], () => 0.7 + this.rand() * 0.5, shadow, 0.5);
    this.instanced(cycad(this.rand), mat, groups[3], () => 0.8 + this.rand() * 0.6, shadow, 0.5);
    this.instanced(palm(this.rand), mat, groups[4], () => 0.8 + this.rand() * 0.4, shadow, 0.3);

    // папоротники — пища травоядных
    const ferns = this.scatter(9000, (x, z, h, s, m) => h > 2 && h < 45 && s < 0.45 && !vd(x, z) && this.rand() < (m > 0 ? 0.35 : 0.14));
    this.fernMesh = this.instanced(fern(this.rand), mat, ferns, () => 0.9 + this.rand() * 0.8, false, 0);
    this.fernMatrix = [];
    ferns.forEach((f, i) => {
      const m = new THREE.Matrix4();
      this.fernMesh.getMatrixAt(i, m);
      this.fernMatrix.push(m);
      const fe = { i, x: f.x, z: f.z, food: 1, shown: 1 };
      this.ferns.push(fe);
      const k = this.key(f.x, f.z);
      if (!this.fernGrid.has(k)) this.fernGrid.set(k, []);
      this.fernGrid.get(k).push(fe);
    });

    const rocks = this.scatter(2500, (x, z, h, s) => (s > 0.35 || h > 40 || this.rand() < 0.12) && this.rand() < 0.35);
    this.instanced(rock(this.rand), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
      rocks, () => 0.5 + Math.pow(this.rand(), 3) * 4, shadow, 0.9);

    if (this.quality !== 'low') {
      const grass = this.scatter(this.quality === 'high' ? 40000 : 22000,
        (x, z, h, s, m) => h > 2.2 && h < 40 && s < 0.5 && !vd(x, z) && m > -0.35);
      const gm = this.vegMaterial();
      gm.side = THREE.DoubleSide;
      const gmesh = this.instanced(grassTuft(this.rand), gm, grass, () => 0.55 + this.rand() * 0.6, false, 0);
      gmesh.receiveShadow = false;
    }
  }

  nearestFern(x, z, r) {
    let best = null, bd = r;
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = this.fernGrid.get(`${cx + i},${cz + j}`);
      if (!list) continue;
      for (const f of list) {
        if (f.food < 0.15) continue;
        const d = Math.hypot(f.x - x, f.z - z);
        if (d < bd) { bd = d; best = f; }
      }
    }
    return best;
  }

  setFernScale(f) {
    const m = this.fernMatrix[f.i].clone();
    const k = 0.2 + 0.8 * f.food;
    m.multiply(new THREE.Matrix4().makeScale(k, k, k));
    this.fernMesh.setMatrixAt(f.i, m);
    this.fernMesh.instanceMatrix.needsUpdate = true;
    f.shown = f.food;
  }

  eatFern(f, amount) {
    const took = Math.min(f.food, amount);
    f.food -= took;
    this.setFernScale(f);
    return took;
  }

  // ---- достопримечательности ----
  buildLandmarks() {
    const bone = '#ddd3bb';
    const geos = [];
    const put = (g) => geos.push(g);
    const R = this.rand;
    // кладбище гигантов: позвоночник, рёбра и череп зауропода
    {
      const L = LANDMARKS.find((l) => l.id === 'bones');
      const y = heightAt(L.x, L.z);
      for (let i = 0; i < 9; i++) {
        const z = L.z - 8 + i * 2;
        for (const s of [-1, 1]) {
          const rib = new THREE.TorusGeometry(2.6 - Math.abs(i - 4) * 0.18, 0.13, 5, 12, Math.PI * 0.55);
          rib.rotateY(Math.PI / 2);
          rib.rotateX(s > 0 ? 0 : Math.PI);
          rib.rotateZ(s * 0.25);
          rib.translate(L.x + s * 0.3, y + 0.4, z);
          put(tint(rib, bone, 0.15, R));
        }
      }
      put(tint(limb([L.x, y + 2.9, L.z - 10], [L.x, y + 2.7, L.z + 10], 0.25, 0.25, 8), bone, 0.1, R));
      put(tint(limb([L.x, y + 2.7, L.z + 10], [L.x + 3, y + 0.6, L.z + 17], 0.2, 0.2, 8), bone, 0.1, R));
      put(tint(ell(0.6, 0.45, 0.9, L.x + 3.4, y + 0.5, L.z + 18.2), bone, 0.1, R));
      put(tint(limb([L.x - 2, y + 0.3, L.z - 11], [L.x + 4, y + 0.3, L.z - 14], 0.35, 0.3, 8), bone, 0.1, R));
      this.addObstacle(L.x, L.z, 2.5);
    }
    // старое гнездо
    {
      const L = LANDMARKS.find((l) => l.id === 'nest');
      const y = heightAt(L.x, L.z);
      const ring = new THREE.TorusGeometry(1.8, 0.55, 6, 16);
      ring.rotateX(Math.PI / 2);
      ring.translate(L.x, y + 0.2, L.z);
      put(tint(ring, '#6a5536', 0.35, R));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        put(tint(ell(0.28, 0.4, 0.28, L.x + Math.cos(a) * 0.8, y + 0.35, L.z + Math.sin(a) * 0.8), '#cfc3a6', 0.2, R));
      }
    }
    // каменные столбы
    {
      const L = LANDMARKS.find((l) => l.id === 'pillars');
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + R();
        const d = 6 + R() * 10;
        const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
        const hgt = 10 + R() * 16, r = 1.5 + R() * 1.3;
        const c = new THREE.CylinderGeometry(r * 0.75, r, hgt, 7, 4);
        const p = c.attributes.position;
        for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) * (0.85 + R() * 0.3));
        c.computeVertexNormals();
        c.translate(x, heightAt(x, z) + hgt / 2 - 0.5, z);
        put(tint(c, R() > 0.5 ? '#a0785a' : '#8d6a50', 0.25, R));
        this.addObstacle(x, z, r);
      }
    }
    const mesh = new THREE.Mesh(merge(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);

    // великое дерево
    {
      const L = LANDMARKS.find((l) => l.id === 'tree');
      const t = new THREE.Mesh(broadleaf(mulberry32(9)), this.vegMat);
      t.scale.setScalar(3.4);
      t.position.set(L.x, heightAt(L.x, L.z) - 0.5, L.z);
      t.castShadow = true;
      this.scene.add(t);
      this.addObstacle(L.x, L.z, 1.7);
    }
  }

  buildVolcanoFx() {
    const y = heightAt(VOLCANO.x, VOLCANO.z);
    const lava = new THREE.Mesh(new THREE.CircleGeometry(12, 24), new THREE.MeshBasicMaterial({ color: 0xff5a1a, fog: false }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(VOLCANO.x, y + 1.2, VOLCANO.z);
    this.scene.add(lava);
    this.lavaLight = new THREE.PointLight(0xff6a2a, 60, 90, 1.6);
    this.lavaLight.position.set(VOLCANO.x, y + 8, VOLCANO.z);
    this.scene.add(this.lavaLight);
    const tex = softTexture('rgba(255,255,255,0.55)', 'rgba(255,255,255,0)');
    this.smoke = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: 0x6c6560, transparent: true, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.userData.t = i / 16;
      this.smoke.push(s);
      this.scene.add(s);
    }
    this.volcanoTop = y;
  }

  buildClouds() {
    const tex = softTexture('rgba(255,255,255,0.8)', 'rgba(255,255,255,0)');
    this.cloudMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 });
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(this.rand() * 4);
      for (let k = 0; k < n; k++) {
        const s = new THREE.Sprite(this.cloudMat);
        const sc = 60 + this.rand() * 70;
        s.scale.set(sc, sc * 0.45, 1);
        s.position.set((k - n / 2) * 35 + this.rand() * 20, this.rand() * 12, this.rand() * 25);
        g.add(s);
      }
      g.position.set((this.rand() - 0.5) * 1600, 190 + this.rand() * 60, (this.rand() - 0.5) * 1600);
      this.clouds.push(g);
      this.scene.add(g);
    }
  }

  update(dt, camera, focus) {
    this.uTime.value += dt;
    this.waterNormal.offset.x += dt * 0.006;
    this.waterNormal.offset.y += dt * 0.003;
    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    const d = this.lightDir;
    this.sun.position.set(focus.x + d.x * 150, focus.y + d.y * 150, focus.z + d.z * 150);
    this.sun.target.position.copy(focus);
    for (const s of this.smoke) {
      s.userData.t = (s.userData.t + dt * 0.025) % 1;
      const t = s.userData.t;
      s.position.set(VOLCANO.x + Math.sin(t * 9 + s.id) * 6 + t * 40, this.volcanoTop + 6 + t * 110, VOLCANO.z + Math.cos(t * 7 + s.id) * 6);
      const sc = 14 + t * 70;
      s.scale.set(sc, sc, 1);
      s.material.opacity = Math.sin(t * Math.PI) * 0.7;
    }
    this.lavaLight.intensity = 50 + Math.sin(this.uTime.value * 3) * 12;
    for (const c of this.clouds) {
      c.position.x += dt * 2.2;
      if (c.position.x > 900) c.position.x = -900;
    }
    // медленное отрастание съеденных папоротников
    this.regrowT = (this.regrowT || 0) + dt;
    if (this.regrowT > 1) {
      for (const f of this.ferns) {
        if (f.food < 1) {
          f.food = Math.min(1, f.food + this.regrowT / 120);
          if (f.food - f.shown > 0.1 || f.food === 1) this.setFernScale(f);
        }
      }
      this.regrowT = 0;
    }
  }

  obstaclesNear(x, z, r) {
    let n = 0;
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16), k = Math.ceil(r / 16);
    for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {
      for (const o of this.obstacles.get(`${cx + i},${cz + j}`) || []) if (Math.hypot(o.x - x, o.z - z) < r) n++;
    }
    return n;
  }

  // Открытое место на берегу озера для заставки в меню.
  menuSpot() {
    const L = LAKES[0];
    let best = null;
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      for (let d = L.r * 0.9; d < L.r * 1.7; d += 3) {
        const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
        const h = heightAt(x, z);
        if (h < 1 || h > 6) continue;
        const n = this.obstaclesNear(x, z, 16);
        if (!best || n < best.n) best = { x, z, n, a };
      }
    }
    return best;
  }

  randomLand(rand, test) {
    for (let i = 0; i < 400; i++) {
      const x = (rand() - 0.5) * SIZE * 0.8, z = (rand() - 0.5) * SIZE * 0.8;
      const h = heightAt(x, z);
      if (h > 3 && h < 35 && volcanoDist(x, z) > VOLCANO.r && (!test || test(x, z, h))) return { x, z };
    }
    return { x: -83, z: 101 };
  }
}

export { coastRadius };
