import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Play, Square, Clock, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import * as timeApi from '../api/time.api';
import type { TimeEntry } from '../types/time.types';

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
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) return { day: 'Dziś', date: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) };
  return {
    day: d.toLocaleDateString('pl-PL', { weekday: 'short' }),
    date: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
  };
}

export default function WorkTime() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'attendance'>('my');

  // Clock in/out state
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [clocking, setClocking] = useState(false);
  const [loadingMy, setLoadingMy] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [attendanceDays, setAttendanceDays] = useState(7);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => { loadMyData(); }, []);

  useEffect(() => {
    if (currentEntry) {
      const start = new Date(currentEntry.clock_in).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentEntry]);

  useEffect(() => {
    if (activeTab === 'attendance') loadAttendance();
  }, [activeTab, attendanceDays]);

  async function loadMyData() {
    setLoadingMy(true);
    try {
      const [current, hist] = await Promise.all([
        timeApi.getCurrentEntry(),
        timeApi.getUserTimeEntries(),
      ]);
      setCurrentEntry(current);
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
      const data = await timeApi.getAttendance(attendanceDays);
      setAttendance(data);
    } catch {
      toast.error('Błąd ładowania frekwencji');
    } finally {
      setLoadingAttendance(false);
    }
  }

  async function handleClockIn() {
    setClocking(true);
    try {
      const entry = await timeApi.clockIn();
      setCurrentEntry(entry);
      toast.success(`Rozpoczęto pracę o ${formatTime(entry.clock_in)}`);
      loadMyData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setClocking(false);
    }
  }

  async function handleClockOut() {
    setClocking(true);
    try {
      const entry = await timeApi.clockOut();
      setCurrentEntry(null);
      toast.success(`Zakończono pracę o ${formatTime(entry.clock_out)} • ${formatDuration(entry.duration_minutes)}`);
      loadMyData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setClocking(false);
    }
  }

  const isWorking = !!currentEntry;

  return (
    <MainLayout title="Czas pracy">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Czas pracy</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Rejestracja czasu pracy z zaokrąglaniem do 15 minut
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'my'
                ? 'border-[#F7941D] text-[#F7941D]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Mój czas pracy
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'attendance'
                ? 'border-[#F7941D] text-[#F7941D]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Frekwencja pracowników
          </button>
        </nav>
      </div>

      {/* ── MY TIME TAB ── */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {/* Clock in/out widget */}
          <div className={`rounded-xl border-2 p-6 text-center transition-colors ${
            isWorking
              ? 'border-[#F7941D] bg-orange-50 dark:bg-orange-900/10'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          }`}>
            {isWorking ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F7941D] animate-pulse" />
                  <p className="text-sm font-semibold text-[#F7941D]">W pracy od {formatTime(currentEntry!.clock_in)}</p>
                </div>
                <div className="text-5xl font-black font-mono tracking-wider text-gray-900 dark:text-white my-4">
                  {formatElapsed(elapsed)}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Auto-zakończenie o {new Date(new Date(currentEntry!.clock_in).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <button
                  onClick={handleClockOut}
                  disabled={clocking}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  <Square className="w-5 h-5" />
                  {clocking ? 'Zapisywanie...' : 'Zakończ pracę'}
                </button>
              </>
            ) : (
              <>
                <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                  Nie jesteś aktualnie zalogowany do pracy
                </p>
                <button
                  onClick={handleClockIn}
                  disabled={clocking}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#F7941D] hover:bg-[#e08317] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm hover:shadow-md"
                >
                  <Play className="w-5 h-5" />
                  {clocking ? 'Zapisywanie...' : 'Rozpocznij pracę'}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                  Czas zostanie zaokrąglony do 15 minut
                </p>
              </>
            )}
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Historia wpisów</h3>
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
          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Frekwencja pracowników
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Zakres:</span>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setAttendanceDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    attendanceDays === d
                      ? 'bg-[#F7941D] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {d} dni
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#F7941D]" /> Aktualnie w pracy
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" /> Zakończona zmiana
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" /> Nieobecny
            </div>
          </div>

          {/* Table */}
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
                        const isToday = date === new Date().toISOString().split('T')[0];
                        return (
                          <th
                            key={date}
                            className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[110px] ${
                              isToday ? 'text-[#F7941D]' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <div>{day}</div>
                            <div className="font-normal normal-case">{dateLabel}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {attendance.users.map((u, i) => (
                      <tr
                        key={u.id}
                        className={`${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'} ${
                          u.id === user?.id ? 'ring-1 ring-inset ring-[#F7941D]/30' : ''
                        }`}
                      >
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
