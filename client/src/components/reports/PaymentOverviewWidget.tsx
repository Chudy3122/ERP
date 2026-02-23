import { useTranslation } from 'react-i18next';
import {
  FileText,
  Wallet,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { PaymentOverviewData } from '../../types/financialReport.types';

interface PaymentOverviewWidgetProps {
  data: PaymentOverviewData | null;
  isLoading: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
};

const StatCard = ({ icon, label, value, subValue, color }: StatCardProps) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>
        )}
      </div>
    </div>
  </div>
);

const PaymentOverviewWidget = ({ data, isLoading }: PaymentOverviewWidgetProps) => {
  const { t } = useTranslation('reports');

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-center h-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<FileText className="w-5 h-5" />}
        label={t('totalInvoices')}
        value={data.total_invoices.toString()}
        subValue={`${formatMoney(data.total_gross)} PLN`}
        color="blue"
      />
      <StatCard
        icon={<Wallet className="w-5 h-5" />}
        label={t('totalPaid')}
        value={`${formatMoney(data.total_paid)} PLN`}
        subValue={`${data.paid_percentage}% ${t('ofTotal')}`}
        color="green"
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label={t('totalPending')}
        value={`${formatMoney(data.total_pending)} PLN`}
        color="amber"
      />
      <StatCard
        icon={<AlertTriangle className="w-5 h-5" />}
        label={t('overdue')}
        value={data.overdue_count.toString()}
        subValue={`${formatMoney(data.overdue_amount)} PLN`}
        color="red"
      />
    </div>
  );
};

export default PaymentOverviewWidget;
