// Точка входа: сцена, игровой цикл, камера, сохранения.
import * as THREE from './three.js';
import { World, LANDMARKS } from './world.js';
import { GrassField } from './grass.js';
import { Ecosystem } from './ecosystem.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Hud, FOG } from './hud.js';
import { SPECIES, createDino, animateDino } from './dinos.js';
import { heightAt, SIZE, LAKES, isFresh } from './terrain.js';
import { wrapAngle, placeDino } from './creature.js';

const DAY = 480; // секунд на игровые сутки
const KEY_LIFE = 'melovoy-ostrov:life';
const KEY_KNOW = 'melovoy-ostrov:know';
const KEY_OPTS = 'melovoy-ostrov:opts';

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* хранилище недоступно */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* хранилище недоступно */ } },
};

const opts = Object.assign({ quality: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'medium' : 'high', sound: true }, store.get(KEY_OPTS) || {});
const knowSaved = store.get(KEY_KNOW) || {};
const know = {
  discovered: knowSaved.discovered || [],
  seen: knowSaved.seen || [],
  explored: new Uint8Array(FOG * FOG),
};
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
const camera = new THREE.PerspectiveCamera(60, 1, 0.2, 2400);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 68 : 55;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const world = new World(scene, opts.quality, renderer);
const grass = opts.quality !== 'low' ? new GrassField(scene, world, opts.quality) : null;
const eco = new Ecosystem(scene, world);
const player = new Player(scene, world);
const sound = new Sound();
sound.setEnabled(opts.sound);
const input = new Input(document.getElementById('touch'), document.getElementById('joy-knob'), document.getElementById('joy-base'));
input.bindButton(document.getElementById('b-bite'), 'bite');
input.bindButton(document.getElementById('b-act'), 'act', true);
input.bindButton(document.getElementById('b-run'), 'run', true);
input.bindButton(document.getElementById('b-roar'), 'roar');
input.bindButton(document.getElementById('b-rest'), 'rest');

const MENU_SPOT = world.menuSpot();
eco.populate(MENU_SPOT);
hud.updateFog(know.explored);

let state = 'menu';
let selected = store.get(KEY_LIFE)?.sp || 'raptor';
let preview = null;
let t = 0, saveT = 0, deathT = 0, saltT = 0, shake = 0;
const cam = { yaw: 0, pitch: 0.32, zoom: 0, orbit: 0 };

function setPreview(id) {
  selected = id;
  if (preview) scene.remove(preview.root);
  preview = createDino(id);
  scene.add(preview.root);
  const c = { dino: preview, sp: SPECIES[id], x: MENU_SPOT.x, z: MENU_SPOT.z, yaw: MENU_SPOT.a + Math.PI / 2, scale: 1 };
  placeDino(c, 1);
  preview.pitch = 0;
  hud.buildCards(id, setPreview);
}

function knowSave() {
  store.set(KEY_KNOW, { discovered: know.discovered, seen: know.seen, explored: Array.from(know.explored) });
}

function lifeSave() {
  if (!player.alive) return;
  store.set(KEY_LIFE, { ...player.serialize(), time: world.time });
}

function refreshContinue() {
  const s = store.get(KEY_LIFE);
  hud.el['btn-continue'].hidden = !s;
  if (s) hud.el['continue-info'].textContent = `${SPECIES[s.sp].name}, день ${Math.floor(s.age / DAY) + 1}`;
}

function spawnPoint() {
  const r = Math.random;
  return world.randomLand(() => r(), (x, z) => {
    const nearWater = LAKES.some((L) => Math.hypot(x - L.x, z - L.z) < L.r + 70);
    const safe = eco.list.every((c) => c.sp.diet !== 'carn' || Math.hypot(c.x - x, c.z - z) > 150);
    return nearWater && safe && isFresh(x, z);
  });
}

function startLife(id, saved) {
  sound.start();
  if (preview) { scene.remove(preview.root); preview = null; }
  if (saved) {
    player.spawn(saved.sp, saved);
    world.setTime(saved.time ?? 0.3);
  } else {
    const p = spawnPoint();
    player.spawn(id, { x: p.x, z: p.z, yaw: Math.random() * 6 });
    world.setTime(0.36);
    store.set(KEY_LIFE, { ...player.serialize(), time: world.time });
    hud.toast(`Вы вылупились. Найдите воду и еду.`);
  }
  cam.yaw = player.yaw;
  camera.position.set(player.x - Math.sin(cam.yaw) * 8, heightAt(player.x, player.z) + 5, player.z - Math.cos(cam.yaw) * 8);
  state = 'play';
  hud.show(null);
  try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* не поддерживается */ }
}

