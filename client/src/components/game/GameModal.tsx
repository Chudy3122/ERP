import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trophy, Play, RotateCcw, Gamepad2 } from 'lucide-react';
import * as gameApi from '../../api/game.api';

const GAME = 'dodge';
const W = 380;
const H = 480;
const PLAYER_W = 42;
const PLAYER_H = 30;
const PLAYER_Y = H - PLAYER_H - 16;

type Obstacle = { x: number; y: number; s: number; passed: boolean; hue: number; rot: number; rotSpeed: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; hue: number };
type Star = { x: number; y: number; size: number; speed: number };
type Status = 'idle' | 'playing' | 'over';

interface GameModalProps {
  onClose: () => void;
}

export default function GameModal({ onClose }: GameModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const playerX = useRef(W / 2 - PLAYER_W / 2);
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const stars = useRef<Star[]>([]);
  const scoreRef = useRef(0);
  const spawnTimer = useRef(0);
  const lastTime = useRef(0);
  const statusRef = useRef<Status>('idle');
  const flame = useRef(0);

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

  // Init starfield once
  if (stars.current.length === 0) {
    stars.current = Array.from({ length: 70 }, () => {
      const layer = Math.random();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size: layer < 0.6 ? 1 : layer < 0.9 ? 1.6 : 2.4,
        speed: layer < 0.6 ? 0.35 : layer < 0.9 ? 0.7 : 1.2,
      };
    });
  }

  const explode = (cx: number, cy: number) => {
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 5;
      particles.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 30 + Math.random() * 30,
        size: 1.5 + Math.random() * 3,
        hue: 20 + Math.random() * 40,
      });
    }
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1026');
    bg.addColorStop(0.6, '#0f172a');
    bg.addColorStop(1, '#131c3a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars (parallax)
    for (const st of stars.current) {
      ctx.globalAlpha = 0.3 + st.speed * 0.4;
      ctx.fillStyle = '#dbeafe';
      ctx.fillRect(st.x, st.y, st.size, st.size);
    }
    ctx.globalAlpha = 1;

    // Particles (trail + explosion)
    for (const p of particles.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = `hsl(${p.hue}, 100%, ${55 + t * 20}%)`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + t), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Obstacles (glowing meteors)
    for (const o of obstacles.current) {
      const cx = o.x + o.s / 2;
      const cy = o.y + o.s / 2;
      const r = o.s / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(o.rot);
      ctx.shadowBlur = 18;
      ctx.shadowColor = `hsl(${o.hue}, 90%, 55%)`;
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
      grad.addColorStop(0, `hsl(${o.hue}, 100%, 70%)`);
      grad.addColorStop(0.7, `hsl(${o.hue}, 85%, 48%)`);
      grad.addColorStop(1, `hsl(${o.hue + 10}, 80%, 32%)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      // craters
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(r * 0.3, -r * 0.2, r * 0.28, 0, Math.PI * 2);
      ctx.arc(-r * 0.35, r * 0.3, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // Player ship (glowing) — hidden briefly after crash
    if (statusRef.current !== 'over') {
      const px = playerX.current;
      const cx = px + PLAYER_W / 2;
      // Engine flame
      flame.current = (flame.current + 1) % 6;
      const flameLen = statusRef.current === 'playing' ? 14 + flame.current : 6;
      const fg = ctx.createLinearGradient(0, PLAYER_Y + PLAYER_H, 0, PLAYER_Y + PLAYER_H + flameLen);
      fg.addColorStop(0, 'rgba(255,180,60,0.95)');
      fg.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(cx - 7, PLAYER_Y + PLAYER_H - 2);
      ctx.lineTo(cx + 7, PLAYER_Y + PLAYER_H - 2);
      ctx.lineTo(cx, PLAYER_Y + PLAYER_H + flameLen);
      ctx.closePath();
      ctx.fill();

      // Body
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#38bdf8';
      const sg = ctx.createLinearGradient(0, PLAYER_Y, 0, PLAYER_Y + PLAYER_H);
      sg.addColorStop(0, '#e0f2fe');
      sg.addColorStop(0.5, '#38bdf8');
      sg.addColorStop(1, '#0284c7');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(cx, PLAYER_Y);
      ctx.lineTo(px + PLAYER_W, PLAYER_Y + PLAYER_H);
      ctx.lineTo(cx, PLAYER_Y + PLAYER_H - 8);
      ctx.lineTo(px, PLAYER_Y + PLAYER_H);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // cockpit
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx, PLAYER_Y + PLAYER_H * 0.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    explode(playerX.current + PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2);
    const finalScore = scoreRef.current;
    try {
      const best = await gameApi.submitScore(GAME, finalScore);
      setLastResult({ score: finalScore, best });
    } catch {
      setLastResult({ score: finalScore, best: finalScore });
    }
    loadBoard();
  }, [loadBoard]);

  // Single always-running loop: background/particles animate always; game logic only while playing
  const frame = useCallback(
    (now: number) => {
      const dt = Math.min(50, now - (lastTime.current || now)) / 16.67;
      lastTime.current = now;
      const playing = statusRef.current === 'playing';
      const s = scoreRef.current;
      const speed = playing ? 3 + s * 0.14 : 1;

      // Stars
      for (const st of stars.current) {
        st.y += st.speed * (playing ? speed * 0.6 : 1) * dt;
        if (st.y > H) {
          st.y = -st.size;
          st.x = Math.random() * W;
        }
      }

      if (playing) {
        // Spawn
        spawnTimer.current -= dt;
        if (spawnTimer.current <= 0) {
          const size = 26 + Math.random() * 34;
          obstacles.current.push({
            x: Math.random() * (W - size),
            y: -size,
            s: size,
            passed: false,
            hue: 15 + Math.random() * 45,
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.12,
          });
          spawnTimer.current = Math.max(15, 42 - s * 0.5);
        }
        // Engine trail
        particles.current.push({
          x: playerX.current + PLAYER_W / 2 + (Math.random() - 0.5) * 6,
          y: PLAYER_Y + PLAYER_H,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 1 + Math.random() * 1.5,
          life: 0,
          max: 16 + Math.random() * 12,
          size: 1.5 + Math.random() * 1.5,
          hue: 25 + Math.random() * 20,
        });

        for (const o of obstacles.current) {
          o.y += speed * dt;
          o.rot += o.rotSpeed * dt;
          if (!o.passed && o.y > PLAYER_Y + PLAYER_H) {
            o.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
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
        obstacles.current = obstacles.current.filter((o) => o.y < H + 40);
      }

      // Update particles
      for (const p of particles.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.04 * dt;
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
    setLastResult(null);
    statusRef.current = 'playing';
    setStatus('playing');
  }, []);

  // Start the persistent animation loop on mount
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
            <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10 shadow-lg shadow-[#38bdf8]/10" style={{ width: W, maxWidth: '100%' }}>
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
                      <p className="text-5xl font-black drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]">{lastResult.score}</p>
                      <p className="text-xs opacity-80">Twój rekord: {lastResult.best}</p>
                    </div>
                  )}
                  {status === 'idle' && (
                    <p className="max-w-[240px] text-sm opacity-90">
                      Unikaj lecących meteorów. Steruj myszką lub strzałkami. Im dłużej, tym szybciej!
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
              {/* Live score badge */}
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
