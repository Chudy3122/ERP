import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import FileUpload from './FileUpload';
import * as fileApi from '../../api/file.api';
import { useChatContext } from '../../contexts/ChatContext';

export interface MentionUser {
  id: string;
  name: string;
  email?: string;
}

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  onFileUploaded?: () => void;
  compact?: boolean;
  mentionUsers?: MentionUser[];
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  placeholder = 'Napisz wiadomość...',
  disabled = false,
  onFileUploaded,
  compact = false,
  mentionUsers = [],
}) => {
  const { t } = useTranslation();
  const { activeChannel, loadMessages } = useChatContext();
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionContext, setMentionContext] = useState<{ start: number; end: number; query: string } | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showEmojiPicker]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '@';

  const findMentionContext = (value: string, caretPosition: number) => {
    const beforeCaret = value.slice(0, caretPosition);
    const atIndex = beforeCaret.lastIndexOf('@');

    if (atIndex === -1) return null;
    if (atIndex > 0 && !/[\s([{]/.test(value[atIndex - 1])) return null;

    const query = beforeCaret.slice(atIndex + 1);
    if (/[\s@]/.test(query) || query.length > 40) return null;

    return { start: atIndex, end: caretPosition, query };
  };

  const updateMentionContext = (value = content) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionUsers.length === 0) {
      setMentionContext(null);
      return;
    }

    const nextContext = findMentionContext(value, textarea.selectionStart);
    setMentionContext(nextContext);
    setActiveMentionIndex(0);
  };

  const mentionSuggestions = mentionContext
    ? mentionUsers
        .filter((mentionUser) => {
          const query = mentionContext.query.toLowerCase();
          return (
            mentionUser.name.toLowerCase().includes(query) ||
            mentionUser.email?.toLowerCase().includes(query)
          );
        })
        .slice(0, 6)
    : [];

  const isMentionMenuOpen = mentionContext !== null && mentionSuggestions.length > 0;

  const insertMention = (mentionUser: MentionUser) => {
    if (!mentionContext) return;

    const mentionText = `@${mentionUser.name} `;
    const newContent =
      content.slice(0, mentionContext.start) +
      mentionText +
      content.slice(mentionContext.end);
    const nextCaretPosition = mentionContext.start + mentionText.length;

    setContent(newContent);
    setMentionContext(null);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = nextCaretPosition;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + emojiData.emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + emojiData.emoji + content.slice(end);
    setContent(newContent);
    setMentionContext(null);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emojiData.emoji.length;
      textarea.focus();
    });
  };

  // Cleanup image preview URLs when files are removed
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (isImage(file)) {
          URL.revokeObjectURL(getImagePreviewUrl(file));
        }
      });
    };
  }, [selectedFiles]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setContent(textarea.value);
    updateMentionContext(textarea.value);

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
    if (isMentionMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionSuggestions[activeMentionIndex]);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionContext(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file selection
  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  // Paste images from the clipboard (Ctrl+V) as attachments
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const images: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        // Clipboard images are usually unnamed → give them a sensible filename
        const ext = item.type.split('/')[1] || 'png';
        const named = file.name && file.name !== 'image.png'
          ? file
          : new File([file], `wklejony-${Date.now()}.${ext}`, { type: item.type });
        images.push(named);
      }
    }
    if (images.length > 0) {
      e.preventDefault();
      handleFilesSelected(images);
    }
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

  // Check if file is an image
  const isImage = (file: File): boolean => {
    return file.type.startsWith('image/');
  };

  // Create image preview URL
  const getImagePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
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
        setMentionContext(null);
        setSelectedFiles([]);

        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }

        // Reload messages to show the uploaded file immediately
        await loadMessages(activeChannel.id);

        // Notify parent if callback provided
        if (onFileUploaded) {
          onFileUploaded();
        }
      } catch (error) {
        console.error('Failed to upload files:', error);
        alert(t('chat:uploadError'));
      } finally {
        setIsUploading(false);
      }
    } else {
      // Send regular text message
      if (!trimmedContent) return;

      onSendMessage(trimmedContent);
      setContent('');
      setMentionContext(null);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className={`border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${compact ? 'p-2' : 'p-4'}`}>
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedFiles.map((file, index) => {
            const isImageFile = isImage(file);

            return (
              <div key={index}>
                {isImageFile ? (
                  // Image preview with thumbnail
                  <div className="relative rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm">
                    <img
                      src={getImagePreviewUrl(file)}
                      alt={file.name}
                      className="w-full max-h-64 object-contain"
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="w-8 h-8 flex items-center justify-center bg-red-600 text-white hover:bg-red-700 rounded-full shadow-lg transition-colors"
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
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm p-3">
                      <p className="text-sm font-medium text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-200">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ) : (
                  // Regular file preview
                  <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center text-white text-lg flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={`flex items-end ${compact ? 'gap-1.5' : 'gap-3'}`}>
        {/* File Upload Button */}
        <div className="flex-shrink-0">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={disabled || isUploading}
          />
        </div>

        {/* Emoji Picker Button */}
        <div className="flex-shrink-0 relative" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={disabled || isUploading}
            className={`flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-yellow-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${compact ? 'w-9 h-9 text-lg' : 'w-10 h-10 text-xl'}`}
            title="Emotikony"
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={'auto' as Theme}
                height={380}
                width={320}
                searchPlaceholder="Szukaj emotikony..."
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        {/* Textarea */}
        <div className="flex-1 relative min-w-0">
          {isMentionMenuOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Wspomnij osobę
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {mentionSuggestions.map((mentionUser, index) => (
                  <button
                    key={mentionUser.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(mentionUser);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      index === activeMentionIndex
                        ? 'bg-[#F7941D]/10 text-gray-950 dark:bg-[#F7941D]/20 dark:text-white'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F7941D]/15 text-xs font-bold text-[#C56F0E] dark:bg-[#F7941D]/25 dark:text-orange-200">
                      {getInitials(mentionUser.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{mentionUser.name}</span>
                      {mentionUser.email && (
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{mentionUser.email}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onClick={() => updateMentionContext()}
            onKeyUp={() => updateMentionContext()}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            rows={1}
            className={`w-full resize-none border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed overflow-y-auto scrollbar-thin ${
              compact ? 'rounded-xl px-3 py-2 text-sm max-h-24 leading-snug' : 'rounded-md px-4 py-3 max-h-32'
            }`}
            style={{ minHeight: compact ? '40px' : '48px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!content.trim() && selectedFiles.length === 0) || disabled || isUploading}
          className={`bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center flex-shrink-0 ${
            compact ? 'rounded-xl px-3 py-2 h-10' : 'rounded-md px-6 py-3 min-w-[100px]'
          }`}
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
              <span className="hidden sm:inline">{t('chat:sending')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>{t('chat:send')}</span>
              <span className="text-lg">→</span>
            </span>
          )}
        </button>
      </div>

      {/* Helper text - Modern styling (hidden in compact mode) */}
      {!compact && (
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 dark:text-gray-300 shadow-sm font-medium">Enter</kbd>
            <span>{t('chat:enterSend')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 dark:text-gray-300 shadow-sm font-medium">Shift+Enter</kbd>
            <span>{t('chat:shiftEnterNewLine')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
