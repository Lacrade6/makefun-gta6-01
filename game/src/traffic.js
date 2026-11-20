// Ambient life: traffic cars driving the grid and pedestrians on sidewalks.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { Car } from './vehicles.js';
import { makeCharacterMesh } from './player.js';
import { nearestRoadLine, roadLines } from './city.js';
import { rng, range, pick, clamp, dist2d } from './rand.js';

const LINES = roadLines();
const LANE = 2.6; // lane offset from road centre (right-hand traffic)

function randomRoadPoint() {
  const vertical = rng() < 0.5;
  const line = pick(LINES);
  const along = range(-WORLD.half + 12, WORLD.half - 12);
  return vertical ? { x: line, z: along, vertical } : { x: along, z: line, vertical };
}

class TrafficCar {
  constructor(scene) {
    const p = randomRoadPoint();
    const dir = rng() < 0.5 ? 1 : -1;
    this.axis = p.vertical ? 'z' : 'x';
    this.dir = dir;
    const laneOff = LANE * dir;
    const x = p.vertical ? p.x + laneOff : p.x;
    const z = p.vertical ? p.z : p.z - laneOff;
    const heading = p.vertical
      ? (dir > 0 ? 0 : Math.PI)
      : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    this.car = new Car(scene, x, z, heading, null, pick(['sedan', 'sedan', 'van', 'sport']));
    this.car.driver = 'traffic';
    this.speed = range(9, 14);
    this.stopped = 0;
  }

  update(dt, obstacles) {
    const c = this.car;
    // Stop for obstacles directly ahead.
    const fwd = c.forward();
    let blocked = false;
    for (const o of obstacles) {
      const dx = o.x - c.pos.x;
      const dz = o.z - c.pos.z;
      const ahead = dx * fwd.x + dz * fwd.z;
      const side = Math.abs(dx * fwd.z - dz * fwd.x);
      if (ahead > 0 && ahead < 7 && side < 2.2) { blocked = true; break; }
    }
    this.stopped = blocked ? Math.min(1, this.stopped + dt * 3) : Math.max(0, this.stopped - dt * 2);
    const throttle = blocked ? -0.6 : clamp((this.speed - c.speed) / 6, -1, 1);

    // At an intersection, maybe turn.
    const along = this.axis === 'z' ? c.pos.z : c.pos.x;
    const cross = nearestRoadLine(along);
    let steer = 0;
    if (Math.abs(along - cross) < 1.2 && !this.turnedAt) {
      this.turnedAt = cross;
      if (rng() < 0.4) {
        this.axis = this.axis === 'z' ? 'x' : 'z';
        this.dir = rng() < 0.5 ? 1 : -1;
      }
    }
    if (Math.abs(along - (this.turnedAt ?? 9999)) > 4) this.turnedAt = null;

    // Steer toward the lane centre of the current road.
    const laneTarget = this.axis === 'z'
      ? nearestRoadLine(c.pos.x) + LANE * this.dir
      : nearestRoadLine(c.pos.z) - LANE * this.dir;
    const off = (this.axis === 'z' ? c.pos.x : c.pos.z) - laneTarget;
    const wantHeading = this.axis === 'z'
      ? (this.dir > 0 ? 0 : Math.PI) - off * 0.12 * this.dir
      : (this.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + off * 0.12 * this.dir;
    let d = wantHeading - c.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    steer = clamp(d * 1.6, -1, 1);

    c.drive(dt, { throttle, steer, handbrake: false, nos: false });
    c.syncMesh(dt);

    // Wrap around the island edges.
    if (c.pos.x < -WORLD.half) c.pos.x = WORLD.half - 4;
    if (c.pos.x > WORLD.half) c.pos.x = -WORLD.half + 4;
    if (c.pos.z < -WORLD.half) c.pos.z = WORLD.half - 4;
    if (c.pos.z > WORLD.half) c.pos.z = -WORLD.half + 4;
  }
}

class Pedestrian {
  constructor(scene) {
    const shirts = [0x4db2ff, 0xffd23f, 0x7dff9a, 0xff9d5c, 0xd8b8e8, 0xf5f5f5];
    this.mesh = makeCharacterMesh(pick(shirts), pick([0x333, 0x555, 0x224]), 0xc98a5a);
    this.mesh.scale.setScalar(0.96);
    const p = randomRoadPoint();
    this.axis = p.vertical ? 'z' : 'x';
    this.dir = rng() < 0.5 ? 1 : -1;
    this.side = rng() < 0.5 ? 1 : -1;
    this.pos = new THREE.Vector3(
      p.vertical ? p.x + (WORLD.roadWidth / 2 + 1.6) * this.side : p.x,
      0,
      p.vertical ? p.z : p.z + (WORLD.roadWidth / 2 + 1.6) * this.side,
    );
    this.speed = range(1.2, 2.0);
    this.phase = rng() * 10;
    this.state = 'walk'; // walk | flee | down
    this.downTimer = 0;
    this.health = 30;
    scene.add(this.mesh);
  }

