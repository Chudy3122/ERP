import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth.types';
import StatusSelector from '../status/StatusSelector';
import { useAutoAway } from '../../hooks/useAutoAway';
import { StatusType, STATUS_COLORS } from '../../types/status.types';
import * as statusApi from '../../api/status.api';
import AIAssistant from '../helpdesk/AIAssistant';
import FloatingChatPanel from '../chat/FloatingChatPanel';
import ChatMeetToast from '../notifications/ChatMeetToast';
import IncomingCallOverlay from '../meeting/IncomingCallOverlay';
import { useChatContext } from '../../contexts/ChatContext';
import GlobalSearch from './GlobalSearch';
import * as notificationApi from '../../api/notification.api';
import { getFileUrl } from '../../api/axios-config';
import { unlockAudio } from '../../utils/audio';
const cleanNotifMsg = (msg: string) =>
  msg.replace(/\s*\((vacation|sick_leave|personal|unpaid|parental|other)\)/gi, '').trim();

const getNotificationLeaveRequestId = (notification: NotificationItem) =>
  notification.related_entity_id ||
  notification.data?.requestId ||
  notification.data?.leaveRequestId ||
  notification.data?.leave_request_id ||
  notification.data?.id ||
  null;

const getNotificationTargetUrl = (notification: NotificationItem) => {
  const actionUrl = notification.action_url;

  if (actionUrl) {
    const path = actionUrl.split('?')[0];
    const leaveDetailMatch = path.match(/^\/(?:time\/leave|time-tracking\/leave|absences)\/([^/]+)$/);
    if (leaveDetailMatch) {
      return `/absences/${leaveDetailMatch[1]}`;
    }

    if (path === '/time-tracking/leave' || path === '/time/leave') {
      const requestId = getNotificationLeaveRequestId(notification);
      return requestId ? `/absences/${requestId}` : '/absences';
    }

    return actionUrl;
  }

  if (
    notification.related_entity_id &&
    ['leave_request_pending', 'leave_request_approved', 'leave_request_rejected'].includes(
      notification.type || '',
    )
  ) {
    const requestId = getNotificationLeaveRequestId(notification);
    return requestId ? `/absences/${requestId}` : '/absences';
  }

  return null;
};

import {
  Home,
  MessageSquare,
  Clock,
  CalendarDays,
  TrendingUp,
  Folder,
  CheckSquare,
  Users,
  AlertCircle,
  BookOpen,
  CalendarClock,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Check,
  User,
  GitBranch,
  Receipt,
  Building2,
  Shield,
  Package,
  ListTodo,
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  exact?: boolean;
}

