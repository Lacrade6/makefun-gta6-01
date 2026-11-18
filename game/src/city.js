// Solmar City: a sun-soaked bay city on a street grid. Builds the whole static
// scene — ground, roads, sidewalks, buildings with lit windows, streetlights,
// palm trees, a central park and the marina — and exports the collision boxes
// and road helpers the cars and pedestrians drive on.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

const BUILDING_COLORS = [0xe8dcc8, 0xd8c2a8, 0xc9b8a3, 0xb8c4d0, 0xe0a080, 0xf0e0c0, 0x9fb8a8, 0xd09090];
const NEON = [0xff5a7a, 0x35d0ff, 0xffd23f, 0x7dff9a, 0xc07dff];

export function streetCoords() {
  const out = [];
  for (let i = -4; i <= 4; i += 1) out.push(i * CITY.grid);
  return out;
}

export function isOnRoad(x, z) {
  const s = streetCoords();
  const near = (v) => s.some((c) => Math.abs(v - c) <= CITY.roadHalf + 0.5);
  return near(x) || near(z);
}

export function nearestStreetCoord(v) {
  const s = streetCoords();
  let best = s[0];
  for (const c of s) if (Math.abs(c - v) < Math.abs(best - v)) best = c;
  return best;
}

/** A canvas texture of lit windows, generated at runtime — no image files. */
function windowTexture(random, baseColor, litRatio) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const lit = random.next() < litRatio;
      g.fillStyle = lit ? (random.chance(0.5) ? '#ffd98a' : '#bfe8ff') : '#2a3340';
      g.fillRect(10 + col * 19, 12 + row * 20, 12, 13);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCity(scene, random) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  const half = CITY.skyline;

  // Ground: grass base, then road strips and sidewalk slabs on top.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 120, half * 2 + 120),
    new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 20);
  ground.receiveShadow = true;
  group.add(ground);

  // Bay water along the south edge.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 160, 90),
    new THREE.MeshLambertMaterial({ color: 0x2a7ab8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, half + 62);
  group.add(water);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 120, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8d8a8 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, half + 12);
  group.add(sand);

  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const streets = streetCoords();
  for (const c of streets) {
    const roadX = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadHalf * 2, half * 2 + 40), roadMat);
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(c, 0, 0);
    roadX.receiveShadow = true;
    group.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 40, CITY.roadHalf * 2), roadMat);
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(0, 0, c);
    roadZ.receiveShadow = true;
    group.add(roadZ);
    // Dashed centre lines.
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c860 });
    for (let t = -half; t < half; t += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(c, 0.05, t);
      group.add(dash);
    }
  }
  // Sidewalk slabs around each block.
  for (let ix = 0; ix < streets.length - 1; ix += 1) {
    for (let iz = 0; iz < streets.length - 1; iz += 1) {
      const cx = (streets[ix] + streets[ix + 1]) / 2;
      const cz = (streets[iz] + streets[iz + 1]) / 2;
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), walkMat);
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(cx, 0.02, cz);
      slab.receiveShadow = true;
      group.add(slab);
    }
  }

  // Central park (blocks around the middle) instead of buildings.
  const parkCx = 0; const parkCz = 0;
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshLambertMaterial({ color: 0x3f8f4f }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(parkCx, 0.04, parkCz);
  group.add(park);
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.5, 1, 20),
    new THREE.MeshLambertMaterial({ color: 0x7ab8d8 }),
  );
  fountain.position.set(parkCx, 0.5, parkCz);
  group.add(fountain);

  // Buildings: one to four towers per block, taller near the centre.
  const winTexes = BUILDING_COLORS.map((c) => windowTexture(random, c, 0.45));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5a62 });
  for (let ix = 0; ix < streets.length - 1; ix += 1) {
    for (let iz = 0; iz < streets.length - 1; iz += 1) {
      const cx = (streets[ix] + streets[ix + 1]) / 2;
      const cz = (streets[iz] + streets[iz + 1]) / 2;
      if (Math.abs(cx - parkCx) < 20 && Math.abs(cz - parkCz) < 20) continue;
      const dist = Math.max(Math.abs(cx), Math.abs(cz));
      const towers = random.chance(0.35) ? 2 : 1;
      for (let t = 0; t < towers; t += 1) {
        const w = random.range(9, 15);
        const d = random.range(9, 15);
        const h = random.range(8, 26) * (1 + Math.max(0, (120 - dist) / 160));
        const ox = towers === 1 ? 0 : (t === 0 ? -7 : 7);
        const oz = towers === 1 ? 0 : (t === 0 ? -6 : 6);
        const tex = random.pick(winTexes);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        box.position.set(cx + ox, h / 2, cz + oz);
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), roofMat);
        roof.position.set(cx + ox, h + 0.3, cz + oz);
        group.add(roof);
        // Neon sign on some towers.
        if (random.chance(0.3)) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.5, 1.2, 0.4),
            new THREE.MeshBasicMaterial({ color: random.pick(NEON) }),
          );
          sign.position.set(cx + ox, h * 0.75, cz + oz + d / 2 + 0.3);
          group.add(sign);
        }
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
        });
      }
    }
  }

  // Streetlights along every street, plus palm trees on the marina road.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x30343c });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4f });
  for (const c of streets) {
    for (let t = -half + 20; t < half; t += 44) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
      pole.position.set(c + CITY.roadHalf + 1.5, 3.5, t);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampMat);
      lamp.position.set(c + CITY.roadHalf + 1.5, 7.1, t);
      group.add(lamp);
    }
  }
  for (let x = -160; x <= 160; x += 20) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), trunkMat);
    trunk.position.set(x, 3, CITY.skyline + 8);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3, 8), leafMat);
    leaves.position.set(x, 7, CITY.skyline + 8);
    group.add(leaves);
  }

  // Distant skyline silhouettes so the horizon is never empty.
  const farMat = new THREE.MeshLambertMaterial({ color: 0x6a7a94 });
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * Math.PI * 2;
    const r = 300 + random.range(0, 60);
    const w = random.range(14, 30);
    const h = random.range(25, 70);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), farMat);
    tower.position.set(Math.cos(angle) * r, h / 2, Math.sin(angle) * r);
    group.add(tower);
  }

  return { group, colliders };
}

/** Push a circle (x, z, radius) out of every building box it overlaps. */
export function collideCircle(colliders, x, z, radius) {
  let nx = x; let nz = z;
  for (const b of colliders) {
    const cx = Math.max(b.minX, Math.min(nx, b.maxX));
    const cz = Math.max(b.minZ, Math.min(nz, b.maxZ));
    const dx = nx - cx; const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * radius;
        nz = cz + (dz / d) * radius;
      } else {
        nx = b.maxX + radius;
      }
    }
  }
  return { x: nx, z: nz };
}
