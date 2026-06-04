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
  notes: string | null;
  status: SubscriptionStatus;
  isShared?: boolean;
  peopleCount?: number;
  includeInStats?: boolean;
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
  notes?: string;
  isShared?: boolean;
  peopleCount?: number;
  includeInStats?: boolean;
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
  notificationsEnabled?: boolean;
  defaultReminderDaysBefore?: number;
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

export interface DashboardTrendsItem {
  month: string;
  label?: string;
  amount: number;
}

export interface DashboardTrendsResponse {
  baseCurrency: string;
  type: 'planned' | 'real';
  months: number;
  items: DashboardTrendsItem[];
}

export interface DashboardActivityItem {
  id: string;
  type: 'created' | 'updated' | 'paid' | 'canceled';
  message: string;
  payload: any;
  createdAt: string;
  subscription: {
    id: string;
    name: string;
    provider: string | null;
    amount: number;
    currency: string;
    status: SubscriptionStatus;
    nextPaymentDate: string | null;
    lastPaymentDate: string | null;
    category: SubscriptionCategory;
    billingCycle: BillingCycle;
  };
}

export interface DashboardActivityResponse {
  count: number;
  limit: number;
  items: DashboardActivityItem[];
}

export interface HealthScoreResponse {
  score: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'risky';
  label: string;
  summary: string;
  baseCurrency: string;
  metrics: {
    monthlySubscriptionsTotal: number;
    monthlyIncome: number | null;
    incomeCurrency: string;
    freeAfterSubscriptions: number | null;
    subscriptionsIncomePercentage: number | null;
    activeSubscriptionsCount: number;
    trialsCount: number;
    overdueCount: number;
    trialsEndingSoonCount: number;
    upcomingPaymentsSoonCount: number;
  };
  factors: {
    type: 'positive' | 'negative' | 'neutral';
    code: string;
    title: string;
    description: string;
    impact: number;
  }[];
  recommendedActions: {
    type: string;
    title: string;
    description: string;
  }[];
}

export interface UserSettings {
  userId: string;
  baseCurrency: string;
  defaultReminderDaysBefore: number;
  notificationsEnabled: boolean;
  emailReportsEnabled: boolean;
  monthlyIncome: number | null;
  incomeCurrency: string | null;
  theme?: 'light' | 'dark' | 'system';
  updatedAt: string;
}

export interface PaymentHistoryItem {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  paidAt: string;
  previousNextPaymentDate: string | null;
  nextPaymentDateAfter: string | null;
  createdAt: string;
}

export interface SubscriptionPaymentsResponse {
  count: number;
  items: PaymentHistoryItem[];
}

export interface BudgetImpactResponse {
  baseCurrency: string;
  hasIncome: boolean;
  monthlyIncome: number | null;
  incomeCurrency: string;
  monthlySubscriptionsTotal: number;
  freeAfterSubscriptions: number | null;
  subscriptionsIncomePercentage: number | null;
}

export interface NotificationPreviewItem {
  id: string;
  name: string;
  provider: string | null;
  title: string;
  body: string;
  nextPaymentDate: string;
  reminderDaysBefore: number;
  remindAt: string;
  daysUntilReminder: number;
  daysUntilPayment: number;
  shouldNotifyNow: boolean;
  status: SubscriptionStatus;
}

export interface NotificationPreviewResponse {
  notificationsEnabled: boolean;
  defaultReminderDaysBefore: number;
  count: number;
  nextReminder: NotificationPreviewItem | null;
  items: NotificationPreviewItem[];
}

export type EmailScanProvider = 'gmail' | 'imap';
export type DetectedSubscriptionStatus = 'pending' | 'accepted' | 'ignored' | 'duplicate';

export interface EmailScanStatusResponse {
  gmailConnected: boolean;
  connectionsCount: number;
  lastScanAt: string | null;
  pendingDetectionsCount: number;
  acceptedDetectionsCount: number;
  ignoredDetectionsCount: number;
  duplicateDetectionsCount: number;
}

export interface GmailAuthUrlResponse {
  authUrl: string;
  redirectMode?: string;
  redirectUriHost?: string | null;
}

export interface GmailScanRequest {
  connectionId?: string;
  limit?: number;
  sinceDays?: number;
  scanProfile?: 'fast' | 'adaptive' | 'balanced' | 'deep';
  debug?: boolean;
  dryRun?: boolean;
}

export interface GmailScanQuerySummary {
  name: string;
  gmailResults: number;
  analyzed: number;
  candidates: number;
}

