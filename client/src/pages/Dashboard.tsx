import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import TimeChartWidget from '../components/dashboard/TimeChartWidget';
import DeadlineCounterWidget from '../components/dashboard/DeadlineCounterWidget';
import ActivityStreamWidget from '../components/dashboard/ActivityStreamWidget';
import OvertimeWidget from '../components/dashboard/OvertimeWidget';
import ClockInWidget from '../components/dashboard/ClockInWidget';
import StatWidget from '../components/widgets/StatWidget';
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
      if (user?.role === 'admin' || user?.role === 'kierownik') {
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
          value={user?.role === 'admin' ? 'Administrator' : user?.role === 'kierownik' ? 'Team Leader' : t('common.employee')}
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
            onClick={() => window.location.href = '/absences'}
          />
        )}
      </div>

      {/* Main Dashboard Grid — single unified grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">

        {/* Row 1: ClockIn (2/3) + Overtime (1/3) */}
        <div className="lg:col-span-2">
          <ClockInWidget />
        </div>
        <div>
          <OvertimeWidget />
        </div>

        {/* Row 2: Chart (2/3) + Deadline (1/3) */}
        <div className="lg:col-span-2">
          <TimeChartWidget />
        </div>
        <div>
          <DeadlineCounterWidget />
        </div>

        {/* Row 3: Activity — full width */}
        <div className="lg:col-span-3">
          <ActivityStreamWidget />
        </div>

      </div>
    </MainLayout>
  );
};

export default Dashboard;
