import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Shield,
  Save,
  X,
  Loader2,
  Clock,
  CalendarDays,
} from 'lucide-react';
import * as adminApi from '../api/admin.api';
import { AdminUser, UpdateUserData } from '../types/admin.types';
import { getFileUrl } from '../api/axios-config';
import { useAuth } from '../contexts/AuthContext';

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

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (id) {
      loadEmployee();
    }
  }, [id]);

  const loadEmployee = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminApi.getUserById(id!);
      setEmployee(data);
      setFormData({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone || '',
        department: data.department || '',
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
    setFormData(prev => ({
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
      setFormData({
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        department: employee.department || '',
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
      team_leader: 'Team Leader',
      employee: 'Pracownik',
    };
    return labels[role] || role;
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

  if (isLoading) {
    return (
      <MainLayout title="Ładowanie...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  if (error && !employee) {
    return (
      <MainLayout title="Błąd">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => navigate('/employees')}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
          >
            Wróć do listy pracowników
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!employee) return null;

  return (
    <MainLayout title="Szczegóły pracownika">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć do listy
        </button>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="h-20 bg-gradient-to-r from-gray-700 to-gray-800"></div>
          <div className="px-6 pb-6 pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 -mt-14 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                {employee.avatar_url ? (
                  <img
                    src={getFileUrl(employee.avatar_url) || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-gray-500">
                    {getInitials(employee.first_name, employee.last_name)}
                  </span>
                )}
              </div>

              {/* Name & Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900">
                  {employee.first_name} {employee.last_name}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">{employee.position || 'Brak stanowiska'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    employee.role === 'admin'
                      ? 'bg-gray-800 text-white'
                      : employee.role === 'team_leader'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getRoleLabel(employee.role)}
                  </span>
                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    employee.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {employee.is_active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                  {employee.department && (
                    <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                      {employee.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              {isAdmin && (
                <div className="flex-shrink-0">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      Edytuj dane
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Anuluj
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Zapisz
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Dane osobowe
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefon
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    placeholder="np. +48 123 456 789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.phone || <span className="text-gray-400">Nie podano</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
              Informacje służbowe
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stanowisko</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="position"
                    value={formData.position || ''}
                    onChange={handleInputChange}
                    placeholder="np. Programista, Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.position || <span className="text-gray-400">Nie podano</span>}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Dział
                </label>
                {isEditing ? (
                  <select
                    name="department"
                    value={formData.department || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">Wybierz dział</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finanse</option>
                    <option value="Sales">Sprzedaż</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operacje</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{employee.department || <span className="text-gray-400">Nie podano</span>}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID pracownika</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id || ''}
                    onChange={handleInputChange}
                    placeholder="np. EMP-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.employee_id || <span className="text-gray-400">Nie przypisano</span>}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data zatrudnienia
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">
                    {employee.hire_date
                      ? new Date(employee.hire_date).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : <span className="text-gray-400">Nie podano</span>}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rodzaj umowy</label>
                {isEditing ? (
                  <select
                    name="contract_type"
                    value={formData.contract_type || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">Wybierz rodzaj</option>
                    <option value="full_time">Pełny etat</option>
                    <option value="part_time">Część etatu</option>
                    <option value="contract">Umowa zlecenie</option>
                    <option value="intern">Staż</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{getContractLabel(employee.contract_type)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Permissions & Role */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              Uprawnienia
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rola w systemie</label>
                {isEditing ? (
                  <select
                    name="role"
                    value={formData.role || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="employee">Pracownik</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="admin">Administrator</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{getRoleLabel(employee.role)}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {employee.role === 'admin'
                    ? 'Pełny dostęp do wszystkich funkcji systemu'
                    : employee.role === 'team_leader'
                    ? 'Zarządzanie zespołem i zatwierdzanie wniosków'
                    : 'Podstawowy dostęp do funkcji pracowniczych'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status konta</label>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${
                    employee.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.is_active ? 'Aktywne' : 'Nieaktywne'}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={handleToggleActive}
                      disabled={isSaving}
                      className={`px-3 py-1 text-sm rounded ${
                        employee.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {employee.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ostatnie logowanie</label>
                <p className="text-gray-900">
                  {employee.last_login
                    ? new Date(employee.last_login).toLocaleString('pl-PL')
                    : <span className="text-gray-400">Nigdy</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Work Settings */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Ustawienia pracy
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Godziny pracy dziennie
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="working_hours_per_day"
                    value={formData.working_hours_per_day || 8}
                    onChange={handleInputChange}
                    min="1"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.working_hours_per_day || 8} godzin</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Roczny wymiar urlopu
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="annual_leave_days"
                    value={formData.annual_leave_days || 20}
                    onChange={handleInputChange}
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                ) : (
                  <p className="text-gray-900">{employee.annual_leave_days || 20} dni</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konto utworzone</label>
                <p className="text-gray-900">
                  {new Date(employee.created_at).toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeDetail;
