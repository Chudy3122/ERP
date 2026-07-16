import { Feather, HeartPulse, Split, Shield, Wind, Snowflake, Flame, Eye } from 'lucide-react';
import { ENEMIES, type LevelDef } from './config';
import { enemyIconStyle } from './art';

const tag = (icon: React.ReactNode, text: string, cls: string) => (
  <span key={text} className={`flex items-center gap-0.5 rounded px-1 py-px text-[8px] font-bold ${cls}`}>
    {icon}
    {text}
  </span>
);

export default function Bestiary({ level }: { level: LevelDef }) {
  return (
    <aside className="flex w-full flex-col gap-1.5 rounded-lg border-2 border-[#8B6B3E] bg-gradient-to-b from-[#EFDDB8] to-[#DCC99A] p-2 lg:w-52">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-[#7A5C33]">Bestiariusz</p>

      {/* Chapter quirks — these change which towers work here */}
      {(level.frostResist || level.fireResist || level.fog) && (
        <div className="flex flex-col gap-1 rounded border border-[#B49B6E] bg-[#E8D5A9]/70 p-1">
          {level.frostResist && (
            <p className="flex items-center gap-1 text-[9px] font-bold text-[#0369A1]">
              <Snowflake className="h-2.5 w-2.5 shrink-0" /> Odporność na mróz — magowie słabiej spowalniają
            </p>
          )}
          {level.fireResist && (
            <p className="flex items-center gap-1 text-[9px] font-bold text-[#B45309]">
              <Flame className="h-2.5 w-2.5 shrink-0" /> Odporność na ogień — smoła pali słabiej
            </p>
          )}
          {level.fog && (
            <p className="flex items-center gap-1 text-[9px] font-bold text-[#57534E]">
              <Eye className="h-2.5 w-2.5 shrink-0" /> Mgła — wieże mają krótszy zasięg
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 overflow-y-auto">
        {level.pool.map((k) => {
          const e = ENEMIES[k];
          const tags: React.ReactNode[] = [];
          if (e.flying) tags.push(tag(<Feather className="h-2 w-2" />, 'lata', 'bg-sky-200 text-sky-900'));
          if (e.heals) tags.push(tag(<HeartPulse className="h-2 w-2" />, 'leczy', 'bg-purple-200 text-purple-900'));
          if (e.splitsInto) tags.push(tag(<Split className="h-2 w-2" />, 'dzieli się', 'bg-violet-200 text-violet-900'));
          if (e.armor >= 6) tags.push(tag(<Shield className="h-2 w-2" />, `pancerz ${e.armor}`, 'bg-slate-300 text-slate-900'));
          if (e.speed >= 80) tags.push(tag(<Wind className="h-2 w-2" />, 'szybki', 'bg-amber-200 text-amber-900'));

          return (
            <div key={k} className="rounded border border-[#B49B6E] bg-[#F3E3C3] p-1.5">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0" style={enemyIconStyle(k, 28)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-[#3A2C1C]">{e.name}</span>
                  <span className="block text-[8px] tabular-nums text-[#7A6A4B]">
                    {e.hp} HP · pancerz {e.armor} · {e.gold} zł
                  </span>
                </span>
              </div>
              {tags.length > 0 && <div className="mt-0.5 flex flex-wrap gap-0.5">{tags}</div>}
              <p className="mt-0.5 text-[9px] leading-snug text-[#6B5A42]">{e.desc}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-auto text-center text-[8px] leading-tight text-[#8A7856]">
        Wartości bazowe — w tym rozdziale wrogowie mają ×{level.hpMul} HP
        {level.armorAdd > 0 ? ` i +${level.armorAdd} pancerza` : ''}.
      </p>
    </aside>
  );
}
