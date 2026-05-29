import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Calendar,
  Plus,
  X,
  Clock,
  Home,
  Umbrella,
  Heart,
  Loader2,
  MoreHorizontal,
  Save,
  Search,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as adminApi from '../api/admin.api';
import * as timeApi from '../api/time.api';
import * as calendarApi from '../api/calendar.api';
import type { AdminUser } from '../types/admin.types';
import type { LeaveRequest, LeaveBalance } from '../types/time.types';
import type { TeamAvailability } from '../api/calendar.api';

type LeaveType =
  | 'vacation' | 'personal' | 'sick_leave' | 'unpaid' | 'parental'
  | 'maternity' | 'paternity' | 'childcare_188' | 'care' | 'occasional'
  | 'remote_work' | 'other';

// Tylko te typy odliczają dni z puli urlopowej
const DEDUCTING_TYPES: LeaveType[] = ['vacation', 'personal'];

const leaveTypeConfig: Record<LeaveType, { label: string; icon: React.ReactNode; color: string }> =
  {
    vacation: {
      label: 'Urlop wypoczynkowy',
      icon: <Umbrella className="w-4 h-4" />,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
    },
    personal: {
      label: 'Urlop na żądanie',
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
    },
    sick_leave: {
      label: 'Zwolnienie lekarskie',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-red-500 bg-red-50 dark:bg-red-900/30',
    },
    unpaid: {
      label: 'Urlop bezpłatny',
      icon: <MoreHorizontal className="w-4 h-4" />,
      color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
    },
    parental: {
      label: 'Urlop rodzicielski',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30',
    },
    maternity: {
      label: 'Urlop macierzyński',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30',
    },
    paternity: {
      label: 'Urlop ojcowski',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
    },
    childcare_188: {
      label: 'Opieka nad dzieckiem do 14 lat (art. 188)',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
    },
    care: {
      label: 'Urlop opiekuńczy (art. 173¹)',
      icon: <Heart className="w-4 h-4" />,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/30',
    },
    occasional: {
      label: 'Urlop okolicznościowy',
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
    },
    remote_work: {
      label: 'Praca zdalna',
      icon: <Home className="w-4 h-4" />,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
    },
    other: {
      label: 'Inne',
      icon: <MoreHorizontal className="w-4 h-4" />,
      color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
    },
  };

