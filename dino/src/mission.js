// Квест, домики-укрытия, станция, радиомачта, предметы и записки экспедиции.
import * as THREE from './three.js';
import { heightAt, VOLCANO, LAKES, volcanoDist } from './terrain.js';
import { LANDMARKS } from './world.js';
import { mulberry32 } from './noise.js';
import { planks, rustMetal } from './textures.js';

// Записки экспедиции «Мезозой-4». В них история острова и подсказки к выживанию.
export const NOTES = {
  n1: { title: 'Дневник смотрителя станции', text: 'Если ты это читаешь — ты не из наших. Станция «Мезозой-4» брошена. Когда они прорвались, мы бежали кто куда, и детали большой рации разлетелись по острову: я отметил на карте, где видел ящики последний раз. Генератор на станции исправен, но баки пусты. Без него мачта на Мысе заката не дотянет до материка. И запомни: в домики они не пролезают. Двери узкие. Пока.' },
  n2: { title: 'Записка биолога Лагутиной', text: 'Дакотарапторы охотятся тройками. Один шумит впереди, двое заходят с боков. Они слышат бегущего человека за сорок метров, а крадущегося почти не слышат. В высокой траве, пригнувшись, я пролежала рядом с ними полчаса.' },
  n3: { title: 'Лист из журнала наблюдений', text: 'Тираннозавр плохо видит неподвижное, но чует и слышит отлично. Когда он идёт, земля дрожит — это единственное предупреждение. Не беги от него по открытому месту. Прячься за деревьями и замри.' },
  n4: { title: 'Записка механика', text: 'Канистру с бензином я спрятал, когда рапторы начали ходить вокруг станции. Если найдёшь — генератор заводится ручкой, но ревёт так, что его слышно на полострова. Заводи и сразу беги к мачте.' },
  n5: { title: 'Обрывок радиожурнала', text: '…база, приём. Повторяю, «Мезозой-4» просит эвакуацию. Вертолёт сможет сесть только на Мысе заката, там ровная площадка. Сигнал держим девяносто секунд, дольше мачта не выдержит… приём…' },
  n6: { title: 'Детский рисунок на обороте карты', text: 'Кто-то нарисовал углём большого зверя с горящими глазами и подписал: «ночью они видят нас лучше, чем мы их». Внизу приписка взрослым почерком: «Фонарь — только в крайнем случае».' },
  n7: { title: 'Последняя запись', text: 'Камни. Брось камень подальше, и они идут на звук. Я так дважды ушёл. В третий раз камней не было.' },
};

const HUT_W = 4.4, HUT_D = 4, HUT_H = 2.6, DOOR_W = 1.6, DOOR_H = 2.1;

function flatness(x, z, r) {
  const hs = [];
  for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]]) hs.push(heightAt(x + a, z + b));
  return { min: Math.min(...hs), max: Math.max(...hs) };
}