function showDeath() {
  state = 'dead';
  store.del(KEY_LIFE);
  const days = Math.floor(player.age / DAY) + 1;
  const causes = { 'Голод': 'Вы умерли от голода.', 'Жажда': 'Вы умерли от жажды.', 'Утонул': 'Вы утонули.', 'Лава': 'Вас поглотила лава.' };
  hud.el['death-cause'].textContent = causes[player.cause] || `Вас убил ${player.cause.toLowerCase()}.`;
  hud.el['death-stats'].innerHTML = `<div><b>${days}</b><span>${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span></div>
    <div><b>${Math.round(Math.min(1, player.growth) * 100)}%</b><span>рост</span></div>
    <div><b>${player.kills}</b><span>добыча</span></div>`;
  hud.show('death');
}

function openPause(tab) {
  if (state !== 'play') return;
  state = 'pause';
  hud.buildJournal(know);
  hud.show('pause');
  selectTab(tab || 'journal');
}

function selectTab(tab) {
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  for (const p of document.querySelectorAll('.tabpane')) p.hidden = p.id !== 'tab-' + tab;
  if (tab === 'map') requestAnimationFrame(() => hud.drawMap(hud.el.bigmap, player, know, true));
}

// ---- события мира ----
eco.onSeen = (id) => {
  if (know.seen.includes(id) || state !== 'play') return;
  know.seen.push(id);
  player.growth = Math.min(1, player.growth + 0.01);
  hud.toast(`Новый вид в журнале: ${SPECIES[id].name}`, 'good');
  knowSave();
};
eco.onKill = (c) => {
  player.kills++;
  hud.toast(`Добыча: ${c.sp.name}. Подойдите и ешьте`, 'good');
};
eco.onSound = (c) => {
  if (state !== 'play' || !player.alive) return;
  sound.roarAt(c.sp.id, c.size, Math.hypot(c.x - player.x, c.z - player.z));
};
eco.onPlayerHit = (att) => {
  shake = 0.6;
  sound.hurt();
};

// ---- кнопки меню ----
document.getElementById('btn-start').addEventListener('click', () => {
  const s = store.get(KEY_LIFE);
  if (s && s.sp !== selected) store.del(KEY_LIFE);
  startLife(selected, null);
});
document.getElementById('btn-continue').addEventListener('click', () => {
  const s = store.get(KEY_LIFE);
  if (s) startLife(s.sp, s);
});
document.getElementById('btn-pause').addEventListener('click', () => openPause('journal'));
document.getElementById('btn-mapopen').addEventListener('click', () => openPause('map'));
document.getElementById('btn-resume').addEventListener('click', () => { state = 'play'; hud.show(null); });
document.getElementById('btn-tomenu').addEventListener('click', () => {
  lifeSave();
  toMenu();
});
document.getElementById('btn-again').addEventListener('click', () => startLife(player.sp.id, null));
document.getElementById('btn-other').addEventListener('click', () => toMenu());
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => selectTab(b.dataset.tab));

const qSel = document.getElementById('opt-quality');
qSel.value = opts.quality;
qSel.addEventListener('change', () => {
  opts.quality = qSel.value;
  store.set(KEY_OPTS, opts);
  lifeSave();
  location.reload();
});
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
  if (player.dino) { scene.remove(player.dino.root); player.alive = false; }
  state = 'menu';
  setPreview(selected);
  refreshContinue();
  hud.show('menu');
}

// ---- игровой цикл ----
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
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
  return `День ${day} · ${hh}:${mm}`;
}

function updateCamera(dt, target, size, pitchAuto) {
  const look = input.takeLook();
  cam.yaw -= look.x * 0.006;
  cam.pitch = Math.max(0.05, Math.min(1.15, cam.pitch + look.y * 0.004));
  cam.zoom = Math.max(-0.5, Math.min(1.2, cam.zoom + input.zoom));
  input.zoom = 0;
  if (pitchAuto && performance.now() - input.lastLook > 1800 && player.speed > 1) {
    cam.yaw += wrapAngle(player.yaw - cam.yaw) * Math.min(1, dt * 1.2);
  }
  const dist = (2.6 + size * 1.05) * (1 + cam.zoom);
  const want = new THREE.Vector3(
    target.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist,
    target.y + Math.sin(cam.pitch) * dist,
    target.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist,
  );
  want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.2, 0.8);
  if (cam.snap) { camera.position.copy(want); cam.snap = false; } else camera.position.lerp(want, 1 - Math.exp(-dt * 8));
  if (shake > 0) {
    shake = Math.max(0, shake - dt);
    camera.position.x += (Math.random() - 0.5) * shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;
  }
  camera.lookAt(target);
}

