// The story: eight jobs for Rico, from a broke ex-con to the big score. Each
// mission has a title, an objective line for the HUD, a target on the map and a
// cash reward. A glowing beacon marks the target in the world and on the
// minimap. Missions 1–5 are the v1 chain; 6 is a three-stage heist (recon,
// vault crack, getaway under heat), 7 is a timed delivery, and 8 is a
// branching choice: stay loyal to Rico or double-cross him for twice the cash.

import * as THREE from 'three';
import { MISSION_REWARDS, MISSION_8_BETRAY_REWARD } from './config.js';

export const MISSIONS = [
  {
    title: 'MISSION 1 — THE ARRIVAL',
    text: 'Meet Rico at the marina, south end of Ocean Drive.',
    target: { x: 0, z: 176 },
    kind: 'reach',
  },
  {
    title: 'MISSION 2 — WHEELS',
    text: 'Steal a car — any car. Walk up to one and press E.',
    target: { x: -44, z: 44 },
    kind: 'enterCar',
  },
  {
    title: 'MISSION 3 — THE BANK JOB',
    text: 'Drive to the Meridian Bank on the east side. Rico is waiting.',
    target: { x: 88, z: -44 },
    kind: 'reach',
  },
  {
    title: 'MISSION 4 — HOT PURSUIT',
    text: 'The job went loud! Lose the heat — reach Rico\u2019s garage, north-west.',
    target: { x: -132, z: -132 },
    kind: 'reach',
    wantedOnStart: 3,
  },
  {
    title: 'MISSION 5 — THE BIG SCORE',
    text: 'Deliver the package to the buyer at the north marina. No mistakes.',
    target: { x: 132, z: 132 },
    kind: 'reach',
  },
  {
    title: 'MISSION 6 — THE MERIDIAN HEIST',
    text: 'Case the Meridian Bank — reach the east-side branch.',
    kind: 'multi',
    stages: [
      { text: 'Case the Meridian Bank — reach the east-side branch.', target: { x: 88, z: -44 } },
      { text: 'Crack the vault — stay inside the vault room until the drill finishes!', target: { x: 102, z: -44 }, dwell: 3, heat: true },
      { text: 'The alarm is tripped — 3 stars! Lose the heat, reach Rico\u2019s garage.', target: { x: -132, z: -132 } },
    ],
  },
  {
    title: 'MISSION 7 — THE CLOCK IS TICKING',
    text: 'Deliver the package to the south marina — fast.',
    target: { x: 0, z: 176 },
    kind: 'timed',
    timeLimit: 90,
  },
  {
    title: 'MISSION 8 — LOYALTY OR GOLD',
    text: 'Rico waits at his garage ($5,000). The buyer waits at the north marina ($12,000). Choose.',
    kind: 'choice',
    loyalTarget: { x: -132, z: -132 },
    betrayTarget: { x: 132, z: 132 },
  },
];

export const STORY_DONE = {
  title: 'STORY COMPLETE',
  text: 'All eight jobs done — Solmar City is yours. Free roam: steal cars, dodge the PD, grab cash.',
};
export const STORY_DONE_LOYAL = {
  title: 'STORY COMPLETE — LOYAL',
  text: 'You stayed loyal. Rico splits the take and Solmar City is yours. Free roam: steal cars, dodge the PD, grab cash.',
};
export const STORY_DONE_BETRAY = {
  title: 'STORY COMPLETE — DOUBLE-CROSS',
  text: 'You sold Rico out for $12,000. The city is yours — but Rico never forgets. Free roam: steal cars, dodge the PD, grab cash.',
};

