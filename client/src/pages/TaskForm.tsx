import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Save,
  Trash2,
  User,
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
  Plus,
  Timer,
  Edit2,
} from 'lucide-react';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import * as adminApi from '../api/admin.api';
import * as workLogApi from '../api/worklog.api';
import { Task, TaskAttachment, CreateTaskRequest, UpdateTaskRequest, TaskStatus, TaskPriority } from '../types/task.types';
import { WorkLogType, WorkLogTypeLabels } from '../types/worklog.types';
import type { WorkLog, CreateWorkLogRequest } from '../types/worklog.types';
import { Project } from '../types/project.types';
import { AdminUser } from '../types/admin.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/common/ConfirmDialog';

const TaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isEdit = !!id;

  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [formData, setFormData] = useState<CreateTaskRequest & UpdateTaskRequest>({
    title: '',
    description: '',
    project_id: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigned_to: undefined,
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

  // Work logs
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [showWorkLogForm, setShowWorkLogForm] = useState(false);
  const [workLogFormData, setWorkLogFormData] = useState<CreateWorkLogRequest>({
    work_date: new Date().toISOString().split('T')[0],
    hours: 1,
    description: '',
    is_billable: false,
    work_type: WorkLogType.REGULAR,
  });
  const [isSavingWorkLog, setIsSavingWorkLog] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [deleteWorkLogId, setDeleteWorkLogId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'team_leader';

  useEffect(() => {
    loadProjects();
    loadUsers();
    if (isEdit && id) {
      loadTask();
      loadAttachments();
      loadWorkLogs();
    }
  }, [id, isEdit]);

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

  const loadUsers = async () => {
    try {
      const result = await adminApi.getUsers();
      setUsers(result || []);
    } catch (error) {
      console.error('Failed to load users:', error);
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

  const loadWorkLogs = async () => {
    try {
      const data = await workLogApi.getTaskWorkLogs(id!);
      setWorkLogs(data);
    } catch (error) {
      console.error('Failed to load work logs:', error);
    }
  };

  const handleSaveWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setIsSavingWorkLog(true);

      if (editingWorkLog) {
        await workLogApi.updateWorkLog(editingWorkLog.id, {
          work_date: workLogFormData.work_date,
          hours: workLogFormData.hours,
          description: workLogFormData.description,
          is_billable: workLogFormData.is_billable,
        });
      } else {
        await workLogApi.createWorkLog({
          ...workLogFormData,
          task_id: id,
        });
      }

      setShowWorkLogForm(false);
      setEditingWorkLog(null);
      setWorkLogFormData({
        work_date: new Date().toISOString().split('T')[0],
        hours: 1,
        description: '',
        is_billable: false,
        work_type: WorkLogType.REGULAR,
      });
      await loadWorkLogs();
      await loadTask(); // Refresh task to get updated actual_hours
    } catch (error: any) {
      console.error('Failed to save work log:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać wpisu czasu');
    } finally {
      setIsSavingWorkLog(false);
    }
  };

  const handleEditWorkLog = (log: WorkLog) => {
    setEditingWorkLog(log);
    setWorkLogFormData({
      work_date: log.work_date.split('T')[0],
      hours: log.hours,
      description: log.description || '',
      is_billable: log.is_billable,
      work_type: log.work_type || WorkLogType.REGULAR,
    });
    setShowWorkLogForm(true);
  };

  const handleConfirmDeleteWorkLog = async () => {
    if (!deleteWorkLogId) return;

    try {
      await workLogApi.deleteWorkLog(deleteWorkLogId);
      await loadWorkLogs();
      await loadTask();
    } catch (error: any) {
      console.error('Failed to delete work log:', error);
      setError(error.response?.data?.message || t('tasks.deleteWorkLogError'));
    } finally {
      setDeleteWorkLogId(null);
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
      if (isEdit && id) {
        await taskApi.updateTask(id, formData);
      } else {
        await taskApi.createTask(formData as CreateTaskRequest);
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
      [name]: name === 'estimated_hours' || name === 'actual_hours'
        ? (value ? parseFloat(value) : undefined)
        : value || undefined,
    }));
  };

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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}>
      {/* Header - Compact */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/tasks')}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {isEdit ? (task?.title || 'Edytuj zadanie') : 'Nowe zadanie'}
            </h1>
            {isEdit && task && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full shrink-0">
                {task.project?.code || 'Zadanie'}
              </span>
            )}
          </div>
          {isEdit && task?.project && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <FolderOpen className="w-3 h-3" />
              {task.project.name}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <p className="text-xs text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info Card */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Informacje podstawowe</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Task Title */}
              <div>
                <label htmlFor="title" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tytuł zadania *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="np. Implementacja modułu logowania"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opis zadania
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Opisz szczegóły zadania..."
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Project */}
                <div>
                  <label htmlFor="project_id" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Projekt *
                  </label>
                  <select
                    id="project_id"
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    required
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Wybierz projekt</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label htmlFor="assigned_to" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Przypisana osoba
                  </label>
                  <select
                    id="assigned_to"
                    name="assigned_to"
                    value={formData.assigned_to || ''}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Nieprzypisane</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priorytet
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                    <label htmlFor="status" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                  <label htmlFor="due_date" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Termin
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <label htmlFor="estimated_hours" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="8"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {isEdit ? 'Zapisz zmiany' : 'Utwórz zadanie'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Attachments Section - only in edit mode */}
          {isEdit && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Załączniki
                  {attachments.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                      {attachments.length}
                    </span>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
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

              <div className="p-3">
                {/* Upload area - compact */}
                <div
                  className={`border border-dashed rounded-lg p-3 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {isUploadingFiles ? (
                    <div className="space-y-2">
                      <Loader2 className="w-5 h-5 mx-auto animate-spin text-gray-400" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">Przesyłanie...</p>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 max-w-[120px] mx-auto">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Upload className="w-4 h-4" />
                      <span>Przeciągnij pliki lub kliknij "Dodaj"</span>
                    </div>
                  )}
                </div>

                {/* Attachments list - compact */}
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.file_type);
                      const isImage = attachment.file_type.startsWith('image/');

                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
          <div className="space-y-3">
            {/* Status Card with dropdown */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status</h3>
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
                      <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-90 transition-opacity cursor-pointer text-sm`}>
                        <div className="flex items-center gap-1.5">
                          {isChangingStatus ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <StatusIcon className="w-3.5 h-3.5" />
                          )}
                          <span className="font-medium">{statusConfig.label}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    );
                  })()}
                </button>

                {/* Status Dropdown */}
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
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
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Priorytet</h3>
              {(() => {
                const priorityConfig = getPriorityConfig(task.priority);
                return (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${priorityConfig.bgColor} text-sm`}>
                    <div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`} />
                    <span className={`font-medium ${priorityConfig.color}`}>{priorityConfig.label}</span>
                  </div>
                );
              })()}
            </div>

            {/* Details Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Szczegóły</h3>

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

              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-2">
                  {task.assignee.avatar_url ? (
                    <img
                      src={getFileUrl(task.assignee.avatar_url) || ''}
                      alt=""
                      className="w-5 h-5 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-medium text-gray-600 shrink-0">
                      {getInitials(task.assignee.first_name, task.assignee.last_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Przypisano</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {task.assignee.first_name} {task.assignee.last_name}
                    </p>
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

            {/* Work Logs Card - Compact */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-blue-200 dark:border-gray-700 shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  Czas pracy
                </h3>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {workLogs.reduce((sum, log) => sum + Number(log.hours), 0).toFixed(1)}h
                </span>
              </div>

              {/* Quick add buttons */}
              <div className="flex gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setWorkLogFormData({ ...workLogFormData, work_date: today });
                    setShowWorkLogForm(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Plus className="w-3 h-3" />
                  Dzisiaj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setWorkLogFormData({ ...workLogFormData, work_date: yesterday.toISOString().split('T')[0] });
                    setShowWorkLogForm(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Plus className="w-3 h-3" />
                  Wczoraj
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowWorkLogForm(true)}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Timer className="w-3.5 h-3.5" />
                Raportuj czas
              </button>

              {/* Recent logs - compact list */}
              {workLogs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-gray-600 space-y-1 max-h-32 overflow-y-auto">
                  {workLogs.slice(0, 5).map((log) => {
                    const dateObj = new Date(log.work_date);
                    const isToday = log.work_date.split('T')[0] === new Date().toISOString().split('T')[0];
                    const isYesterday = log.work_date.split('T')[0] === new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    const dayLabel = isToday ? 'Dziś' : isYesterday ? 'Wcz.' : dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between px-2 py-1 rounded bg-white/60 dark:bg-gray-700/50 group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 w-10 shrink-0">{dayLabel}</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">{log.hours}h</span>
                          {log.description && (
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{log.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEditWorkLog(log)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteWorkLogId(log.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {workLogs.length > 5 && (
                    <p className="text-[10px] text-center text-gray-500 dark:text-gray-400">+{workLogs.length - 5} więcej wpisów</p>
                  )}
                </div>
              )}
            </div>

            {/* Delete Card */}
            {isAdmin && (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-800 dark:to-gray-800/80 rounded-xl border border-red-200 dark:border-gray-700 shadow-sm p-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Strefa niebezpieczeństwa</h3>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
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

      {/* Work Log Modal */}
      {showWorkLogForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Timer className="w-5 h-5 text-blue-600" />
                {editingWorkLog ? 'Edytuj wpis czasu' : 'Raportuj czas'}
              </h3>
              <button
                onClick={() => {
                  setShowWorkLogForm(false);
                  setEditingWorkLog(null);
                  setWorkLogFormData({
                    work_date: new Date().toISOString().split('T')[0],
                    hours: 1,
                    description: '',
                    is_billable: false,
                    work_type: WorkLogType.REGULAR,
                  });
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveWorkLog} className="p-4 space-y-4">
              {/* Time and Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Czas *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      value={workLogFormData.hours}
                      onChange={(e) => setWorkLogFormData({ ...workLogFormData, hours: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="1"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">h</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={workLogFormData.work_date}
                    onChange={(e) => setWorkLogFormData({ ...workLogFormData, work_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Type dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Typ *
                </label>
                <select
                  value={workLogFormData.work_type}
                  onChange={(e) => setWorkLogFormData({ ...workLogFormData, work_type: e.target.value as WorkLogType })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  required
                >
                  {Object.entries(WorkLogTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opis pracy
                </label>
                <textarea
                  value={workLogFormData.description}
                  onChange={(e) => setWorkLogFormData({ ...workLogFormData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Co zostało zrobione..."
                />
              </div>

              {/* Billable checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="work_log_billable_modal"
                  checked={workLogFormData.is_billable}
                  onChange={(e) => setWorkLogFormData({ ...workLogFormData, is_billable: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="work_log_billable_modal" className="text-sm text-gray-700 dark:text-gray-300">
                  Godziny rozliczeniowe (fakturowane)
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkLogForm(false);
                    setEditingWorkLog(null);
                    setWorkLogFormData({
                      work_date: new Date().toISOString().split('T')[0],
                      hours: 1,
                      description: '',
                      is_billable: false,
                      work_type: WorkLogType.REGULAR,
                    });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSavingWorkLog}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingWorkLog ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {editingWorkLog ? 'Zapisz zmiany' : 'Dodaj wpis'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Work Log Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteWorkLogId !== null}
        onClose={() => setDeleteWorkLogId(null)}
        onConfirm={handleConfirmDeleteWorkLog}
        title={t('tasks.deleteWorkLogTitle')}
        message={t('tasks.deleteWorkLogConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        icon="delete"
      />
    </MainLayout>
  );
};

export default TaskForm;
