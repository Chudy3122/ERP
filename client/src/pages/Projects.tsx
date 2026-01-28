import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Folder,
  Plus,
  Search,
  ChevronRight,
  Loader2,
  FolderOpen,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import * as projectApi from '../api/project.api';
import { Project, ProjectStatus, ProjectPriority, ProjectStatistics } from '../types/project.types';
import { getFileUrl } from '../api/axios-config';

type ViewFilter = 'all' | 'active' | 'completed' | 'planning';

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStatistics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [priorityFilter]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const filters: any = {};
      if (priorityFilter) filters.priority = priorityFilter;
      if (searchQuery) filters.search = searchQuery;

      const result = await projectApi.getProjects(filters);
      setProjects(result.projects);

      // Load statistics for each project
      const statsPromises = result.projects.map(async (project) => {
        try {
          const stats = await projectApi.getProjectStatistics(project.id);
          return { id: project.id, stats };
        } catch {
          return { id: project.id, stats: null };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, ProjectStatistics> = {};
      statsResults.forEach((result) => {
        if (result.stats) {
          statsMap[result.id] = result.stats;
        }
      });
      setProjectStats(statsMap);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadProjects();
  };

  const getStatusConfig = (status: ProjectStatus) => {
    const configs = {
      planning: { label: 'Planowanie', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
      active: { label: 'Aktywny', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
      on_hold: { label: 'Wstrzymany', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
      completed: { label: 'Ukończony', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
      cancelled: { label: 'Anulowany', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: ProjectPriority) => {
    const configs = {
      low: { label: 'Niski', color: 'text-gray-500', dot: 'bg-gray-400' },
      medium: { label: 'Średni', color: 'text-blue-600', dot: 'bg-blue-500' },
      high: { label: 'Wysoki', color: 'text-orange-600', dot: 'bg-orange-500' },
      critical: { label: 'Krytyczny', color: 'text-red-600', dot: 'bg-red-500' },
    };
    return configs[priority];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Filter projects based on view
  const filteredProjects = projects.filter((project) => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'active') return project.status === 'active';
    if (viewFilter === 'completed') return project.status === 'completed';
    if (viewFilter === 'planning') return project.status === 'planning';
    return true;
  });

  // Calculate summary stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;
  const planningProjects = projects.filter((p) => p.status === 'planning').length;

  // Calculate average progress
  const avgProgress = Object.values(projectStats).length > 0
    ? Math.round(
        Object.values(projectStats).reduce((acc, stats) => acc + stats.completion_percentage, 0) /
          Object.values(projectStats).length
      )
    : 0;

  const viewTabs = [
    { key: 'all', label: 'Wszystkie', count: totalProjects },
    { key: 'active', label: 'Aktywne', count: activeProjects },
    { key: 'planning', label: 'Planowanie', count: planningProjects },
    { key: 'completed', label: 'Ukończone', count: completedProjects },
  ];

  return (
    <MainLayout title="Projekty">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
          <p className="text-gray-500 mt-1">Zarządzaj projektami i zadaniami zespołu</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nowy projekt
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Folder className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
              <p className="text-xs text-gray-500">Wszystkich</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{activeProjects}</p>
              <p className="text-xs text-gray-500">Aktywnych</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{completedProjects}</p>
              <p className="text-xs text-gray-500">Ukończonych</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{avgProgress}%</p>
              <p className="text-xs text-gray-500">Śr. postęp</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewFilter(tab.key as ViewFilter)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewFilter === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  viewFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search & Filters */}
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj projektów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ProjectPriority | '')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white"
          >
            <option value="">Wszystkie priorytety</option>
            <option value="low">Niski</option>
            <option value="medium">Średni</option>
            <option value="high">Wysoki</option>
            <option value="critical">Krytyczny</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Folder className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {viewFilter !== 'all' ? 'Brak projektów w tej kategorii' : 'Brak projektów'}
          </h3>
          <p className="text-gray-500 mb-6">
            {viewFilter !== 'all'
              ? 'Zmień filtr lub utwórz nowy projekt'
              : 'Zacznij od utworzenia pierwszego projektu'}
          </p>
          <button
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Utwórz projekt
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Projekt</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Priorytet</div>
            <div className="col-span-2">Postęp</div>
            <div className="col-span-2">Deadline</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {filteredProjects.map((project) => {
              const statusConfig = getStatusConfig(project.status);
              const priorityConfig = getPriorityConfig(project.priority);
              const stats = projectStats[project.id];

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors group items-center"
                >
                  {/* Project Info */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
                      style={{ backgroundColor: statusConfig.dot }}
                    >
                      {project.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate group-hover:text-gray-700">
                          {project.name}
                        </h3>
                        <span className="text-xs text-gray-400 flex-shrink-0">{project.code}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {project.manager && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {project.manager.avatar_url ? (
                              <img
                                src={getFileUrl(project.manager.avatar_url) || ''}
                                alt=""
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600">
                                {getInitials(project.manager.first_name, project.manager.last_name)}
                              </div>
                            )}
                            <span>{project.manager.first_name} {project.manager.last_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${priorityConfig.color}`}>
                      <span className={`w-2 h-2 rounded-full ${priorityConfig.dot}`}></span>
                      {priorityConfig.label}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="col-span-2">
                    {stats ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${stats.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8">
                          {stats.completion_percentage}%
                        </span>
                      </div>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="col-span-2 flex items-center justify-between">
                    {project.target_end_date ? (
                      <span className={`text-xs ${
                        isOverdue(project.target_end_date) && project.status !== 'completed'
                          ? 'text-red-600 font-medium'
                          : 'text-gray-500'
                      }`}>
                        {formatDate(project.target_end_date)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Wyświetlono {filteredProjects.length} z {totalProjects} projektów
        </div>
      )}
    </MainLayout>
  );
};

export default Projects;
