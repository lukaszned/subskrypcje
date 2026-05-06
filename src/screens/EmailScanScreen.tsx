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
  Inbox,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
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
  SubscriptionCategory,
} from '../types/api';

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
  if (!value) return null;
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toInputDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function safeDate(value: string | null | undefined) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

  const handleScan = () => {
    scanMutation.mutate({ limit: 25, sinceDays: 365 }, {
      onSuccess: (result) => {
        Alert.alert(
          'Skan zakończony',
          `Przeanalizowano ${result.scannedMessages} wiadomości. Nowe kandydatury: ${result.createdDetections}.`
        );
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

  const renderDetectionCard = (item: DetectedSubscription) => {
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
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleIgnore(item)} disabled={ignoreMutation.isPending}>
            <XCircle size={18} color="#64748B" />
            <Text style={styles.secondaryBtnText}>Ignoruj</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setSelectedDetection(item)}>
            <CheckCircle size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Review</Text>
          </TouchableOpacity>
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
          <ArrowLeft size={24} color="#14251B" />
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
              <TouchableOpacity style={styles.scanBtn} onPress={handleScan} disabled={scanMutation.isPending}>
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
          detections.map(renderDetectionCard)
        )}
      </ScrollView>

      {renderReviewModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#14251B' },
  content: { padding: 20, paddingBottom: 48 },
  heroCard: { backgroundColor: '#0B6B3A', borderRadius: 28, padding: 22, marginBottom: 16 },
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
  heroText: { fontSize: 14, color: '#D8F5E5', lineHeight: 20 },
  privacyBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  privacyTitle: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  privacyText: { fontSize: 13, color: '#047857', lineHeight: 19, marginTop: 4 },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#1C3025',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#14251B' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusBadgeOk: { backgroundColor: '#ECFDF5' },
  statusBadgeMuted: { backgroundColor: '#F1F5F9' },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  statusBadgeTextOk: { color: '#059669' },
  statusBadgeTextMuted: { color: '#64748B' },
  statGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statItem: { flex: 1, backgroundColor: '#F6F8F4', borderRadius: 14, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#14251B' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 2 },
  lastScan: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  connectBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#0B6B3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#0B6B3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F3EC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CFE5D6',
  },
  scanningIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scanningCopy: { flex: 1 },
  scanningTitle: { color: '#14251B', fontSize: 14, fontWeight: '900' },
  scanningText: { color: '#66756A', fontSize: 12, fontWeight: '600', marginTop: 2 },
  connectBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#14251B' },
  sectionCounter: { fontSize: 13, fontWeight: '800', color: '#0B6B3A' },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#14251B', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 6 },
  detectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1C3025',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  detectionTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F3EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerIconText: { color: '#0B6B3A', fontSize: 18, fontWeight: '800' },
  detectionMain: { flex: 1 },
  detectionName: { fontSize: 16, fontWeight: '800', color: '#14251B' },
  detectionMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateRowText: { fontSize: 13, fontWeight: '700', color: '#B45309' },
  snippet: { fontSize: 13, color: '#475569', lineHeight: 19, backgroundColor: '#F6F8F4', borderRadius: 12, padding: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtnText: { color: '#64748B', fontWeight: '800' },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0B6B3A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalContainer: {
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: '#14251B' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  evidenceBox: { backgroundColor: '#F6F8F4', borderRadius: 16, padding: 14, marginBottom: 18 },
  evidenceLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  evidenceText: { fontSize: 13, color: '#475569', lineHeight: 19 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '800', color: '#14251B', marginBottom: 8 },
  labelOptional: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8 },
  textInput: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#F6F8F4',
    paddingHorizontal: 14,
    color: '#14251B',
    fontSize: 15,
    fontWeight: '600',
  },
  inputError: { borderWidth: 1, borderColor: '#EF4444' },
  notesInput: { minHeight: 78, paddingTop: 12, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F1F5F9' },
  pillActive: { backgroundColor: '#E8F3EC', borderWidth: 1, borderColor: '#0B6B3A' },
  pillText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  pillTextActive: { color: '#0B6B3A' },
  dateButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F6F8F4',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: { color: '#14251B', fontSize: 15, fontWeight: '700' },
  trialInfo: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, marginBottom: 18 },
  trialInfoText: { flex: 1, color: '#B45309', fontSize: 13, fontWeight: '700' },
  acceptBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  acceptBtnDisabled: { opacity: 0.55 },
  acceptBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

export default EmailScanScreen;
