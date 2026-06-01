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
  FolderOpen,
  ExternalLink,
  Trash2,
  MoreVertical,
  X,
} from 'lucide-react';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import { Task, TaskStatus, TaskPriority } from '../types/task.types';
import { Project } from '../types/project.types';
import { useAuth } from '../contexts/AuthContext';

type FilterTab = 'my' | 'all' | 'today' | 'tomorrow' | 'week' | 'twoweeks' | 'overdue';
type AssigneeFilter = 'all' | 'mine' | 'unassigned';

const getFilterTabFromDueParam = (due: string | null): FilterTab => {
  switch (due) {
    case 'today':
      return 'today';
    case 'tomorrow':
      return 'tomorrow';
    case 'week':
      return 'week';
    case 'twoweeks':
      return 'twoweeks';
    default:
      return 'my';
  }
};

const getLocalDayStart = (date: Date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};

const getDaysUntilDueDate = (dueDate: string) => {
  const today = getLocalDayStart(new Date());
  const due = getLocalDayStart(new Date(dueDate));

  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const filterTasksByDueRange = (tasks: Task[], minDay: number, maxDay: number) => {
  return tasks.filter((task) => {
    if (!task.due_date || task.status === TaskStatus.DONE) return false;

    const daysUntilDue = getDaysUntilDueDate(task.due_date);
    return daysUntilDue >= minDay && daysUntilDue <= maxDay;
  });
};

const Tasks = () => {
  const { t } = useTranslation('tasks');
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>(() =>
    getFilterTabFromDueParam(searchParams.get('due')),
  );
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState<10 | 30 | 50>(10);
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

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const dueFilter = searchParams.get('due');

    if (dueFilter) {
      setSelectedProjectId(null);
      setActiveTab(getFilterTabFromDueParam(dueFilter));
    }
  }, [searchParams]);

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

  useEffect(() => {
    setTaskPage(1);
  }, [activeTab, selectedProjectId, searchQuery, priorityFilter, assigneeFilter, taskPageSize]);

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
          case 'tomorrow':
            data = await taskApi.getTasksDueTomorrow();
            break;
          case 'week':
            data = filterTasksByDueRange(await taskApi.getUpcomingDeadlines(14), 2, 7);
            break;
          case 'twoweeks':
            data = filterTasksByDueRange(await taskApi.getUpcomingDeadlines(14), 8, 14);
            break;
          case 'overdue': {
            const allTasks = await taskApi.getMyTasks();
            data = allTasks.filter(t =>
              t.due_date &&
              new Date(t.due_date) < new Date() &&
              t.status !== TaskStatus.DONE
            );
            break;
          }
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

  const getTaskAssignees = (task: Task) => {
    if (task.assignees && task.assignees.length > 0) {
      return task.assignees;
    }

    return task.assignee ? [task.assignee] : [];
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const firstInitial = firstName?.[0] || '';
    const lastInitial = lastName?.[0] || '';

    return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        (task.description?.toLowerCase().includes(query) ?? false) ||
        (task.project?.name?.toLowerCase().includes(query) ?? false) ||
        getTaskAssignees(task).some(person =>
          `${person.first_name || ''} ${person.last_name || ''} ${person.email || ''}`
            .toLowerCase()
            .includes(query)
        );
      if (!matchesSearch) return false;
    }

    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    if (assigneeFilter !== 'all') {
      const assignees = getTaskAssignees(task);

      if (assigneeFilter === 'mine') {
        return Boolean(user?.id && assignees.some(person => person.id === user.id));
      }

      if (assigneeFilter === 'unassigned') {
        return assignees.length === 0;
      }
    }

    return true;
  });

  const taskTotalPages = Math.max(1, Math.ceil(filteredTasks.length / taskPageSize));
  const taskStartIndex = (taskPage - 1) * taskPageSize;
  const taskEndIndex = Math.min(taskStartIndex + taskPageSize, filteredTasks.length);
  const paginatedTasks = filteredTasks.slice(taskStartIndex, taskEndIndex);
  const taskRangeLabel =
    filteredTasks.length > 0
      ? `${taskStartIndex + 1}-${taskEndIndex} z ${filteredTasks.length}`
      : '0 z 0';

  useEffect(() => {
    if (taskPage > taskTotalPages) {
      setTaskPage(taskTotalPages);
    }
  }, [taskPage, taskTotalPages]);

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
      <div className="mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Moduł zadań
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/tasks/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <Plus className="w-4 h-4" />
          {t('newTask')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
              <CheckSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('total')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('inProgress')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.done}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('done')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('overdueCount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-3 dark:border-gray-700">
          {/* Tabs */}
          {!selectedProjectId ? (
            <nav className="flex flex-wrap gap-2">
              {[
                { key: 'my', label: t('my') },
                { key: 'all', label: t('all') },
                { key: 'today', label: t('today') },
                { key: 'tomorrow', label: t('tomorrow') },
                { key: 'week', label: '2-7 dni' },
                { key: 'twoweeks', label: '8-14 dni' },
                { key: 'overdue', label: t('overdue') },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as FilterTab)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'overdue' && stats.overdue > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        activeTab === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {stats.overdue}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('project')}:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
              <button
                onClick={() => handleSelectProject(null)}
                className="ml-1 text-xs font-semibold text-[#F7941D] hover:text-[#d87f16]"
              >
                ({t('clear')})
              </button>
            </div>
          )}

          {/* Go to project button when project is selected */}
          {selectedProjectId && (
            <button
              onClick={() => navigate(`/projects/${selectedProjectId}`)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ExternalLink className="w-3 h-3" />
              {t('goToProject')}
            </button>
          )}
        </div>

        {/* Search and filters */}
        <div className="flex flex-wrap items-start gap-3 bg-gray-50/70 p-4 dark:bg-gray-800/60">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Szukaj zadania
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchTasks')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 rounded-md p-1 text-gray-400 -translate-y-1/2 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                  aria-label="Wyczyść wyszukiwanie"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-[190px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Projekt
            </label>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedProjectId || ''}
                onChange={(e) => handleSelectProject(e.target.value || null)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('allProjects')}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-w-[170px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Priorytet
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">{t('allPriorities')}</option>
              <option value="urgent">{t('priorityUrgent')}</option>
              <option value="high">{t('priorityHigh')}</option>
              <option value="medium">{t('priorityMedium')}</option>
              <option value="low">{t('priorityLow')}</option>
            </select>
          </div>

          <div className="min-w-[190px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Przypisanie
            </label>
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value as AssigneeFilter)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Wszystkie osoby</option>
              <option value="mine">Przypisane do mnie</option>
              <option value="unassigned">Bez przypisanych</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 h-4 w-64 rounded bg-gray-200 dark:bg-gray-700"></div>
                    <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-7 w-20 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
            <CheckSquare className="h-7 w-7" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            {searchQuery || priorityFilter !== 'all' || assigneeFilter !== 'all'
              ? t('noResults')
              : t('noTasks')}
          </h3>
          <p className="mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || priorityFilter !== 'all' || assigneeFilter !== 'all'
              ? t('noTasksFiltered')
              : t('noTasksCategory')}
          </p>
          {!searchQuery && priorityFilter === 'all' && assigneeFilter === 'all' && (
            <button
              onClick={() => navigate('/tasks/new')}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Plus className="w-4 h-4" />
              {t('createTask')}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Table header */}
          <div className="grid min-w-[1080px] grid-cols-[70px_minmax(240px,1fr)_140px_170px_90px_110px_100px_42px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <div>{t('time')}</div>
            <div>{t('taskName')}</div>
            <div>{t('project')}</div>
            <div>Osoby</div>
            <div>{t('priority')}</div>
            <div>{t('dueDate')}</div>
            <div>{t('status')}</div>
            <div></div>
          </div>

          {/* Task rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {paginatedTasks.map((task) => {
              const priorityConfig = getPriorityConfig(task.priority);
              const statusConfig = getStatusConfig(task.status);
              const dueInfo = task.due_date ? formatDueDate(task.due_date) : null;
              const taskAssignees = getTaskAssignees(task);

              return (
                <div
                  key={task.id}
                  className="group grid min-w-[1080px] cursor-pointer grid-cols-[70px_minmax(240px,1fr)_140px_170px_90px_110px_100px_42px] items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => navigate(`/tasks/${task.id}/edit`)}
                >
                  {/* Actual hours */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                      {task.actual_hours ? `${task.actual_hours}h` : '-'}
                    </span>
                  </div>

                  {/* Title & description */}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{task.description}</p>
                    )}
                  </div>

                  {/* Project */}
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {task.project?.name || '-'}
                  </div>

                  {/* Assignees */}
                  <div
                    className="flex min-w-0 items-center gap-2"
                    title={
                      taskAssignees.length > 0
                        ? taskAssignees
                            .map(person => `${person.first_name} ${person.last_name}`)
                            .join(', ')
                        : 'Brak przypisanych osób'
                    }
                  >
                    {taskAssignees.length > 0 ? (
                      <>
                        <div className="flex items-center">
                          {taskAssignees.slice(0, 3).map((person, index) => (
                            <div
                              key={person.id}
                              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-bold text-blue-700 ring-1 ring-white dark:bg-blue-900/40 dark:text-blue-200 dark:ring-gray-800"
                              style={{ marginLeft: index > 0 ? '-6px' : 0 }}
                              title={`${person.first_name} ${person.last_name}`}
                            >
                              {getInitials(person.first_name, person.last_name)}
                            </div>
                          ))}
                          {taskAssignees.length > 3 && (
                            <div
                              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600 ring-1 ring-white dark:bg-gray-600 dark:text-gray-200 dark:ring-gray-800"
                              style={{ marginLeft: '-6px' }}
                              title={taskAssignees
                                .slice(3)
                                .map(person => `${person.first_name} ${person.last_name}`)
                                .join(', ')}
                            >
                              +{taskAssignees.length - 3}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 text-xs text-gray-500 dark:text-gray-400">
                          <span className="block truncate">
                            {taskAssignees.length === 1
                              ? `${taskAssignees[0].first_name} ${taskAssignees[0].last_name}`
                              : `${taskAssignees.length} osoby`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </div>

                  {/* Priority */}
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${priorityConfig.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dotColor}`} />
                    {priorityConfig.label}
                  </div>

                  {/* Due date */}
                  <div className={`text-xs ${dueInfo?.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                    {dueInfo ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dueInfo.text}
                      </span>
                    ) : '-'}
                  </div>

                  {/* Status badge */}
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Wyświetlane:{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {taskRangeLabel}
                </span>
              </p>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Na stronie</span>
                <select
                  value={taskPageSize}
                  onChange={e => setTaskPageSize(Number(e.target.value) as 10 | 30 | 50)}
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
                onClick={() => setTaskPage(page => Math.max(1, page - 1))}
                disabled={taskPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Poprzednia
              </button>
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {taskPage} / {taskTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setTaskPage(page => Math.min(taskTotalPages, page + 1))}
                disabled={taskPage === taskTotalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Następna
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

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

    </MainLayout>
  );
};

export default Tasks;
