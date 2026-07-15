/** Tower Defense — balance data kept out of the component. */

export const CELL = 40;
export const COLS = 16;
export const ROWS = 12;
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 480

export const START_GOLD = 300;
export const START_HP = 20;

/** Enemy route in cell coordinates (centres). Starts off-screen left, ends at the castle. */
export const PATH: { x: number; y: number }[] = [
  { x: -1, y: 1 },
  { x: 3, y: 1 },
  { x: 3, y: 5 },
  { x: 7, y: 5 },
  { x: 7, y: 2 },
  { x: 11, y: 2 },
  { x: 11, y: 8 },
  { x: 5, y: 8 },
  { x: 5, y: 10 },
  { x: 14.4, y: 10 },
];
/** Castle sits at the end of the road. */
export const CASTLE_CELL = { x: 14.6, y: 10 };

// ---------------- Towers ----------------
export type TowerKind = 'archer' | 'catapult' | 'mage' | 'ballista';

export type TowerLevel = {
  damage: number;
  range: number;      // in pixels
  cooldown: number;   // ms between shots
  cost: number;       // cost to reach this level (build cost for lvl 1)
};

export type TowerDef = {
  kind: TowerKind;
  name: string;
  desc: string;
  color: string;
  accent: string;
  hitsAir: boolean;
  splash?: number;    // splash radius in px
  slow?: number;      // slow factor applied to hit enemies (0.5 = half speed)
  slowMs?: number;
  armorPierce?: boolean;
  levels: [TowerLevel, TowerLevel, TowerLevel];
};

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: 'archer',
    name: 'Łucznicy',
    desc: 'Szybkostrzelna, tania, trafia też w powietrze.',
    color: '#8B5E34',
    accent: '#F7941D',
    hitsAir: true,
    levels: [
      { damage: 8, range: 105, cooldown: 520, cost: 90 },
      { damage: 14, range: 120, cooldown: 440, cost: 110 },
      { damage: 22, range: 135, cooldown: 360, cost: 190 },
    ],
  },
  catapult: {
    kind: 'catapult',
    name: 'Katapulta',
    desc: 'Wolna, obszarowa. Nie trafia w latające.',
    color: '#6B4423',
    accent: '#D97706',
    hitsAir: false,
    splash: 46,
    levels: [
      { damage: 22, range: 125, cooldown: 1500, cost: 150 },
      { damage: 36, range: 140, cooldown: 1350, cost: 170 },
      { damage: 56, range: 155, cooldown: 1150, cost: 260 },
    ],
  },
  mage: {
    kind: 'mage',
    name: 'Wieża magów',
    desc: 'Spowalnia wrogów mrozem, trafia w powietrze.',
    color: '#4C51BF',
    accent: '#7DD3FC',
    hitsAir: true,
    slow: 0.45,
    slowMs: 1400,
    levels: [
      { damage: 6, range: 100, cooldown: 800, cost: 130 },
      { damage: 11, range: 115, cooldown: 700, cost: 150 },
      { damage: 18, range: 130, cooldown: 600, cost: 230 },
    ],
  },
  ballista: {
    kind: 'ballista',
    name: 'Balista',
    desc: 'Daleki zasięg, przebija pancerz.',
    color: '#57534E',
    accent: '#FCD34D',
    hitsAir: true,
    armorPierce: true,
    levels: [
      { damage: 30, range: 165, cooldown: 1300, cost: 170 },
      { damage: 48, range: 185, cooldown: 1150, cost: 200 },
      { damage: 76, range: 205, cooldown: 950, cost: 300 },
    ],
  },
};

export const TOWER_ORDER: TowerKind[] = ['archer', 'catapult', 'mage', 'ballista'];

/** You get back this share of everything sunk into a tower. */
export const SELL_RATE = 0.6;

// ---------------- Enemies ----------------
export type EnemyKind = 'peasant' | 'soldier' | 'cavalry' | 'raven' | 'brute' | 'boss';

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;     // px per second
  armor: number;     // flat damage reduction per hit
  gold: number;
  points: number;
  flying?: boolean;
  radius: number;
  color: string;
  dark: string;
  leak: number;      // castle HP lost if it gets through
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  peasant: { kind: 'peasant', name: 'Chłop', hp: 34, speed: 52, armor: 0, gold: 8, points: 10, radius: 9, color: '#D6A06A', dark: '#8B5E34', leak: 1 },
  soldier: { kind: 'soldier', name: 'Zbrojny', hp: 78, speed: 40, armor: 4, gold: 14, points: 20, radius: 10, color: '#94A3B8', dark: '#475569', leak: 1 },
  cavalry: { kind: 'cavalry', name: 'Kawaleria', hp: 62, speed: 95, armor: 1, gold: 16, points: 25, radius: 11, color: '#B45309', dark: '#7C2D12', leak: 2 },
  raven: { kind: 'raven', name: 'Kruk', hp: 46, speed: 78, armor: 0, gold: 15, points: 25, radius: 9, color: '#475569', dark: '#1E293B', flying: true, leak: 1 },
  brute: { kind: 'brute', name: 'Ogr', hp: 260, speed: 28, armor: 7, gold: 40, points: 60, radius: 14, color: '#65A30D', dark: '#3F6212', leak: 3 },
  boss: { kind: 'boss', name: 'Czarny Rycerz', hp: 900, speed: 30, armor: 12, gold: 150, points: 250, radius: 18, color: '#1F2937', dark: '#0F172A', leak: 6 },
};

