import React from 'react';
import { ChatProvider } from '../contexts/ChatContext';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

const Chat: React.FC = () => {
  return (
    <ChatProvider>
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Header */}
        <header className="bg-slate-900 shadow-lg border-b border-slate-800">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-100">Komunikator</h1>
                  <p className="text-sm text-slate-400">Wiadomości i rozmowy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
                >
                  ← Panel główny
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Channel List */}
          <aside className="w-80 border-r border-slate-200 bg-white shadow-sm overflow-hidden">
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
