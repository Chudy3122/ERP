import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, X, Loader2 } from 'lucide-react';
import type { Department, CreateDepartmentData, UpdateDepartmentData } from '../../types/department.types';
import * as adminApi from '../../api/admin.api';
import type { AdminUser } from '../../types/admin.types';

interface DepartmentFormProps {
  department: Department | null;
  departments: Department[];
  onSubmit: (data: CreateDepartmentData | UpdateDepartmentData) => Promise<void>;
  onClose: () => void;
}

const COLORS = [
  '#F7941D', // brand orange
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#6366F1', // indigo
  '#84CC16', // lime
];

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  department,
  departments,
  onSubmit,
  onClose,
}) => {
  const { t } = useTranslation();
  const isEditing = !!department;

  const [formData, setFormData] = useState({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    parent_id: department?.parent_id || '',
    head_id: department?.head_id || '',
    color: department?.color || COLORS[0],
  });

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const userList = await adminApi.getUsers();
      setUsers(userList.filter(u => u.is_active));
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id || undefined,
        head_id: formData.head_id || undefined,
        color: formData.color,
      };

      await onSubmit(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out current department and its descendants from parent options
  const getAvailableParents = () => {
    if (!department) return departments;

    const descendantIds = new Set<string>();
    const findDescendants = (parentId: string) => {
      departments.forEach(d => {
        if (d.parent_id === parentId) {
          descendantIds.add(d.id);
          findDescendants(d.id);
        }
      });
    };
    descendantIds.add(department.id);
    findDescendants(department.id);

    return departments.filter(d => !descendantIds.has(d.id));
  };

  const availableParents = getAvailableParents();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F7941D]">
                Struktura organizacyjna
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-950 dark:text-white">
                {isEditing ? t('organization.editDepartment') : t('organization.newDepartment')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-150px)] space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('organization.departmentName')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="np. Dział IT"
            />
          </div>

          {/* Code */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('organization.departmentCode')} *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              maxLength={20}
              disabled={isEditing}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/25 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:dark:bg-gray-800"
              placeholder={t('organization.codePlaceholder')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('organization.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder={t('organization.descriptionPlaceholder')}
            />
          </div>

          {/* Parent Department */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('organization.parentDepartment')}
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('organization.noParent')}</option>
              {availableParents.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Department Head */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('organization.departmentHead')}
            </label>
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                {t('organization.loading')}
              </div>
            ) : (
              <select
                value={formData.head_id}
                onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{t('organization.selectHead')}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('organization.color')}
            </label>
            <div className="flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-8 w-8 rounded-lg transition-transform ${
                    formData.color === color ? 'scale-110 ring-2 ring-[#F7941D] ring-offset-2 dark:ring-offset-gray-800' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Kolor ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('organization.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.code}
              className="flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:bg-[#F7941D]/50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? t('organization.save') : t('organization.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentForm;
