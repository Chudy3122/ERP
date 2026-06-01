import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
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
import * as invoiceApi from '../api/invoice.api';
import { Invoice, InvoiceStatus, InvoiceStatistics } from '../types/invoice.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

type ViewFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const Invoices = () => {
  const { t } = useTranslation('invoices');
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statistics, setStatistics] = useState<InvoiceStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const navigate = useNavigate();

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC;

  useEffect(() => {
    loadInvoices();
    loadStatistics();
  }, []);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const result = await invoiceApi.getInvoices({
        search: searchQuery || undefined,
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
      const stats = await invoiceApi.getInvoiceStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleSearch = () => {
    loadInvoices();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await invoiceApi.deleteInvoice(id);
      setInvoices(invoices.filter((invoice) => invoice.id !== id));
      loadStatistics();
    } catch (error: any) {
      alert(error.response?.data?.message || t('deleteError'));
    }
    setMenuOpenId(null);
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

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (viewFilter === 'all') return true;
      if (viewFilter === 'draft') return invoice.status === InvoiceStatus.DRAFT;
      if (viewFilter === 'sent') return invoice.status === InvoiceStatus.SENT;
      if (viewFilter === 'paid') return invoice.status === InvoiceStatus.PAID;
      if (viewFilter === 'overdue') return invoice.status === InvoiceStatus.OVERDUE;
      return true;
    });
  }, [invoices, viewFilter]);

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
                onClick={() => navigate('/invoices/new')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
              >
                <Plus className="h-4 w-4" />
                {t('newInvoice')}
              </button>
            )}
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
          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-700 xl:flex-row xl:items-center xl:justify-between">
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
                  onClick={() => navigate('/invoices/new')}
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
                          <td className="min-w-[190px] px-4 py-4">
                            <p className="text-sm font-semibold text-gray-950 dark:text-white">
                              {formatCurrency(Number(invoice.gross_total), invoice.currency)}
                            </p>
                            {Number(invoice.paid_amount) > 0 && Number(invoice.paid_amount) < Number(invoice.gross_total) && (
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {t('paidAmount')}: {formatCurrency(Number(invoice.paid_amount), invoice.currency)}
                              </p>
                            )}
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
                                    onClick={() => setMenuOpenId(menuOpenId === invoice.id ? null : invoice.id)}
                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                    aria-label="Menu faktury"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {menuOpenId === invoice.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                                      <div className="absolute right-0 top-9 z-20 min-w-[150px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
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
    </MainLayout>
  );
};

export default Invoices;
