// Melee combat on foot: punch peds and officers, with wanted consequences.
import { dist2d, angleDelta } from './rand.js';

export class Combat {
  constructor() {
    this.cooldown = 0;
    this.punchesLanded = 0; // lifetime stat for the pause screen
  }

  // Returns {hit:'ped'|'cop'|null, knockedOut:boolean}
  tryPunch(dt, player, peds, cruisers, wantPunch) {
    this.cooldown -= dt;
    if (!wantPunch || this.cooldown > 0 || player.inCar) {
      return { hit: null, knockedOut: false };
    }
    this.cooldown = 0.38;
    player.punch();

    const reach = 1.9;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    const inArc = (x, z) => {
      const dx = x - player.pos.x;
      const dz = z - player.pos.z;
      if (Math.hypot(dx, dz) > reach) return false;
      const ang = Math.atan2(dx, dz);
      return Math.abs(angleDelta(player.heading, ang)) < 1.1
        && (dx * fx + dz * fz) > 0;
    };

    for (const ped of peds) {
      if (ped.state === 'down') continue;
      if (inArc(ped.pos.x, ped.pos.z)) {
        const out = ped.hit(16);
        return { hit: 'ped', knockedOut: out, x: ped.pos.x, z: ped.pos.z };
      }
    }
    for (const car of cruisers) {
      if (dist2d(player.pos.x, player.pos.z, car.pos.x, car.pos.z) < 2.6
        && inArc(car.pos.x, car.pos.z)) {
        car.health -= 8;
        return { hit: 'cop', knockedOut: false, x: car.pos.x, z: car.pos.z };
      }
    }
    return { hit: null, knockedOut: false };
  }
}
