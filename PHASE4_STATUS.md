# Faza 4: Moduł Czatu - Status Implementacji

## ✅ UKOŃCZONE (Backend 100%)

### Baza Danych
- ✅ Model Channel (direct, group, public, private)
- ✅ Model ChannelMember (z rolami i last_read_at)
- ✅ Model Message (text/file/system, edycja, usuwanie)
- ✅ Model Attachment (metadane plików)
- ✅ 4 migracje z indeksami i foreign keys

### WebSocket (Socket.io)
- ✅ Konfiguracja Socket.io z JWT authentication
- ✅ WebSocket event handlers:
  * `chat:join_channels` - Dołącz do wszystkich kanałów użytkownika
  * `chat:join_channel` - Dołącz do konkretnego kanału
  * `chat:leave_channel` - Opuść kanał
  * `chat:send_message` - Wyślij wiadomość
  * `chat:edit_message` - Edytuj wiadomość
  * `chat:delete_message` - Usuń wiadomość
  * `chat:typing` - Wskaźnik pisania
  * `chat:mark_read` - Oznacz jako przeczytane
- ✅ Room-based broadcasting (channel:channelId)
- ✅ Personal rooms (user:userId)
- ✅ Authorization checks

### REST API
- ✅ ChatService (business logic)
- ✅ ChatController
- ✅ Routes:
  * `GET /api/chat/channels` - Lista kanałów użytkownika
  * `POST /api/chat/channels` - Utwórz kanał
  * `POST /api/chat/channels/direct` - Utwórz/pobierz DM
  * `GET /api/chat/channels/:id` - Szczegóły kanału
  * `GET /api/chat/channels/:id/messages` - Wiadomości (paginacja)
  * `POST /api/chat/channels/:id/members` - Dodaj członków
  * `DELETE /api/chat/channels/:id/members/:userId` - Usuń członka

### Frontend Types
- ✅ TypeScript types (Channel, Message, Attachment, etc.)

## 📋 DO ZROBIENIA (Frontend - 3-4h pracy)

### 1. Socket.io Client Setup (~30 min)
Plik: `client/src/services/socket.service.ts`

```typescript
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
```

### 2. ChatContext (~45 min)
Plik: `client/src/contexts/ChatContext.tsx`

Funkcje:
- Zarządzanie połączeniem Socket.io
- State dla channels, messages, activeChannel
- Funkcje: sendMessage, joinChannel, leaveChannel
- Nasłuchiwanie eventów: new_message, user_typing, message_edited, message_deleted

### 3. Chat API Client (~20 min)
Plik: `client/src/api/chat.api.ts`

```typescript
import apiClient from './axios-config';

export const getChannels = async () => {
  const res = await apiClient.get('/chat/channels');
  return res.data.data;
};

export const getChannelMessages = async (channelId: string, limit = 50, offset = 0) => {
  const res = await apiClient.get(`/chat/channels/${channelId}/messages`, {
    params: { limit, offset },
  });
  return res.data.data;
};

export const createChannel = async (data: any) => {
  const res = await apiClient.post('/chat/channels', data);
  return res.data.data;
};

export const createDirectChannel = async (userId: string) => {
  const res = await apiClient.post('/chat/channels/direct', { userId });
  return res.data.data;
};
```

### 4. Komponenty UI (~2h)

#### A. ChatList (lista kanałów)
Plik: `client/src/components/chat/ChatList.tsx`
- Lista kanałów użytkownika
- Wyświetlanie ostatniej wiadomości
- Badge z liczbą nieprzeczytanych
- Kliknięcie = zmiana activeChannel

#### B. ChatWindow (okno czatu)
Plik: `client/src/components/chat/ChatWindow.tsx`
- Nagłówek z nazwą kanału
- Lista wiadomości (scroll do dołu)
- MessageInput na dole

#### C. Message (pojedyncza wiadomość)
Plik: `client/src/components/chat/Message.tsx`
- Avatar użytkownika
- Imię i nazwisko
- Treść wiadomości
- Data/czas
- Różne style dla własnych i cudzych wiadomości

#### D. MessageInput (pole wpisywania)
Plik: `client/src/components/chat/MessageInput.tsx`
- Textarea z auto-resize
- Przycisk Wyślij
- Typing indicator (emit event)
- Enter = wyślij, Shift+Enter = nowa linia

