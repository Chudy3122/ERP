import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  Calendar,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Save,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react';
import * as invoiceApi from '../api/invoice.api';
import * as clientApi from '../api/client.api';
import { getProjects } from '../api/project.api';
import { getFileUrl } from '../api/axios-config';
import { CreateInvoiceRequest, CreateInvoiceItemRequest, InvoiceKind } from '../types/invoice.types';
import { Client } from '../types/client.types';
import { Project } from '../types/project.types';

const VAT_RATES = [0, 5, 8, 23];
// Cost-invoice VAT choices (gross -> net+vat); 'zw' = zwolniony (0%)
const COST_VAT_CHOICES = ['23', '8', '5', '0', 'zw'];
// Our companies the invoice can be assigned to
const COMPANIES = [
  'Marsoft',
  'Centrum Transformacji Biznesowej',
  'Polskie Towarzystwo Mieszkaniowe',
  'ITComplete',
  'Fundacja Zarządzania i Innowacji',
  'Włodawska spółdzielnia energetyczna',
  'ITC Nowa Energia - spółdzielnia energetyczna',
];
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState<CreateInvoiceRequest>({
    client_id: '',
    project_id: '',
    kind: InvoiceKind.INCOME,
    invoice_number: '',
    company: '',
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

  // Cost-invoice (simplified) fields
  const [grossInput, setGrossInput] = useState('');
  const [vatChoice, setVatChoice] = useState('23');
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [existingScans, setExistingScans] = useState<Array<{ name: string; url: string; size: number; uploaded_at: string }>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isCost = formData.kind === InvoiceKind.COST;

  const fieldClass =
    'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const compactFieldClass =
    'h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const textareaClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400';
  const labelClass =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
  const sectionClass =
    'rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800';

  useEffect(() => {
    loadClients();
    loadProjects();
    if (isEdit && id) {
      loadInvoice();
    } else if (searchParams.get('kind') === 'cost') {
      setFormData(prev => ({ ...prev, kind: InvoiceKind.COST }));
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
        kind: invoice.kind || InvoiceKind.INCOME,
        invoice_number: invoice.invoice_number || '',
        company: invoice.company || '',
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
      // Cost-invoice simplified fields
      if (invoice.kind === InvoiceKind.COST) {
        setGrossInput(String(invoice.gross_total ?? ''));
        const r = invoice.items?.[0]?.vat_rate;
        setVatChoice(r !== undefined && r !== null ? String(r) : '23');
      }
      setExistingScans(Array.isArray(invoice.scans) ? invoice.scans : []);
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

    if (!formData.company) { setError('Wybierz firmę, której dotyczy faktura.'); return; }

    if (isCost) {
      const gross = parseFloat(grossInput);
      if (!formData.issue_date) { setError('Podaj datę wystawienia faktury.'); return; }
      if (!gross || gross <= 0) { setError('Podaj kwotę brutto.'); return; }
    } else {
      if (!formData.client_id) { setError(t('clientRequired')); return; }
      if (items.length === 0 || !items.some(item => item.description.trim())) {
        setError(t('itemsRequired'));
        return;
      }
    }

    try {
      setIsSaving(true);

      if (isCost) {
        // Simplified cost invoice: gross + VAT -> single line item
        const gross = parseFloat(grossInput);
        const rate = vatChoice === 'zw' ? 0 : (parseFloat(vatChoice) || 0);
        const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
        const costItems: CreateInvoiceItemRequest[] = [{
          description: formData.notes?.trim() || 'Faktura kosztowa',
          quantity: 1,
          unit: 'szt.',
          unit_price_net: net,
          vat_rate: rate,
        }];

        let invoiceId = id;
        if (isEdit && id) {
          await invoiceApi.updateInvoice(id, {
            client_id: formData.client_id || undefined,
            project_id: formData.project_id || undefined,
            invoice_number: formData.invoice_number?.trim() || undefined,
            company: formData.company || undefined,
            issue_date: formData.issue_date,
            due_date: formData.issue_date,
            notes: formData.notes,
          });
        } else {
          const invoice = await invoiceApi.createInvoice({
            client_id: formData.client_id || undefined,
            project_id: formData.project_id || undefined,
            invoice_number: formData.invoice_number?.trim() || undefined,
            company: formData.company || undefined,
            kind: InvoiceKind.COST,
            issue_date: formData.issue_date,
            due_date: formData.issue_date,
            currency: 'PLN',
            notes: formData.notes,
            items: costItems,
          });
          invoiceId = invoice.id;
        }
        if (invoiceId && scanFiles.length > 0) {
          await invoiceApi.uploadInvoiceScans(invoiceId, scanFiles);
        }
        navigate(`/invoices/${invoiceId}`);
        return;
      }

      // INCOME invoice
      const validItems = items.filter(item => item.description.trim());
      if (isEdit && id) {
        await invoiceApi.updateInvoice(id, {
          ...formData,
          project_id: formData.project_id || undefined,
        });
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

  const handleScanSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setScanFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeScanFile = (index: number) => {
    setScanFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingScan = async (url: string) => {
    if (!id) return;
    try {
      await invoiceApi.deleteInvoiceScan(id, url);
      setExistingScans(prev => prev.filter(s => s.url !== url));
    } catch {
      setError('Nie udało się usunąć skanu.');
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
  const displayGross = isCost ? (parseFloat(grossInput) || 0) : totals.gross;

  if (isLoading) {
    return (
      <MainLayout title={isEdit ? t('editInvoice') : t('newInvoice')}>
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-10 w-10 animate-spin text-[#F7941D]" />
            <span className="text-sm font-medium">Ładowanie faktury...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? t('editInvoice') : t('newInvoice')}>
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#F7941D] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Powrót do listy faktur"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                    Finanse i rozliczenia
                  </p>
                  <h1 className="truncate text-2xl font-semibold text-gray-950 dark:text-white">
                    {isEdit ? t('editInvoice') : t('newInvoice')}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {isEdit ? t('editInvoiceDesc') : t('newInvoiceDesc')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#F7941D]/20 bg-[#F7941D]/10 px-4 py-2 text-right dark:bg-[#F7941D]/15">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D] dark:text-orange-300">
                Wartość brutto
              </p>
              <p className="text-xl font-semibold text-gray-950 dark:text-white">
                {formatCurrency(displayGross)}
              </p>
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
          {/* Invoice kind toggle */}
          <section className={sectionClass}>
            <label className={labelClass}>Rodzaj faktury</label>
            <div className="mt-2 inline-flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
              {([
                { k: InvoiceKind.INCOME, label: 'Przychodowa (sprzedaż)' },
                { k: InvoiceKind.COST, label: 'Kosztowa (zakup)' },
              ] as { k: InvoiceKind; label: string }[]).map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  disabled={isEdit}
                  onClick={() => setFormData(prev => ({ ...prev, kind: k }))}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                    formData.kind === k
                      ? (k === InvoiceKind.COST ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {isEdit && <p className="mt-2 text-xs text-gray-400">Rodzaju faktury nie można zmienić po utworzeniu.</p>}
            {formData.kind === InvoiceKind.COST && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Faktura kosztowa — koszt, który Ty masz opłacić. Kontrahent = dostawca.</p>
            )}
          </section>

          {/* Company selector */}
          <section className={sectionClass}>
            <label className={labelClass}>Firma, której dotyczy faktura *</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {COMPANIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, company: c }))}
                  className={`rounded-lg border-2 px-3 py-3 text-left text-sm font-semibold transition-colors ${
                    formData.company === c
                      ? 'border-[#F7941D] bg-[#F7941D]/10 text-[#b76612] dark:text-orange-200'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          {/* Cost invoice — simplified entry */}
          {isCost && (
            <section className={sectionClass}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Faktura kosztowa</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Wystarczy data, kwota brutto i stawka VAT — netto i VAT policzymy automatycznie.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label htmlFor="invoice_number" className={labelClass}>Numer faktury</label>
                  <input type="text" id="invoice_number" name="invoice_number" value={formData.invoice_number} onChange={handleChange} className={fieldClass} placeholder="Puste = nadany automatycznie" />
                </div>
                <div>
                  <label htmlFor="issue_date" className={labelClass}>{t('issueDate')} *</label>
                  <input type="date" id="issue_date" name="issue_date" value={formData.issue_date} onChange={handleChange} required className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="gross" className={labelClass}>Kwota brutto *</label>
                  <input type="number" step="0.01" min="0" id="gross" value={grossInput} onChange={e => setGrossInput(e.target.value)} required className={fieldClass} placeholder="0,00" />
                </div>
                <div>
                  <label htmlFor="vatChoice" className={labelClass}>VAT *</label>
                  <select id="vatChoice" value={vatChoice} onChange={e => setVatChoice(e.target.value)} className={fieldClass}>
                    {COST_VAT_CHOICES.map(v => <option key={v} value={v}>{v === 'zw' ? 'zw (zwolniony)' : `${v}%`}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="client_id" className={labelClass}>Dostawca</label>
                  <select id="client_id" name="client_id" value={formData.client_id} onChange={handleChange} className={fieldClass}>
                    <option value="">— brak / paragon —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="project_id" className={labelClass}>{t('project')}</label>
                  <select id="project_id" name="project_id" value={formData.project_id} onChange={handleChange} className={fieldClass}>
                    <option value="">{t('noProject')}</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="notes" className={labelClass}>Opis / nazwa kosztu</label>
                <input type="text" id="notes" name="notes" value={formData.notes} onChange={handleChange} className={fieldClass} placeholder="np. Paliwo, materiały biurowe..." />
              </div>

              {/* Scans */}
              <div className="mt-5">
                <label className={labelClass}>Skany / zdjęcia faktury</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-[#F7941D] hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-400">
                  <Upload className="h-5 w-5" />
                  <span>Dodaj pliki (PDF, JPG, PNG) — można kilka</span>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={handleScanSelect} className="hidden" />
                </label>

                {(existingScans.length > 0 || scanFiles.length > 0) && (
                  <ul className="mt-3 space-y-2">
                    {existingScans.map(s => (
                      <li key={s.url} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                        <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                        <a href={getFileUrl(s.url) || '#'} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-blue-600 hover:underline dark:text-blue-300">{s.name}</a>
                        <button type="button" onClick={() => handleDeleteExistingScan(s.url)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                      </li>
                    ))}
                    {scanFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                        <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-300">{f.name}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">do wgrania</span>
                        <button type="button" onClick={() => removeScanFile(i)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Computed preview */}
              <div className="mt-5 flex justify-end">
                <div className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30 sm:w-80">
                  {(() => {
                    const gross = parseFloat(grossInput) || 0;
                    const rate = vatChoice === 'zw' ? 0 : (parseFloat(vatChoice) || 0);
                    const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
                    const vat = Math.round((gross - net) * 100) / 100;
                    return (
                      <>
                        <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Netto:</span><span className="text-gray-900 dark:text-white">{formatCurrency(net)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">VAT ({vatChoice === 'zw' ? 'zw' : rate + '%'}):</span><span className="text-gray-900 dark:text-white">{formatCurrency(vat)}</span></div>
                        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-lg font-semibold dark:border-gray-700"><span className="text-gray-900 dark:text-white">Brutto:</span><span className="text-gray-900 dark:text-white">{formatCurrency(gross)}</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>
          )}

          {!isCost && (<>
          {/* Invoice Details */}
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('invoiceDetails')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kontrahent, projekt oraz terminy dokumentu.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Invoice number (optional — auto when empty) */}
            <div>
              <label htmlFor="invoice_number" className={labelClass}>
                Numer faktury
              </label>
              <input
                type="text"
                id="invoice_number"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                className={fieldClass}
                placeholder="Puste = nadany automatycznie"
              />
            </div>

            {/* Client */}
            <div>
              <label htmlFor="client_id" className={labelClass}>
                {formData.kind === InvoiceKind.COST ? 'Dostawca' : t('client')} *
              </label>
              <select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                required
                className={fieldClass}
              >
                <option value="">{t('selectClient')}</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <label htmlFor="project_id" className={labelClass}>
                {t('project')}
              </label>
              <select
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="">{t('noProject')}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className={labelClass}>
                {t('currency')}
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {/* Issue Date */}
            <div>
              <label htmlFor="issue_date" className={labelClass}>
                {t('issueDate')} *
              </label>
              <input
                type="date"
                id="issue_date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </div>

            {/* Sale Date */}
            <div>
              <label htmlFor="sale_date" className={labelClass}>
                {t('saleDate')}
              </label>
              <input
                type="date"
                id="sale_date"
                name="sale_date"
                value={formData.sale_date}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="due_date" className={labelClass}>
                {t('dueDate')} *
              </label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
                className={fieldClass}
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label htmlFor="payment_terms" className={labelClass}>
                {t('paymentTerms')}
              </label>
              <input
                type="text"
                id="payment_terms"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                className={fieldClass}
                placeholder="14 dni"
              />
            </div>
          </div>
          </section>

        {/* Invoice Items */}
          <section className={sectionClass}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('items')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pozycje faktury i automatyczne przeliczenie wartości.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Plus className="h-4 w-4" />
              {t('addItem')}
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3" style={{ minWidth: '240px' }}>{t('description')}</th>
                  <th className="px-3 py-3 text-right" style={{ width: '90px' }}>{t('quantity')}</th>
                  <th className="px-3 py-3" style={{ width: '90px' }}>{t('unit')}</th>
                  <th className="px-3 py-3 text-right" style={{ width: '130px' }}>{t('unitPrice')}</th>
                  <th className="px-3 py-3 text-right" style={{ width: '90px' }}>{t('vatRate')}</th>
                  <th className="px-3 py-3 text-right" style={{ width: '130px' }}>{t('netAmount')}</th>
                  <th className="px-3 py-3 text-right" style={{ width: '140px' }}>{t('grossAmount')}</th>
                  <th className="px-3 py-3" style={{ width: '48px' }}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item, index) => {
                  const amounts = calculateItemAmounts(item);
                  return (
                    <tr key={index} className="transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-700/30">
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className={compactFieldClass}
                          placeholder={t('itemDescription')}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className={`${compactFieldClass} text-right`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className={compactFieldClass}
                        >
                          {UNITS.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price_net}
                          onChange={(e) => handleItemChange(index, 'unit_price_net', e.target.value)}
                          className={`${compactFieldClass} text-right`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={item.vat_rate}
                          onChange={(e) => handleItemChange(index, 'vat_rate', e.target.value)}
                          className={compactFieldClass}
                        >
                          {VAT_RATES.map(rate => (
                            <option key={rate} value={rate}>{rate}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(amounts.net_amount)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-950 dark:text-white">
                        {formatCurrency(amounts.gross_amount)}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                          aria-label="Usun pozycje"
                        >
                          <Trash2 className="h-4 w-4" />
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
            <div className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30 sm:w-80">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('netTotal')}:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totals.net)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('vatTotal')}:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(totals.vat)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-lg font-semibold dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">{t('grossTotal')}:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(displayGross)}</span>
              </div>
            </div>
          </div>
          </section>

        {/* Notes */}
          <section className={sectionClass}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <StickyNote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{t('additionalInfo')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Uwagi widoczne na fakturze oraz notatki wewnętrzne.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Notes (visible on invoice) */}
            <div>
              <label htmlFor="notes" className={labelClass}>
                {t('notes')}
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className={textareaClass}
                placeholder={t('notesPlaceholder')}
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label htmlFor="internal_notes" className={labelClass}>
                {t('internalNotes')}
              </label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleChange}
                rows={3}
                className={textareaClass}
                placeholder={t('internalNotesPlaceholder')}
              />
            </div>
          </div>
          </section>
          </>)}

        {/* Actions */}
          <section className="sticky bottom-4 z-10 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('grossTotal')}: <span className="font-semibold text-gray-950 dark:text-white">{formatCurrency(displayGross)}</span>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
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

export default InvoiceForm;
