import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Save,
  LayoutTemplate,
  FolderPlus,
  Search,
  Users,
  ChevronDown,
  Check,
} from 'lucide-react';
import * as projectApi from '../api/project.api';
import * as templateApi from '../api/projectTemplate.api';
import * as adminApi from '../api/admin.api';
import {
  CreateProjectRequest,
  ProjectMemberRole,
  ProjectStatus,
  ProjectPriority,
} from '../types/project.types';
import { ProjectTemplate } from '../types/projectTemplate.types';
import { AdminUser } from '../types/admin.types';
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
    manager_id: user?.id,
  });

  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isMemberSelectOpen, setIsMemberSelectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOngoingProject, setIsOngoingProject] = useState(false);
  const [lastPriorityBeforeOngoing, setLastPriorityBeforeOngoing] = useState<ProjectPriority>(
    ProjectPriority.MEDIUM
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      loadProject();
    }
    if (!isEdit) {
      templateApi.getAllTemplates().then(setTemplates).catch(console.error);
      adminApi.getUsers().then(setUsers).catch(console.error);
    }
  }, [id, isEdit]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const project = await projectApi.getProjectById(id!);
      const hasTargetEndDate = Boolean(project.target_end_date);
      const projectPriority = project.priority || ProjectPriority.MEDIUM;
      setFormData({
        name: project.name,
        code: project.code,
        description: project.description || '',
        status: project.status,
        priority: hasTargetEndDate ? projectPriority : ProjectPriority.MEDIUM,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        target_end_date: hasTargetEndDate ? project.target_end_date!.split('T')[0] : '',
        budget: project.budget,
        manager_id: project.manager_id,
      });
      setIsOngoingProject(!hasTargetEndDate);
      setLastPriorityBeforeOngoing(projectPriority);
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
      const projectPayload = {
        ...formData,
        priority: isOngoingProject ? ProjectPriority.MEDIUM : formData.priority,
        target_end_date: isOngoingProject ? '' : formData.target_end_date,
      };

      if (isEdit && id) {
        await projectApi.updateProject(id, projectPayload);
      } else {
        const newProject = await projectApi.createProject(projectPayload);
        await projectApi.createDefaultStages(newProject.id, projectPayload.template_id);

        const initialMembers = [
          ...(user?.id ? [{ userId: user.id, role: ProjectMemberRole.LEAD }] : []),
          ...selectedMemberIds.map(memberId => ({
            userId: memberId,
            role: ProjectMemberRole.MEMBER,
          })),
        ];

        for (const member of initialMembers) {
          try {
            await projectApi.addProjectMember(newProject.id, member.userId, member.role);
          } catch (error: any) {
            const message = error.response?.data?.message || error.message || '';
            if (!String(message).toLowerCase().includes('already')) {
              console.warn('Failed to add initial project member:', error);
            }
          }
        }
      }
      navigate('/projects');
    } catch (error: any) {
      console.error('Failed to save project:', error);
      setError(error.response?.data?.message || 'Nie udało się zapisać projektu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'priority') {
      setLastPriorityBeforeOngoing(value as ProjectPriority);
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  const handleOngoingProjectChange = (checked: boolean) => {
    setIsOngoingProject(checked);

    if (checked) {
      setLastPriorityBeforeOngoing(formData.priority);
      setFormData(prev => ({
        ...prev,
        priority: ProjectPriority.MEDIUM,
        target_end_date: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        priority: lastPriorityBeforeOngoing,
      }));
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const getMemberName = (member: AdminUser) =>
    `${member.first_name} ${member.last_name}`.trim() || member.email;

  const availableMembers = users
    .filter(userItem => userItem.is_active && userItem.id !== user?.id)
    .sort((firstUser, secondUser) =>
      getMemberName(firstUser).localeCompare(getMemberName(secondUser), 'pl', {
        sensitivity: 'base',
      })
    );

  const filteredMembers = availableMembers.filter(userItem => {
    const query = memberSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      userItem.first_name,
      userItem.last_name,
      userItem.email,
      userItem.position || '',
      userItem.department || '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const selectedMembers = availableMembers.filter(member => selectedMemberIds.includes(member.id));

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? 'Edytuj projekt' : 'Nowy projekt'}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-center py-16">
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#F7941D]"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Ładowanie formularza projektu...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? 'Edytuj projekt' : 'Nowy projekt'}>
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#F7941D]/40 dark:hover:bg-[#F7941D]/10"
              aria-label="Wróć do listy projektów"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D]">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                  {isEdit ? 'Edycja projektu' : 'Nowy projekt'}
                </p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isEdit ? 'Edytuj projekt' : 'Nowy projekt'}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                  {isEdit
                    ? 'Zaktualizuj informacje o projekcie, terminach i priorytecie.'
                    : 'Utwórz projekt, który później połączysz z zadaniami i harmonogramem zespołu.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Template selector (only for new projects) */}
        {!isEdit && templates.length > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Szablon projektu (opcjonalnie)
              </h3>
            </div>
            <select
              value={formData.template_id || ''}
              onChange={e =>
                setFormData(prev => ({ ...prev, template_id: e.target.value || undefined }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
              <option value="">Bez szablonu (domyślne etapy)</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.stages?.length || 0} etapów, {t.tasks?.length || 0} zadań)
                </option>
              ))}
            </select>
            {formData.template_id && (
              <p className="mt-2 text-xs text-gray-500">
                Po utworzeniu projektu zostaną automatycznie utworzone etapy i zadania z wybranego
                szablonu.
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nazwa projektu *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="np. System ERP"
              />
            </div>

            {/* Project Code */}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Kod projektu *
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="np. ERP-001"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
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
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Priorytet
              </label>
              <select
                id="priority"
                name="priority"
                value={isOngoingProject ? 'fixed' : formData.priority}
                onChange={handleChange}
                disabled={isOngoingProject}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
              >
                {isOngoingProject && <option value="fixed">Stały</option>}
                <option value="low">Niski</option>
                <option value="medium">Średni</option>
                <option value="high">Wysoki</option>
                <option value="critical">Krytyczny</option>
              </select>
              {isOngoingProject && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Priorytet stały wynika z oznaczenia projektu jako ciągłego.
                </p>
              )}
            </div>

            {/* Budget */}
            <div>
              <label
                htmlFor="budget"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="np. 500000"
              />
            </div>

            {/* Start Date */}
            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Data rozpoczęcia
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Target End Date */}
            <div>
              <label
                htmlFor="target_end_date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Planowana data zakończenia
              </label>
              <input
                type="date"
                id="target_end_date"
                name="target_end_date"
                value={formData.target_end_date}
                onChange={handleChange}
                disabled={isOngoingProject}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
              />
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isOngoingProject}
                  onChange={e => handleOngoingProjectChange(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                />
                <span>
                  <span className="block font-medium text-gray-900 dark:text-white">
                    Projekt ciągły - brak planowanej daty zakończenia
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                    Użyj dla stałych projektów, do których pracownicy regularnie dopisują czas
                    pracy.
                  </span>
                </span>
              </label>
            </div>

            {!isEdit && (
              <div className="md:col-span-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#F7941D]" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Zespół projektu
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Autor zostanie dodany automatycznie. Tutaj możesz od razu wskazać pozostałe
                        osoby.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                      Wybrano: {selectedMemberIds.length}
                    </span>
                  </div>

                  <div className="relative mt-4">
                    <button
                      type="button"
                      onClick={() => setIsMemberSelectOpen(open => !open)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm text-gray-900 transition-colors hover:border-[#F7941D]/50 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <span className="min-w-0">
                        {selectedMembers.length > 0 ? (
                          <span className="block truncate">
                            {selectedMembers.map(member => getMemberName(member)).join(', ')}
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            Wybierz pracowników do projektu
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
                          isMemberSelectOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {selectedMembers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedMembers.map(member => (
                          <span
                            key={member.id}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                          >
                            {getMemberName(member)}
                          </span>
                        ))}
                      </div>
                    )}

                    {isMemberSelectOpen && (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-100 p-3 dark:border-gray-700">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={memberSearch}
                              onChange={e => setMemberSearch(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              placeholder="Szukaj po imieniu, nazwisku, e-mailu, stanowisku..."
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {filteredMembers.length > 0 ? (
                            filteredMembers.map(member => {
                              const isSelected = selectedMemberIds.includes(member.id);
                              const memberName = getMemberName(member);

                              return (
                                <label
                                  key={member.id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                                    isSelected
                                      ? 'border-slate-700 bg-slate-100 dark:border-slate-400 dark:bg-slate-700/50'
                                      : 'border-gray-200 bg-white hover:border-[#F7941D]/40 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-800'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMemberSelection(member.id)}
                                    className="sr-only"
                                  />
                                  <span
                                    className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                                      isSelected
                                        ? 'border-[#F7941D] bg-[#F7941D]'
                                        : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium text-gray-900 dark:text-white">
                                      {memberName}
                                    </span>
                                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                      {member.position || member.department || member.email}
                                    </span>
                                  </span>
                                </label>
                              );
                            })
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 md:col-span-2">
                              Brak osób pasujących do wyszukiwania.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Opis projektu
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="Opisz cele i zakres projektu..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
      </div>
    </MainLayout>
  );
};

export default ProjectForm;
