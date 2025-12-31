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

### Time Management
- `POST /api/time/clock-in` - Clock in (rozpoczęcie pracy)
- `POST /api/time/clock-out` - Clock out (zakończenie pracy)
- `GET /api/time/entries` - Lista wpisów czasu użytkownika
- `GET /api/time/current` - Aktualny wpis (jeśli zalogowany)
- `GET /api/time/stats` - Statystyki czasu pracy
- `POST /api/time/leave-requests` - Nowy wniosek urlopowy
- `GET /api/time/leave-requests` - Lista wniosków urlopowych
- `PUT /api/time/leave-requests/:id/cancel` - Anulowanie wniosku
- `GET /api/time/leave-balance` - Bilans urlopowy

### User Status
- `GET /api/status/me` - Status aktualnego użytkownika
- `PUT /api/status/me` - Aktualizacja statusu
- `POST /api/status/online` - Ustaw status: online
- `POST /api/status/offline` - Ustaw status: offline
- `POST /api/status/away` - Ustaw status: away
- `POST /api/status/busy` - Ustaw status: busy
- `POST /api/status/in-meeting` - Ustaw status: in meeting
- `GET /api/status/user/:userId` - Status konkretnego użytkownika
- `POST /api/status/batch` - Statusy wielu użytkowników
- `GET /api/status/online` - Lista użytkowników online
- `GET /api/status/stats` - Statystyki statusów

### Notifications
- `GET /api/notifications` - Lista powiadomień (paginacja, filtrowanie)
- `GET /api/notifications/unread-count` - Liczba nieprzeczytanych
- `GET /api/notifications/:id` - Szczegóły powiadomienia
- `PUT /api/notifications/:id/read` - Oznacz jako przeczytane
- `PUT /api/notifications/read-all` - Oznacz wszystkie jako przeczytane
- `DELETE /api/notifications/:id` - Usuń powiadomienie
- `DELETE /api/notifications/read` - Usuń wszystkie przeczytane
- `DELETE /api/notifications/all` - Usuń wszystkie powiadomienia
- `POST /api/notifications/announcement` - Wyślij ogłoszenie systemowe (admin)

### Admin Panel (requires admin role)
- `GET /api/admin/users` - Lista użytkowników (z paginacją, filtrowaniem)
- `GET /api/admin/users/:id` - Szczegóły użytkownika
- `POST /api/admin/users` - Utworzenie nowego użytkownika
- `PUT /api/admin/users/:id` - Aktualizacja użytkownika
- `DELETE /api/admin/users/:id` - Usunięcie użytkownika
- `POST /api/admin/users/:id/activate` - Aktywacja użytkownika
- `POST /api/admin/users/:id/deactivate` - Dezaktywacja użytkownika
- `POST /api/admin/users/:id/reset-password` - Reset hasła użytkownika
- `GET /api/admin/stats` - Statystyki systemowe
- `GET /api/admin/users/:id/activity` - Aktywność użytkownika
- `GET /api/admin/recent-registrations` - Ostatnie rejestracje
- `GET /api/admin/online-count` - Liczba użytkowników online

## WebSocket Events

### Chat Events

**Client → Server (Emit)**
- `chat:join_channels` - Auto-join wszystkich kanałów użytkownika
- `chat:join_channel` - Dołącz do konkretnego kanału
- `chat:leave_channel` - Opuść kanał
- `chat:send_message` - Wyślij wiadomość
- `chat:edit_message` - Edytuj wiadomość
- `chat:delete_message` - Usuń wiadomość
- `chat:typing` - Wyślij wskaźnik pisania
- `chat:mark_read` - Oznacz kanał jako przeczytany

**Server → Client (Listen)**
- `chat:channels_joined` - Potwierdzenie dołączenia do kanałów
- `chat:channel_joined` - Dołączono do kanału
- `chat:new_message` - Nowa wiadomość w kanale
- `chat:message_edited` - Wiadomość została edytowana
- `chat:message_deleted` - Wiadomość została usunięta
- `chat:user_typing` - Użytkownik pisze
- `chat:error` - Błąd WebSocket

### User Status Events

**Client → Server (Emit)**
- `status:update` - Aktualizacja statusu użytkownika
- `status:get_my_status` - Pobierz własny status
- `status:get_batch` - Pobierz statusy wielu użytkowników
- `status:get_online_users` - Pobierz listę użytkowników online
- `status:heartbeat` - Aktualizacja last_seen

