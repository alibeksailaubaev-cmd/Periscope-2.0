// Игрок — человек, выживший после крушения. Вид от первого лица.
import { heightAt, isFresh, volcanoDist, coastRadius } from './terrain.js';

const HUMAN = { id: 'human', name: 'Выживший', len: 1.8, hip: 0.9, diet: 'omni' };
const SPEED = { crouch: 1.3, walk: 2.9, run: 6.8, swim: 1.4 };

export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.isPlayer = true;
    this.alive = false;
    this.sp = HUMAN;
  }

  spawn(o = {}) {
    this.x = o.x; this.z = o.z; this.yaw = o.yaw ?? 0;
    this.hp = o.hp ?? 100;
    this.hunger = o.hunger ?? 80;
    this.thirst = o.thirst ?? 80;
    this.stamina = o.stamina ?? 100;
    this.age = o.age ?? 0;
    this.stones = o.stones ?? 2;
    this.alive = true;
    this.crouch = false;
    this.running = false;
    this.flashlight = false;
    this.speed = 0;
    this.noise = 0;
    this.visibility = 1;
    this.cover = 0;
    this.swimming = false;
    this.hut = null;
    this.bob = 0;
    this.hitFlash = 0;
    this.actT = 0;
    this.eye = 1.65;
    this.jumpY = 0; this.vy = 0; this.airborne = false;
    this.cause = '';
    this.ground = heightAt(this.x, this.z);
    this.y = this.ground;
  }

  get size() { return 1.8; }
  get radius() { return 0.4; }
  get maxHp() { return 100; }
  get inHut() { return !!this.hut; }
  get mouth() { return { x: this.x + Math.sin(this.yaw) * 0.8, z: this.z + Math.cos(this.yaw) * 0.8 }; }

  hurt(amount, cause) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 1;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.cause = cause; }
  }

  context(mission) {
    const c = mission.context(this);
    if (c) return c;
    const m = this.mouth;
    const f = this.world.nearestFern(m.x, m.z, 1.8);
    if (f) return { type: 'fern', target: f, label: 'Есть' };
    if (heightAt(m.x, m.z) < 0.15 || heightAt(this.x, this.z) < 0.1) {
      return isFresh(m.x, m.z) ? { type: 'drink', label: 'Пить' } : { type: 'salt', label: 'Пить' };
    }
    return null;
  }

  jump() {
    if (this.airborne || this.swimming || this.stamina < 8 || !this.alive) return false;
    this.vy = 4.6; this.airborne = true; this.crouch = false;
    this.stamina -= 8;
    return true;
  }

  update(dt, ctrl, t, day, mission, rain) {
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 1.5);
    this.hunger = Math.max(0, this.hunger - dt * 0.09);
    this.thirst = Math.max(0, this.thirst - dt * 0.13);

    const moving = ctrl.mag > 0.08;
    if (!moving) this.stillT = (this.stillT || 0) + dt; else this.stillT = 0;
    if (this.stillT > 0.6 || this.stamina <= 1) this.running = false;
    let mode = this.crouch ? 'crouch' : 'walk';
    if (moving && (ctrl.run || this.running) && this.stamina > 2) { mode = 'run'; this.crouch = false; }
    const h0 = heightAt(this.x, this.z);
    this.swimming = h0 < -1.1 && !this.airborne;
    if (this.swimming) mode = 'swim';
    const target = moving ? SPEED[mode] * (mode === 'run' ? 1 : 0.45 + 0.55 * ctrl.mag) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * (this.airborne ? 1 : 8));
    if (moving || this.airborne) {
      const l = Math.hypot(ctrl.dx, ctrl.dz) || 1;
      const dirx = moving ? ctrl.dx / l : Math.sin(this.yaw), dirz = moving ? ctrl.dz / l : Math.cos(this.yaw);
      let nx = this.x + dirx * this.speed * dt, nz = this.z + dirz * this.speed * dt;
      const grade = (heightAt(nx, nz) - h0) / Math.max(1e-3, this.speed * dt);
      if (grade > 1.25 && !this.airborne) { nx = this.x; nz = this.z; }
      const p = { x: nx, z: nz };
      this.world.pushOut(p, this.radius);
      const lim = coastRadius(p.x, p.z) * 1.15, d = Math.hypot(p.x, p.z);
      if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
      this.x = p.x; this.z = p.z;
    }
    if (mode === 'run' && this.speed > 3) this.stamina -= dt * 13;
    else if (!this.airborne) this.stamina = Math.min(100, this.stamina + dt * (this.crouch ? 11 : moving ? 7 : 13));
    if (this.swimming) {
      this.stamina -= dt * 4;
      if (this.stamina <= 0) this.hurt(dt * 12, 'Утонул');
    }
    this.stamina = Math.max(0, this.stamina);

    // пол домика или земля; прыжок
    this.hut = mission.inHut(this.x, this.z);
    const g = heightAt(this.x, this.z);
    this.ground = this.hut ? Math.max(g, this.hut.floorY) : this.swimming ? 0 : g;
    this.landed = false;
    if (this.airborne) {
      this.jumpY += this.vy * dt;
      this.vy -= 12 * dt;
      if (this.jumpY <= 0) { this.jumpY = 0; this.vy = 0; this.airborne = false; this.landed = true; }
    }
    this.y = this.ground + this.jumpY;
    const eyeH = this.swimming ? 0.35 : this.crouch ? 0.95 : 1.65;
    this.eye += (eyeH - this.eye) * Math.min(1, dt * 8);
    if (!this.airborne) this.bob += this.speed * dt * (mode === 'run' ? 1.9 : 2.3);
    this.mode = moving ? mode : 'idle';

    // шум и заметность для хищников
    this.noise = !moving ? 0 : { crouch: 3, walk: 13, run: 42, swim: 10 }[mode];
    if (this.landed) this.noise = Math.max(this.noise, 16);
    this.noise *= 1 - (rain || 0) * 0.45;
    this.cover = this.world.coverAt(this.x, this.z);
    let v = 0.3 + 0.7 * day;
    v *= this.crouch ? 1 - this.cover * 0.85 : 1 - this.cover * 0.35;
    v *= 1 - (rain || 0) * 0.3;
    if (this.flashlight && day < 0.6) v = Math.max(v, 1.4);
    if (moving) v *= mode === 'run' ? 1.4 : 1.1;
    if (this.hut) { v *= 0.06; this.noise *= 0.3; }
    this.visibility = Math.max(0.02, v);

    if (this.hunger > 30 && this.thirst > 30) this.hp = Math.min(100, this.hp + dt * (this.hut ? 1.2 : 0.5));
    if (this.hunger <= 0) this.hurt(dt * 0.8, 'Голод');
    if (this.thirst <= 0) this.hurt(dt * 1.1, 'Жажда');
    if (volcanoDist(this.x, this.z) < 16) this.hurt(dt * 40, 'Лава');

    // действие: предметы, еда, вода, генератор, рация
    this.ctx = this.context(mission);
    this.lastAct = null;
    if (ctrl.act && this.ctx) {
      this.actT -= dt;
      if (this.actT <= 0) {
        this.actT = 0.5;
        const c = this.ctx;
        if (c.type === 'item') {
          const it = c.item;
          mission.take(it);
          if (it.kind === 'medkit') this.hp = Math.min(100, this.hp + 55);
          if (it.kind === 'stones') this.stones += 5;
          if (it.kind === 'flashlight') this.flashlight = true;
          this.lastAct = { kind: it.kind, item: it };
        }
        if (c.type === 'fern') { this.world.eatFern(c.target, 0.25); this.hunger = Math.min(100, this.hunger + 7); this.lastAct = { kind: 'eat' }; }
        if (c.type === 'drink') { this.thirst = Math.min(100, this.thirst + 9); this.lastAct = { kind: 'drink' }; }
        if (c.type === 'salt') this.lastAct = { kind: 'salt' };
        if (c.type === 'hint') this.lastAct = { kind: 'hint', text: c.text };
        if (c.type === 'radio') this.lastAct = { kind: 'radio' };
        if (c.type === 'generator') {
          mission.genHold += 0.5;
          this.lastAct = { kind: 'crank' };
          if (mission.genHold >= 4) this.lastAct = { kind: 'generator' };
        }
        this.noise = Math.max(this.noise, 6);
      }
    } else { this.actT = 0; if (!ctrl.act) mission.genHold = Math.max(0, mission.genHold - dt); }
  }

  serialize() {
    return {
      x: this.x, z: this.z, yaw: this.yaw, hp: this.hp, hunger: this.hunger, thirst: this.thirst,
      stamina: this.stamina, age: this.age, stones: this.stones,
    };
  }
}
