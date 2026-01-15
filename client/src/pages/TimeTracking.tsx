import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as timeApi from '../api/time.api';
import type { TimeEntry, TimeStats } from '../types/time.types';

const TimeTracking: React.FC = () => {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedClockIn, setExpectedClockIn] = useState<string>('09:00');

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
      const entry = await timeApi.clockIn({ expectedClockIn: expectedClockIn + ':00' });
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-green-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Ewidencja Czasu Pracy</h1>
                <p className="text-sm text-gray-600">Zarządzaj swoim czasem</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-white hover:bg-gray-50 rounded-md transition-colors text-sm font-medium text-gray-700 border border-gray-300"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Clock In/Out Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-md p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Status</h2>

              {currentEntry ? (
                <div>
                  <div className={`border rounded-md p-4 mb-4 ${currentEntry.is_late ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className={`text-sm mb-2 ${currentEntry.is_late ? 'text-red-700' : 'text-emerald-700'}`}>Zalogowano o:</p>
                    <p className={`text-2xl font-bold ${currentEntry.is_late ? 'text-red-800' : 'text-emerald-800'}`}>
                      {formatTime(currentEntry.clock_in)}
                    </p>
                    {currentEntry.is_late && (
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        ⚠️ Spóźnienie: {currentEntry.late_minutes} min
                      </p>
                    )}
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

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Oczekiwana godzina rozpoczęcia:
                    </label>
                    <input
                      type="time"
                      value={expectedClockIn}
                      onChange={(e) => setExpectedClockIn(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
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
              <div className="bg-white rounded-md p-6 mt-4 border border-gray-200">
                <h3 className="text-base font-semibold mb-4 text-gray-900">Statystyki (30 dni)</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Łączny czas:</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.totalHours}h {stats.totalMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nadgodziny:</p>
                    <p className="text-xl font-bold text-amber-600">
                      {stats.overtimeHours}h {stats.overtimeMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dni przepracowane:</p>
                    <p className="text-xl font-bold text-gray-900">{stats.daysWorked}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Średnio dziennie:</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.averageHoursPerDay.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Entries */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-md p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Ostatnie wpisy</h2>
              </div>

              {loading && recentEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">Ładowanie...</p>
              ) : recentEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">Brak wpisów</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Wejście
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Wyjście
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Czas
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Spóźnienie
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(entry.clock_in)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatTime(entry.clock_in)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {entry.clock_out ? formatTime(entry.clock_out) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDuration(entry.duration_minutes)}
                            {entry.is_overtime && entry.overtime_minutes > 0 && (
                              <span className="ml-2 text-xs text-amber-600 font-medium">
                                +{entry.overtime_minutes} min nadgodzin
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.is_late ? (
                              <span className="text-red-600 font-medium">
                                {entry.late_minutes} min
                              </span>
                            ) : (
                              <span className="text-emerald-600">-</span>
                            )}
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
