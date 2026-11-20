// The eight-mission story: objectives, markers, timers and rewards.
import * as THREE from 'three';
import { PLACES } from './config.js';
import { makeMarker } from './city.js';
import { MISSION_DIALOGUE, INTRO } from './story.js';
import { dist2d } from './rand.js';

// Each mission: id, title, objective text, reward, and a step machine.
// step kinds: 'go' (reach point), 'stealDeliver' (in any car at point),
// 'casing' (visit points in order), 'timed' (go with countdown),
// 'hold' (stay in radius for seconds), 'loseHeat' (stars>0 then 0),
// 'repQuota' (earn REP), 'choice' (two destinations).
export const MISSIONS = [
  {
    id: 'firstWheels', title: 'FIRST WHEELS', reward: 400, rep: 40,
    objective: 'Steal a car and deliver it to Dex’s Garage',
    steps: [{ kind: 'stealDeliver', at: PLACES.garage, text: 'Deliver a stolen car to Dex’s Garage' }],
  },
  {
    id: 'courier', title: 'COURIER RUN', reward: 900, rep: 60,
    objective: 'Pick up the package at the Sunset Diner, deliver it to the Palmera Hotel',
    steps: [
      { kind: 'go', at: PLACES.diner, text: 'Pick up the package at the Sunset Diner' },
      { kind: 'timed', at: PLACES.hotel, seconds: 75, text: 'Deliver the package to the Palmera Hotel' },
    ],
  },
  {
    id: 'casing', title: 'HEIST I — CASING', reward: 600, rep: 70,
    objective: 'Case the Meridian Bank: visit all three marked points',
    steps: [{
      kind: 'casing', text: 'Case the bank',
      points: [
        { x: PLACES.bank.x, z: PLACES.bank.z + 6, label: 'front entrance' },
        { x: PLACES.bank.x + 42, z: PLACES.bank.z - 21, label: 'east approach' },
        { x: PLACES.bank.x, z: PLACES.bank.z - 36, label: 'vault annexe' },
      ],
    }],
  },
  {
    id: 'getaway', title: 'HEIST II — THE GETAWAY', reward: 800, rep: 80,
    objective: 'Steal the sports car at Club Aurum and stash it behind the bank',
    steps: [
      { kind: 'go', at: PLACES.club, text: 'Get to the sports car at Club Aurum' },
      { kind: 'stealDeliver', at: { x: PLACES.bank.x, z: PLACES.bank.z - 50 }, text: 'Stash the car behind the Meridian Bank', sportOnly: true },
    ],
  },
  {
    id: 'vault', title: 'HEIST III — THE VAULT', reward: 6000, rep: 220,
    objective: 'Breach the vault, grab the gold, escape to the safehouse',
    steps: [
      { kind: 'go', at: { x: PLACES.bank.x, z: PLACES.bank.z - 34 }, text: 'Reach the vault annexe door' },
      { kind: 'hold', at: { x: PLACES.bank.x, z: PLACES.bank.z - 34 }, seconds: 14, text: 'Hold position — June is drilling the vault', alarm: true },
      { kind: 'go', at: PLACES.safehouse, text: 'Escape to the safehouse with the gold' },
    ],
  },
  {
    id: 'heatwave', title: 'HEAT WAVE', reward: 1200, rep: 90,
    objective: 'Get the SCPD’s attention, then lose them completely',
    steps: [{ kind: 'loseHeat', text: 'Raise your wanted level, then lose the police' }],
  },
  {
    id: 'stuntMoney', title: 'STUNT MONEY', reward: 1500, rep: 0,
    objective: 'Earn 150 REP from drifting and near-misses',
    steps: [{ kind: 'repQuota', amount: 150, text: 'Earn REP: drift and near-miss traffic' }],
  },
  {
    id: 'finale', title: 'STREETS OF GOLD', reward: 0, rep: 300,
    objective: 'Choose: deliver the gold to the crew (loyalty) or take the boat (gold)',
    steps: [{
      kind: 'choice', text: 'Make your choice',
      options: [
        { at: PLACES.warehouse, ending: 'loyalty', label: 'Pier Warehouse — loyalty' },
        { at: PLACES.marina, ending: 'gold', label: 'Solmar Marina — gold' },
      ],
    }],
  },
];

export class MissionRunner {
  constructor(scene, hooks) {
    this.scene = scene;
    this.hooks = hooks; // {onDialogue(lines, cb), onComplete(mission), onFail(mission), onAlarm(), onEnding(kind)}
    this.index = 0;
    this.stepIndex = 0;
    this.timer = 0;
    this.holdProgress = 0;
    this.repStart = 0;
    this.sawHeat = false;
    this.marker = makeMarker(0xffd23f);
    this.marker2 = makeMarker(0xff5d8f);
    this.marker.visible = false;
    this.marker2.visible = false;
    scene.add(this.marker, this.marker2);
    this.active = false;
    this.finished = false;
  }

  current() {
    return MISSIONS[this.index] ?? null;
  }

  start(fromIndex = 0, rep = 0) {
    this.index = fromIndex;
    this.finished = fromIndex >= MISSIONS.length;
    this.beginMission(rep, fromIndex === 0);
  }

  beginMission(rep, withIntro = false) {
    const m = this.current();
    this.stepIndex = 0;
    this.timer = 0;
    this.holdProgress = 0;
    this.sawHeat = false;
    this.repStart = rep;
    this.active = !!m;
    this.placeMarkers();
    if (!m) return;
    const lines = withIntro ? INTRO : (MISSION_DIALOGUE[m.id]?.start ?? []);
    if (lines.length) this.hooks.onDialogue(lines, null);
  }

