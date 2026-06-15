import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Briefcase,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  Inbox,
  Loader2,
  RefreshCw,
  TrendingUp,
  User,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { getRecentActivities } from '../api/activity.api';
import { getWorkLogById } from '../api/worklog.api';
import { ActivityLog } from '../types/activity.types';
import { WorkLogType } from '../types/worklog.types';

const ENTITY_FILTERS = [
  { label: 'Wszystkie', value: 'all' },
  { label: 'Projekty', value: 'project' },
  { label: 'Zadania', value: 'task' },
  { label: 'Zgłoszenia', value: 'ticket' },
  { label: 'Czas pracy', value: 'work_log' },
  { label: 'Nadgodziny', value: 'overtime' },
];

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const isOvertimeActivity = (activity: ActivityLog) =>
  activity.entity_type === 'work_log' &&
  [WorkLogType.OVERTIME, WorkLogType.OVERTIME_COMP].includes(activity.metadata?.work_type);

const formatHours = (hours: number) => {
  const totalMinutes = Math.round(Number(hours) * 60);
  const fullHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return [fullHours > 0 ? `${fullHours} godz.` : '', minutes > 0 ? `${minutes} min` : '']
    .filter(Boolean)
    .join(' ');
};

const getActivityDescription = (activity: ActivityLog) => {
  if (!isOvertimeActivity(activity) || activity.metadata?.hours === undefined) {
    return activity.description;
  }

  const duration = formatHours(activity.metadata.hours);

  return activity.metadata.work_type === WorkLogType.OVERTIME_COMP
    ? `Zarejestrowano odbiór ${duration} nadgodzin`
    : `Zalogowano ${duration} nadgodzin`;
};

