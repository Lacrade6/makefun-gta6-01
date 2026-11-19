// Solmar City — Streets of Gold. Bootstrap and game loop.
// Builds the renderer, the city and every system, then runs the loop:
// input, driving and walking, traffic, police, missions, scoring, the
// camera, and the HUD. The game states are title, playing, paused and over
// (busted or wasted).

import * as THREE from 'three';
import { CFG } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { City } from './city.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Pickups } from './pickups.js';
import { Particles } from './particles.js';
import { Combat } from './combat.js';
import { Save } from './save.js';
import { stageShot } from './shots.js';
import { clamp, damp } from './rand.js';

class Game {
  constructor() {
    this.state = 'title';
    this.time = 0;
    this.rep = 0;
    this.repLevel = 1;
    this.repFloat = 0;
    this.storyComplete = false;
    this.camYaw = 0;
    this.mouseOffset = 0;
    this.camPos = new THREE.Vector3(-80, 40, 180);
    this.shotMode = false;
    this.shotName = null;
    this.shotTimer = 0;
    this.bustTimer = 0;
    this.nearMissCooldown = 0;
    this.toast = '';
    this.toastTimer = 0;
    this.stolenCar = null;

    const app = document.getElementById('app');
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'webgl';
    app.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

    this.input = new Input();
    this.input.attach();
    this.audio = new AudioEngine();
    this.city = new City(this.scene);
    this.player = new Player(this.scene);
    this.traffic = new Traffic(this.scene, this.city);
    this.police = new Police(this.scene, this.city);
    this.particles = new Particles(this.scene);
    this.pickups = new Pickups(this.scene, this.city);
    this.combat = new Combat();
    this.hud = new HUD();
    this.missions = new Missions({
      scene: this.scene,
      city: this.city,
      player: this.player,
      police: this.police,
      traffic: this.traffic,
      hud: this.hud,
      audio: this.audio,
      particles: this.particles,
      game: this,
      save: null,
    });
    this.save = new Save(this);
    this.missions.ctx.save = this.save;

    this._wireButtons();
    window.addEventListener('resize', () => this._resize());
    this.clock = new THREE.Clock();
    this._checkShotMode();
    if (!this.shotMode) {
      const saved = this.save.load();
      this.hud.showTitle(!!saved, saved ? saved.missionsCompleted + 1 : 1);
    }
    window.__game = this;
    window.__shotReady = false;
    this.renderer.setAnimationLoop(() => this._frame());
  }

  _wireButtons() {
    document.getElementById('btn-start').addEventListener('click', () => {
      this.audio.unlock();
      this.save.clear();
      this._startPlaying(false);
    });
    document.getElementById('btn-continue').addEventListener('click', () => {
      this.audio.unlock();
      const data = this.save.load();
      if (data) {
        this.save.apply(data);
        this._startPlaying(true);
      }
    });
  }

