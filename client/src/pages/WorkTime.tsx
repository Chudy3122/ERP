import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Pause, Play, Square, Clock, Users, Calendar, PlusCircle, X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import * as timeApi from '../api/time.api';
import type { TimeEntry, DayStatus, DayState } from '../types/time.types';

// ─── Attendance types ───────────────────────────────────────────────────────
interface AttendanceDay {
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  duration_minutes: number | null;
  status: string | null;
}
interface AttendanceUser {
  id: string;
  first_name: string;
  last_name: string;
  days: AttendanceDay[];
}
interface AttendanceData {
  users: AttendanceUser[];
  dates: string[];
}
type AttendanceRange = 'week' | '14' | '30';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return getLocalDateKey(new Date());
}

function getCurrentWeekRange() {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getAttendanceRequestParams(range: AttendanceRange) {
  if (range !== 'week') return Number(range);
  const { start, end } = getCurrentWeekRange();
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function formatTime(date: string | Date | null) {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number | null) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr);
  if (dateStr === todayStr()) return { day: 'Dziś', date: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) };
  return {
    day: d.toLocaleDateString('pl-PL', { weekday: 'short' }),
    date: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
  };
}

// ─── Manual Entry Modal ───────────────────────────────────────────────────────
function ManualEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(todayStr());
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await timeApi.addManualEntry({ date, clockIn, clockOut, notes: notes || undefined });
      toast.success('Wpis został dodany');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[#F7941D]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Dodaj ręczny wpis</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayStr()}
              required
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Rozpoczęcie</label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Zakończenie</label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Notatka (opcjonalnie)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Praca zdalna, spotkanie..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#F7941D] hover:bg-[#e08317] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? 'Zapisywanie...' : 'Dodaj wpis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkTime() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'attendance'>('my');

  // Day state machine
  const [dayStatus, setDayStatus] = useState<DayStatus | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [clocking, setClocking] = useState(false);
  const [loadingMy, setLoadingMy] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>('week');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => { loadMyData(); }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // base = sum of completed segments from actual timestamps (exact seconds, no rounding)
    const base = (dayStatus?.todayEntries ?? [])
      .filter((e) => e.clock_out)
      .reduce((sum, e) => sum + Math.floor(
        (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 1000
      ), 0);

    if (dayStatus?.state === 'working' && dayStatus?.currentEntry) {
      const clockInMs = new Date(dayStatus.currentEntry.clock_in).getTime();
      const tick = () => setElapsed(base + Math.floor((Date.now() - clockInMs) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      // paused / ended / not_started — freeze on total accumulated time
      setElapsed(base);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dayStatus?.state, dayStatus?.currentEntry?.id, dayStatus?.totalWorkedMinutesToday]);

  useEffect(() => {
    if (activeTab === 'attendance') loadAttendance();
  }, [activeTab, attendanceRange]);

  async function loadMyData() {
    setLoadingMy(true);
    try {
      const [status, hist] = await Promise.all([
        timeApi.getDayStatus(),
        timeApi.getUserTimeEntries(),
      ]);
      setDayStatus(status);
      setEntries(hist);
    } catch {
      toast.error('Błąd ładowania danych');
    } finally {
      setLoadingMy(false);
    }
  }

  async function loadAttendance() {
    setLoadingAttendance(true);
    try {
      const data = await timeApi.getAttendance(getAttendanceRequestParams(attendanceRange));
      setAttendance(data);
    } catch {
      toast.error('Błąd ładowania frekwencji');
    } finally {
      setLoadingAttendance(false);
    }
  }

  // ── Action handlers ───────────────────────────────────────────────────────
  async function handleStartWork() {
    setClocking(true);
    try {
      const entry = await timeApi.clockIn({ notes: 'Rozpoczęcie pracy' });
      toast.success(`Rozpoczęto pracę o ${formatTime(entry.clock_in)}`);
      await loadMyData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setClocking(false);
    }
  }

  async function handleResume() {
    setClocking(true);
    try {
      const entry = await timeApi.clockIn({ notes: 'Wznowienie pracy' });
      toast.success(`Wznowiono pracę o ${formatTime(entry.clock_in)}`);
      await loadMyData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setClocking(false);
    }
  }

  async function handlePause() {
    setClocking(true);
    try {
      const entry = await timeApi.pauseWork();
      toast.success(`Praca zapauzowana o ${formatTime(entry.clock_out)}`);
      await loadMyData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setClocking(false);
    }
  }

  async function handleEndWork() {
    setClocking(true);
    try {
      const entry = await timeApi.endWork();
      const msg = entry.clock_out
        ? `Zakończono pracę o ${formatTime(entry.clock_out)}`
        : 'Dzień pracy zakończony';
      toast.success(msg);
      await loadMyData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setClocking(false);
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const state: DayState = dayStatus?.state ?? 'not_started';
  const currentEntry = dayStatus?.currentEntry ?? null;

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderClockWidget() {
    if (state === 'working' && currentEntry) {
      return (
        <>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D] animate-pulse" />
            <p className="text-sm font-semibold text-[#F7941D]">W pracy od {formatTime(currentEntry.clock_in)}</p>
          </div>
          <div className="text-5xl font-black font-mono tracking-wider text-gray-900 dark:text-white my-4">
            {formatElapsed(elapsed)}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Auto-zakończenie o {new Date(new Date(currentEntry.clock_in).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handlePause}
              disabled={clocking}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Pause className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Pauza'}
            </button>
            <button
              onClick={handleEndWork}
              disabled={clocking}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Square className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Zakończ pracę'}
            </button>
          </div>
        </>
      );
    }

    if (state === 'paused') {
      return (
        <>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Praca zapauzowana</p>
          </div>
          <div className="text-5xl font-black font-mono tracking-wider text-gray-700 dark:text-gray-300 my-4">
            {formatElapsed(elapsed)}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Przepracowano dzisiaj łącznie</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleResume}
              disabled={clocking}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#F7941D] hover:bg-[#e08317] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm hover:shadow-md"
            >
              <Play className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Wznów pracę'}
            </button>
            <button
              onClick={handleEndWork}
              disabled={clocking}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Square className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Zakończ pracę'}
            </button>
          </div>
        </>
      );
    }

    if (state === 'ended') {
      return (
        <>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Praca zakończona na dziś</p>
          </div>
          <div className="text-5xl font-black font-mono tracking-wider text-gray-700 dark:text-gray-300 my-4">
            {formatElapsed(elapsed)}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Przepracowano dzisiaj łącznie</p>
          <button
            onClick={handleStartWork}
            disabled={clocking}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#F7941D] hover:bg-[#e08317] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm hover:shadow-md"
          >
            <Play className="w-5 h-5" />
            {clocking ? 'Zapisywanie...' : 'Zaloguj ponownie'}
          </button>
        </>
      );
    }

    // not_started
    return (
      <>
        <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
          Nie jesteś aktualnie zalogowany do pracy
        </p>
        <button
          onClick={handleStartWork}
          disabled={clocking}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#F7941D] hover:bg-[#e08317] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm hover:shadow-md"
        >
          <Play className="w-5 h-5" />
          {clocking ? 'Zapisywanie...' : 'Rozpocznij pracę'}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Pierwsze wejście dnia zaokrąglane do 15 min (w dół)
        </p>
      </>
    );
  }

  const widgetBorderClass = state === 'working'
    ? 'border-[#F7941D] bg-orange-50 dark:bg-orange-900/10'
    : state === 'paused'
    ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10'
    : state === 'ended'
    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';

  return (
    <MainLayout title="Czas pracy">
      {showManualEntry && (
        <ManualEntryModal onClose={() => setShowManualEntry(false)} onSaved={loadMyData} />
      )}

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Czas pracy</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Rejestracja czasu pracy — pierwsze rozpoczęcie dnia zaokrąglone do 15 minut
          </p>
        </div>
        <button
          onClick={() => setShowManualEntry(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-[#F7941D]" />
          Dodaj ręcznie
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'my', label: 'Mój czas pracy', icon: Clock },
            { id: 'attendance', label: 'Frekwencja pracowników', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'my' | 'attendance')}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-[#F7941D] text-[#F7941D]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── MY TIME TAB ── */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {/* Clock widget */}
          <div className={`rounded-xl border-2 p-6 text-center transition-colors ${widgetBorderClass}`}>
            {loadingMy ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#F7941D] rounded-full" />
              </div>
            ) : renderClockWidget()}
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Historia wpisów</h3>
              </div>
            </div>
            {loadingMy ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#F7941D] rounded-full" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Brak wpisów</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-center">Rozpoczęcie</th>
                      <th className="px-4 py-3 text-center">Zakończenie</th>
                      <th className="px-4 py-3 text-center">Czas pracy</th>
                      <th className="px-4 py-3 text-center">Typ</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {new Date(entry.clock_in).toLocaleDateString('pl-PL', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 font-mono">
                          {formatTime(entry.clock_in)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 font-mono">
                          {entry.clock_out ? formatTime(entry.clock_out) : (
                            <span className="text-[#F7941D] font-semibold">W pracy</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                          {entry.status === 'in_progress'
                            ? <span className="text-[#F7941D]">{formatElapsed(elapsed)}</span>
                            : formatDuration(entry.duration_minutes)
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          {entry.is_manual ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                              Ręczny
                            </span>
                          ) : entry.is_break ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                              Pauza
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.status === 'in_progress'
                              ? 'bg-orange-100 text-[#F7941D]'
                              : entry.status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : entry.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {entry.status === 'in_progress' ? 'W pracy'
                              : entry.status === 'approved' ? 'Zatwierdzone'
                              : entry.status === 'rejected' ? 'Odrzucone'
                              : 'Zakończone'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Frekwencja pracowników</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Zakres:</span>
              {([
                { value: 'week', label: 'Bieżący tydzień' },
                { value: '14', label: '14 dni' },
                { value: '30', label: '30 dni' },
              ] as { value: AttendanceRange; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setAttendanceRange(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    attendanceRange === value
                      ? 'bg-[#F7941D] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F7941D]" /> Aktualnie w pracy</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Zakończona zmiana</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" /> Nieobecny</div>
          </div>

          {loadingAttendance ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#F7941D] rounded-full" />
            </div>
          ) : attendance ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 min-w-[160px]">
                        Pracownik
                      </th>
                      {attendance.dates.map((date) => {
                        const { day, date: dateLabel } = formatDateHeader(date);
                        const isToday = date === todayStr();
                        return (
                          <th key={date} className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[110px] ${isToday ? 'text-[#F7941D]' : 'text-gray-500 dark:text-gray-400'}`}>
                            <div>{day}</div>
                            <div className="font-normal normal-case">{dateLabel}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {attendance.users.map((u, i) => (
                      <tr key={u.id} className={`${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'} ${u.id === user?.id ? 'ring-1 ring-inset ring-[#F7941D]/30' : ''}`}>
                        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800 z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#F7941D]/10 text-[#F7941D] flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {u.first_name[0]}{u.last_name[0]}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                              {u.first_name} {u.last_name}
                              {u.id === user?.id && (
                                <span className="ml-1.5 text-[10px] text-[#F7941D] bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">Ty</span>
                              )}
                            </span>
                          </div>
                        </td>
                        {u.days.map((day) => {
                          const isWorking = day.status === 'in_progress';
                          return (
                            <td key={day.date} className="px-3 py-2 text-center">
                              {day.clock_in ? (
                                <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs min-w-[90px] ${
                                  isWorking
                                    ? 'bg-orange-50 dark:bg-orange-900/10 border-[#F7941D]/30 text-[#F7941D]'
                                    : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  <div className="flex items-center gap-1 font-mono font-medium">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-[#F7941D] animate-pulse' : 'bg-emerald-500'}`} />
                                    {formatTime(day.clock_in)}
                                    {day.clock_out && ` – ${formatTime(day.clock_out)}`}
                                  </div>
                                  <div className="text-[10px] opacity-70">
                                    {isWorking ? 'W pracy' : formatDuration(day.duration_minutes)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-lg">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </MainLayout>
  );
}
