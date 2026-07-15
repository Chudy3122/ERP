/** Tower Defense — pure logic, deliberately free of React and canvas so it can be tested. */
import { CELL, COLS, ROWS } from './config';

export type Vec = { x: number; y: number };
type Seg = { a: Vec; b: Vec; len: number; acc: number };

/** Cell centre → pixel centre. */
export const cellToPx = (c: Vec): Vec => ({ x: (c.x + 0.5) * CELL, y: (c.y + 0.5) * CELL });

/** A level's road, precomputed for fast lookups. Each level builds its own. */
export type Route = {
  px: Vec[];
  segments: Seg[];
  length: number;
  castle: Vec; // pixel position of the castle at the end of the road
};

export function makeRoute(path: Vec[]): Route {
  const px = path.map(cellToPx);
  const segments: Seg[] = [];
  let acc = 0;
  for (let i = 0; i < px.length - 1; i++) {
    const a = px[i];
    const b = px[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, len, acc });
    acc += len;
  }
  return { px, segments, length: acc, castle: px[px.length - 1] };
}

/** Position along the road at a given distance. Clamps at both ends. */
export function pointAt(route: Route, dist: number): Vec {
  if (dist <= 0) return route.px[0];
  if (dist >= route.length) return route.px[route.px.length - 1];
  for (const s of route.segments) {
    if (dist <= s.acc + s.len) {
      const t = (dist - s.acc) / s.len;
      return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
    }
  }
  return route.px[route.px.length - 1];
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

/** Cells the road runs through (plus a margin) — you can't build on these. */
export function blockedCells(route: Route): Set<string> {
  const blocked = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const centre = { x: (c + 0.5) * CELL, y: (r + 0.5) * CELL };
      for (const s of route.segments) {
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
 * Target selection: the enemy furthest along the road that is in range and
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

/** Nearest other enemies for a chain-lightning jump. */
export function chainTargets<T extends { id: number; x: number; y: number; dead?: boolean }>(
  from: T,
  enemies: T[],
  jumps: number,
  radius: number
): T[] {
  const out: T[] = [];
  const used = new Set<number>([from.id]);
  let cur = from;
  for (let i = 0; i < jumps; i++) {
    let best: T | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (e.dead || used.has(e.id)) continue;
      const d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d <= radius && d < bestD) {
        best = e;
        bestD = d;
      }
    }
    if (!best) break;
    out.push(best);
    used.add(best.id);
    cur = best;
  }
  return out;
}