  placeMarkers() {
    const m = this.current();
    this.marker.visible = false;
    this.marker2.visible = false;
    if (!m) return;
    const step = m.steps[this.stepIndex];
    if (!step) return;
    if (step.kind === 'casing') {
      const p = step.points[this.holdProgress];
      if (p) {
        this.marker.position.set(p.x, 0, p.z);
        this.marker.visible = true;
      }
    } else if (step.kind === 'choice') {
      this.marker.position.set(step.options[0].at.x, 0, step.options[0].at.z);
      this.marker.visible = true;
      this.marker2.position.set(step.options[1].at.x, 0, step.options[1].at.z);
      this.marker2.visible = true;
    } else if (step.at) {
      this.marker.position.set(step.at.x, 0, step.at.z);
      this.marker.visible = true;
    }
  }

  objectiveText() {
    const m = this.current();
    if (!m) return { title: 'FREE ROAM', text: 'Solmar City is yours. Explore, stunt, earn.' };
    const step = m.steps[this.stepIndex];
    let text = step?.text ?? m.objective;
    if (step?.kind === 'casing') {
      const p = step.points[this.holdProgress];
      text = `Case the bank: ${p ? p.label : 'done'} (${this.holdProgress}/${step.points.length})`;
    }
    if (step?.kind === 'repQuota') {
      text = `Earn REP by drifting / near-misses (${Math.floor(this.repProgress)}/${step.amount})`;
    }
    return { title: m.title, text };
  }

  targetPoint() {
    const m = this.current();
    if (!m) return null;
    const step = m.steps[this.stepIndex];
    if (!step) return null;
    if (step.kind === 'casing') return step.points[this.holdProgress] ?? null;
    if (step.kind === 'choice') return step.options[0].at;
    return step.at ?? null;
  }

  advanceStep(rep) {
    this.stepIndex++;
    this.timer = 0;
    this.holdProgress = 0;
    const m = this.current();
    if (this.stepIndex >= m.steps.length) {
      this.active = false;
      this.marker.visible = false;
      this.marker2.visible = false;
      const doneLines = MISSION_DIALOGUE[m.id]?.done ?? [];
      this.hooks.onComplete(m);
      this.index++;
      if (this.index >= MISSIONS.length) {
        this.finished = true;
      }
      if (doneLines.length) {
        this.hooks.onDialogue(doneLines, () => this.beginMission(rep));
      } else {
        this.beginMission(rep);
      }
    } else {
      this.placeMarkers();
    }
  }

  // state: {playerPos, inCar, stars, rep, dt}
  update(state) {
    const m = this.current();
    if (!m || !this.active) return;
    const step = m.steps[this.stepIndex];
    if (!step) return;
    const dt = state.dt;
    const px = state.playerPos.x;
    const pz = state.playerPos.z;
    this.repProgress = state.rep - this.repStart;
    this.timerText = '';

    const near = (p, r = 4.5) => dist2d(px, pz, p.x, p.z) < r;

    switch (step.kind) {
      case 'go':
        if (near(step.at)) this.advanceStep(state.rep);
        break;
      case 'stealDeliver':
        if (state.inCar && near(step.at, 6)
          && (!step.sportOnly || state.inCar.kind === 'sport')) {
          this.advanceStep(state.rep);
        }
        break;
      case 'timed': {
        if (this.timer === 0) this.timer = step.seconds;
        this.timer -= dt;
        this.timerText = `${Math.max(0, Math.ceil(this.timer))}s`;
        if (near(step.at, 6)) {
          this.advanceStep(state.rep);
        } else if (this.timer <= 0) {
          const failLines = MISSION_DIALOGUE[m.id]?.fail ?? [];
          this.hooks.onFail(m);
          if (failLines.length) this.hooks.onDialogue(failLines, null);
          this.beginMission(state.rep);
        }
        break;
      }
      case 'casing': {
        const p = step.points[this.holdProgress];
        if (p && near(p, 5.5)) {
          this.holdProgress++;
          this.hooks.onPoint?.(p.label);
          if (this.holdProgress >= step.points.length) this.advanceStep(state.rep);
          else this.placeMarkers();
        }
        break;
      }
      case 'hold': {
        if (step.alarm && !this.alarmFired) {
          this.alarmFired = true;
          this.hooks.onAlarm?.();
        }
        if (near(step.at, 5)) {
          this.holdProgress += dt;
          this.timerText = `DRILLING ${Math.ceil(step.seconds - this.holdProgress)}s`;
          if (this.holdProgress >= step.seconds) {
            this.alarmFired = false;
            this.advanceStep(state.rep);
          }
        } else {
          this.timerText = 'STAY AT THE VAULT DOOR';
        }
        break;
      }
      case 'loseHeat':
        if (state.stars > 0) this.sawHeat = true;
        if (this.sawHeat && state.stars === 0) this.advanceStep(state.rep);
        break;
      case 'repQuota':
        if (this.repProgress >= step.amount) this.advanceStep(state.rep);
        break;
      case 'choice':
        for (const opt of step.options) {
          if (near(opt.at, 6)) {
            this.active = false;
            this.marker.visible = false;
            this.marker2.visible = false;
            this.hooks.onEnding(opt.ending);
            this.hooks.onComplete(m);
            this.index++;
            this.finished = true;
            return;
          }
        }
        break;
      default:
        break;
    }

    // Pulse the markers.
    const t = performance.now() / 1000;
    const s = 1 + Math.sin(t * 3) * 0.12;
    this.marker.scale.set(s, 1, s);
    this.marker2.scale.set(s, 1, s);
  }
}
