// The story: five jobs for Rico, from a broke ex-con to the big score. Each
// mission has a title, an objective line for the HUD, a target on the map and a
// cash reward. A glowing beacon marks the target in the world and on the minimap.

import * as THREE from 'three';
import { MISSION_REWARDS } from './config.js';

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
];

export const STORY_DONE = {
  title: 'STORY COMPLETE',
  text: 'All five jobs done — Solmar City is yours. Free roam: steal cars, dodge the PD, grab cash.',
};

export function createMissions(scene) {
  // Beacon: a glowing column plus a spinning diamond over the target.
  const beacon = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 34, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
  );
  column.position.y = 17;
  beacon.add(column);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, 0.3, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  beacon.add(ring);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.7),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  diamond.position.y = 8;
  beacon.add(diamond);
  beacon.visible = false;
  scene.add(beacon);

  let index = 0;
  let done = false;
  let time = 0;

  function current() {
    return done ? null : MISSIONS[index];
  }

  return {
    get index() { return index; },
    get done() { return done; },
    setIndex(i, isDone) { index = i; done = !!isDone; },
    current,
    rewardFor(i) { return MISSION_REWARDS[i] ?? 0; },
    target() {
      const m = current();
      return m ? m.target : null;
    },
    /** Place the beacon on the active target; call every frame. */
    update(dt, playerPos) {
      time += dt;
      const m = current();
      if (!m) { beacon.visible = false; return null; }
      beacon.visible = true;
      beacon.position.set(m.target.x, 0, m.target.z);
      diamond.position.y = 8 + Math.sin(time * 2.2) * 0.8;
      diamond.rotation.y += dt * 1.5;
      ring.scale.setScalar(1 + Math.sin(time * 3) * 0.08);
      const dist = Math.hypot(playerPos.x - m.target.x, playerPos.z - m.target.z);
      if (m.kind === 'reach' && dist < 7) return 'complete';
      return null;
    },
    /** Mission 2 completes the moment the player gets into a car. */
    notifyEnteredCar() {
      const m = current();
      if (m && m.kind === 'enterCar') return 'complete';
      return null;
    },
    complete() {
      const reward = MISSION_REWARDS[index] ?? 0;
      index += 1;
      if (index >= MISSIONS.length) done = true;
      return { reward, done };
    },
    reset() {
      index = 0; done = false;
      for (const m of MISSIONS) delete m._started;
    },
  };
}
