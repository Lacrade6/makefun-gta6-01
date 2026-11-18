// Traffic: cars that cruise the street grid (turning at intersections) and
// pedestrians who stroll the sidewalks and flee from danger. Both are simple
// and robust — they never leave the roads, never collide with buildings, and
// respawn at the far edge if they wander out.

import * as THREE from 'three';
import { CITY, TRAFFIC } from './config.js';
import { createCar, randomPaint } from './vehicles.js';
import { nearestStreetCoord, streetCoords } from './city.js';
import { buildPlayerMesh } from './player.js';

const PED_SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1, 0x1abc9c, 0xfd79a8];

export function createTraffic(scene, random, colliders) {
  const streets = streetCoords();
  const cars = [];
  const peds = [];

  function spawnTrafficCar() {
    const horizontal = random.chance(0.5);
    const lane = random.pick(streets);
    const dir = random.chance(0.5) ? 1 : -1;
    const offset = 3.2 * dir; // keep right
    const along = random.range(-CITY.skyline, CITY.skyline);
    const x = horizontal ? along : lane + offset;
    const z = horizontal ? lane + offset : along;
    const heading = horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const car = createCar(scene, x, z, heading, randomPaint(random), false);
    car.speed = TRAFFIC.carSpeed * random.range(0.8, 1.2);
    car.horizontal = horizontal;
    car.dir = dir;
    car.lane = lane;
    car.stolen = false;
    return car;
  }

  for (let i = 0; i < TRAFFIC.cars; i += 1) cars.push(spawnTrafficCar());

  function spawnPed() {
    const { group } = buildPlayerMesh();
    // Recolour the shirt so pedestrians are not clones of the player.
    group.children.forEach((child) => {
      if (child.material && child.material.color && child.position.y > 1.0 && child.position.y < 1.5) {
        child.material = new THREE.MeshLambertMaterial({ color: random.pick(PED_SHIRTS) });
      }
    });
    const horizontal = random.chance(0.5);
    const street = random.pick(streets);
    const along = random.range(-CITY.skyline, CITY.skyline);
    const side = random.chance(0.5) ? 1 : -1;
    const x = horizontal ? along : street + side * (CITY.roadHalf + 2.5);
    const z = horizontal ? street + side * (CITY.roadHalf + 2.5) : along;
    group.position.set(x, 0, z);
    scene.add(group);
    return {
      mesh: group, pos: { x, z },
      heading: random.range(0, Math.PI * 2),
      speed: TRAFFIC.pedSpeed * random.range(0.8, 1.3),
      horizontal, dir: random.chance(0.5) ? 1 : -1,
      lane: street, side,
      flee: 0, down: 0, walkPhase: random.range(0, 6),
    };
  }
  for (let i = 0; i < TRAFFIC.peds; i += 1) peds.push(spawnPed());

  return {
    cars, peds,
    /** Nearest drivable (not stolen, not police) car within `range` of a point. */
    nearestCar(x, z, range) {
      let best = null; let bestD = range;
      for (const car of cars) {
        if (car.stolen) continue;
        const d = Math.hypot(car.pos.x - x, car.pos.z - z);
        if (d < bestD) { bestD = d; best = car; }
      }
      return best;
    },
    step(dt, playerPos, playerSpeed) {
      for (const car of cars) {
        if (car.stolen || car.parked) continue;
        // Drive along the lane; at an intersection, sometimes turn.
        const speed = car.speed;
        car.pos.x += Math.sin(car.heading) * speed * dt;
        car.pos.z += Math.cos(car.heading) * speed * dt;
        const nearCross = Math.abs(car.pos.x - nearestStreetCoord(car.pos.x)) < 2.5
          || Math.abs(car.pos.z - nearestStreetCoord(car.pos.z)) < 2.5;
        if (nearCross && random.chance(dt * 0.25)) {
          car.heading += random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        }
        // Wrap around the city edge.
        if (Math.abs(car.pos.x) > CITY.skyline + 10 || Math.abs(car.pos.z) > CITY.skyline + 10) {
          const replacement = spawnTrafficCar();
          car.pos.x = replacement.pos.x; car.pos.z = replacement.pos.z;
          car.heading = replacement.heading; car.speed = replacement.speed;
          scene.remove(replacement.mesh);
        }
        car.mesh.position.set(car.pos.x, 0, car.pos.z);
        car.mesh.rotation.y = car.heading;
        for (const w of car.wheels) w.rotation.x += speed * dt * 2.4;
      }
      for (const ped of peds) {
        if (ped.down > 0) {
          ped.down -= dt;
          ped.mesh.rotation.x = ped.down > 0 ? -Math.PI / 2 : 0;
          if (ped.down <= 0) ped.mesh.position.y = 0;
          continue;
        }
        const dx = ped.pos.x - playerPos.x;
        const dz = ped.pos.z - playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 6 && (playerSpeed > 8 || ped.flee > 0)) ped.flee = 2.5;
        let hx = Math.sin(ped.heading); let hz = Math.cos(ped.heading);
        if (ped.flee > 0) {
          ped.flee -= dt;
          hx = dx / (dist || 1); hz = dz / (dist || 1);
          ped.heading = Math.atan2(hx, hz);
        } else if (random.chance(dt * 0.08)) {
          ped.heading += random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        }
        const sp = ped.flee > 0 ? ped.speed * 2.6 : ped.speed;
        ped.pos.x += hx * sp * dt;
        ped.pos.z += hz * sp * dt;
        ped.pos.x = Math.max(-195, Math.min(195, ped.pos.x));
        ped.pos.z = Math.max(-195, Math.min(205, ped.pos.z));
        ped.walkPhase += dt * sp * 2.2;
        ped.mesh.position.set(ped.pos.x, 0, ped.pos.z);
        ped.mesh.rotation.y = ped.heading;
        const swing = Math.sin(ped.walkPhase) * 0.5;
        if (ped.mesh.children[3]) ped.mesh.children[3].rotation.x = swing;
        if (ped.mesh.children[4]) ped.mesh.children[4].rotation.x = -swing;
      }
    },
  };
}
