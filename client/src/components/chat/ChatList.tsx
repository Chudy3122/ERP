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
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="text-5xl mb-3">💬</div>
          <p className="text-gray-700 font-semibold mb-2">Brak kanałów</p>
          <p className="text-sm text-gray-500">Utwórz nowy kanał lub czekaj na zaproszenie</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-white to-gray-50">
      {/* Header - Modern gradient */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 sticky top-0 z-10 shadow-lg">
        <h2 className="text-xl font-bold text-white drop-shadow-sm">Czaty</h2>
        <p className="text-sm text-indigo-100">{channels.length} {channels.length === 1 ? 'kanał' : 'kanały'}</p>
      </div>

      {/* Channel List */}
      <div className="p-2">
        {channels.map((channel) => {
          const isActive = activeChannel?.id === channel.id;
          const otherMember = channel.type === 'direct' && channel.members?.[0];

          return (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className={`w-full p-3 mb-1 flex items-center gap-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg scale-[1.02]'
                  : 'hover:bg-white hover:shadow-md'
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold shadow-md ${
                    isActive
                      ? 'bg-white/20 text-white ring-2 ring-white/30'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
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
                    getChannelIcon(channel)
                  )}
                </div>
                {/* Online indicator - placeholder */}
                {channel.type === 'direct' && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              {/* Channel Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3
                    className={`font-semibold truncate ${
                      isActive ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {getChannelName(channel)}
                  </h3>
                  {channel.last_message_at && (
                    <span className={`text-xs ml-2 flex-shrink-0 ${
                      isActive ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {formatLastMessageTime(channel.last_message_at)}
                    </span>
                  )}
                </div>

                {/* Channel description or type */}
                {channel.description ? (
                  <p className={`text-sm truncate ${
                    isActive ? 'text-white/90' : 'text-gray-600'
                  }`}>
                    {channel.description}
                  </p>
                ) : (
                  <p className={`text-xs capitalize ${
                    isActive ? 'text-white/70' : 'text-gray-400'
                  }`}>
                    {channel.type}
                  </p>
                )}

                {/* Member count for group channels */}
                {channel.type !== 'direct' && channel.members && (
                  <p className={`text-xs mt-1 ${
                    isActive ? 'text-white/70' : 'text-gray-500'
                  }`}>
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
