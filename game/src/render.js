// The three.js renderer: scene, day/dusk/golden-hour lighting, a gradient sky
// dome with a visible sun, real shadows, fog and the third-person chase
// camera. The camera orbits with mouse drag and eases behind the player (or
// their car) while moving; shots can pin it in place. Screen shake is applied
// on impacts (police rams, punches) and decays fast.

import * as THREE from 'three';
import { PALETTE } from './config.js';

// Vertical sky gradients, top -> horizon -> below-horizon, per time of day.
const SKY = {
  day: ['#3f7fd0', '#87b5e0', '#cfe4f5', '#e8f2fa'],
  dusk: ['#2a1a4a', '#7a3a7a', '#ff7a33', '#ffd23f'],
  golden: ['#274b8f', '#e08a4e', '#ffb347', '#ffe9a8'],
};

function skyTexture(mode) {
  const stops = SKY[mode] || SKY.day;
  const canvas = document.createElement('canvas');
  canvas.width = 4; canvas.height = 512;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.45, stops[1]);
  grad.addColorStop(0.62, stops[2]);
  grad.addColorStop(0.75, stops[3]);
  grad.addColorStop(1, stops[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRender(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add('webgl');
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyDay);
  scene.fog = new THREE.Fog(PALETTE.fogDay, 120, 420);

  // Sky dome: a big back-side sphere textured with a vertical gradient, so the
  // horizon is never a flat colour. The sun disc + halo ride on it.
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(760, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture('day'), side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }),
  );
  const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(72, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.35, fog: false, depthWrite: false }),
  );
  scene.add(sunDisc);
  scene.add(sunHalo);

  function placeSun(dir) {
    const d = dir.clone().normalize().multiplyScalar(700);
    sunDisc.position.copy(d);
    sunHalo.position.copy(d);
    sunDisc.lookAt(0, 0, 0);
    sunHalo.lookAt(0, 0, 0);
    // Keep the dome centred on the camera so the player never reaches its edge.
    skyDome.position.copy(camera.position);
  }

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a6a4a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sunDay, 1.6);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 600;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1600);
  camera.position.set(0, 12, 30);

  let timeOfDay = 'day';
  let camYaw = Math.PI;
  let camPitch = 0.32;
  let camDist = 11;
  let override = null;
  let orbitAngle = 0;
  let shakeMag = 0;

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return {
    scene, camera, renderer,
    setTimeOfDay(mode) {
      timeOfDay = mode;
      skyDome.material.map = skyTexture(mode);
      skyDome.material.needsUpdate = true;
      if (mode === 'dusk') {
        scene.background.setHex(PALETTE.skyDusk);
        scene.fog.color.setHex(PALETTE.fogDusk);
        scene.fog.near = 90; scene.fog.far = 340;
        sun.color.setHex(PALETTE.sunDusk);
        sun.intensity = 1.25;
        sun.position.set(-160, 60, 120);
        hemi.intensity = 0.55;
        sunDisc.material.color.setHex(0xff8a3d);
        sunHalo.material.color.setHex(0xff7a33);
        placeSun(new THREE.Vector3(-160, 60, 120));
      } else if (mode === 'golden') {
        // Golden hour: low warm sun, long shadows, warm haze.
        scene.background.setHex(PALETTE.skyGolden);
        scene.fog.color.setHex(PALETTE.fogGolden);
        scene.fog.near = 100; scene.fog.far = 380;
        sun.color.setHex(PALETTE.sunGolden);
        sun.intensity = 1.7;
        sun.position.set(-220, 55, 150);
        hemi.intensity = 0.6;
        hemi.color.setHex(0xffd9a8);
        hemi.groundColor.setHex(0x7a5a3a);
        sunDisc.material.color.setHex(0xfff0b8);
        sunHalo.material.color.setHex(0xffb347);
        placeSun(new THREE.Vector3(-220, 55, 150));
      } else {
        scene.background.setHex(PALETTE.skyDay);
        scene.fog.color.setHex(PALETTE.fogDay);
        scene.fog.near = 120; scene.fog.far = 420;
        sun.color.setHex(PALETTE.sunDay);
        sun.intensity = 1.6;
        sun.position.set(120, 180, 60);
        hemi.intensity = 0.9;
        hemi.color.setHex(0xbfd8ff);
        hemi.groundColor.setHex(0x8a6a4a);
        sunDisc.material.color.setHex(0xfff6d8);
        sunHalo.material.color.setHex(0xffd98a);
        placeSun(new THREE.Vector3(120, 180, 60));
      }
    },
    get timeOfDay() { return timeOfDay; },
    setCamYaw(yaw) { camYaw = yaw; },
    setCamPitch(pitch) { camPitch = pitch; },
    setCamDist(dist) { camDist = dist; },
    get camYaw() { return camYaw; },
    setCameraOverride(pose) { override = pose; },
    clearCameraOverride() { override = null; },
    /** Impact shake: magnitude in world units, decays over ~0.4 s. */
    shake(amount) { shakeMag = Math.max(shakeMag, amount); },
    applyShake(dt) {
      if (shakeMag <= 0.005) { shakeMag = 0; return; }
      camera.position.x += (Math.random() - 0.5) * shakeMag;
      camera.position.y += (Math.random() - 0.5) * shakeMag * 0.7;
      camera.position.z += (Math.random() - 0.5) * shakeMag;
      shakeMag *= Math.exp(-dt * 7);
    },
    /** Cinematic orbit for the title screen. */
    orbitCamera(dt, cx, cz) {
      orbitAngle += dt * 0.05;
      const r = 95;
      camera.position.set(cx + Math.cos(orbitAngle) * r, 38, cz + Math.sin(orbitAngle) * r);
      camera.lookAt(cx, 6, cz);
      skyDome.position.copy(camera.position);
      this.applyShake(dt);
    },
    updateCamera(dt, focus, moving, driving) {
      if (override) {
        camera.position.set(override.x, override.y, override.z);
        camera.lookAt(override.lookX, override.lookY, override.lookZ);
        skyDome.position.copy(camera.position);
        this.applyShake(dt);
        return;
      }
      // Ease the camera behind the direction of travel.
      const targetYaw = focus.heading + Math.PI;
      let diff = targetYaw - camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (moving) camYaw += diff * Math.min(1, dt * (driving ? 2.2 : 1.2));
      const dist = driving ? camDist + 3 : camDist;
      const height = 4.2 + Math.sin(camPitch) * dist * 0.55;
      const flat = Math.cos(camPitch) * dist;
      const tx = focus.x + Math.sin(camYaw) * flat;
      const tz = focus.z + Math.cos(camYaw) * flat;
      const lookY = driving ? 1.6 : 1.8;
      camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 8);
      camera.position.y += (height - camera.position.y) * Math.min(1, dt * 8);
      camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 8);
      camera.lookAt(focus.x, lookY, focus.z);
      skyDome.position.copy(camera.position);
      this.applyShake(dt);
    },
    applyDrag(dx, dy) {
      camYaw -= dx * 0.005;
      camPitch = Math.max(0.08, Math.min(0.9, camPitch + dy * 0.003));
    },
    render() { renderer.render(scene, camera); },
  };
}
