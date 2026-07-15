import { useEffect, useState, type ComponentType } from 'react';
import { X, Gamepad2, ChevronLeft, Zap, LayoutGrid, Target, Apple, Trophy } from 'lucide-react';
import * as gameApi from '../../api/game.api';
import DodgeGame from './games/DodgeGame';
import TetrisGame from './games/TetrisGame';
import BreakerGame from './games/BreakerGame';
import SnakeGame from './games/SnakeGame';

type GameDef = {
  id: string;
  name: string;
  tagline: string;
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  Component: ComponentType;
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

interface GameModalProps {
  onClose: () => void;
}

export default function GameModal({ onClose }: GameModalProps) {
  const [selected, setSelected] = useState<GameDef | null>(null);
  const [bests, setBests] = useState<Record<string, number | null>>({});

  // Personal bests for the hub cards
  useEffect(() => {
    if (selected) return;
    let alive = true;
    Promise.all(
      GAMES.map((g) =>
        gameApi
          .getLeaderboard(g.id)
          .then((b) => [g.id, b.me?.score ?? null] as const)
          .catch(() => [g.id, null] as const)
      )
    ).then((pairs) => {
      if (alive) setBests(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, [selected]);

  const Selected = selected?.Component;

  // The backdrop deliberately has no click-to-close: the mouse leaves the canvas
  // constantly while playing, and a stray click would quit the game mid-run.
  // Closing is the X button only.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
        {/* Header */}
        <div
          className={`flex items-center justify-between bg-gradient-to-r px-5 py-3.5 ${
            selected ? selected.gradient : 'from-[#F7941D] to-[#FBB040]'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="-ml-1.5 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Wróć do listy gier"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-white drop-shadow-sm">
              <Gamepad2 className="h-5 w-5 shrink-0" />
              <span className="truncate">{selected ? selected.name : 'Gry'}</span>
              <span className="ml-1 shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold tracking-wide">
                ARCADE
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {Selected ? (
          <div className="p-5">
            <Selected />
          </div>
        ) : (
          <div className="p-5">
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Wybierz grę — każda ma własną tabelę wyników.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {GAMES.map((g) => {
                const Icon = g.icon;
                const best = bests[g.id];
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelected(g)}
                    className="group flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7941D] dark:border-gray-700 dark:bg-gray-900/40"
                  >
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