### 5. Strona Chat (~30 min)
Plik: `client/src/pages/Chat.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│           Header (Navbar)               │
├──────────┬──────────────────────────────┤
│          │                              │
│ ChatList │      ChatWindow              │
│ (sidebar)│      (main area)             │
│          │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

### 6. Routing
W `client/src/routes/AppRoutes.tsx` dodaj:

```typescript
<Route
  path="/chat"
  element={
    <PrivateRoute>
      <Chat />
    </PrivateRoute>
  }
/>
```

W Dashboard dodaj link:
```typescript
<Link to="/chat" className="btn btn-primary">
  Przejdź do czatu
</Link>
```

## 🚀 Jak uruchomić obecną wersję

```bash
# 1. Uruchom bazy danych
npm run docker:up

# 2. Uruchom aplikację
npm run dev

# Backend będzie dostępny na:
# - HTTP: http://localhost:5000
# - WebSocket: ws://localhost:5000

# Frontend: http://localhost:5173
```

## 📊 Dostępne endpointy

### REST API
```
GET    /api/chat/channels
POST   /api/chat/channels
POST   /api/chat/channels/direct
GET    /api/chat/channels/:id
GET    /api/chat/channels/:id/messages?limit=50&offset=0
POST   /api/chat/channels/:id/members
DELETE /api/chat/channels/:id/members/:userId
```

### WebSocket Events (do frontendu)

**Emit (client → server):**
- `chat:join_channels` - Auto-join wszystkich kanałów
- `chat:join_channel` - Dołącz do kanału
- `chat:leave_channel` - Opuść kanał
- `chat:send_message` - Wyślij wiadomość
- `chat:typing` - Wskaźnik pisania
- `chat:edit_message` - Edytuj wiadomość
- `chat:delete_message` - Usuń wiadomość
- `chat:mark_read` - Oznacz jako przeczytane

**Listen (server → client):**
- `chat:channels_joined` - Potwierdzenie dołączenia
- `chat:channel_joined` - Dołączono do kanału
- `chat:new_message` - Nowa wiadomość
- `chat:user_typing` - Użytkownik pisze
- `chat:message_edited` - Wiadomość edytowana
- `chat:message_deleted` - Wiadomość usunięta
- `chat:error` - Błąd

## 🧪 Testowanie backendu (bez frontendu)

### Test z Postman/curl

1. **Zaloguj się i pobierz token:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jan.kowalski@example.com","password":"Test1234!"}'
```

2. **Utwórz kanał:**
```bash
curl -X POST http://localhost:5000/api/chat/channels \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ogólny",
    "type": "group",
    "description": "Kanał ogólny"
  }'
```

3. **Pobierz kanały:**
```bash
curl http://localhost:5000/api/chat/channels \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test WebSocket (Socket.io client)
Użyj Socket.io devtools lub napisz prosty skrypt:

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_ACCESS_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('chat:join_channels');
});

socket.on('chat:new_message', (data) => {
  console.log('New message:', data);
});
```

## 📝 Następne kroki

1. Najpierw przetestuj backend (REST API + WebSocket)
2. Zaimplementuj frontend w kolejności:
   - Socket.io service
   - ChatContext
   - API client
   - Komponenty UI
   - Strona Chat
   - Routing

3. Testuj każdy komponent osobno przed przejściem do następnego

## 💡 Wskazówki

- Użyj `useEffect` do inicjalizacji Socket.io w ChatContext
- Pamiętaj o disconnect w cleanup
- Używaj `socket.emit()` do wysyłania, `socket.on()` do nasłuchiwania
- Sprawdzaj logi w konsoli backendu - zobaczysz wszystkie eventy
- Frontend może używać `@tanstack/react-query` dla caching REST API
- Rozważ użycie `react-virtualized` dla długich list wiadomości

## ✅ Podsumowanie

**Backend jest w 100% gotowy i funkcjonalny!**

Możesz teraz:
1. Przetestować REST API i WebSocket
2. Zaimplementować frontend według powyższych instrukcji
3. Lub przejść do innej fazy (Moduł Czasu Pracy, Zarządzanie Użytkownikami)

Good luck! 🚀
