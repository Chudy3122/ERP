import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Pause, Play, Square, Clock, Users, Calendar, PlusCircle, X, Pencil, Loader2, Trash2, Smartphone, Monitor, Tablet } from 'lucide-react';
import toast from 'react-hot-toast';
import * as timeApi from '../api/time.api';
import * as userApi from '../api/user.api';
import type { TimeEntry, DayStatus, DayState, LeaveRequest } from '../types/time.types';
import { LeaveStatus, LeaveType } from '../types/time.types';
import { getFileUrl } from '../api/axios-config';
import {
  isMobileTimeTrackingBlocked,
  MOBILE_TIME_TRACKING_BLOCK_MESSAGE,
} from '../utils/timeTrackingAccess';

// Small icon showing which device a clock-in came from (phone vs computer).
// Helps managers spot people clocking in remotely from their phone.
function DeviceBadge({ device, ip }: { device?: string | null; ip?: string | null }) {
  if (!device) return null;
  const label = device === 'mobile' ? 'Telefon' : device === 'tablet' ? 'Tablet' : 'Komputer';
  const title = label + (ip ? ` · ${ip}` : '');
  const icon = device === 'mobile'
    ? <Smartphone className="h-3.5 w-3.5 text-amber-500" />
    : device === 'tablet'
    ? <Tablet className="h-3.5 w-3.5 text-amber-500" />
    : <Monitor className="h-3.5 w-3.5 text-gray-400" />;
  return <span className="inline-flex" title={title} aria-label={label}>{icon}</span>;
}

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
  avatar_url: string | null;
  days: AttendanceDay[];
}
interface AttendanceData {
  users: AttendanceUser[];
  dates: string[];
}
interface AttendanceLeaveInfo {
  label: string;
  type: LeaveType;
  status: string;
}
type AttendanceRange = 'week' | '2weeks' | '4weeks';
type AttendanceSort = 'first_name' | 'last_name';
type HistoryDateFilter = 'all' | 'week' | 'month';
type HistoryTypeFilter = 'all' | 'manual' | 'active';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return getLocalDateKey(new Date());
}

function getDateKey(value: string | Date) {
  if (typeof value === 'string') {
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) return dateMatch[0];
  }

  return getLocalDateKey(new Date(value));
}

