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
  let toastTimer = null;

  return {
    show() { hud.classList.add('on'); },
    hide() { hud.classList.remove('on'); },
    setStars(n) {
      let html = '';
      for (let i = 0; i < 5; i += 1) html += `<span class="${i < n ? '' : 'off'}">★</span>`;
      starsEl.innerHTML = html;
    },
    setMoney(n) { moneyEl.textContent = `$${n.toLocaleString('en-US')}`; },
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
