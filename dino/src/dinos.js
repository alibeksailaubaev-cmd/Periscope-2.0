// Виды динозавров, процедурные модели и анимация.
import * as THREE from './three.js';
import { merge, ell, cone, limb, taper } from './geo.js';
import { createNoise2D } from './noise.js';
import { scaleBump } from './textures.js';

const pn = createNoise2D(77);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Фауна формации Хелл-Крик, конец мелового периода (~66 млн лет назад).
export const SPECIES = {
  raptor: {
    id: 'raptor', name: 'Дакотараптор', latin: 'Dakotaraptor steini', diet: 'carn', kind: 'biped', playable: true,
    len: 5.5, hip: 1.35, bodyR: [0.068, 0.082, 0.19], neckR: 0.036, head: [0.036, 0.038, 0.075], headUp: 0.17, headFwd: 0.37,
    tail: 1.05, legT: 0.8, arms: 2.0, teeth: true,
    walk: 3.6, run: 11.5, hp: 240, bite: 32, cool: 0.6, fear: 0, sight: 65,
    pal: { back: '#2e271f', belly: '#6f6250', stripe: '#120e0a', bands: 9 },
    stat: { speed: 0.9, power: 0.4, life: 0.3 },
    desc: 'Быстрый и ловкий охотник. Слаб в одиночку против крупной добычи, но догонит почти любого.',
    fact: 'Крупный дромеозаврид из формации Хелл-Крик, около 5,5 м в длину. На руках длинные маховые перья, на ногах серповидный коготь около 19 см. Возможно, охотился группами.',
  },
  trike: {
    id: 'trike', name: 'Трицератопс', latin: 'Triceratops horridus', diet: 'herb', kind: 'quad', playable: true,
    len: 8.5, hip: 1.75, bodyR: [0.13, 0.11, 0.26], neckR: 0.06, head: [0.06, 0.065, 0.085], headUp: 0.0, headFwd: 0.4,
    tail: 0.7, legT: 1.0, frontH: 0.92,
    walk: 2.8, run: 8.2, hp: 700, bite: 55, cool: 1.1, fear: 25, fights: true, sight: 40,
    pal: { back: '#3c3c2e', belly: '#77705a', stripe: '#24231a', bands: 5 },
    stat: { speed: 0.45, power: 0.75, life: 0.85 },
    desc: 'Живой танк с рогами. Ест папоротники, медленный, но хищники дважды подумают, прежде чем напасть.',
    fact: 'До 9 м в длину и 6–12 тонн. Костяной воротник и три рога служили для защиты и для демонстрации сородичам. Один из последних нептичьих динозавров: жил 68–66 млн лет назад.',
  },
  rex: {
    id: 'rex', name: 'Тираннозавр', latin: 'Tyrannosaurus rex', diet: 'carn', kind: 'biped', playable: true,
    len: 12, hip: 3.1, bodyR: [0.08, 0.095, 0.19], neckR: 0.06, head: [0.042, 0.05, 0.085], headUp: 0.05, headFwd: 0.37,
    tail: 0.95, legT: 1.0, arms: 0.55, teeth: true,
    walk: 3.4, run: 8.8, hp: 950, bite: 120, cool: 1.3, fear: 0, sight: 85,
    pal: { back: '#2a2922', belly: '#6a6252', stripe: '#141310', bands: 7 },
    stat: { speed: 0.5, power: 1.0, life: 1.0 },
    desc: 'Высший хищник острова. Детёнышем уязвим, но взрослым не боится никого.',
    fact: 'До 12–13 м в длину и около 8 тонн. Сила укуса оценивается до 35 000 ньютонов, это больше, чем у любого известного наземного животного. Отличное обоняние и бинокулярное зрение.',
  },
  strut: {
    id: 'strut', name: 'Струтиомим', latin: 'Struthiomimus altus', diet: 'herb', kind: 'biped',
    len: 4.3, hip: 1.45, bodyR: [0.07, 0.08, 0.15], neckR: 0.025, head: [0.022, 0.026, 0.045], headUp: 0.33, headFwd: 0.33,
    tail: 1.0, legT: 0.75, arms: 1.6, beak: true,
    walk: 3.8, run: 13.5, hp: 110, bite: 8, cool: 1, fear: 45, flees: true, sight: 45,
    pal: { back: '#4d4535', belly: '#8f8570', stripe: '#2c261c', bands: 0 },
    desc: 'Пугливый бегун. Лёгкая добыча, если сумеешь догнать.',
    fact: '«Подражающий страусу». Около 4 м в длину, беззубый клюв и длинные ноги. Оценки скорости доходят до 50 км/ч. Вероятно, был всеядным: ел растения, насекомых и мелких животных.',
  },
  anky: {
    id: 'anky', name: 'Анкилозавр', latin: 'Ankylosaurus magniventris', diet: 'herb', kind: 'quad',
    len: 7, hip: 1.15, bodyR: [0.15, 0.085, 0.27], neckR: 0.05, head: [0.05, 0.04, 0.06], headUp: -0.02, headFwd: 0.38,
    tail: 0.9, legT: 1.0, frontH: 0.95, armor: true,
    walk: 2.2, run: 5.2, hp: 650, bite: 65, cool: 1.4, fear: 18, fights: true, sight: 30,
    pal: { back: '#36352a', belly: '#66604e', stripe: '#1f1e16', bands: 0 },
    desc: 'Бронированный травоядный с булавой на хвосте.',
    fact: 'До 8 м в длину, спина покрыта костяными пластинами — остеодермами. Хвостовая булава могла ломать кости нападающим. Самый крупный из анкилозавров.',
  },
  ptero: {
    id: 'ptero', name: 'Кетцалькоатль', latin: 'Quetzalcoatlus northropi', diet: 'carn', kind: 'flyer',
    fact: 'Один из крупнейших известных летающих животных: размах крыльев около 10–11 м. Не динозавр, а птерозавр — их близкий родственник.',
  },
};

