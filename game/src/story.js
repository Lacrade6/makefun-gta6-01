// The crew and their lines. Dialogue pops in the HUD when a mission starts
// (and at the story's turning points) — name, role, portrait initials and one
// story line each. Rico runs the jobs; Nina plans the getaways.

export const CREW = {
  rico: { name: 'RICO', role: 'FIXER', initials: 'R', color: '#c0392b' },
  nina: { name: 'NINA VALE', role: 'GETAWAY PLANNER', initials: 'NV', color: '#2e86c1' },
  jax: { name: 'JAX', role: 'DRIVER', initials: 'J', color: '#f1c40f' },
};

export const DIALOGUE = {
  // keyed by mission index (0-based)
  0: { who: 'rico', text: 'Jax. You\u2019re out. Welcome back to Solmar — the marina, south end. Don\u2019t keep me waiting.' },
  1: { who: 'rico', text: 'You need wheels. Any car on the street — take it. The PD won\u2019t like it. I don\u2019t care.' },
  2: { who: 'rico', text: 'Meridian Bank, east side. Walk in like you own the place. Nina mapped the vault — three seconds on the drill.' },
  3: { who: 'nina', text: 'It went loud! Lose them — Rico\u2019s garage, north-west. I\u2019m watching the PD bands, go GO!' },
  4: { who: 'rico', text: 'One last drop, then we\u2019re rich. North marina. No mistakes, Jax.' },
  5: { who: 'nina', text: 'The big one. Case the bank, crack the vault, then run — PD response is ninety seconds. Don\u2019t be there.' },
  6: { who: 'rico', text: 'Ninety seconds, Jax. The buyer doesn\u2019t wait. Neither do I.' },
  7: { who: 'rico', text: 'Garage or the buyer, Jax. Your call. Just remember who got you out.' },
  betray: { who: 'nina', text: 'You sold him out. Smart. The buyer pays double — and Rico never forgets a face. Drive, Jax. Drive.' },
  loyal: { who: 'rico', text: 'You stayed. Good. We split the take fifty-fifty — Solmar is ours, Jax.' },
  heistHeat: { who: 'nina', text: 'Alarm\u2019s tripped — three stars and a chopper. Lose them and get to the garage!' },
};
