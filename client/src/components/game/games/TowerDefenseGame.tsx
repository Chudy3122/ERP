import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Crown, Heart, Coins, Pause, FastForward, Trash2, ArrowUp, Swords, Snowflake, Lock, ChevronRight, Scroll, Star, Crosshair, Bomb, Sparkles, Target, Flame, Zap, type LucideIcon } from 'lucide-react';
import * as gameApi from '../../../api/game.api';
import GameLeaderboard, { useLeaderboard } from '../GameLeaderboard';
import ConfettiBurst from '../ConfettiBurst';
import { loadImages, drawEnemyFrame, drawTowerBase, type Images } from './td/art';
import {
  CELL, COLS, ROWS, W, H, START_GOLD, START_HP,
  TOWERS, TOWER_ORDER, SELL_RATE, ENEMIES, LEVELS, waveFor, enemyScale,
  waveClearGold, WAVE_CLEAR_POINTS, LEVEL_CLEAR_POINTS, CARRY_GOLD_RATE, LEVEL_START_BONUS,
  ABILITIES, unlockedAfter, isEndless, startGoldFor,
  type TowerKind, type EnemyKind,
} from './td/config';
import {
  makeRoute, pointAt, blockedCells, cellKey, pxToCell,
  applyArmor, pickTarget, chainTargets, cellToPx, type Route,
} from './td/engine';
import { loadMeta, saveMeta, perksFrom, starsFor, availableStars, type Meta, type Perks } from './td/perks';
import SkillTree from './td/SkillTree';
import Bestiary from './td/Bestiary';

const GAME = 'td';

/** Workshop icon per tower kind. */
const TOWER_ICON: Record<TowerKind, LucideIcon> = {
  archer: Crosshair,
  catapult: Bomb,
  mage: Sparkles,
  ballista: Target,
  oil: Flame,
  tesla: Zap,
};
const PROGRESS_KEY = 'td_progress_v1';

type Status = 'idle' | 'brief' | 'playing' | 'levelDone' | 'over';

type Tower = { id: number; c: number; r: number; x: number; y: number; kind: TowerKind; level: number; cd: number; angle: number; invested: number; recoil: number };
type Enemy = { id: number; kind: EnemyKind; hp: number; maxHp: number; dist: number; x: number; y: number; speed: number; armor: number; flying?: boolean; heals?: number; radius: number; slowMs: number; slowFactor: number; frozenMs: number; burnMs: number; burnDps: number; dead: boolean; hitFlash: number; wobble: number };
type Shot = { x: number; y: number; tx: number; ty: number; t: number; dur: number; kind: TowerKind; damage: number; targetId: number };
type Bolt = { pts: { x: number; y: number }[]; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Popup = { x: number; y: number; vy: number; life: number; max: number; text: string; color: string; size: number };
type Decor = { c: number; r: number; art: 'dec_tree' | 'dec_rock' | 'dec_rock2' };

const loadProgress = (): number => {
  try {
    const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10);
    return Number.isFinite(v) ? Math.max(0, Math.min(LEVELS.length - 1, v)) : 0;
  } catch {
    return 0;
  }
};
const saveProgress = (v: number) => {
  try { localStorage.setItem(PROGRESS_KEY, String(v)); } catch { /* private mode — progress just won't persist */ }
};

