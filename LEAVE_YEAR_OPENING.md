# Otwarcie nowego roku urlopowego

## Planowanie i ochrona bieżącego roku

- Nieobecności → Zarządzanie: wybór bieżącego roku albo planu na kolejny rok.
- Plan zawiera limit urlopu bieżącego oraz automatyczną pulę 24 dni pracy zdalnej okazjonalnej.
- W nowym planie limit pracy zdalnej jest stały. Nie dziedziczy starego limitu, pozostałych dni ani wykorzystania, niezależnie od etatu pracownika.
- Szacowany urlop zaległy pochodzi z aktualnego salda poprzedniego roku:
  limit bieżący + zaległości − ręczne wykorzystanie sprzed ERP − zatwierdzone wnioski ERP.
- Szacunek jest tylko podglądem; nie jest zapisywany jako ostateczne przeniesienie.
- Wykorzystanie migracyjne urlopu i pracy zdalnej w nowym planie wynosi zero.
- Zatwierdzone i oczekujące wnioski są rozliczane według dni nieobecności, nie daty złożenia.
- Zapis planu nie zmienia pól pracownika ani obecnych sald.
- Dostęp do odczytu i zapisu planów: Administrator i Kadry, kontrolowany przez backend.
- Niezapisany limit jest propozycją z aktualnych ustawień pracownika i wymaga weryfikacji kadr.

Nowa tabela: `leave_year_plans`, unikalny rekord `(user_id, year)`.
Migracja: `1795000000000-CreateLeaveYearPlans.ts`.
Migracja dodaje pustą tabelę. Nie zmienia istniejących użytkowników i ich pul.
Standardowy start serwera uruchamia oczekujące migracje.

API:

- `GET /api/time/leave/year-plans?year=2027`
- `PUT /api/time/leave/year-plans/:userId`
  z `{ "year": 2027, "annualLeaveDays": 26 }`. Serwer ustawia nową pulę zdalnej na 24 dni.

Przygotowanie roku jest dostępne od 2027 do następnego roku według czasu Europe/Warsaw.
Zapis planu już otwartego roku jest blokowany; jego aktualne pule zmienia się w Zarządzaniu.
Walidacja limitów: liczba od 0 do 366. Zapis przez upsert zapobiega duplikatom.

## Zatwierdzenie przygotowania nowego roku

1. Kadry wybierają plan 2027 w Nieobecności → Zarządzanie.
2. Weryfikują i zapisują limity urlopu dla wszystkich aktywnych pracowników. Pula pracy zdalnej wynosi automatycznie 24 dni.
3. Zatwierdzają przygotowanie roku przyciskiem nad tabelą.

Zatwierdzenie w listopadzie lub grudniu zapisuje wyłącznie zgodę oraz wersję limitów.
Nie zapisuje historii 2026, nie zeruje liczników i nie zmienia żadnego salda pracownika.
Każda późniejsza zmiana limitów lub listy aktywnych pracowników wymaga ponownego zatwierdzenia.
Grudniowe zmiany wykorzystania urlopu nie unieważniają zgody: zaległości obliczane są na nowo przy otwarciu.

Zatwierdzenie przygotowania dotyczy wyłącznie limitów nowego roku, nie akceptacji wniosków urlopowych.
Oczekujące wnioski z poprzedniego roku nie blokują zatwierdzenia przygotowania ani otwarcia 1 stycznia.
Kadry mogą rozpatrzyć urlop z grudnia dopiero w styczniu lub lutym. Wtedy zmieni się bilans 2026
i wynikający z niego urlop zaległy w 2027, bez resetowania nowej puli i nowych wpisów.
Liczba oczekujących dni poprzedniego roku pozostaje widoczna w Zarządzaniu również po otwarciu.

API dostępne wyłącznie Administratorom i Kadrom:

- `GET /api/time/leave/year-opening?year=2027`
- `POST /api/time/leave/year-opening/confirm`
  z `{ "year": 2027, "fingerprint": "wartość z aktualnego podglądu" }`.

## Automatyczne otwarcie

Stary automat oparty na `leave_last_rollover_year` został zastąpiony.
Nowy mechanizm może wykonać otwarcie najwcześniej 1 stycznia docelowego roku w Europe/Warsaw.
Sprawdzany jest przy starcie serwera, co minutę i przy odczycie sald nowego roku.
Jeśli serwer był wyłączony, zaległe otwarcie wykona się po jego uruchomieniu.

W jednej transakcji z blokadą PostgreSQL:

1. Sprawdzana jest zgoda kadr, kompletność i zgodność zapisanych planów.
2. Zapisywany jest bilans poprzedniego roku, w tym ręczne liczniki migracyjne.
3. Wyliczane są zaległości: stara pula + wcześniejsze zaległości − wykorzystanie migracyjne − zatwierdzone wnioski dotyczące zamykanego roku.
4. Ustawiane są nowe, zaplanowane limity urlopu oraz 24 dni pracy zdalnej dla każdego; migracyjne wykorzystanie nowego roku wynosi zero.
5. Zapisywane jest źródło zaległości i znacznik wykonanego otwarcia.

Powtórny start i równoległe procesy nie powielają przeniesienia. Błąd wycofuje całą transakcję.
Brak zgody blokuje otwarcie. Saldo docelowego roku zwraca wtedy HTTP 423 z komunikatem dla kadr;
lista własnych wniosków pozostaje dostępna.

Przed 2027 mechanizm otwierania natychmiast kończy pracę bez żadnego zapisu do bazy.
Dotychczasowe obliczenia bieżących sald 2026 pozostają bez zmian.

## Historia i późniejsze korekty

- Bilans 2026 i kolejnych zamkniętych lat jest dostępny przez wybór roku w Zarządzaniu, tylko do odczytu.
- Zaległości są podpisane źródłowym bilansem; dostępne dni pokazują podział na bieżące i zaległe.
- Wnioski przez przełom roku dzielone są na dni robocze każdego roku, z wyłączeniem świąt.
- Rezerwacje oczekujących wniosków dotyczą właściwego roku i nie są wykorzystaniem zatwierdzonym.
- Późniejsze zatwierdzenie, cofnięcie, edycja lub usunięcie starego wniosku przelicza zaległości.
- Zapisana ręczna korekta aktualnych zaległości jest zachowana jako różnica względem bilansu źródłowego.
- Zapis bieżącej puli wymaga pola `year` zgodnego z aktualnym rokiem; formularz pozostawiony otwarty przez sylwestra nie nadpisze nowego roku starymi wartościami.
- Od 2027 pule są odczytywane z zapisów rocznych. Starszy zapis zwykłego profilu użytkownika nie przywróci liczników 2026; jawna zmiana limitu w profilu pracownika jest synchronizowana z rokiem bieżącym.
- Wyczerpywany jest najpierw urlop zaległy. Przenoszenie dotyczy puli urlopu wypoczynkowego, nie pracy zdalnej ani pozostałych osobnych rodzajów nieobecności.
- Niewykorzystana praca zdalna nie przechodzi na kolejny rok. Nowa pula wynosi 24 dni, pomniejszone wyłącznie o zatwierdzone wnioski dotyczące nowego roku.
- Późniejsze rozpatrzenie pracy zdalnej z 2026 zmienia wyłącznie historię 2026, nie pulę 2027. Dotychczasowe limity i wykorzystanie 2026 pozostają bez zmian.

Nowe tabele: `leave_year_balances`, `leave_year_openings`.
Migracja: `1795000001000-CreateLeaveYearAccounting.ts`. Tworzy puste tabele bez modyfikacji użytkowników.

## Weryfikacja

Testy bez połączenia z bazą:

```powershell
cd server
node -r ts-node/register --test src/services/leaveYearPlans.spec.ts src/services/leaveYearOpening.spec.ts
```

Testy używają izolowanych repozytoriów pamięciowych, zegara testowego i rollbacku.
Obejmują ochronę sald 2026, zgodę kadr, atomowość, ponowne i równoległe wykonanie,
historię, przełom roku i późniejsze korekty. Nie łączą się z żadną bazą.

Kontrola integracyjna SQL przed 2027 (wyłącznie skonfigurowana, oddzielna baza dev):

```powershell
cd server
node -r ts-node/register scripts/check-leave-year-dev.cjs
```

Kontrola tworzy tymczasowy schemat i kopię użytkowników, sprawdza obie migracje,
zapis planów, zatwierdzenie, ochronę 2026, otwarcie 2027, ponowne otwarcie i historię.
Na końcu zawsze wycofuje transakcję. Sumą kontrolną sprawdza niezmienność rzeczywistych pul.
Nie instaluje migracji w schemacie aplikacji. Test wykonano pomyślnie na bazie dev.

Przed wdrożeniem produkcyjnym trzeba sprawdzić obie migracje oraz pełny scenariusz na osobnej bazie dev.
Nie zmieniać zegara rzeczywistego serwera ani danych produkcyjnych w celu symulacji stycznia.
Warunek otwarcia 2027: zapisane plany wszystkich aktywnych pracowników i aktualne zatwierdzenie kadr.
