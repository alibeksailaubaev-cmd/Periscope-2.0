// Точка входа: сцена, игровой цикл, камера от первого лица, миссия, сохранения.
import * as THREE from './three.js';
import { World, LANDMARKS } from './world.js';
import { GrassField } from './grass.js';
import { Ecosystem } from './ecosystem.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Hud, FOG } from './hud.js';
import { SPECIES, createDino, animateDino, EYE_MAT, EYE_GLOW } from './dinos.js';
import { heightAt, SIZE } from './terrain.js';
import { placeDino } from './creature.js';
import { Mission, NOTES } from './mission.js';

const DAY = 900; // секунд на игровые сутки (ночь идёт быстрее)
const RESCUE_TIME = 90; // сколько продержаться после вызова помощи
const KEY_LIFE = 'melovoy-ostrov:survivor2';
const KEY_KNOW = 'melovoy-ostrov:know';
const KEY_OPTS = 'melovoy-ostrov:opts';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* хранилище недоступно */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* хранилище недоступно */ } },
};

const opts = Object.assign({ quality: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'medium' : 'high', sound: true, diff: 'normal' }, store.get(KEY_OPTS) || {});
const DIFF = { easy: { sight: 0.7, dmg: 0.6 }, normal: { sight: 1, dmg: 1 }, hard: { sight: 1.3, dmg: 1.5 } };
const knowSaved = store.get(KEY_KNOW) || {};
const know = { discovered: knowSaved.discovered || [], seen: knowSaved.seen || [], notes: knowSaved.notes || [], explored: new Uint8Array(FOG * FOG) };
if (knowSaved.explored) knowSaved.explored.forEach((v, i) => { know.explored[i] = v; });

const hud = new Hud();
hud.show('loading');

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: opts.quality !== 'low', powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opts.quality === 'high' ? 2 : opts.quality === 'medium' ? 1.5 : 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = opts.quality !== 'low';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 2400);
camera.rotation.order = 'YXZ';
scene.add(camera);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 78 : 68;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const world = new World(scene, opts.quality, renderer);
const grass = opts.quality !== 'low' ? new GrassField(scene, world, opts.quality) : null;
const eco = new Ecosystem(scene, world);
const mission = new Mission(scene, world);
eco.blocker = (x, z, m) => !!mission.inHut(x, z, m);
eco.diff = DIFF[opts.diff] || DIFF.normal;
const player = new Player(scene, world);
const sound = new Sound();
sound.setEnabled(opts.sound);
const input = new Input(document.getElementById('touch'), document.getElementById('joy-knob'), document.getElementById('joy-base'));
input.bindButton(document.getElementById('b-act'), 'act', true);
input.bindButton(document.getElementById('b-run'), 'runToggle');
input.bindButton(document.getElementById('b-crouch'), 'crouch');
input.bindButton(document.getElementById('b-light'), 'light');
input.bindButton(document.getElementById('b-jump'), 'jump');
input.bindButton(document.getElementById('b-throw'), 'throw');

// фонарик в руке
const flash = new THREE.SpotLight(0xfff4e0, 0, 90, 0.5, 0.45, 1.1);
flash.position.set(0.25, -0.2, 0);
// слабая подсветка вокруг от отражённого света фонаря
const flashFill = new THREE.PointLight(0xfff0d8, 0, 14, 1.5);
camera.add(flashFill);
flash.target.position.set(0, -0.45, -12);
camera.add(flash, flash.target);
if (opts.quality === 'high') { flash.castShadow = true; flash.shadow.mapSize.set(512, 512); }

const MENU_SPOT = world.menuSpot();
eco.populate(world.crash);
hud.updateFog(know.explored);

let state = 'menu';
let preview = null;
let t = 0, saveT = 0, deathT = 0, saltT = 0, stepPhase = 0, thudT = 0;
const cam = { yaw: 0, pitch: 0, orbit: 0 };
const stones = [];
const stoneGeo = new THREE.DodecahedronGeometry(0.08);
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.9, flatShading: true });

// заставка меню: тираннозавр у озера в сумерках
function setPreview() {
  if (preview) scene.remove(preview.root);
  preview = createDino('rex');
  scene.add(preview.root);
  placeDino({ dino: preview, sp: SPECIES.rex, x: MENU_SPOT.x, z: MENU_SPOT.z, yaw: MENU_SPOT.a + Math.PI / 2 + 0.6, scale: 1 }, 1);
  preview.pitch = 0;
  preview.stalk = 1;
  world.setTime(0.775);
}

