/**
 * Sprite atlas for the Kenney "Medieval RTS" tilesheet (CC0 / public domain).
 * Source: https://kenney.nl/assets/medieval-rts — see medieval_tilesheet_LICENSE.txt
 *
 * The sheet is a regular grid: 64x64 tiles, 32px margin around the sheet and
 * 32px spacing between tiles, so a tile at (col,row) sits at
 *   x = 32 + col * 96,  y = 32 + row * 96
 */
export const SHEET_URL = '/games/medieval_tilesheet.png';
export const TILE_SRC = 64;

const at = (col: number, row: number) => ({ sx: 32 + col * 96, sy: 32 + row * 96 });

export const SPRITES = {
  grass: at(0, 0),
  grassAlt: at(1, 0),
  sand: at(2, 0),
  dirt: at(0, 1),
  stone: at(2, 1),
  water: at(0, 2),

  treeA: at(4, 3),
  treeB: at(5, 3),
  pineS: at(6, 3),
  pineL: at(7, 3),

  rockS: at(5, 4),
  rockM: at(6, 4),
  rockL: at(7, 4),
  bush: at(10, 4),

  castleWall: at(16, 0),
  castle: at(16, 1),
  tower: at(15, 1),
} as const;

export type SpriteKey = keyof typeof SPRITES;

/** Loads the tilesheet once and hands back a ready <img>. */
export function loadSheet(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się wczytać grafiki mapy'));
    img.src = SHEET_URL;
  });
}

/** Draw a sprite scaled into a destination box. */
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
