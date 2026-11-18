// Every tuning number for Solmar City in one place. The city is a grid of streets
// spaced GRID apart; blocks between them hold the buildings. All speeds are in
// world units per second; a unit is roughly a metre.

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-city.save.v1';

export const CITY = {
  grid: 44,            // distance between street centrelines
  streets: 9,          // streets each way: -4..4
  roadHalf: 7,         // half-width of a road
  blockHalf: 15,       // half-size of a buildable block
  skyline: 170,        // half-extent of the playable city
};

export const PLAYER = {
  walkSpeed: 7,
  sprintSpeed: 11.5,
  radius: 0.7,
  height: 1.8,
  maxHealth: 100,
  punchRange: 2.4,
  punchDamage: 34,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 38,
  maxReverse: 10,
  steer: 1.9,
  grip: 6.5,
  length: 4.6,
  width: 2.0,
};

export const TRAFFIC = { cars: 14, peds: 26, carSpeed: 9, pedSpeed: 1.6 };

export const POLICE = {
  maxCars: 6,
  accel: 26,
  maxSpeed: 40,
  ramDamage: 9,
  ramCooldown: 1.0,
  arrestRange: 2.2,
};

export const WANTED = {
  decaySeconds: 26,     // quiet seconds before one star fades
  stealStars: 2,        // stealing a car
  punchStars: 1,        // punching a pedestrian
  punchCopStars: 2,     // punching a cop
  killStars: 2,         // knocking someone out
  hitPedStars: 1,       // running a pedestrian over
};

// Money rewards per mission, in dollars.
export const MISSION_REWARDS = [250, 400, 800, 1500, 5000];

export const PALETTE = {
  skyDay: 0x87b5e0,
  skyDusk: 0xff9a52,
  fogDay: 0xa8c4de,
  fogDusk: 0x2a1a3a,
  sunDay: 0xfff2d8,
  sunDusk: 0xff7a33,
  road: 0x2b2f38,
  sidewalk: 0x8d8f96,
  grass: 0x4a7d4a,
};
