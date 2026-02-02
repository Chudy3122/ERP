import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, LogIn, LogOut, Timer, AlertTriangle } from 'lucide-react';
import * as timeApi from '../../api/time.api';
import { TimeEntry, TimeEntryStatus } from '../../types/time.types';

const ClockInWidget = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadCurrentEntry();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentEntry && currentEntry.status === TimeEntryStatus.IN_PROGRESS) {
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setElapsed('00:00:00');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentEntry]);

  const updateElapsed = () => {
    if (!currentEntry) return;
    const start = new Date(currentEntry.clock_in).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    setElapsed(`${h}:${m}:${s}`);
  };

  const loadCurrentEntry = async () => {
    try {
      setIsLoading(true);
      const entry = await timeApi.getCurrentEntry();
      setCurrentEntry(entry);
    } catch {
      setCurrentEntry(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setIsClocking(true);
      setError('');
      const entry = await timeApi.clockIn();
      setCurrentEntry(entry);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się rozpocząć pracy');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setIsClocking(true);
      setError('');
      await timeApi.clockOut();
      setCurrentEntry(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zakończyć pracy');
    } finally {
      setIsClocking(false);
    }
  };

  const isClockedIn = currentEntry && currentEntry.status === TimeEntryStatus.IN_PROGRESS;
  const clockInTime = currentEntry ? new Date(currentEntry.clock_in).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : null;
  const isLate = currentEntry?.is_late;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ewidencja czasu</h3>
          </div>
        </div>
        <div className="p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ewidencja czasu</h3>
        </div>
        <button
          onClick={() => navigate('/time-tracking')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Szczegóły
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {error && (
          <div className="mb-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
            {error}
          </div>
        )}

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
                {elapsed}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <LogIn className="w-3 h-3" />
                Rozpoczęto o {clockInTime}
                {isLate && currentEntry?.late_minutes && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    +{currentEntry.late_minutes} min
                  </span>
                )}
              </div>
            </div>

            {/* Clock Out Button */}
            <button
              onClick={handleClockOut}
              disabled={isClocking}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isClocking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Zakończ pracę
            </button>
          </div>
        ) : (
          /* Clocked Out State */
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Poza pracą</span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1">
                <Timer className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Clock In Button */}
            <button
              onClick={handleClockIn}
              disabled={isClocking}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isClocking ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Rozpocznij pracę
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClockInWidget;
