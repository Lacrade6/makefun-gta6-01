// The mission engine: runs the story step by step, shows the briefing
// dialogue, keeps the gold marker on the current objective, and pays out
// cash and REP when a job is done. Steps are small and explicit — go to a
// place, hold it, tail a car, beat a clock, or choose a side.

import * as THREE from 'three';
import { CFG } from './config.js';
import { MISSIONS, FINALE_TEXT } from './story.js';

export class Missions {
  constructor(ctx) {
    this.ctx = ctx;
    this.scene = ctx.scene;
    this.index = -1;          // no mission running
    this.stepIndex = 0;
    this.active = false;
    this.completed = 0;       // missions finished this save
    this.stepTimer = 0;
    this.missionTimer = 0;
    this.missionTimerRunning = false;
    this.tailTime = 0;
    this.spottedTime = 0;
    this.lostTime = 0;
    this.markedCar = null;
    this.branch = null;
    this.dialogueQueue = [];
    this.dialogueTimer = 0;
    this.failed = false;
    this.waitingNext = false;
    this._buildMarker();
  }

  _buildMarker() {
    const group = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 30;
    group.add(beam);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.6),
      new THREE.MeshBasicMaterial({ color: 0xffd76a }),
    );
    diamond.position.y = 7;
    group.add(diamond);
    this.markerDiamond = diamond;
    group.visible = false;
    this.scene.add(group);
    this.marker = group;
  }

  _resolvePoint(at) {
    if (typeof at === 'string') {
      if (at === 'marked' && this.markedCar) return { x: this.markedCar.x, z: this.markedCar.z };
      const lm = this.ctx.city.landmarks[at];
      // Missions point at a building's front steps, never its centre: the
      // centre is inside the walls and the collision would push Rico out
      // past the objective radius.
      if (lm) return lm.front || { x: lm.x, z: lm.z };
      return { x: 0, z: 0 };
    }
    return at;
  }

  get def() {
    return this.index >= 0 ? MISSIONS[this.index] : null;
  }

  get step() {
    if (!this.def) return null;
    const steps = this._steps();
    return steps[this.stepIndex] || null;
  }

  _steps() {
    if (!this.def) return [];
    if (this.branch && this.def.branches) return [this.def.steps[0], ...this.def.branches[this.branch]];
    return this.def.steps;
  }

  currentTarget() {
    const step = this.step;
    if (!step) return null;
    if (step.kind === 'tail' || step.at === 'marked') {
      if (this.markedCar) return { x: this.markedCar.x, z: this.markedCar.z, moving: true };
      return null;
    }
    if (step.at) return { ...this._resolvePoint(step.at), moving: false };
    return null;
  }

  objectiveText() {
    if (this.failed) return { title: 'MISSION FAILED', text: 'Press R to retry this job', sub: '' };
    if (this.waitingNext) {
      const next = MISSIONS[this.index + 1];
      return {
        title: next ? 'JOB DONE' : 'STORY COMPLETE',
        text: next ? `Press M — ${next.title}` : 'Rico owns Solmar City. Free roam!',
        sub: next ? '' : 'Every mission complete. The city is yours.',
      };
    }
    const step = this.step;
    if (!step || !this.def) {
      return { title: 'SOLMAR CITY', text: 'Press M to start the next job', sub: 'Free roam — steal a car, explore, earn REP' };
    }
    let sub = step.sub || '';
    if (step.kind === 'hold' || step.kind === 'defend') {
      sub = `${step.sub || ''} — ${Math.ceil(step.time - this.stepTimer)}s left`.trim();
    }
    if (step.kind === 'tail') {
      sub = `${step.sub || ''} — ${Math.ceil(this.tailTime)}/${step.time}s in the pocket`.trim();
    }
    if (step.kind === 'timed') {
      sub = `${step.sub || ''} — ${Math.ceil(this.missionTimer)}s on the clock`.trim();
    }
    if (step.kind === 'choice') {
      sub = step.sub || '';
    }
    return { title: this.def.title, text: step.text, sub };
  }

  startMission(i) {
    if (i < 0 || i >= MISSIONS.length) return false;
    this.index = i;
    this.stepIndex = 0;
    this.active = true;
    this.failed = false;
    this.waitingNext = false;
    this.stepTimer = 0;
    this.missionTimer = 0;
    this.missionTimerRunning = false;
    this.tailTime = 0;
    this.spottedTime = 0;
    this.lostTime = 0;
    this.branch = null;
    this._defendWantedSet = false;
    this._clearMarkedCar();
    const def = this.def;
    this.queueDialogue(def.briefing);
    if (def.onStart === 'wanted2') this.ctx.police.setWanted(2);
    if (def.onStart === 'wanted3') this.ctx.police.setWanted(3);
    if (def.onStart === 'wanted0') this.ctx.police.clearWanted();
    if (def.onStart === 'markedCar') this._spawnMarkedCar();
    this.ctx.hud.showCenter(def.title, 'New job — listen to the crew');
    return true;
  }

  _spawnMarkedCar() {
    const traffic = this.ctx.traffic;
    const car = traffic.cars.find((c) => c.alive) || null;
    if (!car) return;
    this.markedCar = car;
    car.mesh.children.forEach((child) => {
      if (child.material && child.material.color) child.material.color.setHex(0x777777);
    });
    car.cruiseSpeed = 11;
    car.marked = true;
  }

  _clearMarkedCar() {
    if (this.markedCar) {
      this.markedCar.marked = false;
      this.markedCar = null;
    }
  }

  queueDialogue(lines) {
    for (const line of lines) this.dialogueQueue.push(line);
  }

  retry() {
    if (this.index < 0) return;
    this.startMission(this.index);
  }

  nextMission() {
    if (this.waitingNext && this.index + 1 < MISSIONS.length) {
      this.startMission(this.index + 1);
      return true;
    }
    if (!this.active && this.index < 0) {
      this.startMission(this.completed);
      return true;
    }
    return false;
  }

  completeStep() {
    this.stepIndex += 1;
    this.stepTimer = 0;
    this.tailTime = 0;
    const steps = this._steps();
    if (this.stepIndex >= steps.length) this._completeMission();
    else this.ctx.audio.blip(880, 0.12, 'sine', 0.16);
  }

  _completeMission() {
    const def = this.def;
    const { player, audio, hud, save } = this.ctx;
    player.cash += def.reward;
    this.ctx.game.addRep(CFG.rep.mission);
    this.completed = Math.max(this.completed, this.index + 1);
    this.active = false;
    this.waitingNext = true;
    this.marker.visible = false;
    this.ctx.police.holdMode = false;
    audio.jingle();
    hud.showCenter('MISSION PASSED', `+$${def.reward}  ·  +${CFG.rep.mission} REP`);
    if (this.branch) {
      this.queueDialogue(FINALE_TEXT[this.branch]);
    }
    if (this.index + 1 >= MISSIONS.length) {
      this.ctx.game.storyComplete = true;
    }
    if (save) save.save();
  }

  fail(reason) {
    if (!this.active || this.failed) return;
    this.failed = true;
    this.active = false;
    this.marker.visible = false;
    this.ctx.police.holdMode = false;
    this.ctx.audio.failSting();
    this.ctx.hud.showCenter('MISSION FAILED', `${reason} — press R to retry`);
  }

  _playerPos() {
    return this.ctx.player;
  }

  _inRadius(at, r) {
    const p = this._resolvePoint(at);
    const pl = this._playerPos();
    return Math.hypot(pl.x - p.x, pl.z - p.z) < r;
  }

  update(dt, input) {
    // Dialogue queue: one line at a time, ~4.4 seconds each. Screenshot
    // staging skips the dialogue so the frame stays clean.
    if (!this.ctx.game.shotMode && this.dialogueQueue.length > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) {
        const line = this.dialogueQueue.shift();
        this.ctx.hud.showDialogue(line.who, line.text);
        this.dialogueTimer = 4.4;
      }
    }
    if (!this.active || this.failed) {
      this.marker.visible = false;
      this.ctx.police.holdMode = false;
      return;
    }
    const step = this.step;
    if (!step) return;
    // Hold and defend steps are a siege: fewer cruisers, and they approach
    // to arrest rather than to kill, so standing the ground is survivable.
    this.ctx.police.holdMode = step.kind === 'hold' || step.kind === 'defend';
    const player = this.ctx.player;
    const target = this.currentTarget();
    if (target) {
      this.marker.visible = true;
      this.marker.position.set(target.x, 0, target.z);
      this.markerDiamond.rotation.y += dt * 2.4;
      this.markerDiamond.position.y = 7 + Math.sin(this.ctx.game.time * 2.2) * 0.8;
    } else {
      this.marker.visible = false;
    }

    switch (step.kind) {
      case 'steal': {
        if (!player.onFoot) this.completeStep();
        break;
      }
      case 'goto': {
        if (step.inCar && player.onFoot) break;
        if (step.onFoot && !player.onFoot) break;
        if (this._inRadius(step.at, step.r)) this.completeStep();
        break;
      }
      case 'hold':
      case 'defend': {
        if (step.kind === 'defend' && this.stepTimer === 0 && !this._defendWantedSet) {
          this.ctx.police.setWanted(3);
          this._defendWantedSet = true;
        }
        if (this._inRadius(step.at, step.r)) {
          this.stepTimer += dt;
          if (this.stepTimer >= step.time) this.completeStep();
        } else if (step.kind === 'defend') {
          this.stepTimer = Math.max(0, this.stepTimer - dt * 0.5);
        }
        break;
      }
      case 'timed': {
        if (!this.missionTimerRunning) {
          this.missionTimer = step.time;
          this.missionTimerRunning = true;
        }
        this.missionTimer -= dt;
        if (this.missionTimer <= 0) {
          this.fail('Out of time');
          break;
        }
        if (step.inCar && player.onFoot) break;
        if (this._inRadius(step.at, step.r)) this.completeStep();
        break;
      }
      case 'tail': {
        if (!this.markedCar) { this.fail('Lost the target'); break; }
        const d = Math.hypot(player.x - this.markedCar.x, player.z - this.markedCar.z);
        if (d < 8) {
          this.spottedTime += dt;
          if (this.spottedTime > 2.5) { this.fail('He spotted you'); break; }
        } else {
          this.spottedTime = 0;
        }
        if (d > 45) {
          this.lostTime += dt;
          if (this.lostTime > 4) { this.fail('Lost the target'); break; }
        } else {
          this.lostTime = 0;
        }
        if (d >= 12 && d <= 30) {
          this.tailTime += dt;
          if (this.tailTime >= step.time) {
            // The rat stops at the plaza. Confront him on foot.
            this.markedCar.cruiseSpeed = 0;
            this.markedCar.speed = 0;
            this.completeStep();
          }
        }
        break;
      }
      case 'choice': {
        if (input.wasPressed('Digit1')) {
          this.branch = 'loyalty';
          this.ctx.hud.showDialogue('Rico', 'The crew comes first. We hold the garage.');
          this.completeStep();
        } else if (input.wasPressed('Digit2')) {
          this.branch = 'gold';
          this.ctx.hud.showDialogue('Rico', 'The gold is mine. All of it.');
          this.ctx.police.setWanted(5);
          this.completeStep();
        }
        break;
      }
      default:
        break;
    }
  }
}
