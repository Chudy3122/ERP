import React, { useState, useRef, KeyboardEvent } from 'react';
import FileUpload from './FileUpload';
import * as fileApi from '../../api/file.api';
import { useChatContext } from '../../contexts/ChatContext';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  placeholder = 'Napisz wiadomość...',
  disabled = false,
}) => {
  const { activeChannel } = useChatContext();
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setContent(textarea.value);

    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';

    // Send typing indicator (throttled)
    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  };

  // Handle Enter key: Send on Enter, new line on Shift+Enter
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file selection
  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  // Remove selected file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Send message or upload files
  const handleSend = async () => {
    if (disabled || isUploading) return;

    const trimmedContent = content.trim();

    // If there are files, upload them
    if (selectedFiles.length > 0) {
      if (!activeChannel) return;

      try {
        setIsUploading(true);
        await fileApi.uploadFiles(activeChannel.id, selectedFiles, trimmedContent);
        setContent('');
        setSelectedFiles([]);

        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        console.error('Failed to upload files:', error);
        alert('Nie udało się przesłać plików');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Send regular text message
      if (!trimmedContent) return;

      onSendMessage(trimmedContent);
      setContent('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 shadow-lg">
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg shadow-md flex-shrink-0">
                📎
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Usuń"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* File Upload Button */}
        <div className="flex-shrink-0">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={disabled || isUploading}
          />
        </div>

        {/* Textarea with modern styling */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            rows={1}
            className="w-full resize-none border-2 border-gray-200 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed max-h-32 overflow-y-auto shadow-sm hover:shadow-md transition-all duration-200"
            style={{ minHeight: '48px' }}
          />
        </div>

        {/* Send Button - Modern gradient */}
        <button
          onClick={handleSend}
          disabled={(!content.trim() && selectedFiles.length === 0) || disabled || isUploading}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:shadow-xl disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 font-semibold min-w-[100px] shadow-lg hover:scale-105 disabled:hover:scale-100 flex items-center justify-center"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="hidden sm:inline">Wysyłanie...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>Wyślij</span>
              <span className="text-lg">→</span>
            </span>
          )}
        </button>
      </div>

      {/* Helper text - Modern styling */}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-white rounded-lg border border-gray-300 shadow-sm font-medium">Enter</kbd>
          <span>wyślij</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-white rounded-lg border border-gray-300 shadow-sm font-medium">Shift+Enter</kbd>
          <span>nowa linia</span>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
