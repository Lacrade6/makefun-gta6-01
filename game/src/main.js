// Solmar City — Streets of Gold: boot, game state, main loop.
import * as THREE from 'three';
import { WORLD, PLACES, PALETTE } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { buildCity, collideCircle } from './city.js';
import { Player, FollowCamera } from './player.js';
import { Car } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { MissionRunner } from './missions.js';
import { Combat } from './combat.js';
import { Pickups } from './pickups.js';
import { Particles } from './particles.js';
import { Hud } from './hud.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { BUSTED_LINES, WASTED_LINES, ENDINGS } from './story.js';
import { clamp, dist2d, range } from './rand.js';
import { stageShot } from './shots.js';

const $ = (id) => document.getElementById(id);

// ---------- renderer / scene ----------
const canvas = $('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.fog, 90, 340);

const camera = new THREE.PerspectiveCamera(
  62, window.innerWidth / window.innerHeight, 0.1, 900);

const sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
sun.position.set(-140, 90, -60);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffd9ec, 0x5a4a6a, 0.85));
scene.add(new THREE.AmbientLight(0xffe0c0, 0.35));

// Sun disc + skyline silhouette for the golden-hour look.
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff0b8, fog: false }));
  disc.position.set(-330, 120, -160);
  disc.lookAt(0, 40, 0);
  scene.add(disc);
  const skyMat = new THREE.MeshLambertMaterial({ color: 0x8a5a7a });
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = 330 + (i % 5) * 18;
    const h = 40 + ((i * 37) % 70);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(26, h, 26), skyMat);
    tower.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    scene.add(tower);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- world ----------
const { colliders, anchors } = buildCity(scene);
const particles = new Particles(scene);
const pickups = new Pickups(scene);
const traffic = new Traffic(scene);
const police = new Police(scene);
const combat = new Combat();

// Parked stealable cars dotted around the city + the Club Aurum sports car.
const parkedCars = [];
{
  const spots = [
    [PLACES.safehouse.x + 8, PLACES.safehouse.z + 21, 0],
    [-42, 60, Math.PI / 2], [60, -42, 0], [126, 20, Math.PI],
    [-120, -60, Math.PI / 2], [20, 126, 0], [168, -120, Math.PI / 2],
    [-168, 20, 0], [84, 84, Math.PI], [-60, 168, Math.PI / 2],
  ];
  for (const [x, z, h] of spots) {
    const car = new Car(scene, x, z, h);
    car.driver = null;
    parkedCars.push(car);
  }
  const sport = new Car(scene, PLACES.club.x - 10, PLACES.club.z + 8, Math.PI / 2, 0xffd23f, 'sport');
  sport.driver = null;
  sport.isGetawayCar = true;
  parkedCars.push(sport);
}

// ---------- game state ----------
const input = new Input(canvas);
const audio = new AudioEngine();
const hud = new Hud();
const player = new Player(scene, PLACES.safehouse.x + 6, PLACES.safehouse.z + 14);
const followCam = new FollowCamera(camera);

const state = {
  mode: 'title',        // title | play | pause | ending
  cash: 250,
  rep: 0,
  missionIndex: 0,
  ending: null,
  time: 0,
  nearMissCooldown: 0,
  driftBank: 0,
  dialogueQueue: [],
  dialogueCb: null,
  respawnTimer: 0,
};

function queueDialogue(lines, cb) {
  state.dialogueQueue = [...lines];
  state.dialogueCb = cb ?? null;
  showNextLine();
}

function showNextLine() {
  const line = state.dialogueQueue[0];
  if (line) hud.showDialogue(line.who, line.text);
  else hud.hideDialogue();
}

function advanceDialogue() {
  state.dialogueQueue.shift();
  if (state.dialogueQueue.length === 0) {
    hud.hideDialogue();
    const cb = state.dialogueCb;
    state.dialogueCb = null;
    if (cb) cb();
  } else {
    showNextLine();
  }
}

