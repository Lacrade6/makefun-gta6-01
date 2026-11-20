// Rico on foot: blocky character model, walk/run animation, third-person camera.
import * as THREE from 'three';
import { PLAYER_TUNE, WORLD } from './config.js';
import { clamp, lerp } from './rand.js';
import { collideCircle } from './city.js';

function limb(w, h, d, color) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }));
  mesh.position.y = -h / 2;
  pivot.add(mesh);
  return pivot;
}

export function makeCharacterMesh(shirt = 0xff7a3c, pants = 0x2b3a55, skin = 0xc98a5a) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34),
    new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.18;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.4, 0.36),
    new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.82;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xd83a3a }));
  cap.position.y = 2.06;
  g.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xd83a3a }));
  brim.position.set(0, 2.0, 0.32);
  g.add(brim);

  const armL = limb(0.16, 0.62, 0.16, shirt);
  armL.position.set(-0.42, 1.52, 0);
  const armR = limb(0.16, 0.62, 0.16, shirt);
  armR.position.set(0.42, 1.52, 0);
  const legL = limb(0.2, 0.78, 0.2, pants);
  legL.position.set(-0.17, 0.8, 0);
  const legR = limb(0.2, 0.78, 0.2, pants);
  legR.position.set(0.17, 0.8, 0);
  g.add(armL, armR, legL, legR);
  g.userData = { armL, armR, legL, legR, head };
  return g;
}

export class Player {
  constructor(scene, x, z) {
    this.mesh = makeCharacterMesh();
    this.pos = new THREE.Vector3(x, 0, z);
    this.velY = 0;
    this.heading = 0;
    this.health = PLAYER_TUNE.healthMax;
    this.inCar = null;       // Car instance when driving
    this.walkPhase = 0;
    this.punchTimer = 0;
    this.stunTimer = 0;
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  // Camera-relative movement on foot. camYaw is the camera orbit angle.
  moveOnFoot(dt, input, camYaw, colliders) {
    const axis = input.axis();
    const speed = input.sprint() ? PLAYER_TUNE.sprintSpeed : PLAYER_TUNE.walkSpeed;
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    // Forward on screen is away from camera: (-sin, -cos) in world xz.
    let mx = axis.x * cos - axis.y * sin;
    let mz = -axis.x * sin - axis.y * cos;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      mx /= len;
      mz /= len;
      this.pos.x += mx * speed * dt;
      this.pos.z += mz * speed * dt;
      const targetHeading = Math.atan2(mx, mz);
      let d = targetHeading - this.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.heading += d * Math.min(1, dt * 12);
      this.walkPhase += dt * (input.sprint() ? 13 : 9);
    }

    if (input.justPressed('Space') && this.pos.y <= 0.01) {
      this.velY = PLAYER_TUNE.jumpVelocity;
    }
    this.velY -= PLAYER_TUNE.gravity * dt;
    this.pos.y = Math.max(0, this.pos.y + this.velY * dt);
    if (this.pos.y === 0) this.velY = 0;

    const fixed = collideCircle(colliders, this.pos.x, this.pos.z, 0.55);
    this.pos.x = clamp(fixed.x, -WORLD.half + 2, WORLD.half - 2);
    this.pos.z = clamp(fixed.z, -WORLD.half + 2, WORLD.half - 2);
    this.animate(dt, len > 0.01);
  }

  animate(dt, moving) {
    const u = this.mesh.userData;
    const swing = moving ? Math.sin(this.walkPhase) * 0.65 : 0;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.8;
    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      u.armR.rotation.x = -1.5 * Math.sin(Math.min(1, this.punchTimer / 0.22) * Math.PI);
    } else {
      u.armR.rotation.x = swing * 0.8;
    }
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.mesh.rotation.z = Math.sin(this.stunTimer * 20) * 0.12;
    } else {
      this.mesh.rotation.z = 0;
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
  }

  punch() {
    this.punchTimer = 0.22;
  }

  hurt(amount) {
    this.health = clamp(this.health - amount, 0, PLAYER_TUNE.healthMax);
    this.stunTimer = 0.3;
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, PLAYER_TUNE.healthMax);
  }

  // Slow regeneration keeps free-roam forgiving between missions.
  regen(dt) {
    if (this.health > 0 && this.health < PLAYER_TUNE.healthMax) {
      this.health = clamp(this.health + dt * 1.2, 0, PLAYER_TUNE.healthMax);
    }
  }
}

// Orbit camera that follows a target, with collision-free simple clamping.
export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI;
    this.pitch = 0.32;
    this.distance = 8;
    this.shake = 0;
    this.pos = new THREE.Vector3();
  }

  addShake(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  update(dt, input, target, driving) {
    this.yaw -= input.mouseDX * 0.005;
    this.pitch = clamp(this.pitch + input.mouseDY * 0.004, 0.05, 1.1);
    const wantDist = driving ? 10.5 : 7.5;
    this.distance = lerp(this.distance, wantDist, Math.min(1, dt * 3));

    const cx = target.x - Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cz = target.z - Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cy = target.y + 2.2 + Math.sin(this.pitch) * this.distance;
    this.pos.set(cx, Math.max(1.2, cy), cz);

    if (this.shake > 0.001) {
      const s = this.shake * 0.35;
      this.pos.x += (Math.random() - 0.5) * s;
      this.pos.y += (Math.random() - 0.5) * s;
      this.pos.z += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }
    this.camera.position.copy(this.pos);
    this.camera.lookAt(target.x, target.y + 1.6, target.z);
  }
}
