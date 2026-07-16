/** Tower Defense — balance data kept out of the component. */
import type { SpriteKey } from './atlas';

export const CELL = 40;
export const COLS = 16;
export const ROWS = 14;
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 560

export const START_GOLD = 320;
export const START_HP = 20;

/**
 * Starting gold scales with how tough the chapter's enemies are, so jumping
 * straight into chapter 5 gives you the buying power that chapter demands —
 * otherwise you arrive with chapter-1 pocket money against 2.7x HP enemies.
 * Used as a floor for campaign carry-over too, so difficulty doesn't depend on
 * how you entered the chapter.
 */
export const startGoldFor = (levelIdx: number) =>
  Math.round(START_GOLD * (LEVELS[levelIdx]?.hpMul ?? 1));

// ---------------- Towers ----------------
export type TowerKind = 'archer' | 'catapult' | 'mage' | 'ballista' | 'oil' | 'tesla';

export type TowerLevel = {
  damage: number;
  range: number;      // px
  cooldown: number;   // ms between shots
  cost: number;       // build cost for lvl 1, upgrade cost for 2 and 3
};

export type TowerDef = {
  kind: TowerKind;
  name: string;
  desc: string;
  color: string;
  accent: string;
  hitsAir: boolean;
  splash?: number;    // splash radius (px)
  slow?: number;      // speed multiplier applied on hit
  slowMs?: number;
  armorPierce?: boolean;
  burn?: number;      // damage per second, ignores armour
  burnMs?: number;
  chain?: number;     // number of extra enemies the bolt jumps to
  levels: [TowerLevel, TowerLevel, TowerLevel];
};

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: 'archer',
    name: 'Łucznicy',
    desc: 'Szybkostrzelna i tania. Słaba przeciw pancerzowi.',
    color: '#8B5E34',
    accent: '#F7941D',
    hitsAir: true,
    levels: [
      { damage: 13, range: 110, cooldown: 500, cost: 90 },
      { damage: 22, range: 125, cooldown: 420, cost: 130 },
      { damage: 36, range: 140, cooldown: 340, cost: 220 },
    ],
  },
  catapult: {
    kind: 'catapult',
    name: 'Katapulta',
    desc: 'Obszarowa, wolna. Nie trafia w latające.',
    color: '#6B4423',
    accent: '#D97706',
    hitsAir: false,
    splash: 48,
    levels: [
      { damage: 26, range: 125, cooldown: 1500, cost: 190 },
      { damage: 44, range: 140, cooldown: 1350, cost: 230 },
      { damage: 70, range: 155, cooldown: 1150, cost: 340 },
    ],
  },
  mage: {
    kind: 'mage',
    name: 'Wieża magów',
    desc: 'Mrozi i spowalnia wrogów. Trafia w latające.',
    color: '#4C51BF',
    accent: '#7DD3FC',
    hitsAir: true,
    slow: 0.45,
    slowMs: 1400,
    levels: [
      { damage: 7, range: 100, cooldown: 800, cost: 170 },
      { damage: 13, range: 115, cooldown: 700, cost: 200 },
      { damage: 21, range: 130, cooldown: 600, cost: 300 },
    ],
  },
  ballista: {
    kind: 'ballista',
    name: 'Balista',
    desc: 'Daleki zasięg, przebija pancerz na wylot.',
    color: '#57534E',
    accent: '#FCD34D',
    hitsAir: true,
    armorPierce: true,
    levels: [
      { damage: 34, range: 165, cooldown: 1300, cost: 220 },
      { damage: 56, range: 185, cooldown: 1150, cost: 270 },
      { damage: 88, range: 205, cooldown: 950, cost: 390 },
    ],
  },
  oil: {
    kind: 'oil',
    name: 'Kocioł smoły',
    desc: 'Podpala — obrażenia z czasem ignorują pancerz.',
    color: '#78350F',
    accent: '#F97316',
    hitsAir: false,
    splash: 40,
    burn: 16,
    burnMs: 3000,
    levels: [
      { damage: 10, range: 95, cooldown: 1600, cost: 230 },
      { damage: 18, range: 108, cooldown: 1450, cost: 280 },
      { damage: 30, range: 120, cooldown: 1250, cost: 400 },
    ],
  },
  tesla: {
    kind: 'tesla',
    name: 'Wieża burz',
    desc: 'Piorun przeskakuje między wrogami. Trafia w latające.',
    color: '#1E3A8A',
    accent: '#A5F3FC',
    hitsAir: true,
    chain: 3,
    levels: [
      { damage: 20, range: 120, cooldown: 1100, cost: 280 },
      { damage: 32, range: 135, cooldown: 980, cost: 330 },
      { damage: 50, range: 150, cooldown: 820, cost: 460 },
    ],
  },
};

