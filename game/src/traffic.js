// Street life: traffic cars that loop the road grid, and pedestrians who
// walk the sidewalks and scatter when trouble comes near. Traffic keeps
// the city feeling alive and gives the player cars to steal.

import { CFG } from './config.js';
import { Car, paintColor } from './vehicles.js';
import { makePersonMesh } from './player.js';
import { makeRand, pick, range } from './rand.js';

const SHIRTS = [0xd84a4a, 0x4a8ad8, 0x4ad88a, 0xd8c24a, 0x9a4ad8, 0xe8e8e8, 0x4ad8d8, 0xd84a9a];
const PANTS = [0x2c2c34, 0x3a4a6a, 0x5a3a2a, 0x2a4a3a];

export class Traffic {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.rand = makeRand(20240);
    this.cars = [];
    this.peds = [];
    this._spawnCars();
    this._spawnPeds();
  }

  _randomRoadPoint() {
    const lines = this.city.roadLines;
    const line = pick(this.rand, lines);
    const along = range(this.rand, -CFG.city.half + 20, CFG.city.half - 20);
    if (this.rand() < 0.5) return { x: line, z: along, alongZ: true };
    return { x: along, z: line, alongZ: false };
  }

  _spawnCars() {
    for (let i = 0; i < CFG.traffic.cars; i++) {
      const p = this._randomRoadPoint();
      const car = new Car(this.scene, p.x, p.z, p.alongZ ? (this.rand() < 0.5 ? 0 : Math.PI) : (this.rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2), paintColor(this.rand));
      car.cruiseSpeed = range(this.rand, CFG.traffic.carSpeed[0], CFG.traffic.carSpeed[1]);
      car.lane = p.alongZ ? 'z' : 'x';
      car.line = p.alongZ ? p.x : p.z;
      car.dir = car.heading;
      this.cars.push(car);
    }
  }

  _spawnPeds() {
    for (let i = 0; i < CFG.traffic.peds; i++) {
      const p = this._randomRoadPoint();
      const mesh = makePersonMesh(pick(this.rand, SHIRTS), pick(this.rand, PANTS));
      const x = p.x + range(this.rand, -7, 7);
      const z = p.z + range(this.rand, -7, 7);
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.peds.push({
        mesh,
        x,
        z,
        heading: range(this.rand, 0, Math.PI * 2),
        speed: range(this.rand, CFG.traffic.pedSpeed[0], CFG.traffic.pedSpeed[1]),
        walkPhase: range(this.rand, 0, 6),
        flee: 0,
        alive: true,
      });
    }
  }

  // Nearest driveable car to a point, within maxDist. Used for stealing.
  nearestCar(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.cars) {
      if (!car.alive) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  nearestPed(x, z, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const ped of this.peds) {
      if (!ped.alive) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < bestD) { bestD = d; best = ped; }
    }
    return best;
  }

  removeCar(car) {
    car.remove();
    const idx = this.cars.indexOf(car);
    if (idx >= 0) this.cars.splice(idx, 1);
    // A fresh car rolls in from the edge of the map a little later.
    setTimeout(() => {
      const p = this._randomRoadPoint();
      const fresh = new Car(this.scene, p.x, p.z, p.alongZ ? 0 : Math.PI / 2, paintColor(this.rand));
      fresh.cruiseSpeed = range(this.rand, CFG.traffic.carSpeed[0], CFG.traffic.carSpeed[1]);
      fresh.lane = p.alongZ ? 'z' : 'x';
      fresh.line = p.alongZ ? p.x : p.z;
      this.cars.push(fresh);
    }, 9000);
  }

  update(dt, playerPos, threatPos, threatRadius) {
    // Traffic cars: cruise their road line, turn at intersections.
    for (const car of this.cars) {
      if (!car.alive) continue;
      // Slow down for a car ahead on the same line.
      let target = car.cruiseSpeed;
      for (const other of this.cars) {
        if (other === car || !other.alive) continue;
        if (other.lane !== car.lane || Math.abs(other.line - car.line) > 3) continue;
        const ahead = car.lane === 'z'
          ? (other.z - car.z) * Math.cos(car.heading)
          : (other.x - car.x) * Math.sin(car.heading);
        if (ahead > 0 && ahead < 9) target = Math.min(target, other.speed * 0.6);
      }
      // And for the player crossing in front.
      const dx = playerPos.x - car.x;
      const dz = playerPos.z - car.z;
      const fwd = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
      if (fwd > 0 && fwd < 10 && Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading)) < 4) {
        target = 0;
      }
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      const f = car.forward();
      car.x += f.x * car.speed * dt;
      car.z += f.z * car.speed * dt;
      // Turn at an intersection sometimes, or wrap at the city edge.
      const nearLine = this.city.nearestRoad(car.lane === 'z' ? car.x : car.z);
      const cross = car.lane === 'z' ? car.z : car.x;
      if (Math.abs(cross - nearLine) < 1.5 && this.rand() < dt * 0.25) {
        const turn = this.rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        car.heading += turn;
        car.lane = car.lane === 'z' ? 'x' : 'z';
        car.line = car.lane === 'z' ? car.x : car.z;
      }
      if (car.x > CFG.city.half || car.x < -CFG.city.half || car.z > CFG.city.half || car.z < -CFG.city.half) {
        car.heading += Math.PI;
        car.x = Math.max(-CFG.city.half + 4, Math.min(CFG.city.half - 4, car.x));
        car.z = Math.max(-CFG.city.half + 4, Math.min(CFG.city.half - 4, car.z));
      }
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
    }
    // Pedestrians: stroll the sidewalks, flee from a nearby threat.
    for (const ped of this.peds) {
      if (!ped.alive) continue;
      const dThreat = threatPos ? Math.hypot(ped.x - threatPos.x, ped.z - threatPos.z) : 999;
      if (dThreat < threatRadius) ped.flee = 1.6;
      if (ped.flee > 0) {
        ped.flee -= dt;
        const away = Math.atan2(ped.x - threatPos.x, ped.z - threatPos.z);
        ped.heading = away;
        ped.speed = 4.5;
      } else {
        ped.speed = range(this.rand, 1.1, 2.0);
        if (this.rand() < dt * 0.12) ped.heading += range(this.rand, -1.2, 1.2);
      }
      ped.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.z += Math.cos(ped.heading) * ped.speed * dt;
      this.city.resolveCircle(ped, 0.5);
      ped.x = Math.max(-CFG.city.half, Math.min(CFG.city.waterX - 3, ped.x));
      ped.z = Math.max(-CFG.city.half, Math.min(CFG.city.half, ped.z));
      ped.walkPhase += ped.speed * dt * 2.2;
      const swing = Math.sin(ped.walkPhase) * 0.4;
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
      ped.mesh.userData.legs[0].rotation.x = swing;
      ped.mesh.userData.legs[1].rotation.x = -swing;
      ped.mesh.userData.arms[0].rotation.x = -swing * 0.8;
      ped.mesh.userData.arms[1].rotation.x = swing * 0.8;
    }
  }
}