function knowSave() {
  store.set(KEY_KNOW, { discovered: know.discovered, seen: know.seen, notes: know.notes, explored: Array.from(know.explored) });
}
function lifeSave() {
  if (!player.alive || state === 'won') return;
  store.set(KEY_LIFE, { ...player.serialize(), time: world.time, mission: mission.serialize() });
}
function refreshContinue() {
  const s = store.get(KEY_LIFE);
  hud.el['btn-continue'].hidden = !s;
  if (s) hud.el['continue-info'].textContent = `день ${Math.floor(s.age / DAY) + 1}`;
}

function startLife(saved) {
  sound.start();
  if (preview) { scene.remove(preview.root); preview = null; }
  if (saved) {
    player.spawn(saved);
    mission.reset(saved.mission);
    player.flashlight = false;
    world.setTime(saved.time ?? 0.3);
  } else {
    const c = world.crash;
    mission.reset(null);
    player.spawn({ x: c.x + Math.cos(c.a) * 7, z: c.z + Math.sin(c.a) * 7, yaw: c.a + Math.PI });
    world.setTime(0.3);
    store.set(KEY_LIFE, { ...player.serialize(), time: world.time, mission: mission.serialize() });
    hud.toast('Вы пережили крушение. Обыщите обломки вертолёта.');
  }
  for (const c of eco.list) { c.aware = 0; if (c.state === 'hunt' || c.state === 'stalk' || c.state === 'search') c.state = 'wander'; }
  cam.yaw = player.yaw; cam.pitch = 0;
  state = 'play';
  hud.show(null);
  try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* не поддерживается */ }
}

function showNote(id) {
  const n = NOTES[id];
  if (!know.notes.includes(id)) { know.notes.push(id); knowSave(); }
  hud.el['note-title'].textContent = n.title;
  hud.el['note-text'].textContent = n.text;
  state = 'note';
  hud.show('note');
}

function showDeath() {
  state = 'dead';
  store.del(KEY_LIFE);
  const days = Math.floor(player.age / DAY) + 1;
  const causes = { 'Голод': 'Вы умерли от голода.', 'Жажда': 'Вы умерли от жажды.', 'Утонул': 'Вы утонули.', 'Лава': 'Вас поглотила лава.' };
  const killer = Object.values(SPECIES).find((s) => s.name === player.cause);
  hud.el['death-cause'].textContent = causes[player.cause] || (killer ? `Вас настиг ${killer.name.toLowerCase()}.` : 'Вы погибли.');
  hud.el['death-stats'].innerHTML = `<div><b>${days}</b><span>${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span></div>
    <div><b>${mission.partsFound}/5</b><span>части рации</span></div>
    <div><b>${know.discovered.length}</b><span>мест открыто</span></div>`;
  hud.el['death-title'].textContent = 'Конец пути';
  hud.show('death');
}

function showWin() {
  state = 'won';
  store.del(KEY_LIFE);
  const days = Math.floor(player.age / DAY) + 1;
  hud.el['death-title'].textContent = 'Спасены';
  hud.el['death-cause'].textContent = 'Вертолёт забрал вас с острова. Вы выжили.';
  hud.el['death-stats'].innerHTML = `<div><b>${days}</b><span>${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span></div>
    <div><b>5/5</b><span>части рации</span></div>
    <div><b>${know.seen.length}</b><span>видов изучено</span></div>`;
  hud.show('death');
}

function openPause(tab) {
  if (state !== 'play') return;
  state = 'pause';
  hud.buildJournal(know, NOTES);
  hud.show('pause');
  selectTab(tab || 'journal');
}
function selectTab(tab) {
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  for (const p of document.querySelectorAll('.tabpane')) p.hidden = p.id !== 'tab-' + tab;
  if (tab === 'map') requestAnimationFrame(() => hud.drawMap(hud.el.bigmap, player, know, true, mapMarks()));
}

eco.onSeen = (id) => {
  if (know.seen.includes(id) || state !== 'play') return;
  know.seen.push(id);
  hud.toast(`Новый вид в журнале: ${SPECIES[id].name}`, 'good');
  knowSave();
};
eco.onSound = (c, kind) => {
  if (state !== 'play' || !player.alive) return;
  const d = Math.hypot(c.x - player.x, c.z - player.z);
  if (kind === 'growl') sound.growlAt(c.sp.id, c.size, d);
  else sound.roarAt(c.sp.id, c.size, d);
};
eco.onPlayerHit = () => { sound.hurt(); };
eco.onScratch = (c) => { sound.scratch(Math.hypot(c.x - player.x, c.z - player.z)); };

