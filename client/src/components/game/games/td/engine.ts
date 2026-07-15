/** Tower Defense — pure logic, deliberately free of React and canvas so it can be tested. */
import { CELL, COLS, ROWS, PATH } from './config';

export type Vec = { x: number; y: number };

/** Cell centre → pixel centre. */
export const cellToPx = (c: Vec): Vec => ({ x: (c.x + 0.5) * CELL, y: (c.y + 0.5) * CELL });

/** The route in pixels. */
export const PATH_PX: Vec[] = PATH.map(cellToPx);

/** Cumulative length of the route, so enemies can be placed by distance travelled. */
export const SEGMENTS = (() => {
  const segs: { a: Vec; b: Vec; len: number; acc: number }[] = [];
  let acc = 0;
  for (let i = 0; i < PATH_PX.length - 1; i++) {
    const a = PATH_PX[i];
    const b = PATH_PX[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len, acc });
    acc += len;
  }
  return segs;
})();

export const PATH_LENGTH = SEGMENTS.reduce((s, seg) => s + seg.len, 0);

/** Position along the route at a given distance. Clamps at both ends. */
export function pointAt(dist: number): Vec {
  if (dist <= 0) return PATH_PX[0];
  if (dist >= PATH_LENGTH) return PATH_PX[PATH_PX.length - 1];
  for (const s of SEGMENTS) {
    if (dist <= s.acc + s.len) {
      const t = (dist - s.acc) / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
  }
  return PATH_PX[PATH_PX.length - 1];
}

/** Heading (radians) along the route at a given distance. */
export function angleAt(dist: number): number {
  const d = Math.max(0, Math.min(PATH_LENGTH - 0.01, dist));
  for (const s of SEGMENTS) {
    if (d <= s.acc + s.len) return Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
  }
  const last = SEGMENTS[SEGMENTS.length - 1];
  return Math.atan2(last.b.y - last.a.y, last.b.x - last.a.x);
}

/** Shortest distance from a point to a segment. */
function distToSeg(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Cells the road runs through (plus a margin) — you can't build on these.
 * Returns a Set of "col,row" keys.
 */
export function blockedCells(): Set<string> {
  const blocked = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const centre = { x: (c + 0.5) * CELL, y: (r + 0.5) * CELL };
      for (const s of SEGMENTS) {
        if (distToSeg(centre, s.a, s.b) < CELL * 0.72) {
          blocked.add(`${c},${r}`);
          break;
        }
      }
    }
  }
  return blocked;
}

export const cellKey = (c: number, r: number) => `${c},${r}`;

/** Pixel → cell, or null if outside the board. */
export function pxToCell(x: number, y: number): { c: number; r: number } | null {
  const c = Math.floor(x / CELL);
  const r = Math.floor(y / CELL);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
  return { c, r };
}

/** Damage after armour. Always chips at least 1 so nothing is immortal. */
export function applyArmor(damage: number, armor: number, pierce = false): number {
  if (pierce) return damage;
  return Math.max(1, damage - armor);
}

/**
 * Target selection: the enemy furthest along the route that is in range and
 * targetable by this tower. Classic "first" targeting — it protects the castle.
 */
export function pickTarget<T extends { x: number; y: number; dist: number; flying?: boolean; dead?: boolean }>(
  towerX: number,
  towerY: number,
  range: number,
  hitsAir: boolean,
  enemies: T[]
): T | null {
  let best: T | null = null;
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.flying && !hitsAir) continue;
    if (Math.hypot(e.x - towerX, e.y - towerY) > range) continue;
    if (!best || e.dist > best.dist) best = e;
  }
  return best;
}
