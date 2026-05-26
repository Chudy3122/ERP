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
type HistoryDateFilter = 'all' | 'week' | 'month';
type HistoryTypeFilter = 'all' | 'manual' | 'active';

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

function formatDurationValue(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
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

function getFilteredHistoryEntries(
  entries: TimeEntry[],
  dateFilter: HistoryDateFilter,
  typeFilter: HistoryTypeFilter,
) {
  const { start: weekStart, end: weekEnd } = getCurrentWeekRange();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  monthEnd.setHours(23, 59, 59, 999);

  return entries.filter((entry) => {
    const entryDate = new Date(entry.clock_in);
    const matchesDate = dateFilter === 'all'
      || (dateFilter === 'week' && entryDate >= weekStart && entryDate <= weekEnd)
      || (dateFilter === 'month' && entryDate >= monthStart && entryDate <= monthEnd);
    const matchesType = typeFilter === 'all'
      || (typeFilter === 'manual' && entry.is_manual)
      || (typeFilter === 'active' && entry.status === 'in_progress');

    return matchesDate && matchesType;
  });
}

// ─── Manual Entry Modal ───────────────────────────────────────────────────────
function ManualEntryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [date, setDate] = useState(todayStr());
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [clockInHours, clockInMinutes] = clockIn.split(':').map(Number);
  const [clockOutHours, clockOutMinutes] = clockOut.split(':').map(Number);
  const selectedStartMinutes = clockInHours * 60 + clockInMinutes;
  const selectedEndMinutes = clockOutHours * 60 + clockOutMinutes;
  const selectedDurationMinutes = selectedEndMinutes - selectedStartMinutes;
  const isInvalidTimeRange = selectedDurationMinutes <= 0;
  const formattedSelectedDate = new Date(`${date}T12:00:00`).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isInvalidTimeRange) {
      toast.error('Zakończenie musi być później niż rozpoczęcie');
      return;
    }

    setSaving(true);
    try {
      await timeApi.addManualEntry({ date, clockIn, clockOut, notes: notes || undefined });
      toast.success('Wpis został dodany');
      onClose();
      await onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#F7941D] dark:bg-orange-900/20">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Dodaj ręczny wpis</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Uzupełnij brakującą sesję czasu pracy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayStr()}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Rozpoczęcie</label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Zakończenie</label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                required
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white ${
                  isInvalidTimeRange
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800'
                    : 'border-gray-200 focus:border-[#F7941D] focus:ring-[#F7941D]/30 dark:border-gray-600'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notatka</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Praca zdalna, spotkanie..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className={`rounded-xl border p-4 ${
            isInvalidTimeRange
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300'
              : 'border-orange-200 bg-orange-50 text-gray-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-gray-200'
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Podsumowanie
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>{formattedSelectedDate}</span>
              <span className="font-mono font-semibold">{clockIn} - {clockOut}</span>
              <span className="font-semibold">
                {isInvalidTimeRange ? 'Nieprawidłowy zakres' : formatDurationValue(selectedDurationMinutes)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving || isInvalidTimeRange}
              className="flex-1 rounded-lg bg-[#F7941D] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:cursor-not-allowed disabled:opacity-60"
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
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<10 | 30 | 50>(10);
  const [historyDateFilter, setHistoryDateFilter] = useState<HistoryDateFilter>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<HistoryTypeFilter>('all');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>('week');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => { loadMyData(); }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyPageSize, historyDateFilter, historyTypeFilter]);

  useEffect(() => {
    const filteredCount = getFilteredHistoryEntries(
      entries,
      historyDateFilter,
      historyTypeFilter,
    ).length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / historyPageSize));
    if (historyPage > totalPages) {
      setHistoryPage(totalPages);
    }
  }, [entries, historyDateFilter, historyPage, historyPageSize, historyTypeFilter]);

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
  const todayEntries = dayStatus?.todayEntries ?? [];
  const plannedMinutes = (Number(user?.working_hours_per_day) || 8) * 60;
  const workedMinutes = Math.floor(elapsed / 60);
  const remainingMinutes = Math.max(0, plannedMinutes - workedMinutes);
  const statusLabel = state === 'working'
    ? 'W pracy'
    : state === 'paused'
    ? 'Pauza'
    : state === 'ended'
    ? 'Zakończono'
    : 'Nie rozpoczęto';
  const statusHint = state === 'working'
    ? currentEntry
      ? `Od ${formatTime(currentEntry.clock_in)}`
      : 'Aktywna sesja'
    : state === 'paused'
    ? 'Możesz wznowić lub zakończyć dzień'
    : state === 'ended'
    ? 'Dzień pracy został zamknięty'
    : 'Gotowe do rozpoczęcia';
  const todayEntryCountLabel = `${todayEntries.length} ${todayEntries.length === 1 ? 'wpis' : 'wpisów'}`;
  const filteredEntries = getFilteredHistoryEntries(entries, historyDateFilter, historyTypeFilter);
  const activeEntriesCount = filteredEntries.filter((entry) => entry.status === 'in_progress').length;
  const manualEntriesCount = filteredEntries.filter((entry) => entry.is_manual).length;
  const historyTotalMinutes = filteredEntries.reduce((sum, entry) => {
    if (entry.status === 'in_progress') return sum + Math.floor(elapsed / 60);
    return sum + (entry.duration_minutes || 0);
  }, 0);
  const historyTotalPages = Math.max(1, Math.ceil(filteredEntries.length / historyPageSize));
  const historyStartIndex = (historyPage - 1) * historyPageSize;
  const historyEndIndex = Math.min(historyStartIndex + historyPageSize, filteredEntries.length);
  const paginatedEntries = filteredEntries.slice(historyStartIndex, historyEndIndex);
  const historyRangeLabel = filteredEntries.length > 0
    ? `${historyStartIndex + 1}-${historyEndIndex} z ${filteredEntries.length}`
    : '0 z 0';
  const todayAttendanceIndex = attendance?.dates.findIndex((date) => date === todayStr()) ?? -1;
  const attendanceEmployeesCount = attendance?.users.length ?? 0;
  const attendanceDaysCount = attendance?.dates.length ?? 0;
  const isCurrentUserWorkingToday = state === 'working' && Boolean(currentEntry);
  const isAttendanceDayWorking = (day: AttendanceDay, employeeId: string) => {
    if (day.status === 'in_progress') return true;
    return Boolean(
      user?.id === employeeId &&
      day.date === todayStr() &&
      isCurrentUserWorkingToday,
    );
  };
  const currentlyWorkingCount = attendance && todayAttendanceIndex >= 0
    ? attendance.users.filter((employee) => {
        const day = employee.days[todayAttendanceIndex];
        return day ? isAttendanceDayWorking(day, employee.id) : false;
      }).length
    : 0;
  const completedTodayCount = attendance && todayAttendanceIndex >= 0
    ? attendance.users.filter((employee) => {
        const day = employee.days[todayAttendanceIndex];
        return day?.clock_in && !isAttendanceDayWorking(day, employee.id);
      }).length
    : 0;

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderClockPanel() {
    if (state === 'working' && currentEntry) {
      const autoEndTime = new Date(new Date(currentEntry.clock_in).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-[#F7941D] shadow-sm dark:border-orange-900/40 dark:bg-gray-800">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F7941D] animate-pulse" />
            W pracy
          </div>

          <div className="mt-5 rounded-2xl bg-white/80 px-8 py-5 shadow-sm ring-1 ring-orange-200/70 dark:bg-gray-800/80 dark:ring-orange-900/40">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Aktualna sesja
            </p>
            <div className="font-mono text-5xl font-black tracking-wider text-gray-900 dark:text-white">
              {formatElapsed(elapsed)}
            </div>
          </div>

          <div className="mt-4 grid w-full max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-orange-200/70 bg-white/70 p-3 dark:border-orange-900/40 dark:bg-gray-800/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Start
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {formatTime(currentEntry.clock_in)}
              </p>
            </div>
            <div className="rounded-xl border border-orange-200/70 bg-white/70 p-3 dark:border-orange-900/40 dark:bg-gray-800/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Auto-zakończenie
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {autoEndTime}
              </p>
            </div>
          </div>

          <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handlePause}
              disabled={clocking}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Pause className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Pauza'}
            </button>
            <button
              onClick={handleEndWork}
              disabled={clocking}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Square className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Zakończ pracę'}
            </button>
          </div>
        </div>
      );
    }

    if (state === 'paused') {
      return (
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-3 py-1 text-sm font-semibold text-yellow-700 shadow-sm dark:border-yellow-900/40 dark:bg-gray-800 dark:text-yellow-400">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            Praca zapauzowana
          </div>

          <div className="mt-5 rounded-2xl bg-white/80 px-8 py-5 shadow-sm ring-1 ring-yellow-200/70 dark:bg-gray-800/80 dark:ring-yellow-900/40">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Przepracowano dzisiaj
            </p>
            <div className="font-mono text-5xl font-black tracking-wider text-gray-800 dark:text-gray-200">
              {formatElapsed(elapsed)}
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Timer jest zatrzymany. Możesz wznowić pracę albo zakończyć dzień.
          </p>

          <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleResume}
              disabled={clocking}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60"
            >
              <Play className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Wznów pracę'}
            </button>
            <button
              onClick={handleEndWork}
              disabled={clocking}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Square className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Zakończ pracę'}
            </button>
          </div>
        </div>
      );
    }

    if (state === 'ended') {
      return (
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/40 dark:bg-gray-800 dark:text-emerald-400">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Praca zakończona na dziś
          </div>

          <div className="mt-5 rounded-2xl bg-white/80 px-8 py-5 shadow-sm ring-1 ring-emerald-200/70 dark:bg-gray-800/80 dark:ring-emerald-900/40">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Przepracowano dzisiaj
            </p>
            <div className="font-mono text-5xl font-black tracking-wider text-gray-800 dark:text-gray-200">
              {formatElapsed(elapsed)}
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Dzień pracy został zamknięty. W razie potrzeby możesz zalogować kolejną sesję.
          </p>

          <button
            onClick={handleStartWork}
            disabled={clocking}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60"
          >
            <Play className="w-5 h-5" />
            {clocking ? 'Zapisywanie...' : 'Zaloguj ponownie'}
          </button>
        </div>
      );
    }

    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
          <Clock className="h-7 w-7" />
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Nie jesteś aktualnie zalogowany do pracy
        </p>
        <button
          onClick={handleStartWork}
          disabled={clocking}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60"
        >
          <Play className="w-5 h-5" />
          {clocking ? 'Zapisywanie...' : 'Rozpocznij pracę'}
        </button>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Pierwsze wejście dnia zaokrąglane do 15 min w dół
        </p>
      </div>
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

      <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
            {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Czas pracy</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Rejestracja czasu pracy — pierwsze rozpoczęcie dnia pracy zaokrąglone do 15 minut
          </p>
        </div>
        <button
          onClick={() => setShowManualEntry(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status dnia
                </p>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  state === 'working'
                    ? 'bg-[#F7941D] animate-pulse'
                    : state === 'paused'
                    ? 'bg-yellow-400'
                    : state === 'ended'
                    ? 'bg-emerald-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusLabel}</p>
              <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{statusHint}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Dzisiaj
                </p>
                <Clock className="h-4 w-4 text-[#F7941D]" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDurationValue(workedMinutes)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{todayEntryCountLabel}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Plan wg etatu
                </p>
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDurationValue(plannedMinutes)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Na podstawie ustawień użytkownika</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Do planu
                </p>
                <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDurationValue(remainingMinutes)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {workedMinutes >= plannedMinutes ? 'Plan dnia osiągnięty' : 'Pozostało do planu'}
              </p>
            </div>
          </div>

          {/* Clock widget */}
          <div className={`rounded-xl border p-6 text-center shadow-sm transition-colors lg:p-8 ${widgetBorderClass}`}>
            {loadingMy ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#F7941D] rounded-full" />
              </div>
            ) : renderClockPanel()}
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#F7941D] dark:bg-orange-900/20">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historia wpisów</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ostatnie zarejestrowane sesje czasu pracy
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {filteredEntries.length} wpisów
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                  {formatDurationValue(historyTotalMinutes)}
                </span>
                {manualEntriesCount > 0 && (
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                    Ręczne: {manualEntriesCount}
                  </span>
                )}
                {activeEntriesCount > 0 && (
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 font-medium text-[#F7941D] dark:bg-orange-900/20">
                    Aktywne: {activeEntriesCount}
                  </span>
                )}
                <label className="flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <span>Na stronie</span>
                  <select
                    value={historyPageSize}
                    onChange={(e) => setHistoryPageSize(Number(e.target.value) as 10 | 30 | 50)}
                    className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none dark:text-gray-200"
                  >
                    <option value={10}>10</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
            </div>
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    { value: 'all', label: 'Wszystkie' },
                    { value: 'week', label: 'Ten tydzień' },
                    { value: 'month', label: 'Ten miesiąc' },
                  ] as { value: HistoryDateFilter; label: string }[]).map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setHistoryDateFilter(filter.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        historyDateFilter === filter.value
                          ? 'bg-[#F7941D] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

                <div className="flex flex-wrap items-center gap-2">
                  {([
                    { value: 'all', label: 'Wszystkie typy' },
                    { value: 'manual', label: 'Ręczne' },
                    { value: 'active', label: 'Aktywne' },
                  ] as { value: HistoryTypeFilter; label: string }[]).map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setHistoryTypeFilter(filter.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        historyTypeFilter === filter.value
                          ? 'bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900'
                          : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loadingMy ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#F7941D] rounded-full" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brak wpisów</p>
                <p className="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
                  Po rozpoczęciu pracy albo dodaniu ręcznego wpisu historia pojawi się w tym miejscu.
                </p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brak wpisów dla wybranych filtrów</p>
                <p className="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
                  Zmień zakres albo typ wpisu, żeby zobaczyć inne pozycje historii.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryDateFilter('all');
                    setHistoryTypeFilter('all');
                  }}
                  className="mt-4 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Wyczyść filtry
                </button>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-400">
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
                      {paginatedEntries.map((entry) => (
                        <tr key={entry.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                              <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#F7941D] dark:bg-orange-900/20">
                                W pracy
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                            {entry.status === 'in_progress'
                              ? <span className="font-mono font-semibold text-[#F7941D]">{formatElapsed(elapsed)}</span>
                              : formatDuration(entry.duration_minutes)
                            }
                          </td>
                          <td className="px-4 py-3 text-center">
                            {entry.is_manual ? (
                              <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                                Ręczny
                              </span>
                            ) : entry.is_break ? (
                              <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                                Pauza
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                Automatyczny
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              entry.status === 'in_progress'
                                ? 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20'
                                : entry.status === 'approved'
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                : entry.status === 'rejected'
                                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Wyświetlane: <span className="font-semibold text-gray-700 dark:text-gray-200">{historyRangeLabel}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                      disabled={historyPage === 1}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Poprzednia
                    </button>
                    <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {historyPage} / {historyTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                      disabled={historyPage === historyTotalPages}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Następna
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Frekwencja pracowników</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Podgląd obecności i czasu pracy w wybranym zakresie
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {([
                  { value: 'week', label: 'Bieżący tydzień' },
                  { value: '14', label: '14 dni' },
                  { value: '30', label: '30 dni' },
                ] as { value: AttendanceRange; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAttendanceRange(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      attendanceRange === value
                        ? 'bg-[#F7941D] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Pracownicy</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{attendanceEmployeesCount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Dni w zakresie</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{attendanceDaysCount}</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Aktualnie w pracy</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{currentlyWorkingCount}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Zakończone dziś</p>
                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{completedTodayCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Legenda:</span>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F7941D]" /> Aktualnie w pracy</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Zakończona zmiana</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" /> Brak wpisu</div>
          </div>

          {loadingAttendance ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#F7941D] rounded-full" />
            </div>
          ) : attendance && attendance.users.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-14 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brak danych frekwencji</p>
              <p className="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
                Dla wybranego zakresu nie znaleziono pracowników ani wpisów obecności.
              </p>
            </div>
          ) : attendance ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="sticky left-0 z-20 min-w-[190px] border-r border-gray-100 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400">
                        Pracownik
                      </th>
                      {attendance.dates.map((date) => {
                        const { day, date: dateLabel } = formatDateHeader(date);
                        const isToday = date === todayStr();
                        return (
                          <th key={date} className={`min-w-[118px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                            isToday
                              ? 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
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
                        <td className={`sticky left-0 z-10 border-r border-gray-100 px-4 py-3 dark:border-gray-700 ${
                          i % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}>
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
                          const isWorking = isAttendanceDayWorking(day, u.id);
                          const isToday = day.date === todayStr();
                          const displayClockIn = isToday && u.id === user?.id && currentEntry
                            ? currentEntry.clock_in
                            : day.clock_in;
                          return (
                            <td key={day.date} className={`px-3 py-2 text-center ${isToday ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                              {displayClockIn ? (
                                <div className={`inline-flex min-w-[96px] flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs shadow-sm ${
                                  isWorking
                                    ? 'border-[#F7941D]/30 bg-orange-50 text-[#F7941D] dark:bg-orange-900/10'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400'
                                }`}>
                                  <div className="flex items-center gap-1 font-mono font-medium">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-[#F7941D] animate-pulse' : 'bg-emerald-500'}`} />
                                    {formatTime(displayClockIn)}
                                    {!isWorking && day.clock_out && ` – ${formatTime(day.clock_out)}`}
                                  </div>
                                  <div className="text-[10px] opacity-70">
                                    {isWorking ? 'W pracy' : formatDuration(day.duration_minutes)}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex min-w-[96px] items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs font-medium text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600">
                                  Brak
                                </span>
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
      </div>
    </MainLayout>
  );
}
