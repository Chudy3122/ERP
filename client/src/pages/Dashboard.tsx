import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import TimeChartWidget from '../components/dashboard/TimeChartWidget';
import DeadlineCounterWidget from '../components/dashboard/DeadlineCounterWidget';
import ActivityStreamWidget from '../components/dashboard/ActivityStreamWidget';
import StatWidget from '../components/widgets/StatWidget';
import WidgetCard from '../components/widgets/WidgetCard';
import * as notificationApi from '../api/notification.api';
import * as timeApi from '../api/time.api';
import { User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load unread notifications
      const count = await notificationApi.getUnreadCount();
      setUnreadNotifications(count);

      // Load pending leave requests for admins/team leaders
      if (user?.role === 'admin' || user?.role === 'team_leader') {
        const requests = await timeApi.getPendingLeaveRequests();
        setPendingLeaveCount(requests.length);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  return (
    <MainLayout title="Panel główny">
      {/* Welcome Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900">
          Witaj, {user?.first_name}
        </h1>
        <p className="text-gray-600 mt-0.5 text-sm">
          Sprawdź swoje ostatnie aktywności i nadchodzące zadania
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatWidget
          label="Profil"
          value={user?.role === 'admin' ? 'Administrator' : user?.role === 'team_leader' ? 'Team Leader' : 'Pracownik'}
          icon={<User className="w-5 h-5" />}
          color="gray"
        />

        <StatWidget
          label="Status"
          value="Aktywny"
          icon={<CheckCircle className="w-5 h-5" />}
          color="gray"
        />

        {unreadNotifications > 0 && (
          <StatWidget
            label="Powiadomienia"
            value={unreadNotifications}
            icon={<AlertCircle className="w-5 h-5" />}
            color="gray"
            onClick={() => window.location.href = '/notification-settings'}
          />
        )}

        {pendingLeaveCount > 0 && (
          <StatWidget
            label="Urlopy do zatwierdzenia"
            value={pendingLeaveCount}
            icon={<Calendar className="w-5 h-5" />}
            color="gray"
            onClick={() => window.location.href = '/time-tracking/leave/approvals'}
          />
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left Column - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 space-y-3">
          {/* Time Chart Widget */}
          <TimeChartWidget />

          {/* Activity Stream Widget */}
          <ActivityStreamWidget />
        </div>

        {/* Right Column - Full width on mobile, 1 col on desktop */}
        <div className="space-y-3">
          {/* Deadline Counter Widget */}
          <DeadlineCounterWidget />

          {/* User Info Widget */}
          <WidgetCard
            title="Informacje o koncie"
            icon={<User className="w-5 h-5 text-gray-600" />}
          >
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Imię i nazwisko</p>
                <p className="text-xs font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-xs font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
              </div>

              {user?.department && (
                <div>
                  <p className="text-xs text-gray-500">Dział</p>
                  <p className="text-xs font-medium text-gray-900">
                    {user.department}
                  </p>
                </div>
              )}

              {user?.phone && (
                <div>
                  <p className="text-xs text-gray-500">Telefon</p>
                  <p className="text-xs font-medium text-gray-900">
                    {user.phone}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">Rola w systemie</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user?.role === 'admin'
                      ? 'bg-gray-200 text-gray-800'
                      : user?.role === 'team_leader'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    {user?.role === 'admin' ? 'Administrator' : user?.role === 'team_leader' ? 'Team Leader' : 'Pracownik'}
                  </span>
                </div>
              </div>
            </div>
          </WidgetCard>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
