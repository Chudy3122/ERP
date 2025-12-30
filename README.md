# ERP - Remote Work Management System

Kompleksowa aplikacja webowa do zarządzania pracą zdalną z dwoma głównymi modułami: komunikacyjnym i zarządzania czasem pracy.

## Stack Technologiczny

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Real-time**: Socket.io
- **Authentication**: JWT + OAuth (Google, Microsoft)

## Struktura Projektu (Monorepo)

```
ERP/
├── client/          # Frontend React application
├── server/          # Backend Node.js server
└── docker-compose.yml
```

## Wymagania

- Node.js 18+
- Docker & Docker Compose
- Git

## Instalacja

### 1. Klonowanie repozytorium

```bash
git clone <repository-url>
cd ERP
```

### 2. Instalacja dependencji

```bash
# Instalacja dla root (monorepo)
npm install

# Instalacja dla client
cd client && npm install

# Instalacja dla server
cd ../server && npm install
```

### 3. Konfiguracja środowiska

```bash
# Skopiuj przykładowy plik .env
cp .env.example .env

# Edytuj plik .env i uzupełnij dane
```

### 4. Uruchomienie bazy danych (Docker)

```bash
# Z głównego folderu projektu
npm run docker:up
```

### 5. Uruchomienie aplikacji

```bash
# Development mode - uruchomi client i server jednocześnie
npm run dev

# Lub osobno:
npm run dev:client  # Frontend na http://localhost:5173
npm run dev:server  # Backend na http://localhost:5000
```

## Dostępne Skrypty

### Root (Monorepo)

- `npm run dev` - Uruchom client i server jednocześnie
- `npm run dev:client` - Uruchom tylko frontend
- `npm run dev:server` - Uruchom tylko backend
- `npm run build` - Build client i server
- `npm run docker:up` - Uruchom PostgreSQL i Redis
- `npm run docker:down` - Zatrzymaj kontenery Docker

### Server

- `npm run dev` - Development mode z hot reload
- `npm run build` - Build TypeScript do JavaScript
- `npm start` - Uruchom production build
- `npm run lint` - Linting kodu
- `npm run format` - Formatowanie kodu (Prettier)

### Client

- `npm run dev` - Development server (Vite)
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - Linting kodu
- `npm run format` - Formatowanie kodu (Prettier)

## Moduły Aplikacji

### 1. Moduł Komunikacyjny

- Czat tekstowy w czasie rzeczywistym
- Wiadomości multimedialne (załączniki, zrzuty ekranu)
- Statusy użytkowników (online/offline/busy/in meeting)
- Integracja z platformami wideokonferencyjnymi (Teams, Zoom, Meet)
- Powiadomienia w czasie rzeczywistym

### 2. Moduł Zarządzania Czasem Pracy

- Ewidencja godzin pracy (clock in/out)
- Zgłaszanie nadgodzin i spóźnień
- Zarządzanie urlopami i nieobecnościami
- Kalendarz zespołowy
- Panel administracyjny z raportami
- Eksport raportów (PDF/Excel)

## API Endpoints

### Health Check
- `GET /health` - Status serwera

### Authentication
- `POST /api/auth/register` - Rejestracja użytkownika
- `POST /api/auth/login` - Logowanie
- `POST /api/auth/refresh` - Odświeżenie tokenu
- `POST /api/auth/logout` - Wylogowanie

### Users
- `GET /api/users` - Lista użytkowników
- `GET /api/users/:id` - Szczegóły użytkownika
- `PUT /api/users/:id` - Aktualizacja profilu

### Chat
- `GET /api/chat/channels` - Lista kanałów użytkownika
- `POST /api/chat/channels` - Tworzenie kanału (group/public/private)
- `POST /api/chat/channels/direct` - Tworzenie/pobieranie direct message
- `GET /api/chat/channels/:id` - Szczegóły kanału
- `GET /api/chat/channels/:id/messages` - Wiadomości (z paginacją)
- `POST /api/chat/channels/:id/members` - Dodawanie członków
- `DELETE /api/chat/channels/:id/members/:userId` - Usuwanie członka

### Time Management (nadchodzące)
- `GET /api/time-entries` - Lista wpisów czasu
- `POST /api/time-entries` - Clock in
- `PUT /api/time-entries/:id` - Clock out

