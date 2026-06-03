import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { confirmDelete } from '../utils/confirm';
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
  StickyNote,
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
      toast.error(error.response?.data?.message || t('statusError'));
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
      toast.error(error.response?.data?.message || t('statusError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!(await confirmDelete(t('confirmDelete')))) return;

    try {
      await invoiceApi.deleteInvoice(invoice.id);
      navigate('/invoices');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('deleteError'));
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setIsDownloadingPdf(true);
      await invoiceApi.downloadInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('pdfError'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getStatusConfig = (status: InvoiceStatus) => {
    const configs = {
      draft: { label: t('statusDraft'), color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
      sent: { label: t('statusSent'), color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-500' },
      paid: { label: t('statusPaid'), color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
      partially_paid: { label: t('statusPartiallyPaid'), color: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300', dot: 'bg-[#F7941D]' },
      overdue: { label: t('statusOverdue'), color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
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
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <MainLayout title={t('invoiceDetails')}>
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin text-[#F7941D]" />
            <span className="text-sm font-medium">Ladowanie faktury...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!invoice) {
    return (
      <MainLayout title={t('invoiceDetails')}>
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{t('notFound')}</h3>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = getStatusConfig(invoice.status);
  const canModify = invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED;
  const remainingAmount = Math.max(0, Number(invoice.gross_total) - Number(invoice.paid_amount || 0));

  return (
    <MainLayout title={invoice.invoice_number}>
      <div className="mx-auto max-w-[1600px] space-y-6">
      {/* Header */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#F7941D] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Powrot do listy faktur"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Szczegoly faktury
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-gray-950 dark:text-white">
                  {invoice.invoice_number}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('createdOn', { date: formatDate(invoice.created_at) })}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusConfig.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF — only for income invoices (we are the seller). Cost invoices are the supplier's document. */}
          {invoice.kind !== 'cost' && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('downloadPdf')}
            </button>
          )}

          {canEdit && canModify && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Edit className="h-4 w-4" />
                {t('edit')}
              </button>
                {invoice.status === InvoiceStatus.DRAFT && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(InvoiceStatus.SENT)}
                    disabled={isUpdating}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  >
                    <Send className="h-4 w-4" />
                    {t('markAsSent')}
                  </button>
                )}
                {(invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE || invoice.status === InvoiceStatus.PARTIALLY_PAID) && (
                  <button
                    type="button"
                    onClick={handleMarkAsPaid}
                    disabled={isUpdating}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('markAsPaid')}
                  </button>
                )}
            </>
          )}
          {canEdit && canModify && (
            <button
              type="button"
              onClick={() => handleStatusChange(InvoiceStatus.CANCELLED)}
              disabled={isUpdating}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <XCircle className="h-4 w-4" />
              {t('cancel')}
            </button>
          )}
          {canEdit && invoice.status !== InvoiceStatus.PAID && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
              {t('delete')}
            </button>
          )}
        </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('grossTotal')}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
            {formatCurrency(Number(invoice.gross_total), invoice.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('paidAmount')}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
            {formatCurrency(Number(invoice.paid_amount || 0), invoice.currency)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('remaining')}</p>
          <p className="mt-1 text-2xl font-semibold text-[#F7941D]">
            {formatCurrency(remainingAmount, invoice.currency)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Items */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{t('items')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pozycje i podsumowanie faktury.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-3">{t('description')}</th>
                    <th className="px-4 py-3 text-right">{t('quantity')}</th>
                    <th className="px-4 py-3 text-right">{t('unitPrice')}</th>
                    <th className="px-4 py-3 text-right">{t('vatRate')}</th>
                    <th className="px-4 py-3 text-right">{t('netAmount')}</th>
                    <th className="px-6 py-3 text-right">{t('grossAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoice.items?.map((item, index) => (
                    <tr key={item.id || index} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 font-medium text-gray-950 dark:text-white">{item.description}</td>
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
                      <td className="px-6 py-4 text-right font-semibold text-gray-950 dark:text-white">
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
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <StickyNote className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{t('additionalInfo')}</h3>
              </div>
              {invoice.notes && (
                <div className="mb-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('notes')}</h4>
                  <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{invoice.notes}</p>
                </div>
              )}
              {invoice.internal_notes && canEdit && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('internalNotes')}</h4>
                  <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">{invoice.internal_notes}</p>
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
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{t('client')}</h3>
            </div>
            {invoice.client && (
              <div className="space-y-2">
                <p className="font-semibold text-gray-950 dark:text-white">{invoice.client.name}</p>
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
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{t('dates')}</h3>
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
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{t('payment')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('currency')}:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('status')}:</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          {/* Project Info */}
          {invoice.project && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-950 dark:text-white">{t('project')}</h3>
              <p className="font-semibold text-gray-950 dark:text-white">{invoice.project.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.project.code}</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </MainLayout>
  );
};

export default InvoiceDetail;
