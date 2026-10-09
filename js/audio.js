// Small synthesized sounds. Nothing to download; the AudioContext starts on the first tap or click.
export class Sound {
  constructor() { this.ac = null; this.noise = null; this.muted = false; this.lastCrinkle = 0; this.lastC = 0; }
  unlock() {
    if (!this.ac) {
      try {
        this.ac = new (window.AudioContext || window.webkitAudioContext)();
        const n = this.ac.sampleRate; this.noise = this.ac.createBuffer(1, n, this.ac.sampleRate);
        const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ac = null; }
    }
    if (this.ac && this.ac.state === 'suspended') this.ac.resume();
  }
  get ok() { return this.ac && !this.muted; }
  tone(f, dur, type = 'sine', vol = 0.15, to = 0, delay = 0) {
    if (!this.ok) return; const a = this.ac, t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  }
  hiss(dur, vol, f, q = 1, to = 0, delay = 0) {
    if (!this.ok) return; const a = this.ac, t = a.currentTime + delay, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = this.noise; s.loop = true; fl.type = 'bandpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(t, Math.random()); s.stop(t + dur + 0.03);
  }
  pick(vol = 1, rate = 1) { this.tone(520 * rate, 0.09, 'sine', 0.12 * vol, 700 * rate); }
  crinkle(c) { // crackles while the sheet is being crushed
    if (!this.ok) return; const now = performance.now();
    if (Math.abs(c - this.lastC) > 0.015 && now - this.lastCrinkle > 45) { this.lastCrinkle = now; this.lastC = c; this.hiss(0.04, 0.16, 2500 + Math.random() * 4000, 2); }
  }
  crinkleStop() { this.lastC = 0; }
  whoosh(p = 0.5) { this.hiss(0.34, 0.1 + 0.14 * p, 500, 0.8, 2600); }
  rim() { this.tone(1500, 0.14, 'triangle', 0.08, 1100); }
  thud(v = 1) { this.tone(130, 0.14, 'sine', 0.22 * v, 60); this.hiss(0.05, 0.05 * v, 900, 1); }
  hit(streak = 1) { this.tone(659, 0.16, 'triangle', 0.14); this.tone(880, 0.26, 'triangle', 0.14, 0, 0.09); if (streak > 1) { this.tone(1175, 0.34, 'triangle', 0.12, 0, 0.19); } }
  miss() { this.tone(200, 0.3, 'triangle', 0.1, 120); }
  applause() { if (!this.ok) return; for (let i = 0; i < 42; i++) this.hiss(0.05 + Math.random() * 0.05, 0.05 + Math.random() * 0.08, 1800 + Math.random() * 3500, 1.5, 0, Math.random() * 1.8); }
}