export const TOWER_ORDER: TowerKind[] = ['archer', 'catapult', 'mage', 'ballista', 'oil', 'tesla'];

/** You get back this share of everything sunk into a tower. */
export const SELL_RATE = 0.55;

// ---------------- Enemies ----------------
export type EnemyKind = 'peasant' | 'soldier' | 'cavalry' | 'raven' | 'brute' | 'shaman' | 'golem' | 'wraith' | 'boss';

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  /** Shown in the bestiary — say how to counter it, not what it is. */
  desc: string;
  hp: number;
  speed: number;     // px/s
  armor: number;     // flat reduction per hit
  gold: number;
  points: number;
  flying?: boolean;
  heals?: number;    // HP per second restored to nearby allies
  /** Dies into this many smaller copies — Bloons-style. */
  splitsInto?: { kind: EnemyKind; count: number };
  radius: number;
  color: string;
  dark: string;
  leak: number;      // castle HP lost if it gets through
};

/**
 * Armour is the anti-spam lever (it bites per hit, so weak fast towers suffer),
 * but it has to stay low early or level 1 becomes unwinnable. The real armour
 * ramp lives in endless waves — see enemyScale.
 */
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  peasant: { kind: 'peasant', name: 'Listokrył', desc: 'Liczny, ale bezbronny robal. Padnie od byle strzały.', hp: 32, speed: 52, armor: 0, gold: 7, points: 10, radius: 9, color: '#65A30D', dark: '#3F6212', leak: 1 },
  soldier: { kind: 'soldier', name: 'Skorpion', desc: 'Twardy pancerz tępi słabe strzały. Balista przebija go na wylot.', hp: 78, speed: 40, armor: 2, gold: 11, points: 20, radius: 10, color: '#3B82F6', dark: '#1E3A8A', leak: 1 },
  cavalry: { kind: 'cavalry', name: 'Ognik', desc: 'Mknie szybciej, niż zdążysz wycelować. Spowolnij go magiem.', hp: 80, speed: 98, armor: 1, gold: 12, points: 25, radius: 11, color: '#B45309', dark: '#7C2D12', leak: 2 },
  raven: { kind: 'raven', name: 'Pustkomotyl', desc: 'Lata nad wszystkim. Katapulta i smoła go nie dosięgną.', hp: 58, speed: 82, armor: 0, gold: 12, points: 25, radius: 9, color: '#7C3AED', dark: '#4C1D95', flying: true, leak: 1 },
  brute: { kind: 'brute', name: 'Krab Magmowy', desc: 'Powolny kolos na strzały. Smoła pali go mimo pancerza.', hp: 320, speed: 28, armor: 6, gold: 30, points: 60, radius: 14, color: '#EA580C', dark: '#9A3412', leak: 3 },
  shaman: { kind: 'shaman', name: 'Żuk-znachor', desc: 'Leczy wszystko wokół siebie. Zabij go pierwszego, bo zmarnujesz ogień.', hp: 140, speed: 46, armor: 3, gold: 26, points: 55, radius: 10, color: '#0891B2', dark: '#155E75', heals: 12, leak: 2 },
  golem: { kind: 'golem', name: 'Pancerna Osa', desc: 'Twarda skorupa. Bez balisty albo smoły ledwo ją zadrapiesz.', hp: 520, speed: 22, armor: 14, gold: 45, points: 90, radius: 15, color: '#CA8A04', dark: '#854D0E', leak: 3 },
  wraith: { kind: 'wraith', name: 'Szarańcza', desc: 'Po śmierci rozpada się na dwa motyle. Miej czym strącić latające.', hp: 190, speed: 60, armor: 2, gold: 20, points: 45, radius: 11, color: '#16A34A', dark: '#14532D', splitsInto: { kind: 'raven', count: 2 }, leak: 2 },
  boss: { kind: 'boss', name: 'Królowa Roju', desc: 'Potężna matka roju. Skup na niej balisty i zamroź ją.', hp: 1300, speed: 32, armor: 10, gold: 110, points: 250, radius: 18, color: '#DC2626', dark: '#7F1D1D', leak: 5 },
};

