// The HUD: health, cash, REP, wanted stars, speed, the mission objective,
// a live minimap drawn on a 2D canvas, the radio panel, the police-response
// panel, dialogue lines and centre-screen messages. All DOM — the 3D scene
// never draws UI.

import { CFG } from './config.js';

export class HUD {
  constructor() {
    this.el = (id) => document.getElementById(id);
    this.healthBar = this.el('health-bar');
    this.cashEl = this.el('cash');
    this.repEl = this.el('rep');
    this.repLevelEl = this.el('rep-level');
    this.starsEl = this.el('stars');
    this.speedNum = this.el('speed-num');
    this.speedExtra = this.el('speed-extra');
    this.missionTitle = this.el('mission-title');
    this.objectiveText = this.el('objective-text');
    this.objectiveSub = this.el('objective-sub');
    this.minimap = this.el('minimap');
    this.mm = this.minimap.getContext('2d');
    this.radioStation = this.el('radio-station');
    this.radioTrack = this.el('radio-track');
    this.policeText = this.el('police-text');
    this.dialogue = this.el('dialogue');
    this.dialogueName = this.el('dialogue-name');
    this.dialogueText = this.el('dialogue-text');
    this.centerMsg = this.el('center-msg');
    this.centerSub = this.el('center-sub');
    this.hint = this.el('hint');
    this.vignette = this.el('vignette');
    this.dialogueTimer = null;
    this.centerTimer = null;
    this.visible = false;
  }

  showGame() {
    this.visible = true;
    for (const id of ['hud-top-left', 'objective', 'minimap-wrap', 'speedo', 'hint']) {
      this.el(id).style.display = '';
    }
    this.el('title-screen').style.display = 'none';
    this.el('loading').style.display = 'none';
  }

  showTitle(canContinue, mission) {
    this.el('title-screen').style.display = '';
    this.el('loading').style.display = 'none';
    const btn = this.el('btn-continue');
    if (canContinue) {
      btn.style.display = '';
      this.el('continue-mission').textContent = String(mission);
    } else {
      btn.style.display = 'none';
    }
  }

  setPause(paused) {
    this.el('pause-screen').style.display = paused ? 'flex' : 'none';
  }

  setHint(text) {
    this.hint.textContent = text;
  }

  showDialogue(name, text) {
    this.dialogueName.textContent = name;
    this.dialogueText.textContent = text;
    this.dialogue.style.display = 'block';
    if (this.dialogueTimer) clearTimeout(this.dialogueTimer);
    this.dialogueTimer = setTimeout(() => {
      this.dialogue.style.display = 'none';
    }, 4200);
  }

  showCenter(msg, sub = '') {
    this.centerMsg.textContent = msg;
    this.centerSub.textContent = sub;
    this.centerMsg.style.display = 'block';
    this.centerSub.style.display = sub ? 'block' : 'none';
    if (this.centerTimer) clearTimeout(this.centerTimer);
    this.centerTimer = setTimeout(() => {
      this.centerMsg.style.display = 'none';
      this.centerSub.style.display = 'none';
    }, 2600);
  }

  update(game) {
    if (!this.visible) return;
    const player = game.player;
    this.healthBar.style.width = `${Math.max(0, player.health)}%`;
    this.cashEl.textContent = String(player.cash);
    this.repEl.textContent = String(game.rep);
    this.repLevelEl.textContent = String(game.repLevel);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += `<span class="${i < game.police.wanted ? '' : 'off'}">★</span>`;
    }
    this.starsEl.innerHTML = stars;
    const speed = player.onFoot
      ? Math.round(player.speed * 2.2)
      : Math.round(Math.abs(player.car ? player.car.speed : 0) * 2.24);
    this.speedNum.textContent = String(speed);
    let extra = '';
    if (!player.onFoot && player.car) {
      const car = player.car;
      extra = car.boosting ? 'NOS BOOST!' : `NOS ${Math.round(car.nos)}%`;
      if (car.drifting) extra += ' · DRIFT!';
    } else if (player.onFoot) {
      extra = 'ON FOOT — E near a car to steal it';
    }
    this.speedExtra.textContent = extra;
    const obj = game.missions.objectiveText();
    this.missionTitle.textContent = obj.title;
    this.objectiveText.textContent = obj.text;
    this.objectiveSub.textContent = obj.sub;
    const station = game.audio.currentStation();
    this.radioStation.textContent = station.name;
    this.radioTrack.textContent = station.track;
    this.policeText.textContent = game.police.responseLabel();
    this.vignette.style.opacity = player.health < 35 ? String((35 - player.health) / 35) : '0';
    this._drawMinimap(game);
  }

  _drawMinimap(game) {
    const g = this.mm;
    const S = 210;
    const half = CFG.city.half;
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(12,12,28,0.9)';
    g.fillRect(0, 0, S, S);
    // Water on the east edge.
    g.fillStyle = '#2a6a8a';
    const [wx] = toMap(CFG.city.waterX, 0);
    g.fillRect(wx, 0, S - wx, S);
    // Roads.
    g.strokeStyle = '#55555f';
    g.lineWidth = 3;
    for (const line of game.city.roadLines) {
      const [rx] = toMap(line, 0);
      const [, rz] = toMap(0, line);
      g.beginPath(); g.moveTo(rx, 0); g.lineTo(rx, S); g.stroke();
      g.beginPath(); g.moveTo(0, rz); g.lineTo(S, rz); g.stroke();
    }
    // Buildings as faint blocks (palms and lamps are too small to draw).
    g.fillStyle = 'rgba(200,180,140,0.5)';
    for (const c of game.city.colliders) {
      if (c.hx < 1) continue;
      const [bx, bz] = toMap(c.x - c.hx, c.z - c.hz);
      const [ex, ez] = toMap(c.x + c.hx, c.z + c.hz);
      g.fillRect(bx, bz, ex - bx, ez - bz);
    }
    // Mission target: pulsing gold diamond.
    const target = game.missions.currentTarget();
    if (target) {
      const [tx, ty] = toMap(target.x, target.z);
      const pulse = 5 + Math.sin(game.time * 5) * 2;
      g.fillStyle = '#ffd76a';
      g.beginPath();
      g.moveTo(tx, ty - pulse);
      g.lineTo(tx + pulse, ty);
      g.lineTo(tx, ty + pulse);
      g.lineTo(tx - pulse, ty);
      g.closePath();
      g.fill();
    }
    // Traffic as grey dots, police as blue/red dots.
    g.fillStyle = '#bbbbbb';
    for (const car of game.traffic.cars) {
      const [cx, cy] = toMap(car.x, car.z);
      g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    for (const cruiser of game.police.cruisers) {
      const [cx, cy] = toMap(cruiser.x, cruiser.z);
      g.fillStyle = '#5a8aff';
      g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI * 2); g.fill();
    }
    // Player arrow.
    const [px, py] = toMap(game.player.x, game.player.z);
    const heading = game.player.onFoot ? game.player.heading : (game.player.car ? game.player.car.heading : 0);
    g.save();
    g.translate(px, py);
    g.rotate(Math.PI - heading);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 6);
    g.lineTo(-5, 6);
    g.closePath();
    g.fill();
    g.restore();
  }
}
