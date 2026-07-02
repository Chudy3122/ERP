import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Calendar,
  FolderOpen,
  Loader2,
  Circle,
  Paperclip,
  Upload,
  FileText,
  Image,
  File,
  X,
  Download,
  Search,
  CheckSquare,
} from 'lucide-react';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import { Task, TaskAttachment, CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority } from '../types/task.types';
import { Project, ProjectMember, ProjectAttachment, ProjectStage } from '../types/project.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';

const TaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEdit = !!id;
  const rawReturnTo = searchParams.get('returnTo');
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : '/tasks';
  const navigateBack = () => navigate(returnTo);

  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [isLoadingProjectMembers, setIsLoadingProjectMembers] = useState(false);
  const [isLoadingProjectStages, setIsLoadingProjectStages] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [formData, setFormData] = useState<CreateTaskRequest & UpdateTaskRequest>({
    title: '',
    description: '',
    project_id: '',
    stage_id: undefined,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigned_to: undefined,
    assignee_ids: [],
    due_date: '',
    estimated_hours: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);
  const [deletingSubtaskId, setDeletingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [isCompletingSubtasks, setIsCompletingSubtasks] = useState(false);

  // Attachments
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link project files
  const [showProjectFiles, setShowProjectFiles] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectAttachment[]>([]);
  const [loadingProjectFiles, setLoadingProjectFiles] = useState(false);
  const [selectedProjectFileIds, setSelectedProjectFileIds] = useState<Set<string>>(new Set());
  const [linkingFiles, setLinkingFiles] = useState(false);


  const isAdmin = user?.role === 'admin' || user?.role === 'kierownik';
  const selectedProject = projects.find(project => project.id === formData.project_id);
  const isSelectedProjectOngoing = Boolean(
    formData.project_id && selectedProject && !selectedProject.target_end_date
  );

  const getProjectMemberDisplayName = (member: ProjectMember) => {
    if (!member.user) return 'Użytkownik projektu';
    return (
      `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() ||
      member.user.email ||
      'Użytkownik projektu'
    );
  };

  useEffect(() => {
    loadProjects();
    if (isEdit && id) {
      loadTask();
      loadAttachments();
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (formData.project_id) {
      loadProjectMembers(formData.project_id);
      loadProjectStages(formData.project_id);
    } else {
      setProjectMembers([]);
      setProjectStages([]);
      setFormData(prev => ({ ...prev, assigned_to: undefined, assignee_ids: [], stage_id: undefined }));
    }
  }, [formData.project_id]);

  const loadProjects = async () => {
    try {
      const result = await projectApi.getMyProjects();
      setProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadProjectMembers = async (projectId: string) => {
    try {
      setIsLoadingProjectMembers(true);
      const result = await projectApi.getProjectMembers(projectId);
      const sortedMembers = [...(result || [])].sort((firstMember, secondMember) =>
        getProjectMemberDisplayName(firstMember).localeCompare(
          getProjectMemberDisplayName(secondMember),
          'pl',
          { sensitivity: 'base' }
        )
      );
      setProjectMembers(sortedMembers);
      setFormData(prev => {
        const currentAssigneeIds =
          prev.assignee_ids && prev.assignee_ids.length > 0
            ? prev.assignee_ids
            : prev.assigned_to
              ? [prev.assigned_to]
              : [];
        const validAssigneeIds = currentAssigneeIds.filter(assigneeId =>
          sortedMembers.some(member => member.user_id === assigneeId)
        );

        return {
          ...prev,
          assignee_ids: validAssigneeIds,
          assigned_to: validAssigneeIds[0],
        };
      });
    } catch (error) {
      console.error('Failed to load project members:', error);
      setProjectMembers([]);
    } finally {
      setIsLoadingProjectMembers(false);
    }
  };

  const loadProjectStages = async (projectId: string) => {
    try {
      setIsLoadingProjectStages(true);
      const result = await projectApi.getProjectStages(projectId);
      const sortedStages = [...(result || [])].sort((firstStage, secondStage) =>
        firstStage.position - secondStage.position
      );
      setProjectStages(sortedStages);

      setFormData(prev => {
        if (prev.project_id !== projectId) return prev;

        const currentStageExists = Boolean(
          prev.stage_id && sortedStages.some(stage => stage.id === prev.stage_id)
        );
        if (currentStageExists) return prev;

        const defaultStage = sortedStages[0];
        if (!defaultStage) {
          return { ...prev, stage_id: undefined };
        }

        return {
          ...prev,
          stage_id: defaultStage.id,
          status: defaultStage.is_completed_stage
            ? TaskStatus.DONE
            : prev.status === TaskStatus.DONE
              ? TaskStatus.TODO
              : prev.status,
        };
      });
    } catch (error) {
      console.error('Failed to load project stages:', error);
      setProjectStages([]);
    } finally {
      setIsLoadingProjectStages(false);
    }
  };

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const taskData = await taskApi.getTaskById(id!);
      setTask(taskData);
      setFormData({
        title: taskData.title,
        description: taskData.description || '',
        project_id: taskData.project_id,
        stage_id: taskData.stage_id || undefined,
        status: taskData.status,
        priority: taskData.priority,
        assigned_to: taskData.assigned_to || undefined,
        assignee_ids: taskData.assignees?.map(a => a.id) || (taskData.assigned_to ? [taskData.assigned_to] : []),
        due_date: taskData.due_date ? taskData.due_date.split('T')[0] : '',
        estimated_hours: taskData.estimated_hours,
      });
    } catch (error) {
      console.error('Failed to load task:', error);
      setError('Nie udało się załadować zadania');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAttachments = async () => {
    try {
      const data = await taskApi.getTaskAttachments(id!);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const saveTask = async () => {
    setError('');

    if (!formData.title.trim()) {
      setError('Tytuł zadania jest wymagany');
      return;
    }

    if (!formData.project_id) {
      setError('Projekt jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      const assigneeIds = formData.assignee_ids || [];
      const dueDate = formData.due_date?.trim();
      const payload = {
        ...formData,
        assignee_ids: assigneeIds,
        assigned_to: assigneeIds[0],
        due_date: dueDate || null,
      };
      delete payload.actual_hours;
      if (isEdit && id) {
        await taskApi.updateTask(id, payload);
        if ((formData.stage_id || null) !== (task?.stage_id || null)) {
          await projectApi.moveTaskToStage(id, formData.stage_id || null);
        }
      } else {
        await taskApi.createTask(payload as CreateTaskRequest);
      }
      navigateBack();
    } catch (error: any) {
      console.error('Failed to save task:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać zadania');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTask();
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await taskApi.deleteTask(id);
      navigateBack();
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      setError(error.response?.data?.message || 'Nie udało się usunąć zadania');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'stage_id') {
        const selectedStage = projectStages.find(stage => stage.id === value);

        return {
          ...prev,
          stage_id: value || undefined,
          status: selectedStage?.is_completed_stage
            ? TaskStatus.DONE
            : prev.status === TaskStatus.DONE
              ? TaskStatus.TODO
              : prev.status,
        };
      }

      return {
        ...prev,
        ...(name === 'project_id'
          ? { assigned_to: undefined, assignee_ids: [], stage_id: undefined, status: TaskStatus.TODO }
          : {}),
        [name]: name === 'estimated_hours'
          ? (value ? parseFloat(value) : undefined)
          : value || undefined,
      };
    });
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => {
      const ids = prev.assignee_ids || [];
      const next = ids.includes(userId)
        ? ids.filter(id => id !== userId)
        : [...ids, userId];
      return { ...prev, assignee_ids: next, assigned_to: next[0] };
    });
  };

  const selectVisibleAssignees = () => {
    setFormData(prev => {
      const currentIds = prev.assignee_ids || [];
      const visibleIds = filteredProjectMembers.map(member => member.user_id);
      const next = Array.from(new Set([...currentIds, ...visibleIds]));

      return { ...prev, assignee_ids: next, assigned_to: next[0] };
    });
  };

  const clearAssignees = () => {
    setFormData(prev => ({ ...prev, assignee_ids: [], assigned_to: undefined }));
  };

  const selectedAssigneeIds = formData.assignee_ids || [];
  const filteredProjectMembers = projectMembers.filter(member => {
    const query = assigneeSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      member.user?.first_name,
      member.user?.last_name,
      member.user?.email,
      getProjectMemberDisplayName(member),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const selectedProjectMembers = projectMembers.filter(member =>
    selectedAssigneeIds.includes(member.user_id)
  );
  const areAllVisibleAssigneesSelected =
    filteredProjectMembers.length > 0 &&
    filteredProjectMembers.every(member => selectedAssigneeIds.includes(member.user_id));
  const subtasks = [...(task?.subtasks || [])].sort((firstSubtask, secondSubtask) =>
    new Date(firstSubtask.created_at).getTime() - new Date(secondSubtask.created_at).getTime()
  );
  const completedSubtasksCount = subtasks.filter(subtask => subtask.status === TaskStatus.DONE).length;
  const hasIncompleteSubtasks = subtasks.some(subtask => subtask.status !== TaskStatus.DONE);
  const canManageSubtasks = Boolean(isEdit && task && !task.parent_task_id);

  const handleCreateSubtask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;

    try {
      setIsCreatingSubtask(true);
      const createdSubtask = await taskApi.createTask({
        project_id: task.project_id,
        stage_id: task.stage_id,
        title: newSubtaskTitle.trim(),
        description: '',
        status: TaskStatus.TODO,
        priority: task.priority || TaskPriority.MEDIUM,
        parent_task_id: task.id,
        due_date: null,
      });
      setTask(prev => prev ? {
        ...prev,
        subtasks: [...(prev.subtasks || []), createdSubtask],
      } : prev);
      setNewSubtaskTitle('');
    } catch (error: any) {
      console.error('Failed to create subtask:', error);
      setError(error.response?.data?.message || 'Nie udało się dodać podzadania');
    } finally {
      setIsCreatingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtask: Task) => {
    const nextStatus = subtask.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;

    try {
      setUpdatingSubtaskId(subtask.id);
      await taskApi.updateTaskStatus(subtask.id, nextStatus);
      setTask(prev => prev ? {
        ...prev,
        subtasks: (prev.subtasks || []).map(item =>
          item.id === subtask.id ? { ...item, status: nextStatus } : item
        ),
      } : prev);
    } catch (error: any) {
      console.error('Failed to update subtask:', error);
      setError(error.response?.data?.message || 'Nie udało się zmienić statusu podzadania');
    } finally {
      setUpdatingSubtaskId(null);
    }
  };

  const handleCompleteAllSubtasks = async () => {
    const incompleteSubtasks = subtasks.filter(subtask => subtask.status !== TaskStatus.DONE);
    if (incompleteSubtasks.length === 0) return;

    try {
      setIsCompletingSubtasks(true);
      await Promise.all(
        incompleteSubtasks.map(subtask => taskApi.updateTaskStatus(subtask.id, TaskStatus.DONE))
      );

      setTask(prev => prev ? {
        ...prev,
        subtasks: (prev.subtasks || []).map(item =>
          incompleteSubtasks.some(subtask => subtask.id === item.id)
            ? { ...item, status: TaskStatus.DONE }
            : item
        ),
      } : prev);
    } catch (error: any) {
      console.error('Failed to complete subtasks:', error);
      setError(error.response?.data?.message || 'Nie udało się oznaczyć całej checklisty jako wykonanej');
    } finally {
      setIsCompletingSubtasks(false);
    }
  };

  const startEditingSubtask = (subtask: Task) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const cancelEditingSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const handleUpdateSubtaskTitle = async (event: React.FormEvent, subtask: Task) => {
    event.preventDefault();
    const nextTitle = editingSubtaskTitle.trim();

    if (!nextTitle || nextTitle === subtask.title) {
      cancelEditingSubtask();
      return;
    }

    try {
      setUpdatingSubtaskId(subtask.id);
      const updatedSubtask = await taskApi.updateTask(subtask.id, { title: nextTitle });
      setTask(prev => prev ? {
        ...prev,
        subtasks: (prev.subtasks || []).map(item =>
          item.id === subtask.id ? { ...item, ...updatedSubtask, title: nextTitle } : item
        ),
      } : prev);
      cancelEditingSubtask();
    } catch (error: any) {
      console.error('Failed to update subtask title:', error);
      setError(error.response?.data?.message || 'Nie udało się zmienić treści podzadania');
    } finally {
      setUpdatingSubtaskId(null);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      setDeletingSubtaskId(subtaskId);
      await taskApi.deleteTask(subtaskId);
      setTask(prev => prev ? {
        ...prev,
        subtasks: (prev.subtasks || []).filter(item => item.id !== subtaskId),
      } : prev);
    } catch (error: any) {
      console.error('Failed to delete subtask:', error);
      setError(error.response?.data?.message || 'Nie udało się usunąć podzadania');
    } finally {
      setDeletingSubtaskId(null);
    }
  };

  // File handling
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!id) return;

    try {
      setIsUploadingFiles(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const newAttachments = await taskApi.uploadTaskAttachments(id, files);
      clearInterval(interval);
      setUploadProgress(100);

      setAttachments(prev => [...newAttachments, ...prev]);

      setTimeout(() => {
        setIsUploadingFiles(false);
        setUploadProgress(0);
      }, 500);
    } catch (error: any) {
      console.error('Failed to upload files:', error);
      setError(error.response?.data?.message || 'Nie udało się przesłać plików');
      setIsUploadingFiles(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;

    try {
      await taskApi.deleteTaskAttachment(id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error: any) {
      console.error('Failed to delete attachment:', error);
      setError(error.response?.data?.message || 'Nie udało się usunąć załącznika');
    }
  };

  // Link existing project files to this task
  const openProjectFilesModal = async () => {
    if (!formData.project_id) return;
    setShowProjectFiles(true);
    setLoadingProjectFiles(true);
    setSelectedProjectFileIds(new Set());
    try {
      const all = await projectApi.getProjectAttachments(formData.project_id);
      const linkedUrls = new Set(attachments.map(a => a.file_url));
      // Only the project's own files, not already linked to this task
      setProjectFiles(all.filter(f => f.source !== 'task' && !linkedUrls.has(f.file_url)));
    } catch {
      setProjectFiles([]);
    } finally {
      setLoadingProjectFiles(false);
    }
  };

  const toggleProjectFile = (fileId: string) => {
    setSelectedProjectFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  };

  const handleLinkProjectFiles = async () => {
    if (!id || selectedProjectFileIds.size === 0) return;
    try {
      setLinkingFiles(true);
      const linked = await taskApi.linkProjectFilesToTask(id, Array.from(selectedProjectFileIds));
      setAttachments(prev => [...linked, ...prev]);
      setShowProjectFiles(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Nie udało się podpiąć plików');
    } finally {
      setLinkingFiles(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-center py-16">
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#F7941D]"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Ładowanie formularza zadania...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start gap-4">
            <button
              type="button"
              onClick={navigateBack}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#F7941D]/40 dark:hover:bg-[#F7941D]/10"
              aria-label="Wróć do listy zadań"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D]">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                  {isEdit ? 'Edycja zadania' : 'Nowe zadanie'}
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-white">
                    {isEdit ? (task?.title || 'Edytuj zadanie') : 'Nowe zadanie'}
                  </h1>
                  {isEdit && task && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {task.project?.code || 'Zadanie'}
                    </span>
                  )}
                </div>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  {isEdit
                    ? 'Zaktualizuj zakres zadania, checklistę, załączniki i szczegóły w panelu po prawej.'
                    : 'Utwórz zadanie w projekcie i przypisz je do osób z zespołu.'}
                </p>
              </div>
            </div>
          </div>
          {isEdit && task?.project && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
              <FolderOpen className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{task.project.name}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Zakres zadania</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  W głównej części zostaje nazwa i opis, czyli właściwa treść zadania.
                </p>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <label htmlFor="title" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tytuł zadania *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="np. Implementacja modułu logowania"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Opis zadania
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Opisz szczegóły zadania..."
                  />
                </div>
              </div>
            </form>

            {canManageSubtasks && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                      <CheckSquare className="h-4 w-4 text-[#F7941D]" />
                      Checklisty / podzadania
                      {subtasks.length > 0 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {completedSubtasksCount}/{subtasks.length}
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Rozbij zadanie na mniejsze kroki i odhaczaj je w trakcie realizacji.
                    </p>
                  </div>
                  {subtasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCompleteAllSubtasks}
                      disabled={!hasIncompleteSubtasks || isCompletingSubtasks}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {isCompletingSubtasks ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckSquare className="h-3.5 w-3.5" />
                      )}
                      Oznacz wszystkie
                    </button>
                  )}
                </div>

                <div className="space-y-3 p-5">
                  <form onSubmit={handleCreateSubtask} className="flex gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={event => setNewSubtaskTitle(event.target.value)}
                      placeholder="Dodaj podzadanie..."
                      className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                      disabled={isCreatingSubtask}
                    />
                    <button
                      type="submit"
                      disabled={isCreatingSubtask || !newSubtaskTitle.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCreatingSubtask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Dodaj
                    </button>
                  </form>

                  {subtasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Brak podzadań. Dodaj pierwszy krok, jeśli zadanie wymaga rozbicia na mniejsze części.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subtasks.map(subtask => {
                        const isDone = subtask.status === TaskStatus.DONE;
                        const isUpdating = updatingSubtaskId === subtask.id;
                        const isDeleting = deletingSubtaskId === subtask.id;

                        return (
                          <div
                            key={subtask.id}
                            className="group flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 transition-colors hover:border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700/40 dark:hover:bg-gray-700"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleSubtask(subtask)}
                              disabled={isUpdating || isDeleting}
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                isDone
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-gray-300 bg-white text-gray-400 hover:border-[#F7941D] hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-800'
                              }`}
                              aria-label={isDone ? 'Oznacz jako nieukończone' : 'Oznacz jako ukończone'}
                            >
                              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isDone ? <CheckSquare className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                            </button>

                            {editingSubtaskId === subtask.id ? (
                              <form
                                onSubmit={event => handleUpdateSubtaskTitle(event, subtask)}
                                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                              >
                                <input
                                  type="text"
                                  value={editingSubtaskTitle}
                                  onChange={event => setEditingSubtaskTitle(event.target.value)}
                                  className="h-8 min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  disabled={isUpdating || !editingSubtaskTitle.trim()}
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
                                >
                                  Zapisz
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingSubtask}
                                  disabled={isUpdating}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                  Anuluj
                                </button>
                              </form>
                            ) : (
                              <>
                                <span className={`min-w-0 flex-1 text-sm ${isDone ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                  {subtask.title}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => startEditingSubtask(subtask)}
                                  disabled={isUpdating || isDeleting}
                                  className="inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-xs font-semibold text-gray-400 opacity-0 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100 dark:text-gray-500 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                                >
                                  Edytuj
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubtask(subtask.id)}
                                  disabled={isUpdating || isDeleting}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100 dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                                  aria-label={`Usuń podzadanie: ${subtask.title}`}
                                  title="Usuń podzadanie"
                                >
                                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isEdit && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                    <Paperclip className="h-4 w-4 text-[#F7941D]" />
                    Załączniki
                    {attachments.length > 0 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {attachments.length}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    {formData.project_id && (
                      <button type="button" onClick={openProjectFilesModal} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                        <FolderOpen className="w-3.5 h-3.5" />
                        Z projektu
                      </button>
                    )}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                      <Upload className="w-3.5 h-3.5" />
                      Dodaj
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
                </div>

                <div className="p-5">
                  <div
                    className={`rounded-xl border border-dashed p-4 text-center transition-colors ${dragActive ? 'border-[#F7941D] bg-[#F7941D]/10' : 'border-gray-300 hover:border-[#F7941D]/60 dark:border-gray-600'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {isUploadingFiles ? (
                      <div className="space-y-2">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#F7941D]" />
                        <p className="text-xs text-gray-600 dark:text-gray-400">Przesyłanie...</p>
                        <div className="mx-auto h-1.5 max-w-[120px] rounded-full bg-gray-200 dark:bg-gray-600">
                          <div className="h-1.5 rounded-full bg-[#F7941D] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Upload className="w-4 h-4" />
                        <span>Przeciągnij pliki lub kliknij &quot;Dodaj&quot;</span>
                      </div>
                    )}
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.file_type);
                        const isImage = attachment.file_type.startsWith('image/');

                        return (
                          <div key={attachment.id} className="group flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700">
                            {isImage ? (
                              <img src={getFileUrl(attachment.file_url) || ''} alt={attachment.original_name} className="h-7 w-7 rounded object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gray-200 dark:bg-gray-600">
                                <FileIcon className="h-3.5 w-3.5 text-gray-500" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-gray-900 dark:text-white">{attachment.original_name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatFileSize(Number(attachment.file_size))}</p>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <a href={getFileUrl(attachment.file_url) || ''} download={attachment.original_name} className="rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600" title="Pobierz">
                                <Download className="h-3.5 w-3.5 text-gray-500" />
                              </a>
                              <button type="button" onClick={() => handleDeleteAttachment(attachment.id)} className="rounded p-1 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30" title="Usuń">
                                <X className="h-3.5 w-3.5 text-red-500" />
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
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Szczegóły zadania</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Projekt, osoby, termin i parametry zadania.</p>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label htmlFor="project_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Projekt *</label>
                  <select id="project_id" name="project_id" value={formData.project_id} onChange={handleChange} required className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                    <option value="">Wybierz projekt</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name} ({project.code})</option>
                    ))}
                  </select>
                  {selectedProject && (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200"><FolderOpen className="h-3.5 w-3.5 text-gray-400" />{selectedProject.code}</span>
                        {isSelectedProjectOngoing ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Projekt ciągły</span>
                        ) : selectedProject.target_end_date ? (
                          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400"><Calendar className="h-3.5 w-3.5" />Termin: {new Date(selectedProject.target_end_date).toLocaleDateString('pl-PL')}</span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <span>Przypisane osoby</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] normal-case tracking-normal text-gray-600 dark:bg-gray-700 dark:text-gray-300">{selectedAssigneeIds.length}</span>
                  </label>
                  {selectedProjectMembers.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {selectedProjectMembers.map(member => (
                        <span key={member.user_id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          <span className="truncate">{getProjectMemberDisplayName(member)}</span>
                          <button type="button" onClick={() => toggleAssignee(member.user_id)} className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-600 dark:hover:text-red-300" aria-label={`Usuń przypisanie: ${getProjectMemberDisplayName(member)}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
                    {!formData.project_id ? (
                      <div className="px-2.5 py-2 text-xs text-gray-400 dark:text-gray-500">Najpierw wybierz projekt</div>
                    ) : isLoadingProjectMembers ? (
                      <div className="px-2.5 py-2 text-xs text-gray-400 dark:text-gray-500">Ładowanie zespołu...</div>
                    ) : projectMembers.length === 0 ? (
                      <div className="px-2.5 py-2 text-xs text-gray-400 dark:text-gray-500">Brak osób w zespole projektu</div>
                    ) : (
                      <div>
                        <div className="border-b border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-800/60">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={assigneeSearch} onChange={event => setAssigneeSearch(event.target.value)} className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" placeholder="Szukaj osoby..." />
                            {assigneeSearch && (
                              <button type="button" onClick={() => setAssigneeSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200" aria-label="Wyczyść wyszukiwanie osób">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" onClick={selectVisibleAssignees} disabled={filteredProjectMembers.length === 0 || areAllVisibleAssigneesSelected} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">Zaznacz</button>
                            <button type="button" onClick={clearAssignees} disabled={selectedAssigneeIds.length === 0} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Wyczyść</button>
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredProjectMembers.length > 0 ? (
                            filteredProjectMembers.map(member => {
                              const selected = selectedAssigneeIds.includes(member.user_id);
                              return (
                                <label key={member.user_id} className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selected ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
                                  <input type="checkbox" checked={selected} onChange={() => toggleAssignee(member.user_id)} className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]" />
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                                    {member.user ? `${member.user.first_name?.[0] || ''}${member.user.last_name?.[0] || ''}` : '?'}
                                  </div>
                                  <span className="truncate text-gray-700 dark:text-gray-300">{getProjectMemberDisplayName(member)}</span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="px-2.5 py-3 text-xs text-gray-400 dark:text-gray-500">Brak osób pasujących do wyszukiwania</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label htmlFor="stage_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kolumna kanbana</label>
                    <select
                      id="stage_id"
                      name="stage_id"
                      value={formData.stage_id || ''}
                      onChange={handleChange}
                      disabled={!formData.project_id || isLoadingProjectStages || projectStages.length === 0}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                    >
                      {!formData.project_id && <option value="">Najpierw wybierz projekt</option>}
                      {formData.project_id && isLoadingProjectStages && <option value="">Ładowanie kolumn...</option>}
                      {formData.project_id && !isLoadingProjectStages && projectStages.length === 0 && <option value="">Brak kolumn w projekcie</option>}
                      {projectStages.map(stage => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                    {formData.project_id && projectStages.length > 0 && (
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        To są kolumny z kanbana tego projektu.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="priority" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Priorytet</label>
                    <select id="priority" name="priority" value={formData.priority} onChange={handleChange} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      <option value="low">Niski</option>
                      <option value="medium">Średni</option>
                      <option value="high">Wysoki</option>
                      <option value="urgent">Pilne</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="due_date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Termin</label>
                    <div className="flex gap-2">
                      <input type="date" id="due_date" name="due_date" value={formData.due_date || ''} onChange={handleChange} className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                      {formData.due_date && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, due_date: '' }))} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-300" aria-label="Wyczyść termin zadania" title="Wyczyść termin">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {isSelectedProjectOngoing && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Projekt ciągły może mieć zadania z opcjonalnym terminem realizacji.</p>}
                  </div>

                  <div>
                    <label htmlFor="estimated_hours" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Szacowany czas (h)</label>
                    <input type="number" id="estimated_hours" name="estimated_hours" value={formData.estimated_hours || ''} onChange={handleChange} step="0.5" min="0" className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" placeholder="8" />
                  </div>
                </div>
              </div>

            </div>

            {isEdit && task?.creator && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Utworzył</div>
                <p className="truncate font-semibold text-gray-900 dark:text-white">{task.creator.first_name} {task.creator.last_name}</p>
              </div>
            )}

          </aside>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Akcje zadania
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {isEdit && isAdmin && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Usuń
              </button>
            )}
            <button
              type="button"
              onClick={navigateBack}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={saveTask}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Zapisz zmiany' : 'Utwórz zadanie'}
                </>
              )}
            </button>
          </div>
        </div>
        {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Potwierdź usunięcie</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Czy na pewno chcesz usunąć to zadanie? Ta akcja jest nieodwracalna i usunie również wszystkie załączniki.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Usuwanie...
                  </>
                ) : (
                  'Usuń zadanie'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pick existing project files to link to this task */}
      {showProjectFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pliki z projektu</h3>
              <button type="button" onClick={() => setShowProjectFiles(false)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {loadingProjectFiles ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" /></div>
              ) : projectFiles.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Brak plików projektu do podpięcia.</p>
              ) : (
                <ul className="space-y-2">
                  {projectFiles.map(f => (
                    <li key={f.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40">
                        <input
                          type="checkbox"
                          checked={selectedProjectFileIds.has(f.id)}
                          onChange={() => toggleProjectFile(f.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#F7941D]"
                        />
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200">{f.original_name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">Zaznaczone: {selectedProjectFileIds.size}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowProjectFiles(false)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleLinkProjectFiles}
                  disabled={selectedProjectFileIds.size === 0 || linkingFiles}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {linkingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  Podepnij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </MainLayout>
  );
};

export default TaskForm;


