// =============================================================
// src/types/api.ts
//
// Typy TypeScript odzwierciedlające kontrakt backendu.
// =============================================================

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

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

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
  currency: string;
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  nextPaymentDate: string | null;
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

export interface CreateSubscriptionPayload {
  name: string;
  amount: number;
  currency?: string;
  category: SubscriptionCategory;
  billingCycle: BillingCycle;
  provider?: string;
  planName?: string;
  nextPaymentDate?: string;
  trialEndDate?: string;
  isTrial?: boolean;
  isRecurringBill?: boolean;
  reminderDaysBefore?: number;
  paymentMethodLabel?: string;
  cancelUrl?: string;
  notes?: string;
}

export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>;

export interface DashboardSummary {
  monthlyTotal: number;
  yearlyTotal: number;
  activeSubscriptionsCount: number;
  trialsCount: number;
  upcomingPaymentsCount: number;
  overdueCount: number;
  baseCurrency: string;
}

export interface UpcomingPaymentItem {
  id: string;
  name: string;
  provider: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  nextPaymentDate: string;
  status: SubscriptionStatus;
  isTrial: boolean;
  reminderDaysBefore: number;
}

export interface UpcomingPaymentsResponse {
  days: number;
  count: number;
  items: UpcomingPaymentItem[];
}

export interface TrialItem {
  id: string;
  name: string;
  provider: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  trialEndDate: string;
  nextPaymentDate: string | null;
  status: SubscriptionStatus;
  cancelUrl: string | null;
  reminderDaysBefore: number;
  daysLeft: number;
}

export interface TrialsResponse {
  days: number;
  count: number;
  items: TrialItem[];
}

export interface CategoryBreakdownItem {
  category: SubscriptionCategory;
  monthlyAmount: number;
  subscriptionCount: number;
  percentage: number;
}

export interface CategoryBreakdownResponse {
  totalMonthly: number;
  baseCurrency: string;
  items: CategoryBreakdownItem[];
}

export interface ReminderItem {
  id: string;
  name: string;
  provider: string | null;
  nextPaymentDate: string;
  reminderDaysBefore: number;
  remindAt: string;
  status: SubscriptionStatus;
}

export interface RemindersResponse {
  count: number;
  items: ReminderItem[];
}

export interface SavingsItem {
  id: string;
  name: string;
  provider: string | null;
  originalAmount: number;
  originalCurrency: string;
  monthlyAmount: number;
  yearlyAmount: number;
  canceledAt: string;
}

export interface SavingsResponse {
  baseCurrency: string;
  canceledSubscriptionsCount: number;
  monthlySavings: number;
  yearlySavings: number;
  items: SavingsItem[];
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  userId: string;
  type: 'created' | 'updated' | 'paid' | 'canceled';
  payload: any;
  createdAt: string;
}

export interface SubscriptionHistoryResponse {
  count: number;
  items: SubscriptionEvent[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationErrorResponse {
  message: 'Validation error';
  errors: ValidationError[];
}

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

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:  'Co miesiąc',
  yearly:   'Co rok',
  weekly:   'Co tydzień',
  one_time: 'Jednorazowo',
  custom:   'Niestandardowy',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending:  'Oczekująca',
  paid:     'Opłacona',
  overdue:  'Zaległa',
  canceled: 'Anulowana',
};