function scaleUV(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

export class Mission {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.rand = mulberry32(555);
    this.wood = new THREE.MeshStandardMaterial({ map: planks(), roughness: 0.9, envMapIntensity: 0.4 });
    this.roofMat = new THREE.MeshStandardMaterial({ map: rustMetal(), roughness: 0.6, metalness: 0.4, envMapIntensity: 0.6, side: THREE.DoubleSide });
    this.dark = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.8 });
    this.metal = new THREE.MeshStandardMaterial({ color: 0x5a5f58, roughness: 0.45, metalness: 0.7 });
    this.lampOff = new THREE.MeshStandardMaterial({ color: 0x302a20, emissive: 0xffc070, emissiveIntensity: 0.6 });
    this.huts = [];
    this.buildHuts();
    this.buildStation();
    this.buildMast();
    this.items = [];
    this.flags = {};
    this.genHold = 0;
    this.rescueT = -1;
    // одна тёплая лампа, которая «переезжает» в ближайший домик
    this.hutLight = new THREE.PointLight(0xffb060, 6, 9, 1.6);
    this.scene.add(this.hutLight);
  }

  spot(ax, az, rMin, rMax, size = 4) {
    let best = null;
    for (let i = 0; i < 160; i++) {
      const a = this.rand() * Math.PI * 2, d = rMin + this.rand() * (rMax - rMin);
      const x = ax + Math.cos(a) * d, z = az + Math.sin(a) * d;
      const f = flatness(x, z, size);
      if (f.min < 3 || f.max > 38 || volcanoDist(x, z) < VOLCANO.r) continue;
      const score = (f.max - f.min) * 3 + this.world.obstaclesNear(x, z, size + 2) * 0.3;
      if (!best || score < best.score) best = { x, z, score, y: f.max };
    }
    return best;
  }

  // Домик: доски, окна, дверной проём, крыша из ржавого железа, койка и стол внутри.
  makeHut(name, x, z, rot, W = HUT_W, D = HUT_D, station = false) {
    const g = new THREE.Group();
    const y = flatness(x, z, Math.max(W, D) / 2).max + 0.15;
    const box = (w, h, d, px, py, pz, mat = this.wood) => {
      const geo = scaleUV(new THREE.BoxGeometry(w, h, d), Math.max(w, d) / 1.6, h / 2.2);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const t = 0.14;
    box(W, 0.2, D, 0, 0.1, 0);
    box(W, 1.2, D, 0, -0.5, 0, this.dark);
    box(W, HUT_H, t, 0, HUT_H / 2 + 0.2, -D / 2);
    const side = (sx) => {
      box(t, 1.1, D, sx, 0.75, 0);
      box(t, HUT_H - 1.85, D, sx, 1.85 + (HUT_H - 1.85) / 2 + 0.2, 0);
      box(t, 0.75, D / 2 - 0.45, sx, 1.5 + 0.2, -D / 4 - 0.225);
      box(t, 0.75, D / 2 - 0.45, sx, 1.5 + 0.2, D / 4 + 0.225);
    };
    side(-W / 2); side(W / 2);
    const fw = (W - DOOR_W) / 2;
    box(fw, HUT_H, t, -W / 2 + fw / 2, HUT_H / 2 + 0.2, D / 2);
    box(fw, HUT_H, t, W / 2 - fw / 2, HUT_H / 2 + 0.2, D / 2);
    box(DOOR_W, HUT_H - DOOR_H, t, 0, DOOR_H + (HUT_H - DOOR_H) / 2 + 0.2, D / 2);
    // выломанная дверь лежит рядом
    const door = box(DOOR_W - 0.1, 0.06, DOOR_H - 0.1, 1.2, 0.05, D / 2 + 1.3);
    door.rotation.y = 0.4;
    // двускатная крыша и фронтоны
    const pitch = 0.5, rl = (D / 2 + 0.35) / Math.cos(pitch);
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(scaleUV(new THREE.BoxGeometry(W + 0.5, 0.05, rl), 2, 2), this.roofMat);
      r.position.set(0, HUT_H + 0.2 + Math.tan(pitch) * (D / 4), s * D / 4);
      r.rotation.x = s * pitch;
      r.castShadow = r.receiveShadow = true;
      g.add(r);
    }
    const tri = new THREE.Shape();
    tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, Math.tan(pitch) * D / 2); tri.closePath();
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), this.wood);
      m.rotation.y = Math.PI / 2;
      m.position.set(s * (W / 2), HUT_H + 0.2, 0);
      m.material.side = THREE.DoubleSide;
      g.add(m);
    }
    // обстановка
    box(0.8, 0.35, 1.9, -W / 2 + 0.55, 0.45, -D / 2 + 1.1, this.dark);
    box(1.1, 0.06, 0.7, W / 2 - 0.8, 0.95, -D / 2 + 0.6);
    for (const [lx, lz] of [[-0.45, -0.28], [0.45, -0.28], [-0.45, 0.28], [0.45, 0.28]]) box(0.05, 0.75, 0.05, W / 2 - 0.8 + lx, 0.57, -D / 2 + 0.6 + lz, this.dark);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 8), this.lampOff);
    lamp.position.set(W / 2 - 0.5, 1.1, -D / 2 + 0.55);
    g.add(lamp);
    g.position.set(x, y, z);
    g.rotation.y = rot;
    this.scene.add(g);
    this.world.clearArea(x, z, Math.max(W, D) * 0.8 + 1.5);
    // стены как препятствия; проём двери свободен
    const c = Math.cos(rot), s = Math.sin(rot);
    const toW = (lx, lz) => ({ x: x + lx * c + lz * s, z: z - lx * s + lz * c });
    const addWall = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.45);
      for (let i = 0; i <= n; i++) {
        const lx = x0 + (x1 - x0) * i / n, lz = z0 + (z1 - z0) * i / n;
        if (Math.abs(lz - D / 2) < 0.01 && Math.abs(lx) < DOOR_W / 2 + 0.05) continue;
        const p = toW(lx, lz);
        this.world.addObstacle(p.x, p.z, 0.3);
      }
    };
    addWall(-W / 2, -D / 2, W / 2, -D / 2);
    addWall(-W / 2, -D / 2, -W / 2, D / 2);
    addWall(W / 2, -D / 2, W / 2, D / 2);
    addWall(-W / 2, D / 2, -DOOR_W / 2 - 0.05, D / 2);
    addWall(DOOR_W / 2 + 0.05, D / 2, W / 2, D / 2);
    const hut = { name, x, z, y, rot, W, D, group: g, lamp, station, toW, door: toW(0, D / 2 + 1.4), table: toW(W / 2 - 0.8, -D / 2 + 0.6), floorY: y + 0.2 };
    this.huts.push(hut);
    return hut;
  }

  buildHuts() {
    const crash = this.world.crash;
    const R = this.world;
    const anchors = [
      ['Домик смотрителя', crash.x, crash.z, 45, 80],
      ['Хижина у заводи', LAKES[1].x, LAKES[1].z, LAKES[1].r * 1.6, LAKES[1].r * 2.4],
      ['Лесная хижина', LAKES[2].x, LAKES[2].z, LAKES[2].r * 1.8, LAKES[2].r * 3],
      ['Сторожка у столбов', -230, -130, 25, 45],
    ];
    for (const [name, ax, az, a, b] of anchors) {
      const p = this.spot(ax, az, a, b);
      if (p) this.makeHut(name, p.x, p.z, this.rand() * Math.PI * 2);
    }
    this.ranger = this.huts[0];
    void R;
  }

  buildStation() {
    const p = this.spot(40, -100, 0, 60, 6);
    const st = this.makeHut('Станция «Мезозой-4»', p.x, p.z, this.rand() * Math.PI * 2, 8, 5, true);
    this.station = st;
    const g = st.group;
    const gen = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.8), new THREE.MeshStandardMaterial({ color: 0x3d5a3a, roughness: 0.6, metalness: 0.5 }));
    body.position.y = 0.45;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), this.metal);
    pipe.position.set(0.45, 1.2, 0);
    gen.add(body, pipe);
    gen.position.set(4 + 1.2, 0, 0.5);
    gen.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.add(gen);
    // прожекторы включаются вместе с генератором
    this.floods = [];
    for (const lx of [-3.5, 3.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), this.metal);
      post.position.set(lx, 2, 2.5 + 1.2);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2d0, emissiveIntensity: 0 }));
      head.position.set(lx, 4, 2.5 + 1.2);
      g.add(post, head);
      this.floods.push(head);
    }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 5, 6), this.metal);
    ant.position.set(-2.5, HUT_H + 2.5, -1);
    g.add(ant);
    st.generator = st.toW(4 + 1.2, 0.5);
    this.world.addObstacle(st.generator.x, st.generator.z, 0.7);
    this.floodLight = new THREE.PointLight(0xfff0d0, 0, 30, 1.5);
    this.floodLight.position.set(st.x, st.y + 4, st.z);
    this.scene.add(this.floodLight);
  }

  buildMast() {
    const cape = LANDMARKS.find((l) => l.id === 'cape');
    let x = cape.x + 12, z = cape.z;
    for (let i = 0; i < 40 && heightAt(x, z) < 2.5; i++) { x += 3; }
    const y = heightAt(x, z);
    const g = new THREE.Group();
    const Hm = 14;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, Hm, 5), this.metal);
      leg.position.set(a * 0.5, Hm / 2, b * 0.5);
      leg.rotation.set(-b * 0.03, 0, a * 0.03);
      g.add(leg);
    }
    for (let k = 1; k < 7; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62 - k * 0.03, 0.025, 4, 4), this.metal);
      ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      ring.position.y = k * 2;
      g.add(ring);
    }
    this.mastLamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010, toneMapped: false }));
    this.mastLamp.position.y = Hm + 0.2;
    const console = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), this.metal);
    console.position.set(0, 0.55, 1.1);
    g.add(this.mastLamp, console);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.position.set(x, y - 0.1, z);
    this.scene.add(g);
    this.world.clearArea(x, z, 5);
    this.world.addObstacle(x, z, 0.8);
    this.mast = { x, z: z + 1.1, name: 'Радиомачта' };
  }

  // ---------- предметы ----------
  itemMesh(kind) {
    const g = new THREE.Group();
    const M = (geo, mat, px = 0, py = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
    if (kind === 'part') {
      M(new THREE.BoxGeometry(0.7, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xc25a18, roughness: 0.5 }), 0, 0.2, 0);
      g.userData.lamp = M(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }), 0.25, 0.45, 0);
      M(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), this.metal, -0.25, 0.7, 0);
    } else if (kind === 'fuel') {
      M(new THREE.BoxGeometry(0.2, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0xa01810, roughness: 0.4, metalness: 0.3 }), 0, 0.22, 0);
      M(new THREE.TorusGeometry(0.07, 0.02, 4, 8), this.metal, 0, 0.5, 0);
    } else if (kind === 'medkit') {
      M(new THREE.BoxGeometry(0.42, 0.22, 0.3), new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.5 }), 0, 0.11, 0);
      M(new THREE.BoxGeometry(0.2, 0.225, 0.06), new THREE.MeshStandardMaterial({ color: 0xc01818 }), 0, 0.11, 0);
      M(new THREE.BoxGeometry(0.06, 0.225, 0.2), new THREE.MeshStandardMaterial({ color: 0xc01818 }), 0, 0.11, 0);
    } else if (kind === 'stones') {
      for (let i = 0; i < 5; i++) M(new THREE.DodecahedronGeometry(0.09 + this.rand() * 0.05), new THREE.MeshStandardMaterial({ color: 0x7a746a, roughness: 0.95, flatShading: true }), (this.rand() - 0.5) * 0.35, 0.08, (this.rand() - 0.5) * 0.35);
    } else if (kind === 'note') {
      const m = M(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0x403828, roughness: 0.9, side: THREE.DoubleSide }), 0, 0.02, 0);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = this.rand();
    } else if (kind === 'flashlight') {
      const m = M(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 }), 0, 0.05, 0);
      m.rotation.z = Math.PI / 2;
    }
    // блик, чтобы предмет было видно издалека
    if (kind !== 'part') {
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      glint.scale.setScalar(0.35);
      glint.position.y = 0.35;
      g.add(glint);
      g.userData.glint = glint;
    }
    return g;
  }

  addItem(id, kind, x, z, y, label, extra = {}) {
    const mesh = this.itemMesh(kind);
    const yy = y ?? heightAt(x, z);
    mesh.position.set(x, yy + 0.02, z);
    mesh.rotation.y = this.rand() * 6;
    this.scene.add(mesh);
    const it = { id, kind, x, z, mesh, taken: false, label, ...extra };
    this.items.push(it);
    return it;
  }

  landSpot(cx, cz, r0, r1, rand) {
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2, d = r0 + rand() * (r1 - r0);
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (heightAt(x, z) > 1.5 && volcanoDist(x, z) > 20 && this.world.obstaclesNear(x, z, 1.2) === 0) return { x, z };
    }
    return { x: cx + r0, z: cz };
  }

  // Новая расстановка: части рации и топливо каждый раз в разных местах.
  reset(state) {
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items = [];
    const seed = state?.seed ?? Math.floor(Math.random() * 1e9);
    this.seed = seed;
    const rand = mulberry32(seed);
    this.flags = { ...(state?.flags || {}) };
    this.rescueT = state?.rescueT ?? -1;
    this.genHold = 0;
    const crash = this.world.crash;
    const c1 = this.landSpot(crash.x, crash.z, 3, 5, rand), c2 = this.landSpot(crash.x, crash.z, 3, 6, rand);
    this.addItem('flashlight', 'flashlight', c1.x, c1.z, null, 'Фонарик');
    this.addItem('medkit-crash', 'medkit', c2.x, c2.z, null, 'Аптечка');
    // записки и припасы в домиках
    const noteIds = ['n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
    this.huts.forEach((h, i) => {
      const noteId = i === 0 ? 'n1' : noteIds.shift();
      this.addItem('note-' + noteId, 'note', h.table.x, h.table.z, h.floorY + 0.78, 'Записка', { note: noteId });
      const d = h.toW(-h.W / 2 + 0.7, h.D / 2 - 0.7);
      this.addItem('stones-' + i, 'stones', d.x, d.z, h.floorY, 'Камни');
      if (i % 2 === 0) { const m = h.toW(h.W / 2 - 0.6, h.D / 2 - 0.6); this.addItem('medkit-' + i, 'medkit', m.x, m.z, h.floorY, 'Аптечка'); }
    });
    for (const n of noteIds) {
      const L = LANDMARKS[Math.floor(rand() * LANDMARKS.length)];
      const p = this.landSpot(L.id === 'volcano' ? L.x : L.x, L.z, L.id === 'volcano' ? 40 : 3, L.id === 'volcano' ? 55 : 10, rand);
      this.addItem('note-' + n, 'note', p.x, p.z, null, 'Записка', { note: n });
    }
    // части рации — в пяти случайных опасных местах, топливо — в шестом
    const pool = ['bones', 'nest', 'pillars', 'tree', 'pond', 'spring', 'volcano', 'lake', 'cape'];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    pool.slice(0, 6).forEach((id, i) => {
      const L = LANDMARKS.find((l) => l.id === id);
      const vol = id === 'volcano', lake = ['pond', 'spring', 'lake'].includes(id);
      const r = LAKES.find((q) => q.x === L.x && q.z === L.z)?.r || 0;
      const p = this.landSpot(L.x, L.z, vol ? 42 : lake ? r * 1.2 : 4, vol ? 55 : lake ? r * 1.6 : 12, rand);
      const hint = { x: p.x + (rand() - 0.5) * 40, z: p.z + (rand() - 0.5) * 40, r: 38 };
      if (i < 5) this.addItem('part-' + id, 'part', p.x, p.z, null, 'Часть рации', { place: L.name, hint });
      else this.addItem('fuel', 'fuel', p.x, p.z, null, 'Канистра', { place: L.name, hint });
    });
    for (const id of state?.taken || []) { const it = this.items.find((q) => q.id === id); if (it) { it.taken = true; it.mesh.visible = false; } }
    this.setGenerator(!!this.flags.generator);
  }

  get partsFound() { return this.items.filter((i) => i.kind === 'part' && i.taken).length; }

  setGenerator(on) {
    this.flags.generator = on;
    for (const f of this.floods) f.material.emissiveIntensity = on ? 3 : 0;
    this.floodLight.intensity = on ? 40 : 0;
  }

  inHut(x, z, margin = 0) {
    for (const h of this.huts) {
      const dx = x - h.x, dz = z - h.z;
      const c = Math.cos(h.rot), s = Math.sin(h.rot);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < h.W / 2 - 0.15 + margin && Math.abs(lz) < h.D / 2 - 0.15 + margin) return h;
    }
    return null;
  }

  // Что можно сделать рядом с игроком.
  context(p) {
    let best = null, bd = 2.3;
    for (const it of this.items) {
      if (it.taken) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < bd) { bd = d; best = it; }
    }
    if (best) return { type: 'item', item: best, label: best.kind === 'note' ? 'Читать' : 'Взять' };
    const g = this.station.generator;
    if (!this.flags.generator && Math.hypot(g.x - p.x, g.z - p.z) < 2.6) {
      return this.flags.fuel ? { type: 'generator', label: 'Завести' } : { type: 'hint', label: 'Нет топлива', text: 'Генератор пуст. Нужна канистра с топливом.' };
    }
    if (this.rescueT < 0 && Math.hypot(this.mast.x - p.x, this.mast.z - p.z) < 3) {
      if (this.partsFound < 5) return { type: 'hint', label: 'Рация', text: `Не хватает деталей рации: ${this.partsFound}/5.` };
      if (!this.flags.generator) return { type: 'hint', label: 'Рация', text: 'Нет питания. Запустите генератор на станции.' };
      return { type: 'radio', label: 'Вызвать' };
    }
    return null;
  }

  take(it) {
    it.taken = true;
    it.mesh.visible = false;
    if (it.kind === 'flashlight') this.flags.flashlight = true;
    if (it.kind === 'fuel') this.flags.fuel = true;
    if (it.note === 'n1') this.flags.note1 = true;
  }

  // Текущая цель и метки на карте.
  objective() {
    const f = this.flags;
    const n = this.partsFound;
    if (this.rescueT >= 0) {
      const s = Math.max(0, Math.ceil(this.rescueT));
      return { text: `Продержитесь до вертолёта: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, target: this.mast };
    }
    if (!f.flashlight) return { text: 'Обыщите обломки вертолёта', target: this.world.crash };
    if (!f.note1) return { text: 'Доберитесь до домика смотрителя', target: this.ranger.door };
    if (n < 5) return { text: `Найдите части рации: ${n}/5`, areas: this.items.filter((i) => i.kind === 'part' && !i.taken).map((i) => i.hint) };
    if (!f.fuel) return { text: 'Найдите канистру с топливом', areas: [this.items.find((i) => i.kind === 'fuel').hint] };
    if (!f.generator) return { text: 'Заведите генератор на станции', target: this.station.generator };
    return { text: 'Вызовите помощь с радиомачты на Мысе заката', target: this.mast };
  }

  update(dt, t, player) {
    for (const it of this.items) {
      if (it.taken) continue;
      if (it.mesh.userData.lamp) it.mesh.userData.lamp.visible = Math.sin(t * 4 + it.x) > 0;
      if (it.mesh.userData.glint) it.mesh.userData.glint.material.opacity = 0.25 + 0.25 * Math.sin(t * 3 + it.z);
    }
    this.mastLamp.visible = Math.sin(t * 3) > 0;
    // лампа в ближайшем домике
    let nh = null, nd = 40;
    for (const h of this.huts) { const d = Math.hypot(h.x - player.x, h.z - player.z); if (d < nd) { nd = d; nh = h; } }
    if (nh) {
      const l = nh.toW(nh.W / 2 - 0.5, -nh.D / 2 + 0.55);
      this.hutLight.position.set(l.x, nh.floorY + 1.2, l.z);
      this.hutLight.intensity = 5 + Math.sin(t * 13) * 0.4;
    } else this.hutLight.intensity = 0;
  }

  serialize() {
    return { seed: this.seed, taken: this.items.filter((i) => i.taken).map((i) => i.id), flags: this.flags, rescueT: this.rescueT };
  }
}
