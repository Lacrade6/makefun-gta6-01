// Scattered pickups: health, cash, NOS canisters and REP stars.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { roadLines } from './city.js';
import { rng, pick, range, dist2d } from './rand.js';

const KINDS = {
  health: { color: 0xff5d8f, label: '+HEALTH' },
  cash: { color: 0x7dff9a, label: '+CASH' },
  nos: { color: 0x37c8ff, label: '+NOS' },
  rep: { color: 0xffd23f, label: '+REP' },
};

function makePickupMesh(kind) {
  const g = new THREE.Group();
  const color = KINDS[kind].color;
  const mat = new THREE.MeshBasicMaterial({ color });
  if (kind === 'health') {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.35), mat);
    const h = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.35), mat);
    g.add(v, h);
  } else if (kind === 'cash') {
    const bill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.6), mat);
    g.add(bill);
  } else if (kind === 'nos') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 10), mat);
    g.add(can);
  } else {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), mat);
    g.add(star);
  }
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.05, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.75;
  g.add(halo);
  return g;
}

export class Pickups {
  constructor(scene, count = 26) {
    this.items = [];
    const lines = roadLines();
    for (let i = 0; i < count; i++) {
      const kind = pick(Object.keys(KINDS));
      const x = pick(lines) + range(-3, 3);
      const z = range(-WORLD.half + 14, WORLD.half - 14);
      const mesh = makePickupMesh(kind);
      mesh.position.set(x, 1.1, z);
      scene.add(mesh);
      this.items.push({ kind, mesh, x, z, taken: false, respawn: 0, phase: rng() * 6 });
    }
  }

  // Returns the kind collected this frame, or null.
  update(dt, playerPos) {
    const t = performance.now() / 1000;
    let collected = null;
    for (const item of this.items) {
      if (item.taken) {
        item.respawn -= dt;
        if (item.respawn <= 0) {
          item.taken = false;
          item.mesh.visible = true;
        }
        continue;
      }
      item.mesh.rotation.y = t * 1.6 + item.phase;
      item.mesh.position.y = 1.1 + Math.sin(t * 2.2 + item.phase) * 0.18;
      if (dist2d(playerPos.x, playerPos.z, item.x, item.z) < 2.0) {
        item.taken = true;
        item.respawn = 45;
        item.mesh.visible = false;
        collected = item.kind;
      }
    }
    return collected;
  }

  labelFor(kind) {
    return KINDS[kind].label;
  }

  // Positions of live pickups (for the minimap / playtest checks).
  activePositions() {
    return this.items.filter((i) => !i.taken).map((i) => ({ x: i.x, z: i.z, kind: i.kind }));
  }
}
