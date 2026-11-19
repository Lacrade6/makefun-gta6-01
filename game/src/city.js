// Solmar City itself: the ground, the road grid, the buildings with lit
// windows, palm trees, street lamps, the beach and the bay, the low golden
// sun and the haze. The city is generated from one seed so every run looks
// the same. Landmarks (the bank, the hideout, the garage) sit on fixed
// blocks so missions can point at them.

import * as THREE from 'three';
import { CFG } from './config.js';
import { makeRand, pick, range, rangeInt } from './rand.js';

function facadeTexture(rand, base, lit) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  // Subtle vertical shading so flat walls read as concrete.
  for (let x = 0; x < 128; x += 16) {
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(x, 0, 2, 256);
  }
  // Window grid: most windows warm-lit at golden hour, a few dark.
  for (let y = 14; y < 248; y += 22) {
    for (let x = 10; x < 120; x += 20) {
      const on = rand() < 0.62;
      g.fillStyle = on ? lit : 'rgba(20,24,40,0.9)';
      g.fillRect(x, y, 12, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = fg;
  g.font = 'bold 52px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class City {
  constructor(scene) {
    this.scene = scene;
    this.rand = makeRand(1337);
    this.colliders = [];
    this.roadLines = [];
    for (let k = -4; k <= 4; k++) this.roadLines.push(k * CFG.city.pitch);
    this.landmarks = {
      bank: { x: 27, z: 27, front: { x: 27, z: 46 }, label: 'Meridian Bank' },
      hideout: { x: -135, z: 81, front: { x: -135, z: 96 }, label: "Rico's Garage" },
      marina: { x: 162, z: -135, front: { x: 162, z: -135 }, label: 'Solmar Marina' },
      plaza: { x: -27, z: -135, front: { x: -27, z: -118 }, label: 'Neon Plaza' },
    };
    this._buildSky();
    this._buildGround();
    this._buildRoads();
    this._buildBuildings();
    this._buildPalmsAndLamps();
    this._buildBay();
  }

  _buildSky() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const g = canvas.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2e4a7a');
    grad.addColorStop(0.45, '#7a6a9a');
    grad.addColorStop(0.72, '#ff8a4c');
    grad.addColorStop(1, '#ffc46b');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;
    this.scene.fog = new THREE.Fog(CFG.sky.fog, CFG.sky.fogNear, CFG.sky.fogFar);

    const hemi = new THREE.HemisphereLight(0xffd9a0, 0x3a2a55, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(CFG.sky.sun, 2.2);
    sun.position.set(-180, 90, -120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -280;
    sun.shadow.camera.right = 280;
    sun.shadow.camera.top = 280;
    sun.shadow.camera.bottom = -280;
    sun.shadow.camera.far = 700;
    this.scene.add(sun);
    this.sunLight = sun;

    // The sun disc itself, low over the western rooftops.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
    );
    disc.position.set(-420, 62, -260);
    disc.lookAt(0, 40, 0);
    this.scene.add(disc);

    // A few flat pink clouds drifting high.
    this.clouds = [];
    for (let i = 0; i < 10; i++) {
      const w = range(this.rand, 40, 110);
      const cloud = new THREE.Mesh(
        new THREE.BoxGeometry(w, 3, range(this.rand, 14, 26)),
        new THREE.MeshLambertMaterial({ color: 0xffc9d8, transparent: true, opacity: 0.75 }),
      );
      cloud.position.set(range(this.rand, -420, 420), range(this.rand, 90, 150), range(this.rand, -420, 420));
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  _buildGround() {
    const half = CFG.city.half;
    const asphalt = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2 + 120, half * 2 + 120),
      new THREE.MeshLambertMaterial({ color: 0x3a3a44 }),
    );
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.receiveShadow = true;
    this.scene.add(asphalt);

    // Sand beach along the east edge.
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(half * 2 + 120, 70),
      new THREE.MeshLambertMaterial({ color: 0xe8c98a }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(CFG.city.beachX + 18, 0.05, 0);
    sand.receiveShadow = true;
    this.scene.add(sand);
  }

  _buildRoads() {
    const half = CFG.city.half;
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x24242c });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c25a });
    const walkMat = new THREE.MeshLambertMaterial({ color: 0x6f6f78 });
    for (const c of this.roadLines) {
      const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city.roadWidth, half * 2), roadMat);
      vRoad.rotation.x = -Math.PI / 2;
      vRoad.position.set(c, 0.06, 0);
      vRoad.receiveShadow = true;
      this.scene.add(vRoad);
      const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CFG.city.roadWidth), roadMat);
      hRoad.rotation.x = -Math.PI / 2;
      hRoad.position.set(0, 0.06, c);
      hRoad.receiveShadow = true;
      this.scene.add(hRoad);
      // Dashed centre lines.
      for (let t = -half + 12; t < half - 12; t += 18) {
        const dashV = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 7), lineMat);
        dashV.rotation.x = -Math.PI / 2;
        dashV.position.set(c, 0.08, t);
        this.scene.add(dashV);
        const dashH = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.6), lineMat);
        dashH.rotation.x = -Math.PI / 2;
        dashH.position.set(t, 0.08, c);
        this.scene.add(dashH);
      }
    }
    // Sidewalk slabs on every block.
    for (let i = -4; i < 4; i++) {
      for (let j = -4; j < 4; j++) {
        const cx = (i + 0.5) * CFG.city.pitch;
        const cz = (j + 0.5) * CFG.city.pitch;
        if (cx > CFG.city.beachX - 30) continue;
        const slab = new THREE.Mesh(new THREE.PlaneGeometry(CFG.city.blockSize + 4, CFG.city.blockSize + 4), walkMat);
        slab.rotation.x = -Math.PI / 2;
        slab.position.set(cx, 0.07, cz);
        slab.receiveShadow = true;
        this.scene.add(slab);
      }
    }
  }

  _buildBuildings() {
    const rand = this.rand;
    const facades = [
      facadeTexture(rand, '#8a6f5c', '#ffd27a'),
      facadeTexture(rand, '#5c6a7a', '#ffcf8a'),
      facadeTexture(rand, '#7a5c6a', '#ffe9a8'),
      facadeTexture(rand, '#4c5a6a', '#ffd27a'),
    ];
    const mats = facades.map((tex) => new THREE.MeshLambertMaterial({
      map: tex, emissive: 0xcc8844, emissiveMap: tex, emissiveIntensity: 0.5,
    }));
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2c2c34 });

    const addBuilding = (x, z, w, d, floors, matIndex, sign = null) => {
      const h = floors * 7;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mats[matIndex % mats.length]);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), roofMat);
      roof.position.set(x, h + 0.25, z);
      this.scene.add(roof);
      if (sign) {
        const signMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.9, 5),
          new THREE.MeshBasicMaterial({ map: sign }),
        );
        signMesh.position.set(x, h - 4, z + d / 2 + 0.3);
        this.scene.add(signMesh);
      }
      this.colliders.push({ x, z, hx: w / 2 + 0.4, hz: d / 2 + 0.4 });
      return mesh;
    };

    // Landmark: Meridian Bank — a tall gold tower with its name on it.
    const bankSign = signTexture('MERIDIAN BANK', '#1c2a4a', '#ffd76a');
    addBuilding(this.landmarks.bank.x, this.landmarks.bank.z, 34, 30, 14, 1, bankSign);
    // Landmark: Rico's garage — low, wide, rust-red.
    addBuilding(this.landmarks.hideout.x, this.landmarks.hideout.z, 30, 22, 2, 2,
      signTexture("RICO'S GARAGE", '#4a1c1c', '#ffd76a'));
    // Landmark: Neon Plaza hotel tower.
    addBuilding(this.landmarks.plaza.x, this.landmarks.plaza.z, 26, 26, 12, 3,
      signTexture('NEON PLAZA', '#2a1c4a', '#ff9de2'));

    // Fill the rest of the blocks.
    for (let i = -4; i < 4; i++) {
      for (let j = -4; j < 4; j++) {
        const cx = (i + 0.5) * CFG.city.pitch;
        const cz = (j + 0.5) * CFG.city.pitch;
        if (cx > CFG.city.beachX - 40) continue;
        const isLandmark = Math.abs(cx - this.landmarks.bank.x) < 1 && Math.abs(cz - this.landmarks.bank.z) < 1
          || Math.abs(cx - this.landmarks.hideout.x) < 1 && Math.abs(cz - this.landmarks.hideout.z) < 1
          || Math.abs(cx - this.landmarks.plaza.x) < 1 && Math.abs(cz - this.landmarks.plaza.z) < 1;
        if (isLandmark) continue;
        const downtown = Math.max(0, 1 - Math.hypot(cx, cz) / 300);
        const floors = rangeInt(rand, 2, 3 + Math.floor(downtown * 11));
        if (rand() < 0.45) {
          addBuilding(cx, cz, 26, 26, floors, rangeInt(rand, 0, 3));
        } else {
          // Four smaller towers on one block, with a courtyard gap.
          const off = 9;
          for (const [dx, dz] of [[-off, -off], [off, -off], [-off, off], [off, off]]) {
            if (rand() < 0.2) continue;
            addBuilding(cx + dx, cz + dz, 13, 13, rangeInt(rand, 2, floors), rangeInt(rand, 0, 3));
          }
        }
      }
    }
  }

  _buildPalmsAndLamps() {
    const rand = this.rand;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7a3a });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (const c of this.roadLines) {
      for (let t = -216; t <= 216; t += 54) {
        if (rand() < 0.5) continue;
        const px = c + 11;
        const pz = t + (rand() < 0.5 ? 6 : -6);
        if (px > CFG.city.beachX - 12) continue;
        // Palm: leaning trunk, crown of cones.
        const palm = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 7, 6), trunkMat);
        trunk.position.y = 3.5;
        trunk.rotation.z = 0.08;
        palm.add(trunk);
        for (let f = 0; f < 5; f++) {
          const frond = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.5, 4), leafMat);
          const a = (f / 5) * Math.PI * 2;
          frond.position.set(Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
          frond.rotation.z = Math.cos(a) * 1.1;
          frond.rotation.x = -Math.sin(a) * 1.1;
          palm.add(frond);
        }
        palm.position.set(px, 0, pz);
        this.scene.add(palm);
        this.colliders.push({ x: px, z: pz, hx: 0.7, hz: 0.7 });
        // Street lamp on the opposite corner.
        const lamp = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), poleMat);
        pole.position.y = 3;
        lamp.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), lampMat);
        bulb.position.y = 6.1;
        lamp.add(bulb);
        lamp.position.set(c - 11, 0, pz + 8);
        this.scene.add(lamp);
      }
    }
    // Palm row along the beach.
    for (let z = -220; z <= 220; z += 36) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 8, 6), trunkMat);
      trunk.position.y = 4;
      trunk.rotation.z = 0.12;
      palm.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 5), leafMat);
      crown.position.y = 8.6;
      palm.add(crown);
      palm.position.set(CFG.city.beachX - 6, 0, z);
      this.scene.add(palm);
    }
  }

  _buildBay() {
    // Open water east of the beach, with a foam edge.
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(400, CFG.city.half * 2 + 140),
      new THREE.MeshLambertMaterial({ color: 0x2a6a8a, transparent: true, opacity: 0.92 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(CFG.city.waterX + 180, 0.12, 0);
    this.scene.add(water);
    this.water = water;
    const foam = new THREE.Mesh(
      new THREE.PlaneGeometry(3, CFG.city.half * 2 + 120),
      new THREE.MeshBasicMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.7 }),
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(CFG.city.waterX, 0.14, 0);
    this.scene.add(foam);
  }

  // Push a circle (x, z, radius) out of every building collider it overlaps.
  // Returns true when a push happened.
  resolveCircle(pos, radius) {
    let hit = false;
    for (const c of this.colliders) {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const px = c.hx + radius - Math.abs(dx);
      const pz = c.hz + radius - Math.abs(dz);
      if (px > 0 && pz > 0) {
        hit = true;
        if (px < pz) pos.x = c.x + Math.sign(dx || 1) * (c.hx + radius);
        else pos.z = c.z + Math.sign(dz || 1) * (c.hz + radius);
      }
    }
    // World bounds and the deep water.
    if (pos.x < -CFG.city.half) { pos.x = -CFG.city.half; hit = true; }
    if (pos.x > CFG.city.waterX - 2) { pos.x = CFG.city.waterX - 2; hit = true; }
    if (pos.z < -CFG.city.half) { pos.z = -CFG.city.half; hit = true; }
    if (pos.z > CFG.city.half) { pos.z = CFG.city.half; hit = true; }
    return hit;
  }

  // Nearest road centre line to a coordinate (for traffic waypoints).
  nearestRoad(v) {
    let best = this.roadLines[0];
    let bestD = Infinity;
    for (const line of this.roadLines) {
      const d = Math.abs(v - line);
      if (d < bestD) { bestD = d; best = line; }
    }
    return best;
  }

  update(dt, time) {
    // Slow cloud drift and a gentle water shimmer.
    for (const cloud of this.clouds) {
      cloud.position.x += dt * 1.5;
      if (cloud.position.x > 460) cloud.position.x = -460;
    }
    if (this.water) {
      this.water.material.opacity = 0.9 + Math.sin(time * 0.7) * 0.02;
    }
  }
}
