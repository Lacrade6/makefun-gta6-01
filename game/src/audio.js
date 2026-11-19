// All sound is synthesized with WebAudio — no audio files. Engine hum,
// sirens, impacts, pickups and three little radio stations that play
// looping arpeggios. The context is created on the first user gesture,
// because browsers refuse audio before one.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOscA = null;
    this.sirenOscB = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.station = 0;
    this.radioTimer = null;
    this.radioStep = 0;
    this.muted = false;
    this.stations = [
      {
        name: 'SOLMAR FM 98.6',
        tracks: ['Neon Palms — "Midnight on Ocean Dr"', 'The Breakers — "Gold Rush Summer"', 'Lucia Vane — "Bay Lights"'],
        // A breezy major-key line.
        notes: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 783.99],
        tempo: 0.24,
        wave: 'triangle',
      },
      {
        name: 'VICE 107.3',
        tracks: ['DJ Marlow — "Streets of Gold (Dub)"', 'Bassline Kings — "Low Rider Anthem"'],
        // A low, rolling minor groove.
        notes: [110.0, 130.81, 164.81, 130.81, 98.0, 110.0, 146.83, 164.81],
        tempo: 0.3,
        wave: 'sawtooth',
      },
      {
        name: 'PALM TALK 810 AM',
        tracks: ['"The Rico Tapes" — late-night talk', '"Bay Weather & Traffic"'],
        // Sparse talk-radio blips: mostly silence, an occasional ping.
        notes: [880.0, 0, 0, 0, 660.0, 0, 0, 0],
        tempo: 0.42,
        wave: 'sine',
      },
    ];
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._startEngine();
      this._startSiren();
      this.startRadio();
    } catch {
      this.ctx = null;
    }
  }

  _startEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 320;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  _startSiren() {
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOscA = this.ctx.createOscillator();
    this.sirenOscA.type = 'sine';
    this.sirenOscA.frequency.value = 720;
    this.sirenOscB = this.ctx.createOscillator();
    this.sirenOscB.type = 'sine';
    this.sirenOscB.frequency.value = 960;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.55;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenGain.gain);
    this.sirenOscA.connect(this.sirenGain);
    this.sirenOscB.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOscA.start();
    this.sirenOscB.start();
    lfo.start();
  }

  setEngine(speedNorm, boosting) {
    if (!this.ctx || !this.engineOsc) return;
    const target = 48 + speedNorm * 130 + (boosting ? 45 : 0);
    this.engineOsc.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.05 + speedNorm * 0.05, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (!this.ctx || !this.sirenGain) return;
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.3);
  }

  blip(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  punch() {
    this.blip(140, 0.12, 'square', 0.22, 60);
  }

  horn() {
    this.blip(370, 0.16, 'square', 0.12);
    setTimeout(() => this.blip(370, 0.16, 'square', 0.12), 180);
  }

  pickup() {
    this.blip(660, 0.1, 'sine', 0.18);
    setTimeout(() => this.blip(990, 0.14, 'sine', 0.18), 70);
  }

  crash() {
    this.blip(90, 0.3, 'sawtooth', 0.3, 40);
    this.blip(220, 0.18, 'square', 0.12, 70);
  }

  jingle() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => setTimeout(() => this.blip(n, 0.22, 'triangle', 0.2), i * 110));
  }

  failSting() {
    const notes = [392, 311, 233];
    notes.forEach((n, i) => setTimeout(() => this.blip(n, 0.3, 'sawtooth', 0.14), i * 160));
  }

  startRadio() {
    if (!this.ctx || this.radioTimer) return;
    this.radioTimer = setInterval(() => {
      if (this.muted) return;
      const st = this.stations[this.station];
      const note = st.notes[this.radioStep % st.notes.length];
      this.radioStep += 1;
      if (note > 0) this.blip(note, st.tempo * 0.9, st.wave, 0.05);
    }, this.stations[this.station].tempo * 1000);
  }

  nextStation() {
    this.station = (this.station + 1) % this.stations.length;
    this.radioStep = 0;
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
      this.startRadio();
    }
    return this.currentStation();
  }

  currentStation() {
    const st = this.stations[this.station];
    return { name: st.name, track: st.tracks[this.radioStep % st.tracks.length] };
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
