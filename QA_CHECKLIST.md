# Sub-Sentry Frontend QA Checklist

Ta lista sluzy do szybkiego smoke testu przed demo, releasem albo wiekszym mergem. Zakladamy, ze backend moze odpowiadac wolno, dlatego sprawdzamy tez zachowanie z cache i retry.

## 1. Start aplikacji

- [ ] Expo startuje bez czerwonego ekranu.
- [ ] Splash znika i aplikacja przechodzi do auth albo dashboardu.
- [ ] Brak widocznych ostrzezen o brakujacych assetach.
- [ ] `npx.cmd tsc --noEmit` przechodzi.
- [ ] `npx.cmd expo export --platform android` przechodzi.

## 2. Auth

- [ ] Onboarding ma czytelne CTA.
- [ ] Login pokazuje walidacje przy pustych polach.
- [ ] Register pokazuje blad dla hasla krotszego niz 6 znakow.
- [ ] Po zalogowaniu aplikacja przechodzi do dashboardu.
- [ ] Wylogowanie w ustawieniach wraca do auth flow.

## 3. Dashboard / Menu glowne

- [ ] Hero z kosztem miesiecznym renderuje sie bez overlapu.
- [ ] FAB nie zaslania ostatnich sekcji.
- [ ] Widgety prowadza do poprawnych ekranow: lista, statystyki, kalendarz, Guard, Gmail, kolejka decyzji.
- [ ] Przy wolnym backendzie widac spokojny komunikat i retry, a nie pusty ekran.
- [ ] Pull-to-refresh nie blokuje scrolla.

## 4. Lista subskrypcji

- [ ] Lista otwiera sie bez bledu.
- [ ] Search filtruje wyniki.
- [ ] Filtry statusu dzialaja i nie zacinaja przewijania.
- [ ] Sortowanie przechodzi przez Data -> Cena -> Nazwa.
- [ ] Empty state jest czytelny dla pustej listy i dla braku wynikow wyszukiwania.
- [ ] Swipe actions nie nachodza na tekst.

## 5. Dodawanie / edycja subskrypcji

- [ ] Strzalka/zamkniecie modala jest widoczne w kazdym motywie.
- [ ] Wybor uslugi wypelnia nazwe, provider, kategorie i kwote.
- [ ] Wybor planu ustawia cene i cykl rozliczenia.
- [ ] Wspoldzielenie kosztu poprawnie dzieli kwote przez liczbe osob.
- [ ] Opcje dodatkowe sa domyslnie zwiniete i plynnie sie rozwijaja.
- [ ] Zapis pokazuje jasny sukces albo czytelny blad.
- [ ] Edycja istniejacej subskrypcji nie gubi notatek ani ustawien wspoldzielenia.

## 6. Szczegoly subskrypcji

- [ ] Hero, kwota, status i nastepna platnosc sa czytelne.
- [ ] Historia platnosci i aktywnosci ma skeleton/loading.
- [ ] Oznaczenie jako oplacona pokazuje feedback.
- [ ] Cancel Assistant pokazuje poprawne fallbacki:
  - [ ] jest `cancelUrl` -> przycisk przejscia,
  - [ ] sa instrukcje bez URL -> brak pustego przycisku,
  - [ ] brak guide'a -> CTA zgloszenia.
- [ ] Usuniecie wymaga potwierdzenia.

## 7. Kalendarz / Guard / Statystyki

- [ ] Kalendarz pokazuje najblizsze platnosci w dobrym terminie.
- [ ] Daty relatywne sa zgodne z data platnosci.
- [ ] Guard pokazuje ryzyka bez crasha przy pustych danych.
- [ ] Statystyki nie maja wykresow "w dol" ani ujemnych wysokosci kolumn.
- [ ] Oszczednosci prowadza do ekranu z anulowanymi uslugami.

## 8. Gmail / Email Scan UI

- [ ] Ekran pokazuje stan niepodlaczonego Gmaila.
- [ ] CTA autoryzacji nie blokuje UI.
- [ ] Stan skanowania ma loading i jasny komunikat.
- [ ] Wyniki productResult dziela sie na: aktywne, do potwierdzenia, zmiany cen, rachunki.
- [ ] Accept/ignore maja czytelny feedback.
- [ ] UI nie sugeruje, ze subskrypcje sa tworzone automatycznie.

## 9. Motywy

- [ ] Emerald, Gold, Ruby i Mono zmieniaja globalny wyglad.
- [ ] Ikony, badge, kwoty i aktywne filtry nie zostaja stale zielone.
- [ ] Teksty maja kontrast na kazdym motywie.
- [ ] Logout i stany danger pozostaja czytelne.

## 10. Offline / slow API

- [ ] Przy timeout dashboard nie zostaje pusty.
- [ ] Lista korzysta z ostatniego zapisanego stanu, jesli cache istnieje.
- [ ] Ustawienia zapisane przy wolnym API pokazuja komunikat "zapisano lokalnie".
- [ ] Retry dziala i nie tworzy podwojnych akcji.

## 11. Przed wysylka

- [ ] `npm.cmd ls --depth=0` bez `invalid`.
- [ ] `git diff --check` bez bledow.
- [ ] Nie uruchamiano automatycznego `npm audit fix --force` bez osobnego testu Expo.
- [ ] Backend nie byl modyfikowany przy frontendowym polish pass.
