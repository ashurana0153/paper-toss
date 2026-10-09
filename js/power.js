import { CONFIG } from './config.js';

// raw = swing speed in hand sizes per second, max = the player's fastest comfortable swing.
// Returns 0 (too gentle) or 0.02..1. The curve is flat around the middle so medium throws are easier to land.
export function mapPower(raw, max) {
  const r = raw / Math.max(max, 1e-6);
  if (r < CONFIG.powerFloor) return 0;
  const u = Math.min(1, (r - CONFIG.powerFloor) / (CONFIG.powerCeil - CONFIG.powerFloor));
  const m = 2 * u - 1;
  const p = 0.5 + 0.5 * Math.sign(m) * Math.abs(m) ** CONFIG.powerCurve;
  return Math.max(0.02, p);
}
export const bandOf = (p) => (p < CONFIG.bands[0] ? 0 : p < CONFIG.bands[1] ? 1 : 2);
// Where the paper lands for a given power, in metres from the throwing plane.
export const landingDistance = (p) => Math.max(0.3, 1.9 + (p - 0.45) * 7.33);
