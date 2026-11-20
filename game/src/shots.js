// Staged screenshot scenes, selected with ?shot=chase|heist|drive|title.
// The chase frame doubles as the entry cover, so it shows the most systems
// at once: wanted stars, minimap, objective, helicopter and the radio panel.
// Each scene poses the world every frame (via state.shotPose) so a headless
// browser can capture a clean, composed frame of the real game.
import * as THREE from 'three';
import { PLACES } from './config.js';
import { Car } from './vehicles.js';

export function stageShot(name, ctx) {
  const { scene, camera, player, followCam, police, traffic, missions,
    parkedCars, hud, state, particles, startGame } = ctx;

  if (name === 'title') {
    // Leave the title screen up over the orbiting city backdrop.
    state.shotPose = () => {
      camera.position.set(90, 34, 150);
      camera.lookAt(0, 12, -30);
    };
    return;
  }

  startGame(false);
  state.dialogueQueue = [];
  hud.hideDialogue();

  const sport = parkedCars.find((c) => c.isGetawayCar) ?? parkedCars[0];

  function putPlayerInCar(car, x, z, heading, speed) {
    car.pos.set(x, 0, z);
    car.heading = heading;
    car.speed = speed;
    car.vel.set(Math.sin(heading) * speed, 0, Math.cos(heading) * speed);
    car.syncMesh(0);
    player.inCar = car;
    car.driver = 'player';
    player.mesh.visible = false;
    player.pos.copy(car.pos);
    player.heading = heading;
  }

  // Park ambient traffic far away so staged frames stay clean.
  function clearTraffic() {
    traffic.cars.forEach((tc, i) => {
      tc.car.pos.set(-190 + i * 3, 0, -190);
      tc.car.speed = 0;
      tc.car.syncMesh(0);
    });
    traffic.peds.forEach((ped, i) => {
      ped.pos.set(-190 + i * 2, 0, -180);
      ped.mesh.position.copy(ped.pos);
    });
  }

  function spawnCruiser(x, z, heading, speed) {
    const car = new Car(scene, x, z, heading, 0xf0f0f5, 'police');
    car.driver = 'police';
    car.speed = speed;
    car.vel.set(Math.sin(heading) * speed, 0, Math.cos(heading) * speed);
    car.syncMesh(0);
    police.cruisers.push(car);
    return car;
  }

  if (name === 'chase') {
    // Golden-hour police chase down a north-south avenue, heli overhead.
    police.stars = 4;
    missions.index = 4; // vault mission objective on the HUD
    missions.stepIndex = 2;
    missions.placeMarkers();
    const cruisers = [
      spawnCruiser(-4, 60, 0, 30),
      spawnCruiser(4, 52, 0, 32),
      spawnCruiser(0, 72, 0, 28),
    ];
    // Force the helicopter in now.
    police.stars = 4;
    state.shotPose = (t) => {
      clearTraffic();
      const z = 30 + Math.sin(t * 0.05) * 2;
      putPlayerInCar(sport, 0, z, 0, 34);
      sport.nos = 78;
      cruisers[0].pos.set(-3.4, 0, z - 9); cruisers[0].heading = 0.06;
      cruisers[1].pos.set(3.6, 0, z - 13); cruisers[1].heading = -0.05;
      cruisers[2].pos.set(0.4, 0, z - 21); cruisers[2].heading = 0;
      for (const c of cruisers) { c.syncMesh(0); c.flashLights(t); }
      if (police.heli) {
        police.heli.position.set(-11, 19, z + 17);
        police.heli.lookAt(0, 19, z);
        police.heli.userData.rotor.rotation.y += 0.5;
        police.heli.userData.spot.intensity = 900;
      }
      camera.position.set(11, 5.5, z - 15);
      camera.lookAt(-1, 4.5, z + 14);
      hud.setObjective('HEIST III — THE VAULT', 'Escape to the safehouse with the gold', '');
      hud.showDrift('DRIFT +42 REP');
    };
  } else if (name === 'heist') {
    // At the vault annexe door: gold out, alarm up, cruisers rolling in.
    police.stars = 3;
    missions.index = 4;
    missions.stepIndex = 1;
    missions.placeMarkers();
    const vx = PLACES.bank.x;
    const vz = PLACES.bank.z - 34;
    const cruisers = [
      spawnCruiser(vx - 16, vz + 18, Math.PI, 10),
      spawnCruiser(vx + 14, vz + 22, Math.PI, 10),
    ];
    state.shotPose = (t) => {
      clearTraffic();
      player.inCar = null;
      player.mesh.visible = true;
      player.pos.set(vx - 1.5, 0, vz + 4);
      player.heading = Math.PI - 0.4;
      player.animate(0.016, false);
      cruisers[0].pos.set(vx - 9, 0, vz + 11); cruisers[0].heading = Math.PI + 0.5;
      cruisers[1].pos.set(vx + 10, 0, vz + 14); cruisers[1].heading = Math.PI - 0.5;
      for (const c of cruisers) { c.syncMesh(0); c.flashLights(t); }
      if (Math.floor(t * 10) % 3 === 0) particles.gold(vx, 2.4, vz - 2, 3);
      camera.position.set(vx + 3, 3.4, vz + 14);
      camera.lookAt(vx - 0.5, 2.4, vz - 4);
      hud.setObjective('HEIST III — THE VAULT', 'Hold position — June is drilling the vault', 'DRILLING 9s');
    };
  } else if (name === 'drive') {
    // Golden-hour drive into the skyline, NOS lit.
    police.stars = 0;
    missions.index = 1;
    missions.stepIndex = 1;
    missions.placeMarkers();
    state.shotPose = (t) => {
      clearTraffic();
      const z = 120;
      putPlayerInCar(sport, 42, z, Math.PI, 38);
      sport.nos = 64;
      particles.nosFlame(42, 0.55, z + 2.4);
      camera.position.set(35, 3.2, z + 10);
      camera.lookAt(44, 2.6, z - 36);
      hud.setObjective('COURIER RUN', 'Deliver the package to the Palmera Hotel', '42s');
      hud.showDrift('NEAR MISS +8 REP');
    };
  }
}
