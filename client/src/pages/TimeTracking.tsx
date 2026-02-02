import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as timeApi from '../api/time.api';
import type { TimeEntry, TimeStats } from '../types/time.types';

const TimeTracking: React.FC = () => {
  const { t } = useTranslation('timeTracking');
  // Attendance state
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<TimeStats | null>(null);
  const [expectedClockIn, setExpectedClockIn] = useState<string>('09:00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [current, entries, statistics] = await Promise.all([
        timeApi.getCurrentEntry(),
        timeApi.getUserTimeEntries(),
        timeApi.getUserTimeStats(),
      ]);

      setCurrentEntry(current);
      setRecentEntries(entries.slice(0, 10));
      setAttendanceStats(statistics);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się załadować danych');
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
      alert(err.response?.data?.message || 'Nie udało się rozpocząć pracy');
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
      alert(err.response?.data?.message || 'Nie udało się zakończyć pracy');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-green-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Zarządzaj swoim czasem i loguj godziny pracy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
              >
                ← {t('dashboard')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Clock In/Out Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('status')}</h2>

              {currentEntry ? (
                <div>
                  <div
                    className={`border rounded-md p-4 mb-4 ${currentEntry.is_late ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}
                  >
                    <p
                      className={`text-sm mb-2 ${currentEntry.is_late ? 'text-red-700' : 'text-emerald-700'}`}
                    >
                      {t('loggedInAt')}
                    </p>
                    <p
                      className={`text-2xl font-bold ${currentEntry.is_late ? 'text-red-800' : 'text-emerald-800'}`}
                    >
                      {formatTime(currentEntry.clock_in)}
                    </p>
                    {currentEntry.is_late && (
                      <p className="text-sm text-red-600 mt-2 font-medium">
                        Spóźnienie: {currentEntry.late_minutes} min
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleClockOut}
                    disabled={loading}
                    className="w-full py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
                  >
                    {t('clockOut')}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-4 mb-4">
                    <p className="text-slate-600 dark:text-slate-400 text-center text-sm">{t('notWorking')}</p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('expectedStartTime')}
                    </label>
                    <input
                      type="time"
                      value={expectedClockIn}
                      onChange={(e) => setExpectedClockIn(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleClockIn}
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
                  >
                    {t('clockIn')}
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Stats Card */}
            {attendanceStats && (
              <div className="bg-white dark:bg-gray-800 rounded-md p-6 mt-4 border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">{t('attendanceStats')}</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalHours')}:</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {attendanceStats.totalHours}h {attendanceStats.totalMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('overtime')}:</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {attendanceStats.overtimeHours}h {attendanceStats.overtimeMinutes}m
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('daysWorked')}:</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{attendanceStats.daysWorked}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('averagePerDay')}:</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {attendanceStats.averageHoursPerDay.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Entries */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-md p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('history')}</h2>
              </div>

              {loading && recentEntries.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">{t('loading')}</p>
              ) : recentEntries.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">{t('noEntries')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {t('date')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {t('entryTime')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {t('exitTime')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {t('duration')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {t('lateness')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {t('status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatDate(entry.clock_in)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{formatTime(entry.clock_in)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {entry.clock_out ? formatTime(entry.clock_out) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {formatDuration(entry.duration_minutes)}
                            {entry.is_overtime && entry.overtime_minutes > 0 && (
                              <span className="ml-2 text-xs text-amber-600 font-medium">
                                +{entry.overtime_minutes} {t('minOvertime')}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {entry.is_late ? (
                              <span className="text-red-600 font-medium">{entry.late_minutes} min</span>
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
                                ? t('inProgress')
                                : entry.status === 'completed'
                                  ? t('completed')
                                  : entry.status === 'approved'
                                    ? t('approved')
                                    : t('rejected')}
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
