// =============================================================
// src/screens/DashboardScreen.tsx
//
// Główny ekran aplikacji — zasilony live data z backendu.
// =============================================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Plus, ArrowRight, Activity, AlertCircle, LogOut, Sun, Moon, TrendingUp, Bell, Settings } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
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
import { useDashboardSavings } from '../hooks/useDashboardSavings';
import { useDashboardTrends } from '../hooks/useDashboardTrends';
import { useUserSettings } from '../hooks/useUserSettings';
import { syncReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { Subscription, UpcomingPaymentItem, CATEGORY_LABELS, CategoryBreakdownItem } from '../types/api';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

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
  const [notifPermission, setNotifPermission] = useState<string>('granted');

  // Data
  const summary = useDashboardSummary();
  const upcoming = useUpcomingPayments(30);
  const breakdown = useCategoryBreakdown();
  const reminders = useReminders();
  const trials = useTrials(30);
  const savings = useDashboardSavings();
  const trends = useDashboardTrends(6);
  const userSettings = useUserSettings();

  const isInitialLoading = summary.isLoading || upcoming.isLoading;

  // Sync Notifications
  useEffect(() => {
    if (reminders.data?.items) {
      syncReminders(reminders.data.items);
    }
  }, [reminders.data]);

  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotifPermission(status);
    };
    checkPermissions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      summary.refetch(),
      upcoming.refetch(),
      breakdown.refetch(),
      reminders.refetch(),
      savings.refetch(),
      trials.refetch(),
      trends.refetch(),
      userSettings.refetch(),
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

  const theme = useMemo(() => ({
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
  }), [isDark]);

  const dynamicStyles = useMemo(() => getStyles(theme), [theme]);

  // HELPER RENDERS
  const renderHeader = () => {
    const monthlyTotal = summary.data?.monthlyTotal ?? 0;
    const yearlyTotal = summary.data?.yearlyTotal ?? 0;
    const overdueCount = summary.data?.overdueCount ?? 0;
    const baseCurrency = summary.data?.baseCurrency ?? 'PLN';

    return (
      <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={dynamicStyles.headerSubtitle}>Podsumowanie</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={20} color={theme.textDim} /> : <Moon size={20} color={theme.textDim} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Settings size={20} color={theme.textDim} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <LogOut size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={dynamicStyles.summaryMain}>
          <Text style={dynamicStyles.headerGridLabel}>Twoje wydatki (Miesięcznie)</Text>
          <View style={dynamicStyles.headerAmountRow}>
            <Text style={dynamicStyles.headerAmount}>{monthlyTotal.toFixed(2)}</Text>
            <Text style={dynamicStyles.headerCurrency}>{baseCurrency}</Text>
          </View>
        </View>

        <View style={dynamicStyles.summaryDivider} />

        <View style={dynamicStyles.summarySecondary}>
          <View style={dynamicStyles.summarySecondaryItem}>
            <Text style={dynamicStyles.headerGridLabel}>Rocznie</Text>
            <Text style={dynamicStyles.headerSecondaryAmount}>{yearlyTotal.toFixed(0)} {baseCurrency}</Text>
          </View>
          <View style={dynamicStyles.summarySecondaryItem}>
            <Text style={dynamicStyles.headerGridLabel}>Średnio / sub</Text>
            <Text style={dynamicStyles.headerSecondaryAmount}>
              {summary.data?.activeSubscriptionsCount ? (monthlyTotal / summary.data.activeSubscriptionsCount).toFixed(2) : '0.00'} {baseCurrency}
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.statsRow}>
          <View style={dynamicStyles.statBox}>
            <Text style={dynamicStyles.statValue}>{summary.data?.activeSubscriptionsCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Aktywne</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: '#D97706' }]}>{summary.data?.trialsCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Triale</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: '#DC2626' }]}>{summary.data?.overdueCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Zaległe</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: '#4F46E5' }]}>{summary.data?.upcomingPaymentsCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Wkrótce</Text>
          </View>
        </View>

        {notifPermission !== 'granted' && (
          <View style={[dynamicStyles.infoBox, { marginBottom: 16, backgroundColor: '#FEF3C7' }]}>
            <Bell size={16} color="#D97706" />
            <Text style={[dynamicStyles.infoBoxText, { color: '#92400E' }]}>
              Powiadomienia są wyłączone. Włącz je w ustawieniach, aby nie przegapić płatności.
            </Text>
          </View>
        )}

        {overdueCount > 0 && (
          <View style={dynamicStyles.overdueSection}>
            <View style={dynamicStyles.overdueBanner}>
              <AlertCircle size={14} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={dynamicStyles.overdueBannerText}>
                Masz {overdueCount} {overdueCount === 1 ? 'zaległą płatność' : 'zaległe płatności'}!
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SubscriptionList')}>
                <Text style={dynamicStyles.overdueActionText}>Pokaż</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSavingsCard = () => {
    const data = savings.data;
    if (!data || data.canceledSubscriptionsCount === 0) return null;

    return (
      <View style={[dynamicStyles.savingsCard, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.savingsHeader}>
          <View style={dynamicStyles.savingsIconContainer}>
            <Activity size={20} color="#10B981" />
          </View>
          <View>
            <Text style={dynamicStyles.savingsTitle}>Zaoszczędziłeś już</Text>
            <Text style={dynamicStyles.savingsAmount}>
              {data.monthlySavings.toFixed(2)} {data.baseCurrency} <Text style={{ fontSize: 12, fontWeight: '500' }}>/ mc</Text>
            </Text>
          </View>
        </View>
        <View style={dynamicStyles.savingsFooter}>
          <Text style={dynamicStyles.savingsFooterText}>
            To {data.yearlySavings.toFixed(0)} {data.baseCurrency} oszczędności w skali roku dzięki {data.canceledSubscriptionsCount} anulowanym subskrypcjom! 🚀
          </Text>
        </View>
      </View>
    );
  };

  const renderUpcomingPayment = useCallback(({ item }: { item: UpcomingPaymentItem }) => {
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
  }, [navigation, dynamicStyles]);

  const renderTrialItem = useCallback(({ item }: { item: any }) => {
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
  }, [navigation, dynamicStyles]);

  const renderCategoryBreakdown = () => {
    const data = breakdown.data;
    const items = (data?.items || []) as CategoryBreakdownItem[];
    if (items.length === 0 || !data) return null;

    const CATEGORY_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#8B5CF6', '#06B6D4', '#EC4899'];

    return (
      <View style={[dynamicStyles.analyticsCard, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.analyticsHeader}>
          <Text style={dynamicStyles.sectionTitle}>Analityka wydatków</Text>
        </View>
        {items.map((item, index) => (
          <View key={index} style={dynamicStyles.categoryRow}>
            <View style={dynamicStyles.categoryInfoRow}>
              <Text style={dynamicStyles.categoryLabel}>{CATEGORY_LABELS[item.category] || item.category}</Text>
              <Text style={dynamicStyles.categoryValue}>{item.monthlyAmount.toFixed(2)} {data.baseCurrency}</Text>
            </View>
            <View style={dynamicStyles.progressBg}>
              <View 
                style={[
                  dynamicStyles.progressFill, 
                  { 
                    width: `${item.percentage}%`,
                    backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                  }
                ]} 
              />
            </View>
          </View>
        ))}

        {items.length > 0 && (
          <View style={dynamicStyles.insightBox}>
            <TrendingUp size={16} color="#4F46E5" />
            <Text style={dynamicStyles.insightText}>
              Najwięcej wydajesz na <Text style={{ fontWeight: '700' }}>{CATEGORY_LABELS[items[0].category] || items[0].category}</Text> 
              ({items[0].percentage.toFixed(0)}% kosztów).
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTrendsChart = () => {
    const data = trends.data;
    if (!data || !data.items || data.items.length === 0) return null;

    const maxTotal = Math.max(...data.items.map(i => i.total), 1);

    return (
      <View style={[dynamicStyles.analyticsCard, dynamicStyles.shadowSm, { marginBottom: 32 }]}>
        <View style={dynamicStyles.analyticsHeader}>
          <Text style={dynamicStyles.sectionTitle}>Trend wydatków</Text>
          <Text style={{ fontSize: 12, color: theme.textDim, fontWeight: '600' }}>Planowane ({data.baseCurrency})</Text>
        </View>
        
        <View style={dynamicStyles.chartContainer}>
          {data.items.map((item, index) => {
            const barHeight = (item.total / maxTotal) * 100;
            return (
              <View key={index} style={dynamicStyles.chartBarWrapper}>
                <View style={dynamicStyles.chartBarOuter}>
                  <View 
                    style={[
                      dynamicStyles.chartBarInner, 
                      { height: `${barHeight}%` }
                    ]} 
                  />
                </View>
                <Text style={dynamicStyles.chartLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={dynamicStyles.insightBox}>
          <Activity size={16} color="#4F46E5" />
          <Text style={dynamicStyles.insightText}>
            W nadchodzącym miesiącu zapłacisz <Text style={{ fontWeight: '700' }}>{data.items[0].total.toFixed(2)} {data.baseCurrency}</Text> za swoje subskrypcje.
          </Text>
        </View>
      </View>
    );
  };


  if (summary.isError) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ErrorState 
          isDark={isDark} 
          message="Nie udało się pobrać danych z serwera. Sprawdź połączenie." 
          onRetry={handleRefresh} 
        />
      </SafeAreaView>
    );
  }

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
        {renderSavingsCard()}

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
          {renderTrendsChart()}
          {renderCategoryBreakdown()}
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
  scrollContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },
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
    alignItems: 'center', marginBottom: 16,
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
  headerGridLabel: { fontSize: 11, color: theme.textDim, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryMain: { marginBottom: 20 },
  summaryDivider: { height: 1, backgroundColor: theme.border, marginVertical: 16, opacity: 0.5 },
  summarySecondary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  summarySecondaryItem: { flex: 1 },
  headerSecondaryAmount: { fontSize: 18, fontWeight: '700', color: theme.text },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textDim,
    textTransform: 'uppercase',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  insightText: {
    fontSize: 12,
    color: '#4F46E5',
    flex: 1,
  },
  overdueSection: {
    marginTop: 12,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  overdueBannerText: { color: '#B91C1C', fontSize: 13, fontWeight: '600', flex: 1 },
  overdueActionText: { color: '#EF4444', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoBoxText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  savingsCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  savingsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingsAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#065F46',
  },
  savingsFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.1)',
    paddingTop: 12,
  },
  savingsFooterText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  chartBarWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarOuter: {
    width: 12,
    height: 100,
    backgroundColor: theme.border,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarInner: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 6,
  },
  chartLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '700',
    color: theme.textDim,
  },
});

export default DashboardScreen;
