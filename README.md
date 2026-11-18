# Make GTA 6 — open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A 3D open-world crime game in the browser, built for [make.fun bounty
`gta6-01`](https://make.fun/bounty/gta6-01) — "Make GTA 6".

Explore a living city on foot or by car: traffic, pedestrians, a wanted
system with pursuing police, a mission chain with a story, melee combat,
and a HUD with minimap. Your progress saves locally.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

## Controls

- **WASD** — move / drive
- **E** — enter / exit car
- **Space** — jump / handbrake
- **F** — melee attack
- **M** — mute, **P** — pause

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `dossier.json`. The game itself is
plain static files under `game/` (three.js vendored, no network).