const Absences = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'pending' | 'calendar' | 'management'>('my');
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState<10 | 30 | 50>(10);

  // Calendar tab state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState(7);
  const [availability, setAvailability] = useState<TeamAvailability[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const canManageLeavePlans = user?.role === 'admin';
  const canReviewLeave = ['admin', 'kierownik', 'ksiegowosc', 'szef'].includes(user?.role || '');

  const [managementUsers, setManagementUsers] = useState<AdminUser[]>([]);
  const [managementSearch, setManagementSearch] = useState('');
  const [isManagementLoading, setIsManagementLoading] = useState(false);
  const [savingLeaveDaysUserId, setSavingLeaveDaysUserId] = useState<string | null>(null);
  const [leaveDaysDrafts, setLeaveDaysDrafts] = useState<Record<string, string>>({});
  const [managementError, setManagementError] = useState('');
  const [managementSuccess, setManagementSuccess] = useState('');

  const [oneDayLeave, setOneDayLeave] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'vacation' as LeaveType,
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'calendar') loadCalendar();
  }, [activeTab, calendarDate, calendarDays]);

  useEffect(() => {
    if (activeTab === 'management' && canManageLeavePlans) {
      loadManagementUsers();
    }
  }, [activeTab, canManageLeavePlans]);

  useEffect(() => {
    setRequestPage(1);
  }, [activeTab, requestPageSize]);

  const loadManagementUsers = async () => {
    try {
      setIsManagementLoading(true);
      setManagementError('');
      const users = await adminApi.getUsers();
      const sortedUsers = [...users].sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'pl')
      );
      setManagementUsers(sortedUsers);
      setLeaveDaysDrafts(
        Object.fromEntries(
          sortedUsers.map(employee => [employee.id, String(employee.annual_leave_days ?? 20)])
        )
      );
    } catch {
      setManagementError('Nie udało się pobrać listy pracowników.');
      setManagementUsers([]);
    } finally {
      setIsManagementLoading(false);
    }
  };

  const handleLeaveDaysDraftChange = (employeeId: string, value: string) => {
    setLeaveDaysDrafts(prev => ({ ...prev, [employeeId]: value }));
    setManagementError('');
    setManagementSuccess('');
  };

  const handleSaveLeaveDays = async (employee: AdminUser) => {
    const value = Number(leaveDaysDrafts[employee.id]);

    if (!Number.isFinite(value) || value < 0 || value > 365) {
      setManagementError('Podaj poprawny limit urlopu z zakresu 0-365 dni.');
      setManagementSuccess('');
      return;
    }

    try {
      setSavingLeaveDaysUserId(employee.id);
      setManagementError('');
      setManagementSuccess('');
      const updatedEmployee = await adminApi.updateUser(employee.id, {
        annual_leave_days: value,
      });

      setManagementUsers(prev =>
        prev.map(userItem =>
          userItem.id === employee.id
            ? {
                ...userItem,
                annual_leave_days: updatedEmployee.annual_leave_days ?? value,
              }
            : userItem
        )
      );
      setLeaveDaysDrafts(prev => ({ ...prev, [employee.id]: String(value) }));
      setManagementSuccess(
        `Zapisano limit urlopu dla ${employee.first_name} ${employee.last_name}.`
      );
    } catch {
      setManagementError(
        'Nie udało się zapisać limitu urlopu. Jeśli tę zakładkę mają obsługiwać też role HR lub kierownik, backend powinien udostępnić im odpowiedni endpoint.'
      );
    } finally {
      setSavingLeaveDaysUserId(null);
    }
  };

  const loadCalendar = async () => {
    setCalendarLoading(true);
    try {
      const start = new Date(calendarDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(calendarDate);
      end.setDate(end.getDate() + calendarDays - 1);
      end.setHours(23, 59, 59, 999);
      const data = await calendarApi.getTeamAvailability(start.toISOString(), end.toISOString());
      setAvailability(data);
    } catch {
      setAvailability([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  const calStatusColor = (s: string) =>
    s === 'working'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : s === 'on_leave'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-gray-100 text-gray-500 border-gray-200';

  const calStatusIcon = (s: string) => (s === 'working' ? '✓' : s === 'on_leave' ? '✈' : '–');
  const calStatusText = (s: string) =>
    s === 'working' ? 'Pracuje' : s === 'on_leave' ? 'Urlop' : 'Nieobecny';

  const formatCalDate = (d: string) =>
    new Date(d).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [requests, leaveBalance] = await Promise.all([
        timeApi.getUserLeaveRequests(),
        timeApi.getUserLeaveBalance(),
      ]);
      setLeaveRequests(requests);
      setBalance(leaveBalance);

      if (['admin', 'kierownik', 'ksiegowosc', 'szef'].includes(user?.role || '')) {
        const manageable = await timeApi.getManageableLeaveRequests();
        setPendingRequests(manageable);
      }
    } catch (error) {
      console.error('Failed to load leave data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await timeApi.createLeaveRequest({
        leaveType: formData.leave_type as any,
        startDate: formData.start_date,
        endDate: oneDayLeave ? formData.start_date : formData.end_date,
        reason: formData.reason,
      });
      setShowForm(false);
      setOneDayLeave(false);
      setFormData({ leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się utworzyć wniosku');
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await timeApi.approveLeaveRequest(requestId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się zatwierdzić wniosku');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await timeApi.rejectLeaveRequest(requestId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się odrzucić wniosku');
    }
  };

  const handleRevert = async (requestId: string) => {
    try {
      await timeApi.revertLeaveRequest(requestId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się cofnąć wniosku');
    }
  };

  const handleAdminCancel = async (requestId: string) => {
    if (!confirm('Czy na pewno anulować ten wniosek?')) return;
    try {
      await timeApi.adminCancelLeaveRequest(requestId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się anulować wniosku');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; classes: string }> = {
      pending: {
        label: 'Oczekujące',
        classes: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      },
      approved: {
        label: 'Zatwierdzone',
        classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      },
      rejected: {
        label: 'Odrzucone',
        classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      },
      cancelled: {
        label: 'Anulowane',
        classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
      },
    };
    return configs[status] || configs.cancelled;
  };

  const balanceCards = [
    {
      label: 'Przysługujące dni urlopu',
      value: balance?.annualLeave,
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      valueColor: 'text-blue-600',
    },
    {
      label: 'Wykorzystane dni',
      value: balance?.usedDays,
      icon: <Clock className="h-5 w-5 text-[#F7941D]" />,
      iconBg: 'bg-[#F7941D]/10',
      valueColor: 'text-[#F7941D]',
    },
    {
      label: 'Pozostało dni',
      value: balance?.remaining,
      icon: <Calendar className="h-5 w-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      valueColor: 'text-emerald-600',
    },
  ];

  const currentRequests = activeTab === 'pending' ? pendingRequests : leaveRequests;
  const requestTotalPages = Math.max(1, Math.ceil(currentRequests.length / requestPageSize));
  const requestStartIndex = (requestPage - 1) * requestPageSize;
  const requestEndIndex = Math.min(requestStartIndex + requestPageSize, currentRequests.length);
  const paginatedRequests = currentRequests.slice(requestStartIndex, requestEndIndex);
  const requestRangeLabel =
    currentRequests.length > 0
      ? `${requestStartIndex + 1}-${requestEndIndex} z ${currentRequests.length}`
      : '0 z 0';
  const normalizedManagementSearch = managementSearch.trim().toLowerCase();
  const filteredManagementUsers = managementUsers.filter(employee => {
    if (!normalizedManagementSearch) return true;

    return [
      employee.first_name,
      employee.last_name,
      employee.email,
      employee.department,
      employee.position,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedManagementSearch);
  });

  useEffect(() => {
    if (requestPage > requestTotalPages) {
      setRequestPage(requestTotalPages);
    }
  }, [requestPage, requestTotalPages]);

  return (
    <MainLayout title="Nieobecności">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                Moduł HR
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nieobecności</h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Zarządzaj urlopami, zwolnieniami, pracą zdalną i dostępnością zespołu.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/40 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <Plus className="h-4 w-4" />
            Nowy wniosek
          </button>
        </div>

        {/* Balance Cards */}
        {balance && (
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {balanceCards.map(card => (
              <div
                key={card.label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value ?? '-'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 p-3 dark:border-gray-700">
            <nav className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('my')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'my'
                    ? 'bg-[#F7941D] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Moje wnioski
              </button>
              {canReviewLeave && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Zarządzaj wnioskami
                  {pendingRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
                    >
                      {pendingRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setActiveTab('calendar')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-[#F7941D] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Users className="h-4 w-4" />
                Kalendarz zespołu
              </button>
              {canManageLeavePlans && (
                <button
                  onClick={() => setActiveTab('management')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'management'
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Zarządzanie
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Leave Requests List */}
        {activeTab !== 'calendar' && activeTab !== 'management' && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-600"></div>
                      <div className="flex-1">
                        <div className="mb-2 h-4 w-44 rounded bg-gray-200 dark:bg-gray-600"></div>
                        <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-600"></div>
                      </div>
                      <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {currentRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                      <Calendar className="h-7 w-7" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Brak wniosków
                    </h3>
                    <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                      {activeTab === 'my'
                        ? 'Nie masz żadnych wniosków urlopowych'
                        : 'Nie ma wniosków do zatwierdzenia'}
                    </p>
                  </div>
                ) : (
                  paginatedRequests.map(request => {
                    const typeConfig =
                      leaveTypeConfig[request.leave_type as LeaveType] || leaveTypeConfig.other;
                    const statusCfg = getStatusConfig(request.status);
                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        key={request.id}
                        onClick={() => navigate(`/absences/${request.id}`)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            navigate(`/absences/${request.id}`);
                          }
                        }}
                        className="block w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Type icon */}
                            <div
                              className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${typeConfig.color}`}
                            >
                              {typeConfig.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {typeConfig.label}
                                </h3>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.classes}`}
                                >
                                  {statusCfg.label}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span>
                                  {new Date(request.start_date).toLocaleDateString('pl-PL')} –{' '}
                                  {new Date(request.end_date).toLocaleDateString('pl-PL')}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  {request.total_days} dni
                                </span>
                              </div>
                              {request.reason && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {request.reason}
                                </p>
                              )}
                              {activeTab === 'pending' && request.user && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  Pracownik:{' '}
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {request.user.first_name} {request.user.last_name}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          {activeTab === 'pending' && request.status === 'pending' && (
                            <div className="flex flex-shrink-0 gap-2">
                              <button
                                onClick={event => {
                                  event.stopPropagation();
                                  handleApprove(request.id);
                                }}
                                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                              >
                                Zatwierdź
                              </button>
                              <button
                                onClick={event => {
                                  event.stopPropagation();
                                  handleReject(request.id);
                                }}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                              >
                                Odrzuć
                              </button>
                            </div>
                          )}

                          {activeTab === 'pending' && (request.status === 'approved' || request.status === 'rejected') && (
                            <div className="flex flex-shrink-0 gap-2">
                              <button
                                onClick={event => {
                                  event.stopPropagation();
                                  handleRevert(request.id);
                                }}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                              >
                                Cofnij do oczekujących
                              </button>
                              <button
                                onClick={event => {
                                  event.stopPropagation();
                                  handleAdminCancel(request.id);
                                }}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                              >
                                Anuluj
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {!isLoading && currentRequests.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Wyświetlane:{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {requestRangeLabel}
                    </span>
                  </p>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>Na stronie</span>
                    <select
                      value={requestPageSize}
                      onChange={e => setRequestPageSize(Number(e.target.value) as 10 | 30 | 50)}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <option value={10}>10</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestPage(page => Math.max(1, page - 1))}
                    disabled={requestPage === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Poprzednia
                  </button>
                  <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                    {requestPage} / {requestTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRequestPage(page => Math.min(requestTotalPages, page + 1))}
                    disabled={requestPage === requestTotalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Następna
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Management tab content */}
        {activeTab === 'management' && canManageLeavePlans && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              <p className="font-semibold">Informacja dla backendu</p>
              <p className="mt-1">
                Ta zakładka zapisuje roczny limit urlopu w polu{' '}
                <span className="font-mono text-xs">annual_leave_days</span> profilu pracownika. Aby
                saldo urlopu było w pełni spójne, backend powinien liczyć balans z tej wartości, a
                nie ze stałej liczby dni.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                    Plany urlopowe
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    Zarządzanie limitami dni
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Ustaw roczny wymiar urlopu dla pracowników widocznych w systemie.
                  </p>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={managementSearch}
                    onChange={event => setManagementSearch(event.target.value)}
                    placeholder="Szukaj pracownika..."
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {(managementError || managementSuccess) && (
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  {managementError && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
                      {managementError}
                    </p>
                  )}
                  {managementSuccess && (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                      {managementSuccess}
                    </p>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Pracownik
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Dział / stanowisko
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Roczny limit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                        Akcja
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {isManagementLoading ? (
                      [...Array(5)].map((_, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4">
                            <div className="h-4 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-9 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="ml-auto h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                          </td>
                        </tr>
                      ))
                    ) : filteredManagementUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                        >
                          Brak pracowników pasujących do wyszukiwania.
                        </td>
                      </tr>
                    ) : (
                      filteredManagementUsers.map(employee => {
                        const isSaving = savingLeaveDaysUserId === employee.id;

                        return (
                          <tr
                            key={employee.id}
                            className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {employee.first_name} {employee.last_name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {employee.email}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                              <div>{employee.department || 'Brak działu'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {employee.position || 'Brak stanowiska'}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={365}
                                  value={leaveDaysDrafts[employee.id] ?? ''}
                                  onChange={event =>
                                    handleLeaveDaysDraftChange(employee.id, event.target.value)
                                  }
                                  className="h-10 w-24 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  dni
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleSaveLeaveDays(employee)}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                Zapisz
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Calendar tab content */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const d = new Date(calendarDate);
                    d.setDate(d.getDate() - 7);
                    setCalendarDate(d);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Poprzedni tydzień
                </button>
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="rounded-lg bg-[#F7941D] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d87f16]"
                >
                  Dzisiaj
                </button>
                <button
                  onClick={() => {
                    const d = new Date(calendarDate);
                    d.setDate(d.getDate() + 7);
                    setCalendarDate(d);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Następny tydzień
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Widok:</span>
                <select
                  value={calendarDays}
                  onChange={e => setCalendarDays(Number(e.target.value))}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value={7}>7 dni</option>
                  <option value={14}>14 dni</option>
                  <option value={30}>30 dni</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <span className="font-medium">Legenda:</span>
              {[
                ['working', 'Pracuje', '✓'],
                ['on_leave', 'Urlop', '✈'],
                ['absent', 'Nieobecny', '–'],
              ].map(([s, label, icon]) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={`w-7 h-7 rounded border flex items-center justify-center text-xs ${calStatusColor(s)}`}
                  >
                    {icon}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            {/* Table */}
            {calendarLoading ? (
              <div className="flex justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#F7941D]" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
                          Pracownik
                        </th>
                        {availability.map(day => (
                          <th
                            key={day.date}
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[110px]"
                          >
                            {formatCalDate(day.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                      {availability.length > 0 &&
                        availability[0].users.map((u, i) => (
                          <tr
                            key={u.id}
                            className={
                              i % 2 === 0
                                ? 'bg-white dark:bg-gray-800'
                                : 'bg-gray-50 dark:bg-gray-700/40'
                            }
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-inherit z-10">
                              {u.name}
                            </td>
                            {availability.map(day => {
                              const du = day.users.find(x => x.id === u.id);
                              if (!du)
                                return (
                                  <td
                                    key={day.date}
                                    className="px-3 py-3 text-center text-gray-400"
                                  >
                                    —
                                  </td>
                                );
                              return (
                                <td key={day.date} className="px-3 py-3 text-center">
                                  <div
                                    className={`inline-flex min-w-[90px] flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs font-semibold ${calStatusColor(du.status)}`}
                                    title={du.details}
                                  >
                                    <span>{calStatusIcon(du.status)}</span>
                                    <span>{calStatusText(du.status)}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      {availability.length === 0 && (
                        <tr>
                          <td colSpan={99} className="text-center py-12 text-gray-400 text-sm">
                            Brak danych
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Leave Request Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-700">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                    Nowy wniosek
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Wniosek o nieobecność
                  </h2>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Typ nieobecności *
                  </label>
                  <select
                    value={formData.leave_type}
                    onChange={e =>
                      setFormData({ ...formData, leave_type: e.target.value as LeaveType })
                    }
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    {(Object.keys(leaveTypeConfig) as LeaveType[]).map(type => (
                      <option key={type} value={type}>
                        {leaveTypeConfig[type].label}{DEDUCTING_TYPES.includes(type) ? ' (odlicza dni)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oneDayLeave}
                    onChange={e => {
                      setOneDayLeave(e.target.checked);
                      if (e.target.checked) setFormData(prev => ({ ...prev, end_date: '' }));
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Urlop 1-dniowy</span>
                </label>

                <div className={`grid grid-cols-1 gap-4 ${oneDayLeave ? '' : 'sm:grid-cols-2'}`}>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {oneDayLeave ? 'Data urlopu *' : 'Data początkowa *'}
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  {!oneDayLeave && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Data końcowa *
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Powód (opcjonalnie)
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="Dodatkowe informacje..."
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Złóż wniosek
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Absences;
