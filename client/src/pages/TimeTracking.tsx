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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/30">
      {/* Header - Modern gradient */}
      <nav className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="container mx-auto p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg ring-2 ring-white/30">
                ⏰
              </div>
              <div>
                <h1 className="text-2xl font-bold drop-shadow-sm">Ewidencja Czasu Pracy</h1>
                <p className="text-sm text-blue-100">Zarządzaj swoim czasem</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Status</h2>

              {currentEntry ? (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-green-700 mb-2">Zalogowano o:</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatTime(currentEntry.clock_in)}
                    </p>
                  </div>

                  <button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-semibold"
                  >
                    Wyloguj się
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4">
                    <p className="text-gray-600 text-center">Nie jesteś zalogowany</p>
                  </div>

                  <button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-semibold"
                  >
                    Zaloguj się
                  </button>
                </div>
              )}
            </div>

            {/* Stats Card */}
            {stats && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Statystyki (30 dni)</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Łączny czas:</p>
                    <p className="text-xl font-bold text-gray-900">
                      {stats.totalHours}h {stats.totalMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nadgodziny:</p>
                    <p className="text-xl font-bold text-orange-600">
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Ostatnie wpisy</h2>
                <Link
                  to="/time-tracking/leave"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Zarządzaj urlopami →
                </Link>
              </div>

              {loading && recentEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Ładowanie...</p>
              ) : recentEntries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Brak wpisów</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Data
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Wejście
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Wyjście
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                          Czas
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
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
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.status === 'in_progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : entry.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : entry.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
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
