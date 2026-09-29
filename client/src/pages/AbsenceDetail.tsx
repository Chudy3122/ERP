import { formatUserName } from '../utils/userSorting';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MoreHorizontal,
  Plane,
  XCircle,
  Heart,
  User,
  MessageSquare,
  Send,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UsersRound,
  Stethoscope,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as timeApi from '../api/time.api';
import type { LeaveComment } from '../api/time.api';
import type { LeaveRequest, LeaveType as ApiLeaveType } from '../types/time.types';
import { getFileUrl } from '../api/axios-config';

type LeaveType =
  | 'vacation' | 'personal' | 'sick_leave' | 'unpaid' | 'parental'
  | 'maternity' | 'paternity' | 'childcare_188' | 'care' | 'occasional' | 'occasional_hourly'
  | 'remote_work' | 'holiday_saturday' | 'other';

type EditLeaveForm = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  one_day: boolean;
};

const BLUE_LEAVE_COLOR = 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300';
const RED_LEAVE_COLOR = 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300';
const GRAY_LEAVE_COLOR = 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
const PINK_LEAVE_COLOR = 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300';
const PURPLE_LEAVE_COLOR = 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300';
const YELLOW_LEAVE_COLOR = 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-300';
const ORANGE_LEAVE_COLOR = 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300';
const GREEN_LEAVE_COLOR = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300';

const leaveTypeConfig: Record<LeaveType, { label: string; icon: React.ReactNode; color: string }> = {
  vacation: {
    label: 'Urlop wypoczynkowy',
    icon: <Plane className="h-5 w-5" />,
    color: BLUE_LEAVE_COLOR,
  },
  personal: {
    label: 'Urlop na żądanie',
    icon: <Calendar className="h-5 w-5" />,
    color: BLUE_LEAVE_COLOR,
  },
  sick_leave: {
    label: 'L4',
    icon: <Stethoscope className="h-5 w-5" />,
    color: RED_LEAVE_COLOR,
  },
  unpaid: {
    label: 'Urlop bezpłatny',
    icon: <MoreHorizontal className="h-5 w-5" />,
    color: GRAY_LEAVE_COLOR,
  },
  parental: {
    label: 'Urlop rodzicielski',
    icon: <Heart className="h-5 w-5" />,
    color: PINK_LEAVE_COLOR,
  },
  maternity: {
    label: 'Urlop macierzyński',
    icon: <Heart className="h-5 w-5" />,
    color: PINK_LEAVE_COLOR,
  },
  paternity: {
    label: 'Urlop ojcowski',
    icon: <Heart className="h-5 w-5" />,
    color: PINK_LEAVE_COLOR,
  },
  childcare_188: {
    label: 'Opieka nad dzieckiem do 14 lat',
    icon: <UsersRound className="h-5 w-5" />,
    color: YELLOW_LEAVE_COLOR,
  },
  care: {
    label: 'Urlop opiekuńczy',
    icon: <Heart className="h-5 w-5" />,
    color: PINK_LEAVE_COLOR,
  },
  occasional: {
    label: 'Urlop okolicznościowy',
    icon: <Calendar className="h-5 w-5" />,
    color: ORANGE_LEAVE_COLOR,
  },
  occasional_hourly: {
    label: 'Urlop okolicznościowy',
    icon: <Calendar className="h-5 w-5" />,
    color: ORANGE_LEAVE_COLOR,
  },
  remote_work: {
    label: 'Praca zdalna',
    icon: <Home className="h-5 w-5" />,
    color: PURPLE_LEAVE_COLOR,
  },
  holiday_saturday: {
    label: 'Dzień wolny za święto w sobotę',
    icon: <Calendar className="h-5 w-5" />,
    color: GREEN_LEAVE_COLOR,
  },
  other: {
    label: 'Inne',
    icon: <MoreHorizontal className="h-5 w-5" />,
    color: GRAY_LEAVE_COLOR,
  },
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Oczekujące',
      classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      icon: <Clock className="h-4 w-4" />,
    },
    approved: {
      label: 'Zatwierdzone',
      classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    rejected: {
      label: 'Odrzucone',
      classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      icon: <XCircle className="h-4 w-4" />,
    },
    cancelled: {
      label: 'Anulowane',
      classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      icon: <XCircle className="h-4 w-4" />,
    },
  };

  return configs[status] || configs.cancelled;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const formatDaysLabel = (days: number | string) => {
  const numericDays = Number(days);
  const formattedDays = Number.isInteger(numericDays)
    ? numericDays.toString()
    : numericDays.toLocaleString('pl-PL');

  return numericDays === 1 ? `${formattedDays} dzień` : `${formattedDays} dni`;
};

const getDateInputValue = (value: string | Date) => {
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || '';
};

