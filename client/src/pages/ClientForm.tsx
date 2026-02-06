import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import * as clientApi from '../api/client.api';
import { CreateClientRequest, ClientType } from '../types/client.types';

const ClientForm = () => {
  const { t } = useTranslation('clients');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState<CreateClientRequest>({
    name: '',
    nip: '',
    regon: '',
    street: '',
    city: '',
    postal_code: '',
    country: 'Polska',
    contact_person: '',
    email: '',
    phone: '',
    client_type: ClientType.CLIENT,
    is_active: true,
    notes: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      loadClient();
    }
  }, [id, isEdit]);

  const loadClient = async () => {
    try {
      setIsLoading(true);
      const client = await clientApi.getClientById(id!);
      setFormData({
        name: client.name,
        nip: client.nip || '',
        regon: client.regon || '',
        street: client.street || '',
        city: client.city || '',
        postal_code: client.postal_code || '',
        country: client.country || 'Polska',
        contact_person: client.contact_person || '',
        email: client.email || '',
        phone: client.phone || '',
        client_type: client.client_type,
        is_active: client.is_active,
        notes: client.notes || '',
      });
    } catch (error) {
      console.error('Failed to load client:', error);
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('nameRequired'));
      return;
    }

    // Check NIP if provided
    if (formData.nip) {
      const nipExists = await clientApi.checkNipExists(formData.nip, isEdit ? id : undefined);
      if (nipExists) {
        setError(t('nipExists'));
        return;
      }
    }

    try {
      setIsSaving(true);
      if (isEdit && id) {
        await clientApi.updateClient(id, formData);
      } else {
        await clientApi.createClient(formData);
      }
      navigate('/clients');
    } catch (error: any) {
      console.error('Failed to save client:', error);
      setError(error.response?.data?.message || t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? t('editClient') : t('newClient')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? t('editClient') : t('newClient')}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? t('editClient') : t('newClient')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isEdit ? t('editClientDesc') : t('newClientDesc')}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Basic Info */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('basicInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('name')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder={t('namePlaceholder')}
            />
          </div>

          {/* NIP */}
          <div>
            <label htmlFor="nip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              NIP
            </label>
            <input
              type="text"
              id="nip"
              name="nip"
              value={formData.nip}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder="0000000000"
            />
          </div>

          {/* REGON */}
          <div>
            <label htmlFor="regon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              REGON
            </label>
            <input
              type="text"
              id="regon"
              name="regon"
              value={formData.regon}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder="000000000"
            />
          </div>

          {/* Client Type */}
          <div>
            <label htmlFor="client_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('clientType')}
            </label>
            <select
              id="client_type"
              name="client_type"
              value={formData.client_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
            >
              <option value={ClientType.CLIENT}>{t('typeClient')}</option>
              <option value={ClientType.SUPPLIER}>{t('typeSupplier')}</option>
              <option value={ClientType.BOTH}>{t('typeBoth')}</option>
            </select>
          </div>

          {/* Active */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {t('isActive')}
            </label>
          </div>
        </div>

        {/* Address */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('address')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Street */}
          <div className="md:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('street')}
            </label>
            <input
              type="text"
              id="street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder={t('streetPlaceholder')}
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('city')}
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder={t('cityPlaceholder')}
            />
          </div>

          {/* Postal Code */}
          <div>
            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('postalCode')}
            </label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder="00-000"
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('country')}
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Contact */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('contactInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Contact Person */}
          <div>
            <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('contactPerson')}
            </label>
            <input
              type="text"
              id="contact_person"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder={t('contactPersonPlaceholder')}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder="email@firma.pl"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('phone')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              placeholder="+48 000 000 000"
            />
          </div>
        </div>

        {/* Notes */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('notes')}</h3>
        <div className="mb-8">
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
            placeholder={t('notesPlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? t('save') : t('create')}
          </button>
        </div>
      </form>
    </MainLayout>
  );
};

export default ClientForm;
