import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, UserPlus, Loader2, Users } from 'lucide-react';
import * as adminApi from '../../api/admin.api';
import type { AdminUser } from '../../types/admin.types';

interface AssignEmployeeModalProps {
  departmentId: string;
  departmentName: string;
  currentEmployeeIds: string[];
  onAssign: (userId: string) => Promise<void>;
  onClose: () => void;
}

const AssignEmployeeModal: React.FC<AssignEmployeeModalProps> = ({
  departmentName,
  currentEmployeeIds,
  onAssign,
  onClose,
}) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userList = await adminApi.getUsers();
      // Filter out inactive users and users already in this department
      setUsers(userList.filter(u => u.is_active && !currentEmployeeIds.includes(u.id)));
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    setAssigningUserId(userId);
    try {
      await onAssign(userId);
      // Remove assigned user from the list
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to assign employee:', error);
    } finally {
      setAssigningUserId(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F7941D]">
                {departmentName}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
                {t('organization.assignEmployee')}
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

        {/* Search */}
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('employees.search')}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm transition-colors focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/25 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F7941D]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
              {searchQuery ? t('employees.noMatch') : t('chat.noUsersAvailable')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-[#F7941D]/30 hover:bg-[#F7941D]/5 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-[#F7941D]/30 dark:hover:bg-[#F7941D]/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7941D]/10 text-sm font-semibold text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                    {user.first_name[0]}{user.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.position || user.email}
                    </p>
                    {user.department && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {t('employees.department')}: {user.department}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAssign(user.id)}
                    disabled={assigningUserId === user.id}
                    className="flex items-center gap-1.5 rounded-lg bg-[#F7941D] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] disabled:cursor-not-allowed disabled:bg-[#F7941D]/50"
                  >
                    {assigningUserId === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    {t('organization.assignEmployee').split(' ')[0]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('organization.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignEmployeeModal;
