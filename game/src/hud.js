// The HUD: DOM overlay over the 3D view — wanted stars, money, health bar,
// mission objective, speedometer, hint line and toasts. Pure DOM so it stays
// crisp at any resolution and reads clearly in screenshots.

export function createHud() {
  const el = (id) => document.getElementById(id);
  const hud = el('hud');
  const starsEl = el('stars');
  const moneyEl = el('money');
  const healthEl = el('healthfill');
  const missionLabel = el('missionLabel');
  const missionText = el('missionText');
  const speedEl = el('speed');
  const speedValue = el('speedValue');
  const toastEl = el('toast');
  const hintEl = el('hint');
  const timerEl = el('timer');
  const policeEl = el('policePanel');
  const policeListEl = el('policeList');
  const policeHeadEl = el('policeHead');
  const dialogueEl = el('dialogue');
  const radioStationEl = el('radioStation');
  const radioTrackEl = el('radioTrack');
  const floatEl = el('floatScore');
  const repEl = el('repLevel');
  const repFillEl = el('repFill');
  const nosEl = el('nos');
  const nosFillEl = el('nosFill');
  const districtEl = el('district');
  const clockEl = el('clock');
  const missionProgEl = el('missionProgress');
  const missionProgFillEl = el('missionProgFill');
  const missionStageEl = el('missionStage');
  let toastTimer = null;
  let dialogueTimer = null;
  let floatTimer = null;
  let lastMoney = null;

  function tagClass(tag) {
    if (tag === 'RAMMING') return 'tag ram';
    if (tag === 'ROADBLOCK') return 'tag block';
    if (tag === 'IN SIGHT') return 'tag sight';
    if (tag === 'BOXING IN') return 'tag ram';
    return 'tag';
  }

  return {
    show() { hud.classList.add('on'); },
    hide() { hud.classList.remove('on'); },
    setStars(n) {
      let html = '';
      for (let i = 0; i < 5; i += 1) html += `<span class="${i < n ? '' : 'off'}">★</span>`;
      starsEl.innerHTML = html;
      starsEl.classList.toggle('hot', n > 0);
    },
    setMoney(n) {
      moneyEl.textContent = `$${n.toLocaleString('en-US')}`;
      if (lastMoney !== null && n !== lastMoney) {
        moneyEl.classList.remove('bump');
        void moneyEl.offsetWidth; // restart the animation
        moneyEl.classList.add('bump');
      }
      lastMoney = n;
    },
    setTimer(seconds) {
      if (seconds == null) {
        timerEl.style.display = 'none';
        return;
      }
      timerEl.style.display = 'block';
      timerEl.textContent = `⏱ ${Math.max(0, Math.ceil(seconds))}s`;
      timerEl.classList.toggle('urgent', seconds <= 15);
    },
    /** Mission progress: overall story progress + stage label, e.g. STAGE 2/3. */
    setMissionProgress(frac, label) {
      missionProgEl.style.display = '';
      missionProgFillEl.style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
      missionStageEl.textContent = label;
    },
    hideMissionProgress() { missionProgEl.style.display = 'none'; },
    /** Police response panel: named units, distances, behavior tags. */
    setPolice(units, heliInSight, stars) {
      if (stars <= 0) {
        policeEl.style.display = 'none';
        return;
      }
      policeEl.style.display = 'block';
      const total = units.length + (heliInSight ? 1 : 0);
      policeHeadEl.textContent = `POLICE RESPONSE — ${total} UNIT${total === 1 ? '' : 'S'} · CODE ${Math.min(5, stars)}`;
      let html = '';
      for (const u of units) {
        html += `<div class="unit"><span class="call">${u.callsign}</span><span class="dist">${u.dist}m</span><span class="${tagClass(u.tag)}">${u.tag}</span></div>`;
      }
      if (heliInSight) html += `<div class="unit"><span class="call">AIR-1</span><span class="dist">—</span><span class="tag sight">IN SIGHT</span></div>`;
      policeListEl.innerHTML = html;
    },
    /** Character dialogue box with portrait initials. Auto-hides unless sticky. */
    showDialogue(who, text, sticky = false) {
      el('dlgPortrait').textContent = who.initials;
      el('dlgPortrait').style.background = who.color;
      el('dlgName').textContent = `${who.name} — ${who.role}`;
      el('dlgText').textContent = text;
      dialogueEl.classList.add('on');
      if (dialogueTimer) clearTimeout(dialogueTimer);
      if (!sticky) dialogueTimer = setTimeout(() => dialogueEl.classList.remove('on'), 7000);
    },
    hideDialogue() {
      dialogueEl.classList.remove('on');
      if (dialogueTimer) clearTimeout(dialogueTimer);
    },
    setRadio(radio) {
      radioStationEl.textContent = radio.station;
      radioTrackEl.textContent = `${radio.track} — ${radio.artist}`;
    },
    /** Floating score text (DRIFT / NEAR MISS) near the speedometer. */
    floatScore(text) {
      floatEl.textContent = text;
      floatEl.classList.remove('pop');
      void floatEl.offsetWidth;
      floatEl.classList.add('pop');
      if (floatTimer) clearTimeout(floatTimer);
      floatTimer = setTimeout(() => floatEl.classList.remove('pop'), 1600);
    },
    setRep(level, frac) {
      repEl.textContent = `REP LV ${level}`;
      repFillEl.style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
    },
    setNos(frac, driving) {
      nosEl.classList.toggle('on', driving);
      nosFillEl.style.width = `${Math.max(0, Math.min(100, frac * 100))}%`;
      nosEl.classList.toggle('boosting', driving && frac > 0.02);
    },
    setDistrict(name, tag, street) {
      districtEl.innerHTML = `<b>${name}</b> · ${street}<span>${tag}</span>`;
    },
    setClock(text) { clockEl.textContent = text; },
    setHealth(h, max) { healthEl.style.width = `${Math.max(0, (h / max) * 100)}%`; },
    setMission(title, text) {
      missionLabel.textContent = title;
      missionText.textContent = text;
    },
    setSpeed(mph, driving) {
      speedEl.classList.toggle('on', driving);
      if (driving) speedValue.textContent = String(Math.round(mph));
    },
    setHint(text) { hintEl.textContent = text; },
    toast(text, ms = 2600) {
      toastEl.textContent = text;
      toastEl.style.opacity = '1';
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, ms);
    },
    showScreen(id) {
      for (const s of ['startScreen', 'pauseScreen', 'overScreen']) {
        document.getElementById(s).classList.toggle('on', s === id);
      }
    },
    hideScreens() {
      for (const s of ['startScreen', 'pauseScreen', 'overScreen']) {
        document.getElementById(s).classList.remove('on');
      }
    },
    setOverText(text) { el('overText').textContent = text; },
    setContinueVisible(visible) {
      el('continueBtn').style.display = visible ? '' : 'none';
    },
    onPlay(fn) { el('playBtn').addEventListener('click', fn); },
    onContinue(fn) { el('continueBtn').addEventListener('click', fn); },
    onResume(fn) { el('resumeBtn').addEventListener('click', fn); },
    onSave(fn) { el('saveBtn').addEventListener('click', fn); },
    onQuit(fn) { el('quitBtn').addEventListener('click', fn); },
    onRetry(fn) { el('retryBtn').addEventListener('click', fn); },
    onOverTitle(fn) { el('overTitleBtn').addEventListener('click', fn); },
    announce(text) { el('status').textContent = text; },
  };
}
