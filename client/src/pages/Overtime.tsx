import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import {
  Clock,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Users,
  X,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as worklogApi from '../api/worklog.api';
import * as projectApi from '../api/project.api';
import * as taskApi from '../api/task.api';
import { OvertimeSummaryEntry, WorkLogType } from '../types/worklog.types';
import { Project } from '../types/project.types';
import { Task } from '../types/task.types';

type ModalType = 'overtime' | 'collection' | null;

interface LogForm {
  work_date: string;
  hours: string;
  description: string;
  project_id: string;
  task_id: string;
}

export default function Overtime() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OvertimeSummaryEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LogForm>({
    work_date: new Date().toISOString().split('T')[0],
    hours: '',
    description: '',
    project_id: '',
    task_id: '',
  });

  const myEntry = summary.find((s) => s.user_id === user?.id);

  useEffect(() => {
    fetchData();
  }, []);

  // Load tasks when project changes
  useEffect(() => {
    if (form.project_id) {
      setTasksLoading(true);
      setForm((f) => ({ ...f, task_id: '' }));
      taskApi.getProjectTasks(form.project_id)
        .then((data) => setTasks(Array.isArray(data) ? data : []))
        .catch(() => setTasks([]))
        .finally(() => setTasksLoading(false));
    } else {
      setTasks([]);
      setForm((f) => ({ ...f, task_id: '' }));
    }
  }, [form.project_id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [summaryData, projectsData] = await Promise.all([
        worklogApi.getOvertimeSummary(),
        projectApi.getProjects(),
      ]);
      setSummary(summaryData);
      setProjects((projectsData as any).projects ?? projectsData);
    } catch {
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }

  function openModal(type: ModalType) {
    setTasks([]);
    setForm({
      work_date: new Date().toISOString().split('T')[0],
      hours: '',
      description: '',
      project_id: '',
      task_id: '',
    });
    setModal(type);
  }

  async function handleSubmit() {
    if (!form.hours || parseFloat(form.hours) <= 0) {
      toast.error('Podaj liczbę godzin');
      return;
    }
    setSubmitting(true);
    try {
      await worklogApi.createWorkLog({
        work_date: form.work_date,
        hours: parseFloat(form.hours),
        description: form.description || undefined,
        project_id: form.project_id || undefined,
        task_id: form.task_id || undefined,
        work_type: modal === 'overtime' ? WorkLogType.OVERTIME : WorkLogType.OVERTIME_COMP,
      });
      toast.success(modal === 'overtime' ? 'Nadgodziny dodane' : 'Odbiór zarejestrowany');
      setModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSubmitting(false);
    }
  }

  const balanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const selectClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  return (
    <MainLayout title="Nadgodziny">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Moduł nadgodzin
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nadgodziny i odbiory</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Ewidencja nadgodzin i odbiorów zespołu
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openModal('collection')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Minus className="h-4 w-4" />
              Odbiór nadgodzin
            </button>
            <button
              onClick={() => openModal('overtime')}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Plus className="h-4 w-4" />
              Dodaj nadgodziny
            </button>
          </div>
        </div>

        {/* My Overtime Stats */}
        {myEntry && (
          <div className="mb-6">
            <div className="mb-3 px-1">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Moje nadgodziny</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                    <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {myEntry.total_overtime.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nadgodziny łącznie</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {myEntry.overtime_this_month.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">W tym miesiącu</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                    <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {myEntry.total_collected.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Odebrane łącznie</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30">
                    <Minus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {myEntry.collected_this_month.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Odebrane w tym mcu</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    myEntry.balance > 0
                      ? 'bg-green-50 dark:bg-green-900/30'
                      : myEntry.balance < 0
                        ? 'bg-red-50 dark:bg-red-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {myEntry.balance > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : myEntry.balance < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${
                      myEntry.balance > 0
                        ? 'text-green-600'
                        : myEntry.balance < 0
                          ? 'text-red-600'
                          : 'text-gray-900 dark:text-white'
                    }`}>
                      {myEntry.balance > 0 ? '+' : ''}{myEntry.balance.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Summary */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
            <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Zestawienie zespołu</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-600 dark:border-gray-400"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie...</p>
              </div>
            </div>
          ) : summary.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg px-4 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Brak zarejestrowanych nadgodzin</h3>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                Zacznij od dodania nadgodzin lub odboru
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-t border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Pracownik</th>
                    <th className="px-4 py-3 text-right">Nadgodziny łącznie</th>
                    <th className="px-4 py-3 text-right">W tym miesiącu</th>
                    <th className="px-4 py-3 text-right">Odebrane łącznie</th>
                    <th className="px-4 py-3 text-right">Odebrane m-cy</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {summary.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        entry.user_id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                            {entry.first_name[0]}{entry.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900 dark:text-white">
                              {entry.first_name} {entry.last_name}
                            </p>
                            {entry.user_id === user?.id && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">To Ty</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {entry.total_overtime.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                        {entry.overtime_this_month.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {entry.total_collected.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {entry.collected_this_month.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${balanceColor(entry.balance)}`}>
                          {entry.balance > 0 ? '+' : ''}{entry.balance.toFixed(1)}h
                        </span>
                        {entry.balance < 0 && (
                          <span className="ml-1 block text-xs text-red-500">zaległe</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {modal === 'overtime' ? (
                  <Plus className="h-5 w-5 text-gray-900 dark:text-white" />
                ) : (
                  <Minus className="h-5 w-5 text-gray-900 dark:text-white" />
                )}
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {modal === 'overtime' ? 'Dodaj nadgodziny' : 'Zarejestruj odbiór nadgodzin'}
                </h2>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {modal === 'collection' && (
                <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Rejestrujesz odbiór swoich nadgodzin. Upewnij się że uzgodniłeś to z przełożonym.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={form.work_date}
                    onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Liczba godzin</label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    placeholder="np. 2.5"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Project + task selectors — only for overtime, not collection */}
              {modal === 'overtime' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Projekt <span className="text-gray-400 font-normal">(opcjonalnie)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.project_id}
                        onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                        className={selectClass}
                      >
                        <option value="">— brak projektu —</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {form.project_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zadanie <span className="text-gray-400 font-normal">(opcjonalnie)</span>
                      </label>
                      <div className="relative">
                        {tasksLoading ? (
                          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                            Ładowanie zadań...
                          </div>
                        ) : (
                          <>
                            <select
                              value={form.task_id}
                              onChange={(e) => setForm({ ...form, task_id: e.target.value })}
                              className={selectClass}
                            >
                              <option value="">— brak zadania —</option>
                              {tasks.map((t) => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          </>
                        )}
                      </div>
                      {!tasksLoading && tasks.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">Brak zadań w tym projekcie</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opis</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder={modal === 'overtime' ? 'Zakres prac w nadgodzinach...' : 'Powód odbioru...'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-60 ${
                  modal === 'overtime' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {submitting ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
