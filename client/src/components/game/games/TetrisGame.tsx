import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, RotateCw, ChevronLeft, ChevronRight, ArrowDownToLine, Crown } from 'lucide-react';
import * as gameApi from '../../../api/game.api';
import GameLeaderboard, { useLeaderboard } from '../GameLeaderboard';
import ConfettiBurst from '../ConfettiBurst';

const GAME = 'tetris';
const COLS = 10;
const ROWS = 20;
const CELL = 24;
const W = COLS * CELL; // 240
const H = ROWS * CELL; // 480

const NEXT_CELL = 15;
const NEXT_SIZE = 74;

type Status = 'idle' | 'playing' | 'over';
type Cell = string | null;
type Piece = { m: number[][]; x: number; y: number; color: string; key: string };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Popup = { x: number; y: number; vy: number; life: number; max: number; text: string; color: string; size: number };

const SHAPES: Record<string, { m: number[][]; color: string }> = {
  I: { m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#22D3EE' },
  O: { m: [[1, 1], [1, 1]], color: '#FACC15' },
  T: { m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#C084FC' },
  S: { m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#4ADE80' },
  Z: { m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#F87171' },
  J: { m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#60A5FA' },
  L: { m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#F7941D' }, // brand piece
};
const KEYS = Object.keys(SHAPES);
const LINE_POINTS = [0, 100, 300, 500, 800];

const emptyBoard = (): Cell[][] => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
const rotateCW = (m: number[][]) => m[0].map((_, i) => m.map((r) => r[i]).reverse());

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const boardRef = useRef<Cell[][]>(emptyBoard());
  const pieceRef = useRef<Piece | null>(null);
  const nextRef = useRef<string>('T');
  const bagRef = useRef<string[]>([]);
  const statusRef = useRef<Status>('idle');
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const dropAcc = useRef(0);
  const lastTime = useRef(0);

  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);
  const shakeRef = useRef(0);
  const flashRef = useRef<{ a: number; color: string }>({ a: 0, color: '255,255,255' });
  const clearRowsRef = useRef<{ rows: number[]; t: number }>({ rows: [], t: 0 });

  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [nextKey, setNextKey] = useState('T');
  const [lastResult, setLastResult] = useState<{ score: number; best: number; record: boolean } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { board, reload } = useLeaderboard(GAME);

  // ---------- helpers ----------
  const drawCell = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, alpha = 1) => {
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(cx, cy, cx, cy + size);
    g.addColorStop(0, color);
    g.addColorStop(1, shade(color, -18));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cx + 1, cy + 1, size - 2, size - 2, 5);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx + 3.5, cy + 3, size - 7, size * 0.26, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const nextFromBag = () => {
    if (bagRef.current.length === 0) {
      const bag = [...KEYS];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      bagRef.current = bag;
    }
    return bagRef.current.pop()!;
  };

  const makePiece = (key: string): Piece => {
    const { m, color } = SHAPES[key];
    return { m: m.map((r) => [...r]), color, key, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
  };

  const collide = (b: Cell[][], p: Piece) => {
    for (let y = 0; y < p.m.length; y++) {
      for (let x = 0; x < p.m[y].length; x++) {
        if (!p.m[y][x]) continue;
        const bx = p.x + x;
        const by = p.y + y;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && b[by][bx]) return true;
      }
    }
    return false;
  };

  const popup = (x: number, y: number, text: string, color: string, size = 16) => {
    popups.current.push({ x, y, vy: -0.8, life: 0, max: 52, text, color, size });
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    shakeRef.current = 12;
    flashRef.current = { a: 0.6, color: '239,68,68' };
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

  const spawn = useCallback(() => {
    const p = makePiece(nextRef.current);
    nextRef.current = nextFromBag();
    setNextKey(nextRef.current);
    if (collide(boardRef.current, p)) {
      pieceRef.current = null;
      endGame();
      return;
    }
    pieceRef.current = p;
  }, [endGame]);

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const b = boardRef.current;
    for (let y = 0; y < p.m.length; y++) {
      for (let x = 0; x < p.m[y].length; x++) {
        if (!p.m[y][x]) continue;
        const by = p.y + y;
        const bx = p.x + x;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) b[by][bx] = p.color;
      }
    }

    const full: number[] = [];
    for (let y = 0; y < ROWS; y++) if (b[y].every((c) => c)) full.push(y);

    if (full.length) {
      // juice: flash the rows, throw particles, pop the score
      clearRowsRef.current = { rows: [...full], t: 10 };
      shakeRef.current = full.length === 4 ? 16 : 5 + full.length * 2;
      flashRef.current = { a: full.length === 4 ? 0.5 : 0.22, color: full.length === 4 ? '247,148,29' : '255,255,255' };
      for (const y of full) {
        for (let x = 0; x < COLS; x++) {
          const color = b[y][x] || '#F7941D';
          for (let i = 0; i < 2; i++) {
            particles.current.push({
              x: x * CELL + CELL / 2,
              y: y * CELL + CELL / 2,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5 - 1,
              life: 0,
              max: 26 + Math.random() * 22,
              size: 2 + Math.random() * 2.5,
              color,
            });
          }
        }
      }

      const kept = b.filter((row) => !row.every((c) => c));
      while (kept.length < ROWS) kept.unshift(Array<Cell>(COLS).fill(null));
      boardRef.current = kept;

      const gained = LINE_POINTS[full.length] * levelRef.current;
      scoreRef.current += gained;
      linesRef.current += full.length;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(levelRef.current);

      const midY = (full[0] + full[full.length - 1]) / 2 * CELL + CELL / 2;
      if (full.length === 4) popup(W / 2, midY, 'TETRIS!', '#EA7B0C', 22);
      else popup(W / 2, midY, `+${gained}`, '#0EA5E9', 17);
    }

    spawn();
  }, [spawn]);

  const step = useCallback(() => {
    const p = pieceRef.current;
    if (!p) return;
    const moved = { ...p, y: p.y + 1 };
    if (collide(boardRef.current, moved)) lockPiece();
    else pieceRef.current = moved;
  }, [lockPiece]);

  // ---------- input actions ----------
  const move = useCallback((dir: number) => {
    const p = pieceRef.current;
    if (!p || statusRef.current !== 'playing') return;
    const moved = { ...p, x: p.x + dir };
    if (!collide(boardRef.current, moved)) pieceRef.current = moved;
  }, []);

  const rotate = useCallback(() => {
    const p = pieceRef.current;
    if (!p || statusRef.current !== 'playing') return;
    const m = rotateCW(p.m);
    // basic wall kicks
    for (const dx of [0, -1, 1, -2, 2]) {
      const cand = { ...p, m, x: p.x + dx };
      if (!collide(boardRef.current, cand)) {
        pieceRef.current = cand;
        return;
      }
    }
  }, []);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || statusRef.current !== 'playing') return;
    const moved = { ...p, y: p.y + 1 };
    if (!collide(boardRef.current, moved)) {
      pieceRef.current = moved;
      scoreRef.current += 1;
      setScore(scoreRef.current);
      dropAcc.current = 0;
    }
  }, []);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    if (!p || statusRef.current !== 'playing') return;
    let cells = 0;
    const cand = { ...p };
    while (!collide(boardRef.current, { ...cand, y: cand.y + 1 })) {
      cand.y += 1;
      cells += 1;
    }
    pieceRef.current = cand;
    scoreRef.current += cells * 2;
    setScore(scoreRef.current);
    shakeRef.current = Math.max(shakeRef.current, 6);
    dropAcc.current = 0;
    lockPiece();
  }, [lockPiece]);

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
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    // settled cells
    const b = boardRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = b[y][x];
        if (c) drawCell(ctx, x * CELL, y * CELL, CELL, c);
      }
    }

    const p = pieceRef.current;
    if (p && statusRef.current === 'playing') {
      // ghost
      const ghost = { ...p };
      while (!collide(b, { ...ghost, y: ghost.y + 1 })) ghost.y += 1;
      for (let y = 0; y < p.m.length; y++) {
        for (let x = 0; x < p.m[y].length; x++) {
          if (!p.m[y][x]) continue;
          const gx = (ghost.x + x) * CELL;
          const gy = (ghost.y + y) * CELL;
          ctx.strokeStyle = 'rgba(255,255,255,0.28)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(gx + 2, gy + 2, CELL - 4, CELL - 4, 4);
          ctx.stroke();
        }
      }
      // active piece
      for (let y = 0; y < p.m.length; y++) {
        for (let x = 0; x < p.m[y].length; x++) {
          if (!p.m[y][x]) continue;
          const py = p.y + y;
          if (py < 0) continue;
          drawCell(ctx, (p.x + x) * CELL, py * CELL, CELL, p.color);
        }
      }
    }

    // line-clear flash bands
    if (clearRowsRef.current.t > 0) {
      const a = Math.min(1, clearRowsRef.current.t / 10) * 0.75;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      for (const y of clearRowsRef.current.rows) ctx.fillRect(0, y * CELL, W, CELL);
    }

    // particles
    for (const pa of particles.current) {
      const t = 1 - pa.life / pa.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = pa.color;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, pa.size * (0.4 + t * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // popups
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const po of popups.current) {
      const t = 1 - po.life / po.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.font = `bold ${po.size}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(po.text, po.x, po.y);
      ctx.fillStyle = po.color;
      ctx.fillText(po.text, po.x, po.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (flashRef.current.a > 0.01) {
      ctx.fillStyle = `rgba(${flashRef.current.color},${flashRef.current.a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, []);

  const drawNext = useCallback(() => {
    const ctx = nextCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, NEXT_SIZE, NEXT_SIZE);
    const { m, color } = SHAPES[nextKey];
    // trim to the filled bounds so the preview is centred
    let minX = 9, maxX = -1, minY = 9, maxY = -1;
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++)
        if (m[y][x]) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
    const w = (maxX - minX + 1) * NEXT_CELL;
    const h = (maxY - minY + 1) * NEXT_CELL;
    const ox = (NEXT_SIZE - w) / 2;
    const oy = (NEXT_SIZE - h) / 2;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++)
        if (m[y][x]) drawCell(ctx, ox + (x - minX) * NEXT_CELL, oy + (y - minY) * NEXT_CELL, NEXT_CELL, color);
  }, [nextKey]);

  useEffect(() => {
    drawNext();
  }, [drawNext]);

  // ---------- loop ----------
  const frame = useCallback(
    (now: number) => {
      const dtMs = Math.min(100, now - (lastTime.current || now));
      lastTime.current = now;
      const rawDt = dtMs / 16.67;

      shakeRef.current *= Math.pow(0.86, rawDt);
      flashRef.current.a *= Math.pow(0.82, rawDt);
      if (clearRowsRef.current.t > 0) clearRowsRef.current.t -= rawDt;

      if (statusRef.current === 'playing') {
        const interval = Math.max(90, 800 - (levelRef.current - 1) * 70);
        dropAcc.current += dtMs;
        if (dropAcc.current >= interval) {
          dropAcc.current = 0;
          step();
        }
      }

      for (const pa of particles.current) {
        pa.x += pa.vx * rawDt;
        pa.y += pa.vy * rawDt;
        pa.vy += 0.12 * rawDt;
        pa.life += rawDt;
      }
      particles.current = particles.current.filter((pa) => pa.life < pa.max);
      for (const po of popups.current) {
        po.y += po.vy * rawDt;
        po.life += rawDt;
      }
      popups.current = popups.current.filter((po) => po.life < po.max);

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
    boardRef.current = emptyBoard();
    particles.current = [];
    popups.current = [];
    bagRef.current = [];
    clearRowsRef.current = { rows: [], t: 0 };
    shakeRef.current = 0;
    flashRef.current = { a: 0, color: '255,255,255' };
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    dropAcc.current = 0;
    setScore(0);
    setLines(0);
    setLevel(1);
    setLastResult(null);
    setShowConfetti(false);
    nextRef.current = nextFromBag();
    statusRef.current = 'playing';
    setStatus('playing');
    spawn();
  }, [spawn]);

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'playing') return;
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Spacebar'];
      if (keys.includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowDown') softDrop();
      else if (e.key === 'ArrowUp') rotate();
      else if (e.key === ' ' || e.key === 'Spacebar') hardDrop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, rotate, softDrop, hardDrop]);

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600 shadow-sm transition-transform active:scale-90 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600';

  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-start gap-3">
          <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10" style={{ width: W, maxWidth: '100%' }}>
            <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ touchAction: 'none' }} />

            {status !== 'playing' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-900/55 to-slate-900/80 px-5 text-center text-white backdrop-blur-[2px]">
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
                  <div className="max-w-[210px] space-y-2">
                    <p className="text-sm font-medium">Układaj klocki i czyść linie!</p>
                    <p className="text-[11px] leading-relaxed text-white/70">
                      ◀ ▶ ruch · ▲ obrót · ▼ w dół<br />spacja — zrzut
                    </p>
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

          {/* Side panel */}
          <div className="flex w-[86px] flex-col gap-2">
            <div className="rounded-xl bg-gray-50 p-2 text-center dark:bg-gray-900/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Wynik</p>
              <p className="text-lg font-black tabular-nums text-[#EA7B0C]">{score}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-2 text-center dark:bg-gray-900/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Następny</p>
              <canvas ref={nextCanvasRef} width={NEXT_SIZE} height={NEXT_SIZE} className="mx-auto block" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 p-1.5 text-center dark:bg-gray-900/40">
                <p className="text-[9px] font-semibold uppercase text-gray-400">Linie</p>
                <p className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{lines}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-1.5 text-center dark:bg-gray-900/40">
                <p className="text-[9px] font-semibold uppercase text-gray-400">Poziom</p>
                <p className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{level}</p>
              </div>
            </div>
            {board?.me?.score ? (
              <p className="rounded-xl bg-[#F7941D]/10 py-1 text-center text-[10px] font-semibold tabular-nums text-[#EA7B0C]">
                best {board.me.score}
              </p>
            ) : null}
          </div>
        </div>

        {/* Touch / click controls */}
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => move(-1)} aria-label="W lewo"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" className={btn} onClick={rotate} aria-label="Obróć"><RotateCw className="h-5 w-5" /></button>
          <button type="button" className={btn} onClick={() => move(1)} aria-label="W prawo"><ChevronRight className="h-5 w-5" /></button>
          <button type="button" className={btn} onClick={hardDrop} aria-label="Zrzuć"><ArrowDownToLine className="h-5 w-5" /></button>
        </div>
      </div>

      <GameLeaderboard board={board} />
    </div>
  );
}

/** Darken/lighten a hex colour by a percentage. */
function shade(hex: string, pct: number) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const amt = Math.round(2.55 * pct);
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0x00ff) + amt);
  const b = clamp((n & 0x0000ff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