export interface GmailScanResponse {
  connection: {
    id: string;
    email: string;
    provider: EmailScanProvider;
    lastScanAt: string | null;
  };
  scannedMessages: number;
  candidatesFound: number;
  createdDetections: number;
  skippedExisting: number;
  rejectedMessages: number;
  querySummaries: GmailScanQuerySummary[];
  created: DetectedSubscription[];
  productResult?: EmailScanProductResult;
  scanProfile?: string;
  effectiveScanMode?: string;
  effectiveWindowDays?: number;
  scanReliabilityLevel?: 'low' | 'medium' | 'high' | string;
  scanReliabilityReasons?: string[];
  deepScanAvailable?: boolean;
  deepScanRecommended?: boolean;
  deepScanReason?: string | null;
  quickScanLikelyIncomplete?: boolean;
  userFacingCoverageNote?: string | null;
  message: string;
}

export type EmailScanProfile = 'fast' | 'adaptive' | 'balanced' | 'deep';

export interface ImapScanRequest {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  mailbox?: string;
  profile?: EmailScanProfile;
  limit?: number;
  sinceDays?: number;
  debug?: boolean;
  includeDebug?: boolean;
}

export interface ImapScanResponse {
  connection?: {
    id?: string;
    email?: string;
    provider?: EmailScanProvider | string;
    lastScanAt?: string | null;
    mailbox?: string | null;
  };
  scannedMessages?: number;
  candidatesFound?: number;
  createdDetections?: number;
  skippedExisting?: number;
  rejectedMessages?: number;
  productResult?: EmailScanProductResult;
  scanProfile?: string;
  effectiveScanMode?: string;
  effectiveWindowDays?: number;
  scanReliabilityLevel?: 'low' | 'medium' | 'high' | string;
  scanReliabilityReasons?: string[];
  deepScanAvailable?: boolean;
  deepScanRecommended?: boolean;
  deepScanReason?: string | null;
  quickScanLikelyIncomplete?: boolean;
  userFacingCoverageNote?: string | null;
  message?: string;
  [key: string]: unknown;
}

export interface EmailScanImportSelection {
  key: string;
  bucket: 'current' | 'review' | 'history' | 'price' | 'bill' | string;
  action?: string;
  item: EmailScanProductItem;
}

export interface EmailScanImportPreviewItemWrapper {
  selected?: boolean;
  bucket?: string;
  action?: string;
  item?: EmailScanProductItem;
  productItem?: EmailScanProductItem;
  sourceItem?: EmailScanProductItem;
  originalItem?: EmailScanProductItem;
  product?: EmailScanProductItem;
  data?: EmailScanProductItem;
  [key: string]: unknown;
}

export interface EmailScanImportPreviewRequest {
  sourceProvider?: EmailScanProvider | string;
  items: Array<EmailScanProductItem | EmailScanImportPreviewItemWrapper>;
  selections?: EmailScanImportSelection[];
}

export interface EmailScanImportPreviewResponse {
  count?: number;
  items?: EmailScanImportDraft[];
  drafts?: EmailScanImportDraft[];
  subscriptions?: EmailScanImportDraft[];
  warnings?: string[];
  message?: string;
  [key: string]: unknown;
}

export interface EmailScanImportDraftPayload {
  id?: string | null;
  sourceItemId?: string | null;
  itemSelectionKey?: string | null;
  name?: string | null;
  displayName?: string | null;
  provider?: string | null;
  amount?: number | string | null;
  monthlyAmount?: number | string | null;
  price?: number | string | null;
  currency?: string | null;
  category?: SubscriptionCategory | string | null;
  categoryLabel?: string | null;
  billingCycle?: BillingCycle | string | null;
  nextPaymentDate?: string | null;
  isRecurringBill?: boolean;
  notes?: string | null;
  evidenceSnippet?: string | null;
  [key: string]: unknown;
}

export interface EmailScanImportDraft {
  sourceItemId?: string;
  recommendedAction?: string;
  action?: string;
  type?: string;
  draft?: EmailScanImportDraftPayload;
  subscription?: EmailScanImportDraftPayload;
  [key: string]: unknown;
}

export interface EmailScanImportConfirmRequest {
  drafts: EmailScanImportDraft[];
}

