import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  Clock,
  FolderOpen,
  Loader2,
  Circle,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ChevronDown,
  Paperclip,
  Upload,
  FileText,
  Image,
  File,
  X,
  Download,
  Eye,
  Search,
  CheckSquare,
} from 'lucide-react';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import { Task, TaskAttachment, CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority } from '../types/task.types';
import { Project, ProjectMember } from '../types/project.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';

const TaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoadingProjectMembers, setIsLoadingProjectMembers] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [formData, setFormData] = useState<CreateTaskRequest & UpdateTaskRequest>({
    title: '',
    description: '',
    project_id: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigned_to: undefined,
    assignee_ids: [],
    due_date: '',
    estimated_hours: undefined,
    actual_hours: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status dropdown
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Attachments
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


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
    } else {
      setProjectMembers([]);
      setFormData(prev => ({ ...prev, assigned_to: undefined, assignee_ids: [] }));
    }
  }, [formData.project_id]);

  useEffect(() => {
    if (isSelectedProjectOngoing && formData.due_date) {
      setFormData(prev => ({ ...prev, due_date: '' }));
    }
  }, [isSelectedProjectOngoing, formData.due_date]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const taskData = await taskApi.getTaskById(id!);
      setTask(taskData);
      setFormData({
        title: taskData.title,
        description: taskData.description || '',
        project_id: taskData.project_id,
        status: taskData.status,
        priority: taskData.priority,
        assigned_to: taskData.assigned_to || undefined,
        assignee_ids: taskData.assignees?.map(a => a.id) || (taskData.assigned_to ? [taskData.assigned_to] : []),
        due_date: taskData.due_date ? taskData.due_date.split('T')[0] : '',
        estimated_hours: taskData.estimated_hours,
        actual_hours: taskData.actual_hours,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        due_date: isSelectedProjectOngoing || !dueDate ? null : dueDate,
      };
      if (isEdit && id) {
        await taskApi.updateTask(id, payload);
      } else {
        await taskApi.createTask(payload as CreateTaskRequest);
      }
      navigate('/tasks');
    } catch (error: any) {
      console.error('Failed to save task:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać zadania');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await taskApi.deleteTask(id);
      navigate('/tasks');
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
    setFormData(prev => ({
      ...prev,
      ...(name === 'project_id' ? { assigned_to: undefined, assignee_ids: [] } : {}),
      [name]: name === 'estimated_hours' || name === 'actual_hours'
        ? (value ? parseFloat(value) : undefined)
        : value || undefined,
    }));
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

  const handleQuickStatusChange = async (newStatus: TaskStatus) => {
    if (!id || !task) return;

    try {
      setIsChangingStatus(true);
      await taskApi.updateTaskStatus(id, newStatus);
      setTask({ ...task, status: newStatus });
      setFormData(prev => ({ ...prev, status: newStatus }));
      setShowStatusDropdown(false);
    } catch (error: any) {
      console.error('Failed to change status:', error);
      setError('Nie udało się zmienić statusu');
    } finally {
      setIsChangingStatus(false);
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

  const allStatuses: TaskStatus[] = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVIEW,
    TaskStatus.DONE,
    TaskStatus.BLOCKED,
  ];

  const getStatusConfig = (status: TaskStatus) => {
    const configs: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
      todo: { label: 'Do zrobienia', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: Circle },
      in_progress: { label: 'W trakcie', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: PlayCircle },
      review: { label: 'Do sprawdzenia', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Eye },
      done: { label: 'Zakończone', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
      blocked: { label: 'Zablokowane', color: 'text-red-700', bgColor: 'bg-red-100', icon: AlertCircle },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: TaskPriority) => {
    const configs = {
      low: { label: 'Niski', color: 'text-gray-600', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' },
      medium: { label: 'Średni', color: 'text-blue-600', bgColor: 'bg-blue-50', dotColor: 'bg-blue-500' },
      high: { label: 'Wysoki', color: 'text-orange-600', bgColor: 'bg-orange-50', dotColor: 'bg-orange-500' },
      urgent: { label: 'Pilne', color: 'text-red-600', bgColor: 'bg-red-50', dotColor: 'bg-red-500' },
    };
    return configs[priority];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
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
        {/* Header */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start gap-4">
            <button
              onClick={() => navigate('/tasks')}
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
                    ? 'Zaktualizuj zakres, przypisane osoby, termin i parametry zadania.'
                    : 'Utwórz zadanie w wybranym projekcie i przypisz je do osób z zespołu.'}
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

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className={`${isEdit ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          {/* Basic Info Card */}
          <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Informacje podstawowe</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Najważniejsze dane zadania, projekt, osoby odpowiedzialne i termin.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Zakres zadania</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Zacznij od nazwy i opisu, żeby zadanie było czytelne na liście oraz w projekcie.
                </p>
              </div>

              {/* Task Title */}
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

              {/* Description */}
              <div>
                <label htmlFor="description" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Opis zadania
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="Opisz szczegóły zadania..."
                />
              </div>

              <div className="border-t border-gray-100 pt-5 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Projekt i zespół</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Po wyborze projektu możesz przypisać zadanie do osób z jego zespołu.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Project */}
                <div className="md:col-span-3">
                  <label htmlFor="project_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Projekt *
                  </label>
                  <select
                    id="project_id"
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    required
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Wybierz projekt</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                  </select>
                  {selectedProject && (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200">
                          <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
                          {selectedProject.code}
                        </span>
                        {isSelectedProjectOngoing ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Projekt ciągły
                          </span>
                        ) : selectedProject.target_end_date ? (
                          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            Termin projektu:{' '}
                            {new Date(selectedProject.target_end_date).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignees (multi-select) */}
                <div className="md:col-span-3">
                  <label className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <span>Przypisane osoby</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] normal-case tracking-normal text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      Wybrano: {selectedAssigneeIds.length}
                    </span>
                  </label>
                  <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                    Możesz wybrać dowolne osoby z zespołu projektu.
                  </p>
                  {selectedProjectMembers.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {selectedProjectMembers.map(member => (
                        <span
                          key={member.user_id}
                          className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        >
                          <span className="truncate">{getProjectMemberDisplayName(member)}</span>
                          <button
                            type="button"
                            onClick={() => toggleAssignee(member.user_id)}
                            className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-600 dark:hover:text-red-300"
                            aria-label={`Usuń przypisanie: ${getProjectMemberDisplayName(member)}`}
                          >
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
                            <input
                              type="text"
                              value={assigneeSearch}
                              onChange={event => setAssigneeSearch(event.target.value)}
                              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                              placeholder="Szukaj osoby w zespole projektu..."
                            />
                            {assigneeSearch && (
                              <button
                                type="button"
                                onClick={() => setAssigneeSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                                aria-label="Wyczyść wyszukiwanie osób"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              Widoczne: {filteredProjectMembers.length} z {projectMembers.length}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={selectVisibleAssignees}
                                disabled={
                                  filteredProjectMembers.length === 0 || areAllVisibleAssigneesSelected
                                }
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Zaznacz widocznych
                              </button>
                              <button
                                type="button"
                                onClick={clearAssignees}
                                disabled={selectedAssigneeIds.length === 0}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Wyczyść
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredProjectMembers.length > 0 ? (
                            filteredProjectMembers.map((member) => {
                              const selected = selectedAssigneeIds.includes(member.user_id);
                              return (
                                <label
                                  key={member.user_id}
                                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selected ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleAssignee(member.user_id)}
                                    className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                                  />
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                                    {member.user ? `${member.user.first_name?.[0] || ''}${member.user.last_name?.[0] || ''}` : '?'}
                                  </div>
                                  <span className="truncate text-gray-700 dark:text-gray-300">{getProjectMemberDisplayName(member)}</span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="px-2.5 py-3 text-xs text-gray-400 dark:text-gray-500">
                              Brak osób pasujących do wyszukiwania
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {formData.project_id && projectMembers.length === 0 && !isLoadingProjectMembers && (
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Dodaj osoby w zakładce zespół projektu, aby można było przypisać zadanie.
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 dark:border-gray-700 md:col-span-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Parametry zadania</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Ustaw priorytet, termin oraz szacowany czas pracy.
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Priorytet
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">Niski</option>
                    <option value="medium">Średni</option>
                    <option value="high">Wysoki</option>
                    <option value="urgent">Pilne</option>
                  </select>
                </div>

                {/* Status (only visible when not editing - in edit mode it's in sidebar) */}
                {!isEdit && (
                  <div>
                    <label htmlFor="status" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {allStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getStatusConfig(status).label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Due Date */}
                <div>
                  <label htmlFor="due_date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Termin
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date || ''}
                    onChange={handleChange}
                    disabled={isSelectedProjectOngoing}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                  />
                  {isSelectedProjectOngoing && (
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Projekt ciągły - zadanie bez terminu zakończenia.
                    </p>
                  )}
                </div>

                {/* Estimated Hours */}
                <div>
                  <label htmlFor="estimated_hours" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Szacowany (h)
                  </label>
                  <input
                    type="number"
                    id="estimated_hours"
                    name="estimated_hours"
                    value={formData.estimated_hours || ''}
                    onChange={handleChange}
                    step="0.5"
                    min="0"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="8"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/60">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Anuluj
              </button>
              <button
                type="submit"
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
          </form>

          {/* Attachments Section - only in edit mode */}
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Dodaj
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="p-5">
                {/* Upload area - compact */}
                <div
                  className={`rounded-xl border border-dashed p-4 text-center transition-colors ${
                    dragActive
                      ? 'border-[#F7941D] bg-[#F7941D]/10'
                      : 'border-gray-300 hover:border-[#F7941D]/60 dark:border-gray-600'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {isUploadingFiles ? (
                    <div className="space-y-2">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#F7941D]" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">Przesyłanie...</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 max-w-[120px] mx-auto">
                        <div
                          className="h-1.5 rounded-full bg-[#F7941D] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Upload className="w-4 h-4" />
                      <span>Przeciągnij pliki lub kliknij &quot;Dodaj&quot;</span>
                    </div>
                  )}
                </div>

                {/* Attachments list - compact */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.file_type);
                      const isImage = attachment.file_type.startsWith('image/');

                      return (
                        <div
                          key={attachment.id}
                          className="group flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                        >
                          {isImage ? (
                            <img
                              src={getFileUrl(attachment.file_url) || ''}
                              alt={attachment.original_name}
                              className="w-7 h-7 object-cover rounded"
                            />
                          ) : (
                            <div className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center shrink-0">
                              <FileIcon className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {attachment.original_name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {formatFileSize(Number(attachment.file_size))}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={getFileUrl(attachment.file_url) || ''}
                              download={attachment.original_name}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Pobierz"
                            >
                              <Download className="w-3.5 h-3.5 text-gray-500" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Usuń"
                            >
                              <X className="w-3.5 h-3.5 text-red-500" />
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

        {/* Sidebar */}
        {isEdit && task && (
          <div className="space-y-4">
            {/* Status Card with dropdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</h3>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={isChangingStatus}
                  className="w-full"
                >
                  {(() => {
                    const statusConfig = getStatusConfig(task.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 ${statusConfig.bgColor} ${statusConfig.color} cursor-pointer text-sm transition-opacity hover:opacity-90`}>
                        <div className="flex items-center gap-1.5">
                          {isChangingStatus ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <StatusIcon className="w-3.5 h-3.5" />
                          )}
                          <span className="font-semibold">{statusConfig.label}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    );
                  })()}
                </button>

                {/* Status Dropdown */}
                {showStatusDropdown && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Zmień na:</p>
                    </div>
                    {allStatuses.map((status) => {
                      const config = getStatusConfig(status);
                      const Icon = config.icon;
                      const isCurrentStatus = task.status === status;

                      return (
                        <button
                          key={status}
                          onClick={() => !isCurrentStatus && handleQuickStatusChange(status)}
                          disabled={isCurrentStatus}
                          className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left transition-colors ${
                            isCurrentStatus
                              ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 cursor-default'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className={`p-0.5 rounded ${config.bgColor} ${config.color}`}>
                            <Icon className="w-3 h-3" />
                          </span>
                          {config.label}
                          {isCurrentStatus && (
                            <span className="ml-auto text-[10px] text-gray-400">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Priority Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Priorytet</h3>
              {(() => {
                const priorityConfig = getPriorityConfig(task.priority);
                return (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${priorityConfig.bgColor} text-sm`}>
                    <div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`} />
                    <span className={`font-medium ${priorityConfig.color}`}>{priorityConfig.label}</span>
                  </div>
                );
              })()}
            </div>

            {/* Details Card */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Szczegóły</h3>

              {/* Project */}
              {task.project && (
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Projekt</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{task.project.name}</p>
                  </div>
                </div>
              )}

              {/* Assignees */}
              {((task.assignees && task.assignees.length > 0) || task.assignee) && (
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Przypisane osoby</p>
                  <div className="space-y-1">
                    {(task.assignees && task.assignees.length > 0 ? task.assignees : task.assignee ? [task.assignee] : []).map(person => (
                      <div key={person.id} className="flex items-center gap-2">
                        {person.avatar_url ? (
                          <img src={getFileUrl(person.avatar_url) || ''} alt="" className="w-5 h-5 rounded-full shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-medium text-gray-600 shrink-0">
                            {getInitials(person.first_name, person.last_name)}
                          </div>
                        )}
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {person.first_name} {person.last_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Creator */}
              {task.creator && (
                <div className="flex items-center gap-2">
                  {task.creator.avatar_url ? (
                    <img
                      src={getFileUrl(task.creator.avatar_url) || ''}
                      alt=""
                      className="w-5 h-5 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-medium text-gray-600 shrink-0">
                      {getInitials(task.creator.first_name, task.creator.last_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Utworzył</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {task.creator.first_name} {task.creator.last_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Due date */}
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Termin</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {new Date(task.due_date).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Created at */}
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Utworzono</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(task.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Card */}
            {isAdmin && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900/50 dark:bg-red-900/10">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Strefa niebezpieczeństwa</h3>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Usuwanie...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Usuń zadanie
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
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

    </MainLayout>
  );
};

export default TaskForm;
