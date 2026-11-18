// Solmar PD: police cruisers that spawn at the city edge, chase the player with
// sirens, ram the player's car, and try to arrest the player on foot. Their
// numbers scale with the wanted level; they give up when the heat dies down.

import { POLICE, WANTED } from './config.js';
import { createCar } from './vehicles.js';

export function createPolice(scene, random) {
  const cars = [];
  let spawnTimer = 0;
  let ramTimer = 0;

  function spawnOne(playerPos) {
    const angle = random.range(0, Math.PI * 2);
    const r = 55 + random.range(0, 25);
    const x = Math.max(-185, Math.min(185, playerPos.x + Math.cos(angle) * r));
    const z = Math.max(-185, Math.min(185, playerPos.z + Math.sin(angle) * r));
    const car = createCar(scene, x, z, 0, 0xf2f2f2, true);
    car.speed = 12;
    cars.push(car);
    return car;
  }

  return {
    cars,
    count() { return cars.length; },
    spawnAt(x, z, heading = 0) {
      const car = createCar(scene, x, z, heading, 0xf2f2f2, true);
      car.speed = 12;
      cars.push(car);
      return car;
    },
    /** How many cruisers the current wanted level calls for. */
    wantedCount(wanted) {
      return wanted <= 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : wanted === 4 ? 4 : POLICE.maxCars;
    },
    step(dt, wanted, player, onRam, onArrest) {
      const want = this.wantedCount(wanted);
      spawnTimer -= dt;
      if (cars.length < want && spawnTimer <= 0) {
        spawnOne(player.pos);
        spawnTimer = 1.2;
      }
      if (cars.length > want) {
        const extra = cars.pop();
        scene.remove(extra.mesh);
      }
      if (ramTimer > 0) ramTimer -= dt;
      const target = player.inCar ? player.inCar.pos : player.pos;
      for (const car of cars) {
        const dx = target.x - car.pos.x;
        const dz = target.z - car.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 1.6));
        const throttle = dist > 6 ? 1 : 0.4;
        car.step(dt, throttle, steer, false, null, null);
        // Flash the light bar.
        if (car.lightBar) {
          const phase = Math.floor(performance.now() / 180) % 2 === 0;
          car.lightBar.red.material.color.setHex(phase ? 0xff2020 : 0x550000);
          car.lightBar.blue.material.color.setHex(phase ? 0x2020ff : 0x000055);
        }
        if (dist < 5.2 && ramTimer <= 0) {
          ramTimer = POLICE.ramCooldown;
          if (player.inCar) {
            player.inCar.speed *= 0.55;
            onRam(POLICE.ramDamage);
          } else if (dist < POLICE.arrestRange + 1.2) {
            onArrest();
          } else {
            onRam(POLICE.ramDamage);
          }
        }
      }
    },
    clear() {
      for (const car of cars) scene.remove(car.mesh);
      cars.length = 0;
    },
  };
}

/** Wanted-level bookkeeping: crimes add stars, quiet time fades them. */
export function createWanted() {
  let stars = 0;
  let quiet = 0;
  return {
    get stars() { return stars; },
    set stars(v) { stars = Math.max(0, Math.min(5, Math.round(v))); quiet = 0; },
    add(n) {
      stars = Math.max(0, Math.min(5, stars + n));
      quiet = 0;
    },
    crime(kind) {
      if (kind === 'steal') this.add(WANTED.stealStars);
      else if (kind === 'punch') this.add(WANTED.punchStars);
      else if (kind === 'punchCop') this.add(WANTED.punchCopStars);
      else if (kind === 'kill') this.add(WANTED.killStars);
      else if (kind === 'hitPed') this.add(WANTED.hitPedStars);
    },
    step(dt, committing) {
      if (committing) { quiet = 0; return; }
      quiet += dt;
      if (quiet >= WANTED.decaySeconds && stars > 0) {
        stars -= 1;
        quiet = 0;
      }
    },
    reset() { stars = 0; quiet = 0; },
  };
}
