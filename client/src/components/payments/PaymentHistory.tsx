import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Banknote,
  Wallet,
  HelpCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Payment, PaymentMethod } from '../../types/payment.types';
import * as paymentApi from '../../api/payment.api';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth.types';

interface PaymentHistoryProps {
  invoiceId: string;
  grossTotal: number;
  paidAmount: number;
  currency: string;
  onPaymentChange?: () => void;
}

const PaymentHistory = ({
  invoiceId,
  grossTotal,
  paidAmount,
  currency,
  onPaymentChange,
}: PaymentHistoryProps) => {
  const { t } = useTranslation('payments');
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.KSIEGOWOSC;
  const remainingAmount = grossTotal - paidAmount;

  useEffect(() => {
    loadPayments();
  }, [invoiceId]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const data = await paymentApi.getPaymentsByInvoice(invoiceId);
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      setIsDeleting(paymentId);
      await paymentApi.deletePayment(paymentId);
      loadPayments();
      onPaymentChange?.();
    } catch (error: any) {
      alert(error.response?.data?.message || t('deleteError'));
    } finally {
      setIsDeleting(null);
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.BANK_TRANSFER:
        return <Banknote className="w-4 h-4" />;
      case PaymentMethod.CARD:
        return <CreditCard className="w-4 h-4" />;
      case PaymentMethod.CASH:
        return <Wallet className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.BANK_TRANSFER]: t('methodBankTransfer'),
      [PaymentMethod.CASH]: t('methodCash'),
      [PaymentMethod.CARD]: t('methodCard'),
      [PaymentMethod.OTHER]: t('methodOther'),
    };
    return labels[method] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('paymentHistory')}
          </h3>
          {canEdit && remainingAmount > 0 && (
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              Płatność oznaczaj jako całość z poziomu faktury
            </span>
          )}
        </div>

        {/* Summary */}
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('totalAmount')}:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {formatMoney(grossTotal)} {currency}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('paid')}:</span>
            <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
              {formatMoney(paidAmount)} {currency}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('remaining')}:</span>
            <span
              className={`ml-2 font-medium ${
                remainingAmount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {formatMoney(remainingAmount)} {currency}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('noPayments')}
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                    {getMethodIcon(payment.payment_method)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatMoney(payment.amount)} {currency}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(payment.payment_date)} • {getMethodLabel(payment.payment_method)}
                      {payment.reference_number && ` • ${payment.reference_number}`}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <button
                    onClick={() => handleDelete(payment.id)}
                    disabled={isDeleting === payment.id}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title={t('delete')}
                  >
                    {isDeleting === payment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default PaymentHistory;
