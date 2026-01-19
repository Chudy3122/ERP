import React, { useEffect, useState } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Channel } from '../../types/chat.types';
import type { User } from '../../types/auth.types';
import CreateChannelModal from './CreateChannelModal';
import ChannelSettingsModal from './ChannelSettingsModal';
import * as chatApi from '../../api/chat.api';

interface ChatListProps {
  onSelectChannel?: (channel: Channel) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectChannel }) => {
  const { channels, activeChannel, loadChannels, setActiveChannel, loading, createChannel, addChannelMembers, removeChannelMember, deleteChannelById } = useChatContext();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    loadChannels();
    // Load available users for adding to channels
    const loadUsers = async () => {
      try {
        const users = await chatApi.getChatUsers();
        setAvailableUsers(users);
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    loadUsers();
  }, [loadChannels]);

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel);
    if (onSelectChannel) {
      onSelectChannel(channel);
    }
  };

  const getChannelName = (channel: Channel): string => {
    if (channel.name) return channel.name;
    if (channel.type === 'direct' && channel.members && channel.members.length > 0) {
      const otherMember = channel.members[0];
      return otherMember.user
        ? `${otherMember.user.first_name} ${otherMember.user.last_name}`
        : 'Nieznany użytkownik';
    }
    return 'Bez nazwy';
  };

  const formatLastMessageTime = (dateString: string | null): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes === 0 ? 'Teraz' : `${diffInMinutes} min temu`;
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Wczoraj';
    } else {
      return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    }
  };

  const handleCreateChannel = async (data: any) => {
    await createChannel(data);
    await loadChannels();
  };

  const handleChannelSettings = (channel: Channel) => {
    setActiveChannel(channel);
    setShowSettingsModal(true);
  };

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-500 text-sm">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full p-6 bg-white">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mb-1">Brak konwersacji</p>
            <p className="text-sm text-gray-500 mb-4">Utwórz nowy kanał aby rozpocząć</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nowa konwersacja
            </button>
          </div>
        </div>
        <CreateChannelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChannel}
        />
      </>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-white">
        {/* Header - Clean & Minimal */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Czaty</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
              title="Nowa konwersacja"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {channels.map((channel) => {
          const isActive = activeChannel?.id === channel.id;
          const otherMember = channel.type === 'direct' ? channel.members?.[0] : undefined;

          return (
            <div key={channel.id} className="relative group">
              <button
                onClick={() => handleChannelClick(channel)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors border-l-4 ${
                  isActive
                    ? 'bg-blue-50 border-blue-600'
                    : 'hover:bg-gray-50 border-transparent'
                }`}
              >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {channel.type === 'direct' && otherMember?.user?.avatar_url ? (
                    <img
                      src={otherMember.user.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : channel.type === 'direct' && otherMember?.user ? (
                    `${otherMember.user.first_name[0]}${otherMember.user.last_name[0]}`
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {channel.type === 'private' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      )}
                    </svg>
                  )}
                </div>
                {/* Online indicator */}
                {channel.type === 'direct' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              {/* Channel Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`font-medium truncate text-sm ${
                      isActive ? 'text-gray-900' : 'text-gray-900'
                    }`}
                  >
                    {getChannelName(channel)}
                  </h3>
                  {channel.last_message_at && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatLastMessageTime(channel.last_message_at)}
                    </span>
                  )}
                </div>

                {/* Channel description or member count */}
                <div className="flex items-center gap-2 mt-0.5">
                  {channel.description ? (
                    <p className="text-sm text-gray-600 truncate">
                      {channel.description}
                    </p>
                  ) : channel.type !== 'direct' && channel.members ? (
                    <p className="text-xs text-gray-500">
                      {channel.members.length} członków
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Unread badge (placeholder for future implementation) */}
              {/* {channel.unreadCount && channel.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-medium">
                  {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
                </div>
              )} */}
            </button>
            {/* Settings button - only for non-direct channels */}
            {channel.type !== 'direct' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleChannelSettings(channel);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
          );
        })}
      </div>
    </div>

    {/* Modals */}
    <CreateChannelModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onCreate={handleCreateChannel}
    />
    <ChannelSettingsModal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      channel={activeChannel}
      currentUserId={user?.id || ''}
      onAddMembers={addChannelMembers}
      onRemoveMember={removeChannelMember}
      onDeleteChannel={deleteChannelById}
      availableUsers={availableUsers}
    />
  </>
  );
};

export default ChatList;
