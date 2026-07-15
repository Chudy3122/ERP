import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Crown, Heart, Coins, Pause, FastForward, Trash2, ArrowUp, Swords, Snowflake } from 'lucide-react';
import * as gameApi from '../../../api/game.api';
import GameLeaderboard, { useLeaderboard } from '../GameLeaderboard';
import ConfettiBurst from '../ConfettiBurst';
import { loadSheet, drawSprite, type SpriteKey } from './td/atlas';
import {
  CELL, COLS, ROWS, W, H, START_GOLD, START_HP, CASTLE_CELL,
  TOWERS, TOWER_ORDER, SELL_RATE, ENEMIES, waveGroups, endlessHpMul,
  WAVE_CLEAR_GOLD, WAVE_CLEAR_POINTS, ABILITIES, WAVES,
  type TowerKind, type EnemyKind,
} from './td/config';
import {
  PATH_PX, PATH_LENGTH, pointAt, blockedCells, cellKey, pxToCell,
  applyArmor, pickTarget, cellToPx,
} from './td/engine';

const GAME = 'td';

type Status = 'idle' | 'playing' | 'over';

type Tower = { id: number; c: number; r: number; x: number; y: number; kind: TowerKind; level: number; cd: number; angle: number; invested: number; recoil: number };
type Enemy = { id: number; kind: EnemyKind; hp: number; maxHp: number; dist: number; x: number; y: number; speed: number; armor: number; flying?: boolean; radius: number; slowMs: number; slowFactor: number; frozenMs: number; dead: boolean; hitFlash: number; wobble: number };
type Shot = { x: number; y: number; tx: number; ty: number; t: number; dur: number; kind: TowerKind; damage: number; targetId: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Popup = { x: number; y: number; vy: number; life: number; max: number; text: string; color: string; size: number };
type Decor = { c: number; r: number; key: SpriteKey };

export default function TowerDefenseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const sheetRef = useRef<HTMLImageElement | null>(null);

  const towers = useRef<Tower[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const shots = useRef<Shot[]>([]);
  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);
  const decor = useRef<Decor[]>([]);
  const blocked = useRef<Set<string>>(blockedCells());
  const occupied = useRef<Set<string>>(new Set());
  const idRef = useRef(1);

  const goldRef = useRef(START_GOLD);
  const hpRef = useRef(START_HP);
  const scoreRef = useRef(0);
  const waveRef = useRef(0);
  const statusRef = useRef<Status>('idle');
  const speedRef = useRef(1);
  const pausedRef = useRef(false);
  const lastTime = useRef(0);

  // wave spawning
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
  const [lastResult, setLastResult] = useState<{ score: number; best: number; record: boolean; wave: number } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { board, reload } = useLeaderboard(GAME);

  // ---------- assets ----------
  useEffect(() => {
    let alive = true;
    loadSheet()
      .then((img) => { if (alive) { sheetRef.current = img; setReady(true); } })
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

  /** Scatter trees and rocks on free cells so the field isn't empty. */
  const buildDecor = () => {
    const out: Decor[] = [];
    const keys: SpriteKey[] = ['treeA', 'treeB', 'pineS', 'pineL', 'rockS', 'rockM', 'bush'];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (blocked.current.has(cellKey(c, r))) continue;
        if (Math.abs(c - CASTLE_CELL.x) < 2 && Math.abs(r - CASTLE_CELL.y) < 2) continue;
        if (Math.random() < 0.13) out.push({ c, r, key: keys[(Math.random() * keys.length) | 0] });
      }
    }
    decor.current = out;
    // decor blocks building too
    for (const d of out) occupied.current.add(cellKey(d.c, d.r));
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    shakeRef.current = 16;
    flashRef.current = { a: 0.65, color: '239,68,68' };
    const finalScore = scoreRef.current;
    const reached = waveRef.current;
    const prevBest = board?.me?.score ?? 0;
    try {
      const best = await gameApi.submitScore(GAME, finalScore);
      const record = finalScore > prevBest && finalScore > 0;
      setLastResult({ score: finalScore, best, record, wave: reached });
      if (record) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2800);
      }
    } catch {
      setLastResult({ score: finalScore, best: Math.max(finalScore, prevBest), record: false, wave: reached });
    }
    reload();
  }, [reload, board]);

  // ---------- waves ----------
  const startWave = useCallback(() => {
    if (statusRef.current !== 'playing' || waveActiveRef.current) return;
    const idx = waveRef.current;
    const groups = waveGroups(idx);
    const q: { kind: EnemyKind; at: number }[] = [];
    let t = 0;
    for (const g of groups) {
      for (let i = 0; i < g.count; i++) {
        q.push({ kind: g.kind, at: t });
        t += g.gap;
      }
      t += 600;
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
    const mul = endlessHpMul(waveRef.current - 1);
    const p = pointAt(0);
    enemies.current.push({
      id: idRef.current++,
      kind,
      hp: d.hp * mul,
      maxHp: d.hp * mul,
      dist: 0,
      x: p.x,
      y: p.y,
      speed: d.speed,
      armor: d.armor,
      flying: d.flying,
      radius: d.radius,
      slowMs: 0,
      slowFactor: 1,
      frozenMs: 0,
      dead: false,
      hitFlash: 0,
      wobble: Math.random() * 6,
    });
  };

  const damageEnemy = (e: Enemy, dmg: number, pierce: boolean) => {
    const real = applyArmor(dmg, e.armor, pierce);
    e.hp -= real;
    e.hitFlash = 1;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      const d = ENEMIES[e.kind];
      goldRef.current += d.gold;
      setGold(goldRef.current);
      scoreRef.current += d.points;
      setScore(scoreRef.current);
      puff(e.x, e.y, d.color, e.kind === 'boss' ? 26 : 9, e.kind === 'boss' ? 5 : 3);
      popup(e.x, e.y - 8, `+${d.gold}`, '#CA8A04', 12);
      if (e.kind === 'boss') {
        shakeRef.current = 10;
        flashRef.current = { a: 0.3, color: '250,204,21' };
      }
    }
  };

  // ---------- actions ----------
  const tryBuild = (c: number, r: number) => {
    const kind = buildRef.current;
    if (!kind) return;
    const key = cellKey(c, r);
    if (blocked.current.has(key) || occupied.current.has(key)) return;
    const cost = TOWERS[kind].levels[0].cost;
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
    const id = selectedRef.current;
    const t = towers.current.find((x) => x.id === id);
    if (!t || t.level >= 3) return;
    const cost = TOWERS[t.kind].levels[t.level].cost;
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
    const id = selectedRef.current;
    const i = towers.current.findIndex((x) => x.id === id);
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
    cdFreezeRef.current = ABILITIES.freeze.cooldown;
    for (const e of enemies.current) if (!e.dead) e.frozenMs = ABILITIES.freeze.ms;
    flashRef.current = { a: 0.35, color: '125,211,252' };
    popup(W / 2, H / 2, 'Zamrożenie!', '#0EA5E9', 18);
  };

  const castArrows = (x: number, y: number) => {
    cdArrowsRef.current = ABILITIES.arrows.cooldown;
    const { damage, radius } = ABILITIES.arrows;
    for (const e of enemies.current) {
      if (e.dead) continue;
      if (Math.hypot(e.x - x, e.y - y) <= radius) damageEnemy(e, damage, false);
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

      shakeRef.current *= Math.pow(0.86, rawMs / 16.67);
      flashRef.current.a *= Math.pow(0.82, rawMs / 16.67);

      if (playing) {
        if (cdArrowsRef.current > 0) cdArrowsRef.current = Math.max(0, cdArrowsRef.current - ms);
        if (cdFreezeRef.current > 0) cdFreezeRef.current = Math.max(0, cdFreezeRef.current - ms);

        // spawn from the wave queue
        if (waveActiveRef.current) {
          waveClockRef.current += ms;
          while (queueRef.current.length && queueRef.current[0].at <= waveClockRef.current) {
            spawn(queueRef.current.shift()!.kind);
          }
          if (queueRef.current.length === 0 && enemies.current.every((e) => e.dead)) {
            waveActiveRef.current = false;
            setWaveActive(false);
            goldRef.current += WAVE_CLEAR_GOLD;
            setGold(goldRef.current);
            scoreRef.current += WAVE_CLEAR_POINTS;
            setScore(scoreRef.current);
            popup(W / 2, H / 2, `Fala ${waveRef.current} odparta! +${WAVE_CLEAR_GOLD}`, '#22C55E', 16);
            restMsRef.current = 2500; // breather before auto-starting the next one
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
          if (e.hitFlash > 0) e.hitFlash -= rawMs / 200;
          const mult = e.frozenMs > 0 ? 0 : e.slowFactor;
          e.dist += e.speed * mult * dt;
          e.wobble += dt * 9;
          const p = pointAt(e.dist);
          e.x = p.x;
          e.y = p.y;
          if (e.dist >= PATH_LENGTH) {
            e.dead = true;
            const d = ENEMIES[e.kind];
            hpRef.current -= d.leak;
            setHp(Math.max(0, hpRef.current));
            shakeRef.current = 9;
            flashRef.current = { a: 0.4, color: '239,68,68' };
            popup(e.x, e.y, `-${d.leak}`, '#EF4444', 15);
            if (hpRef.current <= 0) {
              endGame();
              break;
            }
          }
        }

        // towers
        for (const t of towers.current) {
          const def = TOWERS[t.kind];
          const lvl = def.levels[t.level - 1];
          if (t.recoil > 0) t.recoil -= rawMs / 120;
          t.cd -= ms;
          const target = pickTarget(t.x, t.y, lvl.range, def.hitsAir, enemies.current);
          if (target) {
            t.angle = Math.atan2(target.y - t.y, target.x - t.x);
            if (t.cd <= 0) {
              t.cd = lvl.cooldown;
              t.recoil = 1;
              shots.current.push({
                x: t.x, y: t.y, tx: target.x, ty: target.y,
                t: 0, dur: t.kind === 'catapult' ? 420 : 160,
                kind: t.kind, damage: lvl.damage, targetId: target.id,
              });
            }
          }
        }

        // shots
        for (const s of shots.current) {
          s.t += ms;
          if (s.t >= s.dur) {
            const def = TOWERS[s.kind];
            if (def.splash) {
              for (const e of enemies.current) {
                if (e.dead || (e.flying && !def.hitsAir)) continue;
                if (Math.hypot(e.x - s.tx, e.y - s.ty) <= def.splash) damageEnemy(e, s.damage, !!def.armorPierce);
              }
              puff(s.tx, s.ty, '#D97706', 12, 3);
              shakeRef.current = Math.max(shakeRef.current, 3);
            } else {
              const e = enemies.current.find((x) => x.id === s.targetId && !x.dead);
              if (e) {
                damageEnemy(e, s.damage, !!def.armorPierce);
                if (def.slow) {
                  e.slowFactor = def.slow;
                  e.slowMs = def.slowMs ?? 1000;
                }
                puff(e.x, e.y, def.accent, 4, 2);
              }
            }
          }
        }
        shots.current = shots.current.filter((s) => s.t < s.dur);
        enemies.current = enemies.current.filter((e) => !e.dead);
      }

      // effects always tick
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
    [endGame, startWave]
  );

  // ---------- drawing ----------
  const drawEnemy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
    const d = ENEMIES[e.kind];
    const bob = Math.sin(e.wobble) * (e.flying ? 2.4 : 1.2);
    const x = e.x;
    const y = e.y + bob;
    const r = e.radius;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.75, r * 0.75, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = e.hitFlash > 0 ? '#ffffff' : d.color;
    ctx.save();
    ctx.translate(x, y);

    if (e.kind === 'raven') {
      // flying: two beating wings + body
      const flap = Math.sin(e.wobble * 2) * 0.5;
      ctx.fillStyle = d.dark;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.5, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.quadraticCurveTo(s * r * 1.5, -6 + flap * 8, s * r * 1.7, 4 + flap * 5);
        ctx.quadraticCurveTo(s * r * 0.8, 2, 0, 4);
        ctx.closePath();
        ctx.fill();
      }
    } else if (e.kind === 'cavalry') {
      // horse body + rider
      ctx.fillStyle = d.dark;
      ctx.beginPath();
      ctx.roundRect(-r, -r * 0.2, r * 2, r * 0.85, 4);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-r * 0.35, -r * 1.15, r * 0.7, r * 1.05, 3);
      ctx.fill();
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(0, -r * 1.25, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'boss') {
      // big armoured knight with a red plume
      ctx.fillStyle = d.dark;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.7, r * 1.7, r * 1.5, 5);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-r * 0.6, -r * 1.4, r * 1.2, r * 0.85, 4);
      ctx.fill();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(-r * 0.16, -r * 1.95, r * 0.32, r * 0.6, 3);
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.roundRect(r * 0.6, -r * 1.1, r * 0.22, r * 1.9, 2);
      ctx.fill();
    } else if (e.kind === 'brute') {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.9, r * 1.7, r * 1.7, 6);
      ctx.fill();
      ctx.fillStyle = d.dark;
      ctx.beginPath();
      ctx.roundRect(-r * 0.5, -r * 1.35, r, r * 0.55, 3);
      ctx.fill();
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.35, 2, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.35, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // peasant / soldier
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-r * 0.55, -r * 0.6, r * 1.1, r * 1.25, 4);
      ctx.fill();
      ctx.fillStyle = d.dark;
      ctx.beginPath();
      ctx.arc(0, -r * 0.85, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      if (e.kind === 'soldier') {
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(r * 0.4, -r * 0.6, r * 0.3, r * 1.1, 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // frost tint
    if (e.frozenMs > 0 || e.slowMs > 0) {
      ctx.fillStyle = e.frozenMs > 0 ? 'rgba(125,211,252,0.5)' : 'rgba(125,211,252,0.25)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // health bar
    const pct = Math.max(0, e.hp / e.maxHp);
    if (pct < 1) {
      const bw = r * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - bw / 2, y - r - 9, bw, 4);
      ctx.fillStyle = pct > 0.5 ? '#4ADE80' : pct > 0.25 ? '#FACC15' : '#EF4444';
      ctx.fillRect(x - bw / 2, y - r - 9, bw * pct, 4);
    }
  };

  const drawTower = (ctx: CanvasRenderingContext2D, t: Tower) => {
    const def = TOWERS[t.kind];
    const lvl = t.level;
    const base = CELL * 0.42;
    ctx.save();
    ctx.translate(t.x, t.y);

    // stone base, taller with level
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, base * 0.5, base, base * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath();
    ctx.roundRect(-base, -base * 0.5, base * 2, base * 1.3, 5);
    ctx.fill();
    ctx.fillStyle = '#6B7280';
    ctx.beginPath();
    ctx.roundRect(-base, -base * 0.5, base * 2, base * 0.3, 3);
    ctx.fill();

    // level pips
    for (let i = 0; i < lvl; i++) {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(-base + 5 + i * 6, base * 0.62, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // turret, rotates toward the target
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
    const sheet = sheetRef.current;
    if (!ctx) return;

    ctx.save();
    if (shakeRef.current > 0.4) {
      const m = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // terrain
    if (sheet) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          drawSprite(ctx, sheet, (c + r) % 3 === 0 ? 'grassAlt' : 'grass', c * CELL, r * CELL, CELL);
        }
      }
    } else {
      ctx.fillStyle = '#3E9B4F';
      ctx.fillRect(0, 0, W, H);
    }

    // road — drawn rather than tiled, so the route can be any shape
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#B07C4B';
    ctx.lineWidth = CELL * 0.82;
    ctx.beginPath();
    ctx.moveTo(PATH_PX[0].x, PATH_PX[0].y);
    for (let i = 1; i < PATH_PX.length; i++) ctx.lineTo(PATH_PX[i].x, PATH_PX[i].y);
    ctx.stroke();
    ctx.strokeStyle = '#D9A066';
    ctx.lineWidth = CELL * 0.66;
    ctx.stroke();

    // decorations
    if (sheet) {
      for (const d of decor.current) drawSprite(ctx, sheet, d.key, d.c * CELL, d.r * CELL, CELL);
      // castle at the end of the road
      drawSprite(ctx, sheet, 'castle', (CASTLE_CELL.x - 0.5) * CELL, (CASTLE_CELL.y - 0.5) * CELL, CELL * 1.6);
    }

    // build helper
    const hov = hoverRef.current;
    if (buildRef.current && hov) {
      const key = cellKey(hov.c, hov.r);
      const okCell = !blocked.current.has(key) && !occupied.current.has(key);
      const cost = TOWERS[buildRef.current].levels[0].cost;
      const afford = goldRef.current >= cost;
      const good = okCell && afford;
      ctx.fillStyle = good ? 'rgba(74,222,128,0.35)' : 'rgba(239,68,68,0.35)';
      ctx.fillRect(hov.c * CELL, hov.r * CELL, CELL, CELL);
      if (good) {
        const range = TOWERS[buildRef.current].levels[0].range;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc((hov.c + 0.5) * CELL, (hov.r + 0.5) * CELL, range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // selected tower range
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
      ctx.lineWidth = 2;
      ctx.strokeRect(sel.c * CELL + 1, sel.r * CELL + 1, CELL - 2, CELL - 2);
    }

    for (const t of towers.current) drawTower(ctx, t);
    for (const e of enemies.current) drawEnemy(ctx, e);

    // shots
    for (const s of shots.current) {
      const p = s.t / s.dur;
      const x = s.x + (s.tx - s.x) * p;
      const y = s.y + (s.ty - s.y) * p - (s.kind === 'catapult' ? Math.sin(p * Math.PI) * 42 : 0);
      const def = TOWERS[s.kind];
      if (s.kind === 'catapult') {
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
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

    // aiming reticle for the arrow rain
    if (aimingRef.current && hov) {
      const x = (hov.c + 0.5) * CELL;
      const y = (hov.r + 0.5) * CELL;
      ctx.strokeStyle = 'rgba(247,148,29,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(x, y, ABILITIES.arrows.radius, 0, Math.PI * 2);
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
      ctx.font = `bold ${p.size}px system-ui, sans-serif`;
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
    const sx = W / rect.width;
    const sy = H / rect.height;
    return pxToCell((clientX - rect.left) * sx, (clientY - rect.top) * sy);
  };

  const onMove = (e: React.MouseEvent) => {
    hoverRef.current = toCell(e.clientX, e.clientY);
  };

  const onClick = (e: React.MouseEvent) => {
    if (statusRef.current !== 'playing') return;
    const cell = toCell(e.clientX, e.clientY);
    if (!cell) return;
    if (aimingRef.current) {
      castArrows((cell.c + 0.5) * CELL, (cell.r + 0.5) * CELL);
      return;
    }
    if (buildRef.current) {
      tryBuild(cell.c, cell.r);
      return;
    }
    const t = towers.current.find((x) => x.c === cell.c && x.r === cell.r);
    selectedRef.current = t ? t.id : null;
    setSelected(t ? { ...t } : null);
  };

  const startGame = useCallback(() => {
    towers.current = [];
    enemies.current = [];
    shots.current = [];
    particles.current = [];
    popups.current = [];
    occupied.current = new Set();
    queueRef.current = [];
    buildDecor();
    goldRef.current = START_GOLD;
    hpRef.current = START_HP;
    scoreRef.current = 0;
    waveRef.current = 0;
    speedRef.current = 1;
    pausedRef.current = false;
    cdArrowsRef.current = 0;
    cdFreezeRef.current = 0;
    waveActiveRef.current = false;
    restMsRef.current = 4000;
    selectedRef.current = null;
    buildRef.current = null;
    aimingRef.current = false;
    shakeRef.current = 0;
    flashRef.current = { a: 0, color: '255,255,255' };
    setGold(START_GOLD);
    setHp(START_HP);
    setScore(0);
    setWave(0);
    setSpeed(1);
    setPaused(false);
    setSelected(null);
    setBuild(null);
    setAiming(false);
    setWaveActive(false);
    setLastResult(null);
    setShowConfetti(false);
    statusRef.current = 'playing';
    setStatus('playing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selDef = selected ? TOWERS[selected.kind] : null;
  const selLive = selected ? towers.current.find((t) => t.id === selected.id) : null;
  const nextCost = selLive && selLive.level < 3 ? TOWERS[selLive.kind].levels[selLive.level].cost : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        {/* Board */}
        <div className="relative shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10" style={{ width: W, maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={onMove}
            onMouseLeave={() => (hoverRef.current = null)}
            onClick={onClick}
            className={`block w-full ${aiming ? 'cursor-crosshair' : build ? 'cursor-copy' : 'cursor-pointer'}`}
          />

          {status === 'playing' && (
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-lg bg-white/85 px-2.5 py-1 text-sm font-bold tabular-nums text-amber-700 shadow backdrop-blur">
                <Coins className="h-3.5 w-3.5" /> {gold}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white/85 px-2.5 py-1 text-sm font-bold tabular-nums text-rose-600 shadow backdrop-blur">
                <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> {hp}
              </span>
              <span className="rounded-lg bg-white/75 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 shadow backdrop-blur">
                Fala {wave}{wave > WAVES.length ? ' ∞' : `/${WAVES.length}`}
              </span>
              <span className="rounded-lg bg-white/75 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600 shadow backdrop-blur">
                {score} pkt
              </span>
            </div>
          )}

          {status !== 'playing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-900/60 to-slate-900/85 px-6 text-center text-white backdrop-blur-[2px]">
              {status === 'over' && lastResult && (
                <div className="flex flex-col items-center">
                  {lastResult.record ? (
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-yellow-300">
                      <Crown className="h-4 w-4" /> Nowy rekord!
                    </p>
                  ) : (
                    <p className="text-sm font-semibold uppercase tracking-widest text-orange-200">Zamek padł</p>
                  )}
                  <p className="text-5xl font-black tabular-nums drop-shadow-[0_2px_12px_rgba(247,148,29,0.7)]">{lastResult.score}</p>
                  <p className="mt-1 text-xs text-white/70">Fala {lastResult.wave} · rekord: {lastResult.best}</p>
                </div>
              )}
              {status === 'idle' && (
                <div className="max-w-[420px] space-y-2">
                  <h3 className="text-lg font-bold">Obrona Zamku</h3>
                  <p className="text-sm text-white/85">
                    Stawiaj wieże przy drodze i powstrzymaj {WAVES.length} fal najeźdźców. Fale ruszają same — między nimi masz chwilę na rozbudowę.
                  </p>
                  <p className="text-[11px] text-white/60">
                    Klikaj w wieżę, żeby ją ulepszyć lub sprzedać. Katapulta nie trafia w latające kruki.
                  </p>
                  {loadErr && <p className="text-[11px] text-rose-300">Nie udało się wczytać grafiki mapy — gra zadziała, ale teren będzie uproszczony.</p>}
                </div>
              )}
              <button
                type="button"
                onClick={startGame}
                disabled={!ready && !loadErr}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7941D] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#F7941D]/40 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {status === 'over' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {status === 'over' ? 'Zagraj ponownie' : ready || loadErr ? 'Broń zamku' : 'Wczytywanie…'}
              </button>
            </div>
          )}

          {showConfetti && <ConfettiBurst />}
        </div>

        {/* Side panel */}
        <aside className="flex w-full flex-col gap-2 lg:w-52">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {TOWER_ORDER.map((k) => {
              const d = TOWERS[k];
              const cost = d.levels[0].cost;
              const afford = gold >= cost;
              const on = build === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={status !== 'playing'}
                  onClick={() => {
                    const next = on ? null : k;
                    buildRef.current = next;
                    setBuild(next);
                    aimingRef.current = false;
                    setAiming(false);
                    selectedRef.current = null;
                    setSelected(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all disabled:opacity-50 ${
                    on ? 'border-[#F7941D] bg-[#F7941D]/10 ring-2 ring-[#F7941D]/40' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  } ${!afford ? 'opacity-60' : ''}`}
                  title={d.desc}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: d.color }}>
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.accent }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-gray-800 dark:text-gray-100">{d.name}</span>
                    <span className={`block text-[11px] font-semibold tabular-nums ${afford ? 'text-amber-600' : 'text-rose-500'}`}>{cost} zł</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected tower */}
          {selLive && selDef && (
            <div className="rounded-xl border border-[#F7941D]/40 bg-[#F7941D]/5 p-2">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-100">
                {selDef.name} <span className="text-[10px] text-gray-500">poz. {selLive.level}/3</span>
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={upgradeSelected}
                  disabled={selLive.level >= 3 || (nextCost !== null && gold < nextCost)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95 disabled:opacity-40"
                >
                  <ArrowUp className="h-3 w-3" />
                  {selLive.level >= 3 ? 'Max' : `${nextCost} zł`}
                </button>
                <button
                  type="button"
                  onClick={sellSelected}
                  className="flex items-center justify-center gap-1 rounded-lg bg-rose-500 px-2 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                  title="Sprzedaj"
                >
                  <Trash2 className="h-3 w-3" />
                  {Math.floor(selLive.invested * SELL_RATE)}
                </button>
              </div>
            </div>
          )}

          {/* Abilities */}
          <div className="grid grid-cols-2 gap-2">
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
              className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 text-[10px] font-bold transition-all disabled:opacity-40 ${
                aiming ? 'border-[#F7941D] bg-[#F7941D]/10' : 'border-gray-200 dark:border-gray-700'
              }`}
              title={ABILITIES.arrows.desc}
            >
              <Swords className="h-4 w-4 text-[#F7941D]" />
              <span className="text-gray-700 dark:text-gray-200">Deszcz strzał</span>
              {cds.arrows > 0 && <span className="tabular-nums text-gray-400">{Math.ceil(cds.arrows / 1000)}s</span>}
            </button>
            <button
              type="button"
              disabled={status !== 'playing' || cds.freeze > 0}
              onClick={castFreeze}
              className="flex flex-col items-center gap-0.5 rounded-xl border border-gray-200 p-2 text-[10px] font-bold transition-all disabled:opacity-40 dark:border-gray-700"
              title={ABILITIES.freeze.desc}
            >
              <Snowflake className="h-4 w-4 text-sky-500" />
              <span className="text-gray-700 dark:text-gray-200">Zamrożenie</span>
              {cds.freeze > 0 && <span className="tabular-nums text-gray-400">{Math.ceil(cds.freeze / 1000)}s</span>}
            </button>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={status !== 'playing'}
              onClick={() => {
                pausedRef.current = !pausedRef.current;
                setPaused(pausedRef.current);
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
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
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl border py-1.5 text-[11px] font-bold disabled:opacity-40 ${
                speed === 2 ? 'border-[#F7941D] bg-[#F7941D]/10 text-[#EA7B0C]' : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200'
              }`}
            >
              <FastForward className="h-3 w-3" /> {speed}×
            </button>
          </div>

          {status === 'playing' && !waveActive && (
            <button
              type="button"
              onClick={startWave}
              className="rounded-xl bg-emerald-500 py-2 text-[11px] font-bold text-white transition-transform active:scale-95"
            >
              Wyślij falę {wave + 1} teraz
            </button>
          )}
        </aside>
      </div>

      <GameLeaderboard board={board} />
    </div>
  );
}
