import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  Users,
  Search,
  Mail,
  Phone,
  Building,
  Calendar,
  Briefcase,
  UserCheck,
  UserX,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import * as employeeApi from '../api/employee.api';
import * as statusApi from '../api/status.api';
import { StatusType, STATUS_COLORS, STATUS_TRANSLATION_KEYS } from '../types/status.types';
import { useChatContext } from '../contexts/ChatContext';
import { getFileUrl } from '../api/axios-config';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  employee_id?: string | null;
  hire_date?: string | null;
  role: string;
  is_active: boolean;
  avatar_url?: string | null;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 30 | 50>(10);
  const [userStatuses, setUserStatuses] = useState<Map<string, StatusType>>(new Map());
  const navigate = useNavigate();
  const { t } = useTranslation('employees');
  const { t: tCommon } = useTranslation('common');
  const { getUserStatus } = useChatContext();

  useEffect(() => {
    loadEmployees();
  }, [departmentFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, departmentFilter, pageSize]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await employeeApi.getAllEmployees();
      const empList = response.employees.map(user => ({ ...user }));
      setEmployees(empList);

      const userIds = empList.map(employee => employee.id);
      try {
        const statuses = await statusApi.getBatchStatuses(userIds);
        const statusMap = new Map<string, StatusType>();
        statuses.forEach(status => {
          statusMap.set(status.user_id, status.status as StatusType);
        });
        setUserStatuses(statusMap);
      } catch {
        // Status fetch failed, will show offline fallback.
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeStatus = (employeeId: string): StatusType => {
    const liveStatus = getUserStatus(employeeId);
    if (liveStatus) return liveStatus.status as StatusType;
    return userStatuses.get(employeeId) || StatusType.OFFLINE;
  };

  useEffect(() => {
    const handler = () => {
      const userIds = employees.map(employee => employee.id);
      if (userIds.length > 0) {
        statusApi
          .getBatchStatuses(userIds)
          .then(statuses => {
            const statusMap = new Map<string, StatusType>();
            statuses.forEach(status => {
              statusMap.set(status.user_id, status.status as StatusType);
            });
            setUserStatuses(statusMap);
          })
          .catch(() => {});
      }
    };

    window.addEventListener('status-changed', handler);
    return () => window.removeEventListener('status-changed', handler);
  }, [employees]);

  const departments = [...new Set(employees.map(employee => employee.department).filter(Boolean))].sort(
    (firstDepartment, secondDepartment) =>
      String(firstDepartment).localeCompare(String(secondDepartment), 'pl', { sensitivity: 'base' })
  );

  const activeEmployeesCount = employees.filter(employee => employee.is_active).length;
  const inactiveEmployeesCount = employees.length - activeEmployeesCount;
  const onlineEmployeesCount = employees.filter(
    employee => getEmployeeStatus(employee.id) !== StatusType.OFFLINE
  ).length;

  const filteredEmployees = employees
    .filter(employee => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        employee.first_name.toLowerCase().includes(query) ||
        employee.last_name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.position?.toLowerCase().includes(query) ||
        employee.employee_id?.toLowerCase().includes(query);

      const matchesDepartment = !departmentFilter || employee.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    })
    .sort((firstEmployee, secondEmployee) =>
      `${firstEmployee.first_name} ${firstEmployee.last_name}`.localeCompare(
        `${secondEmployee.first_name} ${secondEmployee.last_name}`,
        'pl',
        { sensitivity: 'base' }
      )
    );

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredEmployees.length);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
  const rangeLabel =
    filteredEmployees.length > 0
      ? `${startIndex + 1}-${endIndex} z ${filteredEmployees.length}`
      : '0 z 0';

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      kierownik: 'Kierownik',
      employee: 'Pracownik',
      ksiegowosc: 'Księgowość',
      szef: 'Szef',
      sekretariat: 'Sekretariat',
    };
    return labels[role] || role;
  };

  const getRoleClass = (role: string) => {
    const classes: Record<string, string> = {
      admin:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600',
      kierownik:
        'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40',
      szef: 'bg-[#F7941D]/10 text-[#d87f16] border-[#F7941D]/20 dark:text-[#F7941D]',
      ksiegowosc:
        'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/40',
      sekretariat:
        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/40',
      employee:
        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
    };

    return classes[role] || classes.employee;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getStatusLabel = (status: StatusType): string => {
    const key = STATUS_TRANSLATION_KEYS[status];
    if (key) {
      const [, k] = key.split('.');
      return tCommon(k);
    }
    return status;
  };

  const getStatusDotColor = (status: StatusType): string => {
    return STATUS_COLORS[status] || 'bg-gray-400';
  };

  const resetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('');
  };

  return (
    <MainLayout title={t('title')}>
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">
              Zespół
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-950 dark:text-white">{t('title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {t('subtitle')}
            </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            {
              label: 'Wszyscy pracownicy',
              value: employees.length,
              icon: <Users className="h-5 w-5 text-[#F7941D]" />,
              iconBg: 'bg-[#F7941D]/10',
              valueColor: 'text-[#F7941D]',
            },
            {
              label: 'Aktywne konta',
              value: activeEmployeesCount,
              icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
              iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
              valueColor: 'text-emerald-600',
            },
            {
              label: 'Nieaktywne konta',
              value: inactiveEmployeesCount,
              icon: <UserX className="h-5 w-5 text-gray-500" />,
              iconBg: 'bg-gray-100 dark:bg-gray-700',
              valueColor: 'text-gray-700 dark:text-gray-200',
            },
            {
              label: 'Dostępni teraz',
              value: onlineEmployeesCount,
              icon: <Briefcase className="h-5 w-5 text-blue-600" />,
              iconBg: 'bg-blue-50 dark:bg-blue-900/30',
              valueColor: 'text-blue-600',
            },
          ].map(card => (
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
                  <p className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 p-4 dark:border-gray-700">
            <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto] lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                    aria-label="Wyczyść wyszukiwanie"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={departmentFilter}
                onChange={event => setDepartmentFilter(event.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('allDepartments')}</option>
                {departments.map(department => (
                  <option key={department} value={department || ''}>
                    {department}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!searchQuery && !departmentFilter}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Filter className="h-4 w-4" />
                Wyczyść
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/40"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-600" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-600" />
                      <div className="h-3 w-64 rounded bg-gray-200 dark:bg-gray-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {t('noEmployees')}
            </h3>
            <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || departmentFilter ? t('noMatch') : t('noEmployeesDescription')}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      {t('name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      {t('position')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      {t('department')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      Kontakt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      {t('hireDate')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      Rola
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                      {t('status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {paginatedEmployees.map(employee => {
                    const status = getEmployeeStatus(employee.id);
                    return (
                      <tr
                        key={employee.id}
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 flex-shrink-0">
                              <div className="relative h-11 w-11 overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
                                <span className="absolute inset-0 flex items-center justify-center">
                                  {getInitials(employee.first_name, employee.last_name)}
                                </span>
                                {employee.avatar_url && (
                                  <img
                                    src={getFileUrl(employee.avatar_url) || ''}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                    onError={event => {
                                      event.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <span
                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${getStatusDotColor(status)}`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {employee.first_name} {employee.last_name}
                              </div>
                              {employee.employee_id && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {employee.employee_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                          {employee.position || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                            <Building className="h-3.5 w-3.5 text-gray-400" />
                            {employee.department || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="max-w-[220px] truncate">{employee.email}</span>
                            </div>
                            {employee.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                {employee.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {employee.hire_date
                              ? new Date(employee.hire_date).toLocaleDateString('pl-PL')
                              : '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getRoleClass(employee.role)}`}
                          >
                            {getRoleLabel(employee.role)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${getStatusDotColor(status)}`}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {getStatusLabel(status)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wyświetlane:{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {rangeLabel}
                  </span>
                </p>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>Na stronie</span>
                  <select
                    value={pageSize}
                    onChange={event => setPageSize(Number(event.target.value) as 10 | 30 | 50)}
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
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Poprzednia
                </button>
                <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Następna
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Employees;
