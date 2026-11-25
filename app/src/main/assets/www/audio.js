'use strict';
// Totally 90's Pinball — synth audio: every sound and the music are generated live (no samples).
const SND = (() => {
  let ac = null, master, sfxG, musG, musFilter, noiseBuf;
  let seqTimer = null, nextT = 0, step = 0, bar = 0;
  let tempo = 118, hype = 0, titleMode = true, muted = false;

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state !== 'running') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5;
    master = ac.createGain(); master.gain.value = 0.9;
    sfxG = ac.createGain(); sfxG.gain.value = 0.55;
    musG = ac.createGain(); musG.gain.value = 0.3;
    musFilter = ac.createBiquadFilter(); musFilter.type = 'lowpass'; musFilter.frequency.value = 900; musFilter.Q.value = 3;
    musG.connect(musFilter); musFilter.connect(master); sfxG.connect(master); master.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextT = ac.currentTime + 0.1;
    seqTimer = setInterval(schedule, 25);
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  function tone(f, dur, type, vol, f2, when, dest) {
    if (!ac) return;
    const t = when || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    env(g, t, 0.004, vol, dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, freq, ftype, when, dest, q) {
    if (!ac) return;
    const t = when || ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = ftype || 'bandpass'; f.frequency.value = freq || 2000; f.Q.value = q || 1;
    const g = ac.createGain();
    env(g, t, 0.002, vol, dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- sound effects
  const fx = {
    flip() { noise(0.05, 0.5, 900, 'lowpass'); tone(110, 0.07, 'triangle', 0.5, 60); },
    flipDown() { noise(0.03, 0.18, 600, 'lowpass'); },
    bumper(p) { const f = 380 + (p || 0) * 120; tone(f, 0.16, 'square', 0.32, f * 2.2); tone(f / 2, 0.12, 'triangle', 0.35, f / 3); },
    sling() { tone(700, 0.07, 'square', 0.25, 300); noise(0.05, 0.3, 3000); },
    wall(v) { if (v > 500) noise(0.04, Math.min(0.25, v / 4000), 1400, 'lowpass'); },
    roll() { tone(1568, 0.18, 'sine', 0.25); tone(2093, 0.22, 'sine', 0.16, null, ac && ac.currentTime + 0.05); },
    flop() { tone(220, 0.09, 'square', 0.3, 110); noise(0.08, 0.3, 500, 'lowpass'); },
    tv() { noise(0.25, 0.35, 4000, 'highpass'); tone(60, 0.2, 'sawtooth', 0.2); },
    rewind() { tone(300, 0.45, 'sawtooth', 0.22, 2400); tone(320, 0.45, 'square', 0.1, 2600); },
    modem() {
      if (!ac) return; const t = ac.currentTime;
      tone(1200, 0.18, 'sine', 0.22, null, t); tone(2100, 0.18, 'sine', 0.22, null, t + 0.18);
      noise(0.35, 0.22, 2400, 'bandpass', t + 0.36, null, 4); tone(980, 0.12, 'square', 0.12, 1650, t + 0.45);
    },
    launch(c) { noise(0.3, 0.5, 600 + c * 900, 'lowpass'); tone(80, 0.25, 'sawtooth', 0.3, 300 + c * 300); },
    charge(c) { tone(200 + c * 600, 0.05, 'square', 0.07); },
    drain() { tone(400, 0.7, 'sawtooth', 0.28, 50); },
    save() { [72, 76, 79].forEach((m, i) => tone(mtof(m), 0.15, 'square', 0.2, null, ac && ac.currentTime + i * 0.07)); },
    letter() { tone(1046, 0.1, 'square', 0.2); tone(1318, 0.14, 'square', 0.18, null, ac && ac.currentTime + 0.07); },
    combo(n) { const b = 60 + Math.min(n, 8) * 2; [0, 4, 7, 12].forEach((s, i) => tone(mtof(b + s), 0.12, 'square', 0.18, null, ac && ac.currentTime + i * 0.05)); },
    jackpot() {
      if (!ac) return; const t = ac.currentTime;
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => { tone(mtof(m), 0.25, 'square', 0.2, null, t + i * 0.06); tone(mtof(m - 12), 0.25, 'sawtooth', 0.12, null, t + i * 0.06); });
      noise(0.8, 0.25, 6000, 'highpass', t + 0.4);
    },
    big() {
      if (!ac) return; const t = ac.currentTime;
      tone(110, 1.2, 'sawtooth', 0.3, 880, t); tone(165, 1.2, 'sawtooth', 0.2, 1320, t);
      noise(1.2, 0.2, 1000, 'bandpass', t, null, 0.7);
      [57, 64, 69, 72].forEach(m => tone(mtof(m), 0.9, 'square', 0.12, null, t + 1.1));
    },
    od() { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 8; i++) tone(mtof(57 + i * 3), 0.1, 'sawtooth', 0.2, null, t + i * 0.045); },
    mult() { [67, 71, 74, 79].forEach((m, i) => tone(mtof(m), 0.16, 'triangle', 0.3, null, ac && ac.currentTime + i * 0.08)); },
    start() { [48, 55, 60, 64, 67, 72].forEach((m, i) => tone(mtof(m), 0.2, 'square', 0.2, null, ac && ac.currentTime + i * 0.07)); },
    menu() { tone(880, 0.06, 'square', 0.15); },
    over() { [67, 63, 60, 55].forEach((m, i) => tone(mtof(m), 0.35, 'square', 0.2, null, ac && ac.currentTime + i * 0.22)); },
    nudge() { noise(0.12, 0.4, 200, 'lowpass'); },
    tilt() { tone(90, 0.6, 'square', 0.4); }
  };

  // ---------- music: 4-bar loop, Am - F - C - G, 90s house / eurodance flavor
  const chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
  const roots = [45, 41, 48, 43];
  const stabSteps = [0, 3, 6, 10, 13];
  const arp = [0, 1, 2, 1, 0, 2, 1, 2];

  function schedule() {
    if (!ac) return;
    const spb = 60 / tempo / 4; // 16th note
    while (nextT < ac.currentTime + 0.12) {
      if (!muted) playStep(step, bar, nextT, spb);
      nextT += spb; step++;
      if (step >= 16) { step = 0; bar = (bar + 1) % 4; }
    }
  }

  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.002, 0.9, 0.28); o.connect(g); g.connect(musG); o.start(t); o.stop(t + 0.35);
  }

  function playStep(s, b, t, spb) {
    const ch = chords[b], root = roots[b];
    if (titleMode) {
      if (s % 4 === 0) kick(t);
      if (s === 0 || s === 8) ch.forEach(m => tone(mtof(m), spb * 7, 'triangle', 0.08, null, t, musG));
      if (s % 2 === 1) noise(0.03, 0.05, 9000, 'highpass', t, musG);
      return;
    }
    if (s % 4 === 0) kick(t);
    if (s === 4 || s === 12) noise(0.14, 0.42, 1800, 'bandpass', t, musG, 0.8);
    if (s % 4 === 2) noise(0.09, 0.2, 9000, 'highpass', t, musG);
    else if (s % 2 === 1) noise(0.025, 0.08, 11000, 'highpass', t, musG);
    if (s % 4 === 2) { tone(mtof(root - 12), spb * 1.6, 'sawtooth', 0.28, null, t, musG); tone(mtof(root), spb * 1.2, 'square', 0.1, null, t, musG); }
    if (stabSteps.includes(s)) ch.forEach(m => { tone(mtof(m + 12), spb * 1.4, 'square', 0.06, null, t, musG); tone(mtof(m + 12) * 1.007, spb * 1.4, 'sawtooth', 0.05, null, t, musG); });
    if (hype > 0 && s % 2 === 0) { const n = ch[arp[(s / 2) % 8]] + 24; tone(mtof(n), spb * 1.2, 'square', 0.07, null, t, musG); }
  }

  function setMode(title, h) {
    titleMode = title; hype = h || 0;
    tempo = title ? 104 : (hype ? 134 : 120);
    if (musFilter && ac) musFilter.frequency.setTargetAtTime(title ? 700 : (hype ? 6000 : 2400), ac.currentTime, 0.3);
  }

  function play(name, a) { if (!ac || muted || ac.state !== 'running') return; const f = fx[name]; if (f) f(a); }
  function suspend(s) { if (!ac) return; if (s) ac.suspend(); else ac.resume(); }
  return { init, play, setMode, suspend };
})();
