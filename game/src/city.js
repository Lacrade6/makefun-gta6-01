// Solmar City: ground, roads, buildings, landmarks and collision boxes.
import * as THREE from 'three';
import { WORLD, PLACES, PALETTE } from './config.js';
import { rng, range, intRange, pick, chance } from './rand.js';

// Road centre lines sit at every multiple of WORLD.block.
export function roadLines() {
  const lines = [];
  for (let v = -WORLD.half; v <= WORLD.half; v += WORLD.block) lines.push(v);
  return lines;
}

export function nearestRoadLine(v) {
  return Math.round(v / WORLD.block) * WORLD.block;
}

function makeGroundTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const worldSize = WORLD.half * 2;
  const px = (v) => ((v + WORLD.half) / worldSize) * size;
  const scale = size / worldSize;

  // Base: warm concrete blocks.
  ctx.fillStyle = '#b8a58c';
  ctx.fillRect(0, 0, size, size);

  // Slight per-block tint variation.
  const lines = roadLines();
  for (let i = 0; i < lines.length - 1; i++) {
    for (let j = 0; j < lines.length - 1; j++) {
      const tint = 168 + Math.floor(rng() * 22);
      ctx.fillStyle = `rgb(${tint},${tint - 18},${tint - 52})`;
      ctx.fillRect(px(lines[i]), px(lines[j]), WORLD.block * scale, WORLD.block * scale);
    }
  }

  // Roads: asphalt strips with pale edge lines and dashed centres.
  const rw = WORLD.roadWidth * scale;
  for (const v of lines) {
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(px(v) - rw / 2, 0, rw, size);
    ctx.fillRect(0, px(v) - rw / 2, size, rw);
  }
  ctx.fillStyle = '#e8e4d8';
  for (const v of lines) {
    ctx.fillRect(px(v) - rw / 2, 0, 2, size);
    ctx.fillRect(px(v) + rw / 2 - 2, 0, 2, size);
    ctx.fillRect(0, px(v) - rw / 2, size, 2);
    ctx.fillRect(0, px(v) + rw / 2 - 2, size, 2);
  }
  ctx.fillStyle = '#f7d774';
  for (const v of lines) {
    for (let d = -WORLD.half; d < WORLD.half; d += 8) {
      if (Math.abs(nearestRoadLine(d) - d) < 7) continue; // skip crossings
      ctx.fillRect(px(v) - 1, px(d), 2, 4 * scale);
      ctx.fillRect(px(d), px(v) - 1, 4 * scale, 2);
    }
  }

  // Beach sand along the south edge (positive z is "south" here).
  ctx.fillStyle = '#e8cf9f';
  ctx.fillRect(0, px(WORLD.half - 26), size, 26 * scale);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeBuildingTexture(baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const c = new THREE.Color(baseColor);
  ctx.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
  ctx.fillRect(0, 0, 128, 256);
  // Window grid, some lit warm for the golden hour.
  for (let y = 10; y < 246; y += 18) {
    for (let x = 8; x < 118; x += 16) {
      const lit = rng() < 0.42;
      ctx.fillStyle = lit ? '#ffd98a' : 'rgba(38,48,72,0.85)';
      ctx.fillRect(x, y, 10, 12);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const buildingTextures = PALETTE.buildings.map(makeBuildingTexture);
const roofMat = new THREE.MeshLambertMaterial({ color: 0x6b5a4e });

function makeBuilding(w, h, d) {
  const tex = pick(buildingTextures);
  const side = new THREE.MeshLambertMaterial({ map: tex });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    [side, side, roofMat, roofMat, side, side],
  );
  mesh.position.y = h / 2;
  return mesh;
}

// A palm tree: curved trunk segments and a fan of fronds.
function makePalm() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d, side: THREE.DoubleSide });
  let x = 0;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 6), trunkMat);
    seg.position.set(x, 0.7 + i * 1.3, 0);
    seg.rotation.z = 0.06 * i;
    x += 0.09 * i;
    group.add(seg);
  }
  const topY = 7.2;
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.7), leafMat);
    const a = (i / 7) * Math.PI * 2;
    frond.position.set(x + Math.cos(a) * 1.5, topY, Math.sin(a) * 1.5);
    frond.rotation.y = -a;
    frond.rotation.z = -0.45;
    group.add(frond);
  }
  return group;
}

