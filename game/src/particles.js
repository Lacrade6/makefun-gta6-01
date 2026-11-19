// Particles: one THREE.Points cloud for sparks, smoke, dust and NOS
// flames, plus a screen-shake value the camera reads. Cheap, no textures,
// no per-particle meshes.

import * as THREE from 'three';

const MAX = 420;

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.gravity = new Float32Array(MAX);
    this.count = 0;
    this.shake = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(x, y, z, color, n, speed, life = 0.7, gravity = -6) {
    for (let i = 0; i < n; i++) {
      const idx = this.count % MAX;
      this.count += 1;
      this.positions[idx * 3] = x;
      this.positions[idx * 3 + 1] = y;
      this.positions[idx * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.vel[idx * 3] = Math.cos(a) * sp;
      this.vel[idx * 3 + 1] = up * sp;
      this.vel[idx * 3 + 2] = Math.sin(a) * sp;
      const c = new THREE.Color(color);
      const shade = 0.7 + Math.random() * 0.5;
      this.colors[idx * 3] = Math.min(1, c.r * shade);
      this.colors[idx * 3 + 1] = Math.min(1, c.g * shade);
      this.colors[idx * 3 + 2] = Math.min(1, c.b * shade);
      this.life[idx] = life * (0.6 + Math.random() * 0.7);
      this.maxLife[idx] = this.life[idx];
      this.gravity[idx] = gravity;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  sparks(x, y, z) {
    this.burst(x, y, z, 0xffd76a, 22, 7, 0.5, -9);
  }

  smoke(x, y, z) {
    this.burst(x, y, z, 0x666666, 14, 2.5, 1.3, 2.5);
  }

  dust(x, y, z) {
    this.burst(x, y, z, 0xc9a06a, 10, 3, 0.8, -2);
  }

  nosFlame(x, y, z, heading) {
    const bx = x - Math.sin(heading) * 2.4;
    const bz = z - Math.cos(heading) * 2.4;
    this.burst(bx, y + 0.5, bz, 0x66aaff, 6, 3, 0.35, 0);
  }

  // A gold fountain for mission completions and REP level-ups.
  goldBurst(x, y, z) {
    this.burst(x, y + 1, z, 0xffd76a, 40, 6, 1.1, -4);
    this.burst(x, y + 1, z, 0xffffff, 16, 4, 0.8, -2);
  }

  addShake(amount) {
    this.shake = Math.min(1.4, this.shake + amount);
  }

  shakeOffset() {
    if (this.shake <= 0.01) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shake * 0.5,
      y: (Math.random() - 0.5) * this.shake * 0.4,
    };
  }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -100;
        continue;
      }
      this.vel[i * 3 + 1] += this.gravity[i] * dt;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.positions[i * 3 + 1] < 0.05) {
        this.positions[i * 3 + 1] = 0.05;
        this.vel[i * 3 + 1] = 0;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.shake = Math.max(0, this.shake - dt * 2.2);
  }
}
