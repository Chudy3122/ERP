import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api/boss-calendar.api';
import { BossCalendarEntry, CreateEntryPayload, EntryType } from '../types/boss-calendar.types';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, MapPin, AlignLeft } from 'lucide-react';
import { toast } from 'react-toastify';

const HOUR_START = 7;
const HOUR_END = 20;
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60;
const SLOT_PX = 60; // px per hour

const DAYS_PL = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const MONTHS_PL = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

const TYPE_CONFIG: Record<EntryType, { label: string; bg: string; border: string; text: string; dot: string }> = {
  meeting:   { label: 'Spotkanie',    bg: 'bg-orange-50',  border: 'border-orange-400', text: 'text-orange-800',  dot: 'bg-orange-400' },
  available: { label: 'Dostępny',     bg: 'bg-green-50',   border: 'border-green-400',  text: 'text-green-800',   dot: 'bg-green-400' },
  blocked:   { label: 'Niedostępny',  bg: 'bg-gray-100',   border: 'border-gray-400',   text: 'text-gray-600',    dot: 'bg-gray-400' },
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

const CAN_EDIT_ROLES = ['szef', 'sekretariat', 'admin'];

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

  useEffect(() => { load(); }, [load]);

  const openCreate = (date?: string) => {
    setEditingEntry(null);
    setForm({ ...EMPTY_FORM, date: date ?? formatDate(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (entry: BossCalendarEntry) => {
    setEditingEntry(entry);
    setForm({
      date: entry.date,
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
    if (!form.title.trim()) { toast.warning('Tytuł jest wymagany'); return; }
    if (!form.date || !form.start_time || !form.end_time) { toast.warning('Uzupełnij datę i godziny'); return; }
    if (toMinutes(form.start_time) >= toMinutes(form.end_time)) { toast.warning('Godzina końca musi być późniejsza niż start'); return; }

    setSaving(true);
    try {
      const payload: CreateEntryPayload = {
        ...form,
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
      .filter(e => e.date === dayStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const weekLabel = () => {
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${MONTHS_PL[s.getMonth()]} ${s.getFullYear()}`;
    }
    return `${s.getDate()} ${MONTHS_PL[s.getMonth()]} – ${e.getDate()} ${MONTHS_PL[e.getMonth()]} ${e.getFullYear()}`;
  };

  const todayStr = formatDate(new Date());

  return (
    <MainLayout title="Kalendarz Szefa">
      <div className="flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekStart(w => addDays(w, -7))}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-white min-w-[260px] text-center">
              {weekLabel()}
            </span>
            <button
              onClick={() => setWeekStart(w => addDays(w, 7))}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekStart(getMondayOf(new Date()))}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              Dziś
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
              {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG[EntryType]][]).map(([type, cfg]) => (
                <span key={type} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              ))}
            </div>
            {canEdit && (
              <button
                onClick={() => openCreate()}
                className="flex items-center gap-2 px-4 py-2 bg-[#F7941D] hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj wpis
              </button>
            )}
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">Ładowanie…</div>
          ) : (
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="border-r border-gray-200 dark:border-gray-700" />
                {weekDays.map((day, i) => {
                  const isToday = formatDate(day) === todayStr;
                  return (
                    <div
                      key={i}
                      className={`py-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{DAYS_PL[i]}</div>
                      <div className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-[#F7941D]' : 'text-gray-900 dark:text-white'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)]">
                {/* Hour labels */}
                <div className="border-r border-gray-200 dark:border-gray-700">
                  {hours.map(h => (
                    <div
                      key={h}
                      style={{ height: SLOT_PX }}
                      className="flex items-start justify-end pr-2 pt-1 text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/50"
                    >
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, di) => {
                  const dayStr = formatDate(day);
                  const isToday = dayStr === todayStr;
                  const dayEntries = entriesByDay(dayStr);

                  return (
                    <div
                      key={di}
                      className={`relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-orange-50/30 dark:bg-orange-900/5' : ''}`}
                      style={{ height: SLOT_PX * (HOUR_END - HOUR_START) }}
                    >
                      {/* Hour lines */}
                      {hours.map(h => (
                        <div
                          key={h}
                          style={{ top: (h - HOUR_START) * SLOT_PX }}
                          className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700/50"
                        />
                      ))}

                      {/* Half-hour lines */}
                      {hours.map(h => (
                        <div
                          key={`half-${h}`}
                          style={{ top: (h - HOUR_START) * SLOT_PX + SLOT_PX / 2 }}
                          className="absolute left-0 right-0 border-b border-dashed border-gray-100 dark:border-gray-700/30"
                        />
                      ))}

                      {/* Add click target (only for editors) */}
                      {canEdit && (
                        <div
                          className="absolute inset-0 cursor-pointer"
                          onClick={() => openCreate(dayStr)}
                        />
                      )}

                      {/* Events */}
                      {dayEntries.map(entry => {
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
                            style={{ top, height: Math.max(height, 22), left: 2, right: 2 }}
                            className={`absolute rounded border-l-4 px-1.5 py-1 overflow-hidden cursor-pointer select-none z-10 ${cfg.bg} ${cfg.border} hover:brightness-95 transition-all`}
                            onClick={e => { e.stopPropagation(); canEdit ? openEdit(entry) : undefined; }}
                          >
                            <div className={`text-xs font-semibold truncate ${cfg.text}`}>{entry.title}</div>
                            {height >= 36 && (
                              <div className={`text-xs truncate ${cfg.text} opacity-75`}>
                                {entry.start_time}–{entry.end_time}
                              </div>
                            )}
                            {height >= 52 && entry.location && (
                              <div className={`text-xs truncate ${cfg.text} opacity-60`}>{entry.location}</div>
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
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingEntry ? 'Edytuj wpis' : 'Nowy wpis'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Typ</label>
                <div className="flex gap-2">
                  {(Object.entries(TYPE_CONFIG) as [EntryType, typeof TYPE_CONFIG[EntryType]][]).map(([type, cfg]) => (
                    <button
                      key={type}
                      onClick={() => setForm(f => ({ ...f, type }))}
                      className={`flex-1 py-1.5 text-sm rounded-lg border-2 font-medium transition-all ${
                        form.type === type
                          ? `${cfg.border} ${cfg.bg} ${cfg.text}`
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tytuł *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Np. Spotkanie z klientem"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                />
              </div>

              {/* Date + times */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Od *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Do *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Miejsce
                </label>
                <input
                  type="text"
                  value={form.location ?? ''}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Np. Sala konferencyjna A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <AlignLeft className="w-3.5 h-3.5" /> Opis
                </label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Dodatkowe informacje…"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F7941D] resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              {editingEntry && (
                <button
                  onClick={() => setDeleteConfirm(editingEntry.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Usuń
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Anuluj
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-[#F7941D] hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {saving ? 'Zapisywanie…' : editingEntry ? 'Zapisz zmiany' : 'Dodaj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Usuń wpis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Czy na pewno chcesz usunąć ten wpis? Operacja jest nieodwracalna.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg"
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
