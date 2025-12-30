import React from 'react';
import type { Message as MessageType } from '../../types/chat.types';
import { useAuth } from '../../contexts/AuthContext';

interface MessageProps {
  message: MessageType;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

const Message: React.FC<MessageProps> = ({ message, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isOwnMessage = message.sender_id === user?.id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Wczoraj ' + date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <p className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {message.sender?.first_name && message.sender?.last_name
            ? getInitials(`${message.sender.first_name} ${message.sender.last_name}`)
            : '?'}
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender name (only for others' messages) */}
        {!isOwnMessage && message.sender && (
          <p className="text-sm font-medium text-gray-700 mb-1">
            {message.sender.first_name} {message.sender.last_name}
          </p>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-4 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-indigo-600 text-white'
              : message.is_deleted
              ? 'bg-gray-200 text-gray-500 italic'
              : 'bg-gray-200 text-gray-900'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* Edited indicator */}
          {message.is_edited && !message.is_deleted && (
            <span className="text-xs opacity-70 ml-2">(edytowano)</span>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-1">{formatTime(message.created_at)}</p>

        {/* Action buttons (only for own messages) */}
        {isOwnMessage && !message.is_deleted && (
          <div className="flex gap-2 mt-1">
            {onEdit && (
              <button
                onClick={() => {
                  const newContent = prompt('Edytuj wiadomość:', message.content);
                  if (newContent && newContent !== message.content) {
                    onEdit(message.id, newContent);
                  }
                }}
                className="text-xs text-gray-500 hover:text-indigo-600"
              >
                Edytuj
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  if (confirm('Czy na pewno chcesz usunąć tę wiadomość?')) {
                    onDelete(message.id);
                  }
                }}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                Usuń
              </button>
            )}
          </div>
        )}
      </div>

      {/* Avatar for own messages */}
      {isOwnMessage && user && (
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {getInitials(`${user.first_name} ${user.last_name}`)}
        </div>
      )}
    </div>
  );
};

export default Message;