// ---------------- Levels ----------------
export type LevelDef = {
  id: number;
  name: string;
  blurb: string;
  path: { x: number; y: number }[];
  base: SpriteKey;
  alt: SpriteKey;
  decor: SpriteKey[];
  decorDensity: number;
  waves: number;
  /** Global multiplier on enemy HP for this level. */
  hpMul: number;
  /** Extra flat armour added to every enemy on this level. */
  armorAdd: number;
  pool: EnemyKind[];
  /** Tower unlocked by clearing this level. */
  unlocks?: TowerKind;
  /** Enemies here shrug off frost — the mage's slow is weaker. */
  frostResist?: number;
  /** Enemies here shrug off fire — the oil cauldron's burn is weaker. */
  fireResist?: number;
  /** Fog: every tower's range is cut. */
  fog?: number;
};

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'Dolina Wiosenna',
    blurb: 'Spokojny trakt przez łąki. Dobre miejsce, żeby nauczyć się rzemiosła.',
    path: [{ x: -1, y: 2 }, { x: 5, y: 2 }, { x: 5, y: 8 }, { x: 11, y: 8 }, { x: 11, y: 4 }, { x: 14.4, y: 4 }],
    base: 'grass', alt: 'grassAlt',
    decor: ['treeA', 'treeB', 'bush', 'rockS'],
    decorDensity: 0.16,
    waves: 8,
    hpMul: 1,
    armorAdd: 0,
    pool: ['peasant', 'soldier'],
    unlocks: 'mage',
  },
  {
    id: 2,
    name: 'Kamienny Trakt',
    blurb: 'Kręta droga wśród głazów. Jeźdźcy przemykają szybciej, niż się spodziewasz.',
    path: [{ x: -1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 2 }, { x: 11, y: 2 }, { x: 11, y: 8 }, { x: 5, y: 8 }, { x: 5, y: 10 }, { x: 14.4, y: 10 }],
    base: 'grass', alt: 'stone',
    decor: ['rockS', 'rockM', 'rockL', 'pineS'],
    decorDensity: 0.2,
    waves: 10,
    hpMul: 1.25,
    armorAdd: 0,
    pool: ['peasant', 'soldier', 'cavalry'],
    unlocks: 'ballista',
  },
  {
    id: 3,
    name: 'Pustynny Szlak',
    blurb: 'Długi wąż drogi przez piaski. Kruki nadlatują znad wydm.',
    path: [{ x: -1, y: 0 }, { x: 13, y: 0 }, { x: 13, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 6 }, { x: 13, y: 6 }, { x: 13, y: 9 }, { x: 2, y: 9 }, { x: 2, y: 11 }, { x: 14.4, y: 11 }],
    base: 'sand', alt: 'sand',
    decor: ['rockM', 'rockS', 'bush'],
    decorDensity: 0.24,
    waves: 12,
    hpMul: 1.6,
    armorAdd: 1,
    pool: ['peasant', 'soldier', 'cavalry', 'raven'],
    unlocks: 'oil',
  },
  {
    id: 4,
    name: 'Mokradła',
    blurb: 'Grząski labirynt. Ogry brną powoli, ale szamani leczą wszystko wokół.',
    path: [{ x: -1, y: 11 }, { x: 1, y: 11 }, { x: 1, y: 1 }, { x: 14, y: 1 }, { x: 14, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 10 }, { x: 14.4, y: 10 }],
    base: 'grass', alt: 'water',
    decor: ['pineS', 'pineL', 'treeA', 'rockS'],
    decorDensity: 0.26,
    waves: 14,
    hpMul: 2.1,
    armorAdd: 2,
    pool: ['soldier', 'cavalry', 'raven', 'brute', 'shaman'],
    unlocks: 'tesla',
  },
  {
    id: 5,
    name: 'Twierdza',
    blurb: 'Ostatni bastion. Za falą 15 hordy nie przestają nadchodzić — jak długo wytrzymasz?',
    path: [{ x: -1, y: 5 }, { x: 3, y: 5 }, { x: 3, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 1 }, { x: 12, y: 1 }, { x: 12, y: 9 }, { x: 14.4, y: 9 }],
    base: 'stone', alt: 'grass',
    decor: ['rockL', 'rockM', 'pineL'],
    decorDensity: 0.28,
    waves: 15,
    hpMul: 2.7,
    armorAdd: 3,
    pool: ['soldier', 'cavalry', 'raven', 'brute', 'shaman', 'boss'],
  },
  {
    id: 6,
    name: 'Zamarznięte Przełęcze',
    blurb: 'Mróz nie robi tu wrażenia — wrogowie wychowali się w śniegu. Magowie ledwo ich spowolnią.',
    path: [{ x: -1, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 10 }, { x: 12, y: 10 }, { x: 12, y: 3 }, { x: 14.4, y: 3 }],
    base: 'stone', alt: 'water',
    decor: ['pineS', 'pineL', 'rockL'],
    decorDensity: 0.24,
    waves: 12,
    hpMul: 3.1,
    armorAdd: 3,
    pool: ['soldier', 'cavalry', 'raven', 'brute', 'boss'],
    frostResist: 0.6,
  },
  {
    id: 7,
    name: 'Kopalnie Krasnoludów',
    blurb: 'Z głębi nadciągają golemy w kamiennej skorupie. Zwykłe strzały się od nich odbijają.',
    path: [{ x: -1, y: 10 }, { x: 2, y: 10 }, { x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 8 }, { x: 10, y: 8 }, { x: 10, y: 1 }, { x: 13, y: 1 }, { x: 13, y: 6 }, { x: 14.4, y: 6 }],
    base: 'stone', alt: 'dirt',
    decor: ['rockL', 'rockM', 'rockS'],
    decorDensity: 0.3,
    waves: 13,
    hpMul: 3.4,
    armorAdd: 5,
    pool: ['soldier', 'brute', 'golem', 'shaman', 'boss'],
  },
  {
    id: 8,
    name: 'Spalone Pola',
    blurb: 'Wypalona ziemia. Ogień już nikogo tu nie straszy, a droga wije się bez końca.',
    path: [{ x: -1, y: 1 }, { x: 14, y: 1 }, { x: 14, y: 4 }, { x: 1, y: 4 }, { x: 1, y: 7 }, { x: 14, y: 7 }, { x: 14, y: 10 }, { x: 3, y: 10 }, { x: 3, y: 11 }, { x: 14.4, y: 11 }],
    base: 'dirt', alt: 'sand',
    decor: ['rockS', 'bush', 'treeA'],
    decorDensity: 0.22,
    waves: 14,
    hpMul: 3.8,
    armorAdd: 5,
    pool: ['cavalry', 'raven', 'brute', 'golem', 'shaman', 'boss'],
    fireResist: 0.55,
  },
  {
    id: 9,
    name: 'Przeprawa',
    blurb: 'Wąski bród wśród mokradeł. Miejsca na wieże jak na lekarstwo, a niebo czarne od kruków.',
    path: [{ x: -1, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 5 }, { x: 13, y: 5 }, { x: 13, y: 11 }, { x: 14.4, y: 11 }],
    base: 'water', alt: 'grass',
    decor: ['pineL', 'pineS', 'treeB', 'rockM', 'bush'],
    decorDensity: 0.4,
    waves: 14,
    hpMul: 4.6,
    armorAdd: 6,
    pool: ['cavalry', 'raven', 'wraith', 'brute', 'shaman', 'boss'],
    fog: 0.85,
  },
  {
    id: 10,
    name: 'Wrota Cienia',
    blurb: 'Ostatnia brama. Cienie rozpadają się na kolejne cienie, a Czarni Rycerze nie przychodzą pojedynczo.',
    path: [{ x: -1, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 8 }, { x: 12, y: 8 }, { x: 12, y: 2 }, { x: 14, y: 2 }, { x: 14, y: 11 }, { x: 5, y: 11 }, { x: 5, y: 10 }],
    base: 'stone', alt: 'stone',
    decor: ['rockL', 'rockM'],
    decorDensity: 0.26,
    waves: 15,
    hpMul: 4.8,
    armorAdd: 7,
    pool: ['cavalry', 'raven', 'wraith', 'brute', 'golem', 'shaman', 'boss'],
    fog: 0.92,
  },
];

