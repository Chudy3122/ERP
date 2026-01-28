import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
        label: 'Do zrobienia',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: Circle
      },
      in_progress: {
        label: 'W trakcie',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: Clock
      },
      review: {
        label: 'Do sprawdzenia',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        icon: AlertCircle
      },
      done: {
        label: 'Zakończone',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle2
      },
      blocked: {
        label: 'Zablokowane',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: AlertCircle
      },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: TaskPriority) => {
    const configs = {
      low: { label: 'Niski', color: 'text-gray-500', dotColor: 'bg-gray-400' },
      medium: { label: 'Średni', color: 'text-blue-600', dotColor: 'bg-blue-500' },
      high: { label: 'Wysoki', color: 'text-orange-600', dotColor: 'bg-orange-500' },
      urgent: { label: 'Pilne', color: 'text-red-600', dotColor: 'bg-red-500' },
    };
    return configs[priority];
  };

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} dni temu`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: 'Dzisiaj', isOverdue: false, isToday: true };
    } else if (diffDays === 1) {
      return { text: 'Jutro', isOverdue: false };
    } else if (diffDays <= 7) {
      return { text: `Za ${diffDays} dni`, isOverdue: false };
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
    <MainLayout title="Moje zadania">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moje zadania</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Przeglądaj i zarządzaj swoimi zadaniami
            </p>
          </div>
          <button
            onClick={() => navigate('/tasks/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nowe zadanie
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CheckSquare className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Wszystkie</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-xs text-gray-500">W trakcie</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.done}</p>
                <p className="text-xs text-gray-500">Zakończone</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-gray-500">Zaległe</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          {/* Tabs */}
          {!selectedProjectId ? (
            <nav className="flex gap-1">
              {[
                { key: 'my', label: 'Moje' },
                { key: 'all', label: 'Wszystkie' },
                { key: 'today', label: 'Dzisiaj' },
                { key: 'week', label: 'Ten tydzień' },
                { key: 'overdue', label: 'Zaległe' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as FilterTab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
              <span className="text-sm text-gray-500">Projekt:</span>
              <span className="text-sm font-medium text-gray-900">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </span>
              <button
                onClick={() => handleSelectProject(null)}
                className="text-xs text-blue-600 hover:text-blue-700 ml-2"
              >
                (wyczyść)
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
              Przejdź do projektu (Kanban)
            </button>
          )}
        </div>

        {/* Search and filters */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj zadań..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          {/* Project filter */}
          <div className="relative">
            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedProjectId || ''}
              onChange={(e) => handleSelectProject(e.target.value || null)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 appearance-none bg-white min-w-[180px]"
            >
              <option value="">Wszystkie projekty</option>
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
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">Wszystkie priorytety</option>
            <option value="urgent">Pilne</option>
            <option value="high">Wysoki</option>
            <option value="medium">Średni</option>
            <option value="low">Niski</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || priorityFilter !== 'all' ? 'Brak wyników' : 'Brak zadań'}
          </h3>
          <p className="text-gray-500 mb-6 text-sm">
            {searchQuery || priorityFilter !== 'all'
              ? 'Nie znaleziono zadań pasujących do filtrów'
              : 'Nie masz żadnych zadań w tej kategorii'}
          </p>
          {!searchQuery && priorityFilter === 'all' && (
            <button
              onClick={() => navigate('/tasks/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Utwórz zadanie
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
          {filteredTasks.map((task) => {
            const priorityConfig = getPriorityConfig(task.priority);
            const statusConfig = getStatusConfig(task.status);
            const dueInfo = task.due_date ? formatDueDate(task.due_date) : null;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
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
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
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
                      <p className="text-sm text-gray-500 mb-2 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
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
                            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600">
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
        <div className="mt-4 text-sm text-gray-500 text-center">
          Wyświetlono {filteredTasks.length} z {tasks.length} zadań
        </div>
      )}
    </MainLayout>
  );
};

export default Tasks;
