// Мир: рельеф с фототекстурами, атмосферное небо, вода, растительность, достопримечательности.
import * as THREE from './three.js';
import { Sky } from './sky.js';
import {
  SIZE, VOLCANO, LAKES, heightAt, moistureAt, smoothstep, coastRadius, volcanoDist,
} from './terrain.js';
import { mulberry32, createNoise2D } from './noise.js';
import { merge, tint, ell, limb, taper, remapUV, ribbon, card } from './geo.js';
import * as TX from './textures.js';

const col = (h) => new THREE.Color(h);
const PAL = {
  sand: col('#c9b789'), wetSand: col('#857656'), grass: col('#7b8b44'), dry: col('#9c9357'),
  jungle: col('#3b5728'), rock: col('#6f685f'), ash: col('#3a3531'), dark: col('#241f1c'),
};
const vn = createNoise2D(333);
export const HM = SIZE; // сторона карты высот в метрах
const HM_RES = 512;

// Цвет для мини-карты.
export function terrainColor(x, z, h, slope, out) {
  const m = moistureAt(x, z);
  const v = vn(x * 0.05, z * 0.05) * 0.5 + vn(x * 0.21, z * 0.21) * 0.25;
  if (h < 1.6) out.copy(PAL.wetSand).lerp(PAL.sand, smoothstep(-3, 1.6, h));
  else {
    out.copy(PAL.dry).lerp(PAL.grass, smoothstep(-0.45, 0.05, m)).lerp(PAL.jungle, smoothstep(0.0, 0.4, m));
    if (h < 3.2) out.lerp(PAL.sand, 1 - smoothstep(1.6, 3.2, h));
    const vd = volcanoDist(x, z);
    out.lerp(PAL.rock, Math.max(smoothstep(0.55, 0.95, slope), smoothstep(42, 62, h)));
    out.lerp(PAL.ash, smoothstep(VOLCANO.r * 0.95, VOLCANO.r * 0.45, vd));
    if (vd < 34) out.lerp(PAL.dark, 0.6);
  }
  return out.multiplyScalar(1 + v * 0.16);
}

// Веса текстур: трава, лесная подстилка, скала, песок.
function splatAt(x, z, h, slope) {
  const m = moistureAt(x, z);
  const vd = volcanoDist(x, z);
  let sand = 1 - smoothstep(1.4, 3.4, h + vn(x * 0.08, z * 0.08) * 0.8);
  let rock = Math.max(smoothstep(0.7, 1.15, slope), smoothstep(48, 68, h), smoothstep(VOLCANO.r * 0.7, VOLCANO.r * 0.3, vd));
  let litter = smoothstep(-0.05, 0.35, m + vn(x * 0.03, z * 0.03) * 0.15) + smoothstep(VOLCANO.r * 0.95, VOLCANO.r * 0.6, vd) * 0.6;
  let grass = 1;
  rock = Math.min(1, rock);
  sand *= 1 - rock;
  litter *= (1 - rock) * (1 - sand);
  grass = Math.max(0, 1 - rock - sand - litter);
  const t = grass + litter + rock + sand;
  return [grass / t, litter / t, rock / t, sand / t];
}

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

// ---------- растения из карточек с текстурой ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function bark(a, b, r0, r1, rand) {
  const g = taper(a, b, r0, r1, 9);
  remapUV(g, 3, 2, 1);
  return tint(g, '#b0a59a', 0.2, rand);
}

// Крона из карточек; нормали смотрят от центра кроны, чтобы она освещалась как объём.
function crownCards(g, center, rx, ry, count, size, cell, colors, rand) {
  for (let i = 0; i < count; i++) {
    const u = rand() * Math.PI * 2, v = Math.acos(rand() * 2 - 1);
    const d = V(Math.cos(u) * Math.sin(v), Math.cos(v) * 0.8, Math.sin(u) * Math.sin(v));
    const p = V(center.x + d.x * rx * (0.5 + rand() * 0.5), center.y + d.y * ry * (0.5 + rand() * 0.5), center.z + d.z * rx * (0.5 + rand() * 0.5));
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI));
    const n = p.clone().sub(center).normalize().add(V(0, 0.6, 0)).normalize();
    const s = size * (0.75 + rand() * 0.5);
    g.push(card(p, s, s, q, cell, colors[Math.floor(rand() * colors.length)], n));
  }
}

function frond(g, base, dir, len, width, droop, cell, color, rand, segs = 5) {
  const pts = [], ws = [];
  const side = V(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(V(base.x + dir.x * len * t, base.y + dir.y * len * t - droop * t * t * len, base.z + dir.z * len * t));
    ws.push(width * (0.35 + Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1)) * 0.65));
  }
  g.push(ribbon(pts, ws, side, cell, color, () => V(dir.x * 0.3, 1, dir.z * 0.3).normalize()));
}

function broadleaf(rand) {
  const g = [];
  g.push(bark([0, -0.5, 0], [0, 7, 0], 0.55, 0.32, rand));
  const crown = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rand();
    const end = [Math.cos(a) * (1.6 + rand()), 8 + rand() * 2, Math.sin(a) * (1.6 + rand())];
    g.push(bark([0, 5.5, 0], end, 0.22, 0.1, rand));
    crown.push(V(...end));
  }
  crown.push(V(0, 10.5, 0));
  const cols = ['#9fb88a', '#b9cc9a', '#8aa878', '#c8d4a0'];
  for (const c of crown) crownCards(g, c, 2.6, 1.9, 13, 2.6, 0, cols, rand);
  return merge(g);
}

