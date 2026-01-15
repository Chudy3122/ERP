import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Folder, Plus, Search, Filter, Users, Calendar } from 'lucide-react';
import * as projectApi from '../api/project.api';
import { Project, ProjectStatus, ProjectPriority } from '../types/project.types';

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [statusFilter, priorityFilter]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (searchQuery) filters.search = searchQuery;

      const result = await projectApi.getProjects(filters);
      setProjects(result.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    loadProjects();
  };

  const getStatusColor = (status: ProjectStatus) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-700',
      active: 'bg-gray-200 text-gray-800',
      on_hold: 'bg-gray-100 text-gray-600',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-gray-100 text-gray-600',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: ProjectPriority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-gray-600',
      high: 'text-gray-700',
      critical: 'text-gray-900',
    };
    return colors[priority];
  };

  const getStatusLabel = (status: ProjectStatus) => {
    const labels = {
      planning: 'Planowanie',
      active: 'Aktywny',
      on_hold: 'Wstrzymany',
      completed: 'Ukończony',
      cancelled: 'Anulowany',
    };
    return labels[status];
  };

  const getPriorityLabel = (priority: ProjectPriority) => {
    const labels = {
      low: 'Niski',
      medium: 'Średni',
      high: 'Wysoki',
      critical: 'Krytyczny',
    };
    return labels[priority];
  };

  return (
    <MainLayout title="Projekty">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekty</h1>
          <p className="text-gray-600 mt-1">Zarządzaj projektami i zadaniami zespołu</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nowy projekt
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-md border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj projektów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">Wszystkie statusy</option>
              <option value="planning">Planowanie</option>
              <option value="active">Aktywny</option>
              <option value="on_hold">Wstrzymany</option>
              <option value="completed">Ukończony</option>
              <option value="cancelled">Anulowany</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as ProjectPriority | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">Wszystkie priorytety</option>
              <option value="low">Niski</option>
              <option value="medium">Średni</option>
              <option value="high">Wysoki</option>
              <option value="critical">Krytyczny</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-md border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-md border border-gray-200">
          <Folder className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brak projektów</h3>
          <p className="text-gray-600 mb-6">Zacznij od utworzenia pierwszego projektu</p>
          <button
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            Utwórz projekt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/edit`)}
              className="bg-white rounded-md border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{project.code}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                {project.description || 'Brak opisu'}
              </p>

              {/* Meta */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Filter className={`w-4 h-4 ${getPriorityColor(project.priority)}`} />
                  <span className="text-gray-700">
                    Priorytet: <span className="font-medium">{getPriorityLabel(project.priority)}</span>
                  </span>
                </div>

                {project.manager && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Manager: {project.manager.first_name} {project.manager.last_name}</span>
                  </div>
                )}

                {project.target_end_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Deadline: {new Date(project.target_end_date).toLocaleDateString('pl-PL')}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {project.members?.slice(0, 3).map((member, idx) => (
                      <div
                        key={member.id}
                        className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold border-2 border-white"
                      >
                        {member.user?.first_name[0]}{member.user?.last_name[0]}
                      </div>
                    ))}
                  </div>
                  {project.members && project.members.length > 3 && (
                    <span className="text-sm text-gray-500">+{project.members.length - 3}</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(project.created_at).toLocaleDateString('pl-PL')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default Projects;
