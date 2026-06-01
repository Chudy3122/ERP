import { useState, useEffect, useRef } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import * as procedureApi from '../api/procedure.api';
import { Procedure, ProcedureStatus, CreateProcedureRequest } from '../types/procedure.types';
import { getFileUrl } from '../api/axios-config';

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const CATEGORIES = ['Wszystkie', 'IT', 'HR', 'Finanse', 'Operacje', 'BHP', 'Jakość', 'Sprzedaż', 'Inne'];

const STATUS_LABELS: Record<ProcedureStatus, string> = {
  [ProcedureStatus.DRAFT]: 'Szkic',
  [ProcedureStatus.ACTIVE]: 'Aktywna',
  [ProcedureStatus.ARCHIVED]: 'Zarchiwizowana',
};

const STATUS_COLORS: Record<ProcedureStatus, string> = {
  [ProcedureStatus.DRAFT]: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  [ProcedureStatus.ACTIVE]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [ProcedureStatus.ARCHIVED]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const emptyForm: CreateProcedureRequest = {
  title: '',
  description: '',
  content: '',
  category: '',
  status: ProcedureStatus.DRAFT,
  version: '1.0',
};

export default function Procedures() {
  const { user } = useAuth();
  const isEditor = user?.role === 'admin' || user?.role === 'kierownik';

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Wszystkie');
  const [activeStatus, setActiveStatus] = useState<string>('');
  const [selected, setSelected] = useState<Procedure | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProcedureRequest>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ name: string; url: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const attachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [activeCategory, activeStatus]);

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selected) return;
    try {
      setUploadingAttachment(true);
      const updated = await procedureApi.uploadProcedureAttachments(selected.id, Array.from(files));
      setSelected(updated);
      setProcedures((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      setError('Nie udało się dodać załącznika');
    } finally {
      setUploadingAttachment(false);
      if (attachInputRef.current) attachInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (url: string) => {
    if (!selected) return;
    try {
      const updated = await procedureApi.deleteProcedureAttachment(selected.id, url);
      setSelected(updated);
      setProcedures((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      setError('Nie udało się usunąć załącznika');
    }
  };

  const load = async () => {
    try {
      setIsLoading(true);
      const cat = activeCategory === 'Wszystkie' ? undefined : activeCategory;
      const status = activeStatus || undefined;
      const data = await procedureApi.getProcedures(cat, status);
      setProcedures(data);
      setCurrentPage(1);
    } catch {
      setError('Nie udało się załadować procedur');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = procedures.filter((p) =>
    search === '' ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const totalProcedures = procedures.length;
  const activeProcedures = procedures.filter((p) => p.status === ProcedureStatus.ACTIVE).length;
  const draftProcedures = procedures.filter((p) => p.status === ProcedureStatus.DRAFT).length;
  const archivedProcedures = procedures.filter((p) => p.status === ProcedureStatus.ARCHIVED).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filtered.length);
  const paginatedProcedures = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const statCards = [
    {
      label: 'Wszystkie procedury',
      value: totalProcedures,
      icon: BookOpen,
      iconClass: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
    },
    {
      label: 'Aktywne',
      value: activeProcedures,
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    {
      label: 'Szkice',
      value: draftProcedures,
      icon: FileText,
      iconClass: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      label: 'Archiwum',
      value: archivedProcedures,
      icon: Archive,
      iconClass: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
    },
  ];

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setSelected(null);
  };

  const openEdit = (p: Procedure) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description ?? '',
      content: p.content,
      category: p.category ?? '',
      status: p.status,
      version: p.version,
    });
    setShowForm(true);
    setSelected(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Tytuł i treść są wymagane');
      return;
    }
    try {
      setIsSaving(true);
      setError('');
      if (editingId) {
        await procedureApi.updateProcedure(editingId, form);
      } else {
        await procedureApi.createProcedure(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch {
      setError('Błąd podczas zapisywania procedury');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę procedurę?')) return;
    try {
      await procedureApi.deleteProcedure(id);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch {
      setError('Błąd podczas usuwania procedury');
    }
  };

  return (
    <MainLayout title="Procedury">
      <div className="mx-auto flex max-w-[1600px] flex-col space-y-6">
        {/* Header */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Wiedza firmowa</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-gray-950 dark:text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <BookOpen className="h-5 w-5" />
              </span>
              Procedury
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Baza procedur, norm i standardów firmowych
            </p>
          </div>
          {isEditor && (
            <button
              onClick={openNew}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
            >
              <Plus className="h-4 w-4" />
              Nowa procedura
            </button>
          )}
        </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-950 dark:text-white">{card.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Form panel */}
        {showForm && (
          <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Edytuj procedurę' : 'Nowa procedura'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tytuł *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Nazwa procedury"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kategoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
                >
                  <option value="">— brak —</option>
                  {CATEGORIES.filter((c) => c !== 'Wszystkie').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProcedureStatus })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Wersja</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="1.0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Krótki opis</label>
                <input
                  type="text"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opcjonalny opis procedury"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Treść procedury *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Opisz procedurę krok po kroku..."
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 focus:border-[#F7941D] resize-y font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-[#F7941D] hover:bg-[#e08317] text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Zapisywanie...' : 'Zapisz procedurę'}
              </button>
            </div>
          </div>
        )}

        <div className="flex min-h-[520px] flex-col gap-4 xl:flex-row">
          {/* Left panel — list */}
          <div className={`flex min-w-0 flex-col ${selected ? 'xl:w-[390px] xl:flex-shrink-0' : 'flex-1'}`}>
            {/* Filters */}
            <div className="mb-3 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj procedur..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-[#F7941D] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex gap-1">
                {[{ val: '', label: 'Wszystkie' }, { val: 'active', label: 'Aktywne' }, { val: 'draft', label: 'Szkice' }, { val: 'archived', label: 'Archiwum' }].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => {
                      setActiveStatus(s.val);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeStatus === s.val
                        ? 'bg-[#F7941D] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-[#F7941D]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Brak procedur</p>
                </div>
              ) : (
                paginatedProcedures.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                    className={`bg-white dark:bg-gray-800 border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                      selected?.id === p.id
                        ? 'border-[#F7941D] shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[p.status]}`}>
                            {STATUS_LABELS[p.status]}
                          </span>
                          {p.category && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                              <Tag className="w-2.5 h-2.5" />
                              {p.category}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">v{p.version}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.title}</h3>
                        {p.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{p.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                          {p.creator && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {p.creator.first_name} {p.creator.last_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(p.updated_at).toLocaleDateString('pl-PL')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${selected?.id === p.id ? 'rotate-90 text-[#F7941D]' : ''}`} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {!isLoading && filtered.length > 0 && (
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <div>
                  Pokazano {pageStart}-{pageEnd} z {filtered.length} procedur
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2">
                    <span>Na stronie</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-medium text-gray-700 dark:text-gray-200">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel — detail */}
          {selected && (
            <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex flex-col min-h-0">
              {/* Detail header */}
              <div className="flex items-start justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.status]}`}>
                      {STATUS_LABELS[selected.status]}
                    </span>
                    {selected.category && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                        <Tag className="w-3 h-3" />
                        {selected.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">v{selected.version}</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selected.title}</h2>
                  {selected.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selected.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {selected.creator && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Autor: {selected.creator.first_name} {selected.creator.last_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Aktualizacja: {new Date(selected.updated_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {isEditor && (
                    <>
                      <button
                        onClick={() => openEdit(selected)}
                        className="p-2 text-gray-500 hover:text-[#F7941D] hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        title="Edytuj"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDelete(selected.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Usuń"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
                  {selected.content}
                </pre>

                {/* Attachments */}
                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <Paperclip className="w-4 h-4" />
                      Załączniki ({selected.attachments?.length || 0})
                    </h3>
                    {isEditor && (
                      <>
                        <input
                          ref={attachInputRef}
                          type="file"
                          accept="application/pdf"
                          multiple
                          onChange={handleUploadAttachment}
                          className="hidden"
                        />
                        <button
                          onClick={() => attachInputRef.current?.click()}
                          disabled={uploadingAttachment}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F7941D]/10 px-3 py-1.5 text-xs font-medium text-[#F7941D] hover:bg-[#F7941D]/20 disabled:opacity-60"
                        >
                          {uploadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Dodaj PDF
                        </button>
                      </>
                    )}
                  </div>

                  {(!selected.attachments || selected.attachments.length === 0) ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Brak załączników</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.attachments.map((att) => (
                        <div key={att.url} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-gray-300" title={att.name}>{att.name}</span>
                          <span className="text-xs text-gray-400">{(att.size / 1024).toFixed(0)} KB</span>
                          <button
                            onClick={() => setPdfPreview({ name: att.name, url: att.url })}
                            className="p-1.5 rounded text-gray-400 hover:text-[#F7941D] hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Podgląd"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={getFileUrl(att.url) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Otwórz w nowej karcie"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                          {isEditor && (
                            <button
                              onClick={() => handleDeleteAttachment(att.url)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Usuń"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF preview modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPdfPreview(null)}>
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <FileText className="h-4 w-4 text-red-500" />
                {pdfPreview.name}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={getFileUrl(pdfPreview.url) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Otwórz w nowej karcie
                </a>
                <button onClick={() => setPdfPreview(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe src={getFileUrl(pdfPreview.url) || ''} title={pdfPreview.name} className="flex-1 w-full" />
          </div>
        </div>
      )}
    </MainLayout>
  );
}
