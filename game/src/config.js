// Solmar City — shared configuration: world layout, locations, tuning.

// The city is a square grid of blocks. Roads run along every block edge.
export const WORLD = {
  half: 210,          // playable extent: -210..210 on both axes
  block: 42,          // distance between parallel roads
  roadWidth: 12,      // asphalt width
  sidewalk: 3.2,      // pedestrian lane offset from a road centre
};

// Named places the story and HUD refer to. Coordinates sit on road crossings
// or block centres so markers are always reachable.
export const PLACES = {
  safehouse:  { name: 'Rico’s Safehouse', x: -168, z: 168 },
  garage:     { name: 'Dex’s Garage',     x: -126, z: 84 },
  bank:       { name: 'Meridian Bank',    x: 0,    z: -42 },
  bankVault:  { name: 'Bank Vault',       x: 0,    z: -63 },
  marina:     { name: 'Solmar Marina',    x: 84,   z: 198 },
  hotel:      { name: 'Palmera Hotel',    x: 126,  z: -84 },
  diner:      { name: 'Sunset Diner',     x: -84,  z: -126 },
  tower:      { name: 'Meridian Tower',   x: 42,   z: -168 },
  club:       { name: 'Club Aurum',       x: 168,  z: 42 },
  warehouse:  { name: 'Pier Warehouse',   x: 168,  z: 168 },
  hospital:   { name: 'Solmar General',   x: -168, z: -84 },
  precinct:   { name: 'SCPD Precinct',    x: -42,  z: 42 },
};

export const PLAYER_TUNE = {
  walkSpeed: 6.2,
  sprintSpeed: 10.5,
  jumpVelocity: 7.5,
  gravity: 22,
  healthMax: 100,
};

export const CAR_TUNE = {
  accel: 16,
  brake: 26,
  reverseMax: 9,
  topSpeed: 42,
  nosBoost: 22,
  nosDrain: 26,       // per second while boosting
  nosRegen: 5,        // per second while not boosting
  steerRate: 2.1,
  grip: 7.5,          // lateral velocity damping (drift when handbrake)
  driftGrip: 1.6,
};

export const POLICE_TUNE = {
  maxStars: 5,
  bustRadius: 7,
  bustTime: 3.2,      // seconds inside the ring at low speed -> busted
  cruiserTopSpeed: 40, // cruisers are quick but a sports car can outrun them
  decayDelay: 6,      // seconds unseen before stars start dropping
  decayPerStar: 9,    // seconds per star dropped while unseen
  heliStars: 3,       // helicopter joins at this wanted level
  roadblockStars: 4,  // roadblocks appear at this wanted level
};

export const REP_TITLES = [
  'Rookie', 'Lookout', 'Runner', 'Wheelman', 'Enforcer',
  'Fixer', 'Shot Caller', 'Kingpin', 'Legend of Solmar',
];

export function repTitle(rep) {
  const level = Math.min(REP_TITLES.length - 1, Math.floor(rep / 120));
  return { level, title: REP_TITLES[level] };
}

// Golden-hour palette used across the city.
export const PALETTE = {
  sky: 0xffb37a,
  fog: 0xf7a56b,
  sun: 0xffd9a0,
  asphalt: 0x3a3f4a,
  sidewalk: 0x9b8f83,
  sand: 0xe8cf9f,
  water: 0x2e7fa8,
  buildings: [0xf2d5b8, 0xe8a2b4, 0xa8c8e8, 0xf7e3a1, 0xb8e0c8, 0xd8b8e8, 0xf5f0e6, 0xe88f6b],
  carPaint: [0xd83a3a, 0x3a6fd8, 0xf2c230, 0x37b86b, 0xe8e8e8, 0x2b2b33, 0xff7ab8, 0x7a4fd8, 0x30c8c0, 0xf07f2e],
};