export default function TowerDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const imagesRef = useRef<Images | null>(null);

  const towers = useRef<Tower[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const shots = useRef<Shot[]>([]);
  const bolts = useRef<Bolt[]>([]);
  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);
  const decor = useRef<Decor[]>([]);
  const routeRef = useRef<Route>(makeRoute(LEVELS[0].path));
  const blocked = useRef<Set<string>>(new Set());
  const occupied = useRef<Set<string>>(new Set());
  const idRef = useRef(1);

  const goldRef = useRef(START_GOLD);
  const hpRef = useRef(START_HP);
  const scoreRef = useRef(0);
  const waveRef = useRef(0);
  const levelRef = useRef(0);
  const statusRef = useRef<Status>('idle');
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const lastTime = useRef(0);

  const queueRef = useRef<{ kind: EnemyKind; at: number }[]>([]);
  const waveClockRef = useRef(0);
  const waveActiveRef = useRef(false);
  const restMsRef = useRef(0);

  const buildRef = useRef<TowerKind | null>(null);
  const selectedRef = useRef<number | null>(null);
  const hoverRef = useRef<{ c: number; r: number } | null>(null);
  const aimingRef = useRef(false);
  const cdArrowsRef = useRef(0);
  const cdFreezeRef = useRef(0);
  const shakeRef = useRef(0);
  const flashRef = useRef<{ a: number; color: string }>({ a: 0, color: '255,255,255' });

  const [status, setStatus] = useState<Status>('idle');
  const [gold, setGold] = useState(START_GOLD);
  const [hp, setHp] = useState(START_HP);
  const [wave, setWave] = useState(0);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [build, setBuild] = useState<TowerKind | null>(null);
  const [selected, setSelected] = useState<Tower | null>(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [aiming, setAiming] = useState(false);
  const [cds, setCds] = useState({ arrows: 0, freeze: 0 });
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [waveActive, setWaveActive] = useState(false);
  const [cleared, setCleared] = useState(loadProgress);
  const [startAt, setStartAt] = useState(0);
  const [meta, setMeta] = useState<Meta>(loadMeta);
  const [treeOpen, setTreeOpen] = useState(false);
  const [earned, setEarned] = useState<number | null>(null);
  const perksRef = useRef<Perks>(perksFrom(loadMeta().perks));
  const hpLostRef = useRef(0);
  const [unlocked, setUnlocked] = useState<TowerKind[]>(() => unlockedAfter(loadProgress()));
  const [justUnlocked, setJustUnlocked] = useState<TowerKind | null>(null);
  const [lastResult, setLastResult] = useState<{ score: number; best: number; record: boolean; level: number; wave: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { board, reload } = useLeaderboard(GAME);

  useEffect(() => {
    let alive = true;
    loadImages()
      .then((imgs) => { if (alive) { imagesRef.current = imgs; setReady(true); } })
      .catch(() => { if (alive) setLoadErr(true); });
    return () => { alive = false; };
  }, []);

  // ---------- helpers ----------
  const puff = (x: number, y: number, color: string, count: number, power = 3) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * power;
      particles.current.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 18 + Math.random() * 18, size: 1.5 + Math.random() * 2.5, color });
    }
  };
  const popup = (x: number, y: number, text: string, color: string, size = 13) => {
    popups.current.push({ x, y, vy: -0.7, life: 0, max: 44, text, color, size });
  };

  const buildDecor = (lvl: number) => {
    const L = LEVELS[lvl];
    const out: Decor[] = [];
    occupied.current = new Set();
    const castleCell = L.path[L.path.length - 1];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (blocked.current.has(cellKey(c, r))) continue;
        if (Math.abs(c - castleCell.x) < 2 && Math.abs(r - castleCell.y) < 2) continue;
        // lighter scatter than the raw density — the map was too cluttered,
        // and obstacles can now be cleared for gold so fewer is better.
        if (Math.random() < L.decorDensity * 0.5) {
          const roll = Math.random();
          out.push({ c, r, art: roll < 0.55 ? 'dec_tree' : roll < 0.8 ? 'dec_rock' : 'dec_rock2' });
        }
      }
    }
    decor.current = out;
    for (const d of out) occupied.current.add(cellKey(d.c, d.r));
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    shakeRef.current = 16;
    flashRef.current = { a: 0.65, color: '239,68,68' };
    const finalScore = scoreRef.current;
    const lv = levelRef.current;
    const wv = waveRef.current;
    const prevBest = board?.me?.score ?? 0;
    try {
      const best = await gameApi.submitScore(GAME, finalScore);
      const record = finalScore > prevBest && finalScore > 0;
      setLastResult({ score: finalScore, best, record, level: lv + 1, wave: wv });
      if (record) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2800);
      }
    } catch {
      setLastResult({ score: finalScore, best: Math.max(finalScore, prevBest), record: false, level: lv + 1, wave: wv });
    }
    reload();
  }, [reload, board]);

  const finishLevel = useCallback(() => {
    const lv = levelRef.current;
    scoreRef.current += LEVEL_CLEAR_POINTS;
    setScore(scoreRef.current);
    statusRef.current = 'levelDone';
    setStatus('levelDone');

    // Stars: keep the best result ever achieved on this chapter.
    const gained = starsFor(hpLostRef.current);
    setEarned(gained);
    setMeta((m) => {
      const id = LEVELS[lv].id;
      if ((m.stars[id] ?? 0) >= gained) return m;
      const next: Meta = { ...m, stars: { ...m.stars, [id]: gained } };
      saveMeta(next);
      return next;
    });

    const nextCleared = Math.max(cleared, lv + 1);
    setCleared(nextCleared);
    saveProgress(nextCleared);
    const u = LEVELS[lv].unlocks;
    if (u) {
      setUnlocked(unlockedAfter(nextCleared));
      setJustUnlocked(u);
    } else {
      setJustUnlocked(null);
    }
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2400);
  }, [cleared]);

  // ---------- waves ----------
  const startWave = useCallback(() => {
    if (statusRef.current !== 'playing' || waveActiveRef.current) return;
    const idx = waveRef.current;
    const groups = waveFor(levelRef.current, idx);
    const q: { kind: EnemyKind; at: number }[] = [];
    let t = 0;
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        q.push({ kind: g.kind, at: t });
        t += g.gap;
      }
      t += 500;
    }
    queueRef.current = q;
    waveClockRef.current = 0;
    waveActiveRef.current = true;
    setWaveActive(true);
    waveRef.current = idx + 1;
    setWave(waveRef.current);
  }, []);

  const spawn = (kind: EnemyKind) => {
    const d = ENEMIES[kind];
    const s = enemyScale(levelRef.current, waveRef.current - 1);
    const p = pointAt(routeRef.current, 0);
    const hp = d.hp * s.hpMul;
    enemies.current.push({
      id: idRef.current++,
      kind,
      hp, maxHp: hp,
      dist: 0, x: p.x, y: p.y,
      speed: d.speed,
      armor: d.armor + s.armorAdd,
      flying: d.flying,
      heals: d.heals,
      radius: d.radius,
      slowMs: 0, slowFactor: 1, frozenMs: 0,
      burnMs: 0, burnDps: 0,
      dead: false, hitFlash: 0,
      wobble: Math.random() * 6,
    });
  };

  /** Effective stats for a tower, after permanent perks and chapter fog. */
  const towerStats = (kind: TowerKind, level: number) => {
    const base = TOWERS[kind].levels[level - 1];
    const p = perksRef.current;
    const fog = LEVELS[levelRef.current]?.fog ?? 1;
    return {
      damage: base.damage * p.towerDmg[kind],
      range: base.range * p.towerRange[kind] * fog,
      cooldown: base.cooldown,
    };
  };
  const buildCost = (kind: TowerKind, level: number) =>
    Math.round(TOWERS[kind].levels[level - 1].cost * perksRef.current.towerCost[kind]);

  const killReward = (e: Enemy) => {
    const d = ENEMIES[e.kind];
    goldRef.current += Math.round(d.gold * perksRef.current.killGold);
    setGold(goldRef.current);
    scoreRef.current += d.points;
    setScore(scoreRef.current);
    puff(e.x, e.y, d.color, e.kind === 'boss' ? 26 : 9, e.kind === 'boss' ? 5 : 3);
    if (e.kind === 'boss') {
      shakeRef.current = 10;
      flashRef.current = { a: 0.3, color: '250,204,21' };
      popup(e.x, e.y - 10, 'Boss pokonany!', '#FACC15', 15);
    }
  };

  /** Spawn a dying enemy's offspring where it fell, already partway down the road. */
  const splitEnemy = (e: Enemy) => {
    const d = ENEMIES[e.kind];
    if (!d.splitsInto) return;
    const child = ENEMIES[d.splitsInto.kind];
    const s = enemyScale(levelRef.current, Math.max(0, waveRef.current - 1));
    for (let i = 0; i < d.splitsInto.count; i++) {
      const hp = child.hp * s.hpMul * 0.6;
      // nudge them apart so they don't overlap perfectly
      const dist = Math.max(0, e.dist - i * 12);
      const p = pointAt(routeRef.current, dist);
      enemies.current.push({
        id: idRef.current++,
        kind: child.kind,
        hp, maxHp: hp,
        dist, x: p.x, y: p.y,
        speed: child.speed,
        armor: child.armor + s.armorAdd,
        flying: child.flying,
        heals: child.heals,
        radius: child.radius,
        slowMs: 0, slowFactor: 1, frozenMs: 0,
        burnMs: 0, burnDps: 0,
        dead: false, hitFlash: 0,
        wobble: Math.random() * 6,
      });
    }
    popup(e.x, e.y - 12, 'Rozpada się!', '#A78BFA', 12);
  };

  const damageEnemy = (e: Enemy, dmg: number, pierce: boolean) => {
    if (e.dead) return;
    e.hp -= applyArmor(dmg, e.armor, pierce);
    e.hitFlash = 1;
    if (e.hp <= 0) {
      e.dead = true;
      killReward(e);
      splitEnemy(e);
    }
  };

  // ---------- actions ----------
  /** Clear a tree/rock for gold so the cell becomes buildable. Returns true if the cell had one. */
  const CLEAR_COST = 45;
  const tryClearObstacle = (c: number, r: number): boolean => {
    const i = decor.current.findIndex((d) => d.c === c && d.r === r);
    if (i < 0) return false;
    const px = cellToPx({ x: c, y: r });
    if (goldRef.current < CLEAR_COST) {
      popup(px.x, px.y, `Karczowanie: ${CLEAR_COST} zł`, '#EF4444', 11);
      return true;
    }
    goldRef.current -= CLEAR_COST;
    setGold(goldRef.current);
    decor.current.splice(i, 1);
    occupied.current.delete(cellKey(c, r));
    puff(px.x, px.y, '#A16207', 12, 3);
    popup(px.x, px.y, `-${CLEAR_COST}`, '#CA8A04', 12);
    return true;
  };

  const tryBuild = (c: number, r: number) => {
    const kind = buildRef.current;
    if (!kind) return;
    const key = cellKey(c, r);
    if (blocked.current.has(key) || occupied.current.has(key)) return;
    const cost = buildCost(kind, 1);
    if (goldRef.current < cost) {
      popup((c + 0.5) * CELL, (r + 0.5) * CELL, 'Za mało złota', '#EF4444', 12);
      return;
    }
    goldRef.current -= cost;
    setGold(goldRef.current);
    const px = cellToPx({ x: c, y: r });
    towers.current.push({ id: idRef.current++, c, r, x: px.x, y: px.y, kind, level: 1, cd: 0, angle: 0, invested: cost, recoil: 0 });
    occupied.current.add(key);
    puff(px.x, px.y, TOWERS[kind].accent, 10, 3);
    buildRef.current = null;
    setBuild(null);
  };

  const upgradeSelected = () => {
    const t = towers.current.find((x) => x.id === selectedRef.current);
    if (!t || t.level >= 3) return;
    const cost = buildCost(t.kind, t.level + 1);
    if (goldRef.current < cost) {
      popup(t.x, t.y - 20, 'Za mało złota', '#EF4444', 12);
      return;
    }
    goldRef.current -= cost;
    setGold(goldRef.current);
    t.level += 1;
    t.invested += cost;
    puff(t.x, t.y, TOWERS[t.kind].accent, 14, 3);
    popup(t.x, t.y - 20, `Poziom ${t.level}!`, '#22C55E', 13);
    setSelected({ ...t });
  };

  const sellSelected = () => {
    const i = towers.current.findIndex((x) => x.id === selectedRef.current);
    if (i < 0) return;
    const t = towers.current[i];
    const refund = Math.floor(t.invested * SELL_RATE);
    goldRef.current += refund;
    setGold(goldRef.current);
    occupied.current.delete(cellKey(t.c, t.r));
    towers.current.splice(i, 1);
    puff(t.x, t.y, '#94A3B8', 10, 3);
    popup(t.x, t.y - 20, `+${refund}`, '#CA8A04', 13);
    selectedRef.current = null;
    setSelected(null);
  };

  const castFreeze = () => {
    if (statusRef.current !== 'playing' || cdFreezeRef.current > 0) return;
    cdFreezeRef.current = ABILITIES.freeze.cooldown * perksRef.current.abilityCd;
    const froze = ABILITIES.freeze.ms + perksRef.current.freezeBonusMs;
    for (const e of enemies.current) if (!e.dead) e.frozenMs = froze;
    flashRef.current = { a: 0.35, color: '125,211,252' };
    popup(W / 2, H / 2, 'Zamrożenie!', '#0EA5E9', 18);
  };

  const castArrows = (x: number, y: number) => {
    cdArrowsRef.current = ABILITIES.arrows.cooldown * perksRef.current.abilityCd;
    const { radius } = ABILITIES.arrows;
    const damage = ABILITIES.arrows.damage * perksRef.current.arrowsDmg;
    for (const e of enemies.current) {
      if (!e.dead && Math.hypot(e.x - x, e.y - y) <= radius) damageEnemy(e, damage, false);
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * radius;
      particles.current.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 40, vx: 0, vy: 6 + Math.random() * 3, life: 0, max: 16, size: 2, color: '#F7941D' });
    }
    shakeRef.current = 7;
    aimingRef.current = false;
    setAiming(false);
  };

  // ---------- loop ----------
  const frame = useCallback(
    (now: number) => {
      const rawMs = Math.min(60, now - (lastTime.current || now));
      lastTime.current = now;
      const playing = statusRef.current === 'playing' && !pausedRef.current;
      const ms = playing ? rawMs * speedRef.current : 0;
      const dt = ms / 1000;
      const route = routeRef.current;

      shakeRef.current *= Math.pow(0.86, rawMs / 16.67);
      flashRef.current.a *= Math.pow(0.82, rawMs / 16.67);
      for (const b of bolts.current) b.life -= rawMs / 160;
      bolts.current = bolts.current.filter((b) => b.life > 0);

      if (playing) {
        if (cdArrowsRef.current > 0) cdArrowsRef.current = Math.max(0, cdArrowsRef.current - ms);
        if (cdFreezeRef.current > 0) cdFreezeRef.current = Math.max(0, cdFreezeRef.current - ms);

        const L = LEVELS[levelRef.current];
        if (waveActiveRef.current) {
          waveClockRef.current += ms;
          while (queueRef.current.length && queueRef.current[0].at <= waveClockRef.current) {
            spawn(queueRef.current.shift()!.kind);
          }
          if (queueRef.current.length === 0 && enemies.current.length === 0) {
            waveActiveRef.current = false;
            setWaveActive(false);
            const g = Math.round(waveClearGold(waveRef.current - 1) * perksRef.current.waveGold);
            goldRef.current += g;
            setGold(goldRef.current);
            scoreRef.current += WAVE_CLEAR_POINTS;
            setScore(scoreRef.current);
            popup(W / 2, H / 2, `Fala ${waveRef.current} odparta! +${g}`, '#22C55E', 16);
            // level finished? (last level runs forever)
            if (waveRef.current >= L.waves && !isEndless(levelRef.current, waveRef.current)) {
              finishLevel();
            } else {
              restMsRef.current = 3000;
            }
          }
        } else if (restMsRef.current > 0) {
          restMsRef.current -= ms;
          if (restMsRef.current <= 0) startWave();
        }

        // enemies
        for (const e of enemies.current) {
          if (e.dead) continue;
          if (e.frozenMs > 0) e.frozenMs -= ms;
          if (e.slowMs > 0) {
            e.slowMs -= ms;
            if (e.slowMs <= 0) e.slowFactor = 1;
          }
          if (e.burnMs > 0) {
            e.burnMs -= ms;
            e.hp -= e.burnDps * dt; // burn ignores armour
            if (Math.random() < 0.25) particles.current.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y - 4, vx: 0, vy: -1.2, life: 0, max: 14, size: 1.8, color: '#F97316' });
            if (e.hp <= 0) {
              e.dead = true;
              killReward(e);
              continue;
            }
          }
          if (e.hitFlash > 0) e.hitFlash -= rawMs / 200;
          const mult = e.frozenMs > 0 ? 0 : e.slowFactor;
          e.dist += e.speed * mult * dt;
          e.wobble += dt * 9;
          const p = pointAt(route, e.dist);
          e.x = p.x;
          e.y = p.y;
          if (e.dist >= route.length) {
            e.dead = true;
            const d = ENEMIES[e.kind];
            const dmg = Math.max(1, d.leak - perksRef.current.leakReduce);
            hpRef.current -= dmg;
            hpLostRef.current += dmg;
            setHp(Math.max(0, hpRef.current));
            shakeRef.current = 9;
            flashRef.current = { a: 0.4, color: '239,68,68' };
            popup(e.x, e.y, `-${dmg}`, '#EF4444', 15);
            if (hpRef.current <= 0) {
              endGame();
              break;
            }
          }
        }

        // shamans heal nearby allies — punishes leaving them alive
        for (const s of enemies.current) {
          if (s.dead || !s.heals) continue;
          for (const e of enemies.current) {
            if (e.dead || e.id === s.id) continue;
            if (Math.hypot(e.x - s.x, e.y - s.y) < 70 && e.hp < e.maxHp) {
              e.hp = Math.min(e.maxHp, e.hp + s.heals * dt);
            }
          }
        }

        enemies.current = enemies.current.filter((e) => !e.dead);

        // towers
        for (const t of towers.current) {
          const def = TOWERS[t.kind];
          const lvl = towerStats(t.kind, t.level);
          if (t.recoil > 0) t.recoil -= rawMs / 120;
          t.cd -= ms;
          const target = pickTarget(t.x, t.y, lvl.range, def.hitsAir, enemies.current);
          if (target) {
            t.angle = Math.atan2(target.y - t.y, target.x - t.x);
            if (t.cd <= 0) {
              t.cd = lvl.cooldown;
              t.recoil = 1;
              if (def.chain) {
                // lightning resolves instantly along a chain
                const hits = [target, ...chainTargets(target, enemies.current, def.chain, 90)];
                bolts.current.push({ pts: [{ x: t.x, y: t.y }, ...hits.map((h) => ({ x: h.x, y: h.y }))], life: 1 });
                hits.forEach((h, i) => damageEnemy(h, lvl.damage * Math.pow(0.75, i), false));
              } else {
                shots.current.push({
                  x: t.x, y: t.y, tx: target.x, ty: target.y,
                  t: 0, dur: t.kind === 'catapult' || t.kind === 'oil' ? 420 : 160,
                  kind: t.kind, damage: lvl.damage, targetId: target.id,
                });
              }
            }
          }
        }

        // shots landing
        for (const s of shots.current) {
          s.t += ms;
          if (s.t >= s.dur) {
            const def = TOWERS[s.kind];
            if (def.splash) {
              for (const e of enemies.current) {
                if (e.dead || (e.flying && !def.hitsAir)) continue;
                if (Math.hypot(e.x - s.tx, e.y - s.ty) <= def.splash) {
                  damageEnemy(e, s.damage, !!def.armorPierce);
                  if (def.burn) {
                    const resist = LEVELS[levelRef.current]?.fireResist ?? 1;
                    e.burnMs = def.burnMs ?? 2000;
                    e.burnDps = def.burn * resist;
                  }
                }
              }
              puff(s.tx, s.ty, def.burn ? '#F97316' : '#D97706', 12, 3);
              shakeRef.current = Math.max(shakeRef.current, 3);
            } else {
              const e = enemies.current.find((x) => x.id === s.targetId && !x.dead);
              if (e) {
                damageEnemy(e, s.damage, !!def.armorPierce);
                if (def.slow) {
                  // frost-resistant chapters blunt the slow rather than remove it
                  const resist = LEVELS[levelRef.current]?.frostResist ?? 1;
                  e.slowFactor = 1 - (1 - def.slow) * resist;
                  e.slowMs = (def.slowMs ?? 1000) * resist;
                }
                puff(e.x, e.y, def.accent, 4, 2);
              }
            }
          }
        }
        shots.current = shots.current.filter((s) => s.t < s.dur);
        enemies.current = enemies.current.filter((e) => !e.dead);
      }

      const pdt = rawMs / 16.67;
      for (const p of particles.current) {
        p.x += p.vx * pdt;
        p.y += p.vy * pdt;
        p.vy += 0.05 * pdt;
        p.life += pdt;
      }
      particles.current = particles.current.filter((p) => p.life < p.max);
      for (const p of popups.current) {
        p.y += p.vy * pdt;
        p.life += pdt;
      }
      popups.current = popups.current.filter((p) => p.life < p.max);

      setCds({ arrows: cdArrowsRef.current, freeze: cdFreezeRef.current });
      draw();
      rafRef.current = requestAnimationFrame(frame);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endGame, startWave, finishLevel]
  );

  // ---------- drawing ----------
  const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    const bob = Math.sin(e.wobble) * (e.flying ? 2.4 : 1.2);
    const x = e.x;
    const y = e.y + bob;
    const r = e.radius;
    const images = imagesRef.current;

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.75, r * 0.85, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    let drawn = false;
    if (images) {
      if (e.kind === 'boss') {
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(220,38,38,0.85)';
      }
      drawn = drawEnemyFrame(ctx, images, e.kind, x, y, r, performance.now());
      ctx.shadowBlur = 0;
      // hit flash: a soft white blob over the sprite
      if (drawn && e.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.55, e.hitFlash);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    if (!drawn) {
      // fallback blob if art hasn't loaded
      const d = ENEMIES[e.kind];
      ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : d.color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    drawEnemyOverlay(ctx, e, x, y, r);
  };

  /** Status bits painted on top of any enemy, sprite-based or not. */
  const drawEnemyOverlay = (ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, r: number) => {
    if (e.heals) {
      ctx.strokeStyle = 'rgba(126,34,206,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (e.frozenMs > 0 || e.slowMs > 0) {
      ctx.fillStyle = e.frozenMs > 0 ? 'rgba(125,211,252,0.45)' : 'rgba(125,211,252,0.22)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const pct = Math.max(0, e.hp / e.maxHp);
    if (pct < 1) {
      const bw = r * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - bw / 2, y - r - 11, bw, 4);
      ctx.fillStyle = pct > 0.5 ? '#4ADE80' : pct > 0.25 ? '#FACC15' : '#EF4444';
      ctx.fillRect(x - bw / 2, y - r - 11, bw * pct, 4);
    }
  };

  const drawTower = (ctx: CanvasRenderingContext2D, t: Tower) => {
    const def = TOWERS[t.kind];
    const lvl = t.level;
    const images = imagesRef.current;

    // stone platform sprite (carries its own shadow and I/II/III level mark)
    if (images) {
      drawTowerBase(ctx, images, t.kind, lvl, t.x, t.y, CELL * 0.92);
    } else {
      ctx.fillStyle = '#9CA3AF';
      ctx.beginPath();
      ctx.roundRect(t.x - CELL * 0.4, t.y - CELL * 0.2, CELL * 0.8, CELL * 0.55, 5);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(t.x, t.y - CELL * 0.2); // the weapon perches on top of the platform
    ctx.rotate(t.angle);
    const kick = t.recoil > 0 ? t.recoil * 3 : 0;
    ctx.translate(-kick, 0);
    ctx.fillStyle = def.color;

    if (t.kind === 'archer') {
      ctx.beginPath();
      ctx.roundRect(-6, -5, 12, 10, 3);
      ctx.fill();
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(4, 0, 5 + lvl, -0.9, 0.9);
      ctx.stroke();
    } else if (t.kind === 'catapult') {
      ctx.beginPath();
      ctx.roundRect(-8, -6, 14, 12, 3);
      ctx.fill();
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(8 + lvl, -6 - lvl);
      ctx.stroke();
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(9 + lvl, -7 - lvl, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.kind === 'mage') {
      ctx.beginPath();
      ctx.roundRect(-6, -6, 12, 12, 4);
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(3, 0, 3 + lvl * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(3, 0, 5 + lvl, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (t.kind === 'oil') {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 3 + lvl * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(6 + lvl, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.kind === 'tesla') {
      ctx.beginPath();
      ctx.roundRect(-6, -6, 12, 12, 4);
      ctx.fill();
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(2, -7 - lvl);
      ctx.lineTo(-2, 0);
      ctx.lineTo(3, 0);
      ctx.lineTo(-1, 7 + lvl);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(-7, -4, 12, 8, 2);
      ctx.fill();
      ctx.strokeStyle = def.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -6 - lvl);
      ctx.lineTo(0, 6 + lvl);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(11 + lvl * 2, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const images = imagesRef.current;
    if (!ctx) return;
    const route = routeRef.current;

    ctx.imageSmoothingEnabled = false; // crisp pixel art
    ctx.save();
    if (shakeRef.current > 0.4) {
      const m = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // grass ground
    if (images) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const g = (c * 3 + r * 7) % 4 === 0 ? images.grass2 : images.grass;
          ctx.drawImage(g, c * CELL, r * CELL, CELL, CELL);
        }
      }
    } else {
      ctx.fillStyle = '#5A9B4F';
      ctx.fillRect(0, 0, W, H);
    }

    // road — a warm dirt track drawn over the grass
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7A5230';
    ctx.lineWidth = CELL * 0.9;
    ctx.beginPath();
    ctx.moveTo(route.px[0].x, route.px[0].y);
    for (let i = 1; i < route.px.length; i++) ctx.lineTo(route.px[i].x, route.px[i].y);
    ctx.stroke();
    ctx.strokeStyle = '#C99A5B';
    ctx.lineWidth = CELL * 0.72;
    ctx.stroke();

    // decorations + castle
    if (images) {
      for (const d of decor.current) {
        const img = images[d.art];
        if (img) ctx.drawImage(img, d.c * CELL - CELL * 0.1, d.r * CELL - CELL * 0.25, CELL * 1.2, CELL * 1.2);
      }
      const keep = images.base_ballista;
      if (keep) {
        const fw = keep.width / 3;
        const kw = CELL * 1.7;
        const kh = (keep.height / fw) * kw;
        ctx.drawImage(keep, 2 * fw, 0, fw, keep.height, route.castle.x - kw / 2, route.castle.y - kh * 0.6, kw, kh);
      }
    }

    const hov = hoverRef.current;
    if (buildRef.current && hov) {
      const key = cellKey(hov.c, hov.r);
      const okCell = !blocked.current.has(key) && !occupied.current.has(key);
      const cost = buildCost(buildRef.current, 1);
      const good = okCell && goldRef.current >= cost;
      ctx.fillStyle = good ? 'rgba(74,222,128,0.35)' : 'rgba(239,68,68,0.35)';
      ctx.fillRect(hov.c * CELL, hov.r * CELL, CELL, CELL);
      if (good) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc((hov.c + 0.5) * CELL, (hov.r + 0.5) * CELL, TOWERS[buildRef.current].levels[0].range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (hov && !aimingRef.current && decor.current.some((d) => d.c === hov.c && d.r === hov.r)) {
      // hovering an obstacle — hint that a click clears it for gold
      ctx.fillStyle = 'rgba(202,138,4,0.3)';
      ctx.fillRect(hov.c * CELL, hov.r * CELL, CELL, CELL);
      ctx.strokeStyle = 'rgba(202,138,4,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(hov.c * CELL + 1, hov.r * CELL + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = `${CLEAR_COST} zł`;
      const ly = hov.r * CELL - 4;
      ctx.strokeText(label, (hov.c + 0.5) * CELL, ly);
      ctx.fillText(label, (hov.c + 0.5) * CELL, ly);
    }

    const sel = towers.current.find((t) => t.id === selectedRef.current);
    if (sel) {
      const lvl = TOWERS[sel.kind].levels[sel.level - 1];
      ctx.fillStyle = 'rgba(247,148,29,0.12)';
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, lvl.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(247,148,29,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#F7941D';
      ctx.strokeRect(sel.c * CELL + 1, sel.r * CELL + 1, CELL - 2, CELL - 2);
    }

    for (const t of towers.current) drawTower(ctx, t);
    for (const e of enemies.current) drawEnemy(ctx, e);

    // lightning bolts
    for (const b of bolts.current) {
      ctx.globalAlpha = Math.max(0, b.life);
      ctx.strokeStyle = '#A5F3FC';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#67E8F9';
      ctx.beginPath();
      ctx.moveTo(b.pts[0].x, b.pts[0].y);
      for (let i = 1; i < b.pts.length; i++) {
        const p0 = b.pts[i - 1];
        const p1 = b.pts[i];
        const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 10;
        const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 10;
        ctx.lineTo(mx, my);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    for (const s of shots.current) {
      const p = s.t / s.dur;
      const arc = s.kind === 'catapult' || s.kind === 'oil' ? Math.sin(p * Math.PI) * 42 : 0;
      const x = s.x + (s.tx - s.x) * p;
      const y = s.y + (s.ty - s.y) * p - arc;
      const def = TOWERS[s.kind];
      if (s.kind === 'catapult') {
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.kind === 'oil') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#F97316';
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (s.kind === 'mage') {
        ctx.shadowBlur = 8;
        ctx.shadowColor = def.accent;
        ctx.fillStyle = def.accent;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        const a = Math.atan2(s.ty - s.y, s.tx - s.x);
        ctx.strokeStyle = s.kind === 'ballista' ? '#FCD34D' : '#F7941D';
        ctx.lineWidth = s.kind === 'ballista' ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    if (aimingRef.current && hov) {
      ctx.strokeStyle = 'rgba(247,148,29,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc((hov.c + 0.5) * CELL, (hov.r + 0.5) * CELL, ABILITIES.arrows.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const p of particles.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.font = `bold ${p.size}px Georgia, serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (flashRef.current.a > 0.01) {
      ctx.fillStyle = `rgba(${flashRef.current.color},${flashRef.current.a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  useEffect(() => {
    lastTime.current = 0;
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [frame]);

  // ---------- input ----------
  const toCell = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return pxToCell((clientX - rect.left) * (W / rect.width), (clientY - rect.top) * (H / rect.height));
  };

  const onClick = (e: React.MouseEvent) => {
    if (statusRef.current !== 'playing') return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell) return;
    if (aimingRef.current) {
      castArrows((cell.c + 0.5) * CELL, (cell.r + 0.5) * CELL);
      return;
    }
    // A tree/rock on the cell? Clicking clears it for gold (whether or not you're building).
    if (tryClearObstacle(cell.c, cell.r)) return;
    if (buildRef.current) {
      tryBuild(cell.c, cell.r);
      return;
    }
    const t = towers.current.find((x) => x.c === cell.c && x.r === cell.r);
    selectedRef.current = t ? t.id : null;
    setSelected(t ? { ...t } : null);
  };

  /** Set up a level's board without starting the fighting. */
  const prepareLevel = useCallback((lvl: number, carriedGold: number) => {
    // Never open a chapter below the buying power it was balanced for.
    const carryGold = Math.max(carriedGold, startGoldFor(lvl));
    levelRef.current = lvl;
    setLevel(lvl);
    routeRef.current = makeRoute(LEVELS[lvl].path);
    blocked.current = blockedCells(routeRef.current);
    towers.current = [];
    enemies.current = [];
    shots.current = [];
    bolts.current = [];
    particles.current = [];
    popups.current = [];
    queueRef.current = [];
    buildDecor(lvl);
    goldRef.current = carryGold;
    setGold(carryGold);
    waveRef.current = 0;
    setWave(0);
    waveActiveRef.current = false;
    setWaveActive(false);
    restMsRef.current = 0;
    selectedRef.current = null;
    setSelected(null);
    buildRef.current = null;
    setBuild(null);
    aimingRef.current = false;
    setAiming(false);
    cdArrowsRef.current = 0;
    cdFreezeRef.current = 0;
    speedRef.current = 1;
    setSpeed(1);
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const beginLevel = () => {
    hpLostRef.current = 0; // stars are judged per chapter
    setEarned(null);
    statusRef.current = 'playing';
    setStatus('playing');
    restMsRef.current = 5000;
  };

  const startCampaign = (from: number) => {
    perksRef.current = perksFrom(meta.perks); // lock in whatever the tree grants now
    scoreRef.current = 0;
    setScore(0);
    hpLostRef.current = 0;
    const hp0 = START_HP + perksRef.current.castleHp;
    hpRef.current = hp0;
    setHp(hp0);
    shakeRef.current = 0;
    flashRef.current = { a: 0, color: '255,255,255' };
    setLastResult(null);
    setShowConfetti(false);
    setJustUnlocked(null);
    prepareLevel(from, startGoldFor(from) + perksRef.current.startGold);
    statusRef.current = 'brief';
    setStatus('brief');
  };

  const nextLevel = () => {
    const nl = levelRef.current + 1;
    if (nl >= LEVELS.length) {
      endGame();
      return;
    }
    const carry = Math.floor(goldRef.current * CARRY_GOLD_RATE) + LEVEL_START_BONUS;
    prepareLevel(nl, carry);
    setJustUnlocked(null);
    statusRef.current = 'brief';
    setStatus('brief');
  };

  const selLive = selected ? towers.current.find((t) => t.id === selected.id) : null;
  const selDef = selLive ? TOWERS[selLive.kind] : null;
  const nextCost = selLive && selLive.level < 3 ? buildCost(selLive.kind, selLive.level + 1) : null;
  const nextListCost = selLive && selLive.level < 3 ? TOWERS[selLive.kind].levels[selLive.level].cost : null;
  const L = LEVELS[level];
  const endlessNow = isEndless(level, wave);
  // On the menu the bestiary follows the chapter picker; in play it follows the live level.
  const bestiaryLevel = status === 'idle' || status === 'over' ? LEVELS[startAt] : L;

  // ---- medieval styling helper ----
  const woodBtn = 'rounded-md border-2 border-[#4A3728] bg-gradient-to-b from-[#7B5A38] to-[#5A4028] text-[#F3E3C3] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-[#8C6941] active:translate-y-px disabled:opacity-40';

  return (
    <div className="space-y-4 font-serif">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex shrink-0 flex-col gap-2" style={{ width: W, maxWidth: '100%' }}>
        {/* Status bar — deliberately above the board, never covering it */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-[#8B6B3E] bg-gradient-to-b from-[#F3E3C3] to-[#E2CB9F] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-[#7A4E12]">
              <Coins className="h-4 w-4" /> {gold}
            </span>
            <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-[#8B1D1D]">
              <Heart className={`h-4 w-4 fill-[#B91C1C] text-[#B91C1C] ${hp <= 5 && status === 'playing' ? 'animate-pulse' : ''}`} /> {hp}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-[#4A3728]">
            <span className="hidden sm:inline">Rozdział {L.id}: {L.name}</span>
            <span className="tabular-nums">Fala {wave}{endlessNow ? ' ∞' : `/${L.waves}`}</span>
            <span className="tabular-nums text-[#7A5C33]">{score} pkt</span>
          </div>
        </div>

        {/* Board */}
        <div className="relative overflow-hidden rounded-lg border-4 border-[#5A4028] shadow-[0_6px_20px_rgba(0,0,0,0.35)] ring-1 ring-[#C9A227]/40">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={(e) => (hoverRef.current = toCell(e.clientX, e.clientY))}
            onMouseLeave={() => (hoverRef.current = null)}
            onClick={onClick}
            className={`block w-full ${aiming ? 'cursor-crosshair' : build ? 'cursor-copy' : 'cursor-pointer'}`}
          />

          {/* Level briefing */}
          {status === 'brief' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1C1408]/85 px-8 text-center backdrop-blur-[2px]">
              <Scroll className="h-8 w-8 text-[#C9A227]" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A227]">Rozdział {L.id} z {LEVELS.length}</p>
              <h3 className="text-2xl font-bold text-[#F3E3C3]">{L.name}</h3>
              <p className="max-w-md text-sm text-[#D8C49A]">{L.blurb}</p>
              <p className="text-xs text-[#A08B62]">
                {L.waves} fal{L.id === LEVELS.length ? ' + tryb nieskończony' : ''} · wrogowie: {L.pool.map((k) => ENEMIES[k].name).join(', ')}
              </p>
              <button type="button" onClick={beginLevel} className={`${woodBtn} mt-1 px-6 py-2.5 text-sm font-bold`}>
                Do broni!
              </button>
            </div>
          )}

          {/* Level cleared */}
          {status === 'levelDone' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1C1408]/90 px-8 text-center backdrop-blur-[2px]">
              <Crown className="h-9 w-9 text-[#C9A227]" />
              <h3 className="text-2xl font-bold text-[#F3E3C3]">{L.name} obroniona!</h3>
              {earned !== null && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${i <= earned ? 'fill-[#C9A227] text-[#C9A227]' : 'text-[#5A4028]'}`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-[#A08B62]">
                    {earned === 3 ? 'bez straty!' : `stracono ${hpLostRef.current} HP`}
                  </span>
                </div>
              )}
              <p className="text-sm text-[#D8C49A]">+{LEVEL_CLEAR_POINTS} pkt · zabierasz {Math.floor(gold * CARRY_GOLD_RATE) + LEVEL_START_BONUS} zł na następny rozdział</p>
              {justUnlocked && (
                <p className="flex items-center gap-1.5 rounded-md border border-[#C9A227]/50 bg-[#C9A227]/10 px-3 py-1.5 text-sm font-bold text-[#E8C766]">
                  <Crown className="h-4 w-4" /> Nowa wieża: {TOWERS[justUnlocked].name}
                </p>
              )}
              <button type="button" onClick={nextLevel} className={`${woodBtn} mt-1 flex items-center gap-2 px-6 py-2.5 text-sm font-bold`}>
                {level + 1 >= LEVELS.length ? 'Zakończ kampanię' : 'Następny rozdział'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Menu / game over */}
          {(status === 'idle' || status === 'over') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1C1408]/88 px-8 text-center backdrop-blur-[2px]">
              {status === 'over' && lastResult && (
                <div className="flex flex-col items-center">
                  {lastResult.record ? (
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[#E8C766]">
                      <Crown className="h-4 w-4" /> Nowy rekord!
                    </p>
                  ) : (
                    <p className="text-sm font-bold uppercase tracking-widest text-[#C08A5A]">Zamek padł</p>
                  )}
                  <p className="text-5xl font-black tabular-nums text-[#F3E3C3] drop-shadow-[0_2px_10px_rgba(201,162,39,0.6)]">{lastResult.score}</p>
                  <p className="mt-1 text-xs text-[#A08B62]">Rozdział {lastResult.level} · fala {lastResult.wave} · rekord: {lastResult.best}</p>
                </div>
              )}
              {status === 'idle' && (
                <>
                  <h3 className="text-2xl font-bold text-[#F3E3C3]">Obrona Zamku</h3>
                  <p className="max-w-md text-sm text-[#D8C49A]">
                    Dziesięć rozdziałów, każdy z inną drogą i groźniejszym wrogiem. Za każdy zdobyty rozdział odblokujesz nową wieżę, a za czyste zwycięstwa zdobędziesz gwiazdki do Kroniki.
                  </p>
                  {loadErr && <p className="text-[11px] text-rose-300">Nie udało się wczytać grafiki mapy — teren będzie uproszczony.</p>}
                </>
              )}
              {/* Chapter select — anything you've reached before */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {LEVELS.map((lv, i) => {
                  const locked = i > cleared;
                  return (
                    <button
                      key={lv.id}
                      type="button"
                      disabled={locked || (!ready && !loadErr)}
                      onClick={() => setStartAt(i)}
                      className={`flex items-center gap-1 rounded-md border-2 px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        locked
                          ? 'border-[#4A3728] bg-[#2A2016] text-[#6B5A42]'
                          : startAt === i
                          ? 'border-[#C9A227] bg-[#C9A227]/20 text-[#E8C766]'
                          : 'border-[#6B5A42] bg-[#3A2C1C] text-[#D8C49A] hover:border-[#C9A227]/60'
                      }`}
                    >
                      {locked ? <Lock className="h-3 w-3" /> : null}
                      {lv.id}. {lv.name}
                      {!locked && (meta.stars[lv.id] ?? 0) > 0 && (
                        <span className="ml-0.5 flex items-center gap-0.5">
                          {[...Array(meta.stars[lv.id])].map((_, si) => (
                            <Star key={si} className="h-2.5 w-2.5 fill-[#C9A227] text-[#C9A227]" />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startCampaign(startAt)}
                  disabled={!ready && !loadErr}
                  className={`${woodBtn} flex items-center gap-2 px-6 py-2.5 text-sm font-bold`}
                >
                  {status === 'over' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {ready || loadErr ? (status === 'over' ? 'Jeszcze raz' : 'Broń zamku') : 'Wczytywanie…'}
                </button>
                <button
                  type="button"
                  onClick={() => setTreeOpen(true)}
                  className={`${woodBtn} relative flex items-center gap-2 px-4 py-2.5 text-sm font-bold`}
                >
                  <Star className="h-4 w-4 fill-[#C9A227] text-[#C9A227]" />
                  Kronika
                  {availableStars(meta) > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A227] text-[10px] font-black text-[#3A2C1C]">
                      {availableStars(meta)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {treeOpen && (
            <SkillTree
              meta={meta}
              onChange={(m) => {
                setMeta(m);
                perksRef.current = perksFrom(m.perks);
              }}
              onClose={() => setTreeOpen(false)}
            />
          )}

          {showConfetti && <ConfettiBurst />}
        </div>
        </div>

        {/* Side panel — parchment */}
        <aside className="flex w-full flex-col gap-2 rounded-lg border-2 border-[#8B6B3E] bg-gradient-to-b from-[#EFDDB8] to-[#DCC99A] p-2 lg:w-56">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#7A5C33]">Warsztat</p>
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {TOWER_ORDER.map((k) => {
              const d = TOWERS[k];
              const isUnlocked = unlocked.includes(k);
              const listCost = d.levels[0].cost;
              const cost = buildCost(k, 1); // after the "Tania budowa" perk
              const discounted = cost < listCost;
              const afford = gold >= cost;
              const on = build === k;
              const lockedBy = LEVELS.find((lv) => lv.unlocks === k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={status !== 'playing' || !isUnlocked}
                  onClick={() => {
                    const next = on ? null : k;
                    buildRef.current = next;
                    setBuild(next);
                    aimingRef.current = false;
                    setAiming(false);
                    selectedRef.current = null;
                    setSelected(null);
                  }}
                  className={`flex items-center gap-2 rounded-md border-2 p-1.5 text-left transition-all ${
                    !isUnlocked
                      ? 'border-[#B49B6E] bg-[#D6C39B]/60 opacity-70'
                      : on
                      ? 'border-[#C9A227] bg-[#C9A227]/25'
                      : 'border-[#B49B6E] bg-[#F3E3C3] hover:border-[#8B6B3E]'
                  } ${isUnlocked && !afford ? 'opacity-60' : ''}`}
                  title={isUnlocked ? d.desc : `Odblokujesz po zdobyciu: ${lockedBy?.name ?? '—'}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md shadow-inner" style={{ backgroundColor: isUnlocked ? d.color : '#9A8A6B' }}>
                    {isUnlocked ? (() => { const Ic = TOWER_ICON[k]; return <Ic className="h-4 w-4" style={{ color: d.accent }} />; })() : <Lock className="h-3.5 w-3.5 text-[#E8DCC0]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-[#3A2C1C]">{d.name}</span>
                    <span className={`block text-[10px] font-bold tabular-nums ${!isUnlocked ? 'text-[#7A6A4B]' : afford ? 'text-[#7A4E12]' : 'text-[#9B1C1C]'}`}>
                      {!isUnlocked ? (
                        `Rozdział ${lockedBy?.id ?? '?'}`
                      ) : discounted ? (
                        <>
                          <span className="text-[#9A8A6B] line-through">{listCost}</span>{' '}
                          <span className="text-[#15803D]">{cost} zł</span>
                        </>
                      ) : (
                        `${cost} zł`
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selLive && selDef && (
            <div className="rounded-md border-2 border-[#C9A227] bg-[#C9A227]/15 p-1.5">
              <p className="text-[11px] font-bold text-[#3A2C1C]">
                {selDef.name} <span className="text-[9px] text-[#7A6A4B]">poz. {selLive.level}/3</span>
              </p>
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={upgradeSelected}
                  disabled={selLive.level >= 3 || (nextCost !== null && gold < nextCost)}
                  className="flex flex-1 items-center justify-center gap-1 rounded border-2 border-[#3F6212] bg-gradient-to-b from-[#65A30D] to-[#4D7C0F] px-1.5 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                >
                  <ArrowUp className="h-3 w-3" />
                  {selLive.level >= 3 ? (
                    'Max'
                  ) : nextListCost !== null && nextCost !== null && nextCost < nextListCost ? (
                    <>
                      <span className="text-white/60 line-through">{nextListCost}</span> {nextCost} zł
                    </>
                  ) : (
                    `${nextCost} zł`
                  )}
                </button>
                <button
                  type="button"
                  onClick={sellSelected}
                  className="flex items-center justify-center gap-1 rounded border-2 border-[#7F1D1D] bg-gradient-to-b from-[#B91C1C] to-[#7F1D1D] px-1.5 py-1 text-[10px] font-bold text-white"
                  title="Rozbierz wieżę"
                >
                  <Trash2 className="h-3 w-3" />
                  {Math.floor(selLive.invested * SELL_RATE)}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={status !== 'playing' || cds.arrows > 0}
              onClick={() => {
                const next = !aimingRef.current;
                aimingRef.current = next;
                setAiming(next);
                buildRef.current = null;
                setBuild(null);
              }}
              className={`flex flex-col items-center gap-0.5 rounded-md border-2 p-1.5 text-[9px] font-bold transition-all disabled:opacity-40 ${
                aiming ? 'border-[#C9A227] bg-[#C9A227]/25' : 'border-[#B49B6E] bg-[#F3E3C3]'
              }`}
              title={ABILITIES.arrows.desc}
            >
              <Swords className="h-4 w-4 text-[#B45309]" />
              <span className="text-[#3A2C1C]">Deszcz strzał</span>
              {cds.arrows > 0 && <span className="tabular-nums text-[#7A6A4B]">{Math.ceil(cds.arrows / 1000)}s</span>}
            </button>
            <button
              type="button"
              disabled={status !== 'playing' || cds.freeze > 0}
              onClick={castFreeze}
              className="flex flex-col items-center gap-0.5 rounded-md border-2 border-[#B49B6E] bg-[#F3E3C3] p-1.5 text-[9px] font-bold transition-all disabled:opacity-40"
              title={ABILITIES.freeze.desc}
            >
              <Snowflake className="h-4 w-4 text-[#0369A1]" />
              <span className="text-[#3A2C1C]">Zamrożenie</span>
              {cds.freeze > 0 && <span className="tabular-nums text-[#7A6A4B]">{Math.ceil(cds.freeze / 1000)}s</span>}
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={status !== 'playing'}
              onClick={() => {
                pausedRef.current = !pausedRef.current;
                setPaused(pausedRef.current);
              }}
              className={`${woodBtn} flex flex-1 items-center justify-center gap-1 py-1 text-[10px] font-bold`}
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? 'Wznów' : 'Pauza'}
            </button>
            <button
              type="button"
              disabled={status !== 'playing'}
              onClick={() => {
                speedRef.current = speedRef.current === 1 ? 2 : 1;
                setSpeed(speedRef.current);
              }}
              className={`${woodBtn} flex flex-1 items-center justify-center gap-1 py-1 text-[10px] font-bold ${speed === 2 ? 'from-[#B45309] to-[#92400E]' : ''}`}
            >
              <FastForward className="h-3 w-3" /> {speed}×
            </button>
          </div>

          {status === 'playing' && !waveActive && (
            <button type="button" onClick={startWave} className="rounded-md border-2 border-[#3F6212] bg-gradient-to-b from-[#65A30D] to-[#4D7C0F] py-1.5 text-[10px] font-bold text-white active:translate-y-px">
              Wyślij falę {wave + 1} teraz
            </button>
          )}
        </aside>

        <Bestiary level={bestiaryLevel} />
      </div>

      <GameLeaderboard board={board} />
    </div>
  );
}