function araucaria(rand) {
  const g = [];
  g.push(bark([0, -0.5, 0], [0, 17, 0], 0.5, 0.18, rand));
  const cols = ['#a6b894', '#b8c6a0', '#95ab86'];
  // ярусы веток: тонкая ветка из коры и пучки хвои вдоль неё
  for (let y = 8.5; y < 16.5; y += 1.3) {
    const n = 5, off = rand() * 6;
    const len = 1.4 + (16.5 - y) * 0.42;
    for (let k = 0; k < n; k++) {
      const a = off + (k / n) * Math.PI * 2;
      const end = [Math.cos(a) * len, y - len * 0.12, Math.sin(a) * len];
      g.push(bark([0, y, 0], end, 0.07, 0.03, rand));
      for (let j = 1; j <= 3; j++) {
        const t = j / 3.2;
        const c = V(end[0] * t, y - len * 0.12 * t + 0.15, end[2] * t);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + (rand() - 0.5) * 0.8, a + (rand() - 0.5), 0));
        g.push(card(c, 1.6, 1.6, q, 2, cols[Math.floor(rand() * cols.length)], V(Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4).normalize()));
      }
    }
  }
  crownCards(g, V(0, 17, 0), 1.6, 1.1, 12, 2.2, 2, cols, rand);
  return merge(g);
}

function cycad(rand) {
  const g = [];
  g.push(bark([0, -0.3, 0], [0, 2.6, 0], 0.55, 0.45, rand));
  const cols = ['#b4c89a', '#c6d6a4', '#a5bc8c'];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rand() * 0.3;
    const up = 0.5 + rand() * 0.6;
    frond(g, V(0, 2.6, 0), V(Math.cos(a), up, Math.sin(a)).normalize(), 2.8 + rand() * 0.8, 0.8, 0.5, 1, cols[i % 3], rand);
  }
  return merge(g);
}

function palm(rand) {
  const g = [];
  let prev = [0, -0.3, 0];
  for (let i = 1; i <= 5; i++) {
    const p = [i * i * 0.08, i * 2.2, 0];
    g.push(bark(prev, p, 0.34 - i * 0.02, 0.32 - i * 0.02, rand));
    prev = p;
  }
  const top = V(...prev);
  const cols = ['#b4c89a', '#c6d6a4'];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    frond(g, top, V(Math.cos(a), 0.35, Math.sin(a)).normalize(), 4.2, 1.1, 0.55, 1, cols[i % 2], rand);
  }
  return merge(g);
}

function fernBush(rand) {
  const g = [];
  const cols = ['#bcd29a', '#cfe0a8', '#aac48c'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rand() * 0.4;
    frond(g, V(0, 0.05, 0), V(Math.cos(a), 0.9 + rand() * 0.5, Math.sin(a)).normalize(), 1.3 + rand() * 0.4, 0.45, 0.9, 1, cols[i % 3], rand, 4);
  }
  return merge(g);
}

