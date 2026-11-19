// Screenshot staging: ?shot=chase|heist|drive|title in the page URL puts
// the game into a staged scene for the cover and the other screenshots.
// Each stage starts the matching mission so the HUD shows its objective,
// places Rico, the cars and the police, and points the camera. The
// screenshot tool waits for window.__shotReady, which the main loop sets
// once the scene has settled.

import { Car } from './vehicles.js';

export const SHOTS = ['chase', 'heist', 'drive', 'title'];

export function stageShot(game, name) {
  const player = game.player;
  const police = game.police;
  const city = game.city;
  const bank = city.landmarks.bank;
  const hideout = city.landmarks.hideout;

  const putPlayerInCar = (x, z, heading, speed) => {
    const car = new Car(game.scene, x, z, heading, 0xc23b3b);
    car.speed = speed;
    player.enterCar(car);
    player.car = car;
    game.stolenCar = car;
    return car;
  };

  if (name === 'chase') {
    // Golden-hour police chase: Rico fleeing down Ocean Drive with three
    // cruisers on his tail and the helicopter overhead.
    putPlayerInCar(-54, 120, 0, 34);
    player.car.nos = 80;
    game.missions.startMission(1);
    police.setWanted(3);
    // Stage the pursuit in-frame: the helicopter holds low and close
    // ahead of Rico, and a cruiser pulls alongside on his right.
    police.heliOrbit = { r: 14, y: 26 };
    const escort = police._spawnCruiser(-47, 134);
    escort.heading = 0;
    escort.speed = 30;
    game.camYaw = 0;
    game.time = 0;
  } else if (name === 'heist') {
    // The vault job: Rico on foot on the bank steps, crew beside him,
    // cruisers closing in. He stands at the steps' east end and the camera
    // sits southeast on the road, so the frame holds Rico, the gold marker,
    // the bank's south face and the street in perspective — a head-on shot
    // is all wall, the street is too narrow to pull back.
    player.x = bank.x + 9;
    player.z = bank.z + 19;
    player.heading = Math.PI;
    player.mesh.position.set(player.x, 0, player.z);
    player.mesh.rotation.y = player.heading;
    police.setWanted(2);
    game.missions.startMission(3);
    game.camYaw = -Math.PI * 0.75;
    game.shotCamDist = 16;
    game.shotCamHeight = 5;
  } else if (name === 'drive') {
    // A golden-hour drive west down the coastal road into the skyline.
    // The car sits ON the road (z = -108 is a road line), heading for the
    // city centre, so the frame is road and towers, not bare ground.
    putPlayerInCar(180, -108, -Math.PI / 2, 26);
    game.missions.startMission(5);
    game.camYaw = -Math.PI / 2;
  } else {
    // Title: the camera drifts over the skyline while the menu shows.
    game.camYaw = 0.6;
  }
  game.shotName = name;
}
