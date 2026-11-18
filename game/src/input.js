// Keyboard + mouse input. Keys are tracked by code; mouse drag orbits the camera.
// Also exposes edge-triggered "pressed" actions (E, F, P, M) consumed once per frame.

export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_CONFIRM = 16;
export const ACTION_RADIO = 32;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let dragX = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragY = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'KeyE') pressed.add(ACTION_ENTER);
    if (event.code === 'KeyF') pressed.add(ACTION_PUNCH);
    if (event.code === 'KeyP' || event.code === 'Escape') pressed.add(ACTION_PAUSE);
    if (event.code === 'KeyM') pressed.add(ACTION_MUTE);
    if (event.code === 'KeyR') pressed.add(ACTION_RADIO);
    if (event.code === 'Enter' || event.code === 'Space') pressed.add(ACTION_CONFIRM);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  }
  function onKeyUp(event) { keys.delete(event.code); }
  function onMouseDown(event) { dragging = true; lastX = event.clientX; lastY = event.clientY; }
  function onMouseMove(event) {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    dragY += event.clientY - lastY;
    lastX = event.clientX; lastY = event.clientY;
  }
  function onMouseUp() { dragging = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** Forward/strafe input in -1..1, camera-relative. */
    move() {
      let f = 0, s = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
      return { forward: f, strafe: s, sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    drive() {
      let throttle = 0, steer = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) throttle += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) throttle -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) steer -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) steer += 1;
      return { throttle, steer, handbrake: keys.has('Space') };
    },
    /** Pixels the mouse dragged since last read; resets each frame. */
    takeDrag() {
      const out = { x: dragX, y: dragY };
      dragX = 0; dragY = 0;
      return out;
    },
    /** NOS boost held (Shift) — only meaningful while driving. */
    nos() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    takeActions() {
      let bits = 0;
      for (const bit of pressed) bits |= bit;
      pressed.clear();
      return bits;
    },
    isDown(code) { return keys.has(code); },
  };
}
