import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Camera, User, Mail, Phone, Building, Briefcase, Save, X, Loader2 } from 'lucide-react';
import * as userApi from '../api/user.api';
import { getFileUrl } from '../api/axios-config';

const Profile: React.FC = () => {
  const { user, refreshToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    position: user?.position || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await userApi.updateProfile(formData);
      await refreshToken();

      setSuccess('Profil został zaktualizowany');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zapisać zmian');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      department: user?.department || '',
      position: user?.position || '',
    });
    setIsEditing(false);
    setError(null);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Proszę wybrać plik obrazu');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Zdjęcie nie może być większe niż 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setError(null);

      await userApi.uploadAvatar(file);
      await refreshToken();

      setSuccess('Zdjęcie profilowe zostało zaktualizowane');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się przesłać zdjęcia');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getInitials = () => {
    if (!user) return '??';
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  };

  const getRoleName = () => {
    switch (user?.role) {
      case 'admin':
        return 'Administrator';
      case 'team_leader':
        return 'Team Leader';
      default:
        return 'Pracownik';
    }
  };

  return (
    <MainLayout title="Mój profil">
      <div className="max-w-4xl mx-auto">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
          {/* Cover / Header */}
          <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700"></div>

          {/* Avatar & Basic Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div
                  onClick={handlePhotoClick}
                  className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden cursor-pointer group shadow-lg"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : user?.avatar_url ? (
                    <img
                      src={getFileUrl(user.avatar_url) || ''}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-gray-500">{getInitials()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              {/* Name & Role */}
              <div className="flex-1 sm:pb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-gray-600">{user?.position || 'Brak stanowiska'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getRoleName()}
                  </span>
                  {user?.department && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {user.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <div className="sm:pb-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Edytuj profil
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Anuluj
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
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
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Dane osobowe
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imię</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user?.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwisko</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user?.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <p className="text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email nie może być zmieniony</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefon
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="np. +48 123 456 789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user?.phone || <span className="text-gray-400">Nie podano</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
              Informacje służbowe
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stanowisko</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="np. Programista, Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user?.position || <span className="text-gray-400">Nie podano</span>}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Dział
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="np. IT, HR, Marketing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{user?.department || <span className="text-gray-400">Nie podano</span>}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rola w systemie</label>
                <p className="text-gray-900">{getRoleName()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rola może być zmieniona tylko przez administratora</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID pracownika</label>
                <p className="text-gray-900">{user?.employee_id || <span className="text-gray-400">Nie przypisano</span>}</p>
              </div>

              {user?.hire_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data zatrudnienia</label>
                  <p className="text-gray-900">
                    {new Date(user.hire_date).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statystyki konta</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.annual_leave_days || 20}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dni urlopu</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.working_hours_per_day || 8}h</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Godzin dziennie</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' }) : '-'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">W systemie od</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-green-600">Aktywne</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status konta</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
