import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  CalendarDays,
  Eye,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as supplyApi from '../api/supply.api';
import {
  CreateSupplyRequest,
  SupplyCategory,
  SupplyPriority,
  SupplyRequest,
  SUPPLY_CATEGORY_LABELS,
  SUPPLY_PRIORITY_LABELS,
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

const PAGE_SIZE_OPTIONS = [10, 30, 50];
type SupplyTab = 'all' | 'pending' | 'resolved' | 'mine';

const EMPTY: CreateSupplyRequest = {
  item_name: '',
  quantity: 1,
  category: 'office',
  priority: 'medium',
  description: '',
};

export default function Supply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isManager = user?.role === 'sekretariat' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SupplyTab>(isManager ? 'pending' : 'mine');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSupplyRequest>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    load();
  }, [tab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, tab]);

  useEffect(() => {
    const editSupplyId = (location.state as { editSupplyId?: string } | null)?.editSupplyId;
    if (!editSupplyId || requests.length === 0) return;

    const request = requests.find(item => item.id === editSupplyId);
    if (request && canEdit(request)) {
      openEdit(request);
      navigate('/supply', { replace: true, state: null });
    }
  }, [location.state, requests]);

  const load = async () => {
    try {
      setLoading(true);
      if (isManager && tab !== 'mine') {
        const data = await supplyApi.getSupplyRequests(tab === 'pending' ? 'pending' : undefined);
        setRequests(data);
      } else {
        const data = await supplyApi.getMySupplyRequests();
        setRequests(data);
      }
    } catch {
      toast.error('Nie udało się załadować zgłoszeń');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;

    try {
      setSaving(true);
      if (editId) {
        await supplyApi.updateSupplyRequest(editId, form);
        toast.success('Zgłoszenie zaktualizowane');
      } else {
        await supplyApi.createSupplyRequest(form);
        toast.success('Zgłoszenie wysłane');
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Błąd zapisu zgłoszenia');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (request: SupplyRequest) => {
    setEditId(request.id);
    setForm({
      item_name: request.item_name,
      quantity: request.quantity,
      category: request.category,
      priority: request.priority,
      description: request.description || '',
    });
    setShowForm(true);
  };

  // Owner can edit their own PENDING request; admin can edit any
  const canEdit = (request: SupplyRequest) =>
    isAdmin || (request.user_id === user?.id && request.status === 'pending');

  const handleApprove = async (id: string) => {
    try {
      const updatedRequest = await supplyApi.approveSupplyRequest(id);
      toast.success('Zatwierdzono');
      setSelectedRequest(currentRequest =>
        currentRequest?.id === id ? updatedRequest : currentRequest
      );
      load();
    } catch {
      toast.error('Nie udało się zatwierdzić');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updatedRequest = await supplyApi.rejectSupplyRequest(id);
      toast.success('Odrzucono');
      setSelectedRequest(currentRequest =>
        currentRequest?.id === id ? updatedRequest : currentRequest
      );
      load();
    } catch {
      toast.error('Nie udało się odrzucić');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await supplyApi.deleteSupplyRequest(deleteId);
      toast.success('Usunięto');
      if (selectedRequest?.id === deleteId) setSelectedRequest(null);
      load();
    } catch {
      toast.error('Nie udało się usunąć');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const tabRequests = tab === 'resolved'
      ? requests.filter((request) => request.status === 'approved' || request.status === 'rejected')
      : requests;

    const searched = !query
      ? tabRequests
      : tabRequests.filter((request) =>
          request.item_name.toLowerCase().includes(query) ||
          request.description?.toLowerCase().includes(query) ||
          SUPPLY_CATEGORY_LABELS[request.category].toLowerCase().includes(query) ||
          (request.user && `${request.user.first_name} ${request.user.last_name}`.toLowerCase().includes(query))
        );

    return [...searched].sort((first, second) => (
      new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
    ));
  }, [requests, search, tab]);

  const stats = useMemo(() => {
    const scopedRequests = tab === 'resolved'
      ? requests.filter((request) => request.status === 'approved' || request.status === 'rejected')
      : requests;

    return {
      total: scopedRequests.length,
      pending: scopedRequests.filter((request) => request.status === 'pending').length,
      approved: scopedRequests.filter((request) => request.status === 'approved').length,
      rejected: scopedRequests.filter((request) => request.status === 'rejected').length,
    };
  }, [requests, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filtered.length);
  const paginatedRequests = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
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
  const formatDateShort = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—';
  const getUserName = (request: SupplyRequest) =>
    request.user ? `${request.user.first_name} ${request.user.last_name}` : '—';
  const getReviewerName = (request: SupplyRequest) =>
    request.reviewer ? `${request.reviewer.first_name} ${request.reviewer.last_name}` : '—';

  const fieldClass =
    'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const textareaClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

  return (
    <MainLayout title="Zaopatrzenie">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <Package className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Zapotrzebowanie i zakupy</p>
                <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Zaopatrzenie</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Zgłaszaj zapotrzebowanie na artykuły, sprzęt i inne zasoby potrzebne do pracy.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
            >
              <Plus className="h-4 w-4" />
              Nowe zapotrzebowanie
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={ClipboardList} label="Wnioski w widoku" value={stats.total} tone="gray" />
          <StatCard icon={Clock} label="Do rozpatrzenia" value={stats.pending} tone="orange" />
          <StatCard icon={CheckCircle2} label="Zatwierdzone" value={stats.approved} tone="green" />
          <StatCard icon={XCircle} label="Odrzucone" value={stats.rejected} tone="red" />
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-700 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {isManager && (
                <>
                  <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')}>
                    Do rozpatrzenia
                  </TabBtn>
                  <TabBtn active={tab === 'resolved'} onClick={() => setTab('resolved')}>
                    Rozpatrzone
                  </TabBtn>
                  <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>
                    Wszystkie
                  </TabBtn>
                </>
              )}
              <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')}>
                Moje zgłoszenia
              </TabBtn>
            </div>

            <div className="relative w-full xl:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Szukaj po artykule, opisie, kategorii lub osobie..."
                className={`${fieldClass} pl-9`}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#F7941D]" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie zgłoszeń zaopatrzenia...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">Brak zgłoszeń</h3>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                {search ? 'Nie znaleziono zgłoszeń pasujących do wyszukiwania.' : 'W tym widoku nie ma jeszcze zgłoszeń zaopatrzenia.'}
              </p>
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Wyczyść wyszukiwanie
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                >
                  <Plus className="h-4 w-4" />
                  Dodaj zapotrzebowanie
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Artykuł</th>
                      <th className="px-4 py-3 text-center">Ilość</th>
                      <th className="px-4 py-3 text-left">Kategoria</th>
                      <th className="px-4 py-3 text-center">Priorytet</th>
                      {tab !== 'mine' && <th className="px-4 py-3 text-left">Zgłaszający</th>}
                      <th className="px-4 py-3 text-left">Data zgłoszenia</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedRequests.map((request) => {
                      const statusConfig = STATUS_CFG[request.status];
                      const StatusIcon = statusConfig.icon;
                      const isOwner = request.user_id === user?.id;

                      return (
                        <tr key={request.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                                <Package className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/supply/${request.id}`)}
                                  className="max-w-[360px] truncate text-left font-semibold text-gray-950 transition-colors hover:text-[#F7941D] hover:underline dark:text-white dark:hover:text-orange-300"
                                  title="Otwórz szczegóły zgłoszenia"
                                >
                                  {request.item_name}
                                </button>
                                {request.description && (
                                  <p className="mt-1 max-w-[340px] truncate text-xs text-gray-500 dark:text-gray-400">
                                    {request.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">{request.quantity}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{SUPPLY_CATEGORY_LABELS[request.category]}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_CLS[request.priority]}`}>
                              {SUPPLY_PRIORITY_LABELS[request.priority]}
                            </span>
                          </td>
                          {tab !== 'mine' && (
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                              {request.user ? (
                                <span className="inline-flex items-center gap-2">
                                  <UserRound className="h-4 w-4 text-gray-400" />
                                  {request.user.first_name} {request.user.last_name}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                              <CalendarDays className="h-4 w-4 text-gray-400" />
                              {formatDateShort(request.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.cls}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => navigate(`/supply/${request.id}`)}
                                title="Pokaż szczegóły"
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isManager && request.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(request.id)}
                                    title="Zatwierdź"
                                    className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReject(request.id)}
                                    title="Odrzuć"
                                    className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {canEdit(request) && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(request)}
                                  title={request.status === 'pending' ? 'Edytuj' : 'Edytuj (admin)'}
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {(isManager || (isOwner && request.status === 'pending')) && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteId(request.id)}
                                  title="Usuń"
                                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  Pokazano {pageStart}-{pageEnd} z {filtered.length} zgłoszeń
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>Na stronie</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-medium text-gray-700 dark:text-gray-200">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-gray-700">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                    Szczegóły zgłoszenia
                  </p>
                  <h2 className="text-xl font-semibold text-gray-950 dark:text-white">
                    {selectedRequest.item_name}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {(() => {
                      const statusConfig = STATUS_CFG[selectedRequest.status];
                      const StatusIcon = statusConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.cls}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </span>
                      );
                    })()}
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_CLS[selectedRequest.priority]}`}>
                      {SUPPLY_PRIORITY_LABELS[selectedRequest.priority]}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                aria-label="Zamknij szczegóły"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <DetailTile label="Ilość" value={String(selectedRequest.quantity)} />
                <DetailTile label="Kategoria" value={SUPPLY_CATEGORY_LABELS[selectedRequest.category]} />
                <DetailTile label="Priorytet" value={SUPPLY_PRIORITY_LABELS[selectedRequest.priority]} />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <UserRound className="h-4 w-4 text-[#F7941D]" />
                    Zgłaszający
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{getUserName(selectedRequest)}</p>
                  {selectedRequest.user?.email && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selectedRequest.user.email}</p>
                  )}
                  {selectedRequest.user?.department && (
                    <p className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                      {selectedRequest.user.department}
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <CalendarDays className="h-4 w-4 text-[#F7941D]" />
                    Daty
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500 dark:text-gray-400">Utworzono</dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{formatDateTime(selectedRequest.created_at)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500 dark:text-gray-400">Aktualizacja</dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{formatDateTime(selectedRequest.updated_at)}</dd>
                    </div>
                    {selectedRequest.reviewed_at && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-500 dark:text-gray-400">Rozpatrzono</dt>
                        <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{formatDateTime(selectedRequest.reviewed_at)}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              </div>

              <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Opis / uzasadnienie</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {selectedRequest.description || 'Brak dodatkowego opisu.'}
                </p>
              </section>

              {(selectedRequest.reviewer || selectedRequest.review_notes) && (
                <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Decyzja</h3>
                  <dl className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500 dark:text-gray-400">Rozpatrujący</dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-gray-100">{getReviewerName(selectedRequest)}</dd>
                    </div>
                    {selectedRequest.review_notes && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Notatka</dt>
                        <dd className="mt-1 whitespace-pre-line text-gray-700 dark:text-gray-300">{selectedRequest.review_notes}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/60">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Zamknij
              </button>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {isManager && selectedRequest.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedRequest.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-gray-700 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                      Odrzuć
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedRequest.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4" />
                      Zatwierdź
                    </button>
                  </>
                )}
                {canEdit(selectedRequest) && (
                  <button
                    type="button"
                    onClick={() => {
                      openEdit(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                  >
                    <Pencil className="h-4 w-4" />
                    Edytuj
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditId(null); }}>
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <Package className="h-5 w-5" />
                </div>
                <h2 className="font-semibold text-gray-950 dark:text-white">{editId ? 'Edytuj zapotrzebowanie' : 'Nowe zapotrzebowanie'}</h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="space-y-4 p-5">
                <div>
                  <label className={labelClass}>Nazwa artykułu *</label>
                  <input
                    required
                    value={form.item_name}
                    onChange={(event) => setForm({ ...form, item_name: event.target.value })}
                    className={fieldClass}
                    placeholder="np. Papier A4, toner, monitor..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Ilość</label>
                    <input
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={(event) => setForm({ ...form, quantity: parseInt(event.target.value) || 1 })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Priorytet</label>
                    <select
                      value={form.priority}
                      onChange={(event) => setForm({ ...form, priority: event.target.value as SupplyPriority })}
                      className={fieldClass}
                    >
                      {(Object.keys(SUPPLY_PRIORITY_LABELS) as SupplyPriority[]).map((priority) => (
                        <option key={priority} value={priority}>
                          {SUPPLY_PRIORITY_LABELS[priority]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Kategoria</label>
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as SupplyCategory })}
                    className={fieldClass}
                  >
                    {(Object.keys(SUPPLY_CATEGORY_LABELS) as SupplyCategory[]).map((category) => (
                      <option key={category} value={category}>
                        {SUPPLY_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Uzasadnienie / opis</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className={textareaClass}
                    placeholder="Do czego potrzebne..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/60">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editId ? 'Zapisz zmiany' : 'Wyślij zgłoszenie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
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
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tone: 'gray' | 'orange' | 'green' | 'red';
}) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    orange: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[#F7941D] text-white shadow-sm'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
