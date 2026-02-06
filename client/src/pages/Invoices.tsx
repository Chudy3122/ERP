import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  FileText,
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import * as invoiceApi from '../api/invoice.api';
import { Invoice, InvoiceStatus, InvoiceStatistics } from '../types/invoice.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

type ViewFilter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue';

const Invoices = () => {
  const { t } = useTranslation('invoices');
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statistics, setStatistics] = useState<InvoiceStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
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
      setInvoices(invoices.filter(inv => inv.id !== id));
      loadStatistics();
    } catch (error: any) {
      alert(error.response?.data?.message || t('deleteError'));
    }
    setMenuOpenId(null);
  };

  const getStatusConfig = (status: InvoiceStatus) => {
    const configs = {
      draft: { label: t('statusDraft'), color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
      sent: { label: t('statusSent'), color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
      paid: { label: t('statusPaid'), color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
      partially_paid: { label: t('statusPartiallyPaid'), color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
      overdue: { label: t('statusOverdue'), color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
      cancelled: { label: t('statusCancelled'), color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500', dot: 'bg-gray-400' },
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

  // Filter invoices based on view
  const filteredInvoices = invoices.filter((invoice) => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'draft') return invoice.status === InvoiceStatus.DRAFT;
    if (viewFilter === 'sent') return invoice.status === InvoiceStatus.SENT;
    if (viewFilter === 'paid') return invoice.status === InvoiceStatus.PAID;
    if (viewFilter === 'overdue') return invoice.status === InvoiceStatus.OVERDUE;
    return true;
  });

  const viewTabs = [
    { key: 'all', label: t('all'), count: statistics?.total_count || 0 },
    { key: 'draft', label: t('statusDraft'), count: statistics?.draft_count || 0 },
    { key: 'sent', label: t('statusSent'), count: statistics?.sent_count || 0 },
    { key: 'paid', label: t('statusPaid'), count: statistics?.paid_count || 0 },
    { key: 'overdue', label: t('statusOverdue'), count: statistics?.overdue_count || 0 },
  ];

  return (
    <MainLayout title={t('title')}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/invoices/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('newInvoice')}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.total_count || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('totalInvoices')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(statistics?.total_paid || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('paid')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(statistics?.total_pending || 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('pending')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{statistics?.overdue_count || 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('overdueCount')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setViewFilter(tab.key as ViewFilter)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  viewFilter === tab.key
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  viewFilter === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {viewFilter !== 'all' ? t('noInvoicesInCategory') : t('noInvoices')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {viewFilter !== 'all' ? t('changeFilter') : t('createFirst')}
          </p>
          {canEdit && (
            <button
              onClick={() => navigate('/invoices/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('createInvoice')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-3">{t('invoice')}</div>
            <div className="col-span-2">{t('client')}</div>
            <div className="col-span-2">{t('status')}</div>
            <div className="col-span-2">{t('amount')}</div>
            <div className="col-span-2">{t('dueDate')}</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredInvoices.map((invoice) => {
              const statusConfig = getStatusConfig(invoice.status);
              const overdue = isOverdue(invoice.due_date, invoice.status);

              return (
                <div
                  key={invoice.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group items-center"
                >
                  {/* Invoice Info */}
                  <div
                    className="col-span-3 flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-300">
                        {invoice.invoice_number}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.issue_date)}
                      </p>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="col-span-2">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {invoice.client?.name || '-'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(invoice.gross_total), invoice.currency)}
                    </p>
                    {Number(invoice.paid_amount) > 0 && Number(invoice.paid_amount) < Number(invoice.gross_total) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('paidAmount')}: {formatCurrency(Number(invoice.paid_amount), invoice.currency)}
                      </p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="col-span-2">
                    <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatDate(invoice.due_date)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end relative">
                    {canEdit ? (
                      <>
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === invoice.id ? null : invoice.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpenId === invoice.id && (
                          <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                navigate(`/invoices/${invoice.id}`);
                              }}
                              className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              {t('view')}
                            </button>
                            {invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED && (
                              <button
                                onClick={() => {
                                  setMenuOpenId(null);
                                  navigate(`/invoices/${invoice.id}/edit`);
                                }}
                                className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                {t('edit')}
                              </button>
                            )}
                            {invoice.status !== InvoiceStatus.PAID && (
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t('delete')}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {!isLoading && filteredInvoices.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('shown', { shown: filteredInvoices.length, total: invoices.length })}
        </div>
      )}
    </MainLayout>
  );
};

export default Invoices;
