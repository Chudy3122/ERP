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

### Chat (nadchodzące)
- `GET /api/channels` - Lista kanałów
- `POST /api/channels` - Tworzenie kanału
- `GET /api/channels/:id/messages` - Wiadomości
- `POST /api/channels/:id/messages` - Wysyłanie wiadomości

### Time Management (nadchodzące)
- `GET /api/time-entries` - Lista wpisów czasu
- `POST /api/time-entries` - Clock in
- `PUT /api/time-entries/:id` - Clock out

## Baza Danych

### Główne tabele:
- `users` - Użytkownicy systemu
- `user_statuses` - Statusy użytkowników
- `channels` - Kanały czatu
- `messages` - Wiadomości
- `time_entries` - Ewidencja czasu pracy
- `leave_requests` - Wnioski urlopowe
- `notifications` - Powiadomienia

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

### Faza 2: 🔄 System Autentykacji (W TRAKCIE)
- Model User
- JWT authentication
- Login/Register pages
- Protected routes

### Faza 3: Zarządzanie Użytkownikami
- CRUD użytkowników
- Statusy użytkowników
- Panel administracyjny

### Faza 4: Moduł Czatu
- WebSocket setup
- Chat UI
- Real-time messaging

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
