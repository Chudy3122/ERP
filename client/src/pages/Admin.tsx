import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as adminApi from '../api/admin.api';
import { SystemStats, AdminUser } from '../types/admin.types';

const Admin: React.FC = () => {
  const { t } = useTranslation('admin');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, onlineData] = await Promise.all([
        adminApi.getSystemStats(),
        adminApi.getRecentRegistrations(5),
        adminApi.getOnlineCount(),
      ]);

      setStats(statsData);
      setRecentUsers(usersData);
      setOnlineCount(onlineData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-violet-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">{t('loading', { defaultValue: 'Ładowanie...' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-100">{t('title')}</h1>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Users Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-gray-400">{t('users')}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.users.total || 0}</p>
              <p className="text-xs text-emerald-600 mt-1">
                {stats?.users.active || 0} {t('active', { defaultValue: 'aktywnych' })}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{onlineCount} {t('online', { defaultValue: 'online' })}</p>
            </div>
          </div>

          {/* Time Entries Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-gray-400">{t('workTime', { defaultValue: 'Czas pracy' })}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.timeEntries.total || 0}</p>
              <p className="text-xs text-indigo-600 mt-1">
                {stats?.timeEntries.today || 0} {t('today', { defaultValue: 'dzisiaj' })}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{stats?.timeEntries.thisWeek || 0} {t('thisWeek', { defaultValue: 'ten tydzień' })}</p>
            </div>
          </div>

          {/* Leave Requests Card */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all duration-200 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-500">{t('requests', { defaultValue: 'Wnioski' })}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.leaveRequests.total || 0}</p>
              <p className="text-xs text-amber-600 mt-1">
                {stats?.leaveRequests.pending || 0} {t('pending', { defaultValue: 'oczekujących' })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stats?.leaveRequests.approved || 0} {t('approved', { defaultValue: 'zatwierdzonych' })}</p>
            </div>
          </div>

          {/* Messages Card */}
          <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-all duration-200 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center border border-violet-100">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-500">{t('messages', { defaultValue: 'Wiadomości' })}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.messages.total || 0}</p>
              <p className="text-xs text-violet-600 mt-1">
                {stats?.messages.today || 0} {t('today', { defaultValue: 'dzisiaj' })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{stats?.channels.active || 0} {t('channels', { defaultValue: 'kanałów' })}</p>
            </div>
          </div>
        </div>

        {/* Recent Users & Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Registrations */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('recentRegistrations', { defaultValue: 'Ostatnie rejestracje' })}</h2>
              <Link
                to="/admin/users"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t('viewAll', { defaultValue: 'Zobacz wszystkich →' })}
              </Link>
            </div>

            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noUsers', { defaultValue: 'Brak użytkowników' })}</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {user.role}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Users by Role */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('usersByRole', { defaultValue: 'Użytkownicy według ról' })}</h2>

            <div className="space-y-4">
              {stats?.users.byRole &&
                Object.entries(stats.users.byRole).map(([role, count]) => {
                  const percentage = ((count / stats.users.total) * 100).toFixed(1);
                  const roleColors: Record<string, string> = {
                    admin: 'bg-red-500',
                    team_leader: 'bg-orange-500',
                    employee: 'bg-blue-500',
                  };

                  return (
                    <div key={role}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {role.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${roleColors[role] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('quickActions', { defaultValue: 'Szybkie akcje' })}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/users"
              className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all border border-indigo-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  👥
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t('manageUsers', { defaultValue: 'Zarządzaj użytkownikami' })}</p>
                  <p className="text-xs text-gray-600">{t('addEditDelete', { defaultValue: 'Dodaj, edytuj lub usuń' })}</p>
                </div>
              </div>
            </Link>

            <button
              onClick={loadData}
              className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all border border-green-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
                  🔄
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{t('refreshStats', { defaultValue: 'Odśwież statystyki' })}</p>
                  <p className="text-xs text-gray-600">{t('updateData', { defaultValue: 'Zaktualizuj dane' })}</p>
                </div>
              </div>
            </button>

            <Link
              to="/dashboard"
              className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-all border border-blue-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white">
                  🏠
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t('mainPanel', { defaultValue: 'Panel główny' })}</p>
                  <p className="text-xs text-gray-600">{t('backToDashboard', { defaultValue: 'Wróć do dashboardu' })}</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
