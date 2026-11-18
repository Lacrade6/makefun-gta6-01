// Solmar City: a sun-soaked bay city on a street grid. Builds the whole static
// scene — textured ground, roads and sidewalks, buildings with lit windows
// (emissive at dusk), billboards, streetlights, palm trees, a central park and
// the marina — and exports the collision boxes and road helpers the cars and
// pedestrians drive on. All textures are procedural canvas textures: no image
// files, no network.

import * as THREE from 'three';
import { CITY, PALETTE } from './config.js';

const BUILDING_COLORS = [0xe8dcc8, 0xd8c2a8, 0xc9b8a3, 0xb8c4d0, 0xe0a080, 0xf0e0c0, 0x9fb8a8, 0xd09090];
const NEON = [0xff5a7a, 0x35d0ff, 0xffd23f, 0x7dff9a, 0xc07dff];
const ADS = [
  { bg: '#1a1a2e', fg: '#ffd23f', big: 'SOLMAR GOLD', small: 'CASINO · OCEAN DRIVE' },
  { bg: '#7a1f1f', fg: '#ffe9a8', big: "RICO'S PAWN", small: 'WE BUY GOLD · NO QUESTIONS' },
  { bg: '#0e4a6e', fg: '#bfe8ff', big: 'BAY BREEZE', small: 'COLA · TASTE THE BAY' },
  { bg: '#3a2a5e', fg: '#ff5a7a', big: 'GOLD RUSH 777', small: 'SLOTS · OPEN 24 HOURS' },
  { bg: '#274b2e', fg: '#7dff9a', big: 'OCEAN MOTEL', small: 'VACANCY · $49 A NIGHT' },
  { bg: '#8a5a1e', fg: '#ffe9a8', big: 'TACO LOCO', small: 'DRIVE-THRU · 2AM TACOS' },
  { bg: '#111827', fg: '#35d0ff', big: 'SOLMAR FM', small: '97.5 · ALL HITS, ALL DAY' },
];

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

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Asphalt: dark base, speckle noise, faint patch seams. */
function asphaltTexture(random) {
  const tex = canvasTexture(128, 128, (g) => {
    g.fillStyle = '#2e323b';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i += 1) {
      const v = random.range(0, 1);
      g.fillStyle = v < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.18)';
      g.fillRect(random.range(0, 128), random.range(0, 128), random.range(1, 3), random.range(1, 3));
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      g.beginPath();
      g.moveTo(random.range(0, 128), 0);
      g.lineTo(random.range(0, 128), 128);
      g.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 26);
  return tex;
}

