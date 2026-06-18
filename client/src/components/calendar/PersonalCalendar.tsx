import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Bell, Repeat, Trash2, X, Loader2 } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';
import * as api from '../../api/personalCalendar.api';
import {
  CalendarOccurrence, CalendarRecurrence, REMINDER_OPTIONS, RECURRENCE_OPTIONS,
} from '../../types/personalCalendar.types';

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toLocalDateTimeInput = (d: Date) => `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toLocalDateInput = (d: Date) => dateKey(d);

interface FormState {
  id: string | null;
  title: string;
  date: Date;
  allDay: boolean;
  remind: string;            // stringified number | 'null'
  recurrence: CalendarRecurrence;
  recurrenceUntil: string;   // YYYY-MM-DD or ''
  description: string;
  isRecurringExisting: boolean;
}

const emptyForm = (date: Date): FormState => ({
  id: null,
  title: '',
  date,
  allDay: false,
  remind: '60',
  recurrence: 'none',
  recurrenceUntil: '',
  description: '',
  isRecurringExisting: false,
});

export default function PersonalCalendar() {
  const [viewMonth, setViewMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [occurrences, setOccurrences] = useState<CalendarOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 6-week grid starting on Monday.
  const gridStart = useMemo(() => {
    const first = new Date(viewMonth);
    const offset = (first.getDay() + 6) % 7; // Mon=0
    return new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  }, [viewMonth]);
  const gridDays = useMemo(() => Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)), [gridStart]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const from = gridDays[0];
      const to = new Date(gridDays[41].getFullYear(), gridDays[41].getMonth(), gridDays[41].getDate(), 23, 59, 59);
      setOccurrences(await api.listEvents(from, to));
    } catch {
      toast.error('Nie udało się pobrać wydarzeń');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); /* eslint-disable-next-line */ }, [gridStart.getTime()]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarOccurrence[]>();
    for (const o of occurrences) {
      const k = dateKey(new Date(o.occurrence_date));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return map;
  }, [occurrences]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...occurrences]
      .filter((o) => new Date(o.occurrence_date).getTime() >= now - 60 * 60 * 1000)
      .slice(0, 3);
  }, [occurrences]);

  const todayKey = dateKey(new Date());

  const openNew = (day: Date) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0);
    setForm(emptyForm(d));
  };

  const openEdit = (o: CalendarOccurrence) => {
    setForm({
      id: o.id,
      title: o.title,
      date: new Date(o.occurrence_date),
      allDay: o.all_day,
      remind: o.remind_minutes_before == null ? 'null' : String(o.remind_minutes_before),
      recurrence: o.recurrence,
      recurrenceUntil: o.recurrence_until ? toLocalDateInput(new Date(o.recurrence_until)) : '',
      description: o.description || '',
      isRecurringExisting: o.is_recurring,
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) { toast.error('Podaj tytuł'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        event_date: form.date.toISOString(),
        all_day: form.allDay,
        remind_minutes_before: form.remind === 'null' ? null : Number(form.remind),
        recurrence: form.recurrence,
        recurrence_until: form.recurrence !== 'none' && form.recurrenceUntil
          ? new Date(`${form.recurrenceUntil}T23:59`).toISOString()
          : null,
      };
      if (form.id) await api.updateEvent(form.id, payload);
      else await api.createEvent(payload);
      setForm(null);
      toast.success('Zapisano');
      loadEvents();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się zapisać');
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async () => {
    if (!form?.id) return;
    setSaving(true);
    try {
      await api.deleteEvent(form.id);
      setConfirmDelete(false);
      setForm(null);
      toast.success('Usunięto');
      loadEvents();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się usunąć');
    } finally {
      setSaving(false);
    }
  };

  const fmtTime = (iso: string, allDay: boolean) =>
    allDay ? 'Cały dzień' : new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  return (
    <section className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-950 dark:text-white">Kalendarz</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Twoje terminy z przypomnieniami</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-[150px] text-center text-sm font-semibold text-gray-900 dark:text-white">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
          <button onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => openNew(new Date())} className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]"><Plus className="h-4 w-4" /> Dodaj</button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
        {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
      </div>
      <div className="relative grid grid-cols-7 gap-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-gray-800/60">
            <Loader2 className="h-5 w-5 animate-spin text-[#F7941D]" />
          </div>
        )}
        {gridDays.map((day) => {
          const k = dateKey(day);
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isToday = k === todayKey;
          const dayEvents = byDay.get(k) || [];
          return (
            <div
              key={k}
              onClick={() => openNew(day)}
              className={`min-h-[54px] cursor-pointer rounded-lg border p-1 text-left transition-colors ${
                inMonth ? 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50' : 'border-transparent bg-gray-50/60 text-gray-400 dark:bg-gray-900/30'
              }`}
            >
              <div className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${isToday ? 'bg-[#F7941D] font-bold text-white' : inMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((o, i) => (
                  <button
                    key={`${o.id}-${i}`}
                    onClick={(e) => { e.stopPropagation(); openEdit(o); }}
                    className="flex w-full items-center gap-1 truncate rounded bg-[#F7941D]/10 px-1.5 py-0.5 text-left text-[11px] font-medium text-[#9a5a00] hover:bg-[#F7941D]/20 dark:bg-[#F7941D]/15 dark:text-orange-200"
                    title={o.title}
                  >
                    {!o.all_day && <span className="tabular-nums text-[10px] opacity-70">{new Date(o.occurrence_date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>}
                    <span className="truncate">{o.title}</span>
                    {o.is_recurring && <Repeat className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />}
                  </button>
                ))}
                {dayEvents.length > 2 && <div className="px-1 text-[10px] text-gray-400">+{dayEvents.length - 2} więcej</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming */}
      <div className="mt-5 flex-1">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nadchodzące</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">Brak nadchodzących wydarzeń w tym widoku.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((o, i) => (
              <li key={`${o.id}-up-${i}`}>
                <button onClick={() => openEdit(o)} className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <div className="flex h-9 w-9 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D]">
                    <span className="text-[10px] uppercase leading-none">{MONTHS[new Date(o.occurrence_date).getMonth()].slice(0, 3)}</span>
                    <span className="text-sm font-bold leading-none">{new Date(o.occurrence_date).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{o.title}</span>
                      {o.is_recurring && <Repeat className="h-3 w-3 flex-shrink-0 text-gray-400" />}
                      {o.remind_minutes_before != null && <Bell className="h-3 w-3 flex-shrink-0 text-gray-400" />}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(o.occurrence_date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })} · {fmtTime(o.occurrence_date, o.all_day)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{form.id ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</h3>
              <button onClick={() => setForm(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tytuł (np. Wizyta u klienta)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
                Cały dzień
              </label>

              {form.allDay ? (
                <input
                  type="date"
                  value={toLocalDateInput(form.date)}
                  onChange={(e) => { const [y, m, d] = e.target.value.split('-').map(Number); setForm({ ...form, date: new Date(y, m - 1, d, 9, 0) }); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInput(form.date)}
                  onChange={(e) => setForm({ ...form, date: new Date(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Przypomnienie</label>
                  <select value={form.remind} onChange={(e) => setForm({ ...form, remind: e.target.value })} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {REMINDER_OPTIONS.map((o) => <option key={String(o.value)} value={o.value == null ? 'null' : String(o.value)}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Powtarzanie</label>
                  <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as CalendarRecurrence })} className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {form.recurrence !== 'none' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Powtarzaj do (opcjonalnie)</label>
                  <input type="date" value={form.recurrenceUntil} onChange={(e) => setForm({ ...form, recurrenceUntil: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                </div>
              )}

              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notatka (opcjonalnie)"
                rows={2}
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              {form.id && form.isRecurringExisting && (
                <p className="text-xs text-amber-600 dark:text-amber-400">To wydarzenie cykliczne — zmiany/usunięcie dotyczą całej serii.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-gray-700">
              {form.id ? (
                <button onClick={() => setConfirmDelete(true)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /> Usuń</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setForm(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Usuń wydarzenie"
        message="Czy na pewno usunąć to wydarzenie? Jeśli się powtarza, zniknie cała seria."
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
        onConfirm={doRemove}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  );
}
