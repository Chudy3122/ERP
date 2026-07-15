import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Heart, Crown } from 'lucide-react';
import * as gameApi from '../../../api/game.api';
import GameLeaderboard, { useLeaderboard } from '../GameLeaderboard';
import ConfettiBurst from '../ConfettiBurst';

const GAME = 'breaker';
const W = 380;
const H = 480;

const PADDLE_Y = H - 30;
const PADDLE_H = 12;
const PADDLE_BASE_W = 76;
const BALL_R = 6;

const COLS = 9;
const PAD_X = 10;
const GAP = 4;
const BRICK_W = (W - PAD_X * 2 - GAP * (COLS - 1)) / COLS;
const BRICK_H = 16;
const TOP_Y = 44;

const BRAND = '#F7941D';
const ROW_COLORS = ['#F43F5E', '#F97316', '#FACC15', '#4ADE80', '#22D3EE', '#818CF8', '#C084FC'];

type Status = 'idle' | 'playing' | 'over';
type PowType = 'expand' | 'shrink' | 'multi' | 'slow' | 'fast' | 'laser' | 'life' | 'sticky';

type Ball = { x: number; y: number; vx: number; vy: number; stuck: boolean; offset: number };
type Brick = { x: number; y: number; hp: number; max: number; color: string };
type Power = { x: number; y: number; type: PowType };
type Bullet = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
type Popup = { x: number; y: number; vy: number; life: number; max: number; text: string; color: string; size: number };

const POWERS: Record<PowType, { letter: string; color: string; good: boolean; label: string }> = {
  expand: { letter: 'P', color: '#22C55E', good: true, label: 'Szersza płytka' },
  shrink: { letter: 'Z', color: '#EF4444', good: false, label: 'Węższa płytka' },
  multi: { letter: 'M', color: '#3B82F6', good: true, label: 'Multi-piłka' },
  slow: { letter: 'S', color: '#22D3EE', good: true, label: 'Wolniej' },
  fast: { letter: 'F', color: '#EF4444', good: false, label: 'Szybciej' },
  laser: { letter: 'L', color: BRAND, good: true, label: 'Laser' },
  life: { letter: '+', color: '#EC4899', good: true, label: 'Dodatkowe życie' },
  sticky: { letter: 'K', color: '#A855F7', good: true, label: 'Klej' },
};
const POW_KEYS = Object.keys(POWERS) as PowType[];
// good power-ups drop more often than the two nasty ones
const POW_WEIGHTS: Record<PowType, number> = { expand: 18, multi: 16, slow: 12, laser: 12, sticky: 10, life: 6, shrink: 14, fast: 12 };

