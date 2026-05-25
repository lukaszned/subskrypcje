import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  ChevronRight,
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
  Settings,
  ShieldCheck,
  Tag,
  Wrench,
  X,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { ApiError } from '../lib/apiClient';
import {
  useAcceptDetection,
  useEmailDetections,
  useEmailScanImportPreview,
  useEmailScanStatus,
  useGmailAuthUrl,
  useIgnoreDetection,
  useRunGmailScan,
  useRunImapScan,
} from '../hooks/useEmailScan';
import type { AppStackParamList } from '../types/navigation';
import {
  BillingCycle,
  CATEGORY_LABELS,
  DetectedSubscription,
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

const IMAP_PROFILE_OPTIONS: { id: EmailScanProfile; label: string; hint: string }[] = [
  { id: 'fast', label: 'Fast', hint: 'Szybki pierwszy skan' },
  { id: 'adaptive', label: 'Adaptive', hint: 'Rekomendowany' },
  { id: 'balanced', label: 'Balanced', hint: 'Kompromis' },
  { id: 'deep', label: 'Deep', hint: 'Najdokładniejszy' },
];

type ImapProviderPreset = {
  id: 'onet' | 'interia';
  label: string;
  reliability: 'medium' | 'high';
  note: string;
  host: string;
  port: string;
  secure: boolean;
  mailbox: string;
  profile: EmailScanProfile;
};

const IMAP_PROVIDER_PRESETS: ImapProviderPreset[] = [
  {
    id: 'onet',
    label: 'Onet',
    reliability: 'medium',
    note: 'Metadata prepass + time buckets',
    host: 'imap.poczta.onet.pl',
    port: '993',
    secure: true,
    mailbox: 'INBOX',
    profile: 'adaptive',
  },
  {
    id: 'interia',
    label: 'Interia',
    reliability: 'high',
    note: 'BODY targeted search',
    host: 'poczta.interia.pl',
    port: '993',
    secure: true,
    mailbox: 'INBOX',
    profile: 'adaptive',
  },
];

const DEFAULT_IMAP_PRESET = IMAP_PROVIDER_PRESETS[0];

type ProductBucket = 'current' | 'review' | 'history' | 'price' | 'bill';
type ProductFilter = 'all' | ProductBucket;

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
  confirm_still_active: 'Potwierdź aktywność',
  review_price_change: 'Sprawdź zmianę ceny',
  review_old_bill: 'Sprawdź rachunek',
  review_bill: 'Sprawdź rachunek',
  create_subscription: 'Utwórz subskrypcję',
};

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
  return item.name || item.provider || item.billingChannel || 'Znalezione do sprawdzenia';
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
  return PRODUCT_DECISION_LABELS[action] || action;
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

  // Advanced / Debug
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<DetectedSubscription[] | null>(null);
  const [lastScanProductResult, setLastScanProductResult] = useState<EmailScanProductResult | null>(null);
  const [lastScanDiagnostics, setLastScanDiagnostics] = useState<ScanDiagnostics | null>(null);
  const [locallyReviewedProductItems, setLocallyReviewedProductItems] = useState<Record<string, string>>({});
  const [selectedImportItems, setSelectedImportItems] = useState<Record<string, boolean>>({});
  const [selectedProductReview, setSelectedProductReview] = useState<SelectedProductReview>(null);
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [renderReviewContent, setRenderReviewContent] = useState(false);
  const [scanSource, setScanSource] = useState<'gmail' | 'imap'>('gmail');
  const [imapHost, setImapHost] = useState(DEFAULT_IMAP_PRESET.host);
  const [imapPort, setImapPort] = useState(DEFAULT_IMAP_PRESET.port);
  const [imapSecure, setImapSecure] = useState(DEFAULT_IMAP_PRESET.secure);
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapMailbox, setImapMailbox] = useState(DEFAULT_IMAP_PRESET.mailbox);
  const [imapProfile, setImapProfile] = useState<EmailScanProfile>(DEFAULT_IMAP_PRESET.profile);
  const [importPreviewResult, setImportPreviewResult] = useState<EmailScanImportPreviewResponse | null>(null);

  const status = statusQuery.data;
  const detections = detectionsQuery.data?.items ?? [];
  const isRefreshing = statusQuery.isFetching || detectionsQuery.isFetching;
  const isConnected = !!status?.gmailConnected;
  const shouldShowProductResult = !!lastScanProductResult;
  const isAnyScanPending = scanMutation.isPending || imapScanMutation.isPending;
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

  const parsedAmount = useMemo(() => Number(amount.replace(',', '.')), [amount]);
  const canAccept = selectedDetection && parsedAmount > 0 && currency && category && cycle && nextPaymentDate;

  const refresh = () => {
    statusQuery.refetch();
    detectionsQuery.refetch();
  };

  const handleConnect = () => {
    authUrlMutation.mutate(undefined, {
      onSuccess: async ({ authUrl }) => {
        try {
          await Linking.openURL(authUrl);
          Alert.alert(
            'Połącz Gmaila',
            'Po autoryzacji wróć do aplikacji i odśwież status połączenia.'
          );
        } catch {
          Alert.alert('Błąd', 'Nie udało się otworzyć strony autoryzacji Gmaila.');
        }
      },
      onError: (error: any) => {
        Alert.alert('Błąd', error?.message || 'Nie udało się pobrać linku autoryzacji.');
      },
    });
  };

  const handleScan = (overrides: Partial<GmailScanRequest> = {}) => {
    setScanSource('gmail');
    setDryRunResults(null);
    const payload: GmailScanRequest = {
      limit: 25,
      sinceDays: 365,
      dryRun: isDryRun,
      debug: isDebug,
      ...overrides
    };

    scanMutation.mutate(payload, {
      onSuccess: (result) => {
        const productResult = getProductResultFromScan(result);
        setLastScanProductResult(productResult);
        setLastScanDiagnostics(getScanDiagnosticsFromScan(result));
        setLocallyReviewedProductItems({});
        setSelectedImportItems({});
        setImportPreviewResult(null);
        setProductFilter('all');
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
        Alert.alert('Nie udało się przeskanować skrzynki', error?.message || 'Nie udało się przeskanować Gmaila.');
      },
    });
  };

  const applyImapPreset = (preset: ImapProviderPreset) => {
    setImapHost(preset.host);
    setImapPort(preset.port);
    setImapSecure(preset.secure);
    setImapMailbox(preset.mailbox);
    setImapProfile(preset.profile);
  };

  const handleImapScan = (profileOverride?: EmailScanProfile) => {
    if (!canRunImapScan) {
      Alert.alert(
        'Uzupełnij dane IMAP',
        'Podaj host, port, login oraz hasło albo hasło aplikacji. Dane są wysyłane wyłącznie do backendu skanującego.'
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
      profile: profileOverride ?? imapProfile,
      ...(isDebug ? { includeDebug: true } : {}),
    };

    setScanSource('imap');
    setDryRunResults(null);
    imapScanMutation.mutate(payload, {
      onSuccess: (result: ImapScanResponse) => {
        const productResult = getProductResultFromScan(result);
        setLastScanProductResult(productResult);
        setLastScanDiagnostics(getScanDiagnosticsFromScan(result));
        setLocallyReviewedProductItems({});
        setSelectedImportItems({});
        setImportPreviewResult(null);
        setProductFilter(productResult?.scanSummary?.recommendedDefaultMode === 'review' ? 'review' : 'all');
        Alert.alert(
          'Skan IMAP zakończony',
          result.message || `Przeanalizowano ${result.scannedMessages ?? 0} wiadomości.`
        );
      },
      onError: (error: any) => {
        Alert.alert(
          'Nie udało się przeskanować IMAP',
          error?.message || 'Sprawdź dane połączenia, hasło aplikacji i ustawienia dostawcy poczty.'
        );
      },
    });
  };

  const toggleImportSelection = (key: string) => {
    setSelectedImportItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleImportPreview = (entries: EmailScanImportSelection[]) => {
    const selections = entries.filter((entry) => selectedImportItems[entry.key]);
    if (selections.length === 0) {
      Alert.alert('Wybierz pozycje', 'Zaznacz co najmniej jedną pozycję, żeby zobaczyć podgląd importu.');
      return;
    }

    importPreviewMutation.mutate({
      sourceProvider: scanSource === 'imap' ? 'imap' : 'gmail',
      selections,
    }, {
      onSuccess: (result) => {
        setImportPreviewResult(result);
      },
      onError: (error: any) => {
        Alert.alert(
          'Nie udało się przygotować podglądu',
          error?.message || 'Backend nie zwrócił jeszcze draftów importu dla wybranych pozycji.'
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
    setLocallyReviewedProductItems({});
    setSelectedImportItems({});
    setImportPreviewResult(null);
    setSelectedProductReview(null);
    setProductFilter('all');
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
                : 'Backend znalazł podobną subskrypcję.'
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
        <Text style={styles.privacyTitle}>Privacy-first</Text>
      </View>
      <Text style={styles.privacyText}>Skanujemy tylko wiadomości wyglądające jak rachunki, triale, odnowienia lub subskrypcje.</Text>
      <Text style={styles.privacyText}>Nie zapisujemy pełnej treści maili i nie tworzymy subskrypcji automatycznie.</Text>
      <Text style={styles.privacyText}>To Ty zatwierdzasz, co ma zostać dodane.</Text>
    </View>
  );

  const renderAdvancedOptions = () => (
    <View style={styles.advancedSection}>
      <TouchableOpacity
        style={styles.advancedHeader}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Wrench size={16} color={theme.colors.textMuted} />
        <Text style={styles.advancedTitle}>Opcje zaawansowane / Dev</Text>
        <Settings size={16} color={showAdvanced ? theme.colors.primary : theme.colors.textMuted} />
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedContent}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Tryb podglądu</Text>
              <Text style={styles.toggleDesc}>Symulacja skanowania bez zapisu</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDryRun(!isDryRun)}
              style={[styles.toggle, isDryRun && { backgroundColor: theme.colors.primary }]}
            >
              <View style={[styles.toggleDot, isDryRun && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Tryb Debug</Text>
              <Text style={styles.toggleDesc}>Dodatkowe informacje techniczne</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDebug(!isDebug)}
              style={[styles.toggle, isDebug && { backgroundColor: theme.colors.primary }]}
            >
              <View style={[styles.toggleDot, isDebug && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>

          {scanSource === 'gmail' && (
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleScan({ dryRun: true })}
              disabled={isAnyScanPending}
            >
              <FlaskConical size={18} color={theme.colors.primary} />
              <Text style={styles.testBtnText}>Uruchom testowy skan bez zapisu</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.demoResultBtn}
            onPress={handleShowDemoProductResult}
            disabled={isAnyScanPending}
          >
            <ShieldCheck size={18} color={vibrantTheme.colors.darkText} />
            <Text style={styles.demoResultBtnText}>Pokaż przykładowy wynik Onet</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderImapConnectionCard = () => (
    <View style={styles.imapCard}>
      <View style={styles.imapHeader}>
        <View>
          <Text style={styles.cardTitle}>Manual IMAP</Text>
          <Text style={styles.imapSubtitle}>Provider-agnostic: host, port, mailbox i profil skanu. Onet i Interia są potwierdzone backendowo.</Text>
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
          <Text style={styles.label}>Mailbox</Text>
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
          <Text style={styles.toggleDesc}>Dla większości skrzynek port 993 i secure ON.</Text>
        </View>
        <TouchableOpacity
          onPress={() => setImapSecure((current) => !current)}
          style={[styles.toggle, imapSecure && { backgroundColor: theme.colors.primary }]}
        >
          <View style={[styles.toggleDot, imapSecure && styles.toggleDotActive]} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Profil skanu</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={styles.profileRow}>
          {IMAP_PROFILE_OPTIONS.map((profile) => {
            const isActive = imapProfile === profile.id;
            return (
              <TouchableOpacity
                key={profile.id}
                style={[styles.profileChip, isActive && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                onPress={() => setImapProfile(profile.id)}
                activeOpacity={0.84}
              >
                <Text style={[styles.profileLabel, isActive && { color: theme.colors.darkText }]}>{profile.label}</Text>
                <Text style={[styles.profileHint, isActive && { color: theme.colors.darkText }]}>{profile.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.imapPrivacyNote, { backgroundColor: `${theme.colors.primary}14`, borderColor: `${theme.colors.primary}33` }]}>
        <ShieldCheck size={17} color={theme.colors.primary} />
        <Text style={styles.imapPrivacyText}>
          Front nie zapisuje hasła. Dane trafiają do endpointu skanu, a wynik wraca jako buckety do review.
        </Text>
      </View>

      {imapScanMutation.isPending && (
        <View style={[styles.scanningState, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}33` }]}>
          <View style={[styles.scanningIcon, { backgroundColor: theme.colors.cardStrong }]}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
          <View style={styles.scanningCopy}>
            <Text style={styles.scanningTitle}>Skanuję skrzynkę IMAP...</Text>
            <Text style={styles.scanningText}>Profil {imapProfile}. Wyniki podzielimy na buckety produktowe.</Text>
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
            <Text style={styles.connectBtnText}>Skanuj IMAP</Text>
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
          dryRunResults.map((item) => renderDetectionCard(item, true))
        )}

        <View style={styles.dryRunDivider} />
      </View>
    );
  };

  const renderDetectionCard = (item: DetectedSubscription, isPreview = false) => {
    const trialDate = formatDate(item.trialEndDate);
    const nextDate = formatDate(item.nextPaymentDate);
    const confidence = Math.round((item.confidence || 0) * 100);

    return (
      <View key={item.id} style={styles.detectionCard}>
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

  const getProductItemKey = (item: EmailScanProductItem, prefix: string, index: number) =>
    String(item.id || item.sourceMessageId || `${prefix}-${getProductItemTitle(item)}-${index}`);

  const markProductItemReviewed = (key: string, action: string) => {
    setLocallyReviewedProductItems((current) => ({ ...current, [key]: action }));
  };

  const handleProductReviewAction = (key: string, action: string) => {
    markProductItemReviewed(key, action);
    setSelectedProductReview(null);
  };

  const renderCoverageBanner = () => {
    if (!lastScanDiagnostics && !lastScanProductResult?.scanSummary?.recommendedUserMessage) return null;

    const note = lastScanProductResult?.scanSummary?.recommendedUserMessage ||
      lastScanDiagnostics?.userFacingCoverageNote ||
      lastScanDiagnostics?.deepScanReason;
    const shouldSuggestDeepScan = Boolean(
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
              {shouldSuggestDeepScan ? 'Quick scan może być niepełny' : 'Wynik wymaga potwierdzenia'}
            </Text>
            {!!lastScanDiagnostics?.scanReliabilityLevel && (
              <Text style={styles.coverageMeta}>Wiarygodność skanu: {lastScanDiagnostics.scanReliabilityLevel}</Text>
            )}
          </View>
        </View>
        {!!note && <Text style={styles.coverageText}>{note}</Text>}
        {shouldSuggestDeepScan && (
          <TouchableOpacity
            style={[styles.deepScanBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.84}
            onPress={() => {
              if (scanSource === 'imap') {
                handleImapScan('adaptive');
                return;
              }

              handleScan({ scanProfile: 'adaptive', dryRun: isDryRun });
            }}
            disabled={isAnyScanPending || (scanSource === 'imap' && !canRunImapScan)}
          >
            <Search size={17} color={theme.colors.darkText} />
            <Text style={styles.deepScanBtnText}>Uruchom dokładniejszy skan</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderProductItemCard = (
    item: EmailScanProductItem,
    bucket: 'current' | 'review' | 'history' | 'price' | 'bill',
    index: number
  ) => {
    const key = getProductItemKey(item, bucket, index);
    const reviewedAction = locallyReviewedProductItems[key];
    const isSelectedForImport = Boolean(selectedImportItems[key]);
    const title = getProductItemTitle(item);
    const action = getProductItemAction(item);
    const evidenceDate = formatProductDate(item);
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
              {[item.category, item.billingChannel, evidenceDate ? `dowód: ${evidenceDate}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {!!reviewedAction && (
            <View style={styles.reviewedBadge}>
              <Text style={styles.reviewedBadgeText}>{getDecisionLabel(reviewedAction)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.importSelectPill,
              isSelectedForImport && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
            onPress={() => toggleImportSelection(key)}
            activeOpacity={0.84}
          >
            <Text style={[styles.importSelectText, isSelectedForImport && { color: theme.colors.darkText }]}>
              {isSelectedForImport ? 'Wybrane' : 'Do preview'}
            </Text>
          </TouchableOpacity>
        </View>

        {(amount || newAmount) && (
          <View style={styles.amountStrip}>
            {amount && (
              <View>
                <Text style={styles.amountLabel}>{bucket === 'price' ? 'Obecnie / wcześniej' : 'Kwota'}</Text>
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

        {bucket === 'review' && (
          <View style={styles.productActions}>
            <TouchableOpacity style={[styles.productPrimaryAction, { backgroundColor: theme.colors.primary }]} onPress={() => markProductItemReviewed(key, 'nadal aktywne')}>
              <CheckCircle size={17} color={theme.colors.darkText} />
              <Text style={styles.productPrimaryActionText}>Nadal aktywne</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.productSecondaryAction} onPress={() => markProductItemReviewed(key, 'anulowane')}>
              <Text style={styles.productSecondaryActionText}>Anulowane</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.productSecondaryAction} onPress={() => markProductItemReviewed(key, 'nie subskrypcja')}>
              <Text style={styles.productSecondaryActionText}>Nie subskrypcja</Text>
            </TouchableOpacity>
          </View>
        )}

        {bucket !== 'review' && (
          <View style={styles.productFooter}>
            <Text style={styles.productActionLabel}>Akcja: {getDecisionLabel(action) || action}</Text>
            <TouchableOpacity style={styles.productMiniAction} onPress={() => markProductItemReviewed(key, 'sprawdzone')}>
              <Text style={[styles.productMiniActionText, { color: theme.colors.primary }]}>Oznacz jako sprawdzone</Text>
              <ChevronRight size={15} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
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

  const renderProductResult = () => {
    if (!lastScanProductResult) return null;

    const { scanSummary } = lastScanProductResult;
    const reviewItems = [
      ...lastScanProductResult.needsReviewSubscriptions.map((item, index) => ({
        item,
        bucket: 'review' as ProductBucket,
        key: getProductItemKey(item, 'review', index),
      })),
      ...lastScanProductResult.priceChanges.map((item, index) => ({
        item,
        bucket: 'price' as ProductBucket,
        key: getProductItemKey(item, 'price', index),
      })),
      ...lastScanProductResult.billsOrUtilities.map((item, index) => ({
        item,
        bucket: 'bill' as ProductBucket,
        key: getProductItemKey(item, 'bill', index),
      })),
    ];
    const reviewedCount = reviewItems.filter((entry) => locallyReviewedProductItems[entry.key]).length;
    const progressPercent = reviewItems.length > 0 ? Math.round((reviewedCount / reviewItems.length) * 100) : 0;
    const hasAnyProductFinding =
      lastScanProductResult.currentSubscriptions.length > 0 ||
      lastScanProductResult.needsReviewSubscriptions.length > 0 ||
      lastScanProductResult.historicalSubscriptions.length > 0 ||
      lastScanProductResult.priceChanges.length > 0 ||
      lastScanProductResult.billsOrUtilities.length > 0;
    const pendingCount = Math.max(0, reviewItems.length - reviewedCount);
    const productSections = [
      {
        bucket: 'current' as ProductBucket,
        label: 'Aktywne',
        title: 'Aktywne subskrypcje',
        caption: 'Świeże dowody sugerują, że te usługi są obecnie aktywne.',
        icon: CheckCircle,
        items: lastScanProductResult.currentSubscriptions,
      },
      {
        bucket: 'review' as ProductBucket,
        label: 'Do sprawdzenia',
        title: 'Potwierdź, czy nadal aktywne',
        caption: 'Mocne historyczne dowody, ale za stare, żeby udawać pewność.',
        icon: History,
        items: lastScanProductResult.needsReviewSubscriptions,
      },
      {
        bucket: 'price' as ProductBucket,
        label: 'Ceny',
        title: 'Zmiany cen',
        caption: 'Alerty o nowych cenach, promocjach lub wzroście kosztu planu.',
        icon: Tag,
        items: lastScanProductResult.priceChanges,
      },
      {
        bucket: 'bill' as ProductBucket,
        label: 'Rachunki',
        title: 'Rachunki i usługi',
        caption: 'Formalne rachunki i usługi pokazane osobno od subskrypcji.',
        icon: FileText,
        items: lastScanProductResult.billsOrUtilities,
      },
      {
        bucket: 'history' as ProductBucket,
        label: 'Historia',
        title: 'Historia',
        caption: 'Archiwalne lub słabsze sygnały, które mogą pomóc w audycie.',
        icon: Inbox,
        items: lastScanProductResult.historicalSubscriptions,
      },
    ];
    const visibleSections = productFilter === 'all'
      ? productSections
      : productSections.filter((section) => section.bucket === productFilter);
    const filterItems = [
      { id: 'all' as ProductFilter, label: 'Wszystko', count: productSections.reduce((sum, section) => sum + section.items.length, 0) },
      ...productSections.map((section) => ({ id: section.bucket, label: section.label, count: section.items.length })),
    ].filter((item) => item.id === 'all' || item.count > 0);
    const allImportEntries: EmailScanImportSelection[] = productSections.flatMap((section) =>
      section.items.map((item, index) => {
        const key = getProductItemKey(item, section.bucket, index);

        return {
          key,
          bucket: section.bucket,
          item,
          action: locallyReviewedProductItems[key] || getProductItemAction(item),
        };
      })
    );
    const selectedImportCount = allImportEntries.filter((entry) => selectedImportItems[entry.key]).length;

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
            {scanSummary.recommendedUserMessage ||
              'Wynik jest podzielony na aktywne subskrypcje, rzeczy do potwierdzenia, zmiany cen oraz rachunki.'}
          </Text>
        </View>

        {renderCoverageBanner()}

        {hasAnyProductFinding && (
          <View style={styles.reviewCockpitCard}>
            <View style={styles.reviewCockpitHeader}>
              <View>
                <Text style={styles.reviewCockpitEyebrow}>Kolejka decyzji</Text>
                <Text style={styles.reviewCockpitTitle}>
                  {pendingCount > 0 ? `${pendingCount} rzeczy czeka na decyzję` : 'Wszystko lokalnie sprawdzone'}
                </Text>
              </View>
              <View style={[styles.reviewCockpitScore, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}33` }]}>
                <Text style={[styles.reviewCockpitScoreValue, { color: theme.colors.primary }]}>{reviewedCount}</Text>
                <Text style={styles.reviewCockpitScoreLabel}>gotowe</Text>
              </View>
            </View>
            <View style={styles.reviewStatsGrid}>
              <View style={styles.reviewStatBox}>
                <Text style={styles.reviewStatValue}>{lastScanProductResult.needsReviewSubscriptions.length}</Text>
                <Text style={styles.reviewStatLabel}>do potwierdzenia</Text>
              </View>
              <View style={styles.reviewStatBox}>
                <Text style={styles.reviewStatValue}>{lastScanProductResult.priceChanges.length}</Text>
                <Text style={styles.reviewStatLabel}>zmian cen</Text>
              </View>
              <View style={styles.reviewStatBox}>
                <Text style={styles.reviewStatValue}>{lastScanProductResult.billsOrUtilities.length}</Text>
                <Text style={styles.reviewStatLabel}>rachunków</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.productFilterRow}
            >
              {filterItems.map((item) => {
                const isActive = productFilter === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.productFilterChip, isActive && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                    onPress={() => setProductFilter(item.id)}
                    activeOpacity={0.84}
                  >
                    <Text style={[styles.productFilterText, isActive && { color: theme.colors.darkText }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.productFilterCount, isActive && { color: theme.colors.darkText }]}>
                      {item.count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {reviewItems.length > 0 && (
          <View style={styles.reviewProgressCard}>
            <View style={styles.reviewProgressTop}>
              <View>
                <Text style={styles.reviewProgressTitle}>Postęp decyzji</Text>
                <Text style={styles.reviewProgressText}>
                  {reviewedCount}/{reviewItems.length} decyzji lokalnie oznaczonych
                </Text>
              </View>
              <Text style={[styles.reviewProgressPercent, { color: theme.colors.primary }]}>{progressPercent}%</Text>
            </View>
            <View style={styles.reviewProgressTrack}>
              <View style={[styles.reviewProgressFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.primary }]} />
            </View>
            <Text style={styles.reviewProgressHint}>
              Decyzje są na razie lokalne. Front przygotowuje UX i przyszły zapis decyzji bez zmian w backendzie.
            </Text>
          </View>
        )}

        {hasAnyProductFinding && (
          <View style={styles.importPreviewCard}>
            <View style={styles.importPreviewHeader}>
              <View style={[styles.importPreviewIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
                <FileText size={19} color={theme.colors.primary} />
              </View>
              <View style={styles.importPreviewCopy}>
                <Text style={styles.importPreviewTitle}>Preview przed zapisem</Text>
                <Text style={styles.importPreviewText}>
                  Zaznacz pozycje kartami „Do preview”, a backend przygotuje drafty bez finalnego zapisu.
                </Text>
              </View>
            </View>
            <View style={styles.importPreviewFooter}>
              <Text style={styles.importPreviewCount}>
                {selectedImportCount}/{allImportEntries.length} wybranych
              </Text>
              <TouchableOpacity
                style={[
                  styles.importPreviewButton,
                  { backgroundColor: theme.colors.primary },
                  (selectedImportCount === 0 || importPreviewMutation.isPending) && styles.acceptBtnDisabled,
                ]}
                onPress={() => handleImportPreview(allImportEntries)}
                disabled={selectedImportCount === 0 || importPreviewMutation.isPending}
                activeOpacity={0.86}
              >
                {importPreviewMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.darkText} />
                ) : (
                  <>
                    <Search size={17} color={theme.colors.darkText} />
                    <Text style={styles.importPreviewButtonText}>Pokaż preview</Text>
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
              Nie traktujemy tego jako dowodu, że nie masz subskrypcji. Jeśli skan był szybki, uruchom dokładniejszy profil.
            </Text>
          </View>
        )}
        {visibleSections.map((section) =>
          renderProductSection(
            section.title,
            section.caption,
            section.icon,
            section.items,
            section.bucket
          )
        )}
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
    const amount =
      formatMaybeAmount(item.amount, item.currency) ||
      formatMaybeAmount(item.currentAmount, item.currency) ||
      formatMaybeAmount(item.promoAmount, item.currency);
    const newAmount = formatMaybeAmount(item.newAmount, item.currency) || formatMaybeAmount(item.futureAmount, item.currency);
    const isReviewBucket = bucket === 'review';

    return (
      <Modal visible transparent animationType="slide">
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
                <X size={21} color={vibrantTheme.colors.textMuted} />
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
                  <Text style={styles.productModalInfoValue}>{item.category || 'brak'}</Text>
                </View>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Akcja</Text>
                  <Text style={styles.productModalInfoValue}>{getDecisionLabel(action) || action}</Text>
                </View>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Dowód</Text>
                  <Text style={styles.productModalInfoValue}>{evidenceDate || 'historyczny'}</Text>
                </View>
                <View style={styles.productModalInfo}>
                  <Text style={styles.productModalInfoLabel}>Kanał</Text>
                  <Text style={styles.productModalInfoValue}>{item.billingChannel || item.provider || 'email'}</Text>
                </View>
              </View>

              {(amount || newAmount) && (
                <View style={styles.productModalAmountBox}>
                  {amount && (
                    <View>
                      <Text style={styles.amountLabel}>{bucket === 'price' ? 'Obecnie / wcześniej' : 'Kwota'}</Text>
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
                    'Backend sklasyfikował ten sygnał do osobnego bucketu produktowego. Użytkownik powinien go potwierdzić przed dodaniem do aktywnych subskrypcji.'}
                </Text>
              </View>

              <View style={[styles.futurePayloadBox, { backgroundColor: `${theme.colors.primary}14`, borderColor: `${theme.colors.primary}33` }]}>
                <Text style={[styles.futurePayloadTitle, { color: theme.colors.primary }]}>Przyszły payload dla backendu</Text>
                <Text style={styles.futurePayloadText}>
                  itemId: {String(item.id || item.sourceMessageId || key)}{'\n'}
                  bucket: {bucket}{'\n'}
                  primaryAction: {action}{'\n'}
                  reviewedAt: znacznik czasu z aplikacji
                </Text>
              </View>

              {isReviewBucket ? (
                <View style={styles.productModalActions}>
                  <TouchableOpacity style={[styles.productModalPrimary, { backgroundColor: theme.colors.primary }]} onPress={() => handleProductReviewAction(key, 'nadal aktywne')}>
                    <CheckCircle size={18} color={theme.colors.darkText} />
                    <Text style={styles.productModalPrimaryText}>Nadal aktywne</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.productModalSecondary} onPress={() => handleProductReviewAction(key, 'anulowane')}>
                    <Text style={styles.productModalSecondaryText}>Anulowane</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.productModalSecondary} onPress={() => handleProductReviewAction(key, 'nie subskrypcja')}>
                    <Text style={styles.productModalSecondaryText}>Nie subskrypcja</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.productModalGhost} onPress={() => handleProductReviewAction(key, 'przypomnij później')}>
                    <Text style={styles.productModalGhostText}>Przypomnij później</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.productModalActions}>
                  <TouchableOpacity style={[styles.productModalPrimary, { backgroundColor: theme.colors.primary }]} onPress={() => handleProductReviewAction(key, 'sprawdzone')}>
                    <CheckCircle size={18} color={theme.colors.darkText} />
                    <Text style={styles.productModalPrimaryText}>Oznacz jako sprawdzone</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.productModalGhost} onPress={() => handleProductReviewAction(key, 'ignoruj')}>
                    <Text style={styles.productModalGhostText}>Ignoruj</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderImportPreviewModal = () => {
    if (!importPreviewResult) return null;

    const previewItems = [
      ...(Array.isArray(importPreviewResult.drafts) ? importPreviewResult.drafts : []),
      ...(Array.isArray(importPreviewResult.items) ? importPreviewResult.items : []),
      ...(Array.isArray(importPreviewResult.subscriptions) ? importPreviewResult.subscriptions : []),
    ];
    const dedupedPreviewItems = previewItems.filter((item, index, list) => list.indexOf(item) === index);
    const previewCount = importPreviewResult.count ?? dedupedPreviewItems.length;
    const warnings = Array.isArray(importPreviewResult.warnings) ? importPreviewResult.warnings : [];

    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.productModalOverlay}>
          <View style={styles.productModal}>
            <View style={styles.productModalHandle} />
            <View style={styles.productModalHeader}>
              <View style={styles.productModalTitleBlock}>
                <Text style={styles.productModalEyebrow}>Import preview</Text>
                <Text style={styles.productModalTitle}>Drafty przed zapisem</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setImportPreviewResult(null)}>
                <X size={21} color={vibrantTheme.colors.textMuted} />
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
                  <Text style={styles.importPreviewSummaryLabel}>draftów do sprawdzenia</Text>
                </View>
                <Text style={styles.importPreviewSummaryText}>
                  To nadal tylko podgląd. Finalny zapis subskrypcji powinien nastąpić dopiero po potwierdzeniu użytkownika.
                </Text>
              </View>

              {!!importPreviewResult.message && (
                <Text style={styles.importPreviewMessage}>{importPreviewResult.message}</Text>
              )}

              {warnings.length > 0 && (
                <View style={styles.importWarningsBox}>
                  <Text style={styles.importWarningsTitle}>Uwagi backendu</Text>
                  {warnings.map((warning, index) => (
                    <Text key={`${warning}-${index}`} style={styles.importWarningText}>• {warning}</Text>
                  ))}
                </View>
              )}

              {dedupedPreviewItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <Inbox size={32} color={theme.colors.textMuted} />
                  <Text style={styles.emptyTitle}>Brak draftów w odpowiedzi</Text>
                  <Text style={styles.emptyText}>
                    Endpoint odpowiedział, ale nie zwrócił jeszcze listy draftów. To bezpieczny stan przejściowy po stronie integracji.
                  </Text>
                </View>
              ) : (
                dedupedPreviewItems.map((rawDraft, index) => {
                  const draft = rawDraft as any;
                  const subscription = draft.subscription || {};
                  const title = draft.name || draft.provider || subscription.name || subscription.provider || `Draft ${index + 1}`;
                  const amount = formatMaybeAmount(
                    draft.amount ?? draft.monthlyAmount ?? draft.price ?? subscription.amount,
                    draft.currency ?? subscription.currency
                  );
                  const billingCycle = draft.billingCycle || subscription.billingCycle;
                  const category = draft.category || subscription.category;
                  const recommendedAction = draft.action || draft.recommendedAction || draft.type;
                  const recurringBill = draft.isRecurringBill || subscription.isRecurringBill;
                  const nextPayment = typeof (draft.nextPaymentDate || subscription.nextPaymentDate) === 'string'
                    ? formatDate(draft.nextPaymentDate || subscription.nextPaymentDate)
                    : null;

                  return (
                    <View key={`${title}-${index}`} style={styles.importDraftCard}>
                      <View style={styles.importDraftTop}>
                        <View style={[styles.importDraftIcon, { backgroundColor: `${theme.colors.primary}22` }]}>
                          <Text style={[styles.importDraftIconText, { color: theme.colors.primary }]}>
                            {String(title).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.importDraftMain}>
                          <Text style={styles.importDraftTitle} numberOfLines={1}>{title}</Text>
                          <Text style={styles.importDraftMeta} numberOfLines={1}>
                            {[recommendedAction, category, billingCycle, recurringBill ? 'rachunek cykliczny' : null, nextPayment].filter(Boolean).join(' · ') || 'Draft subskrypcji'}
                          </Text>
                        </View>
                        {!!amount && <Text style={styles.importDraftAmount}>{amount}</Text>}
                      </View>
                      {!!(draft.notes || draft.evidenceSnippet) && (
                        <Text style={styles.snippet} numberOfLines={3}>{draft.notes || draft.evidenceSnippet}</Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderReviewModal = () => (
    <Modal visible={!!selectedDetection} transparent animationType="slide">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Zatwierdź kandydaturę</Text>
              <Text style={styles.modalSubtitle}>{selectedDetection?.name || selectedDetection?.provider}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDetection(null)}>
              <X size={22} color="#64748B" />
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
              style={[styles.acceptBtn, { backgroundColor: theme.colors.primary }, (!canAccept || acceptMutation.isPending) && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={acceptMutation.isPending}
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
            <Mail size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Email Scan</Text>
          <Text style={styles.heroText}>
            Znajdź kandydatury subskrypcji w Gmailu albo przez manualne IMAP. Zawsze pokazujemy wynik do review przed zapisem.
          </Text>
        </View>

        {renderPrivacyCopy()}

        <View style={styles.sourceSwitch}>
          <TouchableOpacity
            style={[styles.sourceSwitchButton, scanSource === 'gmail' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setScanSource('gmail')}
            activeOpacity={0.84}
          >
            <Mail size={16} color={scanSource === 'gmail' ? theme.colors.darkText : theme.colors.textMuted} />
            <Text style={[styles.sourceSwitchText, scanSource === 'gmail' && { color: theme.colors.darkText }]}>Gmail OAuth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sourceSwitchButton, scanSource === 'imap' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setScanSource('imap')}
            activeOpacity={0.84}
          >
            <Inbox size={16} color={scanSource === 'imap' ? theme.colors.darkText : theme.colors.textMuted} />
            <Text style={[styles.sourceSwitchText, scanSource === 'imap' && { color: theme.colors.darkText }]}>Manual IMAP</Text>
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <ExternalLink size={20} color="#FFFFFF" />
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
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Search size={20} color="#FFFFFF" />
                    <Text style={styles.connectBtnText}>Skanuj Gmaila</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
        ) : (
          renderImapConnectionCard()
        )}

        {(scanSource === 'imap' || isConnected) && renderAdvancedOptions()}

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
          detections.map((item) => renderDetectionCard(item))
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
  profileRow: { gap: 10, paddingRight: 6 },
  profileChip: {
    minWidth: 118,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  profileLabel: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  profileHint: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
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
  deepScanBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: vibrantTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  deepScanBtnText: { color: vibrantTheme.colors.darkText, fontSize: 13, fontWeight: '900' },
  reviewProgressCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  reviewProgressTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewProgressTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  reviewProgressText: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  reviewProgressPercent: { color: vibrantTheme.colors.primary, fontSize: 20, fontWeight: '900' },
  reviewProgressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  reviewProgressFill: { height: '100%', borderRadius: 999, backgroundColor: vibrantTheme.colors.primary },
  reviewProgressHint: { color: vibrantTheme.colors.textSubtle, fontSize: 11, lineHeight: 16, fontWeight: '700' },
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
  importPreviewCount: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
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
  reviewStatsGrid: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  reviewStatBox: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    justifyContent: 'space-between',
  },
  reviewStatValue: { color: vibrantTheme.colors.text, fontSize: 20, fontWeight: '900' },
  reviewStatLabel: { color: vibrantTheme.colors.textMuted, fontSize: 10, lineHeight: 13, fontWeight: '800' },
  productFilterRow: { gap: 8, paddingRight: 4 },
  productFilterChip: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  productFilterChipActive: {
    backgroundColor: vibrantTheme.colors.primary,
    borderColor: vibrantTheme.colors.primary,
  },
  productFilterText: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '900' },
  productFilterTextActive: { color: vibrantTheme.colors.darkText },
  productFilterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: vibrantTheme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  productFilterCountActive: {
    backgroundColor: 'rgba(0,0,0,0.14)',
    color: vibrantTheme.colors.darkText,
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
  reviewedBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  reviewedBadgeText: { color: '#CBD5E1', fontSize: 10, fontWeight: '900' },
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
  productActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  productPrimaryAction: {
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: vibrantTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
  },
  productPrimaryActionText: { color: vibrantTheme.colors.darkText, fontSize: 12, fontWeight: '900' },
  productSecondaryAction: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  productSecondaryActionText: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '900' },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  productActionLabel: { flex: 1, color: vibrantTheme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  productMiniAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productMiniActionText: { color: vibrantTheme.colors.primary, fontSize: 12, fontWeight: '900' },
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
  futurePayloadBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  futurePayloadTitle: { color: vibrantTheme.colors.primary, fontSize: 13, fontWeight: '900', marginBottom: 6 },
  futurePayloadText: { color: vibrantTheme.colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
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

  // Advanced preview styles
  advancedSection: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  advancedTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: vibrantTheme.colors.textMuted,
  },
  advancedContent: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: vibrantTheme.colors.border,
  },
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
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: vibrantTheme.colors.primary,
  },
  demoResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: vibrantTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  demoResultBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: vibrantTheme.colors.darkText,
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
