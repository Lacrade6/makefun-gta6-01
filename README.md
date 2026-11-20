# Solmar City — Streets of Gold
[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![make.fun rank](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun reward](https://make.fun/badge/gta6-01/Lacrade6/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

Entry for the [make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01).

Solmar City — Streets of Gold is a 3D open-world crime game that runs entirely in the browser using three.js vendored locally, so it works fully offline. You play as Rico, a driver-for-hire trying to make his name in a sun-soaked coastal city at golden hour. Steal cars, shake off the police, take on jobs for your crew, work your way up to a three-stage Meridian Bank heist, and in the branching finale decide whether loyalty or gold matters more.

## Play

Run `node serve.ts` and open http://localhost:8080 in your browser. You can also serve the `game/` folder with any static file server. There is no build step and no network connection is required.

## Features

- An eight-mission story arc with crew dialogue driving the plot forward
- A living open world filled with moving traffic and wandering pedestrians
- Cars you can steal and drive on the fly
- A 0–5 star wanted system featuring police cruisers, a helicopter, and roadblocks
- NOS boost, drift handling, near-miss scoring, and REP levels to climb
- Melee combat and collectible pickups scattered around the city
- A full HUD showing health, wanted stars, speed, REP, your current mission objective, a live minimap, and radio controls
- Progress saved automatically in the browser
- Synthesized sound effects generated in code — no audio files needed

## Controls

Drive and walk with the keyboard using WASD or the arrow keys. Follow the on-screen prompts in game for mission-specific actions.

## License

MIT (see LICENSE).

## Submission

`main.ts` (Node 22) copies `game/` and `screenshots/` to the output directory and writes `dossier.json`. Set `MAKEFUN_OUTPUT_DIR` to override the output path when running outside the grader.