interface NavHeader {
  type: 'header';
  name: string;
  roles?: UserRole[];
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
  type?: string;
  related_entity_id?: string | null;
  data?: Record<string, any> | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, title }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { totalUnreadCount } = useChatContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [navbarStatus, setNavbarStatus] = useState<StatusType>(StatusType.ONLINE);

  useAutoAway();

  // Show unread (notifications + chat messages) count in the browser tab title
  useEffect(() => {
    const baseTitle = 'ERP - ITComplete';
    const total = (unreadCount || 0) + (totalUnreadCount || 0);
    document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
    return () => { document.title = baseTitle; };
  }, [unreadCount, totalUnreadCount]);

  // Load notifications
  // Unlock audio API on first user interaction (required by browser autoplay policy)
  useEffect(() => {
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const MESSAGE_TYPES = ['chat_message', 'chat_mention', 'channel_invite'];
        // Fetch a larger page so the bell count of non-message notifications is accurate
        const notifData = await notificationApi.getNotifications(1, 50);
        const filtered = notifData.notifications.filter(
          (n: NotificationItem) => !MESSAGE_TYPES.includes(n.type || '')
        );
        setNotifications(filtered.slice(0, 10));
        // Bell badge counts only unread non-message notifications
        setUnreadCount(filtered.filter((n: NotificationItem) => !n.is_read).length);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    // Chat/meeting notifications go to the chat bubble + Chat & Meet badge,
    // not the bell — just refresh the filtered list (which excludes message types)
    const handleNewNotif = () => {
      setTimeout(loadNotifications, 800);
    };
    window.addEventListener('chatmeet:notification', handleNewNotif);

    return () => {
      clearInterval(interval);
      window.removeEventListener('chatmeet:notification', handleNewNotif);
    };
  }, []);

  // Load initial status for navbar dot and track changes
  useEffect(() => {
    statusApi.getMyStatus().then((s) => setNavbarStatus(s.status)).catch(() => {});

    const handler = (e: Event) => setNavbarStatus((e as CustomEvent<StatusType>).detail);
    window.addEventListener('status-changed', handler);
    return () => window.removeEventListener('status-changed', handler);
  }, []);

  useEffect(() => {
    const handleOpenUserStatusMenu = () => {
      setNotificationDropdownOpen(false);
      setUserDropdownOpen(true);
    };

    window.addEventListener('open-user-status-menu', handleOpenUserStatusMenu);

    return () => {
      window.removeEventListener('open-user-status-menu', handleOpenUserStatusMenu);
    };
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

  const canViewAllTickets = user?.role === UserRole.ADMIN || user?.role === UserRole.KIEROWNIK;

  const navigation: NavigationItem[] = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: Home },

    { type: 'divider' },
    { type: 'header', name: t('nav.communication') },
    { name: 'Chat & Meet', href: '/meeting', icon: MessageSquare },

    { type: 'divider' },
    { type: 'header', name: t('nav.workTime') },
    { name: 'Czas pracy', href: '/work-time', icon: Clock },
    { name: t('nav.absences'), href: '/absences', icon: CalendarDays },
    { name: 'Nadgodziny', href: '/overtime', icon: TrendingUp },

    { type: 'divider' },
    { type: 'header', name: t('nav.projects') },
    { name: t('nav.projectList'), href: '/projects', icon: Folder },
    { name: t('nav.myTasks'), href: '/tasks', icon: CheckSquare },
    { name: 'Strefa prywatna', href: '/private-zone', icon: ListTodo },

    { type: 'divider' },
    { type: 'header', name: t('nav.employees') },
    { name: t('nav.employeeList'), href: '/employees', icon: Users },
    { name: t('nav.organization'), href: '/organization', icon: GitBranch },

    { type: 'divider' },
    { type: 'header', name: 'Zaopatrzenie' },
    { name: 'Zaopatrzenie', href: '/supply', icon: Package },

    { type: 'divider' },
    { type: 'header', name: 'Finanse' },
    { name: 'Kontrahenci', href: '/clients', icon: Building2 },
    { name: t('nav.invoiceList'), href: '/invoices', icon: Receipt, roles: [UserRole.ADMIN, UserRole.SZEF, UserRole.KIEROWNIK, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT] },

    { type: 'divider' },
    { type: 'header', name: 'Procedury' },
    { name: 'Procedury', href: '/procedures', icon: BookOpen },

    { type: 'divider' },
    { type: 'header', name: 'Kalendarz Szefa' },
    { name: 'Kalendarz Szefa', href: '/boss-calendar', icon: CalendarClock },

    { type: 'divider' },
    { type: 'header', name: t('nav.tickets') },
    { name: 'Zgłoszenia', href: canViewAllTickets ? '/tickets?tab=all' : '/tickets?tab=my', icon: AlertCircle },

    { type: 'divider' },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
    { name: 'Panel admina', href: '/admin', icon: Shield, roles: [UserRole.ADMIN] },
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
        return <div key={`divider-${idx}`} className="my-2 h-px bg-gray-100 dark:bg-gray-700" />;
      }

      if (item.type === 'header') {
        if (item.roles && (!user || !item.roles.includes(user.role))) return null;
        return (
          <div key={`header-${idx}`} className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            {item.name}
          </div>
        );
      }
    }

    const navItem = item as NavItem;
    if (navItem.roles && (!user || !navItem.roles.includes(user.role))) return null;

    const [navPath, navSearch] = navItem.href.split('?');
    const hasQuerySpecificSibling = navigation.some(candidate => {
      if ('type' in candidate) return false;
      return candidate.href.startsWith(`${location.pathname}?`);
    });
    const pathMatches =
      location.pathname === navPath ||
      (!navItem.exact && location.pathname.startsWith(`${navPath}/`));
    const searchMatches = navSearch
      ? location.search === `?${navSearch}`
      : !(location.pathname === navPath && location.search && hasQuerySpecificSibling);
    const isActive = pathMatches && searchMatches;
    const Icon = navItem.icon;

    const isChatMeet = navItem.href === '/meeting';
    const chatBadge = isChatMeet && totalUnreadCount > 0;

    return (
      <Link
        key={`nav-${idx}`}
        to={navItem.href}
        onClick={() => setSidebarOpen(false)}
        className={`mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
          isActive
            ? 'bg-orange-50 text-[#F7941D] shadow-sm dark:bg-orange-900/15 dark:text-orange-300'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/60 dark:hover:text-white'
        }`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#F7941D] dark:text-orange-300' : 'text-gray-400 dark:text-gray-500'}`} />
        <span className="truncate font-medium flex-1">{navItem.name}</span>
        {chatBadge && (
          <span className="ml-auto min-w-5 h-5 px-1.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold flex-shrink-0">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex lg:h-screen lg:overflow-hidden">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out z-50 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 relative flex items-center justify-center border-b border-gray-200 dark:border-gray-700 px-4">
          <Link to="/" onClick={() => setSidebarOpen(false)} aria-label="Strona główna">
            <img src="/logo_itc.svg" alt="ITComplete.pl" className="h-11 w-auto" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navigation.map((item, idx) => renderNavigationItem(item, idx))}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 relative overflow-hidden text-white text-sm font-semibold">
                <span className="absolute inset-0 flex items-center justify-center">{getInitials(user.first_name, user.last_name)}</span>
                {user.avatar_url && (
                  <img src={getFileUrl(user.avatar_url) || ''} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
      <div className="flex-1 flex min-h-screen flex-col min-w-0 lg:min-h-0">
        {/* Header */}
        <header className="relative h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 px-4 lg:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            {title && (
              <nav aria-label="Ścieżka" className="flex min-w-0 items-center gap-2 text-sm">
                <span className="shrink-0 font-medium text-gray-400 dark:text-gray-500">
                  ITComplete
                </span>
                <span className="shrink-0 text-gray-300 dark:text-gray-600">/</span>
                <span className="truncate font-medium text-gray-600 dark:text-gray-300">
                  {title}
                </span>
              </nav>
            )}
          </div>

          <div className="pointer-events-none absolute left-1/2 hidden w-full max-w-xl -translate-x-1/2 px-4 md:block">
            <div className="pointer-events-auto">
            <GlobalSearch />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
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
                  <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-[500px] flex flex-col overflow-hidden">
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
                    <div className="min-h-0 flex-1 overflow-y-auto">
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
                              const targetUrl = getNotificationTargetUrl(notification);
                              if (targetUrl) {
                                navigate(targetUrl);
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
                                  {cleanNotifMsg(notification.message)}
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

                    <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigate('/notifications');
                          setNotificationDropdownOpen(false);
                        }}
                        className="w-full rounded-md px-3 py-2 text-sm font-medium text-[#F7941D] transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        Zobacz wszystkie
                      </button>
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
                  className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gray-700 relative overflow-hidden text-white text-sm font-semibold">
                      <span className="absolute inset-0 flex items-center justify-center">{getInitials(user.first_name, user.last_name)}</span>
                      {user.avatar_url && (
                        <img src={getFileUrl(user.avatar_url) || ''} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${STATUS_COLORS[navbarStatus]}`} />
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
                          <div className="w-10 h-10 rounded-full bg-gray-700 relative overflow-hidden text-white font-semibold">
                            <span className="absolute inset-0 flex items-center justify-center">{getInitials(user.first_name, user.last_name)}</span>
                            {user.avatar_url && (
                              <img src={getFileUrl(user.avatar_url) || ''} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
        <main className="flex-1 overflow-auto p-3 pb-28 scroll-pb-28 lg:p-4 lg:pb-32 lg:scroll-pb-32">
          {children}
        </main>
      </div>

      {/* Floating Chat Panel */}
      <FloatingChatPanel />

      {/* AI Helpdesk Assistant */}
      <AIAssistant />

      {/* Chat & Meet toast notifications */}
      <ChatMeetToast />

      {/* Incoming video call overlay (Teams-style, global) */}
      <IncomingCallOverlay />
    </div>
  );
};

export default MainLayout;
