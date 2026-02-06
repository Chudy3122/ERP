import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import * as invoiceApi from '../api/invoice.api';
import * as clientApi from '../api/client.api';
import { getProjects } from '../api/project.api';
import { CreateInvoiceRequest, CreateInvoiceItemRequest } from '../types/invoice.types';
import { Client } from '../types/client.types';
import { Project } from '../types/project.types';

const VAT_RATES = [0, 5, 8, 23];
const UNITS = ['szt.', 'godz.', 'usł.', 'kg', 'mb', 'kpl.'];

interface InvoiceItemForm extends CreateInvoiceItemRequest {
  id?: string;
  net_amount?: number;
  vat_amount?: number;
  gross_amount?: number;
}

const InvoiceForm = () => {
  const { t } = useTranslation('invoices');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<CreateInvoiceRequest>({
    client_id: '',
    project_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    sale_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: '14 dni',
    currency: 'PLN',
    notes: '',
    internal_notes: '',
  });
  const [items, setItems] = useState<InvoiceItemForm[]>([
    { description: '', quantity: 1, unit: 'szt.', unit_price_net: 0, vat_rate: 23 }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
    loadProjects();
    if (isEdit && id) {
      loadInvoice();
    }
  }, [id, isEdit]);

  const loadClients = async () => {
    try {
      const result = await clientApi.getActiveClients();
      setClients(result);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const result = await getProjects({ isArchived: false });
      setProjects(result.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadInvoice = async () => {
    try {
      setIsLoading(true);
      const invoice = await invoiceApi.getInvoiceById(id!);
      setFormData({
        client_id: invoice.client_id,
        project_id: invoice.project_id || '',
        issue_date: invoice.issue_date.split('T')[0],
        sale_date: invoice.sale_date ? invoice.sale_date.split('T')[0] : '',
        due_date: invoice.due_date.split('T')[0],
        payment_terms: invoice.payment_terms || '',
        currency: invoice.currency,
        notes: invoice.notes || '',
        internal_notes: invoice.internal_notes || '',
      });
      if (invoice.items && invoice.items.length > 0) {
        setItems(invoice.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price_net: item.unit_price_net,
          vat_rate: item.vat_rate,
          net_amount: item.net_amount,
          vat_amount: item.vat_amount,
          gross_amount: item.gross_amount,
        })));
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateItemAmounts = (item: InvoiceItemForm) => {
    const net = (item.quantity || 0) * (item.unit_price_net || 0);
    const vat = net * ((item.vat_rate || 0) / 100);
    return {
      net_amount: Math.round(net * 100) / 100,
      vat_amount: Math.round(vat * 100) / 100,
      gross_amount: Math.round((net + vat) * 100) / 100,
    };
  };

  const calculateTotals = () => {
    let net = 0;
    let vat = 0;
    let gross = 0;
    items.forEach(item => {
      const amounts = calculateItemAmounts(item);
      net += amounts.net_amount;
      vat += amounts.vat_amount;
      gross += amounts.gross_amount;
    });
    return { net, vat, gross };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.client_id) {
      setError(t('clientRequired'));
      return;
    }

    if (items.length === 0 || !items.some(item => item.description.trim())) {
      setError(t('itemsRequired'));
      return;
    }

    const validItems = items.filter(item => item.description.trim());

    try {
      setIsSaving(true);
      if (isEdit && id) {
        // Update invoice
        await invoiceApi.updateInvoice(id, {
          ...formData,
          project_id: formData.project_id || undefined,
        });
        // For simplicity, we'll reload the page - in production you'd sync items properly
        navigate(`/invoices/${id}`);
      } else {
        const invoice = await invoiceApi.createInvoice({
          ...formData,
          project_id: formData.project_id || undefined,
          items: validItems,
        });
        navigate(`/invoices/${invoice.id}`);
      }
    } catch (error: any) {
      console.error('Failed to save invoice:', error);
      setError(error.response?.data?.message || t('saveError'));
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

  const handleItemChange = (index: number, field: keyof InvoiceItemForm, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'quantity' || field === 'unit_price_net' || field === 'vat_rate'
          ? parseFloat(value as string) || 0
          : value,
      };
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit: 'szt.', unit_price_net: 0, vat_rate: 23 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: formData.currency || 'PLN',
    }).format(amount);
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? t('editInvoice') : t('newInvoice')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? t('editInvoice') : t('newInvoice')}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? t('editInvoice') : t('newInvoice')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isEdit ? t('editInvoiceDesc') : t('newInvoiceDesc')}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Invoice Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('invoiceDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Client */}
            <div>
              <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('client')} *
              </label>
              <select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('selectClient')}</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('project')}
              </label>
              <select
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('noProject')}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('currency')}
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {/* Issue Date */}
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('issueDate')} *
              </label>
              <input
                type="date"
                id="issue_date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Sale Date */}
            <div>
              <label htmlFor="sale_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('saleDate')}
              </label>
              <input
                type="date"
                id="sale_date"
                name="sale_date"
                value={formData.sale_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('dueDate')} *
              </label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('paymentTerms')}
              </label>
              <input
                type="text"
                id="payment_terms"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder="14 dni"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('items')}</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('addItem')}
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-2" style={{ minWidth: '200px' }}>{t('description')}</th>
                  <th className="pb-2 px-2 text-right" style={{ width: '80px' }}>{t('quantity')}</th>
                  <th className="pb-2 px-2" style={{ width: '80px' }}>{t('unit')}</th>
                  <th className="pb-2 px-2 text-right" style={{ width: '120px' }}>{t('unitPrice')}</th>
                  <th className="pb-2 px-2 text-right" style={{ width: '80px' }}>{t('vatRate')}</th>
                  <th className="pb-2 px-2 text-right" style={{ width: '120px' }}>{t('netAmount')}</th>
                  <th className="pb-2 px-2 text-right" style={{ width: '120px' }}>{t('grossAmount')}</th>
                  <th className="pb-2 pl-2" style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amounts = calculateItemAmounts(item);
                  return (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white text-sm"
                          placeholder={t('itemDescription')}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          {UNITS.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price_net}
                          onChange={(e) => handleItemChange(index, 'unit_price_net', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white text-sm text-right"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={item.vat_rate}
                          onChange={(e) => handleItemChange(index, 'vat_rate', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          {VAT_RATES.map(rate => (
                            <option key={rate} value={rate}>{rate}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(amounts.net_amount)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(amounts.gross_amount)}
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('netTotal')}:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totals.net)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('vatTotal')}:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totals.vat)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-900 dark:text-white">{t('grossTotal')}:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totals.gross)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('additionalInfo')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Notes (visible on invoice) */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder={t('notesPlaceholder')}
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('internalNotes')}
              </label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
                placeholder={t('internalNotesPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
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

export default InvoiceForm;
