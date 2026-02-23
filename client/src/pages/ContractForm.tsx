import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import * as contractApi from '../api/contract.api';
import * as clientApi from '../api/client.api';
import { CreateContractRequest } from '../types/contract.types';
import { Client } from '../types/client.types';

const ContractForm = () => {
  const { t } = useTranslation('contracts');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState<CreateContractRequest>({
    title: '',
    description: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    value: undefined,
    currency: 'PLN',
    payment_terms: '',
    auto_renew: false,
    renewal_notice_days: 30,
    notes: '',
    internal_notes: '',
  });

  useEffect(() => {
    loadClients();
    if (isEditing && id) {
      loadContract(id);
    }
  }, [id]);

  const loadClients = async () => {
    try {
      const data = await clientApi.getActiveClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadContract = async (contractId: string) => {
    try {
      setIsLoading(true);
      const contract = await contractApi.getContractById(contractId);
      setFormData({
        title: contract.title,
        description: contract.description || '',
        client_id: contract.client_id,
        start_date: contract.start_date.split('T')[0],
        end_date: contract.end_date.split('T')[0],
        value: contract.value,
        currency: contract.currency,
        payment_terms: contract.payment_terms || '',
        auto_renew: contract.auto_renew,
        renewal_notice_days: contract.renewal_notice_days,
        notes: contract.notes || '',
        internal_notes: contract.internal_notes || '',
      });
    } catch (err) {
      console.error('Failed to load contract:', err);
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError(t('titleRequired'));
      return;
    }
    if (!formData.client_id) {
      setError(t('clientRequired'));
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setError(t('datesRequired'));
      return;
    }

    try {
      setIsSaving(true);

      const dataToSend = {
        ...formData,
        value: formData.value || undefined,
      };

      if (isEditing && id) {
        await contractApi.updateContract(id, dataToSend);
        navigate(`/contracts/${id}`);
      } else {
        const newContract = await contractApi.createContract(dataToSend);
        navigate(`/contracts/${newContract.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title={isEditing ? t('editContract') : t('newContract')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEditing ? t('editContract') : t('newContract')}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? t('editContract') : t('newContract')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isEditing ? t('editContractDesc') : t('newContractDesc')}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('basicInfo')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('titleLabel')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('titlePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('client')} *
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                required
              >
                <option value="">{t('selectClient')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder={t('descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Dates & Value */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('datesAndValue')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startDate')} *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('endDate')} *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('value')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.value || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('paymentTerms')}
              </label>
              <textarea
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                rows={2}
                placeholder={t('paymentTermsPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Renewal Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('renewalSettings')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto_renew"
                checked={formData.auto_renew}
                onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-400"
              />
              <label htmlFor="auto_renew" className="text-sm text-gray-700 dark:text-gray-300">
                {t('autoRenew')}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('renewalNoticeDays')}
              </label>
              <input
                type="number"
                min="1"
                value={formData.renewal_notice_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    renewal_notice_days: parseInt(e.target.value, 10) || 30,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('additionalInfo')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder={t('notesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('internalNotes')}
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={3}
                placeholder={t('internalNotesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/contracts')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? t('save') : t('create')}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default ContractForm;
