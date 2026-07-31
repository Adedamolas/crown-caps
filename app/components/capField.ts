/**
 * Pure math for the cap field. Kept out of the component so it can be reasoned about
 * (and later tested) without a WebGL context. See docs/MOTION.md §3–§5.
 */

/** True modulo — JS `%` keeps the sign of the dividend and breaks wrapping. */
export const wrap = (v: number, L: number) => ((v % L) + L) % L;

/**
 * Deterministic hash of an absolute cell coordinate → [0, 1).
 *
 * Everything per-cap (identity, jitter, spin phase) derives from this rather than from
 * the instance's pool index. If it came from the pool index, every cap would silently
 * change brand the moment it wrapped across an edge — see docs/MOTION.md §3.
 */
export function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Second, decorrelated stream for the same cell (jitter shouldn't track identity). */
export const hash2b = (x: number, y: number) => hash2(x + 9871, y - 3457);

/** Frame-rate independent damping factor. Never use `k * dt` directly. */
export const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

/** Gaussian falloff, 1 at the cursor decaying smoothly to 0. No hard radius edge. */
export const falloff = (d: number, sigma: number) => Math.exp(-(d * d) / (2 * sigma * sigma));

export const FIELD = {
  /** cap diameter as a fraction of its cell — well below 1, so each cap sits inside
   *  its ruled box with real air around it. This is a catalogue plate, not a pile. */
  CAP_IN_CELL: 0.5,
  /** how many cells across the viewport */
  ACROSS_WIDE: 6,
  ACROSS_NARROW: 3,
  /** how far a cap slides toward the cursor, as a fraction of cell size — must stay
   *  small enough that a cap never leaves its own box */
  PULL: 0.08,
  /** how far it rises toward the viewer */
  LIFT: 0.3,
  /** attraction radius as a multiple of cell size */
  SIGMA: 1.9,
  /** Base tilt. Zero — caps sit upright and face the viewer.
   *  A downward tilt aimed each cap's face at the dark floor of the environment, which
   *  read as dim/black metal rather than lit metal. Upright catches the key light. */
  TILT: 0,
  /** seconds per revolution, before per-cap variance */
  REV_SECONDS: 13,
  /**
   * Dwell. A disc spinning uniformly about Y faces away for half of every revolution,
   * so half the grid is blank mint at any instant — which fights the whole point of
   * the page. Warping the angle by `θ - k·sin θ` slows the turn near face-on and
   * speeds it through the back: still a full 360°, still monotonic (k < 1 keeps the
   * derivative positive, so it never stalls or reverses), but the brand is toward you
   * most of the time. 0 = uniform spin, 0.9 = a hard snap to face-on.
   */
  SPIN_DWELL: 0.62,
  /** damping rates */
  DAMP_POS: 6,
  DAMP_DRAG: 3.5,
} as const;
