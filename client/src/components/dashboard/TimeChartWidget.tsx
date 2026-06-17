import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WidgetCard from '../widgets/WidgetCard';
import { getCurrentEntry, getUserTimeEntries } from '../../api/time.api';
import { getMyWorkLogs } from '../../api/worklog.api';
import { TimeEntry, TimeEntryStatus } from '../../types/time.types';
import { WorkLogType } from '../../types/worklog.types';
import { DashboardWidgetEmpty, DashboardWidgetLoading } from './DashboardWidgetState';

interface TimeData {
  date: string;
  regularHours: number;
  excessHours: number;
  overtimeHours: number;
  totalMinutes: number;
  displayDate: string;
  isOvertime: boolean;
}

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getCurrentWeekRange = () => {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TimeData;
    const regularMinutes = Math.round(data.regularHours * 60);
    const excessMinutes = Math.round(data.excessHours * 60);
    const overtimeMinutes = Math.round(data.overtimeHours * 60);
    const hours = Math.floor(data.totalMinutes / 60);
    const mins = data.totalMinutes % 60;
    const regularHours = Math.floor(regularMinutes / 60);
    const regularMins = regularMinutes % 60;
    const excessHours = Math.floor(excessMinutes / 60);
    const excessMins = excessMinutes % 60;
    const overtimeHours = Math.floor(overtimeMinutes / 60);
    const overtimeMins = overtimeMinutes % 60;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.displayDate}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Czas pracy: <span className="font-medium">{hours}h {mins}m</span>
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          W planie: <span className="font-medium">{regularHours}h {regularMins}m</span>
        </p>
        {excessMinutes > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Powyżej etatu, niezgłoszone jako nadgodziny:{' '}
            <span className="font-medium">{excessHours}h {excessMins}m</span>
          </p>
        )}
        {overtimeMinutes > 0 && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            Nadgodziny: <span className="font-medium">{overtimeHours}h {overtimeMins}m</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const TimeChartWidget = () => {
  const { user } = useAuth();
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTimeData();
  }, [user?.working_hours_per_day]);

  useEffect(() => {
    if (currentEntry?.status !== TimeEntryStatus.IN_PROGRESS) return undefined;

    const intervalId = window.setInterval(() => {
      fetchTimeData(false);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [currentEntry?.id, currentEntry?.status, user?.working_hours_per_day]);

  const fetchTimeData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      const { start, end } = getCurrentWeekRange();

      const [entries, workLogs, activeEntry] = await Promise.all([
        getUserTimeEntries(start.toISOString(), end.toISOString()),
        getMyWorkLogs(getLocalDateKey(start), getLocalDateKey(end)),
        getCurrentEntry(),
      ]);
      setCurrentEntry(activeEntry);

      const chartData: TimeData[] = [];
      const dates: Date[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      const entriesByDate: Record<string, number> = {};
      entries.forEach(entry => {
        if (activeEntry?.status === TimeEntryStatus.IN_PROGRESS && entry.id === activeEntry.id) {
          return;
        }

        const entryDate = getLocalDateKey(new Date(entry.clock_in));
        const minutes = entry.duration_minutes || 0;
        entriesByDate[entryDate] = (entriesByDate[entryDate] || 0) + minutes;
      });

      if (activeEntry?.status === TimeEntryStatus.IN_PROGRESS) {
        const activeEntryDate = getLocalDateKey(new Date(activeEntry.clock_in));
        const activeMinutes = Math.max(
          0,
          Math.floor((Date.now() - new Date(activeEntry.clock_in).getTime()) / 60000)
        );
        entriesByDate[activeEntryDate] = (entriesByDate[activeEntryDate] || 0) + activeMinutes;
      }

      const overtimeByDate: Record<string, number> = {};
      workLogs
        .filter((log) => log.work_type === WorkLogType.OVERTIME)
        .forEach((log) => {
          const logDate = getLocalDateKey(new Date(log.work_date));
          const minutes = Math.round(Number(log.hours || 0) * 60);
          overtimeByDate[logDate] = (overtimeByDate[logDate] || 0) + minutes;
        });

      dates.forEach(date => {
        const dateStr = getLocalDateKey(date);
        const timeEntryMinutes = entriesByDate[dateStr] || 0;
        const reportedOvertimeMinutes = overtimeByDate[dateStr] || 0;
        const plannedMinutes = (Number(user?.working_hours_per_day) || 8) * 60;
        const regularMinutes = Math.min(timeEntryMinutes, plannedMinutes);
        const unreportedExcessMinutes = Math.max(0, timeEntryMinutes - plannedMinutes - reportedOvertimeMinutes);
        const totalMinutes = regularMinutes + unreportedExcessMinutes + reportedOvertimeMinutes;

        chartData.push({
          date: dateStr,
          regularHours: parseFloat((regularMinutes / 60).toFixed(2)),
          excessHours: parseFloat((unreportedExcessMinutes / 60).toFixed(2)),
          overtimeHours: parseFloat((reportedOvertimeMinutes / 60).toFixed(2)),
          totalMinutes,
          displayDate: date.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' }),
          isOvertime: reportedOvertimeMinutes > 0,
        });
      });

      setTimeData(chartData);
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleChartClick = () => {
    navigate('/work-time');
  };

  if (isLoading) {
    return (
      <WidgetCard
        title="Mój zaraportowany czas"
        icon={<Clock className="w-5 h-5 text-gray-600" />}
      >
        <DashboardWidgetLoading label="Ładowanie czasu pracy..." />
      </WidgetCard>
    );
  }

  const totalMinutes = timeData.reduce((sum, day) => sum + day.totalMinutes, 0);
  const totalHours = totalMinutes / 60;
  const avgHours = timeData.length > 0 ? (totalHours / timeData.length).toFixed(1) : '0';
  const daysWorked = timeData.filter(day => day.totalMinutes > 0).length;
  const hasReportedTime = totalHours > 0;

  return (
    <WidgetCard
      className="h-full"
      title="Mój zaraportowany czas"
      icon={<Clock className="w-5 h-5 text-gray-600" />}
      actions={
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Dni: </span>
            <span className="font-semibold text-gray-900 dark:text-white">{daysWorked}/7</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Średnia: </span>
            <span className="font-semibold text-gray-900 dark:text-white">{avgHours}h</span>
          </div>
        </div>
      }
    >
      {hasReportedTime ? (
        <div className="min-h-[220px] flex-1 cursor-pointer" onClick={handleChartClick}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                label={{ value: 'Godziny', angle: -90, position: 'insideLeft', style: { fill: '#6B7280', fontSize: 11 } }}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#E5E7EB' }}
                domain={[0, 12]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
              <Bar
                dataKey="regularHours"
                stackId="time"
                fill="#F7941D"
                radius={[4, 4, 0, 0]}
                onClick={handleChartClick}
              />
              <Bar
                dataKey="excessHours"
                stackId="time"
                fill="#9CA3AF"
                radius={[4, 4, 0, 0]}
                onClick={handleChartClick}
              />
              <Bar
                dataKey="overtimeHours"
                stackId="time"
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
                onClick={handleChartClick}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <DashboardWidgetEmpty
          icon={<Clock className="h-5 w-5" />}
          title="Brak zaraportowanego czasu"
          description="Po dodaniu wpisów w ewidencji pojawi się tutaj wykres bieżącego tygodnia."
          className="min-h-[220px] flex-1"
        />
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>Bieżący tydzień</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#F7941D]" />
            Plan
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Powyżej etatu, niezgłoszone
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Nadgodziny
          </span>
        </div>
        <button
          onClick={handleChartClick}
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
        >
          Zobacz szczegóły →
        </button>
      </div>
    </WidgetCard>
  );
};

export default TimeChartWidget;
