import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { CheckSquare, Plus, Calendar, User } from 'lucide-react';
import * as taskApi from '../api/task.api';
import { Task, TaskStatus, TaskPriority } from '../types/task.types';

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, [searchParams]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const dueFilter = searchParams.get('due');

      if (dueFilter === 'today') {
        const data = await taskApi.getTasksDueToday();
        setTasks(data);
      } else if (dueFilter === 'tomorrow') {
        const data = await taskApi.getTasksDueTomorrow();
        setTasks(data);
      } else if (dueFilter === 'week') {
        const data = await taskApi.getUpcomingDeadlines(7);
        setTasks(data);
      } else if (dueFilter === 'twoweeks') {
        const data = await taskApi.getUpcomingDeadlines(14);
        setTasks(data);
      } else {
        const data = await taskApi.getMyTasks();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-gray-200 text-gray-800',
      review: 'bg-gray-100 text-gray-700',
      done: 'bg-gray-200 text-gray-800',
      blocked: 'bg-gray-100 text-gray-700',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: TaskPriority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-gray-600',
      high: 'text-gray-700',
      urgent: 'text-gray-900',
    };
    return colors[priority];
  };

  return (
    <MainLayout title="Moje zadania">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moje zadania</h1>
          <p className="text-gray-600 mt-1">Zarządzaj swoimi zadaniami i terminami</p>
        </div>
        <button
          onClick={() => navigate('/tasks/new')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nowe zadanie
        </button>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-md border border-gray-200">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="w-1/4 h-16 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zadań</h3>
            <p className="text-gray-600">Świetna robota! Nie masz przypisanych zadań.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {task.project && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-4 h-4" />
                          {task.project.name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString('pl-PL')}
                        </span>
                      )}
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {task.assignee.first_name} {task.assignee.last_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                    <span className="text-sm font-medium">{task.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tasks;
