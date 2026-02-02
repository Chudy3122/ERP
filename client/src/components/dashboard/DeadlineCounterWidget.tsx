import { useEffect, useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../widgets/WidgetCard';
import { client } from '../../api/client';

interface DeadlineCounts {
  today: number;
  tomorrow: number;
  week: number;
  twoWeeks: number;
}

const DeadlineCounterWidget = () => {
  const [counts, setCounts] = useState<DeadlineCounts>({
    today: 0,
    tomorrow: 0,
    week: 0,
    twoWeeks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeadlineCounts();
  }, []);

  const fetchDeadlineCounts = async () => {
    try {
      setIsLoading(true);

      // Fetch tasks for different deadline ranges
      const [todayRes, tomorrowRes, weekRes, twoWeeksRes] = await Promise.all([
        client.get('/tasks/upcoming-deadlines?days=0'),
        client.get('/tasks/upcoming-deadlines?days=1'),
        client.get('/tasks/upcoming-deadlines?days=7'),
        client.get('/tasks/upcoming-deadlines?days=14'),
      ]);

      setCounts({
        today: todayRes.data.length,
        tomorrow: tomorrowRes.data.length,
        week: weekRes.data.length,
        twoWeeks: twoWeeksRes.data.length,
      });
    } catch (error) {
      console.error('Error fetching deadline counts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCounterClick = (filter: string) => {
    navigate(`/tasks?due=${filter}`);
  };

  if (isLoading) {
    return (
      <WidgetCard
        title="Terminarz moich zadań"
        icon={<Calendar className="w-5 h-5 text-gray-600" />}
      >
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            </div>
          ))}
        </div>
      </WidgetCard>
    );
  }

  const counters = [
    {
      label: 'Na dziś',
      value: counts.today,
      color: 'gray',
      bgColor: 'bg-white',
      textColor: 'text-gray-900',
      borderColor: 'border-gray-300',
      filter: 'today',
      urgent: true,
    },
    {
      label: 'Na jutro',
      value: counts.tomorrow,
      color: 'gray',
      bgColor: 'bg-white',
      textColor: 'text-gray-900',
      borderColor: 'border-gray-300',
      filter: 'tomorrow',
      urgent: false,
    },
    {
      label: 'Na 7 dni',
      value: counts.week,
      color: 'gray',
      bgColor: 'bg-white',
      textColor: 'text-gray-900',
      borderColor: 'border-gray-300',
      filter: 'week',
      urgent: false,
    },
    {
      label: 'Na 14 dni',
      value: counts.twoWeeks,
      color: 'gray',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200',
      filter: 'twoweeks',
      urgent: false,
    },
  ];

  const totalUrgent = counts.today + counts.tomorrow;

  return (
    <WidgetCard
      title="Terminarz moich zadań"
      icon={<Calendar className="w-5 h-5 text-gray-600" />}
      actions={
        totalUrgent > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
            <AlertCircle className="w-3 h-3" />
            <span>{totalUrgent} pilnych</span>
          </div>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {counters.map((counter) => (
          <button
            key={counter.label}
            onClick={() => handleCounterClick(counter.filter)}
            className={`${counter.bgColor} dark:bg-gray-700 ${counter.borderColor} dark:border-gray-600 border rounded-md p-1.5 text-center hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-gray-400`}
          >
            <div className={`text-xl font-bold ${counter.textColor} dark:text-white`}>
              {counter.value}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {counter.label}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Wszystkich zadań:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{counts.twoWeeks}</span>
        </div>
      </div>
    </WidgetCard>
  );
};

export default DeadlineCounterWidget;
