import React from 'react';
import { ChatProvider } from '../contexts/ChatContext';
import ChatList from '../components/chat/ChatList';
import ChatWindow from '../components/chat/ChatWindow';

const Chat: React.FC = () => {
  return (
    <ChatProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header/Navbar */}
        <header className="bg-indigo-600 text-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">💬 Czat</h1>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors"
              >
                ← Panel główny
              </a>
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Channel List */}
          <aside className="w-80 border-r border-gray-300 bg-white shadow-sm overflow-hidden">
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