// ---------------- Waves ----------------
export type WaveGroup = { kind: EnemyKind; count: number; gap: number };

export const WAVES: WaveGroup[][] = [
  [{ kind: 'peasant', count: 8, gap: 800 }],
  [{ kind: 'peasant', count: 12, gap: 650 }],
  [{ kind: 'peasant', count: 8, gap: 600 }, { kind: 'soldier', count: 4, gap: 900 }],
  [{ kind: 'soldier', count: 9, gap: 700 }, { kind: 'cavalry', count: 3, gap: 900 }],
  [{ kind: 'boss', count: 1, gap: 0 }, { kind: 'peasant', count: 10, gap: 500 }],
  [{ kind: 'cavalry', count: 8, gap: 550 }, { kind: 'soldier', count: 6, gap: 700 }],
  [{ kind: 'raven', count: 8, gap: 600 }],
  [{ kind: 'soldier', count: 12, gap: 500 }, { kind: 'raven', count: 5, gap: 700 }],
  [{ kind: 'brute', count: 3, gap: 1400 }, { kind: 'cavalry', count: 8, gap: 500 }],
  [{ kind: 'boss', count: 1, gap: 0 }, { kind: 'raven', count: 8, gap: 500 }, { kind: 'soldier', count: 8, gap: 600 }],
  [{ kind: 'cavalry', count: 14, gap: 380 }],
  [{ kind: 'brute', count: 5, gap: 1100 }, { kind: 'raven', count: 8, gap: 500 }],
  [{ kind: 'soldier', count: 18, gap: 380 }, { kind: 'brute', count: 3, gap: 1200 }],
  [{ kind: 'raven', count: 16, gap: 380 }, { kind: 'cavalry', count: 10, gap: 450 }],
  [{ kind: 'boss', count: 2, gap: 2600 }, { kind: 'brute', count: 4, gap: 1000 }],
  [{ kind: 'brute', count: 8, gap: 850 }, { kind: 'soldier', count: 14, gap: 400 }],
  [{ kind: 'cavalry', count: 20, gap: 300 }, { kind: 'raven', count: 12, gap: 400 }],
  [{ kind: 'brute', count: 10, gap: 700 }, { kind: 'boss', count: 1, gap: 0 }],
  [{ kind: 'raven', count: 22, gap: 300 }, { kind: 'brute', count: 8, gap: 700 }],
  [{ kind: 'boss', count: 3, gap: 2200 }, { kind: 'brute', count: 10, gap: 600 }, { kind: 'cavalry', count: 16, gap: 320 }],
];

/**
 * Waves past the scripted list keep coming, scaled up. Endless mode.
 * Wave index is 0-based.
 */
export function waveGroups(index: number): WaveGroup[] {
  if (index < WAVES.length) return WAVES[index];
  const over = index - WAVES.length + 1;
  return [
    { kind: 'boss', count: 1 + Math.floor(over / 3), gap: 2000 },
    { kind: 'brute', count: 8 + over * 2, gap: 600 },
    { kind: 'cavalry', count: 14 + over * 2, gap: 300 },
    { kind: 'raven', count: 10 + over * 2, gap: 350 },
  ];
}

/** HP multiplier for waves beyond the scripted ones, so endless stays hard. */
export function endlessHpMul(index: number): number {
  if (index < WAVES.length) return 1;
  return 1 + (index - WAVES.length + 1) * 0.35;
}

export const WAVE_CLEAR_GOLD = 60;
export const WAVE_CLEAR_POINTS = 100;

// ---------------- Abilities ----------------
export const ABILITIES = {
  arrows: { name: 'Deszcz strzał', cooldown: 30000, damage: 55, radius: 78, desc: 'Kliknij w mapę — rani wszystkich w obszarze.' },
  freeze: { name: 'Zamrożenie', cooldown: 45000, ms: 3200, desc: 'Zamraża wszystkich wrogów na chwilę.' },
} as const;