## WebSocket Events (Chat)

### Client → Server (Emit)
- `chat:join_channels` - Auto-join wszystkich kanałów użytkownika
- `chat:join_channel` - Dołącz do konkretnego kanału
- `chat:leave_channel` - Opuść kanał
- `chat:send_message` - Wyślij wiadomość
- `chat:edit_message` - Edytuj wiadomość
- `chat:delete_message` - Usuń wiadomość
- `chat:typing` - Wyślij wskaźnik pisania
- `chat:mark_read` - Oznacz kanał jako przeczytany

### Server → Client (Listen)
- `chat:channels_joined` - Potwierdzenie dołączenia do kanałów
- `chat:channel_joined` - Dołączono do kanału
- `chat:new_message` - Nowa wiadomość w kanale
- `chat:message_edited` - Wiadomość została edytowana
- `chat:message_deleted` - Wiadomość została usunięta
- `chat:user_typing` - Użytkownik pisze
- `chat:error` - Błąd WebSocket

## Testowanie Aplikacji

### 1. Testowanie Autentykacji

1. Uruchom aplikację: `npm run dev`
2. Otwórz http://localhost:5173
3. Zarejestruj nowego użytkownika
4. Zaloguj się używając utworzonych danych
5. Zostaniesz przekierowany na Dashboard

### 2. Testowanie Czatu

1. Zaloguj się jako użytkownik
2. Kliknij "Przejdź do czatu" na Dashboard
3. Czat otworzy się z połączeniem WebSocket
4. Konsola przeglądarki pokaże: "✅ Socket connected: <socket-id>"
5. Utwórz nowy kanał lub rozpocznij direct message
6. Wyślij wiadomości i obserwuj real-time updates

**Testowanie z wieloma użytkownikami:**
1. Otwórz aplikację w trybie incognito jako drugi użytkownik
2. Utwórz direct message między użytkownikami
3. Wyślij wiadomości i obserwuj real-time synchronizację
4. Testuj typing indicators i read receipts

### 3. Testowanie REST API

```bash
# Zaloguj się i pobierz token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# Pobierz kanały użytkownika
curl http://localhost:5000/api/chat/channels \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Utwórz nowy kanał
curl -X POST http://localhost:5000/api/chat/channels \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Team Chat","type":"group","description":"Main team channel"}'
```

## Baza Danych

### Główne tabele:
- `users` - Użytkownicy systemu
- `refresh_tokens` - Refresh tokens JWT
- `channels` - Kanały czatu (direct, group, public, private)
- `channel_members` - Członkowie kanałów (z rolami)
- `messages` - Wiadomości czatu
- `attachments` - Załączniki do wiadomości
- `user_statuses` - Statusy użytkowników (nadchodzące)
- `time_entries` - Ewidencja czasu pracy (nadchodzące)
- `leave_requests` - Wnioski urlopowe (nadchodzące)
- `notifications` - Powiadomienia (nadchodzące)

### Migracje

```bash
cd server
npm run migration:create -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

## Rozwój

### Faza 1: ✅ Setup Projektu
- Struktura monorepo
- Docker Compose
- TypeScript configuration
- Basic server & client

### Faza 2: ✅ System Autentykacji
- Model User + RefreshToken
- JWT authentication (access + refresh tokens)
- Bcrypt password hashing
- Login/Register pages
- Protected routes
- Automatic token refresh

### Faza 3: Zarządzanie Użytkownikami
- CRUD użytkowników
- Statusy użytkowników
- Panel administracyjny

### Faza 4: ✅ Moduł Czatu
- **Backend**:
  * Database models (Channel, Message, ChannelMember, Attachment)
  * WebSocket (Socket.io) z JWT authentication
  * REST API (channels, messages, members)
- **Frontend**:
  * Socket.io client service
  * ChatContext dla state management
  * UI components (ChatList, ChatWindow, Message, MessageInput)
  * Real-time messaging (send, edit, delete)
  * Typing indicators
  * Read receipts

### Faza 5: Upload Plików
- Lokalny storage
- Walidacja plików

### Faza 6: Moduł Czasu Pracy
- Time tracking
- Leave management
- Raporty

## Licencja

MIT

## Kontakt

Dla pytań i wsparcia, otwórz issue w repozytorium.
