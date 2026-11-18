// The player on foot: a simple articulated figure (torso, head, legs, arms) that
// walks, sprints and punches, with a third-person camera orbit. Also owns the
// enter/exit-car handoff with the car the player is driving.

import * as THREE from 'three';
import { PLAYER } from './config.js';
import { collideCircle } from './city.js';

export function buildPlayerMesh() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd8a077 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xffd23f });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2a3a55 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.12;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skin);
  head.position.y = 1.68;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  cap.position.y = 1.92;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), pants);
  legL.position.set(-0.16, 0.36, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;
  group.add(legL); group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), shirt);
  armL.position.set(-0.42, 1.15, 0);
  const armR = armL.clone();
  armR.position.x = 0.42;
  group.add(armL); group.add(armR);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, legL, legR, armL, armR };
}

export function createPlayer(scene, x, z) {
  const { group, legL, legR, armL, armR } = buildPlayerMesh();
  group.position.set(x, 0, z);
  scene.add(group);
  const player = {
    mesh: group,
    pos: { x, z },
    heading: 0,
    health: PLAYER.maxHealth,
    money: 0,
    inCar: null,
    punchTimer: 0,
    punchAnim: 0,
    walkPhase: 0,
    moving: false,
    step(dt, move, camYaw, colliders) {
      if (this.inCar) return;
      const speed = move.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
      let fx = 0; let fz = 0;
      if (move.forward !== 0 || move.strafe !== 0) {
        const len = Math.hypot(move.forward, move.strafe);
        const f = move.forward / len; const s = move.strafe / len;
        // Camera-relative: forward is where the camera looks.
        const sin = Math.sin(camYaw); const cos = Math.cos(camYaw);
        fx = (-sin * f + cos * s);
        fz = (-cos * f - sin * s);
        this.heading = Math.atan2(fx, fz);
        this.moving = true;
      } else {
        this.moving = false;
      }
      const nx = this.pos.x + fx * speed * dt;
      const nz = this.pos.z + fz * speed * dt;
      const fixed = collideCircle(colliders, nx, nz, PLAYER.radius);
      this.pos.x = fixed.x; this.pos.z = fixed.z;
      this.pos.x = Math.max(-195, Math.min(195, this.pos.x));
      this.pos.z = Math.max(-195, Math.min(205, this.pos.z));
      if (this.moving) this.walkPhase += dt * speed * 1.6;
      const swing = this.moving ? Math.sin(this.walkPhase) * 0.6 : 0;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
      if (this.punchAnim > 0) {
        this.punchAnim -= dt;
        armR.rotation.x = -1.6 * Math.max(0, this.punchAnim / 0.18);
      }
      if (this.punchTimer > 0) this.punchTimer -= dt;
      this.mesh.position.set(this.pos.x, 0, this.pos.z);
      this.mesh.rotation.y = this.heading;
    },
    punch() {
      if (this.punchTimer > 0 || this.inCar) return false;
      this.punchTimer = PLAYER.punchCooldown;
      this.punchAnim = 0.18;
      return true;
    },
    setPose(x, z, heading) {
      this.pos.x = x; this.pos.z = z; this.heading = heading;
      this.mesh.position.set(x, 0, z);
      this.mesh.rotation.y = heading;
    },
    damage(amount) {
      this.health = Math.max(0, this.health - amount);
      return this.health <= 0;
    },
    heal(amount) { this.health = Math.min(PLAYER.maxHealth, this.health + amount); },
  };
  return player;
}
