import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Target, Plus, Pencil, Trash2, Users, Search, X, Loader2,
  ChevronDown, ChevronRight, Mail, Phone, UserPlus, FileUp,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as api from '../api/crmProject.api';
import type { CrmProjectRecord, CrmParticipant } from '../api/crmProject.api';
import * as projectApi from '../api/project.api';
import { parseEfsCsv } from '../utils/efsCsv';

type ProjectOption = { id: string; name: string };
type ProjectForm = { projectId: string; info: string };
type ParticipantForm = {
  full_name: string; pesel: string; gender: string; age: string; education: string;
  city: string; postal_code: string; phone: string; email: string; labour_status: string;
  start_date: string; end_date: string; role: string; company: string; notes: string;
};
const EMPTY_PARTICIPANT: ParticipantForm = {
  full_name: '', pesel: '', gender: '', age: '', education: '', city: '', postal_code: '',
  phone: '', email: '', labour_status: '', start_date: '', end_date: '', role: '', company: '', notes: '',
};

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('pl-PL') : '');

export default function CrmProjects() {
  const [records, setRecords] = useState<CrmProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Projects pulled from the Projects module (source of truth for the dropdown)
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Project add/edit modal
  const [projectModal, setProjectModal] = useState<{ editing: CrmProjectRecord | null } | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>({ projectId: '', info: '' });

  // Participant add/edit modal
  const [participantModal, setParticipantModal] = useState<{ recordId: string; editing: CrmParticipant | null } | null>(null);
  const [participantForm, setParticipantForm] = useState<ParticipantForm>(EMPTY_PARTICIPANT);

  const [saving, setSaving] = useState(false);

  // Delete confirmations (system dialog, not window.confirm)
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<CrmProjectRecord | null>(null);
  const [confirmDeleteParticipant, setConfirmDeleteParticipant] = useState<CrmParticipant | null>(null);
  const [deleting, setDeleting] = useState(false);

  // CSV import (per project)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRecordIdRef = useRef<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

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

  useEffect(() => {
    projectApi.getProjects()
      .then((res) => setProjects((res.projects || []).map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setProjects([]));
  }, []);

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

  // Projects not yet added to the CRM (so a project appears once — no duplicates).
  const availableProjects = useMemo(() => {
    const used = new Set(records.map((r) => r.project_id).filter(Boolean));
    return projects.filter((p) => !used.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [projects, records]);

  // ── Project CRUD ──
  const openNewProject = () => { setProjectForm({ projectId: '', info: '' }); setProjectModal({ editing: null }); };
  const openEditProject = (r: CrmProjectRecord) => { setProjectForm({ projectId: r.project_id || '', info: r.info || '' }); setProjectModal({ editing: r }); };

  const saveProject = async () => {
    setSaving(true);
    try {
      if (projectModal?.editing) {
        await api.updateProjectRecord(projectModal.editing.id, { info: projectForm.info });
        toast.success('Zapisano projekt');
      } else {
        const picked = projects.find((p) => p.id === projectForm.projectId);
        if (!picked) { toast.error('Wybierz projekt z listy'); setSaving(false); return; }
        const created = await api.createProjectRecord({ project_id: picked.id, name: picked.name, info: projectForm.info });
        setExpanded((prev) => new Set(prev).add(created.id));
        toast.success('Dodano projekt');
      }
      setProjectModal(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się zapisać');
    } finally { setSaving(false); }
  };

  const doDeleteProject = async () => {
    if (!confirmDeleteProject) return;
    setDeleting(true);
    try {
      await api.deleteProjectRecord(confirmDeleteProject.id);
      toast.success('Usunięto projekt');
      setConfirmDeleteProject(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Nie udało się usunąć'); }
    finally { setDeleting(false); }
  };

  // ── CSV import (per project) ──
  const triggerImport = (recordId: string) => { importRecordIdRef.current = recordId; fileInputRef.current?.click(); };
  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    const recordId = importRecordIdRef.current;
    if (!file || !recordId) return;
    setImporting(recordId);
    try {
      const text = await file.text();
      const { rows } = parseEfsCsv(text);
      if (!rows.length) { toast.error('Nie znaleziono uczestników w pliku — sprawdź czy to eksport EFS (separator „;").'); return; }
      const res = await api.bulkImportParticipants(recordId, rows);
      toast.success(`Zaimportowano ${res.imported} uczestników${res.skipped ? `, pominięto ${res.skipped}` : ''}.`);
      setExpanded((prev) => new Set(prev).add(recordId));
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Nie udało się zaimportować CSV');
    } finally { setImporting(null); importRecordIdRef.current = null; }
  };

  // ── Participant CRUD ──
  const openNewParticipant = (recordId: string) => { setParticipantForm(EMPTY_PARTICIPANT); setParticipantModal({ recordId, editing: null }); };
  const openEditParticipant = (recordId: string, p: CrmParticipant) => {
    setParticipantForm({
      full_name: p.full_name, pesel: p.pesel || '', gender: p.gender || '', age: p.age != null ? String(p.age) : '',
      education: p.education || '', city: p.city || '', postal_code: p.postal_code || '', phone: p.phone || '',
      email: p.email || '', labour_status: p.labour_status || '', start_date: p.start_date ? p.start_date.slice(0, 10) : '',
      end_date: p.end_date ? p.end_date.slice(0, 10) : '', role: p.role || '', company: p.company || '', notes: p.notes || '',
    });
    setParticipantModal({ recordId, editing: p });
  };

  const saveParticipant = async () => {
    if (!participantModal) return;
    if (!participantForm.full_name.trim()) { toast.error('Podaj imię i nazwisko'); return; }
    setSaving(true);
    try {
      if (participantModal.editing) {
        await api.updateParticipant(participantModal.editing.id, { ...participantForm });
        toast.success('Zapisano uczestnika');
      } else {
        await api.addParticipant(participantModal.recordId, { ...participantForm });
        toast.success('Dodano uczestnika');
      }
      setParticipantModal(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Nie udało się zapisać');
    } finally { setSaving(false); }
  };

  const doDeleteParticipant = async () => {
    if (!confirmDeleteParticipant) return;
    setDeleting(true);
    try {
      await api.deleteParticipant(confirmDeleteParticipant.id);
      toast.success('Usunięto uczestnika');
      setConfirmDeleteParticipant(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Nie udało się usunąć'); }
    finally { setDeleting(false); }
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
                      <button onClick={() => setConfirmDeleteProject(r)} title="Usuń projekt" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {count === 0 ? (
                        <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">Brak uczestników — dodaj ręcznie lub wgraj CSV.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full whitespace-nowrap text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                              <tr>
                                <th className="px-3 py-2 text-left">Imię i nazwisko</th>
                                <th className="px-3 py-2 text-left">PESEL</th>
                                <th className="px-3 py-2 text-left">Płeć</th>
                                <th className="px-3 py-2 text-right">Wiek</th>
                                <th className="px-3 py-2 text-left">Wykształcenie</th>
                                <th className="px-3 py-2 text-left">Miejscowość</th>
                                <th className="px-3 py-2 text-left">Kontakt</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Udział</th>
                                <th className="px-3 py-2 text-right">Akcje</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {r.participants.map((p) => (
                                <tr key={p.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                                    {p.full_name}
                                    {p.extra_data && <span title={p.extra_data} className="ml-1 cursor-help text-gray-300" aria-label="Dane dodatkowe">ⓘ</span>}
                                  </td>
                                  <td className="px-3 py-2 tabular-nums text-gray-600 dark:text-gray-300">{p.pesel || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{p.gender || '—'}</td>
                                  <td className="px-3 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300">{p.age ?? '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{p.education || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{[p.postal_code, p.city].filter(Boolean).join(' ') || '—'}</td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                    <div className="flex flex-col gap-0.5">
                                      {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-[#F7941D] hover:underline"><Mail className="h-3.5 w-3.5" />{p.email}</a>}
                                      {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5 text-gray-400" />{p.phone}</a>}
                                      {!p.email && !p.phone && '—'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{p.labour_status || '—'}</td>
                                  <td className="px-3 py-2 tabular-nums text-gray-600 dark:text-gray-300">{[fmtDate(p.start_date), fmtDate(p.end_date)].filter(Boolean).join(' – ') || '—'}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button onClick={() => openEditParticipant(r.id, p)} title="Edytuj" className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setConfirmDeleteParticipant(p)} title="Usuń" className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
                        <button onClick={() => openNewParticipant(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                          <UserPlus className="h-4 w-4" /> Dodaj uczestnika
                        </button>
                        <button onClick={() => triggerImport(r.id)} disabled={importing === r.id} className="inline-flex items-center gap-1.5 rounded-lg border border-[#F7941D]/40 bg-[#F7941D]/10 px-3 py-1.5 text-sm font-semibold text-[#B76200] hover:bg-[#F7941D]/20 disabled:opacity-60 dark:text-orange-300">
                          {importing === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Wgraj CSV
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
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Projekt *</label>
                {projectModal.editing ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-200">
                    {projectModal.editing.name}
                  </div>
                ) : availableProjects.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    Wszystkie projekty są już dodane (albo brak projektów w module Projekty).
                  </p>
                ) : (
                  <select autoFocus value={projectForm.projectId} onChange={(e) => setProjectForm({ ...projectForm, projectId: e.target.value })} className={inp}>
                    <option value="">— wybierz projekt z listy —</option>
                    {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
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
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{participantModal.editing ? 'Edytuj uczestnika' : 'Nowy uczestnik'}</h3>
              <button onClick={() => setParticipantModal(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Imię i nazwisko *</label>
                <input autoFocus value={participantForm.full_name} onChange={(e) => setParticipantForm({ ...participantForm, full_name: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">PESEL / identyfikator</label>
                <input value={participantForm.pesel} onChange={(e) => setParticipantForm({ ...participantForm, pesel: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Płeć</label>
                <input value={participantForm.gender} onChange={(e) => setParticipantForm({ ...participantForm, gender: e.target.value })} className={inp} placeholder="Kobieta / Mężczyzna" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Wiek</label>
                <input type="number" value={participantForm.age} onChange={(e) => setParticipantForm({ ...participantForm, age: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Wykształcenie</label>
                <input value={participantForm.education} onChange={(e) => setParticipantForm({ ...participantForm, education: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Miejscowość</label>
                <input value={participantForm.city} onChange={(e) => setParticipantForm({ ...participantForm, city: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Kod pocztowy</label>
                <input value={participantForm.postal_code} onChange={(e) => setParticipantForm({ ...participantForm, postal_code: e.target.value })} className={inp} />
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
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Status na rynku pracy</label>
                <input value={participantForm.labour_status} onChange={(e) => setParticipantForm({ ...participantForm, labour_status: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Data rozpoczęcia udziału</label>
                <input type="date" value={participantForm.start_date} onChange={(e) => setParticipantForm({ ...participantForm, start_date: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Data zakończenia udziału</label>
                <input type="date" value={participantForm.end_date} onChange={(e) => setParticipantForm({ ...participantForm, end_date: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Rola / rodzaj uczestnika</label>
                <input value={participantForm.role} onChange={(e) => setParticipantForm({ ...participantForm, role: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Firma / instytucja</label>
                <input value={participantForm.company} onChange={(e) => setParticipantForm({ ...participantForm, company: e.target.value })} className={inp} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Notatki</label>
                <textarea rows={3} value={participantForm.notes} onChange={(e) => setParticipantForm({ ...participantForm, notes: e.target.value })} className={inp + ' resize-y'} />
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
              <button onClick={() => setParticipantModal(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Anuluj</button>
              <button onClick={saveParticipant} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e0850f] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden CSV file input (shared, triggered per project) */}
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChosen} />

      <ConfirmDialog
        isOpen={confirmDeleteProject !== null}
        onClose={() => setConfirmDeleteProject(null)}
        onConfirm={doDeleteProject}
        title="Usuń projekt"
        message={`Czy na pewno usunąć projekt „${confirmDeleteProject?.name}" wraz ze wszystkimi uczestnikami? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={confirmDeleteParticipant !== null}
        onClose={() => setConfirmDeleteParticipant(null)}
        onConfirm={doDeleteParticipant}
        title="Usuń uczestnika"
        message={`Czy na pewno usunąć uczestnika „${confirmDeleteParticipant?.full_name}"? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
        loading={deleting}
      />
    </MainLayout>
  );
}
