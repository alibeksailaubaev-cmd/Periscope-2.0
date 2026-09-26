// Интерфейс поверх 3D-сцены: показатели, мини-карта, журнал, меню.
import * as THREE from './three.js';
import { SIZE, heightAt } from './terrain.js';
import { terrainColor, LANDMARKS } from './world.js';
import { SPECIES } from './dinos.js';

const $ = (id) => document.getElementById(id);
const N = 256;
export const FOG = 64;

export class Hud {
  constructor() {
    this.el = {};
    for (const id of ['hud', 'menu', 'pause', 'death', 'loading', 'toasts', 'vignette', 'h-name', 'h-stage', 'h-growth',
      'f-hp', 'f-food', 'f-water', 'f-stam', 'clock', 'minimap', 'b-act', 'act-label', 'cards', 'bigmap', 'journal-places',
      'journal-species', 'death-cause', 'death-stats', 'death-title', 'btn-continue', 'continue-info', 'status', 'objective',
      'detect', 'detect-label', 'note', 'note-title', 'note-text', 'journal-notes', 'b-throw', 'throw-count', 'b-light']) this.el[id] = $(id);
    this.buildMapBase();
    this.fog = document.createElement('canvas');
    this.fog.width = this.fog.height = FOG;
    this.mapT = 0;
  }

  show(name) {
    for (const k of ['menu', 'pause', 'death', 'loading', 'note']) this.el[k].hidden = k !== name;
    this.el.hud.hidden = name === 'menu' || name === 'loading';
  }