function playUpdate(dt) {
  if (input.consume('pause')) { openPause('journal'); return; }
  if (input.consume('map')) { openPause('map'); return; }
  if (input.consume('journal')) { openPause('journal'); return; }
  const mv = input.move;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  const ctrl = {
    dx: fx * mv.y - fz * mv.x, dz: fz * mv.y + fx * mv.x, mag: mv.mag, run: input.run, act: input.act,
  };
  player.lastAct = null;
  player.update(dt, ctrl, eco, t);
  if (input.consume('bite') && player.alive) {
    const hit = player.bite(eco);
    if (hit || player.dino.bite === 1) sound.bite();
  }
  if (input.consume('roar') && player.roar(eco)) sound.roar(player.sp.id, player.size);
  if (input.consume('rest')) player.toggleRest();
  if (player.lastAct === 'eat') sound.eat();
  if (player.lastAct === 'drink') sound.drink();
  saltT -= dt;
  if (player.lastAct === 'salt' && saltT <= 0) { hud.toast('Морская вода солёная. Ищите озеро внутри острова.', 'warn'); saltT = 5; }

  eco.update(dt, player, t, camera);
  world.setTime(world.time + (dt / DAY) * (player.resting ? 4 : 1));
  sound.ambient(dt, world.night, world.day);

  for (const L of LANDMARKS) {
    if (know.discovered.includes(L.id)) continue;
    if (Math.hypot(player.x - L.x, player.z - L.z) < L.r) {
      know.discovered.push(L.id);
      player.growth = Math.min(1, player.growth + 0.03);
      hud.toast(`Открыто место: ${L.name}`, 'good');
      knowSave();
    }
  }
  explore();

  const s = player.scale;
  const target = new THREE.Vector3(player.x, player.dino.root.position.y + player.sp.hip * s * 1.35, player.z);
  updateCamera(dt, target, player.size, true);
  hud.update(dt, player, know, clockText());

  saveT -= dt;
  if (saveT <= 0) { saveT = 5; lifeSave(); knowSave(); }
  if (!player.alive) {
    deathT += dt;
    if (deathT > 2.2) { deathT = 0; showDeath(); }
  }
  return target;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  let focus = new THREE.Vector3(MENU_SPOT.x, heightAt(MENU_SPOT.x, MENU_SPOT.z), MENU_SPOT.z);
  if (state === 'play') focus = playUpdate(dt) || focus;
  else if (state === 'menu') {
    cam.orbit = MENU_SPOT.a + 0.9 + Math.sin(t * 0.08) * 0.6;
    if (preview) animateDino(preview, dt, 0, t, 0);
    const sz = SPECIES[selected].len;
    const tg = focus.clone().add(new THREE.Vector3(0, SPECIES[selected].hip * 1.1 - sz * 0.3, 0));
    const r = sz * 1.1 + 5;
    camera.position.set(tg.x + Math.sin(cam.orbit) * r, tg.y + sz * 0.25 + 1.5, tg.z + Math.cos(cam.orbit) * r);
    camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 1.5);
    camera.lookAt(tg);
    eco.update(dt, { alive: false }, t, camera);
    world.setTime(world.time + dt / DAY);
  } else if (state === 'dead') {
    eco.update(dt, player, t, camera);
    focus = new THREE.Vector3(player.x, player.dino.root.position.y, player.z);
    player.dino.dead = Math.min(1, player.dino.dead + dt);
    animateDino(player.dino, dt, 0, t, 0);
    cam.pitch = Math.min(1.1, cam.pitch + dt * 0.1);
    updateCamera(dt, focus.clone().add(new THREE.Vector3(0, 1, 0)), player.size, false);
  } else if (state === 'pause') {
    focus = new THREE.Vector3(player.x, player.dino.root.position.y, player.z);
  }
  world.update(state === 'pause' ? 0 : dt, camera, focus);
  if (grass) grass.update(state === 'play' || state === 'dead' || state === 'pause' ? focus : camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

setPreview(selected);
refreshContinue();
hud.show('menu');
requestAnimationFrame(frame);

// Для автотестов: ?debug открывает доступ к состоянию игры из консоли.
if (location.search.includes('debug')) window.__g = { player, eco, world, cam, camera, setTime: (v) => world.setTime(v) };
