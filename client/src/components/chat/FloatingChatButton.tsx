import React from 'react';
import { MessageSquare, X } from 'lucide-react';

interface FloatingChatButtonProps {
  isOpen: boolean;
  unreadCount: number;
  onClick: () => void;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
  isOpen,
  unreadCount,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-24 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-50 ${
        isOpen
          ? 'bg-gray-600 hover:bg-gray-700'
          : unreadCount > 0
          ? 'bg-red-500 hover:bg-red-600 hover:scale-110 shadow-red-300 dark:shadow-red-900'
          : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
      }`}
      title={isOpen ? 'Zamknij czat' : 'Otwórz czat'}
    >
      {isOpen ? (
        <X className="w-6 h-6 text-white" />
      ) : (
        <>
          <MessageSquare className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 bg-white text-red-500 text-xs rounded-full flex items-center justify-center font-bold shadow border border-red-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default FloatingChatButton;