export function createMissions(scene) {
  // Beacon: a glowing column plus a spinning diamond over the target.
  function makeBeacon(color) {
    const beacon = new THREE.Group();
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 34, 16, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    );
    column.position.y = 17;
    beacon.add(column);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.3, 8, 32),
      new THREE.MeshBasicMaterial({ color }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    beacon.add(ring);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.7),
      new THREE.MeshBasicMaterial({ color }),
    );
    diamond.position.y = 8;
    beacon.add(diamond);
    beacon.visible = false;
    scene.add(beacon);
    return { group: beacon, diamond, ring };
  }
  const beacon = makeBeacon(0xffd23f);
  const beacon2 = makeBeacon(0xff3b30); // red beacon: the betrayal option

  let index = 0;
  let done = false;
  let time = 0;
  let stage = 0;       // multi-stage heist progress
  let dwellTime = 0;   // seconds held inside a dwell stage
  let heatFired = false;
  let timeLeft = 0;    // timed mission countdown
  let choice = null;   // 'loyal' | 'betray' once mission 8 resolves
  let ending = null;   // same, kept after completion for the story screen

  function current() {
    if (done) return null;
    const m = MISSIONS[index];
    if (!m) return null;
    if (m.kind === 'multi') {
      const s = m.stages[Math.min(stage, m.stages.length - 1)];
      return { ...m, text: s.text, target: s.target };
    }
    if (m.kind === 'timed') {
      return { ...m, text: `Deliver the package to the south marina — ${Math.max(0, Math.ceil(timeLeft))}s left!` };
    }
    if (m.kind === 'choice') {
      // Primary beacon goes on Rico's garage (the loyal option); the red
      // beacon marks the buyer. update() needs m.target to exist.
      return { ...m, target: m.loyalTarget };
    }
    return m;
  }

  return {
    get index() { return index; },
    get done() { return done; },
    get stage() { return stage; },
    get timeLeft() { return timeLeft; },
    get choice() { return choice; },
    get ending() { return ending; },
    setIndex(i, isDone) {
      index = i; done = !!isDone;
      stage = 0; dwellTime = 0; heatFired = false;
      timeLeft = MISSIONS[i] && MISSIONS[i].kind === 'timed' ? MISSIONS[i].timeLimit : 0;
      choice = null; ending = null;
    },
    /** Jump a multi-stage mission to a stage (used by screenshot staging). */
    setStage(n) {
      stage = n; dwellTime = 0;
      heatFired = n > 1; // stages past the vault already tripped the alarm
    },
    current,
    rewardFor(i) { return MISSION_REWARDS[i] ?? 0; },
    target() {
      const m = current();
      return m ? m.target : null;
    },
    /** Second target for choice missions (the betrayal option). */
    target2() {
      const m = current();
      return m && m.kind === 'choice' ? m.betrayTarget : null;
    },
    endText() {
      if (!done) return STORY_DONE;
      return ending === 'betray' ? STORY_DONE_BETRAY : ending === 'loyal' ? STORY_DONE_LOYAL : STORY_DONE;
    },
    /** Place the beacon(s) on the active target; call every frame.
     *  Returns 'complete' | 'heat' | 'timeout' | null. */
    update(dt, playerPos) {
      time += dt;
      const m = current();
      if (!m) { beacon.group.visible = false; beacon2.group.visible = false; return null; }
      beacon.group.visible = true;
      beacon.group.position.set(m.target.x, 0, m.target.z);
      beacon.diamond.position.y = 8 + Math.sin(time * 2.2) * 0.8;
      beacon.diamond.rotation.y += dt * 1.5;
      beacon.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      if (m.kind === 'choice') {
        beacon2.group.visible = true;
        beacon2.group.position.set(m.betrayTarget.x, 0, m.betrayTarget.z);
        beacon2.diamond.position.y = 8 + Math.sin(time * 2.2 + 1.5) * 0.8;
        beacon2.diamond.rotation.y += dt * 1.5;
        beacon2.ring.scale.setScalar(1 + Math.sin(time * 3 + 1) * 0.08);
      } else {
        beacon2.group.visible = false;
      }

      const dist = Math.hypot(playerPos.x - m.target.x, playerPos.z - m.target.z);
      if (m.kind === 'reach') {
        if (dist < 7) return 'complete';
        return null;
      }
      if (m.kind === 'multi') {
        const s = m.stages[stage];
        if (dist < 7) {
          if (s.heat && !heatFired) {
            heatFired = true;
            return 'heat'; // alarm trips the moment the drill starts
          }
          if (s.dwell) {
            dwellTime += dt;
            if (dwellTime >= s.dwell) {
              dwellTime = 0;
              stage += 1;
              if (stage >= m.stages.length) return 'complete';
            }
            return null;
          }
          stage += 1;
          if (stage >= m.stages.length) return 'complete';
        } else {
          dwellTime = 0;
        }
        return null;
      }
      if (m.kind === 'timed') {
        // First frame on this mission (or a fresh start): arm the clock.
        if (timeLeft <= 0) timeLeft = m.timeLimit;
        timeLeft -= dt;
        if (dist < 7) return 'complete';
        if (timeLeft <= 0) {
          timeLeft = m.timeLimit; // Rico gives you another shot
          return 'timeout';
        }
        return null;
      }
      if (m.kind === 'choice') {
        const dBetray = Math.hypot(playerPos.x - m.betrayTarget.x, playerPos.z - m.betrayTarget.z);
        if (dist < 7) { choice = 'loyal'; return 'complete'; }
        if (dBetray < 7) { choice = 'betray'; return 'complete'; }
        return null;
      }
      return null;
    },
    /** Mission 2 completes the moment the player gets into a car. */
    notifyEnteredCar() {
      const m = current();
      if (m && m.kind === 'enterCar') return 'complete';
      return null;
    },
    complete() {
      const m = MISSIONS[index];
      let reward = MISSION_REWARDS[index] ?? 0;
      if (m && m.kind === 'choice' && choice === 'betray') reward = MISSION_8_BETRAY_REWARD;
      if (m && m.kind === 'choice') ending = choice;
      index += 1;
      stage = 0; dwellTime = 0; heatFired = false; timeLeft = 0;
      if (index >= MISSIONS.length) done = true;
      return { reward, done, ending };
    },
    reset() {
      index = 0; done = false;
      stage = 0; dwellTime = 0; heatFired = false; timeLeft = 0;
      choice = null; ending = null;
      for (const m of MISSIONS) delete m._started;
    },
  };
}
