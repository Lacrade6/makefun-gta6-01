// The story of Solmar City: Rico, his crew, and the Meridian Bank job.
// Eight missions. The data is plain: each mission is a title, a briefing
// told in crew dialogue, and a list of steps the mission engine runs.
// Nothing here names a real game, a real place or a real person.

export const CREW = {
  RICO: 'Rico',
  MARA: 'Mara',
  DEX: 'Dex',
  LUZ: 'Luz',
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'Mission 1 — First Wheels',
    reward: 300,
    briefing: [
      { who: 'Mara', text: 'Rico. You are back in Solmar and you have no car, no cash and no crew. Fix the first one.' },
      { who: 'Rico', text: 'The street provides. Always has.' },
      { who: 'Mara', text: 'Take any car on the road — E next to it — and bring it to my garage. Try not to scratch the paint.' },
      { who: 'Dex', text: 'And Rico? Welcome home. The city missed you.' },
    ],
    steps: [
      { kind: 'steal', text: 'Steal a car — stand next to one and press E', sub: 'Any car on the street will do' },
      { kind: 'goto', at: 'hideout', r: 8, inCar: true, text: 'Drive to Mara’s garage', sub: 'Follow the gold marker' },
    ],
  },
  {
    id: 'the-getaway',
    title: 'Mission 2 — The Getaway',
    reward: 500,
    briefing: [
      { who: 'Dex', text: 'The PD towed my ride and I need it back before they strip it. You drive, I handle the rest.' },
      { who: 'Rico', text: 'What is the catch?' },
      { who: 'Dex', text: 'The catch is the two stars you will earn doing it. Hit all three checkpoints and do not stop for anyone.' },
    ],
    steps: [
      { kind: 'goto', at: { x: -108, z: -108 }, r: 7, inCar: true, text: 'Reach checkpoint 1 of 3', sub: 'The law is already on its way' },
      { kind: 'goto', at: { x: 108, z: -162 }, r: 7, inCar: true, text: 'Reach checkpoint 2 of 3', sub: 'Keep it moving' },
      { kind: 'goto', at: { x: 162, z: 108 }, r: 7, inCar: true, text: 'Reach checkpoint 3 of 3', sub: 'Last one — the marina' },
    ],
    onStart: 'wanted2',
  },
  {
    id: 'inside-man',
    title: 'Mission 3 — Meridian: The Inside Man',
    reward: 600,
    briefing: [
      { who: 'Luz', text: 'Meridian Bank keeps its vault on a timer. The guard rotation changes at sunset — that is our window.' },
      { who: 'Mara', text: 'Walk in like you belong there, Rico. On foot. No car at the door, no attention.' },
      { who: 'Luz', text: 'Reach the front steps and wait for my signal. Then we go loud.' },
    ],
    steps: [
      { kind: 'goto', at: 'bank', r: 9, onFoot: true, text: 'Walk to Meridian Bank', sub: 'On foot — do not arrive in a stolen car' },
      { kind: 'hold', at: 'bank', r: 9, time: 6, text: 'Wait for Luz’s signal', sub: 'Stay on the steps' },
    ],
  },
  {
    id: 'the-vault',
    title: 'Mission 4 — Meridian: The Vault',
    reward: 1200,
    briefing: [
      { who: 'Dex', text: 'The vault door is open and the clock is running. Twenty seconds of noise and we are rich.' },
      { who: 'Mara', text: 'Hold the floor, Rico. Anything in a uniform that walks through that door is your problem.' },
      { who: 'Rico', text: 'Twenty seconds. Then we take the gold and run.' },
    ],
    steps: [
      { kind: 'hold', at: 'bank', r: 12, time: 20, text: 'Hold the bank floor — 20 seconds', sub: 'Do not leave the gold marker' },
      { kind: 'goto', at: { x: 0, z: 81 }, r: 6, text: 'Grab the bags and get to the alley', sub: 'The vault is empty. Time to move.' },
    ],
    onStart: 'wanted3',
  },
  {
    id: 'the-split',
    title: 'Mission 5 — Meridian: The Split',
    reward: 1500,
    briefing: [
      { who: 'Mara', text: 'The bags are in the trunk. The whole city is looking for us. Drive them home, Rico — the garage, not the beach.' },
      { who: 'Dex', text: 'Three stars and a helicopter. Drive like the gold is yours. Because it is.' },
      { who: 'Rico', text: 'Then we split it and disappear.' },
    ],
    steps: [
      { kind: 'goto', at: 'hideout', r: 8, inCar: true, text: 'Drive the loot to the garage', sub: 'Three stars on your tail — do not stop' },
    ],
    onStart: 'wanted3',
  },
  {
    id: 'rush-hour',
    title: 'Mission 6 — Rush Hour',
    reward: 900,
    briefing: [
      { who: 'Luz', text: 'A client paid double for a sunset delivery: three drops, one hundred seconds, no excuses.' },
      { who: 'Mara', text: 'Golden hour traffic is the worst in the city. Cut through it, Rico. NOS is your friend.' },
      { who: 'Rico', text: 'Three drops. One hundred seconds. Watch me.' },
    ],
    steps: [
      { kind: 'timed', at: { x: -162, z: 162 }, r: 7, inCar: true, time: 100, text: 'Drop 1 of 3 — the west docks', sub: '100 seconds for all three drops' },
      { kind: 'timed', at: { x: 108, z: 162 }, r: 7, inCar: true, time: 100, text: 'Drop 2 of 3 — the boardwalk', sub: 'Keep the clock in mind' },
      { kind: 'timed', at: { x: -108, z: -162 }, r: 7, inCar: true, text: 'Drop 3 of 3 — the north gate', sub: 'Last drop — make it count' },
    ],
  },
  {
    id: 'the-informant',
    title: 'Mission 7 — The Informant',
    reward: 1100,
    briefing: [
      { who: 'Dex', text: 'Someone talked to the PD about the Meridian job. A grey sedan is running the same loop around the plaza — that is our rat.' },
      { who: 'Mara', text: 'Tail him. Close enough to see him, far enough that he never sees you. Then, when he stops, have a word.' },
      { who: 'Rico', text: 'He will talk. They always talk.' },
    ],
    steps: [
      { kind: 'tail', time: 40, text: 'Tail the grey sedan — stay 12 to 30 metres back', sub: 'Too close and he spots you. Too far and you lose him.' },
      { kind: 'goto', at: 'marked', r: 5, onFoot: true, text: 'Confront the informant — on foot', sub: 'He stopped at the plaza. Go and have that word.' },
    ],
    onStart: 'markedCar',
  },
  {
    id: 'loyalty-or-gold',
    title: 'Mission 8 — Loyalty or Gold',
    reward: 5000,
    briefing: [
      { who: 'Mara', text: 'It comes down to this, Rico. The crew or the gold. You cannot carry both out of this city.' },
      { who: 'Dex', text: 'The stash is at the marina. Five stars between you and it. Take it and you are rich and alone.' },
      { who: 'Luz', text: 'Or stay. The PD is coming for the garage and the crew is all we have. Choose, Rico.' },
    ],
    steps: [
      {
        kind: 'choice',
        text: 'Choose: LOYALTY or GOLD?',
        sub: 'Press 1 to stand with the crew — press 2 to take the gold',
        options: [
          { key: '1', label: 'LOYALTY — defend the garage' },
          { key: '2', label: 'GOLD — steal the stash at the marina' },
        ],
      },
    ],
    branches: {
      loyalty: [
        { kind: 'defend', at: 'hideout', r: 16, time: 45, text: 'Defend the garage — hold for 45 seconds', sub: 'The crew is counting on you' },
      ],
      gold: [
        { kind: 'goto', at: 'marina', r: 8, text: 'Reach the stash at the marina', sub: 'Five stars. No turning back.' },
        { kind: 'timed', at: { x: -216, z: -216 }, r: 9, time: 120, text: 'Escape to the north-west gate', sub: '120 seconds — vanish with the gold' },
      ],
    },
    onStart: 'wanted0',
  },
];

export const FINALE_TEXT = {
  loyalty: [
    { who: 'Mara', text: 'You stayed. That is worth more than gold, Rico.' },
    { who: 'Rico', text: 'The crew is the gold. Always was.' },
    { who: 'Dex', text: 'Solmar City is ours. Streets of gold — and we walk them together.' },
  ],
  gold: [
    { who: 'Rico', text: 'The stash is mine. The city is behind me now.' },
    { who: 'Luz', text: 'Rich and alone, Rico. That is a choice you will carry.' },
    { who: 'Rico', text: 'Streets of gold. All of it mine.' },
  ],
};
