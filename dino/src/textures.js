// Процедурные «фотографические» текстуры: земля, скалы, песок, кора, листва, трава.
// Всё рисуется на canvas при запуске, поэтому игра не тянет мегабайты картинок.
import * as THREE from './three.js';
import { mulberry32 } from './noise.js';

// Бесшовный value-шум с периодом p.
function tileNoise(seed, p) {
  const rand = mulberry32(seed);
  const g = new Float32Array(p * p);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi);
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    const a = g[y0 * p + x0], b = g[y0 * p + x1], c = g[y1 * p + x0], d = g[y1 * p + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function fbmField(size, seed, base, oct = 5, ridged = false) {
  const out = new Float32Array(size * size);
  const ns = [];
  for (let o = 0; o < oct; o++) ns.push(tileNoise(seed + o * 17, base << o));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, amp = 0.5, tot = 0;
    for (let o = 0; o < oct; o++) {
      const k = (base << o) / size;
      let n = ns[o](x * k, y * k);
      if (ridged) n = 1 - Math.abs(n * 2 - 1);
      v += n * amp; tot += amp; amp *= 0.5;
    }
    out[y * size + x] = v / tot;
  }
  return out;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(c, repeat = true, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Заливка по полю шума: палитра из цветов по уровням.
function paintField(ctx, size, field, stops, contrast = 1) {
  const img = ctx.createImageData(size, size);
  const cols = stops.map(([t, c]) => [t, hex(c)]);
  for (let i = 0; i < size * size; i++) {
    let v = Math.min(1, Math.max(0, (field[i] - 0.5) * contrast + 0.5));
    let k = 0;
    while (k < cols.length - 2 && v > cols[k + 1][0]) k++;
    const [t0, c0] = cols[k], [t1, c1] = cols[k + 1];
    const f = Math.min(1, Math.max(0, (v - t0) / (t1 - t0)));
    img.data[i * 4] = lerp(c0[0], c1[0], f);
    img.data[i * 4 + 1] = lerp(c0[1], c1[1], f);
    img.data[i * 4 + 2] = lerp(c0[2], c1[2], f);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Рисует с повтором через края, чтобы текстура оставалась бесшовной.
function wrapDraw(size, x, y, r, fn) {
  for (const dx of [0, -size, size]) for (const dy of [0, -size, size]) {
    const X = x + dx, Y = y + dy;
    if (X + r < 0 || Y + r < 0 || X - r > size || Y - r > size) continue;
    fn(X, Y);
  }
}

function grain(ctx, size, rand, amount, alpha) {
  for (let i = 0; i < amount; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
}

export function grassGround(size = 512) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), rand = mulberry32(11);
  paintField(ctx, size, fbmField(size, 3, 4), [[0, '#3f4a22'], [0.45, '#56632c'], [0.7, '#6d7433'], [1, '#86783d']], 1.6);
  const cols = ['#4b5a25', '#5e6e2c', '#6f7d33', '#7f8a3c', '#8c7f45', '#394620', '#9a9150'];
  ctx.lineCap = 'round';
  for (let i = 0; i < 14000; i++) {
    const x = rand() * size, y = rand() * size, a = rand() * Math.PI * 2, l = 3 + rand() * 9;
    ctx.strokeStyle = cols[Math.floor(rand() * cols.length)];
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.lineWidth = 0.6 + rand() * 1.1;
    wrapDraw(size, x, y, l, (X, Y) => { ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); ctx.stroke(); });
  }
  ctx.globalAlpha = 1;
  grain(ctx, size, rand, 20000, 0.12);
  return toTexture(c);
}

export function forestFloor(size = 512) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), rand = mulberry32(12);
  paintField(ctx, size, fbmField(size, 5, 4), [[0, '#2a2016'], [0.5, '#44351f'], [0.8, '#5a4526'], [1, '#6b5a34']], 1.5);
  // опавшие листья и хвоя
  const leafCols = ['#6b4a22', '#7d5a2a', '#4f3a1d', '#8a6a35', '#5b5a2a', '#3e4a22'];
  for (let i = 0; i < 1600; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 5, a = rand() * Math.PI;
    ctx.fillStyle = leafCols[Math.floor(rand() * leafCols.length)];
    ctx.globalAlpha = 0.55 + rand() * 0.45;
    wrapDraw(size, x, y, r, (X, Y) => { ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.45, a, 0, Math.PI * 2); ctx.fill(); });
  }
  // мелкие камешки с тенью
  for (let i = 0; i < 260; i++) {
    const x = rand() * size, y = rand() * size, r = 1.5 + rand() * 3.5;
    wrapDraw(size, x, y, r + 2, (X, Y) => {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#1a140c';
      ctx.beginPath(); ctx.ellipse(X + 1, Y + 1.2, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(X - r * 0.3, Y - r * 0.3, 0, X, Y, r);
      g.addColorStop(0, '#9c9384'); g.addColorStop(1, '#5a5347');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
  grain(ctx, size, rand, 25000, 0.15);
  return toTexture(c);
}

export function rockTex(size = 512) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), rand = mulberry32(13);
  const a = fbmField(size, 8, 3, 6), b = fbmField(size, 9, 6, 4, true);
  const f = new Float32Array(size * size);
  for (let i = 0; i < f.length; i++) {
    const y = Math.floor(i / size);
    const strata = Math.sin((y / size) * Math.PI * 2 * 9 + a[i] * 8) * 0.08;
    f[i] = a[i] * 0.7 + b[i] * 0.3 + strata;
  }
  paintField(ctx, size, f, [[0, '#3a3834'], [0.35, '#57534c'], [0.6, '#77716a'], [0.85, '#948d83'], [1, '#aaa296']], 1.8);
  // лишайник
  for (let i = 0; i < 160; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 9;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(120,128,70,0.35)' : 'rgba(170,160,110,0.25)';
    wrapDraw(size, x, y, r, (X, Y) => { ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill(); });
  }
  // трещины
  ctx.strokeStyle = 'rgba(20,18,15,0.55)'; ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (rand() - 0.5) * 30; y += (rand() - 0.3) * 20; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  grain(ctx, size, rand, 30000, 0.18);
  return toTexture(c);
}

export function sandTex(size = 512) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), rand = mulberry32(14);
  const a = fbmField(size, 21, 4, 5);
  const f = new Float32Array(size * size);
  for (let i = 0; i < f.length; i++) {
    const x = i % size, y = Math.floor(i / size);
    f[i] = a[i] * 0.75 + Math.sin(((x + a[i] * 90) / size) * Math.PI * 2 * 14 + y * 0.01) * 0.06 + 0.1;
  }
  paintField(ctx, size, f, [[0, '#8d7a55'], [0.45, '#b8a57a'], [0.75, '#cdbb90'], [1, '#ddd0aa']], 1.4);
  grain(ctx, size, rand, 60000, 0.22);
  for (let i = 0; i < 90; i++) {
    const x = rand() * size, y = rand() * size, r = 1 + rand() * 2;
    ctx.fillStyle = rand() > 0.5 ? '#efe6d0' : '#6e604a';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

// Атлас растительности 2x2: лиственная ветка, лист папоротника, хвойная ветка, кора.
export function foliageAtlas(size = 1024) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), rand = mulberry32(15);
  const h = size / 2;
  ctx.clearRect(0, 0, size, size);
  // 0: ветка с листьями (левый верх)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, h, h); ctx.clip();
  ctx.strokeStyle = '#4a3a26'; ctx.lineWidth = 5;
  const twigs = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 2.2;
    const L = h * (0.25 + rand() * 0.2);
    const x1 = h / 2 + Math.cos(a) * L, y1 = h * 0.85 + Math.sin(a) * L * 1.6;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h / 2, h * 0.9); ctx.quadraticCurveTo(h / 2 + Math.cos(a) * L * 0.3, h * 0.6, x1, y1); ctx.stroke();
    twigs.push([x1, y1]);
  }
  const leafCols = ['#2f4a1f', '#3b5a26', '#4a6b2e', '#5a7a34', '#2a4020', '#6a8a3c'];
  for (let i = 0; i < 260; i++) {
    const [tx, ty] = twigs[Math.floor(rand() * twigs.length)];
    const x = tx + (rand() - 0.5) * h * 0.38, y = ty + (rand() - 0.5) * h * 0.38;
    const r = 9 + rand() * 12, a = rand() * Math.PI;
    ctx.fillStyle = leafCols[Math.floor(rand() * leafCols.length)];
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, a, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,10,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke();
  }
  ctx.restore();
  // 1: лист папоротника/саговника (правый верх), черешок снизу вверх
  ctx.save();
  ctx.translate(h, 0);
  ctx.beginPath(); ctx.rect(0, 0, h, h); ctx.clip();
  ctx.strokeStyle = '#4f6b2a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(h / 2, h); ctx.lineTo(h / 2, h * 0.03); ctx.stroke();
  for (let i = 0; i < 34; i++) {
    const t = i / 34, y = h * (0.97 - t * 0.92), len = h * 0.42 * Math.sin(Math.PI * (0.15 + t * 0.85)) * (1 - t * 0.3);
    for (const s of [-1, 1]) {
      ctx.fillStyle = ['#4f7a2a', '#5e8a33', '#44692a', '#6d963a'][Math.floor(rand() * 4)];
      ctx.beginPath();
      ctx.moveTo(h / 2, y);
      ctx.quadraticCurveTo(h / 2 + s * len * 0.5, y - len * 0.28, h / 2 + s * len, y - len * 0.2);
      ctx.quadraticCurveTo(h / 2 + s * len * 0.5, y - len * 0.02, h / 2, y + 4);
      ctx.fill();
    }
  }
  ctx.restore();
  // 2: хвойная ветка араукарии (левый низ)
  ctx.save();
  ctx.translate(0, h);
  ctx.beginPath(); ctx.rect(0, 0, h, h); ctx.clip();
  for (let b = 0; b < 5; b++) {
    const bx = h * (0.15 + b * 0.18), by = h * (0.95 - rand() * 0.1);
    const tip = [bx + (rand() - 0.5) * 60, h * (0.08 + rand() * 0.15)];
    ctx.strokeStyle = '#3a3222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    for (let i = 0; i < 180; i++) {
      const t = rand(), x = lerp(bx, tip[0], t), y = lerp(by, tip[1], t);
      const a = rand() * Math.PI * 2, l = 10 + rand() * 18 * (1 - t * 0.5);
      ctx.strokeStyle = ['#23391c', '#2d4722', '#365327', '#1e3018'][Math.floor(rand() * 4)];
      ctx.lineWidth = 2 + rand() * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.6); ctx.stroke();
    }
  }
  ctx.restore();
  // 3: кора (правый низ), непрозрачная
  ctx.save();
  ctx.translate(h, h);
  const bark = fbmField(128, 31, 4, 4);
  const tmp = makeCanvas(128, 128);
  paintField(tmp.getContext('2d'), 128, bark, [[0, '#2b2116'], [0.5, '#4a3a28'], [1, '#6e5a42']], 1.5);
  ctx.drawImage(tmp, 0, 0, h, h);
  for (let i = 0; i < 90; i++) {
    const x = rand() * h;
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(20,14,8,0.6)' : 'rgba(140,120,95,0.25)';
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath(); ctx.moveTo(x, 0);
    for (let y = 0; y <= h; y += 32) ctx.lineTo(x + (rand() - 0.5) * 8, y);
    ctx.stroke();
  }
  ctx.restore();
  const t = toTexture(c, false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Карточка травы: пучок тонких стеблей на прозрачном фоне.
export function grassCard(w = 256, h = 256) {
  const c = makeCanvas(w, h), ctx = c.getContext('2d'), rand = mulberry32(16);
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = w * (0.08 + rand() * 0.84), top = h * (0.05 + rand() * 0.55), bend = (rand() - 0.5) * w * 0.25;
    const bw = 2 + rand() * 3;
    const col = ['#56662b', '#6b7a33', '#7d8a3c', '#8e8a48', '#4a5a25', '#a09a58'][Math.floor(rand() * 6)];
    const g = ctx.createLinearGradient(0, h, 0, top);
    g.addColorStop(0, '#2c3616'); g.addColorStop(0.35, col); g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - bw, h);
    ctx.quadraticCurveTo(x - bw * 0.5 + bend * 0.4, (h + top) / 2, x + bend, top);
    ctx.quadraticCurveTo(x + bw * 0.5 + bend * 0.4, (h + top) / 2, x + bw, h);
    ctx.fill();
  }
  const t = toTexture(c, false);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Карта нормалей из высот (для воды).
