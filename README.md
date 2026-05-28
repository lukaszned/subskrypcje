# FlowPay

FlowPay to aplikacja do monitorowania subskrypcji, stałych opłat i cyklicznych wydatków. Celem aplikacji jest pomoc użytkownikowi w kontrolowaniu kosztów, wykrywaniu aktywnych subskrypcji, pilnowaniu terminów płatności oraz ograniczaniu niepotrzebnych wydatków.

Projekt jest rozwijany jako realny produkt SaaS, a nie tylko aplikacja demonstracyjna. Backend powstaje z myślą o produkcyjnej aplikacji mobilnej/webowej, integracjach z zewnętrznymi usługami oraz dalszym rozwojem algorytmów analizy danych użytkownika.

## Cel projektu

FlowPay ma umożliwiać użytkownikowi:

* ręczne dodawanie i zarządzanie subskrypcjami,
* analizę miesięcznych kosztów,
* monitorowanie nadchodzących i zaległych płatności,
* wykrywanie subskrypcji na podstawie skrzynki e-mail,
* ocenę kondycji finansowej subskrypcji,
* otrzymywanie rekomendacji i ostrzeżeń dotyczących cyklicznych wydatków,
* przygotowanie do anulowania niepotrzebnych usług.

## Aktualny stack

### Backend

* Node.js
* TypeScript
* Express
* Prisma
* Zod
* Supabase Auth
* PostgreSQL

### Database

* PostgreSQL
* Supabase

### Integracje

* Gmail OAuth / Gmail API
* IMAP dla wybranych providerów poczty
* Stripe / płatności — planowane w dalszym etapie
* zewnętrzne API kursów walut / danych pomocniczych

## Aktualny stan projektu

Backend obsługuje już znacznie więcej niż podstawowy CRUD. Aktualnie zawiera między innymi:

* autoryzację użytkowników przez Supabase,
* model użytkownika i subskrypcji,
* relację użytkownik -> subskrypcje,
* zabezpieczone endpointy użytkownika,
* CRUD subskrypcji z walidacją danych,
* dashboard podsumowujący koszty subskrypcji,
* analizę nadchodzących płatności,
* analizę zaległych płatności,
* historię płatności,
* ustawienia użytkownika,
* obsługę walut i przeliczanie kosztów,
* health score dla subskrypcji,
* endpointy pod cancel guides,
* Gmail OAuth connection flow,
* Gmail scan endpoint,
* IMAP scan endpoint,
* import-preview dla wyników skanowania,
* algorytm wykrywania subskrypcji na podstawie wiadomości e-mail,
* klasyfikację subskrypcji, rachunków, price change i elementów wymagających potwierdzenia,
* testy regresyjne dla detekcji wiadomości e-mail.

## Email scan / wykrywanie subskrypcji

Jednym z głównych elementów projektu jest moduł wykrywania subskrypcji na podstawie skrzynki e-mail.

Backend wspiera obecnie dwa podejścia:

### Gmail

Gmail działa przez OAuth i Gmail API.

Status:

* działające połączenie OAuth,
* bezpieczna obsługa reconnect / reauthorization,
* dry-run scan,
* deduplikacja wyników,
* zabezpieczenie przed duplikatami w bazie,
* testy jakościowe dla wiadomości typu security, login, onboarding, promo i payment.

### IMAP

IMAP jest używany dla providerów takich jak Onet i Interia.

Status:

* działający produkcyjny endpoint IMAP scan,
* profile skanowania: fast / adaptive / deep,
* analiza możliwości providera,
* fallbacki dla providerów ze słabym server-side search,
* metadata prepass,
* time-bucket fallback,
* klasyfikacja wyników do bucketów:

  * currentSubscriptions,
  * needsReviewSubscriptions,
  * priceChanges,
  * billsOrUtilities,
  * historicalSubscriptions,
* import-preview dla wybranych wyników,
* stabilizacja wyników dla Onet i Interia.

## Obsługiwane providery MVP

Na potrzeby MVP zakładamy wsparcie dla:

| Provider | Flow              | Status                                                    |
| -------- | ----------------- | --------------------------------------------------------- |
| Gmail    | OAuth / Gmail API | gotowy jako legacy Gmail flow                             |
| Onet     | IMAP              | przetestowany, działa przez metadata/time-bucket fallback |
| Interia  | IMAP              | przetestowana, działa stabilnie, wysokie pokrycie         |

Inni providerzy poczty mogą zostać dodani później jako aktualizacje aplikacji po wykonaniu realnych testów na kontach użytkowników.

## Algorytm detekcji

Algorytm analizuje wiadomości e-mail i próbuje odróżnić realne subskrypcje oraz cykliczne płatności od wiadomości typu:

* logowanie,
* kody bezpieczeństwa,
* onboarding,
* newsletter,
* promocje,
* jednorazowe zakupy,
* powiadomienia konta,
* zaproszenia do repozytoriów/projektów,
* wiadomości administracyjne.

Wykrywane są między innymi:

* aktywne subskrypcje,
* stare subskrypcje wymagające potwierdzenia,
* rachunki i opłaty cykliczne,
* zmiany cen,
* triale przechodzące w płatne plany,
* marketplace billing, np. subskrypcje przez Google Play / Prime Video.

## Testy

Projekt zawiera zestaw testów regresyjnych dla algorytmu detekcji wiadomości e-mail.

Aktualnie testowane są między innymi:

* realne i syntetyczne przykłady subskrypcji,
* wiadomości Gmail / IMAP,
* false positive cases,
* rachunki i utility bills,
* price changes,
* trial then paid,
* marketplace billing,
* payment processor signals,
* onboarding-only,
* security/login/code messages,
* product update / legal / admin messages.

Przykładowe komendy:

```bash
npm run build
npx tsc --noEmit
npm run test:email-detection
```

## Struktura projektu

```text
subskrypcje/
  backend/
    docs/
    prisma/
    src/
      controllers/
      fixtures/
      middlewares/
      routes/
      scripts/
      services/
```

Najważniejsze obszary backendu:

```text
src/services/email-detection.service.ts
src/services/gmail-scan.service.ts
src/services/imap-scan.service.ts
src/services/imap-scan-planner.service.ts
src/services/subscription-product-buckets.service.ts
src/services/scan-result-import.service.ts
src/routes/email-scan.ts
docs/imap-scan-contract.md
```

## Dokumentacja

Ważna dokumentacja techniczna znajduje się w:

```text
backend/docs/imap-scan-contract.md
```

Dokument opisuje kontrakt endpointów IMAP, strukturę odpowiedzi, product buckets, import-preview, obsługę błędów oraz rekomendacje integracji z frontendem.

## Uruchomienie lokalne

Przykładowy flow lokalny:

```bash
cd backend
npm install
npm run build
npm run dev
```

Do działania projektu wymagane są zmienne środowiskowe dla bazy danych, Supabase, szyfrowania tokenów oraz integracji Gmail/IMAP.

Pliki `.env` nie są commitowane do repozytorium.

## Status

Projekt jest aktywnie rozwijany.

Aktualnie backend jest na etapie zaawansowanego MVP:

* główna logika aplikacji backendowej działa,
* dashboardy i subskrypcje są zaimplementowane,
* Gmail działa jako osobny OAuth flow,
* IMAP scan działa dla Onet i Interia,
* algorytm detekcji jest rozwijany i testowany regresyjnie,
* frontend jest rozwijany równolegle jako osobna warstwa aplikacji.
