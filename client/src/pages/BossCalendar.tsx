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
  const [entries, setEntries] = useState<BossCalendarEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BossCalendarEntry | null>(null);
  const [form, setForm] = useState<CreateEntryPayload>(EMPTY_FORM);
  const [multiDay, setMultiDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = formatDate(weekDays[0]);
  const to = formatDate(weekDays[6]);

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

  const openCreate = (date?: string) => {
    setEditingEntry(null);
    setMultiDay(false);
    setForm({ ...EMPTY_FORM, date: date ?? formatDate(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (entry: BossCalendarEntry) => {
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

  const statCards = [
    { label: 'Wpisy w tygodniu', value: entries.length, dot: 'bg-[#F7941D]' },
    { label: 'Spotkania', value: meetingsCount, dot: 'bg-[#F7941D]' },
    { label: 'Dostępność', value: availableCount, dot: 'bg-emerald-400' },
    { label: 'Blokady', value: blockedCount, dot: 'bg-gray-400' },
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <div className="sticky top-0 z-10 grid grid-cols-[64px_repeat(7,1fr)] border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40" />
                  {weekDays.map((day, index) => {
                    const isToday = formatDate(day) === todayStr;
                    return (
                      <div
                        key={index}
                        className={`border-r border-gray-200 py-3 text-center last:border-r-0 dark:border-gray-700 ${
                          isToday ? 'bg-[#F7941D]/10 dark:bg-[#F7941D]/10' : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {DAYS_PL[index]}
                        </div>
                        <div className={`mt-0.5 text-lg font-semibold ${isToday ? 'text-[#F7941D]' : 'text-gray-950 dark:text-white'}`}>
                          {day.getDate()}
                        </div>
                      </div>
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
                    const dayEntries = entriesByDay(dayStr);

                    return (
                      <div
                        key={dayIndex}
                        className={`relative border-r border-gray-200 last:border-r-0 dark:border-gray-700 ${
                          isToday ? 'bg-[#F7941D]/5 dark:bg-[#F7941D]/5' : 'bg-white dark:bg-gray-800'
                        }`}
                        style={{ height: SLOT_PX * (HOUR_END - HOUR_START) }}
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
                          <div className="absolute inset-0 cursor-pointer" onClick={() => openCreate(dayStr)} />
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

                          return (
                            <div
                              key={entry.id}
                              style={{ top, height: Math.max(height, 26), left: 4, right: 4 }}
                              className={`absolute z-10 cursor-pointer select-none overflow-hidden rounded-lg border-l-4 px-2 py-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cfg.bg} ${cfg.border}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (canEdit) openEdit(entry);
                              }}
                            >
                              <div className={`truncate text-xs font-semibold ${cfg.text}`}>{entry.title}</div>
                              {height >= 36 && (
                                <div className={`truncate text-xs ${cfg.text} opacity-75`}>
                                  {entry.start_time}-{entry.end_time}
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
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800">
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

            <div className="space-y-4 px-6 py-5">
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tytuł *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Np. Spotkanie z klientem"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={multiDay}
                  onChange={(event) => {
                    const on = event.target.checked;
                    setMultiDay(on);
                    setForm((current) => ({ ...current, end_date: on ? (current.end_date || current.date) : null }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]/30"
                />
                Wiele dni (przedział)
              </label>

              {multiDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Od dnia *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Do dnia *</label>
                    <input
                      type="date"
                      value={form.end_date ?? ''}
                      min={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {!multiDay && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                )}
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
