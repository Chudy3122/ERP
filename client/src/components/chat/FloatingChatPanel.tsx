import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '../../contexts/ChatContext';
import FloatingChatButton from './FloatingChatButton';
import CompactChatList from './CompactChatList';
import CompactChatWindow from './CompactChatWindow';
import NewConversationView from './NewConversationView';

type ViewType = 'list' | 'new';

const FloatingChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    totalUnreadCount,
    isPanelOpen,
    setIsPanelOpen,
    activeChannel,
    setActiveChannel,
  } = useChatContext();

  const [view, setView] = useState<ViewType>('list');

  // Reset view when panel closes
  useEffect(() => {
    if (!isPanelOpen) {
      setView('list');
    }
  }, [isPanelOpen]);

  const handleToggle = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleNewConversation = () => {
    setView('new');
  };

  const handleBackFromNew = () => {
    setView('list');
  };

  const handleBackFromChat = () => {
    setActiveChannel(null);
  };

  return (
    <>
      {/* Floating Button */}
      <FloatingChatButton
        isOpen={isPanelOpen}
        unreadCount={totalUnreadCount}
        onClick={handleToggle}
      />

      {/* Chat Panel */}
      {isPanelOpen && (
        <div className="fixed bottom-24 right-6 w-[800px] h-[550px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex z-50 overflow-hidden transition-all duration-300">
          {/* Left Panel - Chat List (280px) */}
          <div className="w-[280px] border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {view === 'new' ? (
              <NewConversationView
                onClose={handleBackFromNew}
                onConversationCreated={() => setView('list')}
              />
            ) : (
              <CompactChatList onNewConversation={handleNewConversation} />
            )}
          </div>

          {/* Right Panel - Chat Window (flex-1 = ~520px) */}
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
            {activeChannel ? (
              <CompactChatWindow onBack={handleBackFromChat} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('chat.selectConversation')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    {t('chat.selectOrStart')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatPanel;
