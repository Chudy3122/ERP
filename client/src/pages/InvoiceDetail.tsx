import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  Send,
  XCircle,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Loader2,
  Download,
} from 'lucide-react';
import * as invoiceApi from '../api/invoice.api';
import { Invoice, InvoiceStatus } from '../types/invoice.types';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';
import PaymentHistory from '../components/payments/PaymentHistory';

const InvoiceDetail = () => {
  const { t } = useTranslation('invoices');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC;

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      setIsLoading(true);
      const data = await invoiceApi.getInvoiceById(id!);
      setInvoice(data);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!invoice) return;
    try {
      setIsUpdating(true);
      const updated = await invoiceApi.updateInvoiceStatus(invoice.id, status);
      setInvoice(updated);
    } catch (error: any) {
      alert(error.response?.data?.message || t('statusError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;
    try {
      setIsUpdating(true);
      const updated = await invoiceApi.markInvoiceAsPaid(invoice.id);
      setInvoice(updated);
    } catch (error: any) {
      alert(error.response?.data?.message || t('statusError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await invoiceApi.deleteInvoice(invoice.id);
      navigate('/invoices');
    } catch (error: any) {
      alert(error.response?.data?.message || t('deleteError'));
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setIsDownloadingPdf(true);
      await invoiceApi.downloadInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (error: any) {
      alert(error.response?.data?.message || t('pdfError'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getStatusConfig = (status: InvoiceStatus) => {
    const configs = {
      draft: { label: t('statusDraft'), color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
      sent: { label: t('statusSent'), color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      paid: { label: t('statusPaid'), color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
      partially_paid: { label: t('statusPartiallyPaid'), color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      overdue: { label: t('statusOverdue'), color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      cancelled: { label: t('statusCancelled'), color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
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
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <MainLayout title={t('invoiceDetails')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout title={t('invoiceDetails')}>
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('notFound')}</h3>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);
  const canModify = invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED;

  return (
    <MainLayout title={invoice.invoice_number}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {invoice.invoice_number}
              </h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('createdOn', { date: formatDate(invoice.created_at) })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download PDF - dostępny dla wszystkich */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('downloadPdf')}
          </button>

          {canEdit && canModify && (
            <>
              <button
                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                {t('edit')}
              </button>
                {invoice.status === InvoiceStatus.DRAFT && (
                  <button
                    onClick={() => handleStatusChange(InvoiceStatus.SENT)}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {t('markAsSent')}
                  </button>
                )}
                {(invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE || invoice.status === InvoiceStatus.PARTIALLY_PAID) && (
                  <button
                    onClick={handleMarkAsPaid}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('markAsPaid')}
                  </button>
                )}
            </>
          )}
          {canEdit && canModify && (
            <button
              onClick={() => handleStatusChange(InvoiceStatus.CANCELLED)}
              disabled={isUpdating}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
              {t('cancel')}
            </button>
          )}
          {canEdit && invoice.status !== InvoiceStatus.PAID && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('items')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3">{t('description')}</th>
                    <th className="px-4 py-3 text-right">{t('quantity')}</th>
                    <th className="px-4 py-3 text-right">{t('unitPrice')}</th>
                    <th className="px-4 py-3 text-right">{t('vatRate')}</th>
                    <th className="px-4 py-3 text-right">{t('netAmount')}</th>
                    <th className="px-6 py-3 text-right">{t('grossAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item, index) => (
                    <tr key={item.id || index} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{item.description}</td>
                      <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-400">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(Number(item.unit_price_net), invoice.currency)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-400">{item.vat_rate}%</td>
                      <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(Number(item.net_amount), invoice.currency)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(Number(item.gross_amount), invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <td colSpan={4} className="px-6 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                      {t('netTotal')}:
                    </td>
                    <td colSpan={2} className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(invoice.net_total), invoice.currency)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <td colSpan={4} className="px-6 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                      {t('vatTotal')}:
                    </td>
                    <td colSpan={2} className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(invoice.vat_total), invoice.currency)}
                    </td>
                  </tr>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <td colSpan={4} className="px-6 py-4 text-right text-lg font-semibold text-gray-900 dark:text-white">
                      {t('grossTotal')}:
                    </td>
                    <td colSpan={2} className="px-6 py-4 text-right text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(Number(invoice.gross_total), invoice.currency)}
                    </td>
                  </tr>
                  {Number(invoice.paid_amount) > 0 && (
                    <>
                      <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                        <td colSpan={4} className="px-6 py-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {t('paidAmount')}:
                        </td>
                        <td colSpan={2} className="px-6 py-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(Number(invoice.paid_amount), invoice.currency)}
                        </td>
                      </tr>
                      {Number(invoice.paid_amount) < Number(invoice.gross_total) && (
                        <tr className="bg-amber-50 dark:bg-amber-900/20">
                          <td colSpan={4} className="px-6 py-3 text-right font-medium text-amber-700 dark:text-amber-400">
                            {t('remaining')}:
                          </td>
                          <td colSpan={2} className="px-6 py-3 text-right font-medium text-amber-700 dark:text-amber-400">
                            {formatCurrency(Number(invoice.gross_total) - Number(invoice.paid_amount), invoice.currency)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || invoice.internal_notes) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              {invoice.notes && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('notes')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.internal_notes && canEdit && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('internalNotes')}</h4>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          {invoice.status !== InvoiceStatus.DRAFT && invoice.status !== InvoiceStatus.CANCELLED && (
            <PaymentHistory
              invoiceId={invoice.id}
              grossTotal={Number(invoice.gross_total)}
              paidAmount={Number(invoice.paid_amount)}
              currency={invoice.currency}
              onPaymentChange={loadInvoice}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('client')}</h3>
            </div>
            {invoice.client && (
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">{invoice.client.name}</p>
                {invoice.client.nip && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">NIP: {invoice.client.nip}</p>
                )}
                {invoice.client.street && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.client.street}</p>
                )}
                {invoice.client.city && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {invoice.client.postal_code} {invoice.client.city}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('dates')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('issueDate')}:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(invoice.issue_date)}</span>
              </div>
              {invoice.sale_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('saleDate')}:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(invoice.sale_date)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('dueDate')}:</span>
                <span className={`text-sm font-medium ${
                  new Date(invoice.due_date) < new Date() && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED
                    ? 'text-red-600'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {formatDate(invoice.due_date)}
                </span>
              </div>
              {invoice.payment_terms && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('paymentTerms')}:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.payment_terms}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('payment')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('currency')}:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('status')}:</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Project Info */}
          {invoice.project && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('project')}</h3>
              <p className="font-medium text-gray-900 dark:text-white">{invoice.project.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.project.code}</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default InvoiceDetail;
