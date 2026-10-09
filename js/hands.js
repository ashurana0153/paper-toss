import { CONFIG } from './config.js';
import { OneEuro } from './oneEuro.js';

const VER = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// 21-point hand templates in "hand sizes" (wrist = 0,0 and middle knuckle = 0,-1). Used for the mouse hand and the how-to demos.
export const OPEN = [[0,0],[-.42,-.18],[-.72,-.45],[-.95,-.72],[-1.12,-.95],[-.38,-.92],[-.46,-1.4],[-.5,-1.7],[-.53,-1.98],[0,-1],[0,-1.5],[0,-1.85],[0,-2.15],[.36,-.95],[.43,-1.4],[.47,-1.72],[.5,-1.98],[.68,-.82],[.8,-1.2],[.86,-1.45],[.9,-1.68]];
export const FIST = [[0,0],[-.42,-.18],[-.6,-.42],[-.42,-.62],[-.2,-.72],[-.38,-.92],[-.44,-1.28],[-.3,-1.12],[-.2,-.82],[0,-1],[0,-1.3],[.02,-1.1],[.02,-.75],[.36,-.95],[.4,-1.25],[.34,-1.08],[.28,-.75],[.68,-.82],[.72,-1.08],[.6,-.95],[.5,-.7]];
export const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const PALM = [0, 5, 9, 13, 17], TIPS = [8, 12, 16, 20];

// Landmarks for a template hand at screen position (cx, cy) with the given size and closure.
export function templateHand(cx, cy, size, closure) {
  const pts = OPEN.map((o, i) => [o[0] + (FIST[i][0] - o[0]) * closure, o[1] + (FIST[i][1] - o[1]) * closure]);
  const pc = PALM.reduce((a, i) => [a[0] + pts[i][0] / 5, a[1] + pts[i][1] / 5], [0, 0]);
  return pts.map((p) => ({ x: cx + (p[0] - pc[0]) * size, y: cy + (p[1] - pc[1]) * size }));
}

// The hand drawn over the scene: soft halo, thin bright bones, fingertip dots (blue while holding).
export function drawHand(ctx, lm, size, holding, alpha = 1) {
  if (!lm) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); [0, 5, 9, 13, 17].forEach((i, k) => (k ? ctx.lineTo(lm[i].x, lm[i].y) : ctx.moveTo(lm[i].x, lm[i].y))); ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
  const path = () => { ctx.beginPath(); BONES.forEach(([a, b]) => { ctx.moveTo(lm[a].x, lm[a].y); ctx.lineTo(lm[b].x, lm[b].y); }); };
  path(); ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = size * 0.22; ctx.stroke();
  path(); ctx.strokeStyle = 'rgba(20,30,70,0.3)'; ctx.lineWidth = Math.max(1.5, size * 0.028) + 2.5; ctx.stroke();
  path(); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.5, size * 0.028); ctx.stroke();
  const r = Math.max(3, size * 0.055);
  [4, 8, 12, 16, 20].forEach((i) => {
    ctx.beginPath(); ctx.arc(lm[i].x, lm[i].y, r, 0, 6.2832);
    ctx.fillStyle = holding ? 'rgb(10,132,255)' : 'rgba(255,255,255,0.95)'; ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,70,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  });
  ctx.restore();
}

export class Hands {
  constructor() {
    this.mode = 'none'; this.onFrame = () => {}; this.latest = null; this.ready = false;
    this.f = { x: new OneEuro(1.4, 0.03), y: new OneEuro(1.4, 0.03), s: new OneEuro(0.8, 0.0), c: new OneEuro(2.5, 0.02) };
    this.pinching = false; this.lastSeen = 0; this.lastVideoTime = -1;
    this.ptr = { x: 0.7, y: 0.6, down: false, inside: false, closure: 0 };
  }

