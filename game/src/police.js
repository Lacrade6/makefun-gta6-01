// The Solmar PD: a wanted level from 0 to 5 stars, cruisers that chase and
// ram, a helicopter that circles from 3 stars, and roadblocks from 4.
// Heat rises when the player commits crimes in sight and cools when they
// slip away. Getting caught on foot at high heat ends the run.

import * as THREE from 'three';
import { CFG } from './config.js';
import { Car } from './vehicles.js';
import { clamp, makeRand, range } from './rand.js';

export class Police {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.rand = makeRand(777);
    this.wanted = 0;
    this.heat = 0;           // 0..5, the continuous value behind the stars
    this.cruisers = [];
    this.heli = null;
    this.heliAngle = 0;
    this.heliOrbit = { r: 22, y: 42 };   // circle radius / height above Rico
    this.roadblocks = [];
    this.ramTimer = 0;
    this.sirenPhase = 0;
    this.unitsResponding = 0;
    this.holdMode = false;   // a siege step is running: fewer, slower units
  }

  addHeat(amount, reason) {
    this.heat = clamp(this.heat + amount, 0, 5);
    const stars = Math.ceil(this.heat);
    if (stars !== this.wanted) {
      this.wanted = stars;
      return true;
    }
    return false;
  }

  setWanted(stars) {
    this.wanted = clamp(stars, 0, 5);
    this.heat = this.wanted;
  }

  clearWanted() {
    this.wanted = 0;
    this.heat = 0;
    for (const c of this.cruisers) c.remove();
    this.cruisers = [];
    this._clearRoadblocks();
    if (this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
  }

  _spawnCruiser(x, z) {
    const car = new Car(this.scene, x, z, 0, 0x1c1c22, true);
    car.chaseSpeed = CFG.police.chaseSpeed;
    this.cruisers.push(car);
    return car;
  }

  _clearRoadblocks() {
    for (const rb of this.roadblocks) {
      for (const car of rb) car.remove();
    }
    this.roadblocks = [];
  }

  _spawnRoadblock(playerPos, heading) {
    const f = { x: Math.sin(heading), z: Math.cos(heading) };
    const ahead = 46;
    const cx = playerPos.x + f.x * ahead;
    const cz = playerPos.z + f.z * ahead;
    const side = { x: -f.z, z: f.x };
    const pair = [];
    for (const s of [-1, 1]) {
      const car = new Car(this.scene, cx + side.x * s * 5, cz + side.z * s * 5, heading + Math.PI / 2, 0x1c1c22, true);
      car.speed = 0;
      pair.push(car);
    }
    this.roadblocks.push(pair);
  }

  _ensureHelicopter() {
    if (this.heli) return;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2a4a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 6), bodyMat);
    body.castShadow = true;
    group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 5), bodyMat);
    tail.position.set(0, 0.2, -5);
    group.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.7), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    rotor.position.y = 1.0;
    group.add(rotor);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.5), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    tailRotor.position.set(0.4, 0.4, -7.2);
    group.add(tailRotor);
    // Searchlight cone under the belly.
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 26, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
    );
    cone.position.y = -13.5;
    cone.rotation.x = Math.PI;
    group.add(cone);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(6.5, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.25 }));
    spot.rotation.x = -Math.PI / 2;
    spot.position.y = -26;
    group.add(spot);
    group.userData.rotor = rotor;
    this.scene.add(group);
    this.heli = { group, rotor };
  }

  update(dt, player, playerInCar, onCrime) {
    let wantedCount = this.wanted === 0 ? 0 : Math.min(CFG.police.maxCruisers, 1 + Math.floor(this.wanted * 1.1));
    if (this.holdMode) wantedCount = Math.min(wantedCount, 2);
    // Spawn cruisers up to the wanted level's demand.
    while (this.cruisers.length < wantedCount) {
      const a = range(this.rand, 0, Math.PI * 2);
      const r = range(this.rand, 55, 85);
      const x = player.x + Math.sin(a) * r;
      const z = player.z + Math.cos(a) * r;
      const cx = Math.max(-CFG.city.half + 6, Math.min(CFG.city.half - 6, x));
      const cz = Math.max(-CFG.city.half + 6, Math.min(CFG.city.half - 6, z));
      this._spawnCruiser(cx, cz);
    }
    while (this.cruisers.length > wantedCount) {
      const far = this.cruisers.pop();
      far.remove();
    }
    // Helicopter from 3 stars.
    if (this.wanted >= CFG.police.heliAtStars) this._ensureHelicopter();
    else if (this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
    // Roadblocks from 4 stars: one pair ahead of the player, refreshed.
    if (this.wanted >= CFG.police.roadblockAtStars && this.roadblocks.length === 0) {
      this._spawnRoadblock(player, player.car ? player.car.heading : player.heading);
    }
    if (this.wanted < CFG.police.roadblockAtStars && this.roadblocks.length > 0) {
      this._clearRoadblocks();
    }

    // Cruisers chase: steer toward the player and ram. They respect the
    // buildings — a cruiser cannot drive through the bank to reach Rico —
    // and they close in slowly on foot, to arrest, not to kill.
    this.ramTimer -= dt;
    for (const cruiser of this.cruisers) {
      const dx = player.x - cruiser.x;
      const dz = player.z - cruiser.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      let d = targetHeading - cruiser.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const steer = clamp(d * 1.6, -1, 1);
      const throttle = dist > 4 ? 1 : 0.4;
      cruiser.drive(throttle, steer, false, false, dt);
      this.city.resolveCircle(cruiser, 1.6);
      cruiser.mesh.position.set(cruiser.x, 0, cruiser.z);
      if (!playerInCar) cruiser.speed = Math.min(cruiser.speed, 22);
      // Ram: shove the player's car and hurt them. On foot the law arrests
      // instead — the bust timer in the main loop is the threat there.
      if (playerInCar && dist < 4.6 && this.ramTimer <= 0) {
        this.ramTimer = CFG.police.ramCooldown;
        onCrime && onCrime('ram', cruiser);
      }
      // Flash the light bar.
      this.sirenPhase += dt * 6;
      const bar = cruiser.mesh.userData.lightBar;
      if (bar) {
        const on = Math.sin(this.sirenPhase) > 0;
        bar.red.material.color.setHex(on ? 0xff2222 : 0x551111);
        bar.blue.material.color.setHex(on ? 0x111155 : 0x2244ff);
      }
    }
    // Helicopter circles above the player.
    if (this.heli) {
      this.heliAngle += dt * 0.35;
      const hx = player.x + Math.sin(this.heliAngle) * this.heliOrbit.r;
      const hz = player.z + Math.cos(this.heliAngle) * this.heliOrbit.r;
      this.heli.group.position.set(hx, this.heliOrbit.y, hz);
      this.heli.group.lookAt(player.x, 0, player.z);
      this.heli.group.userData.rotor.rotation.y += dt * 18;
    }
    // Heat decays when no cruiser is close.
    let nearest = Infinity;
    for (const c of this.cruisers) nearest = Math.min(nearest, Math.hypot(c.x - player.x, c.z - player.z));
    if (nearest > 60) {
      this.heat = Math.max(0, this.heat - CFG.police.decayPerSec * dt);
      const stars = Math.ceil(this.heat);
      if (stars !== this.wanted) this.wanted = stars;
    }
    this.unitsResponding = this.cruisers.length + (this.heli ? 1 : 0) + this.roadblocks.length * 2;
  }

  responseLabel() {
    if (this.wanted === 0) return 'No units responding';
    const labels = [
      '',
      'Patrol units dispatched',
      'Pursuit in progress — cruisers on your tail',
      'Air support overhead — helicopter tracking you',
      'Roadblocks ahead — spike strips reported',
      'Full city lockdown — every unit converging',
    ];
    return `${this.unitsResponding} units · ${labels[this.wanted]}`;
  }
}
