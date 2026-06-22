import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Calendar,
  CalendarDays,
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
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as timeApi from '../api/time.api';
import * as calendarApi from '../api/calendar.api';
import * as userApi from '../api/user.api';
import type { LeaveRequest, LeaveBalance, LeaveOverviewRow } from '../types/time.types';
import type { TeamAvailability } from '../api/calendar.api';

type LeaveType =
  | 'vacation' | 'personal' | 'sick_leave' | 'unpaid' | 'parental'
  | 'maternity' | 'paternity' | 'childcare_188' | 'care' | 'occasional' | 'occasional_hourly'
  | 'remote_work' | 'holiday_saturday' | 'other';

type RequestDateField = 'submitted' | 'absence';
type AbsenceTab = 'my' | 'pending' | 'calendar' | 'management' | 'all' | 'report';
type LeaveDateMode = 'range' | 'multiple';

const ABSENCES_ACTIVE_TAB_KEY = 'erp:absences:active-tab';
const absenceTabs: AbsenceTab[] = ['my', 'pending', 'calendar', 'management', 'all', 'report'];

const isAbsenceTab = (value: string | null): value is AbsenceTab =>
  Boolean(value && absenceTabs.includes(value as AbsenceTab));

// Tylko te typy odliczają dni z puli urlopowej
const DEDUCTING_TYPES: LeaveType[] = ['vacation', 'personal', 'occasional_hourly'];

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
    occasional_hourly: {
      label: 'Urlop wypoczynkowy (godzinowy)',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
    },
    remote_work: {
      label: 'Praca zdalna',
      icon: <Home className="w-4 h-4" />,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
    },
    holiday_saturday: {
      label: 'Dzień wolny za święto w sobotę',
      icon: <CalendarDays className="w-4 h-4" />,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
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
  const canManageLeavePlans = ['admin', 'kadry'].includes(user?.role || '');
  const canReviewLeave = ['admin', 'kierownik', 'kadry', 'szef'].includes(user?.role || '');
  const canViewAllAbsences = ['admin', 'kadry'].includes(user?.role || '');
  const activeTabStorageKey = `${ABSENCES_ACTIVE_TAB_KEY}:${user?.id || 'current-user'}`;

  const canOpenAbsenceTab = (tab: AbsenceTab) => {
    if (tab === 'pending') return canReviewLeave;
    if (tab === 'management') return canManageLeavePlans;
    if (tab === 'all' || tab === 'report') return canViewAllAbsences;
    return true;
  };

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<AbsenceTab>(() => {
    const storedTab = sessionStorage.getItem(activeTabStorageKey);
    return isAbsenceTab(storedTab) && canOpenAbsenceTab(storedTab) ? storedTab : 'my';
  });
  const [reportUserId, setReportUserId] = useState('');
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allSearch, setAllSearch] = useState('');
  const [allSortAsc, setAllSortAsc] = useState(false);
  const [allDateFrom, setAllDateFrom] = useState('');
  const [allDateTo, setAllDateTo] = useState('');
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState<10 | 30 | 50>(10);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [requestDateField, setRequestDateField] = useState<RequestDateField>('absence');
  const [requestSortAsc, setRequestSortAsc] = useState(false);
  const [requestDateFrom, setRequestDateFrom] = useState('');
  const [requestDateTo, setRequestDateTo] = useState('');

  // Calendar tab state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState(7);
  const [availability, setAvailability] = useState<TeamAvailability[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [overviewRows, setOverviewRows] = useState<LeaveOverviewRow[]>([]);
  const [managementSearch, setManagementSearch] = useState('');
  const [isManagementLoading, setIsManagementLoading] = useState(false);
  const [savingLeaveDaysUserId, setSavingLeaveDaysUserId] = useState<string | null>(null);
  const [carriedDrafts, setCarriedDrafts] = useState<Record<string, string>>({});
  const [annualDrafts, setAnnualDrafts] = useState<Record<string, string>>({});
  const [usedDrafts, setUsedDrafts] = useState<Record<string, string>>({});
  const [remoteDrafts, setRemoteDrafts] = useState<Record<string, string>>({});
  const [remoteUsedDrafts, setRemoteUsedDrafts] = useState<Record<string, string>>({});
  const [etatDrafts, setEtatDrafts] = useState<Record<string, string>>({});
  const [managementError, setManagementError] = useState('');
  const [managementSuccess, setManagementSuccess] = useState('');

  const [oneDayLeave, setOneDayLeave] = useState(false);
  const [leaveDateMode, setLeaveDateMode] = useState<LeaveDateMode>('range');
  const [multipleDateDraft, setMultipleDateDraft] = useState('');
  const [selectedLeaveDates, setSelectedLeaveDates] = useState<string[]>([]);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    leave_type: 'vacation' as LeaveType,
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: '',
  });
  const isHourlyForm = formData.leave_type === 'occasional_hourly';
  const [formUserId, setFormUserId] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<{ id: string; first_name: string; last_name: string; email: string }[]>([]);

  useEffect(() => {
    if (!canOpenAbsenceTab(activeTab)) {
      setActiveTab('my');
      return;
    }

    sessionStorage.setItem(activeTabStorageKey, activeTab);
  }, [activeTab, activeTabStorageKey, canManageLeavePlans, canReviewLeave, canViewAllAbsences]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'calendar') loadCalendar();
  }, [activeTab, calendarDate, calendarDays]);

  useEffect(() => {
    if (activeTab === 'management' && canManageLeavePlans) {
      loadLeaveOverview();
    }
  }, [activeTab, canManageLeavePlans]);

  useEffect(() => {
    if (activeTab === 'all' && canViewAllAbsences) {
      setAllLoading(true);
      timeApi.getAllLeaveRequests()
        .then(setAllRequests)
        .catch(() => setAllRequests([]))
        .finally(() => setAllLoading(false));
    }
  }, [activeTab, canViewAllAbsences]);

  useEffect(() => {
    if (canViewAllAbsences && directoryUsers.length === 0) {
      userApi.getDirectory()
        .then(u => setDirectoryUsers(u as any))
        .catch(() => {});
    }
  }, [canViewAllAbsences]);

  useEffect(() => {
    if (activeTab === 'report' && canViewAllAbsences && reportUserId) {
      const [y, m] = reportMonth.split('-').map(Number);
      setReportLoading(true);
      timeApi.getMonthlyReport(reportUserId, y, m)
        .then(setReportData)
        .catch(() => setReportData(null))
        .finally(() => setReportLoading(false));
    } else if (activeTab === 'report') {
      setReportData(null);
    }
  }, [activeTab, canViewAllAbsences, reportUserId, reportMonth]);

  useEffect(() => {
    setRequestPage(1);
  }, [
    activeTab,
    requestPageSize,
    requestSearch,
    requestStatusFilter,
    requestDateField,
    requestSortAsc,
    requestDateFrom,
    requestDateTo,
  ]);

  const loadLeaveOverview = async () => {
    try {
      setIsManagementLoading(true);
      setManagementError('');
      const rows = await timeApi.getLeaveOverview();
      setOverviewRows(rows);
      setCarriedDrafts(Object.fromEntries(rows.map(r => [r.id, String(r.carriedOver)])));
      setAnnualDrafts(Object.fromEntries(rows.map(r => [r.id, String(r.annualLeave)])));
      setUsedDrafts(Object.fromEntries(rows.map(r => [r.id, String(r.usedBaseline)])));
      setRemoteDrafts(Object.fromEntries(rows.map(r => [r.id, String(r.remoteAllowance)])));
      setRemoteUsedDrafts(Object.fromEntries(rows.map(r => [r.id, String(r.remoteUsedBaseline)])));
      setEtatDrafts(Object.fromEntries(rows.map(r => [r.id, r.employmentFraction ?? ''])));
    } catch {
      setManagementError('Nie udało się pobrać planów urlopowych.');
      setOverviewRows([]);
    } finally {
      setIsManagementLoading(false);
    }
  };

  const handleAllocationDraftChange = (
    employeeId: string,
    field: 'carried' | 'annual' | 'used' | 'remote' | 'remoteUsed' | 'etat',
    value: string
  ) => {
    const setter =
      field === 'carried' ? setCarriedDrafts
      : field === 'annual' ? setAnnualDrafts
      : field === 'used' ? setUsedDrafts
      : field === 'remote' ? setRemoteDrafts
      : field === 'remoteUsed' ? setRemoteUsedDrafts
      : setEtatDrafts;
    setter(prev => ({ ...prev, [employeeId]: value }));
    setManagementError('');
    setManagementSuccess('');
  };

  const handleSaveAllocation = async (row: LeaveOverviewRow) => {
    const carriedOverDays = Number(carriedDrafts[row.id]);
    const annualLeaveDays = Number(annualDrafts[row.id]);
    const usedLeaveDays = Number(usedDrafts[row.id]);
    const remoteWorkDays = Number(remoteDrafts[row.id]);
    const usedRemoteDays = Number(remoteUsedDrafts[row.id]);
    const employmentFraction = (etatDrafts[row.id] ?? '').trim();

    const invalid = (v: number) => !Number.isFinite(v) || v < 0 || v > 366;
    if ([carriedOverDays, annualLeaveDays, usedLeaveDays, remoteWorkDays, usedRemoteDays].some(invalid)) {
      setManagementError('Podaj poprawne wartości z zakresu 0–366 dni.');
      setManagementSuccess('');
      return;
    }

    try {
      setSavingLeaveDaysUserId(row.id);
      setManagementError('');
      setManagementSuccess('');
      const saved = await timeApi.updateLeaveAllocation(row.id, {
        annualLeaveDays, carriedOverDays, usedLeaveDays,
        remoteWorkDays, usedRemoteDays,
        employmentFraction: employmentFraction || null,
      });

      setOverviewRows(prev =>
        prev.map(item =>
          item.id === row.id
            ? {
                ...item,
                carriedOver: carriedOverDays,
                annualLeave: annualLeaveDays,
                usedBaseline: usedLeaveDays,
                usedDays: usedLeaveDays + item.usedRequests,
                available: Math.max(0, carriedOverDays + annualLeaveDays - (usedLeaveDays + item.usedRequests)),
                remoteAllowance: remoteWorkDays,
                remoteUsedBaseline: usedRemoteDays,
                remoteUsed: usedRemoteDays + item.remoteUsedRequests,
                remoteAvailable: Math.max(0, remoteWorkDays - (usedRemoteDays + item.remoteUsedRequests)),
                employmentFraction: employmentFraction || null,
                hoursPerDay: saved?.workingHoursPerDay != null ? Number(saved.workingHoursPerDay) : item.hoursPerDay,
              }
            : item
        )
      );
      setManagementSuccess(`Zapisano plan dla ${row.firstName} ${row.lastName}.`);
    } catch {
      setManagementError('Nie udało się zapisać planu urlopowego.');
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
      : s === 'remote'
        ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
        : s === 'on_leave'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-gray-100 text-gray-500 border-gray-200';

  const calStatusIcon = (s: string) => (s === 'working' ? '✓' : s === 'remote' ? '🏠' : s === 'on_leave' ? '✈' : '–');
  const calStatusText = (s: string) =>
    s === 'working' ? 'Pracuje' : s === 'remote' ? 'Zdalna' : s === 'on_leave' ? 'Urlop' : 'Nieobecny';

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

      if (['admin', 'kierownik', 'kadry', 'szef'].includes(user?.role || '')) {
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

    const isHourly = formData.leave_type === 'occasional_hourly';

    if (isHourly && (!formData.start_date || !formData.start_time || !formData.end_time)) {
      toast.error('Podaj dzień oraz godziny od i do');
      return;
    }
    if (isHourly && formData.end_time <= formData.start_time) {
      toast.error('Godzina „do" musi być po „od"');
      return;
    }

    if (!isHourly && leaveDateMode === 'multiple' && selectedLeaveDates.length === 0) {
      toast.error('Dodaj przynajmniej jeden dzień nieobecności');
      return;
    }

    setIsSubmittingLeave(true);

    try {
      if (isHourly) {
        await timeApi.createLeaveRequest({
          leaveType: formData.leave_type as any,
          startDate: formData.start_date,
          endDate: formData.start_date,
          startTime: formData.start_time,
          endTime: formData.end_time,
          reason: formData.reason,
          ...(canViewAllAbsences && formUserId ? { userId: formUserId } : {}),
        });
        toast.success('Wniosek został złożony');
      } else if (leaveDateMode === 'multiple') {
        const results = await Promise.allSettled(
          selectedLeaveDates.map(date =>
            timeApi.createLeaveRequest({
              leaveType: formData.leave_type as any,
              startDate: date,
              endDate: date,
              reason: formData.reason,
              ...(canViewAllAbsences && formUserId ? { userId: formUserId } : {}),
            }),
          ),
        );
        const failedDates = selectedLeaveDates.filter((_, index) => results[index].status === 'rejected');
        const createdCount = results.length - failedDates.length;

        if (failedDates.length > 0) {
          setSelectedLeaveDates(failedDates);
          if (createdCount > 0) {
            toast.error(`Utworzono ${createdCount} wniosków. Nie udało się zapisać ${failedDates.length}.`);
            await loadData();
          } else {
            const firstError = results.find(result => result.status === 'rejected');
            const message = firstError?.status === 'rejected'
              ? firstError.reason?.response?.data?.message
              : null;
            toast.error(message || 'Nie udało się utworzyć wniosków');
          }
          return;
        }

        toast.success(`Utworzono ${createdCount} ${createdCount === 1 ? 'wniosek' : 'wnioski'}`);
      } else {
        await timeApi.createLeaveRequest({
          leaveType: formData.leave_type as any,
          startDate: formData.start_date,
          endDate: oneDayLeave ? formData.start_date : formData.end_date,
          reason: formData.reason,
          ...(canViewAllAbsences && formUserId ? { userId: formUserId } : {}),
        });
        toast.success('Wniosek został złożony');
      }

      setShowForm(false);
      setOneDayLeave(false);
      setLeaveDateMode('range');
      setMultipleDateDraft('');
      setSelectedLeaveDates([]);
      setFormData({ leave_type: 'vacation', start_date: '', end_date: '', start_time: '', end_time: '', reason: '' });
      setFormUserId('');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się utworzyć wniosku');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const addSelectedLeaveDate = () => {
    if (!multipleDateDraft) {
      toast.error('Wybierz datę');
      return;
    }

    if (selectedLeaveDates.includes(multipleDateDraft)) {
      toast.error('Ten dzień jest już dodany');
      return;
    }

    setSelectedLeaveDates(currentDates =>
      [...currentDates, multipleDateDraft].sort((firstDate, secondDate) =>
        firstDate.localeCompare(secondDate),
      ),
    );
    setMultipleDateDraft('');
  };

  const formatSelectedLeaveDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const formatDaysLabel = (days: number | string) => {
    const numericDays = Number(days);
    const formattedDays = Number.isInteger(numericDays)
      ? numericDays.toString()
      : numericDays.toLocaleString('pl-PL', { maximumFractionDigits: 2 });

    return numericDays === 1 ? `${formattedDays} dzień` : `${formattedDays} dni`;
  };

  // Hourly leave shows hours + time window; everything else shows days.
  const formatLeaveDuration = (req: LeaveRequest) => {
    if (req.leave_type === 'occasional_hourly') {
      const h = req.hours != null ? Number(req.hours) : null;
      const hLabel = h != null ? `${h.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} h` : '';
      const window = req.start_time && req.end_time ? ` (${req.start_time}–${req.end_time})` : '';
      return `${hLabel}${window}`.trim() || formatDaysLabel(req.total_days);
    }
    return formatDaysLabel(req.total_days);
  };

  const getLeaveRequestCountLabel = (count: number) => {
    if (count === 1) return '1 wniosek';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
      return `${count} wnioski`;
    }
    return `${count} wniosków`;
  };

  const handleApprove = async (requestId: string) => {
    try {
      await timeApi.approveLeaveRequest(requestId);
      toast.success('Wniosek zatwierdzony');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się zatwierdzić wniosku');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await timeApi.rejectLeaveRequest(requestId);
      toast.success('Wniosek odrzucony');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się odrzucić wniosku');
    }
  };

  const handleRevert = async (requestId: string) => {
    try {
      await timeApi.revertLeaveRequest(requestId);
      toast.success('Cofnięto do oczekujących');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się cofnąć wniosku');
    }
  };

  const handleAdminCancel = async () => {
    if (!cancelId) return;
    try {
      await timeApi.adminCancelLeaveRequest(cancelId);
      toast.success('Wniosek anulowany');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się anulować wniosku');
    } finally {
      setCancelId(null);
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

  const hpd = balance?.hoursPerDay ?? 8;
  const fmtD = (v?: number) => (v == null ? '—' : Number.isInteger(v) ? `${v}` : v.toFixed(1));
  const fmtHrs = (v?: number) => (v == null ? '' : `${Math.round(v * hpd)} h`);
  const pendingDeductingLeaveDays = leaveRequests
    .filter(request =>
      request.status === 'pending' &&
      DEDUCTING_TYPES.includes(request.leave_type as LeaveType)
    )
    .reduce((sum, request) => sum + Number(request.total_days || 0), 0);
  const pendingRemoteWorkDays = leaveRequests
    .filter(request => request.status === 'pending' && request.leave_type === 'remote_work')
    .reduce((sum, request) => sum + Number(request.total_days || 0), 0);
  const remainingAfterPending = balance
    ? Math.max(0, balance.remaining - pendingDeductingLeaveDays)
    : undefined;
  const remoteRemainingAfterPending = balance
    ? Math.max(0, balance.remoteRemaining - pendingRemoteWorkDays)
    : undefined;

  const balanceCards = [
    {
      label: 'Przysługujące dni urlopu',
      value: fmtD(balance?.total),
      hint: balance
        ? `${fmtHrs(balance.total)} · ${fmtD(balance.annualLeave)} na rok + ${fmtD(balance.carriedOver)} przen.`
        : undefined,
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      valueColor: 'text-blue-600',
    },
    {
      label: 'Wykorzystane dni',
      value: fmtD(balance?.usedDays),
      hint: balance ? fmtHrs(balance.usedDays) : undefined,
      icon: <Clock className="h-5 w-5 text-[#F7941D]" />,
      iconBg: 'bg-[#F7941D]/10',
      valueColor: 'text-[#F7941D]',
    },
    {
      label: 'Pozostało dni',
      value: fmtD(balance?.remaining),
      hint: balance ? fmtHrs(balance.remaining) : undefined,
      subHint: balance
        ? `Po uwzględnieniu oczekujących: ${fmtD(remainingAfterPending)} dni (${fmtHrs(remainingAfterPending)})`
        : undefined,
      icon: <Calendar className="h-5 w-5 text-emerald-600" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Praca zdalna — pozostało',
      value: fmtD(balance?.remoteRemaining),
      hint: balance
        ? `${fmtHrs(balance.remoteRemaining)} · ${fmtD(balance.remoteUsed)}/${fmtD(balance.remoteAllowance)} wyk.`
        : undefined,
      subHint: balance
        ? `Po uwzględnieniu oczekujących: ${fmtD(remoteRemainingAfterPending)} dni (${fmtHrs(remoteRemainingAfterPending)})`
        : undefined,
      icon: <Home className="h-5 w-5 text-purple-600" />,
      iconBg: 'bg-purple-50 dark:bg-purple-900/30',
      valueColor: 'text-purple-600',
    },
  ];

  const baseRequests = activeTab === 'pending' ? pendingRequests : leaveRequests;
  const normalizedRequestSearch = requestSearch.trim().toLowerCase();
  const currentRequests = baseRequests
    .filter(request => {
      const typeLabel = leaveTypeConfig[request.leave_type as LeaveType]?.label || '';
      const userName = request.user ? `${request.user.first_name} ${request.user.last_name}` : '';
      const searchable = [typeLabel, request.reason, userName, request.user?.email, request.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedRequestSearch || searchable.includes(normalizedRequestSearch);
      const matchesStatus = requestStatusFilter === 'all' || request.status === requestStatusFilter;

      if (activeTab !== 'my') return matchesSearch && matchesStatus;

      const submittedDate = request.created_at.slice(0, 10);
      const absenceStart = request.start_date.slice(0, 10);
      const absenceEnd = (request.end_date || request.start_date).slice(0, 10);
      const matchesDateRange =
        requestDateField === 'submitted'
          ? (!requestDateFrom || submittedDate >= requestDateFrom) &&
            (!requestDateTo || submittedDate <= requestDateTo)
          : (!requestDateFrom || absenceEnd >= requestDateFrom) &&
            (!requestDateTo || absenceStart <= requestDateTo);

      return matchesSearch && matchesStatus && matchesDateRange;
    })
    .sort((firstRequest, secondRequest) => {
      if (activeTab !== 'my') return 0;

      const firstDate = new Date(
        requestDateField === 'submitted' ? firstRequest.created_at : firstRequest.start_date
      ).getTime();
      const secondDate = new Date(
        requestDateField === 'submitted' ? secondRequest.created_at : secondRequest.start_date
      ).getTime();

      return requestSortAsc ? firstDate - secondDate : secondDate - firstDate;
    });
  const requestStatusCounts = baseRequests.reduce(
    (acc, request) => {
      acc[request.status as keyof typeof acc] += 1;
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  );
  const requestTotalPages = Math.max(1, Math.ceil(currentRequests.length / requestPageSize));
  const requestStartIndex = (requestPage - 1) * requestPageSize;
  const requestEndIndex = Math.min(requestStartIndex + requestPageSize, currentRequests.length);
  const paginatedRequests = currentRequests.slice(requestStartIndex, requestEndIndex);
  const requestRangeLabel =
    currentRequests.length > 0
      ? `${requestStartIndex + 1}-${requestEndIndex} z ${currentRequests.length}`
      : '0 z 0';
  const normalizedManagementSearch = managementSearch.trim().toLowerCase();
  const filteredManagementUsers = overviewRows.filter(row => {
    if (!normalizedManagementSearch) return true;

    return [row.firstName, row.lastName, row.email, row.department, row.position]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedManagementSearch);
  });

  const allSearchNorm = allSearch.trim().toLowerCase();
  const filteredAllRequests = allRequests
    .filter(r => {
      // Name filter — strictly by last name
      if (allSearchNorm) {
        const u = (r as any).user;
        if (!(u?.last_name || '').toLowerCase().includes(allSearchNorm)) return false;
      }
      // Date-range overlap: absence [start..end] intersects [from..to]
      const start = r.start_date?.slice(0, 10);
      const end = (r.end_date || r.start_date)?.slice(0, 10);
      if (allDateFrom && end < allDateFrom) return false;
      if (allDateTo && start > allDateTo) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.start_date).getTime();
      const db = new Date(b.start_date).getTime();
      return allSortAsc ? da - db : db - da;
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
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                Moduł HR
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">Nieobecności</h1>
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
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    {card.hint && (
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{card.hint}</p>
                    )}
                    {'subHint' in card && card.subHint && (
                      <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {card.subHint}
                      </p>
                    )}
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
              {canViewAllAbsences && (
                <button
                  onClick={() => setActiveTab('all')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'all'
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Wszystkie nieobecności
                </button>
              )}
              {canViewAllAbsences && (
                <button
                  onClick={() => setActiveTab('report')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'report'
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Raport miesięczny
                </button>
              )}
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
        {(activeTab === 'my' || activeTab === 'pending') && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 p-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {activeTab === 'pending' ? 'Wnioski do obsługi' : 'Historia moich wniosków'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {activeTab === 'pending'
                      ? 'Przeglądaj, filtruj i obsługuj wnioski pracowników.'
                      : 'Sprawdź status swoich wniosków oraz ich szczegóły.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={requestSearch}
                      onChange={e => setRequestSearch(e.target.value)}
                      placeholder={activeTab === 'pending' ? 'Szukaj pracownika lub wniosku...' : 'Szukaj wniosku...'}
                      className="h-10 w-72 max-w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <select
                    value={requestStatusFilter}
                    onChange={e => setRequestStatusFilter(e.target.value as typeof requestStatusFilter)}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="all">Wszystkie statusy</option>
                    <option value="pending">Oczekujące</option>
                    <option value="approved">Zatwierdzone</option>
                    <option value="rejected">Odrzucone</option>
                    <option value="cancelled">Anulowane</option>
                  </select>
                  {activeTab === 'my' && (
                    <>
                      <select
                        value={requestDateField}
                        onChange={event => setRequestDateField(event.target.value as RequestDateField)}
                        aria-label="Wybierz datę filtrowania i sortowania"
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <option value="submitted">Data złożenia</option>
                        <option value="absence">Termin nieobecności</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setRequestSortAsc(current => !current)}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition-colors hover:border-[#F7941D]/40 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        title="Zmień kierunek sortowania"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        {requestSortAsc ? 'Rosnąco' : 'Malejąco'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {activeTab === 'my' && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Data od
                    </label>
                    <input
                      type="date"
                      value={requestDateFrom}
                      onChange={event => setRequestDateFrom(event.target.value)}
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Data do
                    </label>
                    <input
                      type="date"
                      value={requestDateTo}
                      onChange={event => setRequestDateTo(event.target.value)}
                      className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {(requestDateFrom || requestDateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRequestDateFrom('');
                        setRequestDateTo('');
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition-colors hover:border-[#F7941D]/40 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <X className="h-4 w-4" />
                      Wyczyść daty
                    </button>
                  )}
                  <p className="pb-2 text-xs text-gray-500 dark:text-gray-400">
                    Zakres dotyczy: {requestDateField === 'submitted' ? 'daty złożenia wniosku' : 'terminu nieobecności'}.
                  </p>
                </div>
              )}

              {activeTab === 'pending' && baseRequests.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {[
                    ['Oczekujące', requestStatusCounts.pending, 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'],
                    ['Zatwierdzone', requestStatusCounts.approved, 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'],
                    ['Odrzucone', requestStatusCounts.rejected, 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'],
                    ['Anulowane', requestStatusCounts.cancelled, 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'],
                  ].map(([label, count, className]) => (
                    <div key={label} className={`rounded-lg px-3 py-2 ${className}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
                      <p className="mt-1 text-xl font-bold">{count}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                      {baseRequests.length === 0 ? 'Brak wniosków' : 'Brak wyników'}
                    </h3>
                    <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                      {baseRequests.length > 0
                        ? 'Zmień wyszukiwanie lub filtr statusu, aby zobaczyć więcej pozycji.'
                        : activeTab === 'my'
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
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center rounded-lg bg-gray-50 px-3 py-1.5 font-medium text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
                                  {new Date(request.start_date).toLocaleDateString('pl-PL')} –{' '}
                                  {new Date(request.end_date).toLocaleDateString('pl-PL')}
                                </span>
                                <span className="inline-flex items-center rounded-lg border border-[#F7941D]/25 bg-[#F7941D]/10 px-3 py-1.5 text-sm font-bold text-[#C96F00] dark:border-[#F7941D]/30 dark:bg-[#F7941D]/15 dark:text-[#F8B15F]">
                                  {formatLeaveDuration(request)}
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
                                  setCancelId(request.id);
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

        {/* Monthly report tab (admin / kadry) */}
        {activeTab === 'report' && canViewAllAbsences && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-700 print:hidden">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pracownik</label>
                  <select
                    value={reportUserId}
                    onChange={e => setReportUserId(e.target.value)}
                    className="h-10 w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">— wybierz pracownika —</option>
                    {[...directoryUsers]
                      .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'pl'))
                      .map(u => <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Miesiąc</label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={e => setReportMonth(e.target.value)}
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              {reportData && reportUserId && (
                <button
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Drukuj
                </button>
              )}
            </div>

            {!reportUserId ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Wybierz pracownika, aby zobaczyć raport.</div>
            ) : reportLoading ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Ładowanie…</div>
            ) : !reportData ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Brak danych.</div>
            ) : (() => {
              const pad = (n: number) => String(n).padStart(2, '0');
              const empName = directoryUsers.find(u => u.id === reportUserId);
              const monthLabel = new Date(reportData.year, reportData.month - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
              const rows = Array.from({ length: reportData.daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayStr = `${reportData.year}-${pad(reportData.month)}-${pad(day)}`;
                const dow = new Date(reportData.year, reportData.month - 1, day).getDay();
                const leave = (reportData.leaves || []).find((l: any) =>
                  dayStr >= String(l.start_date).slice(0, 10) && dayStr <= String(l.end_date || l.start_date).slice(0, 10));
                const ot = (reportData.workLogs || []).filter((w: any) => String(w.work_date).slice(0, 10) === dayStr && w.work_type === 'overtime')
                  .reduce((s: number, w: any) => s + Number(w.hours), 0);
                const comp = (reportData.workLogs || []).filter((w: any) => String(w.work_date).slice(0, 10) === dayStr && w.work_type === 'overtime_comp')
                  .reduce((s: number, w: any) => s + Number(w.hours), 0);
                return { day, dayStr, dow, leave, ot, comp };
              });
              const DOW = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
              return (
                <div className="overflow-x-auto">
                  <div className="px-4 pt-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {empName ? `${empName.last_name} ${empName.first_name}` : ''} — {monthLabel}
                  </div>
                  <table className="mt-2 min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Dzień</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Nieobecność</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Nadgodziny</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Odbiór</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {rows.map(r => {
                        const weekend = r.dow === 0 || r.dow === 6;
                        return (
                          <tr key={r.day} className={weekend ? 'bg-gray-50/60 dark:bg-gray-900/30' : ''}>
                            <td className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {pad(r.day)} <span className="text-gray-400">{DOW[r.dow]}</span>
                            </td>
                            <td className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                              {r.leave ? (leaveTypeConfig[r.leave.leave_type as LeaveType]?.label || r.leave.leave_type) : ''}
                            </td>
                            <td className="px-4 py-1.5 text-center text-sm text-blue-600 dark:text-blue-400">{r.ot > 0 ? `${r.ot}h` : ''}</td>
                            <td className="px-4 py-1.5 text-center text-sm text-emerald-600 dark:text-emerald-400">{r.comp > 0 ? `${r.comp}h` : ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* All absences tab (admin / kadry) */}
        {activeTab === 'all' && canViewAllAbsences && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Wszystkie nieobecności</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Wnioski wszystkich pracowników. Filtruj po nazwisku i zakresie dat, sortuj po dacie.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={allSearch}
                    onChange={e => setAllSearch(e.target.value)}
                    placeholder="Szukaj po nazwisku..."
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <input
                    type="date"
                    value={allDateFrom}
                    onChange={e => setAllDateFrom(e.target.value)}
                    title="Od dnia"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <span>–</span>
                  <input
                    type="date"
                    value={allDateTo}
                    onChange={e => setAllDateTo(e.target.value)}
                    title="Do dnia"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {(allDateFrom || allDateTo) && (
                    <button
                      onClick={() => { setAllDateFrom(''); setAllDateTo(''); }}
                      className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-[#F7941D]"
                      title="Wyczyść daty"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Pracownik</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Typ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      <button onClick={() => setAllSortAsc(s => !s)} className="inline-flex items-center gap-1 hover:text-[#F7941D]">
                        Termin {allSortAsc ? '↑' : '↓'}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Dni</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Uzasadnienie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {allLoading ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Ładowanie…</td></tr>
                  ) : filteredAllRequests.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">Brak nieobecności.</td></tr>
                  ) : (
                    filteredAllRequests.map(request => {
                      const u = (request as any).user;
                      const typeCfg = leaveTypeConfig[request.leave_type as LeaveType] || leaveTypeConfig.other;
                      const statusCfg = getStatusConfig(request.status);
                      const fmt = (d: string) => new Date(d).toLocaleDateString('pl-PL');
                      return (
                        <tr
                          key={request.id}
                          onClick={() => navigate(`/absences/${request.id}`)}
                          className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {u ? `${u.first_name} ${u.last_name}` : '—'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{u?.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{typeCfg.label}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {fmt(request.start_date)}{request.end_date && request.end_date !== request.start_date ? ` – ${fmt(request.end_date)}` : ''}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{formatLeaveDuration(request)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.classes}`}>{statusCfg.label}</span>
                          </td>
                          <td className="px-4 py-3 max-w-[260px] truncate text-sm text-gray-600 dark:text-gray-400" title={request.reason || ''}>
                            {request.reason || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Łącznie: {filteredAllRequests.length}
            </div>
          </div>
        )}

        {/* Management tab content */}
        {activeTab === 'management' && canManageLeavePlans && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
                    Plany urlopowe
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    Zarządzanie urlopami
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Wszystkie pola edytowalne ręcznie (etat, przeniesione, limit, wykorzystane,
                    praca zdalna) — ułatwia migrację z poprzedniego systemu. „Wykorzystane" to
                    baza startowa; nowe zatwierdzone wnioski dodają się do niej. Wartości w dniach,
                    godziny liczone z etatu (godz./dzień).
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Pracownik</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Dział / stanowisko</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Etat</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Przeniesione</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">W tym roku</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Wykorzystane</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Dostępne</th>
                      <th className="border-l border-gray-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-purple-600 dark:border-gray-700 dark:text-purple-400">Zdalna w roku</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Zdalna wykorz.</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Zdalna dost.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Akcja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {isManagementLoading ? (
                      [...Array(5)].map((_, index) => (
                        <tr key={index}>
                          {[...Array(11)].map((__, i) => (
                            <td key={i} className="px-4 py-4">
                              <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredManagementUsers.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          Brak pracowników pasujących do wyszukiwania.
                        </td>
                      </tr>
                    ) : (
                      filteredManagementUsers.map(row => {
                        const isSaving = savingLeaveDaysUserId === row.id;
                        const hpdRow = row.hoursPerDay || 8;
                        const carried = Number(carriedDrafts[row.id]);
                        const annual = Number(annualDrafts[row.id]);
                        const used = Number(usedDrafts[row.id]);
                        const remote = Number(remoteDrafts[row.id]);
                        const remoteUsedV = Number(remoteUsedDrafts[row.id]);
                        const liveAvailable =
                          [carried, annual, used].every(Number.isFinite)
                            ? Math.max(0, carried + annual - (used + row.usedRequests))
                            : row.available;
                        const liveRemoteAvailable =
                          [remote, remoteUsedV].every(Number.isFinite)
                            ? Math.max(0, remote - (remoteUsedV + row.remoteUsedRequests))
                            : row.remoteAvailable;
                        const hrs = (d: number) => `${Math.round(d * hpdRow)} h`;
                        const inputCls =
                          'h-10 w-16 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

                        return (
                          <tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {row.firstName} {row.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{row.email}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                              <div>{row.department || 'Brak działu'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{row.position || 'Brak stanowiska'}</div>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="text"
                                value={etatDrafts[row.id] ?? ''}
                                onChange={e => handleAllocationDraftChange(row.id, 'etat', e.target.value)}
                                placeholder="np. 1"
                                className="h-10 w-14 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                              <div className="mt-0.5 text-[10px] text-gray-400">{hpdRow}h/dzień</div>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="number" step="any" min={0} max={366}
                                value={carriedDrafts[row.id] ?? ''}
                                onChange={e => handleAllocationDraftChange(row.id, 'carried', e.target.value)}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="number" step="any" min={0} max={366}
                                value={annualDrafts[row.id] ?? ''}
                                onChange={e => handleAllocationDraftChange(row.id, 'annual', e.target.value)}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="number" step="any" min={0} max={366}
                                value={usedDrafts[row.id] ?? ''}
                                onChange={e => handleAllocationDraftChange(row.id, 'used', e.target.value)}
                                className={inputCls}
                              />
                              {row.usedRequests > 0 && (
                                <div className="mt-0.5 text-[10px] text-gray-400">+{fmtD(row.usedRequests)} z wniosków</div>
                              )}
                            </td>
                            <td className="px-3 py-4 text-center">
                              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtD(liveAvailable)}</div>
                              <div className="text-[10px] text-gray-400">{hrs(liveAvailable)}</div>
                            </td>
                            <td className="border-l border-gray-100 px-3 py-4 text-center dark:border-gray-700">
                              <input
                                type="number" step="any" min={0} max={366}
                                value={remoteDrafts[row.id] ?? ''}
                                onChange={e => handleAllocationDraftChange(row.id, 'remote', e.target.value)}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
                              <input
                                type="number" step="any" min={0} max={366}
                                value={remoteUsedDrafts[row.id] ?? ''}
                                onChange={e => handleAllocationDraftChange(row.id, 'remoteUsed', e.target.value)}
                                className={inputCls}
                              />
                            </td>
                            <td className="px-3 py-4 text-center">
                              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{fmtD(liveRemoteAvailable)}</div>
                              <div className="text-[10px] text-gray-400">{hrs(liveRemoteAvailable)}</div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleSaveAllocation(row)}
                                disabled={isSaving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:hover:bg-gray-600"
                              >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                ['remote', 'Praca zdalna', '🏠'],
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
                                    className={`inline-flex h-14 min-w-[90px] flex-col items-center justify-center gap-0.5 rounded-lg border px-2 text-xs font-semibold ${calStatusColor(du.status)}`}
                                    title={du.details}
                                  >
                                    <span>{calStatusIcon(du.status)}</span>
                                    <span>{calStatusText(du.status)}</span>
                                    {(du.status === 'working' || du.status === 'remote') && du.details && du.details !== 'Praca zdalna' && (
                                      <span className="text-[10px] font-normal leading-none opacity-90">{du.details}</span>
                                    )}
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
                {canViewAllAbsences && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Pracownik
                    </label>
                    <select
                      value={formUserId}
                      onChange={e => setFormUserId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">— ja ({user?.first_name} {user?.last_name}) —</option>
                      {[...directoryUsers]
                        .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'pl'))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.last_name} {u.first_name}</option>
                        ))}
                    </select>
                  </div>
                )}
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
                    {(Object.keys(leaveTypeConfig) as LeaveType[])
                      .filter(type => type !== 'occasional_hourly')
                      .map(type => (
                      <option key={type} value={type}>
                        {leaveTypeConfig[type].label}{DEDUCTING_TYPES.includes(type) ? ' (odlicza dni)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {isHourlyForm && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dzień *</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Od *</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Do *</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    <p className="sm:col-span-3 text-xs text-gray-500 dark:text-gray-400">
                      Godziny zostaną odjęte z puli urlopu wypoczynkowego (przeliczone wg etatu).
                    </p>
                  </div>
                )}

                {!isHourlyForm && (<>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Sposób wyboru terminu
                  </label>
                  <div className="grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-600 dark:bg-gray-700/50">
                    <button
                      type="button"
                      onClick={() => setLeaveDateMode('range')}
                      className={`h-9 rounded-md px-3 text-sm font-semibold transition-colors ${
                        leaveDateMode === 'range'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white'
                      }`}
                    >
                      Jeden zakres
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveDateMode('multiple');
                        setOneDayLeave(false);
                      }}
                      className={`h-9 rounded-md px-3 text-sm font-semibold transition-colors ${
                        leaveDateMode === 'multiple'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white'
                      }`}
                    >
                      Pojedyncze dni
                    </button>
                  </div>
                </div>

                {leaveDateMode === 'range' ? (
                  <>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={oneDayLeave}
                        onChange={e => {
                          setOneDayLeave(e.target.checked);
                          if (e.target.checked) setFormData(prev => ({ ...prev, end_date: '' }));
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-[#F7941D] focus:ring-[#F7941D]"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Nieobecność 1-dniowa</span>
                    </label>

                    <div className={`grid grid-cols-1 gap-4 ${oneDayLeave ? '' : 'sm:grid-cols-2'}`}>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {oneDayLeave ? 'Data nieobecności *' : 'Data początkowa *'}
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
                            min={formData.start_date || undefined}
                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            required
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Dodaj dzień nieobecności
                        </label>
                        <input
                          type="date"
                          value={multipleDateDraft}
                          onChange={e => setMultipleDateDraft(e.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addSelectedLeaveDate();
                            }
                          }}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addSelectedLeaveDate}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:border-[#F7941D]/40 hover:text-[#F7941D] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <Plus className="h-4 w-4" />
                        Dodaj dzień
                      </button>
                    </div>

                    {selectedLeaveDates.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Wybrane dni ({selectedLeaveDates.length})
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedLeaveDates([])}
                            className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400"
                          >
                            Wyczyść
                          </button>
                        </div>
                        {selectedLeaveDates.map(date => (
                          <div
                            key={date}
                            className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                              <CalendarDays className="h-4 w-4 text-[#F7941D]" />
                              {formatSelectedLeaveDate(date)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedLeaveDates(currentDates => currentDates.filter(item => item !== date))}
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              aria-label={`Usuń datę ${formatSelectedLeaveDate(date)}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <p className="pt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          Dla każdego dnia zostanie utworzony osobny wniosek z tym samym typem i powodem.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center dark:border-gray-600">
                        <CalendarDays className="mx-auto h-6 w-6 text-gray-300 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Nie dodano jeszcze żadnego dnia.</p>
                      </div>
                    )}
                  </div>
                )}
                </>
                )}

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
                    disabled={isSubmittingLeave}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingLeave ||
                      (leaveDateMode === 'multiple' && selectedLeaveDates.length === 0)
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {isSubmittingLeave && <Loader2 className="h-4 w-4 animate-spin" />}
                    {leaveDateMode === 'multiple'
                      ? `Złóż ${getLeaveRequestCountLabel(selectedLeaveDates.length)}`
                      : 'Złóż wniosek'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={handleAdminCancel}
        title="Anuluj wniosek"
        message="Czy na pewno chcesz anulować ten wniosek urlopowy?"
        confirmText="Anuluj wniosek"
        cancelText="Wróć"
        variant="danger"
        icon="warning"
      />
    </MainLayout>
  );
};

export default Absences;
