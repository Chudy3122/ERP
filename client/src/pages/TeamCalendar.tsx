import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as calendarApi from '../api/calendar.api';
import type { TeamAvailability } from '../api/calendar.api';

const TeamCalendar: React.FC = () => {
  const { t } = useTranslation('teamCalendar');
  const [availability, setAvailability] = useState<TeamAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [daysToShow, setDaysToShow] = useState<number>(7);

  useEffect(() => {
    loadAvailability();
  }, [selectedDate, daysToShow]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + daysToShow - 1);
      endDate.setHours(23, 59, 59, 999);

      const data = await calendarApi.getTeamAvailability(
        startDate.toISOString(),
        endDate.toISOString()
      );

      setAvailability(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'working':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700';
      case 'on_leave':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
      case 'absent':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'working':
        return '✓';
      case 'on_leave':
        return '✈';
      case 'absent':
        return '−';
      default:
        return '?';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'working':
        return t('working');
      case 'on_leave':
        return t('onLeave');
      case 'absent':
        return t('absent');
      default:
        return t('unknown');
    }
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">{t('title')}</h1>
                <p className="text-sm text-slate-400">{t('subtitle')}</p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
            >
              ← {t('mainPanel')}
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border border-slate-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreviousWeek}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md font-medium transition-colors duration-200"
              >
                ← {t('prevWeek')}
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors duration-200"
              >
                {t('today')}
              </button>
              <button
                onClick={handleNextWeek}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md font-medium transition-colors duration-200"
              >
                {t('nextWeek')} →
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('view')}:</label>
              <select
                value={daysToShow}
                onChange={(e) => setDaysToShow(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7">{t('days7')}</option>
                <option value="14">{t('days14')}</option>
                <option value="30">{t('days30')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border border-slate-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{t('legend')}:</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm">
                ✓
              </span>
              <span className="text-sm text-slate-700 dark:text-gray-300">{t('working')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center text-sm">
                ✈
              </span>
              <span className="text-sm text-slate-700 dark:text-gray-300">{t('onLeave')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-sm">
                −
              </span>
              <span className="text-sm text-slate-700 dark:text-gray-300">{t('absent')}</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-gray-400">{t('loading')}...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                <thead className="bg-slate-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-gray-700 z-10">
                      {t('employee')}
                    </th>
                    {availability.map((day) => (
                      <th
                        key={day.date}
                        className="px-4 py-3 text-center text-xs font-medium text-slate-700 dark:text-gray-300 uppercase tracking-wider min-w-[120px]"
                      >
                        {formatDate(day.date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                  {availability.length > 0 &&
                    availability[0].users.map((user, userIndex) => (
                      <tr key={user.id} className={userIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50 dark:bg-gray-700/50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-inherit z-10">
                          {user.name}
                        </td>
                        {availability.map((day) => {
                          const dayUser = day.users.find((u) => u.id === user.id);
                          if (!dayUser) return <td key={day.date} className="px-4 py-4 text-center">-</td>;

                          return (
                            <td key={day.date} className="px-4 py-4 text-center">
                              <div
                                className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-md border ${getStatusColor(
                                  dayUser.status
                                )} min-w-[100px]`}
                                title={dayUser.details}
                              >
                                <span className="text-lg">{getStatusIcon(dayUser.status)}</span>
                                <span className="text-xs font-medium">{getStatusText(dayUser.status)}</span>
                                {dayUser.details && (
                                  <span className="text-xs opacity-75 truncate max-w-full">
                                    {dayUser.details}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary - today's data */}
        {!loading && availability.length > 0 && (() => {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const todayData = availability.find((day) => day.date === todayStr) || availability[0];
          const totalUsers = todayData.users.length || 1;
          const workingCount = todayData.users.filter((u) => u.status === 'working').length;
          const onLeaveCount = todayData.users.filter((u) => u.status === 'on_leave').length;

          return (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">{t('totalAvailability')}</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {Math.round((workingCount / totalUsers) * 100)}%
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">{t('avgWorking')}</h3>
                <p className="text-3xl font-bold text-emerald-600">
                  {workingCount}/{totalUsers}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">{t('onLeaveAvg')}</h3>
                <p className="text-3xl font-bold text-amber-600">
                  {onLeaveCount}
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default TeamCalendar;