  // ---------- camera ----------
  async startCamera(video) {
    this.video = video;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { const e = new Error('no-api'); e.name = 'NoApi'; throw e; }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    video.srcObject = stream; await video.play();
    try {
      const mod = await import(`${CDN}/vision_bundle.mjs`);
      const files = await mod.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
      try { this.landmarker = await mod.HandLandmarker.createFromOptions(files, opts('GPU')); }
      catch (e) { this.landmarker = await mod.HandLandmarker.createFromOptions(files, opts('CPU')); }
    } catch (e) { this.stop(); const err = new Error('tracker'); err.name = 'TrackerFailed'; throw err; }
    this.mode = 'camera'; this.ready = true;
  }
  stop() {
    if (this.video && this.video.srcObject) this.video.srcObject.getTracks().forEach((t) => t.stop());
    if (this.video) this.video.srcObject = null;
    this.mode = 'none'; this.ready = false;
  }

  // ---------- mouse / touch ----------
  startMouse() {
    this.mode = 'mouse'; this.ready = true;
    if (this.mouseBound) return; this.mouseBound = true;
    const set = (e) => { this.ptr.x = e.clientX; this.ptr.y = e.clientY; this.ptr.inside = true; this.ptr.px = true; };
    window.addEventListener('pointermove', set);
    window.addEventListener('pointerdown', (e) => { set(e); this.ptr.down = true; });
    window.addEventListener('pointerup', (e) => { set(e); this.ptr.down = false; });
    window.addEventListener('pointercancel', () => { this.ptr.down = false; });
  }

  // Called every animation frame.
  step(now, W, H) {
    if (this.mode === 'camera') this.stepCamera(now, W, H);
    else if (this.mode === 'mouse') this.stepMouse(now, W, H);
    if (this.latest && now - this.lastSeen > 160) this.latest = null;
  }
  emit(frame, now) { if (frame) { this.latest = frame; this.lastSeen = now; } this.onFrame(frame, now); }

  stepCamera(now, W, H) {
    const v = this.video;
    if (!v || v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    let res; try { res = this.landmarker.detectForVideo(v, now); } catch (e) { return; }
    const raw = res.landmarks && res.landmarks[0];
    if (!raw) { for (const k in this.f) this.f[k].reset(); this.emit(null, now); return; }
    const vw = v.videoWidth, vh = v.videoHeight, sc = H / vh;
    const px = raw.map((p) => ({ x: p.x * vw, y: p.y * vh }));
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const pc = PALM.reduce((a, i) => ({ x: a.x + px[i].x / 5, y: a.y + px[i].y / 5 }), { x: 0, y: 0 });
    const sizeCam = Math.max(10, d(px[0], px[9]));
    const tipD = TIPS.reduce((s, i) => s + d(px[i], pc), 0) / 4 / sizeCam;
    const rawClosure = Math.min(1, Math.max(0, (CONFIG.fingersOpen - tipD) / (CONFIG.fingersOpen - CONFIG.fingersClosed)));
    const pinchD = d(px[4], px[8]) / sizeCam;
    this.pinching = this.pinching ? pinchD < CONFIG.pinchOff : pinchD < CONFIG.pinchOn;
    const cx = this.f.x.filter((1 - pc.x / vw) * W, now), cy = this.f.y.filter((pc.y / vh) * H, now);
    const size = this.f.s.filter(sizeCam * sc, now), closure = this.f.c.filter(rawClosure, now);
    const lm = px.map((p) => ({ x: cx - (p.x - pc.x) * sc, y: cy + (p.y - pc.y) * sc }));
    this.emit({ cx, cy, size, closure, pinch: this.pinching && closure < 0.5, lm, raw, t: now }, now);
  }

  stepMouse(now, W, H) {
    const p = this.ptr; if (!p.px) return;
    const dt = Math.min(0.1, (now - (this.mt || now)) / 1000); this.mt = now;
    p.closure += ((p.down ? 1 : 0) - p.closure) * Math.min(1, dt * 14);
    const size = Math.max(60, H * 0.1);
    const cx = this.f.x.filter(p.x, now), cy = this.f.y.filter(p.y, now);
    this.emit({ cx, cy, size, closure: p.closure, pinch: false, lm: templateHand(cx, cy, size, p.closure), raw: null, t: now }, now);
  }
}
