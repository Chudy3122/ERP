import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trophy, Play, RotateCcw, Gamepad2 } from 'lucide-react';
import * as gameApi from '../../api/game.api';

const GAME = 'dodge';
const W = 380;
const H = 480;
const PLAYER_W = 42;
const PLAYER_H = 16;
const PLAYER_Y = H - PLAYER_H - 12;

type Obstacle = { x: number; y: number; w: number; h: number; passed: boolean };
type Status = 'idle' | 'playing' | 'over';

interface GameModalProps {
  onClose: () => void;
}

export default function GameModal({ onClose }: GameModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const playerX = useRef(W / 2 - PLAYER_W / 2);
  const obstacles = useRef<Obstacle[]>([]);
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

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 53) % W, (i * 97 + (Date.now() / 20) % H) % H, 2, 2);
    }
    // Obstacles
    ctx.fillStyle = '#f7941d';
    for (const o of obstacles.current) {
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
    // Player (ship)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    const px = playerX.current;
    ctx.moveTo(px + PLAYER_W / 2, PLAYER_Y);
    ctx.lineTo(px, PLAYER_Y + PLAYER_H);
    ctx.lineTo(px + PLAYER_W, PLAYER_Y + PLAYER_H);
    ctx.closePath();
    ctx.fill();
  }, []);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const endGame = useCallback(async () => {
    stopLoop();
    statusRef.current = 'over';
    setStatus('over');
    const finalScore = scoreRef.current;
    try {
      const best = await gameApi.submitScore(GAME, finalScore);
      setLastResult({ score: finalScore, best });
    } catch {
      setLastResult({ score: finalScore, best: finalScore });
    }
    loadBoard();
  }, [loadBoard]);

  const tick = useCallback(
    (now: number) => {
      if (statusRef.current !== 'playing') return;
      const dt = Math.min(50, now - (lastTime.current || now)) / 16.67;
      lastTime.current = now;

      const s = scoreRef.current;
      const speed = 3 + s * 0.14;
      spawnTimer.current -= dt;
      if (spawnTimer.current <= 0) {
        const w = 28 + Math.random() * 46;
        obstacles.current.push({ x: Math.random() * (W - w), y: -20, w, h: 18, passed: false });
        spawnTimer.current = Math.max(16, 42 - s * 0.5);
      }

      for (const o of obstacles.current) {
        o.y += speed * dt;
        if (!o.passed && o.y > PLAYER_Y + PLAYER_H) {
          o.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
        // Collision (AABB)
        if (
          playerX.current < o.x + o.w &&
          playerX.current + PLAYER_W > o.x &&
          PLAYER_Y < o.y + o.h &&
          PLAYER_Y + PLAYER_H > o.y
        ) {
          endGame();
          return;
        }
      }
      obstacles.current = obstacles.current.filter((o) => o.y < H + 30);

      draw();
      rafRef.current = requestAnimationFrame(tick);
    },
    [draw, endGame]
  );

  const startGame = useCallback(() => {
    obstacles.current = [];
    scoreRef.current = 0;
    setScore(0);
    spawnTimer.current = 0;
    lastTime.current = 0;
    playerX.current = W / 2 - PLAYER_W / 2;
    setLastResult(null);
    statusRef.current = 'playing';
    setStatus('playing');
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Draw an initial frame and clean up on unmount
  useEffect(() => {
    draw();
    return () => stopLoop();
  }, [draw]);

  // Controls: mouse + keyboard
  const movePlayerToClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = W / rect.width;
    let x = (clientX - rect.left) * scale - PLAYER_W / 2;
    x = Math.max(0, Math.min(W - PLAYER_W, x));
    playerX.current = x;
    if (statusRef.current !== 'playing') draw();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'playing') return;
      if (e.key === 'ArrowLeft') playerX.current = Math.max(0, playerX.current - 28);
      if (e.key === 'ArrowRight') playerX.current = Math.min(W - PLAYER_W, playerX.current + 28);
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
          {/* Game */}
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: W, maxWidth: '100%' }}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onMouseMove={(e) => movePlayerToClientX(e.clientX)}
                onTouchMove={(e) => e.touches[0] && movePlayerToClientX(e.touches[0].clientX)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
                style={{ touchAction: 'none' }}
              />
              {status !== 'playing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/50 text-center text-white">
                  {status === 'over' && lastResult && (
                    <div>
                      <p className="text-sm opacity-80">Koniec gry</p>
                      <p className="text-3xl font-black">{lastResult.score}</p>
                      <p className="text-xs opacity-80">Twój rekord: {lastResult.best}</p>
                    </div>
                  )}
                  {status === 'idle' && (
                    <p className="max-w-[240px] text-sm opacity-90">
                      Unikaj spadających przeszkód. Steruj myszką lub strzałkami. Im dłużej, tym szybciej!
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startGame}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                  >
                    {status === 'over' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {status === 'over' ? 'Zagraj ponownie' : 'Start'}
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Wynik: {score}</p>
          </div>

          {/* Leaderboard */}
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
                    <span className="w-6 text-center font-bold text-gray-400">{e.rank}</span>
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
