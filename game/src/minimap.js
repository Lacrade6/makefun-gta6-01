// Live minimap: a circular 2D canvas drawn every frame — roads, the bay, the
// park, and dots for the player (white), traffic (amber), police (blue) and the
// active mission target (gold diamond). North is up.

import { CITY } from './config.js';
import { streetCoords } from './city.js';

export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const half = CITY.skyline + 30;
  const scale = size / (half * 2);
  const toMap = (x, z) => [size / 2 + x * scale, size / 2 + z * scale];

  function dot(x, z, r, color) {
    const [mx, my] = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return {
    draw(state) {
      ctx.clearRect(0, 0, size, size);
      // Circular clip.
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#10182a';
      ctx.fillRect(0, 0, size, size);
      // Bay water (south).
      ctx.fillStyle = '#2a7ab8';
      const [, wy] = toMap(0, CITY.skyline + 10);
      ctx.fillRect(0, wy, size, size - wy);
      // Park.
      ctx.fillStyle = '#3f8f4f';
      const [px, py] = toMap(-17, -17);
      ctx.fillRect(px, py, 34 * scale, 34 * scale);
      // Roads.
      ctx.strokeStyle = '#4a5260';
      ctx.lineWidth = 7 * scale * 2;
      for (const c of streetCoords()) {
        const [x] = toMap(c, 0);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
        const [, y] = toMap(0, c);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
      // Cash pickups.
      for (const p of state.pickups) {
        if (!p.taken) dot(p.x, p.z, 2.5, '#7dff9a');
      }
      // Mission target: gold diamond.
      const target = state.missionTarget;
      if (target) {
        const [tx, ty] = toMap(target.x, target.z);
        const pulse = 5 + Math.sin(performance.now() / 300) * 1.5;
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(tx, ty - pulse); ctx.lineTo(tx + pulse, ty);
        ctx.lineTo(tx, ty + pulse); ctx.lineTo(tx - pulse, ty);
        ctx.closePath(); ctx.fill();
      }
      // Second target (the betrayal option): red diamond.
      const target2 = state.missionTarget2;
      if (target2) {
        const [tx, ty] = toMap(target2.x, target2.z);
        const pulse = 5 + Math.sin(performance.now() / 300 + 1.5) * 1.5;
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.moveTo(tx, ty - pulse); ctx.lineTo(tx + pulse, ty);
        ctx.lineTo(tx, ty + pulse); ctx.lineTo(tx - pulse, ty);
        ctx.closePath(); ctx.fill();
      }
      // Traffic cars.
      for (const car of state.trafficCars) dot(car.pos.x, car.pos.z, 2.5, '#f5a623');
      // Police: flashing blue.
      const flash = Math.floor(performance.now() / 250) % 2 === 0;
      for (const car of state.policeCars) dot(car.pos.x, car.pos.z, 3.5, flash ? '#3a6bff' : '#ff2a2a');
      // Player: white triangle pointing along heading.
      const [ux, uy] = toMap(state.playerX, state.playerZ);
      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.translate(ux, uy);
      ctx.rotate(state.playerHeading);
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.restore();
      // Rim.
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    },
  };
}
