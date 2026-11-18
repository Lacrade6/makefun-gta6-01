// Synthesized sound only — no audio files. A WebAudio graph built on the first
// user gesture: engine hum (speed-tracked sawtooth), two-tone police siren,
// punch thuds, UI clicks and a mission-complete jingle.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 0.9;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    /** speed01: 0..1 of top speed; driving: whether the player is in a car. */
    engine(speed01, driving) {
      if (!ctx || !engineOsc) return;
      engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.09 : 0, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 165, ctx.currentTime, 0.08);
    },
    siren(on) {
      if (!ctx || !sirenGain) return;
      sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, ctx.currentTime, 0.2);
    },
    punch() { blip(140, 0.14, 'sine', 0.5, 60); blip(900, 0.05, 'square', 0.12, 300); },
    hit() { blip(220, 0.18, 'sawtooth', 0.3, 90); },
    crash() { blip(90, 0.3, 'sawtooth', 0.5, 40); },
    click() { blip(660, 0.06, 'square', 0.15); },
    pickup() { blip(520, 0.09, 'sine', 0.3, 880); },
    missionDone() {
      if (!ctx) return;
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => blip(f, 0.22, 'triangle', 0.3), i * 110);
      });
    },
    busted() { [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'sawtooth', 0.25), i * 200)); },
  };
}
