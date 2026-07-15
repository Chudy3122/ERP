const CONFETTI_COLORS = ['#F7941D', '#2563EB', '#22C55E', '#EF4444', '#A855F7', '#FACC15'];

/** Celebration confetti, scoped to its (relatively positioned) parent. */
export default function ConfettiBurst() {
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
