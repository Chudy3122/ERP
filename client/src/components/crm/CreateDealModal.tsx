import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  CrmPipelineStage,
  CrmPipeline,
  CreateDealRequest,
  DealPriority,
  DEAL_PRIORITY_LABELS,
} from '../../types/crm.types';
import { Client } from '../../types/client.types';
import { getActiveClients } from '../../api/client.api';

interface CreateDealModalProps {
  pipeline: CrmPipeline;
  defaultStage?: CrmPipelineStage;
  onClose: () => void;
  onSave: (data: CreateDealRequest) => Promise<void>;
}

const CreateDealModal = ({ pipeline, defaultStage, onClose, onSave }: CreateDealModalProps) => {
  const [form, setForm] = useState<CreateDealRequest>({
    title: '',
    pipeline_id: pipeline.id,
    stage_id: defaultStage?.id || pipeline.stages?.[0]?.id || '',
    value: undefined as any,
    currency: 'PLN',
    priority: DealPriority.MEDIUM,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getActiveClients().then(setClients).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Tytuł jest wymagany'); return; }
    if (!form.stage_id) { setError('Wybierz etap'); return; }

    setIsSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się utworzyć deala');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'value' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  const activeSortedStages = (pipeline.stages || [])
    .filter(s => s.is_active)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nowy deal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tytuł *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder="np. Wdrożenie ERP dla firmy XYZ"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Etap</label>
              <select
                name="stage_id"
                value={form.stage_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
              >
                {activeSortedStages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorytet</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
              >
                {Object.entries(DEAL_PRIORITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wartość</label>
              <input
                type="number"
                name="value"
                value={form.value || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="0"
                min="0"
                step="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waluta</label>
              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
              >
                <option>PLN</option>
                <option>EUR</option>
                <option>USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontrahent</label>
            <select
              name="client_id"
              value={form.client_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
            >
              <option value="">— Brak —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Osoba kontaktowa</label>
              <input
                name="contact_person"
                value={form.contact_person || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="Jan Kowalski"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data zamknięcia</label>
              <input
                type="date"
                name="expected_close_date"
                value={form.expected_close_date || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              Utwórz deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDealModal;
