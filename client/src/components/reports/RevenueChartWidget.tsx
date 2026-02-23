import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { RevenueOverTimeData } from '../../types/financialReport.types';

interface RevenueChartWidgetProps {
  data: RevenueOverTimeData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { t } = useTranslation('reports');

  if (active && payload && payload.length) {
    const fmt = (v: number) =>
      new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[160px]">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-gray-300">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-semibold text-white">{fmt(entry.value as number)} PLN</span>
          </div>
        ))}
        {payload[0]?.payload && (
          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
            {t('invoicesCount')}: {payload[0].payload.invoice_count}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const RevenueChartWidget = ({ data, isLoading }: RevenueChartWidgetProps) => {
  const { t } = useTranslation('reports');

  const placeholder = (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('revenueOverTime')}</h3>
      </div>
      <div className="h-[280px] flex items-center justify-center">
        {isLoading
          ? <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
          : <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noData')}</p>}
      </div>
    </div>
  );

  if (isLoading || data.length === 0) return placeholder;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('revenueOverTime')}</h3>
        </div>
        <div className="flex items-center gap-5 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-500 inline-block rounded" />
            {t('grossTotal')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
            {t('paidAmount')}
          </span>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={38}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="gross_total"
              name={t('grossTotal')}
              stroke="#6366F1"
              strokeWidth={2.5}
              fill="url(#gradGross)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: '#6366F1' }}
            />
            <Area
              type="monotone"
              dataKey="paid_amount"
              name={t('paidAmount')}
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#gradPaid)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: '#10B981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChartWidget;
