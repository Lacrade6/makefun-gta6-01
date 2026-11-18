// The three.js renderer: scene, dusk/day lighting, shadows, fog and the
// third-person chase camera. The camera orbits with mouse drag and eases
// behind the player (or their car) while moving; shots can pin it in place.

import * as THREE from 'three';
import { PALETTE } from './config.js';

export function createRender(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.classList.add('webgl');
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.skyDay);
  scene.fog = new THREE.Fog(PALETTE.fogDay, 120, 420);

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

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 12, 30);

  let timeOfDay = 'day';
  let camYaw = Math.PI;
  let camPitch = 0.32;
  let camDist = 11;
  let override = null;
  let orbitAngle = 0;

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
      if (mode === 'dusk') {
        scene.background.setHex(PALETTE.skyDusk);
        scene.fog.color.setHex(PALETTE.fogDusk);
        scene.fog.near = 90; scene.fog.far = 340;
        sun.color.setHex(PALETTE.sunDusk);
        sun.intensity = 1.25;
        sun.position.set(-160, 60, 120);
        hemi.intensity = 0.55;
      } else {
        scene.background.setHex(PALETTE.skyDay);
        scene.fog.color.setHex(PALETTE.fogDay);
        scene.fog.near = 120; scene.fog.far = 420;
        sun.color.setHex(PALETTE.sunDay);
        sun.intensity = 1.6;
        sun.position.set(120, 180, 60);
        hemi.intensity = 0.9;
      }
    },
    get timeOfDay() { return timeOfDay; },
    setCamYaw(yaw) { camYaw = yaw; },
    setCamPitch(pitch) { camPitch = pitch; },
    setCamDist(dist) { camDist = dist; },
    get camYaw() { return camYaw; },
    setCameraOverride(pose) { override = pose; },
    clearCameraOverride() { override = null; },
    /** Cinematic orbit for the title screen. */
    orbitCamera(dt, cx, cz) {
      orbitAngle += dt * 0.05;
      const r = 95;
      camera.position.set(cx + Math.cos(orbitAngle) * r, 38, cz + Math.sin(orbitAngle) * r);
      camera.lookAt(cx, 6, cz);
    },
    updateCamera(dt, focus, moving, driving) {
      if (override) {
        camera.position.set(override.x, override.y, override.z);
        camera.lookAt(override.lookX, override.lookY, override.lookZ);
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
    },
    applyDrag(dx, dy) {
      camYaw -= dx * 0.005;
      camPitch = Math.max(0.08, Math.min(0.9, camPitch + dy * 0.003));
    },
    render() { renderer.render(scene, camera); },
  };
}
