import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Home, MoreHorizontal, Umbrella, XCircle, Heart, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as timeApi from '../api/time.api';
import type { LeaveRequest } from '../types/time.types';

type LeaveType = 'vacation' | 'sick_leave' | 'remote_work' | 'other';

const leaveTypeConfig: Record<LeaveType, { label: string; icon: React.ReactNode; color: string }> = {
  vacation: {
    label: 'Urlop wypoczynkowy',
    icon: <Umbrella className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  },
  sick_leave: {
    label: 'L4 / Zwolnienie lekarskie',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-red-600 bg-red-50 dark:bg-red-900/30',
  },
  remote_work: {
    label: 'Praca zdalna',
    icon: <Home className="h-5 w-5" />,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
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

  const canReview = ['admin', 'kierownik', 'ksiegowosc', 'szef'].includes(user?.role || '');
  const canCancel = request?.status === 'pending' && request.user_id === user?.id;

  useEffect(() => {
    loadRequest();
  }, [id]);

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

  const typeConfig = request
    ? leaveTypeConfig[request.leave_type as LeaveType] || leaveTypeConfig.other
    : leaveTypeConfig.other;
  const statusConfig = request ? getStatusConfig(request.status) : getStatusConfig('cancelled');

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

              {request.status === 'pending' && (canReview || canCancel) && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Akcje
                  </h3>
                  <div className="space-y-2">
                    {canReview && (
                      <>
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={isReviewing}
                          className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                          Zatwierdź
                        </button>
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={isReviewing}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                          Odrzuć
                        </button>
                      </>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isReviewing}
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300"
                      >
                        Anuluj wniosek
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(request.status === 'approved' || request.status === 'rejected') && canReview && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Akcje
                  </h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleRevert}
                      disabled={isReviewing}
                      className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                    >
                      Cofnij do oczekujących
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminCancel}
                      disabled={isReviewing}
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300"
                    >
                      Anuluj wniosek
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AbsenceDetail;
