import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  FlaskConical,
  History,
  Inbox,
  Mail,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldCheck,
  Tag,
  X,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { ApiError } from '../lib/apiClient';
import {
  useAcceptDetection,
  useEmailDetections,
  useEmailScanImportConfirm,
  useEmailScanImportPreview,
  useEmailScanStatus,
  useGmailAuthUrl,
  useIgnoreDetection,
  useRunGmailScan,
  useRunImapScan,
} from '../hooks/useEmailScan';
import type { AppStackParamList } from '../types/navigation';
import {
  BILLING_CYCLE_LABELS,
  BillingCycle,
  CATEGORY_LABELS,
  DetectedSubscription,
  EmailScanImportDraft,
  EmailScanImportDraftPayload,
  EmailScanImportPreviewResponse,
  EmailScanImportSelection,
  EmailScanProductItem,
  EmailScanProductResult,
  EmailScanProfile,
  GmailScanRequest,
  ImapScanRequest,
  ImapScanResponse,
  SubscriptionCategory,
} from '../types/api';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { formatInputDate, parseAppDate } from '../utils/date';
import { goBackOrDashboard } from '../utils/navigation';

const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'];

const CATEGORY_OPTIONS: { id: SubscriptionCategory; label: string }[] = [
  'entertainment',
  'productivity',
  'utilities',
  'finance',
  'health',
  'education',
  'shopping',
  'transport',
  'other',
].map((id) => ({ id: id as SubscriptionCategory, label: CATEGORY_LABELS[id as SubscriptionCategory] }));

const CYCLE_OPTIONS: { id: BillingCycle; label: string }[] = [
  { id: 'monthly', label: 'Miesięcznie' },
  { id: 'yearly', label: 'Rocznie' },
  { id: 'weekly', label: 'Tygodniowo' },
  { id: 'custom', label: 'Inny' },
];

const IMAP_FIXED_PROFILE: EmailScanProfile = 'fast';

type ImapProviderPreset = {
  id: 'onet' | 'interia';
  label: string;
  reliability: 'medium' | 'high';
  note: string;
  host: string;
  port: string;
  secure: boolean;
  mailbox: string;
};

const IMAP_PROVIDER_PRESETS: ImapProviderPreset[] = [
  {
    id: 'onet',
    label: 'Onet',
    reliability: 'medium',
    note: 'Szybki start i grupowanie po czasie',
    host: 'imap.poczta.onet.pl',
    port: '993',
    secure: true,
    mailbox: 'INBOX',
  },
  {
    id: 'interia',
    label: 'Interia',
    reliability: 'high',
    note: 'Celowane szukanie w treści',
    host: 'poczta.interia.pl',
    port: '993',
    secure: true,
    mailbox: 'INBOX',
  },
];

const DEFAULT_IMAP_PRESET = IMAP_PROVIDER_PRESETS[0];

type ProductBucket = 'current' | 'review' | 'history' | 'price' | 'bill';
type EmailScanWizardStep = 'source' | 'scan' | 'review' | 'preview';

type ProductSectionDefinition = {
  bucket: ProductBucket;
  label: string;
  title: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  items: EmailScanProductItem[];
};

type ProductEntrySectionDefinition = {
  id: 'recommended' | 'review' | 'price' | 'bill';
  title: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  entries: EmailScanImportSelection[];
};

const EMAIL_SCAN_WIZARD_STEPS: {
  id: EmailScanWizardStep;
  label: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { id: 'source', label: 'Źródło', caption: 'Wybór skrzynki', icon: Mail },
  { id: 'scan', label: 'Skan', caption: 'Bez zapisu', icon: Search },
  { id: 'review', label: 'Sprawdź wyniki', caption: 'Selekcja', icon: ShieldCheck },
  { id: 'preview', label: 'Podgląd', caption: 'Przed zapisem', icon: FileText },
];

type SelectedProductReview = {
  item: EmailScanProductItem;
  bucket: ProductBucket;
  key: string;
} | null;

type ScanDiagnostics = {
  scanReliabilityLevel?: string;
  deepScanRecommended?: boolean;
  quickScanLikelyIncomplete?: boolean;
  userFacingCoverageNote?: string | null;
  deepScanReason?: string | null;
};

const PRODUCT_DECISION_LABELS: Record<string, string> = {
  'nadal aktywne': 'Nadal aktywne',
  anulowane: 'Anulowane',
  'nie subskrypcja': 'Nie subskrypcja',
  sprawdzone: 'Sprawdzone',
  ignoruj: 'Zignorowane',
  'przypomnij później': 'Później',
  active_candidate: 'Aktywna kandydatura',
  bill_candidate: 'Kandydat na rachunek',
  canceled: 'Anulowane',
  confirm_manually: 'Potwierdź ręcznie',
  confirm_still_active: 'Potwierdź, czy nadal aktywna',
  low_evidence_needs_review: 'Słaby dowód',
  manual_review: 'Ręczna weryfikacja',
  needs_review: 'Do sprawdzenia',
  not_subscription: 'Nie subskrypcja',
  payment_processor_needs_review: 'Operator płatności',
  possible_subscription: 'Możliwa subskrypcja',
  price_change: 'Zmiana ceny',
  review_price_change: 'Sprawdź zmianę ceny',
  review_old_bill: 'Sprawdź rachunek',
  review_bill: 'Sprawdź rachunek',
  review_later: 'Sprawdź później',
  stale_needs_review: 'Historyczny dowód',
  create_subscription: 'Utwórz subskrypcję',
  show_as_active: 'Dodaj jako aktywną',
  create_bill: 'Dodaj rachunek',
  ignore: 'Pomiń',
  review: 'Sprawdź',
};

const PRODUCT_BUCKET_LABELS: Record<ProductBucket, string> = {
  current: 'aktywne subskrypcje',
  review: 'do sprawdzenia',
  history: 'historia',
  price: 'zmiany cen',
  bill: 'rachunki cykliczne',
};

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  ai_tools: 'Narzędzia AI',
  app_store: 'Sklep z aplikacjami',
  apple_app_store: 'Apple App Store',
  banking_finance: 'Finanse',
  billsOrUtilities: 'Rachunki cykliczne',
  cloud_storage: 'Chmura',
  currentSubscriptions: 'Aktywne subskrypcje',
  delivery_membership: 'Dostawy / membership',
  ecommerce_membership: 'Membership zakupowy',
  gaming: 'Gry',
  google_play: 'Google Play',
  internet_isp: 'Internet',
  needsReviewSubscriptions: 'Do sprawdzenia',
  online_payments: 'Płatności online',
  payment_processor: 'Operator płatności',
  priceChanges: 'Zmiany cen',
  software_saas: 'Software / SaaS',
  subscription_marketplace: 'Marketplace subskrypcji',
  telecom_mobile: 'Telefon',
  streaming_video: 'Streaming wideo',
  utilities: 'Rachunki',
  utilities_energy: 'Energia',
};

const ERROR_CODE_MESSAGES: Record<string, string> = {
  IMAP_AUTH_FAILED:
    'Nie udało się zalogować do skrzynki IMAP. Sprawdź pełny adres e-mail, hasło albo hasło aplikacji. Dla Onetu i Interii zwykle potrzebne jest hasło aplikacji lub włączony dostęp IMAP.',
  IMAP_CONNECTION_TIMEOUT:
    'Połączenie IMAP trwało zbyt długo. Spróbuj ponownie albo sprawdź host, port 993 i SSL.',
  IMAP_SCAN_TIMEOUT:
    'Skan IMAP przekroczył limit czasu. Skrzynka może odpowiadać wolno, więc ponów próbę za chwilę.',
  IMAP_CONNECTION_FAILED:
    'Nie udało się połączyć ze skrzynką. Sprawdź serwer, port i ustawienia SSL.',
  IMAP_MAILBOX_NOT_FOUND:
    'Nie znaleziono wybranego folderu poczty. Sprawdź nazwę folderu albo zostaw INBOX.',
  GMAIL_OAUTH_NOT_CONNECTED:
    'Gmail nie jest jeszcze połączony. Otwórz autoryzację Google, wróć do aplikacji i odśwież status połączenia.',
  GMAIL_OAUTH_CALLBACK_FAILED:
    'Google nie zakończył autoryzacji. Spróbuj połączyć Gmaila ponownie albo użyj skanu IMAP.',
  GMAIL_AUTH_URL_FAILED:
    'Nie udało się przygotować linku logowania Google. Spróbuj ponownie za chwilę.',
  GMAIL_CONNECTION_NOT_FOUND:
    'Połącz konto Gmail, aby uruchomić skanowanie.',
  GMAIL_REAUTH_REQUIRED:
    'Połączenie z Gmail wygasło. Połącz Gmail ponownie.',
  GMAIL_REFRESH_FAILED:
    'Nie udało się odświeżyć dostępu do Gmail. Połącz konto ponownie.',
  AUTH_REQUIRED:
    'Zaloguj się ponownie, aby kontynuować.',
  VALIDATION_ERROR:
    'Sprawdź formularz i uzupełnij wymagane pola.',
  INTERNAL_SERVER_ERROR:
    'Wystąpił błąd serwera. Spróbuj ponownie za chwilę.',
};

function humanizeBackendValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;

  const raw = String(value).trim();
  const known = PRODUCT_CATEGORY_LABELS[raw] || PRODUCT_DECISION_LABELS[raw];
  if (known) return known;

  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
}

function getProductBucketLabel(bucket: ProductBucket | string | undefined) {
  if (!bucket) return 'pozycja';
  return PRODUCT_BUCKET_LABELS[bucket as ProductBucket] || humanizeBackendValue(bucket) || 'pozycja';
}

function getProductCategoryLabel(category: unknown) {
  if (!category) return null;

  const key = String(category);
  return PRODUCT_CATEGORY_LABELS[key] ||
    CATEGORY_LABELS[key as SubscriptionCategory] ||
    humanizeBackendValue(key);
}

function getBillingChannelLabel(channel: unknown) {
  if (!channel) return null;
  return PRODUCT_CATEGORY_LABELS[String(channel)] || humanizeBackendValue(channel);
}

function getFriendlyScanNote(note?: string | null) {
  if (!note) return null;

  const normalized = note.toLowerCase();
  if (normalized.includes('recent active subscription') || normalized.includes('bill evidence')) {
    return 'Znaleziono świeży dowód aktywnej subskrypcji albo rachunku.';
  }

  if (normalized.includes('historical') || normalized.includes('old bill')) {
    return 'Część wyników wymaga potwierdzenia, bo dowody są historyczne.';
  }

  if (normalized.includes('quick scan')) {
    return 'Skan może być niepełny. Możesz ponowić skan skrzynki za chwilę.';
  }

  return note;
}

function getErrorCode(error: unknown) {
  if (error instanceof ApiError) {
    const body = error.body as any;
    return body?.code || body?.errorCode || body?.error?.code || null;
  }

  return null;
}

function getApiUserMessage(error: unknown) {
  if (!(error instanceof ApiError)) return null;

  const body = error.body as any;
  const userMessage = body?.userMessage || body?.error?.userMessage;

  return typeof userMessage === 'string' && userMessage.trim() ? userMessage.trim() : null;
}

