import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChatProvider } from '../contexts/ChatContext';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

const Chat: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ChatProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('chat:welcome')}</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('chat:selectChannel')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600"
                >
                  ← {t('common:back')}
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Channel List */}
          <aside className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <ChatList />
          </aside>

          {/* Main Area - Chat Window */}
          <main className="flex-1 overflow-hidden">
            <ChatWindow />
          </main>
        </div>
      </div>
    </ChatProvider>
  );
};

export default Chat;
