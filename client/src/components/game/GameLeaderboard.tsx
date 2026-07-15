import { useCallback, useEffect, useState } from 'react';
import { Trophy, Crown } from 'lucide-react';
import * as gameApi from '../../api/game.api';

/** Loads (and reloads) the leaderboard for a single game key. */
export function useLeaderboard(game: string) {
  const [board, setBoard] = useState<gameApi.Leaderboard | null>(null);
  const reload = useCallback(() => {
    gameApi.getLeaderboard(game).then(setBoard).catch(() => setBoard(null));
  }, [game]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { board, reload };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** Podium for the top three + a plain list for everyone else. */
export default function GameLeaderboard({ board }: { board: gameApi.Leaderboard | null }) {
  const podium = board && board.top.length >= 3 ? board.top.slice(0, 3) : null;
  const rest = board ? board.top.slice(podium ? 3 : 0) : [];
  const isMe = (userId: string, sc: number) =>
    !!board?.me &&
    board.me.rank != null &&
    sc === board.me.score &&
    board.top.find((e) => e.userId === userId)?.rank === board.me.rank;

  return (
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
                const grad =
                  place === 1
                    ? 'from-yellow-300 to-yellow-500'
                    : place === 2
                    ? 'from-slate-200 to-slate-400'
                    : 'from-amber-400 to-amber-600';
                const mine = isMe(e.userId, e.score);
                return (
                  <div key={e.userId} className="flex flex-col items-center">
                    {place === 1 && <Crown className="mb-0.5 h-4 w-4 text-yellow-400" />}
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${grad} text-sm font-bold text-white shadow ring-2 ${ring}`}
                    >
                      {initials(e.name)}
                    </div>
                    <p
                      className={`mt-1 max-w-full truncate text-[11px] font-medium ${
                        mine ? 'text-[#EA7B0C]' : 'text-gray-600 dark:text-gray-300'
                      }`}
                      title={e.name}
                    >
                      {firstName(e.name)}
                    </p>
                    <p className="text-xs font-bold tabular-nums text-gray-900 dark:text-white">{e.score}</p>
                    <div
                      className={`mt-1 w-full rounded-t-lg bg-gradient-to-b ${grad} ${h} flex items-start justify-center pt-1 text-xs font-black text-white/90`}
                    >
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
                  <span className="w-6 text-center font-bold tabular-nums text-gray-400">{e.rank}</span>
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
  );
}
