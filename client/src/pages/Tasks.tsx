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
  ExternalLink,
  Trash2,
  MoreVertical,
  X,
} from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import * as worklogApi from '../api/worklog.api';
import { Task, TaskStatus, TaskPriority } from '../types/task.types';
import { Project } from '../types/project.types';
import { WorkLogType, WorkLogTypeLabels } from '../types/worklog.types';

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

  // Delete task state
  const [deleteTask, setDeleteTask] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Time logging state
  const [logTimeTask, setLogTimeTask] = useState<Task | null>(null);
  const [logTimeForm, setLogTimeForm] = useState({
    hours: '',
    work_date: new Date().toISOString().split('T')[0],
    work_type: WorkLogType.REGULAR as WorkLogType,
    description: '',
  });
  const [isLoggingTime, setIsLoggingTime] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

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

  const handleDeleteTask = async () => {
    if (!deleteTask) return;
    try {
      setIsDeleting(true);
      await taskApi.deleteTask(deleteTask.id);
      setTasks(tasks.filter(t => t.id !== deleteTask.id));
      setDeleteTask(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenLogTime = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setLogTimeTask(task);
    setLogTimeForm({
      hours: '',
      work_date: new Date().toISOString().split('T')[0],
      work_type: WorkLogType.REGULAR,
      description: '',
    });
  };

  const handleLogTime = async () => {
    if (!logTimeTask || !logTimeForm.hours) return;

    const hours = parseFloat(logTimeForm.hours.replace(',', '.'));
    if (isNaN(hours) || hours <= 0) return;

    try {
      setIsLoggingTime(true);
      await worklogApi.createWorkLog({
        task_id: logTimeTask.id,
        project_id: logTimeTask.project_id || undefined,
        work_date: logTimeForm.work_date,
        hours: hours,
        work_type: logTimeForm.work_type,
        description: logTimeForm.description || undefined,
        is_billable: logTimeForm.work_type === WorkLogType.REGULAR,
      });

      // Update local task with new hours
      setTasks(tasks.map(t =>
        t.id === logTimeTask.id
          ? { ...t, actual_hours: (t.actual_hours || 0) + hours }
          : t
      ));

      setLogTimeTask(null);
    } catch (error) {
      console.error('Failed to log time:', error);
    } finally {
      setIsLoggingTime(false);
    }
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

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded">
              <CheckSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{stats.total}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('total')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600 leading-none">{stats.inProgress}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('inProgress')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 leading-none">{stats.done}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('done')}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-600 leading-none">{stats.overdue}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('overdueCount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar - Compact */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          {!selectedProjectId ? (
            <nav className="flex gap-0.5">
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
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === tab.key
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'overdue' && stats.overdue > 0 && (
                    <span className="ml-1 px-1 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full">
                      {stats.overdue}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('project')}:</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
              <button
                onClick={() => handleSelectProject(null)}
                className="text-[10px] text-blue-600 hover:text-blue-700 ml-1"
              >
                ({t('clear')})
              </button>
            </div>
          )}

          {/* Go to project button when project is selected */}
          {selectedProjectId && (
            <button
              onClick={() => navigate(`/projects/${selectedProjectId}`)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-3 h-3" />
              {t('goToProject')}
            </button>
          )}
        </div>

        {/* Search and filters */}
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchTasks')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          {/* Project filter */}
          <div className="relative">
            <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value || null)}
              className="pl-8 pr-6 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 appearance-none bg-white min-w-[150px] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[60px_1fr_100px_70px_90px_75px_36px] gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div>{t('time')}</div>
            <div>{t('taskName')}</div>
            <div>{t('project')}</div>
            <div>{t('priority')}</div>
            <div>{t('dueDate')}</div>
            <div>{t('status')}</div>
            <div></div>
          </div>

          {/* Task rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredTasks.map((task) => {
              const priorityConfig = getPriorityConfig(task.priority);
              const statusConfig = getStatusConfig(task.status);
              const dueInfo = task.due_date ? formatDueDate(task.due_date) : null;

              return (
                <div
                  key={task.id}
                  className="grid grid-cols-[60px_1fr_100px_70px_90px_75px_36px] gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors items-center group"
                  onClick={() => navigate(`/tasks/${task.id}/edit`)}
                >
                  {/* Time logging button + actual hours */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleOpenLogTime(e, task)}
                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={t('logTime')}
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      {task.actual_hours ? `${task.actual_hours}h` : '-'}
                    </span>
                  </div>

                  {/* Title & description */}
                  <div className="min-w-0">
                    <h3 className="text-xs font-medium truncate text-gray-900 dark:text-white">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{task.description}</p>
                    )}
                  </div>

                  {/* Project */}
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {task.project?.name || '-'}
                  </div>

                  {/* Priority */}
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${priorityConfig.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`} />
                    {priorityConfig.label}
                  </div>

                  {/* Due date */}
                  <div className={`text-[10px] ${dueInfo?.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    {dueInfo ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dueInfo.text}
                      </span>
                    ) : '-'}
                  </div>

                  {/* Status badge */}
                  <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === task.id ? null : task.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === task.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}/edit`);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {t('edit')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTask({ id: task.id, title: task.title });
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <span className="flex items-center gap-1.5">
                            <Trash2 className="w-3 h-3" />
                            {t('delete')}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer count */}
      {!isLoading && filteredTasks.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          {t('shown', { shown: filteredTasks.length, total: tasks.length })}
        </div>
      )}

      {/* Delete Task Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteTask !== null}
        onClose={() => setDeleteTask(null)}
        onConfirm={handleDeleteTask}
        title={t('deleteTaskTitle')}
        message={t('deleteTaskConfirm', { title: deleteTask?.title })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
        icon="delete"
        loading={isDeleting}
      />

      {/* Log Time Modal */}
      {logTimeTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setLogTimeTask(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('logTime')}</h3>
              <button
                onClick={() => setLogTimeTask(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task name */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">
              {logTimeTask.title}
            </p>

            <div className="space-y-4">
              {/* Hours input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('hours')}*
                </label>
                <input
                  type="text"
                  value={logTimeForm.hours}
                  onChange={(e) => setLogTimeForm({ ...logTimeForm, hours: e.target.value })}
                  placeholder="1.5"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('date')}
                </label>
                <input
                  type="date"
                  value={logTimeForm.work_date}
                  onChange={(e) => setLogTimeForm({ ...logTimeForm, work_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('type')}
                </label>
                <select
                  value={logTimeForm.work_type}
                  onChange={(e) => setLogTimeForm({ ...logTimeForm, work_type: e.target.value as WorkLogType })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(WorkLogTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('description')}
                </label>
                <textarea
                  value={logTimeForm.description}
                  onChange={(e) => setLogTimeForm({ ...logTimeForm, description: e.target.value })}
                  placeholder={t('descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setLogTimeTask(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleLogTime}
                disabled={!logTimeForm.hours || isLoggingTime}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isLoggingTime && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Tasks;
