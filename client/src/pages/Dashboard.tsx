import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import TimeChartWidget from '../components/dashboard/TimeChartWidget';
import DeadlineCounterWidget from '../components/dashboard/DeadlineCounterWidget';
import ActivityStreamWidget from '../components/dashboard/ActivityStreamWidget';
import ClockInWidget from '../components/dashboard/ClockInWidget';
import StatWidget from '../components/widgets/StatWidget';
import WidgetCard from '../components/widgets/WidgetCard';
import * as notificationApi from '../api/notification.api';
import * as timeApi from '../api/time.api';
import * as statusApi from '../api/status.api';
import { StatusType, STATUS_TRANSLATION_KEYS } from '../types/status.types';
import { User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<StatusType>(StatusType.OFFLINE);

  useEffect(() => {
    loadDashboardData();

    const handleStatusChanged = (e: Event) => {
      const status = (e as CustomEvent).detail as StatusType;
      setCurrentStatus(status);
    };
    window.addEventListener('status-changed', handleStatusChanged);
    return () => window.removeEventListener('status-changed', handleStatusChanged);
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load current status
      const userStatus = await statusApi.getMyStatus();
      setCurrentStatus(userStatus.status);

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
    <MainLayout title={t('dashboard.title')}>
      {/* Welcome Header */}
      <div className="mb-2">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome', { name: user?.first_name })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        <StatWidget
          label={t('common.profile')}
          value={user?.role === 'admin' ? 'Administrator' : user?.role === 'team_leader' ? 'Team Leader' : t('common.employee')}
          icon={<User className="w-5 h-5" />}
          color="gray"
        />

        <StatWidget
          label={t('common.status')}
          value={t(STATUS_TRANSLATION_KEYS[currentStatus])}
          icon={<CheckCircle className="w-5 h-5" />}
          color="gray"
        />

        {unreadNotifications > 0 && (
          <StatWidget
            label={t('common.notifications')}
            value={unreadNotifications}
            icon={<AlertCircle className="w-5 h-5" />}
            color="gray"
            onClick={() => window.location.href = '/settings'}
          />
        )}

        {pendingLeaveCount > 0 && (
          <StatWidget
            label={t('dashboard.pendingLeaves')}
            value={pendingLeaveCount}
            icon={<Calendar className="w-5 h-5" />}
            color="gray"
            onClick={() => window.location.href = '/time-tracking/leave/approvals'}
          />
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Left Column - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 space-y-2">
          {/* Time Chart Widget */}
          <TimeChartWidget />

          {/* Activity Stream Widget */}
          <ActivityStreamWidget />
        </div>

        {/* Right Column - Full width on mobile, 1 col on desktop */}
        <div className="space-y-2">
          {/* Clock In/Out Widget */}
          <ClockInWidget />

          {/* Deadline Counter Widget */}
          <DeadlineCounterWidget />

          {/* User Info Widget */}
          <WidgetCard
            title={t('dashboard.accountInfo')}
            icon={<User className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
          >
            <div className="space-y-1">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.fullName')}</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {user?.first_name} {user?.last_name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.email')}</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {user?.email}
                </p>
              </div>

              <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('common.role')}</p>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    user?.role === 'admin'
                      ? 'bg-gray-200 text-gray-800'
                      : user?.role === 'team_leader'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    {user?.role === 'admin' ? 'Administrator' : user?.role === 'team_leader' ? 'Team Leader' : t('common.employee')}
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
