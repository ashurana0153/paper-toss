const Phys = (() => {
  const G = 9.8, BR = 0.08, BIN_H = 0.62, RIM_R = 0.36, BASE_R = 0.26;
  const ROOM = { halfW: 3.2, depth: 11, height: 3 };
  const START = { x: 0, y: 0.8, z: 0 };
  const TUNE = { A0: 2.4, A1: 0.0016, B0: 3.4, B1: 0.0009, LAT: 0.55 };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function binRadiusAt(y) { return BASE_R + (RIM_R - BASE_R) * clamp(y / BIN_H, 0, 1); }
  function launch(U, Dx) {
    U = clamp(U, 450, 4600);
    const vz = TUNE.A0 + TUNE.A1 * U;
    const vy = TUNE.B0 + TUNE.B1 * U;
    const ratio = clamp((Dx / U) * TUNE.LAT, -0.7, 0.7);
    return { vx: ratio * vz, vy, vz };
  }
  function newBall(v) {
    return { x: START.x, y: START.y, z: START.z, vx: v.vx, vy: v.vy, vz: v.vz,
      ang: 0, omega: 7, rim: false, scored: false, inBin: false, t: 0, rest: 0, ev: [] };
  }
  function sub(b, bin, wind, h) {
    const py = b.y;
    if (!b.inBin) b.vx += wind * 0.8 * h;
    b.vy -= G * h;
    const drag = Math.max(0, 1 - 0.25 * h);
    b.vx *= drag; b.vy *= drag; b.vz *= drag;
    b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
    b.ang += b.omega * h;
    if (b.x > ROOM.halfW - BR) { b.x = ROOM.halfW - BR; b.vx = -b.vx * 0.35; b.ev.push('wall'); }
    if (b.x < -ROOM.halfW + BR) { b.x = -ROOM.halfW + BR; b.vx = -b.vx * 0.35; b.ev.push('wall'); }
    if (b.z > ROOM.depth - BR) { b.z = ROOM.depth - BR; b.vz = -b.vz * 0.35; b.ev.push('wall'); }
    if (b.y > ROOM.height - BR) { b.y = ROOM.height - BR; b.vy = -Math.abs(b.vy) * 0.3; }
    if (b.y < BR) {
      b.y = BR;
      if (b.vy < -0.8) b.ev.push('floor');
      b.vy = -b.vy * 0.3;
      if (Math.abs(b.vy) < 0.45) b.vy = 0;
      const f = Math.max(0, 1 - 5 * h); b.vx *= f; b.vz *= f; b.omega *= f;
    }
    const dx = b.x - bin.x, dz = b.z - bin.z;
    const d = Math.hypot(dx, dz) || 1e-6, ux = dx / d, uz = dz / d;
    if (!b.inBin) {
      const qx = bin.x + ux * RIM_R, qz = bin.z + uz * RIM_R;
      let nx = b.x - qx, ny = b.y - BIN_H, nz = b.z - qz;
      const dist = Math.hypot(nx, ny, nz);
      if (dist < BR && dist > 1e-6) {
        nx /= dist; ny /= dist; nz /= dist;
        b.x = qx + nx * BR; b.y = BIN_H + ny * BR; b.z = qz + nz * BR;
        const vn = b.vx * nx + b.vy * ny + b.vz * nz;
        if (vn < 0) { const k = 1.5 * vn; b.vx -= k * nx; b.vy -= k * ny; b.vz -= k * nz; b.rim = true; b.ev.push('rim'); b.omega += (Math.random() - 0.5) * 8; }
      }
      const d2 = Math.hypot(b.x - bin.x, b.z - bin.z);
      if (py >= BIN_H && b.y < BIN_H && d2 < RIM_R - BR * 0.4) { b.inBin = true; b.scored = true; b.ev.push('score'); }
      else if (b.y < BIN_H && d2 < binRadiusAt(b.y) + BR) {
        const rr = binRadiusAt(b.y) + BR, ox = (b.x - bin.x) / (d2 || 1e-6), oz = (b.z - bin.z) / (d2 || 1e-6);
        b.x = bin.x + ox * rr; b.z = bin.z + oz * rr;
        const vr = b.vx * ox + b.vz * oz;
        if (vr < 0) { b.vx -= 1.3 * vr * ox; b.vz -= 1.3 * vr * oz; b.ev.push('rim'); b.rim = true; }
      }
    } else {
      const rr = binRadiusAt(b.y) - BR;
      if (d > rr) {
        b.x = bin.x + ux * rr; b.z = bin.z + uz * rr;
        const vr = b.vx * ux + b.vz * uz;
        if (vr > 0) { b.vx -= 1.4 * vr * ux; b.vz -= 1.4 * vr * uz; }
      }
    }
  }
  function step(b, bin, wind, dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (let i = 0; i < n; i++) sub(b, bin, wind, h);
    b.t += dt;
    const sp = Math.hypot(b.vx, b.vy, b.vz);
    b.rest = (b.y <= BR + 0.02 && sp < 0.4) || (b.inBin && sp < 0.5 && b.y < BIN_H * 0.6) ? b.rest + dt : 0;
  }
  function hitWindow(D) {
    const bin = { x: 0, z: D };
    let lo = null, hi = null;
    for (let U = 450; U <= 4600; U += 25) {
      const b = newBall(launch(U, 0));
      let ok = false;
      for (let i = 0; i < 360; i++) {
        step(b, bin, 0, 1 / 60);
        if (b.scored) { ok = true; break; }
        if (b.rest > 0.3 || b.t > 4) break;
      }
      if (ok) { if (lo === null) lo = U; hi = U; }
    }
    return lo === null ? { lo: 1800, hi: 2100, mid: 1950 } : { lo, hi, mid: (lo + hi) / 2 };
  }
  return { G, BR, BIN_H, RIM_R, BASE_R, ROOM, START, TUNE, launch, newBall, step, binRadiusAt, clamp, hitWindow };
})();
