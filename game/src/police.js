// SCPD response: wanted stars, pursuing cruisers, helicopter, roadblocks.
import * as THREE from 'three';
import { WORLD, POLICE_TUNE } from './config.js';
import { Car } from './vehicles.js';
import { clamp, dist2d, angleDelta, range } from './rand.js';

function makeHeliMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x22304d });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 5), bodyMat);
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.6),
    new THREE.MeshLambertMaterial({ color: 0x9fd8e8 }));
  glass.position.set(0, 0.1, 2.2);
  g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat);
  tail.position.set(0, 0.3, -4.2);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.7), bodyMat);
  fin.position.set(0, 0.7, -6.3);
  g.add(fin);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.4, 5.04),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  stripe.position.y = -0.35;
  g.add(stripe);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x222228 }));
  rotor.position.y = 1.15;
  g.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x222228 }));
  tailRotor.position.set(0.3, 0.7, -6.3);
  g.add(tailRotor);
  const spot = new THREE.SpotLight(0xfff6d8, 0, 90, 0.32, 0.5);
  spot.position.set(0, -0.6, 1.4);
  g.add(spot);
  g.add(spot.target);
  g.userData = { rotor, tailRotor, spot };
  return g;
}

export class Police {
  constructor(scene) {
    this.scene = scene;
    this.stars = 0;
    this.cruisers = [];
    this.roadblocks = [];
    this.heli = null;
    this.heliAngle = 0;
    this.unseenTimer = 0;
    this.bustMeter = 0;
    this.time = 0;
    this.lastCrimeAt = -99;
  }

  addCrime(amount = 1) {
    const before = this.stars;
    this.stars = clamp(this.stars + amount, 0, POLICE_TUNE.maxStars);
    this.lastCrimeAt = this.time;
    this.unseenTimer = 0;
    return this.stars > before;
  }

  clear() {
    this.stars = 0;
    this.bustMeter = 0;
    for (const c of this.cruisers) this.scene.remove(c.mesh);
    for (const rb of this.roadblocks) this.scene.remove(rb.mesh);
    if (this.heli) this.scene.remove(this.heli);
    this.cruisers = [];
    this.roadblocks = [];
    this.heli = null;
  }

  cruiserTarget() {
    return [0, 1, 2, 3, 4, 6][this.stars] ?? 0;
  }

  // True while any unit can see the player (drives the HUD panel wording).
  hasVisual(nearest) {
    return this.stars > 0 && nearest <= 46;
  }

  spawnCruiser(playerPos) {
    const angle = range(0, Math.PI * 2);
    const dist = range(55, 80);
    const x = clamp(playerPos.x + Math.cos(angle) * dist, -WORLD.half + 6, WORLD.half - 6);
    const z = clamp(playerPos.z + Math.sin(angle) * dist, -WORLD.half + 6, WORLD.half - 6);
    const car = new Car(this.scene, x, z, Math.atan2(playerPos.x - x, playerPos.z - z),
      0xf0f0f5, 'police');
    car.driver = 'police';
    this.cruisers.push(car);
  }

  spawnRoadblock(playerPos, playerHeading) {
    const ahead = 46;
    const x = clamp(playerPos.x + Math.sin(playerHeading) * ahead, -WORLD.half + 8, WORLD.half - 8);
    const z = clamp(playerPos.z + Math.cos(playerHeading) * ahead, -WORLD.half + 8, WORLD.half - 8);
    for (const off of [-4.4, 0, 4.4]) {
      const car = new Car(this.scene,
        x + Math.cos(playerHeading) * off, z - Math.sin(playerHeading) * off,
        playerHeading + Math.PI / 2, 0xf0f0f5, 'police');
      car.driver = 'roadblock';
      this.roadblocks.push(car);
    }
  }

