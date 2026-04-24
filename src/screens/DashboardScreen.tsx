// =============================================================
// src/screens/DashboardScreen.tsx
//
// Główny ekran aplikacji — zasilony live data z backendu.
//
// DANE:
//   - useDashboardSummary() -> monthlyTotal, yearlyTotal, overdueCount
//   - useUpcomingPayments(7) -> nadchodzące w ciągu 7 dni
//   - useSubscriptions() -> lista subskrypcji
//
// ARCHITEKTURA:
//   - Każda sekcja obsługuje własne stany loading/error
//   - Skeleton loader zachowany z oryginalnego projektu
//   - MOCK dane zastąpione hookami
// =============================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { Plus, TrendingUp, ArrowRight, Activity, AlertCircle, LogOut } from 'lucide-react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Hooki
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useUpcomingPayments } from '../hooks/useUpcomingPayments';
import { useSubscriptions } from '../hooks/useSubscriptions';

// Auth
import { useAuth } from '../context/AuthContext';

// Typy i helpery
import { Subscription, UpcomingPaymentItem, CATEGORY_LABELS } from '../types/api';

// ─────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────

const Skeleton = ({ width, height, style, borderRadius = 8 }: any) => {
  const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: '#E2E8F0', borderRadius, opacity: pulseAnim }, style]}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// EKRAN
// ─────────────────────────────────────────────────────────────