const missions = new MissionRunner(scene, {
  onDialogue: (lines, cb) => queueDialogue(lines, cb),
  onComplete: (m) => {
    state.cash += m.reward;
    state.rep += m.rep;
    state.missionIndex = missions.index;
    hud.showToast(`MISSION PASSED\n+${m.reward} · +${m.rep} REP`);
    audio.missionDone();
    particles.gold(player.pos.x, 2, player.pos.z, 40);
    saveGame({ ...state, player });
  },
  onFail: () => {
    hud.showToast('MISSION FAILED');
    audio.missionFail();
  },
  onPoint: (label) => hud.showToast(`Cased: ${label}`, 1.4),
  onAlarm: () => {
    police.addCrime(3);
    hud.showToast('ALARM TRIPPED — SCPD INBOUND', 2.6);
    audio.starUp();
  },
  onEnding: (kind) => {
    state.ending = kind;
    state.mode = 'ending';
    const e = ENDINGS[kind];
    $('ending-title').textContent = e.title;
    $('ending-text').textContent = e.text;
    $('ending-stats').textContent =
      `Final cash ${state.cash} · REP ${Math.floor(state.rep)} · Missions complete`;
    $('ending-screen').classList.remove('hidden');
    hud.hide();
    saveGame({ ...state, player });
  },
});

