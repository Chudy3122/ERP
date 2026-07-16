/**
 * Permanent progression — the "Kronika Mistrza" tree.
 *
 * Stars are earned per chapter (best result is kept, so replaying a chapter
 * better pays out the difference) and spent on branches. Every branch is a
 * chain: a node only opens once the one before it is bought, RPG style.
 */
import { TOWER_ORDER, TOWERS, type TowerKind } from './config';

export type BranchId = TowerKind | 'abilities' | 'economy' | 'castle';

export type PerkNode = {
  name: string;
  desc: string;
  cost: number; // stars
};

export type Branch = {
  id: BranchId;
  name: string;
  kind: 'tower' | 'support';
  color: string;
  nodes: [PerkNode, PerkNode, PerkNode];
};

/** Tower branches all follow the same shape: hit harder, reach further, build cheaper. */
const towerBranch = (k: TowerKind): Branch => ({
  id: k,
  name: TOWERS[k].name,
  kind: 'tower',
  color: TOWERS[k].accent,
  nodes: [
    { name: 'Wprawa', desc: '+15% obrażeń', cost: 1 },
    { name: 'Dalekowzroczność', desc: '+12% zasięgu', cost: 2 },
    { name: 'Tania budowa', desc: '-20% kosztu budowy', cost: 3 },
  ],
});

export const BRANCHES: Branch[] = [
  ...TOWER_ORDER.map(towerBranch),
  {
    id: 'abilities',
    name: 'Umiejętności',
    kind: 'support',
    color: '#F7941D',
    nodes: [
      { name: 'Szybkie ręce', desc: '-15% czasu odnowienia', cost: 1 },
      { name: 'Grad strzał', desc: '+40% obrażeń deszczu strzał', cost: 2 },
      { name: 'Głęboki mróz', desc: '+1.5s zamrożenia', cost: 3 },
    ],
  },
  {
    id: 'economy',
    name: 'Ekonomia',
    kind: 'support',
    color: '#CA8A04',
    nodes: [
      { name: 'Skarbiec', desc: '+120 złota na start', cost: 1 },
      { name: 'Łupy', desc: '+25% złota za zabójstwa', cost: 2 },
      { name: 'Danina', desc: '+50% złota za odpartą falę', cost: 3 },
    ],
  },
  {
    id: 'castle',
    name: 'Zamek',
    kind: 'support',
    color: '#B91C1C',
    nodes: [
      { name: 'Mury', desc: '+4 HP zamku', cost: 1 },
      { name: 'Fosa', desc: 'Przecieki ranią o 1 mniej', cost: 2 },
      { name: 'Donżon', desc: '+6 HP zamku', cost: 3 },
    ],
  },
];

/** How many nodes of each branch are bought. */
export type PerkState = Partial<Record<BranchId, number>>;

export type Perks = {
  towerDmg: Record<TowerKind, number>;
  towerRange: Record<TowerKind, number>;
  towerCost: Record<TowerKind, number>;
  abilityCd: number;
  arrowsDmg: number;
  freezeBonusMs: number;
  startGold: number;
  killGold: number;
  waveGold: number;
  castleHp: number;
  leakReduce: number;
};

/** Turn bought nodes into the multipliers the game actually reads. */
export function perksFrom(state: PerkState): Perks {
  const one = () => Object.fromEntries(TOWER_ORDER.map((k) => [k, 1])) as Record<TowerKind, number>;
  const p: Perks = {
    towerDmg: one(),
    towerRange: one(),
    towerCost: one(),
    abilityCd: 1,
    arrowsDmg: 1,
    freezeBonusMs: 0,
    startGold: 0,
    killGold: 1,
    waveGold: 1,
    castleHp: 0,
    leakReduce: 0,
  };
  for (const k of TOWER_ORDER) {
    const n = state[k] ?? 0;
    if (n >= 1) p.towerDmg[k] = 1.15;
    if (n >= 2) p.towerRange[k] = 1.12;
    if (n >= 3) p.towerCost[k] = 0.8;
  }
  const ab = state.abilities ?? 0;
  if (ab >= 1) p.abilityCd = 0.85;
  if (ab >= 2) p.arrowsDmg = 1.4;
  if (ab >= 3) p.freezeBonusMs = 1500;

  const ec = state.economy ?? 0;
  if (ec >= 1) p.startGold = 120;
  if (ec >= 2) p.killGold = 1.25;
  if (ec >= 3) p.waveGold = 1.5;

  const ca = state.castle ?? 0;
  if (ca >= 1) p.castleHp += 4;
  if (ca >= 2) p.leakReduce = 1;
  if (ca >= 3) p.castleHp += 6;

  return p;
}

export const branchSpent = (b: Branch, bought: number) =>
  b.nodes.slice(0, bought).reduce((s, n) => s + n.cost, 0);

export const totalSpent = (state: PerkState) =>
  BRANCHES.reduce((s, b) => s + branchSpent(b, state[b.id] ?? 0), 0);

/**
 * Stars for a chapter: one for clearing it, one for losing at most 3 HP,
 * one for taking no damage at all.
 */
export function starsFor(hpLost: number): number {
  let s = 1;
  if (hpLost <= 3) s += 1;
  if (hpLost === 0) s += 1;
  return s;
}

export const MAX_STARS_PER_CHAPTER = 3;

// ---- persistence ----
const KEY = 'td_meta_v1';

export type Meta = {
  /** Best star count earned per chapter id. */
  stars: Record<number, number>;
  perks: PerkState;
};

export const emptyMeta = (): Meta => ({ stars: {}, perks: {} });

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyMeta();
    const m = JSON.parse(raw) as Meta;
    return { stars: m.stars ?? {}, perks: m.perks ?? {} };
  } catch {
    return emptyMeta();
  }
}

export function saveMeta(m: Meta) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* private mode — progress just won't persist */
  }
}

export const earnedStars = (m: Meta) => Object.values(m.stars).reduce((s, v) => s + v, 0);
export const availableStars = (m: Meta) => earnedStars(m) - totalSpent(m.perks);
