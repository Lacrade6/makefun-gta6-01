// Crew dialogue for the eight-mission story. Speakers: RICO (you), MARA
// (planner), DEX (wheelman), JUNE (hacker).

export const INTRO = [
  { who: 'MARA', text: 'Rico. You’re late. Solmar runs on two things: sunshine and other people’s money. Tonight we take the second kind.' },
  { who: 'RICO', text: 'I drive, Mara. I don’t do speeches. What’s the job?' },
  { who: 'MARA', text: 'The Meridian Bank vault. Three stages: case it, stage the getaway car, then we go in. But first — prove you can still drive.' },
  { who: 'DEX', text: 'Grab any car off the street and bring it to my garage. Show me the old Rico.' },
];

export const MISSION_DIALOGUE = {
  firstWheels: {
    start: [
      { who: 'DEX', text: 'Any car, Rico. F-key to get in. Just don’t scratch it too much.' },
    ],
    done: [
      { who: 'DEX', text: 'Ha! Still got it. That’ll do for a burner. Mara’s got something bigger brewing.' },
    ],
  },
  courier: {
    start: [
      { who: 'JUNE', text: 'Package at the Sunset Diner, needs to reach the Palmera Hotel. Clock’s ticking — the buyer hates waiting.' },
      { who: 'RICO', text: 'What’s in the package?' },
      { who: 'JUNE', text: 'Never ask, Rico. Just drive fast.' },
    ],
    done: [
      { who: 'JUNE', text: 'Delivered with time to spare. The buyer paid in full. You’re earning your cut of the vault already.' },
    ],
    fail: [
      { who: 'JUNE', text: 'Too slow. The buyer walked. Run it again — and this time, use the NOS.' },
    ],
  },
  casing: {
    start: [
      { who: 'MARA', text: 'Heist stage one: case the Meridian Bank. Walk the three points I marked — front, side, and the vault annexe. No heat, no noise.' },
    ],
    done: [
      { who: 'MARA', text: 'Cameras, guard rotation, vault door timing — all mapped. June has what she needs. Stage two next.' },
    ],
  },
  getaway: {
    start: [
      { who: 'DEX', text: 'Stage two: I need a fast car stashed by the bank. There’s a sports car parked near Club Aurum. Bring it to the alley behind the bank — and lose any heat on the way.' },
    ],
    done: [
      { who: 'DEX', text: 'She’s fueled and waiting. When the vault opens, this is our ticket out.' },
    ],
  },
  vault: {
    start: [
      { who: 'MARA', text: 'Stage three. Tonight we take the vault. Get to the annexe door, hold position while June drills, grab the gold, and get to the safehouse.' },
      { who: 'JUNE', text: 'The drill takes time and the alarm WILL trip. Expect company, Rico.' },
      { who: 'RICO', text: 'Then I’d better drive like the city owes me money.' },
    ],
    done: [
      { who: 'MARA', text: 'The gold is ours. Every bar of it. Now we decide what kind of crew we are…' },
    ],
  },
  heatwave: {
    start: [
      { who: 'DEX', text: 'The whole SCPD is looking for the bank crew. Lay low: get wanted, then lose them completely. Show me you can disappear.' },
    ],
    done: [
      { who: 'DEX', text: 'Ghost. The precinct’s got nothing. Now the hard part — the money.' },
    ],
  },
  stuntMoney: {
    start: [
      { who: 'JUNE', text: 'A streaming crew pays for street footage. Drift and near-miss your way to a REP quota and they wire us cash, no questions.' },
    ],
    done: [
      { who: 'JUNE', text: 'The clip is everywhere. Solmar knows your name now, Rico. Time to finish this.' },
    ],
  },
  finale: {
    start: [
      { who: 'MARA', text: 'Last job, Rico. The gold sits in the safehouse. Bring it to the crew at the warehouse — we split it fair, like family. That’s loyalty.' },
      { who: 'DEX', text: 'Or… the boat at the marina is fueled. Take it all and sail. Nobody would blame you. That’s gold.' },
      { who: 'RICO', text: 'One city. One choice. Let’s see who I am.' },
    ],
  },
};

export const ENDINGS = {
  loyalty: {
    title: 'ENDING: FAMILY FIRST',
    text: 'Rico splits the Meridian gold four ways at the pier warehouse. Mara buys the Palmera’s rooftop bar, Dex opens a real garage, June vanishes into a beach house with fibre internet. And Rico? Rico still drives Solmar at golden hour — but now the streets of gold belong to the whole crew.',
  },
  gold: {
    title: 'ENDING: STREETS OF GOLD',
    text: 'Rico loads every bar onto the marina boat and points it at the horizon. The crew will forgive him eventually — or they won’t. Either way, the sun sets on Solmar City behind him, and for the first time in his life, Rico owes nobody anything.',
  },
};

export const BUSTED_LINES = [
  { who: 'SCPD', text: 'You’re under arrest, Rico. The crew’s lawyer gets you out by morning — but it costs you.' },
];

export const WASTED_LINES = [
  { who: 'MARA', text: 'Solmar General patched you up. Try not to die on my time again.' },
];

export const FREE_ROAM_TIPS = [
  { who: 'JUNE', text: 'Free roam tip: drift corners and near-miss traffic to earn REP.' },
  { who: 'DEX', text: 'Free roam tip: NOS canisters glow blue. Top up before a chase.' },
  { who: 'MARA', text: 'Free roam tip: lose the SCPD by breaking line of sight for a while.' },
];
