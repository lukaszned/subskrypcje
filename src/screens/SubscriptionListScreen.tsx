// =============================================================
// src/screens/SubscriptionListScreen.tsx
//
// Lista subskrypcji zasilona live data z backendu.
// =============================================================

import React, { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ArrowUpDown, ArrowLeft, CalendarClock, Clock, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';

// Hooki
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';
import { filterAndSortSubscriptions } from '../api/subscriptions';

// Typy
import { Subscription, CATEGORY_LABELS, BILLING_CYCLE_LABELS } from '../types/api';

// Komponent item
import SubscriptionListItem from './SubscriptionListItem';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';
import { daysUntilDate } from '../utils/date';
import { getEffectiveNextPaymentDate } from '../utils/subscriptionSchedule';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/LoadingState';
import { PressableScale } from '../components/PressableScale';
import { GlassCard, MetricTile, SectionHeader } from '../components/ui/PremiumPrimitives';
import { getSafeMutationErrorMessage } from '../utils/requestErrors';
import { getSeasonalStatus } from '../utils/subscriptionNotes';
import { goBackOrDashboard } from '../utils/navigation';
import { getSubscriptionDisplayStatus, type SubscriptionDisplayStatus } from '../utils/subscriptionDisplayStatus';

const toMonthlyAmount = (subscription: Subscription) => {
  const amount = Number(subscription.amount || 0);

  switch (subscription.billingCycle) {
    case 'yearly':
      return amount / 12;
    case 'weekly':
      return amount * 4.345;
    case 'one_time':
      return 0;
    case 'custom':
      return subscription.isRecurringBill ? amount : 0;
    default:
      return amount;
  }
};

const showActionError = (error: unknown, fallback: string) => {
  Alert.alert('Nie udało się wykonać akcji', getSafeMutationErrorMessage(error, fallback));
};

const STATUS_TABS: Array<{ id: SubscriptionDisplayStatus | 'all' | 'seasonal'; label: string }> = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'active', label: 'Aktywne' },
  { id: 'trial', label: 'Okres próbny' },
  { id: 'seasonal', label: 'Sezonowe' },
  { id: 'canceled', label: 'Anulowane' },
];

