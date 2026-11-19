// Rico on foot: a simple blocky character that walks, runs, jumps and
// punches, and gets in and out of cars. On foot the camera sits behind him
// and the mouse steers his facing.

import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, damp } from './rand.js';

export function makePersonMesh(shirt, pants, skin = 0xc98a5e) {
  const group = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.45), shirtMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 2.0;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.16, 0.54), new THREE.MeshLambertMaterial({ color: 0xffd76a }));
  cap.position.y = 2.28;
  group.add(cap);
  const legs = [];
  for (const sx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.36), pantsMat);
    leg.position.set(sx, 0.43, 0);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const sx of [-0.56, 0.56]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.3), shirtMat);
    arm.position.set(sx, 1.25, 0);
    arm.castShadow = true;
    group.add(arm);
    arms.push(arm);
  }
  group.userData.legs = legs;
  group.userData.arms = arms;
  return group;
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = makePersonMesh(0x2a6a8a, 0x2c2c34);
    this.mesh.position.set(-60, 0, 60);
    scene.add(this.mesh);
    this.x = -60;
    this.z = 60;
    this.heading = 0;
    this.camYaw = 0;
    this.speed = 0;
    this.health = CFG.player.health;
    this.onFoot = true;
    this.car = null;
    this.vy = 0;
    this.y = 0;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.walkPhase = 0;
    this.cash = 0;
  }

  get pos() {
    return { x: this.x, z: this.z };
  }

  // Move on foot. moveX/moveZ are in camera space (-1..1), dt seconds.
  walk(moveX, moveZ, running, dt) {
    const top = running ? CFG.player.runSpeed : CFG.player.walkSpeed;
    const mx = moveX * top;
    const mz = moveZ * top;
    const mag = Math.hypot(mx, mz);
    if (mag > 0.01) {
      const targetHeading = Math.atan2(mx, mz);
      let d = targetHeading - this.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.heading += clamp(d, -CFG.player.turnSpeed * dt, CFG.player.turnSpeed * dt);
      this.speed = damp(this.speed, Math.min(mag, top), 10, dt);
    } else {
      this.speed = damp(this.speed, 0, 12, dt);
    }
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    // Jump and gravity.
    if (this.y <= 0 && this.vy === 0 && this._jumpQueued) {
      this.vy = 6.5;
      this._jumpQueued = false;
    }
    if (this.y > 0 || this.vy !== 0) {
      this.vy -= 22 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
    }
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
    // Walk swing.
    this.walkPhase += this.speed * dt * 1.6;
    const swing = Math.sin(this.walkPhase) * clamp(this.speed / CFG.player.runSpeed, 0, 1) * 0.55;
    this.mesh.userData.legs[0].rotation.x = swing;
    this.mesh.userData.legs[1].rotation.x = -swing;
    this.mesh.userData.arms[0].rotation.x = -swing * 0.8;
    this.mesh.userData.arms[1].rotation.x = swing * 0.8;
    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      const t = 1 - this.punchTimer / 0.28;
      this.mesh.userData.arms[1].rotation.x = -1.4 * Math.sin(t * Math.PI);
    }
    if (this.punchCooldown > 0) this.punchCooldown -= dt;
  }

  queueJump() {
    this._jumpQueued = true;
  }

  // Unit forward vector in world space, for combat and camera work.
  facing() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  get moving() {
    return this.speed > 0.5;
  }

  punch() {
    if (this.punchCooldown > 0 || !this.onFoot) return false;
    this.punchTimer = 0.28;
    this.punchCooldown = 0.45;
    return true;
  }

  enterCar(car) {
    this.onFoot = false;
    this.car = car;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.car) return;
    const f = this.car.forward();
    this.x = this.car.x - f.z * 3.2;
    this.z = this.car.z + f.x * 3.2;
    this.y = 0;
    this.heading = this.car.heading;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.visible = true;
    this.onFoot = true;
    this.car = null;
  }

  hurt(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(CFG.player.health, this.health + amount);
  }
}
