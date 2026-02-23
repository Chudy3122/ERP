import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  Cell,
} from 'recharts';
import { Users, Loader2 } from 'lucide-react';
import { RevenueByClientData } from '../../types/financialReport.types';

interface RevenueByClientWidgetProps {
  data: RevenueByClientData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  const { t } = useTranslation('reports');

  if (active && payload && payload.length) {
    const fmt = (v: number) =>
      new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    const item = payload[0].payload as RevenueByClientData;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[180px]">
        <p className="font-semibold text-white text-sm mb-2 truncate max-w-[200px]">{item.client_name}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-6 text-sm">
            <span className="flex items-center gap-1.5 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
              {t('grossTotal')}
            </span>
            <span className="font-medium text-white">{fmt(item.total_gross)} PLN</span>
          </div>
          <div className="flex justify-between gap-6 text-sm">
            <span className="flex items-center gap-1.5 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {t('paidAmount')}
            </span>
            <span className="font-medium text-white">{fmt(item.total_paid)} PLN</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
          {t('invoicesCount')}: {item.invoice_count}
        </p>
      </div>
    );
  }
  return null;
};

// Color palette for bars
const BAR_COLORS = ['#8B5CF6', '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#84CC16', '#F97316'];

const RevenueByClientWidget = ({ data, isLoading }: RevenueByClientWidgetProps) => {
  const { t } = useTranslation('reports');

  const placeholder = (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30">
          <Users className="w-4 h-4 text-violet-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('revenueByClient')}</h3>
      </div>
      <div className="h-[300px] flex items-center justify-center">
        {isLoading
          ? <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
          : <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noData')}</p>}
      </div>
    </div>
  );

  if (isLoading || data.length === 0) return placeholder;

  const chartData = data.map((item) => ({
    ...item,
    shortName: item.client_name.length > 22 ? item.client_name.substring(0, 20) + '…' : item.client_name,
  }));

  const rowHeight = 40;
  const chartHeight = Math.max(220, chartData.length * rowHeight + 20);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30">
            <Users className="w-4 h-4 text-violet-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('revenueByClient')}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-violet-500 inline-block rounded" />
            {t('grossTotal')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
            {t('paidAmount')}
          </span>
        </div>
      </div>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 110, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={105}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107,114,128,0.08)' }} />
            <Bar dataKey="total_gross" name={t('grossTotal')} radius={[0, 4, 4, 0]} maxBarSize={16}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
            <Bar dataKey="total_paid" name={t('paidAmount')} fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueByClientWidget;
