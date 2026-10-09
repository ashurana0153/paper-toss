import { CONFIG } from './config.js';

// Turns hand frames into game events.
//   idle -> holding (open hand rests on the pile) -> ball (fist crushed the sheet) -> done (hand opened)
// A hand frame is { cx, cy, size, closure (0 open .. 1 fist), pinch, ... } in screen pixels.
export class Gestures {
  constructor(cb) {
    this.cb = cb; this.pileTest = () => false;
    this.enabled = false; this.mode = 'play'; this.maxPower = CONFIG.defaultMaxPower;
    this.reset();
  }
  reset() {
    Object.assign(this, { state: 'idle', dwell: 0, hover: false, crumple: 0, target: 0, squeezing: false, armed: false, miss: 0, buf: [], lastSpeed: 0, liveSpeed: 0, lastT: 0 });
    this.sheet = { x: 0, y: 0, size: 150 };
  }
  get dwellProgress() { return Math.min(1, this.dwell / CONFIG.pickDwell); }
  enable(on) { this.enabled = on; }
  rearm() { if (this.state === 'done') { this.state = 'ball'; this.armed = false; this.buf = []; this.miss = 0; } }
  startCalib() { this.reset(); this.mode = 'calib'; this.state = 'ball'; this.crumple = 1; }
  startPlay() { this.reset(); this.mode = 'play'; }

  update(hand, t) {
    const dt = Math.min(0.2, Math.max(0, (t - this.lastT) / 1000)) || 0.016; this.lastT = t;
    if (!this.enabled) return;
    if (this.state === 'idle') {
      const over = !!hand && this.pileTest(hand.cx, hand.cy);
      this.hover = over;
      this.dwell = over ? this.dwell + dt : 0;
      if (over && (hand.pinch || this.dwell >= CONFIG.pickDwell)) this.pick(hand);
    } else if (this.state === 'holding') this.updateHolding(hand);
    else if (this.state === 'ball') this.updateBall(hand, t);
  }
  pick(hand) {
    this.state = 'holding'; this.crumple = 0; this.target = 0; this.squeezing = false; this.dwell = 0; this.miss = 0; this.hover = false;
    this.sheet = { x: hand.cx, y: hand.cy - hand.size * 0.4, size: hand.size * 3 };
    this.cb.pick && this.cb.pick();
  }
  updateHolding(hand) {
    if (!hand) {
      if (++this.miss > 45) { this.state = 'idle'; this.cb.dropped && this.cb.dropped(); }
      return;
    }
    this.miss = 0;
    if (hand.closure > CONFIG.crushTrigger) this.squeezing = true;
    if (!this.squeezing) this.target = Math.min(0.3, hand.closure * 0.3);
    const lift = 0.4 - 0.3 * Math.min(1, this.crumple * 1.4);
    this.sheet = { x: hand.cx, y: hand.cy - hand.size * lift, size: hand.size * 3 };
    this.cb.crush && this.cb.crush(this.crumple);
    if (this.crumple >= 0.99) {
      this.state = 'ball'; this.crumple = 1; this.armed = hand.closure > CONFIG.gripClosure; this.buf = []; this.miss = 0;
      this.cb.crushed && this.cb.crushed();
    }
  }
  // Called every animation frame: advances the crumple.
  tick(dt) {
    if (this.state !== 'holding') return;
    if (this.squeezing) this.crumple = Math.min(1, this.crumple + dt / CONFIG.crumpleSeconds);
    else this.crumple += (this.target - this.crumple) * Math.min(1, dt * 8);
  }
  updateBall(hand, t) {
    if (!hand) {
      this.miss++;
      const [lo, hi] = CONFIG.dropoutFrames;
      if (this.armed && this.lastSpeed > Math.max(3, this.maxPower * 0.35) && this.miss >= lo && this.miss <= hi) this.release(true);
      else if (this.miss > 45 && this.mode === 'play') { this.state = 'idle'; this.armed = false; this.cb.dropped && this.cb.dropped(); }
      return;
    }
    this.miss = 0;
    this.sheet = { x: hand.cx, y: hand.cy - hand.size * 0.15, size: hand.size * 3 };
    if (this.armed) this.push({ x: hand.cx, y: hand.cy, s: hand.size, t });
    if (!this.armed && hand.closure > CONFIG.gripClosure) { this.armed = true; this.buf = []; this.push({ x: hand.cx, y: hand.cy, s: hand.size, t }); }
    else if (this.armed && hand.closure < CONFIG.releaseClosure) this.release(false);
  }
  seg(a, b) {
    const dt = (b.t - a.t) / 1000; if (dt <= 0) return 0;
    return Math.hypot(b.x - a.x, b.y - a.y) / dt / ((a.s + b.s) / 2);
  }
  push(s) {
    this.buf.push(s); if (this.buf.length > CONFIG.bufferFrames) this.buf.shift();
    const n = this.buf.length;
    this.lastSpeed = n > 1 ? this.seg(this.buf[n - 2], this.buf[n - 1]) : 0;
    let live = 0; for (let i = Math.max(1, n - 3); i < n; i++) live = Math.max(live, this.seg(this.buf[i - 1], this.buf[i]));
    this.liveSpeed = live;
  }
  measure() {
    const b = this.buf, n = b.length;
    if (n < 2) return { raw: 0, dx: 0, dy: -1 };
    const tEnd = b[n - 1].t; let best = -1, bi = n - 1;
    for (let i = 1; i < n; i++) {
      if (tEnd - b[i].t > CONFIG.peakWindowMs) continue;
      const s = this.seg(b[i - 1], b[i]); if (s > best) { best = s; bi = i; }
    }
    const a = b[Math.max(0, bi - 2)], c = b[Math.min(n - 1, bi + 1)];
    const vx = c.x - a.x, vy = c.y - a.y, len = Math.hypot(vx, vy) || 1;
    return { raw: Math.max(0, best), dx: vx / len, dy: vy / len };
  }
  release(dropout) {
    const m = this.measure(); m.dropout = !!dropout;
    this.state = 'done'; this.armed = false; this.cb.release && this.cb.release(m);
  }
}
