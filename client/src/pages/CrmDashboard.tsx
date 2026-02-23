import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Target, Trophy, XCircle, ArrowLeft } from 'lucide-react';
import * as crmApi from '../api/crm.api';
import {
  CrmPipeline,
  DealStatistics,
  RevenueForecast,
  ConversionRate,
} from '../types/crm.types';

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

const StatCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
      </div>
    </div>
  </div>
);

const CrmDashboard = () => {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [stats, setStats] = useState<DealStatistics | null>(null);
  const [forecast, setForecast] = useState<RevenueForecast[]>([]);
  const [conversionRates, setConversionRates] = useState<ConversionRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    crmApi.getAllPipelines().then(data => {
      setPipelines(data);
      if (data.length > 0) {
        setSelectedPipelineId(data[0].id);
      } else {
        setIsLoading(false);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedPipelineId !== undefined) {
      loadStats();
    }
  }, [selectedPipelineId]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const pipelineId = selectedPipelineId || undefined;
      const [statsData, forecastData] = await Promise.all([
        crmApi.getStatistics(pipelineId),
        crmApi.getForecast(pipelineId),
      ]);
      setStats(statsData);
      setForecast(forecastData);

      if (selectedPipelineId) {
        const conversion = await crmApi.getConversionRates(selectedPipelineId);
        setConversionRates(conversion);
      } else {
        setConversionRates([]);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const winRate = stats && (stats.won_deals + stats.lost_deals) > 0
    ? Math.round(stats.won_deals / (stats.won_deals + stats.lost_deals) * 100)
    : 0;

  return (
    <MainLayout title="Dashboard CRM">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/crm')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard CRM</h1>
            <p className="text-gray-500 text-sm mt-0.5">Analityka i prognoza sprzedaży</p>
          </div>
        </div>

        {/* Pipeline filter */}
        <select
          value={selectedPipelineId}
          onChange={e => setSelectedPipelineId(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-400"
        >
          <option value="">Wszystkie pipeline</option>
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-800" />
        </div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-400">Brak danych</div>
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Aktywne deale"
              value={String(stats.open_deals)}
              subValue={`${formatCurrency(stats.total_value)} PLN łącznie`}
              icon={Target}
              color="#3B82F6"
            />
            <StatCard
              label="Wygrane"
              value={String(stats.won_deals)}
              subValue={`${formatCurrency(stats.won_value)} PLN`}
              icon={Trophy}
              color="#10B981"
            />
            <StatCard
              label="Przegrane"
              value={String(stats.lost_deals)}
              icon={XCircle}
              color="#EF4444"
            />
            <StatCard
              label="Win rate"
              value={`${winRate}%`}
              subValue={`Śr. deal: ${formatCurrency(stats.avg_deal_size)} PLN`}
              icon={TrendingUp}
              color="#8B5CF6"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deals by stage */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Deale według etapu</h3>
              {stats.deals_by_stage.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Brak danych</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.deals_by_stage} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="stage_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        name === 'count' ? value : `${formatCurrency(Number(value))} PLN`,
                        name === 'count' ? 'Liczba' : 'Wartość',
                      ]}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue forecast */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Prognoza przychodów</h3>
              {forecast.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Brak prognoz (dodaj daty zamknięcia do deali)</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={forecast} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        `${formatCurrency(Number(value))} PLN`,
                        name === 'weighted_value' ? 'Ważona' : 'Łączna',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="total_value"
                    />
                    <Line
                      type="monotone"
                      dataKey="weighted_value"
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={{ r: 3 }}
                      name="weighted_value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Conversion funnel */}
          {conversionRates.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Lejek konwersji</h3>
              <div className="flex flex-col gap-2 max-w-md">
                {conversionRates.map((stage, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 dark:text-gray-400 truncate">{stage.stage_name}</div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{
                          width: `${stage.conversion_rate}%`,
                          backgroundColor: stage.stage_color,
                          minWidth: stage.deal_count > 0 ? '40px' : '0',
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stage.conversion_rate}%
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{stage.deal_count}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">* Procent deali docierających do każdego etapu względem pierwszego etapu</p>
            </div>
          )}

          {/* Deals by stage value breakdown */}
          {stats.deals_by_stage.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Wartość w każdym etapie</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stats.deals_by_stage.map((stage, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.stage_color }} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 truncate">{stage.stage_name}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(stage.value)} PLN</p>
                      <p className="text-xs text-gray-400">{stage.count} deali</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default CrmDashboard;
