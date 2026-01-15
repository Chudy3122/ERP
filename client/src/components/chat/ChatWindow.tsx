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
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-md bg-gray-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Witaj w czacie!
          </h2>
          <p className="text-gray-600">Wybierz kanał z listy po lewej stronie, aby rozpocząć rozmowę</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-4 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Channel Avatar for direct messages */}
            {activeChannel.type === 'direct' && activeChannel.members && activeChannel.members[0]?.user && (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                {activeChannel.members[0].user.avatar_url ? (
                  <img
                    src={activeChannel.members[0].user.avatar_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm">
                    {activeChannel.members[0].user.first_name[0]}
                    {activeChannel.members[0].user.last_name[0]}
                  </span>
                )}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">{getChannelName()}</h2>
              <p className="text-sm text-blue-100">{getChannelDescription()}</p>
            </div>
          </div>

          {/* Channel members count */}
          {activeChannel.members && activeChannel.type !== 'direct' && (
            <div className="flex items-center gap-2 text-sm text-white bg-blue-700 px-3 py-1.5 rounded-md">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="font-medium">{activeChannel.members.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50"
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
