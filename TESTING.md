# Instrukcja Testowania - Faza 2: System Autentykacji

## Przygotowanie środowiska

### 1. Uruchom Docker Desktop
- Upewnij się, że Docker Desktop jest uruchomiony

### 2. Uruchom bazy danych
```bash
npm run docker:up
```

To uruchomi:
- PostgreSQL na porcie 5432
- Redis na porcie 6379

### 3. Zainstaluj dependencje (jeśli jeszcze nie zainstalowano)
```bash
# Root
npm install

# Server
cd server && npm install

# Client
cd ../client && npm install
```

## Uruchomienie aplikacji

### Opcja 1: Uruchom wszystko jednocześnie (Recommended)
```bash
# Z głównego folderu
npm run dev
```

To uruchomi:
- Backend serwer na http://localhost:5000
- Frontend na http://localhost:5173

### Opcja 2: Uruchom osobno
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

## Test Flow Autentykacji

### 1. Otwórz przeglądarkę
Przejdź do: http://localhost:5173

### 2. Testuj rejestrację nowego użytkownika

1. Kliknij "Zarejestruj się"
2. Wypełnij formularz:
   - Imię: Jan
   - Nazwisko: Kowalski
   - Email: jan.kowalski@example.com
   - Dział: IT (opcjonalne)
   - Telefon: +48 123 456 789 (opcjonalne)
   - Hasło: Test1234! (wymaga: min 8 znaków, wielkie i małe litery, cyfry, znaki specjalne)
   - Potwierdź hasło: Test1234!

3. Kliknij "Zarejestruj się"
4. Powinieneś zostać automatycznie zalogowany i przekierowany na Dashboard

### 3. Testuj Dashboard

Po zalogowaniu powinieneś zobaczyć:
- Navbar z twoim imieniem i nazwiskiem
- Badge z rolą (employee)
- Przycisk "Wyloguj się"
- Karty z informacjami o użytkowniku
- Moduły (Komunikacyjny i Zarządzania Czasem) - jeszcze nieaktywne

### 4. Testuj wylogowanie

1. Kliknij "Wyloguj się"
2. Powinieneś zostać przekierowany na stronę logowania
3. Sprawdź localStorage (DevTools → Application → Local Storage):
   - `accessToken`, `refreshToken`, `user` powinny być usunięte

### 5. Testuj logowanie

1. Na stronie logowania wpisz:
   - Email: jan.kowalski@example.com
   - Hasło: Test1234!

2. Kliknij "Zaloguj się"
3. Powinieneś zostać przekierowany na Dashboard

### 6. Testuj automatyczne odświeżanie tokenu

1. Zaloguj się
2. Otwórz DevTools (F12) → Console
3. Sprawdź localStorage → accessToken
4. Skopiuj token
5. Wklej do https://jwt.io - zobaczysz że token wygasa po 15 minutach
6. Backend automatycznie odświeży token gdy wygaśnie (podczas następnego requestu)

### 7. Testuj protected routes

1. Będąc zalogowanym, przejdź do: http://localhost:5173/dashboard
   - Powinieneś widzieć Dashboard

2. Wyloguj się

3. Spróbuj wejść bezpośrednio na: http://localhost:5173/dashboard
   - Powinieneś zostać przekierowany na /login

4. Zaloguj się ponownie

5. Spróbuj wejść na: http://localhost:5173/login
   - Powinieneś zostać przekierowany na /dashboard (już jesteś zalogowany)

### 8. Testuj walidację hasła

1. Przejdź do rejestracji
2. Wpisz słabe hasło: "test" lub "12345678"
3. Backend zwróci błąd walidacji hasła

### 9. Testuj duplikację email

1. Spróbuj zarejestrować użytkownika z emailem który już istnieje
2. Backend zwróci błąd: "Email already registered"

## Sprawdzenie bazy danych

### Sprawdź utworzone tabele w PostgreSQL

```bash
# Wejdź do kontenera PostgreSQL
docker exec -it erp_postgres psql -U postgres -d erp_database

# Wyświetl tabele
\dt

# Powinny być:
# - users
# - refresh_tokens

# Sprawdź użytkowników
SELECT id, email, first_name, last_name, role, created_at FROM users;

# Sprawdź refresh tokeny
SELECT id, user_id, expires_at, revoked_at, created_at FROM refresh_tokens;

# Wyjdź
\q
```

## API Endpoints - Testowanie z Postman/curl

### 1. Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "first_name": "Test",
    "last_name": "User",
    "department": "IT"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

### 3. Get Current User (wymaga access token)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5. Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Troubleshooting

### Backend nie startuje
- Sprawdź czy Docker Desktop jest uruchomiony
- Sprawdź czy PostgreSQL i Redis działają: `docker ps`
- Sprawdź logi: `docker-compose logs`

### Frontend nie może połączyć się z backendem
- Sprawdź czy backend działa na http://localhost:5000
- Sprawdź DevTools → Network → sprawdź czy requesty idą do poprawnego URL
- Sprawdź CORS - backend powinien akceptować requesty z http://localhost:5173

### Token nie odświeża się automatycznie
- Sprawdź console w DevTools - powinny być logi requestów
- Sprawdź Network tab - powinien być request do /api/auth/refresh
- Sprawdź localStorage - refreshToken powinien być zapisany

### Błędy TypeORM/Migracji
- Usuń bazę danych i stwórz nową:
```bash
docker-compose down -v
docker-compose up -d
```

## Kolejne kroki

Po pomyślnym przetestowaniu Fazy 2, możesz przejść do:
- Faza 3: Zarządzanie Użytkownikami
- Faza 4: Moduł Czatu (WebSocket + Socket.io)
- Faza 6: Moduł Czasu Pracy

Gratulacje! System autentykacji działa! 🎉
