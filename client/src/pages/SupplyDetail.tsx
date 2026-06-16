import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  Pencil,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import * as supplyApi from '../api/supply.api';
import {
  SUPPLY_CATEGORY_LABELS,
  SUPPLY_PRIORITY_LABELS,
  SupplyPriority,
  SupplyRequest,
} from '../types/supply.types';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'Oczekuje', cls: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300', icon: Clock },
  approved: { label: 'Zatwierdzone', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  rejected: { label: 'Odrzucone', cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

const PRIORITY_CLS: Record<SupplyPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  high: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300',
};

export default function SupplyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'sekretariat' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [request, setRequest] = useState<SupplyRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id, isManager]);

  const loadRequest = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const requests = isManager
        ? await supplyApi.getSupplyRequests()
        : await supplyApi.getMySupplyRequests();
      setRequest(requests.find(item => item.id === id) || null);
    } catch {
      toast.error('Nie udało się załadować zgłoszenia');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = request && (isAdmin || (request.user_id === user?.id && request.status === 'pending'));
  const canDelete = request && (isManager || (request.user_id === user?.id && request.status === 'pending'));

  const handleApprove = async () => {
    if (!request) return;

    try {
      const updated = await supplyApi.approveSupplyRequest(request.id);
      setRequest(updated);
      toast.success('Zatwierdzono');
    } catch {
      toast.error('Nie udało się zatwierdzić');
    }
  };

  const handleReject = async () => {
    if (!request) return;

    try {
      const updated = await supplyApi.rejectSupplyRequest(request.id);
      setRequest(updated);
      toast.success('Odrzucono');
    } catch {
      toast.error('Nie udało się odrzucić');
    }
  };

  const handleDelete = async () => {
    if (!request) return;

    try {
      await supplyApi.deleteSupplyRequest(request.id);
      toast.success('Usunięto');
      navigate('/supply');
    } catch {
      toast.error('Nie udało się usunąć');
    } finally {
      setDeleteOpen(false);
    }
  };

  const formatDateTime = (date: string | null) =>
    date
      ? new Date(date).toLocaleString('pl-PL', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const getUserName = (supplyRequest: SupplyRequest) =>
    supplyRequest.user ? `${supplyRequest.user.first_name} ${supplyRequest.user.last_name}` : '—';

  const getReviewerName = (supplyRequest: SupplyRequest) =>
    supplyRequest.reviewer ? `${supplyRequest.reviewer.first_name} ${supplyRequest.reviewer.last_name}` : '—';

  if (loading) {
    return (
      <MainLayout title="Szczegóły zapotrzebowania">
        <div className="flex min-h-[420px] flex-col items-center justify-center">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#F7941D]" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie zgłoszenia...</p>
        </div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout title="Szczegóły zapotrzebowania">
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Package className="mx-auto mb-4 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h1 className="text-xl font-semibold text-gray-950 dark:text-white">Nie znaleziono zgłoszenia</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Zgłoszenie mogło zostać usunięte albo nie masz do niego dostępu.
          </p>
          <button
            type="button"
            onClick={() => navigate('/supply')}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do zaopatrzenia
          </button>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = STATUS_CFG[request.status];
  const StatusIcon = statusConfig.icon;

  return (
    <MainLayout title="Szczegóły zapotrzebowania">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <button
                type="button"
                onClick={() => navigate('/supply')}
                className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-300"
                aria-label="Wróć"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Zgłoszenie zapotrzebowania</p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{request.item_name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.cls}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                  </span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_CLS[request.priority]}`}>
                    {SUPPLY_PRIORITY_LABELS[request.priority]}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isManager && request.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-gray-700 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                    Odrzuć
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" />
                    Zatwierdź
                  </button>
                </>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate('/supply', { state: { editSupplyId: request.id } })}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                >
                  <Pencil className="h-4 w-4" />
                  Edytuj
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-gray-700 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <DetailTile label="Ilość" value={String(request.quantity)} />
          <DetailTile label="Kategoria" value={SUPPLY_CATEGORY_LABELS[request.category]} />
          <DetailTile label="Priorytet" value={SUPPLY_PRIORITY_LABELS[request.priority]} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <UserRound className="h-4 w-4 text-[#F7941D]" />
              Zgłaszający
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{getUserName(request)}</p>
            {request.user?.email && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{request.user.email}</p>}
            {request.user?.department && (
              <p className="mt-3 inline-flex rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600">
                {request.user.department}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <CalendarDays className="h-4 w-4 text-[#F7941D]" />
              Daty
            </div>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Utworzono" value={formatDateTime(request.created_at)} />
              <InfoRow label="Aktualizacja" value={formatDateTime(request.updated_at)} />
              {request.reviewed_at && <InfoRow label="Rozpatrzono" value={formatDateTime(request.reviewed_at)} />}
            </dl>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Opis / uzasadnienie</h2>
          <p className="mt-3 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm leading-6 text-gray-600 dark:text-gray-300">
            {request.description || 'Brak dodatkowego opisu.'}
          </p>
        </section>

        {(request.reviewer || request.review_notes) && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Decyzja</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <InfoRow label="Rozpatrujący" value={getReviewerName(request)} />
              {request.review_notes && (
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">Notatka</dt>
                  <dd className="mt-1 whitespace-pre-line text-gray-700 dark:text-gray-300">{request.review_notes}</dd>
                </div>
              )}
            </dl>
          </section>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Usuń zgłoszenie"
        message="Czy na pewno chcesz usunąć to zgłoszenie zapotrzebowania?"
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
      />
    </MainLayout>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{value}</dd>
    </div>
  );
}
