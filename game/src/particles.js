// Lightweight particle pool: sparks, smoke, gold glints, impact puffs.
import * as THREE from 'three';

const MAX = 900;

export class Particles {
  constructor(scene) {
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.velocities = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.gravity = new Float32Array(MAX);
    this.cursor = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.55, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < MAX; i++) this.positions[i * 3 + 1] = -50;
  }

  emit(x, y, z, count, color, speed = 5, life = 0.7, gravity = -6, spreadY = 0.6) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;
      this.velocities[i * 3] = Math.cos(a) * r;
      this.velocities[i * 3 + 1] = Math.random() * speed * spreadY + 1;
      this.velocities[i * 3 + 2] = Math.sin(a) * r;
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
      this.life[i] = life * (0.5 + Math.random() * 0.8);
      this.maxLife[i] = this.life[i];
      this.gravity[i] = gravity;
    }
  }

  sparks(x, y, z, n = 14) { this.emit(x, y, z, n, 0xffc93f, 6, 0.5, -9); }
  smoke(x, y, z, n = 10) { this.emit(x, y, z, n, 0x8a8a92, 2, 1.4, 1.5); }
  gold(x, y, z, n = 26) { this.emit(x, y, z, n, 0xffd23f, 3.5, 1.1, -2); }
  bloodlessPuff(x, y, z, n = 8) { this.emit(x, y, z, n, 0xffffff, 3, 0.4, -3); }
  nosFlame(x, y, z) { this.emit(x, y, z, 3, 0x37c8ff, 1.2, 0.25, 0, 0.1); }
  confetti(x, y, z, n = 30) { this.emit(x, y, z, n, 0xff7ab8, 5, 1.6, -3); }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -50;
        continue;
      }
      this.velocities[i * 3 + 1] += this.gravity[i] * dt;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      if (this.positions[i * 3 + 1] < 0.05) this.positions[i * 3 + 1] = 0.05;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
