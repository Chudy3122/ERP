import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  FileText,
  Settings,
  Calendar,
  Plus,
  Search,
  MoreHorizontal,
  GripVertical,
  Loader2,
  AlertCircle,
  Edit3,
  X,
  Upload,
  Download,
  Trash2,
  File,
  Image,
  FileSpreadsheet,
  FileIcon,
  Activity,
  Clock,
  UserPlus,
  FolderOpen,
  MessageSquare,
} from 'lucide-react';
import * as projectApi from '../api/project.api';
import * as workLogApi from '../api/worklog.api';
import { Project, ProjectStage, ProjectMember, ProjectStatistics, ProjectAttachment, ProjectActivity } from '../types/project.types';
import type { ProjectTimeStats } from '../types/worklog.types';
import { Task, TaskPriority } from '../types/task.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';

type TabType = 'dashboard' | 'tasks' | 'members' | 'files' | 'activity' | 'settings';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [tasksByStages, setTasksByStages] = useState<{ stage: ProjectStage | null; tasks: Task[] }[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [timeStats, setTimeStats] = useState<ProjectTimeStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const mouseStartPos = useRef<{ x: number; y: number } | null>(null);

  // New stage modal
  const [showNewStageModal, setShowNewStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6B7280');
  const [isCreatingStage, setIsCreatingStage] = useState(false);

  // Edit stage modal
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<ProjectStage | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('#6B7280');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isDeletingStage, setIsDeletingStage] = useState(false);

  // Quick task creation
  const [quickTaskStageId, setQuickTaskStageId] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isCreatingQuickTask, setIsCreatingQuickTask] = useState(false);
  const quickTaskInputRef = useRef<HTMLInputElement>(null);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'team_leader';

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'tasks') {
      loadTasksByStages();
    } else if (id && activeTab === 'members') {
      loadMembers();
    } else if (id && activeTab === 'dashboard') {
      loadStatistics();
      loadActivities(); // Load activities for preview on dashboard
      loadTimeStats(); // Load time stats for dashboard
    } else if (id && activeTab === 'files') {
      loadAttachments();
    } else if (id && activeTab === 'activity') {
      loadActivities();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (quickTaskStageId !== null && quickTaskInputRef.current) {
      quickTaskInputRef.current.focus();
    }
  }, [quickTaskStageId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await projectApi.getProjectById(id!);
      setProject(data);

      // Load stages
      const stagesData = await projectApi.getProjectStages(id!);
      setStages(stagesData);

      // If no stages, create default ones
      if (stagesData.length === 0) {
        const defaultStages = await projectApi.createDefaultStages(id!);
        setStages(defaultStages);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasksByStages = async () => {
    try {
      const data = await projectApi.getTasksByStages(id!);
      setTasksByStages(data);
    } catch (error) {
      console.error('Failed to load tasks by stages:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await projectApi.getProjectMembers(id!);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await projectApi.getProjectStatistics(id!);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const loadAttachments = async () => {
    try {
      const data = await projectApi.getProjectAttachments(id!);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const data = await projectApi.getProjectActivity(id!, 100);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const loadTimeStats = async () => {
    try {
      const stats = await workLogApi.getProjectTimeStats(id!);
      setTimeStats(stats);
    } catch (error) {
      console.error('Failed to load time stats:', error);
    }
  };

  // Drag and drop handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }, []);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    isDraggingRef.current = true;
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStage(null);
    setTimeout(() => {
      isDraggingRef.current = false;
      mouseStartPos.current = null;
    }, 0);
  };

  const handleCardClick = (e: React.MouseEvent, taskId: string) => {
    if (isDraggingRef.current) return;
    if (mouseStartPos.current) {
      const dx = Math.abs(e.clientX - mouseStartPos.current.x);
      const dy = Math.abs(e.clientY - mouseStartPos.current.y);
      if (dx > 5 || dy > 5) {
        mouseStartPos.current = null;
        return;
      }
    }
    mouseStartPos.current = null;
    navigate(`/tasks/${taskId}/edit`);
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStageDragEnter = (e: React.DragEvent, stageId: string | null) => {
    e.preventDefault();
    if (draggedTask && draggedTask.stage_id !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleStageDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, stageId: string | null) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedTask || draggedTask.stage_id === stageId) {
      setDraggedTask(null);
      return;
    }

    const taskToUpdate = draggedTask;
    setDraggedTask(null);

    try {
      setIsUpdatingTask(taskToUpdate.id);
      await projectApi.moveTaskToStage(taskToUpdate.id, stageId);
      loadTasksByStages();
    } catch (error) {
      console.error('Failed to move task:', error);
    } finally {
      setIsUpdatingTask(null);
    }
  };

  // Create new stage
  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;

    try {
      setIsCreatingStage(true);
      await projectApi.createProjectStage(id!, {
        name: newStageName,
        color: newStageColor,
      });
      setNewStageName('');
      setNewStageColor('#6B7280');
      setShowNewStageModal(false);
      loadProject();
      loadTasksByStages();
    } catch (error) {
      console.error('Failed to create stage:', error);
    } finally {
      setIsCreatingStage(false);
    }
  };

  // Edit stage
  const handleOpenEditStage = (stage: ProjectStage) => {
    setEditingStage(stage);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
    setShowEditStageModal(true);
  };

  const handleUpdateStage = async () => {
    if (!editingStage || !editStageName.trim()) return;

    try {
      setIsUpdatingStage(true);
      await projectApi.updateProjectStage(editingStage.id, {
        name: editStageName,
        color: editStageColor,
      });
      setShowEditStageModal(false);
      setEditingStage(null);
      loadProject();
      loadTasksByStages();
    } catch (error) {
      console.error('Failed to update stage:', error);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!editingStage) return;

    if (!confirm(`Czy na pewno chcesz usunąć etap "${editingStage.name}"? Zadania zostaną przeniesione do "Bez etapu".`)) {
      return;
    }

    try {
      setIsDeletingStage(true);
      await projectApi.deleteProjectStage(editingStage.id);
      setShowEditStageModal(false);
      setEditingStage(null);
      loadProject();
      loadTasksByStages();
    } catch (error) {
      console.error('Failed to delete stage:', error);
    } finally {
      setIsDeletingStage(false);
    }
  };

  // Quick task creation
  const handleStartQuickTask = (stageId: string | null) => {
    setQuickTaskStageId(stageId);
    setQuickTaskTitle('');
  };

  const handleCreateQuickTask = async () => {
    if (!quickTaskTitle.trim()) {
      setQuickTaskStageId(null);
      return;
    }

    try {
      setIsCreatingQuickTask(true);
      const { createTask } = await import('../api/task.api');
      await createTask({
        project_id: id!,
        stage_id: quickTaskStageId || undefined,
        title: quickTaskTitle,
        priority: TaskPriority.MEDIUM,
      });
      setQuickTaskTitle('');
      setQuickTaskStageId(null);
      loadTasksByStages();
    } catch (error) {
      console.error('Failed to create quick task:', error);
    } finally {
      setIsCreatingQuickTask(false);
    }
  };

  const handleQuickTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateQuickTask();
    } else if (e.key === 'Escape') {
      setQuickTaskStageId(null);
      setQuickTaskTitle('');
    }
  };

  // File upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      await projectApi.uploadProjectAttachments(id!, Array.from(files));
      loadAttachments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (attachmentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten plik?')) return;

    try {
      setIsDeletingFile(attachmentId);
      await projectApi.deleteProjectAttachment(id!, attachmentId);
      loadAttachments();
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsDeletingFile(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('created_project')) return FolderOpen;
    if (action.includes('created_task') || action.includes('completed_task')) return CheckSquare;
    if (action.includes('assigned') || action.includes('member')) return UserPlus;
    if (action.includes('file') || action.includes('attachment')) return FileText;
    if (action.includes('comment')) return MessageSquare;
    if (action.includes('updated')) return Edit3;
    return Activity;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'przed chwilą';
    if (minutes < 60) return `${minutes} min temu`;
    if (hours < 24) return `${hours} godz. temu`;
    if (days < 7) return `${days} dni temu`;
    return date.toLocaleDateString('pl-PL');
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  // Filter tasks by search
  const filterTasks = (tasks: Task[]) => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
    );
  };

  const tabs = [
    { key: 'dashboard', label: 'Pulpit', icon: LayoutDashboard },
    { key: 'tasks', label: 'Zadania', icon: CheckSquare },
    { key: 'members', label: 'Zespół', icon: Users },
    { key: 'files', label: 'Pliki', icon: FileText },
    { key: 'activity', label: 'Aktywność', icon: Activity },
    { key: 'settings', label: 'Ustawienia', icon: Settings },
  ];

  const stageColors = [
    '#6B7280', '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
    '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
    '#D946EF', '#EC4899', '#F43F5E',
  ];

  if (isLoading) {
    return (
      <MainLayout title="Projekt">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout title="Projekt">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-900">Projekt nie znaleziony</h2>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Wróć do listy projektów
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={project.name}>
      {/* Header */}
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => navigate('/projects')} className="hover:text-gray-700">
            Projekty
          </button>
          <span>/</span>
          <span className="text-gray-900">{project.name}</span>
        </div>

        {/* Project header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                {project.code}
              </span>
            </div>
            {project.description && (
              <p className="text-gray-500 mt-1 text-sm">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(project.start_date)}
                  {project.target_end_date && ` → ${formatDate(project.target_end_date)}`}
                </span>
              )}
              {project.manager && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {project.manager.first_name} {project.manager.last_name}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/tasks/new?project=${id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nowe zadanie
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Wszystkie zadania</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total_tasks}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Ukończone</p>
                <p className="text-2xl font-bold text-green-600">{statistics.completed_tasks}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">W trakcie</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.in_progress_tasks}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Do zrobienia</p>
                <p className="text-2xl font-bold text-gray-600">{statistics.todo_tasks}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Zablokowane</p>
                <p className="text-2xl font-bold text-red-600">{statistics.blocked_tasks}</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {statistics && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Postęp projektu</span>
                <span className="text-sm text-gray-500">{statistics.completion_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${statistics.completion_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Time stats */}
          {timeStats && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Czas pracy w projekcie
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Łącznie</p>
                  <p className="text-xl font-bold text-gray-900">{timeStats.totalHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Płatne godziny</p>
                  <p className="text-xl font-bold text-green-600">{timeStats.billableHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Niepłatne</p>
                  <p className="text-xl font-bold text-gray-600">{timeStats.nonBillableHours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Wpisów</p>
                  <p className="text-xl font-bold text-gray-900">{timeStats.logsCount}</p>
                </div>
              </div>
              {timeStats.byUser.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Czas wg osób:</p>
                  <div className="space-y-2">
                    {timeStats.byUser.slice(0, 5).map((item) => (
                      <div key={item.user_id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{item.user_name}</span>
                        <span className="font-medium text-gray-900">{item.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent activity preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Ostatnia aktywność</h3>
              <button
                onClick={() => setActiveTab('activity')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Zobacz wszystko
              </button>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => {
                const Icon = getActivityIcon(activity.action);
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {activities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Brak aktywności</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          {/* Search and controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Szukaj zadań..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <button
              onClick={() => setShowNewStageModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nowy etap
            </button>
          </div>

          {/* Kanban Board */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {tasksByStages.map(({ stage, tasks }) => {
              const filteredTasks = filterTasks(tasks);
              const stageId = stage?.id || null;
              const isOver = dragOverStage === stageId;

              return (
                <div
                  key={stageId || 'unassigned'}
                  className={`flex-shrink-0 w-80 bg-gray-50 rounded-lg border-2 transition-all ${
                    isOver
                      ? 'border-blue-400 bg-blue-50'
                      : draggedTask && draggedTask.stage_id !== stageId
                      ? 'border-dashed border-gray-300'
                      : 'border-transparent'
                  }`}
                  onDragOver={handleStageDragOver}
                  onDragEnter={(e) => handleStageDragEnter(e, stageId)}
                  onDragLeave={handleStageDragLeave}
                  onDrop={(e) => handleDrop(e, stageId)}
                >
                  {/* Column header */}
                  <div
                    className="px-3 py-2 rounded-t-lg flex items-center justify-between"
                    style={{ backgroundColor: stage?.color ? `${stage.color}20` : '#f3f4f6' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage?.color || '#6B7280' }}
                      />
                      <span className="font-medium text-sm text-gray-900">
                        {stage?.name || 'Bez etapu'}
                      </span>
                      <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-white/50 rounded">
                        {filteredTasks.length}
                      </span>
                    </div>
                    {stage && (
                      <button
                        onClick={() => handleOpenEditStage(stage)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {filteredTasks.map((task) => {
                      const priorityConfig = getPriorityConfig(task.priority);
                      return (
                        <div
                          key={task.id}
                          draggable
                          onMouseDown={handleMouseDown}
                          onClick={(e) => handleCardClick(e, task.id)}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab hover:shadow-md transition-all group select-none ${
                            isUpdatingTask === task.id ? 'opacity-70' : ''
                          } ${draggedTask?.id === task.id ? 'opacity-50 ring-2 ring-blue-400' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`}
                                title={priorityConfig.label}
                              />
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            {task.assignee && (
                              <div className="flex items-center" title={`${task.assignee.first_name} ${task.assignee.last_name}`}>
                                {task.assignee.avatar_url ? (
                                  <img
                                    src={getFileUrl(task.assignee.avatar_url) || ''}
                                    alt=""
                                    className="w-6 h-6 rounded-full border border-white shadow-sm"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 border border-white shadow-sm">
                                    {getInitials(task.assignee.first_name, task.assignee.last_name)}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              {(task.actual_hours !== undefined || task.estimated_hours !== undefined) && (
                                <span
                                  className="text-xs text-gray-500 flex items-center gap-1"
                                  title={`${task.actual_hours || 0}h zalogowanych / ${task.estimated_hours || '?'}h szacowanych`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {task.actual_hours || 0}h
                                  {task.estimated_hours && (
                                    <span className="text-gray-400">/ {task.estimated_hours}h</span>
                                  )}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isUpdatingTask === task.id && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredTasks.length === 0 && quickTaskStageId !== stageId && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Brak zadań
                      </div>
                    )}

                    {/* Quick task input */}
                    {quickTaskStageId === stageId ? (
                      <div className="bg-white rounded-lg border border-gray-300 p-2">
                        <input
                          ref={quickTaskInputRef}
                          type="text"
                          value={quickTaskTitle}
                          onChange={(e) => setQuickTaskTitle(e.target.value)}
                          onKeyDown={handleQuickTaskKeyDown}
                          onBlur={() => {
                            if (!quickTaskTitle.trim()) {
                              setQuickTaskStageId(null);
                            }
                          }}
                          placeholder="Wpisz tytuł zadania..."
                          className="w-full text-sm border-0 focus:ring-0 p-0"
                          disabled={isCreatingQuickTask}
                        />
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">Enter - zapisz, Esc - anuluj</span>
                          {isCreatingQuickTask && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuickTask(stageId)}
                        className="w-full p-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Nowe zadanie
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new column button */}
            <button
              onClick={() => setShowNewStageModal(true)}
              className="flex-shrink-0 w-80 min-h-[200px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">Dodaj etap</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Członkowie zespołu</h3>
            {isAdmin && (
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Dodaj członka
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Brak członków w projekcie
              </div>
            ) : (
              members.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.user?.avatar_url ? (
                      <img
                        src={getFileUrl(member.user.avatar_url) || ''}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {member.user && getInitials(member.user.first_name, member.user.last_name)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user?.first_name} {member.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    {member.role === 'lead' ? 'Lider' : member.role === 'observer' ? 'Obserwator' : 'Członek'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Upload area */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Pliki projektu</h3>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium text-sm cursor-pointer">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Dodaj pliki
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Files list */}
            {attachments.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <FileIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">Brak plików</p>
                <p className="text-sm text-gray-400">Przeciągnij pliki tutaj lub kliknij "Dodaj pliki"</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {attachments.map((attachment) => {
                  const FileTypeIcon = getFileIcon(attachment.file_type);
                  return (
                    <div key={attachment.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileTypeIcon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{attachment.original_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • {formatRelativeTime(attachment.created_at)}
                            {attachment.uploader && ` • ${attachment.uploader.first_name} ${attachment.uploader.last_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={getFileUrl(attachment.file_url) || ''}
                          download={attachment.original_name}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded"
                          title="Pobierz"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(attachment.id)}
                          disabled={isDeletingFile === attachment.id}
                          className="p-2 text-gray-400 hover:text-red-600 rounded"
                          title="Usuń"
                        >
                          {isDeletingFile === attachment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Historia aktywności</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Brak aktywności
              </div>
            ) : (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.action);
                return (
                  <div key={activity.id} className="p-4 flex items-start gap-3 hover:bg-gray-50">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ustawienia projektu</h3>
          <div className="space-y-4">
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edytuj projekt
            </button>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Etapy projektu</h4>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                      {stage.is_completed_stage && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Etap końcowy
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenEditStage(stage)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setShowNewStageModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors w-full"
                >
                  <Plus className="w-4 h-4" />
                  Dodaj nowy etap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Stage Modal */}
      {showNewStageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nowy etap</h3>
              <button
                onClick={() => setShowNewStageModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa etapu
                </label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="np. Do zrobienia, W trakcie..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kolor
                </label>
                <div className="flex flex-wrap gap-2">
                  {stageColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewStageColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newStageColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewStageModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateStage}
                disabled={!newStageName.trim() || isCreatingStage}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingStage && <Loader2 className="w-4 h-4 animate-spin" />}
                Utwórz etap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stage Modal */}
      {showEditStageModal && editingStage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edytuj etap</h3>
              <button
                onClick={() => {
                  setShowEditStageModal(false);
                  setEditingStage(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa etapu
                </label>
                <input
                  type="text"
                  value={editStageName}
                  onChange={(e) => setEditStageName(e.target.value)}
                  placeholder="np. Do zrobienia, W trakcie..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kolor
                </label>
                <div className="flex flex-wrap gap-2">
                  {stageColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditStageColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        editStageColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={handleDeleteStage}
                disabled={isDeletingStage}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-2"
              >
                {isDeletingStage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Usuń etap
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditStageModal(false);
                    setEditingStage(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleUpdateStage}
                  disabled={!editStageName.trim() || isUpdatingStage}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdatingStage && <Loader2 className="w-4 h-4 animate-spin" />}
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ProjectDetail;
