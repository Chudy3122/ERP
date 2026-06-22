import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  LayoutTemplate,
} from 'lucide-react';
import * as projectApi from '../api/project.api';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectStatistics,
  ProjectMember,
  ProjectMemberRole,
} from '../types/project.types';
import { getFileUrl } from '../api/axios-config';
import type { User } from '../types/user.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

type ViewFilter = 'all' | 'active' | 'completed' | 'planning';
type ProjectTypeFilter = 'all' | 'ongoing' | 'deadline';
type ProjectOwnershipFilter = 'all' | 'mine' | 'created' | 'other';

const Projects = () => {
  const { t } = useTranslation('projects');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStatistics>>({});
  const [projectMembersById, setProjectMembersById] = useState<Record<string, ProjectMember[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>(
    (searchParams.get('status') as ViewFilter) || 'all'
  );
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>(
    (searchParams.get('priority') as ProjectPriority | '') || ''
  );
  const [projectTypeFilter, setProjectTypeFilter] = useState<ProjectTypeFilter>(
    (searchParams.get('type') as ProjectTypeFilter) || 'all'
  );
  const [projectOwnershipFilter, setProjectOwnershipFilter] = useState<ProjectOwnershipFilter>(
    (searchParams.get('scope') as ProjectOwnershipFilter) || 'all'
  );
  const [projectPage, setProjectPage] = useState(() =>
    Math.max(1, Number(searchParams.get('page')) || 1)
  );
  const [projectPageSize, setProjectPageSize] = useState<10 | 30 | 50>(() => {
    const size = Number(searchParams.get('pageSize'));
    return size === 30 || size === 50 ? size : 10;
  });
  const navigate = useNavigate();

  const projectsReturnTo = `${location.pathname}${location.search}`;

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (projectPage > 1) nextParams.set('page', String(projectPage));
    if (projectPageSize !== 10) nextParams.set('pageSize', String(projectPageSize));
    if (viewFilter !== 'all') nextParams.set('status', viewFilter);
    if (priorityFilter) nextParams.set('priority', priorityFilter);
    if (projectTypeFilter !== 'all') nextParams.set('type', projectTypeFilter);
    if (projectOwnershipFilter !== 'all') nextParams.set('scope', projectOwnershipFilter);

    setSearchParams(nextParams, { replace: true });
  }, [
    projectPage,
    projectPageSize,
    viewFilter,
    priorityFilter,
    projectTypeFilter,
    projectOwnershipFilter,
    setSearchParams,
  ]);

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
  }, [viewFilter, priorityFilter, projectTypeFilter, projectOwnershipFilter, projectPageSize]);

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

      const membersPromises = result.projects.map(async project => {
        try {
          const members = await projectApi.getProjectMembers(project.id);
          return { id: project.id, members };
        } catch {
          return { id: project.id, members: [] };
        }
      });

      const [statsResults, membersResults] = await Promise.all([
        Promise.all(statsPromises),
        Promise.all(membersPromises),
      ]);
      const statsMap: Record<string, ProjectStatistics> = {};
      statsResults.forEach(result => {
        if (result.stats) {
          statsMap[result.id] = result.stats;
        }
      });
      setProjectStats(statsMap);

      const membersMap: Record<string, ProjectMember[]> = {};
      membersResults.forEach(result => {
        membersMap[result.id] = result.members;
      });
      setProjectMembersById(membersMap);
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
    setProjectTypeFilter('all');
    setProjectOwnershipFilter('all');
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

  const getUserDisplayName = (userItem?: User) => {
    if (!userItem) return '';
    return `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim() || userItem.email || '';
  };

  const getProjectMemberRoleRank = (role: ProjectMemberRole) => {
    const ranks = {
      [ProjectMemberRole.LEAD]: 0,
      [ProjectMemberRole.OBSERVER]: 1,
      [ProjectMemberRole.MEMBER]: 2,
    };

    return ranks[role] ?? 99;
  };

  const getProjectDisplayOwner = (project: Project) => {
    const activeMembers = projectMembersById[project.id] ?? [];
    const preferredMember = [...activeMembers]
      .filter(member => member.user)
      .sort((firstMember, secondMember) => {
        const roleDiff =
          getProjectMemberRoleRank(firstMember.role) - getProjectMemberRoleRank(secondMember.role);
        if (roleDiff !== 0) return roleDiff;

        return getUserDisplayName(firstMember.user).localeCompare(
          getUserDisplayName(secondMember.user),
          'pl',
          { sensitivity: 'base' }
        );
      })[0];

    if (preferredMember?.user) return preferredMember.user;

    return project.manager || project.creator;
  };

  const getEffectiveProjectOwnerId = (project: Project) => {
    return getProjectDisplayOwner(project)?.id || project.created_by;
  };

  const isCurrentUserProjectMember = (project: Project) => {
    if (!user?.id) return false;

    const activeMembers = projectMembersById[project.id] ?? project.members ?? [];
    return activeMembers.some(member => member.user_id === user.id && !member.left_at);
  };

  const isProjectCreatedByCurrentUser = (project: Project) => {
    return Boolean(user?.id && getEffectiveProjectOwnerId(project) === user.id);
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Filter projects based on view
  const filteredProjects = projects.filter(project => {
    const matchesView =
      viewFilter === 'all' ||
      (viewFilter === 'active' && project.status === 'active') ||
      (viewFilter === 'completed' && project.status === 'completed') ||
      (viewFilter === 'planning' && project.status === 'planning');
    const matchesType =
      projectTypeFilter === 'all' ||
      (projectTypeFilter === 'ongoing' && !project.target_end_date) ||
      (projectTypeFilter === 'deadline' && Boolean(project.target_end_date));
    const matchesOwnership =
      projectOwnershipFilter === 'all' ||
      (projectOwnershipFilter === 'mine' && isCurrentUserProjectMember(project)) ||
      (projectOwnershipFilter === 'created' && isProjectCreatedByCurrentUser(project)) ||
      (projectOwnershipFilter === 'other' &&
        !isCurrentUserProjectMember(project) &&
        !isProjectCreatedByCurrentUser(project));

    return matchesView && matchesType && matchesOwnership;
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

  const deadlineProjectStats = projects
    .filter(project => Boolean(project.target_end_date))
    .map(project => projectStats[project.id])
    .filter(Boolean);

  // Calculate average progress only for projects with an end date.
  const avgProgress =
    deadlineProjectStats.length > 0
      ? Math.round(
          deadlineProjectStats.reduce((acc, stats) => acc + stats.completion_percentage, 0) /
            deadlineProjectStats.length
        )
      : null;

  const viewTabs = [
    { key: 'all', label: t('all'), count: totalProjects },
    { key: 'active', label: t('active'), count: activeProjects },
    { key: 'planning', label: t('statusPlanning'), count: planningProjects },
    { key: 'completed', label: t('statusCompleted'), count: completedProjects },
  ];
  const hasProjectFilters = Boolean(
    searchQuery ||
      priorityFilter ||
      projectTypeFilter !== 'all' ||
      projectOwnershipFilter !== 'all'
  );

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
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Folder className="h-6 w-6" />
            </div>
            <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Moduł projektów
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{t('title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {t('subtitle')}
            </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.role === UserRole.ADMIN && (
              <button
                type="button"
                onClick={() => navigate('/admin/project-templates')}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/5 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-[#F7941D]/40"
              >
                <LayoutTemplate className="h-4 w-4" />
                Szablony projektów
              </button>
            )}
            <button
              onClick={() =>
                navigate(`/projects/new?returnTo=${encodeURIComponent(projectsReturnTo)}`)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Plus className="w-5 h-5" />
              {t('newProject')}
            </button>
          </div>
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
                <p className="text-2xl font-bold text-purple-600">
                  {avgProgress !== null ? `${avgProgress}%` : '—'}
                </p>
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
          <div className="flex flex-wrap items-start gap-3 bg-gray-50/70 p-4 dark:bg-gray-800/60">
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
              <p className="mt-1 min-h-[16px] text-xs text-gray-400 dark:text-gray-500">
                Wyniki odświeżają się automatycznie po wpisaniu frazy.
              </p>
            </div>

            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Priorytet
              </label>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as ProjectPriority | '')}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('allPriorities')}</option>
                <option value="low">{t('priorityLow')}</option>
                <option value="medium">{t('priorityMedium')}</option>
                <option value="high">{t('priorityHigh')}</option>
                <option value="critical">{t('priorityCritical')}</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Typ projektu
              </label>
              <select
                value={projectTypeFilter}
                onChange={e => setProjectTypeFilter(e.target.value as ProjectTypeFilter)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Wszystkie typy</option>
                <option value="ongoing">Projekty ciągłe</option>
                <option value="deadline">Z terminem zakończenia</option>
              </select>
            </div>

            <div className="min-w-[210px]">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Zakres
              </label>
              <select
                value={projectOwnershipFilter}
                onChange={e => setProjectOwnershipFilter(e.target.value as ProjectOwnershipFilter)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Wszystkie projekty</option>
                <option value="mine">Moje projekty</option>
                <option value="created">Utworzone przeze mnie</option>
                <option value="other">Inne</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Szukaj
              </button>

              {hasProjectFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Wyczyść
                </button>
              )}
            </div>
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
              onClick={() =>
                navigate(`/projects/new?returnTo=${encodeURIComponent(projectsReturnTo)}`)
              }
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
                const priorityConfig = project.target_end_date
                  ? getPriorityConfig(project.priority)
                  : {
                      label: 'Stały',
                      color: 'text-slate-700 dark:text-slate-300',
                      dot: 'bg-slate-700 dark:bg-slate-300',
                      bar: 'bg-slate-700',
                    };
                const stats = projectStats[project.id];
                const displayOwner = getProjectDisplayOwner(project);

                return (
                  <button
                    type="button"
                    key={project.id}
                    onClick={() =>
                      navigate(
                        `/projects/${project.id}?returnTo=${encodeURIComponent(projectsReturnTo)}`
                      )
                    }
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
                          {displayOwner && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              {displayOwner.avatar_url ? (
                                <img
                                  src={getFileUrl(displayOwner.avatar_url) || ''}
                                  alt=""
                                  className="h-4 w-4 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[8px] font-medium text-gray-600">
                                  {getInitials(
                                    displayOwner.first_name,
                                    displayOwner.last_name
                                  )}
                                </div>
                              )}
                              <span>
                                {displayOwner.first_name} {displayOwner.last_name}
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
                      {!project.target_end_date ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/70 dark:text-slate-200">
                          Stały
                        </span>
                      ) : stats ? (
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
