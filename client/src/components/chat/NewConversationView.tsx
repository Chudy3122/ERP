import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import * as chatApi from '../../api/chat.api';
import type { User } from '../../types/auth.types';
import { getFileUrl } from '../../api/axios-config';
import { ArrowLeft, Search, Users, MessageCircle, Check, X } from 'lucide-react';

interface NewConversationViewProps {
  onClose: () => void;
  onConversationCreated?: () => void;
}

type ViewMode = 'select' | 'createGroup';

const NewConversationView: React.FC<NewConversationViewProps> = ({ onClose, onConversationCreated }) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { createDirectChannel, createChannel, getUserStatus, loadChannels } = useChatContext();

  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('select');

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());

  const handleAvatarError = (userId: string) => {
    setAvatarErrors(prev => new Set(prev).add(userId));
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const fetchedUsers = await chatApi.getChatUsers();
        // Filter out current user
        setUsers(fetchedUsers.filter(u => u.id !== currentUser?.id));
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [currentUser]);

  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const handleUserClick = async (userId: string) => {
    if (viewMode === 'createGroup') {
      // Toggle selection
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else {
      // Start direct conversation
      try {
        await createDirectChannel(userId);
        onConversationCreated?.();
        onClose();
      } catch (error) {
        console.error('Failed to create direct channel:', error);
      }
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2 || !groupName.trim()) return;

    setCreating(true);
    try {
      await createChannel({
        name: groupName.trim(),
        type: 'group',
        memberIds: selectedUsers
      });
      await loadChannels();
      onConversationCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    if (viewMode === 'createGroup') {
      setViewMode('select');
      setSelectedUsers([]);
      setGroupName('');
    } else {
      onClose();
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online': return t('chat.online');
      case 'away': return t('chat.away');
      case 'busy': return t('chat.busy');
      case 'in_meeting': return t('chat.inMeeting');
      default: return t('chat.offline');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {viewMode === 'createGroup' ? t('chat.createGroup') : t('chat.newConversation')}
        </h3>
      </div>

      {/* Group Name Input (when creating group) */}
      {viewMode === 'createGroup' && (
        <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {t('chat.groupName')}
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t('chat.groupNamePlaceholder')}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedUsers.map(userId => {
                const user = users.find(u => u.id === userId);
                if (!user) return null;
                return (
                  <span
                    key={userId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                  >
                    {user.first_name}
                    <button
                      onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('chat.searchUsers')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Create Group Button (only in select mode) */}
      {viewMode === 'select' && (
        <button
          onClick={() => setViewMode('createGroup')}
          className="mx-3 mt-3 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 rounded-xl transition-all border border-blue-100 dark:border-blue-800"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('chat.createGroup')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('chat.createGroupDesc')}</p>
          </div>
        </button>
      )}

      {/* Users List */}
      <div className="flex-1 overflow-y-auto py-2">
        {viewMode === 'createGroup' && (
          <p className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('chat.selectMembers')}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-600 border-t-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? t('chat.noUsers') : t('chat.noUsersAvailable')}
            </p>
          </div>
        ) : (
          <div className="px-2">
            {filteredUsers.map((user) => {
              const userStatus = getUserStatus(user.id);
              const isSelected = selectedUsers.includes(user.id);

              return (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-200 dark:ring-blue-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {user.avatar_url && !avatarErrors.has(user.id) ? (
                        <img
                          src={getFileUrl(user.avatar_url) || ''}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                          onError={() => handleAvatarError(user.id)}
                        />
                      ) : (
                        `${user.first_name[0]}${user.last_name[0]}`
                      )}
                    </div>
                    {/* Online status */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                      userStatus?.status === 'online' ? 'bg-green-500' :
                      userStatus?.status === 'away' ? 'bg-yellow-500' :
                      userStatus?.status === 'busy' ? 'bg-red-500' :
                      userStatus?.status === 'in_meeting' ? 'bg-purple-500' :
                      'bg-gray-400 dark:bg-gray-500'
                    }`}></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.position || getStatusText(userStatus?.status)}
                    </p>
                  </div>

                  {/* Selection indicator / Message icon */}
                  {viewMode === 'createGroup' ? (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  ) : (
                    <MessageCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group Button (bottom, when in group mode) */}
      {viewMode === 'createGroup' && (
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleCreateGroup}
            disabled={selectedUsers.length < 2 || !groupName.trim() || creating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {t('chat.creating')}
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                {t('chat.create')} {selectedUsers.length > 0 && `(${selectedUsers.length})`}
              </>
            )}
          </button>
          {selectedUsers.length < 2 && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
              {t('chat.minMembers')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default NewConversationView;
