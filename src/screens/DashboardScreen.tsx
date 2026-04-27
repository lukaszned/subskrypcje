// =============================================================
// src/screens/DashboardScreen.tsx
//
// Główny ekran aplikacji — zasilony live data z backendu.
// =============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ArrowRight, Activity, AlertCircle, LogOut, Sun, Moon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';

// App imports
import { AppStackParamList } from '../../App';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useUpcomingPayments } from '../hooks/useUpcomingPayments';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useCategoryBreakdown } from '../hooks/useCategoryBreakdown';
import { useReminders } from '../hooks/useReminders';
import { useTrials } from '../hooks/useTrials';
import { syncReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
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
// COMPONENT
// ─────────────────────────────────────────────────────────────
export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data
  const summary = useDashboardSummary();
  const upcoming = useUpcomingPayments(7);
  const subscriptions = useSubscriptions();
  const breakdown = useCategoryBreakdown();
  const reminders = useReminders();
  const trials = useTrials(30);

  const isInitialLoading =
    summary.isLoading || upcoming.isLoading || subscriptions.isLoading || breakdown.isLoading || trials.isLoading;

  // Sync Notifications
  useEffect(() => {
    if (reminders.data && Array.isArray(reminders.data)) {
      syncReminders(reminders.data);
    }
  }, [reminders.data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      summary.refetch(),
      upcoming.refetch(),
      subscriptions.refetch(),
      breakdown.refetch(),
      reminders.refetch(),
    ]);
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      queryClient.clear();
      await signOut();
    } catch (e) {
      console.error('Błąd wylogowania:', e);
    }
  };

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

  // HELPER RENDERS
  const renderHeader = () => {
    const monthlyTotal = summary.data?.monthlyTotal ?? 0;
    const yearlyTotal = summary.data?.yearlyTotal ?? 0;
    const overdueCount = summary.data?.overdueCount ?? 0;

    return (
      <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={dynamicStyles.headerSubtitle}>Twoje wydatki</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={20} color={theme.textDim} /> : <Moon size={20} color={theme.textDim} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <LogOut size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={dynamicStyles.headerGrid}>
          <View style={dynamicStyles.headerGridItem}>
            <Text style={dynamicStyles.headerGridLabel}>Miesięcznie</Text>
            <View style={dynamicStyles.headerAmountRow}>
              <Text style={dynamicStyles.headerAmount}>{monthlyTotal.toFixed(2)}</Text>
              <Text style={dynamicStyles.headerCurrency}>PLN</Text>
            </View>
          </View>
          <View style={[dynamicStyles.headerGridItem, { borderLeftWidth: 1, borderLeftColor: theme.border, paddingLeft: 20 }]}>
            <Text style={dynamicStyles.headerGridLabel}>Rocznie</Text>
            <View style={dynamicStyles.headerAmountRow}>
              <Text style={[dynamicStyles.headerAmount, { fontSize: 24 }]}>{yearlyTotal.toFixed(0)}</Text>
              <Text style={[dynamicStyles.headerCurrency, { fontSize: 14 }]}>PLN</Text>
            </View>
          </View>
        </View>

        {overdueCount > 0 && (
          <View style={dynamicStyles.headerChangeContainer}>
            <View style={dynamicStyles.overdueBanner}>
              <AlertCircle size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={dynamicStyles.overdueBannerText}>
                Masz {overdueCount} {overdueCount === 1 ? 'zaległą płatność' : 'zaległe płatności'}!
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderUpcomingPayment = ({ item }: { item: UpcomingPaymentItem }) => {
    const now = new Date();
    const next = new Date(item.nextPaymentDate);
    const diffMs = next.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isTomorrow = daysLeft <= 1;

    const dateLabel = daysLeft === 0 ? 'Dzisiaj' : daysLeft === 1 ? 'Jutro' : `Za ${daysLeft} dni`;

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
      >
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
      </TouchableOpacity>
    );
  };

  const renderTrialItem = ({ item }: { item: any }) => {
    const daysLeft = item.daysLeft;
    const isEndingSoon = daysLeft <= 3;

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
      >
        <View style={[
          dynamicStyles.upcomingCard, 
          isEndingSoon && { borderColor: '#FCA5A5', backgroundColor: '#FFF1F2' },
          dynamicStyles.shadowSm
        ]}>
          <View style={dynamicStyles.upcomingTop}>
            <View style={[dynamicStyles.upcomingIconPlaceholder, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[dynamicStyles.upcomingIconText, { color: '#EF4444' }]}>T</Text>
            </View>
            <Text style={[dynamicStyles.upcomingDate, isEndingSoon && { color: '#EF4444' }]} numberOfLines={1}>
              {daysLeft === 0 ? 'Koniec dziś' : `Koniec za ${daysLeft} dni`}
            </Text>
          </View>
          <Text style={dynamicStyles.upcomingName} numberOfLines={1}>{item.name}</Text>
          <Text style={[dynamicStyles.upcomingAmount, { color: '#EF4444' }]}>TRIAL</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryBreakdown = () => {
    // Backend zwraca tablicę bezpośrednio, nie obiekt z polem items
    const data = (breakdown.data || []) as CategoryBreakdownItem[];
    if (data.length === 0) return null;

    return (
      <View style={[dynamicStyles.analyticsCard, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.analyticsHeader}>
          <Text style={dynamicStyles.sectionTitle}>Wydatki wg kategorii</Text>
          <Activity size={20} color="#64748B" />
        </View>
        <Text style={dynamicStyles.analyticsSubtitle}>Miesięczne zestawienie kosztów</Text>
        
        {data.sort((a, b) => b.monthlyAmount - a.monthlyAmount).slice(0, 4).map((item) => (
          <View key={item.category} style={dynamicStyles.categoryRow}>
            <View style={dynamicStyles.categoryInfoRow}>
              <Text style={dynamicStyles.categoryLabel}>{CATEGORY_LABELS[item.category] || item.category}</Text>
              <Text style={dynamicStyles.categoryValue}>{item.monthlyAmount.toFixed(2)} PLN</Text>
            </View>
            <View style={dynamicStyles.progressBg}>
              <View style={[dynamicStyles.progressFill, { width: `${item.percentage}%` as any }]} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSubscriptionRow = (item: Subscription) => {
    const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

    return (
      <TouchableOpacity 
        key={item.id}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
      >
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
      </TouchableOpacity>
    );
  };

  if (isInitialLoading) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ScrollView style={dynamicStyles.container} contentContainerStyle={dynamicStyles.scrollContent}>
          <Skeleton width="100%" height={160} borderRadius={24} style={{ marginBottom: 24, marginTop: 8 }} />
          <Skeleton width={180} height={24} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', marginBottom: 32 }}>
            <Skeleton width={140} height={110} borderRadius={16} style={{ marginRight: 16 }} />
            <Skeleton width={140} height={110} borderRadius={16} style={{ marginRight: 16 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
        {renderHeader()}

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
            />
          </View>
        )}

        {trials.data && trials.data.items.length > 0 && (
          <View style={dynamicStyles.sectionContainer}>
            <View style={dynamicStyles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Kończące się okresy próbne</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={trials.data.items}
              keyExtractor={(item) => item.id}
              renderItem={renderTrialItem}
              contentContainerStyle={dynamicStyles.horizontalListPadding}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            />
          </View>
        )}

        <View style={dynamicStyles.sectionContainer}>
          {renderCategoryBreakdown()}
        </View>

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
            subscriptionItems.slice(0, 5).map(renderSubscriptionRow)
          )}
        </View>
      </ScrollView>

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
  categoryRow: { marginBottom: 16 },
  categoryInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryLabel: { fontSize: 14, color: theme.text, fontWeight: '600' },
  categoryValue: { fontSize: 14, color: theme.textDim, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  headerGrid: { flexDirection: 'row', marginTop: 8 },
  headerGridItem: { flex: 1 },
  headerGridLabel: { fontSize: 12, color: theme.textDim, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
    width: '100%',
  },
  overdueBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

export default DashboardScreen;
