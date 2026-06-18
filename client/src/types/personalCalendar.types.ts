export type CalendarRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarOccurrence {
  id: string;
  occurrence_date: string; // ISO
  title: string;
  description: string | null;
  all_day: boolean;
  remind_minutes_before: number | null;
  recurrence: CalendarRecurrence;
  recurrence_until: string | null;
  color: string | null;
  is_recurring: boolean;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  event_date: string; // ISO
  all_day?: boolean;
  remind_minutes_before?: number | null;
  recurrence?: CalendarRecurrence;
  recurrence_until?: string | null;
  color?: string | null;
}

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Bez przypomnienia' },
  { value: 0, label: 'W momencie wydarzenia' },
  { value: 10, label: '10 minut przed' },
  { value: 60, label: '1 godzinę przed' },
  { value: 1440, label: '1 dzień przed' },
];

export const RECURRENCE_OPTIONS: { value: CalendarRecurrence; label: string }[] = [
  { value: 'none', label: 'Nie powtarza się' },
  { value: 'daily', label: 'Codziennie' },
  { value: 'weekly', label: 'Co tydzień' },
  { value: 'monthly', label: 'Co miesiąc' },
];
