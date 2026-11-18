// Particles: one THREE.Points pool for exhaust puffs, crash sparks and damage
// smoke. Positions, velocities and life are updated on the CPU each frame;
// faded particles shrink to the background colour so a single material works.

import * as THREE from 'three';

const MAX = 240;

export function createParticles(scene) {
  const positions = new Float32Array(MAX * 3);
  const colors = new Float32Array(MAX * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.9, vertexColors: true, transparent: true, opacity: 0.85,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  const pool = [];
  for (let i = 0; i < MAX; i += 1) {
    pool.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, x: 0, y: -100, z: 0, r: 0, g: 0, b: 0, grow: 0, size: 1 });
    positions[i * 3 + 1] = -100;
  }
  let cursor = 0;

  function spawn(x, y, z, vx, vy, vz, life, r, g, b) {
    const p = pool[cursor];
    cursor = (cursor + 1) % MAX;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = life; p.max = life;
    p.r = r; p.g = g; p.b = b;
  }

  return {
    /** Grey exhaust puff behind a car tailpipe. */
    exhaust(x, y, z, heading) {
      const bx = x - Math.sin(heading) * 2.2;
      const bz = z - Math.cos(heading) * 2.2;
      spawn(bx + (Math.random() - 0.5) * 0.4, y + 0.4, bz + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6,
        0.7 + Math.random() * 0.4, 0.45, 0.45, 0.48);
    },
    /** Hot yellow-orange sparks on an impact. */
    sparks(x, y, z, count = 14) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 6;
        spawn(x, y + 0.5, z, Math.cos(a) * sp, 1 + Math.random() * 3.5, Math.sin(a) * sp,
          0.35 + Math.random() * 0.3, 1.0, 0.75 + Math.random() * 0.2, 0.15);
      }
    },
    /** Dark damage smoke, rising and drifting. */
    smoke(x, y, z) {
      spawn(x + (Math.random() - 0.5) * 0.8, y + 1.0, z + (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.5, 1.6 + Math.random(), (Math.random() - 0.5) * 0.5,
        1.1 + Math.random() * 0.5, 0.16, 0.16, 0.18);
    },
    step(dt) {
      for (let i = 0; i < MAX; i += 1) {
        const p = pool[i];
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) {
          positions[i * 3 + 1] = -100;
          colors[i * 3] = 0; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 0;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy += 0.4 * dt; // hot puffs keep rising a touch
        const f = p.life / p.max;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        colors[i * 3] = p.r * f;
        colors[i * 3 + 1] = p.g * f;
        colors[i * 3 + 2] = p.b * f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
