# Make GTA 6 — Solmar City: Streets of Gold (v2)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A 3D open-world crime game in the browser, built for [make.fun bounty
`gta6-01`](https://make.fun/bounty/gta6-01) — "Make GTA 6".

You are Jax Marlowe, fresh out of prison and broke in Solmar City — a
sun-soaked bay city where every street pays if you are fast enough. Rico has
a plan: eight jobs, one Meridian Bank heist, one timed run, and a final
choice — stay loyal, or sell him out for twice the cash.

## What is in the game

- **A living city at golden hour** — gradient sky dome with a low sun,
  long real shadows, warm haze, procedural asphalt / sidewalk / grass
  textures, buildings with lit windows that glow at dusk, billboards,
  neon signs, palm trees, a central park and a marina bay.
- **On foot and by car** — walk, sprint, steal any parked or traffic car
  (E), arcade driving with handbrake, traffic (14 cars) and pedestrians
  (26) who flee from danger.
- **Wanted system** — 0–5 stars with pursuing Solmar PD cruisers that ram
  your car and arrest you on foot; at 3+ stars a police helicopter joins
  with a searchlight, at 4+ stars cruisers set roadblocks ahead of you. A
  live POLICE RESPONSE panel names every unit (IBIS-43, GULL-1, …) with its
  distance and behavior — PURSUIT, RAMMING, ROADBLOCK, IN SIGHT. Lay low
  and the heat fades.
- **An 8-mission story** — meet Rico, steal wheels, the bank job, a hot
  pursuit, the big score, then a three-stage **Meridian heist** (case the
  bank, crack the vault while the drill runs, getaway under 3 stars), a
  **90-second timed delivery**, and a branching finale: **loyalty or gold**
  ($5,000 from Rico, $12,000 from the buyer — with consequences). Rico and
  Nina Vale (getaway planner) brief every job in dialogue boxes, including
  a betrayal beat.
- **Driving depth** — NOS boost on Shift with a gauge, drift scoring and
  near-miss bonuses with floating cash text, REP levels that grow as you
  earn, and street cash to grab.
- **Combat & polish** — melee punches (F) with impact sparks and screen
  shake, exhaust puffs, damage smoke, police-ram shake, synthesized
  WebAudio (engine hum, sirens, heist alarm, mission stingers), pulsing
  wanted stars, a cash counter, a mission countdown timer, a radio panel
  (R switches station), district + street labels, a day/time clock, and a
  live circular minimap with gold/red mission beacons.
- **Save / load** — progress saves locally; continue from the title screen.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

## Controls

- **WASD** — move / drive
- **E** — enter / exit car
- **Space** — handbrake
- **F** — melee attack
- **SHIFT** — sprint
- **M** — mute, **P** — pause

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `dossier.json`. The game itself is
plain static files under `game/` (three.js vendored, no network).
