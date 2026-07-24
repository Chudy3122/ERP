import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  CalendarDays,
  Clock,
  Badge,
  Loader2,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import * as adminApi from '../api/admin.api';
import * as userApi from '../api/user.api';
import * as departmentApi from '../api/department.api';
import { AdminUser, UpdateUserData } from '../types/admin.types';
import type { Department } from '../types/department.types';
import { getFileUrl } from '../api/axios-config';
import { useAuth } from '../contexts/AuthContext';

const fullTimeOptions = [
  { label: '1/2 etatu', value: 4 },
  { label: '3/4 etatu', value: 6 },
  { label: '7/8 etatu', value: 7 },
  { label: 'Pełny etat', value: 8 },
];

const inputClass =
  'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [employee, setEmployee] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateUserData>({});
  const [departments, setDepartments] = useState<Department[]>([]);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (id) loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, depts] = await Promise.all([
        userApi.getProfileById(id!),
        departmentApi.getAllDepartments().catch(() => [] as Department[]),
      ]);
      setEmployee(data);
      setDepartments(depts);

      const resolvedDeptId = data.department_id || depts.find((department) => department.name === data.department)?.id || '';

      setFormData({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone || '',
        department: data.department || '',
        department_id: resolvedDeptId,
        position: data.position || '',
        role: data.role,
        employee_id: data.employee_id || '',
        hire_date: data.hire_date || '',
        contract_type: data.contract_type || '',
        working_hours_per_day: data.working_hours_per_day || 8,
        annual_leave_days: data.annual_leave_days || 20,
        isActive: data.is_active,
      });
    } catch (err: any) {
      console.error('Failed to load employee:', err);
      setError(err.response?.data?.message || 'Nie udało się załadować danych pracownika');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setIsSaving(true);
      setError(null);
      await adminApi.updateUser(id, formData);
      await loadEmployee();
      setIsEditing(false);
      setSuccess('Dane pracownika zostały zaktualizowane');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zapisać zmian');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (employee) {
      const resolvedDeptId =
        employee.department_id || departments.find((department) => department.name === employee.department)?.id || '';
      setFormData({
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        department: employee.department || '',
        department_id: resolvedDeptId,
        position: employee.position || '',
        role: employee.role,
        employee_id: employee.employee_id || '',
        hire_date: employee.hire_date || '',
        contract_type: employee.contract_type || '',
        working_hours_per_day: employee.working_hours_per_day || 8,
        annual_leave_days: employee.annual_leave_days || 20,
        isActive: employee.is_active,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  const handleToggleActive = async () => {
    if (!id || !employee) return;

    try {
      setIsSaving(true);
      if (employee.is_active) {
        await adminApi.deactivateUser(id);
      } else {
        await adminApi.activateUser(id);
      }
      await loadEmployee();
      setSuccess(`Konto zostało ${employee.is_active ? 'dezaktywowane' : 'aktywowane'}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zmienić statusu konta');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrator',
      kierownik: 'Kierownik',
      employee: 'Pracownik',
      szef: 'Szef',
      ksiegowosc: 'Księgowość',
      kadry: 'Kadry',
      sekretariat: 'Sekretariat',
      prawnik: 'Prawnik',
    };
    return labels[role] || role;
  };

  const getRoleClass = (role: string) => {
    const classes: Record<string, string> = {
      admin: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
      kierownik: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/40',
      szef: 'bg-[#F7941D]/10 text-[#d87f16] border-[#F7941D]/20 dark:text-orange-300 dark:bg-[#F7941D]/15',
      ksiegowosc: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/40',
      kadry: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-900/40',
      sekretariat: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/40',
      employee: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
    };
    return classes[role] || classes.employee;
  };

  const getContractLabel = (type: string | null) => {
    if (!type) return '-';
    const labels: Record<string, string> = {
      full_time: 'Pełny etat',
      part_time: 'Część etatu',
      contract: 'Umowa zlecenie',
      intern: 'Staż',
    };
    return labels[type] || type;
  };

  const getRoleDescription = (role: string) =>
    ({
      admin: 'Pełny dostęp do wszystkich funkcji systemu',
      kierownik: 'Zarządzanie działem, urlopy i nieobecności swoich pracowników',
      szef: 'Szef firmy - podgląd całości, edycja kalendarza',
      ksiegowosc: 'Księgowość — finanse (faktury, płatności, umowy) + aktywność',
      kadry: 'Kadry — pełny dostęp HR: czas pracy, urlopy, nadgodziny, profile',
      sekretariat: 'Podstawowy dostęp oraz edycja kalendarza szefa',
      prawnik: 'Zewnętrzny prawnik — dostęp do wybranych modułów',
      employee: 'Podstawowy dostęp do funkcji pracowniczych',
    })[role] ?? 'Podstawowy dostęp do funkcji pracowniczych';

  const formatDate = (date?: string | null, withTime = false) => {
    if (!date) return null;
    return new Date(date).toLocaleString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  };

  const renderValue = (value?: string | number | null, fallback = 'Nie podano') => (
    <p className="text-sm font-medium text-gray-950 dark:text-white">{value || <span className="text-gray-400">{fallback}</span>}</p>
  );

  if (isLoading) {
    return (
      <MainLayout title="Ładowanie...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#F7941D]" />
        </div>
      </MainLayout>
    );
  }

  if (error && !employee) {
    return (
      <MainLayout title="Błąd">
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          <p className="mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e08317]"
          >
            Wróć do listy pracowników
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!employee) return null;

  const initials = getInitials(employee.first_name, employee.last_name);
  const workingHours = employee.working_hours_per_day || 8;
  const leaveDays = employee.annual_leave_days || 20;

  return (
    <MainLayout title="Szczegóły pracownika">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Wróć do listy
            </button>

            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                  >
                    Edytuj dane
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <X className="h-4 w-4" />
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Zapisz
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-[#F7941D]/10 text-[#F7941D] shadow-sm dark:border-gray-800 dark:bg-[#F7941D]/15">
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{initials}</span>
                {employee.avatar_url && (
                  <img
                    src={getFileUrl(employee.avatar_url) || ''}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Profil pracownika</p>
                <h1 className="mt-1 truncate text-2xl font-semibold text-gray-950 dark:text-white">
                  {employee.first_name} {employee.last_name}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{employee.position || 'Brak stanowiska'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClass(employee.role)}`}>
                    {getRoleLabel(employee.role)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      employee.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                  >
                    {employee.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                  {employee.department && (
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {employee.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <SummaryTile label="Plan dnia" value={`${workingHours} h`} icon={<Clock className="h-4 w-4" />} />
              <SummaryTile label="Urlop roczny" value={`${leaveDays} dni`} icon={<CalendarDays className="h-4 w-4" />} />
              <SummaryTile label="ID pracownika" value={employee.employee_id || '-'} icon={<Badge className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DetailCard title="Dane osobowe" icon={<User className="h-5 w-5" />}>
            <Field label="Imię">
              {isEditing ? (
                <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} className={inputClass} />
              ) : (
                renderValue(employee.first_name)
              )}
            </Field>
            <Field label="Nazwisko">
              {isEditing ? (
                <input type="text" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} className={inputClass} />
              ) : (
                renderValue(employee.last_name)
              )}
            </Field>
            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              {isEditing ? (
                <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className={inputClass} />
              ) : (
                renderValue(employee.email)
              )}
            </Field>
            <Field label="Telefon" icon={<Phone className="h-4 w-4" />}>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  placeholder="np. +48 123 456 789"
                  className={inputClass}
                />
              ) : (
                renderValue(employee.phone)
              )}
            </Field>
          </DetailCard>

          <DetailCard title="Informacje służbowe" icon={<Briefcase className="h-5 w-5" />}>
            <Field label="Stanowisko">
              {isEditing ? (
                <input
                  type="text"
                  name="position"
                  value={formData.position || ''}
                  onChange={handleInputChange}
                  placeholder="np. Programista, Manager"
                  className={inputClass}
                />
              ) : (
                renderValue(employee.position)
              )}
            </Field>
            <Field label="Dział" icon={<Building className="h-4 w-4" />}>
              {isEditing ? (
                <select name="department_id" value={formData.department_id || ''} onChange={handleInputChange} className={inputClass}>
                  <option value="">Brak działu</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              ) : (
                renderValue(employee.department)
              )}
            </Field>
            <Field label="ID pracownika">
              {isEditing ? (
                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id || ''}
                  onChange={handleInputChange}
                  placeholder="np. EMP-001"
                  className={inputClass}
                />
              ) : (
                renderValue(employee.employee_id, 'Nie przypisano')
              )}
            </Field>
            <Field label="Data zatrudnienia" icon={<Calendar className="h-4 w-4" />}>
              {isEditing ? (
                <input type="date" name="hire_date" value={formData.hire_date || ''} onChange={handleInputChange} className={inputClass} />
              ) : (
                renderValue(formatDate(employee.hire_date))
              )}
            </Field>
            <Field label="Rodzaj umowy">
              {isEditing ? (
                <select name="contract_type" value={formData.contract_type || ''} onChange={handleInputChange} className={inputClass}>
                  <option value="">Wybierz rodzaj</option>
                  <option value="full_time">Pełny etat</option>
                  <option value="part_time">Część etatu</option>
                  <option value="contract">Umowa zlecenie</option>
                  <option value="intern">Staż</option>
                </select>
              ) : (
                renderValue(getContractLabel(employee.contract_type))
              )}
            </Field>
          </DetailCard>

          <DetailCard title="Uprawnienia" icon={<Shield className="h-5 w-5" />}>
            <Field label="Rola w systemie">
              {isEditing ? (
                <select name="role" value={formData.role || ''} onChange={handleInputChange} className={inputClass}>
                  <option value="employee">Pracownik</option>
                  <option value="kierownik">Kierownik</option>
                  <option value="szef">Szef</option>
                  <option value="kadry">Kadry</option>
                  <option value="ksiegowosc">Księgowość</option>
                  <option value="sekretariat">Sekretariat</option>
                  <option value="prawnik">Prawnik</option>
                  <option value="admin">Administrator</option>
                </select>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-950 dark:text-white">{getRoleLabel(employee.role)}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getRoleDescription(employee.role)}</p>
                </>
              )}
            </Field>

            <Field label="Status konta">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                    employee.is_active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  {employee.is_active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  {employee.is_active ? 'Aktywne' : 'Nieaktywne'}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleToggleActive}
                    disabled={isSaving}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      employee.is_active
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                    }`}
                  >
                    {employee.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                  </button>
                )}
              </div>
            </Field>

            <Field label="Ostatnie logowanie">{renderValue(formatDate(employee.last_login, true), 'Nigdy')}</Field>
          </DetailCard>

          <DetailCard title="Ustawienia pracy" icon={<Clock className="h-5 w-5" />}>
            <Field label="Godziny pracy dziennie" icon={<Clock className="h-4 w-4" />}>
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="number"
                    name="working_hours_per_day"
                    value={formData.working_hours_per_day || 8}
                    onChange={handleInputChange}
                    min="0.5"
                    max="24"
                    step="0.5"
                    className={inputClass}
                  />
                  <div className="flex flex-wrap gap-2">
                    {fullTimeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            working_hours_per_day: option.value,
                          }))
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          formData.working_hours_per_day === option.value
                            ? 'bg-[#F7941D] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Używane do planu dnia na dashboardzie oraz automatycznego zatrzymania czasu pracy.
                  </p>
                </div>
              ) : (
                renderValue(`${workingHours} godzin`)
              )}
            </Field>

            <Field label="Roczny wymiar urlopu" icon={<CalendarDays className="h-4 w-4" />}>
              {isEditing ? (
                <input
                  type="number"
                  name="annual_leave_days"
                  value={formData.annual_leave_days || 20}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className={inputClass}
                />
              ) : (
                renderValue(`${leaveDays} dni`)
              )}
            </Field>

            <Field label="Konto utworzone">{renderValue(formatDate(employee.created_at))}</Field>
          </DetailCard>
        </div>
      </div>
    </MainLayout>
  );
};

interface SummaryTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const SummaryTile = ({ label, value, icon }: SummaryTileProps) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
    <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
      {icon}
    </div>
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 truncate text-lg font-semibold text-gray-950 dark:text-white">{value}</p>
  </div>
);

interface DetailCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const DetailCard = ({ title, icon, children }: DetailCardProps) => (
  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-gray-950 dark:text-white">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Field = ({ label, icon, children }: FieldProps) => (
  <div>
    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

export default EmployeeDetail;
