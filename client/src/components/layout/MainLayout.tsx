import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import StatusSelector from '../status/StatusSelector';
import AIAssistant from '../helpdesk/AIAssistant';
import FloatingChatPanel from '../chat/FloatingChatPanel';
import * as notificationApi from '../../api/notification.api';
import { getFileUrl } from '../../api/axios-config';
import {
  Home,
  Video,
  Clock,
  CalendarDays,
  Calendar,
  Folder,
  CheckSquare,
  Users,
  AlertCircle,
  List,
  UserCog,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Check,
  User,
  GitBranch,
  Building2,
  Receipt,
  BarChart3,
  FileSignature,
  Target,
  TrendingUp,
  LayoutTemplate,
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  exact?: boolean;
}

interface NavHeader {
  type: 'header';
  name: string;
  roles?: string[];
}

interface NavDivider {
  type: 'divider';
}

type NavigationItem = NavItem | NavHeader | NavDivider;

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, title }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const [notifData, count] = await Promise.all([
          notificationApi.getNotifications(1, 10),
          notificationApi.getUnreadCount()
        ]);
        setNotifications(notifData.notifications);
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return t('common.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
    return date.toLocaleDateString();
  };

  const navigation: NavigationItem[] = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home },

    { type: 'divider' },
    { type: 'header', name: t('nav.communication') },
    { name: t('nav.meetings'), href: '/meeting', icon: Video },

    { type: 'divider' },
    { type: 'header', name: t('nav.workTime') },
    { name: t('nav.timeTracking'), href: '/time-tracking', icon: Clock },
    { name: t('nav.absences'), href: '/absences', icon: CalendarDays },
    { name: t('nav.teamCalendar'), href: '/team-calendar', icon: Calendar },

    { type: 'divider' },
    { type: 'header', name: t('nav.projects') },
    { name: t('nav.projectList'), href: '/projects', icon: Folder },
    { name: t('nav.myTasks'), href: '/tasks', icon: CheckSquare },

    { type: 'divider' },
    { type: 'header', name: t('nav.employees') },
    { name: t('nav.employeeList'), href: '/employees', icon: Users },
    { name: t('nav.organization'), href: '/organization', icon: GitBranch },

    { type: 'divider' },
    { type: 'header', name: t('nav.invoices') },
    { name: t('nav.clients'), href: '/clients', icon: Building2 },
    { name: t('nav.invoiceList'), href: '/invoices', icon: Receipt },
    { name: t('nav.contracts'), href: '/contracts', icon: FileSignature },
    { name: t('nav.financialReports'), href: '/financial-reports', icon: BarChart3 },

    { type: 'divider' },
    { type: 'header', name: 'CRM' },
    { name: t('nav.crmPipelines', 'Pipeline'), href: '/crm', icon: Target, exact: true },
    { name: t('nav.crmDashboard', 'Dashboard CRM'), href: '/crm/dashboard', icon: TrendingUp },

    { type: 'divider' },
    { type: 'header', name: t('nav.tickets') },
    { name: t('nav.myTickets'), href: '/tickets?filter=my', icon: AlertCircle },
    { name: t('nav.allTickets'), href: '/tickets', icon: List, roles: ['ADMIN', 'TEAM_LEADER'] },

    { type: 'divider' },
    { type: 'header', name: t('nav.administration'), roles: ['ADMIN'] },
    { name: t('nav.users'), href: '/admin/users', icon: UserCog, roles: ['ADMIN'] },
    { name: t('nav.projectTemplates', 'Szablony projektów'), href: '/admin/project-templates', icon: LayoutTemplate, roles: ['ADMIN'] },
    { name: t('nav.reports'), href: '/reports', icon: FileText, roles: ['ADMIN', 'TEAM_LEADER'] },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavigationItem = (item: NavigationItem, idx: number) => {
    if ('type' in item) {
      if (item.type === 'divider') {
        return <div key={`divider-${idx}`} className="my-1 border-t border-gray-200 dark:border-gray-700" />;
      }

      if (item.type === 'header') {
        if (item.roles && !item.roles.includes(user?.role || '')) return null;
        return (
          <div key={`header-${idx}`} className="px-6 py-1 text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold tracking-wider">
            {item.name}
          </div>
        );
      }
    }

    const navItem = item as NavItem;
    if (navItem.roles && !navItem.roles.includes(user?.role || '')) return null;

    const isActive = location.pathname === navItem.href || (!navItem.exact && location.pathname.startsWith(navItem.href + '/'));
    const Icon = navItem.icon;

    return (
      <Link
        key={`nav-${idx}`}
        to={navItem.href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-6 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-gray-800 dark:border-blue-500 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{navItem.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out z-50 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-800 dark:bg-gray-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">ERP</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">System ERP</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navigation.map((item, idx) => renderNavigationItem(item, idx))}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                {user.avatar_url ? (
                  <img src={getFileUrl(user.avatar_url) || ''} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(user.first_name, user.last_name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            {title && <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setNotificationDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-[500px] flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{t('common.notifications')}</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {t('common.markAllRead')}
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">{t('common.noNotifications')}</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                              !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => {
                              if (!notification.is_read) {
                                handleMarkAsRead(notification.id);
                              }
                              if (notification.action_url) {
                                navigate(notification.action_url);
                                setNotificationDropdownOpen(false);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.is_read ? 'bg-gray-300' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${notification.is_read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  {formatTimeAgo(notification.created_at)}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                  title={t('common.markAllRead')}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* User Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                    {user.avatar_url ? (
                      <img src={getFileUrl(user.avatar_url) || ''} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(user.first_name, user.last_name)
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                            {user.avatar_url ? (
                              <img src={getFileUrl(user.avatar_url) || ''} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              getInitials(user.first_name, user.last_name)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.changeStatus', 'Zmień status')}</p>
                        <StatusSelector />
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          {t('common.myProfile', 'Mój profil')}
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          {t('nav.settings')}
                        </Link>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 lg:p-4">
          {children}
        </main>
      </div>

      {/* Floating Chat Panel */}
      <FloatingChatPanel />

      {/* AI Helpdesk Assistant */}
      <AIAssistant />
    </div>
  );
};

export default MainLayout;