**Server → Client (Listen)**
- `status:user_status_changed` - Status użytkownika się zmienił (broadcast)
- `status:updated` - Potwierdzenie aktualizacji statusu
- `status:my_status` - Aktualny status użytkownika
- `status:batch_statuses` - Statusy wielu użytkowników
- `status:online_users` - Lista użytkowników online
- `status:error` - Błąd WebSocket

**Automatic Events**
- User automatically set to `online` on WebSocket connection
- User automatically set to `offline` on WebSocket disconnection

### Notification Events

**Client → Server (Emit)**
- `notifications:get_unread_count` - Pobierz liczbę nieprzeczytanych
- `notifications:get_recent` - Pobierz ostatnie powiadomienia
- `notifications:mark_read` - Oznacz jako przeczytane
- `notifications:mark_all_read` - Oznacz wszystkie jako przeczytane
- `notifications:delete` - Usuń powiadomienie

**Server → Client (Listen)**
- `notifications:new` - Nowe powiadomienie (sent to specific user)
- `notifications:announcement` - Ogłoszenie systemowe (broadcast)
- `notifications:unread_count` - Aktualna liczba nieprzeczytanych
- `notifications:recent` - Lista ostatnich powiadomień
- `notifications:marked_read` - Potwierdzenie przeczytania
- `notifications:all_marked_read` - Wszystkie oznaczone jako przeczytane
- `notifications:deleted` - Powiadomienie usunięte
- `notifications:error` - Błąd WebSocket

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

### Faza 3: ⏳ Zarządzanie Użytkownikami
- CRUD użytkowników
- Panel administracyjny (nadchodzące)

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

### Faza 5: ✅ Upload Plików
- Lokalny storage dla załączników
- Walidacja typów i rozmiarów plików
- Integracja z modułem czatu
- Preview plików (obrazy)

### Faza 6: ✅ Moduł Czasu Pracy
- Time tracking (clock in/out)
- Leave management (wnioski urlopowe)
- Statystyki czasu pracy
- Raporty i historia

### Faza 7: ✅ Modern UI/UX Redesign
- Messenger-like interface design
- Gradient backgrounds and glassmorphism
- Smooth animations and transitions
- Hover effects and scale transforms
- Modern card layouts
- Responsive mobile-first design

### Faza 8: ✅ System Statusów Użytkowników
- **Backend**:
  * UserStatus model i migracja bazy danych
  * Service layer (CRUD operations)
  * REST API endpoints (/api/status/*)
  * WebSocket events dla real-time updates
- **Frontend**:
  * StatusSelector component
  * TypeScript types i API client
  * Integracja w Dashboard
  * Real-time status synchronization

### Faza 9: ✅ Notifications System
- **Backend**:
  * Notification model z TypeORM
  * Service layer (CRUD, helpers for different notification types)
  * REST API endpoints (/api/notifications/*)
  * WebSocket events dla real-time notifications
  * Support dla 10 typów powiadomień
  * Priority levels (low, normal, high, urgent)
- **Frontend**:
  * NotificationCenter component z dzwonkiem
  * Real-time unread count badge
  * Modern dropdown UI z gradientami
  * Mark as read / delete notifications
  * TypeScript types i API client
  * Integracja w Dashboard navbar
- **Typy Powiadomień**:
  * Chat messages & mentions
  * Channel invitations
  * Time entry approvals/rejections
  * Leave request statuses
  * System announcements

### Faza 10: ✅ Admin Panel
- **Backend**:
  * Admin service z user management i statistics
  * REST API endpoints (/api/admin/*)
  * Role-based access control (tylko admin)
  * System statistics (users, time entries, leave requests, messages)
  * User activity tracking
  * Password reset functionality
- **Frontend**:
  * Admin Dashboard z kartami statystyk
  * Users by role distribution chart
  * Recent registrations list
  * AdminUsers page z pełnym CRUD
  * User management table (search, filter, pagination)
  * Create/Edit user modal
  * Activate/deactivate users
  * Reset password functionality
  * Modern gradient design (red-orange dla admin)

## Licencja

MIT

## Kontakt

Dla pytań i wsparcia, otwórz issue w repozytorium.
