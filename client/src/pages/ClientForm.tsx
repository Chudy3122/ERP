import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
} from 'lucide-react';
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

  const fieldClass =
    'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const textareaClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const labelClass =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
  const sectionClass =
    'rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';

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
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin text-[#F7941D]" />
            <span className="text-sm font-medium">Ladowanie kontrahenta...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? t('editClient') : t('newClient')}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/clients')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#F7941D] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Powrot do listy kontrahentow"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                    Kontrahenci
                  </p>
                  <h1 className="truncate text-2xl font-semibold text-gray-950 dark:text-white">
                    {isEdit ? t('editClient') : t('newClient')}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {isEdit ? t('editClientDesc') : t('newClientDesc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              <span
                className={`h-2.5 w-2.5 rounded-full ${formData.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}
              />
              {formData.is_active ? t('isActive') : t('inactive')}
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('basicInfo')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dane identyfikacyjne kontrahenta.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2 xl:col-span-4">
                <label htmlFor="name" className={labelClass}>
                  {t('name')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={fieldClass}
                  placeholder={t('namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="nip" className={labelClass}>
                  NIP
                </label>
                <input
                  type="text"
                  id="nip"
                  name="nip"
                  value={formData.nip}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="0000000000"
                />
              </div>

              <div>
                <label htmlFor="regon" className={labelClass}>
                  REGON
                </label>
                <input
                  type="text"
                  id="regon"
                  name="regon"
                  value={formData.regon}
                  onChange={handleChange}
                  className={fieldClass}
                  placeholder="000000000"
                />
              </div>

              <div>
                <label htmlFor="client_type" className={labelClass}>
                  {t('clientType')}
                </label>
                <select
                  id="client_type"
                  name="client_type"
                  value={formData.client_type}
                  onChange={handleChange}
                  className={fieldClass}
                >
                  <option value={ClientType.CLIENT}>{t('typeClient')}</option>
                  <option value={ClientType.SUPPLIER}>{t('typeSupplier')}</option>
                  <option value={ClientType.BOTH}>{t('typeBoth')}</option>
                </select>
              </div>

              <div>
                <span className={labelClass}>{t('isActive')}</span>
                <label className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                  <span>{formData.is_active ? t('isActive') : t('inactive')}</span>
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className={sectionClass}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('address')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Adres i lokalizacja firmy.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="street" className={labelClass}>
                    {t('street')}
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder={t('streetPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="postal_code" className={labelClass}>
                    {t('postalCode')}
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder="00-000"
                  />
                </div>

                <div>
                  <label htmlFor="city" className={labelClass}>
                    {t('city')}
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder={t('cityPlaceholder')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="country" className={labelClass}>
                    {t('country')}
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('contactInfo')}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Osoba kontaktowa i dane komunikacyjne.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="contact_person" className={labelClass}>
                    {t('contactPerson')}
                  </label>
                  <input
                    type="text"
                    id="contact_person"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    className={fieldClass}
                    placeholder={t('contactPersonPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="email" className={labelClass}>
                    {t('email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`${fieldClass} pl-9`}
                      placeholder="email@firma.pl"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className={labelClass}>
                    {t('phone')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`${fieldClass} pl-9`}
                      placeholder="+48 000 000 000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('notes')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dodatkowe informacje widoczne przy kontrahencie.</p>
              </div>
            </div>

            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className={textareaClass}
              placeholder={t('notesPlaceholder')}
            />
          </section>

          <section className="sticky bottom-4 z-10 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <BadgeCheck className="h-4 w-4 text-[#F7941D]" />
                <span>{isEdit ? t('editClient') : t('newClient')}</span>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/clients')}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isEdit ? t('save') : t('create')}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </MainLayout>
  );
};

export default ClientForm;
