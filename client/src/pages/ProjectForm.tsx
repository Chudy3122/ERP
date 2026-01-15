import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Save } from 'lucide-react';
import * as projectApi from '../api/project.api';
import { CreateProjectRequest, ProjectStatus, ProjectPriority } from '../types/project.types';
import { useAuth } from '../contexts/AuthContext';

const ProjectForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    code: '',
    description: '',
    status: 'planning' as ProjectStatus,
    priority: 'medium' as ProjectPriority,
    start_date: '',
    target_end_date: '',
    budget: undefined,
    manager_id: user?.userId,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      loadProject();
    }
  }, [id, isEdit]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const project = await projectApi.getProjectById(id!);
      setFormData({
        name: project.name,
        code: project.code,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        target_end_date: project.target_end_date ? project.target_end_date.split('T')[0] : '',
        budget: project.budget,
        manager_id: project.manager_id,
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      setError('Nie udało się załadować projektu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Nazwa projektu jest wymagana');
      return;
    }

    if (!formData.code.trim()) {
      setError('Kod projektu jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      if (isEdit && id) {
        await projectApi.updateProject(id, formData);
      } else {
        await projectApi.createProject(formData);
      }
      navigate('/projects');
    } catch (error: any) {
      console.error('Failed to save project:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać projektu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? 'Edytuj projekt' : 'Nowy projekt'}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj projekt' : 'Nowy projekt'}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edytuj projekt' : 'Nowy projekt'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Zaktualizuj informacje o projekcie' : 'Utwórz nowy projekt w systemie'}
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
          {/* Project Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa projektu *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. System ERP"
            />
          </div>

          {/* Project Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Kod projektu *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. ERP-001"
            />
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
              <option value="planning">Planowanie</option>
              <option value="active">Aktywny</option>
              <option value="on_hold">Wstrzymany</option>
              <option value="completed">Ukończony</option>
              <option value="cancelled">Anulowany</option>
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
              <option value="critical">Krytyczny</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
              Budżet (PLN)
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. 500000"
            />
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Data rozpoczęcia
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          {/* Target End Date */}
          <div>
            <label htmlFor="target_end_date" className="block text-sm font-medium text-gray-700 mb-1">
              Planowana data zakończenia
            </label>
            <input
              type="date"
              id="target_end_date"
              name="target_end_date"
              value={formData.target_end_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Opis projektu
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="Opisz cele i zakres projektu..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/projects')}
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
                {isEdit ? 'Zapisz zmiany' : 'Utwórz projekt'}
              </>
            )}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default ProjectForm;
