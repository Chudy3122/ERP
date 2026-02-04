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
      className={`fixed bottom-6 right-24 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
        isOpen
          ? 'bg-gray-600 hover:bg-gray-700'
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
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default FloatingChatButton;
