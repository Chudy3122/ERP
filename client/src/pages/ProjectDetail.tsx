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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import * as projectApi from '../api/project.api';
import * as workLogApi from '../api/worklog.api';
import * as adminApi from '../api/admin.api';
import * as taskApi from '../api/task.api';
import {
  Project,
  ProjectStage,
  ProjectMember,
  ProjectStatistics,
  ProjectAttachment,
  ProjectActivity,
  ProjectMemberRole,
  ProjectPriority,
} from '../types/project.types';
import type { ProjectTimeStats } from '../types/worklog.types';
import type { AdminUser } from '../types/admin.types';
import { Task, TaskPriority, TaskStatus } from '../types/task.types';
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
  const [tasksByStages, setTasksByStages] = useState<
    { stage: ProjectStage | null; tasks: Task[] }[]
  >([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showAddMemberPanel, setShowAddMemberPanel] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectMemberRole>(ProjectMemberRole.MEMBER);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
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
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [columnSort, setColumnSort] = useState<Record<string, 'manual' | 'date_asc' | 'date_desc'>>({});
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
  const isAdmin = user?.role === 'admin' || user?.role === 'kierownik';

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'tasks') {
      loadTasksByStages();
      loadMembers();
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
      if (data.length === 0 && project?.created_by && isAdmin) {
        try {
          await projectApi.addProjectMember(id!, project.created_by, ProjectMemberRole.LEAD);
          const refreshedMembers = await projectApi.getProjectMembers(id!);
          setMembers(refreshedMembers);
        } catch (error) {
          console.warn('Failed to auto-add project creator as member:', error);
          setMembers(data);
        }
      } else {
        setMembers(data);
      }
      const usersData = await adminApi.getUsers();
      setUsers(usersData.filter(userItem => userItem.is_active));
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

  const getProjectMemberRoleLabel = (role: ProjectMemberRole) => {
    const labels = {
      [ProjectMemberRole.LEAD]: 'Lider',
      [ProjectMemberRole.MEMBER]: 'Członek',
      [ProjectMemberRole.OBSERVER]: 'Kierownik',
    };
    return labels[role] || 'Członek';
  };

  const getProjectMemberRoleClass = (role: ProjectMemberRole) => {
    const classes = {
      [ProjectMemberRole.LEAD]: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      [ProjectMemberRole.MEMBER]:
        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
      [ProjectMemberRole.OBSERVER]:
        'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
    return classes[role] || classes[ProjectMemberRole.MEMBER];
  };

  const getUserDisplayName = (userItem?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  }) => {
    if (!userItem) return 'Nieznany użytkownik';
    return (
      `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim() ||
      userItem.email ||
      'Nieznany użytkownik'
    );
  };

  const visibleMembers =
    members.length > 0
      ? members
      : project?.creator
        ? [
            {
              id: 'project-creator-fallback',
              project_id: project.id,
              user_id: project.created_by,
              role: ProjectMemberRole.LEAD,
              joined_at: project.created_at,
              user: project.creator,
            } satisfies ProjectMember,
          ]
        : [];

  const assignableProjectMembers = [...visibleMembers].sort((firstMember, secondMember) =>
    getUserDisplayName(firstMember.user).localeCompare(
      getUserDisplayName(secondMember.user),
      'pl',
      {
        sensitivity: 'base',
      }
    )
  );

  const availableUsers = users
    .filter(userItem => !visibleMembers.some(member => member.user_id === userItem.id))
    .sort((firstUser, secondUser) =>
      getUserDisplayName(firstUser).localeCompare(getUserDisplayName(secondUser), 'pl', {
        sensitivity: 'base',
      })
    );

  const filteredAvailableUsers = availableUsers.filter(userItem => {
    const query = memberSearchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      userItem.first_name,
      userItem.last_name,
      userItem.email,
      userItem.position || '',
      userItem.department || '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const handleAddProjectMember = async (userId: string) => {
    if (!id) return;

    try {
      setMemberActionUserId(userId);
      await projectApi.addProjectMember(id, userId, newMemberRole);
      await loadMembers();
      setMemberSearchQuery('');
    } catch (error) {
      console.error('Failed to add project member:', error);
    } finally {
      setMemberActionUserId(null);
    }
  };

  const handleRemoveProjectMember = async (userId: string) => {
    if (!id) return;

    try {
      setMemberActionUserId(userId);
      await projectApi.removeProjectMember(id, userId);
      await loadMembers();
    } catch (error) {
      console.error('Failed to remove project member:', error);
    } finally {
      setMemberActionUserId(null);
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

  const handleAssignTask = async (event: React.ChangeEvent<HTMLSelectElement>, task: Task) => {
    event.stopPropagation();
    const assigneeId = event.target.value;
    const currentAssigneeIds =
      task.assignees && task.assignees.length > 0
        ? task.assignees.map(person => person.id)
        : task.assigned_to
          ? [task.assigned_to]
          : [];

    if (
      !assigneeId ||
      currentAssigneeIds.includes(assigneeId)
    ) {
      return;
    }

    try {
      setAssigningTaskId(task.id);
      const nextAssigneeIds = [...currentAssigneeIds, assigneeId];
      await taskApi.updateTask(task.id, {
        assignee_ids: nextAssigneeIds,
        assigned_to: nextAssigneeIds[0],
      });
      await loadTasksByStages();
    } catch (error) {
      console.error('Failed to assign task:', error);
    } finally {
      setAssigningTaskId(null);
    }
  };

  const handleRemoveTaskAssignee = async (
    event: React.MouseEvent<HTMLButtonElement>,
    task: Task,
    userId: string
  ) => {
    event.stopPropagation();

    const currentAssigneeIds =
      task.assignees && task.assignees.length > 0
        ? task.assignees.map(person => person.id)
        : task.assigned_to
          ? [task.assigned_to]
          : [];
    const nextAssigneeIds = currentAssigneeIds.filter(assigneeId => assigneeId !== userId);

    try {
      setAssigningTaskId(task.id);
      await taskApi.updateTask(task.id, {
        assignee_ids: nextAssigneeIds,
        assigned_to: nextAssigneeIds[0],
      });
      await loadTasksByStages();
    } catch (error) {
      console.error('Failed to remove task assignee:', error);
    } finally {
      setAssigningTaskId(null);
    }
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

  const cycleColumnSort = (stageId: string | null) => {
    const key = stageId ?? 'null';
    setColumnSort(prev => {
      const cur = prev[key] || 'manual';
      const next = cur === 'manual' ? 'date_asc' : cur === 'date_asc' ? 'date_desc' : 'manual';
      return { ...prev, [key]: next };
    });
  };

  const getSortedTasks = (tasks: Task[], stageId: string | null) => {
    const key = stageId ?? 'null';
    const sort = columnSort[key] || 'manual';
    if (sort === 'manual') return tasks;
    return [...tasks].sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return sort === 'date_asc' ? da - db : db - da;
    });
  };

  const handleMoveTask = async (task: Task, allStageTasks: Task[], direction: 'up' | 'down') => {
    const sorted = [...allStageTasks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const idx = sorted.findIndex(t => t.id === task.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    const myIndex = task.order_index ?? idx;
    const otherIndex = other.order_index ?? swapIdx;

    try {
      setIsUpdatingTask(task.id);
      await Promise.all([
        taskApi.updateTask(task.id, { order_index: otherIndex }),
        taskApi.updateTask(other.id, { order_index: myIndex }),
      ]);
      loadTasksByStages();
    } catch (error) {
      console.error('Failed to reorder task:', error);
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

  const getTaskPriorityAccent = (priority: TaskPriority) => {
    const accents = {
      [TaskPriority.LOW]: '#9CA3AF',
      [TaskPriority.MEDIUM]: '#3B82F6',
      [TaskPriority.HIGH]: '#F97316',
      [TaskPriority.URGENT]: '#EF4444',
    };

    return accents[priority] || '#9CA3AF';
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.due_date || task.status === TaskStatus.DONE) return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate.getTime() < Date.now();
  };

  const getProjectPriorityConfig = (priority: ProjectPriority, isOngoingProject: boolean) => {
    if (isOngoingProject) {
      return {
        label: 'Stały',
        color:
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600',
      };
    }

    const configs = {
      low: {
        label: 'Niski',
        color:
          'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
      },
      medium: {
        label: 'Średni',
        color:
          'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40',
      },
      high: {
        label: 'Wysoki',
        color:
          'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/40',
      },
      critical: {
        label: 'Krytyczny',
        color:
          'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/40',
      },
    };

    return configs[priority] || configs.medium;
  };

  const getProjectStatusLabel = (status: Project['status']) => {
    const labels = {
      planning: 'Planowanie',
      active: 'Aktywny',
      on_hold: 'Wstrzymany',
      completed: 'Ukończony',
      cancelled: 'Anulowany',
    };

    return labels[status] || status;
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
      task =>
        task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query)
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
    '#6B7280',
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#EAB308',
    '#84CC16',
    '#22C55E',
    '#10B981',
    '#14B8A6',
    '#06B6D4',
    '#0EA5E9',
    '#3B82F6',
    '#6366F1',
    '#8B5CF6',
    '#A855F7',
    '#D946EF',
    '#EC4899',
    '#F43F5E',
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

  const isOngoingProject = !project.target_end_date;
  const projectPriorityConfig = getProjectPriorityConfig(project.priority, isOngoingProject);
  const totalTaskCount = tasksByStages.reduce((sum, group) => sum + group.tasks.length, 0);
  const visibleTaskCount = tasksByStages.reduce(
    (sum, group) => sum + filterTasks(group.tasks).length,
    0
  );

  return (
    <MainLayout title={project.name}>
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <button
            onClick={() => navigate('/projects')}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
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
              {isOngoingProject && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40">
                  Projekt ciągły
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-2xl">
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${projectPriorityConfig.color}`}
              >
                Priorytet: {projectPriorityConfig.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                Status: {getProjectStatusLabel(project.status)}
              </span>
              {(project.start_date || isOngoingProject) && (
                <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  {project.start_date && (
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {formatDate(project.start_date)}
                    </span>
                  )}
                  {project.target_end_date ? (
                    <>
                      {project.start_date && (
                        <span className="text-gray-300 dark:text-gray-600 mx-1">→</span>
                      )}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(project.target_end_date)}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      {project.start_date ? 'bez planowanej daty zakończenia' : 'Projekt ciągły'}
                    </span>
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
      <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <nav className="flex min-w-max gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#F7941D] text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'opacity-70'}`} />
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
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tasks.total')}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {statistics.total_tasks}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tasks.done')}
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {statistics.completed_tasks}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tasks.inProgress')}
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {statistics.in_progress_tasks}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tasks.statusTodo')}
                </p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-300">
                  {statistics.todo_tasks}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tasks.statusBlocked')}
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {statistics.blocked_tasks}
                </p>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {statistics && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('projects.progress')}
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {statistics.completion_percentage}%
                </span>
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
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {t('timeTracking.totalHours')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {timeStats.totalHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
                    Płatne
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {timeStats.billableHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Niepłatne
                  </p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                    {timeStats.nonBillableHours.toFixed(1)}h
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                    Wpisów
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {timeStats.logsCount}
                  </p>
                </div>
              </div>
              {timeStats.byUser.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Czas wg osób:
                  </p>
                  <div className="space-y-2">
                    {timeStats.byUser.slice(0, 5).map(item => (
                      <div
                        key={item.user_id}
                        className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2"
                      >
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                          {item.user_name}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {item.hours.toFixed(1)}h
                        </span>
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
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t('dashboard.recentActivity')}
              </h3>
              <button
                onClick={() => setActiveTab('activity')}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {t('common.all') || 'Zobacz wszystko'} →
              </button>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 5).map(activity => {
                const Icon = getActivityIcon(activity.action);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatRelativeTime(activity.created_at)}
                      </p>
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
        <div className="space-y-4">
          {/* Search and controls */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Zadania projektu
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? `Widoczne: ${visibleTaskCount} z ${totalTaskCount} zadań`
                    : `Łącznie: ${totalTaskCount} zadań w ${tasksByStages.length} etapach`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-72 max-w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder={t('tasks.searchTasks')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 transition-all placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 rounded-md p-1 text-gray-400 transition-colors -translate-y-1/2 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      aria-label="Wyczyść wyszukiwanie"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewStageModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <Plus className="h-4 w-4 text-[#F7941D]" />
                  {t('projects.newStage') || 'Nowy etap'}
                </button>
              </div>
            </div>
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
            .kanban-column-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .kanban-column-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .kanban-column-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.45);
              border-radius: 999px;
            }
            .kanban-column-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(107, 114, 128, 0.65);
            }
          `}</style>
          <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-2 px-2 kanban-scrollbar">
            {tasksByStages.map(({ stage, tasks }) => {
              const stageId = stage?.id || null;
              const sortedTasks = getSortedTasks(tasks, stageId);
              const filteredTasks = filterTasks(sortedTasks);
              const curSort = columnSort[stageId ?? 'null'] || 'manual';
              const isOver = dragOverStage === stageId;
              const stageColor = stage?.color || '#6B7280';
              const isUnassignedStage = !stage;

              return (
                <div
                  key={stageId || 'unassigned'}
                  className={`flex-shrink-0 w-[292px] rounded-xl border border-gray-200 bg-gray-50 shadow-sm transition-all duration-200 dark:border-gray-700 dark:bg-gray-900/40 ${
                    isOver ? 'ring-2 ring-[#F7941D] ring-offset-2 dark:ring-offset-gray-900' : ''
                  }`}
                  onDragOver={handleStageDragOver}
                  onDragEnter={e => handleStageDragEnter(e, stageId)}
                  onDragLeave={handleStageDragLeave}
                  onDrop={e => handleDrop(e, stageId)}
                >
                  {/* Column header */}
                  <div
                    className="flex items-start justify-between gap-3 px-3 py-3"
                    style={{
                      background: `linear-gradient(135deg, ${stageColor}25 0%, ${stageColor}15 100%)`,
                      borderBottom: `2px solid ${stageColor}40`,
                    }}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <div
                        className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-800"
                        style={{ backgroundColor: stageColor }}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {stage?.name || t('projects.noStage') || 'Bez etapu'}
                          </span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800/80 dark:text-gray-300">
                            {searchQuery ? `${filteredTasks.length}/${tasks.length}` : tasks.length}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {isUnassignedStage ? 'Zadania bez przypisanego etapu' : 'Etap projektu'}
                        </p>
                        {stage?.is_completed_stage && (
                          <span className="mt-1 inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Etap końcowy
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cycleColumnSort(stageId)}
                        title={curSort === 'manual' ? 'Sortuj po dacie ↑' : curSort === 'date_asc' ? 'Sortuj po dacie ↓' : 'Kolejność manualna'}
                        className={`rounded-lg p-1.5 transition-all hover:bg-white/70 hover:text-gray-700 dark:hover:bg-gray-700/70 dark:hover:text-gray-200 ${curSort !== 'manual' ? 'text-[#F7941D]' : 'text-gray-400'}`}
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                      {stage && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditStage(stage)}
                          className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-white/70 hover:text-gray-700 dark:hover:bg-gray-700/70 dark:hover:text-gray-200"
                          aria-label="Opcje etapu"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tasks container */}
                  <div
                    className="kanban-column-scrollbar max-h-[calc(100vh-360px)] min-h-[260px] space-y-2 overflow-y-auto p-2.5"
                    style={{
                      background: isOver
                        ? 'linear-gradient(180deg, rgba(247, 148, 29, 0.12) 0%, rgba(247, 148, 29, 0.05) 100%)'
                        : undefined,
                    }}
                  >
                    {filteredTasks.map((task, taskIdx) => {
                      const priorityConfig = getPriorityConfig(task.priority);
                      const isDragging = draggedTask?.id === task.id;
                      const priorityAccent = getTaskPriorityAccent(task.priority);
                      const overdue = isTaskOverdue(task);
                      const assignedPeople =
                        task.assignees && task.assignees.length > 0
                          ? task.assignees
                          : task.assignee
                            ? [task.assignee]
                            : [];
                      const assignedPersonIds = assignedPeople.map(person => person.id);
                      const availableAssignees = assignableProjectMembers.filter(
                        member => !assignedPersonIds.includes(member.user_id)
                      );
                      const canAddAssignee = availableAssignees.length > 0;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onMouseDown={handleMouseDown}
                          onClick={e => handleCardClick(e, task.id)}
                          onDragStart={e => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          className={`relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-3 cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group select-none ${
                            isUpdatingTask === task.id ? 'opacity-60' : ''
                          } ${isDragging ? 'opacity-50 scale-[1.02] shadow-lg ring-2 ring-blue-400' : 'hover:-translate-y-0.5'}`}
                        >
                          {/* Manual sort buttons (visible on hover, only in manual mode) */}
                          {curSort === 'manual' && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleMoveTask(task, tasks, 'up'); }}
                                disabled={taskIdx === 0 || !!isUpdatingTask}
                                className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Przesuń wyżej"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleMoveTask(task, tasks, 'down'); }}
                                disabled={taskIdx === filteredTasks.length - 1 || !!isUpdatingTask}
                                className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Przesuń niżej"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          {/* Priority indicator bar */}
                          <div
                            className="absolute left-3 right-3 top-0 h-1 rounded-b-full"
                            style={{
                              backgroundColor: priorityAccent,
                            }}
                          />

                          <div className="mb-2 mt-1 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:bg-gray-700/60 ${priorityConfig.color}`}
                              >
                                {priorityConfig.label}
                              </span>
                              {overdue && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-300">
                                  Po terminie
                                </span>
                              )}
                            </div>
                            <div className="rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <GripVertical className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                            </div>
                          </div>

                          <h4 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <div className="relative max-w-full">
                              <UserPlus className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                              <select
                                value=""
                                onMouseDown={event => event.stopPropagation()}
                                onClick={event => event.stopPropagation()}
                                onChange={event => handleAssignTask(event, task)}
                                disabled={
                                  assigningTaskId === task.id ||
                                  !canAddAssignee
                                }
                                className="max-w-full appearance-none rounded-full border border-gray-200 bg-white py-0.5 pl-6 pr-3 text-[10px] font-semibold text-gray-600 outline-none transition-colors hover:border-gray-300 hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                title="Dodaj osobę do zadania"
                              >
                                <option value="">
                                  {canAddAssignee
                                    ? 'Dodaj osobę'
                                    : assignedPersonIds.length > 0
                                      ? 'Wszyscy z zespołu przypisani'
                                      : 'Brak osób w zespole'}
                                </option>
                                {availableAssignees.map(member => (
                                  <option key={member.user_id} value={member.user_id}>
                                    {getUserDisplayName(member.user)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {task.due_date && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  overdue
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                            {(task.actual_hours !== undefined ||
                              task.estimated_hours !== undefined) && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                                title={`${task.actual_hours || 0}h zalogowanych / ${task.estimated_hours || '?'}h szacowanych`}
                              >
                                <Clock className="h-3 w-3" />
                                {task.actual_hours || 0}h
                                {task.estimated_hours && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    /{task.estimated_hours}h
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-start justify-between gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-700/50">
                            {(() => {
                              const people = assignedPeople;
                              return people.length > 0 ? (
                                <div className="min-w-0 flex-1">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                    Odpowiedzialni
                                  </span>
                                  <div className="mt-1 flex max-h-20 flex-wrap gap-1 overflow-y-auto pr-1">
                                    {people.map(person => (
                                      <span
                                        key={person.id}
                                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-1 pr-1.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                                        title={`${person.first_name} ${person.last_name}`}
                                      >
                                        {person.avatar_url ? (
                                          <img
                                            src={getFileUrl(person.avatar_url) || ''}
                                            alt=""
                                            className="h-4 w-4 rounded-full object-cover"
                                          />
                                        ) : (
                                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-[8px] font-bold text-white">
                                            {getInitials(person.first_name, person.last_name)}
                                          </span>
                                        )}
                                        <span className="truncate">
                                          {person.first_name} {person.last_name}
                                        </span>
                                        <button
                                          type="button"
                                          onMouseDown={event => event.stopPropagation()}
                                          onClick={event =>
                                            handleRemoveTaskAssignee(event, task, person.id)
                                          }
                                          disabled={assigningTaskId === task.id}
                                          className="ml-0.5 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-600 dark:hover:text-red-300"
                                          title={`Odepnij: ${person.first_name} ${person.last_name}`}
                                          aria-label={`Odepnij: ${person.first_name} ${person.last_name}`}
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    <Users className="h-3 w-3" />
                                  </div>
                                  Brak przypisanych osób
                                </div>
                              );
                            })()}

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
                      <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/70 px-4 py-8 text-center text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500">
                        <CheckSquare className="mb-2 h-7 w-7 opacity-50" />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {searchQuery
                            ? 'Brak zadań pasujących do wyszukiwania'
                            : t('tasks.noTasks')}
                        </span>
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 rounded-md px-2 py-1 text-[11px] font-semibold text-[#F7941D] transition-colors hover:bg-[#F7941D]/10"
                          >
                            Wyczyść wyszukiwanie
                          </button>
                        ) : (
                          <span className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                            Dodaj pierwsze zadanie w tym etapie.
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick task input */}
                    {quickTaskStageId === stageId ? (
                      <div className="rounded-lg border-2 border-[#F7941D] bg-white p-2 shadow-md dark:bg-gray-800">
                        <input
                          ref={quickTaskInputRef}
                          type="text"
                          value={quickTaskTitle}
                          onChange={e => setQuickTaskTitle(e.target.value)}
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
                          {isCreatingQuickTask && (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartQuickTask(stageId)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 bg-white/70 p-2 text-xs font-semibold text-gray-500 transition-all hover:border-[#F7941D]/60 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:border-[#F7941D]/60 dark:hover:bg-[#F7941D]/10 dark:hover:text-[#F7941D]"
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
              type="button"
              onClick={() => setShowNewStageModal(true)}
              className="group flex min-h-[260px] w-[292px] flex-shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100/50 text-gray-400 transition-all duration-200 hover:border-[#F7941D]/70 hover:bg-[#F7941D]/5 hover:text-[#F7941D] dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-900/30 dark:text-gray-500 dark:hover:border-[#F7941D]/70 dark:hover:bg-[#F7941D]/10 dark:hover:text-[#F7941D]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200/50 transition-all group-hover:bg-[#F7941D]/15 dark:bg-gray-700/50">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">
                {t('projects.addStage') || 'Dodaj etap'}
              </span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Członkowie zespołu</h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddMemberPanel(isOpen => !isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {showAddMemberPanel ? 'Zamknij' : 'Dodaj członka'}
              </button>
            )}
          </div>
          {isAdmin && showAddMemberPanel && (
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={event => setMemberSearchQuery(event.target.value)}
                    placeholder="Szukaj pracownika po imieniu, nazwisku, e-mailu..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <select
                  value={newMemberRole}
                  onChange={event => setNewMemberRole(event.target.value as ProjectMemberRole)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value={ProjectMemberRole.MEMBER}>Członek</option>
                  <option value={ProjectMemberRole.LEAD}>Lider</option>
                  <option value={ProjectMemberRole.OBSERVER}>Obserwator</option>
                </select>
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {filteredAvailableUsers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                    Brak pracowników do dodania.
                  </div>
                ) : (
                  filteredAvailableUsers.map(userItem => (
                    <div
                      key={userItem.id}
                      className="flex items-center justify-between gap-3 border-b border-gray-100 p-3 last:border-b-0 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {getUserDisplayName(userItem)}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {userItem.position || userItem.department || userItem.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddProjectMember(userItem.id)}
                        disabled={memberActionUserId === userItem.id}
                        className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-[#F7941D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {memberActionUserId === userItem.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Dodaj
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {visibleMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak członków w projekcie
              </div>
            ) : (
              visibleMembers.map(member => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {member.user?.avatar_url ? (
                      <img
                        src={getFileUrl(member.user.avatar_url) || ''}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                        {member.user && getInitials(member.user.first_name, member.user.last_name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getUserDisplayName(member.user)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user?.email}
                      </p>
                      {member.user?.position && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {member.user.position}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isAdmin && member.id !== 'project-creator-fallback' ? (
                      <select
                        value={member.role}
                        onChange={async (e) => {
                          const newRole = e.target.value as ProjectMemberRole;
                          try {
                            await projectApi.updateMemberRole(id!, member.user_id, newRole);
                            loadMembers();
                          } catch {}
                        }}
                        className="px-2 py-1 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                      >
                        <option value={ProjectMemberRole.MEMBER}>Członek</option>
                        <option value={ProjectMemberRole.LEAD}>Lider</option>
                        <option value={ProjectMemberRole.OBSERVER}>Kierownik</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProjectMemberRoleClass(member.role)}`}>
                        {getProjectMemberRoleLabel(member.role)}
                      </span>
                    )}
                    {isAdmin && member.id !== 'project-creator-fallback' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProjectMember(member.user_id)}
                        disabled={memberActionUserId === member.user_id}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        aria-label="Usuń członka z projektu"
                      >
                        {memberActionUserId === member.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
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
              <h3 className="font-medium text-gray-900 dark:text-white">Pliki projektu</h3>
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
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                <FileIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Brak plików</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Przeciągnij pliki tutaj lub kliknij &quot;Dodaj pliki&quot;
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {attachments.map(attachment => {
                  const FileTypeIcon = getFileIcon(attachment.file_type);
                  return (
                    <div
                      key={attachment.id}
                      className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <FileTypeIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {attachment.original_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(attachment.file_size)} •{' '}
                            {formatRelativeTime(attachment.created_at)}
                            {attachment.uploader &&
                              ` • ${attachment.uploader.first_name} ${attachment.uploader.last_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={getFileUrl(attachment.file_url) || ''}
                          download={attachment.original_name}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
                          title="Pobierz"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => setShowDeleteFileConfirm(attachment.id)}
                          disabled={isDeletingFile === attachment.id}
                          className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
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
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">Historia aktywności</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Brak aktywności
              </div>
            ) : (
              activities.map(activity => {
                const Icon = getActivityIcon(activity.action);
                return (
                  <div
                    key={activity.id}
                    className="p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Ustawienia projektu
          </h3>
          <div className="space-y-4">
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edytuj projekt
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Etapy projektu</h4>
              <div className="space-y-2">
                {stages.map(stage => (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {stage.name}
                      </span>
                      {stage.is_completed_stage && (
                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded">
                          Etap końcowy
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenEditStage(stage)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setShowNewStageModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-full"
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nowy etap</h3>
              <button
                onClick={() => setShowNewStageModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nazwa etapu
                </label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder="np. Do zrobienia, W trakcie..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kolor
                </label>
                <div className="flex flex-wrap gap-2">
                  {stageColors.map(color => (
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
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edytuj etap</h3>
              <button
                onClick={() => {
                  setShowEditStageModal(false);
                  setEditingStage(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nazwa etapu
                </label>
                <input
                  type="text"
                  value={editStageName}
                  onChange={e => setEditStageName(e.target.value)}
                  placeholder="np. Do zrobienia, W trakcie..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kolor
                </label>
                <div className="flex flex-wrap gap-2">
                  {stageColors.map(color => (
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
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
