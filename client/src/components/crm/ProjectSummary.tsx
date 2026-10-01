import { useMemo } from 'react';
import { Users, CalendarCheck, Cake, UserRound } from 'lucide-react';
import type { CrmParticipant } from '../../api/crmProject.api';

const ORANGE = '#F7941D';
const BLUE = '#2563EB';

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

function tally(items: (string | null)[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const raw of items) {
    const key = (raw || '').trim() || 'Nie podano';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/** Horizontal breakdown bars for one categorical dimension (single-hue magnitude). */
function Breakdown({ title, rows, total, limit }: { title: string; rows: Array<[string, number]>; total: number; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const rest = limit ? rows.slice(limit).reduce((s, [, c]) => s + c, 0) : 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      <div className="space-y-1.5">
        {shown.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span className="w-32 shrink-0 truncate text-gray-700 dark:text-gray-300" title={label}>{label}</span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(pct(count, total), 2)}%`, backgroundColor: ORANGE }} />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-gray-600 dark:text-gray-400">{count} · {pct(count, total)}%</span>
          </div>
        ))}
        {rest > 0 && <p className="pl-32 text-xs text-gray-400">+ {rest} inne</p>}
      </div>
    </div>
  );
}

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D]">{icon}</span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-gray-900 dark:text-white">{value}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{label}{sub ? ` · ${sub}` : ''}</p>
        </div>
      </div>
    </div>
  );
}

/** Auto-generated summary + proportions for a project's participants. */
export default function ProjectSummary({ participants }: { participants: CrmParticipant[] }) {
  const s = useMemo(() => {
    const total = participants.length;
    let women = 0, men = 0, otherG = 0, completed = 0;
    const ages: number[] = [];
    const ageBrackets = new Map<string, number>([['do 29 lat', 0], ['30–49 lat', 0], ['50+ lat', 0], ['Nie podano', 0]]);
    for (const p of participants) {
      const g = (p.gender || '').trim().toLowerCase();
      if (g.startsWith('k')) women++; else if (g.startsWith('m')) men++; else otherG++;
      if (p.end_date) completed++;
      if (p.age != null && Number.isFinite(p.age)) {
        ages.push(p.age);
        const k = p.age < 30 ? 'do 29 lat' : p.age < 50 ? '30–49 lat' : '50+ lat';
        ageBrackets.set(k, (ageBrackets.get(k) || 0) + 1);
      } else ageBrackets.set('Nie podano', (ageBrackets.get('Nie podano') || 0) + 1);
    }
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;
    return {
      total, women, men, otherG, completed, avgAge,
      education: tally(participants.map((p) => p.education)),
      status: tally(participants.map((p) => p.labour_status)),
      cities: tally(participants.map((p) => p.city)),
      ageRows: [...ageBrackets.entries()].filter(([, c]) => c > 0) as Array<[string, number]>,
    };
  }, [participants]);

  if (s.total === 0) return null;

  return (
    <div className="space-y-3 border-b border-gray-100 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/20">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile icon={<Users className="h-4 w-4" />} label="Uczestnicy" value={String(s.total)} />
        <Tile icon={<Cake className="h-4 w-4" />} label="Średni wiek" value={s.avgAge != null ? `${s.avgAge} lat` : '—'} />
        <Tile icon={<CalendarCheck className="h-4 w-4" />} label="Zakończyli udział" value={`${s.completed}`} sub={`${pct(s.completed, s.total)}%`} />
        <Tile
          icon={<UserRound className="h-4 w-4" />}
          label="Kobiety / Mężczyźni"
          value={`${s.women} / ${s.men}`}
          sub={`${pct(s.women, s.total)}% / ${pct(s.men, s.total)}%`}
        />
      </div>

      {/* Gender split bar (labelled — colour is not the only cue) */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Podział wg płci</span>
          <span className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ORANGE }} /> Kobiety {s.women} ({pct(s.women, s.total)}%)</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BLUE }} /> Mężczyźni {s.men} ({pct(s.men, s.total)}%)</span>
            {s.otherG > 0 && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Inne {s.otherG}</span>}
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          {s.women > 0 && <span style={{ width: `${pct(s.women, s.total)}%`, backgroundColor: ORANGE }} title={`Kobiety: ${s.women}`} />}
          {s.men > 0 && <span style={{ width: `${pct(s.men, s.total)}%`, backgroundColor: BLUE }} title={`Mężczyźni: ${s.men}`} />}
          {s.otherG > 0 && <span className="bg-gray-300" style={{ width: `${pct(s.otherG, s.total)}%` }} title={`Inne: ${s.otherG}`} />}
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Breakdown title="Wiek" rows={s.ageRows} total={s.total} />
        <Breakdown title="Status na rynku pracy" rows={s.status} total={s.total} limit={6} />
        <Breakdown title="Wykształcenie" rows={s.education} total={s.total} limit={6} />
        <Breakdown title="Miejscowości" rows={s.cities} total={s.total} limit={6} />
      </div>
    </div>
  );
}
