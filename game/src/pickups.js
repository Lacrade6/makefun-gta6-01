// Street cash: spinning green stacks left around Solmar City. Walk or drive
// over one to pocket $50. Collected stacks respawn somewhere else after a
// while, so there is always a reason to cruise.

import * as THREE from 'three';
import { CITY } from './config.js';
import { nearestStreetCoord } from './city.js';

const COUNT = 8;
const VALUE = 50;

export function createPickups(scene, random) {
  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.BoxGeometry(1.4, 0.35, 0.9);
  const mat = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
  const bandMat = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });

  function randomSpot() {
    const street = random.pick([-176, -132, -88, -44, 0, 44, 88, 132, 176]);
    const along = random.range(-160, 160);
    const horizontal = random.chance(0.5);
    return horizontal
      ? { x: along, z: street + (random.chance(0.5) ? 10 : -10) }
      : { x: street + (random.chance(0.5) ? 10 : -10), z: along };
  }

  const items = [];
  for (let i = 0; i < COUNT; i += 1) {
    const mesh = new THREE.Group();
    const stack = new THREE.Mesh(geo, mat);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.37, 0.92), bandMat);
    mesh.add(stack); mesh.add(band);
    const spot = randomSpot();
    mesh.position.set(spot.x, 0.5, spot.z);
    group.add(mesh);
    items.push({ mesh, x: spot.x, z: spot.z, taken: false, respawn: 0, spin: random.range(0, 6) });
  }

  return {
    items,
    value: VALUE,
    step(dt, playerPos) {
      let collected = 0;
      for (const item of items) {
        if (item.taken) {
          item.respawn -= dt;
          if (item.respawn <= 0) {
            const spot = randomSpot();
            item.x = spot.x; item.z = spot.z;
            item.mesh.position.set(spot.x, 0.5, spot.z);
            item.mesh.visible = true;
            item.taken = false;
          }
          continue;
        }
        item.spin += dt * 2;
        item.mesh.rotation.y = item.spin;
        item.mesh.position.y = 0.5 + Math.sin(item.spin * 1.4) * 0.15;
        const d = Math.hypot(playerPos.x - item.x, playerPos.z - item.z);
        if (d < 2.2) {
          item.taken = true;
          item.respawn = 45;
          item.mesh.visible = false;
          collected += 1;
        }
      }
      return collected;
    },
    reset(randomSeed) {
      for (const item of items) {
        const spot = randomSpot();
        item.x = spot.x; item.z = spot.z;
        item.taken = false;
        item.mesh.visible = true;
        item.mesh.position.set(spot.x, 0.5, spot.z);
      }
    },
  };
}
