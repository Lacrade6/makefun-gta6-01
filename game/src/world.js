// The world: wires every system together and runs the game loop. Screens are
// title / play / paused / over. The world owns the player, traffic, police,
// missions, pickups, HUD, minimap and save — main.js only pumps frames.

import { STEP, CITY, PLAYER, MISSION_REWARDS } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_ENTER, ACTION_PUNCH, ACTION_PAUSE, ACTION_MUTE, ACTION_CONFIRM } from './input.js';
import { createAudio } from './audio.js';
import { createCity, collideCircle } from './city.js';
import { createPlayer } from './player.js';
import { createCar, randomPaint, setCarPaint } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice, createWanted } from './police.js';
import { createMissions, MISSIONS, STORY_DONE } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createPickups } from './pickups.js';
import { createRender } from './render.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';

export function createWorld(container, seed) {
  const random = createRandom(seed);
  const render = createRender(container);
  const { colliders } = createCity(render.scene, random);
  const input = createInput(render.renderer.domElement);
  const audio = createAudio();
  const hud = createHud();
  const minimap = createMinimap(document.getElementById('minimap'));
  const player = createPlayer(render.scene, 0, 150);
  const traffic = createTraffic(render.scene, random, colliders);
  const police = createPolice(render.scene, random);
  const wanted = createWanted();
  const missions = createMissions(render.scene);
  const combat = createCombat();
  const pickups = createPickups(render.scene, random);

  // Parked cars the player can steal, including the Mission 2 getaway car.
  const parkedSpots = [[-44, 44, Math.PI / 2], [-88, -88, 0], [132, 44, -Math.PI / 2], [44, 132, Math.PI]];
  const parkedCars = parkedSpots.map(([x, z, h]) => {
    const car = createCar(render.scene, x, z, h, randomPaint(random), false);
    car.parked = true;
    traffic.cars.push(car);
    return car;
  });

  const state = {
    screen: 'title',
    money: 0,
    time: 0,
    lastCrimeAt: -100,
    overReason: '',
    shotMode: null,
    shotFrames: 0,
    shotDrive: null,
    shotMove: null,
  };

  function refreshHud() {
    hud.setStars(wanted.stars);
    hud.setMoney(state.money);
    hud.setHealth(player.health, PLAYER.maxHealth);
    const m = missions.current();
    if (m) hud.setMission(m.title, m.text);
    else hud.setMission(STORY_DONE.title, STORY_DONE.text);
    const driving = !!player.inCar;
    hud.setSpeed(driving ? Math.abs(player.inCar.speed) * 2.237 : 0, driving);
    hud.setHint(driving
      ? 'WASD drive · SPACE handbrake · E exit car · P pause'
      : traffic.nearestCar(player.pos.x, player.pos.z, 5)
        ? 'Press E to steal this car · F punch · P pause'
        : 'WASD move · SHIFT sprint · E enter car · F punch · P pause');
  }

  function enterCar() {
    if (player.inCar) return false;
    const car = traffic.nearestCar(player.pos.x, player.pos.z, 5);
    if (!car) return false;
    player.inCar = car;
    car.stolen = true;
    car.parked = false;
    player.mesh.visible = false;
    audio.unlock();
    audio.pickup();
    if (!car.owned) {
      car.owned = true;
      wanted.crime('steal');
      state.lastCrimeAt = state.time;
      hud.toast('Car stolen! The PD is on to you.', 2400);
    }
    const done = missions.notifyEnteredCar();
    if (done) completeMission();
    return true;
  }

  function exitCar() {
    const car = player.inCar;
    if (!car) return;
    car.speed = 0;
    player.inCar = null;
    const side = car.heading + Math.PI / 2;
    player.setPose(
      car.pos.x + Math.sin(side) * 2.4,
      car.pos.z + Math.cos(side) * 2.4,
      car.heading,
    );
    player.mesh.visible = true;
  }

  function completeMission() {
    const { reward, done } = missions.complete();
    state.money += reward;
    audio.missionDone();
    hud.toast(done ? `STORY COMPLETE! +$${reward}` : `Mission complete! +$${reward}`, 3200);
    hud.announce(done ? 'Story complete.' : `Mission complete, $${reward} earned.`);
    saveGame(snapshot());
    if (done) wanted.stars = 0;
  }

  function snapshot() {
    return {
      money: state.money,
      missionIndex: missions.index,
      missionsCompleted: missions.index,
      player,
      wanted: wanted.stars,
    };
  }

  function gameOver(reason) {
    state.screen = 'over';
    state.overReason = reason;
    audio.busted();
    audio.siren(false);
    audio.engine(0, false);
    hud.hide();
    if (reason === 'busted') hud.setOverText('BUSTED — the Solmar PD hauled you in. Rico is already planning the next run.');
    else hud.setOverText('WASTED — the streets of Solmar got the better of you. Rico is already planning the next run.');
    hud.showScreen('overScreen');
    hud.announce(reason === 'busted' ? 'Busted. Game over.' : 'Wasted. Game over.');
    saveGame(snapshot());
  }

  function resetRun(keepMoney) {
    const money = keepMoney ? state.money : 0;
    player.setPose(0, 150, Math.PI);
    player.health = PLAYER.maxHealth;
    player.mesh.visible = true;
    player.inCar = null;
    state.money = money;
    state.time = 0;
    wanted.reset();
    missions.reset();
    police.clear();
    pickups.reset();
    for (const car of parkedCars) { car.parked = true; car.stolen = false; car.owned = false; car.speed = 0; }
    render.setTimeOfDay('day');
    render.clearCameraOverride();
    render.setCamYaw(Math.PI);
    render.setCamPitch(0.32);
    render.setCamDist(11);
    refreshHud();
  }

  function startGame(fromSave) {
    resetRun(false);
    if (fromSave) {
      const data = loadGame();
      if (data) {
        state.money = data.money;
        missions.setIndex(Math.min(data.missionIndex, MISSIONS.length - 1), data.missionIndex >= MISSIONS.length);
        player.health = data.health;
        wanted.stars = data.wanted;
        player.setPose(data.x ?? 0, data.z ?? 150, data.heading ?? Math.PI);
      }
    }
    state.screen = 'play';
    hud.hideScreens();
    hud.show();
    audio.unlock();
    audio.click();
    hud.announce('Playing. Follow the gold marker.');
    refreshHud();
  }

  function quitToTitle() {
    state.screen = 'title';
    saveGame(snapshot());
    hud.hide();
    hud.showScreen('startScreen');
    hud.setContinueVisible(hasSave());
    audio.siren(false);
    audio.engine(0, false);
  }

  function stepPlay(dt) {
    state.time += dt;
    const actions = input.takeActions();
    const drag = input.takeDrag();
    if (drag.x !== 0 || drag.y !== 0) render.applyDrag(drag.x, drag.y);
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      hud.toast(muted ? 'Sound muted (M to unmute)' : 'Sound on', 1500);
    }
    if (actions & ACTION_PAUSE) {
      state.screen = 'paused';
      hud.showScreen('pauseScreen');
      audio.siren(false);
      audio.engine(0, false);
      return;
    }

    const driving = !!player.inCar;
    if (state.shotDrive) {
      // Staged screenshot autopilot: drive forward on a fixed script.
      const car = player.inCar;
      if (car) car.step(dt, state.shotDrive.throttle, state.shotDrive.steer, false, colliders, collideCircle);
    } else if (driving) {
      if (actions & ACTION_ENTER) exitCar();
      const drive = input.drive();
      const car = player.inCar;
      if (car) {
        car.step(dt, drive.throttle, drive.steer, drive.handbrake, colliders, collideCircle);
        // Running a pedestrian over is a crime.
        for (const ped of traffic.peds) {
          if (ped.down > 0) continue;
          const d = Math.hypot(ped.pos.x - car.pos.x, ped.pos.z - car.pos.z);
          if (d < 2.4 && Math.abs(car.speed) > 4) {
            ped.down = 3;
            ped.mesh.position.y = 0.4;
            wanted.crime('hitPed');
            state.lastCrimeAt = state.time;
            audio.crash();
            hud.toast('You ran someone over! +1★', 2200);
          }
        }
      }
    } else {
      if (actions & ACTION_ENTER) enterCar();
      if (actions & ACTION_PUNCH) {
        const result = combat.punch(player, traffic, audio);
        if (result === 'ped') {
          wanted.crime('punch');
          state.lastCrimeAt = state.time;
          hud.toast('Pedestrian down! +1★', 2000);
        }
      }
      const move = state.shotMove ?? input.move();
      player.step(dt, move, render.camYaw, colliders);
    }

    // Cash pickups.
    const got = pickups.step(dt, player.inCar ? player.inCar.pos : player.pos);
    if (got > 0) {
      state.money += got * pickups.value;
      audio.pickup();
      hud.toast(`+$${got * pickups.value} street cash`, 1600);
    }

    traffic.step(dt, player.inCar ? player.inCar.pos : player.pos, player.inCar ? Math.abs(player.inCar.speed) : 0);
    police.step(dt, wanted.stars, player,
      (dmg) => {
        const dead = player.damage(player.inCar ? Math.ceil(dmg / 2) : dmg);
        audio.crash();
        if (dead) gameOver('wasted');
      },
      () => { if (!player.inCar) gameOver('busted'); });
    wanted.step(dt, state.time - state.lastCrimeAt < 2);

    // Mission beacon + arrival.
    const m = missions.current();
    if (m && m.wantedOnStart && !m._started) {
      m._started = true;
      wanted.stars = Math.max(wanted.stars, m.wantedOnStart);
      state.lastCrimeAt = state.time;
      hud.toast('The job went loud! 3 stars — run!', 3000);
    }
    const arrival = missions.update(dt, player.inCar ? player.inCar.pos : player.pos);
    if (arrival === 'complete') completeMission();

    // Slow health regen while the heat is off.
    if (wanted.stars === 0 && player.health > 0 && player.health < PLAYER.maxHealth) {
      player.heal(3 * dt);
    }

    // Audio beds.
    audio.engine(player.inCar ? Math.abs(player.inCar.speed) / 38 : 0, driving);
    audio.siren(wanted.stars > 0 && police.count() > 0);

    // Camera follows the player or their car.
    const focus = player.inCar
      ? { x: player.inCar.pos.x, z: player.inCar.pos.z, heading: player.inCar.heading }
      : { x: player.pos.x, z: player.pos.z, heading: player.heading };
    render.updateCamera(dt, focus, player.moving || (player.inCar && Math.abs(player.inCar.speed) > 1), driving);

    refreshHud();
    minimap.draw({
      playerX: focus.x,
      playerZ: focus.z,
      playerHeading: focus.heading,
      missionTarget: missions.target(),
      trafficCars: traffic.cars.filter((c) => !c.stolen),
      policeCars: police.cars,
      pickups: pickups.items,
    });
  }

  function frame(dt) {
    if (state.screen === 'title') {
      render.orbitCamera(dt, 0, 0);
      render.render();
      return;
    }
    if (state.screen === 'paused') {
      const actions = input.takeActions();
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        state.screen = 'play';
        hud.hideScreens();
        hud.show();
      }
      render.render();
      return;
    }
    if (state.screen === 'over') {
      render.render();
      return;
    }
    stepPlay(dt);
    render.render();
    if (state.shotMode) {
      state.shotFrames += 1;
      if (state.shotFrames >= 80) window.__shotReady = true;
    }
  }

  // Buttons.
  hud.onPlay(() => startGame(false));
  hud.onContinue(() => startGame(true));
  hud.onResume(() => { state.screen = 'play'; hud.hideScreens(); hud.show(); });
  hud.onSave(() => { const ok = saveGame(snapshot()); hud.toast(ok ? 'Game saved.' : 'Save failed — storage off.', 2000); });
  hud.onQuit(() => quitToTitle());
  hud.onRetry(() => startGame(false));
  hud.onOverTitle(() => quitToTitle());
  hud.setContinueVisible(hasSave());

  /** Stage one of the four deterministic screenshots. */
  function stageShot(name) {
    resetRun(false);
    state.screen = 'play';
    state.shotMode = name;
    state.shotFrames = 0;
    hud.hideScreens();
    hud.show();
    if (name === 'cover') {
      render.setTimeOfDay('dusk');
      missions.setIndex(2, false);
      const car = traffic.nearestCar(0, 88, 400) || parkedCars[0];
      car.setPose(0, 88, Math.PI);
      car.stolen = true; car.owned = true; car.parked = false; car.speed = 10;
      setCarPaint(car, 0xc0392b);
      player.inCar = car;
      player.mesh.visible = false;
      wanted.stars = 3;
      state.lastCrimeAt = state.time;
      // Cruisers close behind, already facing the chase, so they read in frame.
      police.spawnAt(-4, 104, Math.PI);
      police.spawnAt(5, 107, Math.PI);
      // Traffic witnesses ahead and oncoming.
      const t1 = traffic.cars.find((c) => !c.stolen && !c.parked);
      if (t1) t1.setPose(-5, 52, Math.PI);
      const t2 = traffic.cars.find((c) => !c.stolen && !c.parked && c !== t1);
      if (t2) t2.setPose(6, 30, 0);
      state.shotDrive = { throttle: 0.8, steer: 0 };
      render.setCamYaw(Math.PI);
      render.setCamPitch(0.38);
      render.setCamDist(20);
      refreshHud();
    } else if (name === 'mission') {
      render.setTimeOfDay('day');
      missions.setIndex(0, false);
      player.setPose(-2, 158, 0);
      player.mesh.visible = true;
      const near = traffic.peds.slice(0, 4);
      const pedSpots = [[-9, 150], [9, 154], [-12, 166], [11, 162]];
      near.forEach((ped, i) => {
        ped.pos.x = pedSpots[i][0];
        ped.pos.z = pedSpots[i][1];
        ped.mesh.position.set(ped.pos.x, 0, ped.pos.z);
      });
      render.setCamYaw(Math.PI);
      state.shotMove = { forward: 0, strafe: 0, sprint: false };
      refreshHud();
    } else if (name === 'driving') {
      render.setTimeOfDay('day');
      missions.setIndex(2, false);
      const car = traffic.nearestCar(44, 0, 400) || parkedCars[0];
      car.setPose(44, 0, Math.PI / 2);
      car.stolen = true; car.owned = true; car.parked = false; car.speed = 18;
      player.inCar = car;
      player.mesh.visible = false;
      wanted.stars = 0;
      state.shotDrive = { throttle: 1, steer: 0 };
      render.setCamYaw(Math.PI / 2 + Math.PI + 0.85);
      refreshHud();
    } else {
      // start: title screen over a dusk skyline.
      render.setTimeOfDay('dusk');
      state.screen = 'title';
      state.shotMode = name;
      hud.hide();
      hud.showScreen('startScreen');
      hud.setContinueVisible(false);
      setTimeout(() => { window.__shotReady = true; }, 600);
    }
  }

  return {
    state, player, traffic, police, wanted, missions, render, hud, input, audio,
    frame,
    stageShot,
    startGame,
    snapshot,
    getState() {
      return {
        screen: state.screen,
        health: Math.round(player.health),
        money: state.money,
        wanted: wanted.stars,
        missionIndex: missions.index,
        missionDone: missions.done,
        missionTitle: missions.current() ? missions.current().title : 'STORY COMPLETE',
        inCar: !!player.inCar,
        speed: player.inCar ? Math.round(Math.abs(player.inCar.speed) * 2.237) : 0,
        x: Math.round((player.inCar ? player.inCar.pos.x : player.pos.x) * 10) / 10,
        z: Math.round((player.inCar ? player.inCar.pos.z : player.pos.z) * 10) / 10,
        police: police.count(),
        pedsDown: traffic.peds.filter((p) => p.down > 0).length,
        cars: traffic.cars.length,
        peds: traffic.peds.length,
      };
    },
  };
}
