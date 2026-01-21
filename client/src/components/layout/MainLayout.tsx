import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatusSelector from '../status/StatusSelector';
import AIAssistant from '../helpdesk/AIAssistant';
import * as notificationApi from '../../api/notification.api';
import {
  Home,
  MessageSquare,
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

    if (diffMins < 1) return 'przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz. temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return date.toLocaleDateString('pl-PL');
  };

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },

    { type: 'divider' },
    { type: 'header', name: 'Komunikacja' },
    { name: 'Czat', href: '/chat', icon: MessageSquare },
    { name: 'Spotkania', href: '/meeting', icon: Video },

    { type: 'divider' },
    { type: 'header', name: 'Czas pracy' },
    { name: 'Ewidencja czasu', href: '/time-tracking', icon: Clock },
    { name: 'Nieobecności', href: '/absences', icon: CalendarDays },
    { name: 'Kalendarz zespołu', href: '/team-calendar', icon: Calendar },

    { type: 'divider' },
    { type: 'header', name: 'Projekty' },
    { name: 'Lista projektów', href: '/projects', icon: Folder },
    { name: 'Moje zadania', href: '/tasks', icon: CheckSquare },

    { type: 'divider' },
    { type: 'header', name: 'Pracownicy' },
    { name: 'Lista pracowników', href: '/employees', icon: Users },

    { type: 'divider' },
    { type: 'header', name: 'Zgłoszenia' },
    { name: 'Moje zgłoszenia', href: '/tickets?filter=my', icon: AlertCircle },
    { name: 'Wszystkie zgłoszenia', href: '/tickets', icon: List, roles: ['ADMIN', 'TEAM_LEADER'] },

    { type: 'divider' },
    { type: 'header', name: 'Administracja', roles: ['ADMIN'] },
    { name: 'Użytkownicy', href: '/admin/users', icon: UserCog, roles: ['ADMIN'] },
    { name: 'Raporty', href: '/reports', icon: FileText, roles: ['ADMIN', 'TEAM_LEADER'] },
    { name: 'Ustawienia', href: '/notification-settings', icon: Settings },
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
        return <div key={`divider-${idx}`} className="my-1 border-t border-gray-200" />;
      }

      if (item.type === 'header') {
        if (item.roles && !item.roles.includes(user?.role || '')) return null;
        return (
          <div key={`header-${idx}`} className="px-6 py-1 text-xs uppercase text-gray-400 font-semibold tracking-wider">
            {item.name}
          </div>
        );
      }
    }

    const navItem = item as NavItem;
    if (navItem.roles && !navItem.roles.includes(user?.role || '')) return null;

    const isActive = location.pathname === navItem.href || location.pathname.startsWith(navItem.href + '/');
    const Icon = navItem.icon;

    return (
      <Link
        key={`nav-${idx}`}
        to={navItem.href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-6 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900 border-l-4 border-gray-800 font-medium'
            : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{navItem.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-200 ease-in-out z-50 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-800 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">ERP</span>
            </div>
            <span className="font-bold text-gray-900">System ERP</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
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
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(user.first_name, user.last_name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Wyloguj</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
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
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-[500px] flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Powiadomienia</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Oznacz wszystkie
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">Brak powiadomień</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.is_read ? 'bg-blue-50' : ''
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
                                <p className={`text-sm ${notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
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
                                  title="Oznacz jako przeczytane"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-200">
                      <Link
                        to="/notification-settings"
                        onClick={() => setNotificationDropdownOpen(false)}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1"
                      >
                        <Settings className="w-4 h-4" />
                        Ustawienia powiadomień
                      </Link>
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
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(user.first_name, user.last_name)
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              getInitials(user.first_name, user.last_name)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Zmień status</p>
                        <StatusSelector />
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/notification-settings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Ustawienia
                        </Link>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Wyloguj
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

      {/* AI Helpdesk Assistant */}
      <AIAssistant />
    </div>
  );
};

export default MainLayout;
