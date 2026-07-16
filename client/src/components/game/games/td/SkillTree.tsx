import { Star, Lock, Check, X } from 'lucide-react';
import { BRANCHES, availableStars, earnedStars, saveMeta, type Meta, type BranchId } from './perks';

interface Props {
  meta: Meta;
  onChange: (m: Meta) => void;
  onClose: () => void;
}

/**
 * The permanent upgrade tree. Every branch is a chain — a node only unlocks
 * once the one before it is bought, so you commit to a direction.
 */
export default function SkillTree({ meta, onChange, onClose }: Props) {
  const left = availableStars(meta);
  const total = earnedStars(meta);

  const buy = (id: BranchId, idx: number) => {
    const bought = meta.perks[id] ?? 0;
    if (idx !== bought) return; // only ever the next node in the chain
    const branch = BRANCHES.find((b) => b.id === id)!;
    const cost = branch.nodes[idx].cost;
    if (left < cost) return;
    const next: Meta = { ...meta, perks: { ...meta.perks, [id]: bought + 1 } };
    saveMeta(next);
    onChange(next);
  };

  const towers = BRANCHES.filter((b) => b.kind === 'tower');
  const support = BRANCHES.filter((b) => b.kind === 'support');

  const renderBranch = (b: (typeof BRANCHES)[number]) => {
    const bought = meta.perks[b.id] ?? 0;
    return (
      <div key={b.id} className="rounded-md border-2 border-[#B49B6E] bg-[#F3E3C3] p-2">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#3A2C1C]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
          {b.name}
          <span className="ml-auto text-[9px] text-[#7A6A4B]">{bought}/3</span>
        </p>
        <div className="flex flex-col gap-1">
          {b.nodes.map((n, i) => {
            const owned = i < bought;
            const isNext = i === bought;
            const affordable = isNext && left >= n.cost;
            return (
              <button
                key={n.name}
                type="button"
                disabled={!affordable}
                onClick={() => buy(b.id, i)}
                title={owned ? 'Wykupione' : isNext ? n.desc : 'Najpierw wykup poprzedni stopień'}
                className={`flex items-center gap-1.5 rounded border px-1.5 py-1 text-left transition-colors ${
                  owned
                    ? 'border-[#4D7C0F] bg-[#65A30D]/25'
                    : affordable
                    ? 'border-[#C9A227] bg-[#C9A227]/15 hover:bg-[#C9A227]/30'
                    : 'border-[#B49B6E]/60 bg-[#E2CB9F]/40 opacity-60'
                }`}
              >
                <span className="shrink-0">
                  {owned ? (
                    <Check className="h-3 w-3 text-[#3F6212]" />
                  ) : isNext ? (
                    <Star className={`h-3 w-3 ${affordable ? 'fill-[#C9A227] text-[#C9A227]' : 'text-[#9A8A6B]'}`} />
                  ) : (
                    <Lock className="h-3 w-3 text-[#9A8A6B]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-bold text-[#3A2C1C]">{n.name}</span>
                  <span className="block truncate text-[9px] text-[#6B5A42]">{n.desc}</span>
                </span>
                {!owned && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold tabular-nums text-[#7A4E12]">
                    {n.cost}
                    <Star className="h-2.5 w-2.5 fill-[#C9A227] text-[#C9A227]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#1C1408]/95 backdrop-blur-[2px]">
      <div className="flex items-center justify-between border-b-2 border-[#C9A227]/50 px-4 py-2">
        <h3 className="flex items-center gap-2 font-serif text-base font-bold text-[#F3E3C3]">
          <Star className="h-4 w-4 fill-[#C9A227] text-[#C9A227]" />
          Kronika Mistrza
        </h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 rounded border border-[#C9A227]/60 bg-[#C9A227]/15 px-2 py-0.5 text-xs font-bold tabular-nums text-[#E8C766]">
            <Star className="h-3 w-3 fill-[#C9A227] text-[#C9A227]" />
            {left} / {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#D8C49A] transition-colors hover:bg-[#C9A227]/25 hover:text-[#F3E3C3]"
            aria-label="Zamknij drzewko"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="game-scroll-medieval flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-[#A08B62]">Wieże</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{towers.map(renderBranch)}</div>
        <p className="mb-2 mt-3 text-[10px] uppercase tracking-[0.15em] text-[#A08B62]">Wsparcie</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{support.map(renderBranch)}</div>
        <p className="mt-3 text-center text-[10px] text-[#8A7856]">
          Gwiazdki zdobywasz za rozdziały: 1 za ukończenie, +1 gdy stracisz najwyżej 3 HP, +1 za rozdział bez straty.
          Liczy się najlepszy wynik, więc opłaca się wracać na stare mapy.
        </p>
      </div>
    </div>
  );
}