const createEditForm = (request: LeaveRequest): EditLeaveForm => ({
  leave_type: request.leave_type as LeaveType,
  start_date: getDateInputValue(request.start_date),
  end_date: getDateInputValue(request.end_date),
  start_time: request.start_time || '',
  end_time: request.end_time || '',
  reason: request.reason || '',
  one_day: getDateInputValue(request.start_date) === getDateInputValue(request.end_date),
});

const AbsenceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [comments, setComments] = useState<LeaveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const canReview = ['admin', 'kierownik', 'kadry', 'szef'].includes(user?.role || '');
  const canCancel = request?.status === 'pending' && request.user_id === user?.id;
  const canComment = canReview || request?.user_id === user?.id;
  const isAdmin = user?.role === 'admin';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditLeaveForm | null>(null);

  useEffect(() => {
    loadRequest();
    loadComments();
  }, [id]);

  const loadComments = async () => {
    if (!id) return;
    try {
      const data = await timeApi.getLeaveComments(id);
      setComments(data);
    } catch {
      // brak komentarzy / brak uprawnień — nie blokuje widoku
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    try {
      setIsPostingComment(true);
      const comment = await timeApi.addLeaveComment(id, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się dodać komentarza');
    } finally {
      setIsPostingComment(false);
    }
  };

  const loadRequest = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError('');

      const ownRequests = await timeApi.getUserLeaveRequests();
      let allRequests = ownRequests;

      if (canReview) {
        try {
          // Manageable = pending + approved + rejected (within reviewer's scope)
          const manageable = await timeApi.getManageableLeaveRequests();
          allRequests = [...ownRequests, ...manageable];
        } catch {
          // Brak uprawnień albo brak listy nie blokuje własnego podglądu.
        }
      }

      const foundRequest = allRequests.find(item => item.id === id);

      if (!foundRequest) {
        setError('Nie udało się znaleźć tego wniosku urlopowego.');
        setRequest(null);
        return;
      }

      setRequest(foundRequest);
    } catch {
      setError('Nie udało się załadować szczegółów wniosku.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    try {
      setIsReviewing(true);
      const updatedRequest = await timeApi.approveLeaveRequest(request.id);
      setRequest(updatedRequest);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    try {
      setIsReviewing(true);
      const updatedRequest = await timeApi.rejectLeaveRequest(request.id);
      setRequest(updatedRequest);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    try {
      setIsReviewing(true);
      const updatedRequest = await timeApi.cancelLeaveRequest(request.id);
      setRequest(updatedRequest);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRevert = async () => {
    if (!request) return;
    try {
      setIsReviewing(true);
      const updatedRequest = await timeApi.revertLeaveRequest(request.id);
      setRequest(updatedRequest);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAdminCancel = async () => {
    if (!request) return;
    try {
      setIsReviewing(true);
      const updatedRequest = await timeApi.adminCancelLeaveRequest(request.id);
      setRequest(updatedRequest);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;
    try {
      setIsReviewing(true);
      await timeApi.deleteLeaveRequest(request.id);
      navigate('/absences');
    } catch {
      setIsReviewing(false);
      setDeleteOpen(false);
    }
  };

  const openEdit = () => {
    if (!request || !isAdmin) return;
    setEditForm(createEditForm(request));
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (isSavingEdit) return;
    setEditOpen(false);
    setEditForm(null);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!request || !editForm || !isAdmin) return;

    const isHourly = editForm.leave_type === 'occasional_hourly';
    if (!editForm.start_date || (!isHourly && !editForm.end_date)) {
      toast.error('Podaj termin nieobecności');
      return;
    }
    if (!isHourly && editForm.end_date < editForm.start_date) {
      toast.error('Data końcowa nie może być wcześniejsza niż początkowa');
      return;
    }
    if (isHourly && (!editForm.start_time || !editForm.end_time || editForm.end_time <= editForm.start_time)) {
      toast.error('Podaj prawidłowe godziny od i do');
      return;
    }

    try {
      setIsSavingEdit(true);
      const updatedRequest = await timeApi.updateLeaveRequest(request.id, {
        leaveType: editForm.leave_type as ApiLeaveType,
        startDate: editForm.start_date,
        endDate: isHourly || editForm.one_day ? editForm.start_date : editForm.end_date,
        reason: editForm.reason.trim() || undefined,
        ...(isHourly
          ? { startTime: editForm.start_time, endTime: editForm.end_time }
          : {}),
      });
      setRequest(updatedRequest);
      setEditOpen(false);
      setEditForm(null);
      toast.success('Wniosek został zaktualizowany');
    } catch (editError: unknown) {
      const message = (editError as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      toast.error(message || 'Nie udało się zaktualizować wniosku');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const typeConfig = request
    ? leaveTypeConfig[request.leave_type as LeaveType] || leaveTypeConfig.other
    : leaveTypeConfig.other;
  const statusConfig = request ? getStatusConfig(request.status) : getStatusConfig('cancelled');
  const isPending = request?.status === 'pending';
  const isReviewed = request?.status === 'approved' || request?.status === 'rejected';
  const canShowManagerActions = Boolean(request && canReview && (isPending || isReviewed));
  const canShowUserCancel = Boolean(request && canCancel);
  const canShowAnyActions = canShowManagerActions || canShowUserCancel || isAdmin;

  const ActionButton = ({
    icon,
    title,
    description,
    onClick,
    disabled,
    variant = 'neutral',
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'neutral' | 'warning' | 'danger';
  }) => {
    const variantClasses = {
      primary: 'border-[#F7941D] bg-[#F7941D] text-white hover:bg-[#e08317]',
      neutral: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
      warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
      danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300',
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]}`}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-current dark:bg-white/10">
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className={`mt-0.5 block text-xs ${variant === 'primary' ? 'text-white/75' : 'text-current opacity-70'}`}>
            {description}
          </span>
        </span>
      </button>
    );
  };

  return (
    <MainLayout title="Szczegóły nieobecności">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
          <div className="flex flex-wrap items-start gap-4">
            <button
              onClick={() => navigate('/absences')}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-300"
              aria-label="Wróć do nieobecności"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                Szczegóły wniosku
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Wniosek o nieobecność
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Podgląd statusu, terminu oraz danych osoby składającej wniosek.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#F7941D]" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Ładowanie wniosku...</p>
          </div>
        ) : error || !request ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nie znaleziono wniosku</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${typeConfig.color}`}>
                      {typeConfig.icon}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {typeConfig.label}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.classes}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#F7941D]/25 bg-[#F7941D]/10 p-4 dark:border-[#F7941D]/30 dark:bg-[#F7941D]/15 sm:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#C96F00] dark:text-[#F8B15F]">
                          Dni objęte wnioskiem
                        </p>
                        <p className="mt-2 text-3xl font-bold leading-none text-[#F7941D]">
                          {formatDaysLabel(request.total_days)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/75 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm dark:bg-gray-900/30 dark:text-gray-200">
                        <Calendar className="mb-1 h-4 w-4 text-[#F7941D]" />
                        {formatDate(request.start_date)} - {formatDate(request.end_date)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Złożono</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ostatnia zmiana</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDate(request.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Uzasadnienie</h3>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {request.reason || 'Brak dodatkowego uzasadnienia.'}
                </p>
              </div>

              {/* Comments */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <MessageSquare className="h-4 w-4 text-[#F7941D]" />
                  Komentarze {comments.length > 0 && <span className="text-sm font-normal text-gray-400">({comments.length})</span>}
                </h3>

                <div className="mt-4 space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">Brak komentarzy.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F7941D]/10 text-xs font-bold text-[#F7941D]">
                          {c.user?.avatar_url
                            ? <img src={getFileUrl(c.user.avatar_url) || ''} alt="" className="h-full w-full object-cover" />
                            : `${c.user?.first_name?.[0] ?? ''}${c.user?.last_name?.[0] ?? ''}`}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {c.user ? formatUserName(c.user) : 'Użytkownik'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(c.created_at).toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canComment && (
                  <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                      placeholder="Napisz komentarz..."
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={isPostingComment || !newComment.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e08317] disabled:opacity-60"
                    >
                      {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Pracownik
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {request.user
                        ? formatUserName(request.user)
                        : 'Brak danych pracownika'}
                    </p>
                    {request.user?.email && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {request.user.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {request.reviewer && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Rozpatrzył
                  </h3>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatUserName(request.reviewer)}
                  </p>
                  {request.reviewed_at && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(request.reviewed_at)}
                    </p>
                  )}
                </div>
              )}

              {request.review_notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm shadow-amber-100/60 dark:border-amber-900/40 dark:bg-amber-900/10 dark:shadow-black/20">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4" />
                    Notatka do decyzji
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{request.review_notes}</p>
                </div>
              )}

              {canShowAnyActions && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-200/60 dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/20">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Akcje wniosku
                      </h3>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Dostępne operacje zależą od statusu i uprawnień.
                      </p>
                    </div>
                    {isReviewing && <Loader2 className="h-4 w-4 animate-spin text-[#F7941D]" />}
                  </div>

                  <div className="space-y-2">
                    {canReview && isPending && (
                      <>
                        <ActionButton
                          icon={<CheckCircle2 className="h-4 w-4" />}
                          title="Zatwierdź wniosek"
                          description="Potwierdza nieobecność i aktualizuje status."
                          onClick={handleApprove}
                          disabled={isReviewing}
                          variant="primary"
                        />
                        <ActionButton
                          icon={<XCircle className="h-4 w-4" />}
                          title="Odrzuć wniosek"
                          description="Oznacza wniosek jako odrzucony."
                          onClick={handleReject}
                          disabled={isReviewing}
                          variant="neutral"
                        />
                      </>
                    )}

                    {canReview && isReviewed && (
                      <>
                        <ActionButton
                          icon={<RotateCcw className="h-4 w-4" />}
                          title="Cofnij do oczekujących"
                          description="Przywraca wniosek do ponownego rozpatrzenia."
                          onClick={handleRevert}
                          disabled={isReviewing}
                          variant="warning"
                        />
                        <ActionButton
                          icon={<XCircle className="h-4 w-4" />}
                          title="Anuluj wniosek"
                          description="Zamyka wniosek bez usuwania historii."
                          onClick={handleAdminCancel}
                          disabled={isReviewing}
                          variant="danger"
                        />
                      </>
                    )}

                    {canShowUserCancel && (
                      <ActionButton
                        icon={<XCircle className="h-4 w-4" />}
                        title="Anuluj własny wniosek"
                        description="Dostępne tylko przed rozpatrzeniem."
                        onClick={handleCancel}
                        disabled={isReviewing}
                        variant="danger"
                      />
                    )}

                    {isAdmin && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                        <ActionButton
                          icon={<Pencil className="h-4 w-4" />}
                          title="Edytuj wniosek"
                          description="Zmień rodzaj, termin lub uzasadnienie wniosku."
                          onClick={openEdit}
                          disabled={isReviewing}
                          variant="neutral"
                        />
                        <ActionButton
                          icon={<Trash2 className="h-4 w-4" />}
                          title="Usuń trwale"
                          description="Operacja administracyjna, bez możliwości cofnięcia."
                          onClick={() => setDeleteOpen(true)}
                          disabled={isReviewing}
                          variant="danger"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editOpen && editForm && request && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={closeEdit}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-leave-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-gray-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                  Edycja administracyjna
                </p>
                <h2 id="edit-leave-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  Edytuj wniosek
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Status wniosku i dane jego rozpatrzenia pozostaną bez zmian.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSavingEdit}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-white"
                aria-label="Zamknij edycję"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Typ nieobecności
                </label>
                <select
                  value={editForm.leave_type}
                  onChange={event => setEditForm(current => current && ({
                    ...current,
                    leave_type: event.target.value as LeaveType,
                  }))}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                >
                  {(Object.keys(leaveTypeConfig) as LeaveType[])
                    .filter(type => type !== 'occasional_hourly' || editForm.leave_type === 'occasional_hourly')
                    .map(type => (
                      <option key={type} value={type}>
                        {leaveTypeConfig[type].label}
                      </option>
                    ))}
                </select>
              </div>

              {editForm.leave_type === 'occasional_hourly' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Dzień
                    </label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={event => setEditForm(current => current && ({ ...current, start_date: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Od</label>
                    <input
                      type="time"
                      value={editForm.start_time}
                      onChange={event => setEditForm(current => current && ({ ...current, start_time: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Do</label>
                    <input
                      type="time"
                      value={editForm.end_time}
                      onChange={event => setEditForm(current => current && ({ ...current, end_time: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.one_day}
                      onChange={event => setEditForm(current => current && ({
                        ...current,
                        one_day: event.target.checked,
                        end_date: event.target.checked ? current.start_date : current.end_date,
                      }))}
                      className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D] dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Nieobecność 1-dniowa</span>
                  </label>

                  <div className={`grid grid-cols-1 gap-4 ${editForm.one_day ? '' : 'sm:grid-cols-2'}`}>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {editForm.one_day ? 'Data nieobecności' : 'Data początkowa'}
                      </label>
                      <input
                        type="date"
                        value={editForm.start_date}
                        max={!editForm.one_day && editForm.end_date ? editForm.end_date : undefined}
                        onChange={event => setEditForm(current => current && ({
                          ...current,
                          start_date: event.target.value,
                          end_date: current.one_day ? event.target.value : current.end_date,
                        }))}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                        required
                      />
                    </div>
                    {!editForm.one_day && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Data końcowa
                        </label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          min={editForm.start_date || undefined}
                          onChange={event => setEditForm(current => current && ({ ...current, end_date: event.target.value }))}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Powód (opcjonalnie)
                </label>
                <textarea
                  value={editForm.reason}
                  onChange={event => setEditForm(current => current && ({ ...current, reason: event.target.value }))}
                  rows={4}
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Wpisz powód nieobecności"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 dark:border-gray-700 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={isSavingEdit}
                  className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Usuń wniosek"
        message="Czy na pewno chcesz trwale usunąć ten wniosek? Tej operacji nie można cofnąć."
        confirmText="Usuń trwale"
        cancelText="Anuluj"
        variant="danger"
        icon="warning"
      />
    </MainLayout>
  );
};

export default AbsenceDetail;