export default function BreakerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const paddleX = useRef(W / 2);
  const activeRef = useRef<PowType[]>([]);
  const balls = useRef<Ball[]>([]);
  const bricks = useRef<Brick[]>([]);
  const powers = useRef<Power[]>([]);
  const bullets = useRef<Bullet[]>([]);
  const particles = useRef<Particle[]>([]);
  const popups = useRef<Popup[]>([]);

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const statusRef = useRef<Status>('idle');
  const lastTime = useRef(0);

  // power-up timers (frames)
  const expandRef = useRef(0);
  const shrinkRef = useRef(0);
  const slowRef = useRef(0);
  const fastRef = useRef(0);
  const laserRef = useRef(0);
  const stickyRef = useRef(0);
  const shootCd = useRef(0);

  const shakeRef = useRef(0);
  const flashRef = useRef<{ a: number; color: string }>({ a: 0, color: '255,255,255' });

  const [status, setStatus] = useState<Status>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [active, setActive] = useState<PowType[]>([]);
  const [lastResult, setLastResult] = useState<{ score: number; best: number; record: boolean } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { board, reload } = useLeaderboard(GAME);

  // ---------- helpers ----------
  const puff = (x: number, y: number, color: string, count: number, power = 4) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.5 + Math.random() * power;
      particles.current.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 20 + Math.random() * 22,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  };

  const popup = (x: number, y: number, text: string, color: string, size = 14) => {
    popups.current.push({ x, y, vy: -0.8, life: 0, max: 46, text, color, size });
  };

  const ballSpeed = () => {
    const base = 4 + (levelRef.current - 1) * 0.3;
    if (slowRef.current > 0) return base * 0.62;
    if (fastRef.current > 0) return base * 1.42;
    return base;
  };

  const currentPaddleW = () => {
    let w = PADDLE_BASE_W;
    if (expandRef.current > 0) w *= 1.6;
    if (shrinkRef.current > 0) w *= 0.62;
    return w;
  };

  const buildLevel = (lvl: number) => {
    const rows = Math.min(3 + lvl, 7);
    const out: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        // higher levels sprinkle in tougher 2-hit bricks
        const tough = lvl >= 2 && Math.random() < Math.min(0.12 * lvl, 0.42);
        const hp = tough ? 2 : 1;
        out.push({
          x: PAD_X + c * (BRICK_W + GAP),
          y: TOP_Y + r * (BRICK_H + GAP),
          hp,
          max: hp,
          color: ROW_COLORS[r % ROW_COLORS.length],
        });
      }
    }
    return out;
  };

  const resetBall = () => {
    balls.current = [{ x: paddleX.current, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true, offset: 0 }];
  };

  const clearPowers = () => {
    expandRef.current = 0;
    shrinkRef.current = 0;
    slowRef.current = 0;
    fastRef.current = 0;
    laserRef.current = 0;
    stickyRef.current = 0;
    powers.current = [];
    bullets.current = [];
  };

  const endGame = useCallback(async () => {
    statusRef.current = 'over';
    setStatus('over');
    shakeRef.current = 14;
    flashRef.current = { a: 0.65, color: '239,68,68' };
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

  const launch = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    let launched = false;
    for (const b of balls.current) {
      if (b.stuck) {
        const sp = ballSpeed();
        const ang = (Math.random() - 0.5) * 0.6;
        b.vx = Math.sin(ang) * sp;
        b.vy = -Math.cos(ang) * sp;
        b.stuck = false;
        launched = true;
      }
    }
    // laser fires when there is nothing to launch
    if (!launched && laserRef.current > 0 && shootCd.current <= 0) {
      const half = currentPaddleW() / 2;
      bullets.current.push({ x: paddleX.current - half + 5, y: PADDLE_Y });
      bullets.current.push({ x: paddleX.current + half - 5, y: PADDLE_Y });
      shootCd.current = 14;
    }
  }, []);

  const dropPower = (x: number, y: number) => {
    const total = POW_KEYS.reduce((s, k) => s + POW_WEIGHTS[k], 0);
    let roll = Math.random() * total;
    let pick: PowType = 'expand';
    for (const k of POW_KEYS) {
      roll -= POW_WEIGHTS[k];
      if (roll <= 0) { pick = k; break; }
    }
    powers.current.push({ x, y, type: pick });
  };

  const hitBrick = (br: Brick) => {
    br.hp -= 1;
    puff(br.x + BRICK_W / 2, br.y + BRICK_H / 2, br.color, br.hp <= 0 ? 10 : 4, 3);
    if (br.hp <= 0) {
      const pts = 10 * levelRef.current;
      scoreRef.current += pts;
      setScore(scoreRef.current);
      shakeRef.current = Math.max(shakeRef.current, 2.5);
      if (Math.random() < 0.22) dropPower(br.x + BRICK_W / 2, br.y + BRICK_H / 2);
    }
  };

  const applyPower = (type: PowType) => {
    const cfg = POWERS[type];
    scoreRef.current += 25;
    setScore(scoreRef.current);
    popup(paddleX.current, PADDLE_Y - 22, cfg.label, cfg.color, 13);
    puff(paddleX.current, PADDLE_Y, cfg.color, 12, 3);
    flashRef.current = { a: 0.18, color: cfg.good ? '74,222,128' : '239,68,68' };
    if (type === 'expand') { expandRef.current = 500; shrinkRef.current = 0; }
    else if (type === 'shrink') { shrinkRef.current = 420; expandRef.current = 0; }
    else if (type === 'slow') { slowRef.current = 420; fastRef.current = 0; }
    else if (type === 'fast') { fastRef.current = 360; slowRef.current = 0; }
    else if (type === 'laser') laserRef.current = 520;
    else if (type === 'sticky') stickyRef.current = 480;
    else if (type === 'life') {
      livesRef.current += 1;
      setLives(livesRef.current);
    } else if (type === 'multi') {
      const extra: Ball[] = [];
      for (const b of balls.current) {
        if (b.stuck) continue;
        const sp = Math.hypot(b.vx, b.vy) || ballSpeed();
        for (const rot of [-0.5, 0.5]) {
          const ang = Math.atan2(b.vy, b.vx) + rot;
          extra.push({ x: b.x, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, stuck: false, offset: 0 });
        }
      }
      balls.current = [...balls.current, ...extra].slice(0, 9);
    }
  };

  // ---------- drawing ----------
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (shakeRef.current > 0.4) {
      const m = shakeRef.current;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }

    // background — deep slate with a soft brand glow at the bottom
    ctx.fillStyle = '#232B3A';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    const glow = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * 0.72);
    glow.addColorStop(0, 'rgba(247,148,29,0.16)');
    glow.addColorStop(1, 'rgba(247,148,29,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // bricks
    for (const b of bricks.current) {
      if (b.hp <= 0) continue;
      const cracked = b.max > 1 && b.hp === 1;
      ctx.fillStyle = cracked ? shade(b.color, -30) : b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(b.x + 2, b.y + 2, BRICK_W - 4, BRICK_H * 0.3, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (cracked) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x + BRICK_W * 0.3, b.y + 2);
        ctx.lineTo(b.x + BRICK_W * 0.45, b.y + BRICK_H - 2);
        ctx.stroke();
      }
    }

    // falling power-ups
    for (const p of powers.current) {
      const cfg = POWERS[p.type];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowBlur = 12;
      ctx.shadowColor = cfg.color;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.roundRect(-11, -8, 22, 16, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.letter, 0, 1);
      ctx.restore();
    }

    // bullets
    ctx.fillStyle = BRAND;
    for (const b of bullets.current) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = BRAND;
      ctx.fillRect(b.x - 1.5, b.y - 9, 3, 9);
    }
    ctx.shadowBlur = 0;

    // paddle
    const pw = currentPaddleW();
    const px = paddleX.current - pw / 2;
    const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
    pg.addColorStop(0, '#FDBA6B');
    pg.addColorStop(1, '#EA7B0C');
    ctx.fillStyle = pg;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(247,148,29,0.5)';
    ctx.beginPath();
    ctx.roundRect(px, PADDLE_Y, pw, PADDLE_H, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (stickyRef.current > 0) {
      ctx.strokeStyle = 'rgba(168,85,247,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, PADDLE_Y, pw, PADDLE_H, 6);
      ctx.stroke();
    }
    if (laserRef.current > 0) {
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(px + 3, PADDLE_Y - 4, 4, 4);
      ctx.fillRect(px + pw - 7, PADDLE_Y - 4, 4, 4);
    }

    // balls
    for (const b of balls.current) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      const bg = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(1, '#CBD5E1');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
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
      const dt = Math.min(50, now - (lastTime.current || now)) / 16.67;
      lastTime.current = now;

      shakeRef.current *= Math.pow(0.86, dt);
      flashRef.current.a *= Math.pow(0.82, dt);

      if (statusRef.current === 'playing') {
        // timers
        for (const r of [expandRef, shrinkRef, slowRef, fastRef, laserRef, stickyRef]) {
          if (r.current > 0) r.current -= dt;
        }
        if (shootCd.current > 0) shootCd.current -= dt;

        const nextActive: PowType[] = [];
        if (expandRef.current > 0) nextActive.push('expand');
        if (shrinkRef.current > 0) nextActive.push('shrink');
        if (balls.current.length > 1) nextActive.push('multi');
        if (slowRef.current > 0) nextActive.push('slow');
        if (fastRef.current > 0) nextActive.push('fast');
        if (laserRef.current > 0) nextActive.push('laser');
        if (stickyRef.current > 0) nextActive.push('sticky');
        if (nextActive.join(',') !== activeRef.current.join(',')) {
          activeRef.current = nextActive;
          setActive(nextActive);
        }

        const pw = currentPaddleW();
        const half = pw / 2;
        paddleX.current = Math.max(half, Math.min(W - half, paddleX.current));
        const sp = ballSpeed();

        // balls
        for (const b of balls.current) {
          if (b.stuck) {
            b.x = paddleX.current + b.offset;
            b.y = PADDLE_Y - BALL_R - 1;
            continue;
          }
          // keep the speed in step with slow/fast power-ups
          const mag = Math.hypot(b.vx, b.vy) || 1;
          b.vx = (b.vx / mag) * sp;
          b.vy = (b.vy / mag) * sp;

          // A near-horizontal ball never reaches the paddle and can rally between
          // the walls forever — keep a minimum vertical component.
          const minVy = sp * 0.28;
          if (Math.abs(b.vy) < minVy) {
            b.vy = (b.vy >= 0 ? 1 : -1) * minVy;
            b.vx = (b.vx >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, sp * sp - b.vy * b.vy));
          }

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
          if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
          if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }

          // paddle
          if (
            b.vy > 0 &&
            b.y + BALL_R >= PADDLE_Y &&
            b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
            b.x >= paddleX.current - half - BALL_R &&
            b.x <= paddleX.current + half + BALL_R
          ) {
            if (stickyRef.current > 0) {
              b.stuck = true;
              b.offset = Math.max(-half + 6, Math.min(half - 6, b.x - paddleX.current));
            } else {
              const hit = Math.max(-1, Math.min(1, (b.x - paddleX.current) / half));
              const ang = hit * 1.05; // up to ~60°
              b.vx = Math.sin(ang) * sp;
              b.vy = -Math.abs(Math.cos(ang) * sp);
              b.y = PADDLE_Y - BALL_R - 1;
              puff(b.x, PADDLE_Y, '#FDBA6B', 4, 2);
            }
          }

          // bricks
          for (const br of bricks.current) {
            if (br.hp <= 0) continue;
            if (b.x + BALL_R < br.x || b.x - BALL_R > br.x + BRICK_W) continue;
            if (b.y + BALL_R < br.y || b.y - BALL_R > br.y + BRICK_H) continue;
            const ox = Math.min(b.x + BALL_R - br.x, br.x + BRICK_W - (b.x - BALL_R));
            const oy = Math.min(b.y + BALL_R - br.y, br.y + BRICK_H - (b.y - BALL_R));
            if (ox < oy) b.vx *= -1;
            else b.vy *= -1;
            hitBrick(br);
            break;
          }
        }

        // bullets
        for (const bu of bullets.current) {
          bu.y -= 7 * dt;
          for (const br of bricks.current) {
            if (br.hp <= 0) continue;
            if (bu.x >= br.x && bu.x <= br.x + BRICK_W && bu.y <= br.y + BRICK_H && bu.y >= br.y) {
              hitBrick(br);
              bu.y = -50;
              break;
            }
          }
        }
        bullets.current = bullets.current.filter((b) => b.y > -20);

        // lost balls
        const before = balls.current.length;
        balls.current = balls.current.filter((b) => b.y < H + 20);
        if (balls.current.length === 0 && before > 0) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          shakeRef.current = 12;
          flashRef.current = { a: 0.4, color: '239,68,68' };
          if (livesRef.current <= 0) {
            endGame();
          } else {
            clearPowers();
            resetBall();
          }
        }

        // falling power-ups
        for (const p of powers.current) {
          p.y += 2.1 * dt;
          if (
            p.y + 8 >= PADDLE_Y &&
            p.y - 8 <= PADDLE_Y + PADDLE_H &&
            p.x >= paddleX.current - half - 11 &&
            p.x <= paddleX.current + half + 11
          ) {
            applyPower(p.type);
            p.y = H + 100;
          }
        }
        powers.current = powers.current.filter((p) => p.y < H + 20);

        // level cleared
        if (bricks.current.length > 0 && bricks.current.every((b) => b.hp <= 0)) {
          const bonus = 100 * levelRef.current;
          scoreRef.current += bonus;
          setScore(scoreRef.current);
          popup(W / 2, H / 2, `Poziom ${levelRef.current} zaliczony! +${bonus}`, '#4ADE80', 15);
          levelRef.current += 1;
          setLevel(levelRef.current);
          bricks.current = buildLevel(levelRef.current);
          clearPowers();
          resetBall();
          flashRef.current = { a: 0.3, color: '74,222,128' };
        }
      }

      for (const p of particles.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.08 * dt;
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
    [draw, endGame]
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
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    setScore(0);
    setLives(3);
    setLevel(1);
    setActive([]);
    activeRef.current = [];
    particles.current = [];
    popups.current = [];
    clearPowers();
    paddleX.current = W / 2;
    bricks.current = buildLevel(1);
    resetBall();
    shakeRef.current = 0;
    flashRef.current = { a: 0, color: '255,255,255' };
    setLastResult(null);
    setShowConfetti(false);
    statusRef.current = 'playing';
    setStatus('playing');
  }, []);

  const movePaddleToClientX = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = W / rect.width;
    paddleX.current = (clientX - rect.left) * scale;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (statusRef.current !== 'playing') return;
      if (['ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft') paddleX.current -= 26;
      else if (e.key === 'ArrowRight') paddleX.current += 26;
      else if (e.key === ' ' || e.key === 'Spacebar') launch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [launch]);

  return (
    <div className="grid gap-5 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2">
        <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10" style={{ width: W, maxWidth: '100%' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={(e) => movePaddleToClientX(e.clientX)}
            onTouchMove={(e) => e.touches[0] && movePaddleToClientX(e.touches[0].clientX)}
            onClick={launch}
            className="block w-full cursor-pointer"
            style={{ touchAction: 'none' }}
          />

          {status === 'playing' && (
            <>
              <div className="pointer-events-none absolute left-3 top-2.5 flex items-center gap-2">
                <span className="rounded-lg bg-white/85 px-2.5 py-0.5 text-sm font-bold tabular-nums text-[#EA7B0C] shadow backdrop-blur">
                  {score}
                </span>
                <span className="rounded-lg bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow backdrop-blur">
                  lvl {level}
                </span>
              </div>
              <div className="pointer-events-none absolute right-3 top-2.5 flex gap-0.5">
                {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
                  <Heart key={i} className="h-3.5 w-3.5 fill-rose-500 text-rose-500 drop-shadow" />
                ))}
                {lives > 5 && <span className="ml-0.5 text-[11px] font-bold text-white">+{lives - 5}</span>}
              </div>
              {active.length > 0 && (
                <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-1">
                  {active.map((t) => (
                    <span
                      key={t}
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow"
                      style={{ backgroundColor: POWERS[t].color }}
                    >
                      {POWERS[t].label}
                    </span>
                  ))}
                </div>
              )}
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
                <div className="max-w-[280px] space-y-2">
                  <p className="text-sm font-medium">Zbijaj cegły, łap power-upy!</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    {POW_KEYS.map((k) => (
                      <span
                        key={k}
                        className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/85"
                        title={POWERS[k].label}
                      >
                        <span
                          className="flex h-3.5 w-3.5 items-center justify-center rounded text-[8px] font-black text-white"
                          style={{ backgroundColor: POWERS[k].color }}
                        >
                          {POWERS[k].letter}
                        </span>
                        {POWERS[k].label}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/60">Myszka lub ◀ ▶ · spacja / klik — wystrzel piłkę</p>
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
        <p className="text-[11px] text-gray-400">Spacja lub klik — wystrzel piłkę / laser</p>
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
