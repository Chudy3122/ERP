import { useEffect, useState } from 'react';
import { Activity, Briefcase, Folder, CheckSquare, AlertCircle, Clock, User, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../widgets/WidgetCard';
import { getRecentActivities } from '../../api/activity.api';
import { ActivityLog } from '../../types/activity.types';
import { DashboardWidgetEmpty, DashboardWidgetLoading } from './DashboardWidgetState';

const ActivityStreamWidget = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const data = await getRecentActivities(15);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
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

  const getActivityIcon = (entityType: string) => {
    const iconClass = 'h-4 w-4';

    switch (entityType) {
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

  const getActivityAccent = (entityType: string) => {
    switch (entityType) {
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

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours}h temu`;
    if (diffDays === 1) return 'Wczoraj';
    if (diffDays < 7) return `${diffDays} dni temu`;

    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  };

  const handleActivityClick = (activity: ActivityLog) => {
    // Navigate to entity details based on type and id
    if (!activity.entity_id) return;

    switch (activity.entity_type) {
      case 'project':
        navigate(`/projects/${activity.entity_id}`);
        break;
      case 'task':
        // Tasks are viewed in project context
        if (activity.metadata?.project_id) {
          navigate(`/projects/${activity.metadata.project_id}`);
        } else {
          navigate('/tasks');
        }
        break;
      case 'ticket':
        navigate(`/tickets/${activity.entity_id}/edit`);
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

  if (isLoading) {
    return (
      <WidgetCard
        title="Stream aktywności"
        icon={<Activity className="w-5 h-4 text-gray-600" />}
      >
        <DashboardWidgetLoading label="Ładowanie aktywności..." />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Stream aktywności"
      icon={<Activity className="w-5 h-5 text-gray-600" />}
      className="h-full"
      actions={
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Odświeżane co 30s
        </span>
      }
    >
      <div className="max-h-72 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {activities.length === 0 ? (
          <DashboardWidgetEmpty
            icon={<Activity className="h-5 w-5" />}
            title="Brak aktywności"
            description="Nowe działania z projektów i zadań pojawią się tutaj automatycznie."
            className="min-h-[160px]"
          />
        ) : (
          activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => handleActivityClick(activity)}
              className={`flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors ${
                activity.entity_id ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-default'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getActivityAccent(activity.entity_type)}`}>
                {getActivityIcon(activity.entity_type)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
                    {activity.description}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    {getEntityLabel(activity.entity_type)}
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span>{getUserName(activity)}</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>{formatRelativeTime(activity.created_at)}</span>
                </span>
              </span>

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {getInitials(activity)}
              </span>
            </button>
          ))
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3 text-center dark:border-gray-700">
          <button
            onClick={() => navigate('/activities')}
            className="text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Zobacz wszystkie aktywności →
          </button>
        </div>
      )}
    </WidgetCard>
  );
};

export default ActivityStreamWidget;