  update(dt, threat) {
    if (this.state === 'down') {
      this.downTimer -= dt;
      this.mesh.rotation.x = -Math.PI / 2 + 0.12;
      if (this.downTimer <= 0) {
        this.state = 'walk';
        this.health = 30;
        this.mesh.rotation.x = 0;
      }
      this.mesh.position.copy(this.pos);
      return;
    }
    let speed = this.speed;
    let moveDir = this.dir;
    if (threat && dist2d(this.pos.x, this.pos.z, threat.x, threat.z) < 6) {
      this.state = 'flee';
      speed = 4.6;
      moveDir = (this.axis === 'z' ? this.pos.z - threat.z : this.pos.x - threat.x) >= 0 ? 1 : -1;
    } else if (this.state === 'flee') {
      this.state = 'walk';
    }
    if (this.axis === 'z') this.pos.z += moveDir * speed * dt;
    else this.pos.x += moveDir * speed * dt;
    this.phase += dt * speed * 3.4;
    const u = this.mesh.userData;
    const swing = Math.sin(this.phase) * 0.55;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.axis === 'z'
      ? (moveDir > 0 ? 0 : Math.PI)
      : (moveDir > 0 ? Math.PI / 2 : -Math.PI / 2);
    // Turn around at the island edge or randomly at crossings.
    const along = this.axis === 'z' ? this.pos.z : this.pos.x;
    if (Math.abs(along) > WORLD.half - 8) this.dir *= -1;
  }

  hit(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      this.state = 'down';
      this.downTimer = 6;
      return true; // knocked out
    }
    this.state = 'flee';
    return false;
  }
}

export class Traffic {
  constructor(scene, carCount = 14, pedCount = 22) {
    this.cars = [];
    this.peds = [];
    for (let i = 0; i < carCount; i++) this.cars.push(new TrafficCar(scene));
    for (let i = 0; i < pedCount; i++) this.peds.push(new Pedestrian(scene));
  }

  update(dt, playerPos, playerCar) {
    const obstacles = [{ x: playerPos.x, z: playerPos.z }];
    if (playerCar) obstacles.push({ x: playerCar.pos.x, z: playerCar.pos.z });
    for (const tc of this.cars) {
      obstacles.push({ x: tc.car.pos.x, z: tc.car.pos.z });
    }
    for (const tc of this.cars) tc.update(dt, obstacles);
    const threat = playerCar && Math.abs(playerCar.speed) > 6 ? playerCar.pos : null;
    for (const ped of this.peds) ped.update(dt, threat);
  }

  allCars() {
    return this.cars.map((t) => t.car);
  }

  // Nearest pedestrian to a point (used by combat feedback in main).
  nearestPed(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const ped of this.peds) {
      const d = dist2d(x, z, ped.pos.x, ped.pos.z);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  }
}
