// Small synthesized sounds, HUD updates, toast and card overlay helpers.
const Sound = (() => {
  let ac = null, noise = null;
  function init() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const n = ac.sampleRate * 0.5; noise = ac.createBuffer(1, n, ac.sampleRate);
        const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(f, dur, type, vol, to, delay) {
    if (!ac) return; const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, freq) {
    if (!ac) return; const t = ac.currentTime, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; fl.type = 'bandpass'; fl.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + dur + 0.02);
  }
  return {
    init,
    pick() { tone(600, 0.08, 'sine', 0.1); },
    crumple() { hiss(0.25, 0.3, 2600); },
    toss() { hiss(0.35, 0.2, 900); },
    score() { tone(520, 0.12, 'triangle', 0.18); tone(780, 0.2, 'triangle', 0.18, null, 0.1); },
    rim() { tone(1200, 0.06, 'square', 0.05, 700); },
    floor() { tone(140, 0.12, 'sine', 0.2, 70); },
    miss() { tone(220, 0.25, 'sawtooth', 0.06, 110); },
  };
})();

const UI = (() => {
  const $ = (id) => document.getElementById(id);
  let toastTimer = 0;
  const METER_MAX = 1.1;
  return {
    $,
    toast(msg, ms) {
      const t = $('toast'); t.textContent = msg; t.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1300);
    },
    card(html) { $('overlay').innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`; const b = $('overlay').querySelector('button'); if (b) b.focus(); },
    closeCard() { $('overlay').innerHTML = ''; },
    cardOpen() { return $('overlay').innerHTML !== ''; },
    showHud(on) { $('hud').hidden = !on; $('meter').hidden = !on; $('howBtn').hidden = !on; },
    hud(s) {
      if ('level' in s) $('lvl').textContent = s.level;
      if ('score' in s) $('score').textContent = s.score;
      if ('streak' in s) $('streak').textContent = s.streak;
      if ('prog' in s) $('prog').textContent = s.prog;
    },
    wind(w, label) {
      $('windLabel').textContent = label;
      $('windVal').textContent = Math.abs(w) < 0.05 ? '' : `${w < 0 ? '←' : '→'} ${Math.abs(w).toFixed(1)} m/s`;
    },
    meter(p, band) {
      $('fill').style.height = `${Math.min(1, Math.max(0, p) / METER_MAX) * 100}%`;
      const b = $('band');
      if (band) { b.style.display = 'block'; b.style.bottom = `${(band.lo / METER_MAX) * 100}%`; b.style.height = `${((band.hi - band.lo) / METER_MAX) * 100}%`; }
      else b.style.display = 'none';
    },
  };
})();