function mapMarks() {
  return { huts: mission.huts, objective: mission.objective(), mast: mission.mast };
}

document.getElementById('btn-start').addEventListener('click', () => { store.del(KEY_LIFE); startLife(null); });
document.getElementById('btn-continue').addEventListener('click', () => { const s = store.get(KEY_LIFE); if (s) startLife(s); });
document.getElementById('btn-pause').addEventListener('click', () => openPause('journal'));
document.getElementById('btn-mapopen').addEventListener('click', () => openPause('map'));
document.getElementById('btn-resume').addEventListener('click', () => { state = 'play'; hud.show(null); });
document.getElementById('btn-tomenu').addEventListener('click', () => { lifeSave(); toMenu(); });
document.getElementById('btn-again').addEventListener('click', () => { store.del(KEY_LIFE); startLife(null); });
document.getElementById('btn-other').addEventListener('click', () => toMenu());
document.getElementById('menu-listen').addEventListener('click', () => sound.preview('rex'));
document.getElementById('btn-note-close').addEventListener('click', () => { state = 'play'; hud.show(null); });
const dSel = document.getElementById('opt-diff');
dSel.value = opts.diff;
const dMenu = document.getElementById('opt-diff-menu');
dMenu.value = opts.diff;
for (const el of [dSel, dMenu]) {
  el.addEventListener('change', () => {
    opts.diff = el.value; dSel.value = dMenu.value = opts.diff;
    eco.diff = DIFF[opts.diff]; store.set(KEY_OPTS, opts);
  });
}
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => selectTab(b.dataset.tab));

const qSel = document.getElementById('opt-quality');
qSel.value = opts.quality;
qSel.addEventListener('change', () => { opts.quality = qSel.value; store.set(KEY_OPTS, opts); lifeSave(); location.reload(); });
const sChk = document.getElementById('opt-sound');
sChk.checked = opts.sound;
sChk.addEventListener('change', () => { opts.sound = sChk.checked; sound.setEnabled(opts.sound); store.set(KEY_OPTS, opts); });
document.getElementById('btn-reset').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Нажмите ещё раз, чтобы стереть'; return; }
  store.del(KEY_LIFE); store.del(KEY_KNOW);
  location.reload();
});

function toMenu() {
  player.alive = false;
  flash.intensity = 0;
  state = 'menu';
  setPreview();
  refreshContinue();
  hud.show('menu');
}

function explore() {
  const i = Math.floor((player.x / SIZE + 0.5) * FOG), j = Math.floor((player.z / SIZE + 0.5) * FOG);
  let changed = false;
  for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
    if (a * a + b * b > 5) continue;
    const x = i + a, y = j + b;
    if (x < 0 || y < 0 || x >= FOG || y >= FOG) continue;
    if (!know.explored[y * FOG + x]) { know.explored[y * FOG + x] = 1; changed = true; }
  }
  if (changed) hud.updateFog(know.explored);
}

