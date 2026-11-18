// The world: wires every system together and runs the game loop. Screens are
// title / play / paused / over. The world owns the player, traffic, police,
// missions, pickups, HUD, minimap and save — main.js only pumps frames.

import { STEP, CITY, PLAYER, MISSION_REWARDS, CAR, RADIO, DISTRICTS, STREET_NAMES } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_ENTER, ACTION_PUNCH, ACTION_PAUSE, ACTION_MUTE, ACTION_CONFIRM, ACTION_RADIO } from './input.js';
import { createAudio } from './audio.js';
import { createCity, collideCircle, nearestStreetCoord } from './city.js';
import { createPlayer } from './player.js';
import { createCar, randomPaint, setCarPaint } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice, createWanted } from './police.js';
import { createHelicopter } from './helicopter.js';
import { createMissions, MISSIONS } from './missions.js';
import { CREW, DIALOGUE } from './story.js';
import { createParticles } from './particles.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';
import { createPickups } from './pickups.js';
import { createRender } from './render.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';

export function createWorld(container, seed) {
  const random = createRandom(seed);
  const render = createRender(container);
  const { colliders, setTimeOfDay: setCityTimeOfDay, ferrisWheel } = createCity(render.scene, random);
  function setTimeOfDay(mode) {
    render.setTimeOfDay(mode);
    setCityTimeOfDay(mode);
  }
  const input = createInput(render.renderer.domElement);
  const audio = createAudio();
  const hud = createHud();
  const minimap = createMinimap(document.getElementById('minimap'));
  const player = createPlayer(render.scene, 0, 150);
  const traffic = createTraffic(render.scene, random, colliders);
  const police = createPolice(render.scene, random);
  const heli = createHelicopter(render.scene);
  const wanted = createWanted();
  const missions = createMissions(render.scene);
  const combat = createCombat();
  const pickups = createPickups(render.scene, random);
  const particles = createParticles(render.scene);

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
    radioIndex: 0,
    rep: 0,
    nosGauge: CAR.nosMax,
    driftTime: 0,
    drifting: false,
    lastMissionIndex: -1,
  };

  function repLevel() { return Math.floor(state.rep / 500) + 1; }
  function repFrac() { return (state.rep % 500) / 500; }

  function showMissionDialogue(index) {
    const line = DIALOGUE[index];
    if (!line) return;
    hud.showDialogue(CREW[line.who], line.text);
  }

  function districtFor(x, z) {
    for (const d of DISTRICTS) if (d.test(x, z)) return d;
    return DISTRICTS[DISTRICTS.length - 1];
  }

  function streetFor(x, z) {
    const nx = nearestStreetCoord(x);
    const nz = nearestStreetCoord(z);
    const coord = Math.abs(x - nx) < Math.abs(z - nz) ? nx : nz;
    const idx = Math.round((coord + 176) / 44);
    return STREET_NAMES[Math.max(0, Math.min(STREET_NAMES.length - 1, idx))];
  }

  function clockText() {
    const total = 18 * 60 + 52 + Math.floor(state.time);
    const day = 1 + Math.floor(total / 1440);
    const mins = total % 1440;
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    return `DAY ${day} · ${hh}:${mm}`;
  }

  function refreshHud() {
    hud.setStars(wanted.stars);
    hud.setMoney(state.money);
    hud.setHealth(player.health, PLAYER.maxHealth);
    hud.setRep(repLevel(), repFrac());
    hud.setClock(clockText());
    const focusPos = player.inCar ? player.inCar.pos : player.pos;
    const d = districtFor(focusPos.x, focusPos.z);
    hud.setDistrict(d.name, d.tag, streetFor(focusPos.x, focusPos.z));
    hud.setPolice(police.units(focusPos), heli.inSight, wanted.stars);
    hud.setNos(state.nosGauge / CAR.nosMax, !!player.inCar);
    const m = missions.current();
    if (m) {
      hud.setMission(m.title, m.text);
      hud.setTimer(m.kind === 'timed' ? missions.timeLeft : null);
      if (m.kind === 'multi') {
        hud.setMissionProgress((missions.index + (missions.stage + 1) / m.stages.length) / MISSIONS.length,
          `STAGE ${missions.stage + 1}/${m.stages.length} · MISSION ${missions.index + 1}/${MISSIONS.length}`);
      } else if (m.kind === 'timed') {
        hud.setMissionProgress((missions.index + 0.5) / MISSIONS.length,
          `MISSION ${missions.index + 1}/${MISSIONS.length} · ${Math.max(0, Math.ceil(missions.timeLeft))}s`);
      } else {
        hud.setMissionProgress(missions.index / MISSIONS.length,
          `MISSION ${missions.index + 1}/${MISSIONS.length}`);
      }
    } else {
      const end = missions.endText();
      hud.setMission(end.title, end.text);
      hud.setTimer(null);
      hud.hideMissionProgress();
    }
    // New mission started: Rico or Nina speaks (not in staged shots — those
    // set their own sticky dialogue).
    if (!state.shotMode && missions.index !== state.lastMissionIndex && !missions.done) {
      state.lastMissionIndex = missions.index;
      showMissionDialogue(missions.index);
    }

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
    const { reward, done, ending } = missions.complete();
    state.money += reward;
    state.rep += 250;
    if (done && ending) audio.stinger();
    else audio.missionDone();
    if (done && ending === 'betray') {
      hud.toast(`DOUBLE-CROSS! +$${reward} — Rico will remember this.`, 3600);
      hud.showDialogue(CREW[DIALOGUE.betray.who], DIALOGUE.betray.text);
    } else if (done && ending === 'loyal') {
      hud.toast(`LOYAL TO THE END! +$${reward} — the city is yours.`, 3600);
      hud.showDialogue(CREW[DIALOGUE.loyal.who], DIALOGUE.loyal.text);
    } else hud.toast(done ? `STORY COMPLETE! +$${reward}` : `Mission complete! +$${reward}`, 3200);
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
    state.rep = 0;
    state.nosGauge = CAR.nosMax;
    state.driftTime = 0;
    state.drifting = false;
    state.lastMissionIndex = -1;
    wanted.reset();
    missions.reset();
    police.clear();
    heli.clear();
    hud.hideDialogue();
    pickups.reset();
    for (const car of parkedCars) { car.parked = true; car.stolen = false; car.owned = false; car.speed = 0; }
    // Golden hour is the default look: low sun, warm haze, long shadows.
    setTimeOfDay('golden');
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

  let exhaustTimer = 0;
  let smokeTimer = 0;

  function stepPlay(dt) {
    state.time += dt;
    const actions = input.takeActions();
    const drag = input.takeDrag();
    if (drag.x !== 0 || drag.y !== 0) render.applyDrag(drag.x, drag.y);
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      hud.toast(muted ? 'Sound muted (M to unmute)' : 'Sound on', 1500);
    }
    if (actions & ACTION_RADIO) {
      state.radioIndex = (state.radioIndex + 1) % RADIO.length;
      hud.setRadio(RADIO[state.radioIndex]);
      audio.click();
      hud.toast(`Radio: ${RADIO[state.radioIndex].station}`, 1600);
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
        // NOS: hold Shift to boost; the gauge drains, then refills.
        const boosting = input.nos() && drive.throttle > 0 && state.nosGauge > 0;
        if (boosting) state.nosGauge = Math.max(0, state.nosGauge - CAR.nosDrain * dt);
        else state.nosGauge = Math.min(CAR.nosMax, state.nosGauge + CAR.nosRefill * dt);
        car.step(dt, drive.throttle, drive.steer, drive.handbrake, colliders, collideCircle, boosting ? 1 : 0);
        // Drift: handbrake + steering at speed pays cash when it ends.
        const driftingNow = drive.handbrake && Math.abs(drive.steer) > 0.3 && Math.abs(car.speed) > 12;
        if (driftingNow) {
          state.drifting = true;
          state.driftTime += dt;
        } else if (state.drifting) {
          state.drifting = false;
          if (state.driftTime > 0.6) {
            const amount = Math.max(50, Math.round(state.driftTime * 50 / 10) * 10);
            state.money += amount;
            state.rep += Math.round(amount / 2);
            hud.floatScore(`DRIFT x${Math.max(1, Math.round(state.driftTime))} +$${amount}`);
            audio.pickup();
          }
          state.driftTime = 0;
        }
        // Near miss: threading past traffic at speed pays $250.
        if (Math.abs(car.speed) > 20) {
          for (const t of traffic.cars) {
            if (t.stolen || t.parked) continue;
            const d = Math.hypot(t.pos.x - car.pos.x, t.pos.z - car.pos.z);
            if (d < 3.6 && state.time - (t._nearMissAt || -99) > 5) {
              t._nearMissAt = state.time;
              state.money += 250;
              state.rep += 100;
              hud.floatScore('NEAR MISS +$250');
              audio.pickup();
            }
          }
        }
        // Exhaust puffs while the throttle is open.
        if (drive.throttle > 0 && Math.abs(car.speed) > 3) {
          exhaustTimer -= dt;
          if (exhaustTimer <= 0) {
            exhaustTimer = 0.09;
            particles.exhaust(car.pos.x, 0, car.pos.z, car.heading);
          }
        }
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
          // Impact sparks + a thump of shake at the point of the punch.
          particles.sparks(player.pos.x + Math.sin(player.heading) * 1.8, 1.2, player.pos.z + Math.cos(player.heading) * 1.8, 10);
          render.shake(0.35);
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
        // Ram impact: sparks + shake at the player's car (or body).
        const at = player.inCar ? player.inCar.pos : player.pos;
        particles.sparks(at.x, 1, at.z, 16);
        render.shake(0.6);
        if (dead) gameOver('wasted');
      },
      () => { if (!player.inCar) gameOver('busted'); });
    wanted.step(dt, state.time - state.lastCrimeAt < 2);

    // PD helicopter at 3+ stars; the ferris wheel turns all the time.
    heli.step(dt, player.inCar ? player.inCar.pos : player.pos, wanted.stars);
    if (ferrisWheel) ferrisWheel.rotation.z += dt * 0.12;

    // Damage smoke once the player is badly hurt.
    if (player.health > 0 && player.health < 40) {
      smokeTimer -= dt;
      if (smokeTimer <= 0) {
        smokeTimer = 0.12;
        const at = player.inCar ? player.inCar.pos : player.pos;
        particles.smoke(at.x, 0, at.z);
      }
    }
    particles.step(dt);

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
    else if (arrival === 'heat') {
      // The vault drill tripped the alarm: the PD is coming.
      wanted.stars = Math.max(wanted.stars, 3);
      state.lastCrimeAt = state.time;
      audio.alarm();
      hud.toast('ALARM TRIPPED! 3 stars — get to the getaway!', 3000);
      if (!state.shotMode) hud.showDialogue(CREW[DIALOGUE.heistHeat.who], DIALOGUE.heistHeat.text);
    } else if (arrival === 'timeout') {
      audio.fail();
      hud.toast('Too slow! Rico gives you one more shot — clock reset.', 3000);
    }

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
      missionTarget2: missions.target2(),
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
      // Winning composition: chase cam behind a pink sports car at sunset,
      // PD cruisers + helicopter in pursuit, dense HUD all visible.
      setTimeOfDay('golden');
      missions.setIndex(2, false);
      const car = traffic.nearestCar(0, 88, 400) || parkedCars[0];
      car.setPose(0, 88, Math.PI);
      car.stolen = true; car.owned = true; car.parked = false; car.speed = 10;
      setCarPaint(car, 0xff5a7a);
      player.inCar = car;
      player.mesh.visible = false;
      wanted.stars = 3;
      state.lastCrimeAt = state.time;
      // Cruisers AHEAD of the chase (north, in the rear-view frame), facing
      // south to intercept — behind-camera spawns read as nothing in a shot.
      police.spawnAt(-9, 58, 0);
      police.spawnAt(9, 42, 0);
      // Helicopter far north: it lerps toward the player's shoulder during
      // the 80 settle frames and ends up high in the frame, in sight.
      // (A chase cam at y~5 only sees the sky above ~+17deg, so the heli
      // must be ~75 units out to sit inside the top edge.)
      heli.place(-14, -400);
      // Traffic witnesses ahead and oncoming.
      const t1 = traffic.cars.find((c) => !c.stolen && !c.parked);
      if (t1) t1.setPose(-5, 52, Math.PI);
      const t2 = traffic.cars.find((c) => !c.stolen && !c.parked && c !== t1);
      if (t2) t2.setPose(6, 30, 0);
      state.shotDrive = { throttle: 0.8, steer: 0 };
      render.setCamYaw(Math.PI);
      render.setCamPitch(0.08);
      render.setCamDist(18);
      // Rico speaks: sticky, so the dialogue is still up when the shot lands.
      hud.showDialogue(CREW[DIALOGUE[2].who], DIALOGUE[2].text, true);
      refreshHud();
    } else if (name === 'mission') {
      // The Meridian heist, mid vault-crack: Jax on foot at the vault door,
      // gold beacon on the vault, a cruiser closing in, golden-hour light.
      setTimeOfDay('golden');
      missions.setIndex(5, false);
      missions.setStage(1);
      player.setPose(97, -44, Math.PI / 2);
      player.mesh.visible = true;
      wanted.stars = 3;
      state.lastCrimeAt = state.time;
      police.spawnAt(88, -72, 0);
      const near = traffic.peds.slice(0, 4);
      const pedSpots = [[90, -38], [108, -50], [94, -56], [110, -36]];
      near.forEach((ped, i) => {
        ped.pos.x = pedSpots[i][0];
        ped.pos.z = pedSpots[i][1];
        ped.mesh.position.set(ped.pos.x, 0, ped.pos.z);
      });
      render.setCamYaw(Math.PI / 2 + Math.PI);
      render.setCamPitch(0.32);
      render.setCamDist(13);
      state.shotMove = { forward: 0, strafe: 0, sprint: false };
      // Nina briefs the vault crack: sticky, so it is up when the shot lands.
      hud.showDialogue(CREW[DIALOGUE[5].who], DIALOGUE[5].text, true);
      refreshHud();
    } else if (name === 'driving') {
      // Golden-hour cruise north up Ocean Drive into the skyline, traffic ahead.
      setTimeOfDay('golden');
      missions.setIndex(2, false);
      const car = traffic.nearestCar(0, 150, 400) || parkedCars[0];
      car.setPose(0, 150, Math.PI);
      car.stolen = true; car.owned = true; car.parked = false; car.speed = 18;
      setCarPaint(car, 0x2e86c1);
      player.inCar = car;
      player.mesh.visible = false;
      wanted.stars = 0;
      const t1 = traffic.cars.find((c) => !c.stolen && !c.parked);
      if (t1) t1.setPose(-3, 118, Math.PI);
      const t2 = traffic.cars.find((c) => !c.stolen && !c.parked && c !== t1);
      if (t2) t2.setPose(4, 84, Math.PI);
      state.shotDrive = { throttle: 1, steer: 0 };
      render.setCamYaw(Math.PI);
      render.setCamPitch(0.3);
      render.setCamDist(19);
      refreshHud();
    } else {
      // start: title screen over a golden-hour skyline.
      setTimeOfDay('golden');
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
        missionStage: missions.stage,
        missionTimeLeft: Math.round(missions.timeLeft),
        missionChoice: missions.choice,
        missionEnding: missions.ending,
        missionTitle: missions.current() ? missions.current().title : 'STORY COMPLETE',
        inCar: !!player.inCar,
        speed: player.inCar ? Math.round(Math.abs(player.inCar.speed) * 2.237) : 0,
        x: Math.round((player.inCar ? player.inCar.pos.x : player.pos.x) * 10) / 10,
        z: Math.round((player.inCar ? player.inCar.pos.z : player.pos.z) * 10) / 10,
        police: police.count(),
        roadblocks: police.roadblocks.length,
        heli: heli.active,
        rep: state.rep,
        repLevel: repLevel(),
        nosGauge: Math.round(state.nosGauge),
        radio: RADIO[state.radioIndex].station,
        pedsDown: traffic.peds.filter((p) => p.down > 0).length,
        cars: traffic.cars.length,
        peds: traffic.peds.length,
      };
    },
  };
}
