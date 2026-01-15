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
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (fileType: string): boolean => {
    return fileType.startsWith('image/');
  };

  const getFileIcon = (fileType: string): JSX.Element => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType.startsWith('video/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType.includes('pdf')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    // Default file icon
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const detectMeetingLink = (content: string): { isMeeting: boolean; url?: string; platform?: string } => {
    // Detect /meeting/ links (Jitsi)
    const jitsiPattern = /\/meeting\/([^\s]+)/i;

    if (jitsiPattern.test(content)) {
      const match = content.match(jitsiPattern);
      return { isMeeting: true, url: match?.[0], platform: 'Jitsi Meet' };
    }

    return { isMeeting: false };
  };

  const renderMessageContent = (content: string) => {
    const meetingInfo = detectMeetingLink(content);

    if (meetingInfo.isMeeting && meetingInfo.url) {
      // Split content by the URL to handle formatted meeting messages
      const lines = content.split('\n');

      return (
        <div className="space-y-2">
          {lines.map((line, idx) => {
            if (line.includes(meetingInfo.url!)) {
              return (
                <a
                  key={idx}
                  href={meetingInfo.url}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
                    isOwnMessage
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Dołącz do spotkania →
                </a>
              );
            }
            return <p key={idx} className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{line}</p>;
          })}
        </div>
      );
    }

    return <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>;
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
    <div className={`flex gap-3 mb-3 group hover:bg-white py-2 px-3 rounded-md transition-colors ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isOwnMessage && (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold flex-shrink-0">
          {message.sender?.avatar_url ? (
            <img src={message.sender.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : message.sender?.first_name && message.sender?.last_name ? (
            getInitials(`${message.sender.first_name} ${message.sender.last_name}`)
          ) : (
            '?'
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender name (only for others' messages) */}
        {!isOwnMessage && message.sender && (
          <p className="text-xs font-semibold text-gray-600 mb-1 px-1">
            {message.sender.first_name} {message.sender.last_name}
          </p>
        )}

        {/* Message bubble */}
        {message.content && (
          <div
            className={`relative px-4 py-2.5 rounded-md shadow-sm transition-colors ${
              isOwnMessage
                ? 'bg-blue-600 text-white'
                : message.is_deleted
                ? 'bg-gray-100 text-gray-400 italic border border-gray-200'
                : 'bg-white text-gray-900 border border-gray-200'
            }`}
          >
            {renderMessageContent(message.content)}

            {/* Edited indicator */}
            {message.is_edited && !message.is_deleted && (
              <span className={`text-[10px] ml-2 ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>(edytowano)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 mt-2">
            {message.attachments.map((attachment) => (
              <div key={attachment.id}>
                {isImage(attachment.file_type) ? (
                  // Image preview
                  <a
                    href={`${API_BASE_URL}${attachment.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:opacity-90 transition-opacity"
                  >
                    <div className="relative rounded-md overflow-hidden border border-gray-200 shadow-md bg-gray-50">
                      <img
                        src={`${API_BASE_URL}${attachment.file_url}`}
                        alt={attachment.file_name}
                        className="w-full max-h-96 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 px-1">{attachment.file_name}</p>
                  </a>
                ) : (
                  // File download card
                  <a
                    href={`${API_BASE_URL}${attachment.file_url}`}
                    download={attachment.file_name}
                    className={`flex items-center gap-3 p-3 rounded-md border ${
                      isOwnMessage
                        ? 'bg-blue-500 border-blue-400 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex-shrink-0">{getFileIcon(attachment.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                      <p className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp and Actions */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <p className="text-[10px] text-gray-400">{formatTime(message.created_at)}</p>

          {/* Action buttons (only for own messages, shown on hover) */}
          {isOwnMessage && !message.is_deleted && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={() => {
                    const newContent = prompt('Edytuj wiadomość:', message.content);
                    if (newContent && newContent !== message.content) {
                      onEdit(message.id, newContent);
                    }
                  }}
                  className="text-[10px] text-gray-400 hover:text-blue-600 font-medium transition-colors"
                  title="Edytuj"
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
                  className="text-[10px] text-gray-400 hover:text-red-600 font-medium transition-colors"
                  title="Usuń"
                >
                  Usuń
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Avatar for own messages */}
      {isOwnMessage && user && (
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            getInitials(`${user.first_name} ${user.last_name}`)
          )}
        </div>
      )}
    </div>
  );
};

export default Message;
