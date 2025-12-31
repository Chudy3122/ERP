import React, { useEffect, useRef } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import Message from './Message';
import MessageInput from './MessageInput';

const ChatWindow: React.FC = () => {
  const {
    activeChannel,
    messages,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTypingIndicator,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
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
        : 'Nieznany użytkownik';
    }
    return 'Bez nazwy';
  };

  const getChannelDescription = (): string => {
    if (!activeChannel) return '';
    if (activeChannel.description) return activeChannel.description;
    if (activeChannel.type === 'direct') return 'Wiadomość bezpośrednia';
    return `Kanał ${activeChannel.type}`;
  };

  // No channel selected
  if (!activeChannel) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md">
          <div className="text-7xl mb-6 animate-bounce">💬</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Witaj w czacie!
          </h2>
          <p className="text-gray-500 text-lg">Wybierz kanał z listy po lewej stronie, aby rozpocząć rozmowę</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Modern gradient */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Channel Avatar for direct messages */}
            {activeChannel.type === 'direct' && activeChannel.members && activeChannel.members[0]?.user && (
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-white/30">
                {activeChannel.members[0].user.avatar_url ? (
                  <img
                    src={activeChannel.members[0].user.avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg">
                    {activeChannel.members[0].user.first_name[0]}
                    {activeChannel.members[0].user.last_name[0]}
                  </span>
                )}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow-sm">{getChannelName()}</h2>
              <p className="text-sm text-indigo-100">{getChannelDescription()}</p>
            </div>
          </div>

          {/* Channel members count */}
          {activeChannel.members && activeChannel.type !== 'direct' && (
            <div className="flex items-center gap-2 text-sm text-white/90 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="font-medium">{activeChannel.members.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container - Modern background */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-4 bg-gradient-to-b from-gray-50 to-white"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">Brak wiadomości</p>
              <p className="text-sm text-gray-400 mt-2">Rozpocznij rozmowę poniżej</p>
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
              />
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 ml-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                </div>
                <span>Ktoś pisze...</span>
              </div>
            )}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendMessage}
        onTyping={sendTypingIndicator}
        placeholder={`Wiadomość do ${getChannelName()}...`}
      />
    </div>
  );
};

export default ChatWindow;
