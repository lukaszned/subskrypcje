import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  FlaskConical,
  Inbox,
  Mail,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Wrench,
  X,
  XCircle,
} from 'lucide-react-native';
import { ApiError } from '../lib/apiClient';
import {
  useAcceptDetection,
  useEmailDetections,
  useEmailScanStatus,
  useGmailAuthUrl,
  useIgnoreDetection,
  useRunGmailScan,
} from '../hooks/useEmailScan';
import type { AppStackParamList } from '../types/navigation';
import {
  BillingCycle,
  CATEGORY_LABELS,
  DetectedSubscription,
  GmailScanRequest,
  SubscriptionCategory,
} from '../types/api';
import { vibrantTheme } from '../theme/vibrantTheme';
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

export const EmailScanScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'EmailScan'>>();
  const statusQuery = useEmailScanStatus();
  const detectionsQuery = useEmailDetections('pending', 20, 0);
  const authUrlMutation = useGmailAuthUrl();
  const scanMutation = useRunGmailScan();
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

  const status = statusQuery.data;
  const detections = detectionsQuery.data?.items ?? [];
  const isRefreshing = statusQuery.isFetching || detectionsQuery.isFetching;
  const isConnected = !!status?.gmailConnected;

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
        if (payload.dryRun) {
          setDryRunResults(result.created || []);
          Alert.alert(
            'Dry Run zakończony',
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
        Alert.alert('Błąd skanowania', error?.message || 'Nie udało się przeskanować Gmaila.');
      },
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
                Alert.alert('Błąd', error?.message || 'Nie udało się zignorować kandydatury.');
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

        Alert.alert('Błąd', error?.message || 'Nie udało się zaakceptować kandydatury.');
      },
    });
  };

  const renderPrivacyCopy = () => (
    <View style={styles.privacyBox}>
      <View style={styles.privacyHeader}>
        <ShieldCheck size={20} color="#10B981" />
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
        <Wrench size={16} color="#64748B" />
        <Text style={styles.advancedTitle}>Opcje zaawansowane / Dev</Text>
        <Settings size={16} color={showAdvanced ? "#0B6B3A" : "#94A3B8"} />
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedContent}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Tryb Dry Run</Text>
              <Text style={styles.toggleDesc}>Symulacja skanowania bez zapisu</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDryRun(!isDryRun)}
              style={[styles.toggle, isDryRun && styles.toggleActive]}
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
              style={[styles.toggle, isDebug && styles.toggleActive]}
            >
              <View style={[styles.toggleDot, isDebug && styles.toggleDotActive]} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => handleScan({ dryRun: true })}
            disabled={scanMutation.isPending}
          >
            <FlaskConical size={18} color="#0B6B3A" />
            <Text style={styles.testBtnText}>Uruchom testowy skan (Dry Run)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderDryRunResults = () => {
    if (!dryRunResults) return null;

    return (
      <View style={styles.dryRunSection}>
        <View style={styles.dryRunHeader}>
          <FlaskConical size={20} color="#0B6B3A" />
          <Text style={styles.dryRunTitle}>Wyniki Dry Run (Podgląd)</Text>
          <TouchableOpacity onPress={() => setDryRunResults(null)}>
            <X size={20} color="#64748B" />
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
          <View style={styles.providerIcon}>
            <Text style={styles.providerIconText}>{(item.name || item.provider || '?').charAt(0)}</Text>
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
            <Clock size={16} color="#F59E0B" />
            <Text style={styles.dateRowText}>
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
              <Text style={styles.previewBadgeText}>Tylko podgląd (Dry Run)</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleIgnore(item)} disabled={ignoreMutation.isPending}>
                <XCircle size={18} color="#64748B" />
                <Text style={styles.secondaryBtnText}>Ignoruj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setSelectedDetection(item)}>
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Review</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Waluta</Text>
              <View style={styles.pillRow}>
                {CURRENCIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pill, currency === item && styles.pillActive]}
                    onPress={() => setCurrency(item)}
                  >
                    <Text style={[styles.pillText, currency === item && styles.pillTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cykl</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {CYCLE_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.pill, cycle === item.id && styles.pillActive]}
                    onPress={() => setCycle(item.id)}
                  >
                    <Text style={[styles.pillText, cycle === item.id && styles.pillTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Następna płatność</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowNextPicker(true)}>
                <Clock size={18} color="#0B6B3A" />
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {CATEGORY_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.pill, category === item.id && styles.pillActive]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Text style={[styles.pillText, category === item.id && styles.pillTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {selectedDetection?.isTrial && selectedDetection.trialEndDate && (
              <View style={styles.trialInfo}>
                <AlertCircle size={16} color="#F59E0B" />
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
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={[styles.acceptBtn, (!canAccept || acceptMutation.isPending) && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFFFFF" />
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={vibrantTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Scan</Text>
        <TouchableOpacity onPress={refresh} style={styles.iconBtn}>
          <RefreshCw size={20} color="#0B6B3A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor="#0B6B3A" />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Mail size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Wykrywanie z Gmaila</Text>
          <Text style={styles.heroText}>
            Znajdź kandydatury subskrypcji w potwierdzeniach płatności, trialach i odnowieniach.
          </Text>
        </View>

        {renderPrivacyCopy()}

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Status</Text>
            <View style={[styles.statusBadge, isConnected ? styles.statusBadgeOk : styles.statusBadgeMuted]}>
              <Text style={[styles.statusBadgeText, isConnected ? styles.statusBadgeTextOk : styles.statusBadgeTextMuted]}>
                {isConnected ? 'Gmail połączony' : 'Niepołączony'}
              </Text>
            </View>
          </View>

          {statusQuery.isLoading ? (
            <ActivityIndicator color="#0B6B3A" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.statGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{status?.pendingDetectionsCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Do review</Text>
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
            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} disabled={authUrlMutation.isPending}>
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
              <View style={styles.scanningState}>
                <View style={styles.scanningIcon}>
                  <ActivityIndicator color="#0B6B3A" />
                </View>
                <View style={styles.scanningCopy}>
                  <Text style={styles.scanningTitle}>Szukam Twoich subskrypcji...</Text>
                  <Text style={styles.scanningText}>Analizuję tylko metadane i fragmenty wiadomości.</Text>
                </View>
              </View>
              )}
              <TouchableOpacity style={styles.scanBtn} onPress={() => handleScan()} disabled={scanMutation.isPending}>
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

        {isConnected && renderAdvancedOptions()}

        {renderDryRunResults()}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kandydatury do sprawdzenia</Text>
          <Text style={styles.sectionCounter}>{detectionsQuery.data?.count ?? 0}</Text>
        </View>

        {detectionsQuery.isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#0B6B3A" />
          </View>
        ) : detections.length === 0 ? (
          <View style={styles.emptyState}>
            <Inbox size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Brak kandydatur</Text>
            <Text style={styles.emptyText}>
              Po skanie nowe wykrycia pojawią się tutaj do ręcznego zatwierdzenia.
            </Text>
          </View>
        ) : (
          detections.map((item) => renderDetectionCard(item))
        )}
      </ScrollView>

      {renderReviewModal()}
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
    backgroundColor: 'rgba(32,246,181,0.12)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(32,246,181,0.22)',
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
  statusBadgeOk: { backgroundColor: 'rgba(32,246,181,0.14)' },
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
    backgroundColor: 'rgba(32,246,181,0.12)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(32,246,181,0.22)',
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
    backgroundColor: 'rgba(32,246,181,0.13)',
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
  pillActive: { backgroundColor: 'rgba(32,246,181,0.16)', borderWidth: 1, borderColor: vibrantTheme.colors.primary },
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

  // Advanced & Dry Run Styles
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
    backgroundColor: '#10B981',
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
    backgroundColor: 'rgba(32,246,181,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: vibrantTheme.colors.primary,
  },
  dryRunSection: {
    backgroundColor: 'rgba(32,246,181,0.1)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(32,246,181,0.22)',
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
    backgroundColor: 'rgba(32,246,181,0.2)',
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
