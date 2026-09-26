// Общая физика передвижения для игрока и животных.
import { heightAt, coastRadius } from './terrain.js';

export const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export function moveCreature(c, dx, dz, target, dt, world, canSwim = false) {
  let turn = 0;
  if (target > 0.05 && (dx || dz)) {
    const diff = wrapAngle(Math.atan2(dx, dz) - c.yaw);
    const max = c.turnRate * dt;
    const step = Math.max(-max, Math.min(max, diff));
    c.yaw = wrapAngle(c.yaw + step);
    turn = step / Math.max(dt, 1e-4);
  }
  c.turn = turn;
  c.speed += (target - c.speed) * Math.min(1, dt * (target > c.speed ? 3 : 5));
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const step = c.speed * dt;
  let nx = c.x + fx * step, nz = c.z + fz * step;
  if (step > 1e-4) {
    const grade = (heightAt(nx, nz) - heightAt(c.x, c.z)) / step;
    if (grade > 1.4) { nx = c.x; nz = c.z; c.speed *= 0.6; }
    else if (grade > 0.6) {
      const k = 1 - (grade - 0.6) * 0.6;
      nx = c.x + fx * step * k; nz = c.z + fz * step * k;
    }
  }
  c.blocked = false;
  if (!canSwim && heightAt(nx, nz) < -0.8) { nx = c.x; nz = c.z; c.speed *= 0.5; c.blocked = true; }
  const p = { x: nx, z: nz };
  world.pushOut(p, c.radius * 0.5);
  const lim = coastRadius(p.x, p.z) * 1.2, d = Math.hypot(p.x, p.z);
  if (d > lim) { p.x *= lim / d; p.z *= lim / d; c.blocked = true; }
  c.x = p.x; c.z = p.z;
}

// Ставит модель на землю, наклоняет по склону и погружает при плавании.
export function placeDino(c, dt) {
  const d = c.dino, s = c.scale;
  const half = c.sp.len * s * 0.3;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const hf = heightAt(c.x + fx * half, c.z + fz * half), hb = heightAt(c.x - fx * half, c.z - fz * half);
  const pitch = Math.max(-0.5, Math.min(0.5, Math.atan2(hf - hb, half * 2)));
  d.pitch += (pitch - d.pitch) * Math.min(1, dt * 5);
  const h = heightAt(c.x, c.z);
  const deep = -h > c.sp.hip * s * 0.6;
  d.swim += ((deep ? 1 : 0) - d.swim) * Math.min(1, dt * 4);
  d.root.position.set(c.x, h + (0 - h) * d.swim, c.z);
  d.root.rotation.y = c.yaw;
  d.root.scale.setScalar(s);
  d.scale = s;
  return deep;
}
