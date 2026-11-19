// Solmar City tuning constants. One place for every number the game
// balances on, so a playtest can retune the feel without hunting through
// the systems that use them.

export const CFG = {
  // City layout: a square grid of roads and blocks, bay on the east side.
  city: {
    half: 252,            // city spans -252..252 on x and z
    pitch: 54,            // distance between parallel road centre lines
    roadWidth: 14,
    blockSize: 40,
    beachX: 196,          // sand starts here
    waterX: 214,          // open water starts here
    buildingFloors: [2, 3, 4, 5, 6, 8, 10, 14],
  },
  // Golden-hour look.
  sky: {
    top: 0x2e4a7a,
    horizon: 0xff9a3c,
    sun: 0xffd27a,
    fog: 0xf2a35e,
    fogNear: 120,
    fogFar: 620,
  },
  player: {
    walkSpeed: 7,
    runSpeed: 11.5,
    turnSpeed: 9,
    health: 100,
    punchDamage: 34,
    punchRange: 2.6,
    punchArc: 1.1,
  },
  car: {
    accel: 26,
    brake: 42,
    reverseAccel: 16,
    maxSpeed: 46,         // ~103 mph at the speedometer scale
    maxReverse: 12,
    steer: 1.9,
    grip: 6.5,
    driftGrip: 2.2,
    nosAccel: 22,
    nosMax: 100,
    nosDrain: 34,
    nosRegen: 5,
    damagePerHit: 9,
  },
  traffic: {
    cars: 22,
    peds: 26,
    carSpeed: [9, 15],
    pedSpeed: [1.1, 2.2],
  },
  police: {
    maxCruisers: 6,
    chaseSpeed: 40,
    ramDamage: 7,
    ramCooldown: 0.9,
    heliAtStars: 3,
    roadblockAtStars: 4,
    heatPerCrime: 1,
    decayPerSec: 0.055,
    bustRadius: 3.2,
  },
  rep: {
    driftPerSec: 12,
    nearMiss: 25,
    mission: 150,
    levelStep: 220,
    punchRep: 5,
  },
  camera: {
    carDistance: 11,
    carHeight: 4.4,
    footDistance: 7.5,
    footHeight: 3.2,
    lookSpeed: 0.0026,
  },
  keys: {
    forward: 'KeyW',
    back: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    run: 'ShiftLeft',
    nos: 'ShiftLeft',
    brake: 'Space',
    enter: 'KeyE',
    punch: 'KeyF',
    mission: 'KeyM',
    pause: 'KeyP',
    restart: 'KeyR',
    radio: 'KeyH',
    choice1: 'Digit1',
    choice2: 'Digit2',
  },
};
