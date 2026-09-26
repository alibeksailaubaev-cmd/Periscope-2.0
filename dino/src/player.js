// Игрок — человек, выживший после крушения. Вид от первого лица.
import { heightAt, isFresh, volcanoDist, coastRadius } from './terrain.js';

const HUMAN = { id: 'human', name: 'Выживший', len: 1.8, hip: 0.9, diet: 'omni' };
const SPEED = { crouch: 1.3, walk: 2.9, run: 6.6, swim: 1.4 };

export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.isPlayer = true;
    this.alive = false;
    this.sp = HUMAN;
  }

  spawn(o = {}) {
    this.x = o.x; this.z = o.z; this.yaw = o.yaw ?? 0; this.pitch = 0;
    this.hp = o.hp ?? 100;
    this.hunger = o.hunger ?? 75;
    this.thirst = o.thirst ?? 70;
    this.stamina = o.stamina ?? 100;
    this.age = o.age ?? 0;
    this.parts = o.parts ?? [];
    this.alive = true;
    this.crouch = false;
    this.flashlight = false;
    this.speed = 0;
    this.noise = 0;
    this.visibility = 1;
    this.cover = 0;
    this.swimming = false;
    this.bob = 0;
    this.hitFlash = 0;
    this.actT = 0;
    this.eye = 1.65;
    this.cause = '';
    this.y = heightAt(this.x, this.z);
  }

  get size() { return 1.8; }
  get radius() { return 0.4; }
  get maxHp() { return 100; }
  get mouth() { return { x: this.x + Math.sin(this.yaw) * 0.8, z: this.z + Math.cos(this.yaw) * 0.8 }; }

  hurt(amount, cause) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 1;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.cause = cause; }
  }

  // Что можно сделать кнопкой действия.
  context() {
    for (const p of this.world.parts) {
      if (!p.taken && Math.hypot(p.x - this.x, p.z - this.z) < 2.6) return { type: 'part', target: p, label: 'Взять' };
    }
    const m = this.mouth;
    const f = this.world.nearestFern(m.x, m.z, 1.8);
    if (f) return { type: 'fern', target: f, label: 'Есть' };
    if (heightAt(m.x, m.z) < 0.15 || heightAt(this.x, this.z) < 0.1) {
      return isFresh(m.x, m.z) ? { type: 'drink', label: 'Пить' } : { type: 'salt', label: 'Пить' };
    }
    return null;
  }

  update(dt, ctrl, t, day) {
    this.age += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 1.5);
    this.hunger = Math.max(0, this.hunger - dt * 0.12);
    this.thirst = Math.max(0, this.thirst - dt * 0.17);

    // движение относительно взгляда
    let mode = this.crouch ? 'crouch' : 'walk';
    const moving = ctrl.mag > 0.08;
    if (moving && ctrl.run && this.stamina > 3) { mode = 'run'; this.crouch = false; }
    const h0 = heightAt(this.x, this.z);
    this.swimming = h0 < -1.1;
    if (this.swimming) mode = 'swim';
    const target = moving ? SPEED[mode] * (mode === 'run' ? 1 : 0.45 + 0.55 * ctrl.mag) : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * 8);
    if (moving) {
      const l = Math.hypot(ctrl.dx, ctrl.dz) || 1;
      let nx = this.x + (ctrl.dx / l) * this.speed * dt, nz = this.z + (ctrl.dz / l) * this.speed * dt;
      const grade = (heightAt(nx, nz) - h0) / Math.max(1e-3, this.speed * dt);
      if (grade > 1.25) { nx = this.x; nz = this.z; }
      const p = { x: nx, z: nz };
      this.world.pushOut(p, this.radius);
      const lim = coastRadius(p.x, p.z) * 1.15, d = Math.hypot(p.x, p.z);
      if (d > lim) { p.x *= lim / d; p.z *= lim / d; }
      this.x = p.x; this.z = p.z;
    }
    if (mode === 'run' && this.speed > 3) this.stamina -= dt * 15;
    else this.stamina = Math.min(100, this.stamina + dt * (this.crouch ? 11 : moving ? 7 : 13));
    if (this.swimming) {
      this.stamina -= dt * 4;
      if (this.stamina <= 0) this.hurt(dt * 12, 'Утонул');
    }
    this.stamina = Math.max(0, this.stamina);

    const g = heightAt(this.x, this.z);
    const eyeH = this.swimming ? 0.35 : this.crouch ? 0.95 : 1.65;
    this.eye += (eyeH - this.eye) * Math.min(1, dt * 8);
    this.y = this.swimming ? 0 : g;
    this.bob += this.speed * dt * (mode === 'run' ? 1.9 : 2.3);
    this.mode = moving ? mode : 'idle';

    // шум и заметность для хищников
    this.noise = !moving ? 0 : { crouch: 3, walk: 13, run: 42, swim: 10 }[mode];
    this.cover = this.world.coverAt(this.x, this.z);
    const light = 0.3 + 0.7 * day;
    let v = light;
    v *= this.crouch ? 1 - this.cover * 0.85 : 1 - this.cover * 0.35;
    if (this.flashlight && day < 0.6) v = Math.max(v, 1.4);
    if (moving) v *= mode === 'run' ? 1.4 : 1.1;
    this.visibility = Math.max(0.03, v);

    if (this.hunger > 30 && this.thirst > 30) this.hp = Math.min(100, this.hp + dt * 0.5);
    if (this.hunger <= 0) this.hurt(dt * 0.8, 'Голод');
    if (this.thirst <= 0) this.hurt(dt * 1.1, 'Жажда');
    if (volcanoDist(this.x, this.z) < 16) this.hurt(dt * 40, 'Лава');

    this.ctx = this.context();
    this.lastAct = null;
    if (ctrl.act && this.ctx) {
      this.actT -= dt;
      if (this.actT <= 0) {
        this.actT = 0.5;
        const c = this.ctx;
        if (c.type === 'part') { c.target.taken = true; c.target.mesh.visible = false; this.parts.push(c.target.id); this.lastAct = 'part'; this.lastPart = c.target; }
        if (c.type === 'fern') { this.world.eatFern(c.target, 0.25); this.hunger = Math.min(100, this.hunger + 7); this.lastAct = 'eat'; }
        if (c.type === 'drink') { this.thirst = Math.min(100, this.thirst + 9); this.lastAct = 'drink'; }
        if (c.type === 'salt') this.lastAct = 'salt';
        this.noise = Math.max(this.noise, 6);
      }
    } else this.actT = 0;
  }

  serialize() {
    return {
      x: this.x, z: this.z, yaw: this.yaw, hp: this.hp, hunger: this.hunger, thirst: this.thirst,
      stamina: this.stamina, age: this.age, parts: this.parts,
    };
  }
}
