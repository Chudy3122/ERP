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
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Witaj w czacie!</h2>
          <p className="text-gray-500">Wybierz kanał z listy po lewej stronie, aby rozpocząć rozmowę</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getChannelName()}</h2>
            <p className="text-sm text-gray-500">{getChannelDescription()}</p>
          </div>

          {/* Channel members count */}
          {activeChannel.members && activeChannel.type !== 'direct' && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>👥</span>
              <span>{activeChannel.members.length} członków</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
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
