import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { confirmDelete } from '../utils/confirm';
import {
  Plus,
  Pencil,
  Trash2,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  X,
  GripVertical,
  Search,
  CheckSquare,
  CalendarDays,
  Copy,
  Layers,
  Loader2,
} from 'lucide-react';
import * as templateApi from '../api/projectTemplate.api';
import {
  ProjectTemplate,
  ProjectTemplateStage,
  ProjectTemplateTask,
  CreateTemplateRequest,
  TemplateTaskPriority,
} from '../types/projectTemplate.types';

const PRIORITY_LABELS: Record<TemplateTaskPriority, string> = {
  [TemplateTaskPriority.LOW]: 'Niski',
  [TemplateTaskPriority.MEDIUM]: 'Średni',
  [TemplateTaskPriority.HIGH]: 'Wysoki',
  [TemplateTaskPriority.URGENT]: 'Pilny',
};

const DEFAULT_COLORS = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#14B8A6'];

const ProjectTemplates = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStages, setFormStages] = useState<Omit<ProjectTemplateStage, 'id' | 'template_id'>[]>([
    { name: 'Do zrobienia', color: '#6B7280', position: 0, is_completed_stage: false },
    { name: 'W trakcie', color: '#3B82F6', position: 1, is_completed_stage: false },
    { name: 'Zakończone', color: '#10B981', position: 2, is_completed_stage: true },
  ]);
  const [formTasks, setFormTasks] = useState<Omit<ProjectTemplateTask, 'id' | 'template_id'>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await templateApi.getAllTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Nie udało się pobrać szablonów projektów');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormStages([
      { name: 'Do zrobienia', color: '#6B7280', position: 0, is_completed_stage: false },
      { name: 'W trakcie', color: '#3B82F6', position: 1, is_completed_stage: false },
      { name: 'Zakończone', color: '#10B981', position: 2, is_completed_stage: true },
    ]);
    setFormTasks([]);
    setEditingTemplate(null);
    setError('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (template: ProjectTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDescription(template.description || '');
    setFormStages(
      [...(template.stages || [])]
        .sort((a, b) => a.position - b.position)
        .map(s => ({ name: s.name, description: s.description, color: s.color, position: s.position, is_completed_stage: s.is_completed_stage }))
    );
    setFormTasks(
      [...(template.tasks || [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map(t => ({ stage_position: t.stage_position, title: t.title, description: t.description, priority: t.priority, estimated_hours: t.estimated_hours, order_index: t.order_index }))
    );
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError('Nazwa jest wymagana'); return; }
    if (formStages.length === 0) { setError('Dodaj przynajmniej jeden etap'); return; }
    if (formStages.some(stage => !stage.name.trim())) {
      setError('Każdy etap musi mieć nazwę');
      return;
    }
    if (formStages.filter(stage => stage.is_completed_stage).length !== 1) {
      setError('Wybierz dokładnie jeden etap końcowy');
      return;
    }
    if (formTasks.some(task => !task.title.trim())) {
      setError('Każde zadanie musi mieć nazwę');
      return;
    }
    if (
      formTasks.some(
        task =>
          !Number.isInteger(task.stage_position) ||
          task.stage_position < 0 ||
          task.stage_position >= formStages.length,
      )
    ) {
      setError('Każde zadanie musi być przypisane do istniejącego etapu');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload: CreateTemplateRequest = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        stages: formStages.map((stage, index) => ({
          ...stage,
          name: stage.name.trim(),
          description: stage.description?.trim() || undefined,
          position: index,
        })),
        tasks: formTasks.map((task, index) => ({
          ...task,
          title: task.title.trim(),
          description: task.description?.trim() || undefined,
          order_index: index,
        })),
      };

      const wasEditing = Boolean(editingTemplate);

      if (editingTemplate) {
        await templateApi.updateTemplate(editingTemplate.id, payload);
      } else {
        await templateApi.createTemplate(payload);
      }

      setShowForm(false);
      resetForm();
      await loadTemplates();
      toast.success(wasEditing ? 'Zmiany w szablonie zostały zapisane' : 'Szablon został utworzony');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Nie udało się zapisać szablonu';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete('Czy na pewno chcesz usunąć ten szablon?'))) return;
    try {
      await templateApi.deleteTemplate(id);
      if (expandedId === id) setExpandedId(null);
      await loadTemplates();
      toast.success('Szablon został usunięty');
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      toast.error(err.response?.data?.message || 'Nie udało się usunąć szablonu');
    }
  };

  // Stage helpers
  const addStage = () => {
    setFormStages([...formStages, {
      name: '',
      color: DEFAULT_COLORS[formStages.length % DEFAULT_COLORS.length],
      position: formStages.length,
      is_completed_stage: false,
    }]);
  };

  const removeStage = (index: number) => {
    if (formStages.length === 1) {
      setError('Szablon musi zawierać przynajmniej jeden etap');
      return;
    }

    const fallbackStagePosition = Math.max(0, index - 1);
    const removedStageWasCompleted = formStages[index].is_completed_stage;
    setFormStages(currentStages => {
      const remainingStages = currentStages.filter((_, stageIndex) => stageIndex !== index);

      if (removedStageWasCompleted) {
        const nextCompletedStageIndex = Math.min(fallbackStagePosition, remainingStages.length - 1);
        return remainingStages.map((stage, stageIndex) => ({
          ...stage,
          is_completed_stage: stageIndex === nextCompletedStageIndex,
        }));
      }

      return remainingStages;
    });
    setFormTasks(currentTasks =>
      currentTasks.map(task => ({
        ...task,
        stage_position:
          task.stage_position === index
            ? fallbackStagePosition
            : task.stage_position > index
              ? task.stage_position - 1
              : task.stage_position,
      }))
    );
    setError('');
  };

  const updateStage = (index: number, field: string, value: any) => {
    if (field === 'is_completed_stage' && value === true) {
      setFormStages(currentStages =>
        currentStages.map((stage, stageIndex) => ({
          ...stage,
          is_completed_stage: stageIndex === index,
        })),
      );
      setError('');
      return;
    }

    const updated = [...formStages];
    (updated[index] as any)[field] = value;
    setFormStages(updated);
    setError('');
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= formStages.length) return;

    setFormStages(currentStages => {
      const updated = [...currentStages];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return updated;
    });
    setFormTasks(currentTasks =>
      currentTasks.map(task => {
        if (task.stage_position === index) return { ...task, stage_position: targetIndex };
        if (task.stage_position === targetIndex) return { ...task, stage_position: index };
        return task;
      })
    );
  };

  // Task helpers
  const addTask = () => {
    setFormTasks([...formTasks, {
      stage_position: 0,
      title: '',
      priority: TemplateTaskPriority.MEDIUM,
      order_index: formTasks.length,
    }]);
  };

  const removeTask = (index: number) => {
    setFormTasks(formTasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: any) => {
    const updated = [...formTasks];
    (updated[index] as any)[field] = value;
    setFormTasks(updated);
    setError('');
  };

  const moveTask = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= formTasks.length) return;

    setFormTasks(currentTasks => {
      const updated = [...currentTasks];
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return updated;
    });
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredTemplates = templates.filter(template => {
    if (!normalizedSearchQuery) return true;

    return [
      template.name,
      template.description || '',
      ...(template.stages || []).map(stage => stage.name),
      ...(template.tasks || []).map(task => task.title),
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearchQuery);
  });

  const formatTemplateDate = (date: string) =>
    new Date(date).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const getPriorityClasses = (priority: TemplateTaskPriority) => {
    switch (priority) {
      case TemplateTaskPriority.URGENT:
        return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
      case TemplateTaskPriority.HIGH:
        return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300';
      case TemplateTaskPriority.LOW:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const getDuplicateName = (sourceName: string) => {
    const existingNames = new Set(templates.map(template => template.name.trim().toLocaleLowerCase('pl')));
    let copyNumber = 1;
    let candidate = `${sourceName} (kopia)`;

    while (existingNames.has(candidate.toLocaleLowerCase('pl'))) {
      copyNumber += 1;
      candidate = `${sourceName} (kopia ${copyNumber})`;
    }

    return candidate;
  };

  const handleDuplicate = async (template: ProjectTemplate) => {
    if (duplicatingId) return;

    setDuplicatingId(template.id);

    try {
      const sortedStages = [...(template.stages || [])].sort((a, b) => a.position - b.position);
      const sortedTasks = [...(template.tasks || [])].sort((a, b) => a.order_index - b.order_index);
      const stagePositionMap = new Map(
        sortedStages.map((stage, index) => [stage.position, index]),
      );
      const completedStageIndex = sortedStages.findIndex(stage => stage.is_completed_stage);

      const payload: CreateTemplateRequest = {
        name: getDuplicateName(template.name),
        description: template.description || undefined,
        stages: sortedStages.map((stage, index) => ({
          name: stage.name,
          description: stage.description || undefined,
          color: stage.color,
          position: index,
          is_completed_stage:
            completedStageIndex >= 0
              ? index === completedStageIndex
              : index === sortedStages.length - 1,
        })),
        tasks: sortedTasks.map((task, index) => ({
          stage_position: stagePositionMap.get(task.stage_position) ?? 0,
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          order_index: index,
        })),
      };

      const duplicatedTemplate = await templateApi.createTemplate(payload);
      await loadTemplates();
      setExpandedId(duplicatedTemplate.id);
      toast.success('Szablon został zduplikowany');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Nie udało się zduplikować szablonu');
    } finally {
      setDuplicatingId(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title={t('projectTemplates.title', 'Szablony projektów')}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('projectTemplates.title', 'Szablony projektów')}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Moduł projektów</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">
              {t('projectTemplates.title', 'Szablony projektów')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {t('projectTemplates.subtitle', 'Przeglądaj, edytuj i usuwaj gotowe układy etapów oraz zadań.')}
            </p>
          </div>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <Plus className="w-4 h-4" />
          {t('projectTemplates.create', 'Nowy szablon')}
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Zapisane szablony</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredTemplates.length} z {templates.length} szablonów
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Szukaj po nazwie, etapie lub zadaniu..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-white"
                aria-label="Wyczyść wyszukiwanie"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-form-title"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
          >
            <div className="flex flex-none items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-700">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D]">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="template-form-title" className="text-xl font-semibold text-gray-950 dark:text-white">
                    {editingTemplate ? 'Edytuj szablon' : 'Nowy szablon'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formStages.length} etapów, {formTasks.length} zadań
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                aria-label="Zamknij formularz"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <section>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Informacje podstawowe</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">Nazwa i przeznaczenie szablonu</h3>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nazwa szablonu *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={event => { setFormName(event.target.value); setError(''); }}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="np. Wdrożenie nowego klienta"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Opis
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={event => setFormDescription(event.target.value)}
                      rows={2}
                      className="min-h-10 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="Krótko opisz, do jakich projektów służy ten szablon"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-7 border-t border-gray-100 pt-6 dark:border-gray-700">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Etapy projektu</p>
                    <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">Kolejność kolumn kanbana</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addStage}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-[#F7941D]/40 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <Plus className="h-4 w-4" /> Dodaj etap
                  </button>
                </div>
                <div className="space-y-3">
                  {formStages.map((stage, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-200">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="grid gap-3 md:grid-cols-[72px_minmax(0,1fr)_auto]">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Kolor</label>
                              <input
                                type="color"
                                value={stage.color}
                                onChange={event => updateStage(index, 'color', event.target.value)}
                                className="h-10 w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-700"
                                aria-label={`Kolor etapu ${index + 1}`}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Nazwa etapu *</label>
                              <input
                                type="text"
                                value={stage.name}
                                onChange={event => updateStage(index, 'name', event.target.value)}
                                placeholder="Nazwa etapu"
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            <div className="flex items-end gap-1">
                              <button type="button" onClick={() => moveStage(index, -1)} disabled={index === 0} className="inline-flex h-10 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#F7941D] disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-600 dark:bg-gray-700" title="Przesuń etap wyżej">
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => moveStage(index, 1)} disabled={index === formStages.length - 1} className="inline-flex h-10 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#F7941D] disabled:cursor-not-allowed disabled:opacity-35 dark:border-gray-600 dark:bg-gray-700" title="Przesuń etap niżej">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => removeStage(index)} className="inline-flex h-10 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-gray-400 hover:bg-red-50 hover:text-red-600 dark:border-red-900/40 dark:bg-gray-700" title="Usuń etap">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                            <textarea
                              value={stage.description || ''}
                              onChange={event => updateStage(index, 'description', event.target.value)}
                              rows={2}
                              placeholder="Opis etapu (opcjonalnie)"
                              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                              <input
                                type="radio"
                                name="completed-template-stage"
                                checked={stage.is_completed_stage}
                                onChange={() => updateStage(index, 'is_completed_stage', true)}
                                className="h-4 w-4 border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                              />
                              Etap końcowy
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-7 border-t border-gray-100 pt-6 dark:border-gray-700">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Zadania startowe</p>
                    <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">Zadania tworzone razem z projektem</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addTask}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-[#F7941D]/40 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <Plus className="h-4 w-4" /> Dodaj zadanie
                  </button>
                </div>
                <div className="space-y-3">
                  {formTasks.map((task, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Zadanie {index + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveTask(index, -1)} disabled={index === 0} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-[#F7941D] disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700" title="Przesuń zadanie wyżej">
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => moveTask(index, 1)} disabled={index === formTasks.length - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-[#F7941D] disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700" title="Przesuń zadanie niżej">
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => removeTask(index)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Usuń zadanie">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_150px_110px]">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Nazwa zadania *</label>
                          <input
                            type="text"
                            value={task.title}
                            onChange={event => updateTask(index, 'title', event.target.value)}
                            placeholder="Nazwa zadania"
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Etap</label>
                          <select
                            value={task.stage_position}
                            onChange={event => updateTask(index, 'stage_position', Number(event.target.value))}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            {formStages.map((stage, stageIndex) => (
                              <option key={stageIndex} value={stageIndex}>{stage.name || `Etap ${stageIndex + 1}`}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Priorytet</label>
                          <select
                            value={task.priority}
                            onChange={event => updateTask(index, 'priority', event.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Szacunek (h)</label>
                          <input
                            type="number"
                            value={task.estimated_hours || ''}
                            onChange={event => updateTask(index, 'estimated_hours', event.target.value ? Number(event.target.value) : undefined)}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            min="0"
                            step="0.5"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <textarea
                        value={task.description || ''}
                        onChange={event => updateTask(index, 'description', event.target.value)}
                        rows={2}
                        placeholder="Opis zadania (opcjonalnie)"
                        className="mt-3 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  ))}
                  {formTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-700">
                      <CheckSquare className="mx-auto h-7 w-7 text-gray-300 dark:text-gray-600" />
                      <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">Szablon nie zawiera jeszcze zadań</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Możesz utworzyć sam układ etapów albo dodać gotowe zadania startowe.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pola oznaczone * są wymagane.</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  {isSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {editingTemplate ? 'Zapisz zmiany' : 'Utwórz szablon'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <LayoutTemplate className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {templates.length === 0 ? 'Brak szablonów' : 'Brak pasujących szablonów'}
          </h3>
          <p className="text-gray-500 mb-4">
            {templates.length === 0 ? 'Utwórz pierwszy szablon projektu' : 'Zmień wyszukiwaną frazę.'}
          </p>
          {templates.length === 0 && (
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Nowy szablon
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => {
            const sortedStages = [...(template.stages || [])].sort((a, b) => a.position - b.position);
            const sortedTasks = [...(template.tasks || [])].sort((a, b) => a.order_index - b.order_index);
            const isExpanded = expandedId === template.id;

            return (
              <article
                key={template.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    className="flex min-w-0 flex-1 items-start gap-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D]">
                      <LayoutTemplate className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-gray-950 dark:text-white">{template.name}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          <Layers className="h-3.5 w-3.5" />
                          {sortedStages.length} etapów
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          <CheckSquare className="h-3.5 w-3.5" />
                          {sortedTasks.length} zadań
                        </span>
                      </span>
                      <span className="mt-1.5 block max-w-3xl text-sm leading-5 text-gray-500 dark:text-gray-400">
                        {template.description || 'Szablon bez dodatkowego opisu.'}
                      </span>
                      <span className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Aktualizacja: {formatTemplateDate(template.updated_at)}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditForm(template)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                      title="Edytuj szablon"
                      aria-label={`Edytuj szablon ${template.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      disabled={duplicatingId !== null}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
                      title="Duplikuj szablon"
                      aria-label={`Duplikuj szablon ${template.name}`}
                    >
                      {duplicatingId === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Usuń szablon"
                      aria-label={`Usuń szablon ${template.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : template.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                      aria-label={isExpanded ? `Zwiń szablon ${template.name}` : `Rozwiń szablon ${template.name}`}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/70 p-5 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Podgląd struktury</p>
                      <h4 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        Etapy i przypisane zadania
                      </h4>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {sortedStages.map(stage => {
                        const stageTasks = sortedTasks.filter(task => task.stage_position === stage.position);

                        return (
                          <section
                            key={stage.id || stage.position}
                            className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                          >
                            <div className="h-1" style={{ backgroundColor: stage.color }} />
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h5>
                                  {stage.description && (
                                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{stage.description}</p>
                                  )}
                                </div>
                                {stage.is_completed_stage && (
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    Końcowy
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 space-y-2">
                                {stageTasks.length > 0 ? (
                                  stageTasks.map(task => (
                                    <div
                                      key={task.id || `${stage.position}-${task.order_index}`}
                                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="min-w-0 text-sm font-medium text-gray-800 dark:text-gray-200">
                                          {task.title}
                                        </span>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getPriorityClasses(task.priority)}`}>
                                          {PRIORITY_LABELS[task.priority] || task.priority}
                                        </span>
                                      </div>
                                      {task.description && (
                                        <p className="mt-1 whitespace-pre-line text-xs leading-5 text-gray-500 dark:text-gray-400">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                                    Brak zadań w tym etapie
                                  </div>
                                )}
                              </div>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
};

export default ProjectTemplates;
