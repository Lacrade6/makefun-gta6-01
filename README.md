[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar City — Streets of Gold

A 3D open-world crime game in the spirit of GTA VI, built for the
[make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01).

Solmar City is a golden-hour bay city. You are **Rico**, a driver with one
last score in him. Explore the city on foot or steal any car on the street,
outrun the Solmar PD through five wanted stars, and play through an
eight-mission story: the three-stage Meridian Bank heist, a timed delivery
across town, and a branching finale where you choose **loyalty or gold**.

## What is in the game

- A full open world: a gridded coastal city with traffic, pedestrians, a
  beach and a bay, all lit by a low golden sun.
- Driving with NOS boost, drift scoring and near-miss scoring; REP levels
  that rise with stunts and missions.
- A 0–5 star wanted system: police cruisers that chase and ram, a police
  helicopter from 3 stars, and roadblocks from 4 stars.
- Melee combat on foot, pickups (cash, health, NOS), particles, screen
  shake and fully synthesized sound — engine, sirens, radio stations.
- A HUD with health, wanted stars, speed, REP, a live minimap, a radio
  panel and a live police-response panel.
- Save and continue from the title screen (progress lives in the browser).

## The story — eight missions

1. **First Wheels** — steal a car and bring it to Mara's garage.
2. **The Getaway** — three checkpoints with two stars on your tail.
3. **Meridian: The Inside Man** — walk into the bank on foot and wait for the signal.
4. **Meridian: The Vault** — hold the bank floor for 25 seconds, then grab the bags.
5. **Meridian: The Split** — drive the loot home under a three-star chase.
6. **Rush Hour** — three deliveries in 100 seconds.
7. **The Informant** — tail the grey sedan, then have a word with him.
8. **Loyalty or Gold** — the finale. Defend the crew, or take the stash and run.

## Controls

- **W / A / S / D** — move / drive (on foot: walk, **Shift** to sprint)
- **Mouse** — look around (click the game to lock the pointer)
- **E** — enter / exit a car (stand next to one)
- **Space** — handbrake / drift (in a car), jump (on foot)
- **Shift** — NOS boost (in a car)
- **F** — punch (on foot)
- **M** — next mission / **P** — pause · **R** — restart a failed mission
- **1 / 2** — choose in the finale · **H** — toggle radio

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Static files only: `game/index.html` and its ES modules, with three.js
vendored under `game/vendor/`. No network request at runtime.
