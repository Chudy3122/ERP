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
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useTranslation } from 'react-i18next';

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

  // Confirm dialogs
  const [showDeleteStageConfirm, setShowDeleteStageConfirm] = useState(false);
  const [showDeleteFileConfirm, setShowDeleteFileConfirm] = useState<string | null>(null);

  const { t } = useTranslation();
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

    try {
      setIsDeletingStage(true);
      await projectApi.deleteProjectStage(editingStage.id);
      setShowEditStageModal(false);
      setShowDeleteStageConfirm(false);
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

  const handleConfirmDeleteFile = async () => {
    if (!showDeleteFileConfirm) return;

    try {
      setIsDeletingFile(showDeleteFileConfirm);
      await projectApi.deleteProjectAttachment(id!, showDeleteFileConfirm);
      loadAttachments();
    } catch (error) {
      console.error('Failed to delete file:', error);
    } finally {
      setIsDeletingFile(null);
      setShowDeleteFileConfirm(null);
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
    { key: 'dashboard', label: t('dashboard.title'), icon: LayoutDashboard },
    { key: 'tasks', label: t('tasks.title'), icon: CheckSquare },
    { key: 'members', label: t('projects.team') || 'Zespół', icon: Users },
    { key: 'files', label: t('projects.files') || 'Pliki', icon: FileText },
    { key: 'activity', label: t('projects.activity') || 'Aktywność', icon: Activity },
    { key: 'settings', label: t('settings.title'), icon: Settings },
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
      <div className="mb-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <button onClick={() => navigate('/projects')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {t('projects.title')}
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-900 dark:text-white font-medium">{project.name}</span>
        </div>

        {/* Project header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                {project.code}
              </span>
            </div>
            {project.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-2xl">{project.description}</p>
            )}
            <div className="flex items-center gap-5 mt-3 text-sm text-gray-500 dark:text-gray-400">
              {project.start_date && (
                <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(project.start_date)}</span>
                  {project.target_end_date && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 mx-1">→</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(project.target_end_date)}</span>
                    </>
                  )}
                </span>
              )}
              {project.manager && (
                <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {project.manager.first_name} {project.manager.last_name}
                  </span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/tasks/new?project=${id}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            {t('tasks.newTask')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} />
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.total')}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{statistics.total_tasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.done')}</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{statistics.completed_tasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.inProgress')}</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{statistics.in_progress_tasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.statusTodo')}</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">{statistics.todo_tasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.statusBlocked')}</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{statistics.blocked_tasks}</p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {statistics && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('projects.progress')}</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{statistics.completion_percentage}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${statistics.completion_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Time stats */}
          {timeStats && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  {t('timeTracking.title')}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('timeTracking.totalHours')}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{timeStats.totalHours.toFixed(1)}h</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Płatne</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{timeStats.billableHours.toFixed(1)}h</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Niepłatne</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{timeStats.nonBillableHours.toFixed(1)}h</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Wpisów</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeStats.logsCount}</p>
                </div>
              </div>
              {timeStats.byUser.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Czas wg osób:</p>
                  <div className="space-y-2">
                    {timeStats.byUser.slice(0, 5).map((item) => (
                      <div key={item.user_id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{item.user_name}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{item.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent activity preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('dashboard.recentActivity')}</h3>
              <button
                onClick={() => setActiveTab('activity')}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {t('common.all') || 'Zobacz wszystko'} →
              </button>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => {
                const Icon = getActivityIcon(activity.action);
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {activities.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          {/* Search and controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('tasks.searchTasks')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
            </div>
            <button
              onClick={() => setShowNewStageModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('projects.newStage') || 'Nowy etap'}
            </button>
          </div>

          {/* Kanban Board */}
          <style>{`
            .kanban-scrollbar::-webkit-scrollbar {
              height: 8px;
            }
            .kanban-scrollbar::-webkit-scrollbar-track {
              background: rgba(156, 163, 175, 0.2);
              border-radius: 4px;
            }
            .kanban-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(107, 114, 128, 0.5);
              border-radius: 4px;
            }
            .kanban-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 0.7);
            }
            .dark .kanban-scrollbar::-webkit-scrollbar-track {
              background: rgba(55, 65, 81, 0.5);
            }
            .dark .kanban-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(75, 85, 99, 0.8);
            }
            .dark .kanban-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 1);
            }
          `}</style>
          <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-2 px-2 kanban-scrollbar">
            {tasksByStages.map(({ stage, tasks }) => {
              const filteredTasks = filterTasks(tasks);
              const stageId = stage?.id || null;
              const isOver = dragOverStage === stageId;
              const stageColor = stage?.color || '#6B7280';

              return (
                <div
                  key={stageId || 'unassigned'}
                  className={`flex-shrink-0 w-[270px] rounded-xl transition-all duration-200 ${
                    isOver
                      ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
                      : ''
                  }`}
                  onDragOver={handleStageDragOver}
                  onDragEnter={(e) => handleStageDragEnter(e, stageId)}
                  onDragLeave={handleStageDragLeave}
                  onDrop={(e) => handleDrop(e, stageId)}
                >
                  {/* Column header */}
                  <div
                    className="px-3 py-2 rounded-t-xl flex items-center justify-between"
                    style={{
                      background: `linear-gradient(135deg, ${stageColor}25 0%, ${stageColor}15 100%)`,
                      borderBottom: `2px solid ${stageColor}40`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
                        style={{ backgroundColor: stageColor }}
                      />
                      <span className="font-semibold text-xs text-gray-800 dark:text-gray-100">
                        {stage?.name || t('projects.noStage') || 'Bez etapu'}
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 px-1.5 py-0.5 rounded-full">
                        {filteredTasks.length}
                      </span>
                    </div>
                    {stage && (
                      <button
                        onClick={() => handleOpenEditStage(stage)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded transition-all"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Tasks container */}
                  <div
                    className="p-2 space-y-2 min-h-[200px] bg-gray-100/50 dark:bg-gray-800/50 rounded-b-xl"
                    style={{
                      background: isOver
                        ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
                        : undefined
                    }}
                  >
                    {filteredTasks.map((task) => {
                      const priorityConfig = getPriorityConfig(task.priority);
                      const isDragging = draggedTask?.id === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onMouseDown={handleMouseDown}
                          onClick={(e) => handleCardClick(e, task.id)}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={`relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200/80 dark:border-gray-700/80 p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group select-none ${
                            isUpdatingTask === task.id ? 'opacity-60' : ''
                          } ${isDragging ? 'opacity-50 scale-[1.02] shadow-lg ring-2 ring-blue-400' : 'hover:-translate-y-0.5'}`}
                        >
                          {/* Priority indicator bar */}
                          <div
                            className="absolute top-0 left-3 right-3 h-0.5 rounded-full"
                            style={{ backgroundColor: priorityConfig.dotColor.replace('bg-', '').includes('gray') ? '#9CA3AF' :
                              priorityConfig.dotColor.includes('blue') ? '#3B82F6' :
                              priorityConfig.dotColor.includes('orange') ? '#F97316' :
                              priorityConfig.dotColor.includes('red') ? '#EF4444' : '#9CA3AF'
                            }}
                          />

                          <div className="flex items-start justify-between gap-1.5 mb-1.5 mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-semibold uppercase tracking-wide ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                            </div>
                          </div>

                          <h4 className="font-medium text-gray-900 dark:text-white text-xs mb-1.5 line-clamp-2 leading-snug">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5" title={`${task.assignee.first_name} ${task.assignee.last_name}`}>
                                {task.assignee.avatar_url ? (
                                  <img
                                    src={getFileUrl(task.assignee.avatar_url) || ''}
                                    alt=""
                                    className="w-5 h-5 rounded-full ring-1 ring-white dark:ring-gray-800"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white dark:ring-gray-800">
                                    {getInitials(task.assignee.first_name, task.assignee.last_name)}
                                  </div>
                                )}
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                  {task.assignee.first_name}
                                </span>
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Users className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              {(task.actual_hours !== undefined || task.estimated_hours !== undefined) && (
                                <span
                                  className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5 font-medium"
                                  title={`${task.actual_hours || 0}h zalogowanych / ${task.estimated_hours || '?'}h szacowanych`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  {task.actual_hours || 0}h
                                  {task.estimated_hours && (
                                    <span className="text-gray-300 dark:text-gray-600">/{task.estimated_hours}h</span>
                                  )}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5 font-medium">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          {isUpdatingTask === task.id && (
                            <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 flex items-center justify-center rounded-lg backdrop-blur-sm">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredTasks.length === 0 && quickTaskStageId !== stageId && (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                        <CheckSquare className="w-6 h-6 mb-1.5 opacity-50" />
                        <span className="text-xs font-medium">{t('tasks.noTasks')}</span>
                      </div>
                    )}

                    {/* Quick task input */}
                    {quickTaskStageId === stageId ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-400 dark:border-blue-500 p-2 shadow-md">
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
                          placeholder={t('tasks.enterTitle') || 'Wpisz tytuł zadania...'}
                          className="w-full text-xs border-0 focus:ring-0 p-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-medium"
                          disabled={isCreatingQuickTask}
                        />
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                            Enter - {t('common.save')}, Esc - {t('common.cancel')}
                          </span>
                          {isCreatingQuickTask && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuickTask(stageId)}
                        className="w-full p-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 rounded-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t('tasks.newTask')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new column button */}
            <button
              onClick={() => setShowNewStageModal(true)}
              className="flex-shrink-0 w-[270px] min-h-[200px] bg-gradient-to-b from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 group"
            >
              <div className="w-9 h-9 rounded-full bg-gray-200/50 dark:bg-gray-700/50 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">{t('projects.addStage') || 'Dodaj etap'}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Członkowie zespołu</h3>
            {isAdmin && (
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
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
                          onClick={() => setShowDeleteFileConfirm(attachment.id)}
                          disabled={isDeletingFile === attachment.id}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
                  <div key={activity.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
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
                onClick={() => setShowDeleteStageConfirm(true)}
                disabled={isDeletingStage}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
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

      {/* Delete Stage Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteStageConfirm}
        onClose={() => setShowDeleteStageConfirm(false)}
        onConfirm={handleDeleteStage}
        title={t('projects.deleteStageTitle')}
        message={t('projects.deleteStageConfirm', { name: editingStage?.name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        icon="delete"
        loading={isDeletingStage}
      />

      {/* Delete File Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteFileConfirm !== null}
        onClose={() => setShowDeleteFileConfirm(null)}
        onConfirm={handleConfirmDeleteFile}
        title={t('projects.deleteFileTitle')}
        message={t('projects.deleteFileConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        icon="delete"
        loading={isDeletingFile !== null}
      />
    </MainLayout>
  );
};

export default ProjectDetail;
