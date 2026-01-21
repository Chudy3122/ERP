import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Cześć! Jestem asystentem AI systemu ERP. W czym mogę Ci pomóc? Mogę odpowiedzieć na pytania dotyczące:\n\n• Ewidencji czasu pracy\n• Projektów i zadań\n• Urlopów i nieobecności\n• Obsługi systemu',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateResponse = async (userMessage: string): Promise<string> => {
    // Symulacja odpowiedzi AI - w przyszłości można podłączyć do OpenAI API
    const lowerMessage = userMessage.toLowerCase();

    // Proste odpowiedzi kontekstowe
    if (lowerMessage.includes('urlop') || lowerMessage.includes('wolne')) {
      return 'Aby złożyć wniosek o urlop:\n\n1. Przejdź do sekcji "Nieobecności" w menu bocznym\n2. Kliknij przycisk "Nowy wniosek"\n3. Wybierz typ urlopu i daty\n4. Dodaj opcjonalny komentarz\n5. Zatwierdź wniosek\n\nTwój przełożony otrzyma powiadomienie i rozpatrzy wniosek.';
    }

    if (lowerMessage.includes('czas') || lowerMessage.includes('godzin') || lowerMessage.includes('praca')) {
      return 'Ewidencja czasu pracy:\n\n• **Rozpoczęcie pracy** - kliknij "Rozpocznij pracę" w sekcji Ewidencja czasu\n• **Zakończenie pracy** - kliknij "Zakończ pracę"\n• **Historia** - przeglądaj swoje wpisy w tabeli poniżej\n\nSystem automatycznie oblicza przepracowane godziny i ewentualne nadgodziny.';
    }

    if (lowerMessage.includes('projekt') || lowerMessage.includes('zadani')) {
      return 'Zarządzanie projektami i zadaniami:\n\n• **Lista projektów** - znajdziesz w menu "Projekty"\n• **Moje zadania** - wszystkie przypisane do Ciebie zadania\n• **Tworzenie zadania** - wejdź w projekt i kliknij "Nowe zadanie"\n\nMożesz filtrować zadania po statusie, priorytecie i terminie.';
    }

    if (lowerMessage.includes('czat') || lowerMessage.includes('wiadomo')) {
      return 'Komunikacja w systemie:\n\n• **Czat** - sekcja do rozmów z innymi użytkownikami\n• **Nowa konwersacja** - kliknij "+" aby rozpocząć nowy czat\n• **Powiadomienia** - dzwonek w prawym górnym rogu\n\nMożesz tworzyć czaty indywidualne lub grupowe.';
    }

    if (lowerMessage.includes('pomoc') || lowerMessage.includes('help')) {
      return 'Chętnie pomogę! Oto główne sekcje systemu:\n\n• **Dashboard** - przegląd aktywności\n• **Ewidencja czasu** - rejestracja godzin pracy\n• **Projekty** - zarządzanie projektami\n• **Czat** - komunikacja zespołowa\n• **Nieobecności** - wnioski urlopowe\n\nO czym chciałbyś dowiedzieć się więcej?';
    }

    if (lowerMessage.includes('dzień dobry') || lowerMessage.includes('cześć') || lowerMessage.includes('hej') || lowerMessage.includes('witam')) {
      return 'Cześć! Miło Cię widzieć 👋\n\nW czym mogę Ci dzisiaj pomóc? Możesz zapytać o dowolną funkcję systemu ERP.';
    }

    // Domyślna odpowiedź
    return 'Dziękuję za pytanie! Mogę pomóc Ci z:\n\n• Ewidencją czasu pracy\n• Zarządzaniem projektami i zadaniami\n• Wnioskami urlopowymi\n• Komunikacją w systemie\n• Nawigacją po aplikacji\n\nSpróbuj zadać bardziej szczegółowe pytanie, a postaram się pomóc!';
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Symulacja opóźnienia API
      await new Promise((resolve) => setTimeout(resolve, 800));
      const response = await generateResponse(userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
        title={isOpen ? 'Zamknij asystenta' : 'Otwórz asystenta AI'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Asystent AI</h3>
              <p className="text-blue-100 text-xs">System ERP • Online</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Napisz wiadomość..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Asystent AI pomoże Ci z obsługą systemu ERP
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