export interface EmailScanImportConfirmResponse {
  created?: Array<{
    sourceItemId?: string;
    subscriptionId?: string;
    name?: string;
    provider?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    billingCycle?: BillingCycle | string | null;
    category?: SubscriptionCategory | string | null;
    status?: SubscriptionStatus | string | null;
    isRecurringBill?: boolean;
    nextPaymentDate?: string | null;
    createdAt?: string | null;
    visibilityHint?: string | null;
    [key: string]: unknown;
  }>;
  skipped?: Array<{
    sourceItemId?: string;
    name?: string;
    provider?: string | null;
    reason?: string;
    missingFields?: string[];
    visibilityHint?: string | null;
    userMessage?: string | null;
    [key: string]: unknown;
  }>;
  warnings?: string[];
  summary?: {
    requested?: number;
    created?: number;
    skipped?: number;
    [key: string]: unknown;
  };
  message?: string;
  refreshHints?: {
    invalidateQueries?: string[];
    createdSubscriptionIds?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type EmailScanPrimaryAction =
  | 'confirm_still_active'
  | 'review_price_change'
  | 'review_old_bill'
  | 'ignore'
  | string;

export interface EmailScanProductItem {
  id?: string;
  sourceItemId?: string;
  itemSelectionKey?: string;
  sourceMessageId?: string;
  displayName?: string | null;
  provider?: string | null;
  name?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  status?: string | null;
  primaryAction?: EmailScanPrimaryAction;
  primaryActionLabel?: string | null;
  action?: EmailScanPrimaryAction;
  productBucket?: string | null;
  productBucketLabel?: string | null;
  amountKind?: string | null;
  amountKindLabel?: string | null;
  recommendedSelected?: boolean;
  selectionReason?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  billingCycle?: BillingCycle | string | null;
  billingChannel?: string | null;
  promoAmount?: number | string | null;
  futureAmount?: number | string | null;
  currentAmount?: number | string | null;
  newAmount?: number | string | null;
  lastEvidenceAt?: string | null;
  evidenceDate?: string | null;
  evidenceSnippet?: string | null;
  confidence?: number | null;
  [key: string]: unknown;
}

export interface EmailScanProductResult {
  currentSubscriptions: EmailScanProductItem[];
  needsReviewSubscriptions: EmailScanProductItem[];
  historicalSubscriptions: EmailScanProductItem[];
  priceChanges: EmailScanProductItem[];
  billsOrUtilities: EmailScanProductItem[];
  scanSummary: {
    recommendedDefaultMode?: 'current' | 'review' | 'history' | 'empty' | string;
    recommendedUserMessage?: string | null;
    hasCurrentSubscriptions?: boolean;
    hasOnlyHistoricalEvidence?: boolean;
    hasPriceChanges?: boolean;
    hasBillsOrUtilities?: boolean;
    scanReliabilityLevel?: 'low' | 'medium' | 'high' | string;
    deepScanRecommended?: boolean;
    quickScanLikelyIncomplete?: boolean;
    userFacingCoverageNote?: string | null;
    deepScanReason?: string | null;
    profileRequested?: string | null;
    profileEffective?: string | null;
    profileNormalized?: boolean;
    profileNormalizationReason?: string | null;
  };
}

export interface DetectedSubscription {
  id: string;
  sourceProvider: EmailScanProvider;
  sourceMessageId: string;
  provider: string | null;
  name: string | null;
  amount: number | null;
  currency: string | null;
  billingCycle: BillingCycle | null;
  nextPaymentDate: string | null;
  trialEndDate: string | null;
  isTrial: boolean;
  category: SubscriptionCategory | null;
  confidence: number;
  status: DetectedSubscriptionStatus;
  evidenceSnippet: string | null;
  acceptedSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDetectionsResponse {
  count: number;
  limit: number;
  offset: number;
  items: DetectedSubscription[];
}

export interface GetEmailDetectionsParams {
  status?: DetectedSubscriptionStatus;
  limit?: number;
  offset?: number;
}

export interface AcceptDetectedSubscriptionPayload {
  amount?: number;
  currency?: string;
  category?: SubscriptionCategory;
  billingCycle?: BillingCycle;
  nextPaymentDate?: string;
  paymentMethodLabel?: string;
  notes?: string;
}

export interface AcceptDetectedSubscriptionResponse {
  detection: {
    id: string;
    status: DetectedSubscriptionStatus;
    acceptedSubscriptionId: string | null;
  };
  subscription: Subscription;
  message: string;
}

export interface IgnoreDetectedSubscriptionResponse {
  id: string;
  status: DetectedSubscriptionStatus;
  message: string;
}
