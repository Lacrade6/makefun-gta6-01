// Melee combat on foot. One punch checks an arc in front of Rico: a
// pedestrian caught in it is knocked down (and the law notices), a cruiser
// door gets dented for style points. Punching is the only weapon — Solmar
// settles things with fists.

import { CFG } from './config.js';
import { angleDelta } from './rand.js';

export class Combat {
  constructor() {
    this.lastHitAt = 0;
  }

  // Returns a small report of what the punch connected with.
  punch(player, traffic, police, now) {
    const report = { ped: null, cruiser: null };
    if (!player.onFoot) return report;
    this.lastHitAt = now;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    for (const ped of traffic.peds) {
      if (!ped.alive) continue;
      const dx = ped.x - player.x;
      const dz = ped.z - player.z;
      const d = Math.hypot(dx, dz);
      if (d > CFG.player.punchRange) continue;
      const ang = angleDelta(player.heading, Math.atan2(dx, dz));
      if (Math.abs(ang) > CFG.player.punchArc) continue;
      ped.alive = false;
      ped.mesh.visible = false;
      ped.flee = 0;
      // They get up and walk off after a while.
      setTimeout(() => {
        ped.alive = true;
        ped.mesh.visible = true;
        ped.flee = 2;
      }, 6000);
      report.ped = ped;
      break;
    }
    for (const cruiser of police.cruisers) {
      const d = Math.hypot(cruiser.x - player.x, cruiser.z - player.z);
      if (d < 3.4) {
        report.cruiser = cruiser;
        break;
      }
    }
    return report;
  }
}