  // Returns {busted:boolean, nearest:distance}
  update(dt, playerPos, playerSpeed, playerHeading) {
    this.time += dt;
    let nearest = Infinity;

    if (this.stars > 0) {
      while (this.cruisers.length < this.cruiserTarget()) this.spawnCruiser(playerPos);
      while (this.cruisers.length > this.cruiserTarget()) {
        const c = this.cruisers.pop();
        this.scene.remove(c.mesh);
      }
      if (this.stars >= POLICE_TUNE.heliStars && !this.heli) {
        this.heli = makeHeliMesh();
        this.scene.add(this.heli);
      }
      if (this.stars >= POLICE_TUNE.roadblockStars && this.roadblocks.length === 0
        && playerSpeed > 8) {
        this.spawnRoadblock(playerPos, playerHeading);
      }
    } else if (this.cruisers.length || this.heli || this.roadblocks.length) {
      this.clear();
    }

    for (const car of this.cruisers) {
      const dx = playerPos.x - car.pos.x;
      const dz = playerPos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      const want = Math.atan2(dx, dz);
      const steer = clamp(angleDelta(car.heading, want) * 1.8, -1, 1);
      const throttle = dist > 4 ? 1 : 0.3;
      car.drive(dt, { throttle, steer, handbrake: false, nos: this.stars >= 3 });
      car.pos.x = clamp(car.pos.x, -WORLD.half + 3, WORLD.half - 3);
      car.pos.z = clamp(car.pos.z, -WORLD.half + 3, WORLD.half - 3);
      car.syncMesh(dt);
      car.flashLights(this.time);
    }
    for (const car of this.roadblocks) car.flashLights(this.time);

    if (this.heli) {
      this.heliAngle += dt * 0.55;
      const r = 26;
      const hx = playerPos.x + Math.cos(this.heliAngle) * r;
      const hz = playerPos.z + Math.sin(this.heliAngle) * r;
      this.heli.position.set(hx, 24 + Math.sin(this.time * 0.8) * 1.5, hz);
      this.heli.lookAt(playerPos.x, this.heli.position.y, playerPos.z);
      this.heli.userData.rotor.rotation.y += dt * 28;
      this.heli.userData.tailRotor.rotation.x += dt * 28;
      const spot = this.heli.userData.spot;
      spot.intensity = 900;
      spot.target.position.set(
        playerPos.x - hx, -24, playerPos.z - hz);
      nearest = Math.min(nearest, 30); // heli keeps visual contact
    }

    // Wanted decay: only when nobody can see the player.
    if (this.stars > 0) {
      if (nearest > 46 && this.time - this.lastCrimeAt > POLICE_TUNE.decayDelay) {
        this.unseenTimer += dt;
        if (this.unseenTimer >= POLICE_TUNE.decayPerStar) {
          this.unseenTimer = 0;
          this.stars -= 1;
          if (this.stars < POLICE_TUNE.heliStars && this.heli) {
            this.scene.remove(this.heli);
            this.heli = null;
          }
          if (this.stars < POLICE_TUNE.roadblockStars) {
            for (const rb of this.roadblocks) this.scene.remove(rb.mesh);
            this.roadblocks = [];
          }
        }
      } else {
        this.unseenTimer = 0;
      }
    }

    // Bust meter: slow + surrounded.
    let busted = false;
    if (this.stars > 0 && nearest < POLICE_TUNE.bustRadius && playerSpeed < 3) {
      this.bustMeter += dt / POLICE_TUNE.bustTime;
      if (this.bustMeter >= 1) busted = true;
    } else {
      this.bustMeter = Math.max(0, this.bustMeter - dt * 0.7);
    }
    return { busted, nearest };
  }

  panelText() {
    if (this.stars === 0) return 'No active pursuit';
    const lines = [
      `Cruisers: ${this.cruisers.length} dispatched`,
      `Helicopter: ${this.heli ? 'AIRBORNE' : 'standby'}`,
      `Roadblocks: ${this.roadblocks.length ? 'DEPLOYED' : 'none'}`,
      this.unseenTimer > 0 ? 'Suspect lost — searching…' : 'Suspect in sight',
    ];
    return lines.join('\n');
  }
}
