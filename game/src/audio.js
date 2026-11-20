// Synthesized audio: engine, sirens, impacts and three radio stations.
// Everything is WebAudio oscillators/noise — no audio files.

const STATIONS = [
  { name: 'Sol FM 101.3', track: 'Golden Hour Drive', base: 110, mode: [0, 3, 5, 7, 10], tempo: 420 },
  { name: 'Aurum Beats', track: 'Neon Palm Trees', base: 98, mode: [0, 2, 4, 7, 9], tempo: 340 },
  { name: 'Radio Brisa', track: 'Marina Breeze', base: 131, mode: [0, 2, 4, 5, 9], tempo: 520 },
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.station = 0;
    this.radioTimer = null;
    this.radioStep = 0;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
  }

  // Must be called from a user gesture.
  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startEngine();
      this.startSiren();
      this.startRadio();
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol = 0.3, freq = 800) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  punch() { this.noise(0.12, 0.35, 500); this.tone(90, 0.12, 'sine', 0.3, 45); }
  crash(strength = 1) {
    this.noise(0.35, Math.min(0.6, 0.25 * strength), 900);
    this.tone(70, 0.3, 'sawtooth', 0.2, 35);
  }
  pickup() { this.tone(880, 0.09, 'triangle', 0.22); this.tone(1320, 0.14, 'triangle', 0.2, null, 0.07); }
  cash() { this.tone(1560, 0.07, 'square', 0.12); this.tone(2090, 0.12, 'square', 0.1, null, 0.06); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, null, i * 0.11));
  }
  missionFail() { this.tone(220, 0.4, 'sawtooth', 0.18, 110); }
  starUp() { this.tone(660, 0.1, 'square', 0.14); this.tone(990, 0.16, 'square', 0.14, null, 0.09); }
  door() { this.noise(0.08, 0.2, 1200); this.tone(180, 0.08, 'sine', 0.2, 120); }
  horn() { this.tone(370, 0.35, 'square', 0.12); this.tone(466, 0.35, 'square', 0.12); }

  startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
  }

  // speed01: 0..1 of top speed; active false silences the engine.
  setEngine(speed01, active) {
    if (!this.ctx || !this.engineOsc) return;
    const target = active ? 0.05 + speed01 * 0.06 : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 165, this.ctx.currentTime, 0.08);
  }

  startSiren() {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain).connect(this.master);
    this.sirenOsc.start();
  }

  // level: 0..1 loudness of the nearest pursuing cruiser.
  setSiren(level, dt) {
    if (!this.ctx || !this.sirenOsc) return;
    this.sirenPhase += dt * 2.4;
    const f = 700 + Math.sin(this.sirenPhase * Math.PI * 2) * 180;
    this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
    this.sirenGain.gain.setTargetAtTime(level * 0.07, this.ctx.currentTime, 0.1);
  }

  startRadio() {
    this.stopRadio();
    const st = STATIONS[this.station];
    this.radioTimer = setInterval(() => this.radioNote(st), st.tempo);
  }

  stopRadio() {
    if (this.radioTimer) clearInterval(this.radioTimer);
    this.radioTimer = null;
  }

  radioNote(st) {
    if (!this.ctx) return;
    this.radioStep++;
    const semis = st.mode[this.radioStep % st.mode.length];
    const octave = this.radioStep % 8 < 4 ? 2 : 3;
    const freq = st.base * Math.pow(2, semis / 12) * octave;
    this.tone(freq, st.tempo / 1000 * 0.9, 'triangle', 0.055);
    if (this.radioStep % 4 === 0) this.tone(st.base / 2, 0.5, 'sine', 0.09);
    if (this.radioStep % 2 === 0) this.noise(0.04, 0.03, 6000);
  }

  nextStation() {
    this.station = (this.station + 1) % STATIONS.length;
    if (this.ctx) this.startRadio();
    return this.stationInfo();
  }

  stationInfo() {
    const st = STATIONS[this.station];
    return { name: st.name, track: st.track };
  }
}

export { STATIONS };