export function waterNormals(size = 256) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d');
  const f = fbmField(size, 41, 8, 4);
  const img = ctx.createImageData(size, size);
  const H = (x, y) => f[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, true, false);
}

export function softSprite(inner, outer, size = 128) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, false);
}

// Облако: несколько размытых пятен шума.
export function cloudSprite(size = 256) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d');
  const f = fbmField(size, 51, 4, 5);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x / size - 0.5) * 2, dy = (y / size - 0.5) * 2.6;
    const fall = Math.max(0, 1 - Math.hypot(dx, dy));
    const v = Math.max(0, f[y * size + x] * 1.6 - 0.55) * fall * 2.2;
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.min(255, v * 255);
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, false);
}

// Высота-маска для чешуи (для кожи динозавров).
export function scaleBump(size = 256) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), rand = mulberry32(61);
  const pts = [];
  const n = 26;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.5 + (rand() - 0.5) * 0.8) / n * size, (j + 0.5 + (rand() - 0.5) * 0.8) / n * size]);
  const img = ctx.createImageData(size, size);
  const cell = size / n;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let d1 = 1e9, d2 = 1e9;
    const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const ii = (ci + a + n) % n, jj = (cj + b + n) % n;
      const p = pts[jj * n + ii];
      let px = p[0] + Math.floor((ci + a) / n) * size, py = p[1] + Math.floor((cj + b) / n) * size;
      const d = Math.hypot(px - x, py - y);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const v = Math.min(1, (d2 - d1) / (cell * 0.35));
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.pow(v, 0.6) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, true, false);
}