/** Towers you start with; the rest are earned by clearing levels. */
export const STARTING_TOWERS: TowerKind[] = ['archer', 'catapult'];

export function unlockedAfter(levelsCleared: number): TowerKind[] {
  const out = [...STARTING_TOWERS];
  for (let i = 0; i < Math.min(levelsCleared, LEVELS.length); i++) {
    const u = LEVELS[i].unlocks;
    if (u) out.push(u);
  }
  return out;
}

// ---------------- Waves ----------------
export type WaveGroup = { kind: EnemyKind; count: number; gap: number };

/** The last level never stops — waves past its script are endless. */
export const isEndless = (levelIdx: number, waveIdx: number) =>
  levelIdx === LEVELS.length - 1 && waveIdx >= LEVELS[levelIdx].waves;

/**
 * Waves are generated per level from its enemy pool so each map escalates on
 * its own curve, instead of one shared script.
 */
export function waveFor(levelIdx: number, waveIdx: number): WaveGroup[] {
  const L = LEVELS[levelIdx];
  const endless = waveIdx >= L.waves;
  const over = endless ? waveIdx - L.waves + 1 : 0;
  const t = Math.min(1, waveIdx / Math.max(1, L.waves - 1)); // 0..1 through the level
  const n = waveIdx + 1;
  const groups: WaveGroup[] = [];

  const has = (k: EnemyKind) => L.pool.includes(k);
  // Opening waves start at 55% size and grow to ~2.2x by the end of a chapter,
  // so wave 1 is a warm-up rather than a full-strength assault.
  const scale = (base: number) => Math.round(base * (0.55 + t * 1.65) + over * 2.5);

  const bossWave = (has('boss') && n % 5 === 0) || (endless && n % 3 === 0);
  if (bossWave) {
    groups.push({ kind: 'boss', count: 1 + Math.floor(over / 4), gap: 2400 });
  }

  if (has('golem') && (t > 0.3 || endless)) {
    groups.push({ kind: 'golem', count: Math.max(1, Math.round(1 + t * 3 + over)), gap: 1500 });
  }
  if (has('wraith') && (t > 0.2 || endless)) {
    groups.push({ kind: 'wraith', count: Math.max(2, scale(3)), gap: 700 });
  }
  if (has('brute') && (t > 0.25 || endless)) {
    groups.push({ kind: 'brute', count: Math.max(1, scale(2)), gap: 1100 });
  }
  if (has('shaman') && (t > 0.4 || endless)) {
    groups.push({ kind: 'shaman', count: Math.max(1, Math.round(1 + t * 2 + over)), gap: 1500 });
  }
  if (has('raven') && (t > 0.15 || endless)) {
    groups.push({ kind: 'raven', count: Math.max(2, scale(4)), gap: 520 });
  }
  if (has('cavalry') && (t > 0.1 || endless)) {
    groups.push({ kind: 'cavalry', count: Math.max(2, scale(4)), gap: 420 });
  }
  if (has('soldier')) {
    groups.push({ kind: 'soldier', count: Math.max(2, scale(5)), gap: 560 });
  }
  if (has('peasant') && !endless) {
    groups.push({ kind: 'peasant', count: Math.max(3, scale(6)), gap: 620 });
  }

  // Chapters whose pool has no peasant/soldier would otherwise produce an empty
  // opening wave, because every other type is gated behind a progress threshold.
  // Fall back to the chapter's own first enemy — never an off-pool one.
  if (!groups.length) {
    groups.push({ kind: L.pool[0], count: Math.max(2, scale(4)), gap: 520 });
  }
  return groups;
}