  _checkShotMode() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (!shot) return;
    this.shotMode = true;
    if (shot === 'title') {
      // The title screenshot stages on the menu: stay on the title screen
      // and let the orbit camera drift over the skyline behind it.
      stageShot(this, shot);
      return;
    }
    this.hud.showGame();
    this.state = 'playing';
    stageShot(this, shot);
    document.getElementById('title-screen').style.display = 'none';
  }

  _startPlaying(continued) {
    this.hud.showGame();
    this.state = 'playing';
    this.audio.unlock();
    if (continued) {
      this.hud.showCenter('WELCOME BACK, RICO', `Missions done: ${this.missions.completed} of 8`);
      if (this.missions.completed < 8) this.missions.startMission(this.missions.completed);
    } else {
      this.player.cash = 0;
      this.rep = 0;
      this.repLevel = 1;
      this.missions.completed = 0;
      this.missions.startMission(0);
    }
  }

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addRep(amount) {
    this.rep += amount;
    const level = 1 + Math.floor(this.rep / CFG.rep.levelStep);
    if (level > this.repLevel) {
      this.repLevel = level;
      this.hud.showCenter(`REP LEVEL ${level}`, 'NOS refilled — the city knows your name');
      if (this.player.car) this.player.car.nos = CFG.car.nosMax;
      this.audio.jingle();
    }
  }

  _toast(text) {
    this.toast = text;
    this.toastTimer = 2.2;
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    // Frame counter for the headless playtest (window.__game.frames):
    // software rendering makes wall-clock waits meaningless, so the test
    // waits for frames instead.
    this.frames = (this.frames || 0) + 1;
    if (this.state === 'title') {
      this._titleCamera(dt);
      this.city.update(dt, this.time);
      this.renderer.render(this.scene, this.camera);
      if (this.shotMode) {
        // The title screenshot stages on the menu: mark it ready once the
        // orbit has settled on the skyline (counted in frames, since
        // software rendering runs game time slower than real time).
        this.shotFrames = (this.shotFrames || 0) + 1;
        if (this.shotFrames > 25 && !window.__shotReady) window.__shotReady = true;
      }
      return;
    }
    if (this.state === 'paused') {
      if (this.input.wasPressed(CFG.keys.pause)) {
        this.state = 'playing';
        this.hud.setPause(false);
      }
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      return;
    }
    if (this.state === 'over') {
      this.renderer.render(this.scene, this.camera);
      if (this.input.wasPressed(CFG.keys.restart)) this._respawn();
      this.input.endFrame();
      return;
    }
    this._updatePlaying(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  _titleCamera(dt) {
    const a = this.time * 0.045;
    this.camera.position.set(Math.sin(a) * 210, 62 + Math.sin(this.time * 0.1) * 8, Math.cos(a) * 210);
    this.camera.lookAt(0, 18, 0);
  }

  _respawn() {
    const hideout = this.city.landmarks.hideout;
    this.player.heal(CFG.player.health);
    if (!this.player.onFoot) {
      this.player.exitCar();
      if (this.stolenCar) this.traffic.cars.push(this.stolenCar);
    }
    this.player.x = hideout.x;
    this.player.z = hideout.z + 10;
    this.player.heading = 0;
    this.player.mesh.position.set(this.player.x, 0, this.player.z);
    this.police.clearWanted();
    // Back to the job that got Rico caught — or the next one, if the last
    // one was already done.
    if (this.missions.waitingNext && this.missions.index + 1 < 8) {
      this.missions.startMission(this.missions.index + 1);
    } else if (this.missions.index >= 0) {
      this.missions.startMission(this.missions.index);
    }
    this.state = 'playing';
    this.hud.showCenter('BACK ON THE STREETS', 'Rico walks free — this time');
    this.save.save();
  }

  _updatePlaying(dt) {
    const input = this.input;
    const player = this.player;
    const audio = this.audio;

    // Global keys.
    if (input.wasPressed(CFG.keys.pause)) {
      this.state = 'paused';
      this.hud.setPause(true);
      return;
    }
    if (input.wasPressed(CFG.keys.radio)) audio.nextStation();
    if (input.wasPressed(CFG.keys.mission)) this.missions.nextMission();
    if (input.wasPressed(CFG.keys.restart) && this.missions.failed) this.missions.retry();

    // Mouse look.
    this.camYaw -= input.mouseDX * CFG.camera.lookSpeed;
    this.mouseOffset = clamp(this.mouseOffset - input.mouseDX * CFG.camera.lookSpeed, -1.2, 1.2);

    // Movement.
    if (player.onFoot) {
      const fwd = input.throttleAxis();
      const strafe = input.steerAxis();
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      const mx = sin * fwd + cos * strafe;
      const mz = cos * fwd - sin * strafe;
      const running = input.isDown(CFG.keys.run);
      player.walk(mx, mz, running, dt);
      if (input.wasPressed(CFG.keys.brake)) player.queueJump();
      if (input.wasPressed(CFG.keys.punch) && player.punch()) {
        audio.punch();
        const hit = this.combat.punch(player, this.traffic, this.police, this.time);
        if (hit.ped) {
          this.police.addHeat(CFG.police.heatPerCrime, 'assault');
          this.particles.sparks(hit.ped.x, 1.2, hit.ped.z);
          this.particles.addShake(0.3);
          this._toast('Assault! The law noticed.');
        } else if (hit.cruiser) {
          this.particles.sparks(player.x, 1.2, player.z);
          this.addRep(5);
        }
      }
      // Enter a car.
      if (input.wasPressed(CFG.keys.enter)) {
        const car = this.traffic.nearestCar(player.x, player.z, 4.6);
        if (car) this._stealCar(car);
      }
    } else if (player.car) {
      const car = player.car;
      const throttle = input.throttleAxis();
      const steer = input.steerAxis();
      const handbrake = input.isDown(CFG.keys.brake);
      const nos = input.isDown(CFG.keys.nos);
      car.drive(throttle, steer, handbrake, nos, dt);
      // While driving, Rico's position IS the car's: every system that
      // reads the player (missions, pickups, police) follows the car.
      player.x = car.x;
      player.z = car.z;
      player.heading = car.heading;
      if (car.boosting) {
        this.particles.nosFlame(car.x, 0.4, car.z, car.heading);
        audio.setEngine(1, true);
      }
      // Drift scoring.
      if (car.drifting && Math.abs(car.speed) > 10) {
        this.repFloat += CFG.rep.driftPerSec * dt;
        if (this.repFloat >= 15) {
          this.addRep(Math.floor(this.repFloat));
          this._toast(`DRIFT +${Math.floor(this.repFloat)} REP`);
          this.repFloat = 0;
        }
      }
      if (input.wasPressed(CFG.keys.enter)) this._exitCar();
    }

    // Collisions with buildings and the world edge. resolveCircle pushes
    // the circle out along the shallow axis, so sliding along a wall works.
    const pos = player.onFoot ? player : player.car;
    if (pos) {
      const hitWall = this.city.resolveCircle(pos, player.onFoot ? 0.6 : 1.6);
      if (hitWall && player.car && Math.abs(player.car.speed) > 12) {
        this._crash(Math.abs(player.car.speed));
        player.car.speed *= 0.4;
      }
    }

    this._carTrafficCollisions(dt);
    this._pedCollisions(dt);
    this._pickupCheck();
    this._nearMissCheck(dt);

    // Police, traffic, world, missions.
    this.police.update(dt, player, !player.onFoot, (kind) => this._onPoliceRam(kind));
    this.traffic.update(dt, player, player.onFoot ? null : player, player.onFoot ? 0 : 14);
    this.city.update(dt, this.time);
    this.pickups.update(dt, this.time);
    this.particles.update(dt);
    this.missions.update(dt, input);

    // Busted: a cruiser sits on Rico while he is on foot.
    if (player.onFoot && this.police.wanted >= 1) {
      let nearest = Infinity;
      for (const c of this.police.cruisers) nearest = Math.min(nearest, Math.hypot(c.x - player.x, c.z - player.z));
      if (nearest < CFG.police.bustRadius) {
        this.bustTimer += dt;
        if (this.bustTimer > 1.2) this._gameOver('BUSTED', 'The Solmar PD took you in.');
      } else {
        this.bustTimer = 0;
      }
    } else {
      this.bustTimer = 0;
    }
    if (player.health <= 0) this._gameOver('WASTED', 'Rico went down in Solmar City.');

    // Audio and camera.
    const speedNorm = player.onFoot
      ? player.speed / CFG.player.runSpeed
      : Math.abs(player.car ? player.car.speed : 0) / CFG.car.maxSpeed;
    audio.setEngine(speedNorm, player.car ? player.car.boosting : false);
    audio.setSiren(this.police.wanted > 0);
    this._updateCamera(dt);
    this._updateHint();
    this.hud.update(this);

    if (this.shotMode) {
      this.shotFrames = (this.shotFrames || 0) + 1;
      if (this.shotFrames > 20 && !window.__shotReady) window.__shotReady = true;
    }
    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;
  }

  _stealCar(car) {
    const idx = this.traffic.cars.indexOf(car);
    if (idx >= 0) this.traffic.cars.splice(idx, 1);
    this.player.enterCar(car);
    this.stolenCar = car;
    this.police.addHeat(CFG.police.heatPerCrime, 'theft');
    this.audio.blip(520, 0.1, 'square', 0.14);
    this._toast('Car stolen — the law noticed.');
  }

  _exitCar() {
    const car = this.player.car;
    this.player.exitCar();
    if (car) {
      car.speed = 0;
      car.cruiseSpeed = 12;
      car.lane = 'z';
      car.line = car.x;
      this.traffic.cars.push(car);
    }
  }

  _crash(speed) {
    const at = this.player.car ? this.player.car : this.player;
    this.particles.sparks(at.x, 1, at.z);
    this.particles.smoke(at.x, 1.5, at.z);
    this.particles.addShake(0.55);
    this.audio.crash();
    if (this.player.car) {
      const destroyed = this.player.car.damage(CFG.car.damagePerHit);
      if (destroyed) {
        this.particles.smoke(this.player.car.x, 2, this.player.car.z);
        this.player.hurt(30);
        this._toast('Your car is wrecked!');
        this._exitCar();
      }
    }
  }

  _carTrafficCollisions(dt) {
    if (this.player.onFoot || !this.player.car) return;
    const car = this.player.car;
    for (const other of this.traffic.cars) {
      if (!other.alive || other === car) continue;
      const d = Math.hypot(other.x - car.x, other.z - car.z);
      if (d < 3.4 && d > 0.01) {
        const push = (3.4 - d) / 2;
        const nx = (car.x - other.x) / d;
        const nz = (car.z - other.z) / d;
        car.x += nx * push;
        car.z += nz * push;
        other.x -= nx * push;
        other.z -= nz * push;
        const relSpeed = Math.abs(car.speed - other.speed);
        if (relSpeed > 8) {
          this._crash(relSpeed);
          car.speed *= 0.55;
          other.speed *= 0.5;
          this.police.addHeat(0.2, 'collision');
        }
      }
    }
    // Police cruisers are solid too.
    for (const cruiser of this.police.cruisers) {
      const d = Math.hypot(cruiser.x - car.x, cruiser.z - car.z);
      if (d < 3.6 && d > 0.01) {
        const push = (3.6 - d) / 2;
        const nx = (car.x - cruiser.x) / d;
        const nz = (car.z - cruiser.z) / d;
        car.x += nx * push;
        car.z += nz * push;
        if (Math.abs(car.speed) > 10) this._crash(Math.abs(car.speed));
      }
    }
  }

  _pedCollisions(dt) {
    if (this.player.onFoot) return;
    const car = this.player.car;
    if (!car || Math.abs(car.speed) < 4) return;
    const ped = this.traffic.nearestPed(car.x, car.z, 2.6);
    if (ped) {
      ped.alive = false;
      ped.mesh.visible = false;
      setTimeout(() => {
        ped.alive = true;
        ped.mesh.visible = true;
        ped.flee = 2;
      }, 6000);
      this.police.addHeat(CFG.police.heatPerCrime, 'hit pedestrian');
      this.particles.dust(ped.x, 1, ped.z);
      this.particles.addShake(0.4);
      this.audio.crash();
      this._toast('You hit a pedestrian — the city saw it.');
    }
  }

  _pickupCheck() {
    const item = this.pickups.collect(this.player.x, this.player.z);
    if (!item) return;
    if (item.kind === 'cash') {
      this.player.cash += item.def.amount;
      this._toast(`+$${item.def.amount} cash`);
    } else if (item.kind === 'health') {
      this.player.heal(item.def.amount);
      this._toast(`+${item.def.amount} health`);
    } else if (item.kind === 'nos' && this.player.car) {
      this.player.car.nos = CFG.car.nosMax;
      this._toast('NOS refilled');
    }
    this.audio.pickup();
    this.particles.sparks(this.player.x, 1.2, this.player.z);
  }

  _nearMissCheck(dt) {
    if (this.player.onFoot || !this.player.car || this.nearMissCooldown > 0) return;
    const car = this.player.car;
    if (Math.abs(car.speed) < 18) return;
    for (const other of this.traffic.cars) {
      if (!other.alive) continue;
      const d = Math.hypot(other.x - car.x, other.z - car.z);
      if (d > 2.8 && d < 5.2) {
        this.addRep(CFG.rep.nearMiss);
        this._toast(`NEAR MISS +${CFG.rep.nearMiss} REP`);
        this.nearMissCooldown = 2;
        this.audio.blip(1200, 0.08, 'sine', 0.12);
        break;
      }
    }
  }

  _onPoliceRam() {
    const player = this.player;
    this.particles.sparks(player.x, 1, player.z);
    this.particles.addShake(0.7);
    this.audio.crash();
    if (player.car) {
      const destroyed = player.car.damage(CFG.police.ramDamage);
      if (destroyed) {
        this.player.hurt(30);
        this._toast('Your car is wrecked!');
        this._exitCar();
      }
    } else {
      player.hurt(CFG.police.ramDamage);
    }
  }

  _updateCamera(dt) {
    const player = this.player;
    const target = player.onFoot ? player : player.car;
    if (!target) return;
    // Driving: the camera swings behind the car; on foot it follows the mouse.
    if (!player.onFoot) {
      const targetYaw = target.heading + this.mouseOffset;
      this.camYaw = damp(this.camYaw, targetYaw, 2.2, dt);
      this.mouseOffset = damp(this.mouseOffset, 0, 0.8, dt);
    }
    const dist = this.shotCamDist || (player.onFoot ? CFG.camera.footDistance : CFG.camera.carDistance);
    const height = this.shotCamHeight || (player.onFoot ? CFG.camera.footHeight : CFG.camera.carHeight);
    const tx = target.x;
    const tz = target.z;
    const cx = tx - Math.sin(this.camYaw) * dist;
    const cz = tz - Math.cos(this.camYaw) * dist;
    const desired = new THREE.Vector3(cx, height, cz);
    this.camPos.x = damp(this.camPos.x, desired.x, 7, dt);
    this.camPos.y = damp(this.camPos.y, desired.y, 7, dt);
    this.camPos.z = damp(this.camPos.z, desired.z, 7, dt);
    const shake = this.particles.shakeOffset();
    this.camera.position.set(this.camPos.x + shake.x, this.camPos.y + shake.y, this.camPos.z);
    this.camera.lookAt(tx + Math.sin(this.camYaw) * 5, 1.6, tz + Math.cos(this.camYaw) * 5);
  }

  _updateHint() {
    if (this.toastTimer > 0) {
      this.hud.setHint(this.toast);
      return;
    }
    if (this.player.onFoot) {
      const car = this.traffic.nearestCar(this.player.x, this.player.z, 4.6);
      this.hud.setHint(car
        ? 'Press E to steal this car'
        : 'WASD move · SHIFT sprint · F punch · E steal a car · M next job');
    } else {
      this.hud.setHint('WASD drive · SPACE handbrake drift · SHIFT NOS · E get out · M next job');
    }
  }

  _gameOver(title, sub) {
    // Staged screenshots never end the run: the camera needs its frames,
    // and a bust mid-staging would leave the shot unready forever.
    if (this.shotMode) return;
    this.state = 'over';
    if (this.missions.active) this.missions.fail(title === 'BUSTED' ? 'Busted by the PD' : 'Wasted');
    this.hud.showCenter(title, `${sub} Press R to get back on the streets.`);
  }
}

new Game();
document.getElementById('loading').style.display = 'none';
