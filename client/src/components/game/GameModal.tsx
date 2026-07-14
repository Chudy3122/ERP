import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trophy, Play, RotateCcw, Gamepad2, Shield, Timer, Coins, Crown } from 'lucide-react';
import * as gameApi from '../../api/game.api';

const GAME = 'dodge';
const W = 380;
const H = 480;
const GROUND_Y = H - 34;
const PLAYER_W = 34;
const PLAYER_H = 46;
const PLAYER_Y = GROUND_Y - PLAYER_H;

const BRAND = '#F7941D';
const CONFETTI_COLORS = ['#F7941D', '#2563EB', '#22C55E', '#EF4444', '#A855F7', '#FACC15'];

type ObType = 'block' | 'round' | 'spike';
type CoType = 'coin' | 'shield' | 'slow';
type Status = 'idle' | 'playing' | 'over';

type Obstacle = { x: number; y: number; s: number; passed: boolean; near: boolean; blocked: boolean; type: ObType; color: string; rot: number; rotSpeed: number };
type Collectible = { x: number; y: number; s: number; type: CoType; bob: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Popup = { x: number; y: number; vy: number; life: number; max: number; text: string; color: string; size: number };
type Cloud = { x: number; y: number; s: number; speed: number };

const OB_TYPES: ObType[] = ['block', 'round', 'spike'];
// Cool/darker tones for danger — clearly reads as "avoid"
const OB_COLORS = ['#475569', '#6366F1', '#F97362', '#0EA5A4'];

interface GameModalProps {
  onClose: () => void;
}

export default function GameModal({ onClose }: GameModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const playerX = useRef(W / 2 - PLAYER_W / 2);
  const prevX = useRef(playerX.current);
  const squashRef = useRef(0);
  const moveDirRef = useRef(0);

  const obstacles = useRef<Obstacle[]>([]);
  const collectibles = useRef<Collectible[]>([]);
  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);
  const clouds = useRef<Cloud[]>([]);

  const scoreRef = useRef(0);
  const spawnTimer = useRef(0);
  const collectTimer = useRef(160);
  const lastTime = useRef(0);
  const statusRef = useRef<Status>('idle');

  // Juice + power-up timers (measured in ~frames @60fps)
  const shakeRef = useRef(0);
  const flashRef = useRef<{ a: number; color: string }>({ a: 0, color: '255,255,255' });
  const shieldRef = useRef(0);
  const slowRef = useRef(0);   // slow-mo power-up
  const nearRef = useRef(0);   // near-miss slow-mo
  const pulseRef = useRef(0);

  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [powers, setPowers] = useState<{ shield: boolean; slow: boolean }>({ shield: false, slow: false });
  const [lastResult, setLastResult] = useState<{ score: number; best: number; record: boolean } | null>(null);
  const [board, setBoard] = useState<gameApi.Leaderboard | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const loadBoard = useCallback(() => {
    gameApi.getLeaderboard(GAME).then(setBoard).catch(() => setBoard(null));
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Soft floating clouds for parallax depth (built once)
  if (clouds.current.length === 0) {
    for (let i = 0; i < 5; i++) {
      clouds.current.push({
        x: Math.random() * W,
        y: 30 + Math.random() * (GROUND_Y - 120),
        s: 26 + Math.random() * 34,
        speed: 0.08 + Math.random() * 0.14,
      });
    }
  }

  const puff = (cx: number, cy: number, colors: string[], count: number, power = 4) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * power;
      particles.current.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 0,
        max: 24 + Math.random() * 26,
        size: 2 + Math.random() * 3,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  };

  const popup = (x: number, y: number, text: string, color: string, size = 15) => {
    popups.current.push({ x, y, vy: -0.9, life: 0, max: 46, text, color, size });
  };

  // ---------- Drawing ----------
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, o: Obstacle) => {
    const r = o.s / 2;
    ctx.save();
    ctx.translate(o.x + r, o.y + r);
    ctx.rotate(o.rot);
    // soft drop shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(30,41,59,0.28)';
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = o.color;
    if (o.type === 'block') {
      roundRect(ctx, -r, -r, o.s, o.s, 7);
      ctx.fill();
    } else if (o.type === 'round') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.92, r * 0.75);
      ctx.lineTo(-r * 0.92, r * 0.75);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // glossy top highlight
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    if (o.type === 'round') {
      ctx.beginPath();
      ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.5, r * 0.3, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      roundRect(ctx, -r + 3, -r + 3, o.s - 6, o.s * 0.34, 5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const drawCollectible = (ctx: CanvasRenderingContext2D, c: Collectible) => {
    const r = c.s / 2;
    const cy = c.y + r + Math.sin(c.bob) * 3;
    const cx = c.x + r;
    const cfg =
      c.type === 'coin' ? { fill: '#FACC15', ring: '#EAB308', glow: 'rgba(250,204,21,0.55)' }
      : c.type === 'shield' ? { fill: '#38BDF8', ring: '#0EA5E9', glow: 'rgba(56,189,248,0.55)' }
      : { fill: '#C084FC', ring: '#A855F7', glow: 'rgba(192,132,252,0.55)' };
    ctx.save();
    ctx.translate(cx, cy);
    // glow
    ctx.shadowBlur = 16;
    ctx.shadowColor = cfg.glow;
    ctx.fillStyle = cfg.fill;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = cfg.ring;
    ctx.stroke();
    // icon
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    if (c.type === 'coin') {
      ctx.font = `bold ${r}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 1);
    } else if (c.type === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(r * 0.5, -r * 0.28);
      ctx.lineTo(r * 0.5, r * 0.12);
      ctx.quadraticCurveTo(r * 0.5, r * 0.55, 0, r * 0.62);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.55, -r * 0.5, r * 0.12);
      ctx.lineTo(-r * 0.5, -r * 0.28);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.3);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.28, r * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const cx = playerX.current + PLAYER_W / 2;
    const squash = squashRef.current; // -1..1
    const sx = 1 + Math.abs(squash) * 0.16;
    const sy = 1 - Math.abs(squash) * 0.12;
    const lean = moveDirRef.current * squash * 6;

    // shadow
    ctx.fillStyle = 'rgba(30,41,59,0.20)';
    ctx.beginPath();
    ctx.ellipse(cx, GROUND_Y + 3, 16 * sx, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, GROUND_Y);
    ctx.transform(sx, 0, lean * 0.01, sy, 0, 0);

    // body capsule (brand gradient)
    const grad = ctx.createLinearGradient(0, -PLAYER_H, 0, 0);
    grad.addColorStop(0, '#FDBA6B');
    grad.addColorStop(0.5, BRAND);
    grad.addColorStop(1, '#EA7B0C');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(234,123,12,0.35)';
    roundRect(ctx, -PLAYER_W / 2, -PLAYER_H, PLAYER_W, PLAYER_H, 13);
    ctx.fill();
    ctx.shadowBlur = 0;

    // little cap
    ctx.fillStyle = '#FACC15';
    roundRect(ctx, -PLAYER_W / 2 + 3, -PLAYER_H - 3, PLAYER_W - 6, 8, 5);
    ctx.fill();

    // visor / face
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, -PLAYER_W / 2 + 4, -PLAYER_H + 10, PLAYER_W - 8, 15, 7);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    const eyeShift = moveDirRef.current * 1.6;
    ctx.beginPath();
    ctx.arc(-5 + eyeShift, -PLAYER_H + 17.5, 2.4, 0, Math.PI * 2);
    ctx.arc(5 + eyeShift, -PLAYER_H + 17.5, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // feet
    ctx.fillStyle = '#334155';
    roundRect(ctx, -PLAYER_W / 2 + 4, -6, 10, 6, 3);
    roundRect(ctx, PLAYER_W / 2 - 14, -6, 10, 6, 3);
    ctx.fill();
    ctx.restore();

    // shield ring
    if (shieldRef.current > 0) {
      const p = 0.5 + 0.5 * Math.sin(pulseRef.current);
      ctx.strokeStyle = `rgba(56,189,248,${0.5 + p * 0.4})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, GROUND_Y - PLAYER_H / 2, PLAYER_W / 2 + 8 + p * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    // screen shake
    if (shakeRef.current > 0.4) {
      const m = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // Sky — clean warm gradient (brand-tinted)
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#FFFDF9');
    sky.addColorStop(0.55, '#FFEFD9');
    sky.addColorStop(1, '#FFE0B8');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, GROUND_Y + 20);

    // Sun glow top-right
    const sun = ctx.createRadialGradient(W - 60, 60, 4, W - 60, 60, 120);
    sun.addColorStop(0, 'rgba(255,196,120,0.55)');
    sun.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(-20, -20, W + 40, GROUND_Y + 20);

    // soft clouds (parallax)
    for (const cl of clouds.current) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, cl.s * 0.5, 0, Math.PI * 2);
      ctx.arc(cl.x + cl.s * 0.45, cl.y + 3, cl.s * 0.38, 0, Math.PI * 2);
      ctx.arc(cl.x - cl.s * 0.45, cl.y + 3, cl.s * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Collectibles (behind obstacles)
    for (const c of collectibles.current) drawCollectible(ctx, c);

    // Obstacles
    for (const o of obstacles.current) drawObstacle(ctx, o);

    // Player
    if (statusRef.current !== 'over') drawPlayer(ctx);

    // Ground — rounded band with brand accent line + moving dashes
    ctx.fillStyle = '#3F4756';
    ctx.fillRect(-20, GROUND_Y, W + 40, H - GROUND_Y + 20);
    ctx.fillStyle = BRAND;
    ctx.fillRect(-20, GROUND_Y, W + 40, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const off = (scoreRef.current * 6) % 30;
    for (let x = -off; x < W + 20; x += 30) {
      ctx.fillRect(x, GROUND_Y + 14, 16, 3);
    }

    // Particles
    for (const p of particles.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Score popups
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of popups.current) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, t);
      ctx.font = `bold ${p.size}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    // slow-mo blue vignette
    if (slowRef.current > 0) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.7);
      vg.addColorStop(0, 'rgba(56,189,248,0)');
      vg.addColorStop(1, 'rgba(56,189,248,0.28)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();

    // hit flash (over everything, no shake)
    if (flashRef.current.a > 0.01) {
      ctx.fillStyle = `rgba(${flashRef.current.color},${flashRef.current.a})`;
      ctx.fillRect(0, 0, W, H);
    }
  }, [drawPlayer]);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    const cx = playerX.current + PLAYER_W / 2;
    shakeRef.current = 14;
    flashRef.current = { a: 0.7, color: '239,68,68' };
    puff(cx, PLAYER_Y + 20, ['#F7941D', '#EA7B0C', '#FDBA6B'], 28, 5);
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
    loadBoard();
  }, [loadBoard, board]);

  const frame = useCallback(
    (now: number) => {
      const rawDt = Math.min(50, now - (lastTime.current || now)) / 16.67;
      lastTime.current = now;
      const playing = statusRef.current === 'playing';
      const s = scoreRef.current;

      // decay juice timers (real-time, unaffected by slow-mo)
      shakeRef.current *= Math.pow(0.86, rawDt);
      flashRef.current.a *= Math.pow(0.8, rawDt);
      pulseRef.current += 0.2 * rawDt;
      for (const cl of clouds.current) {
        cl.x -= cl.speed * rawDt;
        if (cl.x < -cl.s) { cl.x = W + cl.s; cl.y = 30 + Math.random() * (GROUND_Y - 120); }
      }

      if (playing) {
        if (shieldRef.current > 0) shieldRef.current -= rawDt;
        if (slowRef.current > 0) slowRef.current -= rawDt;
        if (nearRef.current > 0) nearRef.current -= rawDt;
        const slowActive = slowRef.current > 0;
        const nearActive = nearRef.current > 0;
        const timeScale = slowActive ? 0.4 : nearActive ? 0.5 : 1;
        const dt = rawDt * timeScale;

        // reflect power-up state to HUD only on change
        if ((shieldRef.current > 0) !== powers.shield || slowActive !== powers.slow) {
          setPowers({ shield: shieldRef.current > 0, slow: slowActive });
        }

        // squash decays toward 0
        const dx = playerX.current - prevX.current;
        if (Math.abs(dx) > 0.6) {
          moveDirRef.current = dx > 0 ? 1 : -1;
          squashRef.current = Math.max(-1, Math.min(1, dx * 0.12));
        } else {
          squashRef.current *= Math.pow(0.8, rawDt);
        }
        prevX.current = playerX.current;

        const speed = 2.8 + 0.72 * Math.sqrt(s);

        // spawn obstacles
        spawnTimer.current -= dt;
        if (spawnTimer.current <= 0) {
          const size = 22 + Math.random() * 26;
          obstacles.current.push({
            x: Math.random() * (W - size),
            y: -size, s: size, passed: false, near: false, blocked: false,
            type: OB_TYPES[(Math.random() * OB_TYPES.length) | 0],
            color: OB_COLORS[(Math.random() * OB_COLORS.length) | 0],
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.12,
          });
          spawnTimer.current = Math.max(16, 46 - 2.3 * Math.sqrt(s));
        }

        // spawn collectibles occasionally
        collectTimer.current -= dt;
        if (collectTimer.current <= 0) {
          const roll = Math.random();
          const type: CoType = roll < 0.6 ? 'coin' : roll < 0.82 ? 'shield' : 'slow';
          const size = type === 'coin' ? 20 : 24;
          collectibles.current.push({ x: Math.random() * (W - size), y: -size, s: size, type, bob: Math.random() * 6 });
          collectTimer.current = 150 + Math.random() * 170;
        }

        const px = playerX.current, pr = px + PLAYER_W;
        const shielded = shieldRef.current > 0;

        // obstacles update
        for (const o of obstacles.current) {
          o.y += speed * dt;
          o.rot += o.rotSpeed * dt;
          if (!o.passed && o.y + o.s >= GROUND_Y) {
            o.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            puff(o.x + o.s / 2, GROUND_Y, ['#94a3b8', '#cbd5e1'], 5, 2);
          }
          const hit = px < o.x + o.s && pr > o.x && PLAYER_Y < o.y + o.s && PLAYER_Y + PLAYER_H > o.y;
          if (hit) {
            if (shielded) {
              o.blocked = true;
              shakeRef.current = 8;
              flashRef.current = { a: 0.35, color: '56,189,248' };
              puff(o.x + o.s / 2, o.y + o.s / 2, ['#38BDF8', '#7DD3FC'], 12, 4);
            } else {
              endGame();
              break;
            }
          } else if (!o.near && !shielded) {
            // near-miss: vertically alongside the player, horizontally close but not touching
            const vClose = o.y + o.s > PLAYER_Y && o.y < PLAYER_Y + PLAYER_H;
            if (vClose) {
              const gap = Math.max(o.x - pr, px - (o.x + o.s));
              if (gap > 0 && gap < 13) {
                o.near = true;
                nearRef.current = 16;
                flashRef.current = { a: 0.18, color: '247,148,29' };
                popup(o.x + o.s / 2, PLAYER_Y - 8, 'O włos!', '#EA7B0C', 13);
              }
            }
          }
        }
        obstacles.current = obstacles.current.filter((o) => !o.blocked && o.y < H + 20);

        // collectibles update
        for (const c of collectibles.current) {
          c.y += speed * dt * 0.92;
          c.bob += 0.15 * rawDt;
          const hit = px < c.x + c.s && pr > c.x && PLAYER_Y < c.y + c.s && PLAYER_Y + PLAYER_H > c.y;
          if (hit) {
            (c as Collectible & { got?: boolean }).got = true;
            const mx = c.x + c.s / 2;
            if (c.type === 'coin') {
              scoreRef.current += 5;
              setScore(scoreRef.current);
              puff(mx, c.y, ['#FACC15', '#FDE047'], 14, 4);
              popup(mx, c.y, '+5', '#CA8A04', 16);
            } else if (c.type === 'shield') {
              shieldRef.current = 320;
              puff(mx, c.y, ['#38BDF8', '#7DD3FC'], 14, 4);
              popup(mx, c.y, 'Tarcza!', '#0EA5E9', 15);
            } else {
              slowRef.current = 260;
              puff(mx, c.y, ['#C084FC', '#E9D5FF'], 14, 4);
              popup(mx, c.y, 'Zwolnienie!', '#9333EA', 14);
            }
          }
        }
        collectibles.current = collectibles.current.filter(
          (c) => !(c as Collectible & { got?: boolean }).got && c.y < H + 20
        );
      }

      // particles + popups (real-time)
      for (const p of particles.current) {
        p.x += p.vx * rawDt;
        p.y += p.vy * rawDt;
        p.vy += 0.05 * rawDt;
        p.life += rawDt;
      }
      particles.current = particles.current.filter((p) => p.life < p.max);
      for (const p of popups.current) {
        p.y += p.vy * rawDt;
        p.life += rawDt;
      }
      popups.current = popups.current.filter((p) => p.life < p.max);

      draw();
      rafRef.current = requestAnimationFrame(frame);
    },
    [draw, endGame, powers.shield, powers.slow]
  );

  const startGame = useCallback(() => {
    obstacles.current = [];
    collectibles.current = [];
    particles.current = [];
    popups.current = [];
    scoreRef.current = 0;
    setScore(0);
    spawnTimer.current = 0;
    collectTimer.current = 150;
    shieldRef.current = 0;
    slowRef.current = 0;
    nearRef.current = 0;
    shakeRef.current = 0;
    flashRef.current = { a: 0, color: '255,255,255' };
    setPowers({ shield: false, slow: false });
    playerX.current = W / 2 - PLAYER_W / 2;
    prevX.current = playerX.current;
    setLastResult(null);
    setShowConfetti(false);
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

  const podium = board && board.top.length >= 3 ? board.top.slice(0, 3) : null;
  const rest = board ? board.top.slice(podium ? 3 : 0) : [];
  const isMe = (userId: string, sc: number) =>
    !!board?.me && board.me.rank != null && sc === board.me.score &&
    board.top.find((e) => e.userId === userId)?.rank === board.me.rank;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — brand gradient */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#F7941D] to-[#FBB040] px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white drop-shadow-sm">
            <Gamepad2 className="h-5 w-5" />
            Unik
            <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold tracking-wide">ARCADE</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center">
            <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10" style={{ width: W, maxWidth: '100%' }}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onMouseMove={(e) => movePlayerToClientX(e.clientX)}
                onTouchMove={(e) => e.touches[0] && movePlayerToClientX(e.touches[0].clientX)}
                className="block w-full"
                style={{ touchAction: 'none' }}
              />

              {/* HUD */}
              {status === 'playing' && (
                <>
                  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-xl bg-white/85 px-3 py-1 font-bold tabular-nums text-slate-800 shadow backdrop-blur">
                    <span className="text-[#EA7B0C]">{score}</span>
                  </div>
                  {board?.me?.score ? (
                    <div className="pointer-events-none absolute right-3 top-3 rounded-xl bg-white/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-500 shadow backdrop-blur">
                      best {board.me.score}
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
                    {powers.shield && (
                      <span className="flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                        <Shield className="h-3 w-3" /> Tarcza
                      </span>
                    )}
                    {powers.slow && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-500/90 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                        <Timer className="h-3 w-3" /> Slow-mo
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Start / Over overlay */}
              {status !== 'playing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-900/45 to-slate-900/75 px-6 text-center text-white backdrop-blur-[2px]">
                  {status === 'over' && lastResult && (
                    <div className="flex flex-col items-center">
                      {lastResult.record ? (
                        <p className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-yellow-300">
                          <Crown className="h-4 w-4" /> Nowy rekord!
                        </p>
                      ) : (
                        <p className="text-sm font-semibold uppercase tracking-widest text-orange-200">Koniec gry</p>
                      )}
                      <p className="text-6xl font-black tabular-nums drop-shadow-[0_2px_12px_rgba(247,148,29,0.7)]">{lastResult.score}</p>
                      <p className="mt-1 text-xs text-white/70">Twój rekord: {lastResult.best}</p>
                    </div>
                  )}
                  {status === 'idle' && (
                    <div className="max-w-[260px] space-y-2">
                      <p className="text-sm font-medium">Unikaj spadających przeszkód!</p>
                      <div className="flex flex-wrap justify-center gap-2 text-[11px] text-white/90">
                        <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1"><Coins className="h-3 w-3 text-yellow-300" /> monety +5</span>
                        <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1"><Shield className="h-3 w-3 text-sky-300" /> tarcza</span>
                        <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1"><Timer className="h-3 w-3 text-purple-300" /> slow-mo</span>
                      </div>
                      <p className="text-[11px] text-white/60">Steruj myszką lub strzałkami</p>
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
          </div>

          {/* Leaderboard */}
          <div className="min-w-0">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Trophy className="h-4 w-4 text-[#F7941D]" /> Ranking
            </h3>

            {!board || board.top.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900/30">
                Brak wyników — bądź pierwszy! 🏆
              </p>
            ) : (
              <>
                {podium && (
                  <div className="mb-4 grid grid-cols-3 items-end gap-2">
                    {[podium[1], podium[0], podium[2]].map((e, i) => {
                      const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                      const h = place === 1 ? 'h-20' : place === 2 ? 'h-14' : 'h-11';
                      const ring = place === 1 ? 'ring-yellow-400' : place === 2 ? 'ring-slate-300' : 'ring-amber-600';
                      const grad = place === 1 ? 'from-yellow-300 to-yellow-500' : place === 2 ? 'from-slate-200 to-slate-400' : 'from-amber-400 to-amber-600';
                      const mine = isMe(e.userId, e.score);
                      return (
                        <div key={e.userId} className="flex flex-col items-center">
                          {place === 1 && <Crown className="mb-0.5 h-4 w-4 text-yellow-400" />}
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${grad} text-sm font-bold text-white shadow ring-2 ${ring}`}>
                            {initials(e.name)}
                          </div>
                          <p className={`mt-1 max-w-full truncate text-[11px] font-medium ${mine ? 'text-[#EA7B0C]' : 'text-gray-600 dark:text-gray-300'}`} title={e.name}>
                            {firstName(e.name)}
                          </p>
                          <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">{e.score}</p>
                          <div className={`mt-1 w-full rounded-t-lg bg-gradient-to-b ${grad} ${h} flex items-start justify-center pt-1 text-xs font-black text-white/90`}>
                            {place}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rest.length > 0 && (
                  <ol className="space-y-1">
                    {rest.map((e) => (
                      <li
                        key={e.userId}
                        className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm ${
                          isMe(e.userId, e.score) ? 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15' : ''
                        }`}
                      >
                        <span className="w-6 text-center font-bold text-gray-400 tabular-nums">{e.rank}</span>
                        <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">{e.name}</span>
                        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{e.score}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}

            {board?.me && (
              <p className="mt-3 rounded-xl bg-gradient-to-r from-[#F7941D]/10 to-transparent px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                Twój rekord: <span className="font-bold text-[#EA7B0C]">{board.me.score}</span>
                {board.me.rank ? ` · miejsce ${board.me.rank}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- helpers ----
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function ConfettiBurst() {
  const pieces = Array.from({ length: 64 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <style>{`
        @keyframes game-confetti-fall {
          0% { opacity: 0; transform: translate3d(0, -12%, 0) rotate(0deg) scale(0.8); }
          12% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(var(--cx), 120%, 0) rotate(var(--cr)) scale(1); }
        }
      `}</style>
      {pieces.map((i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = (i * 37) % 100;
        const delay = (i % 12) * 45;
        const duration = 1600 + (i % 7) * 120;
        const size = 5 + (i % 3) * 2;
        const drift = ((i % 11) - 5) * 10;
        const rotate = 220 + (i % 8) * 90;
        return (
          <span
            key={i}
            className="absolute top-0 rounded-[2px]"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${Math.max(5, size * 1.8)}px`,
              backgroundColor: color,
              animation: `game-confetti-fall ${duration}ms cubic-bezier(.18,.72,.22,1) ${delay}ms forwards`,
              ['--cx' as string]: `${drift}%`,
              ['--cr' as string]: `${rotate}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
