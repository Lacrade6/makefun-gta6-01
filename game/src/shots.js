// The screenshot scenes behind ?shot=<name>&seed=1. Each one stages the real
// game — no fake renders: the cover is a live police chase at dusk, the
// mission shot is the player on foot at the marina marker, the driving shot is
// a daytime cruise through traffic, and the start shot is the title screen
// over a dusk skyline. The world stages the state; main.js runs the loop
// until window.__shotReady is set.

export const SHOT_NAMES = ['cover', 'mission', 'driving', 'start'];

/** Stage `name` on the world; unknown names fall back to the title screen. */
export function stageShot(name, world) {
  if (!SHOT_NAMES.includes(name)) return world.stageShot('start');
  return world.stageShot(name);
}
