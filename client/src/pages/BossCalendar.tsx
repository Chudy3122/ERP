import { useCallback, useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api/boss-calendar.api';
import { BossCalendarEntry, CreateEntryPayload, EntryType } from '../types/boss-calendar.types';
import {
  AlignLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';

const HOUR_START = 7;
const HOUR_END = 20;
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60;
const SLOT_PX = 60;
const COMPLETED_ENTRIES_STORAGE_KEY = 'boss-calendar-completed-entries';

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const MONTHS_PL = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

const TYPE_CONFIG: Record<EntryType, { label: string; bg: string; border: string; text: string; dot: string }> = {
  meeting: {
    label: 'Spotkanie',
    bg: 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15',
    border: 'border-[#F7941D]',
    text: 'text-[#b76612] dark:text-orange-200',
    dot: 'bg-[#F7941D]',
  },
  available: {
    label: 'Dostępny',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-400',
    text: 'text-emerald-800 dark:text-emerald-200',
    dot: 'bg-emerald-400',
  },
  blocked: {
    label: 'Niedostępny',
    bg: 'bg-gray-100 dark:bg-gray-700/60',
    border: 'border-gray-400',
    text: 'text-gray-700 dark:text-gray-200',
    dot: 'bg-gray-400',
  },
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatDate(d: Date): string {
  // Use LOCAL date parts — toISOString() converts to UTC and shifts the day
  // (e.g. local midnight in CEST becomes the previous day at 22:00 UTC).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getRangeDays(startDate: string, endDate?: string | null): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate || startDate);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / 86400000) + 1);
}

function getEntryDurationMinutes(entry: BossCalendarEntry): number {
  return Math.max(0, toMinutes(entry.end_time) - toMinutes(entry.start_time));
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours === 0) return `${restMinutes} min`;
  if (restMinutes === 0) return `${hours}h`;
  return `${hours}h ${String(restMinutes).padStart(2, '0')}min`;
}

const CAN_EDIT_ROLES = ['szef', 'sekretariat', 'admin', 'kierownik'];

const EMPTY_FORM: CreateEntryPayload = {
  date: formatDate(new Date()),
  start_time: '09:00',
  end_time: '10:00',
  title: '',
  description: '',
  type: 'meeting',
  location: '',
};

export default function BossCalendar() {
  const { user } = useAuth();
  const canEdit = CAN_EDIT_ROLES.includes(user?.role || '');

  const [weekStart, setWeekStart] = useState<Date>(getMondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState<string>(formatDate(new Date()));
  const [entries, setEntries] = useState<BossCalendarEntry[]>([]);
  const [completedEntryIds, setCompletedEntryIds] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(COMPLETED_ENTRIES_STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BossCalendarEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<BossCalendarEntry | null>(null);
  const [form, setForm] = useState<CreateEntryPayload>(EMPTY_FORM);
  const [multiDay, setMultiDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = formatDate(weekDays[0]);
  const to = formatDate(weekDays[6]);

  useEffect(() => {
    if (selectedDay < from || selectedDay > to) {
      const today = formatDate(new Date());
      setSelectedDay(today >= from && today <= to ? today : from);
    }
  }, [from, selectedDay, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEntries(from, to);
      setEntries(data);
    } catch {
      toast.error('Nie udało się załadować kalendarza');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    window.localStorage.setItem(
      COMPLETED_ENTRIES_STORAGE_KEY,
      JSON.stringify(Array.from(completedEntryIds))
    );
  }, [completedEntryIds]);

  const isEntryCompleted = (entryId: string) => completedEntryIds.has(entryId);

  const toggleEntryCompleted = (entryId: string, completed: boolean) => {
    setCompletedEntryIds((current) => {
      const next = new Set(current);
      if (completed) {
        next.add(entryId);
      } else {
        next.delete(entryId);
      }
      return next;
    });
  };

  const openCreate = (date?: string) => {
    setEditingEntry(null);
    setMultiDay(false);
    setForm({ ...EMPTY_FORM, date: date ?? formatDate(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (entry: BossCalendarEntry) => {
    setSelectedEntry(null);
    setEditingEntry(entry);
    setMultiDay(!!entry.end_date && entry.end_date !== entry.date);
    setForm({
      date: entry.date,
      end_date: entry.end_date ?? undefined,
      start_time: entry.start_time,
      end_time: entry.end_time,
      title: entry.title,
      description: entry.description ?? '',
      type: entry.type,
      location: entry.location ?? '',
    });
    setModalOpen(true);
  };

  const openDetails = (entry: BossCalendarEntry) => {
    setSelectedEntry(entry);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('Tytuł jest wymagany');
      return;
    }
    if (!form.date || !form.start_time || !form.end_time) {
      toast.warning('Uzupełnij datę i godziny');
      return;
    }
    if (toMinutes(form.start_time) >= toMinutes(form.end_time)) {
      toast.warning('Godzina końca musi być późniejsza niż start');
      return;
    }
    if (multiDay && form.end_date && form.end_date < form.date) {
      toast.warning('Data końcowa nie może być wcześniejsza niż początkowa');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateEntryPayload = {
        ...form,
        end_date: multiDay && form.end_date && form.end_date !== form.date ? form.end_date : null,
        description: form.description || undefined,
        location: form.location || undefined,
      };
      if (editingEntry) {
        await api.updateEntry(editingEntry.id, payload);
        toast.success('Wpis zaktualizowany');
      } else {
        await api.createEntry(payload);
        toast.success('Wpis dodany');
      }
      closeModal();
      load();
    } catch {
      toast.error('Nie udało się zapisać wpisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteEntry(id);
      setDeleteConfirm(null);
      setSelectedEntry(null);
      toast.success('Wpis usunięty');
      load();
    } catch {
      toast.error('Nie udało się usunąć wpisu');
    }
  };

  const entriesByDay = (dayStr: string) =>
    entries
      .filter((entry) => dayStr >= entry.date && dayStr <= (entry.end_date || entry.date))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const weekLabel = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${MONTHS_PL[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS_PL[start.getMonth()]} - ${end.getDate()} ${MONTHS_PL[end.getMonth()]} ${end.getFullYear()}`;
  };

  const todayStr = formatDate(new Date());
  const meetingsCount = entries.filter((entry) => entry.type === 'meeting').length;
  const availableCount = entries.filter((entry) => entry.type === 'available').length;
  const blockedCount = entries.filter((entry) => entry.type === 'blocked').length;
  const multiDayCount = entries.filter((entry) => entry.end_date && entry.end_date !== entry.date).length;
  const hiddenOutsideHoursCount = entries.filter((entry) => {
    const start = toMinutes(entry.start_time);
    const end = toMinutes(entry.end_time);
    return end <= HOUR_START * 60 || start >= HOUR_END * 60;
  }).length;
  const formRangeEnd = multiDay ? (form.end_date || form.date) : form.date;
  const formRangeDays = form.date ? getRangeDays(form.date, formRangeEnd) : 1;
  const formTypeConfig = TYPE_CONFIG[form.type];
  const selectedDayEntries = entriesByDay(selectedDay);
  const selectedDayMeetingEntries = selectedDayEntries.filter((entry) => entry.type === 'meeting');
  const selectedDayCompletedMeetingEntries = selectedDayMeetingEntries.filter((entry) =>
    isEntryCompleted(entry.id)
  );
  const selectedDayMeetingsMinutes = selectedDayMeetingEntries.reduce(
    (sum, entry) => sum + getEntryDurationMinutes(entry),
    0
  );
  const selectedDayTotalMinutes = selectedDayEntries.reduce(
    (sum, entry) => sum + getEntryDurationMinutes(entry),
    0
  );
  const selectedDayLabel = parseLocalDate(selectedDay).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const statCards = [
    { label: 'Wpisy w tygodniu', value: entries.length, dot: 'bg-[#F7941D]' },
    { label: 'Spotkania', value: meetingsCount, dot: 'bg-[#F7941D]' },
    { label: 'Dostępność', value: availableCount, dot: 'bg-emerald-400' },
    { label: 'Blokady', value: blockedCount, dot: 'bg-gray-400' },
    { label: 'Wielodniowe', value: multiDayCount, dot: 'bg-blue-400' },
  ];

  return (
    <MainLayout title="Kalendarz Szefa">
      <div className="mx-auto flex max-w-[1600px] flex-col space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Plan tygodnia</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Kalendarz Szefa</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Widok tygodniowy spotkań, dostępności i blokad czasowych.
                  </p>
                </div>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
              >
                <Plus className="h-4 w-4" />
                Dodaj wpis
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${card.dot}`} />
                <div>
                  <p className="text-2xl font-semibold text-gray-950 dark:text-white">{card.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                Podsumowanie dnia
              </p>
              <h2 className="mt-1 text-lg font-bold capitalize text-gray-950 dark:text-white">
                {selectedDayLabel}
              </h2>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Wpisy</p>
                <p className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                  {selectedDayEntries.length}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/20">
                <p className="text-xs font-medium text-[#b76612] dark:text-orange-200">Spotkania</p>
                <p className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                  {selectedDayMeetingEntries.length}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-200">Zakończone</p>
                <p className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                  {selectedDayCompletedMeetingEntries.length}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/20">
                <p className="text-xs font-medium text-[#b76612] dark:text-orange-200">Czas spotkań</p>
                <p className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                  {formatDuration(selectedDayMeetingsMinutes)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-900/40">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Zajęty czas</p>
                <p className="mt-1 text-xl font-bold text-gray-950 dark:text-white">
                  {formatDuration(selectedDayTotalMinutes)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-700 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStart((week) => addDays(week, -7))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                aria-label="Poprzedni tydzień"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 min-w-[260px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {weekLabel()}
              </div>
              <button
                type="button"
                onClick={() => setWeekStart((week) => addDays(week, 7))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                aria-label="Następny tydzień"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(getMondayOf(new Date()))}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Dziś
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {(Object.entries(TYPE_CONFIG) as [EntryType, (typeof TYPE_CONFIG)[EntryType]][]).map(([type, cfg]) => (
                <span key={type} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 dark:bg-gray-900/40">
                  <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-auto">
            {loading ? (
              <div className="flex h-80 items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-9 w-9 animate-spin text-[#F7941D]" />
                  <span className="text-sm font-medium">Ładowanie kalendarza...</span>
                </div>
              </div>
            ) : (
              <div className="min-w-[900px]">
                {entries.length === 0 && (
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                    Brak wpisów w tym tygodniu. {canEdit ? 'Kliknij w wybrany dzień w siatce albo użyj przycisku „Dodaj wpis”.' : 'Po dodaniu wpisów pojawią się w siatce kalendarza.'}
                  </div>
                )}

                {hiddenOutsideHoursCount > 0 && (
                  <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    {hiddenOutsideHoursCount} wpis{hiddenOutsideHoursCount === 1 ? '' : 'y'} wypada poza widocznym zakresem {HOUR_START}:00-{HOUR_END}:00 i nie jest pokazany w siatce.
                  </div>
                )}

                <div className="sticky top-0 z-10 grid grid-cols-[64px_repeat(7,1fr)] border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40" />
                  {weekDays.map((day, index) => {
                    const dayStr = formatDate(day);
                    const isToday = dayStr === todayStr;
                    const isSelected = dayStr === selectedDay;
                    const dayEntriesCount = entriesByDay(dayStr).length;
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => setSelectedDay(dayStr)}
                        className={`border-r border-gray-200 py-3 text-center transition-colors last:border-r-0 dark:border-gray-700 ${
                          isSelected
                            ? 'bg-[#F7941D]/15 ring-2 ring-inset ring-[#F7941D]/40 dark:bg-[#F7941D]/15'
                            : isToday
                              ? 'bg-[#F7941D]/10 dark:bg-[#F7941D]/10'
                              : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/60'
                        }`}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {DAYS_PL[index]}
                        </div>
                        <div className={`mt-0.5 text-lg font-semibold ${isToday ? 'text-[#F7941D]' : 'text-gray-950 dark:text-white'}`}>
                          {day.getDate()}
                        </div>
                        {dayEntriesCount > 0 && (
                          <div className="mt-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                            {dayEntriesCount} wpis{dayEntriesCount === 1 ? '' : 'y'}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[64px_repeat(7,1fr)]">
                  <div className="border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        style={{ height: SLOT_PX }}
                        className="flex items-start justify-end border-b border-gray-100 pr-2 pt-1 text-xs text-gray-400 dark:border-gray-700/50 dark:text-gray-500"
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day, dayIndex) => {
                    const dayStr = formatDate(day);
                    const isToday = dayStr === todayStr;
                    const isSelected = dayStr === selectedDay;
                    const dayEntries = entriesByDay(dayStr);

                    return (
                      <div
                        key={dayIndex}
                        className={`relative border-r border-gray-200 last:border-r-0 dark:border-gray-700 ${
                          isSelected
                            ? 'bg-[#F7941D]/10 dark:bg-[#F7941D]/10'
                            : isToday
                              ? 'bg-[#F7941D]/5 dark:bg-[#F7941D]/5'
                              : 'bg-white dark:bg-gray-800'
                        }`}
                        style={{ height: SLOT_PX * (HOUR_END - HOUR_START) }}
                        onClick={() => setSelectedDay(dayStr)}
                      >
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            style={{ top: (hour - HOUR_START) * SLOT_PX }}
                            className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700/50"
                          />
                        ))}

                        {hours.map((hour) => (
                          <div
                            key={`half-${hour}`}
                            style={{ top: (hour - HOUR_START) * SLOT_PX + SLOT_PX / 2 }}
                            className="absolute left-0 right-0 border-b border-dashed border-gray-100 dark:border-gray-700/30"
                          />
                        ))}

                        {canEdit && (
                          <div
                            className="absolute inset-0 cursor-pointer"
                            onClick={() => {
                              setSelectedDay(dayStr);
                              openCreate(dayStr);
                            }}
                          />
                        )}

                        {dayEntries.map((entry) => {
                          const startMin = toMinutes(entry.start_time) - HOUR_START * 60;
                          const endMin = toMinutes(entry.end_time) - HOUR_START * 60;
                          const clampedStart = Math.max(0, startMin);
                          const clampedEnd = Math.min(TOTAL_MINUTES, endMin);
                          if (clampedEnd <= clampedStart) return null;

                          const top = (clampedStart / 60) * SLOT_PX;
                          const height = ((clampedEnd - clampedStart) / 60) * SLOT_PX;
                          const cfg = TYPE_CONFIG[entry.type];
                          const rangeEnd = entry.end_date || entry.date;
                          const isMultiDay = rangeEnd !== entry.date;
                          const isRangeStart = dayStr === entry.date;
                          const isRangeEnd = dayStr === rangeEnd;
                          const rangeLabel = isRangeStart ? 'Start' : isRangeEnd ? 'Koniec' : 'Kont.';
                          const rangeDays = getRangeDays(entry.date, rangeEnd);
                          const isCompleted = isEntryCompleted(entry.id);

                          return (
                            <div
                              key={entry.id}
                              style={{ top, height: Math.max(height, 26), left: 4, right: 4 }}
                              className={`absolute z-10 cursor-pointer select-none overflow-hidden rounded-lg border-l-4 px-2 py-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cfg.bg} ${cfg.border} ${
                                isCompleted ? 'opacity-70 ring-1 ring-emerald-300 dark:ring-emerald-500/70' : ''
                              }`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetails(entry);
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex min-w-0 items-start gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    aria-label="Oznacz jako zakończone"
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-emerald-500"
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) => toggleEntryCompleted(entry.id, event.target.checked)}
                                  />
                                  <div className={`min-w-0 truncate text-xs font-semibold ${cfg.text} ${isCompleted ? 'line-through' : ''}`}>
                                    {entry.title}
                                  </div>
                                </div>
                                {isMultiDay && (
                                  <span className={`shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-bold uppercase ${cfg.text} dark:bg-gray-900/30`}>
                                    {rangeLabel}
                                  </span>
                                )}
                              </div>
                              {height >= 36 && (
                                <div className={`truncate text-xs ${cfg.text} opacity-75`}>
                                  {entry.start_time}-{entry.end_time}
                                  {isCompleted ? ' · zakończone' : ''}
                                </div>
                              )}
                              {height >= 48 && isMultiDay && (
                                <div className={`truncate text-[10px] ${cfg.text} opacity-70`}>
                                  {formatShortDate(entry.date)}-{formatShortDate(rangeEnd)} · {rangeDays} dni
                                </div>
                              )}
                              {height >= 52 && entry.location && (
                                <div className={`truncate text-xs ${cfg.text} opacity-60`}>{entry.location}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Wpis kalendarza</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {editingEntry ? 'Edytuj wpis' : 'Nowy wpis'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Typ</label>
                <div className="flex gap-2">
                  {(Object.entries(TYPE_CONFIG) as [EntryType, (typeof TYPE_CONFIG)[EntryType]][]).map(([type, cfg]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, type }))}
                      className={`flex-1 rounded-lg border-2 py-1.5 text-sm font-medium transition-all ${
                        form.type === type
                          ? `${cfg.border} ${cfg.bg} ${cfg.text}`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tytuł *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Np. Spotkanie z klientem"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Zakres wpisu</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Wpis wielodniowy pojawi się w każdym dniu zakresu z tymi samymi godzinami.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const on = !multiDay;
                      setMultiDay(on);
                      setForm((current) => ({ ...current, end_date: on ? (current.end_date || current.date) : null }));
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      multiDay
                        ? 'bg-[#F7941D] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {multiDay ? 'Wiele dni' : 'Jeden dzień'}
                  </button>
                </div>

                <div className={`grid grid-cols-1 gap-3 ${multiDay ? 'sm:grid-cols-2' : ''}`}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {multiDay ? 'Od dnia *' : 'Data *'}
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        date: event.target.value,
                        end_date: multiDay && current.end_date && current.end_date < event.target.value ? event.target.value : current.end_date,
                      }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {multiDay && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Do dnia *</label>
                      <input
                        type="date"
                        value={form.end_date ?? form.date}
                        min={form.date}
                        onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Godziny</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Od *</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Do *</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MapPin className="h-3.5 w-3.5" /> Miejsce
                </label>
                <input
                  type="text"
                  value={form.location ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Np. Sala konferencyjna A"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <AlignLeft className="h-3.5 w-3.5" /> Opis
                </label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={2}
                  placeholder="Dodatkowe informacje..."
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className={`rounded-xl border-l-4 px-4 py-3 ${formTypeConfig.bg} ${formTypeConfig.border}`}>
                <p className={`text-sm font-semibold ${formTypeConfig.text}`}>
                  {form.title.trim() || 'Nowy wpis'} · {formTypeConfig.label}
                </p>
                <p className={`mt-1 text-xs ${formTypeConfig.text} opacity-80`}>
                  {formatShortDate(form.date)}
                  {multiDay && formRangeEnd !== form.date ? `-${formatShortDate(formRangeEnd)} (${formRangeDays} dni)` : ''}
                  {' · '}
                  {form.start_time}-{form.end_time}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 pb-5">
              {editingEntry && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(editingEntry.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Zapisywanie...' : editingEntry ? 'Zapisz zmiany' : 'Dodaj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          {(() => {
            const cfg = TYPE_CONFIG[selectedEntry.type];
            const rangeEnd = selectedEntry.end_date || selectedEntry.date;
            const isMultiDayEntry = rangeEnd !== selectedEntry.date;
            const rangeDays = getRangeDays(selectedEntry.date, rangeEnd);
            const isSelectedEntryCompleted = isEntryCompleted(selectedEntry.id);

            return (
              <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-800">
                <div className={`border-l-4 px-6 py-5 ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>
                        {cfg.label}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
                        {selectedEntry.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(null)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/70 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    isSelectedEntryCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-200'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-700/70'
                  }`}>
                    <span>
                      <span className="block text-sm font-semibold">
                        {isSelectedEntryCompleted ? 'Spotkanie zakończone' : 'Oznacz spotkanie jako zakończone'}
                      </span>
                      <span className="mt-0.5 block text-xs opacity-75">
                        Status zapisywany lokalnie w przeglądarce.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelectedEntryCompleted}
                      className="h-5 w-5 shrink-0 rounded border-gray-300 accent-emerald-500"
                      onChange={(event) => toggleEntryCompleted(selectedEntry.id, event.target.checked)}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <CalendarDays className="h-4 w-4 text-[#F7941D]" />
                        Termin
                      </div>
                      <p className="text-sm font-semibold text-gray-950 dark:text-white">
                        {formatShortDate(selectedEntry.date)}
                        {isMultiDayEntry ? ` - ${formatShortDate(rangeEnd)}` : ''}
                      </p>
                      {isMultiDayEntry && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rangeDays} dni</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <Clock3 className="h-4 w-4 text-[#F7941D]" />
                        Godziny
                      </div>
                      <p className="text-sm font-semibold text-gray-950 dark:text-white">
                        {selectedEntry.start_time} - {selectedEntry.end_time}
                      </p>
                    </div>
                  </div>

                  {selectedEntry.location && (
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <MapPin className="h-4 w-4 text-[#F7941D]" />
                        Miejsce
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedEntry.location}</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <AlignLeft className="h-4 w-4 text-[#F7941D]" />
                      Opis
                    </div>
                    <p className="whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
                      {selectedEntry.description || 'Brak dodatkowego opisu.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/60">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(selectedEntry.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Usuń
                    </button>
                  )}

                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(null)}
                      className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Zamknij
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(selectedEntry)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edytuj
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Usuń wpis</h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Czy na pewno chcesz usunąć ten wpis? Operacja jest nieodwracalna.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
