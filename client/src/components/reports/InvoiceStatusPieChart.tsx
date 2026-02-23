import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { PieChartIcon, Loader2 } from 'lucide-react';
import { StatusDistributionData, STATUS_LABELS, STATUS_COLORS } from '../../types/financialReport.types';

interface InvoiceStatusPieChartProps {
  data: StatusDistributionData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  const { t } = useTranslation('reports');

  if (active && payload && payload.length) {
    const fmt = (v: number) =>
      new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    const item = payload[0].payload;

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[170px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
          <p className="font-semibold text-white text-sm">{item.name}</p>
        </div>
        <p className="text-sm text-gray-300">{t('invoicesCount')}: <span className="font-medium text-white">{item.count}</span></p>
        <p className="text-sm text-gray-300">{t('grossTotal')}: <span className="font-medium text-white">{fmt(item.total_gross)} PLN</span></p>
      </div>
    );
  }
  return null;
};

const InvoiceStatusPieChart = ({ data, isLoading }: InvoiceStatusPieChartProps) => {
  const { t } = useTranslation('reports');

  const placeholder = (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
          <PieChartIcon className="w-4 h-4 text-amber-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('statusDistribution')}</h3>
      </div>
      <div className="h-[280px] flex items-center justify-center">
        {isLoading
          ? <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
          : <p className="text-gray-400 dark:text-gray-500 text-sm">{t('noData')}</p>}
      </div>
    </div>
  );

  if (isLoading || data.length === 0) return placeholder;

  const chartData = data.map((item) => ({
    ...item,
    name: STATUS_LABELS[item.status] || item.status,
    color: STATUS_COLORS[item.status] || '#6B7280',
  }));

  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
          <PieChartIcon className="w-4 h-4 text-amber-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('statusDistribution')}</h3>
      </div>

      <div className="flex flex-col items-center">
        {/* Chart with center label */}
        <div className="relative h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={3}
                dataKey="count"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((item, index) => (
                  <Cell key={`cell-${index}`} fill={item.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{totalCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('totalInvoices')}</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full mt-4 space-y-2">
          {chartData.map((item, index) => {
            const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{item.name}</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{item.count}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InvoiceStatusPieChart;
