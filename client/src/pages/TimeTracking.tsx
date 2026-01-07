import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as timeApi from '../api/time.api';
import type { TimeEntry, TimeStats } from '../types/time.types';
import { useAuth } from '../contexts/AuthContext';

const TimeTracking: React.FC = () => {
  const { user } = useAuth();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [current, entries, statistics] = await Promise.all([
        timeApi.getCurrentEntry(),
        timeApi.getUserTimeEntries(),
        timeApi.getUserTimeStats(),
      ]);
      setCurrentEntry(current);
      setRecentEntries(entries.slice(0, 10));
      setStats(statistics);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      const entry = await timeApi.clockIn();
      setCurrentEntry(entry);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      await timeApi.clockOut();
      setCurrentEntry(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">Ewidencja Czasu Pracy</h1>
                <p className="text-sm text-slate-400">Zarządzaj swoim czasem</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
              >
                ← Panel główny
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clock In/Out Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">Status</h2>

              {currentEntry ? (
                <div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-emerald-700 mb-2">Zalogowano o:</p>
                    <p className="text-2xl font-bold text-emerald-800">
                      {formatTime(currentEntry.clock_in)}
                    </p>
                  </div>

                  <button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
                  >
                    Wyloguj się
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-slate-100 border border-slate-200 rounded-md p-4 mb-4">
                    <p className="text-slate-600 text-center text-sm">Nie jesteś zalogowany</p>
                  </div>

                  <button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
                  >
                    Zaloguj się
                  </button>
                </div>
              )}
            </div>

            {/* Stats Card */}
            {stats && (
              <div className="bg-white rounded-lg shadow-sm p-6 mt-6 border border-slate-200">
                <h3 className="text-base font-semibold mb-4 text-slate-900">Statystyki (30 dni)</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Łączny czas:</p>
                    <p className="text-xl font-bold text-slate-900">
                      {stats.totalHours}h {stats.totalMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Nadgodziny:</p>
                    <p className="text-xl font-bold text-amber-600">
                      {stats.overtimeHours}h {stats.overtimeMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Dni przepracowane:</p>
                    <p className="text-xl font-bold text-slate-900">{stats.daysWorked}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Średnio dziennie:</p>
                    <p className="text-xl font-bold text-slate-900">
                      {stats.averageHoursPerDay.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Entries */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Ostatnie wpisy</h2>
                <Link
                  to="/time-tracking/leave"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors duration-200"
                >
                  Zarządzaj urlopami →
                </Link>
              </div>

              {loading && recentEntries.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">Ładowanie...</p>
              ) : recentEntries.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">Brak wpisów</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Wejście
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Wyjście
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Czas
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {formatDate(entry.clock_in)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {formatTime(entry.clock_in)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {entry.clock_out ? formatTime(entry.clock_out) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {formatDuration(entry.duration_minutes)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.status === 'in_progress'
                                  ? 'bg-amber-100 text-amber-800'
                                  : entry.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : entry.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {entry.status === 'in_progress'
                                ? 'W trakcie'
                                : entry.status === 'completed'
                                ? 'Ukończony'
                                : entry.status === 'approved'
                                ? 'Zatwierdzony'
                                : 'Odrzucony'}
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
        </div>
      </div>
    </div>
  );
};

export default TimeTracking;
