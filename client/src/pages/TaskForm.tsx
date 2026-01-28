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

const TaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleDeleteWorkLog = async (logId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis czasu?')) return;

    try {
      await workLogApi.deleteWorkLog(logId);
      await loadWorkLogs();
      await loadTask(); // Refresh task to get updated actual_hours
    } catch (error: any) {
      console.error('Failed to delete work log:', error);
      setError(error.response?.data?.message || 'Nie udało się usunąć wpisu czasu');
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
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}
          </h1>
          {isEdit && task && (
            <div className="flex items-center gap-2 mt-1">
              {task.project && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  {task.project.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Informacje podstawowe</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Task Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Tytuł zadania *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-lg"
                  placeholder="np. Implementacja modułu logowania"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Opis zadania
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Opisz szczegóły zadania..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project */}
                <div>
                  <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Projekt *
                  </label>
                  <select
                    id="project_id"
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
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
                  <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                    Przypisana osoba
                  </label>
                  <select
                    id="assigned_to"
                    name="assigned_to"
                    value={formData.assigned_to || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  >
                    <option value="">Nieprzypisane</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status (only visible when not editing - in edit mode it's in sidebar) */}
                {!isEdit && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    >
                      {allStatuses.map((status) => (
                        <option key={status} value={status}>
                          {getStatusConfig(status).label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priorytet
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  >
                    <option value="low">Niski</option>
                    <option value="medium">Średni</option>
                    <option value="high">Wysoki</option>
                    <option value="urgent">Pilne</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Termin realizacji
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
                    Szacowany czas (h)
                  </label>
                  <input
                    type="number"
                    id="estimated_hours"
                    name="estimated_hours"
                    value={formData.estimated_hours || ''}
                    onChange={handleChange}
                    step="0.5"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="np. 8"
                  />
                </div>

                {/* Actual Hours (only in edit mode) */}
                {isEdit && (
                  <div>
                    <label htmlFor="actual_hours" className="block text-sm font-medium text-gray-700 mb-1">
                      Rzeczywisty czas (h)
                    </label>
                    <input
                      type="number"
                      id="actual_hours"
                      name="actual_hours"
                      value={formData.actual_hours || ''}
                      onChange={handleChange}
                      step="0.5"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="np. 10"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-lg">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEdit ? 'Zapisz zmiany' : 'Utwórz zadanie'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Attachments Section - only in edit mode */}
          {isEdit && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Paperclip className="w-5 h-5" />
                    Załączniki
                    {attachments.length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {attachments.length}
                      </span>
                    )}
                  </h2>
                </div>
              </div>

              <div className="p-6">
                {/* Upload area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {isUploadingFiles ? (
                    <div className="space-y-3">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                      <p className="text-sm text-gray-600">Przesyłanie plików...</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 mb-1">
                        Przeciągnij i upuść pliki tutaj
                      </p>
                      <p className="text-sm text-gray-400 mb-3">lub</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                      >
                        Wybierz pliki
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                {/* Attachments list */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.file_type);
                      const isImage = attachment.file_type.startsWith('image/');

                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                        >
                          {isImage ? (
                            <img
                              src={getFileUrl(attachment.file_url) || ''}
                              alt={attachment.original_name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <FileIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {attachment.original_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(Number(attachment.file_size))}
                              {attachment.uploader && (
                                <> • {attachment.uploader.first_name} {attachment.uploader.last_name}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={getFileUrl(attachment.file_url) || ''}
                              download={attachment.original_name}
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                              title="Pobierz"
                            >
                              <Download className="w-4 h-4 text-gray-500" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="p-1.5 hover:bg-red-100 rounded transition-colors"
                              title="Usuń"
                            >
                              <X className="w-4 h-4 text-red-500" />
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

          {/* Work Logs Section - only in edit mode */}
          {isEdit && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Czas pracy
                    {workLogs.length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {workLogs.reduce((sum, log) => sum + Number(log.hours), 0).toFixed(1)}h łącznie
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Quick add buttons */}
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setWorkLogFormData({ ...workLogFormData, work_date: today });
                        setShowWorkLogForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Dodaj godziny za dzisiaj"
                    >
                      <Plus className="w-4 h-4" />
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
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Dodaj godziny za wczoraj"
                    >
                      <Plus className="w-4 h-4" />
                      Wczoraj
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWorkLogForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <Timer className="w-4 h-4" />
                      Raportuj czas
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Work Logs List - grouped by date */}
                {workLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Timer className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-1">Brak wpisów czasu pracy</p>
                    <p className="text-xs text-gray-400">Kliknij "Raportuj czas" lub użyj przycisków "Dzisiaj" / "Wczoraj"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Group logs by date */}
                    {Object.entries(
                      workLogs.reduce((groups, log) => {
                        const date = log.work_date.split('T')[0];
                        if (!groups[date]) groups[date] = [];
                        groups[date].push(log);
                        return groups;
                      }, {} as Record<string, WorkLog[]>)
                    )
                      .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
                      .map(([date, logs]) => {
                        const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
                        const dateObj = new Date(date);
                        const isToday = date === new Date().toISOString().split('T')[0];
                        const isYesterday = date === new Date(Date.now() - 86400000).toISOString().split('T')[0];
                        const dayName = isToday ? 'Dzisiaj' : isYesterday ? 'Wczoraj' : dateObj.toLocaleDateString('pl-PL', { weekday: 'long' });

                        return (
                          <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Date header */}
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900 capitalize">{dayName}</span>
                                <span className="text-sm text-gray-500">
                                  {dateObj.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-blue-600">{totalHours}h</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWorkLogFormData({ ...workLogFormData, work_date: date });
                                    setShowWorkLogForm(true);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="Dodaj kolejny wpis na ten dzień"
                                >
                                  <Plus className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                            </div>

                            {/* Entries for this date */}
                            <div className="divide-y divide-gray-100">
                              {logs.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-gray-900">{log.hours}h</span>
                                      <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                        {WorkLogTypeLabels[log.work_type] || 'Płatny'}
                                      </span>
                                    </div>
                                    {log.description && (
                                      <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                                    )}
                                    {log.user && (
                                      <p className="text-xs text-gray-400 mt-1">
                                        {log.user.first_name} {log.user.last_name}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => handleEditWorkLog(log)}
                                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                      title="Edytuj"
                                    >
                                      <Edit2 className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWorkLog(log.id)}
                                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                      title="Usuń"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              ))}
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status zadania</h3>
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
                      <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-90 transition-opacity cursor-pointer`}>
                        <div className="flex items-center gap-2">
                          {isChangingStatus ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <StatusIcon className="w-4 h-4" />
                          )}
                          <span className="font-medium">{statusConfig.label}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    );
                  })()}
                </button>

                {/* Status Dropdown */}
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500">Zmień status na:</p>
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
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            isCurrentStatus
                              ? 'bg-gray-50 text-gray-400 cursor-default'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className={`p-1 rounded ${config.bgColor} ${config.color}`}>
                            <Icon className="w-3 h-3" />
                          </span>
                          {config.label}
                          {isCurrentStatus && (
                            <span className="ml-auto text-xs text-gray-400">Aktualny</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Priority Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Priorytet</h3>
              {(() => {
                const priorityConfig = getPriorityConfig(task.priority);
                return (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${priorityConfig.bgColor}`}>
                    <div className={`w-2 h-2 rounded-full ${priorityConfig.dotColor}`} />
                    <span className={`font-medium ${priorityConfig.color}`}>{priorityConfig.label}</span>
                  </div>
                );
              })()}
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Szczegóły</h3>

              {/* Project */}
              {task.project && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Projekt</p>
                    <p className="text-sm font-medium text-gray-900">{task.project.name}</p>
                  </div>
                </div>
              )}

              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    {task.assignee.avatar_url ? (
                      <img
                        src={getFileUrl(task.assignee.avatar_url) || ''}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {getInitials(task.assignee.first_name, task.assignee.last_name)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Przypisano do</p>
                      <p className="text-sm font-medium text-gray-900">
                        {task.assignee.first_name} {task.assignee.last_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Creator */}
              {task.creator && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    {task.creator.avatar_url ? (
                      <img
                        src={getFileUrl(task.creator.avatar_url) || ''}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {getInitials(task.creator.first_name, task.creator.last_name)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Utworzył</p>
                      <p className="text-sm font-medium text-gray-900">
                        {task.creator.first_name} {task.creator.last_name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Due date */}
              {task.due_date && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Termin</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(task.due_date).toLocaleDateString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Time */}
              {(task.estimated_hours || task.actual_hours) && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Czas</p>
                    <p className="text-sm font-medium text-gray-900">
                      {task.actual_hours ? `${task.actual_hours}h` : '-'} / {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                      <span className="text-xs text-gray-500 ml-1">(rzeczywisty / szacowany)</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Created at */}
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Utworzono</p>
                  <p className="text-sm text-gray-600">
                    {new Date(task.created_at).toLocaleDateString('pl-PL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Card */}
            {isAdmin && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Strefa niebezpieczeństwa</h3>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Usuwanie...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Potwierdź usunięcie</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Czy na pewno chcesz usunąć to zadanie? Ta akcja jest nieodwracalna i usunie również wszystkie załączniki.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
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
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveWorkLog} className="p-4 space-y-4">
              {/* Time and Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">h</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={workLogFormData.work_date}
                    onChange={(e) => setWorkLogFormData({ ...workLogFormData, work_date: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Type dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ *
                </label>
                <select
                  value={workLogFormData.work_type}
                  onChange={(e) => setWorkLogFormData({ ...workLogFormData, work_type: e.target.value as WorkLogType })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opis pracy
                </label>
                <textarea
                  value={workLogFormData.description}
                  onChange={(e) => setWorkLogFormData({ ...workLogFormData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label htmlFor="work_log_billable_modal" className="text-sm text-gray-700">
                  Godziny rozliczeniowe (fakturowane)
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
    </MainLayout>
  );
};

export default TaskForm;
