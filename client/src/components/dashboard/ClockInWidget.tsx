import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogIn, Pause, Timer, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as timeApi from '../../api/time.api';
import { TimeEntry, TimeEntryStatus } from '../../types/time.types';
import WidgetCard from '../widgets/WidgetCard';
import { DashboardWidgetLoading } from './DashboardWidgetState';

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatDuration = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  return `${hours}h ${String(mins).padStart(2, '0')}m`;
};

const formatEntryTimeRange = (entry: TimeEntry) => {
  const start = new Date(entry.clock_in).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (!entry.clock_out) {
    return `od ${start}`;
  }

  const end = new Date(entry.clock_out).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${start} - ${end}`;
};

const ClockInWidget = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadClockWidgetData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Sum completed sessions from actual timestamps — no rounding, exact seconds
    const baseSec = todayEntries
      .filter((e) => e.clock_out)
      .reduce((sum, e) => sum + Math.floor(
        (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 1000
      ), 0);

    if (currentEntry && currentEntry.status === TimeEntryStatus.IN_PROGRESS) {
      const clockInMs = new Date(currentEntry.clock_in).getTime();
      const tick = () => setElapsedSec(baseSec + Math.floor((Date.now() - clockInMs) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsedSec(baseSec);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentEntry?.id, todayEntries]);

  const formatElapsedSec = (sec: number) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const loadClockWidgetData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      const { start, end } = getTodayRange();
      const [entry, entries] = await Promise.all([
        timeApi.getCurrentEntry(),
        timeApi.getUserTimeEntries(start.toISOString(), end.toISOString()),
      ]);

      setCurrentEntry(entry);
      setTodayEntries(entries);
    } catch {
      setCurrentEntry(null);
      setTodayEntries([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleClockIn = async (notes: string = 'Rozpoczęcie pracy') => {
    try {
      setIsClocking(true);
      setError('');
      const entry = await timeApi.clockIn({ notes });
      setCurrentEntry(entry);
      await loadClockWidgetData(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się rozpocząć pracy');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async (notes: string = 'Zakończenie pracy') => {
    try {
      setIsClocking(true);
      setError('');
      await timeApi.clockOut({ notes });
      setCurrentEntry(null);
      await loadClockWidgetData(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zakończyć pracy');
    } finally {
      setIsClocking(false);
    }
  };

  const isClockedIn = currentEntry && currentEntry.status === TimeEntryStatus.IN_PROGRESS;
  const clockInTime = currentEntry ? new Date(currentEntry.clock_in).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : null;
  const workingHoursPerDay = Number(user?.working_hours_per_day) || 8;
  const expectedClockInTime = currentEntry?.expected_clock_in
    ? currentEntry.expected_clock_in.slice(0, 5)
    : null;
  const isLate = currentEntry?.is_late;
  const expectedMinutes = workingHoursPerDay * 60;
  const completedTodayMinutes = todayEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const activeSessionMinutes = isClockedIn && currentEntry
    ? Math.max(0, Math.floor((Date.now() - new Date(currentEntry.clock_in).getTime()) / 60000))
    : 0;
  const todayTotalMinutes = completedTodayMinutes + activeSessionMinutes;
  const remainingTodayMinutes = expectedMinutes - todayTotalMinutes;
  const lastCompletedTodayEntry = todayEntries.find((entry) => entry.clock_out);
  const hasReportedTimeToday = todayEntries.length > 0;
  const breakMinutes = isClockedIn && currentEntry && lastCompletedTodayEntry?.clock_out
    ? Math.max(
        0,
        Math.floor(
          (new Date(currentEntry.clock_in).getTime() -
            new Date(lastCompletedTodayEntry.clock_out).getTime()) /
            60000,
        ),
      )
    : 0;
  const shouldShowLateNotice = isLate && currentEntry?.late_minutes && !lastCompletedTodayEntry;
  const shouldShowBreakNotice = isClockedIn && breakMinutes > 0;

  if (isLoading) {
    return (
      <WidgetCard
        title="Ewidencja czasu"
        icon={<Clock className="w-5 h-5 text-[#F7941D]" />}
      >
        <DashboardWidgetLoading label="Ładowanie ewidencji czasu..." />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      className="h-full"
      title="Ewidencja czasu"
      icon={<Clock className="w-5 h-5 text-[#F7941D]" />}
      actions={
        <button
          onClick={() => navigate('/work-time')}
          className="text-xs font-medium text-[#F7941D] hover:underline"
        >
          Szczegóły
        </button>
      }
    >

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center">
        {error && (
          <div className="mb-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
            {error}
          </div>
        )}

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Dzisiejszy czas
            </p>
            <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
              {formatDuration(todayTotalMinutes)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Plan wg etatu
            </p>
            <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
              {formatDuration(expectedMinutes)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Status dnia
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">
              {remainingTodayMinutes <= 0
                ? 'Plan osiągnięty'
                : isClockedIn
                ? `Do planu ${formatDuration(remainingTodayMinutes)}`
                : lastCompletedTodayEntry
                ? `Ostatni: ${formatEntryTimeRange(lastCompletedTodayEntry)}`
                : 'Brak wpisu'}
            </p>
          </div>
        </div>

        {isClockedIn ? (
          /* Clocked In State */
          <div className="space-y-3">
            {/* Timer display */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">W pracy</span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-gray-900 dark:text-white tracking-wider">
                {formatElapsedSec(elapsedSec)}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <LogIn className="w-3 h-3" />
                Rozpoczęto o {clockInTime}
              </div>
              {shouldShowLateNotice && (
                <div className="mt-1 inline-flex items-center justify-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertTriangle className="w-3 h-3" />
                  Opóźnienie względem planu{expectedClockInTime ? ` ${expectedClockInTime}` : ''}: {currentEntry.late_minutes} min
                </div>
              )}
              {shouldShowBreakNotice && (
                <div className="mt-1 inline-flex items-center justify-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <Timer className="w-3 h-3" />
                  Wznowiono po przerwie: {formatDuration(breakMinutes)}
                </div>
              )}
              <div className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                Pracę zakończysz ręcznie
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleClockOut('Pauza w pracy')}
                disabled={isClocking}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {isClocking ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                Pauza
              </button>

              <button
                onClick={() => handleClockOut('Zakończenie pracy')}
                disabled={isClocking}
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isClocking ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Zakończ pracę
              </button>
            </div>
          </div>
        ) : (
          /* Clocked Out State */
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {hasReportedTimeToday ? 'Pauza' : 'Poza pracą'}
                </span>
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                {formatElapsedSec(elapsedSec)}
              </div>
            </div>

            {/* Clock In Button */}
            <button
              onClick={() =>
                handleClockIn(hasReportedTimeToday ? 'Wznowienie pracy' : 'Rozpoczęcie pracy')
              }
              disabled={isClocking}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F7941D] hover:bg-[#e08317] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isClocking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {hasReportedTimeToday ? 'Wznów pracę' : 'Rozpocznij pracę'}
            </button>
          </div>
        )}
      </div>
    </WidgetCard>
  );
};

export default ClockInWidget;