function getEmailScanErrorMessage(error: unknown, source: 'gmail' | 'imap' | 'preview', showTechnical = false) {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const userMessage = getApiUserMessage(error);
  const code = getErrorCode(error);
  const status = error instanceof ApiError ? error.status : undefined;
  const text = `${rawMessage} ${code || ''}`.toLowerCase();
  const normalizedCode = typeof code === 'string' ? code.toUpperCase() : null;

  let message = userMessage || rawMessage || 'Nie udało się wykonać operacji.';

  if (userMessage) {
    message = userMessage;
  } else if (normalizedCode && ERROR_CODE_MESSAGES[normalizedCode]) {
    message = ERROR_CODE_MESSAGES[normalizedCode];
  } else if (status === 401 || status === 403 || text.includes('unauthorized') || text.includes('jwt')) {
    message = 'Sesja wygasła. Zaloguj się ponownie i uruchom skan jeszcze raz.';
  } else if (status === 408 || status === 504 || text.includes('timeout') || text.includes('abort') || text.includes('timed out')) {
    message = source === 'imap'
      ? 'Skan IMAP trwał zbyt długo. Sprawdź port 993/SSL albo ponów próbę za chwilę.'
      : 'Serwer nie odpowiedział na czas. Spróbuj ponownie za chwilę.';
  } else if (text.includes('network request failed') || text.includes('failed to fetch') || text.includes('brak polaczenia') || text.includes('brak połączenia')) {
    message = 'Nie udało się połączyć z serwerem. Sprawdź Wi-Fi i spróbuj ponownie.';
  } else if (text.includes('validation') || status === 400) {
    message = 'Sprawdź wymagane pola formularza i spróbuj ponownie.';
  } else if (source === 'gmail' && (text.includes('oauth') || text.includes('google') || text.includes('redirect'))) {
    message = 'Autoryzacja Gmaila nie zakończyła się poprawnie. Spróbuj połączyć Gmaila ponownie.';
  } else if (
    normalizedCode === 'IMAP_AUTH_FAILED' ||
    text.includes('credential') ||
    text.includes('password') ||
    text.includes('auth') ||
    text.includes('login') ||
    text.includes('imap')
  ) {
    message = 'Nie udało się połączyć ze skrzynką. Sprawdź login, hasło lub użyj hasła aplikacji.';
  } else if (text.includes('host') || text.includes('port') || text.includes('enotfound') || text.includes('econnrefused')) {
    message = 'Nie udało się połączyć z serwerem poczty. Sprawdź host, port i SSL.';
  } else if (status && status >= 500) {
    message = source === 'imap'
      ? 'Poczta albo serwer chwilowo nie odpowiedział. Spróbuj ponownie za moment.'
      : 'Serwer zgłosił problem po swojej stronie. Spróbuj ponownie za moment.';
  }

  if (showTechnical && code) {
    return `${message}\n\nKod techniczny: ${code}`;
  }

  return message;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Jeszcze nie skanowano';
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string | null) {
  const parsed = parseAppDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toInputDate(date: Date) {
  return formatInputDate(date);
}

function safeDate(value: string | null | undefined) {
  return parseAppDate(value) || new Date();
}

function getProductItemTitle(item: EmailScanProductItem) {
  return item.displayName || item.name || item.provider || item.billingChannel || 'Znalezione do sprawdzenia';
}

function getProductItemAction(item: EmailScanProductItem) {
  return item.primaryAction || item.action || 'review';
}

function getProductItemDedupeKey(item: EmailScanProductItem, bucket: string) {
  if (item.id || item.sourceMessageId) return `${bucket}-${item.id || item.sourceMessageId}`;

  const title = getProductItemTitle(item).trim().toLowerCase();
  const amount = String(item.amount || item.currentAmount || item.newAmount || item.promoAmount || item.futureAmount || '').trim().toLowerCase();
  const category = String(item.category || '').trim().toLowerCase();
  const channel = String(item.billingChannel || '').trim().toLowerCase();

  return `${bucket}-${title}-${category}-${channel}-${amount}`;
}

function dedupeProductItems(items: unknown, bucket: string): EmailScanProductItem[] {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getProductItemDedupeKey(item as EmailScanProductItem, bucket);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as EmailScanProductItem[];
}

function formatMaybeAmount(value: unknown, currency?: string | null) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return `${value.toFixed(2)} ${currency || ''}`.trim();
  return String(value);
}

function formatProductDate(item: EmailScanProductItem) {
  return formatDate(item.lastEvidenceAt || item.evidenceDate || null);
}

function getDecisionLabel(action: string | undefined) {
  if (!action) return null;
  return PRODUCT_DECISION_LABELS[action] || humanizeBackendValue(action);
}

function getBillingCycleLabel(cycle: unknown) {
  if (!cycle) return null;
  const key = String(cycle) as BillingCycle;
  return BILLING_CYCLE_LABELS[key] || humanizeBackendValue(cycle);
}

function getScanReliabilityLabel(level?: string | null) {
  switch (level) {
    case 'low':
      return 'niska';
    case 'medium':
      return 'średnia';
    case 'high':
      return 'wysoka';
    default:
      return humanizeBackendValue(level);
  }
}

function getPreviewDraftPayload(rawDraft: EmailScanImportDraft): EmailScanImportDraftPayload {
  const payload = rawDraft.draft || rawDraft.subscription || rawDraft;
  return payload as EmailScanImportDraftPayload;
}

function getPreviewDraftsFromResult(result: EmailScanImportPreviewResponse | null): EmailScanImportDraft[] {
  if (!result) return [];

  const preferredSource = Array.isArray(result.drafts) && result.drafts.length > 0
    ? result.drafts
    : Array.isArray(result.items) && result.items.length > 0
      ? result.items
      : Array.isArray(result.subscriptions)
        ? result.subscriptions
        : [];

  return preferredSource as EmailScanImportDraft[];
}

function getPreviewDraftKey(rawDraft: EmailScanImportDraft, index: number) {
  const payload = getPreviewDraftPayload(rawDraft);
  const stable = rawDraft.sourceItemId ||
    payload.sourceItemId ||
    payload.itemSelectionKey ||
    payload.id ||
    payload.name ||
    payload.provider;

  if (stable) return `draft-${String(stable)}`;

  return `draft-${index}`;
}

function getPreviewDraftTitle(rawDraft: EmailScanImportDraft, index: number) {
  const payload = getPreviewDraftPayload(rawDraft);
  return payload.displayName || payload.name || payload.provider || `Pozycja ${index + 1}`;
}

function getPreviewDraftAmount(rawDraft: EmailScanImportDraft) {
  const payload = getPreviewDraftPayload(rawDraft);
  return payload.amount ?? payload.monthlyAmount ?? payload.price ?? null;
}

function formatEditableAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace('.', ',');
}

function parseEditableAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return undefined;

  const match = normalized.match(/\d+(?:\.\d+)?/);
  const parsed = Number(match?.[0] ?? normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildPreviewDraftEdits(result: EmailScanImportPreviewResponse | null) {
  return getPreviewDraftsFromResult(result).reduce<Record<string, { selected: boolean; amount: string; currency: string }>>((acc, draft, index) => {
    const payload = getPreviewDraftPayload(draft);
    const key = getPreviewDraftKey(draft, index);

    acc[key] = {
      selected: true,
      amount: formatEditableAmount(getPreviewDraftAmount(draft)),
      currency: payload.currency || 'PLN',
    };

    return acc;
  }, {});
}

function applyPreviewDraftEdit(rawDraft: EmailScanImportDraft, edit?: { amount: string; currency: string }) {
  if (!edit) return rawDraft;

  const payload = getPreviewDraftPayload(rawDraft);
  const editedPayload: EmailScanImportDraftPayload = {
    ...payload,
    amount: parseEditableAmount(edit.amount),
    currency: edit.currency.trim() || payload.currency || 'PLN',
  };

  if (rawDraft.draft) {
    return { ...rawDraft, draft: editedPayload };
  }

  if (rawDraft.subscription) {
    return { ...rawDraft, subscription: editedPayload };
  }

  return { ...rawDraft, ...editedPayload };
}

function getScanModeLabel(mode?: string | null) {
  switch (mode) {
    case 'review':
      return 'Do sprawdzenia';
    case 'current':
      return 'Aktywne';
    case 'empty':
      return 'Brak wyników';
    case 'history':
      return 'Historia';
    default:
      return 'Wynik skanu';
  }
}

function getProductResultFromScan(scanResult: unknown): EmailScanProductResult | null {
  const productResult = (scanResult as any)?.productResult;
  if (!productResult) return null;

  return {
    currentSubscriptions: dedupeProductItems(productResult.currentSubscriptions, 'current'),
    needsReviewSubscriptions: dedupeProductItems(productResult.needsReviewSubscriptions, 'review'),
    historicalSubscriptions: dedupeProductItems(productResult.historicalSubscriptions, 'history'),
    priceChanges: dedupeProductItems(productResult.priceChanges, 'price'),
    billsOrUtilities: dedupeProductItems(productResult.billsOrUtilities, 'bill'),
    scanSummary: productResult.scanSummary || {},
  };
}

function getScanDiagnosticsFromScan(scanResult: unknown): ScanDiagnostics {
  const result = scanResult as any;
  const scanSummary = result?.productResult?.scanSummary || result?.scanSummary || {};

  return {
    scanReliabilityLevel: result?.scanReliabilityLevel ?? scanSummary?.scanReliabilityLevel,
    deepScanRecommended: Boolean(result?.deepScanRecommended ?? scanSummary?.deepScanRecommended),
    quickScanLikelyIncomplete: Boolean(result?.quickScanLikelyIncomplete ?? scanSummary?.quickScanLikelyIncomplete),
    userFacingCoverageNote: result?.userFacingCoverageNote ?? scanSummary?.userFacingCoverageNote ?? scanSummary?.recommendedUserMessage,
    deepScanReason: result?.deepScanReason ?? scanSummary?.deepScanReason ?? null,
  };
}

function getAuthUrlParam(authUrl: string, paramName: string) {
  const escapedName = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = authUrl.match(new RegExp(`[?&]${escapedName}=([^&]+)`));

  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1].replace(/\+/g, ' '));
  } catch {
    return match[1];
  }
}

function hasNativeLocalRedirect(authUrl: string) {
  if (Platform.OS === 'web') return false;

  const redirectUri = getAuthUrlParam(authUrl, 'redirect_uri');
  return !!redirectUri && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(redirectUri);
}

const ONET_PRODUCT_RESULT_DEMO: EmailScanProductResult = {
  currentSubscriptions: [],
  needsReviewSubscriptions: [
    {
      id: 'demo-uber-one',
      provider: 'Uber One',
      name: 'Uber One',
      category: 'delivery_membership',
      status: 'stale_needs_review',
      primaryAction: 'confirm_still_active',
      lastEvidenceAt: '2025-03-23T10:00:00.000Z',
      evidenceSnippet: 'Znaleziono historyczne dowody membershipu Uber One oraz płatności/invoice. Potwierdź, czy usługa nadal jest aktywna.',
    },
    {
      id: 'demo-max',
      provider: 'Max',
      name: 'Max',
      category: 'streaming_video',
      amount: '29,99 zł',
      status: 'stale_needs_review',
      primaryAction: 'confirm_still_active',
      evidenceSnippet: 'Historyczny dowód subskrypcji Max z kwotą 29,99 zł. Brak świeżej płatności w ostatnim oknie skanu.',
    },
    {
      id: 'demo-skyshowtime',
      provider: 'SkyShowtime',
      name: 'SkyShowtime on Prime Video',
      category: 'streaming_video',
      billingChannel: 'Prime Video',
      promoAmount: '4,00 zł',
      futureAmount: '24,99 zł',
      status: 'stale_needs_review',
      primaryAction: 'confirm_still_active',
      evidenceSnippet: 'Subskrypcja marketplace-billed przez Prime Video. Wykryto cenę promocyjną i przyszłą cenę po okresie promocji.',
    },
    {
      id: 'demo-adobe',
      provider: 'Adobe',
      name: 'Adobe Acrobat Pro',
      category: 'software_saas',
      amount: '36,89 zł brutto',
      status: 'stale_needs_review',
      primaryAction: 'confirm_still_active',
      evidenceSnippet: 'Historyczny dowód płatności Adobe Acrobat Pro. Wymaga potwierdzenia, czy plan nadal jest aktywny.',
    },
  ],
  historicalSubscriptions: [],
  priceChanges: [
    {
      id: 'demo-amazon-price',
      provider: 'Amazon',
      name: 'Amazon Prime',
      category: 'ecommerce_membership',
      currentAmount: '49,00 zł/rok',
      newAmount: '69,00 zł/rok',
      primaryAction: 'review_price_change',
      evidenceSnippet: 'Wykryto notice o zmianie ceny Amazon Prime z 49 zł rocznie na 69 zł rocznie.',
    },
  ],
  billsOrUtilities: [
    {
      id: 'demo-tauron',
      provider: 'Tauron',
      name: 'Tauron',
      category: 'utilities_energy',
      amount: '216.39 zł',
      primaryAction: 'review_old_bill',
      evidenceSnippet: 'Wykryto rachunek za energię. To formalny rachunek, więc pokazujemy go osobno od subskrypcji.',
    },
  ],
  scanSummary: {
    recommendedDefaultMode: 'review',
    hasCurrentSubscriptions: false,
    hasOnlyHistoricalEvidence: true,
    hasPriceChanges: true,
    hasBillsOrUtilities: true,
    recommendedUserMessage: 'Znaleźliśmy historyczne dowody subskrypcji i notice o zmianie ceny, ale nie znaleźliśmy świeżych płatności aktywnych subskrypcji. Potwierdź, które usługi nadal są aktywne.',
  },
};

