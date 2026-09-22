import type { ParticipantInput } from '../api/crmProject.api';

/** Minimal RFC-4180-ish CSV parser with a configurable delimiter (default ';'). */
function parseCsv(text: string, delimiter = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  // Strip a leading BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else if (c === '\r') {
      // handled by the \n branch (skip lone CR)
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** DD.MM.YYYY (or ISO) → 'YYYY-MM-DD', else null. */
function toIsoDate(v: string): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// EFS export header → participant field.
const H = {
  first: 'Imię',
  last: 'Nazwisko',
  pesel: 'PESEL/Inny identyfikator',
  gender: 'Płeć',
  age: 'Wiek w chwili przystąpienia do projektu',
  education: 'Wykształcenie',
  city: 'Miejscowość',
  postal: 'Kod pocztowy',
  phone: 'Telefon kontaktowy',
  email: 'Adres e-mail',
  labour: 'Status osoby na rynku pracy w chwili przystąpienia do projektu',
  start: 'Data rozpoczęcia udziału w projekcie',
  end: 'Data zakończenia udziału w projekcie',
  role: 'Rodzaj uczestnika',
  company: 'Nazwa instytucji',
  project: 'Numer projektu',
};

const MAPPED_HEADERS = new Set(Object.values(H));

export interface EfsParseResult {
  rows: ParticipantInput[];
  projectNumbers: string[];
  totalRows: number;
}

/**
 * Parse an EFS "Uczestnicy projektu" CSV export into participant inputs.
 * All rows become participants of whichever project the user picked — the
 * "Numer projektu" column is only surfaced for an optional sanity check.
 */
export function parseEfsCsv(text: string): EfsParseResult {
  const table = parseCsv(text, ';');
  if (table.length < 2) return { rows: [], projectNumbers: [], totalRows: 0 };

  const headers = table[0].map((h) => h.trim());
  const idx = (name: string) => headers.indexOf(name);
  const col = (r: string[], name: string) => {
    const i = idx(name);
    return i >= 0 ? (r[i] ?? '').trim() : '';
  };

  const projectNumbers = new Set<string>();
  const rows: ParticipantInput[] = [];

  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const first = col(cells, H.first);
    const last = col(cells, H.last);
    const fullName = `${first} ${last}`.trim();
    if (!fullName) continue;

    const proj = col(cells, H.project);
    if (proj) projectNumbers.add(proj);

    // Everything not mapped to a dedicated field, kept as "Header: value".
    const extra: string[] = [];
    headers.forEach((h, i) => {
      if (MAPPED_HEADERS.has(h)) return;
      const v = (cells[i] ?? '').trim();
      if (v) extra.push(`${h}: ${v}`);
    });

    rows.push({
      full_name: fullName,
      role: col(cells, H.role) || null,
      company: col(cells, H.company) || null,
      email: col(cells, H.email) || null,
      phone: col(cells, H.phone) || null,
      pesel: col(cells, H.pesel) || null,
      gender: col(cells, H.gender) || null,
      age: col(cells, H.age) || null,
      education: col(cells, H.education) || null,
      city: col(cells, H.city) || null,
      postal_code: col(cells, H.postal) || null,
      labour_status: col(cells, H.labour) || null,
      start_date: toIsoDate(col(cells, H.start)),
      end_date: toIsoDate(col(cells, H.end)),
      extra_data: extra.length ? extra.join('\n') : null,
    });
  }

  return { rows, projectNumbers: [...projectNumbers], totalRows: table.length - 1 };
}
