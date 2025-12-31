import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as adminApi from '../api/admin.api';
import { SystemStats, AdminUser } from '../types/admin.types';

const Admin: React.FC = () => {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      {/* Header */}
      <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg ring-2 ring-white/30">
                ⚙️
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">Panel Administracyjny</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 font-medium text-white shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Users Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-2xl shadow-lg">
                👥
              </div>
              <span className="text-sm font-medium text-gray-500">Użytkownicy</span>
            </div>
            <div className="mb-2">
              <p className="text-3xl font-bold text-gray-900">{stats?.users.total || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                {stats?.users.active || 0} aktywnych
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-gray-600">{onlineCount} online teraz</p>
            </div>
          </div>

          {/* Time Entries Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl shadow-lg">
                ⏰
              </div>
              <span className="text-sm font-medium text-gray-500">Czas pracy</span>
            </div>
            <div className="mb-2">
              <p className="text-3xl font-bold text-gray-900">{stats?.timeEntries.total || 0}</p>
              <p className="text-sm text-blue-600 mt-1">
                {stats?.timeEntries.today || 0} dzisiaj
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              {stats?.timeEntries.thisWeek || 0} w tym tygodniu
            </p>
          </div>

          {/* Leave Requests Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-2xl shadow-lg">
                📅
              </div>
              <span className="text-sm font-medium text-gray-500">Wnioski urlopowe</span>
            </div>
            <div className="mb-2">
              <p className="text-3xl font-bold text-gray-900">{stats?.leaveRequests.total || 0}</p>
              <p className="text-sm text-orange-600 mt-1">
                {stats?.leaveRequests.pending || 0} oczekujących
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              {stats?.leaveRequests.approved || 0} zatwierdzonych
            </p>
          </div>

          {/* Messages Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl shadow-lg">
                💬
              </div>
              <span className="text-sm font-medium text-gray-500">Wiadomości</span>
            </div>
            <div className="mb-2">
              <p className="text-3xl font-bold text-gray-900">{stats?.messages.total || 0}</p>
              <p className="text-sm text-purple-600 mt-1">
                {stats?.messages.today || 0} dzisiaj
              </p>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              {stats?.channels.active || 0} aktywnych kanałów
            </p>
          </div>
        </div>

        {/* Recent Users & Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Registrations */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ostatnie rejestracje</h2>
              <Link
                to="/admin/users"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Zobacz wszystkich →
              </Link>
            </div>

            {recentUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Brak użytkowników</p>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">Użytkownicy według ról</h2>

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
          <h2 className="text-xl font-bold text-gray-900 mb-4">Szybkie akcje</h2>
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
                  <p className="font-semibold text-gray-900">Zarządzaj użytkownikami</p>
                  <p className="text-xs text-gray-600">Dodaj, edytuj lub usuń</p>
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
                  <p className="font-semibold text-gray-900">Odśwież statystyki</p>
                  <p className="text-xs text-gray-600">Zaktualizuj dane</p>
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
                  <p className="font-semibold text-gray-900">Panel główny</p>
                  <p className="text-xs text-gray-600">Wróć do dashboardu</p>
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
