import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  Package, Plus, X, Check, XCircle, Clock, CheckCircle2, Trash2, Loader2, Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as supplyApi from '../api/supply.api';
import {
  SupplyRequest, CreateSupplyRequest, SupplyCategory, SupplyPriority,
  SUPPLY_CATEGORY_LABELS, SUPPLY_PRIORITY_LABELS,
} from '../types/supply.types';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: 'Oczekuje', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  approved: { label: 'Zatwierdzone', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
  rejected: { label: 'Odrzucone', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

const PRIORITY_CLS: Record<SupplyPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  high: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300',
};

const EMPTY: CreateSupplyRequest = { item_name: '', quantity: 1, category: 'office', priority: 'medium', description: '' };

export default function Supply() {
  const { user } = useAuth();
  const isManager = user?.role === 'sekretariat' || user?.role === 'admin';

  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'pending' | 'mine'>(isManager ? 'pending' : 'mine');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateSupplyRequest>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    try {
      setLoading(true);
      if (isManager && tab !== 'mine') {
        const data = await supplyApi.getSupplyRequests(tab === 'pending' ? 'pending' : undefined);
        setRequests(data);
      } else {
        const data = await supplyApi.getMySupplyRequests();
        setRequests(data);
      }
    } catch {
      toast.error('Nie udało się załadować zgłoszeń');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    try {
      setSaving(true);
      await supplyApi.createSupplyRequest(form);
      toast.success('Zgłoszenie wysłane');
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Błąd wysyłania zgłoszenia');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try { await supplyApi.approveSupplyRequest(id); toast.success('Zatwierdzono'); load(); }
    catch { toast.error('Nie udało się zatwierdzić'); }
  };
  const handleReject = async (id: string) => {
    try { await supplyApi.rejectSupplyRequest(id); toast.success('Odrzucono'); load(); }
    catch { toast.error('Nie udało się odrzucić'); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć zgłoszenie?')) return;
    try { await supplyApi.deleteSupplyRequest(id); toast.success('Usunięto'); load(); }
    catch { toast.error('Nie udało się usunąć'); }
  };

  const filtered = requests.filter(r =>
    !search ||
    r.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.user && `${r.user.first_name} ${r.user.last_name}`.toLowerCase().includes(search.toLowerCase()))
  );

  const inp = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  return (
    <MainLayout title="Zaopatrzenie">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Moduł</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zaopatrzenie</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Zgłaszaj zapotrzebowanie na artykuły i sprzęt.</p>
            </div>
          </div>
          <button
            onClick={() => { setForm(EMPTY); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
          >
            <Plus className="h-4 w-4" /> Nowe zapotrzebowanie
          </button>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {isManager && (
              <>
                <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')}>Do rozpatrzenia</TabBtn>
                <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>Wszystkie</TabBtn>
              </>
            )}
            <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')}>Moje zgłoszenia</TabBtn>
          </div>
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj..." className={`${inp} pl-9`} />
          </div>
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" /></div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brak zgłoszeń</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Artykuł</th>
                    <th className="px-4 py-3 text-center">Ilość</th>
                    <th className="px-4 py-3 text-left">Kategoria</th>
                    <th className="px-4 py-3 text-center">Priorytet</th>
                    {tab !== 'mine' && <th className="px-4 py-3 text-left">Zgłaszający</th>}
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(r => {
                    const st = STATUS_CFG[r.status];
                    const StIcon = st.icon;
                    const isOwner = r.user_id === user?.id;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{r.item_name}</p>
                          {r.description && <p className="text-xs text-gray-400 truncate max-w-[260px]">{r.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{r.quantity}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{SUPPLY_CATEGORY_LABELS[r.category]}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLS[r.priority]}`}>
                            {SUPPLY_PRIORITY_LABELS[r.priority]}
                          </span>
                        </td>
                        {tab !== 'mine' && (
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {r.user ? `${r.user.first_name} ${r.user.last_name}` : '—'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                            <StIcon className="h-3 w-3" /> {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {isManager && r.status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(r.id)} title="Zatwierdź" className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Check className="h-4 w-4" /></button>
                                <button onClick={() => handleReject(r.id)} title="Odrzuć" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><X className="h-4 w-4" /></button>
                              </>
                            )}
                            {(isManager || (isOwner && r.status === 'pending')) && (
                              <button onClick={() => handleDelete(r.id)} title="Usuń" className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <Package className="h-4 w-4 text-[#F7941D]" /> Nowe zapotrzebowanie
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Nazwa artykułu *</label>
                <input required value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} className={inp} placeholder="np. Papier A4, toner, monitor..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Ilość</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} className={inp} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Priorytet</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as SupplyPriority })} className={inp}>
                    {(Object.keys(SUPPLY_PRIORITY_LABELS) as SupplyPriority[]).map(p => <option key={p} value={p}>{SUPPLY_PRIORITY_LABELS[p]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Kategoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as SupplyCategory })} className={inp}>
                  {(Object.keys(SUPPLY_CATEGORY_LABELS) as SupplyCategory[]).map(c => <option key={c} value={c}>{SUPPLY_CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Uzasadnienie / opis</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inp} placeholder="Do czego potrzebne..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F7941D] py-2 text-sm font-medium text-white hover:bg-[#e08317] disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Wyślij zgłoszenie
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-[#F7941D] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
}