/** Sidewalk: pale concrete tiles with grout lines and stains. */
function sidewalkTexture(random) {
  const tex = canvasTexture(128, 128, (g) => {
    g.fillStyle = '#8d8f96';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 300; i += 1) {
      g.fillStyle = random.chance(0.5) ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.10)';
      g.fillRect(random.range(0, 128), random.range(0, 128), random.range(2, 6), random.range(2, 6));
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke();
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

/** Grass: green base with mottled patches. */
function grassTexture(random) {
  const tex = canvasTexture(128, 128, (g) => {
    g.fillStyle = '#4a7d4a';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i += 1) {
      g.fillStyle = random.chance(0.5) ? 'rgba(120,180,90,0.25)' : 'rgba(20,60,20,0.25)';
      g.fillRect(random.range(0, 128), random.range(0, 128), random.range(2, 8), random.range(2, 8));
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  return tex;
}

/** A canvas texture of lit windows, generated at runtime — no image files.
 *  Some facades get a ground-floor shopfront with an awning. */
function windowTexture(random, baseColor, litRatio) {
  const storefront = random.chance(0.4);
  return canvasTexture(128, 256, (g) => {
    g.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
    g.fillRect(0, 0, 128, 256);
    // Subtle vertical shading so the facade is not a flat slab.
    const shade = g.createLinearGradient(0, 0, 128, 0);
    shade.addColorStop(0, 'rgba(0,0,0,0.18)');
    shade.addColorStop(0.25, 'rgba(255,255,255,0.06)');
    shade.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = shade;
    g.fillRect(0, 0, 128, 256);
    const rows = storefront ? 10 : 12;
    const top = storefront ? 0 : 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const lit = random.next() < litRatio;
        const wide = random.chance(0.18);
        g.fillStyle = lit ? (random.chance(0.55) ? '#ffd98a' : (random.chance(0.5) ? '#bfe8ff' : '#ff9a6a')) : '#232c3a';
        g.fillRect(10 + col * 19, 12 + row * (storefront ? 19 : 20), wide ? 15 : 12, 13);
      }
    }
    if (storefront) {
      // Shopfront glass + striped awning at the base.
      g.fillStyle = '#1d2f45';
      g.fillRect(6, 206, 116, 44);
      g.fillStyle = 'rgba(255,217,138,0.85)';
      g.fillRect(10, 210, 108, 20);
      const awn = random.pick(['#c0392b', '#2e86c1', '#27ae60', '#e67e22']);
      for (let i = 0; i < 8; i += 1) {
        g.fillStyle = i % 2 === 0 ? awn : '#f5f0e0';
        g.fillRect(6 + i * 15, 196, 15, 10);
      }
    }
    // Rooftop edge shadow.
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, 128, 6);
  });
}

/** A billboard ad texture: bold text on a coloured board. */
function billboardTexture(ad) {
  return canvasTexture(256, 128, (g) => {
    g.fillStyle = ad.bg;
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = ad.fg;
    g.lineWidth = 6;
    g.strokeRect(6, 6, 244, 116);
    g.fillStyle = ad.fg;
    g.textAlign = 'center';
    g.font = '900 34px system-ui, sans-serif';
    g.fillText(ad.big, 128, 58, 232);
    g.font = '700 17px system-ui, sans-serif';
    g.fillText(ad.small, 128, 96, 232);
  });
}

export function createCity(scene, random) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);
  const facadeMats = [];

  const half = CITY.skyline;

  // Ground: mottled grass base, then road strips and sidewalk slabs on top.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 120, half * 2 + 120),
    new THREE.MeshLambertMaterial({ map: grassTexture(random) }),
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

  const roadMat = new THREE.MeshLambertMaterial({ map: asphaltTexture(random) });
  const walkMat = new THREE.MeshLambertMaterial({ map: sidewalkTexture(random) });
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
  const adTexes = ADS.map(billboardTexture);
  let adIndex = 0;
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
        const mat = new THREE.MeshLambertMaterial({
          map: tex, emissiveMap: tex, emissive: 0xffc27a, emissiveIntensity: 0,
        });
        facadeMats.push(mat);
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
        // Billboard ad on tall towers, facing the street.
        if (h > 17 && adIndex < adTexes.length && random.chance(0.75)) {
          const board = new THREE.Mesh(
            new THREE.PlaneGeometry(11, 5.5),
            new THREE.MeshBasicMaterial({ map: adTexes[adIndex % adTexes.length] }),
          );
          adIndex += 1;
          board.position.set(cx + ox, h * 0.62, cz + oz + d / 2 + 0.15);
          group.add(board);
        }
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
        });
      }
    }
  }

  // Streetlights along every street.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x30343c });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
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

  // Palm trees: instanced trunks + canopies along the streets, the marina
  // and the park (2 draw calls for all of them).
  const palmSpots = [];
  for (const c of streets) {
    for (let t = -half + 12; t < half; t += 88) {
      palmSpots.push([c + CITY.roadHalf + 2.6, t]);
      palmSpots.push([c - CITY.roadHalf - 2.6, t + 44]);
    }
  }
  for (let x = -160; x <= 160; x += 20) palmSpots.push([x, CITY.skyline + 8]);
  for (let i = 0; i < 10; i += 1) {
    palmSpots.push([random.range(-14, 14), random.range(-14, 14)]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 6, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const leafGeo = new THREE.ConeGeometry(2.6, 3.2, 8);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4f });
  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, palmSpots.length);
  const dummy = new THREE.Object3D();
  palmSpots.forEach(([x, z], i) => {
    const lean = random.range(-0.06, 0.06);
    dummy.position.set(x, 3, z);
    dummy.rotation.set(lean, random.range(0, Math.PI * 2), lean);
    dummy.scale.setScalar(random.range(0.85, 1.25));
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 7.2, z);
    dummy.updateMatrix();
    leafInst.setMatrixAt(i, dummy.matrix);
  });
  trunkInst.castShadow = true;
  leafInst.castShadow = true;
  group.add(trunkInst);
  group.add(leafInst);

  // Boardwalk along the beach, and a ferris wheel silhouette at the marina.
  const boardwalk = new THREE.Mesh(
    new THREE.BoxGeometry(340, 0.3, 8),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 }),
  );
  boardwalk.position.set(0, 0.15, CITY.skyline + 8);
  boardwalk.receiveShadow = true;
  group.add(boardwalk);
  const ferris = new THREE.Group();
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(15, 0.5, 8, 40),
    new THREE.MeshLambertMaterial({ color: 0xd8d8e0 }),
  );
  wheel.add(rim);
  for (let i = 0; i < 8; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 29, 0.35), new THREE.MeshLambertMaterial({ color: 0xb8bcc8 }));
    spoke.rotation.z = (i / 8) * Math.PI;
    wheel.add(spoke);
    const gondola = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.8, 1.6),
      new THREE.MeshLambertMaterial({ color: NEON[i % NEON.length] }),
    );
    const a = (i / 8) * Math.PI * 2;
    gondola.position.set(Math.cos(a) * 15, Math.sin(a) * 15, 0);
    wheel.add(gondola);
  }
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 1.2, 12),
    new THREE.MeshLambertMaterial({ color: 0x30343c }),
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  ferris.add(wheel);
  for (const sx of [-8, 8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 20, 0.8), new THREE.MeshLambertMaterial({ color: 0x30343c }));
    leg.position.set(sx * 0.7, 9, 0);
    leg.rotation.z = sx > 0 ? -0.42 : 0.42;
    ferris.add(leg);
  }
  ferris.position.set(150, 17, CITY.skyline + 6);
  group.add(ferris);

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

  return {
    group,
    colliders,
    ferrisWheel: wheel,
    /** Lit windows glow at dusk / golden hour, stay flat in daylight. */
    setTimeOfDay(mode) {
      const glow = mode === 'day' ? 0 : 0.6;
      for (const m of facadeMats) m.emissiveIntensity = glow;
    },
  };
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