export const EmailScanScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'EmailScan'>>();
  const { theme } = useTheme();
  const statusQuery = useEmailScanStatus();
  const detectionsQuery = useEmailDetections('pending', 20, 0);
  const authUrlMutation = useGmailAuthUrl();
  const scanMutation = useRunGmailScan();
  const imapScanMutation = useRunImapScan();
  const importPreviewMutation = useEmailScanImportPreview();
  const importConfirmMutation = useEmailScanImportConfirm();
  const ignoreMutation = useIgnoreDetection();
  const acceptMutation = useAcceptDetection();

  const [selectedDetection, setSelectedDetection] = useState<DetectedSubscription | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PLN');
  const [category, setCategory] = useState<SubscriptionCategory>('entertainment');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date());
  const [showNextPicker, setShowNextPicker] = useState(false);
  const [notes, setNotes] = useState('Import z Gmail Email Scan');
  const [submitted, setSubmitted] = useState(false);

  // Advanced scan helpers
  const [dryRunResults, setDryRunResults] = useState<DetectedSubscription[] | null>(null);
  const [lastScanProductResult, setLastScanProductResult] = useState<EmailScanProductResult | null>(null);
  const [lastScanDiagnostics, setLastScanDiagnostics] = useState<ScanDiagnostics | null>(null);
  const [selectedImportItems, setSelectedImportItems] = useState<Record<string, boolean>>({});
  const [selectedProductReview, setSelectedProductReview] = useState<SelectedProductReview>(null);
  const [wizardStep, setWizardStep] = useState<EmailScanWizardStep>('source');
  const [renderReviewContent, setRenderReviewContent] = useState(false);
  const [scanSource, setScanSource] = useState<'gmail' | 'imap'>('gmail');
  const [imapHost, setImapHost] = useState(DEFAULT_IMAP_PRESET.host);
  const [imapPort, setImapPort] = useState(DEFAULT_IMAP_PRESET.port);
  const [imapSecure, setImapSecure] = useState(DEFAULT_IMAP_PRESET.secure);
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapMailbox, setImapMailbox] = useState(DEFAULT_IMAP_PRESET.mailbox);
  const [importPreviewResult, setImportPreviewResult] = useState<EmailScanImportPreviewResponse | null>(null);
  const [previewDraftEdits, setPreviewDraftEdits] = useState<Record<string, { selected: boolean; amount: string; currency: string }>>({});

  const status = statusQuery.data;
  const detections = detectionsQuery.data?.items ?? [];
  const isRefreshing = statusQuery.isFetching || detectionsQuery.isFetching;
  const isConnected = !!status?.gmailConnected;
  const shouldShowProductResult = !!lastScanProductResult;
  const isAnyScanPending = scanMutation.isPending || imapScanMutation.isPending;
  const selectedImportCount = useMemo(
    () => Object.values(selectedImportItems).filter(Boolean).length,
    [selectedImportItems]
  );
  const canRunImapScan = imapHost.trim().length > 0 &&
    Number(imapPort) > 0 &&
    imapUsername.trim().length > 0 &&
    imapPassword.length > 0;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setRenderReviewContent(true);
    });

    return () => task.cancel?.();
  }, []);

  useEffect(() => {
    if (!selectedDetection) return;

    setAmount(selectedDetection.amount ? String(selectedDetection.amount) : '');
    setCurrency(selectedDetection.currency || 'PLN');
    setCategory(selectedDetection.category || 'entertainment');
    setCycle(selectedDetection.billingCycle || 'monthly');
    setNextPaymentDate(safeDate(selectedDetection.nextPaymentDate));
    setNotes('Import z Gmail Email Scan');
    setSubmitted(false);
  }, [selectedDetection]);

  useEffect(() => {
    if (scanSource !== 'gmail' || isConnected) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        statusQuery.refetch();
      }
    });

    return () => subscription.remove();
  }, [isConnected, scanSource, statusQuery]);

  const parsedAmount = useMemo(() => Number(amount.replace(',', '.')), [amount]);
  const canAccept = selectedDetection && parsedAmount > 0 && currency && category && cycle && nextPaymentDate;

  const refresh = () => {
    statusQuery.refetch();
    detectionsQuery.refetch();
  };

  const handleConnect = () => {
    if (authUrlMutation.isPending) return;

    authUrlMutation.mutate(undefined, {
      onSuccess: async ({ authUrl }) => {
        if (!authUrl) {
          Alert.alert('Nie udało się połączyć Gmaila', 'Nie udało się przygotować linku logowania Google. Spróbuj ponownie za chwilę albo użyj innej skrzynki.');
          return;
        }

        if (hasNativeLocalRedirect(authUrl)) {
          Alert.alert(
            'Niepoprawny redirect Gmaila',
            'Link logowania nie jest dostępny z telefonu. Spróbuj ponownie później albo użyj innej skrzynki.'
          );
          return;
        }

        try {
          await Linking.openURL(authUrl);
          setWizardStep('scan');
          Alert.alert(
            'Połącz Gmaila',
            'Po zgodzie Google wróć do aplikacji. Jeśli status nie zmieni się od razu, użyj odświeżenia w prawym górnym rogu.'
          );
        } catch {
          Alert.alert('Błąd', 'Nie udało się otworzyć strony autoryzacji Gmaila.');
        }
      },
      onError: (error: any) => {
        Alert.alert('Nie udało się połączyć Gmaila', getEmailScanErrorMessage(error, 'gmail'));
      },
    });
  };

  const handleScan = (overrides: Partial<GmailScanRequest> = {}) => {
    if (isAnyScanPending) return;

    if (!isConnected) {
      Alert.alert(
        'Najpierw połącz Gmaila',
        'Połącz Gmaila, wróć do aplikacji i odśwież status połączenia.'
      );
      return;
    }

    setScanSource('gmail');
    setWizardStep('scan');
    setDryRunResults(null);
    const payload: GmailScanRequest = {
      limit: 25,
      sinceDays: 365,
      dryRun: false,
      ...overrides
    };

    scanMutation.mutate(payload, {
      onSuccess: (result) => {
        const productResult = getProductResultFromScan(result);
        setLastScanProductResult(productResult);
        setLastScanDiagnostics(getScanDiagnosticsFromScan(result));
        setSelectedImportItems({});
        setImportPreviewResult(null);
        setPreviewDraftEdits({});
        setWizardStep('review');
        if (payload.dryRun) {
          setDryRunResults(result.created || []);
          Alert.alert(
            'Podgląd zakończony',
            `Znaleziono ${result.created?.length ?? 0} potencjalnych kandydatur (nie zapisano ich w bazie).`
          );
        } else {
          setDryRunResults(null);
          Alert.alert(
            'Skan zakończony',
            `Przeanalizowano ${result.scannedMessages} wiadomości. Nowe kandydatury: ${result.createdDetections}.`
          );
          refresh();
        }
      },
      onError: (error: any) => {
        Alert.alert('Nie udało się przeskanować Gmaila', getEmailScanErrorMessage(error, 'gmail'));
      },
    });
  };

  const applyImapPreset = (preset: ImapProviderPreset) => {
    setImapHost(preset.host);
    setImapPort(preset.port);
    setImapSecure(preset.secure);
    setImapMailbox(preset.mailbox);
  };

  const handleImapScan = () => {
    if (isAnyScanPending) return;

    if (!canRunImapScan) {
      Alert.alert(
        'Uzupełnij dane IMAP',
        'Podaj serwer poczty, port, login oraz hasło albo hasło aplikacji.'
      );
      return;
    }

    const payload: ImapScanRequest = {
      host: imapHost.trim(),
      port: Number(imapPort),
      secure: imapSecure,
      username: imapUsername.trim(),
      password: imapPassword,
      mailbox: imapMailbox.trim() || 'INBOX',
      profile: IMAP_FIXED_PROFILE,
      includeDebug: false,
    };

    if (__DEV__) {
      console.log('[EmailScan] IMAP scan request shape', {
        host: payload.host,
        port: payload.port,
        secure: payload.secure,
        mailbox: payload.mailbox,
        profile: payload.profile,
        usernamePresent: payload.username.length > 0,
        passwordPresent: payload.password.length > 0,
      });
    }

    setScanSource('imap');
    setWizardStep('scan');
    setDryRunResults(null);
    imapScanMutation.mutate(payload, {
      onSuccess: (result: ImapScanResponse) => {
        const productResult = getProductResultFromScan(result);
        setLastScanProductResult(productResult);
        setLastScanDiagnostics(getScanDiagnosticsFromScan(result));
        setSelectedImportItems({});
        setImportPreviewResult(null);
        setPreviewDraftEdits({});
        setWizardStep('review');
        Alert.alert(
          'Skan IMAP zakończony',
          result.message || `Przeanalizowano ${result.scannedMessages ?? 0} wiadomości.`
        );
      },
      onError: (error: any) => {
        Alert.alert(
          'Nie udało się przeskanować IMAP',
          getEmailScanErrorMessage(error, 'imap')
        );
      },
    });
  };

  const toggleImportSelection = (key: string) => {
    setImportPreviewResult(null);
    setPreviewDraftEdits({});
    setSelectedImportItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleImportPreview = (entries: EmailScanImportSelection[]) => {
    if (importPreviewMutation.isPending) return;

    const selections = entries.filter((entry) => selectedImportItems[entry.key]);
    const sourceProvider = scanSource === 'imap' ? 'imap' : 'gmail';
    const selectedItems = selections.map((entry) => ({
      selected: true,
      bucket: entry.bucket,
      action: entry.action || getProductItemAction(entry.item),
      item: entry.item,
    }));
    if (selections.length === 0) {
      Alert.alert('Wybierz pozycje', 'Zaznacz co najmniej jedną pozycję, żeby zobaczyć podgląd importu.');
      return;
    }

    if (__DEV__) {
      const firstItem = selectedItems[0] as any;
      const firstNestedItem =
        firstItem?.item ??
        firstItem?.productItem ??
        firstItem?.sourceItem ??
        firstItem?.originalItem ??
        firstItem?.product ??
        firstItem?.data ??
        {};
      const summary = selectedItems.reduce<Record<string, number>>((acc, entry) => {
        const key = `${entry.bucket}:${entry.action}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      console.log('[EmailScan] Import preview request shape', {
        endpoint: '/email-scan/import-preview',
        sourceProvider,
        itemCount: selectedItems.length,
        summary,
      });

      console.log('[EmailScan] Import preview payload debug', {
        endpoint: '/email-scan/import-preview',
        selectedCount: selectedItems.length,
        firstItemKeys: Object.keys(firstItem ?? {}),
        firstNestedItemKeys: Object.keys(firstNestedItem ?? {}),
        summary: selectedItems.map((entry: any) => {
          const nestedItem =
            entry?.item ??
            entry?.productItem ??
            entry?.sourceItem ??
            entry?.originalItem ??
            entry?.product ??
            entry?.data ??
            {};

          return {
            displayName: entry?.displayName ?? nestedItem?.displayName ?? nestedItem?.name ?? nestedItem?.provider,
            sourceItemId: entry?.sourceItemId ?? nestedItem?.sourceItemId ?? nestedItem?.id ?? nestedItem?.sourceMessageId,
            productBucket: entry?.productBucket ?? nestedItem?.productBucket ?? entry?.bucket,
            primaryAction: entry?.primaryAction ?? nestedItem?.primaryAction ?? entry?.action,
            selected: entry?.selected,
          };
        }),
      });
    }

    importPreviewMutation.mutate({
      sourceProvider,
      items: selectedItems,
      selections,
    }, {
      onSuccess: (result) => {
        if (__DEV__) {
          const previewDrafts = getPreviewDraftsFromResult(result);

          console.log('[EmailScan] Import preview response debug', {
            count: result.count ?? previewDrafts.length,
            draftCount: previewDrafts.length,
            sourceShape: result.sourceShape,
            previewDebug: result.previewDebug,
          });
        }

        setImportPreviewResult(result);
        setPreviewDraftEdits(buildPreviewDraftEdits(result));
        setWizardStep('preview');
      },
      onError: (error: any) => {
        if (__DEV__) {
          const body = error instanceof ApiError ? (error.body as any) : error?.body;
          const response = body?.error ?? body ?? {};

          console.log('[EmailScan] Import preview error response', {
            code: response?.code ?? error?.code,
            message: response?.message ?? error?.message,
            userMessage: response?.userMessage ?? body?.userMessage ?? error?.userMessage,
            errors: response?.errors ?? body?.errors,
            receivedKeys: response?.receivedKeys ?? body?.receivedKeys,
            sourceShape: response?.sourceShape ?? body?.sourceShape,
          });
        }

        Alert.alert(
          'Nie udało się przygotować podglądu',
          getEmailScanErrorMessage(error, 'preview')
        );
      },
    });
  };

  const handleShowDemoProductResult = () => {
    setDryRunResults(null);
    setLastScanProductResult(ONET_PRODUCT_RESULT_DEMO);
    setLastScanDiagnostics({
      scanReliabilityLevel: 'medium',
      deepScanRecommended: false,
      quickScanLikelyIncomplete: false,
      userFacingCoverageNote: 'Demo pokazuje bucketowy wynik skanu: historyczne subskrypcje do potwierdzenia, zmianę ceny i rachunek za usługę.',
      deepScanReason: null,
    });
    setSelectedImportItems({});
    setImportPreviewResult(null);
    setPreviewDraftEdits({});
    setSelectedProductReview(null);
    setWizardStep('review');
  };

  const handleImportConfirm = (drafts: EmailScanImportDraft[]) => {
    if (importConfirmMutation.isPending) return;

    const selectedDrafts = drafts
      .map((draft, index) => {
        const key = getPreviewDraftKey(draft, index);
        const edit = previewDraftEdits[key];

        return edit?.selected ? applyPreviewDraftEdit(draft, edit) : null;
      })
      .filter((draft): draft is EmailScanImportDraft => !!draft);

    if (selectedDrafts.length === 0) {
      Alert.alert('Wybierz pozycje', 'Zaznacz co najmniej jedną pozycję, żeby zapisać import.');
      return;
    }

    importConfirmMutation.mutate({ drafts: selectedDrafts }, {
      onSuccess: (result) => {
        const createdCount = result.summary?.created ?? result.created?.length ?? 0;
        const skippedCount = result.summary?.skipped ?? result.skipped?.length ?? 0;
        const createdNoun = createdCount === 1 ? 'pozycję' : createdCount >= 2 && createdCount <= 4 ? 'pozycje' : 'pozycji';
        const skippedText = skippedCount === 1
          ? '1 pozycja wymaga uzupełnienia danych.'
          : skippedCount >= 2 && skippedCount <= 4
            ? `${skippedCount} pozycje wymagają uzupełnienia danych.`
          : `${skippedCount} pozycji wymaga uzupełnienia danych.`;
        const createdLine = `Dodano ${createdCount} ${createdNoun}.`;
        const skippedLine = skippedCount > 0
          ? `\n${skippedText}`
          : '';
        const warnings = Array.isArray(result.warnings) && result.warnings.length > 0
          ? `\n\nUwagi: ${result.warnings.join(' ')}`
          : '';

        setImportPreviewResult(null);
        setPreviewDraftEdits({});
        setSelectedImportItems({});
        refresh();

        Alert.alert(
          'Import zakończony',
          `${createdLine}${skippedLine}${warnings}`
        );
      },
      onError: (error: any) => {
        Alert.alert('Nie udało się zapisać importu', getEmailScanErrorMessage(error, 'preview'));
      },
    });
  };

  const updatePreviewDraftEdit = (
    key: string,
    patch: Partial<{ selected: boolean; amount: string; currency: string }>
  ) => {
    setPreviewDraftEdits((current) => {
      const currentEdit = current[key] || { selected: true, amount: '', currency: 'PLN' };

      return {
        ...current,
        [key]: {
          ...currentEdit,
          ...patch,
        },
      };
    });
  };

  const handleIgnore = (detection: DetectedSubscription) => {
    Alert.alert(
      'Ignorować kandydaturę?',
      `${detection.name || detection.provider || 'Ta kandydatura'} nie zostanie dodana do subskrypcji.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Ignoruj',
          style: 'destructive',
          onPress: () => {
            ignoreMutation.mutate(detection.id, {
              onError: (error: any) => {
                Alert.alert('Błąd', error?.message || 'Nie udało się odłożyć tej pozycji.');
              },
            });
          },
        },
      ]
    );
  };

  const handleAccept = () => {
    setSubmitted(true);
    Keyboard.dismiss();
    if (!selectedDetection || !canAccept) return;

    acceptMutation.mutate({
      id: selectedDetection.id,
      payload: {
        amount: parsedAmount,
        currency,
        category,
        billingCycle: cycle,
        nextPaymentDate: toInputDate(nextPaymentDate),
        paymentMethodLabel: 'Gmail import',
        notes: notes.trim() || 'Import z Gmail Email Scan',
      },
    }, {
      onSuccess: () => {
        setSelectedDetection(null);
        Alert.alert('Dodano subskrypcję', 'Kandydatura została zaakceptowana i dodana do subskrypcji.');
      },
      onError: (error: any) => {
        if (error instanceof ApiError) {
          const body = error.body as any;
          if (body?.code === 'DETECTION_NEEDS_REVIEW') {
            Alert.alert('Uzupełnij dane', `Brakuje pól: ${(body.missingFields || []).join(', ')}`);
            return;
          }

          if (body?.code === 'DUPLICATE_SUBSCRIPTION') {
            Alert.alert(
              'Podobna subskrypcja już istnieje',
              body.duplicate?.name
                ? `${body.duplicate.name} jest już na liście subskrypcji.`
                : 'Znaleziono podobną subskrypcję.'
            );
            return;
          }
        }

        Alert.alert('Błąd', error?.message || 'Nie udało się dodać tej pozycji do subskrypcji.');
      },
    });
  };

  const renderPrivacyCopy = () => (
    <View style={styles.privacyBox}>
      <View style={styles.privacyHeader}>
        <ShieldCheck size={20} color={theme.colors.primary} />
        <Text style={styles.privacyTitle}>Prywatne skanowanie</Text>
      </View>
      <Text style={styles.privacyText}>Skanujemy tylko wiadomości wyglądające jak rachunki, triale, odnowienia lub subskrypcje.</Text>
      <Text style={styles.privacyText}>Nie zapisujemy pełnej treści maili i nie tworzymy subskrypcji automatycznie.</Text>
      <Text style={styles.privacyText}>To Ty zatwierdzasz, co ma zostać dodane.</Text>
    </View>
  );

  const renderImapConnectionCard = () => (
    <View style={styles.imapCard}>
      <View style={styles.imapHeader}>
        <View>
          <Text style={styles.cardTitle}>Inna skrzynka</Text>
          <Text style={styles.imapSubtitle}>Podaj serwer poczty, folder i dane logowania. Onet i Interia są obsługiwane w MVP.</Text>
        </View>
      </View>

      <View style={styles.imapPresetRow}>
        {IMAP_PROVIDER_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.imapPresetCard, { borderColor: `${theme.colors.primary}33`, backgroundColor: `${theme.colors.primary}10` }]}
            onPress={() => applyImapPreset(preset)}
            activeOpacity={0.84}
          >
            <View style={styles.imapPresetCardTop}>
              <Text style={[styles.imapPresetText, { color: theme.colors.primary }]}>{preset.label}</Text>
              <Text style={styles.imapReliabilityText}>{preset.reliability}</Text>
            </View>
            <Text style={styles.imapPresetNote}>{preset.note}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.imapGrid}>
        <View style={[styles.imapField, styles.imapFieldWide]}>
          <Text style={styles.label}>Host</Text>
          <TextInput
            style={styles.textInput}
            value={imapHost}
            onChangeText={setImapHost}
            placeholder="imap.example.com"
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.imapField}>
          <Text style={styles.label}>Port</Text>
          <TextInput
            style={styles.textInput}
            value={imapPort}
            onChangeText={setImapPort}
            keyboardType="number-pad"
            placeholder="993"
            placeholderTextColor={theme.colors.textSubtle}
          />
        </View>
      </View>

      <View style={styles.imapGrid}>
        <View style={[styles.imapField, styles.imapFieldWide]}>
          <Text style={styles.label}>Login / email</Text>
          <TextInput
            style={styles.textInput}
            value={imapUsername}
            onChangeText={setImapUsername}
            placeholder="user@example.com"
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.imapField}>
          <Text style={styles.label}>Folder poczty</Text>
          <TextInput
            style={styles.textInput}
            value={imapMailbox}
            onChangeText={setImapMailbox}
            placeholder="INBOX"
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Hasło / hasło aplikacji</Text>
        <TextInput
          style={styles.textInput}
          value={imapPassword}
          onChangeText={setImapPassword}
          placeholder="Nie zapisujemy go w aplikacji"
          placeholderTextColor={theme.colors.textSubtle}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Połączenie SSL/TLS</Text>
          <Text style={styles.toggleDesc}>Dla większości skrzynek zostaw port 993 i szyfrowane połączenie.</Text>
        </View>
        <TouchableOpacity
          onPress={() => setImapSecure((current) => !current)}
          style={[styles.toggle, imapSecure && { backgroundColor: theme.colors.primary }]}
        >
          <View style={[styles.toggleDot, imapSecure && styles.toggleDotActive]} />
        </TouchableOpacity>
      </View>

      <View style={[styles.imapPrivacyNote, { backgroundColor: `${theme.colors.primary}14`, borderColor: `${theme.colors.primary}33` }]}>
        <ShieldCheck size={17} color={theme.colors.primary} />
        <Text style={styles.imapPrivacyText}>
          Aplikacja nie zapisuje hasła. Wynik skanu wróci jako grupy do sprawdzenia przed zapisem.
        </Text>
      </View>

      {imapScanMutation.isPending && (
        <View style={[styles.scanningState, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}33` }]}>
          <View style={[styles.scanningIcon, { backgroundColor: theme.colors.cardStrong }]}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
          <View style={styles.scanningCopy}>
            <Text style={styles.scanningTitle}>Skanuję skrzynkę IMAP...</Text>
            <Text style={styles.scanningText}>Wyniki podzielimy na czytelne grupy do sprawdzenia.</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.scanBtn, { backgroundColor: theme.colors.primary }, (!canRunImapScan || isAnyScanPending) && styles.acceptBtnDisabled]}
        onPress={() => handleImapScan()}
        disabled={!canRunImapScan || isAnyScanPending}
      >
        {imapScanMutation.isPending ? (
          <ActivityIndicator color={theme.colors.darkText} />
        ) : (
          <>
            <Search size={20} color={theme.colors.darkText} />
            <Text style={styles.connectBtnText}>Skanuj skrzynkę</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDryRunResults = () => {
    if (!dryRunResults) return null;

    return (
      <View style={styles.dryRunSection}>
        <View style={styles.dryRunHeader}>
          <FlaskConical size={20} color={theme.colors.primary} />
          <Text style={styles.dryRunTitle}>Wyniki podglądu</Text>
          <TouchableOpacity onPress={() => setDryRunResults(null)}>
            <X size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={styles.dryRunDesc}>To są kandydatury znalezione podczas symulacji. Nie zostały zapisane w Twoim profilu.</Text>

        {dryRunResults.length === 0 ? (
          <Text style={styles.dryRunEmpty}>Nie znaleziono nowych subskrypcji w tym teście.</Text>
        ) : (
          dryRunResults.map((item, index) => renderDetectionCard(item, true, index))
        )}

        <View style={styles.dryRunDivider} />
      </View>
    );
  };

  const renderDetectionCard = (item: DetectedSubscription, isPreview = false, index = 0) => {
    const trialDate = formatDate(item.trialEndDate);
    const nextDate = formatDate(item.nextPaymentDate);
    const confidence = Math.round((item.confidence || 0) * 100);

    return (
      <View key={`${item.id || item.sourceMessageId || item.name || item.provider || 'detection'}-${index}`} style={styles.detectionCard}>
        <View style={styles.detectionTop}>
          <View style={[styles.providerIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
            <Text style={[styles.providerIconText, { color: theme.colors.primary }]}>{(item.name || item.provider || '?').charAt(0)}</Text>
          </View>
          <View style={styles.detectionMain}>
            <Text style={styles.detectionName} numberOfLines={1}>{item.name || item.provider || 'Nieznana subskrypcja'}</Text>
            <Text style={styles.detectionMeta}>
              {item.isTrial ? 'Trial' : 'Kandydatura'} · Pewność {confidence}%
            </Text>
          </View>
        </View>

        {(trialDate || nextDate) && (
          <View style={styles.dateRow}>
            <Clock size={16} color={theme.colors.warning} />
            <Text style={[styles.dateRowText, { color: theme.colors.warning }]}>
              {trialDate ? `Koniec triala: ${trialDate}` : `Następna płatność: ${nextDate}`}
            </Text>
          </View>
        )}

        {item.evidenceSnippet && (
          <Text style={styles.snippet} numberOfLines={3}>{item.evidenceSnippet}</Text>
        )}

        <View style={styles.actionsRow}>
          {isPreview ? (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>Tylko podgląd</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleIgnore(item)} disabled={ignoreMutation.isPending}>
                <XCircle size={18} color={theme.colors.textMuted} />
                <Text style={styles.secondaryBtnText}>Ignoruj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setSelectedDetection(item)}>
                <CheckCircle size={18} color={theme.colors.darkText} />
                <Text style={styles.primaryBtnText}>Sprawdź</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const getProductItemKey = (item: EmailScanProductItem, prefix: string, index: number) => {
    const stable = item.itemSelectionKey || item.sourceItemId || item.id || item.sourceMessageId;
    if (stable) return `${prefix}-${String(stable)}`;

    return `${prefix}-${getProductItemTitle(item)}-${index}`;
  };

  const renderCoverageBanner = () => {
    if (!lastScanDiagnostics && !lastScanProductResult?.scanSummary?.recommendedUserMessage) return null;

    const note = getFriendlyScanNote(lastScanProductResult?.scanSummary?.recommendedUserMessage) ||
      lastScanDiagnostics?.userFacingCoverageNote ||
      lastScanDiagnostics?.deepScanReason;
    const needsCoverageAttention = Boolean(
      lastScanDiagnostics?.deepScanRecommended ||
      lastScanDiagnostics?.quickScanLikelyIncomplete
    );

    return (
      <View style={styles.coverageBanner}>
        <View style={styles.coverageTop}>
          <View style={[styles.coverageIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
            <Zap size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.coverageCopy}>
            <Text style={styles.coverageTitle}>
              {needsCoverageAttention ? 'Wynik może być niepełny' : 'Wynik wymaga potwierdzenia'}
            </Text>
            {!!lastScanDiagnostics?.scanReliabilityLevel && (
              <Text style={styles.coverageMeta}>Wiarygodność skanu: {getScanReliabilityLabel(lastScanDiagnostics.scanReliabilityLevel)}</Text>
            )}
          </View>
        </View>
        {!!note && <Text style={styles.coverageText}>{getFriendlyScanNote(note)}</Text>}
      </View>
    );
  };

  const renderProductItemCard = (
    item: EmailScanProductItem,
    bucket: 'current' | 'review' | 'history' | 'price' | 'bill',
    index: number,
    selectionKey?: string
  ) => {
    const key = selectionKey || getProductItemKey(item, bucket, index);
    const isSelectedForImport = Boolean(selectedImportItems[key]);
    const title = getProductItemTitle(item);
    const action = getProductItemAction(item);
    const evidenceDate = formatProductDate(item);
    const categoryLabel = item.categoryLabel || getProductCategoryLabel(item.category);
    const channelLabel = getBillingChannelLabel(item.billingChannel);
    const cycleLabel = getBillingCycleLabel(item.billingCycle);
    const actionLabel = item.primaryActionLabel || getDecisionLabel(action);
    const amountKindLabel = item.amountKindLabel || (bucket === 'price' ? 'Obecnie / wcześniej' : 'Kwota');
    const amount =
      formatMaybeAmount(item.amount, item.currency) ||
      formatMaybeAmount(item.currentAmount, item.currency) ||
      formatMaybeAmount(item.promoAmount, item.currency);
    const newAmount = formatMaybeAmount(item.newAmount, item.currency) || formatMaybeAmount(item.futureAmount, item.currency);

    return (
      <TouchableOpacity
        key={key}
        style={styles.productCard}
        activeOpacity={0.86}
        onPress={() => setSelectedProductReview({ item, bucket, key })}
      >
        <View style={styles.productTop}>
          <View style={[
            styles.productIcon,
            bucket !== 'price' && bucket !== 'bill' && { backgroundColor: `${theme.colors.primary}22` },
            bucket === 'price' && styles.productIconPrice,
            bucket === 'bill' && styles.productIconBill,
          ]}>
            {bucket === 'price' ? (
              <Tag size={19} color={vibrantTheme.colors.warning} />
            ) : bucket === 'bill' ? (
              <ReceiptText size={19} color={vibrantTheme.colors.cyan} />
            ) : (
              <Mail size={19} color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.productMain}>
            <Text style={styles.productTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.productMeta} numberOfLines={1}>
              {[categoryLabel, channelLabel, cycleLabel, evidenceDate ? `dowód: ${evidenceDate}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.importSelectPill,
              isSelectedForImport && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
            onPress={() => toggleImportSelection(key)}
            activeOpacity={0.84}
          >
            <Text style={[styles.importSelectText, isSelectedForImport && { color: theme.colors.darkText }]}>
              {isSelectedForImport ? 'Wybrane' : 'Wybierz'}
            </Text>
          </TouchableOpacity>
        </View>

        {(amount || newAmount) && (
          <View style={styles.amountStrip}>
            {amount && (
              <View>
                <Text style={styles.amountLabel}>{amountKindLabel}</Text>
                <Text style={styles.amountText}>{amount}</Text>
              </View>
            )}
            {newAmount && (
              <View>
                <Text style={styles.amountLabel}>{bucket === 'price' ? 'Nowa cena' : 'Docelowo'}</Text>
                <Text style={[styles.amountText, styles.amountTextWarn]}>{newAmount}</Text>
              </View>
            )}
          </View>
        )}

        {!!item.evidenceSnippet && (
          <Text style={styles.snippet} numberOfLines={3}>{item.evidenceSnippet}</Text>
        )}

        {!!item.selectionReason && (
          <Text style={styles.selectionReasonText} numberOfLines={2}>{item.selectionReason}</Text>
        )}

        <View style={styles.productFooter}>
          <Text style={styles.productActionLabel}>Rekomendacja: {actionLabel || 'sprawdź'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductSection = (
    title: string,
    caption: string,
    icon: React.ComponentType<{ size?: number; color?: string }>,
    items: EmailScanProductItem[],
    bucket: 'current' | 'review' | 'history' | 'price' | 'bill'
  ) => {
    if (items.length === 0) return null;
    const Icon = icon;

    return (
      <View style={styles.productSection}>
        <View style={styles.productSectionHeader}>
          <View style={styles.productSectionTitleRow}>
            <View style={[styles.productSectionIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
              <Icon size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.productSectionCopy}>
              <Text style={styles.productSectionTitle}>{title}</Text>
              <Text style={styles.productSectionCaption}>{caption}</Text>
            </View>
          </View>
          <Text style={[styles.productSectionCount, { color: theme.colors.primary }]}>{items.length}</Text>
        </View>
        {items.map((item, index) => renderProductItemCard(item, bucket, index))}
      </View>
    );
  };

  const renderProductEntrySection = (section: ProductEntrySectionDefinition) => {
    if (section.entries.length === 0) return null;
    const Icon = section.icon;

    return (
      <View style={styles.productSection}>
        <View style={styles.productSectionHeader}>
          <View style={styles.productSectionTitleRow}>
            <View style={[styles.productSectionIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
              <Icon size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.productSectionCopy}>
              <Text style={styles.productSectionTitle}>{section.title}</Text>
              <Text style={styles.productSectionCaption}>{section.caption}</Text>
            </View>
          </View>
          <Text style={[styles.productSectionCount, { color: theme.colors.primary }]}>{section.entries.length}</Text>
        </View>
        {section.entries.map((entry, index) =>
          renderProductItemCard(entry.item, entry.bucket as ProductBucket, index, entry.key)
        )}
      </View>
    );
  };

  const getProductSections = (productResult: EmailScanProductResult): ProductSectionDefinition[] => [
    {
      bucket: 'current',
      label: 'Aktywne',
      title: 'Aktywne subskrypcje',
      caption: 'Świeże dowody sugerują, że te usługi są obecnie aktywne.',
      icon: CheckCircle,
      items: productResult.currentSubscriptions,
    },
    {
      bucket: 'review',
      label: 'Do sprawdzenia',
      title: 'Do sprawdzenia',
      caption: 'Sygnały, które warto potwierdzić przed dodaniem.',
      icon: History,
      items: productResult.needsReviewSubscriptions,
    },
    {
      bucket: 'price',
      label: 'Ceny',
      title: 'Zmiany cen',
      caption: 'Alerty o nowych cenach, promocjach lub wzroście kosztu planu.',
      icon: Tag,
      items: productResult.priceChanges,
    },
    {
      bucket: 'bill',
      label: 'Rachunki',
      title: 'Rachunki cykliczne',
      caption: 'Powtarzalne rachunki pokazane osobno od subskrypcji.',
      icon: FileText,
      items: productResult.billsOrUtilities,
    },
    {
      bucket: 'history',
      label: 'Historia',
      title: 'Historia',
      caption: 'Archiwalne lub słabsze sygnały, które mogą pomóc w audycie.',
      icon: Inbox,
      items: productResult.historicalSubscriptions,
    },
  ];

  const getImportEntries = (productResult: EmailScanProductResult): EmailScanImportSelection[] =>
    getProductSections(productResult).flatMap((section) =>
      section.items.map((item, index) => {
        const key = getProductItemKey(item, section.bucket, index);

        return {
          key,
          bucket: section.bucket,
          item,
          action: getProductItemAction(item),
        };
      })
    );

  const applyImportSelection = (
    entries: EmailScanImportSelection[],
    predicate: (entry: EmailScanImportSelection) => boolean,
    emptyMessage: string,
    mode: 'merge' | 'replace' = 'merge'
  ) => {
    const matchingEntries = entries.filter(predicate);

    if (matchingEntries.length === 0) {
      Alert.alert('Brak pozycji', emptyMessage);
      return;
    }

    setImportPreviewResult(null);
    setPreviewDraftEdits({});
    setSelectedImportItems((current) => {
      const next = mode === 'replace' ? {} : { ...current };
      matchingEntries.forEach((entry) => {
        next[entry.key] = true;
      });
      return next;
    });
  };

  const clearImportSelection = () => {
    setImportPreviewResult(null);
    setPreviewDraftEdits({});
    setSelectedImportItems({});
  };

  const isRecommendedImportEntry = (entry: EmailScanImportSelection) => {
    return entry.item.recommendedSelected === true;
  };

  const renderProductResult = () => {
    if (!lastScanProductResult) return null;

    const { scanSummary } = lastScanProductResult;
    const hasAnyProductFinding =
      lastScanProductResult.currentSubscriptions.length > 0 ||
      lastScanProductResult.needsReviewSubscriptions.length > 0 ||
      lastScanProductResult.historicalSubscriptions.length > 0 ||
      lastScanProductResult.priceChanges.length > 0 ||
      lastScanProductResult.billsOrUtilities.length > 0;
    const allImportEntries = getImportEntries(lastScanProductResult);
    const recommendedEntries = allImportEntries.filter((entry) => isRecommendedImportEntry(entry) && entry.bucket !== 'bill' && entry.bucket !== 'price');
    const priceEntries = allImportEntries.filter((entry) => entry.bucket === 'price');
    const billEntries = allImportEntries.filter((entry) => entry.bucket === 'bill');
    const reviewEntries = allImportEntries.filter((entry) => !isRecommendedImportEntry(entry) && entry.bucket !== 'bill' && entry.bucket !== 'price');
    const entrySections: ProductEntrySectionDefinition[] = [
      {
        id: 'recommended' as const,
        title: 'Rekomendowane do importu',
        caption: 'Pozycje z najlepszym dowodem. Możesz zaznaczyć je jednym przyciskiem i sprawdzić przed zapisem.',
        icon: CheckCircle,
        entries: recommendedEntries,
      },
      {
        id: 'review' as const,
        title: 'Wymaga sprawdzenia',
        caption: 'Słabsze lub historyczne sygnały. Zaznacz tylko to, co rozpoznajesz.',
        icon: History,
        entries: reviewEntries,
      },
      {
        id: 'price' as const,
        title: 'Zmiany cen',
        caption: 'Informacje o nowych cenach lub kończących się promocjach.',
        icon: Tag,
        entries: priceEntries,
      },
      {
        id: 'bill' as const,
        title: 'Rachunki',
        caption: 'Rachunki cykliczne pokazujemy osobno od subskrypcji.',
        icon: ReceiptText,
        entries: billEntries,
      },
    ].filter((section) => section.entries.length > 0);
    const selectedImportCount = allImportEntries.filter((entry) => selectedImportItems[entry.key]).length;
    const canPreparePreview = selectedImportCount > 0 && !importPreviewMutation.isPending;

    return (
      <View style={styles.productResultWrap}>
        <View style={styles.productHero}>
          <View style={styles.productHeroTop}>
            <View style={[styles.productHeroIcon, { backgroundColor: `${theme.colors.primary}28` }]}>
              <ShieldCheck size={24} color="#FFFFFF" />
            </View>
            <View style={[styles.productModePill, { backgroundColor: `${theme.colors.primary}22`, borderColor: `${theme.colors.primary}44` }]}>
              <Text style={[styles.productModePillText, { color: theme.colors.primary }]}>{getScanModeLabel(scanSummary.recommendedDefaultMode)}</Text>
            </View>
          </View>
          <Text style={styles.productHeroTitle}>
            {scanSummary.recommendedDefaultMode === 'review'
              ? 'Znaleźliśmy rzeczy do potwierdzenia'
              : 'Wynik skanu skrzynki'}
          </Text>
          <Text style={styles.productHeroText}>
            {getFriendlyScanNote(scanSummary.recommendedUserMessage) ||
              'Wynik jest podzielony na aktywne subskrypcje, rzeczy do potwierdzenia, zmiany cen oraz rachunki.'}
          </Text>
        </View>

        {renderCoverageBanner()}

        {hasAnyProductFinding && (
          <View style={styles.reviewCockpitCard}>
            <View style={styles.reviewCockpitHeader}>
              <View>
                <Text style={styles.reviewCockpitEyebrow}>Szybka selekcja</Text>
                <Text style={styles.reviewCockpitTitle}>
                  {selectedImportCount > 0
                    ? `${selectedImportCount} pozycji wybranych`
                    : 'Wybierz pozycje do dodania'}
                </Text>
              </View>
              <View style={[styles.reviewCockpitScore, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}33` }]}>
                <Text style={[styles.reviewCockpitScoreValue, { color: theme.colors.primary }]}>{selectedImportCount}</Text>
                <Text style={styles.reviewCockpitScoreLabel}>wybrane</Text>
              </View>
            </View>
            <View style={styles.bulkSelectGrid}>
              <TouchableOpacity
                style={styles.bulkSelectButton}
                onPress={() => applyImportSelection(
                  allImportEntries,
                  isRecommendedImportEntry,
                  'Nie ma rekomendowanych pozycji do zaznaczenia.',
                  'replace'
                )}
              >
                <Text style={styles.bulkSelectButtonText}>Zaznacz rekomendowane</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkSelectButton, selectedImportCount === 0 && styles.acceptBtnDisabled]}
                onPress={clearImportSelection}
                disabled={selectedImportCount === 0}
              >
                <Text style={styles.bulkSelectButtonText}>Wyczyść wybór</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {hasAnyProductFinding && (
          <View style={styles.importPreviewCard}>
            <View style={styles.importPreviewHeader}>
              <View style={[styles.importPreviewIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
                <FileText size={19} color={theme.colors.primary} />
              </View>
              <View style={styles.importPreviewCopy}>
                <Text style={styles.importPreviewTitle}>Podgląd przed zapisem</Text>
                <Text style={styles.importPreviewText}>
                  Skan niczego nie zapisuje. Najpierw sprawdzisz dane, a zapis nastąpi dopiero po Twoim potwierdzeniu.
                </Text>
              </View>
            </View>
            <View style={styles.importPreviewFooter}>
              <View style={styles.importPreviewCountBlock}>
                <Text style={styles.importPreviewCount}>
                  {selectedImportCount}/{allImportEntries.length} wybranych
                </Text>
                {selectedImportCount === 0 && (
                  <Text style={styles.importPreviewHint}>Zaznacz przynajmniej jedną pozycję, żeby przejść dalej.</Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.importPreviewButton,
                  { backgroundColor: theme.colors.primary },
                  !canPreparePreview && styles.acceptBtnDisabled,
                ]}
                onPress={() => handleImportPreview(allImportEntries)}
                disabled={!canPreparePreview}
                activeOpacity={0.86}
              >
                {importPreviewMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.darkText} />
                ) : (
                  <>
                    <Search size={17} color={theme.colors.darkText} />
                    <Text style={styles.importPreviewButtonText}>Pokaż podgląd</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!hasAnyProductFinding && (
          <View style={styles.emptyState}>
            <Inbox size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Brak pewnych wyników</Text>
            <Text style={styles.emptyText}>
              Nie traktujemy tego jako dowodu, że nie masz subskrypcji. Możesz ponowić skan skrzynki za chwilę.
            </Text>
          </View>
        )}
        {entrySections.map((section) => (
          <React.Fragment key={section.id}>
            {renderProductEntrySection(section)}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderProductReviewModal = () => {
    const review = selectedProductReview;
    if (!review) return null;

    const { item, bucket, key } = review;
    const title = getProductItemTitle(item);
    const action = getProductItemAction(item);
    const evidenceDate = formatProductDate(item);
    const categoryLabel = item.categoryLabel || getProductCategoryLabel(item.category);
    const channelLabel = getBillingChannelLabel(item.billingChannel || item.provider);
    const actionLabel = item.primaryActionLabel || getDecisionLabel(action);
    const amountKindLabel = item.amountKindLabel || (bucket === 'price' ? 'Obecnie / wcześniej' : 'Kwota');
    const amount =
      formatMaybeAmount(item.amount, item.currency) ||
      formatMaybeAmount(item.currentAmount, item.currency) ||
      formatMaybeAmount(item.promoAmount, item.currency);
    const newAmount = formatMaybeAmount(item.newAmount, item.currency) || formatMaybeAmount(item.futureAmount, item.currency);
    const isSelectedForImport = Boolean(selectedImportItems[key]);

    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedProductReview(null)}>
        <View style={styles.productModalOverlay}>
          <View style={styles.productModal}>
            <View style={styles.productModalHandle} />
            <View style={styles.productModalHeader}>
              <View style={styles.productModalTitleBlock}>
                <Text style={styles.productModalEyebrow}>
                  {bucket === 'price' ? 'Zmiana ceny' : bucket === 'bill' ? 'Rachunek / usługa' : 'Pozycja do sprawdzenia'}
                </Text>
                <Text style={styles.productModalTitle}>{title}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProductReview(null)}>
                <X size={21} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              scrollEventThrottle={16}
              decelerationRate="fast"
            >
              <View style={styles.productModalInfoGrid}>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Kategoria</Text>
                  <Text style={styles.productModalInfoValue}>{categoryLabel || 'brak'}</Text>
                </View>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Akcja</Text>
                  <Text style={styles.productModalInfoValue}>{actionLabel || 'sprawdź'}</Text>
                </View>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Dowód</Text>
                  <Text style={styles.productModalInfoValue}>{evidenceDate || 'historyczny'}</Text>
                </View>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Kanał</Text>
                  <Text style={styles.productModalInfoValue}>{channelLabel || 'email'}</Text>
                </View>
              </View>

              {(amount || newAmount) && (
                <View style={styles.productModalAmountBox}>
                  {amount && (
                    <View>
                      <Text style={styles.amountLabel}>{amountKindLabel}</Text>
                      <Text style={styles.productModalAmount}>{amount}</Text>
                    </View>
                  )}
                  {newAmount && (
                    <View>
                      <Text style={styles.amountLabel}>{bucket === 'price' ? 'Nowa cena' : 'Docelowo'}</Text>
                      <Text style={[styles.productModalAmount, styles.amountTextWarn]}>{newAmount}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.productModalEvidence}>
                <Text style={styles.evidenceLabel}>Dlaczego to pokazujemy?</Text>
                <Text style={styles.evidenceText}>
                  {item.evidenceSnippet ||
                    item.selectionReason ||
                    'Ten sygnał wygląda jak subskrypcja, rachunek albo zmiana ceny. Potwierdź go przed dodaniem do listy.'}
                </Text>
              </View>

              <View style={styles.productModalActions}>
                <TouchableOpacity
                  style={[styles.productModalPrimary, { backgroundColor: theme.colors.primary }]}
                  onPress={() => toggleImportSelection(key)}
                >
                  <CheckCircle size={18} color={theme.colors.darkText} />
                  <Text style={styles.productModalPrimaryText}>
                    {isSelectedForImport ? 'Usuń z wyboru' : 'Wybierz do dodania'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.productModalGhost} onPress={() => setSelectedProductReview(null)}>
                  <Text style={styles.productModalGhostText}>Zamknij</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderImportPreviewModal = () => {
    if (!importPreviewResult) return null;

    const previewDrafts = getPreviewDraftsFromResult(importPreviewResult);
    const previewCount = importPreviewResult.count ?? previewDrafts.length;
    const selectedPreviewDraftCount = previewDrafts.filter((draft, index) => {
      const key = getPreviewDraftKey(draft, index);
      return previewDraftEdits[key]?.selected;
    }).length;
    const warnings = Array.isArray(importPreviewResult.warnings) ? importPreviewResult.warnings : [];

    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setImportPreviewResult(null)}>
        <View style={styles.productModalOverlay}>
          <View style={styles.productModal}>
            <View style={styles.productModalHandle} />
            <View style={styles.productModalHeader}>
              <View style={styles.productModalTitleBlock}>
                <Text style={styles.productModalEyebrow}>Podgląd importu</Text>
                <Text style={styles.productModalTitle}>Podgląd przed zapisem</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setImportPreviewResult(null)}>
                <X size={21} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              scrollEventThrottle={16}
              decelerationRate="fast"
            >
              <View style={[styles.importPreviewSummary, { backgroundColor: `${theme.colors.primary}14`, borderColor: `${theme.colors.primary}33` }]}>
                <View>
                  <Text style={[styles.importPreviewSummaryValue, { color: theme.colors.primary }]}>{previewCount}</Text>
                  <Text style={styles.importPreviewSummaryLabel}>pozycji do sprawdzenia</Text>
                </View>
                <Text style={styles.importPreviewSummaryText}>
                  To nadal tylko podgląd. Do zapisu wybrano {selectedPreviewDraftCount} pozycji; finalny zapis nastąpi dopiero po Twoim potwierdzeniu.
                </Text>
              </View>

              {!!importPreviewResult.message && (
                <Text style={styles.importPreviewMessage}>{importPreviewResult.message}</Text>
              )}

              {warnings.length > 0 && (
                <View style={styles.importWarningsBox}>
                  <Text style={styles.importWarningsTitle}>Uwagi do importu</Text>
                  {warnings.map((warning, index) => (
                    <Text key={`${warning}-${index}`} style={styles.importWarningText}>• {warning}</Text>
                  ))}
                </View>
              )}

              {previewDrafts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Inbox size={32} color={theme.colors.textMuted} />
                  <Text style={styles.emptyTitle}>Nie udało się przygotować listy</Text>
                  <Text style={styles.emptyText}>
                    Nie znaleźliśmy pozycji, które można teraz pokazać w podglądzie. Wróć do wyboru i spróbuj ponownie.
                  </Text>
                </View>
              ) : (
                previewDrafts.map((rawDraft, index) => {
                  const draft = rawDraft as EmailScanImportDraft;
                  const payload = getPreviewDraftPayload(draft);
                  const key = getPreviewDraftKey(draft, index);
                  const edit = previewDraftEdits[key] || {
                    selected: true,
                    amount: formatEditableAmount(getPreviewDraftAmount(draft)),
                    currency: payload.currency || 'PLN',
                  };
                  const title = getPreviewDraftTitle(draft, index);
                  const editedAmount = parseEditableAmount(edit.amount);
                  const amount = formatMaybeAmount(editedAmount ?? getPreviewDraftAmount(draft), edit.currency || payload.currency);
                  const billingCycle = payload.billingCycle;
                  const category = payload.category;
                  const recommendedAction = getDecisionLabel(draft.recommendedAction || draft.action || String(payload.recommendedAction || payload.action || draft.type || ''));
                  const recurringBill = payload.isRecurringBill;
                  const categoryLabel = payload.categoryLabel || getProductCategoryLabel(category);
                  const billingCycleLabel = getBillingCycleLabel(billingCycle);
                  const nextPayment = typeof payload.nextPaymentDate === 'string'
                    ? formatDate(payload.nextPaymentDate)
                    : null;

                  return (
                    <View key={key} style={[styles.importDraftCard, !edit.selected && styles.importDraftCardMuted]}>
                      <View style={styles.importDraftTop}>
                        <View style={[styles.importDraftIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
                          <Text style={[styles.importDraftIconText, { color: theme.colors.primary }]}>
                            {String(title).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.importDraftMain}>
                          <Text style={styles.importDraftTitle} numberOfLines={1}>{title}</Text>
                          <Text style={styles.importDraftMeta} numberOfLines={1}>
                            {[recommendedAction, categoryLabel, billingCycleLabel, recurringBill ? 'rachunek cykliczny' : null, nextPayment].filter(Boolean).join(' · ') || 'Pozycja do sprawdzenia'}
                          </Text>
                        </View>
                        {!!amount && <Text style={styles.importDraftAmount}>{amount}</Text>}
                        <TouchableOpacity
                          style={[
                            styles.importSelectPill,
                            edit.selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                          ]}
                          onPress={() => updatePreviewDraftEdit(key, { selected: !edit.selected })}
                          activeOpacity={0.84}
                        >
                          <Text style={[styles.importSelectText, edit.selected && { color: theme.colors.darkText }]}>
                            {edit.selected ? 'Zapisz' : 'Pomiń'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {!!(payload.notes || payload.evidenceSnippet) && (
                        <Text style={styles.snippet} numberOfLines={3}>{payload.notes || payload.evidenceSnippet}</Text>
                      )}

                      <View style={styles.importDraftControls}>
                        <View style={styles.importDraftAmountField}>
                          <Text style={styles.labelOptional}>Kwota</Text>
                          <TextInput
                            style={styles.textInput}
                            value={edit.amount}
                            onChangeText={(value) => updatePreviewDraftEdit(key, { amount: value })}
                            keyboardType="decimal-pad"
                            placeholder="Uzupełnij kwotę"
                            placeholderTextColor={theme.colors.textSubtle}
                            editable={edit.selected}
                          />
                        </View>
                        <View style={styles.importDraftCurrencyField}>
                          <Text style={styles.labelOptional}>Waluta</Text>
                          <View style={styles.importDraftCurrencyRow}>
                            {CURRENCIES.map((item) => {
                              const isActive = edit.currency === item;
                              return (
                                <TouchableOpacity
                                  key={`${key}-${item}`}
                                  style={[styles.importDraftCurrencyPill, isActive && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                                  onPress={() => updatePreviewDraftEdit(key, { currency: item })}
                                  disabled={!edit.selected}
                                >
                                  <Text style={[styles.importDraftCurrencyText, isActive && { color: theme.colors.primary }]}>{item}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {edit.selected && !parseEditableAmount(edit.amount) && (
                        <Text style={styles.importPreviewHint}>Brakuje kwoty. Uzupełnij ją teraz albo ta pozycja nie zostanie zapisana.</Text>
                      )}
                    </View>
                  );
                })
              )}

              {previewDrafts.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.scanBtn,
                    { backgroundColor: theme.colors.primary },
                    (selectedPreviewDraftCount === 0 || importConfirmMutation.isPending) && styles.acceptBtnDisabled,
                  ]}
                  onPress={() => handleImportConfirm(previewDrafts)}
                  disabled={selectedPreviewDraftCount === 0 || importConfirmMutation.isPending}
                  activeOpacity={0.86}
                >
                  {importConfirmMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.darkText} />
                  ) : (
                    <>
                      <CheckCircle size={19} color={theme.colors.darkText} />
                      <Text style={styles.connectBtnText}>Zapisz wybrane</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderReviewModal = () => (
    <Modal visible={!!selectedDetection} transparent animationType="slide" onRequestClose={() => setSelectedDetection(null)}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Zatwierdź kandydaturę</Text>
              <Text style={styles.modalSubtitle}>{selectedDetection?.name || selectedDetection?.provider}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDetection(null)}>
              <X size={22} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {selectedDetection?.evidenceSnippet && (
              <View style={styles.evidenceBox}>
                <Text style={styles.evidenceLabel}>Fragment dowodu</Text>
                <Text style={styles.evidenceText}>{selectedDetection.evidenceSnippet}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kwota</Text>
              <TextInput
                style={[styles.textInput, submitted && !(parsedAmount > 0) && styles.inputError]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="29.99"
                placeholderTextColor={theme.colors.textSubtle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Waluta</Text>
              <View style={styles.pillRow}>
                {CURRENCIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pill, currency === item && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                    onPress={() => setCurrency(item)}
                  >
                    <Text style={[styles.pillText, currency === item && { color: theme.colors.primary }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cykl</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pillRow}>
                {CYCLE_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.pill, cycle === item.id && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                    onPress={() => setCycle(item.id)}
                  >
                    <Text style={[styles.pillText, cycle === item.id && { color: theme.colors.primary }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Następna płatność</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowNextPicker(true)}>
                <Clock size={18} color={theme.colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(nextPaymentDate.toISOString())}</Text>
              </TouchableOpacity>
              {showNextPicker && (
                <DateTimePicker
                  value={nextPaymentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS === 'android') setShowNextPicker(false);
                    if (date) setNextPaymentDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kategoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pillRow}>
                {CATEGORY_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.pill, category === item.id && { backgroundColor: `${theme.colors.primary}24`, borderColor: theme.colors.primary }]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Text style={[styles.pillText, category === item.id && { color: theme.colors.primary }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {selectedDetection?.isTrial && selectedDetection.trialEndDate && (
              <View style={styles.trialInfo}>
                <AlertCircle size={16} color={theme.colors.warning} />
                <Text style={styles.trialInfoText}>Wykryto trial do {formatDate(selectedDetection.trialEndDate)}.</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.labelOptional}>Notatki</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Notatka dla subskrypcji"
                placeholderTextColor={theme.colors.textSubtle}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.acceptBtn,
                { backgroundColor: theme.colors.primary },
                (!canAccept || acceptMutation.isPending) && { backgroundColor: theme.colors.cardStrong, opacity: 0.58 },
              ]}
              onPress={handleAccept}
              disabled={!canAccept || acceptMutation.isPending}
              accessibilityState={{ disabled: !canAccept || acceptMutation.isPending, busy: acceptMutation.isPending }}
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator color={theme.colors.darkText} />
              ) : (
                <>
                  <CheckCircle size={20} color={theme.colors.darkText} />
                  <Text style={styles.acceptBtnText}>Dodaj subskrypcję</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderWizardProgress = () => {
    const currentIndex = EMAIL_SCAN_WIZARD_STEPS.findIndex((step) => step.id === wizardStep);

    return (
      <View style={styles.wizardCard}>
        <View style={styles.wizardTop}>
          <View>
            <Text style={styles.wizardEyebrow}>Import z maila</Text>
            <Text style={styles.wizardTitle}>Od skanu do zapisu</Text>
          </View>
          <Text style={[styles.wizardStepCounter, { color: theme.colors.primary }]}>
            {Math.max(currentIndex + 1, 1)}/{EMAIL_SCAN_WIZARD_STEPS.length}
          </Text>
        </View>
        <View style={styles.wizardStepsRow}>
          {EMAIL_SCAN_WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = wizardStep === step.id;
            const isDone = index < currentIndex;

            return (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.wizardStep,
                  isActive && { backgroundColor: `${theme.colors.primary}20`, borderColor: theme.colors.primary },
                  isDone && { borderColor: `${theme.colors.primary}55` },
                ]}
                onPress={() => setWizardStep(step.id)}
                activeOpacity={0.84}
              >
                <View style={[
                  styles.wizardStepIcon,
                  (isActive || isDone) && { backgroundColor: theme.colors.primary },
                ]}>
                  <Icon size={15} color={isActive || isDone ? theme.colors.darkText : theme.colors.textMuted} />
                </View>
                <Text style={[styles.wizardStepLabel, isActive && { color: theme.colors.primary }]}>{step.label}</Text>
                <Text style={styles.wizardStepCaption}>{step.caption}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderScanStage = () => (
    <View style={styles.wizardStageCard}>
      <View style={styles.wizardStageHeader}>
        <View style={[styles.wizardStageIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
          <Search size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.wizardStageCopy}>
          <Text style={styles.wizardStageTitle}>Uruchom bezpieczny skan</Text>
          <Text style={styles.wizardStageText}>
            {scanSource === 'imap'
              ? `Źródło: inna skrzynka · ${imapHost || 'brak serwera'}`
              : 'Źródło: Gmail · metadane i fragmenty wiadomości'}
          </Text>
        </View>
      </View>

      {scanSource === 'imap' ? (
        <>
          <View style={styles.wizardScanSummary}>
            <View style={styles.wizardScanMetric}>
              <Text style={styles.wizardScanMetricValue}>{imapSecure ? 'SSL' : 'plain'}</Text>
              <Text style={styles.wizardScanMetricLabel}>połączenie</Text>
            </View>
            <View style={styles.wizardScanMetric}>
              <Text style={styles.wizardScanMetricValue}>{imapMailbox || 'INBOX'}</Text>
              <Text style={styles.wizardScanMetricLabel}>folder</Text>
            </View>
          </View>
          {imapScanMutation.isPending && (
            <View style={[styles.scanningState, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}33` }]}>
              <View style={[styles.scanningIcon, { backgroundColor: theme.colors.cardStrong }]}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
              <View style={styles.scanningCopy}>
                <Text style={styles.scanningTitle}>Skanuję skrzynkę IMAP...</Text>
                <Text style={styles.scanningText}>Wyniki trafią do grup: do sprawdzenia, ceny, rachunki i historia.</Text>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: theme.colors.primary }, (!canRunImapScan || isAnyScanPending) && styles.acceptBtnDisabled]}
            onPress={() => handleImapScan()}
            disabled={!canRunImapScan || isAnyScanPending}
          >
            {imapScanMutation.isPending ? (
              <ActivityIndicator color={theme.colors.darkText} />
            ) : (
              <>
                <Search size={20} color={theme.colors.darkText} />
                <Text style={styles.connectBtnText}>Skanuj skrzynkę</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          {!isConnected ? (
            <View style={styles.wizardNotice}>
              <Text style={styles.wizardNoticeTitle}>Najpierw połącz Gmaila</Text>
              <Text style={styles.wizardNoticeText}>Po autoryzacji wrócisz do tego kroku i uruchomisz skan.</Text>
            </View>
          ) : scanMutation.isPending ? (
            <View style={[styles.scanningState, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}33` }]}>
              <View style={[styles.scanningIcon, { backgroundColor: theme.colors.cardStrong }]}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
              <View style={styles.scanningCopy}>
                <Text style={styles.scanningTitle}>Szukam Twoich subskrypcji...</Text>
                <Text style={styles.scanningText}>Analizuję tylko metadane i fragmenty wiadomości.</Text>
              </View>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: theme.colors.primary }, ((!isConnected && scanSource === 'gmail') || isAnyScanPending) && styles.acceptBtnDisabled]}
            onPress={() => handleScan()}
            disabled={!isConnected || isAnyScanPending}
          >
            {scanMutation.isPending ? (
              <ActivityIndicator color={theme.colors.darkText} />
            ) : (
              <>
                <Search size={20} color={theme.colors.darkText} />
                <Text style={styles.connectBtnText}>Skanuj skrzynkę</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={styles.wizardStageActions}>
        <TouchableOpacity style={styles.wizardSecondaryAction} onPress={() => setWizardStep('source')}>
          <Text style={styles.wizardSecondaryActionText}>Zmień źródło</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.wizardSecondaryAction, !shouldShowProductResult && styles.acceptBtnDisabled]}
          onPress={() => setWizardStep('review')}
          disabled={!shouldShowProductResult}
        >
          <Text style={styles.wizardSecondaryActionText}>Zobacz wyniki</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreviewStage = () => {
    if (!lastScanProductResult) {
      return (
        <View style={styles.emptyState}>
          <FileText size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Najpierw uruchom skan</Text>
          <Text style={styles.emptyText}>Podgląd importu pojawi się po znalezieniu kandydatur i zaznaczeniu pozycji.</Text>
          <TouchableOpacity style={[styles.importPreviewButton, { backgroundColor: theme.colors.primary, marginTop: 14 }]} onPress={() => setWizardStep('scan')}>
            <Search size={17} color={theme.colors.darkText} />
            <Text style={styles.importPreviewButtonText}>Przejdź do skanu</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const importEntries = getImportEntries(lastScanProductResult);
    const selectedEntries = importEntries.filter((entry) => selectedImportItems[entry.key]);

    return (
      <View style={styles.wizardStageCard}>
        <View style={styles.wizardStageHeader}>
          <View style={[styles.wizardStageIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
            <FileText size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.wizardStageCopy}>
            <Text style={styles.wizardStageTitle}>Podgląd przed finalnym zapisem</Text>
            <Text style={styles.wizardStageText}>
              {selectedEntries.length > 0
                ? `${selectedEntries.length} wybranych pozycji czeka na podgląd.`
                : 'Zaznacz pozycje w wynikach, żeby przygotować podgląd importu.'}
            </Text>
          </View>
        </View>

        {selectedEntries.length === 0 ? (
          <View style={styles.wizardNotice}>
            <Text style={styles.wizardNoticeTitle}>Nic nie jest zaznaczone</Text>
            <Text style={styles.wizardNoticeText}>Wróć do wyników i zaznacz przynajmniej jedną pozycję do podglądu.</Text>
          </View>
        ) : (
          <View style={styles.previewSelectionList}>
            {selectedEntries.slice(0, 4).map((entry) => (
              <View key={entry.key} style={styles.previewSelectionItem}>
                <View style={[styles.previewSelectionDot, { backgroundColor: theme.colors.primary }]} />
                <View style={styles.previewSelectionCopy}>
                  <Text style={styles.previewSelectionTitle} numberOfLines={1}>{getProductItemTitle(entry.item)}</Text>
                  <Text style={styles.previewSelectionMeta}>
                    {entry.item.productBucketLabel || getProductBucketLabel(entry.bucket)} · {entry.item.primaryActionLabel || getDecisionLabel(entry.action) || 'sprawdź'}
                  </Text>
                </View>
              </View>
            ))}
            {selectedEntries.length > 4 && (
              <Text style={styles.previewSelectionMore}>+{selectedEntries.length - 4} kolejnych pozycji</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.scanBtn,
            { backgroundColor: theme.colors.primary },
            (selectedEntries.length === 0 || importPreviewMutation.isPending) && styles.acceptBtnDisabled,
          ]}
          onPress={() => handleImportPreview(importEntries)}
          disabled={selectedEntries.length === 0 || importPreviewMutation.isPending}
        >
          {importPreviewMutation.isPending ? (
            <ActivityIndicator color={theme.colors.darkText} />
          ) : (
            <>
              <FileText size={19} color={theme.colors.darkText} />
              <Text style={styles.connectBtnText}>Przygotuj podgląd</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.wizardStageActions}>
          <TouchableOpacity style={styles.wizardSecondaryAction} onPress={() => setWizardStep('review')}>
            <Text style={styles.wizardSecondaryActionText}>Wróć do wyników</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => goBackOrDashboard(navigation)} style={styles.backBtn} accessibilityLabel="Wstecz">
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Email Scan</Text>
        <TouchableOpacity onPress={refresh} style={styles.iconBtn}>
          <RefreshCw size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        scrollEventThrottle={16}
        decelerationRate="fast"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.borderStrong, shadowColor: theme.colors.primary }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
            <Mail size={26} color={theme.colors.text} />
          </View>
          <Text style={styles.heroTitle}>Email Scan</Text>
          <Text style={styles.heroText}>
            Znajdź kandydatury subskrypcji w Gmailu albo przez manualne IMAP. Zawsze pokazujemy wynik do sprawdzenia przed zapisem.
          </Text>
        </View>

        {renderPrivacyCopy()}

        {renderWizardProgress()}

        {wizardStep === 'source' && (
        <>
        <View style={styles.sourceSwitch}>
          <TouchableOpacity
            style={[styles.sourceSwitchButton, scanSource === 'gmail' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setScanSource('gmail')}
            activeOpacity={0.84}
          >
            <Mail size={16} color={scanSource === 'gmail' ? theme.colors.darkText : theme.colors.textMuted} />
            <Text style={[styles.sourceSwitchText, scanSource === 'gmail' && { color: theme.colors.darkText }]}>Gmail</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sourceSwitchButton, scanSource === 'imap' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setScanSource('imap')}
            activeOpacity={0.84}
          >
            <Inbox size={16} color={scanSource === 'imap' ? theme.colors.darkText : theme.colors.textMuted} />
            <Text style={[styles.sourceSwitchText, scanSource === 'imap' && { color: theme.colors.darkText }]}>Inna skrzynka</Text>
          </TouchableOpacity>
        </View>

        {scanSource === 'gmail' ? (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Status</Text>
            <View style={[styles.statusBadge, isConnected ? { backgroundColor: `${theme.colors.primary}22` } : styles.statusBadgeMuted]}>
              <Text style={[styles.statusBadgeText, isConnected ? { color: theme.colors.primary } : styles.statusBadgeTextMuted]}>
                {isConnected ? 'Gmail połączony' : 'Niepołączony'}
              </Text>
            </View>
          </View>

          {statusQuery.isLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.statGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{status?.pendingDetectionsCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Do sprawdzenia</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{status?.acceptedDetectionsCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Dodane</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{status?.ignoredDetectionsCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Ignorowane</Text>
                </View>
              </View>
              <Text style={styles.lastScan}>Ostatni skan: {formatDateTime(status?.lastScanAt ?? null)}</Text>
            </>
          )}

          {!isConnected ? (
            <TouchableOpacity style={[styles.connectBtn, { backgroundColor: theme.colors.primary }]} onPress={handleConnect} disabled={authUrlMutation.isPending}>
              {authUrlMutation.isPending ? (
                <ActivityIndicator color={theme.colors.darkText} />
              ) : (
                <>
                  <ExternalLink size={20} color={theme.colors.darkText} />
                  <Text style={styles.connectBtnText}>Połącz Gmaila</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              {scanMutation.isPending && (
              <View style={[styles.scanningState, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}33` }]}>
                <View style={[styles.scanningIcon, { backgroundColor: theme.colors.cardStrong }]}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
                <View style={styles.scanningCopy}>
                  <Text style={styles.scanningTitle}>Szukam Twoich subskrypcji...</Text>
                  <Text style={styles.scanningText}>Analizuję tylko metadane i fragmenty wiadomości.</Text>
                </View>
              </View>
              )}
              <TouchableOpacity style={[styles.scanBtn, { backgroundColor: theme.colors.primary }]} onPress={() => handleScan()} disabled={isAnyScanPending}>
                {scanMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.darkText} />
                ) : (
                  <>
                    <Search size={20} color={theme.colors.darkText} />
                    <Text style={styles.connectBtnText}>Skanuj skrzynkę</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
        ) : (
          renderImapConnectionCard()
        )}

        </>
        )}

        {wizardStep === 'scan' && renderScanStage()}

        {wizardStep === 'review' && (
        <>
        {renderReviewContent ? renderDryRunResults() : null}

        {renderReviewContent && shouldShowProductResult && renderProductResult()}

        {renderReviewContent && !shouldShowProductResult && (
        <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kandydatury do sprawdzenia</Text>
          <Text style={[styles.sectionCounter, { color: theme.colors.primary }]}>{detectionsQuery.data?.count ?? 0}</Text>
        </View>

        {detectionsQuery.isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : detections.length === 0 ? (
          <View style={styles.emptyState}>
            <Inbox size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Brak kandydatur</Text>
            <Text style={styles.emptyText}>
              Po skanie nowe wykrycia pojawią się tutaj do ręcznego zatwierdzenia.
            </Text>
          </View>
        ) : (
          detections.map((item, index) => renderDetectionCard(item, false, index))
        )}
        </>
        )}
        {!renderReviewContent && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>Przygotowuję wyniki</Text>
            <Text style={styles.emptyText}>Najpierw ładujemy główne akcje, żeby ekran szybciej reagował na gesty.</Text>
          </View>
        )}
        </>
        )}

        {wizardStep === 'preview' && renderPreviewStage()}
      </ScrollView>

      {renderReviewModal()}
      {renderProductReviewModal()}
      {renderImportPreviewModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(7,10,18,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: vibrantTheme.colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '900', color: vibrantTheme.colors.text },
  content: { padding: 20, paddingBottom: 48 },
  wizardCard: {
    backgroundColor: vibrantTheme.colors.cardStrong,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.borderStrong,
  },
  wizardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  wizardEyebrow: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  wizardTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  wizardStepCounter: {
    fontSize: 16,
    fontWeight: '900',
  },
  wizardStepsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wizardStep: {
    flex: 1,
    minHeight: 86,
    borderRadius: 18,
    padding: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  wizardStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  wizardStepLabel: {
    color: vibrantTheme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  wizardStepCaption: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  wizardStageCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  wizardStageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  wizardStageIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardStageCopy: { flex: 1 },
  wizardStageTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  wizardStageText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  wizardScanSummary: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },
  wizardScanMetric: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    justifyContent: 'space-between',
  },
  wizardScanMetricValue: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  wizardScanMetricLabel: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  wizardNotice: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  wizardNoticeTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  wizardNoticeText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  wizardStageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  wizardSecondaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wizardSecondaryActionText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  previewSelectionList: {
    gap: 9,
    marginBottom: 14,
  },
  previewSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  previewSelectionDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  previewSelectionCopy: { flex: 1 },
  previewSelectionTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  previewSelectionMeta: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  previewSelectionMore: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  sourceSwitch: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  sourceSwitchButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  sourceSwitchText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  heroCard: { backgroundColor: vibrantTheme.colors.cardStrong, borderRadius: 30, padding: 22, marginBottom: 16, borderWidth: 1, borderColor: vibrantTheme.colors.borderStrong, ...vibrantTheme.shadows.glow },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  heroText: { fontSize: 14, color: vibrantTheme.colors.textMuted, lineHeight: 20 },
  privacyBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 16,
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  privacyTitle: { fontSize: 15, fontWeight: '800', color: vibrantTheme.colors.primary },
  privacyText: { fontSize: 13, color: vibrantTheme.colors.textMuted, lineHeight: 19, marginTop: 4 },
  statusCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: vibrantTheme.colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusBadgeOk: { backgroundColor: 'rgba(255,255,255,0.14)' },
  statusBadgeMuted: { backgroundColor: 'rgba(255,255,255,0.08)' },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  statusBadgeTextOk: { color: vibrantTheme.colors.primary },
  statusBadgeTextMuted: { color: vibrantTheme.colors.textMuted },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  statValue: { fontSize: 20, fontWeight: '900', color: vibrantTheme.colors.text },
  statLabel: { fontSize: 11, fontWeight: '700', color: vibrantTheme.colors.textMuted, marginTop: 2 },
  lastScan: { fontSize: 13, color: vibrantTheme.colors.textMuted, marginBottom: 16 },
  connectBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: vibrantTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: vibrantTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  scanningIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: vibrantTheme.colors.cardStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scanningCopy: { flex: 1 },
  scanningTitle: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900' },
  scanningText: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  connectBtnText: { color: vibrantTheme.colors.darkText, fontSize: 15, fontWeight: '900' },
  imapCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  imapHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  imapSubtitle: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },
  imapPresetBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  imapPresetText: {
    fontSize: 11,
    fontWeight: '900',
  },
  imapPresetRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  imapPresetCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 17,
    padding: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  imapPresetCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  imapReliabilityText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  imapPresetNote: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 6,
  },
  imapGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  imapField: { flex: 1 },
  imapFieldWide: { flex: 1.65 },
  imapPrivacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  imapPrivacyText: {
    flex: 1,
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: vibrantTheme.colors.text },
  sectionCounter: { fontSize: 13, fontWeight: '800', color: vibrantTheme.colors.primary },
  emptyState: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: vibrantTheme.colors.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: vibrantTheme.colors.textMuted, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  productResultWrap: { marginTop: 2 },
  productHero: {
    backgroundColor: vibrantTheme.colors.cardStrong,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.borderStrong,
  },
  productHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  productHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productModePill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  productModePillText: { color: vibrantTheme.colors.primary, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  productHeroTitle: { color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900', marginBottom: 8 },
  productHeroText: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  coverageBanner: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
  },
  coverageTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  coverageIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  coverageCopy: { flex: 1 },
  coverageTitle: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900' },
  coverageMeta: { color: vibrantTheme.colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  coverageText: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  importPreviewCard: {
    backgroundColor: vibrantTheme.colors.cardStrong,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.borderStrong,
  },
  importPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  importPreviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importPreviewCopy: { flex: 1 },
  importPreviewTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  importPreviewText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  importPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  importPreviewCountBlock: {
    flex: 1,
    gap: 4,
  },
  importPreviewCount: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  importPreviewHint: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  importPreviewButton: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  importPreviewButtonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 12,
    fontWeight: '900',
  },
  reviewCockpitCard: {
    backgroundColor: vibrantTheme.colors.cardStrong,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.borderStrong,
  },
  reviewCockpitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  reviewCockpitEyebrow: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reviewCockpitTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  reviewCockpitScore: {
    minWidth: 62,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
  },
  reviewCockpitScoreValue: { color: vibrantTheme.colors.primary, fontSize: 20, fontWeight: '900' },
  reviewCockpitScoreLabel: { color: vibrantTheme.colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 1 },
  bulkSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  bulkSelectButton: {
    minHeight: 38,
    borderRadius: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  bulkSelectButtonText: {
    color: vibrantTheme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  productSection: { marginBottom: 18 },
  productSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productSectionTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  productSectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productSectionCopy: { flex: 1 },
  productSectionTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900' },
  productSectionCaption: { color: vibrantTheme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  productSectionCount: { color: vibrantTheme.colors.primary, fontSize: 15, fontWeight: '900' },
  productCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  productTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  productIconPrice: { backgroundColor: 'rgba(251,191,36,0.12)' },
  productIconBill: { backgroundColor: 'rgba(34,211,238,0.12)' },
  productMain: { flex: 1 },
  productTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  productMeta: { color: vibrantTheme.colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  selectionReasonText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 8,
  },
  importSelectPill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginLeft: 8,
  },
  importSelectText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
  },
  amountStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  amountLabel: { color: vibrantTheme.colors.textSubtle, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  amountText: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900', marginTop: 3 },
  amountTextWarn: { color: vibrantTheme.colors.warning },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  productActionLabel: { flex: 1, color: vibrantTheme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  productModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  productModal: {
    maxHeight: '88%',
    backgroundColor: vibrantTheme.colors.bg2,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  productModalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  productModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  productModalTitleBlock: { flex: 1 },
  productModalEyebrow: {
    color: vibrantTheme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productModalTitle: { color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  productModalInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  productModalInfo: {
    width: '48%',
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    padding: 12,
    justifyContent: 'space-between',
  },
  productModalInfoLabel: { color: vibrantTheme.colors.textSubtle, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  productModalInfoValue: { color: vibrantTheme.colors.text, fontSize: 13, fontWeight: '900' },
  productModalAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginBottom: 14,
  },
  productModalAmount: { color: vibrantTheme.colors.text, fontSize: 19, fontWeight: '900', marginTop: 4 },
  productModalEvidence: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginBottom: 14,
  },
  productModalActions: { gap: 10, paddingBottom: 10 },
  productModalPrimary: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: vibrantTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  productModalPrimaryText: { color: vibrantTheme.colors.darkText, fontSize: 14, fontWeight: '900' },
  productModalSecondary: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  productModalSecondaryText: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900' },
  productModalGhost: { minHeight: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  productModalGhostText: { color: vibrantTheme.colors.textMuted, fontSize: 13, fontWeight: '900' },
  importPreviewSummary: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    marginBottom: 14,
  },
  importPreviewSummaryValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  importPreviewSummaryLabel: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  importPreviewSummaryText: {
    flex: 1,
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  importPreviewMessage: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 14,
  },
  importWarningsBox: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
    marginBottom: 14,
  },
  importWarningsTitle: {
    color: vibrantTheme.colors.warning,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  importWarningText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  importDraftCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  importDraftCardMuted: {
    opacity: 0.58,
  },
  importDraftTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  importDraftIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  importDraftIconText: {
    fontSize: 17,
    fontWeight: '900',
  },
  importDraftMain: { flex: 1 },
  importDraftTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  importDraftMeta: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  importDraftAmount: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 10,
  },
  importDraftControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  importDraftAmountField: {
    flex: 1,
  },
  importDraftCurrencyField: {
    width: 132,
  },
  importDraftCurrencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  importDraftCurrencyPill: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  importDraftCurrencyText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  detectionCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  detectionTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerIconText: { color: vibrantTheme.colors.primary, fontSize: 18, fontWeight: '900' },
  detectionMain: { flex: 1 },
  detectionName: { fontSize: 16, fontWeight: '900', color: vibrantTheme.colors.text },
  detectionMeta: { fontSize: 12, color: vibrantTheme.colors.textMuted, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateRowText: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  snippet: { fontSize: 13, color: vibrantTheme.colors.textMuted, lineHeight: 19, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtnText: { color: vibrantTheme.colors.textMuted, fontWeight: '800' },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: vibrantTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { color: vibrantTheme.colors.darkText, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalContainer: {
    maxHeight: '92%',
    backgroundColor: vibrantTheme.colors.bg2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 19, fontWeight: '900', color: vibrantTheme.colors.text },
  modalSubtitle: { fontSize: 13, color: vibrantTheme.colors.textMuted, marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: vibrantTheme.colors.card, alignItems: 'center', justifyContent: 'center' },
  evidenceBox: { backgroundColor: vibrantTheme.colors.card, borderRadius: 16, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  evidenceLabel: { fontSize: 11, color: vibrantTheme.colors.textSubtle, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  evidenceText: { fontSize: 13, color: vibrantTheme.colors.textMuted, lineHeight: 19 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '800', color: vibrantTheme.colors.text, marginBottom: 8 },
  labelOptional: { fontSize: 13, fontWeight: '800', color: vibrantTheme.colors.textMuted, marginBottom: 8 },
  textInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: vibrantTheme.colors.card,
    paddingHorizontal: 14,
    color: vibrantTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputError: { borderWidth: 1, borderColor: '#EF4444' },
  notesInput: { minHeight: 78, paddingTop: 12, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  pillActive: { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: vibrantTheme.colors.primary },
  pillText: { fontSize: 13, fontWeight: '800', color: vibrantTheme.colors.textMuted },
  pillTextActive: { color: vibrantTheme.colors.primary },
  dateButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: vibrantTheme.colors.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '700' },
  trialInfo: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 14, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(251,191,36,0.28)' },
  trialInfoText: { flex: 1, color: vibrantTheme.colors.warning, fontSize: 13, fontWeight: '700' },
  acceptBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: vibrantTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  acceptBtnDisabled: { opacity: 0.55 },
  acceptBtnText: { color: vibrantTheme.colors.darkText, fontSize: 15, fontWeight: '900' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: vibrantTheme.colors.text,
  },
  toggleDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#CBD5E1',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: vibrantTheme.colors.text,
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  dryRunSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dryRunHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dryRunTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: vibrantTheme.colors.text,
    marginLeft: 10,
  },
  dryRunDesc: {
    fontSize: 13,
    color: vibrantTheme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  dryRunEmpty: {
    fontSize: 14,
    color: vibrantTheme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  dryRunDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 16,
  },
  previewBadge: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    borderStyle: 'dashed',
  },
  previewBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: vibrantTheme.colors.textMuted,
  },
});

export default EmailScanScreen;
