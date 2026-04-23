# FlowPay

FlowPay to aplikacja do monitorowania subskrypcji i stałych opłat, która pomaga użytkownikowi kontrolować cykliczne wydatki, pilnować terminów płatności i unikać niepotrzebnych kosztów.

## Cel projektu
Budujemy realny produkt, który docelowo ma być aplikacją, za którą użytkownik będzie chciał zapłacić.  
Backend jest rozwijany pod prawdziwą aplikację, a nie tylko pod projekt do nauki.

## Aktualny stack
### Backend
- Node.js
- TypeScript
- Express
- Prisma 7

### Database
- PostgreSQL
- Supabase

## Aktualny stan backendu
Na ten moment backend:
- działa lokalnie
- jest podłączony do bazy PostgreSQL w Supabase
- ma model `User`
- ma model `Subscription`
- ma relację `User -> Subscription`
- obsługuje podstawowe endpointy CRUD dla subskrypcji
- pozwala filtrować subskrypcje po `userId`

## Struktura projektu
```text
subskrypcje/
  backend/
    prisma/
    src/
  docs/
  README.md