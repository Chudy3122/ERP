import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  CheckSquare,
  Plus,
  Calendar,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  FolderOpen,
  Timer,
  ExternalLink,
} from 'lucide-react';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import { Task, TaskStatus, TaskPriority } from '../types/task.types';
import { Project } from '../types/project.types';
import { getFileUrl } from '../api/axios-config';

type FilterTab = 'my' | 'all' | 'today' | 'week' | 'overdue';

const Tasks = () => {
  const { t } = useTranslation('tasks');
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('my');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const navigate = useNavigate();

  // Project filter state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    searchParams.get('project') || null
  );

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [activeTab, selectedProjectId]);

  const loadProjects = async () => {
    try {
      const data = await projectApi.getMyProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      let data: Task[] = [];

      if (selectedProjectId) {
        // Load tasks for selected project
        data = await taskApi.getProjectTasks(selectedProjectId);
      } else {
        switch (activeTab) {
          case 'today':
            data = await taskApi.getTasksDueToday();
            break;
          case 'week':
            data = await taskApi.getUpcomingDeadlines(7);
            break;
          case 'overdue':
            const allTasks = await taskApi.getMyTasks();
            data = allTasks.filter(t =>
              t.due_date &&
              new Date(t.due_date) < new Date() &&
              t.status !== TaskStatus.DONE
            );
            break;
          case 'all':
            data = await taskApi.getTasks();
            break;
          default:
            data = await taskApi.getMyTasks();
        }
      }

      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        (task.description?.toLowerCase().includes(query) ?? false) ||
        (task.project?.name?.toLowerCase().includes(query) ?? false);
      if (!matchesSearch) return false;
    }

    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    done: tasks.filter(t => t.status === TaskStatus.DONE).length,
    overdue: tasks.filter(t =>
      t.due_date &&
      new Date(t.due_date) < new Date() &&
      t.status !== TaskStatus.DONE
    ).length,
  };

  const getStatusConfig = (status: TaskStatus) => {
    const configs: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
      todo: {
        label: t('statusTodo'),
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: Circle
      },
      in_progress: {
        label: t('statusInProgress'),
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: Clock
      },
      review: {
        label: t('statusReview'),
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        icon: AlertCircle
      },
      done: {
        label: t('statusDone'),
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle2
      },
      blocked: {
        label: t('statusBlocked'),
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: AlertCircle
      },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: TaskPriority) => {
    const configs = {
      low: { label: t('priorityLow'), color: 'text-gray-500', dotColor: 'bg-gray-400' },
      medium: { label: t('priorityMedium'), color: 'text-blue-600', dotColor: 'bg-blue-500' },
      high: { label: t('priorityHigh'), color: 'text-orange-600', dotColor: 'bg-orange-500' },
      urgent: { label: t('priorityUrgent'), color: 'text-red-600', dotColor: 'bg-red-500' },
    };
    return configs[priority];
  };

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: t('daysAgo', { count: Math.abs(diffDays) }), isOverdue: true };
    } else if (diffDays === 0) {
      return { text: t('today'), isOverdue: false, isToday: true };
    } else if (diffDays === 1) {
      return { text: t('tomorrow'), isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: t('inDays', { count: diffDays }), isOverdue: false };
    } else {
      return {
        text: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
        isOverdue: false
      };
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <MainLayout title={t('title')}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => navigate('/tasks/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            {t('newTask')}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <CheckSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('total')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('inProgress')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.done}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('done')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('overdueCount')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          {!selectedProjectId ? (
            <nav className="flex gap-1">
              {[
                { key: 'my', label: t('my') },
                { key: 'all', label: t('all') },
                { key: 'today', label: t('today') },
                { key: 'week', label: t('thisWeek') },
                { key: 'overdue', label: t('overdue') },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as FilterTab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'overdue' && stats.overdue > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                      {stats.overdue}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('project')}:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
              <button
                onClick={() => handleSelectProject(null)}
                className="text-xs text-blue-600 hover:text-blue-700 ml-2"
              >
                ({t('clear')})
              </button>
            </div>
          )}

          {/* Go to project button when project is selected */}
          {selectedProjectId && (
            <button
              onClick={() => navigate(`/projects/${selectedProjectId}`)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              {t('goToProject')}
            </button>
          )}
        </div>

        {/* Search and filters */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchTasks')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Project filter */}
          <div className="relative">
            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value || null)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 appearance-none bg-white min-w-[180px] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('allProjects')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">{t('allPriorities')}</option>
            <option value="urgent">{t('priorityUrgent')}</option>
            <option value="high">{t('priorityHigh')}</option>
            <option value="medium">{t('priorityMedium')}</option>
            <option value="low">{t('priorityLow')}</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || priorityFilter !== 'all' ? t('noResults') : t('noTasks')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            {searchQuery || priorityFilter !== 'all'
              ? t('noTasksFiltered')
              : t('noTasksCategory')}
          </p>
          {!searchQuery && priorityFilter === 'all' && (
            <button
              onClick={() => navigate('/tasks/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('createTask')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          {filteredTasks.map((task) => {
            const priorityConfig = getPriorityConfig(task.priority);
            const statusConfig = getStatusConfig(task.status);
            const dueInfo = task.due_date ? formatDueDate(task.due_date) : null;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className={`mt-0.5 p-1.5 rounded-lg ${statusConfig.bgColor}`}>
                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
                        {task.project && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <FolderOpen className="w-3 h-3" />
                            {task.project.name}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {/* Priority */}
                      <span className={`flex items-center gap-1 ${priorityConfig.color}`}>
                        <div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`} />
                        {priorityConfig.label}
                      </span>

                      {/* Hours */}
                      {(task.actual_hours !== undefined || task.estimated_hours !== undefined) && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {task.actual_hours || 0}h
                          {task.estimated_hours && (
                            <span className="text-gray-400">/ {task.estimated_hours}h</span>
                          )}
                        </span>
                      )}

                      {/* Due date */}
                      {dueInfo && (
                        <span className={`flex items-center gap-1 ${
                          dueInfo.isOverdue ? 'text-red-600' : ''
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {dueInfo.text}
                        </span>
                      )}

                      {/* Assignee */}
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          {task.assignee.avatar_url ? (
                            <img
                              src={getFileUrl(task.assignee.avatar_url) || ''}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[8px] font-medium text-gray-600 dark:text-gray-300">
                              {getInitials(task.assignee.first_name, task.assignee.last_name)}
                            </div>
                          )}
                          {task.assignee.first_name} {task.assignee.last_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!isLoading && filteredTasks.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('shown', { shown: filteredTasks.length, total: tasks.length })}
        </div>
      )}
    </MainLayout>
  );
};

export default Tasks;
