// Cars: how they look and how they drive. A car is a small group of boxes
// (body, cabin, wheels, lights) so the whole fleet is cheap to render.
// The player car gets arcade physics: acceleration, steering that bites
// harder at low speed, a handbrake drift and a NOS boost.

import * as THREE from 'three';
import { CFG } from './config.js';
import { clamp, damp } from './rand.js';

const PAINTS = [0xc23b3b, 0x3b6ac2, 0xd8a83b, 0x3bc25e, 0x8a5fc2, 0xd8d8d8, 0x222226, 0xc26a3b, 0x3bc2b8, 0xe8e8e8];

export function makeCarMesh(color, police = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x14141c });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1c2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2), glass);
  cabin.position.set(0, 1.18, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0c0c10 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  for (const wx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), headMat);
    head.position.set(wx, 0.7, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const wx of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.08), tailMat);
    tail.position.set(wx, 0.7, -2.22);
    group.add(tail);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.4), new THREE.MeshLambertMaterial({ color: 0x111118 }));
    bar.position.set(0, 1.52, -0.25);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.28, 1.6, -0.25);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.42), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(0.28, 1.6, -0.25);
    group.add(blue);
    group.userData.lightBar = { red, blue };
  }
  group.userData.wheels = wheels;
  return group;
}

export function paintColor(rand) {
  return PAINTS[Math.floor(rand() * PAINTS.length)];
}

// Arcade car state. x/z and heading live in world space; forward is
// (sin(heading), cos(heading)) in x/z.
export class Car {
  constructor(scene, x, z, heading, color, police = false) {
    this.scene = scene;
    this.mesh = makeCarMesh(color, police);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.steerAngle = 0;
    this.police = police;
    this.nos = CFG.car.nosMax;
    this.boosting = false;
    this.drifting = false;
    this.alive = true;
    this.health = 100;
  }

  get pos() {
    return { x: this.x, z: this.z };
  }

  forward() {
    return { x: Math.sin(this.heading), z: Math.cos(this.heading) };
  }

  // throttle -1..1, steer -1..1, handbrake bool, nos bool, dt seconds.
  drive(throttle, steer, handbrake, nos, dt) {
    const c = CFG.car;
    const speedSign = this.speed >= 0 ? 1 : -1;
    if (throttle > 0) {
      this.speed += c.accel * throttle * dt;
    } else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= c.brake * dt;
      else this.speed += c.reverseAccel * throttle * dt;
    }
    // Rolling drag and a soft stop.
    this.speed -= this.speed * 0.55 * dt;
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    this.speed = clamp(this.speed, -c.maxReverse, c.maxSpeed);

    this.boosting = false;
    if (nos && this.nos > 0 && throttle > 0 && this.speed > 4) {
      this.speed += c.nosAccel * dt;
      this.nos -= c.nosDrain * dt;
      this.boosting = true;
    } else {
      this.nos = Math.min(c.nosMax, this.nos + c.nosRegen * dt);
    }

    const speedFactor = clamp(Math.abs(this.speed) / 14, 0, 1);
    const targetSteer = steer * c.steer * (0.35 + 0.65 * (1 - speedFactor * 0.6));
    this.steerAngle = damp(this.steerAngle, targetSteer, 8, dt);
    this.drifting = handbrake && Math.abs(this.speed) > 8;
    // Turn rate: quick enough to corner at city speed, calm at full speed.
    const turnRate = this.steerAngle * 0.55 * clamp(Math.abs(this.speed) / 10, 0, 1);
    this.heading += turnRate * dt * speedSign;
    if (this.drifting) {
      // The nose turns faster than the velocity: a real slide.
      this.heading += steer * 0.9 * dt * speedSign;
    }
    const f = this.forward();
    this.x += f.x * this.speed * dt;
    this.z += f.z * this.speed * dt;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    // Lean into corners, squat on boost.
    this.mesh.rotation.z = damp(this.mesh.rotation.z, -this.steerAngle * 0.06 * speedSign, 8, dt);
    this.mesh.rotation.x = damp(this.mesh.rotation.x, this.boosting ? -0.03 : 0, 6, dt);
    const spin = this.speed * dt * 2.4;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.x += spin;
  }

  damage(amount) {
    this.health -= amount;
    return this.health <= 0;
  }

  remove() {
    this.alive = false;
    this.scene.remove(this.mesh);
  }
}
