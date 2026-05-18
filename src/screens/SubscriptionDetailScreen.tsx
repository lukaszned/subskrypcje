// =============================================================
// src/screens/SubscriptionDetailScreen.tsx
//
// Szczegóły subskrypcji z akcjami (Opłać, Edytuj, Usuń, Anuluj).
// =============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft, Edit, Trash2, Calendar, CreditCard, 
  Tag, Clock, ExternalLink, CheckCircle, XCircle, ArrowRight, Users, AlertCircle,
  ShieldCheck, FileText, Link as LinkIcon
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { CancelAssistantModal } from '../components/CancelAssistantModal';

// Hooks
import { useSubscription } from '../hooks/useSubscription';
import { useSubscriptionHistory } from '../hooks/useSubscriptionHistory';
import { useSubscriptionPayments } from '../hooks/useSubscriptionPayments';
import { useDeleteSubscription } from '../hooks/useDeleteSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { useSubscriptionCancelGuide } from '../hooks/useSubscriptionCancelGuide';
import { useCancelGuideRequest } from '../hooks/useCancelGuideRequest';
import { CATEGORY_LABELS, SubscriptionEvent } from '../types/api';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { daysUntilDate, formatRelativeDay, parseAppDate } from '../utils/date';

export const SubscriptionDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'SubscriptionDetail'>>();
  const route = useRoute<RouteProp<AppStackParamList, 'SubscriptionDetail'>>();
  const { theme } = useTheme();
  const { id } = route.params;

  const { data: sub, isLoading: isSubLoading } = useSubscription(id);
  const { data: historyData, isLoading: isHistoryLoading } = useSubscriptionHistory(id);
  const { data: paymentsData, isLoading: isPaymentsLoading } = useSubscriptionPayments(id);

  const deleteMutation = useDeleteSubscription();
  const payMutation = usePaySubscription();
  const cancelMutation = useCancelSubscription();
  const requestGuideMutation = useCancelGuideRequest();
  
  const { data: cancelGuideLookup } = useSubscriptionCancelGuide(id);

  const [isCancelModalVisible, setIsCancelModalVisible] = React.useState(false);

  const isLoading = isSubLoading;

  if (isLoading || !sub) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={theme.colors.text} /></TouchableOpacity>
        </View>
        <View style={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 30 }}>
            <View style={[styles.logoContainer, { backgroundColor: '#E2E8F0' }]} />
            <View style={{ width: 150, height: 24, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 8 }} />
            <View style={{ width: 100, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
          </View>
          <View style={{ height: 200, backgroundColor: theme.colors.card, borderRadius: 24, padding: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  const openCancelUrl = () => {
    if (sub.cancelUrl) {
      Linking.openURL(sub.cancelUrl).catch(() => {
        Alert.alert('Błąd', 'Nie można otworzyć linku rezygnacji.');
      });
    }
  };

  const handleDelete = () => {
    Alert.alert('Usuń subskrypcję', 'Czy na pewno chcesz trwale usunąć tę subskrypcję?', [
      { text: 'Anuluj', style: 'cancel' },
      { 
        text: 'Usuń', 
        style: 'destructive', 
        onPress: () => deleteMutation.mutate(id, { onSuccess: () => navigation.goBack() }) 
      },
    ]);
  };

  const handlePay = () => {
    payMutation.mutate(id, {
      onSuccess: () => Alert.alert('Sukces', 'Subskrypcja została oznaczona jako opłacona.'),
    });
  };

  const handleCancel = () => {
    setIsCancelModalVisible(true);
  };

  const handleRequestGuide = () => {
    requestGuideMutation.mutate(id, {
      onSuccess: (data) => {
        Alert.alert(
          data.alreadyExisted ? 'Zgłoszenie już istnieje' : 'Dziękujemy',
          data.message || (data.alreadyExisted ? 'To zgłoszenie jest już zapisane.' : 'Zapisaliśmy zgłoszenie.')
        );
      },
      onError: (err: any) => {
        if (err?.status === 409 && err?.body?.code === 'CANCEL_GUIDE_ALREADY_EXISTS') {
          Alert.alert('Informacja', 'Instrukcja dla tej usługi właśnie się pojawiła!');
        } else if (err?.status === 404) {
          Alert.alert('Nie znaleziono subskrypcji', 'Nie udało się znaleźć tej subskrypcji dla aktualnego konta.');
        } else {
          Alert.alert('Błąd', 'Nie udało się wysłać zgłoszenia.');
        }
      }
    });
  };

  const nextDate = parseAppDate(sub.nextPaymentDate);
  const nextDaysLeft = daysUntilDate(sub.nextPaymentDate);
  const trialDaysLeft = daysUntilDate(sub.trialEndDate);

  let parsedNotes = { text: sub.notes || '', isShared: false, peopleCount: undefined as number | undefined };
  try {
    if (sub.notes?.startsWith('{')) {
      const parsed = JSON.parse(sub.notes);
      if (parsed.text !== undefined) parsedNotes.text = parsed.text;
      if (parsed.isShared !== undefined) parsedNotes.isShared = parsed.isShared;
      if (parsed.peopleCount !== undefined) parsedNotes.peopleCount = parsed.peopleCount;
    }
  } catch(e) {}

  const statusConfig = (() => {
    if (sub.status === 'canceled') return { label: 'Anulowana', color: vibrantTheme.colors.textMuted, bg: 'rgba(255,255,255,0.1)' };
    if (sub.status === 'overdue' || (nextDaysLeft !== null && nextDaysLeft < 0)) {
      return { label: 'Po terminie', color: vibrantTheme.colors.danger, bg: 'rgba(255,77,109,0.16)' };
    }
    if (sub.isTrial) return { label: 'Trial', color: vibrantTheme.colors.warning, bg: 'rgba(251,191,36,0.16)' };
    if (nextDaysLeft !== null && nextDaysLeft <= 3) return { label: 'Wkrótce', color: vibrantTheme.colors.warning, bg: 'rgba(251,191,36,0.16)' };
    return { label: 'Aktywna', color: theme.colors.primary, bg: `${theme.colors.primary}24` };
  })();

  const cancelReadiness = (() => {
    if (sub.status === 'canceled') {
      return {
        title: 'Subskrypcja anulowana',
        desc: 'Ta usługa nie powinna już generować kolejnych płatności.',
        icon: CheckCircle,
        color: vibrantTheme.colors.success,
        bg: 'rgba(52,211,153,0.14)',
      };
    }
    if (cancelGuideLookup?.hasGuide) {
      return {
        title: 'Instrukcja anulowania gotowa',
        desc: 'Możesz przejść przez Cancel Assistant i zamknąć usługę krok po kroku.',
        icon: ShieldCheck,
        color: theme.colors.primary,
        bg: `${theme.colors.primary}22`,
      };
    }
    if (sub.cancelUrl) {
      return {
        title: 'Link anulowania zapisany',
        desc: 'Masz bezpośredni skrót do strony rezygnacji u dostawcy.',
        icon: LinkIcon,
        color: vibrantTheme.colors.cyan,
        bg: 'rgba(34,211,238,0.14)',
      };
    }
    return {
      title: 'Brakuje instrukcji anulowania',
      desc: 'Możesz zgłosić brak poradnika, a na razie anulować usługę u dostawcy.',
      icon: FileText,
      color: vibrantTheme.colors.warning,
      bg: 'rgba(251,191,36,0.14)',
    };
  })();
  const CancelReadinessIcon = cancelReadiness.icon;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.glowTop, { backgroundColor: `${theme.colors.primary}29` }]} />
      <View style={styles.glowBottom} />
      <View style={styles.header}>
        <TouchableOpacity style={[styles.headerIconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Subskrypcja</Text>
          <Text style={styles.headerTitle}>Szczegóły planu</Text>
        </View>
        <TouchableOpacity style={[styles.headerIconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => navigation.navigate('AddSubscription', { subscriptionId: id })}>
          <Edit size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={theme.gradients.hero} style={[styles.heroCard, { shadowColor: theme.colors.primary }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>{sub.name.charAt(0)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
          <Text style={styles.name}>{sub.name}</Text>
          <Text style={styles.provider}>{[sub.provider, sub.planName].filter(Boolean).join(' · ') || 'Plan własny'}</Text>
          <View style={styles.priceTag}>
            <Text style={styles.price}>{sub.amount.toFixed(2)} {sub.currency}</Text>
            <Text style={styles.cycle}>/ {sub.billingCycle}</Text>
          </View>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Następna</Text>
              <Text style={styles.heroMetricValue}>{formatRelativeDay(sub.nextPaymentDate)}</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Kategoria</Text>
              <Text style={styles.heroMetricValue}>{CATEGORY_LABELS[sub.category] || sub.category}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          {sub.status !== 'canceled' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]} onPress={handlePay} disabled={payMutation.isPending}>
              {payMutation.isPending ? <ActivityIndicator size="small" color={theme.colors.darkText} /> : <CheckCircle size={20} color={theme.colors.darkText} />}
              <Text style={styles.actionBtnText}>Oznacz jako opłaconą</Text>
            </TouchableOpacity>
          )}
          {sub.status !== 'canceled' ? (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handleCancel}>
              <XCircle size={20} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Anuluj</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.canceledBadge}>
              <Text style={styles.canceledBadgeText}>ANULOWANA</Text>
            </View>
          )}
        </View>

        <View style={styles.decisionGrid}>
          <View style={styles.decisionCard}>
            <View style={[styles.decisionIcon, { backgroundColor: `${theme.colors.primary}20`, borderColor: `${theme.colors.primary}33` }]}>
              <Calendar size={19} color={theme.colors.primary} />
            </View>
            <View style={styles.decisionText}>
              <Text style={styles.decisionTitle}>Termin płatności</Text>
              <Text style={styles.decisionDesc}>
                {nextDate
                  ? `${String(nextDate.getDate()).padStart(2, '0')}.${String(nextDate.getMonth() + 1).padStart(2, '0')}.${nextDate.getFullYear()} · ${formatRelativeDay(sub.nextPaymentDate)}`
                  : 'Brak zaplanowanej daty'}
              </Text>
            </View>
          </View>

          <View style={styles.decisionCard}>
            <View style={[styles.decisionIcon, { backgroundColor: `${theme.colors.primary}20`, borderColor: `${theme.colors.primary}33` }]}>
              <CreditCard size={19} color={theme.colors.primary} />
            </View>
            <View style={styles.decisionText}>
              <Text style={styles.decisionTitle}>Metoda płatności</Text>
              <Text style={styles.decisionDesc}>{sub.paymentMethodLabel || 'Nie ustawiono'}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.readinessCard}
          activeOpacity={0.86}
          onPress={sub.status === 'canceled' ? undefined : handleCancel}
        >
          <View style={[styles.readinessIcon, { backgroundColor: cancelReadiness.bg }]}>
            <CancelReadinessIcon size={21} color={cancelReadiness.color} />
          </View>
          <View style={styles.readinessBody}>
            <Text style={styles.readinessTitle}>{cancelReadiness.title}</Text>
            <Text style={styles.readinessDesc}>{cancelReadiness.desc}</Text>
          </View>
          {sub.status !== 'canceled' && <ArrowRight size={18} color={vibrantTheme.colors.textMuted} />}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Calendar size={20} color="#94A3B8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Następna płatność</Text>
              <Text style={styles.infoValue}>
                {nextDate
                  ? `${String(nextDate.getDate()).padStart(2, '0')}.${String(nextDate.getMonth() + 1).padStart(2, '0')}.${nextDate.getFullYear()} (${formatRelativeDay(sub.nextPaymentDate).toLowerCase()})`
                  : 'Brak zaplanowanej płatności'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Tag size={20} color="#94A3B8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kategoria</Text>
              <Text style={styles.infoValue}>{CATEGORY_LABELS[sub.category]}</Text>
            </View>
          </View>

          {parsedNotes.isShared && parsedNotes.peopleCount && (
            <View style={styles.infoRow}>
              <Users size={20} color="#94A3B8" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Współdzielenie</Text>
                <Text style={styles.infoValue}>Koszt podzielony na {parsedNotes.peopleCount} osoby</Text>
              </View>
            </View>
          )}

          {sub.isTrial && sub.trialEndDate && (
            <View style={[styles.infoRow, styles.trialRow]}>
              <Clock size={20} color="#F59E0B" />
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: vibrantTheme.colors.warning }]}>Okres próbny</Text>
                <Text style={styles.infoValue}>
                  Kończy się {parseAppDate(sub.trialEndDate)?.toLocaleDateString('pl-PL') || '-'}
                  {trialDaysLeft !== null && trialDaysLeft > 0 ? ` (za ${trialDaysLeft} dni)` : ' (dziś)'}
                </Text>
              </View>
            </View>
          )}

          {sub.cancelUrl && (
            <TouchableOpacity 
              style={styles.cancelUrlBtn} 
              onPress={openCancelUrl}
            >
              <ExternalLink size={20} color="#6366F1" />
              <Text style={styles.cancelUrlBtnText}>Otwórz stronę rezygnacji</Text>
            </TouchableOpacity>
          )}
          
          {cancelGuideLookup?.hasGuide === false && cancelGuideLookup.source === 'none' && (
            <TouchableOpacity 
              style={[styles.cancelUrlBtn, { borderTopWidth: sub.cancelUrl ? 1 : 0 }]} 
              onPress={handleRequestGuide}
              disabled={requestGuideMutation.isPending}
            >
              {requestGuideMutation.isPending ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <>
                  <AlertCircle size={20} color="#6366F1" />
                  <Text style={styles.cancelUrlBtnText}>Zgłoś brak instrukcji anulowania</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {parsedNotes.text ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Notatki</Text>
            <Text style={styles.notesText}>{parsedNotes.text}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.infoLabel}>Historia płatności</Text>
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{paymentsData?.count || 0} płatności</Text>
            </View>
          </View>
          
          {isPaymentsLoading ? (
            <Text style={{ color: vibrantTheme.colors.textMuted, fontSize: 14, marginTop: 8 }}>Ładuję historię płatności...</Text>
          ) : paymentsData?.items && paymentsData.items.length > 0 ? (
            <View style={styles.historyList}>
              {paymentsData.items.map((payment: any, index: number) => (
                <View key={payment.id} style={styles.historyItem}>
                  <View style={[styles.historyDot, { backgroundColor: '#10B981' }]} />
                  {index < paymentsData.items.length - 1 && <View style={styles.historyLine} />}
                  <View style={styles.historyMain}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.historyTitle}>
                        Płatność {payment.amount.toFixed(2)} {payment.currency}
                      </Text>
                      <Text style={[styles.historyTitle, { color: '#10B981' }]}>ZAKSIĘGOWANO</Text>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(payment.paidAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {payment.nextPaymentDateAfter && (
                      <Text style={styles.historyPayload}>
                        Następna: {new Date(payment.nextPaymentDateAfter).toLocaleDateString('pl-PL')}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: vibrantTheme.colors.textMuted, fontSize: 14, marginTop: 8 }}>Brak zarejestrowanych płatności.</Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.infoLabel}>Historia aktywności</Text>
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{historyData?.count || 0} zdarzeń</Text>
            </View>
          </View>
          
          {isHistoryLoading ? (
            <Text style={{ color: vibrantTheme.colors.textMuted, fontSize: 14, marginTop: 8 }}>Ładuję historię aktywności...</Text>
          ) : historyData?.items && historyData.items.length > 0 ? (
            <View style={styles.historyList}>
              {historyData.items.map((event: any, index: number) => (
                <View key={event.id} style={styles.historyItem}>
                  <View style={[
                    styles.historyDot, 
                    { backgroundColor: event.type === 'paid' ? '#10B981' : event.type === 'canceled' ? '#EF4444' : '#6366F1' }
                  ]} />
                  {index < historyData.items.length - 1 && <View style={styles.historyLine} />}
                  <View style={styles.historyMain}>
                    <Text style={styles.historyTitle}>
                      {event.type === 'created' ? 'Utworzono subskrypcję' : 
                       event.type === 'paid' ? 'Odnotowano płatność' : 
                       event.type === 'canceled' ? 'Anulowano subskrypcję' : 'Zaktualizowano dane'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(event.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: vibrantTheme.colors.textMuted, fontSize: 14, marginTop: 8 }}>Brak historii zdarzeń.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Trash2 size={20} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Usuń subskrypcję na stałe</Text>
        </TouchableOpacity>
      </ScrollView>

      <CancelAssistantModal
        isVisible={isCancelModalVisible}
        onClose={() => setIsCancelModalVisible(false)}
        subscriptionId={id}
        subscriptionName={sub.name}
        onConfirmCancel={() => cancelMutation.mutate(id)}
        onRequestGuide={handleRequestGuide}
        isRequestingGuide={requestGuideMutation.isPending}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -130,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  glowBottom: {
    position: 'absolute',
    left: -150,
    bottom: 80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139,92,246,0.14)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, alignItems: 'center', gap: 12 },
  headerIconButton: { width: 44, height: 44, borderRadius: 18, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerEyebrow: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: vibrantTheme.colors.text, marginTop: 2 },
  content: { padding: 20, paddingBottom: 36 },
  hero: { alignItems: 'center', marginBottom: 30 },
  heroCard: { borderRadius: 30, padding: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', ...vibrantTheme.shadows.glow },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  logoContainer: { width: 76, height: 76, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  logoText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  name: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  provider: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 5, fontWeight: '700' },
  priceTag: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  price: { fontSize: 34, fontWeight: '900', color: '#FFFFFF' },
  cycle: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginLeft: 6, fontWeight: '800' },
  heroMetrics: { flexDirection: 'row', gap: 10, marginTop: 20 },
  heroMetric: { flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 18, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  heroMetricLabel: { color: 'rgba(255,255,255,0.62)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  heroMetricValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', marginTop: 5 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1.25, minHeight: 54, borderRadius: 20, backgroundColor: vibrantTheme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, ...vibrantTheme.shadows.glow },
  actionBtnOutline: { flex: 0.85, backgroundColor: 'rgba(255,77,109,0.08)', borderWidth: 1, borderColor: 'rgba(255,77,109,0.5)', shadowOpacity: 0, elevation: 0 },
  actionBtnText: { color: vibrantTheme.colors.darkText, fontWeight: '900', fontSize: 16 },
  canceledBadge: { flex: 1, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  canceledBadgeText: { color: '#94A3B8', fontWeight: '800', fontSize: 14 },
  decisionGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  decisionCard: { flex: 1, backgroundColor: vibrantTheme.colors.card, borderRadius: 22, padding: 15, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  decisionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  decisionText: { flex: 1 },
  decisionTitle: { color: vibrantTheme.colors.text, fontSize: 13, fontWeight: '900' },
  decisionDesc: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 5 },
  readinessCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: vibrantTheme.colors.card, borderRadius: 24, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border, ...vibrantTheme.shadows.card },
  readinessIcon: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  readinessBody: { flex: 1 },
  readinessTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  readinessDesc: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 4 },
  infoCard: { backgroundColor: vibrantTheme.colors.card, borderRadius: 26, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border, ...vibrantTheme.shadows.card },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  trialRow: { backgroundColor: 'rgba(251,191,36,0.12)', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.28)' },
  infoTextContainer: { marginLeft: 16 },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 16, color: vibrantTheme.colors.text, fontWeight: '700', marginTop: 2 },
  cancelUrlBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: vibrantTheme.colors.border },
  cancelUrlBtnText: { color: '#6366F1', fontWeight: '600' },
  notesText: { fontSize: 15, color: vibrantTheme.colors.textMuted, marginTop: 8, lineHeight: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historyBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  historyBadgeText: { fontSize: 10, fontWeight: '800', color: vibrantTheme.colors.textMuted, textTransform: 'uppercase' },
  historyList: { gap: 16 },
  historyItem: { flexDirection: 'row', gap: 12, minHeight: 60 },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, zIndex: 2 },
  historyLine: { position: 'absolute', left: 4.5, top: 16, bottom: -16, width: 1, backgroundColor: vibrantTheme.colors.border },
  historyMain: { flex: 1, paddingBottom: 20 },
  historyTitle: { fontSize: 14, fontWeight: '800', color: vibrantTheme.colors.text },
  historyDate: { fontSize: 12, color: vibrantTheme.colors.textMuted, marginTop: 2 },
  historyPayload: { fontSize: 11, color: '#6366F1', fontWeight: '600', marginTop: 4 },
  historyAmount: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
});

export default SubscriptionDetailScreen;
