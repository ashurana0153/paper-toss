// Two hand sources with the same output shape, so the game never cares which one is live:
//   camera: MediaPipe hand landmarks (palm position, open/fist pose, swing speed in hand-widths per second)
//   mouse:  pointer hover = open hand, pointer held down = fist, pointer speed = swing speed
const Input = (() => {
  const VER = '0.10.14';
  const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const out = { present: false, nx: 0.5, ny: 0.7, vx: 0, vy: 0, speed: 0, pose: 'none', t: 0, lm: null };
  let mode = 'none';

  // ---------- camera ----------
  let video, landmarker, lastVideoTime = -1, prev = null, poseCount = 0, lastSeen = 0;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  async function startCamera(videoEl) {
    video = videoEl;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser has no camera access (it needs https or localhost).');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
    video.srcObject = stream; await video.play();
    const mod = await import(`${CDN}/vision_bundle.mjs`);
    const files = await mod.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { landmarker = await mod.HandLandmarker.createFromOptions(files, opts('GPU')); }
    catch (e) { landmarker = await mod.HandLandmarker.createFromOptions(files, opts('CPU')); }
    mode = 'camera';
  }
  function stopCamera() {
    if (video && video.srcObject) video.srcObject.getTracks().forEach((t) => t.stop());
    if (mode === 'camera') mode = 'none';
  }
  function readCamera(now) {
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const res = landmarker.detectForVideo(video, now);
      const lm = res.landmarks && res.landmarks[0];
      if (lm) {
        const vw = video.videoWidth, vh = video.videoHeight;
        const px = (i) => ({ x: lm[i].x * vw, y: lm[i].y * vh });
        const wrist = px(0);
        const ids = [0, 5, 9, 13, 17];
        const palm = { x: ids.reduce((s, i) => s + px(i).x, 0) / 5, y: ids.reduce((s, i) => s + px(i).y, 0) / 5 };
        const hw = Math.max(8, dist(px(5), px(17)));
        let ext = 0;
        [[8, 6], [12, 10], [16, 14], [20, 18]].forEach(([tip, pip]) => { if (dist(px(tip), wrist) > dist(px(pip), wrist) * 1.12) ext++; });
        const cand = ext >= 3 ? 'open' : ext <= 1 ? 'fist' : out.pose;
        if (out.pose === 'none') { out.pose = cand; poseCount = 0; }
        else if (cand !== out.pose) { if (++poseCount >= 2) { out.pose = cand; poseCount = 0; } } else poseCount = 0;
        if (prev && now - prev.t > 2) {
          const dt = (now - prev.t) / 1000, k = 0.55, hwAvg = (hw + prev.hw) / 2;
          const rvx = -((palm.x - prev.palm.x) / hwAvg) / dt, rvy = ((palm.y - prev.palm.y) / hwAvg) / dt;
          out.vx += (rvx - out.vx) * k; out.vy += (rvy - out.vy) * k;
        }
        out.speed = Math.hypot(out.vx, out.vy);
        const sx = 1 - palm.x / vw, sy = palm.y / vh;
        out.nx += (sx - out.nx) * 0.6; out.ny += (sy - out.ny) * 0.6;
        prev = { palm, hw, t: now }; lastSeen = now; out.present = true; out.lm = lm;
      }
    }
    if (now - lastSeen > 450) { out.present = false; out.lm = null; out.pose = 'none'; out.vx = out.vy = out.speed = 0; prev = null; }
  }
  const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  function drawSkeleton(canvas) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    const c = canvas.getContext('2d'); c.clearRect(0, 0, w, h);
    if (!out.lm) return;
    c.strokeStyle = out.pose === 'fist' ? '#ff5a1f' : '#6ee0a8'; c.lineWidth = 2;
    c.beginPath(); BONES.forEach(([a, b]) => { c.moveTo(out.lm[a].x * w, out.lm[a].y * h); c.lineTo(out.lm[b].x * w, out.lm[b].y * h); }); c.stroke();
  }

  // ---------- mouse / touch ----------
  let el = null, down = false, inside = false, lastMove = 0, lastP = null;
  let mouseBound = false;
  function startMouse(target) {
    el = target; mode = 'mouse';
    if (mouseBound) return; mouseBound = true;
    const upd = (e) => {
      const r = el.getBoundingClientRect(), now = performance.now();
      const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
      if (lastP && now - lastP.t > 1) {
        const dt = (now - lastP.t) / 1000, hwPx = 0.12 * r.height;
        const rvx = ((e.clientX - lastP.x) / dt) / hwPx, rvy = ((e.clientY - lastP.y) / dt) / hwPx;
        out.vx += (rvx - out.vx) * 0.5; out.vy += (rvy - out.vy) * 0.5;
      }
      lastP = { x: e.clientX, y: e.clientY, t: now }; lastMove = now;
      out.nx = nx; out.ny = ny; inside = true;
    };
    el.addEventListener('pointermove', upd);
    el.addEventListener('pointerdown', (e) => { down = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} lastP = null; upd(e); });
    const up = (e) => { down = false; upd(e); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { if (!down) inside = false; });
  }
  function readMouse(now) {
    if (now - lastMove > 60) { out.vx *= 0.8; out.vy *= 0.8; }
    out.speed = Math.hypot(out.vx, out.vy);
    out.present = inside || down;
    out.pose = out.present ? (down ? 'fist' : 'open') : 'none';
  }

  function read(now) {
    if (mode === 'camera') readCamera(now); else if (mode === 'mouse') readMouse(now);
    out.t = now; return out;
  }
  return { startCamera, stopCamera, startMouse, read, drawSkeleton, get mode() { return mode; } };
})();
