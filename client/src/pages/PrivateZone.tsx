import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, GripVertical, ListTodo, Loader2, Lock, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as api from '../api/personalTask.api';
import { useAuth } from '../contexts/AuthContext';
import PersonalCalendar from '../components/calendar/PersonalCalendar';
import { PersonalTask, PersonalTaskStatus, PERSONAL_COLUMNS } from '../types/personalTask.types';

type PersonalTaskPriority = 'low' | 'medium' | 'high';
type PriorityFilter = 'all' | PersonalTaskPriority;
type TaskSortMode = 'default' | 'priority_desc' | 'priority_asc' | 'newest' | 'oldest';

const PRIORITY_CONFIG: Record<PersonalTaskPriority, { label: string; dot: string; chip: string; border: string }> = {
  low: {
    label: 'Niski',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300',
    border: 'border-l-emerald-400',
  },
  medium: {
    label: 'Średni',
    dot: 'bg-[#F7941D]',
    chip: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
    border: 'border-l-[#F7941D]',
  },
  high: {
    label: 'Wysoki',
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-300',
    border: 'border-l-red-400',
  },
};

export default function PrivateZone() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<PersonalTaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<PersonalTaskPriority>('medium');
  const [editing, setEditing] = useState<PersonalTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<PersonalTaskPriority>('medium');
  const [taskPriorities, setTaskPriorities] = useState<Record<string, PersonalTaskPriority>>({});
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortMode, setSortMode] = useState<TaskSortMode>('default');
  const [openPriorityTaskId, setOpenPriorityTaskId] = useState<string | null>(null);
  const [dragged, setDragged] = useState<PersonalTask | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PersonalTaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const priorityStorageKey = `private-zone-task-priorities:${user?.id || 'local'}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(priorityStorageKey);
      setTaskPriorities(stored ? JSON.parse(stored) : {});
    } catch {
      setTaskPriorities({});
    }
  }, [priorityStorageKey]);

  const persistPriorities = (next: Record<string, PersonalTaskPriority>) => {
    setTaskPriorities(next);
    localStorage.setItem(priorityStorageKey, JSON.stringify(next));
  };

  const getTaskPriority = (task: PersonalTask): PersonalTaskPriority =>
    taskPriorities[task.id] || 'medium';

  const setTaskPriority = (taskId: string, priority: PersonalTaskPriority) => {
    persistPriorities({ ...taskPriorities, [taskId]: priority });
  };

  const priorityWeight = (priority: PersonalTaskPriority) => {
    const weights: Record<PersonalTaskPriority, number> = { low: 1, medium: 2, high: 3 };
    return weights[priority];
  };

  const load = async () => {
    try {
      setLoading(true);
      setTasks(await api.getPersonalTasks());
    } catch {
      toast.error('Nie udało się załadować zadań');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (status: PersonalTaskStatus) => {
    if (!newTitle.trim()) { setAdding(null); return; }
    try {
      const task = await api.createPersonalTask({ title: newTitle.trim(), status });
      setTasks(prev => [...prev, task]);
      persistPriorities({ ...taskPriorities, [task.id]: newPriority });
      setNewTitle('');
      setNewPriority('medium');
      setAdding(null);
    } catch {
      toast.error('Nie udało się dodać zadania');
    }
  };

  const handleSaveEdit = async () => {
    if (!editing || !editTitle.trim()) return;
    try {
      const updated = await api.updatePersonalTask(editing.id, { title: editTitle.trim(), description: editDesc });
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setTaskPriority(updated.id, editPriority);
      setEditing(null);
    } catch {
      toast.error('Nie udało się zapisać');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePersonalTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      const { [id]: _deleted, ...rest } = taskPriorities;
      persistPriorities(rest);
    } catch {
      toast.error('Nie udało się usunąć');
    }
  };

  const getDefaultOrderedTasks = (taskList: PersonalTask[]) =>
    [...taskList].sort((a, b) => (a.order_index - b.order_index) || a.created_at.localeCompare(b.created_at));

  const getPersistenceOrder = (taskList: PersonalTask[]) => {
    const statusOrder = new Map(PERSONAL_COLUMNS.map((column, index) => [column.status, index]));

    return [...taskList]
      .sort((a, b) => {
        const statusDiff = (statusOrder.get(a.status) ?? 0) - (statusOrder.get(b.status) ?? 0);
        if (statusDiff !== 0) return statusDiff;
        return (a.order_index - b.order_index) || a.created_at.localeCompare(b.created_at);
      })
      .map(task => task.id);
  };

  const reorderTasksWithinColumn = (
    taskList: PersonalTask[],
    status: PersonalTaskStatus,
    draggedTaskId: string,
    targetTaskId: string,
  ) => {
    const columnTasks = getDefaultOrderedTasks(taskList.filter(task => task.status === status));
    const fromIndex = columnTasks.findIndex(task => task.id === draggedTaskId);
    const toIndex = columnTasks.findIndex(task => task.id === targetTaskId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return taskList;
    }

    const reorderedColumnTasks = [...columnTasks];
    const [movedTask] = reorderedColumnTasks.splice(fromIndex, 1);
    reorderedColumnTasks.splice(toIndex, 0, movedTask);

    const nextOrderById = new Map(
      reorderedColumnTasks.map((task, index) => [task.id, index * 10])
    );

    return taskList.map(task =>
      task.status === status && nextOrderById.has(task.id)
        ? { ...task, order_index: nextOrderById.get(task.id)! }
        : task
    );
  };

  const moveTaskToColumnEnd = (
    taskList: PersonalTask[],
    taskToMove: PersonalTask,
    status: PersonalTaskStatus,
  ) => {
    const targetColumnTasks = getDefaultOrderedTasks(
      taskList.filter(task => task.status === status && task.id !== taskToMove.id)
    );
    const nextOrderIndex = targetColumnTasks.length > 0
      ? targetColumnTasks[targetColumnTasks.length - 1].order_index + 10
      : 0;

    return taskList.map(task =>
      task.id === taskToMove.id
        ? { ...task, status, order_index: nextOrderIndex }
        : task
    );
  };

  const handleDrop = async (status: PersonalTaskStatus) => {
    setDragOverCol(null);
    setDragOverTaskId(null);
    if (!dragged || dragged.status === status) { setDragged(null); return; }
    const task = dragged;
    setDragged(null);
    const nextTasks = moveTaskToColumnEnd(tasks, task, status);
    setTasks(nextTasks); // optimistic
    try {
      await api.updatePersonalTask(task.id, { status });
      await api.reorderPersonalTasks(getPersistenceOrder(nextTasks));
    } catch {
      toast.error('Nie udało się przenieść');
      load();
    }
  };

  const handleTaskDrop = async (targetTask: PersonalTask) => {
    if (!dragged || dragged.status !== targetTask.status) return;
    setDragOverCol(null);
    setDragOverTaskId(null);
    const task = dragged;
    setDragged(null);
    if (task.id === targetTask.id) return;

    const nextTasks = reorderTasksWithinColumn(tasks, targetTask.status, task.id, targetTask.id);
    setTasks(nextTasks); // optimistic

    try {
      await api.reorderPersonalTasks(getPersistenceOrder(nextTasks));
    } catch {
      toast.error('Nie udało się zmienić kolejności');
      load();
    }
  };

  const moveTaskByStep = async (task: PersonalTask, direction: 'up' | 'down') => {
    const columnTasks = getDefaultOrderedTasks(tasks.filter(item => item.status === task.status));
    const currentIndex = columnTasks.findIndex(item => item.id === task.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= columnTasks.length) {
      return;
    }

    if (sortMode !== 'default') setSortMode('default');

    const reorderedColumnTasks = [...columnTasks];
    const [movedTask] = reorderedColumnTasks.splice(currentIndex, 1);
    reorderedColumnTasks.splice(targetIndex, 0, movedTask);

    const nextOrderById = new Map(
      reorderedColumnTasks.map((item, index) => [item.id, index * 10])
    );
    const nextTasks = tasks.map(item =>
      item.status === task.status && nextOrderById.has(item.id)
        ? { ...item, order_index: nextOrderById.get(item.id)! }
        : item
    );

    setTasks(nextTasks); // optimistic

    try {
      await api.reorderPersonalTasks(getPersistenceOrder(nextTasks));
    } catch {
      toast.error('Nie udało się zmienić kolejności');
      load();
    }
  };

  const col = (status: PersonalTaskStatus) =>
    tasks
      .filter(t => t.status === status)
      .filter(t => priorityFilter === 'all' || getTaskPriority(t) === priorityFilter)
      .sort((a, b) => {
        if (sortMode === 'priority_desc') {
          return priorityWeight(getTaskPriority(b)) - priorityWeight(getTaskPriority(a));
        }
        if (sortMode === 'priority_asc') {
          return priorityWeight(getTaskPriority(a)) - priorityWeight(getTaskPriority(b));
        }
        if (sortMode === 'newest') {
          return b.created_at.localeCompare(a.created_at);
        }
        if (sortMode === 'oldest') {
          return a.created_at.localeCompare(b.created_at);
        }

        return (a.order_index - b.order_index) || a.created_at.localeCompare(b.created_at);
      });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const activeTasks = tasks.filter(t => t.status !== 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const filteredTasksCount = tasks.filter(task => priorityFilter === 'all' || getTaskPriority(task) === priorityFilter).length;

  const getColumnAccent = (status: PersonalTaskStatus) => {
    const accents: Record<PersonalTaskStatus, { bg: string; text: string; ring: string }> = {
      todo: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', ring: 'border-gray-200 dark:border-gray-700' },
      in_progress: { bg: 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15', text: 'text-[#F7941D] dark:text-orange-300', ring: 'border-[#F7941D]/30' },
      done: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-300', ring: 'border-emerald-200 dark:border-emerald-800' },
    };
    return accents[status];
  };

  return (
    <MainLayout title="Strefa prywatna">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
            <Lock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Prywatny obszar pracy</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Strefa prywatna</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Twoja prywatna lista zadań — widoczna tylko dla Ciebie.</p>
          </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#F7941D]/20 bg-[#F7941D]/5 px-4 py-3 text-sm font-semibold text-[#F7941D] dark:border-[#F7941D]/30 dark:bg-[#F7941D]/10 dark:text-orange-300">
            <ShieldCheck className="h-4 w-4" />
            Widoczne tylko dla Ciebie
          </div>
          </div>
        </section>

        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <div className="min-w-0 flex-1 space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <ListTodo className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Wszystkie zadania</p>
            <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{totalTasks}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Clock3 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aktywne</p>
            <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{activeTasks}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ukończone</p>
            <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{completionRate}%</p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-950 dark:text-white">Widok zadań</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Pokazano {filteredTasksCount} z {totalTasks} zadań.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Priorytet
                <select
                  value={priorityFilter}
                  onChange={event => setPriorityFilter(event.target.value as PriorityFilter)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-gray-700 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="all">Wszystkie</option>
                  <option value="high">Wysoki</option>
                  <option value="medium">Średni</option>
                  <option value="low">Niski</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Sortowanie
                <select
                  value={sortMode}
                  onChange={event => setSortMode(event.target.value as TaskSortMode)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-gray-700 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="default">Domyślnie</option>
                  <option value="priority_desc">Priorytet: wysoki najpierw</option>
                  <option value="priority_asc">Priorytet: niski najpierw</option>
                  <option value="newest">Najnowsze</option>
                  <option value="oldest">Najstarsze</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#F7941D]" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Ładowanie prywatnych zadań...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {PERSONAL_COLUMNS.map(({ status, label, color }) => {
              const items = col(status);
              const columnTotal = tasks.filter(t => t.status === status).length;
              const isOver = dragOverCol === status;
              const accent = getColumnAccent(status);
              return (
                <div
                  key={status}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-gray-800 ${isOver ? 'border-[#F7941D] ring-2 ring-[#F7941D]/30' : accent.ring}`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(status); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => handleDrop(status)}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700" style={{ boxShadow: `inset 0 -2px 0 ${color}30` }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent.bg} ${accent.text}`}>{items.length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAdding(status); setNewTitle(''); }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#F7941D]/10 hover:text-[#F7941D] dark:hover:bg-[#F7941D]/15"
                      aria-label="Dodaj zadanie"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-h-[360px] space-y-2.5 bg-gray-50/70 p-3 dark:bg-gray-900/30">
                    {adding === status && (
                      <div className="rounded-xl border border-[#F7941D]/40 bg-white p-3 shadow-sm dark:bg-gray-800">
                        <input
                          autoFocus value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAdd(status); if (e.key === 'Escape') setAdding(null); }}
                          onBlur={() => handleAdd(status)}
                          placeholder="Tytuł zadania..."
                          className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                        />
                        <div className="mt-3 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                          {(Object.keys(PRIORITY_CONFIG) as PersonalTaskPriority[]).map(priority => {
                            const config = PRIORITY_CONFIG[priority];
                            return (
                              <button
                                key={priority}
                                type="button"
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => setNewPriority(priority)}
                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                                  newPriority === priority
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                                {config.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {items.length === 0 && adding !== status && (
                      <button
                        type="button"
                        onClick={() => { setAdding(status); setNewTitle(''); }}
                        className="flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/70 p-4 text-center text-sm text-gray-500 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
                      >
                        <Plus className="mb-2 h-5 w-5 text-[#F7941D]" />
                        {columnTotal === 0 ? 'Dodaj pierwsze zadanie' : 'Brak zadań dla wybranego filtra'}
                      </button>
                    )}
                    {items.map(task => (
                      (() => {
                        const priority = getTaskPriority(task);
                        const priorityConfig = PRIORITY_CONFIG[priority];
                        const defaultColumnTasks = getDefaultOrderedTasks(tasks.filter(item => item.status === task.status));
                        const taskColumnIndex = defaultColumnTasks.findIndex(item => item.id === task.id);
                        const canMoveUp = taskColumnIndex > 0;
                        const canMoveDown = taskColumnIndex >= 0 && taskColumnIndex < defaultColumnTasks.length - 1;
                        return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={event => {
                          event.dataTransfer.effectAllowed = 'move';
                          if (sortMode !== 'default') setSortMode('default');
                          setDragged(task);
                        }}
                        onDragOver={event => {
                          if (dragged && dragged.status === task.status && dragged.id !== task.id) {
                            event.preventDefault();
                            event.stopPropagation();
                            setDragOverCol(status);
                            setDragOverTaskId(task.id);
                          }
                        }}
                        onDrop={event => {
                          if (dragged && dragged.status === task.status) {
                            event.preventDefault();
                            event.stopPropagation();
                            handleTaskDrop(task);
                          }
                        }}
                        onDragEnd={() => {
                          setDragged(null);
                          setDragOverCol(null);
                          setDragOverTaskId(null);
                        }}
                        onClick={() => { setOpenPriorityTaskId(null); setEditing(task); setEditTitle(task.title); setEditDesc(task.description || ''); setEditPriority(priority); }}
                        className={`group cursor-grab rounded-xl border border-l-4 border-gray-200/80 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#F7941D]/30 hover:shadow-md active:cursor-grabbing dark:border-gray-700/80 dark:bg-gray-800 ${priorityConfig.border} ${dragged?.id === task.id ? 'opacity-50' : ''} ${dragOverTaskId === task.id ? 'border-[#F7941D] ring-2 ring-[#F7941D]/30' : ''}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
                            <GripVertical className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                moveTaskByStep(task, 'up');
                              }}
                              disabled={!canMoveUp}
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/10 hover:text-[#F7941D] disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-[#F7941D]/40 dark:hover:bg-[#F7941D]/10 dark:hover:text-orange-300 dark:disabled:border-gray-800 dark:disabled:bg-gray-900"
                              aria-label="Przesuń zadanie wyżej"
                              title="Przesuń wyżej"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                moveTaskByStep(task, 'down');
                              }}
                              disabled={!canMoveDown}
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-200 bg-white text-gray-400 transition-colors hover:border-[#F7941D]/40 hover:bg-[#F7941D]/10 hover:text-[#F7941D] disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-[#F7941D]/40 dark:hover:bg-[#F7941D]/10 dark:hover:text-orange-300 dark:disabled:border-gray-800 dark:disabled:bg-gray-900"
                              aria-label="Przesuń zadanie niżej"
                              title="Przesuń niżej"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className="relative mb-2 inline-block"
                              onClick={event => event.stopPropagation()}
                              onMouseDown={event => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenPriorityTaskId(openPriorityTaskId === task.id ? null : task.id)}
                                className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 ${priorityConfig.chip}`}
                                aria-label="Zmień priorytet zadania"
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${priorityConfig.dot}`} />
                                {priorityConfig.label}
                                <ChevronDown className="h-3 w-3 opacity-70" />
                              </button>

                              {openPriorityTaskId === task.id && (
                                <div className="absolute left-0 top-full z-30 mt-1 min-w-32 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                  {(Object.keys(PRIORITY_CONFIG) as PersonalTaskPriority[]).map(option => {
                                    const optionConfig = PRIORITY_CONFIG[option];
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                          setTaskPriority(task.id, option);
                                          setOpenPriorityTaskId(null);
                                        }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                          priority === option ? 'text-[#F7941D]' : 'text-gray-600 dark:text-gray-300'
                                        }`}
                                      >
                                        <span className={`h-2 w-2 rounded-full ${optionConfig.dot}`} />
                                        {optionConfig.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <p className={`text-sm font-semibold leading-5 text-gray-950 dark:text-white ${status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                            {task.description && <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-gray-500 dark:text-gray-400">{task.description}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                            className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-red-900/20"
                            aria-label="Usuń zadanie"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                    {adding !== status && items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setAdding(status); setNewTitle(''); }}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white/80 text-sm font-semibold text-gray-600 transition-colors hover:border-[#F7941D]/50 hover:bg-[#F7941D]/5 hover:text-[#F7941D] dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:border-[#F7941D]/50 dark:hover:bg-[#F7941D]/10 dark:hover:text-orange-300"
                      >
                        <Plus className="h-4 w-4" />
                        Dodaj zadanie
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>

          <div className="w-full xl:w-[380px] xl:flex-shrink-0">
            <PersonalCalendar />
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
              <h2 className="font-semibold text-gray-950 dark:text-white">Edytuj zadanie</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <input
              value={editTitle} onChange={e => setEditTitle(e.target.value)}
              placeholder="Tytuł"
              className="mx-5 mt-5 h-10 w-[calc(100%-2.5rem)] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <textarea
              value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4}
              placeholder="Opis (opcjonalnie)"
              className="mx-5 mt-3 w-[calc(100%-2.5rem)] resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="mx-5 mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Priorytet</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PRIORITY_CONFIG) as PersonalTaskPriority[]).map(priority => {
                  const config = PRIORITY_CONFIG[priority];
                  return (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setEditPriority(priority)}
                      className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors ${
                        editPriority === priority
                          ? 'border-[#F7941D] bg-[#F7941D]/10 text-gray-950 ring-2 ring-[#F7941D]/20 dark:text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/60">
              <button type="button" onClick={() => setEditing(null)} className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">Anuluj</button>
              <button type="button" onClick={handleSaveEdit} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]">Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
