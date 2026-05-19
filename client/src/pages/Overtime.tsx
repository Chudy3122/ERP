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

  const selectClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nadgodziny</h1>
            <p className="text-sm text-gray-500 mt-1">Ewidencja nadgodzin i odbiorów zespołu</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openModal('collection')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              <Minus className="w-4 h-4" />
              Odbiór nadgodzin
            </button>
            <button
              onClick={() => openModal('overtime')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Dodaj nadgodziny
            </button>
          </div>
        </div>

        {/* My summary cards */}
        {myEntry && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Nadgodziny łącznie</p>
              <p className="text-2xl font-bold text-gray-900">{myEntry.total_overtime.toFixed(1)}h</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Nadgodziny w tym miesiącu</p>
              <p className="text-2xl font-bold text-blue-600">{myEntry.overtime_this_month.toFixed(1)}h</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Odebrane łącznie</p>
              <p className="text-2xl font-bold text-gray-900">{myEntry.total_collected.toFixed(1)}h</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Odebrane w tym miesiącu</p>
              <p className="text-2xl font-bold text-gray-900">{myEntry.collected_this_month.toFixed(1)}h</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Saldo</p>
              <div className="flex items-center gap-1">
                {myEntry.balance > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : myEntry.balance < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                ) : null}
                <p className={`text-2xl font-bold ${balanceColor(myEntry.balance)}`}>
                  {myEntry.balance > 0 ? '+' : ''}{myEntry.balance.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-100">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Zestawienie zespołu</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : summary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock className="w-10 h-10 mb-2" />
              <p className="text-sm">Brak zarejestrowanych nadgodzin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Pracownik</th>
                    <th className="px-4 py-3 text-right">Nadgodziny łącznie</th>
                    <th className="px-4 py-3 text-right">Nadgodziny w tym miesiącu</th>
                    <th className="px-4 py-3 text-right">Odebrane łącznie</th>
                    <th className="px-4 py-3 text-right">Odebrane w tym miesiącu</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.map((entry) => (
                    <tr
                      key={entry.user_id}
                      className={`hover:bg-gray-50 ${entry.user_id === user?.id ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                            {entry.first_name[0]}{entry.last_name[0]}
                          </div>
                          {entry.first_name} {entry.last_name}
                          {entry.user_id === user?.id && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">Ty</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{entry.total_overtime.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">{entry.overtime_this_month.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-gray-700">{entry.total_collected.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right text-gray-700">{entry.collected_this_month.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${balanceColor(entry.balance)}`}>
                          {entry.balance > 0 ? '+' : ''}{entry.balance.toFixed(1)}h
                        </span>
                        {entry.balance < 0 && (
                          <span className="ml-1 text-xs text-red-500">(zaległe)</span>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modal === 'overtime' ? (
                  <Plus className="w-5 h-5 text-blue-600" />
                ) : (
                  <Minus className="w-5 h-5 text-orange-500" />
                )}
                <h2 className="text-base font-semibold text-gray-900">
                  {modal === 'overtime' ? 'Dodaj nadgodziny' : 'Rejestruj odbiór nadgodzin'}
                </h2>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modal === 'collection' && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
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
