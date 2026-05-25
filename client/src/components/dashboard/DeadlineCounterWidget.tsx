import { useEffect, useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WidgetCard from '../widgets/WidgetCard';
import { getUpcomingDeadlines } from '../../api/task.api';
import { Task, TaskStatus } from '../../types/task.types';
import { DashboardWidgetLoading } from './DashboardWidgetState';

interface DeadlineCounts {
  today: number;
  tomorrow: number;
  week: number;
  twoWeeks: number;
}

const getLocalDayStart = (date: Date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};

const getDaysUntilDueDate = (dueDate: string) => {
  const today = getLocalDayStart(new Date());
  const due = getLocalDayStart(new Date(dueDate));

  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const countTasksInRange = (tasks: Task[], minDay: number, maxDay: number) => {
  return tasks.filter((task) => {
    if (!task.due_date || task.status === TaskStatus.DONE) return false;

    const daysUntilDue = getDaysUntilDueDate(task.due_date);
    return daysUntilDue >= minDay && daysUntilDue <= maxDay;
  }).length;
};

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

      const tasks = await getUpcomingDeadlines(14);

      setCounts({
        today: countTasksInRange(tasks, 0, 0),
        tomorrow: countTasksInRange(tasks, 1, 1),
        week: countTasksInRange(tasks, 2, 7),
        twoWeeks: countTasksInRange(tasks, 8, 14),
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
        <DashboardWidgetLoading label="Ładowanie terminów zadań..." />
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
      label: '2-7 dni',
      value: counts.week,
      color: 'gray',
      bgColor: 'bg-white',
      textColor: 'text-gray-900',
      borderColor: 'border-gray-300',
      filter: 'week',
      urgent: false,
    },
    {
      label: '8-14 dni',
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
      className="h-full"
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
      <div className="grid grid-cols-2 gap-3">
        {counters.map((counter) => (
          <button
            key={counter.label}
            onClick={() => handleCounterClick(counter.filter)}
            className={`${counter.bgColor} dark:bg-gray-700 ${counter.borderColor} dark:border-gray-600 rounded-lg border p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400`}
          >
            <div className={`text-2xl font-bold ${counter.textColor} dark:text-white`}>
              {counter.value}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {counter.label}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">W terminie 14 dni: </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {counts.today + counts.tomorrow + counts.week + counts.twoWeeks}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="shrink-0 font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Moje wszystkie zadania →
          </button>
        </div>
      </div>
    </WidgetCard>
  );
};

export default DeadlineCounterWidget;
