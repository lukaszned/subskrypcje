# Raport Zmian i Ulepszeń - Projekt Subskrypcje (Sub-Sentry)

Niniejszy raport zawiera zestawienie kluczowych zmian wprowadzonych w warstwie frontendu (React Native / Expo) oraz integracji z backendem w celu dostarczenia pełnej funkcjonalności MVP.

## 1. Architektura i API
- **Pełna Integracja API:** Wszystkie ekrany (Dashboard, Lista, Szczegóły) korzystają z rzeczywistych danych z backendu za pośrednictwem TanStack Query (React Query).
- **Zmienne Środowiskowe:** Konfiguracja API została przeniesiona do `.env` (obsługa `EXPO_PUBLIC_API_BASE_URL`).
- **Obsługa Błędów:** Wdrożono zaawansowaną obsługę błędów API, w tym parsowanie błędów walidacji Zod (400) oraz duplikatów (409) z wyświetlaniem komunikatów użytkownikowi.

## 2. Dashboard i Analityka
- **Statystyki Live:** Dynamiczne wyliczanie sum miesięcznych/rocznych na podstawie danych z backendu.
- **Sekcja Triali:** Nowy moduł wyświetlający kończące się okresy próbne z logiką "Ending Soon" (wyróżnienie przy < 3 dniach).
- **Analityka Kategorii:** Implementacja wykresu (listy) wydatków wg kategorii z przeliczaniem procentowym i kwotowym.
- **Logika Overdue:** Automatyczne odświeżanie statusów zaległych płatności przy każdym wejściu na Dashboard.

## 3. Zarządzanie Subskrypcjami
- **Rozbudowany Formularz:** Dodano obsługę pól opcjonalnych: `provider`, `planName`, `isTrial`, `trialEndDate`, `cancelUrl` oraz `notes`.
- **Wybór Daty:** Zintegrowano `DateTimePicker` dla Androida/iOS/Web w celu precyzyjnego ustawiania terminów płatności.
- **Edycja:** Pełny przepływ edycji istniejącej subskrypcji z automatycznym wczytywaniem aktualnych danych do formularza.

## 4. UX i UI (Premium Look)
- **Motyw Dark/Light:** Wdrożenie dynamicznego przełączania motywów kolorystycznych na Dashboardzie.
- **Gesty i Nawigacja:** Poprawna konfiguracja `GestureHandlerRootView` oraz pełna ścieżka nawigacyjna (Onboarding -> Auth -> Dashboard -> Szczegóły).
- **Szkielety Ładowania:** Dodano komponenty `Skeleton` zapewniające płynne przejście podczas pobierania danych.

## 5. Powiadomienia
- **Synchronizacja Reminders:** Automatyczna synchronizacja lokalnych przypomnień w systemie (Expo Notifications) przy każdym odświeżeniu Dashboardu.
- **Web-Safe:** Zabezpieczenie logiki powiadomień przed crashami na platformie Web.

## Uwagi dla Backend-Dev:
1. **Model danych:** Frontend w pełni wspiera model Prisma z polami `Decimal`, `DateTime` oraz `Enum`.
2. **CORS:** Upewnij się, że serwer pozwala na połączenia z lokalnego IP (dla testów na telefonie).
3. **Typy odpowiedzi:** Dashboard oczekuje bezpośrednich tablic dla `/category-breakdown` oraz `/reminders`.

---
*Przygotowano przez Antigravity AI dla Sub-Sentry MVP.*
