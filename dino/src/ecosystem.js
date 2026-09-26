// Животные острова: стада травоядных, стаи хищников, туши и птерозавры.
import { SPECIES, createDino, animateDino, createPterosaur } from './dinos.js';
import { heightAt, volcanoDist, VOLCANO, LAKES } from './terrain.js';
import { moveCreature, placeDino, wrapAngle } from './creature.js';
import { mulberry32 } from './noise.js';

// вид, размер группы, число групп
const POPULATION = [['strut', 6, 2], ['trike', 3, 2], ['anky', 2, 2], ['raptor', 3, 2], ['rex', 1, 2]];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Ecosystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.rand = mulberry32(77);
    this.list = [];
    this.herds = [];
    this.pending = [];
    this.pteros = [];
    this.onSeen = null;
    this.onKill = null;
    this.onPlayerHit = null;
  }

  populate(avoid) {
    for (const [id, n, groups] of POPULATION) for (let k = 0; k < groups; k++) this.spawnGroup(id, n, avoid);
    const centers = [LAKES[0], LAKES[1], { x: VOLCANO.x - 60, z: VOLCANO.z + 40 }];
    for (let i = 0; i < 3; i++) {
      const p = createPterosaur();
      this.scene.add(p.root);
      Object.assign(p, { cx: centers[i].x, cz: centers[i].z, r: 50 + i * 20, h: 55 + i * 15, a: this.rand() * 6, spd: 11 + this.rand() * 3 });
      this.pteros.push(p);
    }
  }

  spawnGroup(id, n, avoid) {
    const at = this.world.randomLand(this.rand, (x, z) => !avoid || Math.hypot(x - avoid.x, z - avoid.z) > 150);
    const herd = { id, goal: { x: at.x, z: at.z }, t: 0, members: [] };
    this.herds.push(herd);
    for (let i = 0; i < n; i++) this.make(id, at.x + (this.rand() - 0.5) * 16, at.z + (this.rand() - 0.5) * 16, herd);
  }

  make(id, x, z, herd) {
    const sp = SPECIES[id];
    const growth = this.rand() < 0.25 ? 0.35 + this.rand() * 0.3 : 0.75 + this.rand() * 0.25;
    const scale = 0.28 + 0.72 * growth;
    const dino = createDino(id);
    this.scene.add(dino.root);
    const maxHp = sp.hp * (0.25 + 0.75 * growth);
    const c = {
      sp, dino, x, z, yaw: this.rand() * Math.PI * 2, speed: 0, turn: 0, turnRate: Math.max(1.2, 3.4 - sp.len * 0.15),
      scale, growth, size: sp.len * scale, radius: sp.len * scale * 0.2, hp: maxHp, maxHp,
      state: 'wander', stateT: this.rand() * 5, target: null, herd, cool: 0, hunger: 30 + this.rand() * 50,
      dead: false, meat: 0, decay: 0, off: { a: this.rand() * Math.PI * 2, r: 3 + this.rand() * 10 },
    };
    herd.members.push(c);
    this.list.push(c);
    return c;
  }

  remove(c) {
    this.scene.remove(c.dino.root);
    this.list.splice(this.list.indexOf(c), 1);
    const h = c.herd;
    h.members.splice(h.members.indexOf(c), 1);
    this.pending.push({ id: c.sp.id, herd: h, t: 120 });
  }

  nearestCarcass(x, z, r) {
    let best = null, bd = r;
    for (const c of this.list) {
      if (!c.dead || c.meat <= 0) continue;
      const d = Math.hypot(c.x - x, c.z - z) - c.radius;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  damage(c, amount, attacker) {
    if (c.dead) return false;
    c.hp -= amount;
    c.dino.roar = 0.6;
    if (c.hp <= 0) {
      c.dead = true;
      c.meat = c.sp.len * c.scale * 16;
      c.decay = 0;
      c.speed = 0;
      if (attacker && attacker.isPlayer && this.onKill) this.onKill(c);
      return true;
    }
    if (c.sp.diet === 'carn') {
      if (attacker.size > c.size * 1.8) this.flee(c, attacker, 6);
      else { c.state = 'chase'; c.target = attacker; c.stateT = 20; }
    } else if (c.sp.fights && attacker.size < c.size * 1.6) {
      c.state = 'fight'; c.target = attacker; c.stateT = 12;
    } else this.flee(c, attacker, 6);
    return false;
  }

  flee(c, from, time) {
    c.state = 'flee'; c.fleeFrom = from; c.stateT = time; c.target = null;
    for (const m of c.herd.members) {
      if (m !== c && !m.dead && m.state !== 'fight' && dist(m, c) < 40 && m.size < from.size * 1.3) {
        m.state = 'flee'; m.fleeFrom = from; m.stateT = time;
      }
    }
  }

  hit(att, tg, player) {
    const dmg = att.sp.bite * (0.2 + 0.8 * att.growth);
    att.cool = att.sp.cool * 1.5;
    att.dino.bite = 1;
    if (tg === player) {
      player.hurt(dmg * 0.5, att.sp.name);
      if (this.onPlayerHit) this.onPlayerHit(att);
    } else this.damage(tg, dmg, att);
  }

  onRoar(player) {
    for (const c of this.list) {
      if (c.dead) continue;
      const d = dist(c, player);
      if (d < 45 && c.size < player.size * 0.6) this.flee(c, player, 5);
      else if (d < 45) c.dino.roar = 0.8;
    }
  }

  // ---- поведение ----
  wander(c) {
    const h = c.herd;
    const gx = h.goal.x + Math.cos(c.off.a) * c.off.r, gz = h.goal.z + Math.sin(c.off.a) * c.off.r;
    const dx = gx - c.x, dz = gz - c.z, dd = Math.hypot(dx, dz);
    if (dd > 5) return { dx, dz, speed: c.sp.walk * (dd > 40 ? 1.25 : 0.75) };
    return { dx: 0, dz: 0, speed: 0, graze: c.sp.diet === 'herb' ? 1 : 0 };
  }

  fleeIntent(c) {
    const f = c.fleeFrom;
    if (!f || (c.stateT < 0 && dist(c, f) > (c.sp.fear || 40) * 1.2) || f.dead === true) { c.state = 'wander'; return null; }
    let dx = c.x - f.x, dz = c.z - f.z;
    if (c.blocked) c.fleeBias = (c.fleeBias || 0) + 1.3;
    const a = c.fleeBias || 0;
    if (a) { const ca = Math.cos(a), sa = Math.sin(a); [dx, dz] = [dx * ca - dz * sa, dx * sa + dz * ca]; }
    return { dx, dz, speed: c.sp.run * (0.75 + 0.25 * c.growth) };
  }

  attackIntent(c, tg, player, speedK) {
    const dx = tg.x - c.x, dz = tg.z - c.z, dd = Math.hypot(dx, dz);
    const reach = c.size * 0.45 + (tg.radius || 1) + 0.8;
    if (dd > reach) return { dx, dz, speed: c.sp.run * speedK };
    const facing = Math.abs(wrapAngle(Math.atan2(dx, dz) - c.yaw)) < 0.7;
    if (c.cool <= 0 && facing) this.hit(c, tg, player);
    return { dx, dz, speed: 0.4 };
  }

  herbivore(c, P, carns) {
    const k = 0.75 + 0.25 * c.growth;
    if (c.state === 'fight') {
      const tg = c.target;
      const ok = tg && (tg.isPlayer ? tg.alive : !tg.dead) && dist(c, tg) < 45 && c.stateT > 0;
      if (ok) return this.attackIntent(c, tg, P, k * 0.8);
      c.state = 'wander'; c.target = null;
    }
    if (c.state === 'flee') { const f = this.fleeIntent(c); if (f) return f; }
    let threat = null, td = c.sp.fear;
    for (const q of carns) {
      const d = dist(q, c);
      if (d < td && q.size > c.size * 0.4) { threat = q; td = d; }
    }
    if (P && P.sp.diet === 'carn' && P.size > c.size * 0.4) {
      const d = dist(P, c);
      if (d < td * (P.resting ? 0.5 : 1)) { threat = P; td = d; }
    }
    if (threat) {
      if (c.sp.fights && threat.size < c.size * 1.3) {
        if (td < c.size * 0.8 + 5) { c.state = 'fight'; c.target = threat; c.stateT = 10; }
        return { dx: threat.x - c.x, dz: threat.z - c.z, speed: 0.3 };
      }
      this.flee(c, threat, 4 + this.rand() * 3);
      return this.fleeIntent(c) || this.wander(c);
    }
    return this.wander(c);
  }

  carnivore(c, P, dt) {
    const k = 0.75 + 0.25 * c.growth;
    c.hunger = Math.min(100, c.hunger + dt * 0.7);
    if (c.state === 'flee') { const f = this.fleeIntent(c); if (f) return f; }
    if (P && P.sp.diet === 'carn' && P.size > c.size * 1.8 && dist(P, c) < 28 && c.state !== 'chase') {
      this.flee(c, P, 5);
      return this.fleeIntent(c) || this.wander(c);
    }
    if (c.state === 'eat') {
      const cc = c.target;
      if (!cc || !cc.dead || cc.meat <= 0 || c.hunger < 5) { c.state = 'wander'; c.target = null; }
      else {
        const dx = cc.x - c.x, dz = cc.z - c.z;
        if (Math.hypot(dx, dz) > c.size * 0.5 + cc.radius + 1.5) return { dx, dz, speed: c.sp.walk };
        c.hunger -= dt * 5;
        cc.meat -= dt * 1.2;
        return { dx, dz, speed: 0, graze: 1 };
      }
    }
    if (c.state === 'chase') {
      const tg = c.target;
      const ok = tg && (tg.isPlayer ? tg.alive : !tg.dead) && c.stateT > 0 && dist(c, tg) < c.sp.sight * 1.5;
      if (ok) {
        if (!tg.isPlayer && tg.dead) { c.state = 'eat'; return { dx: 0, dz: 0, speed: 0 }; }
        return this.attackIntent(c, tg, P, k);
      }
      if (tg && tg.dead && !tg.isPlayer) { c.state = 'eat'; return { dx: 0, dz: 0, speed: 0 }; }
      c.state = 'wander'; c.target = null; c.hunger = Math.max(0, c.hunger - 15);
    }
    if (c.hunger > 40) {
      const carcass = this.nearestCarcass(c.x, c.z, c.sp.sight);
      if (carcass) { c.state = 'eat'; c.target = carcass; return { dx: 0, dz: 0, speed: 0 }; }
      let best = null, bs = c.sp.sight;
      for (const q of this.list) {
        if (q.dead || q.sp.diet !== 'herb' || q.size > c.size * (c.sp.id === 'rex' ? 2.5 : 1.2)) continue;
        const d = dist(q, c);
        if (d < bs) { bs = d; best = q; }
      }
      if (P && P.alive && P.size < c.size * 1.3) {
        const d = dist(P, c) * (P.resting ? 1.3 : 0.85);
        if (d < bs) { bs = d; best = P; }
      }
      if (best) {
        c.state = 'chase'; c.target = best; c.stateT = best.isPlayer ? 14 : 25;
        for (const m of c.herd.members) {
          if (m !== c && !m.dead && m.state !== 'chase' && dist(m, c) < 60) { m.state = 'chase'; m.target = best; m.stateT = 25; }
        }
      }
    }
    return this.wander(c);
  }

  update(dt, player, t, camera) {
    const P = player && player.alive ? player : null;
    const carns = this.list.filter((c) => !c.dead && c.sp.diet === 'carn');
    for (const h of this.herds) {
      h.t -= dt;
      const lead = h.members.find((m) => !m.dead);
      if (!lead || h.t > 0) continue;
      for (let i = 0; i < 12; i++) {
        const a = this.rand() * Math.PI * 2, d = 30 + this.rand() * 80;
        const x = lead.x + Math.cos(a) * d, z = lead.z + Math.sin(a) * d;
        const hh = heightAt(x, z);
        if (hh > 1.5 && hh < 40 && volcanoDist(x, z) > VOLCANO.r * 0.7) { h.goal = { x, z }; break; }
      }
      h.t = 20 + this.rand() * 35;
    }

    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      const d = c.dino;
      const camD = Math.hypot(c.x - camera.position.x, c.z - camera.position.z);
      d.root.visible = camD < 420;
      if (c.dead) {
        c.decay += dt;
        d.dead = Math.min(1, d.dead + dt * 1.5);
        d.graze = 0; d.bite = 0;
        if (d.root.visible) animateDino(d, dt, 0, t, 0);
        if ((c.meat <= 0 || c.decay > 300) && (!P || dist(c, P) > 60)) this.remove(c);
        continue;
      }
      c.cool -= dt; c.stateT -= dt;
      d.bite = Math.max(0, d.bite - dt * 3);
      d.roar = Math.max(0, d.roar - dt * 0.9);
      const it = c.sp.diet === 'herb' ? this.herbivore(c, P, carns) : this.carnivore(c, P, dt);
      moveCreature(c, it.dx, it.dz, it.speed, dt, this.world, false);
      // не даём телам проходить друг сквозь друга
      for (const o of this.list) {
        if (o === c || o.dead) continue;
        const dx = c.x - o.x, dz = c.z - o.z, dd = Math.hypot(dx, dz), min = (c.radius + o.radius) * 0.8;
        if (dd < min && dd > 0.01) { c.x += (dx / dd) * (min - dd) * 0.5; c.z += (dz / dd) * (min - dd) * 0.5; }
      }
      if (P) {
        const dx = c.x - P.x, dz = c.z - P.z, dd = Math.hypot(dx, dz), min = (c.radius + P.radius) * 0.8;
        if (dd < min && dd > 0.01) { c.x += (dx / dd) * (min - dd) * 0.5; c.z += (dz / dd) * (min - dd) * 0.5; }
        if (dd < 35 && this.onSeen) this.onSeen(c.sp.id);
      }
      d.graze += ((it.graze || 0) - d.graze) * Math.min(1, dt * 4);
      placeDino(c, dt);
      if (d.root.visible && camD < 260) animateDino(d, dt, c.speed, t, c.turn);
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t > 0) continue;
      const lead = p.herd.members.find((m) => !m.dead);
      const n = POPULATION.find((q) => q[0] === p.id)[1];
      if (p.herd.gone || p.herd.members.length >= n) { this.pending.splice(i, 1); continue; }
      if (lead && (!P || dist(lead, P) > 150)) this.make(p.id, lead.x + (this.rand() - 0.5) * 10, lead.z + (this.rand() - 0.5) * 10, p.herd);
      else if (!lead && !p.herd.members.length) {
        p.herd.gone = true;
        this.herds.splice(this.herds.indexOf(p.herd), 1);
        this.spawnGroup(p.id, n, P);
      } else { p.t = 30; continue; }
      this.pending.splice(i, 1);
      // остальные ожидающие того же стада сработают на следующих кадрах
    }

    for (const p of this.pteros) {
      p.a += (p.spd * dt) / p.r;
      p.phase += dt * 5;
      const x = p.cx + Math.cos(p.a) * p.r, z = p.cz + Math.sin(p.a) * p.r;
      p.root.position.set(x, p.h + Math.sin(p.a * 3) * 5, z);
      p.root.rotation.y = Math.atan2(-Math.sin(p.a), Math.cos(p.a));
      p.root.rotation.z = -0.25;
      const flap = Math.sin(p.a * 2) > 0.4 ? Math.sin(p.phase) * 0.45 : 0.05;
      for (const [piv, s] of p.wings) piv.rotation.z = s * flap;
      if (P && this.onSeen && Math.hypot(x - P.x, z - P.z) < 90) this.onSeen('ptero');
    }
  }

  serialize() {
    return this.list.filter((c) => !c.dead).length;
  }
}
