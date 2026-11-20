// HUD: DOM panels + circular minimap canvas.
import { WORLD, repTitle } from './config.js';
import { roadLines } from './city.js';
import { fmtMoney, clamp } from './rand.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.stars = $('wanted-stars');
    this.cash = $('cash-line');
    this.rep = $('rep-line');
    this.healthFill = $('health-fill');
    this.bustWrap = $('bust-wrap');
    this.bustFill = $('bust-fill');
    this.objectiveTitle = $('objective-title');
    this.objectiveText = $('objective-text');
    this.objectiveTimer = $('objective-timer');
    this.speedValue = $('speed-value');
    this.nosFill = $('nos-fill');
    this.driftPopup = $('drift-popup');
    this.radioStation = $('radio-station');
    this.radioTrack = $('radio-track');
    this.policeLines = $('police-lines');
    this.dialogue = $('dialogue');
    this.dialogueName = $('dialogue-name');
    this.dialogueText = $('dialogue-text');
    this.toast = $('toast');
    this.prompt = $('prompt');
    this.damageFlash = $('damage-flash');
    this.minimap = $('minimap');
    this.mm = this.minimap.getContext('2d');
    this.toastTimer = 0;
    this.driftTimer = 0;
    this.lines = roadLines();
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  setStars(n) {
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += i < n ? '★' : '<span class="off">★</span>';
    }
    if (this.stars.innerHTML !== html) this.stars.innerHTML = html;
  }

  setObjective(title, text, timer = '') {
    this.objectiveTitle.textContent = title;
    this.objectiveText.textContent = text;
    this.objectiveTimer.textContent = timer;
  }

  setRadio(info) {
    this.radioStation.textContent = info.name;
    this.radioTrack.textContent = `♪ ${info.track}`;
  }

  showDialogue(who, text) {
    this.dialogueName.textContent = who;
    this.dialogueText.textContent = text;
    this.dialogue.classList.remove('hidden');
  }

  hideDialogue() {
    this.dialogue.classList.add('hidden');
  }

  showToast(text, seconds = 2.4) {
    this.toast.textContent = text;
    this.toast.style.opacity = '1';
    this.toastTimer = seconds;
  }

  showDrift(text) {
    this.driftPopup.textContent = text;
    this.driftPopup.style.opacity = '1';
    this.driftTimer = 1.6;
  }

  setPrompt(text) {
    if (text) {
      this.prompt.textContent = text;
      this.prompt.classList.remove('hidden');
    } else {
      this.prompt.classList.add('hidden');
    }
  }

  // Brief gold flash used when a mission reward lands.
  flashReward() {
    this.damageFlash.style.background = 'rgba(255,210,63,.25)';
    setTimeout(() => { this.damageFlash.style.background = 'rgba(255,30,60,0)'; }, 160);
  }

  flashDamage() {
    this.damageFlash.style.background = 'rgba(255,30,60,.32)';
    setTimeout(() => { this.damageFlash.style.background = 'rgba(255,30,60,0)'; }, 120);
  }

  update(dt, s) {
    this.setStars(s.stars);
    this.cash.textContent = fmtMoney(s.cash);
    const rt = repTitle(s.rep);
    this.rep.textContent = `REP ${Math.floor(s.rep)} · ${rt.title}`;
    this.healthFill.style.width = `${clamp(s.health, 0, 100)}%`;
    if (s.bustMeter > 0.02) {
      this.bustWrap.classList.remove('hidden');
      this.bustFill.style.width = `${s.bustMeter * 100}%`;
    } else {
      this.bustWrap.classList.add('hidden');
    }
    this.speedValue.textContent = String(s.kmh);
    this.nosFill.style.width = `${s.nos}%`;
    this.policeLines.textContent = s.policeText;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.style.opacity = '0';
    }
    if (this.driftTimer > 0) {
      this.driftTimer -= dt;
      if (this.driftTimer <= 0) this.driftPopup.style.opacity = '0';
    }
    this.drawMinimap(s);
  }

  drawMinimap(s) {
    const ctx = this.mm;
    const size = this.minimap.width;
    const half = size / 2;
    const view = 120; // world units shown across the minimap diameter
    const scale = size / view;
    const px = (x) => half + (x - s.playerPos.x) * scale;
    const pz = (z) => half + (z - s.playerPos.z) * scale;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#232a36';
    ctx.fillRect(0, 0, size, size);

    // Roads.
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = Math.max(2, 12 * scale);
    for (const v of this.lines) {
      ctx.beginPath();
      ctx.moveTo(px(v), 0);
      ctx.lineTo(px(v), size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pz(v));
      ctx.lineTo(size, pz(v));
      ctx.stroke();
    }
    // Water at the south edge.
    ctx.fillStyle = '#2e7fa8';
    ctx.fillRect(0, pz(WORLD.half - 4), size, size);

    // Police blips.
    ctx.fillStyle = '#4db2ff';
    for (const c of s.cruisers) {
      ctx.beginPath();
      ctx.arc(px(c.pos.x), pz(c.pos.z), 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mission target.
    if (s.target) {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(clamp(px(s.target.x), 8, size - 8), clamp(pz(s.target.z), 8, size - 8), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    // Player arrow.
    ctx.translate(half, half);
    ctx.rotate(s.playerHeading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-4.6, -5);
    ctx.lineTo(4.6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // North marker.
    ctx.fillStyle = '#ffd9ec';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', half, 14);
  }
}