function rockGeo(rand) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const n = createNoise2D(Math.floor(rand() * 1000));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + n(x * 1.3 + z, y * 1.3) * 0.22 + n(x * 4, z * 4 + y * 4) * 0.05;
    p.setXYZ(i, x * k * 1.25, y * k * 0.7, z * k);
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 2);
  const c = new Float32Array(p.count * 3), base = col('#ffffff'), moss = col('#7d8f55'), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    tmp.copy(base).lerp(moss, smoothstep(0.55, 0.9, g.attributes.normal.getY(i)) * 0.7);
    c[i * 3] = tmp.r; c[i * 3 + 1] = tmp.g; c[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// ---------- мир ----------
export class World {
  constructor(scene, quality, renderer) {
    this.scene = scene;
    this.quality = quality;
    this.renderer = renderer;
    this.rand = mulberry32(2024);
    this.time = 0.3;
    this.obstacles = new Map();
    this.ferns = [];
    this.fernGrid = new Map();
    this.uTime = { value: 0 };
    this.tex = {
      grass: TX.grassGround(), litter: TX.forestFloor(), rock: TX.rockTex(), sand: TX.sandTex(),
      atlas: TX.foliageAtlas(), water: TX.waterNormals(),
    };
    this.buildHeightmap();
    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildWater();
    this.buildVegetation();
    this.buildLandmarks();
    this.buildVolcanoFx();
    this.buildMission();
    this.buildClouds();
    this.buildRain();
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
  obstaclesNear(x, z, r) {
    let n = 0;
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16), k = Math.ceil(r / 16);
    for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {
      for (const o of this.obstacles.get(`${cx + i},${cz + j}`) || []) if (Math.hypot(o.x - x, o.z - z) < r) n++;
    }
    return n;
  }

  // Карта высот и плотности травы для шейдеров травы и воды.
  buildHeightmap() {
    const data = new Uint16Array(HM_RES * HM_RES * 4);
    const toH = THREE.DataUtils.toHalfFloat;
    for (let j = 0; j < HM_RES; j++) for (let i = 0; i < HM_RES; i++) {
      const x = ((i + 0.5) / HM_RES - 0.5) * HM, z = ((j + 0.5) / HM_RES - 0.5) * HM;
      const h = heightAt(x, z);
      const e = 2;
      const s = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
      const [gr, li] = splatAt(x, z, h, s);
      const dens = h < 2 ? 0 : Math.min(1, gr * 1.1 + li * 0.35);
      const o = (j * HM_RES + i) * 4;
      data[o] = toH(h); data[o + 1] = toH(dens); data[o + 2] = toH(moistureAt(x, z)); data[o + 3] = toH(1);
    }
    const t = new THREE.DataTexture(data, HM_RES, HM_RES, THREE.RGBAFormat, THREE.HalfFloatType);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    this.heightTex = t;
  }

  // ---- небо, свет, окружение ----
  buildSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(1400);
    this.sky.frustumCulled = false;
    this.sky.material.depthWrite = false;
    this.sky.renderOrder = -2;
    const u = this.sky.material.uniforms;
    u.turbidity.value = 4.5; u.rayleigh.value = 1.3; u.mieCoefficient.value = 0.0035; u.mieDirectionalG.value = 0.72;
    this.scene.add(this.sky);

    const sp = [];
    for (let i = 0; i < 450; i++) {
      const a = this.rand() * Math.PI * 2, v = Math.acos(this.rand() * 0.95);
      sp.push(Math.cos(a) * Math.sin(v) * 1300, Math.cos(v) * 1300, Math.sin(a) * Math.sin(v) * 1300);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc8d0e0, size: 1.1, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
    this.scene.fog = new THREE.FogExp2(0xa9bccb, 0.006);

    if (this.quality !== 'low' && this.renderer) {
      this.pmrem = new THREE.PMREMGenerator(this.renderer);
      this.envScene = new THREE.Scene();
      this.envSky = new THREE.Mesh(this.sky.geometry, this.sky.material);
      this.envSky.scale.setScalar(900);
      this.envScene.add(this.envSky);
      this.envTime = -1;
    }
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbfd6e8, 0x4a4030, 0.5);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 3);
    if (this.quality !== 'low') {
      this.sun.castShadow = true;
      const s = this.quality === 'high' ? 2048 : 1024;
      this.sun.shadow.mapSize.set(s, s);
      const c = this.sun.shadow.camera;
      c.left = c.bottom = -45; c.right = c.top = 45; c.near = 1; c.far = 400;
      this.sun.shadow.bias = -0.0005;
      this.sun.shadow.normalBias = 0.5;
    }
    this.scene.add(this.sun, this.sun.target);
  }

  // Время суток: цвета тумана и освещения; небо считает шейдер.
  static KEYS = [
    // t, туман, цвет солнца, сила солнца, сила неба
    [0.0, '#0a0f1a', '#8aa0d0', 0.0, 0.12],
    [0.21, '#131a28', '#8aa0d0', 0.0, 0.14],
    [0.255, '#9a7a66', '#ff9a55', 1.2, 0.3],
    [0.3, '#b5b4ad', '#ffd2a0', 2.4, 0.45],
    [0.4, '#b7c6cf', '#fff0dc', 3.2, 0.55],
    [0.6, '#b7c6cf', '#fff0dc', 3.2, 0.55],
    [0.7, '#bdb6a6', '#ffd6a0', 2.4, 0.45],
    [0.745, '#a27460', '#ff8a45', 1.2, 0.3],
    [0.79, '#161a28', '#8aa0d0', 0.0, 0.14],
    [1.0, '#0a0f1a', '#8aa0d0', 0.0, 0.12],
  ];

  setTime(t) {
    this.time = ((t % 1) + 1) % 1;
    const K = World.KEYS;
    let i = 0;
    while (i < K.length - 2 && K[i + 1][0] <= this.time) i++;
    const a = K[i], b = K[i + 1];
    const f = (this.time - a[0]) / (b[0] - a[0]);
    const fog = new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), f);
    const sunCol = new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), f);
    const sunI = a[3] + (b[3] - a[3]) * f;
    const hemiI = a[4] + (b[4] - a[4]) * f;
    const ang = (this.time - 0.25) * Math.PI * 2;
    const elev = Math.sin(ang);
    this.sunDir = new THREE.Vector3(Math.cos(ang) * 0.9, elev, 0.35).normalize();
    this.day = smoothstep(-0.08, 0.15, elev);
    this.night = elev < -0.05;
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    this.sky.material.uniforms.skyExposure.value = 0.42 * Math.max(0.02, this.day);
    this.lightDir = this.night ? this.sunDir.clone().negate() : this.sunDir.clone();
    this.sun.color.copy(this.night ? new THREE.Color('#8fa6d8') : sunCol);
    this.sun.intensity = this.night ? 0.18 : Math.max(0.1, sunI);
    this.hemi.intensity = hemiI * (this.pmrem ? 0.6 : 1.6) * (this.night ? 0.6 : 1);
    this.hemi.color.copy(fog).lerp(new THREE.Color('#9fc0e0'), 0.4);
    this.scene.fog.color.copy(fog);
    const rain = this.rain || 0, flash = this.flash || 0;
    this.scene.fog.density = 0.0045 + (1 - this.day) * 0.009 + rain * 0.008;
    this.scene.fog.color.multiplyScalar(1 - rain * 0.35);
    this.sun.intensity *= 1 - rain * 0.65;
    this.hemi.intensity = this.hemi.intensity * (1 - rain * 0.3) + flash * 3;
    this.sky.material.uniforms.skyExposure.value *= 1 - rain * 0.55;
    this.scene.background = this.scene.fog.color;
    this.stars.material.opacity = smoothstep(-0.05, -0.3, elev) * 0.45 * (1 - (this.rain || 0));
    this.fogColor = fog;
    this.sunColor = sunCol;
    if (this.waterU) {
      this.waterU.uSunDir.value.copy(this.lightDir);
      this.waterU.uSunColor.value.copy(this.sun.color).multiplyScalar(this.night ? 0.2 : 1);
      this.waterU.uHorizon.value.copy(fog);
      this.waterU.uTop.value.copy(fog).lerp(new THREE.Color(this.night ? '#05070d' : '#3f6fa8'), 0.6);
      this.waterU.uLight.value = 0.15 + 0.85 * this.day;
    }
    if (this.cloudMat) this.cloudMat.color.copy(fog).lerp(new THREE.Color(this.night ? '#1a2030' : '#ffffff'), this.night ? 0.2 : 0.7);
    this.updateEnv();
  }

  updateEnv() {
    if (!this.pmrem) return;
    const step = this.quality === 'high' ? 0.006 : 0.015;
    if (Math.abs(this.time - this.envTime) < step) return;
    this.envTime = this.time;
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 1, 2000);
    this.scene.environment = this.envRT.texture;
  }

  // ---- рельеф ----
  buildTerrain() {
    const seg = this.quality === 'low' ? 160 : this.quality === 'high' ? 300 : 230;
    const geo = new THREE.PlaneGeometry(SIZE * 1.3, SIZE * 1.3, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const n = geo.attributes.normal;
    const c = new Float32Array(p.count * 3), sp = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = p.getY(i), ny = n.getY(i);
      const s = Math.sqrt(1 - ny * ny) / Math.max(ny, 0.05);
      const w = splatAt(x, z, h, s);
      sp.set(w, i * 4);
      // оттенок: пепел у вулкана, влажный песок у воды, лёгкие пятна
      const vd = volcanoDist(x, z);
      let k = 1 + vn(x * 0.02, z * 0.02) * 0.12 + vn(x * 0.11, z * 0.11) * 0.06;
      k *= 1 - smoothstep(VOLCANO.r * 0.9, VOLCANO.r * 0.3, vd) * 0.55;
      if (h < 0.6) k *= 0.62 + 0.38 * smoothstep(-3, 0.6, h);
      c[i * 3] = k; c[i * 3 + 1] = k; c[i * 3 + 2] = k * (1 - smoothstep(VOLCANO.r * 0.9, VOLCANO.r * 0.3, vd) * 0.05);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geo.setAttribute('splat', new THREE.BufferAttribute(sp, 4));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, envMapIntensity: 0.5 });
    const T = this.tex;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { tGrass: { value: T.grass }, tLitter: { value: T.litter }, tRock: { value: T.rock }, tSand: { value: T.sand } });
      sh.vertexShader = 'attribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vWPos;\nvarying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvSplat = splat;\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz;\nvWN = normal;');
      sh.fragmentShader = 'uniform sampler2D tGrass, tLitter, tRock, tSand;\nvarying vec4 vSplat;\nvarying vec3 vWPos;\nvarying vec3 vWN;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `
          vec2 wuv = vWPos.xz;
          vec3 cg = mix(texture2D(tGrass, wuv * 0.21).rgb, texture2D(tGrass, wuv * 0.037).rgb, 0.5);
          vec3 cl = mix(texture2D(tLitter, wuv * 0.23).rgb, texture2D(tLitter, wuv * 0.041).rgb, 0.45);
          vec3 tb = pow(abs(normalize(vWN)), vec3(4.0));
          tb /= tb.x + tb.y + tb.z;
          vec3 cr = (texture2D(tRock, vWPos.zy * 0.22).rgb * tb.x + texture2D(tRock, vWPos.xz * 0.22).rgb * tb.y + texture2D(tRock, vWPos.xy * 0.22).rgb * tb.z) * 0.6
                  + (texture2D(tRock, vWPos.zy * 0.047).rgb * tb.x + texture2D(tRock, vWPos.xz * 0.047).rgb * tb.y + texture2D(tRock, vWPos.xy * 0.047).rgb * tb.z) * 0.4;
          vec3 cs = mix(texture2D(tSand, wuv * 0.17).rgb, texture2D(tSand, wuv * 0.031).rgb, 0.4);
          vec4 w = vSplat;
          // резче переходы: учитываем яркость текстур
          w.z *= 0.6 + dot(cr, vec3(1.2));
          w.w *= 0.7 + dot(cs, vec3(0.6));
          w /= max(w.x + w.y + w.z + w.w, 1e-4);
          float macro = 0.82 + 0.36 * texture2D(tLitter, wuv * 0.0045).g * 3.0;
          vec3 near = texture2D(tGrass, wuv * 0.93).rgb * w.x + texture2D(tLitter, wuv * 1.07).rgb * w.y + texture2D(tSand, wuv * 0.8).rgb * w.w + cr * w.z;
          float nd = 1.0 - smoothstep(4.0, 22.0, length(vWPos - cameraPosition));
          vec3 texc = mix(cg * w.x + cl * w.y + cr * w.z + cs * w.w, near, nd * 0.55) * macro;
          diffuseColor.rgb *= texc * 1.35;
        `);
    };
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  buildWater() {
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      tNormal: { value: null }, tHeight: { value: null }, uTime: { value: 0 }, uHM: { value: HM },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(1, 1, 1) },
      uHorizon: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uLight: { value: 1 },
    }]);
    u.tNormal.value = this.tex.water;
    u.tHeight.value = this.heightTex;
    this.waterU = u;
    const mat = new THREE.ShaderMaterial({
      uniforms: u, transparent: true, fog: true, depthWrite: false,
      vertexShader: `
        varying vec3 vWPos;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWPos = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D tNormal; uniform sampler2D tHeight; uniform float uTime; uniform float uHM;
        uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uHorizon; uniform vec3 uTop; uniform float uLight;
        varying vec3 vWPos;
        #include <fog_pars_fragment>
        void main() {
          vec2 uv = vWPos.xz;
          vec3 n1 = texture2D(tNormal, uv * 0.031 + vec2(uTime * 0.011, uTime * 0.007)).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(tNormal, uv * 0.097 - vec2(uTime * 0.017, -uTime * 0.013)).xyz * 2.0 - 1.0;
          vec3 n3 = texture2D(tNormal, uv * 0.31 + vec2(-uTime * 0.03, uTime * 0.021)).xyz * 2.0 - 1.0;
          vec3 n = normalize(vec3(n1.x + n2.x * 0.7 + n3.x * 0.35, 4.0, n1.y + n2.y * 0.7 + n3.y * 0.35));
          vec3 V = normalize(cameraPosition - vWPos);
          float ndv = max(dot(n, V), 0.0);
          float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
          vec3 R = reflect(-V, n);
          vec3 sky = mix(uHorizon, uTop, pow(max(R.y, 0.0), 0.45));
          vec2 huv = vWPos.xz / uHM + 0.5;
          float h = (huv.x < 0.0 || huv.y < 0.0 || huv.x > 1.0 || huv.y > 1.0) ? -30.0 : texture2D(tHeight, huv).r;
          float depth = max(0.0, -h);
          vec3 deep = vec3(0.006, 0.035, 0.05), shallow = vec3(0.05, 0.16, 0.14);
          vec3 water = mix(shallow, deep, smoothstep(0.0, 9.0, depth)) * uLight;
          vec3 col = mix(water, sky, fres);
          float spec = pow(max(dot(R, uSunDir), 0.0), 400.0);
          col += uSunColor * spec * 6.0 + uSunColor * pow(max(dot(R, uSunDir), 0.0), 40.0) * 0.08;
          float fn = texture2D(tNormal, uv * 0.35 + vec2(uTime * 0.04, uTime * 0.025)).b;
          float foam = (1.0 - smoothstep(0.0, 0.9, depth)) * smoothstep(0.55, 0.85, fn + (1.0 - smoothstep(0.0, 0.4, depth)) * 0.4);
          col = mix(col, vec3(0.85, 0.88, 0.86) * uLight, foam * 0.75);
          float alpha = mix(0.15, 0.94, smoothstep(0.0, 3.0, depth));
          alpha = max(alpha, max(fres, foam * 0.8));
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const geo = new THREE.PlaneGeometry(3200, 3200);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, mat);
    this.water.renderOrder = 1;
    this.scene.add(this.water);
  }

  vegMaterial(extra = {}) {
    const m = new THREE.MeshStandardMaterial({
      map: this.tex.atlas, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.82, envMapIntensity: 0.6, ...extra,
    });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.17;
          float k = max(position.y - 1.0, 0.0) * 0.012 + 0.02 * step(0.3, position.y);
          transformed.x += sin(uTime * 1.3 + ph + position.y * 0.3) * k;
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
      pos.set(it.x, it.h - 0.1, it.z);
      m.compose(pos, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.setRGB(0.8 + this.rand() * 0.3, 0.82 + this.rand() * 0.25, 0.75 + this.rand() * 0.25));
      if (obstacleR) this.addObstacle(it.x, it.z, obstacleR * sc);
    });
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    (this.sets = this.sets || []).push({ mesh, items });
    return mesh;
  }

  // Убирает растения и препятствия в круге (под домики и мачту).
  clearArea(x, z, r) {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const { mesh, items } of this.sets || []) {
      let changed = false;
      items.forEach((it, i) => {
        if (Math.hypot(it.x - x, it.z - z) < r + (it.scale || 1) * 1.5) { mesh.setMatrixAt(i, zero); changed = true; it.removed = true; }
      });
      if (changed) mesh.instanceMatrix.needsUpdate = true;
    }
    for (const f of this.ferns) if (Math.hypot(f.x - x, f.z - z) < r) { f.food = 0; f.removed = true; }
    // и траву: обнуляем плотность в карте высот
    const d = this.heightTex.image.data, zero = THREE.DataUtils.toHalfFloat(0);
    const i0 = Math.floor(((x - r) / HM + 0.5) * HM_RES), i1 = Math.ceil(((x + r) / HM + 0.5) * HM_RES);
    const j0 = Math.floor(((z - r) / HM + 0.5) * HM_RES), j1 = Math.ceil(((z + r) / HM + 0.5) * HM_RES);
    for (let j = Math.max(0, j0); j <= Math.min(HM_RES - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(HM_RES - 1, i1); i++) {
      const wx = ((i + 0.5) / HM_RES - 0.5) * HM, wz = ((j + 0.5) / HM_RES - 0.5) * HM;
      if (Math.hypot(wx - x, wz - z) < r) d[(j * HM_RES + i) * 4 + 1] = zero;
    }
    this.heightTex.needsUpdate = true;
    for (const [k, list] of this.obstacles) this.obstacles.set(k, list.filter((o) => Math.hypot(o.x - x, o.z - z) > r));
  }

  buildVegetation() {
    const mat = this.vegMaterial();
    this.vegMat = mat;
    const vd = (x, z) => volcanoDist(x, z) < VOLCANO.r * 0.8;
    const dens = this.quality === 'low' ? 0.6 : this.quality === 'high' ? 1.15 : 1;
    const trees = this.scatter(Math.round(16000 * dens), (x, z, h, s, m) => {
      if (s > 0.6 || h > 52 || vd(x, z)) return false;
      if (h < 3) return h > 0.8 && this.rand() < 0.06 ? 4 : false;
      const d = m > 0.05 ? 0.45 : 0.05;
      if (this.rand() > d) return false;
      const r = this.rand();
      if (m > 0.05) return r < 0.35 ? 1 : r < 0.7 ? 3 : 2;
      return r < 0.5 ? 2 : 1;
    });
    const shadow = this.quality !== 'low';
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    for (const t of trees) groups[t.type].push(t);
    this.instanced(araucaria(this.rand), mat, groups[1], () => 0.75 + this.rand() * 0.6, shadow, 0.5);
    this.instanced(broadleaf(this.rand), mat, groups[2], () => 0.75 + this.rand() * 0.5, shadow, 0.55);
    this.instanced(cycad(this.rand), mat, groups[3], () => 0.8 + this.rand() * 0.6, shadow, 0.55);
    this.instanced(palm(this.rand), mat, groups[4], () => 0.85 + this.rand() * 0.4, shadow, 0.35);

    const ferns = this.scatter(Math.round(10000 * dens), (x, z, h, s, m) => h > 2 && h < 45 && s < 0.45 && !vd(x, z) && this.rand() < (m > 0 ? 0.4 : 0.15));
    this.fernMesh = this.instanced(fernBush(this.rand), mat, ferns, () => 0.9 + this.rand() * 0.8, false, 0);
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

    const rocks = this.scatter(4500, (x, z, h, s) => (s > 0.55 ? this.rand() < 0.6 : (s > 0.35 || h > 40 || this.rand() < 0.1) && this.rand() < 0.3));
    this.rockMat = new THREE.MeshStandardMaterial({ map: this.tex.rock, vertexColors: true, roughness: 0.92, envMapIntensity: 0.5 });
    this.instanced(rockGeo(this.rand), this.rockMat, rocks, (it) => 0.5 + Math.pow(this.rand(), 2.5) * (it.h > 20 ? 7 : 4), shadow, 0.9);
  }

  nearestFern(x, z, r) {
    let best = null, bd = r;
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = this.fernGrid.get(`${cx + i},${cz + j}`);
      if (!list) continue;
      for (const f of list) {
        if (f.food < 0.15 || f.removed) continue;
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
    {
      const L = LANDMARKS.find((l) => l.id === 'bones');
      const y = heightAt(L.x, L.z);
      for (let i = 0; i < 9; i++) {
        const z = L.z - 8 + i * 2;
        for (const s of [-1, 1]) {
          const rib = new THREE.TorusGeometry(2.6 - Math.abs(i - 4) * 0.18, 0.13, 6, 14, Math.PI * 0.55);
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
    {
      const L = LANDMARKS.find((l) => l.id === 'nest');
      const y = heightAt(L.x, L.z);
      const ring = new THREE.TorusGeometry(1.8, 0.55, 8, 20);
      ring.rotateX(Math.PI / 2);
      ring.translate(L.x, y + 0.2, L.z);
      put(tint(ring, '#6a5536', 0.35, R));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        put(tint(ell(0.28, 0.4, 0.28, L.x + Math.cos(a) * 0.8, y + 0.35, L.z + Math.sin(a) * 0.8), '#cfc3a6', 0.2, R));
      }
    }
    const mesh = new THREE.Mesh(merge(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);

    {
      const L = LANDMARKS.find((l) => l.id === 'pillars');
      const pg = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + R();
        const d = 6 + R() * 10;
        const x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d;
        const hgt = 10 + R() * 16, r = 1.5 + R() * 1.3;
        const c = new THREE.CylinderGeometry(r * 0.75, r, hgt, 9, 6);
        const p = c.attributes.position;
        for (let k = 0; k < p.count; k++) { const s = 0.85 + R() * 0.3; p.setX(k, p.getX(k) * s); p.setZ(k, p.getZ(k) * s); }
        c.computeVertexNormals();
        const uv = c.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 2, uv.getY(k) * hgt * 0.15);
        c.translate(x, heightAt(x, z) + hgt / 2 - 0.5, z);
        pg.push(tint(c, R() > 0.5 ? '#e0b894' : '#caa488', 0.15, R));
        this.addObstacle(x, z, r);
      }
      const pm = new THREE.Mesh(merge(pg), this.rockMat);
      pm.castShadow = pm.receiveShadow = true;
      this.scene.add(pm);
    }
    {
      const L = LANDMARKS.find((l) => l.id === 'tree');
      const t = new THREE.Mesh(broadleaf(mulberry32(9)), this.vegMat);
      t.scale.setScalar(3.4);
      t.position.set(L.x, heightAt(L.x, L.z) - 0.5, L.z);
      t.castShadow = true;
      this.scene.add(t);
      this.addObstacle(L.x, L.z, 1.8);
    }
  }

  // Обломки вертолёта — место старта — и пять частей рации в опасных местах.
  buildMission() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x4a4f48, roughness: 0.55, metalness: 0.6, envMapIntensity: 0.8 });
    const paint = new THREE.MeshStandardMaterial({ color: 0x7a2a1c, roughness: 0.6, metalness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x223038, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6 });
    // место крушения: открытая поляна недалеко от озера
    let best = null;
    for (let a = 0; a < Math.PI * 2; a += 0.2) for (let d = 70; d < 130; d += 10) {
      const x = LAKES[0].x + Math.cos(a) * d, z = LAKES[0].z + Math.sin(a) * d, h = heightAt(x, z);
      if (h < 4 || h > 25) continue;
      const n = this.obstaclesNear(x, z, 14);
      const sl = Math.abs(heightAt(x + 4, z) - heightAt(x - 4, z)) + Math.abs(heightAt(x, z + 4) - heightAt(x, z - 4));
      const score = n * 3 + sl;
      if (!best || score < best.s) best = { x, z, s: score, a };
    }
    this.crash = best;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 3.6, 6, 14), paint);
    body.rotation.z = Math.PI / 2 + 0.25; body.rotation.y = 0.2; body.position.set(0, 1.1, 0);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    cab.position.set(2.2, 1.5, 0.2); cab.rotation.z = -1.2;
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 5.5, 8), paint);
    boom.rotation.z = Math.PI / 2 - 0.35; boom.rotation.y = 0.6; boom.position.set(-4.6, 0.9, 1.4);
    g.add(body, cab, boom);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.06, 0.35), metal);
      blade.position.set(-1 + i * 2.5, 0.25 + i * 0.3, -2.5 + i * 2.2);
      blade.rotation.set(0.1 * i, i * 1.3, 0.25 * (i - 1));
      g.add(blade);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(best.x, heightAt(best.x, best.z) - 0.3, best.z);
    g.rotation.y = best.a;
    this.scene.add(g);
    this.addObstacle(best.x, best.z, 2.6);
    this.crashFire = new THREE.PointLight(0xff7a30, 8, 22, 1.8);
    this.crashFire.position.set(best.x, g.position.y + 1.5, best.z);
    this.scene.add(this.crashFire);
    this.smokeSources = [{ x: best.x, y: g.position.y + 1.5, z: best.z, k: 0.35 }];

  }

  // Насколько хорошо укрыт человек в этой точке: 0 — открыто, 1 — густые заросли.
  coverAt(x, z) {
    const h = heightAt(x, z);
    if (h < 1.8) return 0;
    const e = 2;
    const sl = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    const [gr, li] = splatAt(x, z, h, sl);
    let c = Math.min(1, gr * 1.1 + li * 0.35) * 0.55;
    const f = this.nearestFern(x, z, 1.6);
    if (f) c += 0.45 * f.food;
    if (this.obstaclesNear(x, z, 2.5)) c += 0.15;
    return Math.min(1, c);
  }

  buildVolcanoFx() {
    const y = heightAt(VOLCANO.x, VOLCANO.z);
    const lava = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: 0xff6a20, fog: false, toneMapped: false }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(VOLCANO.x, y + 1.2, VOLCANO.z);
    this.scene.add(lava);
    this.lavaLight = new THREE.PointLight(0xff6a2a, 60, 90, 1.6);
    this.lavaLight.position.set(VOLCANO.x, y + 8, VOLCANO.z);
    this.scene.add(this.lavaLight);
    const tex = TX.cloudSprite(128);
    this.smoke = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: 0x5c5650, transparent: true, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.userData.t = i / 18;
      s.material.rotation = this.rand() * 6;
      this.smoke.push(s);
      this.scene.add(s);
    }
    this.volcanoTop = y;
  }

  buildClouds() {
    const tex = TX.cloudSprite();
    this.cloudMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    this.clouds = [];
    for (let i = 0; i < 30; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(this.rand() * 5);
      for (let k = 0; k < n; k++) {
        const s = new THREE.Sprite(this.cloudMat);
        const sc = 90 + this.rand() * 110;
        s.scale.set(sc, sc * 0.5, 1);
        s.position.set((k - n / 2) * 45 + this.rand() * 30, this.rand() * 18, this.rand() * 30);
        g.add(s);
      }
      g.position.set((this.rand() - 0.5) * 1800, 220 + this.rand() * 80, (this.rand() - 0.5) * 1800);
      this.clouds.push(g);
      this.scene.add(g);
    }
  }

  // Дождь: отрезки-капли, которые шейдер переносит вслед за камерой.
  buildRain() {
    this.rain = 0; this.rainTarget = 0; this.weatherT = 90; this.flash = 0; this.thunder = false;
    const N = this.quality === 'low' ? 1500 : 4000;
    const pos = new Float32Array(N * 6), tip = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = (this.rand() - 0.5) * 60, y = this.rand() * 30, z = (this.rand() - 0.5) * 60;
      pos.set([x, y, z, x, y, z], i * 6);
      tip[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTip', new THREE.BufferAttribute(tip, 1));
    this.rainU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uRain: { value: 0 } };
    this.rainMesh = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      uniforms: this.rainU, transparent: true, depthWrite: false,
      vertexShader: `uniform float uTime; uniform vec3 uCam; attribute float aTip; varying float vA;
        void main() {
          vec3 w;
          w.x = uCam.x + mod(position.x - uCam.x, 60.0) - 30.0;
          w.z = uCam.z + mod(position.z - uCam.z, 60.0) - 30.0;
          w.y = uCam.y - 10.0 + mod(position.y - uTime * 17.0, 30.0);
          w += vec3(0.1, 0.75, 0.05) * aTip;
          vA = 1.0 - aTip * 0.6;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `uniform float uRain; varying float vA;
        void main() { gl_FragColor = vec4(0.72, 0.77, 0.82, 0.32 * uRain * vA); }`,
    }));
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);
  }

  updateWeather(dt, camera) {
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      this.weatherT = 120 + this.rand() * 220;
      this.rainTarget = this.rand() < 0.4 ? 0.45 + this.rand() * 0.55 : 0;
    }
    this.rain += (this.rainTarget - this.rain) * Math.min(1, dt * 0.04);
    this.rainU.uTime.value += dt;
    this.rainU.uCam.value.copy(camera.position);
    this.rainU.uRain.value = this.rain;
    this.rainMesh.visible = this.rain > 0.02;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.thunder = false;
    if (this.rain > 0.6 && Math.random() < dt * 0.03) { this.flash = 1; this.thunder = true; }
  }

  update(dt, camera, focus) {
    this.updateWeather(dt, camera);
    this.uTime.value += dt;
    if (this.waterU) this.waterU.uTime.value += dt;
    this.sky.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    const d = this.lightDir;
    this.sun.position.set(focus.x + d.x * 150, focus.y + d.y * 150, focus.z + d.z * 150);
    this.sun.target.position.copy(focus);
    for (const s of this.smoke) {
      s.userData.t = (s.userData.t + dt * 0.02) % 1;
      const t = s.userData.t;
      s.position.set(VOLCANO.x + Math.sin(t * 9 + s.id) * 6 + t * 50, this.volcanoTop + 4 + t * 130, VOLCANO.z + Math.cos(t * 7 + s.id) * 6);
      const sc = 18 + t * 90;
      s.scale.set(sc, sc, 1);
      s.material.opacity = Math.sin(t * Math.PI) * 0.8;
    }
    this.lavaLight.intensity = 50 + Math.sin(this.uTime.value * 3) * 12;
    if (this.crashFire) this.crashFire.intensity = 6 + Math.sin(this.uTime.value * 11) * 1.5 + Math.sin(this.uTime.value * 23) * 1;
    if (this.crashSmoke === undefined && this.smokeSources) {
      this.crashSmoke = [];
      const tex = TX.cloudSprite(128);
      for (let i = 0; i < 10; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x2a2826, transparent: true, depthWrite: false }));
        sp.userData.t = i / 10;
        this.crashSmoke.push(sp);
        this.scene.add(sp);
      }
    }
    for (const sp of this.crashSmoke || []) {
      const src = this.smokeSources[0];
      sp.userData.t = (sp.userData.t + dt * 0.05) % 1;
      const t = sp.userData.t;
      sp.position.set(src.x + t * 8, src.y + t * 30, src.z + Math.sin(t * 6) * 2);
      sp.scale.setScalar(2 + t * 14);
      sp.material.opacity = Math.sin(t * Math.PI) * 0.6;
    }
    for (const c of this.clouds) {
      c.position.x += dt * 2.5;
      if (c.position.x > 950) c.position.x = -950;
    }
    this.regrowT = (this.regrowT || 0) + dt;
    if (this.regrowT > 1) {
      for (const f of this.ferns) {
        if (f.food < 1 && !f.removed) {
          f.food = Math.min(1, f.food + this.regrowT / 120);
          if (f.food - f.shown > 0.1 || f.food === 1) this.setFernScale(f);
        }
      }
      this.regrowT = 0;
    }
  }

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