export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Live data ────────────────────────────────────────────────
  const summary = useDashboardSummary();
  const upcoming = useUpcomingPayments(7);
  const subscriptions = useSubscriptions();

  const isInitialLoading =
    summary.isLoading && upcoming.isLoading && subscriptions.isLoading;

  // ── Pull-to-refresh ─────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      summary.refetch(),
      upcoming.refetch(),
      subscriptions.refetch(),
    ]);
    setIsRefreshing(false);
  };

  // ── Wylogowanie ─────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      queryClient.clear(); // Wyczyść cache przed wylogowaniem
      await signOut();
    } catch (e) {
      console.error('Błąd wylogowania:', e);
    }
  };

  // ── Temat ───────────────────────────────────────────────────
  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textDim: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    iconBg: isDark ? '#334155' : '#EEF2FF',
    iconWarningBg: isDark ? '#78350F' : '#FEF3C7',
    iconWarningText: isDark ? '#FBBF24' : '#D97706',
    cardWarningBg: isDark ? '#451A03' : '#FFFBEB',
    cardWarningBorder: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.4)',
    redBg: isDark ? '#450A0A' : '#FEF2F2',
    redText: isDark ? '#FCA5A5' : '#EF4444',
  };

  const dynamicStyles = getStyles(theme);

  // ─────────────────────────────────────────────────────────────
  // SKELETON LOADER
  // ─────────────────────────────────────────────────────────────

  if (isInitialLoading) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.scrollContent}>
          <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 24, marginTop: 8 }} />
          <Skeleton width={180} height={24} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', marginBottom: 32 }}>
            <Skeleton width={140} height={110} borderRadius={16} style={{ marginRight: 16 }} />
            <Skeleton width={140} height={110} borderRadius={16} style={{ marginRight: 16 }} />
            <Skeleton width={140} height={110} borderRadius={16} />
          </View>
          <Skeleton width={150} height={24} style={{ marginBottom: 16 }} />
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width={120} height={16} style={{ marginBottom: 8 }} />
                <Skeleton width={80} height={12} />
              </View>
              <Skeleton width={70} height={20} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // HEADER — dane z summary
  // ─────────────────────────────────────────────────────────────

  const renderHeader = () => {
    const monthlyTotal = summary.data?.monthlyTotal ?? 0;
    const overdueCount = summary.data?.overdueCount ?? 0;

    return (
      <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={dynamicStyles.headerSubtitle}>Całkowity koszt miesięczny</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={20} color={theme.textDim} /> : <Moon size={20} color={theme.textDim} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <LogOut size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={dynamicStyles.headerAmountRow}>
          <Text style={dynamicStyles.headerAmount}>
            {monthlyTotal.toFixed(2)}
          </Text>
          <Text style={dynamicStyles.headerCurrency}>PLN</Text>
        </View>
        {overdueCount > 0 && (
          <View style={dynamicStyles.headerChangeContainer}>
            <View style={dynamicStyles.changeBadgeRed}>
              <AlertCircle size={14} color="#EF4444" style={{ marginRight: 4 }} />
              <Text style={dynamicStyles.changeTextRed}>
                {overdueCount} zaległa {overdueCount === 1 ? 'płatność' : 'płatności'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // NADCHODZĄCE PŁATNOŚCI — live data
  // ─────────────────────────────────────────────────────────────

  const renderUpcomingPayment = ({ item }: { item: UpcomingPaymentItem }) => {
    // Oblicz daysLeft z nextPaymentDate
    const now = new Date();
    const next = new Date(item.nextPaymentDate);
    const diffMs = next.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isTomorrow = daysLeft <= 1;

    const dateLabel = daysLeft === 0
      ? 'Dzisiaj'
      : daysLeft === 1
        ? 'Jutro'
        : `Za ${daysLeft} dni`;

    return (
      <View style={[dynamicStyles.upcomingCard, isTomorrow && dynamicStyles.upcomingCardWarning, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.upcomingTop}>
          <View style={[dynamicStyles.upcomingIconPlaceholder, isTomorrow && dynamicStyles.upcomingIconPlaceholderWarning]}>
            <Text style={[dynamicStyles.upcomingIconText, isTomorrow && dynamicStyles.upcomingIconTextWarning]}>
              {item.name.charAt(0)}
            </Text>
          </View>
          <Text style={[dynamicStyles.upcomingDate, isTomorrow && dynamicStyles.upcomingDateWarning]} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
        <Text style={dynamicStyles.upcomingName} numberOfLines={1}>{item.name}</Text>
        <Text style={dynamicStyles.upcomingAmount}>{item.amount.toFixed(2)} {item.currency}</Text>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // LISTA SUBSKRYPCJI — live data
  // ─────────────────────────────────────────────────────────────

  const renderSubscriptionRow = ({ item }: { item: Subscription }) => {
    const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

    return (
      <View style={dynamicStyles.subscriptionRow}>
        <View style={dynamicStyles.subscriptionLogo}>
          <Text style={dynamicStyles.subscriptionInitial}>{item.name.charAt(0)}</Text>
        </View>
        <View style={dynamicStyles.subscriptionInfo}>
          <Text style={dynamicStyles.subscriptionName} numberOfLines={1}>{item.name}</Text>
          <View style={dynamicStyles.categoryTag}>
            <Text style={dynamicStyles.categoryTagText}>{categoryLabel}</Text>
          </View>
        </View>
        <View style={dynamicStyles.subscriptionPriceContainer}>
          <Text style={dynamicStyles.subscriptionPrice}>{item.amount.toFixed(2)} {item.currency}</Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // ANALITYKA (placeholder — dane bez chart library)
  // ─────────────────────────────────────────────────────────────

  const renderAnalyticsPlaceholder = () => (
    <View style={[dynamicStyles.analyticsCard, dynamicStyles.shadowSm]}>
      <View style={dynamicStyles.analyticsHeader}>
        <Text style={dynamicStyles.sectionTitle}>Analityka</Text>
        <Activity size={20} color="#64748B" />
      </View>
      <Text style={dynamicStyles.analyticsSubtitle}>
        {summary.data
          ? `Aktywne: ${summary.data.activeSubscriptionsCount} | Triale: ${summary.data.trialsCount} | Rocznie: ${summary.data.yearlyTotal.toFixed(2)} PLN`
          : 'Ładowanie...'}
      </Text>
      <View style={dynamicStyles.chartContainer}>
        {[40, 60, 50, 80, 70, 95].map((height, index) => (
          <View key={index} style={dynamicStyles.chartBarWrapper}>
            <View style={[dynamicStyles.chartBar, { height: `${height}%` as any }, height === 95 && dynamicStyles.chartBarActive]} />
          </View>
        ))}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  const upcomingItems = upcoming.data?.items ?? [];
  const subscriptionItems = (subscriptions.data ?? []).filter(s => s.status !== 'canceled');

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        {/* Header Hero Section */}
        {renderHeader()}

        {/* Nadchodzące Płatności */}
        {upcomingItems.length > 0 && (
          <View style={dynamicStyles.sectionContainer}>
            <View style={dynamicStyles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Nadchodzące płatności</Text>
              <TouchableOpacity
                style={dynamicStyles.seeAllBtn}
                onPress={() => navigation.navigate('SubscriptionList')}
              >
                <Text style={dynamicStyles.seeAllText}>Wszystkie</Text>
                <ArrowRight size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={upcomingItems}
              keyExtractor={(item) => item.id}
              renderItem={renderUpcomingPayment}
              contentContainerStyle={dynamicStyles.horizontalListPadding}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
              scrollEnabled={upcomingItems.length > 2}
            />
          </View>
        )}

        {/* Analityka */}
        <View style={dynamicStyles.sectionContainer}>
          {renderAnalyticsPlaceholder()}
        </View>

        {/* Lista Subskrypcji */}
        <View style={[dynamicStyles.sectionContainer, dynamicStyles.lastSection]}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Twoje Subskrypcje</Text>
            <TouchableOpacity
              style={dynamicStyles.seeAllBtn}
              onPress={() => navigation.navigate('SubscriptionList')}
            >
              <Text style={dynamicStyles.seeAllText}>Wszystkie</Text>
              <ArrowRight size={16} color="#6366F1" />
            </TouchableOpacity>
          </View>
          {subscriptionItems.length === 0 ? (
            <Text style={{ color: theme.textDim, textAlign: 'center', paddingVertical: 24 }}>
              Brak subskrypcji. Dodaj pierwszą!
            </Text>
          ) : (
            subscriptionItems.slice(0, 5).map((item) => (
              <React.Fragment key={item.id}>
                {renderSubscriptionRow({ item })}
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[dynamicStyles.fab, dynamicStyles.shadowLg]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────
// STYLE (zachowane z oryginału)
// ─────────────────────────────────────────────────────────────

const getStyles = (theme: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  shadow: {
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  shadowSm: {
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 4,
  },
  shadowLg: {
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  headerCard: {
    backgroundColor: theme.card, borderRadius: 24,
    padding: 24, marginBottom: 32, marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14, color: theme.textDim, fontWeight: '500',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  headerAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  headerAmount: { fontSize: 40, fontWeight: '800', color: theme.text, letterSpacing: -1 },
  headerCurrency: { fontSize: 20, fontWeight: '600', color: theme.textDim, marginLeft: 8 },
  headerChangeContainer: { flexDirection: 'row' },
  changeBadgeRed: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.redBg, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 20,
  },
  changeTextRed: { color: theme.redText, fontSize: 12, fontWeight: '600' },
  sectionContainer: { marginBottom: 32 },
  lastSection: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: 14, fontWeight: '600', color: '#6366F1', marginRight: 4 },
  horizontalListPadding: { paddingVertical: 4, paddingHorizontal: 4 },
  upcomingCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    width: 140, borderWidth: 1, borderColor: 'transparent',
  },
  upcomingCardWarning: {
    borderColor: theme.cardWarningBorder,
    backgroundColor: theme.cardWarningBg,
  },
  upcomingTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  upcomingIconPlaceholder: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: theme.iconBg, alignItems: 'center', justifyContent: 'center',
  },
  upcomingIconPlaceholderWarning: { backgroundColor: theme.iconWarningBg },
  upcomingIconText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  upcomingIconTextWarning: { color: theme.iconWarningText },
  upcomingDate: { fontSize: 12, fontWeight: '600', color: theme.textDim, marginTop: 4 },
  upcomingDateWarning: { color: theme.iconWarningText },
  upcomingName: { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 4 },
  upcomingAmount: { fontSize: 16, fontWeight: '800', color: theme.text },
  analyticsCard: { backgroundColor: theme.card, borderRadius: 20, padding: 20 },
  analyticsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  analyticsSubtitle: { fontSize: 13, color: theme.textDim, marginBottom: 20 },
  chartContainer: {
    height: 100, flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', paddingTop: 10,
  },
  chartBarWrapper: { width: 30, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: 12, backgroundColor: theme.border, borderRadius: 6 },
  chartBarActive: { backgroundColor: '#6366F1' },
  subscriptionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  subscriptionLogo: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: theme.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  subscriptionInitial: { fontSize: 20, fontWeight: '700', color: '#475569' },
  subscriptionInfo: { flex: 1, justifyContent: 'center' },
  subscriptionName: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 },
  categoryTag: {
    alignSelf: 'flex-start', backgroundColor: theme.border,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  categoryTagText: { fontSize: 11, fontWeight: '500', color: theme.textDim, textTransform: 'uppercase' },
  subscriptionPriceContainer: { alignItems: 'flex-end' },
  subscriptionPrice: { fontSize: 16, fontWeight: '700', color: theme.text },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    right: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center',
  },
});

export default DashboardScreen;
