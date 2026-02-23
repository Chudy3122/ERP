import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('projects');
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
      planning:  { label: t('statusPlanning'),  color: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300',   dot: 'bg-slate-400' },
      active:    { label: t('statusActive'),    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
      on_hold:   { label: t('statusOnHold'),    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500' },
      completed: { label: t('statusCompleted'), color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',       dot: 'bg-blue-500' },
      cancelled: { label: t('statusCancelled'), color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',           dot: 'bg-red-500' },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: ProjectPriority) => {
    const configs = {
      low:      { label: t('priorityLow'),      color: 'text-gray-500 dark:text-gray-400',   dot: 'bg-gray-400',   bar: 'bg-gray-400' },
      medium:   { label: t('priorityMedium'),   color: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500',   bar: 'bg-blue-500' },
      high:     { label: t('priorityHigh'),     color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', bar: 'bg-orange-500' },
      critical: { label: t('priorityCritical'), color: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500',    bar: 'bg-red-500' },
    };
    return configs[priority];
  };

  const getDaysRemaining = (dateString: string) => {
    const diff = Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000);
    return diff;
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
    { key: 'all', label: t('all'), count: totalProjects },
    { key: 'active', label: t('active'), count: activeProjects },
    { key: 'planning', label: t('statusPlanning'), count: planningProjects },
    { key: 'completed', label: t('statusCompleted'), count: completedProjects },
  ];

  return (
    <MainLayout title={t('title')}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          {t('newProject')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Folder className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProjects}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('total')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{activeProjects}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('activeCount')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{completedProjects}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('completedCount')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{avgProgress}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('avgProgress')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewFilter(tab.key as ViewFilter)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  viewFilter === tab.key
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  viewFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
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
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ProjectPriority | '')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{t('allPriorities')}</option>
            <option value="low">{t('priorityLow')}</option>
            <option value="medium">{t('priorityMedium')}</option>
            <option value="high">{t('priorityHigh')}</option>
            <option value="critical">{t('priorityCritical')}</option>
          </select>
        </div>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Folder className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {viewFilter !== 'all' ? t('noProjectsInCategory') : t('noProjects')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {viewFilter !== 'all'
              ? t('changeFilter')
              : t('createFirst')}
          </p>
          <button
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('createProject')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-4">{t('project')}</div>
            <div className="col-span-2">{t('status')}</div>
            <div className="col-span-2">{t('priority')}</div>
            <div className="col-span-2">{t('progress')}</div>
            <div className="col-span-2">{t('deadline')}</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredProjects.map((project) => {
              const statusConfig = getStatusConfig(project.status);
              const priorityConfig = getPriorityConfig(project.priority);
              const stats = projectStats[project.id];

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group items-center"
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
                        <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-300">
                          {project.name}
                        </h3>
                        <span className="text-xs text-gray-400 flex-shrink-0">{project.code}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {project.manager && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
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
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${stats.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
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
                      <div>
                        <div className={`text-xs font-medium ${
                          isOverdue(project.target_end_date) && project.status !== 'completed'
                            ? 'text-red-500'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {formatDate(project.target_end_date)}
                        </div>
                        {project.status !== 'completed' && (
                          <div className={`text-xs mt-0.5 ${
                            isOverdue(project.target_end_date)
                              ? 'text-red-400'
                              : getDaysRemaining(project.target_end_date) <= 7
                              ? 'text-amber-500'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {isOverdue(project.target_end_date)
                              ? `${Math.abs(getDaysRemaining(project.target_end_date))}d po terminie`
                              : `${getDaysRemaining(project.target_end_date)}d pozostało`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('shown', { shown: filteredProjects.length, total: totalProjects })}
        </div>
      )}
    </MainLayout>
  );
};

export default Projects;
