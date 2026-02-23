import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  Plus,
  Pencil,
  Trash2,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
  X,
  GripVertical,
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
      (template.stages || [])
        .sort((a, b) => a.position - b.position)
        .map(s => ({ name: s.name, description: s.description, color: s.color, position: s.position, is_completed_stage: s.is_completed_stage }))
    );
    setFormTasks(
      (template.tasks || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(t => ({ stage_position: t.stage_position, title: t.title, description: t.description, priority: t.priority, estimated_hours: t.estimated_hours, order_index: t.order_index }))
    );
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError('Nazwa jest wymagana'); return; }
    if (formStages.length === 0) { setError('Dodaj przynajmniej jeden etap'); return; }

    setIsSaving(true);
    setError('');
    try {
      const payload: CreateTemplateRequest = {
        name: formName,
        description: formDescription || undefined,
        stages: formStages.map((s, i) => ({ ...s, position: i })),
        tasks: formTasks.map((t, i) => ({ ...t, order_index: i })),
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
    if (!window.confirm('Czy na pewno chcesz usunąć ten szablon?')) return;
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
    setFormStages(formStages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: string, value: any) => {
    const updated = [...formStages];
    (updated[index] as any)[field] = value;
    setFormStages(updated);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('projectTemplates.title', 'Szablony projektów')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('projectTemplates.subtitle', 'Zarządzaj szablonami etapów i zadań dla nowych projektów')}
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('projectTemplates.create', 'Nowy szablon')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTemplate ? 'Edytuj szablon' : 'Nowy szablon'}
                </h2>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Template Name & Description */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwa szablonu *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="np. Software Development"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opis</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Stages */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Etapy</h3>
                  <button onClick={addStage} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Dodaj etap
                  </button>
                </div>
                <div className="space-y-2">
                  {formStages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input
                        type="color"
                        value={stage.color}
                        onChange={e => updateStage(i, 'color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={stage.name}
                        onChange={e => updateStage(i, 'name', e.target.value)}
                        placeholder="Nazwa etapu"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={stage.is_completed_stage}
                          onChange={e => updateStage(i, 'is_completed_stage', e.target.checked)}
                          className="rounded"
                        />
                        Końcowy
                      </label>
                      <button onClick={() => removeStage(i)} className="p-1 text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Zadania</h3>
                  <button onClick={addTask} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Dodaj zadanie
                  </button>
                </div>
                <div className="space-y-2">
                  {formTasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                      <input
                        type="text"
                        value={task.title}
                        onChange={e => updateTask(i, 'title', e.target.value)}
                        placeholder="Nazwa zadania"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <select
                        value={task.stage_position}
                        onChange={e => updateTask(i, 'stage_position', parseInt(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      >
                        {formStages.map((s, si) => (
                          <option key={si} value={si}>{s.name || `Etap ${si + 1}`}</option>
                        ))}
                      </select>
                      <select
                        value={task.priority}
                        onChange={e => updateTask(i, 'priority', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      >
                        {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={task.estimated_hours || ''}
                        onChange={e => updateTask(i, 'estimated_hours', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="h"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        min="0"
                        step="0.5"
                      />
                      <button onClick={() => removeTask(i)} className="p-1 text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formTasks.length === 0 && (
                    <p className="text-sm text-gray-400 italic py-2">Brak zadań - dodaj zadania do szablonu</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : null}
                  {editingTemplate ? 'Zapisz zmiany' : 'Utwórz szablon'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <LayoutTemplate className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak szablonów</h3>
          <p className="text-gray-500 mb-4">Utwórz pierwszy szablon projektu</p>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Nowy szablon
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
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
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(template.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
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
