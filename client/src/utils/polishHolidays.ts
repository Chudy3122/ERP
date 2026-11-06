export type PolishHoliday = {
  date: string;
  name: string;
};

const holidayCache = new Map<number, Map<string, PolishHoliday>>();

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEasterSunday(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function buildPolishHolidays(year: number): Map<string, PolishHoliday> {
  const holidays = new Map<string, PolishHoliday>();
  const addHoliday = (date: string, name: string) => {
    holidays.set(date, { date, name });
  };

  const fixedHolidays: Array<[string, string]> = [
    ['01-01', 'Nowy Rok'],
    ['01-06', 'Święto Trzech Króli'],
    ['05-01', 'Święto Pracy'],
    ['05-03', 'Święto Konstytucji 3 Maja'],
    ['08-15', 'Wniebowzięcie Najświętszej Maryi Panny'],
    ['11-01', 'Wszystkich Świętych'],
    ['11-11', 'Narodowe Święto Niepodległości'],
    ['12-25', 'Boże Narodzenie'],
    ['12-26', 'Drugi dzień Bożego Narodzenia'],
  ];

  fixedHolidays.forEach(([monthAndDay, name]) => {
    addHoliday(`${year}-${monthAndDay}`, name);
  });

  if (year >= 2025) {
    addHoliday(`${year}-12-24`, 'Wigilia Bożego Narodzenia');
  }

  const easterSunday = getEasterSunday(year);
  const addMovableHoliday = (offsetDays: number, name: string) => {
    const date = new Date(easterSunday);
    date.setUTCDate(easterSunday.getUTCDate() + offsetDays);
    addHoliday(formatUtcDate(date), name);
  };

  addMovableHoliday(0, 'Niedziela Wielkanocna');
  addMovableHoliday(1, 'Poniedziałek Wielkanocny');
  addMovableHoliday(49, 'Zielone Świątki');
  addMovableHoliday(60, 'Boże Ciało');

  return holidays;
}

function getHolidayMap(year: number): Map<string, PolishHoliday> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const holidays = buildPolishHolidays(year);
  holidayCache.set(year, holidays);
  return holidays;
}

export function getPolishHoliday(date: string): PolishHoliday | null {
  const year = Number(date.slice(0, 4));
  if (!Number.isInteger(year)) return null;

  return getHolidayMap(year).get(date) ?? null;
}
