// Cars: low-poly models and arcade driving physics (NOS, drift, near-miss).
import * as THREE from 'three';
import { CAR_TUNE, PALETTE } from './config.js';
import { clamp, pick, range } from './rand.js';

const tyreMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd8e8 });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

function wheel() {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12), tyreMat);
  w.rotation.z = Math.PI / 2;
  return w;
}

// Builds a car group facing +Z (forward). kind: 'sedan' | 'sport' | 'van' | 'police'
export function makeCarMesh(color, kind = 'sedan') {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dims = {
    sedan: { w: 1.9, h: 0.62, l: 4.3, cabinL: 2.1, cabinY: 0.95 },
    sport: { w: 1.95, h: 0.5, l: 4.4, cabinL: 1.8, cabinY: 0.82 },
    van: { w: 2.0, h: 0.9, l: 4.6, cabinL: 3.4, cabinY: 1.25 },
    police: { w: 1.9, h: 0.62, l: 4.4, cabinL: 2.1, cabinY: 0.95 },
  }[kind];

  const body = new THREE.Mesh(new THREE.BoxGeometry(dims.w, dims.h, dims.l), paint);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(dims.w * 0.86, 0.55, dims.cabinL), glassMat);
  cabin.position.set(0, dims.cabinY, -0.15);
  g.add(cabin);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(dims.w * 0.8, 0.09, dims.cabinL * 0.9), paint);
  roof.position.set(0, dims.cabinY + 0.3, -0.15);
  g.add(roof);

  const wheels = [];
  for (const [wx, wz] of [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.45], [0.85, -1.45]]) {
    const w = wheel();
    w.position.set(wx, 0.38, wz);
    g.add(w);
    wheels.push(w);
  }
  for (const sx of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), lightMat);
    head.position.set(sx, 0.62, dims.l / 2 + 0.02);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), tailMat);
    tail.position.set(sx, 0.66, -dims.l / 2 - 0.02);
    g.add(tail);
  }

  if (kind === 'police') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(dims.w + 0.04, 0.3, dims.l * 0.92),
      new THREE.MeshLambertMaterial({ color: 0x1c3f8f }));
    stripe.position.y = 0.5;
    g.add(stripe);
    const barRed = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    barRed.position.set(-0.32, dims.cabinY + 0.45, -0.15);
    g.add(barRed);
    const barBlue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2060ff }));
    barBlue.position.set(0.32, dims.cabinY + 0.45, -0.15);
    g.add(barBlue);
    g.userData.lightBar = [barRed, barBlue];
  }
  if (kind === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), paint);
    spoiler.position.set(0, 1.05, -2.0);
    g.add(spoiler);
  }
  g.userData.wheels = wheels;
  return g;
}

export class Car {
  constructor(scene, x, z, heading, color = null, kind = 'sedan') {
    this.kind = kind;
    this.mesh = makeCarMesh(color ?? pick(PALETTE.carPaint), kind);
    this.pos = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.vel = new THREE.Vector3();
    this.speed = 0;          // signed forward speed (m/s)
    this.steer = 0;
    this.nos = 60;           // 0..100
    this.health = 100;
    this.driver = null;      // 'player' | 'traffic' | 'police' | null
    this.driftScore = 0;
    this.drifting = false;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
  }

  forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  // Arcade drive step. input: {throttle -1..1, steer -1..1, handbrake, nos}
  drive(dt, input) {
    const fwd = this.forward();
    const top = CAR_TUNE.topSpeed * (this.kind === 'sport' ? 1.25 : 1);
    let accel = input.throttle * CAR_TUNE.accel;
    if (input.throttle < 0 && this.speed > 0.5) accel = input.throttle * CAR_TUNE.brake;

    let boosting = false;
    if (input.nos && this.nos > 0 && input.throttle > 0) {
      accel += CAR_TUNE.nosBoost;
      this.nos = Math.max(0, this.nos - CAR_TUNE.nosDrain * dt);
      boosting = true;
    } else {
      this.nos = Math.min(100, this.nos + CAR_TUNE.nosRegen * dt);
    }

    this.speed += accel * dt;
    this.speed -= this.speed * 0.35 * dt; // drag
    const maxFwd = boosting ? top * 1.35 : top;
    this.speed = clamp(this.speed, -CAR_TUNE.reverseMax, maxFwd);

    // Steering bites harder at speed; handbrake loosens the rear.
    const steerTarget = input.steer * (input.handbrake ? 1.25 : 1);
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
    const speedFactor = clamp(Math.abs(this.speed) / 10, 0, 1);
    this.heading += this.steer * CAR_TUNE.steerRate * speedFactor * dt
      * (this.speed < 0 ? -1 : 1);

    // Velocity: blend current velocity toward the heading (grip), so the
    // handbrake leaves a sliding velocity vector — that's the drift.
    const target = fwd.multiplyScalar(this.speed);
    const grip = input.handbrake ? CAR_TUNE.driftGrip : CAR_TUNE.grip;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, grip * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, grip * dt);
    this.pos.addScaledVector(this.vel, dt);

    const lateral = Math.abs(
      this.vel.x * Math.cos(this.heading) - this.vel.z * Math.sin(this.heading));
    this.drifting = lateral > 4 && Math.abs(this.speed) > 12;
    if (this.drifting) this.driftScore += lateral * dt * 2.2;
    return boosting;
  }

  syncMesh(dt) {
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * dt / 0.38;
    for (const w of this.mesh.userData.wheels) w.rotation.x += spin;
  }

  // Flash the light bar (police). t is elapsed seconds.
  flashLights(t) {
    const bar = this.mesh.userData.lightBar;
    if (!bar) return;
    const phase = Math.floor(t * 6) % 2 === 0;
    bar[0].material.color.setHex(phase ? 0xff2020 : 0x661111);
    bar[1].material.color.setHex(phase ? 0x112266 : 0x2060ff);
  }

  kmh() {
    return Math.abs(Math.round(this.speed * 3.6));
  }

  // True when the car is wrecked enough to smoke (visual feedback in main).
  isSmoking() {
    return this.health < 45;
  }
}
