import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Crown } from 'lucide-react';
import * as gameApi from '../../../api/game.api';
import GameLeaderboard, { useLeaderboard } from '../GameLeaderboard';
import ConfettiBurst from '../ConfettiBurst';

const GAME = 'snake';
const CELL = 20;
const COLS = 19;
const ROWS = 24;
const W = COLS * CELL; // 380
const H = ROWS * CELL; // 480

const BRAND = '#F7941D';
const BONUS_EVERY = 5; // a golden apple shows up every N normal ones
const BONUS_TTL = 6000; // ms

type Status = 'idle' | 'playing' | 'over';
type Pt = { x: number; y: number };
type Bonus = { x: number; y: number; ttl: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Popup = { x: number; y: number; vy: number; life: number; max: number; text: string; color: string; size: number };

const eq = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const snake = useRef<Pt[]>([]);
  const dir = useRef<Pt>({ x: 1, y: 0 });
  const dirQueue = useRef<Pt[]>([]);
  const food = useRef<Pt>({ x: 5, y: 5 });
  const bonus = useRef<Bonus | null>(null);
  const eaten = useRef(0);
  const growBy = useRef(0);

  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);
  const shakeRef = useRef(0);
  const flashRef = useRef<{ a: number; color: string }>({ a: 0, color: '255,255,255' });
  const popRef = useRef(0); // head pop on eat

  const scoreRef = useRef(0);
  const statusRef = useRef<Status>('idle');
  const tickAcc = useRef(0);
  const lastTime = useRef(0);

  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [len, setLen] = useState(3);
  const [lastResult, setLastResult] = useState<{ score: number; best: number; record: boolean } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { board, reload } = useLeaderboard(GAME);

  const level = () => Math.floor((snake.current.length - 3) / 5) + 1;
  const tickMs = () => Math.max(65, 140 - (snake.current.length - 3) * 2.2);

  const puff = (gx: number, gy: number, color: string, count: number, power = 3) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * power;
      particles.current.push({
        x: gx * CELL + CELL / 2,
        y: gy * CELL + CELL / 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 18 + Math.random() * 20,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  };

  const popup = (gx: number, gy: number, text: string, color: string, size = 14) => {
    popups.current.push({ x: gx * CELL + CELL / 2, y: gy * CELL, vy: -0.8, life: 0, max: 44, text, color, size });
  };

  /** Pick a random cell that the snake (and the other apple) doesn't occupy. */
  const freeCell = (extra?: Pt | null): Pt | null => {
    const taken = new Set(snake.current.map((s) => `${s.x},${s.y}`));
    if (extra) taken.add(`${extra.x},${extra.y}`);
    const free: Pt[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (free.length === 0) return null;
    return free[(Math.random() * free.length) | 0];
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    shakeRef.current = 13;
    flashRef.current = { a: 0.6, color: '239,68,68' };
    const head = snake.current[0];
    if (head) puff(head.x, head.y, BRAND, 20, 5);
    const finalScore = scoreRef.current;
    const prevBest = board?.me?.score ?? 0;
    try {
      const best = await gameApi.submitScore(GAME, finalScore);
      const record = finalScore > prevBest && finalScore > 0;
      setLastResult({ score: finalScore, best, record });
      if (record) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2800);
      }
    } catch {
      setLastResult({ score: finalScore, best: Math.max(finalScore, prevBest), record: false });
    }
    reload();
  }, [reload, board]);

  /** One grid step. */
  const step = useCallback(() => {
    // take the next buffered turn that isn't a reversal
    while (dirQueue.current.length) {
      const d = dirQueue.current.shift()!;
      const reverses = snake.current.length > 1 && d.x === -dir.current.x && d.y === -dir.current.y;
      if (!reverses) {
        dir.current = d;
        break;
      }
    }

    const head = snake.current[0];
    const next: Pt = { x: head.x + dir.current.x, y: head.y + dir.current.y };

    // walls
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      endGame();
      return;
    }
    // self — the tail cell frees up this step unless we're growing into it
    const ignoreTail = growBy.current === 0;
    const body = ignoreTail ? snake.current.slice(0, -1) : snake.current;
    if (body.some((s) => eq(s, next))) {
      endGame();
      return;
    }

    snake.current.unshift(next);

    if (eq(next, food.current)) {
      const pts = 10 * level();
      scoreRef.current += pts;
      setScore(scoreRef.current);
      eaten.current += 1;
      growBy.current += 1;
      popRef.current = 1;
      puff(next.x, next.y, '#EF4444', 10, 3);
      popup(next.x, next.y, `+${pts}`, '#EF4444', 13);
      const f = freeCell(bonus.current);
      if (f) food.current = f;
      // golden apple every few normal ones
      if (eaten.current % BONUS_EVERY === 0 && !bonus.current) {
        const b = freeCell(food.current);
        if (b) bonus.current = { ...b, ttl: BONUS_TTL };
      }
    } else if (bonus.current && eq(next, bonus.current)) {
      const pts = 50 * level();
      scoreRef.current += pts;
      setScore(scoreRef.current);
      growBy.current += 2;
      popRef.current = 1;
      shakeRef.current = Math.max(shakeRef.current, 5);
      flashRef.current = { a: 0.25, color: '250,204,21' };
      puff(next.x, next.y, '#FACC15', 16, 4);
      popup(next.x, next.y, `+${pts}`, '#CA8A04', 16);
      bonus.current = null;
    }

    // growBy is pending growth: skip one tail-pop per unit, over as many steps as needed
    if (growBy.current > 0) growBy.current -= 1;
    else snake.current.pop();

    setLen(snake.current.length);
  }, [endGame]);

  // ---------- drawing ----------
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (shakeRef.current > 0.4) {
      const m = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // playfield
    ctx.fillStyle = '#232B3A';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    // subtle checkerboard
    ctx.fillStyle = 'rgba(255,255,255,0.022)';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // food
    const drawApple = (p: Pt, color: string, glow: string, scale = 1) => {
      const cx = p.x * CELL + CELL / 2;
      const cy = p.y * CELL + CELL / 2;
      const r = (CELL / 2 - 3) * scale;
      ctx.shadowBlur = 14;
      ctx.shadowColor = glow;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.4, cy - r * 1.4);
      ctx.stroke();
    };
    drawApple(food.current, '#EF4444', 'rgba(239,68,68,0.6)');
    if (bonus.current) {
      const pulse = 0.9 + 0.12 * Math.sin(performance.now() / 120);
      const fading = bonus.current.ttl < 1500;
      if (!fading || Math.floor(performance.now() / 180) % 2 === 0) {
        drawApple(bonus.current, '#FACC15', 'rgba(250,204,21,0.75)', pulse);
      }
    }

    // snake — head first, so draw tail→head for correct overlap
    const s = snake.current;
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      const t = i / Math.max(1, s.length - 1);
      const isHead = i === 0;
      const pad = isHead ? 1 : 2 + t * 1.5;
      const size = CELL - pad * 2;
      const x = p.x * CELL + pad;
      const y = p.y * CELL + pad;
      const grad = ctx.createLinearGradient(x, y, x, y + size);
      grad.addColorStop(0, isHead ? '#FDBA6B' : mix('#FDBA6B', '#EA7B0C', t));
      grad.addColorStop(1, isHead ? '#EA7B0C' : mix('#EA7B0C', '#B45309', t));
      ctx.fillStyle = grad;
      if (isHead) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(247,148,29,0.6)';
      }
      const scale = isHead ? 1 + popRef.current * 0.18 : 1;
      const off = (size * (scale - 1)) / 2;
      ctx.beginPath();
      ctx.roundRect(x - off, y - off, size * scale, size * scale, isHead ? 7 : 5);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isHead) {
        // eyes look where the snake is going
        const cx = p.x * CELL + CELL / 2;
        const cy = p.y * CELL + CELL / 2;
        const ox = dir.current.x * 3.2;
        const oy = dir.current.y * 3.2;
        const px = -dir.current.y * 3.4;
        const py = dir.current.x * 3.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + ox + px, cy + oy + py, 2.7, 0, Math.PI * 2);
        ctx.arc(cx + ox - px, cy + oy - py, 2.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.arc(cx + ox * 1.35 + px, cy + oy * 1.35 + py, 1.4, 0, Math.PI * 2);
        ctx.arc(cx + ox * 1.35 - px, cy + oy * 1.35 - py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // particles
    for (const p of particles.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // popups
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.font = `bold ${p.size}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
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

  // ---------- loop ----------
  const frame = useCallback(
    (now: number) => {
      const dtMs = Math.min(100, now - (lastTime.current || now));
      lastTime.current = now;
      const dt = dtMs / 16.67;

      shakeRef.current *= Math.pow(0.86, dt);
      flashRef.current.a *= Math.pow(0.82, dt);
      popRef.current *= Math.pow(0.82, dt);

      if (statusRef.current === 'playing') {
        tickAcc.current += dtMs;
        const ms = tickMs();
        while (tickAcc.current >= ms && statusRef.current === 'playing') {
          tickAcc.current -= ms;
          step();
        }
        if (bonus.current) {
          bonus.current.ttl -= dtMs;
          if (bonus.current.ttl <= 0) bonus.current = null;
        }
      }

      for (const p of particles.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.06 * dt;
        p.life += dt;
      }
      particles.current = particles.current.filter((p) => p.life < p.max);
      for (const p of popups.current) {
        p.y += p.vy * dt;
        p.life += dt;
      }
      popups.current = popups.current.filter((p) => p.life < p.max);

      draw();
      rafRef.current = requestAnimationFrame(frame);
    },
    [draw, step]
  );

  useEffect(() => {
    lastTime.current = 0;
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [frame]);

  const startGame = useCallback(() => {
    const cy = Math.floor(ROWS / 2);
    const cx = Math.floor(COLS / 2);
    snake.current = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    dir.current = { x: 1, y: 0 };
    dirQueue.current = [];
    growBy.current = 0;
    eaten.current = 0;
    bonus.current = null;
    particles.current = [];
    popups.current = [];
    shakeRef.current = 0;
    popRef.current = 0;
    flashRef.current = { a: 0, color: '255,255,255' };
    scoreRef.current = 0;
    tickAcc.current = 0;
    setScore(0);
    setLen(3);
    setLastResult(null);
    setShowConfetti(false);
    const f = freeCell(null);
    food.current = f ?? { x: 0, y: 0 };
    statusRef.current = 'playing';
    setStatus('playing');
  }, []);

  const turn = useCallback((x: number, y: number) => {
    if (statusRef.current !== 'playing') return;
    if (dirQueue.current.length < 3) dirQueue.current.push({ x, y });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'playing') return;
      const k = e.key.toLowerCase();
      const handled = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'];
      if (handled.includes(k)) e.preventDefault();
      if (k === 'arrowleft' || k === 'a') turn(-1, 0);
      else if (k === 'arrowright' || k === 'd') turn(1, 0);
      else if (k === 'arrowup' || k === 'w') turn(0, -1);
      else if (k === 'arrowdown' || k === 's') turn(0, 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600 shadow-sm transition-transform active:scale-90 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600';

  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10" style={{ width: W, maxWidth: '100%' }}>
          <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ touchAction: 'none' }} />

          {status === 'playing' && (
            <>
              <div className="pointer-events-none absolute left-3 top-2.5 flex items-center gap-2">
                <span className="rounded-lg bg-white/85 px-2.5 py-0.5 text-sm font-bold tabular-nums text-[#EA7B0C] shadow backdrop-blur">
                  {score}
                </span>
                <span className="rounded-lg bg-white/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500 shadow backdrop-blur">
                  dł. {len}
                </span>
              </div>
              {board?.me?.score ? (
                <div className="pointer-events-none absolute right-3 top-2.5 rounded-lg bg-white/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500 shadow backdrop-blur">
                  best {board.me.score}
                </div>
              ) : null}
            </>
          )}

          {status !== 'playing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-900/55 to-slate-900/80 px-6 text-center text-white backdrop-blur-[2px]">
              {status === 'over' && lastResult && (
                <div className="flex flex-col items-center">
                  {lastResult.record ? (
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-yellow-300">
                      <Crown className="h-4 w-4" /> Nowy rekord!
                    </p>
                  ) : (
                    <p className="text-sm font-semibold uppercase tracking-widest text-orange-200">Koniec gry</p>
                  )}
                  <p className="text-5xl font-black tabular-nums drop-shadow-[0_2px_12px_rgba(247,148,29,0.7)]">{lastResult.score}</p>
                  <p className="mt-1 text-xs text-white/70">Twój rekord: {lastResult.best}</p>
                </div>
              )}
              {status === 'idle' && (
                <div className="max-w-[250px] space-y-2">
                  <p className="text-sm font-medium">Zbieraj jabłka, nie wjedź w siebie!</p>
                  <div className="flex flex-wrap justify-center gap-2 text-[11px] text-white/90">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> jabłko +10
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> złote +50
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60">Strzałki lub WASD · im dłuższy, tym szybciej</p>
                </div>
              )}
              <button
                type="button"
                onClick={startGame}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7941D] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#F7941D]/40 transition-transform hover:scale-105 active:scale-95"
              >
                {status === 'over' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {status === 'over' ? 'Zagraj ponownie' : 'Start'}
              </button>
            </div>
          )}

          {showConfetti && <ConfettiBurst />}
        </div>

        {/* Touch / click controls */}
        <div className="flex flex-col items-center gap-1.5">
          <button type="button" className={btn} onClick={() => turn(0, -1)} aria-label="W górę"><ChevronUp className="h-5 w-5" /></button>
          <div className="flex gap-1.5">
            <button type="button" className={btn} onClick={() => turn(-1, 0)} aria-label="W lewo"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" className={btn} onClick={() => turn(0, 1)} aria-label="W dół"><ChevronDown className="h-5 w-5" /></button>
            <button type="button" className={btn} onClick={() => turn(1, 0)} aria-label="W prawo"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      </div>

      <GameLeaderboard board={board} />
    </div>
  );
}

/** Blend two hex colours; t=0 → a, t=1 → b. */
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const c = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + c).toString(16).slice(1)}`;
}
