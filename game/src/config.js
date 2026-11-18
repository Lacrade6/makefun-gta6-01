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
  nosBoost: 1.45,   // NOS top-speed multiplier while Shift is held
  nosDrain: 32,     // gauge points per second while boosting
  nosRefill: 9,     // gauge points per second while not boosting
  nosMax: 100,
};

// Solmar PD unit callsigns, handed out in order as cruisers spawn.
export const CALLSIGNS = ['IBIS-43', 'GULL-1', 'COQUINA 2-1', 'PALM-7', 'HERON-12', 'EGRET-5', 'OSPREY-9', 'PELICAN-3'];

// Radio stations for the HUD radio panel (synthwave display; R switches).
export const RADIO = [
  { station: 'SOLMAR FM 97.5', track: 'Neon Drive', artist: 'Midnight Mirage' },
  { station: 'WAVE 88.1', track: 'Coral Sunset', artist: 'The Palms' },
  { station: 'RADIO SOL 101.9', track: 'Golden Hour', artist: "Rico's Revenge" },
  { station: 'CORAL 88.1', track: 'Night Swim', artist: 'Velvet Static' },
];

// District labels by map quadrant, shown with a street name in the HUD.
export const DISTRICTS = [
  { name: 'OCEAN DRIVE', tag: 'Sun, sand and fast cars on the strip', test: (x, z) => z >= 132 },
  { name: 'NORTH MARINA', tag: 'Yachts, buyers and bad decisions', test: (x, z) => z <= -132 },
  { name: 'MERIDIAN', tag: 'Bank district — glass, gold and alarms', test: (x, z) => x >= 88 },
  { name: 'WESTSIDE', tag: "Rico's turf — garages and pawn shops", test: (x, z) => x <= -88 },
  { name: 'SOLMAR PARK', tag: 'The green heart of the city', test: (x, z) => Math.abs(x) < 22 && Math.abs(z) < 22 },
  { name: 'DOWNTOWN SOLMAR', tag: 'Every street pays if you are fast enough', test: () => true },
];
export const STREET_NAMES = ['Harbor Blvd', 'Coral Ave', 'Palm Row', 'Sunset Blvd', 'Ocean Drive', 'Marina Way', 'Gold St', 'Rico Ave', 'Northgate'];


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

// Money rewards per mission, in dollars. Mission 8 pays by choice:
// $5,000 loyal to Rico, $12,000 for the double-cross (see missions.js).
export const MISSION_REWARDS = [250, 400, 800, 1500, 5000, 6000, 3500, 5000];
export const MISSION_8_BETRAY_REWARD = 12000;

export const PALETTE = {
  skyDay: 0x87b5e0,
  skyDusk: 0xff9a52,
  skyGolden: 0xffb36b,
  fogDay: 0xa8c4de,
  fogDusk: 0x2a1a3a,
  fogGolden: 0xe08a4e,
  sunDay: 0xfff2d8,
  sunDusk: 0xff7a33,
  sunGolden: 0xffb347,
  road: 0x2b2f38,
  sidewalk: 0x8d8f96,
  grass: 0x4a7d4a,
};
