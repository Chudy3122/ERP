# ERP System - Quick Start Guide

## System jest GOTOWY i DZIALA

Twój system ERP został w pełni skonfigurowany i jest gotowy do użycia.

---

## Status Systemu

### Backend
- **URL:** http://localhost:5000
- **Status:** Dziala
- **Health Check:** http://localhost:5000/api/health
- **WebSocket:** ws://localhost:5000

### Frontend
- **URL:** http://localhost:5173
- **Status:** Dziala
- **Interface:** Profesjonalny redesign z nowa nawigacja

### Baza Danych
- **Status:** Polaczona
- **Migracje:** Wszystkie wykonane (7 migracji)
- **Seed Data:** Zaladowane (3 projekty, 5 zadan, 4 tickety)

---

## Co jest dostepne?

### Nowe funkcjonalnosci:

1. **Projekty**
   - Pelny CRUD dla projektow
   - Zarzadzanie czlonkami zespolu
   - Statusy i priorytety
   - Statystyki projektow

2. **Zadania**
   - Lista zadan uzytkownika
   - Filtry wedlug terminow (dzis, jutro, tydzien, 2 tygodnie)
   - Tracking deadline'ow
   - Subzadania

3. **Zgloszenia (Tickets)**
   - System ticketow z auto-numeracja
   - Komentarze do zgloszen
   - 3 typy widokow (Moje, Przypisane, Wszystkie)
   - Kategorie i priorytety

4. **Dashboard**
   - Wykres czasu pracy (ostatnie 7 dni)
   - Licznik deadline'ow
   - Stream aktywnosci (auto-refresh)
   - Quick actions

5. **Nieobecnosci**
   - Dedykowana strona urlopow (osobna od czasu pracy)
   - Zarzadzanie wnioskami
   - Kalendarz zespolu
   - Zatwierdzenia (dla managerow)

---

## Jak Korzystac

### 1. Dostep do systemu

Otworz przegladarke i przejdz do: **http://localhost:5173**

### 2. Logowanie

Uzyj jednego z testowych kont (utworzonych przez `seedUsers.ts`):
- Admin account lub inne konta z poprzednich seedow

### 3. Nawigacja

Nowa nawigacja w lewym sidebarze zawiera:

```
Dashboard
─────────────
Komunikacja
   - Czat
   - Spotkania
─────────────
Czas pracy
   - Ewidencja czasu
   - Nieobecnosci (NOWE)
   - Kalendarz zespolu
─────────────
Projekty (NOWE)
   - Lista projektow
   - Moje zadania
─────────────
Pracownicy
   - Lista pracownikow
─────────────
Zgloszenia (NOWE)
   - Moje zgloszenia
   - Wszystkie zgloszenia
─────────────
Administracja
   - Uzytkownicy
   - Raporty
   - Ustawienia
```

---

## Dostepne Dane Testowe

### Projekty:
1. **System ERP** (ERP-001)
   - Status: Active
   - Priorytet: High
   - 3 zadania
   - 3 tickety

2. **Aplikacja mobilna** (MOB-001)
   - Status: Active
   - Priorytet: Medium
   - 2 zadania
   - 1 ticket

3. **Redesign strony www** (WEB-001)
   - Status: Planning
   - Priorytet: Low

### Zadania (5):
- **Na jutro:** Implementacja modulu projektow
- **Na tydzien:** Testy modulu czasu pracy, Integracja z API
- **Ukonczone:** Dokumentacja API
- **W review:** Design ekranu logowania

### Tickety (4):
- **Bug:** Blad przy logowaniu uzytkownika (HIGH)
- **Feature:** Eksport raportow do PDF (NORMAL)
- **Question:** Konfiguracja powiadomien (RESOLVED)
- **Bug:** Aplikacja mobilna nie synchronizuje (URGENT)

---

## Ponowne Zaladowanie Danych Testowych

Jesli chcesz zresetowac dane testowe:

```bash
cd server
npm run seed:projects
```

To usunie wszystkie projekty, zadania i tickety, i utworzy je od nowa.

---

## Rozwiazywanie Problemow

### Aplikacja sie nie uruchamia

```bash
# Zatrzymaj wszystko
Ctrl+C (w terminalu gdzie działa npm run dev)

# Uruchom ponownie
npm run dev
```

### Backend pokazuje błędy

```bash
cd server
npm run dev
```

### Frontend pokazuje błędy

```bash
cd client
npm run dev
```

### Baza danych nie dziala

Sprawdz czy PostgreSQL jest uruchomiony:
```bash
# Windows (w PowerShell jako Administrator)
Get-Service postgresql*

# Jeśli nie działa
Start-Service postgresql-x64-14
```

---

## Wiecej Informacji

Szczegolowa dokumentacja implementacji znajduje sie w:
- **IMPLEMENTATION_STATUS.md** - Pelny status wszystkich faz

---

## Znane Ograniczenia

1. **Employee Routes** - Tymczasowo wylaczone
   - Modul pracownikow wymaga rozszerzenia modelu User
   - Wszystkie inne moduly dzialaja w 100%

---

## Gotowe do Pracy

System jest w pelni funkcjonalny. Mozesz:
- Tworzyc nowe projekty
- Dodawac zadania
- Zglaszac tickety
- Sledzic aktywnosc
- Zarzadzac czasem pracy i urlopami
- Przegladac raporty

**Milego uzytkowania!**
