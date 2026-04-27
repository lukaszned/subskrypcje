# FlowPay API Documentation (MVP)

Base URL: `http://localhost:3000` (Local Development)

## Authentication
All protected routes require a Bearer token in the `Authorization` header.
Header: `Authorization: Bearer <supabase_access_token>`

---

## Subscriptions

### 1. GET /subscriptions
Returns a list of subscriptions for the authenticated user.

**Query Parameters:**
- `status`: Filter by status (`pending`, `paid`, `overdue`, `canceled`)
- `category`: Filter by category (e.g., `entertainment`, `utilities`)
- `search`: Search by name, provider, or notes (case-insensitive)
- `sortBy`: Field to sort by (e.g., `nextPaymentDate`, `amount`, `name`)
- `sortOrder`: `asc` or `desc` (default: `asc`)

**Response:** `200 OK` - Array of subscription objects.

---

### 2. POST /subscriptions
Creates a new subscription.

**Body:**
```json
{
  "name": "Netflix",
  "amount": 43.00,
  "currency": "PLN",
  "category": "entertainment",
  "billingCycle": "monthly",
  "nextPaymentDate": "2026-05-15T00:00:00Z",
  "provider": "Netflix",
  "isTrial": false,
  "reminderDaysBefore": 1
}
```

**Response:** `201 Created`

---

### 3. PATCH /subscriptions/:id/pay
Marks a subscription as paid. Automatically updates the `lastPaymentDate` to today.

**Response:** `200 OK` - Updated subscription object.

---

### 4. PATCH /subscriptions/:id/cancel
Soft-cancels a subscription (sets status to `canceled`).

**Response:** `200 OK` - Updated subscription object.

---

## Dashboard

### 1. GET /dashboard/summary
Returns high-level statistics.

**Response:**
```json
{
  "monthlyTotal": 150.50,
  "yearlyTotal": 1806.00,
  "activeSubscriptionsCount": 5,
  "trialsCount": 1,
  "upcomingPaymentsCount": 2,
  "overdueCount": 0
}
```

---

### 2. GET /dashboard/upcoming
Returns payments due in the next X days.

**Query Parameters:**
- `days`: Number of days (default: 7)

---

### 3. GET /dashboard/category-breakdown
Returns spending breakdown by category.

**Response:**
```json
[
  {
    "category": "entertainment",
    "total": 43.00,
    "count": 1,
    "currency": "PLN"
  }
]
```

---

## Statusy i Mapowanie UI

| Backend Status | UI Label (PL) | Kolor / Akcja |
| :--- | :--- | :--- |
| `pending` | Oczekująca | Żółty / Można opłacić |
| `paid` | Zapłacona | Zielony |
| `overdue` | Zaległa | Czerwony (Auto-logika) |
| `canceled` | Anulowana | Szary / Przekreślona |
