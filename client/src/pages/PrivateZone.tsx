import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Lock, Plus, X, Trash2, Loader2, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as api from '../api/personalTask.api';
import { PersonalTask, PersonalTaskStatus, PERSONAL_COLUMNS } from '../types/personalTask.types';

export default function PrivateZone() {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<PersonalTaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editing, setEditing] = useState<PersonalTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [dragged, setDragged] = useState<PersonalTask | null>(null);
  const [dragOverCol, setDragOverCol] = useState<PersonalTaskStatus | null>(null);

  useEffect(() => { load(); }, []);

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
      setNewTitle('');
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
      setEditing(null);
    } catch {
      toast.error('Nie udało się zapisać');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePersonalTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      toast.error('Nie udało się usunąć');
    }
  };

  const handleDrop = async (status: PersonalTaskStatus) => {
    setDragOverCol(null);
    if (!dragged || dragged.status === status) { setDragged(null); return; }
    const task = dragged;
    setDragged(null);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status } : t)); // optimistic
    try {
      await api.updatePersonalTask(task.id, { status });
    } catch {
      toast.error('Nie udało się przenieść');
      load();
    }
  };

  const col = (status: PersonalTaskStatus) =>
    tasks.filter(t => t.status === status).sort((a, b) => (a.order_index - b.order_index) || a.created_at.localeCompare(b.created_at));

  return (
    <MainLayout title="Strefa prywatna">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D]">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Moduł</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Strefa prywatna</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Twoja prywatna lista zadań — widoczna tylko dla Ciebie.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PERSONAL_COLUMNS.map(({ status, label, color }) => {
              const items = col(status);
              const isOver = dragOverCol === status;
              return (
                <div
                  key={status}
                  className={`rounded-xl border bg-gray-50 shadow-sm transition-all dark:bg-gray-900/40 ${isOver ? 'border-[#F7941D] ring-2 ring-[#F7941D]/30' : 'border-gray-200 dark:border-gray-700'}`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(status); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => handleDrop(status)}
                >
                  <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: `2px solid ${color}40` }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800/80 dark:text-gray-300">{items.length}</span>
                    </div>
                    <button onClick={() => { setAdding(status); setNewTitle(''); }} className="rounded-lg p-1 text-gray-400 hover:bg-white/70 hover:text-[#F7941D] dark:hover:bg-gray-700/70"><Plus className="h-4 w-4" /></button>
                  </div>

                  <div className="min-h-[200px] space-y-2 p-2.5">
                    {adding === status && (
                      <div className="rounded-lg border border-[#F7941D]/40 bg-white p-2 dark:bg-gray-800">
                        <input
                          autoFocus value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAdd(status); if (e.key === 'Escape') setAdding(null); }}
                          onBlur={() => handleAdd(status)}
                          placeholder="Tytuł zadania..."
                          className="w-full bg-transparent text-sm text-gray-900 outline-none dark:text-white"
                        />
                      </div>
                    )}
                    {items.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDragged(task)}
                        onDragEnd={() => setDragged(null)}
                        onClick={() => { setEditing(task); setEditTitle(task.title); setEditDesc(task.description || ''); }}
                        className={`group cursor-grab rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing dark:border-gray-700/80 dark:bg-gray-800 ${dragged?.id === task.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm text-gray-900 dark:text-white ${status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                            {task.description && <p className="mt-1 text-xs text-gray-400 line-clamp-2">{task.description}</p>}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                            className="rounded p-1 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-gray-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Edytuj zadanie</h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
            </div>
            <input
              value={editTitle} onChange={e => setEditTitle(e.target.value)}
              placeholder="Tytuł"
              className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <textarea
              value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4}
              placeholder="Opis (opcjonalnie)"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Anuluj</button>
              <button onClick={handleSaveEdit} className="rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-medium text-white hover:bg-[#e08317]">Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
