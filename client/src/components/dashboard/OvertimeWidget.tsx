import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as worklogApi from '../../api/worklog.api';
import { OvertimeSummaryEntry } from '../../types/worklog.types';
import WidgetCard from '../widgets/WidgetCard';
import { DashboardWidgetEmpty, DashboardWidgetLoading } from './DashboardWidgetState';

const OvertimeWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<OvertimeSummaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const summary = await worklogApi.getOvertimeSummary();
      const mine = summary.find((s) => s.user_id === user?.id);
      setEntry(mine ?? null);
    } catch {
      setEntry(null);
    } finally {
      setIsLoading(false);
    }
  };

  const BalanceIcon = entry && entry.balance > 0
    ? TrendingUp
    : entry && entry.balance < 0
    ? TrendingDown
    : Minus;

  const balanceColor = entry && entry.balance > 0
    ? 'text-green-600 dark:text-green-400'
    : entry && entry.balance < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <WidgetCard
      className="h-full"
      title="Nadgodziny"
      icon={<TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      actions={
        <button
          onClick={() => navigate('/overtime')}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Szczegóły
        </button>
      }
    >

      <div className="flex flex-1 flex-col justify-center">
        {isLoading ? (
          <DashboardWidgetLoading label="Ładowanie nadgodzin..." />
        ) : entry ? (
          <div className="space-y-3">
            {/* Balance */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${
                entry.balance > 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : entry.balance < 0
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}>
                <BalanceIcon className={`w-3.5 h-3.5 ${balanceColor}`} />
                <span className={`text-xs font-medium ${balanceColor}`}>
                  {entry.balance > 0 ? 'Do odebrania' : entry.balance < 0 ? 'Zaległe' : 'Bilans zerowy'}
                </span>
              </div>
              <div className={`mt-2 text-2xl font-bold font-mono tracking-wide ${balanceColor}`}>
                {entry.balance > 0 ? '+' : ''}{entry.balance.toFixed(1)}h
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Przepracowane</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{entry.total_overtime.toFixed(1)}h</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Odebrane</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{entry.total_collected.toFixed(1)}h</p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/overtime')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                Dodaj
              </button>
              <button
                onClick={() => navigate('/overtime')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
              >
                <Minus className="w-3 h-3" />
                Odbierz
              </button>
            </div>
          </div>
        ) : (
          <DashboardWidgetEmpty
            icon={<TrendingUp className="h-5 w-5" />}
            title="Brak nadgodzin"
            description="Nie masz jeszcze zapisanych nadgodzin ani odbiorów czasu."
            action={
              <button
                onClick={() => navigate('/overtime')}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="w-3 h-3" />
                Dodaj nadgodziny
              </button>
            }
          />
        )}
      </div>
    </WidgetCard>
  );
};

export default OvertimeWidget;
