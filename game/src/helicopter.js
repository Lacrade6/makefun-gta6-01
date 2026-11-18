// Solmar PD helicopter: appears at 3+ stars, hovers over the player with a
// searchlight cone and a ground ring, and leaves when the heat dies down.
// One helicopter at most; it never rams, it just keeps you IN SIGHT.

import * as THREE from 'three';

export function createHelicopter(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a3a5e });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x9fd8ff, shininess: 120, specular: 0xdddddd });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 4.2), bodyMat);
  body.position.y = 0;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.4), glassMat);
  nose.position.set(0, 0.1, 2.4);
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.6), bodyMat);
  tail.position.set(0, 0.4, -4.0);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 1.0), darkMat);
  fin.position.set(0, 1.0, -6.0);
  group.add(fin);
  const skidGeo = new THREE.BoxGeometry(0.18, 0.18, 3.4);
  for (const sx of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(skidGeo, darkMat);
    skid.position.set(sx, -1.1, 0.4);
    group.add(skid);
  }
  const rotorGroup = new THREE.Group();
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.08, 0.5), darkMat);
  rotor.position.y = 1.1;
  const rotor2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 9.5), darkMat);
  rotor2.position.y = 1.12;
  rotorGroup.add(rotor);
  rotorGroup.add(rotor2);
  group.add(rotorGroup);
  // Red/blue strobe on the belly.
  const strobe = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2020 }),
  );
  strobe.position.set(0, -0.9, 0);
  group.add(strobe);

  // Searchlight cone + ground ring (cheap fakes: translucent geometry).
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 6.5, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -13;
  group.add(cone);
  const ring = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  scene.add(ring);

  group.visible = false;
  ring.visible = false;
  scene.add(group);

  let active = false;
  let time = 0;

  return {
    get active() { return active; },
    get inSight() { return active; },
    /** Park the helicopter at a fixed spot, active immediately (screenshot staging). */
    place(x, z) {
      active = true;
      group.position.set(x, 26, z);
      group.visible = true;
      ring.visible = true;
    },
    step(dt, target, wanted) {
      time += dt;
      if (wanted >= 3) {
        if (!active) {
          active = true;
          group.position.set(target.x + 30, 26, target.z + 30);
          group.visible = true;
          ring.visible = true;
        }
        // Hover just off the player's shoulder, drifting with them.
        const hx = target.x + 14;
        const hz = target.z + 14;
        group.position.x += (hx - group.position.x) * Math.min(1, dt * 1.4);
        group.position.z += (hz - group.position.z) * Math.min(1, dt * 1.4);
        group.position.y = 26 + Math.sin(time * 0.8) * 1.2;
        group.rotation.y = Math.atan2(target.x - group.position.x, target.z - group.position.z);
        rotorGroup.rotation.y += dt * 28;
        strobe.material.color.setHex(Math.floor(time * 4) % 2 === 0 ? 0xff2020 : 0x2050ff);
        ring.position.set(target.x, 0.12, target.z);
        const pulse = 0.22 + Math.sin(time * 5) * 0.08;
        ring.material.opacity = pulse;
      } else if (active) {
        active = false;
        group.visible = false;
        ring.visible = false;
      }
    },
    clear() {
      active = false;
      group.visible = false;
      ring.visible = false;
    },
  };
}