function clockText() {
  const day = Math.floor(player.age / DAY) + 1;
  const mins = Math.floor(world.time * 24 * 60);
  return `День ${day} · ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function throwStone() {
  if (player.stones <= 0) return;
  player.stones--;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const m = new THREE.Mesh(stoneGeo, stoneMat);
  m.position.copy(camera.position).addScaledVector(dir, 0.6);
  m.castShadow = true;
  scene.add(m);
  stones.push({ m, v: dir.multiplyScalar(17).add(new THREE.Vector3(0, 4.5, 0)), t: 0, landed: false });
  sound.whoosh();
}

function updateStones(dt) {
  for (let i = stones.length - 1; i >= 0; i--) {
    const s = stones[i];
    s.t += dt;
    if (!s.landed) {
      s.v.y -= 9.8 * dt;
      s.m.position.addScaledVector(s.v, dt);
      s.m.rotation.x += dt * 8;
      const g = Math.max(heightAt(s.m.position.x, s.m.position.z), 0);
      if (s.m.position.y <= g + 0.05) {
        s.landed = true;
        s.m.position.y = g + 0.05;
        // хищники идут на звук упавшего камня
        eco.noiseAt(s.m.position.x, s.m.position.z, 34);
        sound.thunk(Math.hypot(s.m.position.x - player.x, s.m.position.z - player.z), heightAt(s.m.position.x, s.m.position.z) < 0);
      }
    }
    if (s.t > 8) { scene.remove(s.m); stones.splice(i, 1); }
  }
}

function handleAction(a) {
  if (!a) return;
  if (a.kind === 'eat') sound.eat();
  if (a.kind === 'drink') sound.drink();
  if (a.kind === 'salt' && saltT <= 0) { hud.toast('Морская вода солёная. Ищите озеро внутри острова.', 'warn'); saltT = 5; }
  if (a.kind === 'hint' && saltT <= 0) { hud.toast(a.text, 'warn'); saltT = 4; }
  if (a.kind === 'crank') sound.crank();
  if (a.kind === 'note') { sound.pickup(); showNote(a.item.note); }
  if (a.kind === 'flashlight') { sound.pickup(); hud.toast('Фонарик найден. Ночью он выручит, но и выдаст вас.', 'good'); }
  if (a.kind === 'medkit') { sound.pickup(); hud.toast('Аптечка: +55 здоровья', 'good'); }
  if (a.kind === 'stones') { sound.pickup(); hud.toast('Камни: бросьте, чтобы отвлечь хищника шумом', 'good'); }
  if (a.kind === 'fuel') { sound.pickup(); hud.toast(`Канистра с топливом найдена: ${a.item.place}`, 'good'); }
  if (a.kind === 'part') {
    sound.pickup();
    const n = mission.partsFound;
    hud.toast(n < 5 ? `Часть рации ${n}/5: ${a.item.place}` : 'Все детали рации собраны!', 'good');
  }
  if (a.kind === 'generator') {
    mission.setGenerator(true);
    mission.genHold = 0;
    sound.generator(true);
    hud.toast('Генератор завёлся! Его слышно издалека — бегите к мачте на Мысе заката.', 'warn');
    eco.noiseAt(player.x, player.z, 160, true);
  }
  if (a.kind === 'radio') {
    mission.rescueT = RESCUE_TIME;
    hud.toast('Сигнал принят! Вертолёт будет через полторы минуты. Продержитесь!', 'good');
    eco.noiseAt(mission.mast.x, mission.mast.z, 600, true);
  }
  if (a.kind !== 'eat' && a.kind !== 'drink' && a.kind !== 'crank') lifeSave();
}

function playUpdate(dt) {
  if (input.consume('pause')) { openPause('journal'); return null; }
  if (input.consume('map')) { openPause('map'); return null; }
  const look = input.takeLook();
  cam.yaw -= look.x * 0.0048;
  cam.pitch = Math.max(-1.3, Math.min(1.25, cam.pitch - look.y * 0.004));
  player.yaw = cam.yaw;
  if (input.consume('crouch') || input.consume('rest')) player.crouch = !player.crouch;
  if (input.consume('light') && mission.flags.flashlight) { player.flashlight = !player.flashlight; sound.click(); }
  if (input.consume('runToggle')) player.running = !player.running;
  if (input.consume('jump') && player.jump()) sound.jump();
  if (input.consume('throw')) throwStone();
  const mv = input.move;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  const ctrl = { dx: fx * mv.y - fz * mv.x, dz: fz * mv.y + fx * mv.x, mag: mv.mag, run: input.run, act: input.act };
  player.update(dt, ctrl, t, world.day, mission, world.rain);
  if (player.landed) sound.land();
  saltT -= dt;
  handleAction(player.lastAct);
  if (state !== 'play') return null;
  if (mission.rescueT >= 0) {
    mission.rescueT -= dt;
    if (mission.rescueT <= 0 && player.alive) { showWin(); return null; }
  }
  updateStones(dt);
  mission.update(dt, t, player);
  if (mission.flags.generator) sound.generatorLevel(Math.hypot(player.x - mission.station.generator.x, player.z - mission.station.generator.z));

  eco.night = world.night;
  eco.rain = world.rain;
  eco.update(dt, player, t, camera);
  world.setTime(world.time + (dt / DAY) * (world.night ? 1.8 : 1));
  if (world.thunder) sound.thunder();
  sound.rain(world.rain);

  // звуки тела и мира
  sound.ambient(dt, world.night, world.day);
  sound.heart(dt, eco.threat, player.hp);
  sound.breath(dt, player.stamina);
  const ph = Math.floor(player.bob / Math.PI);
  if (ph !== stepPhase && player.speed > 0.5) { stepPhase = ph; sound.step(player.mode); }
  thudT -= dt;
  if (eco.quake > 0.05 && thudT <= 0) { thudT = 0.75; sound.thud(eco.quake); }

  for (const L of LANDMARKS) {
    if (know.discovered.includes(L.id)) continue;
    if (Math.hypot(player.x - L.x, player.z - L.z) < L.r) {
      know.discovered.push(L.id);
      hud.toast(`Открыто место: ${L.name}`, 'good');
      knowSave();
    }
  }
  explore();

  // камера: глаза человека, покачивание шага, дрожь от шагов тираннозавра
  const run = player.mode === 'run' ? 1.6 : 1;
  const bobK = Math.min(1, player.speed / 3) * run;
  const shake = eco.quake * 0.12 + player.hitFlash * 0.15;
  camera.position.set(
    player.x + Math.cos(cam.yaw) * Math.sin(player.bob) * 0.035 * bobK + (Math.random() - 0.5) * shake,
    player.y + player.eye + Math.abs(Math.cos(player.bob)) * 0.06 * bobK + Math.sin(t * 1.6) * 0.008 + (Math.random() - 0.5) * shake,
    player.z - Math.sin(cam.yaw) * Math.sin(player.bob) * 0.035 * bobK + (Math.random() - 0.5) * shake,
  );
  camera.rotation.set(cam.pitch + Math.sin(t * 1.1) * 0.004, cam.yaw + Math.PI, Math.sin(player.bob) * 0.006 * bobK);
  flash.intensity = player.flashlight ? 140 : 0;
  flashFill.intensity = player.flashlight ? 2.5 : 0;

  hud.update(dt, player, know, clockText(), mission.objective().text, eco, mapMarks(), mission);
  saveT -= dt;
  if (saveT <= 0) { saveT = 5; lifeSave(); knowSave(); }
  if (!player.alive) {
    deathT += dt;
    camera.rotation.z = Math.min(1.2, deathT);
    camera.position.y -= Math.min(1, deathT) * player.eye * 0.8;
    if (deathT > 2) { deathT = 0; showDeath(); }
  }
  return new THREE.Vector3(player.x, player.y, player.z);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  let focus = new THREE.Vector3(MENU_SPOT.x, heightAt(MENU_SPOT.x, MENU_SPOT.z), MENU_SPOT.z);
  if (state !== 'play') sound.rain(0);
  EYE_MAT.emissiveIntensity = 0.12 + (1 - world.day) * 4 + (player.flashlight ? 2 : 0);
  EYE_GLOW.opacity = Math.min(1, (1 - world.day) * 0.9 + (player.flashlight && world.day < 0.6 ? 0.3 : 0));
  if (state === 'play') focus = playUpdate(dt) || focus;
  else if (state === 'menu') {
    cam.orbit = MENU_SPOT.a + 0.9 + Math.sin(t * 0.07) * 0.5;
    if (preview) { preview.look = Math.sin(t * 0.4) * 0.3; animateDino(preview, dt, 0, t, 0); }
    const tg = focus.clone().add(new THREE.Vector3(0, 3.4, 0));
    const r = 17;
    camera.position.set(tg.x + Math.sin(cam.orbit) * r, heightAt(tg.x + Math.sin(cam.orbit) * r, tg.z + Math.cos(cam.orbit) * r) + 1.7, tg.z + Math.cos(cam.orbit) * r);
    camera.lookAt(tg);
    eco.update(dt, null, t, camera);
  } else if (state === 'pause' || state === 'dead' || state === 'won' || state === 'note') {
    focus = new THREE.Vector3(player.x, player.y, player.z);
    if (state === 'dead' || state === 'won') eco.update(dt, null, t, camera);
  }
  world.update(state === 'pause' || state === 'note' ? 0 : dt, camera, focus);
  if (grass) grass.update(state === 'menu' ? camera.position : focus);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

setPreview();
refreshContinue();
hud.show('menu');
requestAnimationFrame(frame);

// Для автотестов: ?debug открывает доступ к состоянию игры из консоли.
if (location.search.includes('debug')) window.__g = { player, eco, world, cam, camera, sound, mission, setTime: (v) => world.setTime(v) };
