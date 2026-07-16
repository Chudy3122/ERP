/**
 * Spire art loader + frame picker for Tower Defense.
 *
 * All sprites are from Foozle's "Spire" packs (CC0, public domain) —
 * see /games/spire/LICENSE_spire.txt. Enemies are animated spritesheets
 * (64 or 96 px frames, one walk cycle on row 3); tower bases are 3 upgrade
 * frames side by side; the ground is a single grass tile.
 */
import type { EnemyKind, TowerKind } from './config';

const BASE = '/games/spire/';

export const IMAGE_FILES: Record<string, string> = {
  grass: 'ground_grass.png',
  grass2: 'ground_grass2.png',
  dec_tree: 'dec_tree.png',
  dec_rock: 'dec_rock.png',
  dec_rock2: 'dec_rock2.png',
  base_archer: 'base_01.png',
  base_catapult: 'base_02.png',
  base_mage: 'base_03.png',
  base_ballista: 'base_04.png',
  base_oil: 'base_05.png',
  base_tesla: 'base_06.png',
  e_leafbug: 'e_leafbug.png',
  e_scorpion: 'e_scorpion.png',
  e_crab: 'e_crab.png',
  e_firebug: 'e_firebug.png',
  e_beetle: 'e_beetle.png',
  e_wasp: 'e_wasp.png',
  e_locust: 'e_locust.png',
  e_butterfly: 'e_butterfly.png',
};

export type Images = Record<string, HTMLImageElement>;

export function loadImages(): Promise<Images> {
  const entries = Object.entries(IMAGE_FILES);
  return Promise.all(
    entries.map(
      ([key, file]) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([key, img]);
          img.onerror = () => reject(new Error('Nie udało się wczytać grafiki: ' + file));
          img.src = BASE + file;
        })
    )
  ).then((pairs) => Object.fromEntries(pairs));
}

/** Per-creature sheet + walk-cycle metadata (row 3 is the move animation). */
type EnemyArt = { img: string; frame: number; frames: number; scale: number; sheetW: number; sheetH: number };
export const ENEMY_ART: Record<EnemyKind, EnemyArt> = {
  peasant: { img: 'e_leafbug', frame: 64, frames: 8, scale: 0.82, sheetW: 512, sheetH: 576 },
  soldier: { img: 'e_scorpion', frame: 64, frames: 8, scale: 0.86, sheetW: 512, sheetH: 576 },
  cavalry: { img: 'e_firebug', frame: 64, frames: 16, scale: 0.9, sheetW: 1408, sheetH: 576 },
  raven: { img: 'e_butterfly', frame: 64, frames: 4, scale: 0.82, sheetW: 832, sheetH: 576 },
  brute: { img: 'e_crab', frame: 64, frames: 8, scale: 1.1, sheetW: 640, sheetH: 576 },
  shaman: { img: 'e_beetle', frame: 64, frames: 8, scale: 0.9, sheetW: 832, sheetH: 576 },
  golem: { img: 'e_wasp', frame: 96, frames: 8, scale: 0.95, sheetW: 1152, sheetH: 864 },
  wraith: { img: 'e_locust', frame: 64, frames: 8, scale: 0.92, sheetW: 896, sheetH: 576 },
  boss: { img: 'e_crab', frame: 64, frames: 8, scale: 1.9, sheetW: 640, sheetH: 576 },
};

const MOVE_ROW = 3;
const ENEMY_FPS = 12;

/** CSS that shows a single clear walk frame of a creature — used by the bestiary. */
export function enemyIconStyle(kind: EnemyKind, size: number) {
  const a = ENEMY_ART[kind];
  const scale = size / a.frame;
  const col = Math.min(2, a.frames - 1); // frame 0 is often a mid-stride blank
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${BASE}${IMAGE_FILES[a.img]})`,
    backgroundSize: `${a.sheetW * scale}px ${a.sheetH * scale}px`,
    backgroundPosition: `-${col * a.frame * scale}px -${MOVE_ROW * a.frame * scale}px`,
    imageRendering: 'pixelated' as const,
  };
}

/**
 * Draw an enemy's current walk frame centred at (x, y). `sizeHint` is the
 * base pixel size (roughly the creature's diameter); the sprite is scaled to it.
 */
export function drawEnemyFrame(
  ctx: CanvasRenderingContext2D,
  images: Images,
  kind: EnemyKind,
  x: number,
  y: number,
  sizeHint: number,
  timeMs: number
): boolean {
  const art = ENEMY_ART[kind];
  const img = images[art.img];
  if (!img) return false;
  const f = Math.floor(timeMs / (1000 / ENEMY_FPS)) % art.frames;
  const draw = sizeHint * 2.9 * art.scale;
  ctx.drawImage(
    img,
    f * art.frame,
    MOVE_ROW * art.frame,
    art.frame,
    art.frame,
    x - draw / 2,
    y - draw / 2 - draw * 0.08,
    draw,
    draw
  );
  return true;
}

const TOWER_BASE: Record<TowerKind, string> = {
  archer: 'base_archer',
  catapult: 'base_catapult',
  mage: 'base_mage',
  ballista: 'base_ballista',
  oil: 'base_oil',
  tesla: 'base_tesla',
};

/**
 * Draw a tower's stone platform for its level (1-3). Each base sheet holds the
 * three upgrade frames side by side. Returns the pixel height drawn so the
 * weapon can sit on top.
 */
export function drawTowerBase(
  ctx: CanvasRenderingContext2D,
  images: Images,
  kind: TowerKind,
  level: number,
  cx: number,
  cy: number,
  width: number
): void {
  const img = images[TOWER_BASE[kind]];
  if (!img) return;
  const fw = img.width / 3;
  const fh = img.height;
  const sx = (level - 1) * fw;
  const drawW = width;
  const drawH = (fh / fw) * drawW;
  // anchor the platform so its middle sits on the tower cell
  ctx.drawImage(img, sx, 0, fw, fh, cx - drawW / 2, cy - drawH * 0.62, drawW, drawH);
}
