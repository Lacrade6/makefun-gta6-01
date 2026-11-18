// Boot: builds the world and pumps the frame loop at fixed 1/60 s steps.
// ?seed=N fixes the city. ?shot=<name>&seed=1 stages a screenshot scene
// instead of the title screen and sets window.__shotReady when the frame is
// settled, so a screenshot driver can capture it.

import { STEP } from './config.js';
import { createWorld } from './world.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
// ?noraf=1: driver hook for automated playtests/screenshots — the page does
// not run its own animation loop; the driver pumps world.frame() manually.
// Without it the software-rendered rAF loop saturates the main thread and
// starves the driver. The shipped game never uses this parameter.

const app = document.getElementById('app');

let world;
try {
  world = createWorld(app, seed);
} catch (error) {
  window.__shotError = String(error && error.message ? error.message : error);
  throw error;
}

// Playtests and screenshot drivers read the live game through this handle.
window.__game = world;

const MAX_FRAME = 0.25;
let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  let guard = 0;
  while (accumulator >= STEP && guard < 5) {
    try {
      world.frame(STEP);
    } catch (error) {
      window.__shotError = String(error && error.message ? error.message : error);
      throw error;
    }
    accumulator -= STEP;
    guard += 1;
  }
  if (guard >= 5) accumulator = 0;
}

if (shot) {
  try {
    stageShot(shot, world);
  } catch (error) {
    window.__shotError = String(error && error.message ? error.message : error);
  }
  // Safety net: never leave a screenshot driver waiting forever.
  setTimeout(() => { if (!window.__shotReady) window.__shotReady = true; }, 15000);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.state.screen === 'play') {
    world.state.screen = 'paused';
    world.hud.showScreen('pauseScreen');
  }
});

if (params.get('noraf') !== '1') requestAnimationFrame(frame);
