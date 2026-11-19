// Pickups scattered through the city: cash bundles, health kits and NOS
// canisters. They spin and bob, glow so the player can spot them at
// golden hour, and respawn elsewhere a while after being collected.

import * as THREE from 'three';
import { CFG } from './config.js';
import { makeRand, pick, range } from './rand.js';

const KINDS = {
  cash: { color: 0x37d67a, label: 'Cash', amount: 250 },
  health: { color: 0xff5f6d, label: 'Health', amount: 40 },
  nos: { color: 0x66aaff, label: 'NOS', amount: 60 },
};

export class Pickups {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.rand = makeRand(4242);
    this.items = [];
    this._spawnInitial();
  }

  _randomSpot() {
    const lines = this.city.roadLines;
    const line = pick(this.rand, lines);
    const along = range(this.rand, -CFG.city.half + 24, CFG.city.half - 24);
    const side = this.rand() < 0.5 ? -1 : 1;
    if (this.rand() < 0.5) return { x: line + side * 8, z: along };
    return { x: along, z: line + side * 8 };
  }

  _makeItem(kind, x, z) {
    const def = KINDS[kind];
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.55 }),
    );
    box.position.y = 1.1;
    group.add(box);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: def.color }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    group.add(ring);
    group.position.set(x, 0, z);
    this.scene.add(group);
    return { kind, def, group, x, z, phase: range(this.rand, 0, 6), alive: true };
  }

  _spawnInitial() {
    const kinds = ['cash', 'cash', 'cash', 'cash', 'health', 'health', 'nos', 'nos', 'cash', 'health'];
    for (const kind of kinds) {
      const spot = this._randomSpot();
      this.items.push(this._makeItem(kind, spot.x, spot.z));
    }
  }

  _respawn(item) {
    setTimeout(() => {
      const spot = this._randomSpot();
      const fresh = this._makeItem(item.kind, spot.x, spot.z);
      const idx = this.items.indexOf(item);
      if (idx >= 0) this.items[idx] = fresh;
    }, 20000);
  }

  // Returns the collected item (or null) for a player at (x, z).
  collect(x, z) {
    for (const item of this.items) {
      if (!item.alive) continue;
      if (Math.hypot(item.x - x, item.z - z) < 2.4) {
        item.alive = false;
        this.scene.remove(item.group);
        this._respawn(item);
        return item;
      }
    }
    return null;
  }

  get aliveCount() {
    return this.items.filter((item) => item.alive).length;
  }

  update(dt, time) {
    for (const item of this.items) {
      if (!item.alive) continue;
      item.group.rotation.y += dt * 1.6;
      item.group.children[0].position.y = 1.1 + Math.sin(time * 2 + item.phase) * 0.22;
    }
  }
}
