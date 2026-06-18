import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  Car, Plus, Loader2, X, MapPin, Clock, Users as UsersIcon, Check, Trash2, CheckCircle2, XCircle, Ban,
} from 'lucide-react';
import * as fleetApi from '../api/fleet.api';
import {
  Vehicle, VehicleRequest, FleetContext, VehicleRequestStatus, VEHICLE_STATUS_LABELS,
} from '../types/fleet.types';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const STATUS_CFG: Record<VehicleRequestStatus, { cls: string; icon: typeof Clock }> = {
  pending: { cls: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300', icon: Clock },
  approved: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  rejected: { cls: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle },
};

function fmtRange(startIso: string, endIso: string) {
  const s = new Date(startIso); const e = new Date(endIso);
  const dOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const tOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${s.toLocaleDateString('pl-PL', dOpts)}, ${s.toLocaleTimeString('pl-PL', tOpts)}–${e.toLocaleTimeString('pl-PL', tOpts)}`;
  return `${s.toLocaleDateString('pl-PL', dOpts)} ${s.toLocaleTimeString('pl-PL', tOpts)} → ${e.toLocaleDateString('pl-PL', dOpts)} ${e.toLocaleTimeString('pl-PL', tOpts)}`;
}

export default function Fleet() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [ctx, setCtx] = useState<FleetContext>({ canManage: false, vehicles: [] });
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [assignChoice, setAssignChoice] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [context, reqs] = await Promise.all([fleetApi.getContext(), fleetApi.listRequests()]);
      setCtx(context);
      setRequests(reqs);
    } catch {
      toast.error('Nie udało się pobrać danych floty');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const canManage = ctx.canManage;
  const activeVehicles = ctx.vehicles;

  const assign = async (id: string) => {
    const vehicleId = assignChoice[id] || activeVehicles[0]?.id;
    if (!vehicleId) { toast.error('Brak dostępnych pojazdów'); return; }
    setBusyId(id);
    try {
      await fleetApi.assignVehicle(id, vehicleId);
      toast.success('Przydzielono pojazd');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się przydzielić');
    } finally { setBusyId(null); }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await fleetApi.rejectRequest(id);
      toast.success('Odrzucono');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się odrzucić');
    } finally { setBusyId(null); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Usunąć to zapotrzebowanie?')) return;
    setBusyId(id);
    try {
      await fleetApi.deleteRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success('Usunięto');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się usunąć');
    } finally { setBusyId(null); }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1100px] space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]"><Car className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Flota samochodów</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Zgłoś zapotrzebowanie na samochód i odbierz przydział</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]">
            <Plus className="h-4 w-4" /> Nowe zapotrzebowanie
          </button>
        </div>

        {isAdmin && <VehiclePanel vehicles={ctx.vehicles} onChange={load} />}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#F7941D]" /></div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <Car className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Brak zapotrzebowań</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Zgłoś pierwsze zapotrzebowanie na samochód.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const cfg = STATUS_CFG[r.status];
              const StatusIcon = cfg.icon;
              const canDelete = canManage || (r.user_id === user?.id && r.status === 'pending');
              return (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0 text-[#F7941D]" />
                        <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">{r.destination}</h3>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{fmtRange(r.start_at, r.end_at)}</span>
                        {r.passengers ? <span className="inline-flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5" />{r.passengers} os.</span> : null}
                        {canManage && r.user && <span>· {r.user.first_name} {r.user.last_name}</span>}
                      </div>
                      {r.purpose && <p className="mt-2 whitespace-pre-line break-words text-sm text-gray-600 dark:text-gray-300">{r.purpose}</p>}
                      {r.vehicle && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                          <Car className="h-4 w-4" /> {r.vehicle.name}{r.vehicle.registration ? ` · ${r.vehicle.registration}` : ''}
                        </p>
                      )}
                      {r.review_notes && <p className="mt-1 text-xs text-gray-400">Uwaga: {r.review_notes}</p>}
                    </div>
                    <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
                      <StatusIcon className="h-3.5 w-3.5" /> {VEHICLE_STATUS_LABELS[r.status]}
                    </span>
                  </div>

                  {/* Actions */}
                  {(canManage || canDelete) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                      {canManage && r.status === 'pending' && (
                        <>
                          <select
                            value={assignChoice[r.id] || activeVehicles[0]?.id || ''}
                            onChange={(e) => setAssignChoice((p) => ({ ...p, [r.id]: e.target.value }))}
                            className="h-9 rounded-lg border border-gray-300 px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            {activeVehicles.length === 0 && <option value="">Brak pojazdów</option>}
                            {activeVehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                          <button onClick={() => assign(r.id)} disabled={busyId === r.id || activeVehicles.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-50">
                            {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Przydziel
                          </button>
                          <button onClick={() => reject(r.id)} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                            <Ban className="h-4 w-4" /> Odrzuć
                          </button>
                        </>
                      )}
                      {canManage && r.status === 'approved' && (
                        <button onClick={() => reject(r.id)} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
                          <Ban className="h-4 w-4" /> Cofnij przydział
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(r.id)} disabled={busyId === r.id} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" /> Usuń
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <RequestModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); toast.success('Zgłoszono zapotrzebowanie'); load(); }}
        />
      )}
    </MainLayout>
  );
}

// ── New request modal ─────────────────────────────────────────────────────────
function RequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const now = new Date();
  const defStart = new Date(now.getTime() + 60 * 60 * 1000); defStart.setMinutes(0, 0, 0);
  const defEnd = new Date(defStart.getTime() + 2 * 60 * 60 * 1000);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [start, setStart] = useState(toLocalInput(defStart));
  const [end, setEnd] = useState(toLocalInput(defEnd));
  const [passengers, setPassengers] = useState('');
  const [saving, setSaving] = useState(false);

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const label = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

  const submit = async () => {
    if (!destination.trim()) { toast.error('Podaj cel/trasę'); return; }
    if (new Date(end) <= new Date(start)) { toast.error('Termin „do" musi być po „od"'); return; }
    setSaving(true);
    try {
      await fleetApi.createRequest({
        destination: destination.trim(),
        purpose: purpose.trim() || undefined,
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
        passengers: passengers ? Number(passengers) : null,
      });
      onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się zgłosić');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Zapotrzebowanie na samochód</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <label className={label}>Cel / trasa *</label>
            <input className={input} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="np. Klient – Kraków, ul. Długa 5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Od *</label>
              <input type="datetime-local" className={input} value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className={label}>Do *</label>
              <input type="datetime-local" className={input} value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Liczba osób (opcjonalnie)</label>
            <input type="number" min={1} className={input} value={passengers} onChange={(e) => setPassengers(e.target.value)} placeholder="np. 2" />
          </div>
          <div>
            <label className={label}>Dodatkowe informacje</label>
            <textarea rows={3} className={`${input} resize-y`} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Cel wyjazdu, uwagi…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Zgłoś
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vehicles management (admin) ───────────────────────────────────────────────
function VehiclePanel({ vehicles, onChange }: { vehicles: Vehicle[]; onChange: () => void }) {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await fleetApi.createVehicle(name.trim());
      setName('');
      onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się dodać pojazdu');
    } finally { setAdding(false); }
  };

  const removeVehicle = async (id: string) => {
    if (!window.confirm('Wycofać ten pojazd z floty?')) return;
    try {
      await fleetApi.deleteVehicle(id);
      onChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się usunąć');
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Pojazdy</h2>
      <div className="flex flex-wrap items-center gap-2">
        {vehicles.length === 0 && <span className="text-sm text-gray-400">Brak pojazdów.</span>}
        {vehicles.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
            <Car className="h-3.5 w-3.5 text-[#F7941D]" /> {v.name}
            <X className="h-3.5 w-3.5 cursor-pointer text-gray-400 hover:text-red-500" onClick={() => removeVehicle(v.id)} />
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="Dodaj pojazd…" className="h-8 w-36 rounded-lg border border-gray-300 px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          <button onClick={add} disabled={adding || !name.trim()} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#F7941D] px-2.5 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-50">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
