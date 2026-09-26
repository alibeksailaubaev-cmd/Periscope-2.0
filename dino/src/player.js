// Игрок: динозавр с голодом, жаждой, выносливостью и ростом.
import { SPECIES, createDino, animateDino } from './dinos.js';
import { heightAt, isFresh, volcanoDist } from './terrain.js';
import { moveCreature, placeDino, wrapAngle } from './creature.js';

export const STAGES = [[0, 'Детёныш'], [0.3, 'Подросток'], [0.65, 'Молодой взрослый'], [0.95, 'Взрослый']];

export class Player {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.isPlayer = true;
    this.alive = false;
    this.dino = null;
  }

  spawn(spId, o = {}) {
    if (this.dino) this.scene.remove(this.dino.root);
    this.sp = SPECIES[spId];
    this.dino = createDino(spId);
    this.scene.add(this.dino.root);
    this.growth = o.growth ?? 0.08;
    this.x = o.x; this.z = o.z; this.yaw = o.yaw ?? 0;
    this.hp = o.hp ?? this.maxHp;
    this.hunger = o.hunger ?? 80;
    this.thirst = o.thirst ?? 80;
    this.stamina = o.stamina ?? 100;
    this.age = o.age ?? 0;
    this.kills = o.kills ?? 0;
    this.speed = 0; this.turn = 0; this.turnRate = 3.2;
    this.alive = true; this.resting = false; this.swimming = false;
    this.cool = 0; this.roarCool = 0; this.actT = 0; this.hitFlash = 0;
    this.cause = '';
    placeDino(this, 0.016);
  }

  get scale() { return 0.28 + 0.72 * Math.min(1, this.growth); }
  get size() { return this.sp.len * this.scale; }
  get radius() { return this.size * 0.2; }
  get maxHp() { return this.sp.hp * (0.25 + 0.75 * Math.min(1, this.growth)); }
  get damage() { return this.sp.bite * (0.2 + 0.8 * Math.min(1, this.growth)); }
  get stage() { let s = STAGES[0][1]; for (const [g, n] of STAGES) if (this.growth >= g) s = n; return s; }
  get mouth() {
    const r = this.size * 0.45;
    return { x: this.x + Math.sin(this.yaw) * r, z: this.z + Math.cos(this.yaw) * r };
  }

  hurt(amount, cause) {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 1;
    this.resting = false;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.cause = cause; }
  }

  // Что можно сделать прямо сейчас кнопкой действия.
  context(eco) {
    const m = this.mouth, reach = 1.5 + this.size * 0.25;
    if (this.sp.diet === 'carn') {
      const c = eco.nearestCarcass(m.x, m.z, reach + 1.5);
      if (c) return { type: 'eat', target: c, label: 'Есть' };
    } else {
      const f = this.world.nearestFern(m.x, m.z, reach + 1);
      if (f) return { type: 'fern', target: f, label: 'Есть' };
    }
    if (heightAt(m.x, m.z) < 0.15 || heightAt(this.x, this.z) < 0.1) {
      return isFresh(m.x, m.z) ? { type: 'drink', label: 'Пить' } : { type: 'salt', label: 'Пить' };
    }
    return null;
  }

  update(dt, ctrl, eco, t) {
    const sp = this.sp, g = Math.min(1, this.growth);
    const slow = this.resting ? 0.5 : 1;
    this.age += dt;
    this.hunger = Math.max(0, this.hunger - dt * 0.2 * slow);
    this.thirst = Math.max(0, this.thirst - dt * 0.26 * slow);
    this.cool -= dt; this.roarCool -= dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2);
    const d = this.dino;
    d.bite = Math.max(0, d.bite - dt * 3);
    d.roar = Math.max(0, d.roar - dt * 0.7);

    let target = 0, dx = 0, dz = 0;
    if (ctrl.mag > 0.08) {
      this.resting = false;
      dx = ctrl.dx; dz = ctrl.dz;
      const running = ctrl.run && this.stamina > 2;
      target = (running ? sp.run : sp.walk * (0.4 + 0.6 * Math.min(1, ctrl.mag))) * (0.9 + 0.1 * g);
      if (running && this.speed > sp.walk) this.stamina -= dt * 13;
    }
    if (this.swimming) {
      target *= 0.45;
      this.stamina -= dt * 5;
      if (this.stamina <= 0) this.hurt(dt * this.maxHp * 0.08, 'Утонул');
    }
    if (!ctrl.run || ctrl.mag < 0.08) this.stamina = Math.min(100, this.stamina + dt * (this.resting ? 22 : 9));
    this.stamina = Math.max(0, this.stamina);
    moveCreature(this, dx, dz, target, dt, this.world, true);
    this.swimming = placeDino(this, dt);

    if (this.hunger > 35 && this.thirst > 35) this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.005 * (this.resting ? 3 : 1));
    if (this.hunger <= 0) this.hurt(dt * this.maxHp * 0.012, 'Голод');
    if (this.thirst <= 0) this.hurt(dt * this.maxHp * 0.016, 'Жажда');
    if (volcanoDist(this.x, this.z) < 14) this.hurt(dt * this.maxHp * 0.25, 'Лава');
    if (this.hunger > 50 && this.thirst > 50 && this.growth < 1) this.growth = Math.min(1, this.growth + dt * 0.0016 * (this.resting ? 1.3 : 1));

    // кнопка действия: есть или пить, пока удерживается
    const ctx = this.context(eco);
    this.ctx = ctx;
    let graze = 0;
    if (ctrl.act && ctx && this.alive) {
      this.resting = false;
      graze = 1;
      this.actT -= dt;
      if (this.actT <= 0) {
        this.actT = 0.45;
        const k = 1 / (0.4 + g);
        if (ctx.type === 'eat') { ctx.target.meat -= 2 + 3 * g; this.hunger = Math.min(100, this.hunger + 8 * k); this.growth = Math.min(1, this.growth + 0.0015); this.lastAct = 'eat'; }
        if (ctx.type === 'fern') { this.world.eatFern(ctx.target, 0.2); this.hunger = Math.min(100, this.hunger + 6 * k); this.growth = Math.min(1, this.growth + 0.001); this.lastAct = 'eat'; }
        if (ctx.type === 'drink') { this.thirst = Math.min(100, this.thirst + 9 * k); this.lastAct = 'drink'; }
        if (ctx.type === 'salt') { this.lastAct = 'salt'; }
      }
    } else this.actT = 0;
    d.graze += (graze - d.graze) * Math.min(1, dt * 5);
    d.rest += ((this.resting ? 1 : 0) - d.rest) * Math.min(1, dt * 3);
    d.dead += ((this.alive ? 0 : 1) - d.dead) * Math.min(1, dt * 2);
    animateDino(d, dt, this.speed, t, this.turn);
  }

  bite(eco) {
    if (this.cool > 0 || !this.alive) return null;
    this.cool = this.sp.cool;
    this.dino.bite = 1;
    this.resting = false;
    const reach = this.size * 0.5 + 1.2;
    let best = null, bd = Infinity;
    for (const c of eco.list) {
      if (c.dead) continue;
      const dx = c.x - this.x, dz = c.z - this.z, dd = Math.hypot(dx, dz) - c.radius;
      if (dd > reach) continue;
      if (Math.abs(wrapAngle(Math.atan2(dx, dz) - this.yaw)) > 1.0) continue;
      if (dd < bd) { bd = dd; best = c; }
    }
    if (best) eco.damage(best, this.damage, this);
    return best;
  }

  roar(eco) {
    if (this.roarCool > 0 || !this.alive) return false;
    this.roarCool = 5;
    this.dino.roar = 1;
    this.resting = false;
    eco.onRoar(this);
    return true;
  }

  toggleRest() {
    if (!this.alive || this.swimming) return;
    this.resting = !this.resting;
  }

  serialize() {
    return {
      sp: this.sp.id, growth: this.growth, x: this.x, z: this.z, yaw: this.yaw, hp: this.hp,
      hunger: this.hunger, thirst: this.thirst, stamina: this.stamina, age: this.age, kills: this.kills,
    };
  }
}
