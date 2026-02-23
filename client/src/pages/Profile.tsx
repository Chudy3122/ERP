import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Camera, User, Mail, Phone, Building, Briefcase, Save, X, Loader2, Hash, ImagePlus } from 'lucide-react';
import * as userApi from '../api/user.api';
import { getFileUrl } from '../api/axios-config';

const Profile: React.FC = () => {
  const { user, refreshToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

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

  const handlePhotoClick = () => fileInputRef.current?.click();
  const handleCoverClick = () => coverInputRef.current?.click();

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Proszę wybrać plik obrazu'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Zdjęcie tła nie może być większe niż 10MB'); return; }
    try {
      setIsUploadingCover(true);
      setError(null);
      await userApi.uploadCover(file);
      await refreshToken();
      setSuccess('Zdjęcie tła zostało zaktualizowane');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się przesłać zdjęcia tła');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Proszę wybrać plik obrazu'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Zdjęcie nie może być większe niż 5MB'); return; }
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
      case 'admin': return 'Administrator';
      case 'team_leader': return 'Team Leader';
      default: return 'Pracownik';
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm';

  const FieldValue = ({ value, fallback = 'Nie podano' }: { value?: string | null; fallback?: string }) => (
    value
      ? <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      : <p className="text-sm text-gray-400 dark:text-gray-500 italic">{fallback}</p>
  );

  return (
    <MainLayout title="Mój profil">
      <div className="max-w-4xl mx-auto">

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          {/* Cover */}
          <div
            className="relative h-36 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-700 dark:to-gray-950 group cursor-pointer overflow-hidden"
            onClick={handleCoverClick}
          >
            {user?.cover_url && (
              <img
                src={getFileUrl(user.cover_url) || ''}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploadingCover
                ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                : <div className="flex items-center gap-2 text-white text-sm font-medium bg-black/50 px-4 py-2 rounded-full">
                    <ImagePlus className="w-4 h-4" />
                    Zmień zdjęcie tła
                  </div>
              }
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
          </div>

          {/* Avatar & Basic Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  onClick={handlePhotoClick}
                  className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden cursor-pointer group shadow-lg"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  ) : user?.avatar_url ? (
                    <img src={getFileUrl(user.avatar_url) || ''} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-500 dark:text-gray-300">{getInitials()}</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>

              {/* Name & Role */}
              <div className="flex-1 sm:pb-2 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {user?.first_name} {user?.last_name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {user?.position || 'Brak stanowiska'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {getRoleName()}
                  </span>
                  {user?.department && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                      {user.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <div className="sm:pb-2 flex-shrink-0">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Edytuj profil
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Anuluj
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wider">
              <User className="w-4 h-4 text-gray-400" />
              Dane osobowe
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Imię</label>
                {isEditing ? (
                  <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className={inputClass} />
                ) : (
                  <FieldValue value={user?.first_name} fallback="Nie podano" />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Nazwisko</label>
                {isEditing ? (
                  <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className={inputClass} />
                ) : (
                  <FieldValue value={user?.last_name} fallback="Nie podano" />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Email nie może być zmieniony</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefon
                </label>
                {isEditing ? (
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+48 123 456 789" className={inputClass} />
                ) : (
                  <FieldValue value={user?.phone} />
                )}
              </div>
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wider">
              <Briefcase className="w-4 h-4 text-gray-400" />
              Informacje służbowe
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Stanowisko</label>
                {isEditing ? (
                  <input type="text" name="position" value={formData.position} onChange={handleInputChange} placeholder="np. Programista, Manager" className={inputClass} />
                ) : (
                  <FieldValue value={user?.position} />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Dział
                </label>
                {isEditing ? (
                  <input type="text" name="department" value={formData.department} onChange={handleInputChange} placeholder="np. IT, HR, Marketing" className={inputClass} />
                ) : (
                  <FieldValue value={user?.department} />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Rola w systemie</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{getRoleName()}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Rola może być zmieniona tylko przez administratora</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> ID pracownika
                </label>
                <FieldValue value={user?.employee_id} fallback="Nie przypisano" />
              </div>

              {user?.hire_date && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Data zatrudnienia</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(user.hire_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Statystyki konta</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.annual_leave_days || 20}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dni urlopu</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{user?.working_hours_per_day || 8}.00h</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Godzin dziennie</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' }) : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">W systemie od</p>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Aktywne</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Status konta</p>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Profile;
