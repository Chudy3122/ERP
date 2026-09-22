import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Target, Plus, Pencil, Trash2, Users, Search, X, Loader2,
  ChevronDown, ChevronRight, Mail, Phone, Building2, UserPlus,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import * as api from '../api/crmProject.api';
import type { CrmProjectRecord, CrmParticipant } from '../api/crmProject.api';

type ProjectForm = { name: string; info: string };
type ParticipantForm = {
  full_name: string; role: string; company: string; email: string; phone: string; notes: string;
};
const EMPTY_PARTICIPANT: ParticipantForm = { full_name: '', role: '', company: '', email: '', phone: '', notes: '' };

export default function CrmProjects() {
  const [records, setRecords] = useState<CrmProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Project add/edit modal
  const [projectModal, setProjectModal] = useState<{ editing: CrmProjectRecord | null } | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>({ name: '', info: '' });

  // Participant add/edit modal
  const [participantModal, setParticipantModal] = useState<{ recordId: string; editing: CrmParticipant | null } | null>(null);
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(EMPTY_PARTICIPANT);

  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRecords(await api.listProjectRecords());
    } catch {
      toast.error('Nie udało się pobrać danych projektowych');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      if (r.name.toLowerCase().includes(q) || (r.info || '').toLowerCase().includes(q)) return true;
      return r.participants?.some((p) =>
        [p.full_name, p.role, p.company, p.email, p.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
      );
    });
  }, [records, search]);

  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Project CRUD ──
  const openNewProject = () => { setProjectForm({ name: '', info: '' }); setProjectModal({ editing: null }); };
  const openEditProject = (r: CrmProjectRecord) => { setProjectForm({ name: r.name, info: r.info || '' }); setProjectModal({ editing: r }); };

  const saveProject = async () => {
    if (!projectForm.name.trim()) { toast.error('Podaj nazwę projektu'); return; }
    setSaving(true);
    try {
      if (projectModal?.editing) {
        await api.updateProjectRecord(projectModal.editing.id, { name: projectForm.name, info: projectForm.info });
        toast.success('Zapisano projekt');
      } else {
        const created = await api.createProjectRecord({ name: projectForm.name, info: projectForm.info });
        setExpanded((prev) => new Set(prev).add(created.id));
        toast.success('Dodano projekt');
      }
      setProjectModal(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się zapisać');
    } finally { setSaving(false); }
  };

  const deleteProject = async (r: CrmProjectRecord) => {
    if (!window.confirm(`Usunąć projekt „${r.name}" wraz z uczestnikami? Tej operacji nie można cofnąć.`)) return;
    try {
      await api.deleteProjectRecord(r.id);
      toast.success('Usunięto projekt');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Nie udało się usunąć'); }
  };

  // ── Participant CRUD ──
  const openNewParticipant = (recordId: string) => { setParticipantForm(EMPTY_PARTICIPANT); setParticipantModal({ recordId, editing: null }); };
  const openEditParticipant = (recordId: string, p: CrmParticipant) => {
    setParticipantForm({ full_name: p.full_name, role: p.role || '', company: p.company || '', email: p.email || '', phone: p.phone || '', notes: p.notes || '' });
    setParticipantModal({ recordId, editing: p });
  };

  const saveParticipant = async () => {
    if (!participantModal) return;
    if (!participantForm.full_name.trim()) { toast.error('Podaj imię i nazwisko'); return; }
    setSaving(true);
    try {
      if (participantModal.editing) {
        await api.updateParticipant(participantModal.editing.id, participantForm);
        toast.success('Zapisano uczestnika');
      } else {
        await api.addParticipant(participantModal.recordId, participantForm);
        toast.success('Dodano uczestnika');
      }
      setParticipantModal(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się zapisać');
    } finally { setSaving(false); }
  };

  const deleteParticipant = async (p: CrmParticipant) => {
    if (!window.confirm(`Usunąć uczestnika „${p.full_name}"?`)) return;
    try {
      await api.deleteParticipant(p.id);
      toast.success('Usunięto uczestnika');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Nie udało się usunąć'); }
  };

  const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  return (
    <MainLayout title="Dane projektowe">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">CRM · Dane projektowe</p>
              <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Projekty i uczestnicy</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Zapisuj projekty i osoby w nich uczestniczące wraz z danymi kontaktowymi.</p>
            </div>
          </div>
          <button onClick={openNewProject} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f]">
            <Plus className="h-4 w-4" /> Dodaj projekt
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder="Szukaj projektu, osoby, firmy..." className={inp + ' pl-9'} />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <Target className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{search ? 'Brak pasujących projektów.' : 'Brak projektów — dodaj pierwszy.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const open = expanded.has(r.id);
              const count = r.participants?.length || 0;
              return (
                <div key={r.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start gap-3 p-4">
                    <button onClick={() => toggle(r.id)} className="mt-0.5 rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggle(r.id)}>
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">{r.name}</h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          <Users className="h-3 w-3" /> {count}
                        </span>
                      </div>
                      {r.info && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-500 dark:text-gray-400">{r.info}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => openEditProject(r)} title="Edytuj projekt" className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteProject(r)} title="Usuń projekt" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {count === 0 ? (
                        <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">Brak uczestników.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                              <tr>
                                <th className="px-4 py-2 text-left">Imię i nazwisko</th>
                                <th className="px-4 py-2 text-left">Rola / funkcja</th>
                                <th className="px-4 py-2 text-left">Firma / instytucja</th>
                                <th className="px-4 py-2 text-left">Kontakt</th>
                                <th className="px-4 py-2 text-left">Notatki</th>
                                <th className="px-4 py-2 text-right">Akcje</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {r.participants.map((p) => (
                                <tr key={p.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{p.full_name}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{p.role || '—'}</td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                    {p.company ? <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-gray-400" />{p.company}</span> : '—'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                                    <div className="flex flex-col gap-0.5">
                                      {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-[#F7941D] hover:underline"><Mail className="h-3.5 w-3.5" />{p.email}</a>}
                                      {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5 text-gray-400" />{p.phone}</a>}
                                      {!p.email && !p.phone && '—'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400"><span className="whitespace-pre-wrap">{p.notes || '—'}</span></td>
                                  <td className="px-4 py-2 text-right">
                                    <button onClick={() => openEditParticipant(r.id, p)} title="Edytuj" className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => deleteParticipant(p)} title="Usuń" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
                        <button onClick={() => openNewParticipant(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                          <UserPlus className="h-4 w-4" /> Dodaj uczestnika
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project modal */}
      {projectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProjectModal(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{projectModal.editing ? 'Edytuj projekt' : 'Nowy projekt'}</h3>
              <button onClick={() => setProjectModal(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Nazwa projektu *</label>
                <input autoFocus value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className={inp} placeholder="np. Budowa hali produkcyjnej" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Informacje (opcjonalnie)</label>
                <textarea rows={4} value={projectForm.info} onChange={(e) => setProjectForm({ ...projectForm, info: e.target.value })} className={inp + ' resize-y'} placeholder="Opis, terminy, uwagi..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
              <button onClick={() => setProjectModal(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
              <button onClick={saveProject} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* Participant modal */}
      {participantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setParticipantModal(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{participantModal.editing ? 'Edytuj uczestnika' : 'Nowy uczestnik'}</h3>
              <button onClick={() => setParticipantModal(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Imię i nazwisko *</label>
                <input autoFocus value={participantForm.full_name} onChange={(e) => setParticipantForm({ ...participantForm, full_name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Rola / funkcja</label>
                <input value={participantForm.role} onChange={(e) => setParticipantForm({ ...participantForm, role: e.target.value })} className={inp} placeholder="np. Inwestor, Projektant" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Firma / instytucja</label>
                <input value={participantForm.company} onChange={(e) => setParticipantForm({ ...participantForm, company: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">E-mail</label>
                <input type="email" value={participantForm.email} onChange={(e) => setParticipantForm({ ...participantForm, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Telefon</label>
                <input value={participantForm.phone} onChange={(e) => setParticipantForm({ ...participantForm, phone: e.target.value })} className={inp} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Notatki</label>
                <textarea rows={3} value={participantForm.notes} onChange={(e) => setParticipantForm({ ...participantForm, notes: e.target.value })} className={inp + ' resize-y'} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
              <button onClick={() => setParticipantModal(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
              <button onClick={saveParticipant} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
