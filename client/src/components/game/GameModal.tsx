import { useEffect, useState, type ComponentType } from 'react';
import { X, Gamepad2, ChevronLeft, Zap, LayoutGrid, Target, Apple, Trophy, Castle, Sparkles } from 'lucide-react';
import * as gameApi from '../../api/game.api';
import DodgeGame from './games/DodgeGame';
import TetrisGame from './games/TetrisGame';
import BreakerGame from './games/BreakerGame';
import SnakeGame from './games/SnakeGame';
import TowerDefenseGame from './games/TowerDefenseGame';

type GameDef = {
  id: string;
  name: string;
  tagline: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  Component: ComponentType;
  /** Needs a roomier modal than the arcade games. */
  wide?: boolean;
  /** Swaps the modal chrome for a medieval-RPG look. */
  medieval?: boolean;
};

/** Every game keeps its own leaderboard — keyed by `id` on the backend. */
const GAMES: GameDef[] = [
  {
    id: 'dodge',
    name: 'Unik',
    tagline: 'Unikaj spadających przeszkód, zbieraj monety i power-upy.',
    icon: Zap,
    gradient: 'from-[#F7941D] to-[#FBB040]',
    Component: DodgeGame,
  },
  {
    id: 'tetris',
    name: 'Tetris',
    tagline: 'Układaj klocki, czyść linie i goń coraz wyższy poziom.',
    icon: LayoutGrid,
    gradient: 'from-[#6366F1] to-[#22D3EE]',
    Component: TetrisGame,
  },
  {
    id: 'breaker',
    name: 'Brick Breaker',
    tagline: 'Zbijaj cegły i łap power-upy: szersza płytka, multi-piłka, laser.',
    icon: Target,
    gradient: 'from-[#10B981] to-[#84CC16]',
    Component: BreakerGame,
  },
  {
    id: 'snake',
    name: 'Snake',
    tagline: 'Zbieraj jabłka, rośnij i nie wjedź w siebie. Złote dają +50.',
    icon: Apple,
    gradient: 'from-[#F43F5E] to-[#FB923C]',
    Component: SnakeGame,
  },
];

/** Not listed on the hub — you have to know where to click. */
const SECRET_GAMES: GameDef[] = [
  {
    id: 'td',
    name: 'Obrona Zamku',
    tagline: 'Tower defense: 5 rozdziałów, każdy z inną drogą. Odblokuj 6 wież i broń zamku.',
    icon: Castle,
    gradient: 'from-[#7C3AED] to-[#F7941D]',
    Component: TowerDefenseGame,
    wide: true,
    medieval: true,
  },
];

interface GameModalProps {
  onClose: () => void;
}