export const PLAYABLE = ['raptor', 'trike', 'rex'];

function paint(g, pal, solid, jitter = 0.08) {
  const p = g.attributes.position, n = g.attributes.normal;
  const arr = new Float32Array(p.count * 3);
  const tmp = new THREE.Color();
  if (solid) {
    const c = new THREE.Color(solid);
    for (let i = 0; i < p.count; i++) {
      const k = 1 + pn(p.getX(i) * 3, p.getZ(i) * 3 + p.getY(i) * 3) * jitter;
      arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
    }
  } else {
    const back = new THREE.Color(pal.back), belly = new THREE.Color(pal.belly), stripe = new THREE.Color(pal.stripe);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const t = ss(-0.4, 0.55, n.getY(i));
      tmp.copy(belly).lerp(back, t);
      if (pal.sf) {
        const s = Math.sin(z * pal.sf + pn(x * 0.9, z * 0.9) * 2.2);
        if (s > 0.4) tmp.lerp(stripe, Math.min(1, (s - 0.4) * 1.8) * t * 0.85);
      }
      tmp.multiplyScalar(1 + pn(x * 1.7 + y * 1.3, z * 1.7) * 0.1 + pn(x * 7, z * 7 + y * 7) * 0.07);
      arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function specParts(sp) {
  const L = sp.len, H = sp.hip;
  const pal = { ...sp.pal, sf: sp.pal.bands ? (Math.PI * 2 * sp.pal.bands) / L : 0 };
  const parts = {};
  const add = (name, parent, pivot) => (parts[name] = { parent, pivot, geos: [] });
  const skin = (g) => paint(g, pal);
  const solid = (g, c, j) => paint(g, null, c, j);
  const quad = sp.kind === 'quad';
  const [bx, by, bz] = sp.bodyR.map((v) => v * L);
  const bodyY = quad ? H * 1.15 : H * 1.08;

  add('rig', null, [0, 0, 0]);
  const rig = parts.rig.geos;
  rig.push(skin(ell(bx, by, bz, 0, bodyY, 0, 0, 0, 16)));
  rig.push(skin(ell(bx * 0.92, by * 0.95, bz * 0.55, 0, bodyY - by * 0.05, bz * 0.45, 0, 0, 14)));

  // шея и голова
  const neckBase = [0, bodyY + by * 0.2, bz * 0.72];
  const hp = [0, H + sp.headUp * L, sp.headFwd * L];
  const [hx, hy, hz] = sp.head.map((v) => v * L);
  add('neck', 'rig', neckBase);
  const nk = parts.neck.geos;
  nk.push(skin(limb(neckBase, hp, sp.neckR * L, sp.neckR * L * 1.15, 12, 1.2)));
  nk.push(skin(ell(hx, hy, hz, 0, hp[1], hp[2] + hz * 0.3, 0, 0, 14)));
  nk.push(skin(ell(hx * 0.72, hy * 0.7, hz * 0.85, 0, hp[1] - hy * 0.12, hp[2] + hz * 1.05)));
  parts.neck.eyes = [];
  parts.neck.eyePos = [];
  for (const s of [-1, 1]) {
    parts.neck.eyePos.push([s * hx * 0.86, hp[1] + hy * 0.33, hp[2] + hz * 0.55]);
    parts.neck.eyes.push(ell(hx * 0.17, hx * 0.14, hx * 0.17, s * hx * 0.8, hp[1] + hy * 0.33, hp[2] + hz * 0.5, 0, 0, 8));
    // тяжёлая надбровная дуга делает взгляд злее
    nk.push(skin(ell(hx * 0.3, hx * 0.12, hx * 0.36, s * hx * 0.7, hp[1] + hy * 0.5, hp[2] + hz * 0.48, 0.25, 0, 8)));
  }
  const jawP = [0, hp[1] - hy * 0.35, hp[2] - hz * 0.2];
  add('jaw', 'neck', jawP);
  parts.jaw.geos.push(skin(ell(hx * 0.62, hy * 0.28, hz * 0.95, 0, hp[1] - hy * 0.55, hp[2] + hz * 0.75)));
  if (sp.teeth) {
    for (let k = 0; k < 9; k++) {
      for (const s of [-1, 1]) {
        const big = 1 + 0.6 * Math.sin((k / 8) * Math.PI);
        nk.push(solid(cone(hx * 0.06, hy * 0.34 * big, s * hx * 0.52, hp[1] - hy * 0.5, hp[2] + hz * (0.3 + k * 0.19), Math.PI), '#d8ceb0', 0.1));
        parts.jaw.geos.push(solid(cone(hx * 0.05, hy * 0.26 * big, s * hx * 0.46, hp[1] - hy * 0.62, hp[2] + hz * (0.35 + k * 0.17)), '#d8ceb0', 0.1));
      }
    }
  }
  if (sp.beak) nk.push(solid(cone(hx * 0.35, hz * 0.6, 0, hp[1] - hy * 0.2, hp[2] + hz * 1.55, Math.PI / 2), '#2c261d', 0.05));
  if (sp.id === 'trike') {
    nk.push(solid(ell(0.15 * L, 0.13 * L, 0.02 * L, 0, hp[1] + hy * 0.95, hp[2] - hz * 0.55, -0.55, 0, 16), '#7a4f33', 0.25));
    nk.push(solid(ell(0.12 * L, 0.1 * L, 0.015 * L, 0, hp[1] + hy * 0.95, hp[2] - hz * 0.5, -0.55, 0, 16), '#9a6a45', 0.2));
    for (const s of [-1, 1]) nk.push(solid(cone(0.012 * L, 0.12 * L, s * hx * 0.5, hp[1] + hy * 0.55, hp[2] + hz * 0.45, 1.05), '#ddd0b2', 0.08));
    nk.push(solid(cone(0.01 * L, 0.04 * L, 0, hp[1] + hy * 0.15, hp[2] + hz * 1.45, 0.7), '#ddd0b2', 0.08));
    nk.push(solid(cone(hx * 0.3, hz * 0.5, 0, hp[1] - hy * 0.3, hp[2] + hz * 1.65, Math.PI / 2), '#2a241c', 0.05));
  }
  if (sp.id === 'anky') {
    for (const s of [-1, 1]) nk.push(solid(cone(hx * 0.18, hx * 0.5, s * hx * 0.8, hp[1] + hy * 0.4, hp[2] - hz * 0.2, -0.9, s * -0.6), '#4a4535', 0.1));
  }

  if (sp.id === 'raptor') {
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = 0, y = neckBase[1] + (hp[1] - neckBase[1]) * (1 - t) * 0.9 + by * 0.5 * t, z = neckBase[2] + (hp[2] - neckBase[2]) * (1 - t) * 0.85 - bz * 0.9 * t;
      nk.push(solid(cone(0.012 * L, (0.07 - t * 0.03) * L, x, y + sp.neckR * L * 0.6, z, -0.9), '#16120d', 0.2));
    }
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      rig.push(solid(ell(0.006 * L, 0.05 * L, 0.018 * L, s * bx * 0.85, bodyY - by * 0.35 - i * 0.012 * L, bz * 0.55 + i * 0.02 * L, 0.3, 0, 6), '#1a1510', 0.2));
    }
  }

  // руки у двуногих
  if (!quad && sp.arms) {
    for (const s of [-1, 1]) {
      const a = [s * bx * 0.7, bodyY - by * 0.15, bz * 0.62];
      const b = [s * bx * 0.8, bodyY - by * 0.15 - 0.06 * L * sp.arms * 0.5, bz * 0.62 + 0.05 * L * sp.arms * 0.5];
      rig.push(skin(limb(a, b, 0.012 * L * Math.max(1, sp.arms * 0.7), 0.016 * L * Math.max(1, sp.arms * 0.7), 8)));
    }
  }
  // броня анкилозавра
  if (sp.armor) {
    for (let i = -3; i <= 4; i++) {
      for (let j = -2; j <= 2; j++) {
        const x = j * bx * 0.38, z = i * bz * 0.21;
        const k = 1 - (x / bx) ** 2 - (z / bz) ** 2;
        if (k <= 0.05) continue;
        const y = bodyY + by * Math.sqrt(k) * 0.93;
        rig.push(solid(cone(0.022 * L, 0.035 * L, x, y, z, 0, -x / bx * 0.9), '#48432f', 0.15));
      }
    }
    for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) {
      rig.push(solid(cone(0.02 * L, 0.05 * L, s * bx * 0.92, bodyY, i * bz * 0.3, 0, -s * 1.35), '#48432f', 0.15));
    }
  }

  // хвост: плавно сужается от таза к кончику
  const segs = 5;
  const sl = (sp.tail * L * 0.55) / segs;
  const radii = [0.85, 0.66, 0.48, 0.32, 0.18, 0.05];
  const r0 = Math.min(bx, by) * 0.85;
  let prev = 'rig', y = bodyY + by * 0.05, z = -bz * 0.7;
  rig.push(skin(ell(r0 * 1.05, r0 * 1.05, r0 * 1.2, 0, y, z)));
  for (let i = 0; i < segs; i++) {
    const nm = 'tail' + i;
    add(nm, prev, [0, y, z]);
    const y2 = y - (quad ? 0.06 : 0.018) * H * (i < 2 ? 1.5 : 0.6);
    const z2 = z - sl;
    const ra = (r0 * radii[i]) / radii[0], rb = (r0 * radii[i + 1]) / radii[0];
    parts[nm].geos.push(skin(taper([0, y, z], [0, y2, z2], ra, rb, 12)));
    parts[nm].geos.push(skin(ell(ra, ra, ra, 0, y, z, 0, 0, 10)));
    if (sp.id === 'anky' && i === segs - 1) {
      parts[nm].geos.push(solid(ell(0.055 * L, 0.035 * L, 0.06 * L, 0, y2, z2 - 0.02 * L), '#5b5440', 0.15));
    }
    prev = nm; y = y2; z = z2;
  }

  // ноги
  const lt = sp.legT;
  if (!quad) {
    for (const s of [-1, 1]) {
      const nm = s < 0 ? 'L' : 'R';
      const hip = [s * bx * 0.72, bodyY - by * 0.35, -bz * 0.05];
      add('thigh' + nm, 'rig', hip);
      const knee = [s * bx * 0.8, H * 0.52, hip[2] + 0.12 * H];
      parts['thigh' + nm].geos.push(skin(limb(hip, knee, 0.05 * L * lt, 0.068 * L * lt, 10)));
      parts['thigh' + nm].geos.push(skin(ell(0.05 * L * lt, 0.2 * H, 0.08 * L * lt, hip[0], hip[1] - 0.08 * H, hip[2] + 0.02 * H)));
      add('shin' + nm, 'thigh' + nm, knee);
      const ankle = [s * bx * 0.8, H * 0.14, hip[2] - 0.1 * H];
      const sh = parts['shin' + nm].geos;
      sh.push(skin(taper(knee, ankle, 0.036 * L * lt, 0.022 * L * lt, 10)));
      sh.push(skin(ell(0.034 * L * lt, 0.034 * L * lt, 0.034 * L * lt, knee[0], knee[1], knee[2], 0, 0, 8)));
      sh.push(skin(ell(0.03 * L * lt * 1.1, 0.035 * H, 0.16 * H, ankle[0], 0.035 * H, ankle[2] + 0.16 * H)));
      if (sp.id === 'raptor') sh.push(solid(cone(0.008 * L, 0.05 * L, ankle[0], 0.06 * H, ankle[2] + 0.1 * H, 0.4), '#1c1712', 0.05));
    }
  } else {
    const legs = [['F', bz * 0.55, sp.frontH || 1], ['B', -bz * 0.45, 1]];
    for (const [fb, lz, hf] of legs) {
      for (const s of [-1, 1]) {
        const nm = fb + (s < 0 ? 'L' : 'R');
        const top = [s * bx * 0.7, (bodyY - by * 0.3) * hf, lz];
        const hh = top[1];
        add('upper' + nm, 'rig', top);
        const knee = [s * bx * 0.74, hh * 0.48, lz + (fb === 'F' ? -0.02 : 0.04) * L];
        parts['upper' + nm].geos.push(skin(limb(top, knee, 0.05 * L * lt, 0.062 * L * lt, 10)));
        add('lower' + nm, 'upper' + nm, knee);
        const foot = [knee[0], 0.07 * hh, lz];
        parts['lower' + nm].geos.push(skin(taper(knee, foot, 0.042 * L * lt, 0.036 * L * lt, 10)));
        parts['lower' + nm].geos.push(skin(ell(0.042 * L * lt, 0.042 * L * lt, 0.042 * L * lt, knee[0], knee[1], knee[2], 0, 0, 8)));
        parts['lower' + nm].geos.push(skin(ell(0.045 * L * lt, 0.07 * hh, 0.055 * L * lt, knee[0], 0.07 * hh, lz + 0.01 * L)));
      }
    }
  }
  return { parts, bodyY, bx };
}

