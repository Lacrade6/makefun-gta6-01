// Cars: a boxy low-poly build (body, cabin, wheels, lights) plus arcade driving
// physics — accelerate, brake, reverse, steering that tightens with speed, and
// a handbrake. Every car in the game, traffic or player-driven, is one of these.

import * as THREE from 'three';
import { CAR } from './config.js';

const PAINTS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1a1a1a, 0x7f8c8d, 0x16a085];
const POLICE_PAINT = 0xf2f2f2;

export function buildCarMesh(paint, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: paint });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x182430 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x141414 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR.width, 0.75, CAR.length), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(CAR.width - 0.35, 0.65, CAR.length * 0.48), glassMat);
  cabin.position.set(0, 1.2, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, 0.38, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    head.position.set(hx, 0.62, CAR.length / 2 + 0.02);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const tx of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    tail.position.set(tx, 0.62, -CAR.length / 2 - 0.02);
    group.add(tail);
  }
  let lightBar = null;
  if (isPolice) {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.x = -0.3;
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2050ff }));
    blue.position.x = 0.3;
    bar.add(red); bar.add(blue);
    bar.position.set(0, 1.62, -0.2);
    group.add(bar);
    lightBar = { red, blue };
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(CAR.width + 0.02, 0.22, CAR.length * 0.6), new THREE.MeshLambertMaterial({ color: 0x1a3a8a }));
    stripe.position.y = 0.62;
    group.add(stripe);
  }
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, wheels, lightBar };
}

export function createCar(scene, x, z, heading, paint, isPolice) {
  const { group, wheels, lightBar } = buildCarMesh(paint, isPolice);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return {
    mesh: group, wheels, lightBar,
    pos: { x, z },
    heading,
    speed: 0,
    paint,
    isPolice: !!isPolice,
    /** Arcade step: throttle -1..1, steer -1..1, handbrake on/off. */
    step(dt, throttle, steer, handbrake, colliders, collideFn) {
      const maxF = isPolice ? 40 : CAR.maxSpeed;
      if (throttle > 0) this.speed += CAR.accel * throttle * dt;
      else if (throttle < 0) {
        if (this.speed > 0.5) this.speed -= CAR.brake * dt;
        else this.speed -= CAR.reverseAccel * dt;
      } else {
        this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
      }
      if (handbrake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 26 * dt);
      this.speed = Math.max(-CAR.maxReverse, Math.min(maxF, this.speed));
      const steerAuthority = Math.min(1, Math.abs(this.speed) / 6 + 0.25);
      const turnBoost = this.isPolice ? 1.8 : 1;
      this.heading += steer * CAR.steer * steerAuthority * turnBoost * dt * Math.sign(this.speed || 1) * (this.speed >= 0 ? 1 : -1);
      const nx = this.pos.x + Math.sin(this.heading) * this.speed * dt;
      const nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      if (collideFn && colliders) {
        const fixed = collideFn(colliders, nx, nz, CAR.length / 2);
        if (fixed.x !== nx || fixed.z !== nz) this.speed *= 0.4;
        this.pos.x = fixed.x; this.pos.z = fixed.z;
      } else {
        this.pos.x = nx; this.pos.z = nz;
      }
      this.mesh.position.set(this.pos.x, 0, this.pos.z);
      this.mesh.rotation.y = this.heading;
      for (const w of this.wheels) w.rotation.x += this.speed * dt * 2.4;
    },
    setPose(x, z, heading) {
      this.pos.x = x; this.pos.z = z; this.heading = heading;
      this.mesh.position.set(x, 0, z);
      this.mesh.rotation.y = heading;
    },
  };
}

export function randomPaint(random) {
  return random.pick(PAINTS);
}

/** Repaint a car's body (used to make the cover chase car read on camera). */
export function setCarPaint(car, hex) {
  const body = car.mesh.children[0];
  if (body && body.material && body.material.color) body.material.color.setHex(hex);
}