const Activities = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const workLogDetailsCache = useRef(new Map<string, { workType: WorkLogType; hours: number }>());

  useEffect(() => {
    loadActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    if (activeFilter === 'all') return activities;

    if (activeFilter === 'overtime') {
      return activities.filter((activity) => isOvertimeActivity(activity));
    }

    if (activeFilter === 'work_log') {
      return activities.filter((activity) =>
        ['work_log', 'time_entry'].includes(activity.entity_type) && !isOvertimeActivity(activity),
      );
    }

    return activities.filter((activity) => activity.entity_type === activeFilter);
  }, [activeFilter, activities]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const paginatedActivities = filteredActivities.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, pageSize]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getRecentActivities(100);
      const enrichedActivities = await Promise.all(
        data.map(async (activity) => {
          if (activity.entity_type !== 'work_log' || !activity.entity_id) return activity;

          const cachedDetails = workLogDetailsCache.current.get(activity.entity_id);

          if (cachedDetails) {
            return {
              ...activity,
              metadata: {
                ...activity.metadata,
                work_type: cachedDetails.workType,
                hours: cachedDetails.hours,
              },
            };
          }

          try {
            const workLog = await getWorkLogById(activity.entity_id);
            const details = { workType: workLog.work_type, hours: workLog.hours };
            workLogDetailsCache.current.set(activity.entity_id, details);

            return {
              ...activity,
              metadata: {
                ...activity.metadata,
                work_type: details.workType,
                hours: details.hours,
              },
            };
          } catch {
            return activity;
          }
        }),
      );

      setActivities(enrichedActivities);
    } catch {
      setError('Nie udało się pobrać aktywności.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (activity: ActivityLog) => {
    const firstName = activity.user?.first_name || '';
    const lastName = activity.user?.last_name || '';

    if (!firstName && !lastName) return 'IT';

    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const getUserName = (activity: ActivityLog) => {
    const firstName = activity.user?.first_name;
    const lastName = activity.user?.last_name;

    if (!firstName && !lastName) return 'System';

    return `${firstName || ''} ${lastName || ''}`.trim();
  };

  const getActivityIcon = (activity: ActivityLog) => {
    const iconClass = 'h-5 w-5';

    if (isOvertimeActivity(activity)) {
      return <TrendingUp className={iconClass} />;
    }

    switch (activity.entity_type) {
      case 'project':
        return <Folder className={iconClass} />;
      case 'task':
        return <CheckSquare className={iconClass} />;
      case 'ticket':
        return <AlertCircle className={iconClass} />;
      case 'time_entry':
      case 'work_log':
        return <Clock className={iconClass} />;
      case 'user':
      case 'employee':
        return <User className={iconClass} />;
      case 'invoice':
      case 'contract':
        return <FileText className={iconClass} />;
      case 'client':
      case 'crm_deal':
        return <Briefcase className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getActivityAccent = (activity: ActivityLog) => {
    if (isOvertimeActivity(activity)) {
      return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300';
    }

    switch (activity.entity_type) {
      case 'project':
        return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300';
      case 'task':
        return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'ticket':
        return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300';
      case 'time_entry':
      case 'work_log':
        return 'bg-orange-50 text-[#F7941D] dark:bg-orange-900/20 dark:text-orange-300';
      case 'user':
      case 'employee':
        return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getEntityLabel = (activity: ActivityLog) => {
    if (isOvertimeActivity(activity)) return 'Nadgodziny';

    switch (activity.entity_type) {
      case 'project':
        return 'Projekt';
      case 'task':
        return 'Zadanie';
      case 'ticket':
        return 'Zgłoszenie';
      case 'time_entry':
      case 'work_log':
        return 'Czas pracy';
      case 'user':
      case 'employee':
        return 'Pracownik';
      case 'invoice':
        return 'Faktura';
      case 'contract':
        return 'Umowa';
      case 'client':
        return 'Klient';
      case 'crm_deal':
        return 'CRM';
      default:
        return 'Aktywność';
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

  const handleActivityClick = (activity: ActivityLog) => {
    if (!activity.entity_id) return;

    switch (activity.entity_type) {
      case 'project':
        navigate(`/projects/${activity.entity_id}`);
        break;
      case 'task':
        if (activity.metadata?.project_id) {
          navigate(`/projects/${activity.metadata.project_id}`);
        } else {
          navigate('/tasks');
        }
        break;
      case 'ticket':
        navigate(`/tickets/${activity.entity_id}/edit`);
        break;
      case 'time_entry':
        navigate('/work-time');
        break;
      case 'work_log':
        navigate(isOvertimeActivity(activity) ? '/overtime' : '/work-time');
        break;
      case 'user':
      case 'employee':
        navigate(`/employees/${activity.entity_id}`);
        break;
      case 'invoice':
        navigate(`/invoices/${activity.entity_id}`);
        break;
      case 'contract':
        navigate(`/contracts/${activity.entity_id}`);
        break;
      case 'client':
        navigate(`/clients/${activity.entity_id}`);
        break;
      case 'crm_deal':
        navigate(`/crm/deals/${activity.entity_id}`);
        break;
      default:
        break;
    }
  };

  return (
    <MainLayout title="Aktywność">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Stream aktywności
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              Wszystkie aktywności
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ostatnie działania w projektach, zadaniach, zgłoszeniach i pozostałych modułach ERP.
            </p>
          </div>

          <button
            type="button"
            onClick={loadActivities}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            Odśwież
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {ENTITY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === filter.value
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Ładowanie aktywności...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Brak aktywności do wyświetlenia.
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Zmień filtr albo odśwież listę.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Wyświetlane {pageStart + 1}-{Math.min(pageStart + pageSize, filteredActivities.length)} z {filteredActivities.length}
                </p>

                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span>Na stronie</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(Number(event.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#F7941D] focus:ring-2 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-orange-900/30"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedActivities.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => handleActivityClick(activity)}
                    className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      activity.entity_id ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <span className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getActivityAccent(activity)}`}>
                      {getActivityIcon(activity)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getActivityDescription(activity)}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                          {getEntityLabel(activity)}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                        {getUserName(activity)}
                      </span>
                      <span className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(activity.created_at)}
                      </span>
                    </span>

                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {getInitials(activity)}
                    </span>
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                          page === pageNumber
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Activities;
