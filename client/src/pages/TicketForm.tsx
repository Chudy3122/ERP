import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Save,
  Trash2,
  Send,
  User,
  Calendar,
  Clock,
  Bug,
  Lightbulb,
  HelpCircle,
  LifeBuoy,
  MoreHorizontal,
  Inbox,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  XCircle,
  Archive,
  Loader2,
  MessageSquare,
  Paperclip,
  Upload,
  FileText,
  Image,
  File,
  X,
  Download,
  ChevronDown,
  ListTodo,
  Plus,
} from 'lucide-react';
import * as ticketApi from '../api/ticket.api';
import * as projectApi from '../api/project.api';
import * as adminApi from '../api/admin.api';
import * as taskApi from '../api/task.api';
import { TaskPriority, TaskStatus } from '../types/task.types';
import {
  Ticket,
  TicketComment,
  TicketAttachment,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketType,
  TicketStatus,
  TicketPriority,
} from '../types/ticket.types';
import { Project } from '../types/project.types';
import { AdminUser } from '../types/admin.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';

const TicketForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTicketRequest & { status?: TicketStatus; assigned_to?: string }>({
    title: '',
    description: '',
    type: TicketType.SUPPORT,
    status: TicketStatus.OPEN,
    priority: TicketPriority.NORMAL,
    category: '',
    project_id: undefined,
    assigned_to: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Status dropdown and task creation
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'kierownik';
  const fieldClass =
    'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const textareaClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const labelClass =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

  useEffect(() => {
    loadProjects();
    if (isAdmin) {
      loadUsers();
    }
    if (isEdit && id) {
      loadTicket();
      loadComments();
      loadAttachments();
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
      // Tickets can only be assigned to IT department members or system admins
      const isIT = (u: typeof result[number]) => {
        const dept = (u.department || '').toLowerCase();
        return dept === 'it' || dept === 'dział it' || dept === 'dzial it' || u.role === 'admin';
      };
      setUsers(result.filter(u => u.is_active && isIT(u)));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadTicket = async () => {
    try {
      setIsLoading(true);
      const ticketData = await ticketApi.getTicketById(id!);
      setTicket(ticketData);
      setFormData({
        title: ticketData.title,
        description: ticketData.description,
        type: ticketData.type,
        status: ticketData.status,
        priority: ticketData.priority,
        category: ticketData.category || '',
        project_id: ticketData.project_id,
        assigned_to: ticketData.assigned_to,
      });
    } catch (error) {
      console.error('Failed to load ticket:', error);
      setError('Nie udało się załadować zgłoszenia');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsData = await ticketApi.getTicketComments(id!);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadAttachments = async () => {
    try {
      const attachmentsData = await ticketApi.getTicketAttachments(id!);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB max
    setPendingFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (pendingFiles.length === 0 || !id) return;

    try {
      setIsUploadingFiles(true);
      const newAttachments = await ticketApi.uploadTicketAttachments(id, pendingFiles);
      setAttachments(prev => [...newAttachments, ...prev]);
      setPendingFiles([]);
    } catch (error: any) {
      console.error('Failed to upload files:', error);
      setError(error.response?.data?.message || 'Nie udało się przesłać plików');
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;

    try {
      setIsDeletingAttachment(attachmentId);
      await ticketApi.deleteTicketAttachment(id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error: any) {
      console.error('Failed to delete attachment:', error);
    } finally {
      setIsDeletingAttachment(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
    return File;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Tytuł zgłoszenia jest wymagany');
      return;
    }

    if (!formData.description.trim()) {
      setError('Opis zgłoszenia jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      if (isEdit && id) {
        const updateData: UpdateTicketRequest = {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          status: formData.status,
          priority: formData.priority,
          category: formData.category || undefined,
          project_id: formData.project_id || undefined,
          assigned_to: formData.assigned_to || undefined,
        };
        await ticketApi.updateTicket(id, updateData);
      } else {
        const newTicket = await ticketApi.createTicket({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          category: formData.category || undefined,
          project_id: formData.project_id || undefined,
        });

        // Upload pending files if any
        if (pendingFiles.length > 0) {
          try {
            await ticketApi.uploadTicketAttachments(newTicket.id, pendingFiles);
          } catch (uploadError) {
            console.error('Failed to upload attachments:', uploadError);
          }
        }
      }
      navigate('/tickets');
    } catch (error: any) {
      console.error('Failed to save ticket:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać zgłoszenia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await ticketApi.deleteTicket(id);
      navigate('/tickets');
    } catch (error: any) {
      console.error('Failed to delete ticket:', error);
      setError(error.response?.data?.message || 'Nie udało się usunąć zgłoszenia');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !id) return;

    try {
      setIsAddingComment(true);
      await ticketApi.addTicketComment(id, newComment.trim());
      setNewComment('');
      await loadComments();
    } catch (error: any) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleQuickStatusChange = async (newStatus: TicketStatus) => {
    if (!id || !ticket) return;

    try {
      setIsChangingStatus(true);
      await ticketApi.updateTicketStatus(id, newStatus);
      setTicket({ ...ticket, status: newStatus });
      setFormData(prev => ({ ...prev, status: newStatus }));
      setShowStatusDropdown(false);
    } catch (error: any) {
      console.error('Failed to change status:', error);
      setError('Nie udało się zmienić statusu');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCreateTask = async () => {
    if (!ticket || !ticket.project_id) {
      setError('Zgłoszenie musi być przypisane do projektu, aby utworzyć zadanie');
      return;
    }

    try {
      setIsCreatingTask(true);

      // Map ticket priority to task priority
      const priorityMap: Record<TicketPriority, TaskPriority> = {
        low: TaskPriority.LOW,
        normal: TaskPriority.MEDIUM,
        high: TaskPriority.HIGH,
        urgent: TaskPriority.URGENT,
      };

      const newTask = await taskApi.createTask({
        project_id: ticket.project_id,
        title: `[${ticket.ticket_number}] ${ticket.title}`,
        description: `Zadanie utworzone ze zgłoszenia ${ticket.ticket_number}\n\n---\n\n${ticket.description}`,
        priority: priorityMap[ticket.priority],
        status: TaskStatus.TODO,
        assigned_to: ticket.assigned_to,
      });

      setShowCreateTaskModal(false);
      navigate(`/tasks/${newTask.id}/edit`);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      setError(error.response?.data?.message || 'Nie udało się utworzyć zadania');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const allStatuses: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_RESPONSE,
    TicketStatus.RESOLVED,
    TicketStatus.REJECTED,
    TicketStatus.CLOSED,
  ];

  const getStatusConfig = (status: TicketStatus) => {
    const configs: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: typeof Inbox }> = {
      open: { label: 'Nowe', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Inbox },
      in_progress: { label: 'W trakcie', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: PlayCircle },
      waiting_response: { label: 'Oczekuje odpowiedzi', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: PauseCircle },
      resolved: { label: 'Rozwiązane', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
      rejected: { label: 'Odrzucone', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
      closed: { label: 'Zamknięte', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Archive },
    };
    return configs[status];
  };

  const getTypeConfig = (type: TicketType) => {
    const configs = {
      bug: { label: 'Błąd', icon: Bug, color: 'text-red-500' },
      feature_request: { label: 'Nowa funkcja', icon: Lightbulb, color: 'text-yellow-500' },
      support: { label: 'Wsparcie', icon: LifeBuoy, color: 'text-blue-500' },
      question: { label: 'Pytanie', icon: HelpCircle, color: 'text-purple-500' },
      other: { label: 'Inne', icon: MoreHorizontal, color: 'text-gray-500' },
    };
    return configs[type];
  };

  const getPriorityConfig = (priority: TicketPriority) => {
    const configs = {
      low: { label: 'Niski', color: 'text-gray-500' },
      normal: { label: 'Normalny', color: 'text-blue-600' },
      high: { label: 'Wysoki', color: 'text-orange-600' },
      urgent: { label: 'Pilne', color: 'text-red-600' },
    };
    return configs[priority];
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie'}>
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin text-[#F7941D]" />
            <span className="text-sm font-medium">Ladowanie zgloszenia...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie'}>
      <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Header */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#F7941D] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Powrot do zgloszen"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Inbox className="h-5 w-5" />
            </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Zgloszenia</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {isEdit && ticket && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300">{ticket.ticket_number}</span>
              )}
              <h1 className="truncate text-2xl font-semibold text-gray-950 dark:text-white">
                {isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie'}
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEdit ? 'Zaktualizuj informacje o zgłoszeniu' : 'Utwórz nowe zgłoszenie problemu lub prośby'}
            </p>
          </div>
          </div>
        </div>

        {isEdit && isAdmin && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            <Trash2 className="h-4 w-4" />
            Usuń
          </button>
        )}
      </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Dane zgłoszenia</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Opisz problem, typ oraz kontekst zgłoszenia.</p>
              </div>
            </div>
            <div className="space-y-6 p-5">
              {/* Ticket Title */}
              <div>
                <label htmlFor="title" className={labelClass}>
                  Tytuł zgłoszenia *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className={fieldClass}
                  placeholder="np. Błąd przy logowaniu użytkownika"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Type */}
                <div>
                  <label htmlFor="type" className={labelClass}>
                    Typ zgłoszenia *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className={fieldClass}
                  >
                    <option value="bug">Błąd</option>
                    <option value="feature_request">Nowa funkcja</option>
                    <option value="support">Wsparcie</option>
                    <option value="question">Pytanie</option>
                    <option value="other">Inne</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="priority" className={labelClass}>
                    Priorytet
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="low">Niski</option>
                    <option value="normal">Normalny</option>
                    <option value="high">Wysoki</option>
                    <option value="urgent">Pilne</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className={labelClass}>
                    Kategoria
                  </label>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="np. Logowanie, Płatności"
                  />
                </div>

                {/* Project */}
                <div>
                  <label htmlFor="project_id" className={labelClass}>
                    Projekt (opcjonalne)
                  </label>
                  <select
                    id="project_id"
                    name="project_id"
                    value={formData.project_id || ''}
                    onChange={handleChange}
                    className={fieldClass}
                  >
                    <option value="">Brak projektu</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status (only for edit and admin) */}
              {isEdit && isAdmin && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="status" className={labelClass}>
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={fieldClass}
                    >
                      <option value="open">Nowe</option>
                      <option value="in_progress">W trakcie</option>
                      <option value="waiting_response">Oczekuje odpowiedzi</option>
                      <option value="resolved">Rozwiązane</option>
                      <option value="rejected">Odrzucone</option>
                      <option value="closed">Zamknięte</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="assigned_to" className={labelClass}>
                      Przypisane do
                    </label>
                    <select
                      id="assigned_to"
                      name="assigned_to"
                      value={formData.assigned_to || ''}
                      onChange={handleChange}
                      className={fieldClass}
                    >
                      <option value="">Nieprzypisane</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label htmlFor="description" className={labelClass}>
                  Opis zgłoszenia *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={8}
                  className={textareaClass}
                  placeholder="Opisz szczegółowo problem lub prośbę..."
                />
              </div>

              {/* Attachments for new ticket */}
              {!isEdit && (
                <div>
                  <label className={labelClass}>
                    Załączniki (opcjonalne)
                  </label>

                  {/* Pending files */}
                  {pendingFiles.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {pendingFiles.map((file, index) => {
                        const FileIcon = getFileIcon(file.type);
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30"
                          >
                            <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
                              <FileIcon className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePendingFile(index)}
                              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Upload area */}
                  <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-[#F7941D]/50 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-[#F7941D]/40 dark:hover:bg-[#F7941D]/10">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="mb-1 h-6 w-6 text-[#F7941D]" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700">Kliknij, aby dodać pliki</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Maks. 10MB na plik</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/60">
              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? 'Zapisz zmiany' : 'Utwórz zgłoszenie'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Attachments Section (only for edit) */}
          {isEdit && (
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 p-4 dark:border-gray-700">
                <h3 className="flex items-center gap-2 font-semibold text-gray-950 dark:text-white">
                  <Paperclip className="h-5 w-5 text-[#F7941D]" />
                  Załączniki ({attachments.length})
                </h3>
              </div>

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <div className="p-4 space-y-2 border-b border-gray-100 dark:border-gray-700">
                  {attachments.map((attachment) => {
                    const FileIcon = getFileIcon(attachment.file_type);
                    const isDeleting = isDeletingAttachment === attachment.id;
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group"
                      >
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <FileIcon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {attachment.original_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(Number(attachment.file_size))} • {formatDate(attachment.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={getFileUrl(attachment.file_url) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Pobierz"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            disabled={isDeleting}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Usuń"
                          >
                            {isDeleting ? (
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

              {/* Pending files */}
              {pendingFiles.length > 0 && (
                <div className="p-4 space-y-2 border-b border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pliki do przesłania:</p>
                  {pendingFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePendingFile(index)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={handleUploadFiles}
                    disabled={isUploadingFiles}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-white transition-colors hover:bg-[#e08317] disabled:opacity-50"
                  >
                    {isUploadingFiles ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Przesyłanie...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Prześlij pliki ({pendingFiles.length})
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Upload area */}
              <div className="p-4">
                <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-[#F7941D]/50 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-[#F7941D]/40 dark:hover:bg-[#F7941D]/10">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="mb-1 h-6 w-6 text-[#F7941D]" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700">Kliknij, aby dodać pliki</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Maks. 10MB na plik</p>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Comments Section (only for edit) */}
          {isEdit && (
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 p-4 dark:border-gray-700">
                <h3 className="flex items-center gap-2 font-semibold text-gray-950 dark:text-white">
                  <MessageSquare className="h-5 w-5 text-[#F7941D]" />
                  Komentarze ({comments.length})
                </h3>
              </div>

              {/* Comments list */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Brak komentarzy
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4">
                      <div className="flex gap-3">
                        {comment.user?.avatar_url ? (
                          <img
                            src={getFileUrl(comment.user.avatar_url) || ''}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600">
                            {comment.user ? getInitials(comment.user.first_name, comment.user.last_name) : '?'}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {comment.user ? `${comment.user.first_name} ${comment.user.last_name}` : 'Nieznany'}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                            {comment.is_internal && (
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                                Wewnętrzny
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Napisz komentarz..."
                      rows={2}
                      className={textareaClass}
                    />
                  </div>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#F7941D] px-4 text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAddingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {isEdit && ticket && (
          <div className="space-y-4">
            {/* Status Card with dropdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status zgłoszenia</h3>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={isChangingStatus}
                  className="w-full"
                >
                  {(() => {
                    const statusConfig = getStatusConfig(ticket.status);
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
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Zmień status na:</p>
                    </div>
                    {allStatuses.map((status) => {
                      const config = getStatusConfig(status);
                      const Icon = config.icon;
                      const isCurrentStatus = ticket.status === status;

                      return (
                        <button
                          key={status}
                          onClick={() => !isCurrentStatus && handleQuickStatusChange(status)}
                          disabled={isCurrentStatus}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            isCurrentStatus
                              ? 'bg-gray-50 dark:bg-gray-700 text-gray-400 cursor-default'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className={`p-1 rounded ${config.bgColor} ${config.color}`}>
                            <Icon className="w-3 h-3" />
                          </span>
                          {config.label}
                          {isCurrentStatus && (
                            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Aktualny</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Szybkie akcje</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  disabled={!ticket.project_id}
                className="flex w-full items-center gap-2 rounded-lg bg-[#F7941D]/10 px-3 py-2 text-left text-sm font-semibold text-[#F7941D] transition-colors hover:bg-[#F7941D]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  title={!ticket.project_id ? 'Przypisz zgłoszenie do projektu, aby utworzyć zadanie' : 'Utwórz zadanie ze zgłoszenia'}
                >
                  <ListTodo className="w-4 h-4" />
                  Utwórz zadanie
                </button>
                {!ticket.project_id && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    Przypisz zgłoszenie do projektu, aby móc utworzyć zadanie
                  </p>
                )}
              </div>
            </div>

            {/* Details Card */}
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Szczegóły</h3>

              {/* Creator */}
              {ticket.creator && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Utworzone przez</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {ticket.creator.first_name} {ticket.creator.last_name}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignee */}
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Przypisane do</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {ticket.assignee
                      ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}`
                      : 'Nieprzypisane'}
                  </div>
                </div>
              </div>

              {/* Created at */}
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Utworzono</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.created_at)}</div>
                </div>
              </div>

              {/* Updated at */}
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Ostatnia aktualizacja</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.updated_at)}</div>
                </div>
              </div>

              {/* Resolved at */}
              {ticket.resolved_at && (
                <div className="flex items-center gap-3">
                  <div className="text-green-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Rozwiązano</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.resolved_at)}</div>
                  </div>
                </div>
              )}

              {/* Closed at */}
              {ticket.closed_at && (
                <div className="flex items-center gap-3">
                  <div className="text-gray-500">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Zamknięto</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.closed_at)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Type & Priority Card */}
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Typ</div>
                {(() => {
                  const typeConfig = getTypeConfig(ticket.type);
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div className={`inline-flex items-center gap-2 ${typeConfig.color}`}>
                      <TypeIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{typeConfig.label}</span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Priorytet</div>
                <div className={`text-sm font-medium ${getPriorityConfig(ticket.priority).color}`}>
                  {getPriorityConfig(ticket.priority).label}
                </div>
              </div>

              {ticket.category && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kategoria</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.category}</div>
                </div>
              )}

              {ticket.project && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Projekt</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{ticket.project.name}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Usuń zgłoszenie</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Czy na pewno chcesz usunąć to zgłoszenie? Ta operacja jest nieodwracalna.
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Usuwanie...
                  </>
                ) : (
                  'Usuń'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && ticket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ListTodo className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Utwórz zadanie</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Utworzysz nowe zadanie na podstawie tego zgłoszenia:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{ticket.ticket_number}</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{ticket.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Projekt: <span className="text-gray-700">{ticket.project?.name || 'Nieznany'}</span>
              </p>
              {ticket.assignee && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Przypisane do: <span className="text-gray-700">{ticket.assignee.first_name} {ticket.assignee.last_name}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask}
                className="flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-white transition-colors hover:bg-[#e08317] disabled:opacity-50"
              >
                {isCreatingTask ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tworzenie...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Utwórz zadanie
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
};

export default TicketForm;
