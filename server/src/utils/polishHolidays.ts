// Polish public holidays (dni ustawowo wolne od pracy), incl. Easter-based movable ones.

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const cache = new Map<number, Set<string>>();

export function getPolishHolidays(year: number): Set<string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const set = new Set<string>();
  // Fixed-date holidays (MM-DD)
  ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26']
    .forEach((md) => set.add(`${year}-${md}`));

  // Easter-based movable holidays
  const easter = easterSunday(year);
  const add = (offsetDays: number) => {
    const d = new Date(easter);
    d.setUTCDate(easter.getUTCDate() + offsetDays);
    set.add(ymd(d));
  };
  add(0);   // Wielkanoc (niedziela)
  add(1);   // Poniedziałek Wielkanocny
  add(49);  // Zielone Świątki / Zesłanie Ducha Świętego (niedziela)
  add(60);  // Boże Ciało

  cache.set(year, set);
  return set;
}

/** True if the given (UTC) date is a Polish public holiday. */
export function isPolishHoliday(d: Date): boolean {
  return getPolishHolidays(d.getUTCFullYear()).has(ymd(d));
}
