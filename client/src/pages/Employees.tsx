import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Users, Search, Mail, Phone, Building, Calendar } from 'lucide-react';
import * as adminApi from '../api/admin.api';
import * as statusApi from '../api/status.api';
import { StatusType, STATUS_COLORS, STATUS_TRANSLATION_KEYS } from '../types/status.types';
import { useChatContext } from '../contexts/ChatContext';

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
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [userStatuses, setUserStatuses] = useState<Map<string, StatusType>>(new Map());
  const navigate = useNavigate();
  const { t } = useTranslation('employees');
  const { t: tCommon } = useTranslation('common');
  const { getUserStatus } = useChatContext();

  useEffect(() => {
    loadEmployees();
  }, [departmentFilter]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getAllUsers(1, 1000);
      const empList = response.users.map(user => ({
        ...user,
      }));
      setEmployees(empList);

      // Fetch statuses for all employees
      const userIds = empList.map(e => e.id);
      try {
        const statuses = await statusApi.getBatchStatuses(userIds);
        const statusMap = new Map<string, StatusType>();
        statuses.forEach(s => {
          statusMap.set(s.user_id, s.status as StatusType);
        });
        setUserStatuses(statusMap);
      } catch {
        // Status fetch failed, will show offline for all
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get real-time status: prefer ChatContext (live), fall back to fetched status
  const getEmployeeStatus = (employeeId: string): StatusType => {
    const liveStatus = getUserStatus(employeeId);
    if (liveStatus) return liveStatus.status as StatusType;
    return userStatuses.get(employeeId) || StatusType.OFFLINE;
  };

  // Listen for status changes from StatusSelector custom event
  useEffect(() => {
    const handler = () => {
      // Re-fetch statuses when any status changes
      const userIds = employees.map(e => e.id);
      if (userIds.length > 0) {
        statusApi.getBatchStatuses(userIds).then(statuses => {
          const statusMap = new Map<string, StatusType>();
          statuses.forEach(s => {
            statusMap.set(s.user_id, s.status as StatusType);
          });
          setUserStatuses(statusMap);
        }).catch(() => {});
      }
    };
    window.addEventListener('status-changed', handler);
    return () => window.removeEventListener('status-changed', handler);
  }, [employees]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = !departmentFilter || emp.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const getRoleLabel = (role: string, translateFn: typeof t) => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      team_leader: 'Team Leader',
      employee: translateFn('roleEmployee'),
      ksiegowosc: 'Księgowość',
      szef: 'Szef',
      recepcja: 'Recepcja',
    };
    return labels[role] || role;
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

  return (
    <MainLayout title={t('title')}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('allDepartments')}</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finanse</option>
              <option value="Sales">Sprzedaż</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('noEmployees')}</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || departmentFilter
              ? t('noMatch')
              : t('noEmployeesDescription')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('position')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('department')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('hireDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Rola
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((employee) => {
                  const status = getEmployeeStatus(employee.id);
                  return (
                    <tr
                      key={employee.id}
                      onClick={() => navigate(`/employees/${employee.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium text-sm">
                              {getInitials(employee.first_name, employee.last_name)}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${getStatusDotColor(status)}`} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{employee.position || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Building className="w-4 h-4 mr-1 text-gray-400" />
                          {employee.department || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white space-y-1">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1 text-gray-400" />
                            <span className="truncate max-w-[200px]">{employee.email}</span>
                          </div>
                          {employee.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1 text-gray-400" />
                              {employee.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {employee.hire_date
                            ? new Date(employee.hire_date).toLocaleDateString('pl-PL')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          employee.role === 'admin'
                            ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                            : employee.role === 'team_leader'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {getRoleLabel(employee.role, t)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor(status)}`} />
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
        </div>
      )}
    </MainLayout>
  );
};

export default Employees;
