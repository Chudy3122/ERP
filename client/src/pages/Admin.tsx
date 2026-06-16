import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Users, Clock, CalendarDays, MessageSquare, Shield, Plus, Search,
  RefreshCw, Edit2, Trash2, KeyRound, CheckCircle, XCircle,
  Building2, BarChart3, Activity, UserPlus, Eye, Tv2,
} from 'lucide-react';
import * as adminApi from '../api/admin.api';
import * as departmentApi from '../api/department.api';
import { AdminUser, CreateUserData, SystemStats } from '../types/admin.types';
import type { Department, CreateDepartmentData, DepartmentTreeNode } from '../types/department.types';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getFileUrl } from '../api/axios-config';

// ── Role colour helpers ──────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator', kierownik: 'Kierownik', employee: 'Pracownik',
  szef: 'Szef', ksiegowosc: 'Księgowość', kadry: 'Kadry', sekretariat: 'Sekretariat',
};
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800',
  kierownik: 'bg-amber-100 text-amber-800',
  employee: 'bg-gray-100 text-gray-700',
  szef: 'bg-red-100 text-red-800',
  ksiegowosc: 'bg-blue-100 text-blue-800',
  kadry: 'bg-teal-100 text-teal-800',
  sekretariat: 'bg-green-100 text-green-800',
};
const ROLE_DOT: Record<string, string> = {
  admin: 'bg-purple-500', kierownik: 'bg-amber-400', employee: 'bg-gray-400',
  szef: 'bg-red-500', ksiegowosc: 'bg-blue-500', kadry: 'bg-teal-500', sekretariat: 'bg-green-500',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const initials = (u: AdminUser) => `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase();

const DEPT_COLORS = ['#F7941D','#0d6efd','#198754','#dc3545','#6f42c1','#0dcaf0','#fd7e14','#20c997','#d63384','#6c757d'];

type Tab = 'dashboard' | 'users' | 'departments' | 'fun';

const EMPTY_USER: CreateUserData = { email: '', password: '', firstName: '', lastName: '', role: 'employee', department: '', position: '', phone: '' };
const EMPTY_DEPT: CreateDepartmentData = { name: '', code: '', color: '#F7941D' };

// ── Component ────────────────────────────────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('dashboard');

  // Dashboard
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<{ id: string; email: string } | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userForm, setUserForm] = useState<CreateUserData>(EMPTY_USER);

  // Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptCounts, setDeptCounts] = useState<Record<string, number>>({});
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteDeptId, setDeleteDeptId] = useState<{ id: string; name: string } | null>(null);
  const [deptForm, setDeptForm] = useState<CreateDepartmentData>(EMPTY_DEPT);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadStats(); loadDepartments(); }, []);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, search, roleFilter, deptFilter]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const [s, recent, online] = await Promise.all([
        adminApi.getSystemStats(),
        adminApi.getRecentRegistrations(8),
        adminApi.getOnlineCount(),
      ]);
      setStats(s); setRecentUsers(recent); setOnlineCount(online);
    } catch { toast.error('Nie udało się załadować statystyk'); }
    finally { setLoadingStats(false); }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await adminApi.getAllUsers(1, 200, search || undefined, roleFilter || undefined);
      const filtered = deptFilter ? res.users.filter(u => u.department === deptFilter) : res.users;
      setUsers(filtered);
    } catch { toast.error('Nie udało się załadować użytkowników'); }
    finally { setLoadingUsers(false); }
  };

  const loadDepartments = async () => {
    try {
      setLoadingDepts(true);
      const [depts, tree] = await Promise.all([
        departmentApi.getAllDepartments(true),
        departmentApi.getDepartmentTree(),
      ]);
      setDepartments(depts);
      // Build employee count map from tree (which has accurate employeeCount per node)
      const counts: Record<string, number> = {};
      const walk = (nodes: DepartmentTreeNode[]) => nodes.forEach(n => { counts[n.id] = n.employeeCount; walk(n.children); });
      walk(tree);
      setDeptCounts(counts);
    } catch { }
    finally { setLoadingDepts(false); }
  };

  // ── User CRUD ─────────────────────────────────────────────────────────────
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await adminApi.updateUser(editingUser.id, { firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, role: userForm.role, department: userForm.department, position: userForm.position, phone: userForm.phone });
        toast.success('Użytkownik zaktualizowany');
        setEditingUser(null);
      } else {
        await adminApi.createUser(userForm);
        toast.success('Użytkownik utworzony');
        setShowCreateUser(false);
      }
      setUserForm(EMPTY_USER);
      loadUsers(); loadStats();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Błąd podczas zapisywania'); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await adminApi.deleteUser(deleteUserId.id);
      toast.success('Użytkownik usunięty');
      setDeleteUserId(null);
      loadUsers(); loadStats();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Błąd podczas usuwania'); }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      if (user.is_active) { await adminApi.deactivateUser(user.id); toast.success('Konto dezaktywowane'); }
      else { await adminApi.activateUser(user.id); toast.success('Konto aktywowane'); }
      loadUsers();
    } catch { toast.error('Nie udało się zmienić statusu'); }
  };

  const handleResetPassword = async () => {
    if (!resetPwdUser || !newPassword) return;
    try {
      await adminApi.resetUserPassword(resetPwdUser.id, newPassword);
      toast.success('Hasło zresetowane');
      setResetPwdUser(null); setNewPassword('');
    } catch { toast.error('Nie udało się zresetować hasła'); }
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setUserForm({ email: user.email, password: '', firstName: user.first_name, lastName: user.last_name, role: user.role, department: user.department || '', position: user.position || '', phone: user.phone || '' });
  };

  // ── Department CRUD ───────────────────────────────────────────────────────
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await departmentApi.updateDepartment(editingDept.id, { name: deptForm.name, color: deptForm.color });
        toast.success('Dział zaktualizowany');
        setEditingDept(null);
      } else {
        await departmentApi.createDepartment(deptForm);
        toast.success('Dział utworzony');
        setShowCreateDept(false);
      }
      setDeptForm(EMPTY_DEPT);
      loadDepartments();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Błąd podczas zapisywania'); }
  };

  const handleDeleteDept = async () => {
    if (!deleteDeptId) return;
    try {
      await departmentApi.deleteDepartment(deleteDeptId.id);
      toast.success('Dział usunięty');
      setDeleteDeptId(null);
      loadDepartments();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Nie można usunąć działu (może mieć przypisanych pracowników)'); }
  };

  // ── Input style ───────────────────────────────────────────────────────────
  const inp = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#F7941D]/40 focus:border-[#F7941D] dark:bg-gray-700 dark:text-white outline-none';

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'dashboard', label: 'Pulpit', icon: BarChart3 },
    { id: 'users', label: 'Użytkownicy', icon: Users },
    { id: 'departments', label: 'Działy', icon: Building2 },
    { id: 'fun', label: 'Rozrywka', icon: Tv2 },
  ];

  return (
    <MainLayout title="Panel admina">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Administracja</p>
              <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Panel administracyjny</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Zarządzanie systemem</p>
            </div>
          </div>
          <button onClick={loadStats} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
            Odśwież
          </button>
        </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id
                  ? 'border-[#F7941D] text-[#F7941D]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ────────────────────────────────────────────────── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#F7941D]/30 border-t-[#F7941D] rounded-full animate-spin" /></div>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Użytkownicy', value: stats?.users.total ?? 0, sub: `${stats?.users.active ?? 0} aktywnych · ${onlineCount} online`, icon: Users, color: 'text-[#F7941D]', bg: 'bg-[#F7941D]/10' },
                    { label: 'Wpisy czasu', value: stats?.timeEntries.total ?? 0, sub: `${stats?.timeEntries.today ?? 0} dziś · ${stats?.timeEntries.thisWeek ?? 0} ten tydzień`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Wnioski urlopowe', value: stats?.leaveRequests.total ?? 0, sub: `${stats?.leaveRequests.pending ?? 0} oczekujących · ${stats?.leaveRequests.approved ?? 0} zatwierdzonych`, icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Wiadomości', value: stats?.messages.total ?? 0, sub: `${stats?.messages.today ?? 0} dziś · ${stats?.channels.active ?? 0} aktywnych kanałów`, icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                  ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{label}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent registrations */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#F7941D]" />
                        Ostatnie rejestracje
                      </h2>
                      <button onClick={() => setTab('users')} className="text-xs text-[#F7941D] hover:underline">
                        Zobacz wszystkich →
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recentUsers.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Brak użytkowników</p>
                      ) : recentUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#F7941D]/10 text-[#F7941D] flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                              {u.avatar_url ? <img src={getFileUrl(u.avatar_url) || ''} alt="" className="w-full h-full object-cover" /> : initials(u)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.first_name} {u.last_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${ROLE_BADGE[u.role] ?? ROLE_BADGE.employee}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                            <span className="text-[10px] text-gray-400">{fmt(u.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Users by role */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#F7941D]" />
                      Użytkownicy według ról
                    </h2>
                    <div className="space-y-3">
                      {stats?.users.byRole && Object.entries(stats.users.byRole).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                        const pct = stats.users.total > 0 ? ((count / stats.users.total) * 100).toFixed(0) : '0';
                        return (
                          <div key={role}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${ROLE_DOT[role] ?? 'bg-gray-400'}`} />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{ROLE_LABELS[role] ?? role}</span>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">{count} <span className="text-xs font-normal text-gray-400">({pct}%)</span></span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${ROLE_DOT[role] ?? 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Szybkie akcje</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Nowy użytkownik', sub: 'Dodaj konto', icon: UserPlus, action: () => { setTab('users'); setShowCreateUser(true); }, color: 'bg-[#F7941D]/10 text-[#F7941D] border-[#F7941D]/20 hover:bg-[#F7941D]/20' },
                      { label: 'Pracownicy', sub: 'Lista pracowników', icon: Users, action: () => navigate('/employees'), color: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
                      { label: 'Nowy dział', sub: 'Dodaj dział', icon: Building2, action: () => { setTab('departments'); setShowCreateDept(true); }, color: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' },
                      { label: 'Organizacja', sub: 'Schemat org', icon: Activity, action: () => navigate('/organization'), color: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
                    ].map(({ label, sub, icon: Icon, action, color }) => (
                      <button key={label} onClick={action} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left ${color}`}>
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{label}</p>
                          <p className="text-xs opacity-70 truncate">{sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Szukaj użytkownika..." value={search} onChange={e => setSearch(e.target.value)} className={`${inp} pl-9`} />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={`${inp} w-auto`}>
                  <option value="">Wszystkie role</option>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={`${inp} w-auto`}>
                  <option value="">Wszystkie działy</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <button onClick={() => { setUserForm(EMPTY_USER); setEditingUser(null); setShowCreateUser(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#F7941D] text-white text-sm font-medium rounded-lg hover:bg-[#e8851a] transition-colors">
                  <Plus className="w-4 h-4" />
                  Nowy użytkownik
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{loadingUsers ? 'Ładowanie...' : `${users.length} użytkowników`}</p>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      {['Użytkownik', 'Rola', 'Dział', 'Stanowisko', 'Status', 'Rejestracja', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {loadingUsers ? (
                      <tr><td colSpan={7} className="py-12 text-center text-gray-400"><div className="w-6 h-6 border-2 border-[#F7941D]/30 border-t-[#F7941D] rounded-full animate-spin mx-auto" /></td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Brak użytkowników</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#F7941D]/10 text-[#F7941D] flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                              {u.avatar_url ? <img src={getFileUrl(u.avatar_url) || ''} alt="" className="w-full h-full object-cover" /> : initials(u)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.first_name} {u.last_name}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ROLE_BADGE[u.role] ?? ROLE_BADGE.employee}`}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{u.department || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{u.position || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {u.is_active ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/employees/${u.id}`)} title="Profil" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openEdit(u)} title="Edytuj" className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleToggleActive(u)} title={u.is_active ? 'Dezaktywuj' : 'Aktywuj'} className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                              {u.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => setResetPwdUser({ id: u.id, email: u.email })} title="Reset hasła" className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"><KeyRound className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteUserId({ id: u.id, email: u.email })} title="Usuń" className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DEPARTMENTS TAB ──────────────────────────────────────────────── */}
        {tab === 'departments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{departments.length} działów w systemie</p>
              <button onClick={() => { setDeptForm(EMPTY_DEPT); setEditingDept(null); setShowCreateDept(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#F7941D] text-white text-sm font-medium rounded-lg hover:bg-[#e8851a] transition-colors">
                <Plus className="w-4 h-4" />
                Nowy dział
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingDepts ? (
                <div className="col-span-3 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-[#F7941D]/30 border-t-[#F7941D] rounded-full animate-spin" /></div>
              ) : departments.map(dept => (
                <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: dept.color || '#6B7280' }}>
                        {dept.code.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{dept.name}</p>
                        <p className="text-xs text-gray-400">{dept.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, code: dept.code, color: dept.color || '#F7941D' }); setShowCreateDept(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteDeptId({ id: dept.id, name: dept.name })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{deptCounts[dept.id] ?? 0} os.</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {dept.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FUN TAB ──────────────────────────────────────────────────────── */}
        {tab === 'fun' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <Tv2 className="w-4 h-4 text-[#F7941D]" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Live stream</span>
              <span className="ml-auto text-xs text-gray-400">youtube.com</span>
            </div>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/UI9i_fzkLa0?autoplay=1"
                title="Live stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* Create/Edit User */}
      {(showCreateUser || editingUser) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateUser(false); setEditingUser(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#F7941D]" />
                {editingUser ? 'Edytuj użytkownika' : 'Nowy użytkownik'}
              </h2>
              <button onClick={() => { setShowCreateUser(false); setEditingUser(null); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Imię *</label><input required className={inp} value={userForm.firstName} onChange={e => setUserForm({ ...userForm, firstName: e.target.value })} /></div>
                <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nazwisko *</label><input required className={inp} value={userForm.lastName} onChange={e => setUserForm({ ...userForm, lastName: e.target.value })} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email *</label><input type="email" required className={inp} value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} /></div>
              {!editingUser && <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hasło *</label><input type="password" required className={inp} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rola</label>
                  <select className={inp} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dział</label>
                  <select className={inp} value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })}>
                    <option value="">Brak</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Stanowisko</label><input type="text" className={inp} value={userForm.position} onChange={e => setUserForm({ ...userForm, position: e.target.value })} placeholder="np. Pracownik" /></div>
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefon</label><input type="tel" className={inp} value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-[#F7941D] text-white text-sm font-medium rounded-lg hover:bg-[#e8851a] transition-colors">
                  {editingUser ? 'Zapisz zmiany' : 'Utwórz użytkownika'}
                </button>
                <button type="button" onClick={() => { setShowCreateUser(false); setEditingUser(null); }} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Department */}
      {(showCreateDept || editingDept) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateDept(false); setEditingDept(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F7941D]" />
                {editingDept ? 'Edytuj dział' : 'Nowy dział'}
              </h2>
              <button onClick={() => { setShowCreateDept(false); setEditingDept(null); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSaveDept} className="p-5 space-y-4">
              <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nazwa *</label><input required className={inp} value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
              {!editingDept && <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kod *</label><input required maxLength={10} className={`${inp} uppercase`} value={deptForm.code} onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })} placeholder="np. IT" /></div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kolor</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={deptForm.color ?? '#F7941D'} onChange={e => setDeptForm({ ...deptForm, color: e.target.value })} className="w-10 h-9 rounded cursor-pointer border border-gray-300 p-0.5" />
                  <div className="flex flex-wrap gap-1.5">
                    {DEPT_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setDeptForm({ ...deptForm, color: c })} className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110" style={{ backgroundColor: c, borderColor: deptForm.color === c ? '#111' : 'transparent' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-[#F7941D] text-white text-sm font-medium rounded-lg hover:bg-[#e8851a] transition-colors">
                  {editingDept ? 'Zapisz' : 'Utwórz dział'}
                </button>
                <button type="button" onClick={() => { setShowCreateDept(false); setEditingDept(null); }} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password */}
      {resetPwdUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setResetPwdUser(null); setNewPassword(''); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><KeyRound className="w-4 h-4 text-[#F7941D]" />Reset hasła</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{resetPwdUser.email}</p>
            <input type="password" autoFocus value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nowe hasło" className={inp} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleResetPassword} disabled={!newPassword} className="flex-1 py-2 bg-[#F7941D] text-white text-sm font-medium rounded-lg hover:bg-[#e8851a] disabled:opacity-50 transition-colors">Zresetuj hasło</button>
              <button onClick={() => { setResetPwdUser(null); setNewPassword(''); }} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirm */}
      <ConfirmDialog
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
        title="Usuń użytkownika"
        message={`Czy na pewno chcesz usunąć konto ${deleteUserId?.email}? Tej operacji nie można cofnąć.`}
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
      />

      {/* Delete dept confirm */}
      <ConfirmDialog
        isOpen={deleteDeptId !== null}
        onClose={() => setDeleteDeptId(null)}
        onConfirm={handleDeleteDept}
        title="Usuń dział"
        message={`Czy na pewno chcesz usunąć dział "${deleteDeptId?.name}"?`}
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
      />
    </MainLayout>
  );
};

export default Admin;
