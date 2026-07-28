import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import socketService from '../services/socket.service';
import { useChatContext } from '../contexts/ChatContext';

export type PrankType =
  | 'confetti'
  | 'rickroll'
  | 'fake_notification'
  | 'shake'
  | 'meme'
  | 'nyancat'
  | 'troll'
  | 'dramatic'
  | 'surprise';

// Fullscreen video pranks: play for a few seconds, then vanish on their own.
// Rendered inside a neutral "media player" window with the YouTube chrome
// cropped/hidden, so it doesn't read as an embedded YouTube clip.
const VIDEO_PRANKS: Record<string, { id: string; start?: number }> = {
  nyancat: { id: '2yJgwwDcgV8' },
  troll: { id: '2Z4m4lnjxkY', start: 8 },
  dramatic: { id: 'y8Kyi0WNg40' },
  surprise: { id: 'JX8JnmKfhiw' },
};

interface PrankPayload {
  type: PrankType;
  from: string;
  at: string;
}

interface ActivePrank extends PrankPayload {
  id: number;
}

const MEMES: string[] = [
  '🐸 Nikt: … Ty o 15:00: „jeszcze tylko jeden mail”',
  '💼 Kiedy szef pyta czy skończyłeś, a Ty dopiero zaczynasz',
  '☕ Kawa to nie nałóg, to styl pracy',
  '🙃 „Wyślę to za 5 minut” — 3 godziny później…',
  '🧠 Mój mózg o 9:00 vs o 14:00',
  '🎯 Deadline: był wczoraj. Ja: spokojnie, mam czas',
];

