/**
 * Sprite atlas for Tower Defense.
 *
 * A single combined sheet built from two CC0 (public-domain) Kenney packs:
 *   - Tiny Town   (terrain, trees, buildings, castle) at x 0..191
 *   - Tiny Dungeon (monsters) at x 192..383
 * See tiny_LICENSE.txt. Both are 16x16 pixel art, packed with no spacing.
 */
export const SHEET_URL = '/games/td_tiny.png';
export const TILE_SRC = 16;
export const SHEET_W = 384;
export const SHEET_H = 176;

const tt = (col: number, row: number) => ({ sx: col * 16, sy: row * 16 });
const td = (col: number, row: number) => ({ sx: 192 + col * 16, sy: row * 16 });

export const SPRITES = {
  // --- terrain (Tiny Town) ---
  grass: tt(0, 0),
  grassAlt: tt(1, 0),
  flower: tt(2, 0),
  sand: tt(0, 1),
  dirt: tt(1, 1),
  stone: tt(7, 3),
  water: tt(4, 3),

  // --- decor ---
  treeA: tt(4, 0),
  treeB: tt(3, 0),
  pineS: tt(6, 0),
  pineL: tt(6, 0),
  bush: tt(5, 0),
  rockS: td(0, 1),
  rockM: td(0, 2),
  rockL: td(0, 2),

  // --- tower buildings (the weapon on top is drawn in code) ---
  bldTower: tt(0, 6),    // brown wall — archers
  bldWorkshop: tt(2, 6), // brown arch — catapult
  bldChapel: tt(0, 4),   // blue roof — mages
  bldKeep: tt(4, 7),     // grey door — ballista
  bldForge: tt(4, 4),    // red roof — oil cauldron
  bldWall: tt(0, 5),     // blue brick — storm tower
  castle: tt(4, 10),     // stone gate — the player's keep

  // --- enemies (Tiny Dungeon) ---
  unitPeasant: td(1, 7),   // villager
  unitKnight: td(0, 8),    // armoured knight
  unitSpear: td(4, 9),     // green ranger (cavalry)
  unitRobe: td(3, 9),      // dark druid (shaman)
  unitShield: td(1, 9),    // orc (ogre)
  unitGolem: td(4, 8),     // heavy plate (golem)
  unitKnightRed: td(3, 7), // plumed knight (boss)
  unitGhost: td(1, 10),    // ghost (flyer)
  unitSpider: td(0, 10),   // spider (swarm)
  unitWizard: td(0, 7),    // wizard (necromancer)
  unitDemon: td(2, 9),     // red demon (wraith)
  unitSlime: td(0, 9),     // slime (regenerator)
} as const;

export type SpriteKey = keyof typeof SPRITES;

export function loadSheet(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się wczytać grafiki mapy'));
    img.src = SHEET_URL;
  });
}

/** Draw a 16px source tile scaled into a destination box (pixel-art, no smoothing). */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  key: SpriteKey,
  dx: number,
  dy: number,
  size: number
) {
  const s = SPRITES[key];
  ctx.drawImage(sheet, s.sx, s.sy, TILE_SRC, TILE_SRC, dx, dy, size, size);
}

/** CSS rules that show one tile as a crisp HTML icon (for the bestiary). */
export function spriteStyle(sx: number, sy: number, size: number) {
  const scale = size / TILE_SRC;
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${SHEET_URL})`,
    backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
    backgroundPosition: `-${sx * scale}px -${sy * scale}px`,
    imageRendering: 'pixelated' as const,
  };
}
