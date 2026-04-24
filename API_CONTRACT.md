# API Contract — Sub-Sentry / FlowPay

> **Ostatnia aktualizacja:** 2026-04-24
> **Wersja:** 1.0
>
> Ten plik jest źródłem prawdy o kształcie API między frontendem a backendem.
> Każda zmiana endpointu, modelu lub zachowania wymaga aktualizacji tego pliku
> i PR z opisem breaking change.

---

## Autoryzacja

Wszystkie endpointy (poza rejestracją/logowaniem przez Supabase Auth)
wymagają nagłówka:

```
Authorization: Bearer <supabase_access_token>
```

Token pobierany jest z sesji Supabase po stronie frontendu.
Backend weryfikuje token i ustala userId — frontend **NIE wysyła userId**.

---

## Endpointy

### USERS

#### `GET /users/me`
Zwraca aktualnego zalogowanego użytkownika.

**Response 200:**
```json
{
  "authUser": {
    "id": "uuid-z-supabase-auth",
    "email": "user@example.com"
  },
  "appUser": {
    "id": "cuid-z-wlasnej-bazy",
    "email": "user@example.com",
    "name": null
  }
}
```

---

### SUBSCRIPTIONS

#### `GET /subscriptions`
Zwraca subskrypcje zalogowanego użytkownika.

**Query params:**
- `category` — filtruj po kategorii (enum: patrz niżej)
- `status` — filtruj po statusie (enum: patrz niżej)

**Response 200:** `Subscription[]`

---

#### `GET /subscriptions/:id`
Zwraca jedną subskrypcję.

**Response 200:** `Subscription`
**Response 404:** `{ "message": "Not found" }`

---

#### `POST /subscriptions`
Tworzy nową subskrypcję. Backend ustala userId z tokena — **nie przesyłaj userId**.

**Request body:**
```json
{
  "name": "Netflix",
  "amount": 43.00,
  "currency": "PLN",
  "category": "entertainment",
  "billingCycle": "monthly",
  "provider": "Netflix",
  "planName": "Standard",
  "nextPaymentDate": "2026-05-12",
  "isTrial": false,
  "isRecurringBill": false,
  "reminderDaysBefore": 3
}
```

Pola wymagane: `name`, `amount`, `category`, `billingCycle`
Pola opcjonalne: `currency` (domyślnie PLN), `provider`, `planName`, `nextPaymentDate`, `trialEndDate`, `isTrial`, `isRecurringBill`, `reminderDaysBefore`, `paymentMethodLabel`, `cancelUrl`, `notes`

**Response 201:** `Subscription`
**Response 400:** Błąd walidacji (patrz Obsługa błędów)
**Response 409:** Duplikat (patrz Obsługa błędów)

---

#### `PATCH /subscriptions/:id`
Aktualizuje pola subskrypcji. Wszystkie pola opcjonalne.

**Response 200:** `Subscription`

---

#### `PATCH /subscriptions/:id/pay`
Oznacza subskrypcję jako opłaconą (`status: "paid"`).

**Response 200:** `Subscription`

---

#### `PATCH /subscriptions/:id/cancel`
Soft cancel — ustawia `status: "canceled"`. Preferowane nad DELETE.

**Response 200:** `Subscription`

---

#### `DELETE /subscriptions/:id`
Fizyczne usunięcie rekordu. Używaj rzadko — preferuj `/cancel`.

**Response 204:** No Content

---

### DASHBOARD

#### `GET /dashboard/summary`

**Response 200:**
```json
{
  "monthlyTotal": 85.98,
  "yearlyTotal": 1031.76,
  "activeSubscriptionsCount": 2,
  "trialsCount": 1,
  "upcomingPaymentsCount": 1,
  "overdueCount": 0
}
```

---

#### `GET /dashboard/upcoming?days=7`

**Query params:**
- `days` — liczba dni do przodu (domyślnie 7)

**Response 200:**
```json
{
  "days": 7,
  "count": 1,
  "items": [
    {
      "id": "...",
      "name": "YouTube Premium",
      "provider": "YouTube",
      "planName": "Premium",
      "amount": 25.99,
      "currency": "PLN",
      "nextPaymentDate": "2026-05-20T00:00:00.000Z",
      "status": "pending",
      "isTrial": false,
      "reminderDaysBefore": 2
    }
  ]
}
```

---

#### `GET /dashboard/trials?days=30`

**Query params:**
- `days` — liczba dni do przodu (domyślnie 30)

**Response 200:**
```json
{
  "days": 30,
  "count": 1,
  "items": [
    {
      "id": "...",
      "name": "Canva Trial",
      "provider": "Canva",
      "planName": "Pro Trial",
      "amount": 59.99,
      "currency": "PLN",
      "trialEndDate": "2026-05-03T00:00:00.000Z",
      "nextPaymentDate": "2026-05-05T00:00:00.000Z",
      "status": "pending",
      "cancelUrl": "https://www.canva.com/settings/billing/",
      "reminderDaysBefore": 2,
      "daysLeft": 9
    }
  ]
}
```

---

## Modele

### Subscription

```ts
{
  id: string                     // CUID
  name: string
  provider: string | null
  planName: string | null
  amount: number
  currency: string               // "PLN"
  category: SubscriptionCategory
  billingCycle: BillingCycle
  nextPaymentDate: string | null // ISO 8601
  lastPaymentDate: string | null
  trialEndDate: string | null
  isTrial: boolean
  isRecurringBill: boolean
  reminderDaysBefore: number
  paymentMethodLabel: string | null
  cancelUrl: string | null
  notes: string | null
  status: SubscriptionStatus
  createdAt: string
  updatedAt: string
  userId: string
}
```

---

## Enumy

### SubscriptionCategory
```
entertainment | utilities | shopping | health | education
productivity | finance | transport | other
```

### BillingCycle
```
monthly | yearly | weekly | one_time | custom
```

### SubscriptionStatus
```
pending | paid | overdue | canceled
```

---

## Obsługa błędów

### 400 — Błąd walidacji
```json
{
  "message": "Validation error",
  "errors": [
    { "field": "name", "message": "name is required" },
    { "field": "amount", "message": "amount must be greater than 0" }
  ]
}
```

### 401 — Brak lub nieprawidłowy token
```json
{ "message": "Missing or invalid authorization header" }
```

### 409 — Duplikat
```json
{
  "message": "A similar subscription already exists",
  "duplicate": {
    "id": "...",
    "name": "YouTube Premium",
    "provider": "YouTube",
    "planName": "Premium",
    "status": "pending"
  }
}
```

---

## Reguły zmian kontraktu

1. Każda zmiana (nowy endpoint, zmiana nazwy pola, zmiana statusów) wymaga PR
2. PR musi zawierać aktualizację tego pliku
3. Breaking changes muszą być opisane w tytule PR: `[BREAKING] ...`
4. Frontend aktualizuje `src/types/api.ts` w tym samym PR lub osobnym PR z linkiem
