// =============================================================
// src/types/api.ts
//
// Typy TypeScript odzwierciedlające kontrakt backendu.
// Źródło prawdy: backend/prisma/schema.prisma
//
// REGUŁA: Jeśli backend zmienia model -> ten plik musi być
// zaktualizowany w tym samym PR (przez frontend lub przez
// aktualizację API_CONTRACT.md + zgłoszenie).
// =============================================================

// ─────────────────────────────────────────────────────────────
// ENUMS — 1:1 z Prisma schema
// ─────────────────────────────────────────────────────────────

export type SubscriptionCategory =
  | 'entertainment'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'education'
  | 'productivity'
  | 'finance'
  | 'transport'
  | 'other';

export type BillingCycle =
  | 'monthly'
  | 'yearly'
  | 'weekly'
  | 'one_time'
  | 'custom';

export type SubscriptionStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'canceled';

// ─────────────────────────────────────────────────────────────
// MODELE — 1:1 z Prisma schema
// ─────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;        // CUID z własnej bazy
  email: string;
  name: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface AuthUser {
  id: string;        // UUID z Supabase Auth
  email: string;
}

/** GET /users/me */
export interface MeResponse {
  authUser: AuthUser;
  appUser: AppUser;
}

export interface Subscription {
  id: string;
  name: string;
  provider: string | null;
  planName: string | null;
  amount: number;
  currency: string;           // np. "PLN"
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  nextPaymentDate: string | null;  // ISO 8601
  lastPaymentDate: string | null;
  trialEndDate: string | null;
  isTrial: boolean;
  isRecurringBill: boolean;
  reminderDaysBefore: number;
  paymentMethodLabel: string | null;
  cancelUrl: string | null;
  notes: string | null;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

// ─────────────────────────────────────────────────────────────
// REQUEST PAYLOADS
// ─────────────────────────────────────────────────────────────

/** POST /subscriptions — pola wymagane i opcjonalne */
export interface CreateSubscriptionPayload {
  name: string;
  amount: number;
  currency?: string;            // domyślnie "PLN" po stronie backendu
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  // Opcjonalne:
  provider?: string;
  planName?: string;
  nextPaymentDate?: string;     // ISO 8601 np. "2026-05-01"
  trialEndDate?: string;
  isTrial?: boolean;
  isRecurringBill?: boolean;
  reminderDaysBefore?: number;
  paymentMethodLabel?: string;
  cancelUrl?: string;
  notes?: string;
}

/** PATCH /subscriptions/:id */
export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>;

// ─────────────────────────────────────────────────────────────
// DASHBOARD RESPONSES
// ─────────────────────────────────────────────────────────────

/** GET /dashboard/summary */
export interface DashboardSummary {
  monthlyTotal: number;
  yearlyTotal: number;
  activeSubscriptionsCount: number;
  trialsCount: number;
  upcomingPaymentsCount: number;
  overdueCount: number;
}

/** Element listy nadchodzących płatności */
export interface UpcomingPaymentItem {
  id: string;
  name: string;
  provider: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  nextPaymentDate: string;  // ISO 8601
  status: SubscriptionStatus;
  isTrial: boolean;
  reminderDaysBefore: number;
}

/** GET /dashboard/upcoming */
export interface UpcomingPaymentsResponse {
  days: number;
  count: number;
  items: UpcomingPaymentItem[];
}

/** Element listy triali */
export interface TrialItem {
  id: string;
  name: string;
  provider: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  trialEndDate: string;     // ISO 8601
  nextPaymentDate: string | null;
  status: SubscriptionStatus;
  cancelUrl: string | null;
  reminderDaysBefore: number;
  daysLeft: number;
}

/** GET /dashboard/trials */
export interface TrialsResponse {
  days: number;
  count: number;
  items: TrialItem[];
}

// ─────────────────────────────────────────────────────────────
// ERROR RESPONSES
// ─────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

/** 400 Validation Error */
export interface ValidationErrorResponse {
  message: 'Validation error';
  errors: ValidationError[];
}

/** 409 Duplicate */
export interface DuplicateErrorResponse {
  message: string;
  duplicate: {
    id: string;
    name: string;
    provider: string | null;
    planName: string | null;
    status: SubscriptionStatus;
  };
}

// ─────────────────────────────────────────────────────────────
// HELPERS — MAPOWANIA (Frontend <-> Backend)
// ─────────────────────────────────────────────────────────────

/** Polskie etykiety dla kategorii */
export const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  entertainment: 'Rozrywka',
  utilities:     'Narzędzia',
  shopping:      'Zakupy',
  health:        'Zdrowie',
  education:     'Edukacja',
  productivity:  'Produktywność',
  finance:       'Finanse',
  transport:     'Transport',
  other:         'Inne',
};

/** Polskie etykiety dla cykli rozliczeniowych */
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:  'Co miesiąc',
  yearly:   'Co rok',
  weekly:   'Co tydzień',
  one_time: 'Jednorazowo',
  custom:   'Niestandardowy',
};

/** Polskie etykiety dla statusów */
export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending:  'Oczekująca',
  paid:     'Opłacona',
  overdue:  'Zaległa',
  canceled: 'Anulowana',
};
