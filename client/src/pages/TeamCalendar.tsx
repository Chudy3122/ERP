import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as calendarApi from '../api/calendar.api';
import type { TeamAvailability } from '../api/calendar.api';

const TeamCalendar: React.FC = () => {
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
      setError(err.response?.data?.message || 'Nie udało się załadować dostępności');
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'on_leave':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'absent':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
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
        return 'Pracuje';
      case 'on_leave':
        return 'Urlop';
      case 'absent':
        return 'Nieobecny';
      default:
        return 'Nieznany';
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
    <div className="min-h-screen bg-slate-50">
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
                <h1 className="text-xl font-semibold text-slate-100">Kalendarz Zespołu</h1>
                <p className="text-sm text-slate-400">Dostępność i obecność pracowników</p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
            >
              ← Panel główny
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreviousWeek}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium transition-colors duration-200"
              >
                ← Poprzedni tydzień
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors duration-200"
              >
                Dzisiaj
              </button>
              <button
                onClick={handleNextWeek}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium transition-colors duration-200"
              >
                Następny tydzień →
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Widok:</label>
              <select
                value={daysToShow}
                onChange={(e) => setDaysToShow(Number(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7">7 dni</option>
                <option value="14">14 dni</option>
                <option value="30">30 dni</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-200">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium text-slate-700">Legenda:</span>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center text-sm">
                ✓
              </span>
              <span className="text-sm text-slate-700">Pracuje</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-amber-100 border border-amber-200 flex items-center justify-center text-sm">
                ✈
              </span>
              <span className="text-sm text-slate-700">Urlop</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-sm">
                −
              </span>
              <span className="text-sm text-slate-700">Nieobecny</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Ładowanie kalendarza...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                      Pracownik
                    </th>
                    {availability.map((day) => (
                      <th
                        key={day.date}
                        className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider min-w-[120px]"
                      >
                        {formatDate(day.date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {availability.length > 0 &&
                    availability[0].users.map((user, userIndex) => (
                      <tr key={user.id} className={userIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-inherit z-10">
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

        {/* Summary */}
        {!loading && availability.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Łączna dostępność</h3>
              <p className="text-3xl font-bold text-slate-900">
                {Math.round(
                  (availability.reduce(
                    (acc, day) => acc + day.users.filter((u) => u.status === 'working').length,
                    0
                  ) /
                    (availability.length * (availability[0]?.users.length || 1))) *
                    100
                )}
                %
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Pracujących średnio</h3>
              <p className="text-3xl font-bold text-emerald-600">
                {Math.round(
                  availability.reduce((acc, day) => acc + day.users.filter((u) => u.status === 'working').length, 0) /
                    availability.length
                )}
                /{availability[0]?.users.length || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Na urlopie</h3>
              <p className="text-3xl font-bold text-amber-600">
                {Math.round(
                  availability.reduce((acc, day) => acc + day.users.filter((u) => u.status === 'on_leave').length, 0) /
                    availability.length
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCalendar;
