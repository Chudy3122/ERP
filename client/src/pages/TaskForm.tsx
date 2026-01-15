import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Save } from 'lucide-react';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import { CreateTaskRequest, TaskStatus, TaskPriority } from '../types/task.types';
import { Project } from '../types/project.types';

const TaskForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    project_id: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    assigned_to: undefined,
    due_date: '',
    estimated_hours: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
    if (isEdit && id) {
      loadTask();
    }
  }, [id, isEdit]);

  const loadProjects = async () => {
    try {
      const result = await projectApi.getMyProjects();
      setProjects(result);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const task = await taskApi.getTaskById(id!);
      setFormData({
        title: task.title,
        description: task.description || '',
        project_id: task.project_id,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        estimated_hours: task.estimated_hours,
      });
    } catch (error) {
      console.error('Failed to load task:', error);
      setError('Nie udało się załadować zadania');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Tytuł zadania jest wymagany');
      return;
    }

    if (!formData.project_id) {
      setError('Projekt jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      if (isEdit && id) {
        await taskApi.updateTask(id, formData);
      } else {
        await taskApi.createTask(formData);
      }
      navigate('/tasks');
    } catch (error: any) {
      console.error('Failed to save task:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać zadania');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimated_hours' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Zaktualizuj informacje o zadaniu' : 'Utwórz nowe zadanie w projekcie'}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Tytuł zadania *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. Implementacja modułu logowania"
            />
          </div>

          {/* Project */}
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
              Projekt *
            </label>
            <select
              id="project_id"
              name="project_id"
              value={formData.project_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">Wybierz projekt</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="todo">Do zrobienia</option>
              <option value="in_progress">W trakcie</option>
              <option value="review">W weryfikacji</option>
              <option value="done">Ukończone</option>
              <option value="blocked">Zablokowane</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priorytet
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="low">Niski</option>
              <option value="medium">Średni</option>
              <option value="high">Wysoki</option>
              <option value="urgent">Pilne</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
              Termin realizacji
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          {/* Estimated Hours */}
          <div>
            <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
              Szacowany czas (godziny)
            </label>
            <input
              type="number"
              id="estimated_hours"
              name="estimated_hours"
              value={formData.estimated_hours || ''}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. 8"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Opis zadania
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="Opisz szczegóły zadania..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Zapisz zmiany' : 'Utwórz zadanie'}
              </>
            )}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default TaskForm;