const cache = {};
// Глаза отражают свет в темноте, как у настоящих ночных хищников.
export const EYE_MAT = new THREE.MeshStandardMaterial({ color: 0x1a1408, emissive: 0xe8c860, emissiveIntensity: 0.1, roughness: 0.15 });
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.2, 'rgba(255,200,90,0.8)'); g.addColorStop(1, 'rgba(255,160,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export const EYE_GLOW = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false });
export const DINO_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.3 });
let scaleTex = null;
// Чешуя: трипланарная карта высот в координатах модели + рельеф через производные.
DINO_MAT.onBeforeCompile = (sh) => {
  scaleTex = scaleTex || scaleBump();
  sh.uniforms.tScale = { value: scaleTex };
  sh.vertexShader = 'varying vec3 vObj;\nvarying vec3 vObjN;\n' + sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvObj = position;\nvObjN = normal;');
  sh.fragmentShader = 'uniform sampler2D tScale;\nvarying vec3 vObj;\nvarying vec3 vObjN;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `
    #include <normal_fragment_maps>
    {
      vec3 bw = pow(abs(normalize(vObjN)), vec3(4.0));
      bw /= (bw.x + bw.y + bw.z);
      vec3 q = vObj * 0.2;
      float hs = texture2D(tScale, q.yz).r * bw.x + texture2D(tScale, q.xz).r * bw.y + texture2D(tScale, q.xy).r * bw.z;
      float hl = texture2D(tScale, q.yz * 0.27).r * bw.x + texture2D(tScale, q.xz * 0.27).r * bw.y + texture2D(tScale, q.xy * 0.27).r * bw.z;
      // вдали чешуя растворяется, чтобы не рябила
      float fade = 1.0 - smoothstep(0.002, 0.01, length(fwidth(q)));
      float hgt = mix(0.75, hs * 0.65 + hl * 0.35, fade);
      vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
      float hx = dFdx(hgt), hy = dFdy(hgt);
      vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
      float det = dot(dpdx, r1);
      vec3 grad = sign(det) * (hx * r1 + hy * r2);
      normal = normalize(abs(det) * normal - grad * 0.5 * fade);
      diffuseColor.rgb *= 0.9 + 0.12 * hgt;
      roughnessFactor = clamp(0.68 + 0.3 * (1.0 - hs), 0.0, 1.0);
    }
  `);
};

function template(id) {
  if (cache[id]) return cache[id];
  const { parts, bodyY, bx } = specParts(SPECIES[id]);
  const list = [];
  for (const [name, p] of Object.entries(parts)) {
    let geo = null;
    if (p.geos.length) {
      geo = merge(p.geos);
      geo.translate(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
    }
    let eyes = null;
    if (p.eyes) {
      eyes = merge(p.eyes);
      eyes.translate(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
    }
    const eyePos = p.eyePos ? p.eyePos.map((e) => [e[0] - p.pivot[0], e[1] - p.pivot[1], e[2] - p.pivot[2]]) : null;
    list.push({ name, parent: p.parent, pivot: p.pivot, geo, eyes, eyePos, glow: SPECIES[id].len * 0.06 });
  }
  cache[id] = { list, bodyY, bx };
  return cache[id];
}

export function createDino(id) {
  const t = template(id);
  const root = new THREE.Group();
  const objs = {}, pivots = {};
  for (const part of t.list) {
    const o = part.geo ? new THREE.Mesh(part.geo, DINO_MAT) : new THREE.Group();
    if (part.geo) o.castShadow = true;
    const pp = part.parent ? pivots[part.parent] : [0, 0, 0];
    o.position.set(part.pivot[0] - pp[0], part.pivot[1] - pp[1], part.pivot[2] - pp[2]);
    (part.parent ? objs[part.parent] : root).add(o);
    objs[part.name] = o;
    pivots[part.name] = part.pivot;
    if (part.eyes) {
      o.add(new THREE.Mesh(part.eyes, EYE_MAT));
      // ореол глаз, видимый в темноте издалека
      for (const e of part.eyePos) {
        const g = new THREE.Sprite(EYE_GLOW);
        g.position.set(...e);
        g.scale.setScalar(part.glow);
        o.add(g);
      }
    }
  }
  return {
    root, parts: objs, sp: SPECIES[id], bodyY: t.bodyY, bx: t.bx,
    phase: Math.random() * 6, seed: Math.random() * 10, amp: 0,
    bite: 0, roar: 0, graze: 0, rest: 0, dead: 0, swim: 0, pitch: 0, scale: 1, stalk: 0, look: 0,
  };
}

export function animateDino(d, dt, speed, t, turn = 0) {
  const sp = d.sp, P = d.parts, H = sp.hip;
  const target = speed < 0.05 ? 0 : Math.min(1, speed / (sp.walk * 1.1)) * (speed > sp.walk * 1.4 ? 0.8 : 0.55);
  d.amp += (target - d.amp) * Math.min(1, dt * 6);
  const A = d.amp * (1 - d.dead);
  d.phase += (dt * speed * Math.PI) / (H * 1.3 * d.scale);
  const ph = d.phase, R = d.rest, D = d.dead;
  if (sp.kind === 'biped') {
    P.thighL.rotation.x = Math.sin(ph) * A - R * 0.9 - D * 0.3;
    P.thighR.rotation.x = Math.sin(ph + Math.PI) * A - R * 0.9 - D * 0.5;
    P.shinL.rotation.x = Math.max(0, Math.sin(ph + 1.6)) * A * 1.1 + R * 1.7;
    P.shinR.rotation.x = Math.max(0, Math.sin(ph + Math.PI + 1.6)) * A * 1.1 + R * 1.7;
  } else {
    const legs = [['FL', 0], ['BR', 0], ['FR', Math.PI], ['BL', Math.PI]];
    for (const [nm, off] of legs) {
      P['upper' + nm].rotation.x = Math.sin(ph + off) * A * 0.75 - R * 0.5 - D * 0.3;
      P['lower' + nm].rotation.x = Math.max(0, Math.sin(ph + off + 1.6)) * A * 0.9 + R * 1.2;
    }
  }
  const bob = -Math.abs(Math.sin(ph)) * 0.04 * H * A;
  const restDrop = R * H * (sp.kind === 'biped' ? 0.42 : 0.3);
  const deadLift = D * (d.bx * 0.85 - d.bodyY * 0.12);
  P.rig.position.y = bob - restDrop + deadLift - d.swim * d.bodyY * 0.85;
  P.rig.rotation.z = D * 1.45;
  P.rig.rotation.x = -d.pitch * (1 - D);
  for (let i = 0; i < 5; i++) {
    const tp = P['tail' + i];
    tp.rotation.y = Math.sin(t * 1.7 - i * 0.65 + d.seed) * (0.04 + 0.06 * A) * (1 - D) - turn * 0.06;
    tp.rotation.x = Math.sin(t * 1.2 - i * 0.5) * 0.02 + R * 0.05 + D * 0.05;
  }
  const breath = Math.sin(t * 1.3 + d.seed) * 0.025;
  P.neck.rotation.x = breath + d.bite * 0.2 + d.graze * 0.55 - d.roar * 0.35 + R * 0.2;
  P.neck.rotation.y = (Math.sin(t * 0.37 + d.seed) * 0.12 * (1 - A) + d.look) * (1 - D);
  // крадущийся хищник опускает голову и приоткрывает пасть
  P.neck.rotation.x += d.stalk * 0.22;
  P.rig.position.y -= d.stalk * H * 0.08;
  P.jaw.rotation.x = d.bite * 0.5 + d.roar * 0.65 + d.graze * Math.max(0, Math.sin(t * 9)) * 0.25 + d.stalk * (0.18 + Math.sin(t * 2.3 + d.seed) * 0.05) + 0.04;
}

// Птерозавры кружат над островом ради атмосферы.
export function createPterosaur() {
  const g = [];
  const pal = { back: '#6b5b4a', belly: '#c9b89a', stripe: '#3a3028', sf: 0 };
  g.push(paint(ell(0.35, 0.35, 1.1, 0, 0, 0), pal));
  g.push(paint(limb([0, 0.1, 0.8], [0, 0.6, 2.2], 0.12, 0.12, 8), pal));
  g.push(paint(ell(0.18, 0.2, 0.7, 0, 0.7, 2.6), pal));
  g.push(paint(cone(0.09, 1.3, 0, 0.66, 3.0, Math.PI / 2), null, '#3b2e22'));
  g.push(paint(cone(0.1, 0.8, 0, 0.8, 2.3, -0.9), null, '#9a4a2c'));
  const body = new THREE.Mesh(merge(g), DINO_MAT);
  const root = new THREE.Group();
  root.add(body);
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(s * 0.3, 0.1, 0.4);
    const w = paint(ell(2.7, 0.05, 0.9, s * 2.6, 0, -0.2, 0, 0, 10), null, '#7a6552', 0.15);
    const tip = paint(ell(2.3, 0.04, 0.5, s * 6.6, 0, -0.1, 0, 0, 10), null, '#6a5646', 0.15);
    const m = new THREE.Mesh(merge([w, tip]), DINO_MAT);
    piv.add(m);
    root.add(piv);
    wings.push([piv, s]);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root, wings, phase: Math.random() * 6 };
}
