// Draws the office in a simple 3D projection: camera sits at the desk, bin stands down the room.
const R = (() => {
  const CAM = { x: 0, y: 1.35, z: -1.6 };
  const C = {
    wall: '#b7c1bd', wallSide: '#a2adaa', wallSideR: '#abb6b2', ceiling: '#e4e8e6', floor: '#4b5762', floorLine: 'rgba(255,255,255,0.07)',
    base: '#8c9894', light: '#fffdf2', desk: '#a5754b', deskDark: '#7a5233', paper: '#f7f5ef', ink: '#1d2327', accent: '#ff5a1f',
  };
  let ctx, W = 0, H = 0, f = 0, cx = 0, cy = 0, dpr = 1;

  function resize(canvas) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    f = Math.min(H * 1.05, W * 2.2); cx = W / 2; cy = H * 0.38;
  }
  const P = (x, y, z) => { const s = f / Math.max(0.35, z - CAM.z); return { x: cx + (x - CAM.x) * s, y: cy - (y - CAM.y) * s, s }; };
  function poly(pts, fill) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function line(a, b, col, w) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
  const pileZone = () => ({ x: W * 0.5, y: H * 0.9, r: Math.max(46, H * 0.085) });

  function room(t, wind) {
    const hw = Phys.ROOM.halfW, D = Phys.ROOM.depth, Hh = Phys.ROOM.height, zn = -1.2;
    ctx.fillStyle = C.wall; ctx.fillRect(0, 0, W, H);
    poly([P(-hw, Hh, zn), P(hw, Hh, zn), P(hw, Hh, D), P(-hw, Hh, D)], C.ceiling);
    poly([P(-hw, 0, zn), P(hw, 0, zn), P(hw, 0, D), P(-hw, 0, D)], C.floor);
    poly([P(-hw, 0, D), P(hw, 0, D), P(hw, Hh, D), P(-hw, Hh, D)], C.wall);
    poly([P(-hw, 0, zn), P(-hw, 0, D), P(-hw, Hh, D), P(-hw, Hh, zn)], C.wallSide);
    poly([P(hw, 0, zn), P(hw, 0, D), P(hw, Hh, D), P(hw, Hh, zn)], C.wallSideR);
    for (let z = 0; z <= D; z++) line(P(-hw, 0, z), P(hw, 0, z), C.floorLine, 1);
    for (let x = -3; x <= 3; x++) line(P(x, 0, zn), P(x, 0, D), C.floorLine, 1);
    line(P(-hw, 0.12, zn), P(-hw, 0.12, D), C.base, 2); line(P(hw, 0.12, zn), P(hw, 0.12, D), C.base, 2);
    line(P(-hw, 0.12, D), P(hw, 0.12, D), C.base, 2);
    // ceiling light panels
    [2.5, 5.5, 8.5].forEach((z) => poly([P(-0.8, 2.99, z), P(0.8, 2.99, z), P(0.8, 2.99, z + 0.8), P(-0.8, 2.99, z + 0.8)], C.light));
    // whiteboard on the back wall
    const a = P(-2.3, 2.3, D), b = P(-0.5, 1.1, D);
    ctx.fillStyle = '#f4f6f5'; ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = '#7f8b88'; ctx.lineWidth = 2; ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = 'rgba(40,70,120,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const yy = a.y + (b.y - a.y) * (0.2 + i * 0.18); ctx.beginPath(); ctx.moveTo(a.x + (b.x - a.x) * 0.1, yy); ctx.lineTo(a.x + (b.x - a.x) * (0.45 + 0.12 * ((i * 3) % 4)), yy); ctx.stroke(); }
    // wall clock
    const c = P(1.7, 2.1, D), cr = 0.26 * c.s;
    ctx.beginPath(); ctx.arc(c.x, c.y, cr, 0, 6.283); ctx.fillStyle = '#fbfbf8'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + cr * 0.5, c.y - cr * 0.2); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - cr * 0.1, c.y - cr * 0.7); ctx.stroke();
    // ceiling vent with ribbons: this is the in-world wind gauge
    const v = P(-1.4, 3, 6.5), vw = 0.45 * v.s;
    ctx.fillStyle = '#cfd5d3'; ctx.fillRect(v.x - vw, v.y - 2, vw * 2, Math.max(5, vw * 0.4));
    for (let i = 0; i < 3; i++) {
      const ang = wind * 0.2 + Math.sin(t * 2.6 + i * 1.7) * (0.05 + Math.abs(wind) * 0.05);
      const sx = -1.4 - 0.25 + i * 0.25, e = P(sx + Math.sin(ang) * 0.5, 3 - Math.cos(ang) * 0.5, 6.5), s0 = P(sx, 3, 6.5);
      line(s0, e, C.accent, Math.max(2, v.s * 0.025));
    }
  }

  function binGeom(bin) {
    const dz = bin.z - CAM.z, top = P(bin.x, Phys.BIN_H, bin.z), base = P(bin.x, 0, bin.z);
    const kT = (CAM.y - Phys.BIN_H) / Math.hypot(dz, CAM.y - Phys.BIN_H), kB = CAM.y / Math.hypot(dz, CAM.y);
    return { top, base, rx: Phys.RIM_R * top.s, ry: Phys.RIM_R * top.s * kT, bx: Phys.BASE_R * base.s, by: Phys.BASE_R * base.s * kB };
  }
  function binBack(bin) {
    const g = binGeom(bin);
    ctx.beginPath(); ctx.ellipse(g.base.x, g.base.y, g.bx * 1.5, g.by * 1.5, 0, 0, 6.283); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, 6.283);
    const gr = ctx.createLinearGradient(0, g.top.y - g.ry, 0, g.top.y + g.ry); gr.addColorStop(0, '#6a747a'); gr.addColorStop(1, '#0d1113');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#c4ccd0'; ctx.lineWidth = Math.max(2, g.rx * 0.07); ctx.stroke();
  }
  function binFront(bin) {
    const g = binGeom(bin);
    ctx.beginPath();
    ctx.moveTo(g.top.x - g.rx, g.top.y); ctx.lineTo(g.base.x - g.bx, g.base.y);
    ctx.ellipse(g.base.x, g.base.y, g.bx, g.by, 0, Math.PI, 0, true);
    ctx.lineTo(g.top.x + g.rx, g.top.y);
    ctx.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, Math.PI, false);
    ctx.closePath();
    const gr = ctx.createLinearGradient(g.top.x - g.rx, 0, g.top.x + g.rx, 0);
    gr.addColorStop(0, '#2b3338'); gr.addColorStop(0.35, '#59656b'); gr.addColorStop(0.6, '#3b464c'); gr.addColorStop(1, '#1d2428');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const k = i / 4, x = g.base.x + (g.top.x - g.base.x) * k, y = g.base.y + (g.top.y - g.base.y) * k;
      ctx.beginPath(); ctx.ellipse(x, y, g.bx + (g.rx - g.bx) * k, g.by + (g.ry - g.by) * k, 0, 0, Math.PI, false); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(g.top.x, g.top.y, g.rx, g.ry, 0, 0, Math.PI, false);
    ctx.strokeStyle = '#d6dde0'; ctx.lineWidth = Math.max(2, g.rx * 0.07); ctx.stroke();
  }
  function marker(bin, t) {
    const g = binGeom(bin), y = g.top.y - g.ry - 34 + Math.sin(t * 4) * 4;
    ctx.font = '700 13px "Familjen Grotesk", sans-serif';
    const w = ctx.measureText('Throw here').width + 22;
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.roundRect(g.top.x - w / 2, y - 12, w, 24, 12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(g.top.x - 6, y + 12); ctx.lineTo(g.top.x + 6, y + 12); ctx.lineTo(g.top.x, y + 19); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Throw here', g.top.x, y);
  }

  const SHAPE = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * 6.283, r: 0.86 + (((i * 37) % 7) / 7) * 0.26 }));
  function ball(x, y, r, ang, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    ctx.beginPath();
    SHAPE.forEach((p, i) => { const px = Math.cos(p.a) * r * p.r, py = Math.sin(p.a) * r * p.r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.15); g.addColorStop(0, '#fffdf7'); g.addColorStop(1, '#c9c4b6');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(60,55,45,0.5)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,55,45,0.32)'; ctx.beginPath();
    [0, 2, 4, 6, 8].forEach((i) => { const p = SHAPE[i], q = SHAPE[(i + 4) % 10]; ctx.moveTo(Math.cos(p.a) * r * 0.2, Math.sin(p.a) * r * 0.2); ctx.lineTo(Math.cos(q.a) * r * 0.75, Math.sin(q.a) * r * 0.75); });
    ctx.stroke(); ctx.restore();
  }
  function sheet(x, y, w, tilt = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.roundRect(-w / 2, -w * 0.7, w, w * 1.4, 3); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(70,110,170,0.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const yy = -w * 0.5 + i * w * 0.18; ctx.beginPath(); ctx.moveTo(-w * 0.38, yy); ctx.lineTo(w * 0.38, yy); ctx.stroke(); }
    ctx.restore();
  }
  function shadowOnFloor(b) {
    const p = P(b.x, 0, b.z), k = Math.max(0.15, 1 - b.y / 2.4), r = Phys.BR * p.s * (1.1 + (1 - k));
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.2, r * 0.45, 0, 0, 6.283); ctx.fillStyle = `rgba(0,0,0,${0.28 * k})`; ctx.fill();
  }

  function desk(left, pickProg, hot) {
    const top = H * 0.84;
    const g = ctx.createLinearGradient(0, top, 0, H); g.addColorStop(0, '#b78556'); g.addColorStop(0.12, C.desk); g.addColorStop(1, C.deskDark);
    ctx.fillStyle = g; ctx.fillRect(0, top, W, H - top);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, top, W, 2);
    const z = pileZone();
    ctx.beginPath(); ctx.ellipse(z.x, z.y + 4, z.r * 1.05, z.r * 0.5, 0, 0, 6.283); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill();
    for (let i = 0; i < Math.max(0, left); i++) sheet(z.x + ((i * 7) % 5 - 2) * 1.5, z.y - i * 3, z.r * 0.95, ((i * 5) % 7 - 3) * 0.012);
    if (hot || pickProg > 0) {
      ctx.beginPath(); ctx.arc(z.x, z.y - 8, z.r * 1.15, -1.5708, -1.5708 + 6.283 * Math.max(0.02, pickProg));
      ctx.strokeStyle = C.accent; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.fillStyle = '#e7ebe9'; ctx.beginPath(); ctx.roundRect(W * 0.08, top + 10, 34, 42, 6); ctx.fill();
    ctx.fillStyle = '#c9cfcc'; ctx.fillRect(W * 0.08 + 6, top + 18, 22, 4);
  }
  function vignette() {
    const g = ctx.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.35, cx, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,16,20,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function cursor(x, y, pose, present) {
    if (!present) return;
    ctx.beginPath(); ctx.arc(x, y, pose === 'fist' ? 14 : 22, 0, 6.283);
    ctx.strokeStyle = pose === 'fist' ? C.accent : 'rgba(29,35,39,0.8)'; ctx.lineWidth = 3; ctx.setLineDash(pose === 'fist' ? [] : [5, 5]); ctx.stroke(); ctx.setLineDash([]);
  }
  return { CAM, P, resize, room, binBack, binFront, marker, ball, sheet, shadowOnFloor, desk, vignette, cursor, pileZone, get W() { return W; }, get H() { return H; }, get f() { return f; }, get cx() { return cx; }, get ctx() { return ctx; } };
})();
