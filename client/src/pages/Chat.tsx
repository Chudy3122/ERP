import React from 'react';
import { ChatProvider } from '../contexts/ChatContext';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

const Chat: React.FC = () => {
  return (
    <ChatProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header/Navbar - Modern gradient design */}
        <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-2xl relative overflow-hidden">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>

          <div className="container mx-auto px-6 py-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg ring-2 ring-white/30">
                  💬
                </div>
                <div>
                  <h1 className="text-2xl font-bold drop-shadow-sm">Komunikator</h1>
                  <p className="text-sm text-indigo-100">Wiadomości i rozmowy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard"
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
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
          <aside className="w-80 border-r border-gray-200 bg-white shadow-xl overflow-hidden">
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