// A glowing mission-style marker ring + light beam.
export function makeMarker(color = 0xffd23f) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.1, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 14, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  beam.position.y = 7;
  group.add(beam);
  return group;
}

// Builds the whole city into `scene`. Returns colliders + named anchors.
export function buildCity(scene) {
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const addCollider = (x, z, w, d) => {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  };

  // Ground.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Water beyond the beach (south, +z) and around the island edges.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ color: PALETTE.water, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.4;
  scene.add(water);

  // Buildings: fill most blocks, leaving landmarks and the beach open.
  const lines = roadLines();
  const reserved = new Set([
    `${PLACES.bank.x},${PLACES.bank.z}`, `${PLACES.safehouse.x},${PLACES.safehouse.z}`,
    `${PLACES.garage.x},${PLACES.garage.z}`, `${PLACES.marina.x},${PLACES.marina.z}`,
    `${PLACES.hotel.x},${PLACES.hotel.z}`, `${PLACES.diner.x},${PLACES.diner.z}`,
    `${PLACES.club.x},${PLACES.club.z}`, `${PLACES.warehouse.x},${PLACES.warehouse.z}`,
    `${PLACES.hospital.x},${PLACES.hospital.z}`, `${PLACES.precinct.x},${PLACES.precinct.z}`,
  ]);
  const downtown = (x, z) => Math.abs(x) < 90 && Math.abs(z) < 90;
  for (let i = 0; i < lines.length - 1; i++) {
    for (let j = 0; j < lines.length - 1; j++) {
      const cx = lines[i] + WORLD.block / 2;
      const cz = lines[j] + WORLD.block / 2;
      if (cz > WORLD.half - 34) continue;               // beach row stays open
      if (reserved.has(`${lines[i]},${lines[j]}`)) continue;
      const count = downtown(cx, cz) ? 1 : intRange(1, 2);
      for (let k = 0; k < count; k++) {
        const w = range(14, 24);
        const d = range(14, 24);
        const h = downtown(cx, cz) ? range(34, 78) : range(9, 26);
        const ox = count === 1 ? 0 : (k === 0 ? -9 : 9);
        const oz = count === 1 ? 0 : (k === 0 ? -9 : 9);
        const b = makeBuilding(w, h, d);
        b.position.x = cx + ox;
        b.position.z = cz + oz;
        scene.add(b);
        addCollider(cx + ox, cz + oz, w, d);
      }
    }
  }

  // --- Landmarks -----------------------------------------------------------
  const anchors = {};

  // Meridian Bank: stone facade, columns, gold sign band, vault annexe.
  {
    const bank = new THREE.Group();
    const stone = new THREE.MeshLambertMaterial({ color: 0xd8cdb4 });
    const hall = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 22), stone);
    hall.position.y = 8;
    bank.add(hall);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(32, 1.6, 24),
      new THREE.MeshLambertMaterial({ color: 0x8a7a5c }));
    roof.position.y = 16.8;
    bank.add(roof);
    const band = new THREE.Mesh(new THREE.BoxGeometry(30.4, 2.4, 22.4),
      new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    band.position.y = 13.6;
    bank.add(band);
    for (let i = -2; i <= 2; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 10, 10), stone);
      col.position.set(i * 5.5, 5, 12.4);
      bank.add(col);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(6, 7, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x2b2b33 }));
    door.position.set(0, 3.5, 11.2);
    bank.add(door);
    const vault = new THREE.Mesh(new THREE.BoxGeometry(16, 10, 12),
      new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }));
    vault.position.set(0, 5, -21);
    bank.add(vault);
    const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.6, 20),
      new THREE.MeshLambertMaterial({ color: 0xffc93f }));
    vaultDoor.rotation.x = Math.PI / 2;
    vaultDoor.position.set(0, 3.2, -14.8);
    bank.add(vaultDoor);
    bank.position.set(PLACES.bank.x, 0, PLACES.bank.z - 21);
    scene.add(bank);
    addCollider(PLACES.bank.x, PLACES.bank.z - 21, 31, 23);
    addCollider(PLACES.bank.x, PLACES.bank.z - 42, 17, 13);
    anchors.bankDoor = { x: PLACES.bank.x, z: PLACES.bank.z - 8 };
    anchors.vaultDoor = { x: PLACES.bank.x, z: PLACES.bank.z - 36 };
  }

  // Safehouse: small pink bungalow with a carport.
  {
    const g = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(12, 5, 10),
      new THREE.MeshLambertMaterial({ color: 0xf2a8c0 }));
    walls.position.y = 2.5;
    g.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4, 4),
      new THREE.MeshLambertMaterial({ color: 0xb8506b }));
    roof.position.y = 7;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const port = new THREE.Mesh(new THREE.BoxGeometry(7, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    port.position.set(9.5, 3.4, 0);
    g.add(port);
    g.position.set(PLACES.safehouse.x + 21, 0, PLACES.safehouse.z + 21);
    scene.add(g);
    addCollider(PLACES.safehouse.x + 21, PLACES.safehouse.z + 21, 12, 10);
    anchors.safehouseDoor = { x: PLACES.safehouse.x + 14, z: PLACES.safehouse.z + 21 };
  }

  // Marina: pier planks, masts and a getaway boat.
  {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 46),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    pier.position.set(PLACES.marina.x, 0.5, PLACES.marina.z + 16);
    scene.add(pier);
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.6, 12),
      new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }));
    hull.position.y = 0.8;
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 5),
      new THREE.MeshLambertMaterial({ color: 0xd83a3a }));
    cabin.position.set(0, 2.2, -1);
    boat.add(cabin);
    boat.position.set(PLACES.marina.x + 7, 0, PLACES.marina.z + 30);
    scene.add(boat);
    anchors.boat = { x: PLACES.marina.x + 4, z: PLACES.marina.z + 30 };
    for (let i = 0; i < 5; i++) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 11, 5),
        new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
      mast.position.set(PLACES.marina.x - 8 - i * 4, 5.5, PLACES.marina.z + 24 + (i % 2) * 6);
      scene.add(mast);
    }
  }

  // Palms along the beach row and a few avenues.
  for (let x = -WORLD.half + 8; x < WORLD.half; x += 14) {
    const p = makePalm();
    p.position.set(x + range(-2, 2), 0, WORLD.half - 18 + range(-2, 2));
    p.rotation.y = rng() * Math.PI * 2;
    scene.add(p);
  }
  for (let i = 0; i < 26; i++) {
    const p = makePalm();
    p.position.set(pick(lines) + WORLD.roadWidth / 2 + 2.4, 0, range(-WORLD.half + 10, WORLD.half - 40));
    p.rotation.y = rng() * Math.PI * 2;
    scene.add(p);
  }

  // Street lights: slim poles with warm lamps (visual only).
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a4a55 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  for (const v of lines) {
    for (let d = -WORLD.half + 10; d < WORLD.half; d += 42) {
      for (const [x, z] of [[v + 7, d], [d, v + 7]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6, 5), poleMat);
        pole.position.set(x, 3, z);
        scene.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMat);
        lamp.position.set(x, 6.1, z);
        scene.add(lamp);
      }
    }
  }

  return { colliders, anchors };
}

// Pushes a circle (x,z,radius) out of every collider box. Returns corrected pos.
export function collideCircle(colliders, x, z, radius) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        z = nz + (dz / d) * radius;
      } else {
        // Centre inside the box: push out along the shallowest axis.
        const left = x - c.minX;
        const right = c.maxX - x;
        const top = z - c.minZ;
        const bottom = c.maxZ - z;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = c.minX - radius;
        else if (m === right) x = c.maxX + radius;
        else if (m === top) z = c.minZ - radius;
        else z = c.maxZ + radius;
      }
    }
  }
  return { x, z };
}
