import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Channel } from '../../types/chat.types';
import { getFileUrl } from '../../api/axios-config';
import { Plus, MoreHorizontal, LogOut, Trash2, Users } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';

interface CompactChatListProps {
  onNewConversation: () => void;
}

const CompactChatList: React.FC<CompactChatListProps> = ({ onNewConversation }) => {
  const { t, i18n } = useTranslation();
  const {
    channels,
    activeChannel,
    loadChannels,
    setActiveChannel,
    loading,
    getUserStatus,
    unreadMessages,
    deleteChannelById,
    removeChannelMember
  } = useChatContext();
  const { user } = useAuth();
  const [contextMenu, setContextMenu] = useState<{ channelId: string; x: number; y: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'leave' | 'delete'; channel: Channel } | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel);
  };

  const handleContextMenu = (e: React.MouseEvent, channelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ channelId, x: e.clientX, y: e.clientY });
  };

  const getChannelName = (channel: Channel): string => {
    if (channel.name) return channel.name;
    if (channel.type === 'direct' && channel.members && channel.members.length > 0) {
      const otherMember = channel.members[0];
      return otherMember.user
        ? `${otherMember.user.first_name} ${otherMember.user.last_name}`
        : t('chat.unnamed');
    }
    return t('chat.unnamed');
  };

  const formatLastMessageTime = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const locale = i18n.language === 'pl' ? 'pl-PL' : i18n.language === 'de' ? 'de-DE' : 'en-US';

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes === 0 ? t('chat.now') : t('chat.minutesAgo', { count: diffInMinutes });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    }
  };

  const handleLeaveChat = (channel: Channel) => {
    if (!user) return;
    setConfirmDialog({ type: 'leave', channel });
    setContextMenu(null);
  };

  const handleDeleteChat = (channel: Channel) => {
    setConfirmDialog({ type: 'delete', channel });
    setContextMenu(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;

    setDialogLoading(true);
    try {
      if (confirmDialog.type === 'leave' && user) {
        await removeChannelMember(confirmDialog.channel.id, user.id);
        await loadChannels();
        if (activeChannel?.id === confirmDialog.channel.id) {
          setActiveChannel(null);
        }
      } else if (confirmDialog.type === 'delete') {
        await deleteChannelById(confirmDialog.channel.id);
      }
    } catch (error) {
      console.error(`Failed to ${confirmDialog.type} chat:`, error);
    } finally {
      setDialogLoading(false);
      setConfirmDialog(null);
    }
  };

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-600 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('chat.chats')}</h3>
        <button
          onClick={onNewConversation}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
          title={t('chat.newConversation')}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('chat.noConversations')}</p>
            <button
              onClick={onNewConversation}
              className="mt-3 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('chat.startNew')}
            </button>
          </div>
        ) : (
          channels.map((channel) => {
            const isActive = activeChannel?.id === channel.id;
            const otherMember = channel.type === 'direct' ? channel.members?.[0] : undefined;
            const unreadCount = unreadMessages.get(channel.id) || 0;

            return (
              <div
                key={channel.id}
                className="relative group"
                onContextMenu={(e) => handleContextMenu(e, channel.id)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleChannelClick(channel)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChannelClick(channel)}
                  className={`w-full px-3 py-3 flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-colors overflow-hidden ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {channel.type === 'direct' && otherMember?.user?.avatar_url ? (
                        <img
                          src={getFileUrl(otherMember.user.avatar_url) || ''}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : channel.type === 'direct' && otherMember?.user ? (
                        `${otherMember.user.first_name[0]}${otherMember.user.last_name[0]}`
                      ) : (
                        <Users className="w-5 h-5" />
                      )}
                    </div>
                    {/* Online status */}
                    {channel.type === 'direct' && otherMember?.user && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        getUserStatus(otherMember.user.id)?.status === 'online' ? 'bg-green-500' :
                        getUserStatus(otherMember.user.id)?.status === 'away' ? 'bg-yellow-500' :
                        getUserStatus(otherMember.user.id)?.status === 'busy' ? 'bg-red-500' :
                        getUserStatus(otherMember.user.id)?.status === 'in_meeting' ? 'bg-purple-500' :
                        'bg-gray-400 dark:bg-gray-500'
                      }`}></div>
                    )}
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`font-medium truncate text-sm ${
                        isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        {getChannelName(channel)}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {channel.last_message_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatLastMessageTime(channel.last_message_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      {channel.type !== 'direct' && channel.members ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {channel.members.length} {t('chat.members')}
                        </p>
                      ) : (
                        <span></span>
                      )}
                      {unreadCount > 0 && (
                        <span className="min-w-5 h-5 px-1.5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* More button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, channel.id);
                    }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[160px]"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 180) }}
        >
          {(() => {
            const channel = channels.find(c => c.id === contextMenu.channelId);
            if (!channel) return null;
            const isCreator = channel.created_by === user?.id;

            return (
              <>
                {channel.type !== 'direct' && (
                  <button
                    onClick={() => handleLeaveChat(channel)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('chat.leaveChat')}
                  </button>
                )}
                {(isCreator || channel.type === 'direct') && (
                  <button
                    onClick={() => handleDeleteChat(channel)}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('chat.deleteChat')}
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog !== null}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleConfirmAction}
        title={confirmDialog?.type === 'leave' ? t('chat.leaveChatTitle') : t('chat.deleteChatTitle')}
        message={confirmDialog?.type === 'leave' ? t('chat.leaveConfirm') : t('chat.deleteChatConfirm')}
        confirmText={confirmDialog?.type === 'leave' ? t('chat.leaveChat') : t('chat.deleteChat')}
        cancelText={t('common.cancel')}
        variant={confirmDialog?.type === 'delete' ? 'danger' : 'warning'}
        icon={confirmDialog?.type === 'delete' ? 'delete' : 'leave'}
        loading={dialogLoading}
      />
    </div>
  );
};

export default CompactChatList;