export default function GameModal({ onClose }: GameModalProps) {
  const [selected, setSelected] = useState<GameDef | null>(null);
  const [bests, setBests] = useState<Record<string, number | null>>({});
  const [secretOpen, setSecretOpen] = useState(false);

  const visible = secretOpen ? [...GAMES, ...SECRET_GAMES] : GAMES;

  // Personal bests for the hub cards
  useEffect(() => {
    if (selected) return;
    let alive = true;
    Promise.all(
      visible.map((g) =>
        gameApi
          .getLeaderboard(g.id)
          .then((b) => [g.id, b.me?.score ?? null] as const)
          .catch(() => [g.id, null] as const)
      )
    ).then((pairs) => {
      if (alive) setBests((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, secretOpen]);

  const Selected = selected?.Component;
  const medieval = !!selected?.medieval;

  // The backdrop deliberately has no click-to-close: the mouse leaves the canvas
  // constantly while playing, and a stray click would quit the game mid-run.
  // Closing is the X button only.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <style>{`
        .game-scroll-medieval { scrollbar-width: thin; scrollbar-color: #8B6B3E #E2CB9F; }
        .game-scroll-medieval::-webkit-scrollbar { width: 12px; }
        .game-scroll-medieval::-webkit-scrollbar-track { background: #E2CB9F; border-radius: 8px; }
        .game-scroll-medieval::-webkit-scrollbar-thumb {
          background: linear-gradient(#8B6B3E, #6B4E32);
          border: 2px solid #E2CB9F; border-radius: 8px;
        }
        .game-scroll-medieval::-webkit-scrollbar-thumb:hover { background: linear-gradient(#9C7B4A, #7A5A34); }
      `}</style>
      <div
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden shadow-2xl ${
          selected?.wide ? 'max-w-6xl' : 'max-w-3xl'
        } ${
          medieval
            ? 'rounded-lg border-4 border-[#5A4028] bg-[#EFDDB8] ring-2 ring-[#C9A227]/50'
            : 'rounded-2xl bg-white ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10'
        }`}
      >
        {/* Header */}
        <div
          className={`flex shrink-0 items-center justify-between px-5 py-3.5 ${
            medieval
              ? 'border-b-4 border-[#C9A227]/60 bg-gradient-to-b from-[#6B4E32] to-[#4A3728]'
              : `bg-gradient-to-r ${selected ? selected.gradient : 'from-[#F7941D] to-[#FBB040]'}`
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`-ml-1.5 rounded-lg p-1.5 transition-colors ${
                  medieval ? 'text-[#D8C49A] hover:bg-[#C9A227]/25 hover:text-[#F3E3C3]' : 'text-white/80 hover:bg-white/20 hover:text-white'
                }`}
                aria-label="Wróć do listy gier"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2
              className={`flex min-w-0 items-center gap-2 text-lg font-bold drop-shadow-sm ${
                medieval ? 'font-serif text-[#F3E3C3]' : 'text-white'
              }`}
            >
              {medieval ? <Castle className="h-5 w-5 shrink-0 text-[#C9A227]" /> : <Gamepad2 className="h-5 w-5 shrink-0" />}
              <span className="truncate">{selected ? selected.name : 'Gry'}</span>
              <span
                className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                  medieval ? 'border border-[#C9A227]/60 bg-[#C9A227]/20 text-[#E8C766]' : 'bg-white/25'
                }`}
              >
                {medieval ? 'KRONIKA' : 'ARCADE'}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${
              medieval ? 'text-[#D8C49A] hover:bg-[#C9A227]/25 hover:text-[#F3E3C3]' : 'text-white/80 hover:bg-white/20 hover:text-white'
            }`}
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — scrolls inside the modal so the header stays visible even when a
            game is taller than the viewport */}
        {Selected ? (
          <div className={`overflow-y-auto p-5 ${medieval ? 'game-scroll-medieval bg-gradient-to-b from-[#EFDDB8] to-[#E2CB9F]' : ''}`}>
            <Selected />
          </div>
        ) : (
          <div className={`overflow-y-auto p-5 ${medieval ? 'game-scroll-medieval' : ''}`}>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Wybierz{' '}
              {/* The easter egg: this one word unlocks the hidden game. It looks like
                  plain text — no pointer cursor, no underline — so you have to know. */}
              <span
                role="button"
                tabIndex={-1}
                aria-label="Sekret"
                onClick={() => setSecretOpen((s) => !s)}
                className="select-none outline-none"
              >
                grę
              </span>{' '}
              — każda ma własną tabelę wyników.
            </p>
            {secretOpen && (
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <Sparkles className="h-3.5 w-3.5" /> Odkryłeś ukrytą grę!
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((g) => {
                const Icon = g.icon;
                const best = bests[g.id];
                const isSecret = SECRET_GAMES.some((s) => s.id === g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelected(g)}
                    className={`group relative flex flex-col items-start gap-3 rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7941D] dark:bg-gray-900/40 ${
                      isSecret
                        ? 'border-purple-300 bg-purple-50/50 dark:border-purple-500/40 dark:bg-purple-500/5'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {isSecret && (
                      <span className="absolute right-3 top-3 rounded-full bg-purple-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Sekret
                      </span>
                    )}
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${g.gradient} text-white shadow-md transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white">{g.name}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{g.tagline}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <Trophy className="h-3 w-3 text-[#F7941D]" />
                      {best != null ? (
                        <>
                          Twój rekord: <span className="tabular-nums text-[#EA7B0C]">{best}</span>
                        </>
                      ) : (
                        'Jeszcze nie grałeś'
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
