import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plus, Trash2, Edit2, CheckCircle, Timer, FolderOpen } from 'lucide-react';
import * as timeApi from '../api/time.api';
import * as workLogApi from '../api/worklog.api';
import * as taskApi from '../api/task.api';
import * as projectApi from '../api/project.api';
import type { TimeEntry, TimeStats } from '../types/time.types';
import type { WorkLog, UserTimeStats, CreateWorkLogRequest } from '../types/worklog.types';
import type { Task } from '../types/task.types';
import type { Project } from '../types/project.types';

type ActiveTab = 'worklogs' | 'attendance';

const TimeTracking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('worklogs');

  // Attendance state
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<TimeStats | null>(null);
  const [expectedClockIn, setExpectedClockIn] = useState<string>('09:00');

  // Work log state
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [workLogStats, setWorkLogStats] = useState<UserTimeStats | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);

  // Form state
  const [showLogForm, setShowLogForm] = useState(false);
  const [formData, setFormData] = useState<CreateWorkLogRequest>({
    work_date: new Date().toISOString().split('T')[0],
    hours: 1,
    description: '',
    is_billable: false,
  });
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [current, entries, statistics, logs, logStats, tasks, projects] = await Promise.all([
        timeApi.getCurrentEntry(),
        timeApi.getUserTimeEntries(),
        timeApi.getUserTimeStats(),
        workLogApi.getMyWorkLogs(),
        workLogApi.getMyTimeStats(),
        taskApi.getMyTasks({ status: 'in_progress,todo' }),
        projectApi.getMyProjects(),
      ]);

      setCurrentEntry(current);
      setRecentEntries(entries.slice(0, 10));
      setAttendanceStats(statistics);
      setWorkLogs(logs);
      setWorkLogStats(logStats);
      setMyTasks(tasks);
      setMyProjects(projects);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      const entry = await timeApi.clockIn({ expectedClockIn: expectedClockIn + ':00' });
      setCurrentEntry(entry);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się rozpocząć pracy');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      await timeApi.clockOut();
      setCurrentEntry(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się zakończyć pracy');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data: CreateWorkLogRequest = {
        ...formData,
        project_id: selectedProject && !formData.task_id ? selectedProject : undefined,
      };

      if (editingLog) {
        await workLogApi.updateWorkLog(editingLog.id, {
          work_date: formData.work_date,
          hours: formData.hours,
          description: formData.description,
          is_billable: formData.is_billable,
        });
      } else {
        await workLogApi.createWorkLog(data);
      }

      setShowLogForm(false);
      setEditingLog(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się zapisać wpisu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkLog = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;

    try {
      await workLogApi.deleteWorkLog(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się usunąć wpisu');
    }
  };

  const handleEditWorkLog = (log: WorkLog) => {
    setEditingLog(log);
    setFormData({
      task_id: log.task_id || undefined,
      project_id: log.project_id || undefined,
      work_date: log.work_date.split('T')[0],
      hours: log.hours,
      description: log.description || '',
      is_billable: log.is_billable,
    });
    setSelectedProject(log.project_id || '');
    setShowLogForm(true);
  };

  const resetForm = () => {
    setFormData({
      work_date: new Date().toISOString().split('T')[0],
      hours: 1,
      description: '',
      is_billable: false,
    });
    setSelectedProject('');
    setEditingLog(null);
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const getFilteredTasks = () => {
    if (!selectedProject) return myTasks;
    return myTasks.filter((task) => task.project_id === selectedProject);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-green-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Ewidencja Czasu Pracy</h1>
                <p className="text-sm text-gray-600">Zarządzaj swoim czasem i loguj godziny pracy</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-white hover:bg-gray-50 rounded-md transition-colors text-sm font-medium text-gray-700 border border-gray-300"
              >
                ← Panel główny
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg border border-gray-200 w-fit">
          <button
            onClick={() => setActiveTab('worklogs')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'worklogs' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Timer className="w-4 h-4 inline mr-2" />
            Czas przy zadaniach
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Obecność
          </button>
        </div>

        {activeTab === 'worklogs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form & Stats */}
            <div className="lg:col-span-1 space-y-4">
              {/* Quick Log Button */}
              {!showLogForm && (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Zaloguj czas pracy
                </button>
              )}

              {/* Log Form */}
              {showLogForm && (
                <div className="bg-white rounded-md p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">
                    {editingLog ? 'Edytuj wpis' : 'Nowy wpis czasu'}
                  </h2>
                  <form onSubmit={handleCreateWorkLog} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Projekt</label>
                      <select
                        value={selectedProject}
                        onChange={(e) => {
                          setSelectedProject(e.target.value);
                          setFormData({ ...formData, task_id: undefined, project_id: e.target.value || undefined });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Wybierz projekt (opcjonalnie) --</option>
                        {myProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zadanie</label>
                      <select
                        value={formData.task_id || ''}
                        onChange={(e) => {
                          const task = myTasks.find((t) => t.id === e.target.value);
                          setFormData({
                            ...formData,
                            task_id: e.target.value || undefined,
                            project_id: task?.project_id || selectedProject || undefined,
                          });
                          if (task && !selectedProject) {
                            setSelectedProject(task.project_id);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Wybierz zadanie (opcjonalnie) --</option>
                        {getFilteredTasks().map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                      <input
                        type="date"
                        value={formData.work_date}
                        onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Godziny</label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="24"
                        value={formData.hours}
                        onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opis pracy</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Co zostało zrobione..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_billable"
                        checked={formData.is_billable}
                        onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="is_billable" className="text-sm text-gray-700">
                        Płatne (rozliczeniowe)
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 font-medium text-sm transition-colors"
                      >
                        {editingLog ? 'Zapisz zmiany' : 'Dodaj wpis'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogForm(false);
                          resetForm();
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm transition-colors"
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Work Log Stats */}
              {workLogStats && (
                <div className="bg-white rounded-md p-6 border border-gray-200">
                  <h3 className="text-base font-semibold mb-4 text-gray-900">Statystyki (30 dni)</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Łączny czas przy zadaniach:</p>
                      <p className="text-2xl font-bold text-gray-900">{workLogStats.totalHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Godziny płatne:</p>
                      <p className="text-xl font-bold text-green-600">{workLogStats.billableHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dni z wpisami:</p>
                      <p className="text-xl font-bold text-gray-900">{workLogStats.daysWorked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Średnio dziennie:</p>
                      <p className="text-xl font-bold text-gray-900">{workLogStats.averageHoursPerDay.toFixed(1)}h</p>
                    </div>
                  </div>

                  {workLogStats.byProject.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Wg projektów:</p>
                      <div className="space-y-2">
                        {workLogStats.byProject.slice(0, 5).map((item) => (
                          <div key={item.project_id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 truncate flex-1">{item.project_name}</span>
                            <span className="font-medium text-gray-900 ml-2">{item.hours.toFixed(1)}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Work Logs List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-md p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Ostatnie wpisy czasu</h2>
                </div>

                {loading && workLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Ładowanie...</p>
                ) : workLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Timer className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Brak wpisów czasu</p>
                    <p className="text-gray-400 text-xs mt-1">Kliknij "Zaloguj czas pracy" aby dodać wpis</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Projekt / Zadanie
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Czas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Opis
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Akcje
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {workLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              {formatDate(log.work_date)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div>
                                {log.project && (
                                  <div className="flex items-center gap-1 text-gray-600 text-xs">
                                    <FolderOpen className="w-3 h-3" />
                                    <span>{log.project.name}</span>
                                  </div>
                                )}
                                {log.task && <div className="text-gray-900 font-medium">{log.task.title}</div>}
                                {!log.project && !log.task && (
                                  <span className="text-gray-400 italic">Bez przypisania</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              <span className="font-medium text-gray-900">{log.hours}h</span>
                              {log.is_billable && (
                                <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  Płatne
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                              {log.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                              <button
                                onClick={() => handleEditWorkLog(log)}
                                className="text-gray-400 hover:text-blue-600 mr-2"
                                title="Edytuj"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteWorkLog(log.id)}
                                className="text-gray-400 hover:text-red-600"
                                title="Usuń"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Clock In/Out Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-md p-6 border border-gray-200">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">Status obecności</h2>

                {currentEntry ? (
                  <div>
                    <div
                      className={`border rounded-md p-4 mb-4 ${currentEntry.is_late ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}
                    >
                      <p
                        className={`text-sm mb-2 ${currentEntry.is_late ? 'text-red-700' : 'text-emerald-700'}`}
                      >
                        Zalogowano o:
                      </p>
                      <p
                        className={`text-2xl font-bold ${currentEntry.is_late ? 'text-red-800' : 'text-emerald-800'}`}
                      >
                        {formatTime(currentEntry.clock_in)}
                      </p>
                      {currentEntry.is_late && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          Spóźnienie: {currentEntry.late_minutes} min
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleClockOut}
                      disabled={loading}
                      className="w-full py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
                    >
                      Wyloguj się
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-slate-100 border border-slate-200 rounded-md p-4 mb-4">
                      <p className="text-slate-600 text-center text-sm">Nie jesteś zalogowany</p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Oczekiwana godzina rozpoczęcia:
                      </label>
                      <input
                        type="time"
                        value={expectedClockIn}
                        onChange={(e) => setExpectedClockIn(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleClockIn}
                      disabled={loading}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
                    >
                      Zaloguj się
                    </button>
                  </div>
                )}
              </div>

              {/* Attendance Stats Card */}
              {attendanceStats && (
                <div className="bg-white rounded-md p-6 mt-4 border border-gray-200">
                  <h3 className="text-base font-semibold mb-4 text-gray-900">Statystyki obecności (30 dni)</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Łączny czas:</p>
                      <p className="text-xl font-bold text-gray-900">
                        {attendanceStats.totalHours}h {attendanceStats.totalMinutes}m
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nadgodziny:</p>
                      <p className="text-xl font-bold text-amber-600">
                        {attendanceStats.overtimeHours}h {attendanceStats.overtimeMinutes}m
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dni przepracowane:</p>
                      <p className="text-xl font-bold text-gray-900">{attendanceStats.daysWorked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Średnio dziennie:</p>
                      <p className="text-xl font-bold text-gray-900">
                        {attendanceStats.averageHoursPerDay.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Entries */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-md p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Historia obecności</h2>
                </div>

                {loading && recentEntries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Ładowanie...</p>
                ) : recentEntries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Brak wpisów</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Wejście
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Wyjście
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Czas
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Spóźnienie
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{formatDate(entry.clock_in)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{formatTime(entry.clock_in)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {entry.clock_out ? formatTime(entry.clock_out) : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDuration(entry.duration_minutes)}
                              {entry.is_overtime && entry.overtime_minutes > 0 && (
                                <span className="ml-2 text-xs text-amber-600 font-medium">
                                  +{entry.overtime_minutes} min nadgodzin
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {entry.is_late ? (
                                <span className="text-red-600 font-medium">{entry.late_minutes} min</span>
                              ) : (
                                <span className="text-emerald-600">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  entry.status === 'in_progress'
                                    ? 'bg-amber-100 text-amber-800'
                                    : entry.status === 'completed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : entry.status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {entry.status === 'in_progress'
                                  ? 'W trakcie'
                                  : entry.status === 'completed'
                                    ? 'Ukończony'
                                    : entry.status === 'approved'
                                      ? 'Zatwierdzony'
                                      : 'Odrzucony'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
