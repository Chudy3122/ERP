import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as invoiceApi from '../api/invoice.api';
import { Invoice, InvoiceStatus, InvoiceKind, InvoiceStatistics } from '../types/invoice.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';
import { confirmDelete } from '../utils/confirm';

type ViewFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';
type PaymentFilter = 'all' | 'paid' | 'unpaid' | 'overdue';

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const Invoices = () => {
  const { t } = useTranslation('invoices');
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statistics, setStatistics] = useState<InvoiceStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [kindFilter, setKindFilter] = useState<'all' | InvoiceKind>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [resetPaymentInvoice, setResetPaymentInvoice] = useState<Invoice | null>(null);
  const navigate = useNavigate();

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC || user?.role === UserRole.SEKRETARIAT;

  useEffect(() => {
    loadInvoices();
    loadStatistics();
  }, [kindFilter]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const result = await invoiceApi.getInvoices({
        search: searchQuery || undefined,
        kind: kindFilter === 'all' ? undefined : kindFilter,
      });
      setInvoices(result.invoices);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await invoiceApi.getInvoiceStatistics({
        kind: kindFilter === 'all' ? undefined : kindFilter,
      });
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleSearch = () => {
    loadInvoices();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete('Czy na pewno chcesz usunąć tę fakturę?'))) return;

    try {
      await invoiceApi.deleteInvoice(id);
      setInvoices(invoices.filter((invoice) => invoice.id !== id));
      loadStatistics();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('deleteError'));
    }
    setMenuOpenId(null);
  };

  const updateInvoiceInList = (updatedInvoice: Invoice) => {
    setInvoices(prev => prev.map(invoice => invoice.id === updatedInvoice.id ? updatedInvoice : invoice));
  };

  const refreshInvoiceTotals = () => {
    loadStatistics();
  };

  const handleMarkInvoicePaid = async (invoice: Invoice) => {
    try {
      setUpdatingPaymentId(invoice.id);
      const updated = await invoiceApi.markInvoiceAsPaid(invoice.id);
      updateInvoiceInList(updated);
      refreshInvoiceTotals();
      toast.success('Faktura oznaczona jako opłacona.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się zmienić statusu płatności.');
    } finally {
      setUpdatingPaymentId(null);
      setMenuOpenId(null);
    }
  };

  const handleResetPayment = async (invoice: Invoice) => {
    try {
      setUpdatingPaymentId(invoice.id);
      const resetStatus = isOverdue(invoice.due_date, InvoiceStatus.SENT)
        ? InvoiceStatus.OVERDUE
        : InvoiceStatus.SENT;

      await invoiceApi.updateInvoiceStatus(invoice.id, resetStatus);
      const updated = await invoiceApi.markInvoiceAsPaid(invoice.id, 0);
      updateInvoiceInList(updated);
      refreshInvoiceTotals();
      toast.success('Płatność faktury została cofnięta.');
      setResetPaymentInvoice(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się cofnąć płatności.');
    } finally {
      setUpdatingPaymentId(null);
      setMenuOpenId(null);
    }
  };

  const getStatusConfig = (status: InvoiceStatus) => {
    const configs = {
      draft: {
        label: t('statusDraft'),
        color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        dot: 'bg-slate-400',
      },
      sent: {
        label: t('statusSent'),
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        dot: 'bg-blue-500',
      },
      paid: {
        label: t('statusPaid'),
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        dot: 'bg-emerald-500',
      },
      partially_paid: {
        label: t('statusPartiallyPaid'),
        color: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
        dot: 'bg-[#F7941D]',
      },
      overdue: {
        label: t('statusOverdue'),
        color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        dot: 'bg-red-500',
      },
      cancelled: {
        label: t('statusCancelled'),
        color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
        dot: 'bg-gray-400',
      },
    };
    return configs[status];
  };

  const formatCurrency = (amount: number, currency: string = 'PLN') => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string, status: InvoiceStatus) => {
    if (status === InvoiceStatus.PAID || status === InvoiceStatus.CANCELLED) return false;
    return new Date(dueDate) < new Date();
  };

  const isInvoiceFullyPaid = (invoice: Invoice) => {
    const grossTotal = Number(invoice.gross_total || 0);
    const paidAmount = Number(invoice.paid_amount || 0);
    return invoice.status === InvoiceStatus.PAID || (grossTotal > 0 && paidAmount >= grossTotal);
  };

  const isInvoicePaymentOverdue = (invoice: Invoice) =>
    invoice.status !== InvoiceStatus.CANCELLED && !isInvoiceFullyPaid(invoice) && isOverdue(invoice.due_date, invoice.status);

  const getPaymentConfig = (invoice: Invoice) => {
    const grossTotal = Number(invoice.gross_total || 0);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return {
        label: 'Anulowana',
        description: 'Bez płatności',
        icon: AlertCircle,
        className: 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
        iconClassName: 'text-gray-400',
      };
    }

    if (isInvoiceFullyPaid(invoice)) {
      return {
        label: 'Opłacona',
        description: 'Zapłacono całość',
        icon: CheckCircle2,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300',
        iconClassName: 'text-emerald-500',
      };
    }

    const overdue = isInvoicePaymentOverdue(invoice);

    return {
      label: 'Nieopłacona',
      description: overdue ? 'Po terminie płatności' : `Do zapłaty: ${formatCurrency(grossTotal, invoice.currency)}`,
      icon: overdue ? AlertCircle : Clock,
      className: overdue
        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
        : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300',
      iconClassName: overdue ? 'text-red-500' : 'text-blue-500',
    };
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesStatus =
        viewFilter === 'all' ||
        (viewFilter === 'draft' && invoice.status === InvoiceStatus.DRAFT) ||
        (viewFilter === 'sent' && invoice.status === InvoiceStatus.SENT) ||
        (viewFilter === 'paid' && invoice.status === InvoiceStatus.PAID) ||
        (viewFilter === 'overdue' && invoice.status === InvoiceStatus.OVERDUE);

      if (!matchesStatus) return false;

      if (paymentFilter === 'paid') return isInvoiceFullyPaid(invoice);
      if (paymentFilter === 'unpaid') return invoice.status !== InvoiceStatus.CANCELLED && !isInvoiceFullyPaid(invoice);
      if (paymentFilter === 'overdue') return isInvoicePaymentOverdue(invoice);

      return true;
    });
  }, [invoices, viewFilter, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredInvoices.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredInvoices.length);
  const paginatedInvoices = filteredInvoices.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const viewTabs = [
    { key: 'all', label: t('all'), count: statistics?.total_count || 0 },
    { key: 'draft', label: t('statusDraft'), count: statistics?.draft_count || 0 },
    { key: 'sent', label: t('statusSent'), count: statistics?.sent_count || 0 },
    { key: 'paid', label: t('statusPaid'), count: statistics?.paid_count || 0 },
    { key: 'overdue', label: t('statusOverdue'), count: statistics?.overdue_count || 0 },
  ];

  const paymentTabs: { key: PaymentFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Wszystkie płatności', count: invoices.length },
    { key: 'paid', label: 'Opłacone', count: invoices.filter(isInvoiceFullyPaid).length },
    {
      key: 'unpaid',
      label: 'Nieopłacone',
      count: invoices.filter(invoice => invoice.status !== InvoiceStatus.CANCELLED && !isInvoiceFullyPaid(invoice)).length,
    },
    { key: 'overdue', label: 'Po terminie', count: invoices.filter(isInvoicePaymentOverdue).length },
  ];

  const statCards = [
    {
      label: t('totalInvoices'),
      value: statistics?.total_count || 0,
      icon: FileText,
      iconClass: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
      valueClass: 'text-gray-950 dark:text-white',
    },
    {
      label: t('paid'),
      value: formatCurrency(statistics?.total_paid || 0),
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
      valueClass: 'text-emerald-600 dark:text-emerald-300',
    },
    {
      label: t('pending'),
      value: formatCurrency(statistics?.total_pending || 0),
      icon: Clock,
      iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
      valueClass: 'text-blue-600 dark:text-blue-300',
    },
    {
      label: t('overdueCount'),
      value: statistics?.overdue_count || 0,
      icon: AlertCircle,
      iconClass: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
      valueClass: 'text-red-600 dark:text-red-300',
    },
  ];

  return (
    <MainLayout title={t('title')}>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                Finanse i rozliczenia
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">{t('title')}</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
                </div>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => navigate(kindFilter === InvoiceKind.COST ? '/invoices/new?kind=cost' : kindFilter === InvoiceKind.INCOME ? '/invoices/new?kind=income' : '/invoices/new')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
              >
                <Plus className="h-4 w-4" />
                {t('newInvoice')}
              </button>
            )}
          </div>
        </section>

        {/* Income vs cost balance */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Przychody (brutto)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(statistics?.income_gross || 0)}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-900/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">Koszty (brutto)</p>
            <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(statistics?.cost_gross || 0)}</p>
          </div>
          <div className={`rounded-xl border p-4 shadow-sm ${(statistics?.balance || 0) >= 0 ? 'border-[#F7941D]/30 bg-[#F7941D]/5 dark:border-[#F7941D]/40 dark:bg-[#F7941D]/10' : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/30'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Wynik (przychody − koszty)</p>
            <p className={`mt-1 text-2xl font-bold ${(statistics?.balance || 0) >= 0 ? 'text-[#F7941D]' : 'text-red-600 dark:text-red-300'}`}>
              {(statistics?.balance || 0) >= 0 ? '' : '−'}{formatCurrency(Math.abs(statistics?.balance || 0))}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-xl font-semibold xl:text-2xl ${card.valueClass}`}>{card.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {/* Kind filter: income vs cost */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4 dark:border-gray-700">
            {([
              { key: 'all', label: 'Wszystkie' },
              { key: InvoiceKind.INCOME, label: 'Przychodowe' },
              { key: InvoiceKind.COST, label: 'Kosztowe' },
            ] as { key: 'all' | InvoiceKind; label: string }[]).map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => { setKindFilter(k.key); setViewFilter('all'); setCurrentPage(1); }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  kindFilter === k.key
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-700 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setViewFilter(tab.key as ViewFilter);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      viewFilter === tab.key
                        ? 'bg-[#F7941D] text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        viewFilter === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Płatność
                </span>
                {paymentTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setPaymentFilter(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      paymentFilter === tab.key
                        ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                        paymentFilter === tab.key
                          ? 'bg-white/20 text-white dark:bg-gray-900/15 dark:text-gray-900'
                          : 'bg-white text-gray-400 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative w-full sm:min-w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Szukaj
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-9 w-9 animate-spin text-[#F7941D]" />
                <span className="text-sm font-medium">Ładowanie faktur...</span>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">
                {viewFilter !== 'all' ? t('noInvoicesInCategory') : t('noInvoices')}
              </h3>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                {viewFilter !== 'all' ? t('changeFilter') : t('createFirst')}
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(kindFilter === InvoiceKind.COST ? '/invoices/new?kind=cost' : kindFilter === InvoiceKind.INCOME ? '/invoices/new?kind=income' : '/invoices/new')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                >
                  <Plus className="h-4 w-4" />
                  {t('createInvoice')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('invoice')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('client')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Płatność
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('amount')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {t('dueDate')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedInvoices.map((invoice) => {
                      const statusConfig = getStatusConfig(invoice.status);
                      const paymentConfig = getPaymentConfig(invoice);
                      const PaymentIcon = paymentConfig.icon;
                      const overdue = isOverdue(invoice.due_date, invoice.status);

                      return (
                        <tr
                          key={invoice.id}
                          className="group transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                        >
                          <td className="min-w-[260px] px-4 py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                              className="flex min-w-0 items-center gap-3 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-950 transition-colors group-hover:text-[#F7941D] dark:text-white">
                                  {invoice.invoice_number}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(invoice.issue_date)}
                                </p>
                                {invoice.company && (
                                  <span className="mt-1 inline-flex items-center rounded-full bg-[#F7941D]/10 px-2 py-0.5 text-[11px] font-semibold text-[#b76612] dark:bg-[#F7941D]/15 dark:text-orange-200">
                                    {invoice.company}
                                  </span>
                                )}
                              </div>
                            </button>
                          </td>
                          <td className="min-w-[220px] px-4 py-4">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {invoice.client?.name || '-'}
                            </p>
                          </td>
                          <td className="min-w-[170px] px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="min-w-[230px] px-4 py-4">
                            <div className={`inline-flex max-w-full flex-col rounded-xl border px-3 py-2 text-left ${paymentConfig.className}`}>
                              <div className="flex min-w-0 items-start gap-2">
                                {updatingPaymentId === invoice.id ? (
                                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                                ) : (
                                  <PaymentIcon className={`mt-0.5 h-4 w-4 shrink-0 ${paymentConfig.iconClassName}`} />
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-semibold">{paymentConfig.label}</span>
                                  <span className="block truncate text-[11px] leading-snug opacity-80">{paymentConfig.description}</span>
                                </span>
                              </div>

                              {canEdit && invoice.status !== InvoiceStatus.CANCELLED && (
                                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-current/10 pt-2">
                                  {!isInvoiceFullyPaid(invoice) ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleMarkInvoicePaid(invoice);
                                      }}
                                      disabled={updatingPaymentId === invoice.id}
                                      className="inline-flex h-7 items-center rounded-md bg-white/70 px-2.5 text-[11px] font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-950/30 dark:text-emerald-300 dark:hover:bg-gray-950/50"
                                    >
                                      Opłacona
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setResetPaymentInvoice(invoice);
                                      }}
                                      disabled={updatingPaymentId === invoice.id}
                                      className="inline-flex h-7 items-center rounded-md bg-white/70 px-2.5 text-[11px] font-semibold text-amber-700 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-950/30 dark:text-amber-300 dark:hover:bg-gray-950/50"
                                    >
                                      Cofnij
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="min-w-[190px] px-4 py-4">
                            <p className="text-sm font-semibold text-gray-950 dark:text-white">
                              {formatCurrency(Number(invoice.gross_total), invoice.currency)}
                            </p>
                          </td>
                          <td className="min-w-[160px] px-4 py-4">
                            <span
                              className={`text-sm ${
                                overdue ? 'font-semibold text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {formatDate(invoice.due_date)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="relative flex items-center justify-end">
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      if (menuOpenId === invoice.id) { setMenuOpenId(null); return; }
                                      const r = e.currentTarget.getBoundingClientRect();
                                      setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
                                      setMenuOpenId(invoice.id);
                                    }}
                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    aria-label="Menu faktury"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {menuOpenId === invoice.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                      <div
                                        style={{ top: menuPos.top, right: menuPos.right }}
                                        className="fixed z-50 min-w-[150px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMenuOpenId(null);
                                            navigate(`/invoices/${invoice.id}`);
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                          <Eye className="h-4 w-4" />
                                          {t('view')}
                                        </button>
                                        {!isInvoiceFullyPaid(invoice) && invoice.status !== InvoiceStatus.CANCELLED && (
                                          <button
                                            type="button"
                                            onClick={() => handleMarkInvoicePaid(invoice)}
                                            disabled={updatingPaymentId === invoice.id}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Oznacz jako opłaconą
                                          </button>
                                        )}
                                        {isInvoiceFullyPaid(invoice) && invoice.status !== InvoiceStatus.CANCELLED && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setResetPaymentInvoice(invoice);
                                              setMenuOpenId(null);
                                            }}
                                            disabled={updatingPaymentId === invoice.id}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-900/20"
                                          >
                                            <AlertCircle className="h-4 w-4" />
                                            Cofnij płatność
                                          </button>
                                        )}
                                        {invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setMenuOpenId(null);
                                              navigate(`/invoices/${invoice.id}/edit`);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                          >
                                            <Edit className="h-4 w-4" />
                                            {t('edit')}
                                          </button>
                                        )}
                                        {invoice.status !== InvoiceStatus.PAID && (
                                          <button
                                            type="button"
                                            onClick={() => handleDelete(invoice.id)}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            {t('delete')}
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                                  className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700"
                                  aria-label="Przejdź do faktury"
                                >
                                  <ChevronRight className="h-4 w-4" />
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
                  Pokazano {pageStart}-{pageEnd} z {filteredInvoices.length} faktur
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

      <ConfirmDialog
        isOpen={!!resetPaymentInvoice}
        onClose={() => setResetPaymentInvoice(null)}
        onConfirm={() => {
          if (resetPaymentInvoice) handleResetPayment(resetPaymentInvoice);
        }}
        title="Cofnąć płatność?"
        message="Kwota zapłacona zostanie ustawiona na 0, a faktura wróci do statusu nieopłaconej lub po terminie."
        confirmText="Cofnij płatność"
        cancelText="Anuluj"
        variant="warning"
        icon="warning"
        loading={!!updatingPaymentId}
      />
    </MainLayout>
  );
};

export default Invoices;