function allCars() {
  return [...parkedCars, ...traffic.allCars(), ...police.cruisers, ...police.roadblocks];
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of allCars()) {
    const d = dist2d(player.pos.x, player.pos.z, car.pos.x, car.pos.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  player.inCar = car;
  const wasTraffic = car.driver === 'traffic';
  car.driver = 'player';
  player.mesh.visible = false;
  audio.door();
  if (wasTraffic) {
    police.addCrime(1);
    hud.showToast('CARJACKED — SCPD NOTIFIED', 1.6);
    audio.starUp();
  } else if (!car.isGetawayCar) {
    police.addCrime(1);
    hud.showToast('VEHICLE STOLEN', 1.2);
  }
  followCam.yaw = car.heading + Math.PI;
}

function exitCar() {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  car.driver = null;
  player.pos.set(car.pos.x + Math.cos(car.heading) * 2.2, 0,
    car.pos.z - Math.sin(car.heading) * 2.2);
  player.heading = car.heading;
  player.mesh.visible = true;
  audio.door();
}

function respawn(kind) {
  // kind: 'busted' | 'wasted'
  police.clear();
  exitCarSilent();
  if (kind === 'busted') {
    state.cash = Math.max(0, state.cash - 300);
    player.pos.set(PLACES.precinct.x + 8, 0, PLACES.precinct.z + 8);
    queueDialogue(BUSTED_LINES, null);
    hud.showToast('BUSTED — bail $300', 2.6);
  } else {
    state.cash = Math.max(0, state.cash - 150);
    player.pos.set(PLACES.hospital.x + 8, 0, PLACES.hospital.z + 8);
    queueDialogue(WASTED_LINES, null);
    hud.showToast('WASTED — hospital bill $150', 2.6);
  }
  player.health = 100;
  player.mesh.visible = true;
}

function exitCarSilent() {
  if (player.inCar) {
    player.inCar.driver = null;
    player.inCar = null;
  }
}

// ---------- per-frame gameplay ----------
function crimeCheck(event) {
  if (police.addCrime(1)) audio.starUp();
  if (event === 'ped') hud.showToast('ASSAULT REPORTED', 1.2);
  if (event === 'hit') hud.showToast('HIT AND RUN', 1.2);
}

function updatePlay(dt) {
  state.time += dt;
  const inDialogue = state.dialogueQueue.length > 0;
  if (inDialogue && input.interact()) {
    advanceDialogue();
  }
  player.regen(dt);

  // --- player movement / driving ---
  let playerSpeed = 0;
  let playerHeading = player.heading;
  if (player.inCar) {
    const car = player.inCar;
    const axis = input.axis();
    const boosting = car.drive(dt, {
      throttle: axis.y,
      steer: -axis.x,
      handbrake: input.down('Space'),
      nos: input.sprint(),
    });
    const fixed = collideCircle(colliders, car.pos.x, car.pos.z, 1.6);
    if (fixed.x !== car.pos.x || fixed.z !== car.pos.z) {
      const impact = Math.abs(car.speed);
      car.pos.x = fixed.x;
      car.pos.z = fixed.z;
      if (impact > 6) {
        car.speed *= 0.35;
        car.health -= impact * 0.5;
        player.hurt(impact * 0.35);
        followCam.addShake(0.5);
        particles.sparks(car.pos.x, 0.8, car.pos.z, 18);
        audio.crash(impact / 10);
        hud.flashDamage();
      }
    }
    car.pos.x = clamp(car.pos.x, -WORLD.half + 3, WORLD.half - 3);
    car.pos.z = clamp(car.pos.z, -WORLD.half + 3, WORLD.half - 3);
    car.syncMesh(dt);
    player.pos.copy(car.pos);
    player.heading = car.heading;
    playerSpeed = Math.abs(car.speed);
    playerHeading = car.heading;

    if (boosting) {
      const back = car.forward().multiplyScalar(-2.3);
      particles.nosFlame(car.pos.x + back.x, 0.55, car.pos.z + back.z);
    }
    if (car.drifting) {
      state.driftBank += dt * 14;
      particles.smoke(car.pos.x, 0.4, car.pos.z, 2);
      if (state.driftBank > 10) {
        hud.showDrift(`DRIFT +${Math.floor(state.driftBank)} REP`);
      }
    } else if (state.driftBank > 0) {
      state.rep += state.driftBank;
      state.driftBank = 0;
    }
    audio.setEngine(Math.abs(car.speed) / 42, true);

    // Car-car bumps + near misses.
    state.nearMissCooldown -= dt;
    for (const other of allCars()) {
      if (other === car) continue;
      const d = dist2d(car.pos.x, car.pos.z, other.pos.x, other.pos.z);
      if (d < 3.4 && playerSpeed > 4) {
        const push = car.pos.clone().sub(other.pos).normalize().multiplyScalar(0.5);
        car.pos.add(push);
        other.pos.sub(push);
        car.speed *= 0.72;
        other.speed *= 0.6;
        followCam.addShake(0.4);
        particles.sparks(car.pos.x, 0.8, car.pos.z, 12);
        audio.crash(1);
        crimeCheck('hit');
      } else if (d < 6.5 && d >= 3.4 && playerSpeed > 16 && state.nearMissCooldown <= 0) {
        state.nearMissCooldown = 1.4;
        state.rep += 8;
        hud.showDrift('NEAR MISS +8 REP');
      }
    }
    // Running over peds.
    for (const ped of traffic.peds) {
      if (ped.state === 'down') continue;
      if (dist2d(car.pos.x, car.pos.z, ped.pos.x, ped.pos.z) < 2.2 && playerSpeed > 5) {
        ped.hit(40);
        particles.bloodlessPuff(ped.pos.x, 1, ped.pos.z, 10);
        followCam.addShake(0.25);
        audio.crash(0.6);
        crimeCheck('ped');
      }
    }
    if (input.justPressed('KeyF')) exitCar();
  } else {
    audio.setEngine(0, false);
    if (!inDialogue) player.moveOnFoot(dt, input, followCam.yaw, colliders);
    else player.animate(dt, false);

    const car = nearestCar(3.4);
    hud.setPrompt(car ? 'F — steal / enter car' : null);
    if (car && input.justPressed('KeyF')) {
      enterCar(car);
      hud.setPrompt(null);
    }
    // Melee.
    const punch = combat.tryPunch(dt, player, traffic.peds, police.cruisers,
      input.justPressed('KeyJ') || input.clicked);
    if (punch.hit) {
      audio.punch();
      particles.bloodlessPuff(punch.x, 1.2, punch.z, 8);
      if (punch.hit === 'ped') crimeCheck('ped');
      if (punch.hit === 'cop') { police.addCrime(1); hud.showToast('ASSAULTING AN OFFICER', 1.4); }
    }
  }

  // --- world systems ---
  traffic.update(dt, player.pos, player.inCar);
  const copResult = police.update(dt, player.pos, playerSpeed, playerHeading);
  audio.setSiren(police.stars > 0 ? clamp(1 - copResult.nearest / 60, 0, 1) : 0, dt);
  particles.update(dt);

  const got = pickups.update(dt, player.pos);
  if (got) {
    audio.pickup();
    particles.gold(player.pos.x, 1.4, player.pos.z, 14);
    if (got === 'health') player.heal(35);
    if (got === 'cash') { state.cash += 120; audio.cash(); }
    if (got === 'nos' && player.inCar) player.inCar.nos = 100;
    if (got === 'rep') state.rep += 15;
    hud.showToast(pickups.labelFor(got), 1.1);
  }

  missions.update({
    dt, playerPos: player.pos, inCar: player.inCar, stars: police.stars, rep: state.rep,
  });

  if (copResult.busted) respawn('busted');
  if (player.health <= 0) respawn('wasted');

  // --- camera + HUD ---
  const camTarget = player.inCar ? player.inCar.pos : player.pos;
  followCam.update(dt, input, camTarget, !!player.inCar);
  const obj = missions.objectiveText();
  hud.setObjective(obj.title, obj.text, missions.timerText ?? '');
  hud.update(dt, {
    stars: police.stars,
    cash: state.cash,
    rep: state.rep,
    health: player.health,
    bustMeter: police.bustMeter,
    kmh: player.inCar ? player.inCar.kmh() : 0,
    nos: player.inCar ? player.inCar.nos : 0,
    policeText: police.panelText(),
    playerPos: player.pos,
    playerHeading: playerHeading,
    cruisers: police.cruisers,
    target: missions.targetPoint(),
  });

  if (input.justPressed('KeyR')) {
    hud.setRadio(audio.nextStation());
  }
  if (input.justPressed('KeyP')) {
    if (saveGame({ ...state, player })) hud.showToast('GAME SAVED', 1.4);
  }
  if (input.justPressed('Escape')) pauseGame();
}

// ---------- screens / flow ----------
function startGame(fromSave) {
  audio.start();
  hud.setRadio(audio.stationInfo());
  $('title-screen').classList.add('hidden');
  $('pause-screen').classList.add('hidden');
  $('ending-screen').classList.add('hidden');
  hud.show();
  state.mode = 'play';
  if (fromSave) {
    const save = loadGame();
    if (save) {
      state.cash = save.cash ?? 250;
      state.rep = save.rep ?? 0;
      state.missionIndex = save.mission ?? 0;
      state.ending = save.ending ?? null;
      player.health = save.health ?? 100;
      missions.start(state.missionIndex, state.rep);
      hud.showToast('SAVE LOADED', 1.6);
      return;
    }
  }
  state.cash = 250;
  state.rep = 0;
  state.missionIndex = 0;
  state.ending = null;
  player.health = 100;
  player.pos.set(PLACES.safehouse.x + 6, 0, PLACES.safehouse.z + 14);
  missions.start(0, 0);
}

function pauseGame() {
  if (state.mode !== 'play') return;
  state.mode = 'pause';
  $('pause-stats').textContent =
    `Cash ${state.cash} · REP ${Math.floor(state.rep)} · Mission ${Math.min(state.missionIndex + 1, 8)}/8`;
  $('pause-screen').classList.remove('hidden');
}

function resumeGame() {
  $('pause-screen').classList.add('hidden');
  state.mode = 'play';
}

function quitToTitle() {
  $('pause-screen').classList.add('hidden');
  $('ending-screen').classList.add('hidden');
  hud.hide();
  police.clear();
  exitCarSilent();
  player.mesh.visible = true;
  state.mode = 'title';
  refreshTitle();
  $('title-screen').classList.remove('hidden');
}

function refreshTitle() {
  const save = loadGame();
  const btn = $('btn-continue');
  if (save) {
    btn.classList.remove('hidden');
    $('title-save-info').textContent =
      `Saved game: mission ${Math.min(save.mission + 1, 8)}/8 · ${save.cash} · REP ${save.rep}`;
  } else {
    btn.classList.add('hidden');
    $('title-save-info').textContent = '';
  }
}

$('btn-new').addEventListener('click', () => { clearSave(); startGame(false); });
$('btn-continue').addEventListener('click', () => startGame(true));
$('btn-resume').addEventListener('click', resumeGame);
$('btn-save').addEventListener('click', () => {
  if (saveGame({ ...state, player })) hud.showToast('GAME SAVED', 1.4);
  resumeGame();
});
$('btn-quit').addEventListener('click', quitToTitle);
$('btn-ending-continue').addEventListener('click', () => {
  $('ending-screen').classList.add('hidden');
  hud.show();
  state.mode = 'play';
});

// Title-screen backdrop camera slowly orbits the city.
let titleAngle = 0;
function updateTitle(dt) {
  titleAngle += dt * 0.05;
  camera.position.set(Math.cos(titleAngle) * 120, 46, Math.sin(titleAngle) * 120);
  camera.lookAt(0, 10, 0);
  traffic.update(dt, player.pos, null);
  particles.update(dt);
}

// ---------- screenshot staging ----------
const shotParam = new URLSearchParams(window.location.search).get('shot');
if (shotParam) {
  stageShot(shotParam, {
    scene, camera, renderer, player, followCam, police, traffic, missions,
    parkedCars, hud, state, particles, audio, startGame,
  });
}

// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.mode === 'play') updatePlay(dt);
  else if (state.mode === 'title') updateTitle(dt);
  else if (state.mode === 'pause') { /* frozen */ }
  else if (state.mode === 'ending') {
    traffic.update(dt, player.pos, null);
    particles.update(dt);
  }
  // Staged screenshot scenes re-pose the world after the normal update.
  if (state.shotPose) state.shotPose(now / 1000);
  renderer.render(scene, camera);
  input.endFrame();
}

refreshTitle();
requestAnimationFrame(loop);

// Exposed for automated playtests (harmless in normal play).
window.__solmar = { state, player, police, missions, traffic, parkedCars, startGame };
