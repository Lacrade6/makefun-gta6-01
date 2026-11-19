// Keyboard and mouse input. One object owns every key the game reads, plus
// pointer-lock mouse look. Keys are read by code ('KeyW'), never by the
// character they print, so layouts do not matter.

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.anyKey = false;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      this.anyKey = true;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
    };
    this._onMouse = (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    };
    this._onLock = () => {
      this.locked = document.pointerLockElement === document.body;
    };
    this._onBlur = () => {
      this.down.clear();
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLock);
    window.addEventListener('blur', this._onBlur);
    document.body.addEventListener('click', () => {
      if (!this.locked && document.body.requestPointerLock) {
        document.body.requestPointerLock();
      }
    });
  }

  isDown(code) {
    return this.down.has(code);
  }

  // True once, on the frame the key went down. Cleared every frame by the
  // main loop after the game has read the input.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.anyKey = false;
  }

  // Drop every held key (used when the game loses focus or changes state).
  reset() {
    this.down.clear();
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  // Steering / throttle in -1..1, built from the held keys.
  steerAxis() {
    const left = this.isDown('KeyA') || this.isDown('ArrowLeft');
    const right = this.isDown('KeyD') || this.isDown('ArrowRight');
    return (left ? -1 : 0) + (right ? 1 : 0);
  }

  throttleAxis() {
    const fwd = this.isDown('KeyW') || this.isDown('ArrowUp');
    const back = this.isDown('KeyS') || this.isDown('ArrowDown');
    return (fwd ? 1 : 0) + (back ? -1 : 0);
  }
}
