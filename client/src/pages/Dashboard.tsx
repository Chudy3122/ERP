import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import TimeChartWidget from '../components/dashboard/TimeChartWidget';
import DeadlineCounterWidget from '../components/dashboard/DeadlineCounterWidget';
import ActivityStreamWidget from '../components/dashboard/ActivityStreamWidget';
import OvertimeWidget from '../components/dashboard/OvertimeWidget';
import ClockInWidget from '../components/dashboard/ClockInWidget';
import DashboardQuickActions from '../components/dashboard/DashboardQuickActions';
import StatWidget from '../components/widgets/StatWidget';
import * as notificationApi from '../api/notification.api';
import * as timeApi from '../api/time.api';
import * as statusApi from '../api/status.api';
import { StatusType, STATUS_TRANSLATION_KEYS } from '../types/status.types';
import { User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const statusCardColors: Record<StatusType, 'green' | 'yellow' | 'red' | 'purple' | 'gray'> = {
  [StatusType.ONLINE]: 'green',
  [StatusType.OFFLINE]: 'gray',
  [StatusType.AWAY]: 'yellow',
  [StatusType.BUSY]: 'red',
  [StatusType.IN_MEETING]: 'purple',
};

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const formattedDateTime = currentDateTime.toLocaleString('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

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

  const openStatusMenu = () => {
    window.dispatchEvent(new Event('open-user-status-menu'));
  };

  return (
    <MainLayout title={t('dashboard.title')}>
      <div className="mx-auto max-w-[1600px]">
        {/* Welcome Header */}
        <div className="mb-6 px-5 py-4 text-center">
          <p className="mb-1 text-xs font-semibold tracking-wide text-[#F7941D]">
            {formattedDateTime}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Witaj, {fullName || user?.first_name || t('common.user', 'użytkowniku')}
          </h1>
          <p className="mx-auto mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Stats Row */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatWidget
            label={t('common.profile')}
            value={({ admin: 'Administrator', kierownik: 'Kierownik', ksiegowosc: 'Księgowość', kadry: 'Kadry', szef: 'Szef', sekretariat: 'Sekretariat' } as Record<string, string>)[user?.role || ''] || t('common.employee')}
            icon={<User className="w-5 h-5" />}
            color="blue"
            onClick={() => navigate('/profile')}
          />

          <StatWidget
            label={t('common.status')}
            value={t(STATUS_TRANSLATION_KEYS[currentStatus])}
            icon={<CheckCircle className="w-5 h-5" />}
            color={statusCardColors[currentStatus]}
            onClick={openStatusMenu}
          />

          <StatWidget
            label={t('common.notifications')}
            value={unreadNotifications}
            icon={<AlertCircle className="w-5 h-5" />}
            color={unreadNotifications > 0 ? 'yellow' : 'gray'}
            onClick={() => navigate('/notifications')}
          />

          <StatWidget
            label={t('dashboard.pendingLeaves')}
            value={pendingLeaveCount}
            icon={<Calendar className="w-5 h-5" />}
            color={pendingLeaveCount > 0 ? 'blue' : 'gray'}
            onClick={() => navigate('/absences')}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 xl:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-6">
            <ClockInWidget />
          </div>

          <div className="lg:col-span-2 xl:col-span-3">
            <OvertimeWidget />
          </div>

          <div className="lg:col-span-3 xl:col-span-3">
            <DeadlineCounterWidget />
          </div>

          <div className="lg:col-span-3 xl:col-span-7">
            <TimeChartWidget />
          </div>

          <div className="lg:col-span-6 xl:col-span-5">
            <ActivityStreamWidget />
          </div>

          <div className="lg:col-span-6 xl:col-span-12">
            <DashboardQuickActions />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
