import { useState, useEffect, Fragment } from 'react';
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
  Pencil,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as worklogApi from '../api/worklog.api';
import * as projectApi from '../api/project.api';
import * as taskApi from '../api/task.api';
import * as adminApi from '../api/admin.api';
import { OvertimeSummaryEntry, WorkLogType, WorkLog } from '../types/worklog.types';
import { Project, ProjectMember } from '../types/project.types';
import { Task } from '../types/task.types';
import type { AdminUser } from '../types/admin.types';

type ModalType = 'overtime' | 'collection' | null;
type ManageTypeFilter = 'all' | WorkLogType.OVERTIME | WorkLogType.OVERTIME_COMP;
type ManageSort = 'newest' | 'oldest';
type TeamBalanceFilter = 'all' | 'positive' | 'zero' | 'negative';
type TeamSort = 'name' | 'balance_desc' | 'balance_asc' | 'overtime_desc';

interface LogForm {
  work_date: string;
  hours: string;
  minutes: string;
  description: string;
  project_id: string;
  task_id: string;
  user_id: string;
}

interface EditLogForm {
  work_date: string;
  hours: string;
  minutes: string;
  description: string;
  work_type: WorkLogType.OVERTIME | WorkLogType.OVERTIME_COMP;
}

/** Format decimal hours (e.g. 6.03) as "6h 02min" / "45min" / "6h". */
function formatHM(value: number | string): string {
  const v = Number(value) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  let h = Math.floor(abs);
  let m = Math.round((abs - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  if (h === 0 && m === 0) return '0h';
  if (m === 0) return `${sign}${h}h`;
  if (h === 0) return `${sign}${m}min`;
  return `${sign}${h}h ${String(m).padStart(2, '0')}min`;
}

export default function Overtime() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OvertimeSummaryEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembersById, setProjectMembersById] = useState<Record<string, ProjectMember[]>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LogForm>({
    work_date: new Date().toISOString().split('T')[0],
    hours: '',
    minutes: '',
    description: '',
    project_id: '',
    task_id: '',
    user_id: '',
  });

  const isAdmin = user?.role === 'admin';
  const canManageEntries = user?.role === 'admin' || user?.role === 'kadry';
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  // Manage-entries modal (admin: view/delete a user's overtime entries)
  const [manageUser, setManageUser] = useState<OvertimeSummaryEntry | null>(null);
  const [manageLogs, setManageLogs] = useState<WorkLog[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageSearch, setManageSearch] = useState('');
  const [manageTypeFilter, setManageTypeFilter] = useState<ManageTypeFilter>('all');
  const [manageSort, setManageSort] = useState<ManageSort>('newest');
  const [managePage, setManagePage] = useState(1);
  const [managePageSize, setManagePageSize] = useState<10 | 30 | 50>(10);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditLogForm>({
    work_date: '',
    hours: '',
    minutes: '',
    description: '',
    work_type: WorkLogType.OVERTIME,
  });
  const [myLogs, setMyLogs] = useState<WorkLog[]>([]);
  const [myLogsTypeFilter, setMyLogsTypeFilter] = useState<ManageTypeFilter>('all');
  const [myLogsSort, setMyLogsSort] = useState<ManageSort>('newest');
  const [myLogsPage, setMyLogsPage] = useState(1);
  const [myLogsPageSize, setMyLogsPageSize] = useState<10 | 30 | 50>(10);
  // Expandable team rows: view a person's entries inline (for those who see more than themselves)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<WorkLog[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDepartment, setTeamDepartment] = useState('all');
  const [teamBalanceFilter, setTeamBalanceFilter] = useState<TeamBalanceFilter>('all');
  const [teamSort, setTeamSort] = useState<TeamSort>('name');
  const canExpand = ['admin', 'kadry', 'szef', 'kierownik'].includes(user?.role || '');

  const myEntry = summary.find((s) => s.user_id === user?.id);
  const selectedProjectUserId = isAdmin && form.user_id ? form.user_id : user?.id;
  const availableProjects = projects.filter((project) => {
    if (!selectedProjectUserId) return false;

    const members = projectMembersById[project.id] ?? project.members ?? [];
    return members.some((member) => member.user_id === selectedProjectUserId && !member.left_at);
  });

  // Admin / księgowość / szef see everyone grouped by department
  const groupByDept = ['admin', 'kadry', 'szef'].includes(user?.role || '');
  const teamDepartments = Array.from(
    new Set(summary.map((entry) => entry.department || 'Bez działu')),
  ).sort((a, b) => a.localeCompare(b, 'pl'));
  const normalizedTeamSearch = teamSearch.trim().toLocaleLowerCase('pl');
  const filteredTeamSummary = [...summary]
    .filter((entry) => {
      if (!normalizedTeamSearch) return true;
      return `${entry.first_name} ${entry.last_name} ${entry.department || 'Bez działu'}`
        .toLocaleLowerCase('pl')
        .includes(normalizedTeamSearch);
    })
    .filter((entry) => teamDepartment === 'all' || (entry.department || 'Bez działu') === teamDepartment)
    .filter((entry) => {
      if (teamBalanceFilter === 'positive') return entry.balance > 0;
      if (teamBalanceFilter === 'negative') return entry.balance < 0;
      if (teamBalanceFilter === 'zero') return entry.balance === 0;
      return true;
    })
    .sort((a, b) => {
      if (teamSort === 'balance_desc') return b.balance - a.balance;
      if (teamSort === 'balance_asc') return a.balance - b.balance;
      if (teamSort === 'overtime_desc') return b.total_overtime - a.total_overtime;
      return a.first_name.localeCompare(b.first_name, 'pl') || a.last_name.localeCompare(b.last_name, 'pl');
    });
  const groupedSummary: Record<string, OvertimeSummaryEntry[]> = {};
  if (groupByDept) {
    for (const entry of filteredTeamSummary) {
      const key = entry.department || 'Bez działu';
      (groupedSummary[key] ||= []).push(entry);
    }
  }
  const deptKeys = Object.keys(groupedSummary).sort((a, b) => a.localeCompare(b, 'pl'));
  const normalizedManageSearch = manageSearch.trim().toLocaleLowerCase('pl');
  const filteredManageLogs = manageLogs
    .filter((log) => manageTypeFilter === 'all' || log.work_type === manageTypeFilter)
    .filter((log) => {
      if (!normalizedManageSearch) return true;
      const searchableText = [
        log.description,
        log.project?.name,
        log.task?.title,
        formatHM(log.hours),
        new Date(log.work_date).toLocaleDateString('pl-PL'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pl');
      return searchableText.includes(normalizedManageSearch);
    })
    .sort((a, b) => {
      const difference = new Date(b.work_date).getTime() - new Date(a.work_date).getTime();
      return manageSort === 'newest' ? difference : -difference;
    });
  const manageTotalPages = Math.max(1, Math.ceil(filteredManageLogs.length / managePageSize));
  const managePageStart = (managePage - 1) * managePageSize;
  const paginatedManageLogs = filteredManageLogs.slice(managePageStart, managePageStart + managePageSize);
  const manageRangeStart = filteredManageLogs.length === 0 ? 0 : managePageStart + 1;
  const manageRangeEnd = Math.min(managePageStart + managePageSize, filteredManageLogs.length);
  const visiblePageStart = Math.max(1, Math.min(managePage - 2, manageTotalPages - 4));
  const visibleManagePages = Array.from(
    { length: Math.min(5, manageTotalPages) },
    (_, index) => visiblePageStart + index,
  );
  const filteredMyLogs = myLogs
    .filter((log) => myLogsTypeFilter === 'all' || log.work_type === myLogsTypeFilter)
    .sort((a, b) => {
      const difference = new Date(b.work_date).getTime() - new Date(a.work_date).getTime();
      return myLogsSort === 'newest' ? difference : -difference;
    });
  const myLogsTotalPages = Math.max(1, Math.ceil(filteredMyLogs.length / myLogsPageSize));
  const myLogsPageStart = (myLogsPage - 1) * myLogsPageSize;
  const paginatedMyLogs = filteredMyLogs.slice(myLogsPageStart, myLogsPageStart + myLogsPageSize);
  const myLogsRangeStart = filteredMyLogs.length === 0 ? 0 : myLogsPageStart + 1;
  const myLogsRangeEnd = Math.min(myLogsPageStart + myLogsPageSize, filteredMyLogs.length);
  const myLogsVisiblePageStart = Math.max(1, Math.min(myLogsPage - 2, myLogsTotalPages - 4));
  const visibleMyLogsPages = Array.from(
    { length: Math.min(5, myLogsTotalPages) },
    (_, index) => myLogsVisiblePageStart + index,
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setManagePage(1);
  }, [manageSearch, manageTypeFilter, manageSort, managePageSize]);

  useEffect(() => {
    setManagePage((page) => Math.min(page, manageTotalPages));
  }, [manageTotalPages]);

  useEffect(() => {
    setMyLogsPage(1);
  }, [myLogsTypeFilter, myLogsSort, myLogsPageSize]);

  useEffect(() => {
    setMyLogsPage((page) => Math.min(page, myLogsTotalPages));
  }, [myLogsTotalPages]);

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

  useEffect(() => {
    if (form.project_id && !availableProjects.some((project) => project.id === form.project_id)) {
      setForm((currentForm) => ({ ...currentForm, project_id: '', task_id: '' }));
    }
  }, [selectedProjectUserId, projects, projectMembersById, form.project_id]);

  async function fetchData() {
    setLoading(true);
    try {
      // Wide range so forward-dated time-off (odbiór nadgodzin "do przodu") and
      // older entries are visible — not just the default last-30-days-to-today window.
      const _ty = new Date().getFullYear();
      const [summaryData, projectsData, myWorkLogs] = await Promise.all([
        worklogApi.getOvertimeSummary(),
        projectApi.getProjects(),
        worklogApi.getMyWorkLogs(`${_ty - 1}-01-01`, `${_ty + 1}-12-31`),
      ]);
      const loadedProjects = (projectsData as any).projects ?? projectsData;
      const projectMembersResults = await Promise.all(
        loadedProjects.map(async (project: Project) => {
          try {
            const members = await projectApi.getProjectMembers(project.id);
            return { projectId: project.id, members };
          } catch {
            return { projectId: project.id, members: project.members ?? [] };
          }
        })
      );
      const membersMap: Record<string, ProjectMember[]> = {};
      projectMembersResults.forEach(({ projectId, members }) => {
        membersMap[projectId] = members;
      });
      setSummary(summaryData);
      setProjects(loadedProjects);
      setProjectMembersById(membersMap);
      setMyLogs(
        myWorkLogs
          .filter((l) => l.work_type === WorkLogType.OVERTIME || l.work_type === WorkLogType.OVERTIME_COMP)
          .sort((a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime())
      );
      if (isAdmin && allUsers.length === 0) {
        adminApi.getUsers().then((u) => setAllUsers(u.filter((x) => x.is_active))).catch(() => {});
      }
    } catch {
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }

  function openModal(type: ModalType, targetUserId?: string) {
    setTasks([]);
    setForm({
      work_date: new Date().toISOString().split('T')[0],
      hours: '',
      minutes: '',
      description: '',
      project_id: '',
      task_id: '',
      user_id: targetUserId ?? (isAdmin ? (user?.id ?? '') : ''),
    });
    setModal(type);
  }

  async function toggleExpand(entry: OvertimeSummaryEntry) {
    if (expandedUserId === entry.user_id) {
      setExpandedUserId(null);
      setExpandedLogs([]);
      return;
    }
    setExpandedUserId(entry.user_id);
    setExpandedLoading(true);
    try {
      const logs = await worklogApi.getWorkLogs({ user_id: entry.user_id });
      setExpandedLogs(
        logs
          .filter((l) => l.work_type === WorkLogType.OVERTIME || l.work_type === WorkLogType.OVERTIME_COMP)
          .sort((a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime())
      );
    } catch {
      toast.error('Nie udało się pobrać wpisów');
      setExpandedLogs([]);
    } finally {
      setExpandedLoading(false);
    }
  }

  async function openManage(entry: OvertimeSummaryEntry) {
    if (!canManageEntries) return;
    setManageSearch('');
    setManageTypeFilter('all');
    setManageSort('newest');
    setManagePage(1);
    setManageUser(entry);
    setManageLoading(true);
    try {
      const logs = await worklogApi.getWorkLogs({ user_id: entry.user_id });
      setManageLogs(logs.filter((l) => l.work_type === WorkLogType.OVERTIME || l.work_type === WorkLogType.OVERTIME_COMP));
    } catch {
      toast.error('Nie udało się pobrać wpisów');
      setManageLogs([]);
    } finally {
      setManageLoading(false);
    }
  }

  function openEditLog(log: WorkLog) {
    if (!canManageEntries) return;
    const totalMinutes = Math.round(Number(log.hours) * 60);
    setEditForm({
      work_date: log.work_date.slice(0, 10),
      hours: String(Math.floor(totalMinutes / 60)),
      minutes: String(totalMinutes % 60),
      description: log.description || '',
      work_type: log.work_type as WorkLogType.OVERTIME | WorkLogType.OVERTIME_COMP,
    });
    setEditingLog(log);
  }

  async function handleUpdateLog() {
    if (!editingLog || !canManageEntries) return;
    const hours = parseInt(editForm.hours || '0', 10) || 0;
    const minutes = parseInt(editForm.minutes || '0', 10) || 0;
    if (minutes < 0 || minutes > 59) {
      toast.error('Minuty muszą być z zakresu 0–59');
      return;
    }
    const totalHours = hours + minutes / 60;
    if (totalHours <= 0) {
      toast.error('Podaj godziny lub minuty');
      return;
    }

    setEditSaving(true);
    try {
      const updated = await worklogApi.updateWorkLog(editingLog.id, {
        work_date: editForm.work_date,
        hours: totalHours,
        description: editForm.description.trim(),
        work_type: editForm.work_type,
      });
      setManageLogs((logs) => logs.map((log) => (log.id === updated.id ? updated : log)));
      setEditingLog(null);
      toast.success('Wpis nadgodzin został zaktualizowany');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Nie udało się zaktualizować wpisu');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteLog(id: string) {
    try {
      await worklogApi.deleteWorkLog(id);
      setManageLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success('Wpis usunięty');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Nie udało się usunąć');
    }
  }

  async function handleSubmit() {
    const h = parseInt(form.hours || '0', 10) || 0;
    const m = parseInt(form.minutes || '0', 10) || 0;
    if (m < 0 || m > 59) {
      toast.error('Minuty muszą być z zakresu 0–59');
      return;
    }
    const totalHours = h + m / 60;
    if (totalHours <= 0) {
      toast.error('Podaj godziny lub minuty');
      return;
    }
    setSubmitting(true);
    try {
      await worklogApi.createWorkLog({
        work_date: form.work_date,
        hours: totalHours,
        description: form.description || undefined,
        project_id: form.project_id || undefined,
        task_id: form.task_id || undefined,
        work_type: modal === 'overtime' ? WorkLogType.OVERTIME : WorkLogType.OVERTIME_COMP,
        user_id: isAdmin && form.user_id ? form.user_id : undefined,
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

  const selectClass = 'w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  const renderOvertimeRow = (entry: OvertimeSummaryEntry) => (
    <Fragment key={entry.user_id}>
    <tr
      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${canExpand ? 'cursor-pointer' : ''} ${
        entry.user_id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onClick={canExpand ? () => toggleExpand(entry) : undefined}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {canExpand && (
            <ChevronDown
              className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expandedUserId === entry.user_id ? '' : '-rotate-90'}`}
            />
          )}
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
        {formatHM(entry.total_overtime)}
      </td>
      <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
        {formatHM(entry.overtime_this_month)}
      </td>
      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
        {formatHM(entry.total_collected)}
      </td>
      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
        {formatHM(entry.collected_this_month)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <div>
            <span className={`font-semibold ${balanceColor(entry.balance)}`}>
              {entry.balance > 0 ? '+' : ''}{formatHM(entry.balance)}
            </span>
            {entry.balance < 0 && (
              <span className="block text-xs text-red-500">zaległe</span>
            )}
          </div>
          {canManageEntries && (
            <div className="flex flex-shrink-0 items-center gap-1">
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); openModal('overtime', entry.user_id); }}
                  title="Dodaj nadgodziny temu pracownikowi"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); openManage(entry); }}
                title="Przejrzyj i edytuj wpisy"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-[#F7941D]/40 hover:bg-orange-50 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-orange-900/20"
              >
                <Pencil className="h-3.5 w-3.5" />
                Wpisy
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
    {canExpand && expandedUserId === entry.user_id && (
      <tr className="bg-gray-50/70 dark:bg-gray-900/30">
        <td colSpan={6} className="px-4 py-3">
          {expandedLoading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie wpisów…
            </div>
          ) : expandedLogs.length === 0 ? (
            <div className="px-2 py-3 text-sm text-gray-500 dark:text-gray-400">Brak wpisów.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                Wpisy: {entry.first_name} {entry.last_name}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {expandedLogs.map((log) => {
                  const isOvertime = log.work_type === WorkLogType.OVERTIME;
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-3 py-2">
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isOvertime
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        {isOvertime ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {isOvertime ? 'Nadgodziny' : 'Odbiór'}
                      </span>
                      <span className="w-24 shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatHM(log.hours)}
                      </span>
                      <span className="w-28 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(log.work_date).toLocaleDateString('pl-PL')}
                      </span>
                      <span className="flex-1 truncate text-sm text-gray-600 dark:text-gray-300" title={log.description || ''}>
                        {log.description || <span className="text-gray-400">— bez opisu —</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </td>
      </tr>
    )}
    </Fragment>
  );

  return (
    <MainLayout title="Nadgodziny">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Moduł nadgodzin
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Nadgodziny i odbiory</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Ewidencja nadgodzin i odbiorów zespołu
            </p>
            </div>
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
                      {formatHM(myEntry.total_overtime)}
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
                      {formatHM(myEntry.overtime_this_month)}
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
                      {formatHM(myEntry.total_collected)}
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
                      {formatHM(myEntry.collected_this_month)}
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
                      {myEntry.balance > 0 ? '+' : ''}{formatHM(myEntry.balance)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My overtime / time-off entries (date + comment) */}
        {myLogs.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Moje wpisy</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={myLogsTypeFilter}
                  onChange={(e) => setMyLogsTypeFilter(e.target.value as ManageTypeFilter)}
                  aria-label="Filtruj moje wpisy"
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="all">Wszystkie</option>
                  <option value={WorkLogType.OVERTIME}>Nadgodziny</option>
                  <option value={WorkLogType.OVERTIME_COMP}>Odbiór</option>
                </select>
                <select
                  value={myLogsSort}
                  onChange={(e) => setMyLogsSort(e.target.value as ManageSort)}
                  aria-label="Sortuj moje wpisy"
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="newest">Najnowsze</option>
                  <option value="oldest">Najstarsze</option>
                </select>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600">
                  {filteredMyLogs.length} z {myLogs.length} wpisów
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredMyLogs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Brak wpisów dla wybranego filtra.
                </div>
              ) : paginatedMyLogs.map((log) => {
                const isOvertime = log.work_type === WorkLogType.OVERTIME;
                return (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isOvertime
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    }`}>
                      {isOvertime ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {isOvertime ? 'Nadgodziny' : 'Odbiór'}
                    </span>
                    <span className="w-24 shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                      {formatHM(log.hours)}
                    </span>
                    <span className="w-28 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.work_date).toLocaleDateString('pl-PL')}
                    </span>
                    <span className="flex-1 truncate text-sm text-gray-600 dark:text-gray-300" title={log.description || ''}>
                      {log.description || <span className="text-gray-400">— bez opisu —</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Wyświetlane <strong className="font-semibold text-gray-700 dark:text-gray-200">{myLogsRangeStart}-{myLogsRangeEnd}</strong> z {filteredMyLogs.length} wpisów
                </span>
                <label className="flex items-center gap-2">
                  <span>Na stronie</span>
                  <select
                    value={myLogsPageSize}
                    onChange={(e) => setMyLogsPageSize(Number(e.target.value) as 10 | 30 | 50)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value={10}>10</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              {filteredMyLogs.length > myLogsPageSize && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMyLogsPage((page) => Math.max(1, page - 1))}
                    disabled={myLogsPage === 1}
                    aria-label="Poprzednia strona"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {visibleMyLogsPages.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setMyLogsPage(page)}
                      aria-label={`Strona ${page}`}
                      aria-current={myLogsPage === page ? 'page' : undefined}
                      className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                        myLogsPage === page
                          ? 'bg-[#F7941D] text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setMyLogsPage((page) => Math.min(myLogsTotalPages, page + 1))}
                    disabled={myLogsPage === myLogsTotalPages}
                    aria-label="Następna strona"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Summary */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Zestawienie zespołu</h2>
            </div>
            {!loading && summary.length > 0 && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600">
                {filteredTeamSummary.length} z {summary.length} osób
              </span>
            )}
          </div>

          {!loading && summary.length > 0 && (
            <div className="grid gap-3 border-b border-gray-100 p-4 dark:border-gray-700 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_190px_180px_210px]">
              <label className="relative min-w-0">
                <span className="sr-only">Szukaj pracownika</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Szukaj pracownika lub działu..."
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </label>
              <select
                value={teamDepartment}
                onChange={(e) => setTeamDepartment(e.target.value)}
                aria-label="Filtruj pracowników po dziale"
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="all">Wszystkie działy</option>
                {teamDepartments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <select
                value={teamBalanceFilter}
                onChange={(e) => setTeamBalanceFilter(e.target.value as TeamBalanceFilter)}
                aria-label="Filtruj pracowników po saldzie"
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="all">Każde saldo</option>
                <option value="positive">Dodatnie saldo</option>
                <option value="zero">Saldo zerowe</option>
                <option value="negative">Ujemne saldo</option>
              </select>
              <select
                value={teamSort}
                onChange={(e) => setTeamSort(e.target.value as TeamSort)}
                aria-label="Sortuj zestawienie pracowników"
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="name">Alfabetycznie po imieniu</option>
                <option value="balance_desc">Najwyższe saldo</option>
                <option value="balance_asc">Najniższe saldo</option>
                <option value="overtime_desc">Najwięcej nadgodzin</option>
              </select>
            </div>
          )}

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
          ) : filteredTeamSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Search className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Brak pasujących pracowników</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Zmień wyszukiwaną frazę lub wybrane filtry.</p>
              <button
                type="button"
                onClick={() => { setTeamSearch(''); setTeamDepartment('all'); setTeamBalanceFilter('all'); }}
                className="mt-4 text-sm font-semibold text-[#F7941D] hover:text-[#e08317]"
              >
                Wyczyść filtry
              </button>
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
                  {groupByDept
                    ? deptKeys.flatMap((dept) => [
                        <tr key={`dept-${dept}`} className="bg-gray-100/70 dark:bg-gray-700/40">
                          <td colSpan={6} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {dept} · {groupedSummary[dept].length} os.
                          </td>
                        </tr>,
                        ...groupedSummary[dept].map((entry) => renderOvertimeRow(entry)),
                      ])
                    : filteredTeamSummary.map((entry) => renderOvertimeRow(entry))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
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
                  <span>Rejestrujesz odbiór nadgodzin. Upewnij się że uzgodniłeś to z przełożonym.</span>
                </div>
              )}

              {/* Admin: pick whom to log for */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pracownik</label>
                  <select
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value, project_id: '', task_id: '' })}
                    className={selectClass}
                  >
                    <option value={user?.id ?? ''}>Ja ({user?.first_name} {user?.last_name})</option>
                    {allUsers
                      .filter((u) => u.id !== user?.id)
                      .sort((firstUser, secondUser) =>
                        firstUser.first_name.localeCompare(secondUser.first_name, 'pl', { sensitivity: 'base' }) ||
                        firstUser.last_name.localeCompare(secondUser.last_name, 'pl', { sensitivity: 'base' })
                      )
                      .map((u) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(260px,1.35fr)]">
                <div className="min-w-0">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                  <input
                    type="date"
                    value={form.work_date}
                    onChange={(e) => setForm({ ...form, work_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Czas</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={form.hours}
                        onChange={(e) => setForm({ ...form, hours: e.target.value })}
                        placeholder="0"
                        aria-label="Liczba godzin"
                        className={inputClass}
                      />
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">godziny</span>
                    </div>
                    <div className="min-w-0">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={form.minutes}
                        onChange={(e) => setForm({ ...form, minutes: e.target.value })}
                        placeholder="0"
                        aria-label="Liczba minut"
                        className={inputClass}
                      />
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">minuty</span>
                    </div>
                  </div>
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
                        {availableProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    {availableProjects.length === 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        Brak projektów, w których wybrany użytkownik jest członkiem zespołu.
                      </p>
                    )}
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

      {/* Admin / księgowość: przeglądanie i edycja wpisów pracownika */}
      {canManageEntries && manageUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setManageUser(null); setEditingLog(null); }}
        >
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
                  <Pencil className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Zarządzanie wpisami</h2>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {manageUser.first_name} {manageUser.last_name} · {manageLogs.length} wpisów
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setManageUser(null); setEditingLog(null); }}
                aria-label="Zamknij zarządzanie wpisami"
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {manageLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#F7941D]" /></div>
              ) : manageLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Brak wpisów nadgodzin lub odbiorów.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-700/30 md:grid-cols-[minmax(220px,1fr)_180px_170px]">
                    <label className="relative min-w-0">
                      <span className="sr-only">Szukaj wpisów</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={manageSearch}
                        onChange={(e) => setManageSearch(e.target.value)}
                        placeholder="Szukaj w opisie, projekcie lub dacie..."
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </label>
                    <select
                      value={manageTypeFilter}
                      onChange={(e) => setManageTypeFilter(e.target.value as ManageTypeFilter)}
                      aria-label="Filtruj rodzaj wpisu"
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="all">Wszystkie rodzaje</option>
                      <option value={WorkLogType.OVERTIME}>Nadgodziny</option>
                      <option value={WorkLogType.OVERTIME_COMP}>Odbiory</option>
                    </select>
                    <select
                      value={manageSort}
                      onChange={(e) => setManageSort(e.target.value as ManageSort)}
                      aria-label="Sortuj wpisy po dacie"
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="newest">Najnowsze najpierw</option>
                      <option value="oldest">Najstarsze najpierw</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        Wyświetlane <strong className="font-semibold text-gray-700 dark:text-gray-200">{manageRangeStart}-{manageRangeEnd}</strong> z {filteredManageLogs.length} pasujących wpisów
                      </span>
                      <label className="flex items-center gap-2">
                        <span>Na stronie</span>
                        <select
                          value={managePageSize}
                          onChange={(e) => setManagePageSize(Number(e.target.value) as 10 | 30 | 50)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none focus:border-[#F7941D] focus:ring-2 focus:ring-[#F7941D]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                        >
                          <option value={10}>10</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                        </select>
                      </label>
                    </div>
                    {(manageSearch || manageTypeFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setManageSearch(''); setManageTypeFilter('all'); }}
                        className="font-semibold text-[#F7941D] hover:text-[#e08317]"
                      >
                        Wyczyść filtry
                      </button>
                    )}
                  </div>

                  {filteredManageLogs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center dark:border-gray-600">
                      <Search className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Brak wpisów pasujących do filtrów.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="hidden grid-cols-[130px_100px_110px_minmax(0,1fr)_150px] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400 md:grid">
                        <span>Rodzaj</span>
                        <span>Czas</span>
                        <span>Data</span>
                        <span>Opis</span>
                        <span className="text-right">Akcje</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {paginatedManageLogs.map((log) => (
                          <div key={log.id} className="grid gap-3 px-4 py-3 md:grid-cols-[130px_100px_110px_minmax(0,1fr)_150px] md:items-center">
                            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${log.work_type === WorkLogType.OVERTIME ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'}`}>
                              {log.work_type === WorkLogType.OVERTIME ? 'Nadgodziny' : 'Odbiór'}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatHM(log.hours)}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(log.work_date).toLocaleDateString('pl-PL')}</span>
                            <span className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-300" title={log.description || ''}>
                              {log.description || <span className="text-gray-400">Bez opisu</span>}
                            </span>
                            <div className="flex items-center gap-2 md:justify-end">
                              <button
                                type="button"
                                onClick={() => openEditLog(log)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-[#F7941D]/40 hover:bg-orange-50 hover:text-[#F7941D] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-orange-900/20"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edytuj
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(log.id)}
                                  title="Usuń wpis"
                                  aria-label="Usuń wpis"
                                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredManageLogs.length > managePageSize && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setManagePage((page) => Math.max(1, page - 1))}
                        disabled={managePage === 1}
                        aria-label="Poprzednia strona"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {visibleManagePages.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setManagePage(page)}
                          aria-label={`Strona ${page}`}
                          aria-current={managePage === page ? 'page' : undefined}
                          className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition-colors ${
                            managePage === page
                              ? 'bg-[#F7941D] text-white'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setManagePage((page) => Math.min(manageTotalPages, page + 1))}
                        disabled={managePage === manageTotalPages}
                        aria-label="Następna strona"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {canManageEntries && editingLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onClick={() => setEditingLog(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Edytuj wpis</h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {manageUser?.first_name} {manageUser?.last_name}
                </p>
              </div>
              <button onClick={() => setEditingLog(null)} aria-label="Zamknij edycję" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Rodzaj wpisu</label>
                <select
                  value={editForm.work_type}
                  onChange={(e) => setEditForm({ ...editForm, work_type: e.target.value as EditLogForm['work_type'] })}
                  className={selectClass}
                >
                  <option value={WorkLogType.OVERTIME}>Nadgodziny</option>
                  <option value={WorkLogType.OVERTIME_COMP}>Odbiór nadgodzin</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                  <input type="date" value={editForm.work_date} onChange={(e) => setEditForm({ ...editForm, work_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Czas</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="number" min="0" max="24" value={editForm.hours} onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })} className={`${inputClass} pr-11`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">godz.</span>
                    </div>
                    <div className="relative">
                      <input type="number" min="0" max="59" value={editForm.minutes} onChange={(e) => setEditForm({ ...editForm, minutes: e.target.value })} className={`${inputClass} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">min.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Opis</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Opis wpisu nadgodzin..."
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50/70 px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
              <button type="button" onClick={() => setEditingLog(null)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                Anuluj
              </button>
              <button type="button" onClick={handleUpdateLog} disabled={editSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e08317] disabled:opacity-60">
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
