import { useEffect, useState } from 'react';
import { Activity, Folder, CheckSquare, AlertCircle, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../widgets/WidgetCard';
import { client } from '../../api/client';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata?: any;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

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
      const response = await client.get('/activities/recent?limit=15');
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (user: ActivityLog['user']) => {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  };

  const getActivityIcon = (entityType: string) => {
    const iconClass = "w-4 h-4 text-gray-600 dark:text-gray-400";

    switch (entityType) {
      case 'project':
        return <Folder className={iconClass} />;
      case 'task':
        return <CheckSquare className={iconClass} />;
      case 'ticket':
        return <AlertCircle className={iconClass} />;
      case 'time_entry':
        return <Clock className={iconClass} />;
      case 'user':
        return <User className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
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
        navigate(`/tickets/${activity.entity_id}`);
        break;
      case 'user':
        navigate(`/employees/${activity.entity_id}`);
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
        <div className="space-y-2 max-h-64">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="Stream aktywności"
      icon={<Activity className="w-5 h-5 text-gray-600" />}
      className=""
      actions={
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Odświeżane co 30s
        </span>
      }
    >
      <div className="space-y-1 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {activities.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Brak aktywności do wyświetlenia</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              className={`flex gap-2 p-1.5 rounded-md transition-colors ${
                activity.entity_id ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                {getInitials(activity.user)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900 dark:text-gray-100 leading-tight">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatRelativeTime(activity.created_at)}
                </p>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0">
                {getActivityIcon(activity.entity_type)}
              </div>
            </div>
          ))
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={() => navigate('/activities')}
            className="text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
          >
            Zobacz wszystkie aktywności →
          </button>
        </div>
      )}
    </WidgetCard>
  );
};

export default ActivityStreamWidget;
