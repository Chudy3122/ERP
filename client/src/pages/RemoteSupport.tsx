import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatUserName } from '../utils/userSorting';
import { getDirectory } from '../api/user.api';
import type { AdminUser } from '../types/admin.types';
import {
  Monitor, Loader2, Plus, X, Trash2, Pencil, Copy, MonitorUp, HelpCircle,
  CheckCircle2, Clock, Ban, PlayCircle, ShieldAlert, Download,
} from 'lucide-react';
import * as api from '../api/remoteSupport.api';
import type { RemoteDevice, RemoteSession, RemoteSessionStatus } from '../api/remoteSupport.api';

const STATUS_CFG: Record<RemoteSessionStatus, { label: string; cls: string; icon: typeof Clock }> = {
  requested: { label: 'Oczekuje', cls: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300', icon: Clock },
  in_progress: { label: 'W toku', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: PlayCircle },
  closed: { label: 'Zakończona', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Anulowana', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-400', icon: Ban },
};

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function StatusBadge({ status }: { status: RemoteSessionStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

const copy = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Skopiowano ${label}`);
  } catch {
    toast.error('Nie udało się skopiować');
  }
};

const connect = (device: RemoteDevice) => {
  const link = api.buildRustDeskLink(device.rustdesk_id, device.access_password);
  // Opening the rustdesk:// protocol launches the installed RustDesk client.
  window.location.href = link;
  toast('Otwieram RustDesk… jeśli nic się nie dzieje, skopiuj ID i hasło ręcznie.', { icon: '🖥️' });
};

export default function RemoteSupport() {
  const [loading, setLoading] = useState(true);
  const [isIt, setIsIt] = useState(false);
  const [tab, setTab] = useState<'sessions' | 'devices'>('sessions');

  // employee
  const [mine, setMine] = useState<RemoteSession[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  // IT
  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [directory, setDirectory] = useState<AdminUser[]>([]);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [editDevice, setEditDevice] = useState<RemoteDevice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RemoteDevice | null>(null);
  const [closeFor, setCloseFor] = useState<RemoteSession | null>(null);
  const [closeNote, setCloseNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { isIt } = await api.getContext();
      setIsIt(isIt);
      if (isIt) {
        const [s, d, dir] = await Promise.all([api.listSessions(), api.listDevices(), getDirectory().catch(() => [])]);
        setSessions(s);
        setDevices(d);
        setDirectory(dir);
      } else {
        setMine(await api.mySessions());
      }
    } catch {
      toast.error('Nie udało się pobrać danych pomocy zdalnej');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // ───────── employee actions ─────────
  const submitRequest = async () => {
    setBusy(true);
    try {
      await api.requestHelp({ reason: reason.trim() || undefined });
      toast.success('Wysłano prośbę o pomoc. Informatyk się z Tobą połączy.');
      setShowRequest(false);
      setReason('');
      setMine(await api.mySessions());
    } catch {
      toast.error('Nie udało się wysłać prośby');
    } finally {
      setBusy(false);
    }
  };

  const cancelMine = async (id: string) => {
    try {
      await api.cancelSession(id);
      setMine(await api.mySessions());
    } catch {
      toast.error('Nie udało się anulować');
    }
  };

  // ───────── IT actions ─────────
  const accept = async (s: RemoteSession) => {
    setBusy(true);
    try {
      const updated = await api.acceptSession(s.id, s.device_id || undefined);
      toast.success('Zgłoszenie przyjęte');
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...updated } : x)));
      const dev = devices.find((d) => d.id === s.device_id);
      if (dev) connect(dev);
    } catch {
      toast.error('Nie udało się przyjąć zgłoszenia');
    } finally {
      setBusy(false);
    }
  };

  const doClose = async () => {
    if (!closeFor) return;
    setBusy(true);
    try {
      await api.closeSession(closeFor.id, closeNote.trim() || undefined);
      toast.success('Sesja zakończona');
      setCloseFor(null);
      setCloseNote('');
      setSessions(await api.listSessions());
    } catch {
      toast.error('Nie udało się zakończyć sesji');
    } finally {
      setBusy(false);
    }
  };

  const connectDevice = async (device: RemoteDevice) => {
    connect(device);
    // Log the session in the background.
    try {
      await api.startSession({ requester_id: device.user_id, device_id: device.id });
      setSessions(await api.listSessions());
    } catch { /* non-fatal */ }
  };

  const removeDevice = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteDevice(confirmDelete.id);
      setDevices((prev) => prev.filter((d) => d.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success('Komputer usunięty');
    } catch {
      toast.error('Nie udało się usunąć');
    }
  };

  const openDevices = sessions.filter((s) => s.status === 'requested' || s.status === 'in_progress');
  const pendingCount = sessions.filter((s) => s.status === 'requested').length;

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
              <Monitor className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pomoc Zdalna</h1>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                {isIt ? 'Łącz się z komputerami pracowników i zarządzaj zgłoszeniami.' : 'Poproś informatyka o połączenie z Twoim komputerem.'}
              </p>
            </div>
          </div>
          {!isIt && !loading && (
            <button
              onClick={() => setShowRequest(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e0850f]"
            >
              <HelpCircle className="h-4 w-4" /> Poproś o pomoc zdalną
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isIt ? (
          <>
            {/* IT tabs */}
            <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setTab('sessions')}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${tab === 'sessions' ? 'border-[#F7941D] text-[#F7941D]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              >
                Zgłoszenia i sesje{pendingCount > 0 && <span className="ml-2 rounded-full bg-[#F7941D] px-1.5 text-xs text-white">{pendingCount}</span>}
              </button>
              <button
                onClick={() => setTab('devices')}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${tab === 'devices' ? 'border-[#F7941D] text-[#F7941D]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              >
                Komputery ({devices.length})
              </button>
            </div>

            {tab === 'sessions' ? (
              <ItSessions
                sessions={sessions}
                openDevices={openDevices}
                devices={devices}
                busy={busy}
                onAccept={accept}
                onConnect={connectDevice}
                onClose={(s) => { setCloseFor(s); setCloseNote(''); }}
              />
            ) : (
              <ItDevices
                devices={devices}
                onAdd={() => { setEditDevice(null); setShowDeviceForm(true); }}
                onEdit={(d) => { setEditDevice(d); setShowDeviceForm(true); }}
                onDelete={(d) => setConfirmDelete(d)}
                onConnect={connectDevice}
              />
            )}
          </>
        ) : (
          <EmployeeView mine={mine} onCancel={cancelMine} />
        )}
      </div>

      {/* Employee request modal */}
      {showRequest && (
        <Modal title="Poproś o pomoc zdalną" onClose={() => setShowRequest(false)}>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
            Opisz krótko problem. Informatyk dostanie powiadomienie i połączy się z Twoim komputerem.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Np. nie działa drukarka, program się zawiesza…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowRequest(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
            <button onClick={submitRequest} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Wyślij prośbę
            </button>
          </div>
        </Modal>
      )}

      {/* Device form modal */}
      {showDeviceForm && (
        <DeviceForm
          device={editDevice}
          directory={directory}
          onClose={() => setShowDeviceForm(false)}
          onSaved={(d) => {
            setDevices((prev) => {
              const exists = prev.some((x) => x.id === d.id);
              return exists ? prev.map((x) => (x.id === d.id ? d : x)) : [d, ...prev];
            });
            setShowDeviceForm(false);
          }}
        />
      )}

      {/* Close session modal */}
      {closeFor && (
        <Modal title="Zakończ sesję" onClose={() => setCloseFor(null)}>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notatka / rozwiązanie (opcjonalnie)</label>
          <textarea
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            rows={3}
            placeholder="Co zostało zrobione…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setCloseFor(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
            <button onClick={doClose} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Zakończ
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={removeDevice}
        title="Usunąć komputer?"
        message={confirmDelete ? `Komputer „${confirmDelete.label}" zostanie usunięty z rejestru.` : ''}
        confirmText="Usuń"
        variant="danger"
        icon="delete"
      />
    </MainLayout>
  );
}

// ───────────────────────── Employee view ─────────────────────────
function EmployeeView({ mine, onCancel }: { mine: RemoteSession[]; onCancel: (id: string) => void }) {
  return (
    <div>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
        <Download className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Aby informatyk mógł połączyć się z Twoim komputerem, musi być na nim zainstalowany program <strong>RustDesk</strong>.
          Instaluje go dział IT — nie musisz nic robić samodzielnie. Gdy wyślesz prośbę, informatyk otrzyma powiadomienie i się połączy.
        </p>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Moje zgłoszenia</h2>
      {mine.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400 dark:border-gray-700">
          Brak zgłoszeń. Kliknij „Poproś o pomoc zdalną", gdy będziesz potrzebować wsparcia.
        </p>
      ) : (
        <div className="space-y-2">
          {mine.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-gray-400">{fmtDate(s.created_at)}</span>
                </div>
                {s.reason && <p className="truncate text-sm text-gray-700 dark:text-gray-300">{s.reason}</p>}
                {s.helper && <p className="text-xs text-gray-500">Obsługuje: {formatUserName(s.helper)}</p>}
                {s.resolution_note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Rozwiązanie: {s.resolution_note}</p>}
              </div>
              {s.status === 'requested' && (
                <button onClick={() => onCancel(s.id)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Anuluj
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── IT: sessions ─────────────────────────
function ItSessions({
  sessions, devices, busy, onAccept, onConnect, onClose,
}: {
  sessions: RemoteSession[];
  openDevices: RemoteSession[];
  devices: RemoteDevice[];
  busy: boolean;
  onAccept: (s: RemoteSession) => void;
  onConnect: (d: RemoteDevice) => void;
  onClose: (s: RemoteSession) => void;
}) {
  if (sessions.length === 0) {
    return <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400 dark:border-gray-700">Brak zgłoszeń ani sesji.</p>;
  }
  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const dev = s.device || devices.find((d) => d.id === s.device_id) || null;
        return (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={s.status} />
                <span className="font-medium text-gray-900 dark:text-white">{s.requester ? formatUserName(s.requester) : 'Sesja IT'}</span>
                <span className="text-xs text-gray-400">{fmtDate(s.created_at)}</span>
              </div>
              {s.reason && <p className="truncate text-sm text-gray-600 dark:text-gray-300">{s.reason}</p>}
              {dev && <p className="text-xs text-gray-500">Komputer: {dev.label} · ID {dev.rustdesk_id}</p>}
              {s.helper && <p className="text-xs text-gray-500">IT: {formatUserName(s.helper)}</p>}
              {s.resolution_note && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Rozwiązanie: {s.resolution_note}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {s.status === 'requested' && (
                <button onClick={() => onAccept(s)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7941D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">
                  <MonitorUp className="h-4 w-4" /> Przejmij
                </button>
              )}
              {dev && s.status !== 'closed' && s.status !== 'cancelled' && (
                <>
                  <button onClick={() => onConnect(dev)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F7941D] px-3 py-1.5 text-xs font-semibold text-[#F7941D] hover:bg-[#F7941D]/10">
                    <MonitorUp className="h-4 w-4" /> Połącz
                  </button>
                  <button onClick={() => copy(dev.rustdesk_id, 'ID')} title="Kopiuj ID" className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                    <Copy className="h-4 w-4" />
                  </button>
                </>
              )}
              {(s.status === 'requested' || s.status === 'in_progress') && (
                <button onClick={() => onClose(s)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                  Zakończ
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── IT: devices ─────────────────────────
function ItDevices({
  devices, onAdd, onEdit, onDelete, onConnect,
}: {
  devices: RemoteDevice[];
  onAdd: () => void;
  onEdit: (d: RemoteDevice) => void;
  onDelete: (d: RemoteDevice) => void;
  onConnect: (d: RemoteDevice) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Komputery z zainstalowanym RustDesk.</p>
        <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]">
          <Plus className="h-4 w-4" /> Dodaj komputer
        </button>
      </div>
      {devices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400 dark:border-gray-700">
          Brak komputerów. Dodaj pierwszy, wpisując ID z RustDesk.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {devices.map((d) => (
            <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-gray-900 dark:text-white">{d.label}</h3>
                  <p className="truncate text-xs text-gray-500">{d.user ? formatUserName(d.user) : '—'}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => onEdit(d)} title="Edytuj" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(d)} title="Usuń" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mb-3 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">ID:</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">{d.rustdesk_id}</span>
                  <button onClick={() => copy(d.rustdesk_id, 'ID')} className="text-gray-400 hover:text-[#F7941D]"><Copy className="h-3.5 w-3.5" /></button>
                </div>
                {d.access_password && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Hasło:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{d.access_password}</span>
                    <button onClick={() => copy(d.access_password!, 'hasło')} className="text-gray-400 hover:text-[#F7941D]"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                {d.notes && <p className="text-xs text-gray-500">{d.notes}</p>}
              </div>
              <button onClick={() => onConnect(d)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]">
                <MonitorUp className="h-4 w-4" /> Przejmij pulpit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Device form ─────────────────────────
function DeviceForm({
  device, directory, onClose, onSaved,
}: {
  device: RemoteDevice | null;
  directory: AdminUser[];
  onClose: () => void;
  onSaved: (d: RemoteDevice) => void;
}) {
  const [userId, setUserId] = useState(device?.user_id || '');
  const [label, setLabel] = useState(device?.label || 'Komputer');
  const [rustdeskId, setRustdeskId] = useState(device?.rustdesk_id || '');
  const [password, setPassword] = useState(device?.access_password || '');
  const [notes, setNotes] = useState(device?.notes || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!userId || !rustdeskId.trim()) {
      toast.error('Wybierz pracownika i podaj ID RustDesk');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        user_id: userId,
        label: label.trim() || 'Komputer',
        rustdesk_id: rustdeskId.trim(),
        access_password: password.trim() || null,
        notes: notes.trim() || null,
      };
      const saved = device ? await api.updateDevice(device.id, payload) : await api.createDevice(payload);
      toast.success(device ? 'Zapisano zmiany' : 'Dodano komputer');
      onSaved(saved);
    } catch {
      toast.error('Nie udało się zapisać');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white';

  return (
    <Modal title={device ? 'Edytuj komputer' : 'Dodaj komputer'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pracownik</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={input}>
            <option value="">— wybierz —</option>
            {directory.map((u) => (
              <option key={u.id} value={u.id}>{formatUserName(u)}{u.department ? ` (${u.department})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nazwa komputera</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={input} placeholder="Np. Biuro – stanowisko 1" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">ID RustDesk</label>
          <input value={rustdeskId} onChange={(e) => setRustdeskId(e.target.value)} className={`${input} font-mono`} placeholder="np. 123 456 789" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Hasło stałego dostępu</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} font-mono`} placeholder="hasło ustawione w RustDesk" />
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><ShieldAlert className="h-3.5 w-3.5" /> Widoczne tylko dla działu IT.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notatki</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} placeholder="Np. parter, pokój 3" />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz
        </button>
      </div>
    </Modal>
  );
}

// ───────────────────────── Modal shell ─────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
