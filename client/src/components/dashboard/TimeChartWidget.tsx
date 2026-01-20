import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../widgets/WidgetCard';
import { getUserTimeEntries } from '../../api/time.api';

interface TimeData {
  date: string;
  hours: number;
  minutes: number;
  displayDate: string;
  isOvertime: boolean;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TimeData;
    const totalMinutes = data.hours * 60 + data.minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const overtime = totalMinutes > 480 ? totalMinutes - 480 : 0;
    const overtimeHours = Math.floor(overtime / 60);
    const overtimeMins = overtime % 60;

    return (
      <div className="bg-white border border-gray-200 rounded-md shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{data.displayDate}</p>
        <p className="text-sm text-gray-700">
          Czas pracy: <span className="font-medium">{hours}h {mins}m</span>
        </p>
        {overtime > 0 && (
          <p className="text-sm text-orange-600 mt-1">
            Nadgodziny: <span className="font-medium">{overtimeHours}h {overtimeMins}m</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const TimeChartWidget = () => {
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTimeData();
  }, []);

  const fetchTimeData = async () => {
    try {
      setIsLoading(true);

      // Get last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);

      const entries = await getUserTimeEntries(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Transform data for chart - group by day
      const chartData: TimeData[] = [];
      const dates: Date[] = [];

      // Generate all dates in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }

      // Group entries by date
      const entriesByDate: Record<string, number> = {};
      entries.forEach(entry => {
        const entryDate = new Date(entry.clock_in).toISOString().split('T')[0];
        const minutes = entry.duration_minutes || 0;
        entriesByDate[entryDate] = (entriesByDate[entryDate] || 0) + minutes;
      });

      dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const totalMinutes = entriesByDate[dateStr] || 0;

        chartData.push({
          date: dateStr,
          hours: parseFloat((totalMinutes / 60).toFixed(2)), // Decimal hours for chart
          minutes: totalMinutes % 60,
          displayDate: date.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' }),
          isOvertime: totalMinutes > 480, // 8 hours = 480 minutes
        });
      });

      setTimeData(chartData);
    } catch (error) {
      console.error('Error fetching time data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChartClick = () => {
    navigate('/time-tracking');
  };

  if (isLoading) {
    return (
      <WidgetCard
        title="Mój zaraportowany czas"
        icon={<Clock className="w-5 h-5 text-gray-600" />}
      >
        <div className="h-[140px] flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="flex justify-between">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-4 w-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </WidgetCard>
    );
  }

  const totalHours = timeData.reduce((sum, day) => sum + day.hours, 0);
  const avgHours = timeData.length > 0 ? (totalHours / timeData.length).toFixed(1) : '0';
  const daysWorked = timeData.filter(day => day.hours > 0).length;

  return (
    <WidgetCard
      title="Mój zaraportowany czas"
      icon={<Clock className="w-5 h-5 text-gray-600" />}
      actions={
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-gray-500">Dni: </span>
            <span className="font-semibold text-gray-900">{daysWorked}/7</span>
          </div>
          <div>
            <span className="text-gray-500">Średnia: </span>
            <span className="font-semibold text-gray-900">{avgHours}h</span>
          </div>
        </div>
      }
    >
      <div className="h-[140px] cursor-pointer" onClick={handleChartClick}>
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
              dataKey="hours"
              fill="#6B7280"
              radius={[4, 4, 0, 0]}
              onClick={() => navigate('/time-tracking')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Ostatnie 7 dni</span>
        <button
          onClick={handleChartClick}
          className="text-gray-700 hover:text-gray-900 font-medium"
        >
          Zobacz szczegóły →
        </button>
      </div>
    </WidgetCard>
  );
};

export default TimeChartWidget;
