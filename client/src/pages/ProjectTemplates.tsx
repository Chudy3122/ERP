import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    if (formTasks.some(task => !task.title.trim())) {
      setError('Każde zadanie musi mieć nazwę');
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

      if (editingTemplate) {
        await templateApi.updateTemplate(editingTemplate.id, payload);
      } else {
        await templateApi.createTemplate(payload);
      }

      setShowForm(false);
      resetForm();
      await loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zapisać szablonu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete('Czy na pewno chcesz usunąć ten szablon?'))) return;
    try {
      await templateApi.deleteTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
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
    setFormStages(formStages.filter((_, stageIndex) => stageIndex !== index));
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
                                type="checkbox"
                                checked={stage.is_completed_stage}
                                onChange={event => updateStage(index, 'is_completed_stage', event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
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
        <div className="space-y-3">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Template header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
              >
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="w-5 h-5 text-gray-500" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                    {template.description && <p className="text-sm text-gray-500">{template.description}</p>}
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {template.stages?.length || 0} etapów, {template.tasks?.length || 0} zadań
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); openEditForm(template); }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title="Edytuj szablon"
                    aria-label={`Edytuj szablon ${template.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(template.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Usuń szablon"
                    aria-label={`Usuń szablon ${template.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === template.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === template.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  {/* Stages */}
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Etapy</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(template.stages || []).sort((a, b) => a.position - b.position).map((stage, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-gray-700 dark:text-gray-300">{stage.name}</span>
                        {stage.is_completed_stage && <span className="text-[10px] text-green-600 font-medium">(końcowy)</span>}
                      </div>
                    ))}
                  </div>

                  {/* Tasks */}
                  {(template.tasks || []).length > 0 && (
                    <>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Zadania</h4>
                      <div className="space-y-1">
                        {(template.tasks || []).sort((a, b) => a.order_index - b.order_index).map((task, i) => {
                          const stage = (template.stages || []).find(s => s.position === task.stage_position);
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm py-1">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage?.color || '#6B7280' }} />
                              <span className="text-gray-700 dark:text-gray-300">{task.title}</span>
                              <span className="text-xs text-gray-400">({PRIORITY_LABELS[task.priority] || task.priority})</span>
                              {task.estimated_hours && <span className="text-xs text-gray-400">{task.estimated_hours}h</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default ProjectTemplates;
