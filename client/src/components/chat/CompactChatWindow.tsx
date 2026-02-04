import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../../contexts/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';
import { ArrowLeft, Users } from 'lucide-react';
import { getFileUrl } from '../../api/axios-config';

interface CompactChatWindowProps {
  onBack?: () => void;
}

const CompactChatWindow: React.FC<CompactChatWindowProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const {
    activeChannel,
    messages,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTypingIndicator,
    setActiveChannel,
    getUserStatus,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Reset avatar error when channel changes
  useEffect(() => {
    setAvatarError(false);
  }, [activeChannel?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const getChannelName = (): string => {
    if (!activeChannel) return '';
    if (activeChannel.name) return activeChannel.name;
    if (activeChannel.type === 'direct' && activeChannel.members && activeChannel.members.length > 0) {
      const otherMember = activeChannel.members[0];
      return otherMember.user
        ? `${otherMember.user.first_name} ${otherMember.user.last_name}`
        : t('chat.unnamed');
    }
    return t('chat.unnamed');
  };

  const getOtherUser = () => {
    if (activeChannel?.type === 'direct' && activeChannel.members?.[0]?.user) {
      return activeChannel.members[0].user;
    }
    return null;
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

  const handleBack = () => {
    setActiveChannel(null);
    onBack?.();
  };

  if (!activeChannel) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('chat.selectConversation')}</p>
        </div>
      </div>
    );
  }

  const otherUser = getOtherUser();
  const userStatus = otherUser ? getUserStatus(otherUser.id) : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {otherUser?.avatar_url && !avatarError ? (
              <img
                src={getFileUrl(otherUser.avatar_url) || ''}
                alt=""
                className="w-full h-full rounded-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : otherUser ? (
              `${otherUser.first_name[0]}${otherUser.last_name[0]}`
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>
          {otherUser && (
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
              userStatus?.status === 'online' ? 'bg-green-500' :
              userStatus?.status === 'away' ? 'bg-yellow-500' :
              userStatus?.status === 'busy' ? 'bg-red-500' :
              userStatus?.status === 'in_meeting' ? 'bg-purple-500' :
              'bg-gray-400 dark:bg-gray-500'
            }`}></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {getChannelName()}
          </h3>
          {otherUser && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getStatusText(userStatus?.status)}
            </p>
          )}
          {!otherUser && activeChannel.members && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activeChannel.members.length} {t('chat.members')}
            </p>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50 dark:bg-gray-900 min-h-0">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('chat.noMessages')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('chat.startConversation')}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                onEdit={editMessage}
                onDelete={deleteMessage}
                compact
              />
            ))}

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-2 mt-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
                <span>{t('chat.typing')}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendMessage}
        onTyping={sendTypingIndicator}
        placeholder={t('chat.messageTo', { name: getChannelName() })}
        compact
      />
    </div>
  );
};

export default CompactChatWindow;