export default function PrankOverlay() {
  const { isConnected } = useChatContext();
  const [prank, setPrank] = useState<ActivePrank | null>(null);
  const [canCloseRoll, setCanCloseRoll] = useState(false);
  const [videoCanClose, setVideoCanClose] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => setPrank(null), []);

  // Subscribe to live pranks. The socket is a singleton owned by ChatContext and
  // may not exist yet on first mount, so we poll for it and (re)attach on every
  // (re)connect. This is deliberately defensive — a missed attach = silent no-op.
  useEffect(() => {
    const handler = (payload: PrankPayload) => {
      console.log('🎭 prank:receive', payload);
      if (!payload?.type) return;
      idRef.current += 1;
      setPrank({ ...payload, id: idRef.current });
    };

    let attachedSocket: ReturnType<typeof socketService.getSocket> | null = null;
    const attach = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;
      socket.off('prank:receive', handler);
      socket.on('prank:receive', handler);
      // Re-attach after a reconnect (same instance, but be safe).
      socket.off('connect', attach);
      socket.on('connect', attach);
      if (attachedSocket !== socket) {
        attachedSocket = socket;
        console.log('🎭 prank listener attached to socket', socket.id);
      }
      return true;
    };

    if (!attach()) {
      const poll = window.setInterval(() => { if (attach()) window.clearInterval(poll); }, 500);
      return () => {
        window.clearInterval(poll);
        attachedSocket?.off('prank:receive', handler);
        attachedSocket?.off('connect', attach);
      };
    }
    return () => {
      attachedSocket?.off('prank:receive', handler);
      attachedSocket?.off('connect', attach);
    };
  }, [isConnected]);

  // Per-prank lifecycle: auto-dismiss timers, body shake, rickroll close gate.
  useEffect(() => {
    if (!prank) return;
    setCanCloseRoll(false);
    setVideoCanClose(false);
    const timers: number[] = [];

    if (prank.type === 'shake') {
      document.body.classList.add('prank-shake');
      timers.push(window.setTimeout(() => { document.body.classList.remove('prank-shake'); dismiss(); }, 2500));
    }
    if (prank.type === 'confetti') {
      timers.push(window.setTimeout(dismiss, 4500));
    }
    if (prank.type === 'meme') {
      timers.push(window.setTimeout(dismiss, 5000));
    }
    if (prank.type === 'fake_notification') {
      timers.push(window.setTimeout(dismiss, 7000));
    }
    if (prank.type === 'rickroll') {
      timers.push(window.setTimeout(() => setCanCloseRoll(true), 4000));
    }
    if (VIDEO_PRANKS[prank.type]) {
      // The video never auto-stops — only the close button appears, after 10s.
      timers.push(window.setTimeout(() => setVideoCanClose(true), 10000));
    }

    return () => {
      timers.forEach(clearTimeout);
      document.body.classList.remove('prank-shake');
    };
  }, [prank, dismiss]);

  // Confetti animation
  useEffect(() => {
    if (prank?.type !== 'confetti') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#F7941D', '#00AEEF', '#22c55e', '#ef4444', '#a855f7', '#eab308'];
    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      vy: 2 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [prank]);

  if (!prank) return null;

  return (
    <>
      <style>{`
        @keyframes prank-shake-kf {
          0%,100% { transform: translate(0,0) rotate(0); }
          20% { transform: translate(-8px,4px) rotate(-1deg); }
          40% { transform: translate(8px,-4px) rotate(1deg); }
          60% { transform: translate(-6px,-2px) rotate(-0.6deg); }
          80% { transform: translate(6px,2px) rotate(0.6deg); }
        }
        body.prank-shake { animation: prank-shake-kf 0.4s ease-in-out infinite; }
        @keyframes prank-pop { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes prank-bounce { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-24px) rotate(3deg); } }
      `}</style>

      {/* CONFETTI */}
      {prank.type === 'confetti' && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>
      )}

      {/* RICKROLL */}
      {prank.type === 'rickroll' && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 p-4">
          <div className="w-full max-w-2xl">
            <p className="mb-3 text-center text-2xl font-bold text-white" style={{ animation: 'prank-pop 0.5s ease-out' }}>
              🎵 Never gonna give you up! 🎵
            </p>
            <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1"
                title="rickroll"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={dismiss}
                disabled={!canCloseRoll}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {canCloseRoll ? 'Dobra, dobra… zamknij' : 'Poczekaj chwilę… 😏'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAKE NOTIFICATION — obviously a joke, clearly labelled */}
      {prank.type === 'fake_notification' && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 max-w-[90vw]" style={{ animation: 'prank-pop 0.4s ease-out' }}>
          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-2.5">
              <span className="text-lg">💾</span>
              <span className="text-sm font-semibold text-white">Aktualizacja systemu</span>
              <button onClick={dismiss} className="ml-auto text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-gray-200">Formatowanie dysku C:\ … proszę nie wyłączać komputera 😨</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div className="h-full rounded-full bg-[#F7941D]" style={{ width: '47%' }} />
              </div>
              <p className="mt-2 text-right text-xs text-gray-500">Nie zamykaj tego okna…</p>
            </div>
          </div>
        </div>
      )}

      {/* MEME */}
      {prank.type === 'meme' && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 p-6" onClick={dismiss}>
          <div className="text-8xl" style={{ animation: 'prank-bounce 1s ease-in-out infinite' }}>🐸</div>
          <p className="mt-6 max-w-lg text-center text-2xl font-bold text-white" style={{ animation: 'prank-pop 0.5s ease-out' }}>
            {MEMES[Math.floor(prank.id) % MEMES.length]}
          </p>
          <p className="mt-6 text-sm text-gray-400">(kliknij, aby zamknąć)</p>
        </div>
      )}

      {/* FULLSCREEN VIDEO — fills the whole viewport, plays without stopping.
          YouTube chrome is cropped away (cover-fit + zoom) and the player is
          click-through-disabled. The close button only appears after 10s. */}
      {VIDEO_PRANKS[prank.type] && (() => {
        const vp = VIDEO_PRANKS[prank.type];
        const src =
          `https://www.youtube-nocookie.com/embed/${vp.id}` +
          `?autoplay=1&controls=0&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1` +
          (vp.start ? `&start=${vp.start}` : '');
        return (
          <div className="fixed inset-0 z-[9999] overflow-hidden bg-black">
            {/* cover-fit player: sized to the larger of 16:9-by-width or 16:9-by-height,
                then scaled up so YouTube's title/logo/controls fall outside the screen */}
            <iframe
              src={src}
              title="Odtwarzacz multimediów"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '100vw',
                height: '56.25vw',
                minHeight: '100vh',
                minWidth: '177.78vh',
                transform: 'translate(-50%, -50%) scale(1.2)',
                pointerEvents: 'none',
                border: 0,
              }}
            />
            {videoCanClose && (
              <button
                onClick={dismiss}
                className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-2xl text-white/90 ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-black/80 hover:text-white"
                style={{ animation: 'prank-pop 0.3s ease-out' }}
                aria-label="Zamknij"
              >
                ✕
              </button>
            )}
          </div>
        );
      })()}
    </>
  );
}
