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
  X,
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
  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState<10 | 30 | 50>(10);
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = window.setTimeout(
      () => {
        setProjectPage(1);
        loadProjects();
      },
      searchQuery ? 350 : 0
    );

    return () => window.clearTimeout(timeout);
  }, [priorityFilter, searchQuery]);

  useEffect(() => {
    setProjectPage(1);
  }, [viewFilter, priorityFilter, projectPageSize]);

  const loadProjects = async (overrideFilters?: {
    search?: string;
    priority?: ProjectPriority | '';
  }) => {
    try {
      setIsLoading(true);
      const filters: any = {};
      const nextPriority = overrideFilters?.priority ?? priorityFilter;
      const nextSearch = overrideFilters?.search ?? searchQuery;
      if (nextPriority) filters.priority = nextPriority;
      if (nextSearch) filters.search = nextSearch;

      const result = await projectApi.getProjects(filters);
      setProjects(result.projects);

      // Load statistics for each project
      const statsPromises = result.projects.map(async project => {
        try {
          const stats = await projectApi.getProjectStatistics(project.id);
          return { id: project.id, stats };
        } catch {
          return { id: project.id, stats: null };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, ProjectStatistics> = {};
      statsResults.forEach(result => {
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
    setProjectPage(1);
    loadProjects();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('');
    setViewFilter('all');
    setProjectPage(1);
    loadProjects({ search: '', priority: '' });
  };

  const getStatusConfig = (status: ProjectStatus) => {
    const configs = {
      planning: {
        label: t('statusPlanning'),
        color: 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300',
        dot: 'bg-slate-400',
      },
      active: {
        label: t('statusActive'),
        color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
      },
      on_hold: {
        label: t('statusOnHold'),
        color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        dot: 'bg-amber-500',
      },
      completed: {
        label: t('statusCompleted'),
        color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        dot: 'bg-blue-500',
      },
      cancelled: {
        label: t('statusCancelled'),
        color: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        dot: 'bg-red-500',
      },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: ProjectPriority) => {
    const configs = {
      low: {
        label: t('priorityLow'),
        color: 'text-gray-500 dark:text-gray-400',
        dot: 'bg-gray-400',
        bar: 'bg-gray-400',
      },
      medium: {
        label: t('priorityMedium'),
        color: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
        bar: 'bg-blue-500',
      },
      high: {
        label: t('priorityHigh'),
        color: 'text-orange-600 dark:text-orange-400',
        dot: 'bg-orange-500',
        bar: 'bg-orange-500',
      },
      critical: {
        label: t('priorityCritical'),
        color: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
        bar: 'bg-red-500',
      },
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
  const filteredProjects = projects.filter(project => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'active') return project.status === 'active';
    if (viewFilter === 'completed') return project.status === 'completed';
    if (viewFilter === 'planning') return project.status === 'planning';
    return true;
  });
  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projectPageSize));
  const projectStartIndex = (projectPage - 1) * projectPageSize;
  const projectEndIndex = Math.min(projectStartIndex + projectPageSize, filteredProjects.length);
  const paginatedProjects = filteredProjects.slice(projectStartIndex, projectEndIndex);
  const projectRangeLabel =
    filteredProjects.length > 0
      ? `${projectStartIndex + 1}-${projectEndIndex} z ${filteredProjects.length}`
      : '0 z 0';

  // Calculate summary stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  const planningProjects = projects.filter(p => p.status === 'planning').length;

  // Calculate average progress
  const avgProgress =
    Object.values(projectStats).length > 0
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
  const hasProjectFilters = Boolean(searchQuery || priorityFilter);

  useEffect(() => {
    if (projectPage > projectTotalPages) {
      setProjectPage(projectTotalPages);
    }
  }, [projectPage, projectTotalPages]);

  return (
    <MainLayout title={t('title')}>
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Moduł projektów
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <Plus className="w-5 h-5" />
            {t('newProject')}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                <Folder className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('total')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <FolderOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{activeProjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('activeCount')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{completedProjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('completedCount')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30">
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
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Tabs */}
          <div className="border-b border-gray-100 p-3 dark:border-gray-700">
            <nav className="flex flex-wrap gap-2">
              {viewTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewFilter(tab.key as ViewFilter)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    viewFilter === tab.key
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      viewFilter === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-end gap-3 bg-gray-50/70 p-4 dark:bg-gray-800/60">
            <div className="min-w-[260px] flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Szukaj projektu
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Wyniki odświeżają się automatycznie po wpisaniu frazy.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Priorytet
              </label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as ProjectPriority | '')}
                className="min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('allPriorities')}</option>
                <option value="low">{t('priorityLow')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="high">{t('priorityHigh')}</option>
                <option value="critical">{t('priorityCritical')}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Szukaj
            </button>

            {hasProjectFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
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
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              <Folder className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {viewFilter !== 'all' ? t('noProjectsInCategory') : t('noProjects')}
            </h3>
            <p className="max-w-md text-sm text-gray-500 dark:text-gray-400 mb-6">
              {viewFilter !== 'all' ? t('changeFilter') : t('createFirst')}
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Plus className="w-5 h-5" />
              {t('createProject')}
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {/* Table Header */}
            <div className="hidden grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-400 lg:grid">
              <div className="col-span-5">{t('project')}</div>
              <div className="col-span-2">{t('status')}</div>
              <div className="col-span-2">{t('priority')}</div>
              <div className="col-span-1">{t('progress')}</div>
              <div className="col-span-2">Termin zakończenia</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedProjects.map(project => {
                const statusConfig = getStatusConfig(project.status);
                const priorityConfig = getPriorityConfig(project.priority);
                const stats = projectStats[project.id];

                return (
                  <button
                    type="button"
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="group grid w-full grid-cols-1 gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#F7941D]/30 dark:hover:bg-gray-700 lg:grid-cols-12 lg:items-center lg:gap-4"
                  >
                    {/* Project Info */}
                    <div className="flex min-w-0 items-center gap-3 lg:col-span-5">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ${statusConfig.color}`}
                      >
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-300">
                            {project.name}
                          </h3>
                          <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                            {project.code}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          {project.manager && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              {project.manager.avatar_url ? (
                                <img
                                  src={getFileUrl(project.manager.avatar_url) || ''}
                                  alt=""
                                  className="h-4 w-4 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[8px] font-medium text-gray-600">
                                  {getInitials(
                                    project.manager.first_name,
                                    project.manager.last_name
                                  )}
                                </div>
                              )}
                              <span>
                                {project.manager.first_name} {project.manager.last_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="lg:col-span-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${priorityConfig.color}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${priorityConfig.dot}`}></span>
                        {priorityConfig.label}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="lg:col-span-1">
                      {stats ? (
                        <div className="flex items-center gap-2 lg:block">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600 lg:w-full">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${stats.completion_percentage}%` }}
                            />
                          </div>
                          <span className="mt-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                            {stats.completion_percentage}%
                          </span>
                        </div>
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                      )}
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center justify-between lg:col-span-2">
                      {project.target_end_date ? (
                        <div>
                          <div
                            className={`text-xs font-medium ${
                              isOverdue(project.target_end_date) && project.status !== 'completed'
                                ? 'text-red-500'
                                : 'text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {formatDate(project.target_end_date)}
                          </div>
                          {project.status !== 'completed' && (
                            <div
                              className={`text-xs mt-0.5 ${
                                isOverdue(project.target_end_date)
                                  ? 'text-red-400'
                                  : getDaysRemaining(project.target_end_date) <= 7
                                    ? 'text-amber-500'
                                    : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {isOverdue(project.target_end_date)
                                ? `${Math.abs(getDaysRemaining(project.target_end_date))} dni po terminie`
                                : `${getDaysRemaining(project.target_end_date)} dni`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Projekt ciągły
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wyświetlane:{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {projectRangeLabel}
                  </span>
                </p>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>Na stronie</span>
                  <select
                    value={projectPageSize}
                    onChange={e => setProjectPageSize(Number(e.target.value) as 10 | 30 | 50)}
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
                  onClick={() => setProjectPage(page => Math.max(1, page - 1))}
                  disabled={projectPage === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Poprzednia
                </button>
                <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {projectPage} / {projectTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setProjectPage(page => Math.min(projectTotalPages, page + 1))}
                  disabled={projectPage === projectTotalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Następna
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        {!isLoading && filteredProjects.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            {t('shown', { shown: filteredProjects.length, total: totalProjects })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Projects;
