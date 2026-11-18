// Melee combat: the F punch. Finds the nearest pedestrian (or cop on foot —
// there are none on foot, so cops are hit through their cruisers) inside range
// in front of the player, knocks them down, and raises the wanted level.

import { PLAYER } from './config.js';

export function createCombat() {
  return {
    /**
     * Try a punch. Returns 'ped' | 'none'. The caller applies wanted stars,
     * sound and the floating toast.
     */
    punch(player, traffic, audio) {
      if (!player.punch()) return 'none';
      if (audio) audio.punch();
      const fx = Math.sin(player.heading);
      const fz = Math.cos(player.heading);
      let best = null; let bestD = PLAYER.punchRange;
      for (const ped of traffic.peds) {
        if (ped.down > 0) continue;
        const dx = ped.pos.x - player.pos.x;
        const dz = ped.pos.z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > bestD) continue;
        const dot = (dx * fx + dz * fz) / (d || 1);
        if (dot < 0.1) continue;
        best = ped; bestD = d;
      }
      if (!best) return 'none';
      best.down = 2.2;
      best.flee = 0;
      best.mesh.position.y = 0.4;
      if (audio) audio.hit();
      return 'ped';
    },
  };
}
