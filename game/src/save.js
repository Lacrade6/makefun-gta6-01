// Save / load through localStorage: money, mission progress, health, player
// position and wanted level. One small JSON object, written on mission complete,
// on pause-save and on game over.

import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      missionIndex: state.missionIndex,
      health: state.player.health,
      wanted: state.wanted,
      x: state.player.pos.x,
      z: state.player.pos.z,
      heading: state.player.heading,
      completed: state.missionsCompleted,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage off */ }
}
