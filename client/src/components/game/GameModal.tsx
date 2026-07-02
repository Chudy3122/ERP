import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trophy, Play, RotateCcw, Gamepad2 } from 'lucide-react';
import * as gameApi from '../../api/game.api';

const GAME = 'dodge';
const W = 380;
const H = 480;
const GROUND_Y = H - 30;
const PLAYER_W = 34;
const PLAYER_H = 48;
const PLAYER_Y = GROUND_Y - PLAYER_H;

type ObType = 'brick' | 'crate' | 'pot' | 'tire';
type Obstacle = { x: number; y: number; s: number; passed: boolean; type: ObType; rot: number; rotSpeed: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Building = { x: number; w: number; h: number; shade: number };
type Status = 'idle' | 'playing' | 'over';

const OB_TYPES: ObType[] = ['brick', 'crate', 'pot', 'tire'];

interface GameModalProps {
  onClose: () => void;
}

export default function GameModal({ onClose }: GameModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const playerX = useRef(W / 2 - PLAYER_W / 2);
  const prevX = useRef(playerX.current);
  const walkPhase = useRef(0);
  const movingRef = useRef(false);
  const moveDirRef = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const buildings = useRef<Building[]>([]);
  const scoreRef = useRef(0);
  const spawnTimer = useRef(0);
  const lastTime = useRef(0);
  const statusRef = useRef<Status>('idle');

  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<{ score: number; best: number } | null>(null);
  const [board, setBoard] = useState<gameApi.Leaderboard | null>(null);

  const loadBoard = useCallback(() => {
    gameApi.getLeaderboard(GAME).then(setBoard).catch(() => setBoard(null));
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Build the skyline once
  if (buildings.current.length === 0) {
    let x = -10;
    while (x < W + 10) {
      const w = 28 + Math.random() * 40;
      buildings.current.push({ x, w, h: 70 + Math.random() * 180, shade: 18 + Math.random() * 14 });
      x += w + 4;
    }
  }

  const puff = (cx: number, cy: number, colors: string[], count: number, power = 4) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * power;
      particles.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 0,
        max: 24 + Math.random() * 26,
        size: 2 + Math.random() * 3,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, o: Obstacle) => {
    const r = o.s / 2;
    ctx.save();
    ctx.translate(o.x + r, o.y + r);
    ctx.rotate(o.rot);
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    if (o.type === 'brick') {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-r, -r * 0.55, o.s, o.s * 0.55);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-r, -r * 0.55, o.s, o.s * 0.55);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(0, r * 0.55);
      ctx.stroke();
    } else if (o.type === 'crate') {
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-r, -r, o.s, o.s);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.strokeRect(-r, -r, o.s, o.s);
      ctx.beginPath();
      ctx.moveTo(-r, -r);
      ctx.lineTo(r, r);
      ctx.moveTo(r, -r);
      ctx.lineTo(-r, r);
      ctx.stroke();
    } else if (o.type === 'pot') {
      ctx.fillStyle = '#c2571b';
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.4);
      ctx.lineTo(r, -r * 0.4);
      ctx.lineTo(r * 0.7, r);
      ctx.lineTo(-r * 0.7, r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(-r, -r * 0.55, o.s, r * 0.2);
      // little plant
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.7, r * 0.28, 0, Math.PI * 2);
      ctx.arc(r * 0.25, -r * 0.7, r * 0.28, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.95, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // tire
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.shadowBlur = 0;
  };

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const cx = playerX.current + PLAYER_W / 2;
    const moving = statusRef.current === 'playing' && movingRef.current;
    const swing = moving ? Math.sin(walkPhase.current) * 4 : 0;
    const lean = moving ? moveDirRef.current * 2.5 : 0; // upper-body lean into motion

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 2, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (trousers) — feet stay planted when idle
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    const lFoot = cx - 4 + swing;
    const rFoot = cx + 4 - swing;
    ctx.beginPath();
    ctx.moveTo(cx - 3, PLAYER_Y + 33);
    ctx.lineTo(lFoot, GROUND_Y - 2);
    ctx.moveTo(cx + 3, PLAYER_Y + 33);
    ctx.lineTo(rFoot, GROUND_Y - 2);
    ctx.stroke();
    // Shoes
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(lFoot, GROUND_Y - 1, 4, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(rFoot, GROUND_Y - 1, 4, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso: shirt + hi-vis vest
    const bx = cx + lean;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(bx - 8, PLAYER_Y + 16, 16, 19, 4);
    ctx.fill();
    ctx.fillStyle = '#f97316'; // vest
    ctx.beginPath();
    ctx.roundRect(bx - 7, PLAYER_Y + 17, 14, 17, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; // reflective stripes
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx - 4, PLAYER_Y + 18);
    ctx.lineTo(bx - 4, PLAYER_Y + 33);
    ctx.moveTo(bx + 4, PLAYER_Y + 18);
    ctx.lineTo(bx + 4, PLAYER_Y + 33);
    ctx.moveTo(bx - 6, PLAYER_Y + 26);
    ctx.lineTo(bx + 6, PLAYER_Y + 26);
    ctx.stroke();

    // Arms + hands
    ctx.strokeStyle = '#f3c19b';
    ctx.lineWidth = 3.5;
    const laX = bx - 11;
    const laY = PLAYER_Y + 31 - swing;
    const raX = bx + 11;
    const raY = PLAYER_Y + 31 + swing;
    ctx.beginPath();
    ctx.moveTo(bx - 7, PLAYER_Y + 20);
    ctx.lineTo(laX, laY);
    ctx.moveTo(bx + 7, PLAYER_Y + 20);
    ctx.lineTo(raX, raY);
    ctx.stroke();
    ctx.fillStyle = '#f3c19b';
    ctx.beginPath();
    ctx.arc(laX, laY, 2.2, 0, Math.PI * 2);
    ctx.arc(raX, raY, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const hx = cx + lean;
    ctx.fillStyle = '#f3c19b';
    ctx.beginPath();
    ctx.arc(hx, PLAYER_Y + 9, 7, 0, Math.PI * 2);
    ctx.fill();
    // Hard hat
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(hx, PLAYER_Y + 7, 7.5, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(hx - 1.5, PLAYER_Y - 0.5, 3, 3); // hat ridge
    ctx.fillStyle = '#facc15';
    ctx.fillRect(hx - 9, PLAYER_Y + 6, 18, 2.5); // brim
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Sky (dusk gradient)
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#0b1226');
    sky.addColorStop(0.55, '#3b2d5e');
    sky.addColorStop(1, '#c2410c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);

    // Buildings with lit windows
    for (const b of buildings.current) {
      const top = GROUND_Y - b.h;
      ctx.fillStyle = `hsl(230, 22%, ${b.shade}%)`;
      ctx.fillRect(b.x, top, b.w, b.h);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.65)';
      for (let wy = top + 8; wy < GROUND_Y - 6; wy += 12) {
        for (let wx = b.x + 5; wx < b.x + b.w - 5; wx += 10) {
          if ((wx * 13 + wy * 7) % 5 < 2) ctx.fillRect(wx, wy, 4, 6);
        }
      }
    }

    // Sidewalk / street
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, GROUND_Y, W, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 4);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Obstacles
    for (const o of obstacles.current) drawObstacle(ctx, o);

    // Player
    if (statusRef.current !== 'over') drawPlayer(ctx);

    // Particles (dust / stars)
    for (const p of particles.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [drawPlayer]);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    const cx = playerX.current + PLAYER_W / 2;
    puff(cx, PLAYER_Y + 20, ['#a8a29e', '#78716c', '#d6d3d1'], 26, 5); // dust
    puff(cx, PLAYER_Y + 4, ['#facc15', '#fde047', '#fef08a'], 10, 4); // stars
    const finalScore = scoreRef.current;
    try {
      const best = await gameApi.submitScore(GAME, finalScore);
      setLastResult({ score: finalScore, best });
    } catch {
      setLastResult({ score: finalScore, best: finalScore });
    }
    loadBoard();
  }, [loadBoard]);

  const frame = useCallback(
    (now: number) => {
      const dt = Math.min(50, now - (lastTime.current || now)) / 16.67;
      lastTime.current = now;
      const playing = statusRef.current === 'playing';
      const s = scoreRef.current;
      const speed = playing ? 3 + s * 0.15 : 0;

      if (playing) {
        // Walk animation only while actually moving; stand still otherwise
        const dx = playerX.current - prevX.current;
        const moved = Math.abs(dx);
        const moving = moved > 0.6;
        movingRef.current = moving;
        if (moving) {
          moveDirRef.current = dx > 0 ? 1 : -1;
          walkPhase.current += 0.4 * dt;
          if (moved > 1.5 && Math.random() < 0.4) {
            puff(playerX.current + PLAYER_W / 2, GROUND_Y, ['rgba(120,120,120,0.7)'], 1, 1);
          }
        }
        prevX.current = playerX.current;

        // Spawn
        spawnTimer.current -= dt;
        if (spawnTimer.current <= 0) {
          const size = 22 + Math.random() * 28;
          obstacles.current.push({
            x: Math.random() * (W - size),
            y: -size,
            s: size,
            passed: false,
            type: OB_TYPES[(Math.random() * OB_TYPES.length) | 0],
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.14,
          });
          spawnTimer.current = Math.max(15, 42 - s * 0.5);
        }

        for (const o of obstacles.current) {
          o.y += speed * dt;
          o.rot += o.rotSpeed * dt;
          if (!o.passed && o.y + o.s >= GROUND_Y) {
            o.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            puff(o.x + o.s / 2, GROUND_Y, ['#9ca3af', '#6b7280'], 6, 2); // landing dust
          }
          if (
            playerX.current < o.x + o.s &&
            playerX.current + PLAYER_W > o.x &&
            PLAYER_Y < o.y + o.s &&
            PLAYER_Y + PLAYER_H > o.y
          ) {
            endGame();
            break;
          }
        }
        obstacles.current = obstacles.current.filter((o) => o.y < H + 20);
      }

      for (const p of particles.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.05 * dt;
        p.life += dt;
      }
      particles.current = particles.current.filter((p) => p.life < p.max);

      draw();
      rafRef.current = requestAnimationFrame(frame);
    },
    [draw, endGame]
  );

  const startGame = useCallback(() => {
    obstacles.current = [];
    particles.current = [];
    scoreRef.current = 0;
    setScore(0);
    spawnTimer.current = 0;
    playerX.current = W / 2 - PLAYER_W / 2;
    prevX.current = playerX.current;
    setLastResult(null);
    statusRef.current = 'playing';
    setStatus('playing');
  }, []);

  useEffect(() => {
    lastTime.current = 0;
    rafRef.current = requestAnimationFrame(frame);
    return () => stopLoop();
  }, [frame]);

  const movePlayerToClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = W / rect.width;
    let x = (clientX - rect.left) * scale - PLAYER_W / 2;
    x = Math.max(0, Math.min(W - PLAYER_W, x));
    playerX.current = x;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'playing') return;
      if (e.key === 'ArrowLeft') playerX.current = Math.max(0, playerX.current - 30);
      if (e.key === 'ArrowRight') playerX.current = Math.min(W - PLAYER_W, playerX.current + 30);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Gamepad2 className="h-5 w-5 text-[#F7941D]" />
            Unik — gra
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center">
            <div className="relative overflow-hidden rounded-xl ring-1 ring-black/10 shadow-lg" style={{ width: W, maxWidth: '100%' }}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onMouseMove={(e) => movePlayerToClientX(e.clientX)}
                onTouchMove={(e) => e.touches[0] && movePlayerToClientX(e.touches[0].clientX)}
                className="block w-full"
                style={{ touchAction: 'none' }}
              />
              {status !== 'playing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/40 to-black/70 text-center text-white backdrop-blur-[1px]">
                  {status === 'over' && lastResult && (
                    <div>
                      <p className="text-sm uppercase tracking-widest text-red-300">Koniec gry</p>
                      <p className="text-5xl font-black drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]">{lastResult.score}</p>
                      <p className="text-xs opacity-80">Twój rekord: {lastResult.best}</p>
                    </div>
                  )}
                  {status === 'idle' && (
                    <p className="max-w-[250px] text-sm opacity-90">
                      Unikaj spadających przedmiotów! Steruj myszką lub strzałkami. Im dłużej, tym szybciej!
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startGame}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#F7941D]/30 transition-transform hover:scale-105"
                  >
                    {status === 'over' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {status === 'over' ? 'Zagraj ponownie' : 'Start'}
                  </button>
                </div>
              )}
              {status === 'playing' && (
                <div className="absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 font-mono text-sm font-bold text-white backdrop-blur">
                  {score}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Trophy className="h-4 w-4 text-[#F7941D]" /> Ranking
            </h3>
            {!board || board.top.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900/30">
                Brak wyników — bądź pierwszy!
              </p>
            ) : (
              <ol className="space-y-1">
                {board.top.map((e) => (
                  <li
                    key={e.userId}
                    className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${
                      board.me && e.rank === board.me.rank && e.score === board.me.score
                        ? 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15'
                        : ''
                    }`}
                  >
                    <span className={`w-6 text-center font-bold ${e.rank === 1 ? 'text-yellow-500' : e.rank === 2 ? 'text-gray-400' : e.rank === 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {e.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{e.name}</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{e.score}</span>
                  </li>
                ))}
              </ol>
            )}
            {board?.me && (
              <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                Twój rekord: <span className="font-semibold">{board.me.score}</span>
                {board.me.rank ? ` · miejsce ${board.me.rank}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
