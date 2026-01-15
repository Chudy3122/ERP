import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Save } from 'lucide-react';
import * as ticketApi from '../api/ticket.api';
import * as projectApi from '../api/project.api';
import { CreateTicketRequest, TicketType, TicketStatus, TicketPriority } from '../types/ticket.types';
import { Project } from '../types/project.types';

const TicketForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<CreateTicketRequest>({
    title: '',
    description: '',
    type: 'bug' as TicketType,
    status: 'open' as TicketStatus,
    priority: 'normal' as TicketPriority,
    category: '',
    project_id: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
    if (isEdit && id) {
      loadTicket();
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

  const loadTicket = async () => {
    try {
      setIsLoading(true);
      const ticket = await ticketApi.getTicketById(id!);
      setFormData({
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category || '',
        project_id: ticket.project_id,
      });
    } catch (error) {
      console.error('Failed to load ticket:', error);
      setError('Nie udało się załadować zgłoszenia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Tytuł zgłoszenia jest wymagany');
      return;
    }

    if (!formData.description.trim()) {
      setError('Opis zgłoszenia jest wymagany');
      return;
    }

    try {
      setIsSaving(true);
      if (isEdit && id) {
        await ticketApi.updateTicket(id, formData);
      } else {
        await ticketApi.createTicket(formData);
      }
      navigate('/tickets');
    } catch (error: any) {
      console.error('Failed to save ticket:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać zgłoszenia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie'}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie'}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edytuj zgłoszenie' : 'Nowe zgłoszenie'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Zaktualizuj informacje o zgłoszeniu' : 'Utwórz nowe zgłoszenie problemu lub prośby'}
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
          {/* Ticket Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Tytuł zgłoszenia *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. Błąd przy logowaniu użytkownika"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Typ zgłoszenia *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="bug">Błąd</option>
              <option value="feature_request">Nowa funkcja</option>
              <option value="support">Wsparcie</option>
              <option value="question">Pytanie</option>
              <option value="other">Inne</option>
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
              <option value="normal">Normalny</option>
              <option value="high">Wysoki</option>
              <option value="urgent">Pilne</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Kategoria
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="np. Logowanie, Płatności"
            />
          </div>

          {/* Project */}
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
              Projekt (opcjonalne)
            </label>
            <select
              id="project_id"
              name="project_id"
              value={formData.project_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">Brak projektu</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.code})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Opis zgłoszenia *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              placeholder="Opisz szczegółowo problem lub prośbę..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
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
                {isEdit ? 'Zapisz zmiany' : 'Utwórz zgłoszenie'}
              </>
            )}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default TicketForm;