/**
 * Enemy scaling. Level sets the baseline; endless waves climb exponentially so
 * you cannot simply out-spam them with more towers.
 */
export function enemyScale(levelIdx: number, waveIdx: number) {
  const L = LEVELS[levelIdx];
  const within = 1 + (waveIdx / Math.max(1, L.waves)) * 0.5;
  const endless = waveIdx >= L.waves ? Math.pow(1.16, waveIdx - L.waves + 1) : 1;
  const over = Math.max(0, waveIdx - L.waves + 1);
  return {
    hpMul: L.hpMul * within * endless,
    armorAdd: L.armorAdd + Math.floor(over * 1.4),
  };
}

/** Reward for clearing a wave — deliberately modest, gold should stay tight. */
export const waveClearGold = (waveIdx: number) => 22 + waveIdx * 2;
export const WAVE_CLEAR_POINTS = 100;
export const LEVEL_CLEAR_POINTS = 750;
/** Leftover gold carried into the next level, so hoarding isn't punished too hard. */
export const CARRY_GOLD_RATE = 0.5;
export const LEVEL_START_BONUS = 150;

// ---------------- Abilities ----------------
export const ABILITIES = {
  arrows: { name: 'Deszcz strzał', cooldown: 34000, damage: 70, radius: 78, desc: 'Kliknij w mapę — rani wszystkich w obszarze.' },
  freeze: { name: 'Zamrożenie', cooldown: 48000, ms: 3000, desc: 'Zamraża wszystkich wrogów na chwilę.' },
} as const;