  buildMapBase() {
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(N, N);
    const tmp = new THREE.Color();
    const e = SIZE / N;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i / N - 0.5) * SIZE, z = (j / N - 0.5) * SIZE;
      const h = heightAt(x, z);
      if (h < 0) tmp.setRGB(0.02, 0.09 + 0.05 * Math.max(0, 1 + h / 6), 0.14 + 0.08 * Math.max(0, 1 + h / 6));
      else {
        const s = Math.hypot(heightAt(x + e, z) - h, heightAt(x, z + e) - h) / e;
        terrainColor(x, z, h, s, tmp);
        const shade = 1 + (heightAt(x - e, z - e) - h) * 0.03;
        tmp.multiplyScalar(Math.max(0.6, Math.min(1.3, shade)));
      }
      const o = (j * N + i) * 4;
      img.data[o] = Math.min(255, Math.pow(tmp.r, 1 / 2.2) * 255);
      img.data[o + 1] = Math.min(255, Math.pow(tmp.g, 1 / 2.2) * 255);
      img.data[o + 2] = Math.min(255, Math.pow(tmp.b, 1 / 2.2) * 255);
      img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.mapBase = c;
  }

  updateFog(explored) {
    const ctx = this.fog.getContext('2d');
    const img = ctx.createImageData(FOG, FOG);
    for (let i = 0; i < FOG * FOG; i++) {
      img.data[i * 4] = 16; img.data[i * 4 + 1] = 20; img.data[i * 4 + 2] = 15;
      img.data[i * 4 + 3] = explored[i] ? 0 : 235;
    }
    ctx.putImageData(img, 0, 0);
  }

  drawMap(canvas, player, know, full, marks = {}) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const span = full ? SIZE * 0.72 : 260;
    const cx = full ? 0 : player.x, cz = full ? 0 : player.z;
    const toPx = (x, z) => [((x - cx) / span + 0.5) * W, ((z - cz) / span + 0.5) * H];
    if (!full) { ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); ctx.clip(); }
    ctx.fillStyle = '#05161f';
    ctx.fillRect(0, 0, W, H);
    const k = N / SIZE;
    const sx = (cx - span / 2 + SIZE / 2) * k, sw = span * k;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.mapBase, sx, (cz - span / 2 + SIZE / 2) * k, sw, sw, 0, 0, W, H);
    const fk = FOG / SIZE;
    ctx.drawImage(this.fog, (cx - span / 2 + SIZE / 2) * fk, (cz - span / 2 + SIZE / 2) * fk, span * fk, span * fk, 0, 0, W, H);
    ctx.font = `${Math.round((full ? 12 : 10) * dpr)}px "Alegreya Sans", sans-serif`;
    ctx.textAlign = 'center';
    for (const L of LANDMARKS) {
      const [x, y] = toPx(L.x, L.z);
      const found = know.discovered.includes(L.id);
      if (!found && !full) continue;
      ctx.fillStyle = found ? '#e0a042' : 'rgba(239,230,207,0.55)';
      ctx.beginPath(); ctx.arc(x, y, (found ? 4 : 3) * dpr, 0, Math.PI * 2); ctx.fill();
      if (full) {
        ctx.fillStyle = found ? '#efe6cf' : 'rgba(239,230,207,0.6)';
        ctx.fillText(found ? L.name : '?', x, y - 8 * dpr);
      }
    }
    // домики-укрытия
    for (const h of marks.huts || []) {
      const [x, y] = toPx(h.x, h.z), k = (full ? 6 : 4) * dpr;
      ctx.fillStyle = h.station ? '#9fc8e8' : '#d9cfb4';
      ctx.beginPath(); ctx.moveTo(x - k, y + k * 0.6); ctx.lineTo(x - k, y - k * 0.2); ctx.lineTo(x, y - k); ctx.lineTo(x + k, y - k * 0.2); ctx.lineTo(x + k, y + k * 0.6); ctx.closePath(); ctx.fill();
      if (full) { ctx.fillStyle = 'rgba(239,230,207,0.8)'; ctx.fillText(h.name, x, y + k * 2.4); }
    }
    // текущая цель задания
    const o = marks.objective || {};
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.strokeStyle = '#e0a042'; ctx.lineWidth = 2 * dpr;
    for (const a of o.areas || []) {
      const [x, y] = toPx(a.x, a.z);
      ctx.beginPath(); ctx.arc(x, y, (a.r / span) * W, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (o.target) {
      const [x, y] = toPx(o.target.x, o.target.z), k = 6 * dpr;
      ctx.fillStyle = '#e0a042'; ctx.strokeStyle = '#231806'; ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath(); ctx.moveTo(x, y - k); ctx.lineTo(x + k, y); ctx.lineTo(x, y + k); ctx.lineTo(x - k, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const [px, py] = toPx(player.x, player.z);
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.cos(player.yaw), Math.sin(player.yaw)));
    ctx.fillStyle = '#fff4dc';
    ctx.strokeStyle = '#1b1a14';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.moveTo(8 * dpr, 0); ctx.lineTo(-5 * dpr, 5 * dpr); ctx.lineTo(-2 * dpr, 0); ctx.lineTo(-5 * dpr, -5 * dpr); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  update(dt, p, know, clock, objective, eco, marks, mission) {
    const e = this.el;
    e['h-stage'].textContent = p.crouch ? 'Пригнулись' : p.mode === 'run' ? 'Бег' : 'Идёте';
    e['h-growth'].style.width = `${Math.min(1, p.visibility / 1.4) * 100}%`;
    e['f-hp'].style.width = `${p.hp}%`;
    e['f-food'].style.width = `${p.hunger}%`;
    e['f-water'].style.width = `${p.thirst}%`;
    e['f-stam'].style.width = `${p.stamina}%`;
    e['f-food'].parentElement.parentElement.classList.toggle('low', p.hunger < 20);
    e['f-water'].parentElement.parentElement.classList.toggle('low', p.thirst < 20);
    e['f-hp'].parentElement.parentElement.classList.toggle('low', p.hp < 30);
    e.clock.textContent = clock;
    e.objective.textContent = objective;
    e.vignette.style.opacity = String(Math.max(p.hitFlash * 0.95, p.hp < 30 ? 0.45 : 0, eco.threat > 0.8 ? 0.25 : 0));
    // глаз: насколько вас заметили
    const hunted = eco.list.some((c) => !c.dead && c.state === 'hunt');
    const level = hunted ? 'hunt' : eco.threat > 0.25 ? 'alert' : 'hidden';
    if (this.level !== level) {
      this.level = level;
      e.detect.dataset.level = level;
      e['detect-label'].textContent = { hidden: 'Вас не заметили', alert: 'Вас ищут', hunt: 'Охота!' }[level];
    }
    $('b-light').classList.toggle('on', p.flashlight);
    e['b-light'].hidden = !mission.flags.flashlight;
    e['b-throw'].hidden = p.stones <= 0;
    e['throw-count'].textContent = `Камень ×${p.stones}`;
    $('b-run').classList.toggle('on', p.running);
    $('b-crouch').classList.toggle('on', p.crouch);
    const ctx = p.ctx;
    e['b-act'].hidden = !ctx;
    if (ctx) e['act-label'].textContent = ctx.label;
    let status = '';
    if (p.inHut) status = `${p.hut.name}: сюда хищники не пролезут`;
    else if (p.swimming) status = 'Вы плывёте — следите за силами';
    else if (mission.genHold > 0 && !mission.flags.generator) status = `Заводите генератор… ${Math.min(100, Math.round(mission.genHold / 4 * 100))}%`;
    else if (p.crouch && p.cover > 0.5) status = 'Вы укрыты в зарослях';
    e.status.textContent = status;
    e.status.hidden = !status;
    this.mapT -= dt;
    if (this.mapT <= 0) { this.mapT = 0.2; this.drawMap(e.minimap, p, know, false, marks); }
  }

  toast(text, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), 3200);
    setTimeout(() => d.remove(), 3800);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
  }

  buildJournal(know, NOTES) {
    const nl = this.el['journal-notes'];
    nl.innerHTML = '';
    if (!know.notes.length) nl.innerHTML = '<li class="locked"><h4>Записок пока нет</h4><p>Ищите их в домиках и у достопримечательностей.</p></li>';
    for (const id of know.notes) {
      const li = document.createElement('li');
      li.innerHTML = `<h4>${NOTES[id].title}</h4><p>${NOTES[id].text}</p>`;
      nl.appendChild(li);
    }
    const places = this.el['journal-places'];
    places.innerHTML = '';
    for (const L of LANDMARKS) {
      const found = know.discovered.includes(L.id);
      const li = document.createElement('li');
      li.className = found ? '' : 'locked';
      li.innerHTML = found ? `<h4>${L.name}</h4><p>${L.text}</p>` : '<h4>Неизвестное место</h4><p>Исследуйте остров, чтобы найти его. Места отмечены на карте знаком «?».</p>';
      places.appendChild(li);
    }
    const sps = this.el['journal-species'];
    sps.innerHTML = '';
    for (const sp of Object.values(SPECIES)) {
      const found = know.seen.includes(sp.id);
      const li = document.createElement('li');
      li.className = found ? '' : 'locked';
      li.innerHTML = found ? `<h4>${sp.name} <em>${sp.latin}</em></h4><p>${sp.fact}</p>` : '<h4>Неизвестный вид</h4><p>Подойдите ближе к животному, чтобы изучить его.</p>';
      sps.appendChild(li);
    }
    $('j-count').textContent = `${know.discovered.length}/${LANDMARKS.length} мест · ${know.seen.length}/${Object.keys(SPECIES).length} видов`;
  }
}