export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { theme } = useTheme();
  const canGoBack = navigation.canGoBack();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [activeStatus, setActiveStatus] = useState<SubscriptionDisplayStatus | 'all' | 'seasonal'>('all');
  const [sortOption, setSortOption] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'nextPaymentDate', order: 'asc' });

  const { data: allSubscriptions = [], isLoading, isFetching, isRefetching, isError, error, refetch } = useSubscriptions();

  const cancelMutation = useCancelSubscription();
  const payMutation = usePaySubscription();
  const actionLocksRef = useRef(new Set<string>());

  const normalizedSubscriptions = useMemo(() => (
    allSubscriptions
      .filter((item) => !!item?.id)
      .map((item) => ({
        ...item,
        name: item.name || item.provider || 'Subskrypcja',
        amount: Number(item.amount || 0),
        currency: item.currency || 'PLN',
        category: item.category || 'other',
        billingCycle: item.billingCycle || 'monthly',
        status: item.status || 'pending',
        isTrial: Boolean(item.isTrial),
      }))
  ), [allSubscriptions]);

  const subscriptions = useMemo(() => {
    const base = filterAndSortSubscriptions(normalizedSubscriptions, {
      search: deferredSearchQuery,
      sortBy: sortOption.field,
      sortOrder: sortOption.order,
    });

    if (activeStatus === 'all') return base;
    if (activeStatus === 'seasonal') {
      return base.filter((item) => getSubscriptionDisplayStatus(item) !== 'canceled' && getSeasonalStatus(item.notes).isSeasonal);
    }

    return base.filter((item) => getSubscriptionDisplayStatus(item) === activeStatus);
  }, [activeStatus, deferredSearchQuery, normalizedSubscriptions, sortOption.field, sortOption.order]);

  const portfolioStats = useMemo(() => {
    const counted = normalizedSubscriptions.filter((item) => item.status !== 'canceled' && item.includeInStats !== false);
    const monthlyTotal = counted.reduce((sum, item) => sum + toMonthlyAmount(item), 0);
    const dueSoon = counted.filter((item) => {
      const daysLeft = daysUntilDate(getEffectiveNextPaymentDate(item));
      return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length;
    const trialEndingSoon = counted.filter((item) => {
      const trialDays = daysUntilDate(item.trialEndDate);
      return item.isTrial && trialDays !== null && trialDays >= 0 && trialDays <= 7;
    }).length;

    return {
      active: counted.length,
      monthlyTotal,
      dueSoon,
      trialEndingSoon,
      currency: counted[0]?.currency || 'PLN',
    };
  }, [normalizedSubscriptions]);

  const handleCancel = useCallback((id: string, name: string) => {
    const actionKey = `cancel:${id}`;
    if (actionLocksRef.current.has(actionKey) || cancelMutation.isPending) return;

    actionLocksRef.current.add(actionKey);
    const releaseActionLock = () => actionLocksRef.current.delete(actionKey);

    Alert.alert(
      'Anulować subskrypcję?',
      `Czy na pewno chcesz anulować "${name}"?`,
      [
        { text: 'Nie', style: 'cancel', onPress: releaseActionLock },
        {
          text: 'Tak, anuluj',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(id, {
              onSuccess: () => Alert.alert('Sukces', 'Subskrypcja została anulowana.'),
              onError: (error) => showActionError(error, 'Nie udało się anulować subskrypcji.'),
              onSettled: releaseActionLock,
            });
          },
        },
      ],
      { onDismiss: releaseActionLock }
    );
  }, [cancelMutation]);

  const handlePay = useCallback((id: string, name: string) => {
    const actionKey = `pay:${id}`;
    if (actionLocksRef.current.has(actionKey) || payMutation.isPending) return;

    actionLocksRef.current.add(actionKey);
    const releaseActionLock = () => actionLocksRef.current.delete(actionKey);

    Alert.alert(
      'Opłacono?',
      `Oznaczyć "${name}" jako opłaconą?`,
      [
        { text: 'Anuluj', style: 'cancel', onPress: releaseActionLock },
        {
          text: 'Tak, opłacono',
          onPress: () => {
            payMutation.mutate(id, {
              onSuccess: () => Alert.alert('Sukces', 'Płatność została odnotowana.'),
              onError: (error) => showActionError(error, 'Nie udało się oznaczyć płatności.'),
              onSettled: releaseActionLock,
            });
          },
        },
      ],
      { onDismiss: releaseActionLock }
    );
  }, [payMutation]);

  const toggleSort = useCallback(() => {
    setSortOption((current) => {
      if (current.field === 'nextPaymentDate') {
        return { field: 'amount', order: 'desc' };
      }
      if (current.field === 'amount') {
        return { field: 'name', order: 'asc' };
      }
      return { field: 'nextPaymentDate', order: 'asc' };
    });
  }, []);

  const sortLabel = useMemo(() => {
    if (sortOption.field === 'nextPaymentDate') return 'Data';
    if (sortOption.field === 'amount') return 'Cena';
    if (sortOption.field === 'name') return 'Nazwa';
    return 'Sortuj';
  }, [sortOption.field]);

  const renderEmptyState = useCallback(() => {
    if (isError) {
      return (
        <ErrorState
          message={error?.message || 'Nie udało się odświeżyć listy. Jeśli mamy cache, pokażemy ostatni zapisany stan.'}
          onRetry={() => refetch()}
        />
      );
    }

    return (
      <EmptyState
        type={searchQuery ? 'search' : 'add'}
        title={searchQuery ? 'Nie ma takiej subskrypcji' : 'Nie masz jeszcze żadnych subskrypcji'}
        message={searchQuery
          ? 'Zmień filtr albo wyszukaj po nazwie usługi, planu lub kategorii.'
          : 'Dodaj pierwszą, a Sub-Sentry pokaże płatności, okresy próbne i miesięczny koszt w jednym miejscu.'}
        actionLabel={!searchQuery && activeStatus === 'all' ? 'Dodaj subskrypcję' : undefined}
        onAction={!searchQuery && activeStatus === 'all' ? () => navigation.navigate('AddSubscription') : undefined}
      />
    );
  }, [activeStatus, error?.message, isError, navigation, refetch, searchQuery]);

  const renderLoadingState = useCallback(() => (
    <View style={styles.loadingShell}>
      <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>Przygotowuję listę</Text>
      <Text style={[styles.loadingSubtitle, { color: theme.colors.textMuted }]}>Jeśli odświeżanie potrwa dłużej, aplikacja skorzysta z ostatniego zapisanego stanu.</Text>
      <SkeletonList rows={5} isDark />
    </View>
  ), [theme.colors.text, theme.colors.textMuted]);
  const renderItem = useCallback(({ item }: { item: Subscription }) => {
    const seasonalStatus = getSeasonalStatus(item.notes);

    return (
      <SubscriptionListItem
        item={{
          id: item.id,
          name: item.name,
          provider: item.provider,
          category: CATEGORY_LABELS[item.category] || item.category || 'Inne',
          amount: item.amount,
          currency: item.currency,
          nextPaymentDate: item.nextPaymentDate ? (() => {
            const d = getEffectiveNextPaymentDate(item);
            if (!d) return '-';
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
          })() : '-',
          cycle: BILLING_CYCLE_LABELS[item.billingCycle] || item.billingCycle || 'Co miesiąc',
          status: item.status,
          isTrial: item.isTrial,
          isSeasonal: seasonalStatus.isSeasonal,
          seasonEndLabel: seasonalStatus.label,
        }}
        onDelete={(id) => handleCancel(id, item.name)}
        onPause={(id) => handlePay(id, item.name)}
        onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
      />
    );
  }, [handleCancel, handlePay, navigation]);

  const renderPortfolioPulse = useCallback(() => (
    <GlassCard style={styles.pulseCard}>
      <View style={styles.pulseHeader}>
        <View>
          <Text style={styles.pulseEyebrow}>Portfolio</Text>
          <Text style={styles.pulseTitle}>{portfolioStats.monthlyTotal.toFixed(2)} {portfolioStats.currency} / mc</Text>
        </View>
        {isFetching && !isLoading && (
          <View style={[styles.syncPill, { backgroundColor: withAlpha(theme.colors.text, 0.06), borderColor: theme.colors.border }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.syncPillText}>Odświeżam</Text>
          </View>
        )}
      </View>
      <View style={styles.metricRow}>
        <MetricTile label="aktywne" value={portfolioStats.active} icon={Wallet} />
        <MetricTile label="do 7 dni" value={portfolioStats.dueSoon} icon={CalendarClock} />
        <MetricTile
          label="okresy próbne"
          value={portfolioStats.trialEndingSoon}
          icon={Clock}
          tone={portfolioStats.trialEndingSoon > 0 ? 'warning' : 'primary'}
        />
      </View>
    </GlassCard>
  ), [
    isFetching,
    isLoading,
    portfolioStats.active,
    portfolioStats.currency,
    portfolioStats.dueSoon,
    portfolioStats.monthlyTotal,
    portfolioStats.trialEndingSoon,
    theme.colors.border,
    theme.colors.primary,
    theme.colors.text,
  ]);

  const keyExtractor = useCallback((item: Subscription) => item.id, []);
  const handleStatusChange = useCallback((status: SubscriptionDisplayStatus | 'all' | 'seasonal') => {
    setActiveStatus(status);
  }, []);
  const refreshControl = useMemo(() => (
    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
  ), [isRefetching, refetch, theme.colors.primary]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          {canGoBack ? (
            <PressableScale onPress={() => goBackOrDashboard(navigation)} accessibilityLabel="Wstecz">
              <ArrowLeft size={24} color={theme.colors.text} />
            </PressableScale>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <View style={[styles.searchContainer, { backgroundColor: withAlpha(theme.colors.text, 0.07), borderColor: theme.colors.border }]}>
            <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Szukaj..."
              placeholderTextColor={theme.colors.textSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <PressableScale
            style={[styles.sortButton, { flexDirection: 'row', width: 'auto', paddingHorizontal: 12, backgroundColor: withAlpha(theme.colors.text, 0.07), borderColor: theme.colors.border }]}
            onPress={toggleSort}
          >
            <ArrowUpDown size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12 }}>{sortLabel}</Text>
          </PressableScale>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <SectionHeader title="Subskrypcje" subtitle="Filtruj, sortuj i szybko przechodź do szczegółów." />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.statusTabs}
          >
            {STATUS_TABS.map(tab => (
              <PressableScale
                key={tab.id}
                style={[styles.statusTab, { backgroundColor: withAlpha(theme.colors.text, 0.07), borderColor: theme.colors.border }, activeStatus === tab.id && { backgroundColor: withAlpha(theme.colors.primary, 0.18), borderColor: theme.colors.primary }]}
                onPress={() => handleStatusChange(tab.id)}
              >
                <Text style={[styles.statusTabText, { color: theme.colors.textMuted }, activeStatus === tab.id && { color: theme.colors.primary }]}>
                  {tab.label}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={subscriptions}
          keyExtractor={keyExtractor}
          contentContainerStyle={subscriptions.length === 0 ? styles.listEmptyContent : styles.listContent}
          renderItem={renderItem}
          ListHeaderComponent={normalizedSubscriptions.length > 0 ? renderPortfolioPulse : null}
          ListEmptyComponent={isLoading ? renderLoadingState : renderEmptyState}
          refreshControl={refreshControl}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  container: { flex: 1 },
  header: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, alignItems: 'center', gap: 12 },
  headerSpacer: { width: 24, height: 24 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: vibrantTheme.colors.card, borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: vibrantTheme.colors.text, fontWeight: '700' },
  sortButton: { width: 48, height: 50, backgroundColor: vibrantTheme.colors.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  filterSection: { paddingBottom: 16 },
  statusTabs: { paddingHorizontal: 20, gap: 10 },
  statusTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  statusTabText: { fontSize: 13, fontWeight: '700', color: vibrantTheme.colors.textMuted },
  statusTabTextActive: { color: vibrantTheme.colors.primary },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  listEmptyContent: { flex: 1, justifyContent: 'center' },
  pulseCard: {
    marginBottom: 18,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pulseEyebrow: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 4,
  },
  pulseTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  syncPillText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterHeader: { paddingHorizontal: 20 },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: vibrantTheme.colors.card, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: vibrantTheme.colors.text, marginBottom: 12 },
  emptyMessage: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 4 },
  addButton: { backgroundColor: vibrantTheme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 12, ...vibrantTheme.shadows.glow },
  addButtonText: { color: vibrantTheme.colors.darkText, fontWeight: '900' },
  loadingShell: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 16,
  },
});

export default SubscriptionListScreen;
