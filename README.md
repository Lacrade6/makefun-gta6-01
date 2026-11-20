# Solmar City — Streets of Gold

A 3D open-world crime game in the browser, built with three.js (vendored).
You play Rico, a driver-for-hire in a golden-hour coastal city. Steal cars,
outrun the police, run jobs for your crew, and pull off the three-stage
Meridian Bank heist — then decide in the finale whether loyalty or gold wins.

## Play

Serve the `game/` folder with any static file server, e.g.:

```
node serve.ts
```

then open http://localhost:8080 in a desktop browser. No network is needed
at runtime; everything is a local file.

## Controls

- WASD — move / drive
- Mouse — orbit camera
- Shift — sprint on foot, NOS boost in a car
- Space — jump on foot, handbrake (drift) in a car
- F — enter / exit a car
- E — interact with mission markers
- Click or J — melee punch
- R — change radio station
- P — save game (also auto-saves after missions)
- Esc — pause

## What's inside

- A full city grid with traffic, pedestrians, landmarks and a marina
- An 8-mission story with crew dialogue and a branching finale
- 0–5 star wanted level, pursuing cruisers, a police helicopter, roadblocks
- Drift and near-miss scoring, REP levels, pickups, particles, screen shake
- Synthesized sound effects and radio music (WebAudio, no audio files)
- HUD with minimap, radio panel and live police-response panel
- Progress saved in the browser (localStorage)

## Layout

- `game/index.html` + `game/src/*.js` — the game (ES modules, no build step)
- `game/vendor/three.min.js` — vendored three.js build
- `main.ts` — submission program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`
- `serve.ts` — tiny static server for local play
- `screenshots/` — staged frames rendered from the game itself
  (cover: the golden-hour police chase; then the vault heist, a skyline
  drive, and the title screen)
