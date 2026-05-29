import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import * as notificationApi from '../api/notification.api';
import { Notification } from '../types/notification.types';

const cleanMsg = (msg: string) =>
  msg.replace(/\s*\((vacation|sick_leave|personal|unpaid|parental|other|Urlop wypoczynkowy|Zwolnienie lekarskie|Urlop na żądanie|Urlop bezpłatny|Urlop rodzicielski|Inny)\)/gi, '').trim();

const getNotificationTargetUrl = (notification: Notification) => {
  const requestId =
    notification.related_entity_id ||
    notification.data?.requestId ||
    notification.data?.leaveRequestId ||
    notification.data?.leave_request_id ||
    notification.data?.id ||
    null;

  if (notification.action_url) {
    const path = notification.action_url.split('?')[0];
    const leaveDetailMatch = path.match(
      /^\/(?:time\/leave|time-tracking\/leave|absences)\/([^/]+)$/,
    );
    if (leaveDetailMatch) {
      return `/absences/${leaveDetailMatch[1]}`;
    }

    if (path === '/time-tracking/leave' || path === '/time/leave') {
      return requestId ? `/absences/${requestId}` : '/absences';
    }

    return notification.action_url;
  }

  if (
    notification.related_entity_id &&
    ['leave_request_pending', 'leave_request_approved', 'leave_request_rejected'].includes(
      notification.type,
    )
  ) {
    return requestId ? `/absences/${requestId}` : '/absences';
  }

  return null;
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 30 | 50>(10);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, [page, pageSize, unreadOnly]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError('');

      const data = await notificationApi.getNotifications(page, pageSize, unreadOnly);
      setNotifications(data.notifications);
      setTotalNotifications(data.total || data.notifications.length);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError('Nie udało się pobrać powiadomień.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pl-PL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await notificationApi.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
      );
    }

    const targetUrl = getNotificationTargetUrl(notification);
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const rangeStart = totalNotifications > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, totalNotifications);

  return (
    <MainLayout title="Powiadomienia">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Centrum powiadomień
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              Wszystkie powiadomienia
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Przeglądaj komunikaty systemowe, zadania, wzmianki i informacje z modułów ERP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                !unreadOnly
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Wszystkie
            </button>
            <button
              type="button"
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                unreadOnly
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Nieprzeczytane
            </button>
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4" />
              Odśwież
            </button>
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || notifications.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMarkingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Oznacz jako przeczytane
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Ładowanie powiadomień...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Brak powiadomień do wyświetlenia.
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Nowe komunikaty pojawią się tutaj automatycznie.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !notification.is_read ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <span
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      notification.is_read
                        ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm ${notification.is_read ? 'font-medium text-gray-800 dark:text-gray-200' : 'font-semibold text-gray-900 dark:text-white'}`}>
                        {notification.title}
                      </span>
                      {!notification.is_read && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          Nowe
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                      {cleanMsg(notification.message)}
                    </span>
                    <span className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(notification.created_at)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !error && totalNotifications > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wyświetlane:{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {rangeStart}-{rangeEnd} z {totalNotifications}
                  </span>
                </p>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>Na stronie</span>
                  <select
                    value={pageSize}
                    onChange={event => {
                      setPageSize(Number(event.target.value) as 10 | 30 | 50);
                      setPage(1);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value={10}>10</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Poprzednia
              </button>
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Następna
                <ChevronRight className="h-4 w-4" />
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications;
