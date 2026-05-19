// =============================================================
// src/screens/SubscriptionListScreen.tsx
//
// Lista subskrypcji zasilona live data z backendu.
// =============================================================

import React, { useState, useMemo } from 'react';
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
import { Search, ArrowUpDown, ArrowLeft, CalendarClock, ShieldAlert, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';

// Hooki
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { usePaySubscription } from '../hooks/usePaySubscription';
import { filterAndSortSubscriptions } from '../api/subscriptions';

// Typy
import { Subscription, CATEGORY_LABELS, BILLING_CYCLE_LABELS, SubscriptionStatus } from '../types/api';

// Komponent item
import SubscriptionListItem from './SubscriptionListItem';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { daysUntilDate, parseAppDate } from '../utils/date';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { SkeletonList } from '../components/LoadingState';
import { PressableScale } from '../components/PressableScale';
import { GlassCard, MetricTile, SectionHeader } from '../components/ui/PremiumPrimitives';

const toMonthlyAmount = (subscription: Subscription) => {
  const amount = Number(subscription.amount || 0);

  switch (subscription.billingCycle) {
    case 'yearly':
      return amount / 12;
    case 'weekly':
      return amount * 4.345;
    case 'one_time':
      return 0;
    default:
      return amount;
  }
};

export const SubscriptionListScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { theme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [sortOption, setSortOption] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: 'nextPaymentDate', order: 'asc' });

  const { data: allSubscriptions = [], isLoading, isFetching, isRefetching, isError, error, refetch } = useSubscriptions();

  const cancelMutation = useCancelSubscription();
  const payMutation = usePaySubscription();

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

  const subscriptions = useMemo(() => filterAndSortSubscriptions(normalizedSubscriptions, {
    search: searchQuery,
    status: activeStatus === 'all' ? undefined : activeStatus,
    sortBy: sortOption.field,
    sortOrder: sortOption.order,
  }), [activeStatus, normalizedSubscriptions, searchQuery, sortOption.field, sortOption.order]);

  const portfolioStats = useMemo(() => {
    const counted = normalizedSubscriptions.filter((item) => item.status !== 'canceled' && item.includeInStats !== false);
    const monthlyTotal = counted.reduce((sum, item) => sum + toMonthlyAmount(item), 0);
    const dueSoon = counted.filter((item) => {
      const daysLeft = daysUntilDate(item.nextPaymentDate);
      return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length;
    const attention = counted.filter((item) => {
      const trialDays = daysUntilDate(item.trialEndDate);
      return item.status === 'overdue' || (item.isTrial && trialDays !== null && trialDays >= 0 && trialDays <= 7);
    }).length;

    return {
      active: counted.length,
      monthlyTotal,
      dueSoon,
      attention,
      currency: counted[0]?.currency || 'PLN',
    };
  }, [normalizedSubscriptions]);

  const handleCancel = (id: string, name: string) => {
    Alert.alert(
      'Anulować subskrypcję?',
      `Czy na pewno chcesz anulować "${name}"?`,
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak, anuluj',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(id, {
              onSuccess: () => Alert.alert('Sukces', 'Subskrypcja została anulowana.'),
              onError: (error) => Alert.alert('Błąd', error.message),
            });
          },
        },
      ]
    );
  };

  const handlePay = (id: string, name: string) => {
    Alert.alert(
      'Opłacono?',
      `Oznaczyć "${name}" jako opłaconą?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Tak, opłacono',
          onPress: () => {
            payMutation.mutate(id, {
              onSuccess: () => Alert.alert('Sukces', 'Płatność została odnotowana.'),
              onError: (error) => Alert.alert('Błąd', error.message),
            });
          },
        },
      ]
    );
  };

  const toggleSort = () => {
    if (sortOption.field === 'nextPaymentDate') {
      setSortOption({ field: 'amount', order: 'desc' });
    } else if (sortOption.field === 'amount') {
      setSortOption({ field: 'name', order: 'asc' });
    } else {
      setSortOption({ field: 'nextPaymentDate', order: 'asc' });
    }
  };

  const getSortLabel = () => {
    if (sortOption.field === 'nextPaymentDate') return 'Data';
    if (sortOption.field === 'amount') return 'Cena';
    if (sortOption.field === 'name') return 'Nazwa';
    return 'Sortuj';
  };

  const renderEmptyState = () => {
    if (isError) {
      return (
        <ErrorState
          message={error?.message || 'Nie udalo sie odswiezyc listy. Jesli mamy cache, pokazemy ostatni zapisany stan.'}
          onRetry={() => refetch()}
        />
      );
    }

    return (
      <EmptyState
        type={searchQuery ? 'search' : 'add'}
        title={searchQuery ? 'Nie ma takiej subskrypcji' : 'Dodaj pierwsza subskrypcje'}
        message={searchQuery
          ? 'Zmien filtr albo wyszukaj po nazwie uslugi, planu lub kategorii.'
          : 'Zbuduj swoje centrum kosztow: platnosci, triale, decyzje i oszczednosci beda widoczne w jednym miejscu.'}
        actionLabel={!searchQuery && activeStatus === 'all' ? 'Dodaj subskrypcje' : undefined}
        onAction={!searchQuery && activeStatus === 'all' ? () => navigation.navigate('AddSubscription') : undefined}
      />
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingShell}>
      <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>Przygotowuje liste</Text>
      <Text style={[styles.loadingSubtitle, { color: theme.colors.textMuted }]}>Jesli odswiezanie potrwa dluzej, aplikacja skorzysta z ostatniego zapisanego stanu.</Text>
      <SkeletonList rows={5} isDark />
    </View>
  );
  const renderItem = ({ item }: { item: Subscription }) => {
    return (
      <SubscriptionListItem
        item={{
          id: item.id,
          name: item.name,
          category: CATEGORY_LABELS[item.category] || item.category || 'Inne',
          amount: item.amount,
          currency: item.currency,
          nextPaymentDate: item.nextPaymentDate ? (() => {
            const d = parseAppDate(item.nextPaymentDate);
            if (!d) return '-';
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
          })() : '-',
          cycle: BILLING_CYCLE_LABELS[item.billingCycle] || item.billingCycle || 'Co miesiąc',
          status: item.status,
          isTrial: item.isTrial,
        }}
        onDelete={(id) => handleCancel(id, item.name)}
        onPause={(id) => handlePay(id, item.name)}
        onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
      />
    );
  };

  const renderPortfolioPulse = () => (
    <GlassCard style={styles.pulseCard}>
      <View style={styles.pulseHeader}>
        <View>
          <Text style={styles.pulseEyebrow}>Portfolio</Text>
          <Text style={styles.pulseTitle}>{portfolioStats.monthlyTotal.toFixed(2)} {portfolioStats.currency} / mc</Text>
        </View>
        {isFetching && !isLoading && (
          <View style={styles.syncPill}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.syncPillText}>Odświeżam</Text>
          </View>
        )}
      </View>
      <View style={styles.metricRow}>
        <MetricTile label="aktywne" value={portfolioStats.active} icon={Wallet} />
        <MetricTile label="do 7 dni" value={portfolioStats.dueSoon} icon={CalendarClock} />
        <MetricTile
          label="uwaga"
          value={portfolioStats.attention}
          icon={ShieldAlert}
          tone={portfolioStats.attention > 0 ? 'warning' : 'primary'}
        />
      </View>
    </GlassCard>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <PressableScale onPress={() => navigation.goBack()}><ArrowLeft size={24} color={theme.colors.text} /></PressableScale>
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Search size={20} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Szukaj..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <PressableScale
            style={[styles.sortButton, { flexDirection: 'row', width: 'auto', paddingHorizontal: 12 }]}
            onPress={toggleSort}
          >
            <ArrowUpDown size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12 }}>{getSortLabel()}</Text>
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
            {[
              { id: 'all', label: 'Wszystkie' },
              { id: 'pending', label: 'Aktywne' },
              { id: 'paid', label: 'Opłacone' },
              { id: 'overdue', label: 'Zaległe' },
              { id: 'canceled', label: 'Anulowane' },
            ].map(tab => (
              <PressableScale
                key={tab.id}
                style={[styles.statusTab, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, activeStatus === tab.id && { backgroundColor: `${theme.colors.primary}2E`, borderColor: theme.colors.primary }]}
                onPress={() => setActiveStatus(tab.id as any)}
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={subscriptions.length === 0 ? styles.listEmptyContent : styles.listContent}
          renderItem={renderItem}
          ListHeaderComponent={normalizedSubscriptions.length > 0 ? renderPortfolioPulse : null}
          ListEmptyComponent={isLoading ? renderLoadingState : renderEmptyState}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
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
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: vibrantTheme.colors.card, borderRadius: 20, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: vibrantTheme.colors.text, fontWeight: '700' },
  sortButton: { width: 48, height: 50, backgroundColor: vibrantTheme.colors.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: vibrantTheme.colors.border },
  filterSection: { paddingBottom: 16 },
  statusTabs: { paddingHorizontal: 20, gap: 10 },
  statusTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16, backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  statusTabActive: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: vibrantTheme.colors.primary },
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
  addButton: { backgroundColor: vibrantTheme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 12, ...vibrantTheme.shadows.glow },
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
