import React, { useEffect } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import type { Channel } from '../../types/chat.types';

interface ChatListProps {
  onSelectChannel?: (channel: Channel) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectChannel }) => {
  const { channels, activeChannel, loadChannels, setActiveChannel, loading } = useChatContext();

  useEffect(() => {
    loadChannels();
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

  const getChannelIcon = (channel: Channel): string => {
    switch (channel.type) {
      case 'direct':
        return '👤';
      case 'group':
        return '👥';
      case 'public':
        return '📢';
      case 'private':
        return '🔒';
      default:
        return '💬';
    }
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

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie kanałów...</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Brak kanałów</p>
          <p className="text-sm text-gray-400">Utwórz nowy kanał lub czekaj na zaproszenie</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-900">Czaty</h2>
        <p className="text-sm text-gray-500">{channels.length} kanałów</p>
      </div>

      {/* Channel List */}
      <div className="divide-y divide-gray-200">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => handleChannelClick(channel)}
            className={`w-full p-4 flex items-start gap-3 hover:bg-gray-100 transition-colors ${
              activeChannel?.id === channel.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
            }`}
          >
            {/* Icon/Avatar */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 ${
                activeChannel?.id === channel.id ? 'bg-indigo-100' : 'bg-gray-200'
              }`}
            >
              {getChannelIcon(channel)}
            </div>

            {/* Channel Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3
                  className={`font-semibold truncate ${
                    activeChannel?.id === channel.id ? 'text-indigo-900' : 'text-gray-900'
                  }`}
                >
                  {getChannelName(channel)}
                </h3>
                {channel.last_message_at && (
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatLastMessageTime(channel.last_message_at)}
                  </span>
                )}
              </div>

              {/* Channel description or type */}
              {channel.description ? (
                <p className="text-sm text-gray-600 truncate">{channel.description}</p>
              ) : (
                <p className="text-xs text-gray-400 capitalize">{channel.type}</p>
              )}

              {/* Member count for group channels */}
              {channel.type !== 'direct' && channel.members && (
                <p className="text-xs text-gray-500 mt-1">
                  {channel.members.length} członków
                </p>
              )}
            </div>

            {/* Unread badge (placeholder for future implementation) */}
            {/* {channel.unread_count > 0 && (
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-semibold">
                {channel.unread_count > 99 ? '99+' : channel.unread_count}
              </div>
            )} */}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
