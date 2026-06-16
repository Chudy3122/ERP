import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MoreHorizontal,
  Umbrella,
  XCircle,
  Heart,
  User,
  MessageSquare,
  Send,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as timeApi from '../api/time.api';
import type { LeaveComment } from '../api/time.api';
import type { LeaveRequest } from '../types/time.types';
import { getFileUrl } from '../api/axios-config';

type LeaveType =
  | 'vacation' | 'personal' | 'sick_leave' | 'unpaid' | 'parental'
  | 'maternity' | 'paternity' | 'childcare_188' | 'care' | 'occasional'
  | 'remote_work' | 'holiday_saturday' | 'other';

const leaveTypeConfig: Record<LeaveType, { label: string; icon: React.ReactNode; color: string }> = {
  vacation: {
    label: 'Urlop wypoczynkowy',
    icon: <Umbrella className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  },
  personal: {
    label: 'Urlop na żądanie',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  },
  sick_leave: {
    label: 'L4 / Zwolnienie lekarskie',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  },
  unpaid: {
    label: 'Urlop bezpłatny',
    icon: <MoreHorizontal className="h-5 w-5" />,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
  },
  parental: {
    label: 'Urlop rodzicielski',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
  },
  maternity: {
    label: 'Urlop macierzyński',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/30',
  },
  paternity: {
    label: 'Urlop ojcowski',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
  },
  childcare_188: {
    label: 'Opieka nad dzieckiem do 14 lat',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  },
  care: {
    label: 'Urlop opiekuńczy',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/30',
  },
  occasional: {
    label: 'Urlop okolicznościowy',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  },
  remote_work: {
    label: 'Praca zdalna',
    icon: <Home className="h-5 w-5" />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  },
  holiday_saturday: {
    label: 'Dzień wolny za święto w sobotę',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  },
  other: {
    label: 'Inne',
    icon: <MoreHorizontal className="h-5 w-5" />,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
  },
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Oczekujące',
      classes: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
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
      primary: 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800 dark:border-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600',
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
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#F7941D]" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Ładowanie wniosku...</p>
          </div>
        ) : error || !request ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nie znaleziono wniosku</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Liczba dni</p>
                    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                      {request.total_days}
                    </p>
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

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Uzasadnienie</h3>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  {request.reason || 'Brak dodatkowego uzasadnienia.'}
                </p>
              </div>

              {/* Comments */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                              {c.user ? `${c.user.first_name} ${c.user.last_name}` : 'Użytkownik'}
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
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                        ? `${request.user.first_name} ${request.user.last_name}`
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
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Rozpatrzył
                  </h3>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {request.reviewer.first_name} {request.reviewer.last_name}
                  </p>
                  {request.reviewed_at && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(request.reviewed_at)}
                    </p>
                  )}
                </div>
              )}

              {request.review_notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/10">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4" />
                    Notatka do decyzji
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{request.review_notes}</p>
                </div>
              )}

              {canShowAnyActions && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
                      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
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