function isWeekendDate(date: string) {
  const day = new Date(`${getDateKey(date)}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function getAttendanceLeaveLabel(type: LeaveType) {
  switch (type) {
    case LeaveType.VACATION:
      return 'Urlop wypoczynkowy';
    case LeaveType.PERSONAL:
      return 'Urlop na żądanie';
    case LeaveType.SICK_LEAVE:
      return 'L4';
    case LeaveType.UNPAID:
      return 'Urlop bezpłatny';
    case LeaveType.PARENTAL:
      return 'Urlop rodzicielski';
    case LeaveType.MATERNITY:
      return 'Urlop macierzyński';
    case LeaveType.PATERNITY:
      return 'Urlop ojcowski';
    case LeaveType.REMOTE_WORK:
      return 'Praca zdalna';
    case LeaveType.CARE:
      return 'Urlop opiekuńczy';
    case LeaveType.CHILDCARE_188:
      return 'Opieka nad dzieckiem do 14 lat';
    case LeaveType.OCCASIONAL:
    case LeaveType.OCCASIONAL_HOURLY:
      return 'Okolicznościowy';
    case LeaveType.HOLIDAY_SATURDAY:
      return 'Dzień wolny za święto w sobotę';
    default:
      return 'Inna nieobecność';
  }
}

function getAttendanceLeaveStatusLabel(status: string) {
  if (status === LeaveStatus.PENDING) return 'oczekuje';
  if (status === LeaveStatus.APPROVED) return 'zatwierdzone';
  return 'nieobecność';
}

function getAttendanceLeaveStatusClass(status: string) {
  if (status === LeaveStatus.APPROVED) return 'text-emerald-700 dark:text-emerald-300';
  if (status === LeaveStatus.PENDING) return 'text-amber-700 dark:text-amber-300';
  return 'opacity-70';
}

function getAttendanceLeaveClass(type: LeaveType) {
  return type === LeaveType.REMOTE_WORK
    ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
    : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
}

const WORKING_STATUS_CLASSES = 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';

function getCurrentWeekRange(weeks = 1) {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + weeks * 7 - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getAttendanceRequestParams(range: AttendanceRange) {
  const weeks = range === '4weeks' ? 4 : range === '2weeks' ? 2 : 1;
  const { start, end } = getCurrentWeekRange(weeks);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function formatAttendanceRangeLabel(range: AttendanceRange) {
  const weeks = range === '4weeks' ? 4 : range === '2weeks' ? 2 : 1;
  const { start, end } = getCurrentWeekRange(weeks);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const startFormat: Intl.DateTimeFormatOptions = sameMonth
    ? { day: 'numeric' }
    : sameYear
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
  const endFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

  return `${start.toLocaleDateString('pl-PL', startFormat)} - ${end.toLocaleDateString('pl-PL', endFormat)}`;
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
function ManualEntryModal({
  onClose,
  onSaved,
  users,
  isTimeTrackingBlocked = false,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
  users: { id: string; first_name: string; last_name: string }[];
  isTimeTrackingBlocked?: boolean;
}) {
  const [date, setDate] = useState(todayStr());
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [mode, setMode] = useState<'full' | 'start'>('full');
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
    if (!targetUser) {
      toast.error('Wybierz pracownika');
      return;
    }
    if (mode === 'full' && isInvalidTimeRange) {
      toast.error('Zakończenie musi być później niż rozpoczęcie');
      return;
    }
    if (mode === 'start' && isTimeTrackingBlocked) {
      toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      if (mode === 'start') {
        const [y, mo, d] = date.split('-').map(Number);
        const [h, mi] = clockIn.split(':').map(Number);
        const startDate = new Date(y, mo - 1, d, h, mi, 0, 0);
        if (startDate.getTime() > Date.now()) {
          toast.error('Godzina rozpoczęcia nie może być w przyszłości');
          setSaving(false);
          return;
        }
        await timeApi.clockIn({ clockInTime: startDate.toISOString(), userId: targetUser, notes: notes || 'Rozpoczęcie (ręczne)' });
        toast.success('Timer uruchomiony dla pracownika');
      } else {
        await timeApi.addManualEntry({ date, clockIn, clockOut, notes: notes || undefined, userId: targetUser });
        toast.success('Wpis został dodany');
      }
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
              <h2 className="font-semibold text-gray-900 dark:text-white">Wpis za pracownika</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {mode === 'full'
                  ? 'Uzupełnij kompletną sesję (od–do) dla wybranej osoby.'
                  : 'Wpisz godzinę rozpoczęcia — uruchomi timer u pracownika.'}
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pracownik *</label>
            <select
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">— wybierz —</option>
              {[...users]
                .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'pl'))
                .map(u => <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>)}
            </select>
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'full' ? 'bg-[#F7941D] text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Pełna sesja (od–do)
            </button>
            <button
              type="button"
              onClick={() => setMode('start')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'start' ? 'bg-[#F7941D] text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              Tylko start (timer)
            </button>
          </div>
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
          <div className={`grid gap-3 ${mode === 'full' ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
            {mode === 'full' && (
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
            )}
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

          {mode === 'full' ? (
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
          ) : (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-gray-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Podsumowanie</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span>{formattedSelectedDate}</span>
                <span className="font-mono font-semibold">start {clockIn}</span>
                <span className="font-semibold">timer leci do zakończenia</span>
              </div>
            </div>
          )}

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
              disabled={saving || (mode === 'full' && isInvalidTimeRange) || (mode === 'start' && isTimeTrackingBlocked)}
              className="flex-1 rounded-lg bg-[#F7941D] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Zapisywanie...' : mode === 'start' ? 'Uruchom timer' : 'Dodaj wpis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Start-from-time Modal (backdated clock-in → live timer) ──────────────────
function StartFromTimeModal({
  onClose,
  onStarted,
  isTimeTrackingBlocked = false,
}: {
  onClose: () => void;
  onStarted: () => Promise<void>;
  isTimeTrackingBlocked?: boolean;
}) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState(hhmm);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isTimeTrackingBlocked) {
      toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
      return;
    }

    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = start.split(':').map(Number);
    const startDate = new Date(y, mo - 1, d, h, mi, 0, 0);
    if (startDate.getTime() > Date.now()) {
      toast.error('Godzina rozpoczęcia nie może być w przyszłości');
      return;
    }
    setSaving(true);
    try {
      await timeApi.clockIn({ clockInTime: startDate.toISOString(), notes: 'Rozpoczęcie (ręczne)' });
      toast.success('Praca rozpoczęta — timer leci od podanej godziny');
      onClose();
      await onStarted();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Nie udało się rozpocząć');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#F7941D] dark:bg-orange-900/20">
            <Play className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Rozpocznij od godziny</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Zapomniałeś kliknąć start? Wpisz godzinę rozpoczęcia — timer poleci od niej.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Data</label>
              <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Godzina startu</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Anuluj</button>
            <button type="submit" disabled={saving || isTimeTrackingBlocked} className="flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-medium text-white hover:bg-[#e08317] disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Rozpocznij
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
  const isTimeTrackingBlocked = isMobileTimeTrackingBlocked(user?.email);
  // Remember the last open tab across refreshes (e.g. stay on "Wszystkie czasy pracy").
  const [activeTab, setActiveTab] = useState<'my' | 'attendance' | 'all'>(() => {
    const saved = localStorage.getItem('workTime:activeTab');
    return saved === 'attendance' || saved === 'all' ? saved : 'my';
  });

  // Day state machine
  const [dayStatus, setDayStatus] = useState<DayStatus | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [clocking, setClocking] = useState(false);
  const [loadingMy, setLoadingMy] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showStartManual, setShowStartManual] = useState(false);
  const [managerUsers, setManagerUsers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState<10 | 30 | 50>(10);
  const [historyDateFilter, setHistoryDateFilter] = useState<HistoryDateFilter>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<HistoryTypeFilter>('all');
  const [editNotesEntry, setEditNotesEntry] = useState<TimeEntry | null>(null);
  const [editNotesValue, setEditNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  // Ręczne wpisy czasu są dostępne wyłącznie dla administratorów i księgowości.
  const isManager = user?.role === 'admin' || user?.role === 'kadry';
  // Frekwencja pracowników: zarząd / kadry / księgowość / kierownik — nie zwykli pracownicy.
  const canViewAttendance = ['admin', 'szef', 'kadry', 'ksiegowosc', 'kierownik'].includes(user?.role || '');

  // Persist the active tab; if a restored tab isn't allowed for this role, fall back to "my".
  useEffect(() => { localStorage.setItem('workTime:activeTab', activeTab); }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'all' && !isManager) setActiveTab('my');
    else if (activeTab === 'attendance' && !canViewAttendance) setActiveTab('my');
  }, [isManager, canViewAttendance]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({ clock_in: '', clock_out: '', notes: '' });
  const [savingEntry, setSavingEntry] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attendanceLeaveRequests, setAttendanceLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>('week');
  const [attendanceSort, setAttendanceSort] = useState<AttendanceSort>('first_name');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // All-entries tab (admin/kadry): edit everyone's work time
  const monthStartStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })();
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allFrom, setAllFrom] = useState(monthStartStr);
  const [allTo, setAllTo] = useState(todayStr());
  const [allSearch, setAllSearch] = useState('');
  const [summaryUserId, setSummaryUserId] = useState('');
  const [allTypeFilter, setAllTypeFilter] = useState<'all' | 'auto' | 'manual'>('all');
  const [allStatusFilter, setAllStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [allSort, setAllSort] = useState<'date_desc' | 'date_asc' | 'name' | 'duration_desc'>('date_desc');
  const [allPage, setAllPage] = useState(1);
  const [allPageSize, setAllPageSize] = useState<10 | 30 | 50>(30);

  async function loadAllEntries() {
    setAllLoading(true);
    try {
      const data = await timeApi.getAllTimeEntries(allFrom || undefined, allTo ? `${allTo}T23:59:59` : undefined);
      setAllEntries(data);
    } catch {
      setAllEntries([]);
    } finally {
      setAllLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'all' && isManager) loadAllEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, allFrom, allTo]);

  useEffect(() => { setAllPage(1); }, [allSearch, allTypeFilter, allStatusFilter, allSort, allPageSize, allFrom, allTo]);

  useEffect(() => { loadMyData(); }, []);

  useEffect(() => {
    if (isManager && managerUsers.length === 0) {
      userApi.getDirectory().then(u => setManagerUsers(u as any)).catch(() => {});
    }
  }, [isManager]);

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
      const tick = () => setElapsed(Math.max(0, base + Math.floor((Date.now() - clockInMs) / 1000)));
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      // paused / ended / not_started — freeze on total accumulated time
      setElapsed(base);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [dayStatus?.state, dayStatus?.currentEntry?.id, dayStatus?.totalWorkedMinutesToday]);

  useEffect(() => {
    if (activeTab === 'attendance' && canViewAttendance) loadAttendance();
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

  async function handleSaveNotes() {
    if (!editNotesEntry) return;
    setSavingNotes(true);
    try {
      await timeApi.updateEntryNotes(editNotesEntry.id, editNotesValue);
      toast.success('Opis zapisany');
      setEditNotesEntry(null);
      setEditNotesValue('');
      await loadMyData();
    } catch {
      toast.error('Nie udało się zapisać opisu');
    } finally {
      setSavingNotes(false);
    }
  }

  function openEditEntry(entry: TimeEntry) {
    if (!isManager) return;

    const toLocalInput = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEditForm({
      clock_in: toLocalInput(entry.clock_in),
      clock_out: toLocalInput(entry.clock_out),
      notes: entry.notes || '',
    });
    setEditEntry(entry);
  }

  async function handleSaveEntry() {
    if (!isManager || !editEntry) return;
    if (!editForm.clock_in) { toast.error('Podaj godzinę rozpoczęcia'); return; }
    if (editForm.clock_out && new Date(editForm.clock_out) < new Date(editForm.clock_in)) {
      toast.error('Zakończenie musi być później niż rozpoczęcie');
      return;
    }
    setSavingEntry(true);
    try {
      await timeApi.updateTimeEntry(editEntry.id, {
        clock_in: new Date(editForm.clock_in).toISOString(),
        clock_out: editForm.clock_out ? new Date(editForm.clock_out).toISOString() : null,
        notes: editForm.notes,
      });
      toast.success('Wpis zaktualizowany');
      setEditEntry(null);
      await loadMyData();
      if (activeTab === 'all') await loadAllEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Nie udało się zapisać wpisu');
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleDeleteEntry() {
    if (!isManager || !deleteEntryId) return;
    try {
      await timeApi.deleteTimeEntry(deleteEntryId);
      toast.success('Wpis usunięty');
      await loadMyData();
      if (activeTab === 'all') await loadAllEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Nie udało się usunąć wpisu');
    } finally {
      setDeleteEntryId(null);
    }
  }

  async function loadAttendance() {
    setLoadingAttendance(true);
    try {
      const [data, leaveRequests] = await Promise.all([
        timeApi.getAttendance(getAttendanceRequestParams(attendanceRange)),
        timeApi.getAllLeaveRequests().catch(() => timeApi.getManageableLeaveRequests()).catch(() => []),
      ]);
      setAttendance(data);
      // Show approved AND pending absences (mirrors the team calendar in Nieobecności)
      setAttendanceLeaveRequests(
        leaveRequests.filter(
          request =>
            request.status === LeaveStatus.APPROVED || request.status === LeaveStatus.PENDING
        )
      );
    } catch {
      toast.error('Błąd ładowania frekwencji');
    } finally {
      setLoadingAttendance(false);
    }
  }

  // ── Action handlers ───────────────────────────────────────────────────────
  async function handleStartWork() {
    if (isTimeTrackingBlocked) {
      toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
      return;
    }

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
    if (isTimeTrackingBlocked) {
      toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
      return;
    }

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
    if (isTimeTrackingBlocked) {
      toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
      return;
    }

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
    if (isTimeTrackingBlocked) {
      toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
      return;
    }

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
  // Clocked in before the company opens — work time starts at clock_in (e.g. 07:00)
  const notStartedYet = !!(state === 'working' && currentEntry && new Date(currentEntry.clock_in).getTime() > Date.now());
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
  const sortedAttendanceUsers = attendance
    ? [...attendance.users].sort((a, b) => {
        const firstValue = attendanceSort === 'first_name'
          ? `${a.first_name} ${a.last_name}`
          : `${a.last_name} ${a.first_name}`;
        const secondValue = attendanceSort === 'first_name'
          ? `${b.first_name} ${b.last_name}`
          : `${b.last_name} ${b.first_name}`;

        return firstValue.localeCompare(secondValue, 'pl');
      })
    : [];
  const isCurrentUserWorkingToday = state === 'working' && Boolean(currentEntry);
  const isAttendanceDayWorking = (day: AttendanceDay, employeeId: string) => {
    if (day.status === 'in_progress') return true;
    return Boolean(
      user?.id === employeeId &&
      day.date === todayStr() &&
      isCurrentUserWorkingToday,
    );
  };
  const getAttendanceLeaveInfo = (
    employeeId: string,
    date: string
  ): AttendanceLeaveInfo | null => {
    const matches = attendanceLeaveRequests.filter(request => {
      if (request.user_id !== employeeId) return false;

      const startDate = getDateKey(request.start_date);
      const endDate = getDateKey(request.end_date);
      return date >= startDate &&
        date <= endDate &&
        !(isWeekendDate(date) && request.leave_type !== LeaveType.REMOTE_WORK);
    });
    // Prefer an approved leave over a pending one on the same day
    const leave = matches.find(r => r.status === LeaveStatus.APPROVED) || matches[0];

    return leave
      ? {
          label: getAttendanceLeaveLabel(leave.leave_type),
          type: leave.leave_type,
          status: leave.status,
        }
      : null;
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
            {notStartedYet ? (
              <div className="max-w-md text-center text-lg font-semibold text-[#b76612] dark:text-orange-300">
                Czas pracy firmy rozpocznie się o {formatTime(currentEntry.clock_in)}
              </div>
            ) : (
              <div className="font-mono text-5xl font-black tracking-wider text-gray-900 dark:text-white">
                {formatElapsed(elapsed)}
              </div>
            )}
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
                Zakończenie pracy
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                Ręczne
              </p>
            </div>
          </div>

          <div className="mt-6 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handlePause}
              disabled={clocking || isTimeTrackingBlocked}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Pause className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Pauza'}
            </button>
            <button
              onClick={handleEndWork}
              disabled={clocking || isTimeTrackingBlocked}
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
              disabled={clocking || isTimeTrackingBlocked}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60"
            >
              <Play className="w-5 h-5" />
              {clocking ? 'Zapisywanie...' : 'Wznów pracę'}
            </button>
            <button
              onClick={handleEndWork}
              disabled={clocking || isTimeTrackingBlocked}
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
            disabled={clocking || isTimeTrackingBlocked}
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
          disabled={clocking || isTimeTrackingBlocked}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 disabled:opacity-60"
        >
          <Play className="w-5 h-5" />
          {clocking ? 'Zapisywanie...' : 'Rozpocznij pracę'}
        </button>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Pierwsze wejście dnia zaokrąglane do 5 min w dół
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

  // ── All-entries tab: filter + sort + paginate ──
  const allSearchNorm = allSearch.trim().toLocaleLowerCase('pl');
  const allFilteredEntries = allEntries
    .filter((e) => {
      const u = (e as any).user;
      if (allSearchNorm && !(u ? `${u.last_name} ${u.first_name}`.toLocaleLowerCase('pl').includes(allSearchNorm) : false)) return false;
      if (allTypeFilter === 'manual' && !e.is_manual) return false;
      if (allTypeFilter === 'auto' && e.is_manual) return false;
      if (allStatusFilter !== 'all' && e.status !== allStatusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (allSort === 'date_asc') return new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime();
      if (allSort === 'duration_desc') return (b.duration_minutes || 0) - (a.duration_minutes || 0);
      if (allSort === 'name') {
        const ua = (a as any).user, ub = (b as any).user;
        return `${ua?.last_name ?? ''} ${ua?.first_name ?? ''}`.localeCompare(`${ub?.last_name ?? ''} ${ub?.first_name ?? ''}`, 'pl');
      }
      return new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime();
    });
  const allTotalPages = Math.max(1, Math.ceil(allFilteredEntries.length / allPageSize));
  const allPageStart = (allPage - 1) * allPageSize;
  const allPageEntries = allFilteredEntries.slice(allPageStart, allPageStart + allPageSize);

  // ── Per-employee period summary (sum of worked time in the selected range) ──
  const summaryUsers = Array.from(
    new Map(
      allEntries.map((e) => {
        const u = (e as any).user;
        return [e.user_id, u ? `${u.last_name} ${u.first_name}` : e.user_id] as [string, string];
      })
    ).entries()
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const summaryEntries = summaryUserId ? allEntries.filter((e) => e.user_id === summaryUserId) : [];
  const summaryMinutes = summaryEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const summaryDayCount = new Set(summaryEntries.map((e) => String(e.clock_in).slice(0, 10))).size;

  return (
    <MainLayout title="Czas pracy">
      {isManager && showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSaved={loadMyData}
          users={managerUsers}
          isTimeTrackingBlocked={isTimeTrackingBlocked}
        />
      )}
      {isManager && showStartManual && (
        <StartFromTimeModal
          onClose={() => setShowStartManual(false)}
          onStarted={loadMyData}
          isTimeTrackingBlocked={isTimeTrackingBlocked}
        />
      )}

      {editNotesEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditNotesEntry(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Pencil className="h-4 w-4 text-[#F7941D]" /> Opis wpisu
            </h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              {new Date(editNotesEntry.clock_in).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <textarea
              value={editNotesValue}
              onChange={e => setEditNotesValue(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Rozpisz co było robione w tych godzinach..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditNotesEntry(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Anuluj</button>
              <button onClick={handleSaveNotes} disabled={savingNotes} className="flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-medium text-white hover:bg-[#e08317] disabled:opacity-60">
                {savingNotes && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: edit time entry */}
      {isManager && editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditEntry(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Pencil className="h-4 w-4 text-[#F7941D]" /> Edytuj wpis czasu pracy
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Rozpoczęcie</label>
                <input
                  type="datetime-local"
                  value={editForm.clock_in}
                  onChange={e => setEditForm(f => ({ ...f, clock_in: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Zakończenie <span className="text-gray-400">(puste = w toku)</span></label>
                <input
                  type="datetime-local"
                  value={editForm.clock_out}
                  onChange={e => setEditForm(f => ({ ...f, clock_out: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Opis</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditEntry(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Anuluj</button>
              <button onClick={handleSaveEntry} disabled={savingEntry} className="flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-medium text-white hover:bg-[#e08317] disabled:opacity-60">
                {savingEntry && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isManager && deleteEntryId !== null}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={handleDeleteEntry}
        title="Usuń wpis czasu pracy"
        message="Czy na pewno chcesz trwale usunąć ten wpis? Tej operacji nie można cofnąć."
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="warning"
      />

      <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
            {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Czas pracy</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Rejestracja czasu pracy — pierwsze rozpoczęcie dnia pracy zaokrąglone do 5 minut
          </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManager && (
            <button
              onClick={() => {
                if (isTimeTrackingBlocked) {
                  toast.error(MOBILE_TIME_TRACKING_BLOCK_MESSAGE);
                  return;
                }
                setShowStartManual(true);
              }}
              disabled={isTimeTrackingBlocked}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Play className="w-4 h-4 text-[#F7941D]" />
              Rozpocznij od godziny
            </button>
          )}
          {isManager && (
            <button
              onClick={() => setShowManualEntry(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <PlusCircle className="w-4 h-4 text-[#F7941D]" />
              Wpis za pracownika
            </button>
          )}
        </div>
      </div>

      {isTimeTrackingBlocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {MOBILE_TIME_TRACKING_BLOCK_MESSAGE}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'my', label: 'Mój czas pracy', icon: Clock },
            ...(canViewAttendance ? [{ id: 'attendance', label: 'Frekwencja pracowników', icon: Users }] : []),
            ...(isManager ? [{ id: 'all', label: 'Wszystkie czasy pracy', icon: Calendar }] : []),
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as 'my' | 'attendance' | 'all')}
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
                        <th className="px-4 py-3 text-left">Opis</th>
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
                          <td className="px-4 py-3 max-w-[260px]">
                            <div className="flex items-center gap-1.5 group">
                              <button
                                type="button"
                                onClick={() => { setEditNotesEntry(entry); setEditNotesValue(entry.notes || ''); }}
                                title={entry.notes ? 'Kliknij, aby zobaczyć / edytować pełny opis' : 'Dodaj opis'}
                                className="flex-1 min-w-0 text-left text-xs text-gray-600 dark:text-gray-400 hover:text-[#F7941D] transition-colors"
                              >
                                <span className="block truncate">
                                  {entry.notes || <span className="text-gray-300 dark:text-gray-600">— dodaj opis</span>}
                                </span>
                              </button>
                              <Pencil className="w-3 h-3 flex-shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity dark:text-gray-600" />
                              {isManager && entry.status !== 'in_progress' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditEntry(entry)}
                                    title="Edytuj wpis"
                                    className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteEntryId(entry.id)}
                                    title="Usuń wpis"
                                    className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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
                  { value: '2weeks', label: '2 tygodnie' },
                  { value: '4weeks', label: '4 tygodnie' },
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Zakres: <span className="text-gray-700 dark:text-gray-200">{formatAttendanceRangeLabel(attendanceRange)}</span>
              </p>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                Sortuj:
                <select
                  value={attendanceSort}
                  onChange={(event) => setAttendanceSort(event.target.value as AttendanceSort)}
                  className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-800 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="last_name">po nazwisku</option>
                  <option value="first_name">po imieniu</option>
                </select>
              </label>
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
              <div className="rounded-xl bg-yellow-50 p-3 dark:bg-yellow-900/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">Aktualnie w pracy</p>
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
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-400" /> Praca zdalna</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400" /> Urlop / Nieobecność</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Aktualnie w pracy</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Zakończona zmiana</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" /> Brak wpisu</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" /> Weekend</div>
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
                        const isWeekend = isWeekendDate(date);
                        return (
                          <th key={date} className={`min-w-[118px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                            isToday
                              ? 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20'
                              : isWeekend
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
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
                    {sortedAttendanceUsers.map((u, i) => (
                      <tr key={u.id} className={`${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'} ${u.id === user?.id ? 'ring-1 ring-inset ring-[#F7941D]/30' : ''}`}>
                        <td className={`sticky left-0 z-10 border-r border-gray-100 px-4 py-3 dark:border-gray-700 ${
                          i % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#F7941D]/10 text-[#F7941D] flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                              {u.avatar_url ? (
                                <img src={getFileUrl(u.avatar_url) || ''} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <span>{u.first_name[0]}{u.last_name[0]}</span>
                              )}
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
                          const isWeekend = isWeekendDate(day.date);
                          const displayClockIn = isToday && u.id === user?.id && currentEntry
                            ? currentEntry.clock_in
                            : day.clock_in;
                          const hasWorkRecord = Boolean(displayClockIn || day.duration_minutes);
                          const leaveInfo = getAttendanceLeaveInfo(u.id, day.date);
                          const leaveStatusLabel = leaveInfo
                            ? getAttendanceLeaveStatusLabel(leaveInfo.status)
                            : undefined;
                          const leaveTitle = leaveInfo ? `${leaveInfo.label} - ${leaveStatusLabel}` : undefined;
                          return (
                            <td
                              key={day.date}
                              className={`px-3 py-2 text-center ${
                                isToday
                                  ? 'bg-orange-50/50 dark:bg-orange-900/10'
                                  : isWeekend
                                    ? 'bg-gray-50/80 dark:bg-gray-900/30'
                                    : ''
                              }`}
                            >
                              {hasWorkRecord ? (
                                <div className={`inline-flex min-w-[96px] flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs shadow-sm ${
                                  isWorking
                                    ? WORKING_STATUS_CLASSES
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-emerald-400'
                                }`}>
                                  <div className="flex items-center gap-1 font-mono font-medium">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} />
                                    {displayClockIn ? formatTime(displayClockIn) : 'Wpis'}
                                    {!isWorking && day.clock_out && ` – ${formatTime(day.clock_out)}`}
                                  </div>
                                  <div className="text-[10px] opacity-70">
                                    {isWorking ? 'W pracy' : formatDuration(day.duration_minutes)}
                                  </div>
                                </div>
                              ) : leaveInfo ? (
                                <span className={`inline-flex min-w-[96px] flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm ${getAttendanceLeaveClass(leaveInfo.type)}`} title={leaveTitle}>
                                  <span className="block max-w-[84px] truncate text-center">{leaveInfo.label}</span>
                                  <span className={`mt-0.5 text-[10px] font-semibold ${getAttendanceLeaveStatusClass(leaveInfo.status)}`}>
                                    {leaveStatusLabel}
                                  </span>
                                </span>
                              ) : (
                                <span className={`inline-flex min-w-[96px] items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium ${
                                  isWeekend
                                    ? 'border-gray-100 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-500'
                                    : 'border-gray-100 bg-gray-50 text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600'
                                }`}>
                                  {isWeekend ? 'Wolne' : 'Brak'}
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

      {/* ── ALL TIME ENTRIES TAB (admin / kadry) ── */}
      {activeTab === 'all' && isManager && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pracownik</label>
                <input
                  type="search"
                  value={allSearch}
                  onChange={(e) => setAllSearch(e.target.value)}
                  placeholder="Szukaj po nazwisku..."
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Od</label>
                <input type="date" value={allFrom} max={allTo || undefined} onChange={(e) => setAllFrom(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Do</label>
                <input type="date" value={allTo} min={allFrom || undefined} onChange={(e) => setAllTo(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Typ</label>
                <select value={allTypeFilter} onChange={(e) => setAllTypeFilter(e.target.value as any)} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="all">Wszystkie</option>
                  <option value="auto">Automatyczny</option>
                  <option value="manual">Ręczny</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</label>
                <select value={allStatusFilter} onChange={(e) => setAllStatusFilter(e.target.value as any)} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="all">Wszystkie</option>
                  <option value="in_progress">W pracy</option>
                  <option value="completed">Zakończone</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sortuj</label>
                <select value={allSort} onChange={(e) => setAllSort(e.target.value as any)} className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="date_desc">Data: najnowsze</option>
                  <option value="date_asc">Data: najstarsze</option>
                  <option value="name">Nazwisko (A–Z)</option>
                  <option value="duration_desc">Czas pracy: malejąco</option>
                </select>
              </div>
            </div>
          </div>

          {/* Per-employee period summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Podsumowanie pracownika</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Suma przepracowanego czasu w wybranym okresie ({allFrom || '—'} – {allTo || '—'}).
                </p>
              </div>
              <div className="min-w-[240px]">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pracownik</label>
                <select
                  value={summaryUserId}
                  onChange={(e) => setSummaryUserId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— wybierz pracownika —</option>
                  {summaryUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {summaryUserId && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[#F7941D]/10 px-3 py-2 dark:bg-[#F7941D]/15">
                  <p className="text-xs font-medium text-[#b76612] dark:text-orange-200">Łączny czas pracy</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(summaryMinutes)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Dni z pracą</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summaryDayCount}</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Wpisy</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summaryEntries.length}</p>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Wszystkie czasy pracy</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Edytuj lub usuń wpis, jeśli ktoś się źle odkliknął lub zapomniał.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{allFilteredEntries.length} wpisów · Na stronie</span>
                <select value={allPageSize} onChange={(e) => setAllPageSize(Number(e.target.value) as 10 | 30 | 50)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value={10}>10</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Pracownik</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Rozpoczęcie</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Zakończenie</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Czas pracy</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Typ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Opis</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allLoading ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Ładowanie…</td></tr>
                  ) : allPageEntries.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Brak wpisów w wybranym zakresie.</td></tr>
                  ) : (
                    allPageEntries.map((entry) => {
                      const u = (entry as any).user;
                      const fmtT = (d: string) => new Date(d).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                      const inProgress = entry.status === 'in_progress';
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{u ? `${u.last_name} ${u.first_name}` : '—'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{new Date(entry.clock_in).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                          <td className="px-4 py-2.5 font-mono text-sm text-gray-700 dark:text-gray-300">
                            <span className="inline-flex items-center gap-1.5">
                              {fmtT(entry.clock_in)}
                              <DeviceBadge device={entry.clock_in_device} ip={entry.clock_in_ip} />
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-sm text-gray-700 dark:text-gray-300">
                            {entry.clock_out ? (
                              <span className="inline-flex items-center gap-1.5">
                                {fmtT(entry.clock_out)}
                                <DeviceBadge device={entry.clock_out_device} ip={entry.clock_out_ip} />
                              </span>
                            ) : <span className="font-sans text-[#F7941D]">W pracy</span>}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white">{inProgress ? <span className="text-[#F7941D]">—</span> : formatDurationValue(entry.duration_minutes || 0)}</td>
                          <td className="px-4 py-2.5 text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${entry.is_manual ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{entry.is_manual ? 'Ręczny' : 'Automatyczny'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inProgress ? 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>{inProgress ? 'W pracy' : 'Zakończone'}</span>
                          </td>
                          <td className="px-4 py-2.5 max-w-[220px] truncate text-sm text-gray-600 dark:text-gray-400" title={entry.notes || ''}>{entry.notes || <span className="text-gray-400">—</span>}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <button type="button" onClick={() => openEditEntry(entry)} title="Edytuj wpis" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setDeleteEntryId(entry.id)} title="Usuń wpis" className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {allFilteredEntries.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <span>Strona {allPage} / {allTotalPages}</span>
                <div className="flex gap-2">
                  <button disabled={allPage <= 1} onClick={() => setAllPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50 dark:border-gray-600">Poprzednia</button>
                  <button disabled={allPage >= allTotalPages} onClick={() => setAllPage((p) => Math.min(allTotalPages, p + 1))} className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50 dark:border-gray-600">Następna</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}
