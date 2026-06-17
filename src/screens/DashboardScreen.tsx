import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Plus, 
  Bell, 
  Settings as SettingsIcon, 
  LogOut, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Activity,
  Sun,
  Moon,
  Settings,
  Wallet,
  List,
  Lightbulb,
  History,
  BarChart3,
  CalendarDays,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// App imports
import type { AppStackParamList } from '../types/navigation';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useUpcomingPayments } from '../hooks/useUpcomingPayments';
import { useCategoryBreakdown } from '../hooks/useCategoryBreakdown';
import { useTrials } from '../hooks/useTrials';
import { useDashboardSavings } from '../hooks/useDashboardSavings';
import { useDashboardTrends } from '../hooks/useDashboardTrends';
import { useReminders } from '../hooks/useReminders';
import { getNotificationPermissionStatus, syncReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';
import { useBudgetImpact } from '../hooks/useBudgetImpact';
import { useNotificationPreview } from '../hooks/useNotificationPreview';
import { useHealthScore } from '../hooks/useHealthScore';
import { useDashboardActivity } from '../hooks/useDashboardActivity';
import { usePersistentIncome } from '../hooks/usePersistentIncome';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { 
  UpcomingPaymentItem, 
  CategoryBreakdownItem,
  SubscriptionCategory,
  DashboardActivityItem
} from '../types/api';
import { useTheme } from '../theme/ThemeContext';
import { getCategoryTone, getStatusTone, withAlpha } from '../theme/themeUtils';
import { daysUntilDate, formatRelativeDay, formatShortDate } from '../utils/date';
import { buildUpcomingPaymentsFromSubscriptions, getCountedMonthlyTotal } from '../utils/subscriptionCalculations';

const { width } = Dimensions.get('window');

const formatDays = (days: number) => {
  if (days === 1) return '1 dzień';
  return `${days} dni`;
};

type BrandToken = {
  bg: string;
  fg: string;
  label: string;
  weight?: '700' | '800' | '900';
};

const getBrandToken = (theme: ReturnType<typeof useTheme>['theme'], name?: string | null, provider?: string | null): BrandToken => {
  const source = `${name || ''} ${provider || ''}`.toLowerCase();
  const accent =
    source.includes('netflix') || source.includes('youtube') ? theme.colors.danger :
    source.includes('spotify') || source.includes('chatgpt') || source.includes('openai') ? theme.colors.success :
    source.includes('hbo') || source.includes('max') || source.includes('disney') ? theme.colors.violet :
    source.includes('amazon') || source.includes('prime') || source.includes('allegro') ? theme.colors.warning :
    source.includes('google') || source.includes('canva') ? theme.colors.cyan :
    source.includes('apple') || source.includes('icloud') ? theme.colors.text :
    source.includes('xbox') || source.includes('strava') ? theme.colors.primary :
    theme.colors.textMuted;

  if (source.includes('netflix')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'N', weight: '900' };
  if (source.includes('spotify')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'S', weight: '900' };
  if (source.includes('hbo') || source.includes('max')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'max', weight: '900' };
  if (source.includes('youtube')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'YT', weight: '900' };
  if (source.includes('disney')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'D+', weight: '900' };
  if (source.includes('amazon') || source.includes('prime')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'a', weight: '900' };
  if (source.includes('apple') || source.includes('icloud')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'A', weight: '900' };
  if (source.includes('chatgpt') || source.includes('openai')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'AI', weight: '900' };
  if (source.includes('google') || source.includes('play')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'G', weight: '900' };
  if (source.includes('canva')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'C', weight: '900' };
  if (source.includes('xbox')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'X', weight: '900' };
  if (source.includes('allegro')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'A', weight: '900' };
  if (source.includes('strava')) return { bg: withAlpha(accent, 0.14), fg: accent, label: 'S', weight: '900' };

  return {
    bg: withAlpha(accent, 0.14),
    fg: accent,
    label: (name || provider || '?').charAt(0).toUpperCase(),
    weight: '900',
  };
};

const BrandMark = React.memo(({
  name,
  provider,
  size = 42,
}: {
  name?: string | null;
  provider?: string | null;
  size?: number;
}) => {
  const { theme } = useTheme();
  const brand = getBrandToken(theme, name, provider);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: brand.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Text
        style={{
          color: brand.fg,
          fontSize: brand.label.length > 1 ? Math.round(size * 0.28) : Math.round(size * 0.48),
          fontWeight: brand.weight || '900',
          letterSpacing: 0,
        }}
      >
        {brand.label}
      </Text>
    </View>
  );
});


// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Dashboard'>>();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { theme: appTheme } = useTheme();
  
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('granted');
  const [trendType, setTrendType] = useState<'planned' | 'real'>('planned');
  const [renderDeferredSections, setRenderDeferredSections] = useState(false);
  const [secondaryStage, setSecondaryStage] = useState(0);

  // Data
  const { data: summaryData, isLoading: isSummaryLoading, isError: isSummaryError, refetch: refetchSummary } = useDashboardSummary();
  const stageOneEnabled = !!summaryData && secondaryStage >= 1;
  const stageTwoEnabled = !!summaryData && secondaryStage >= 2;
  const stageThreeEnabled = !!summaryData && secondaryStage >= 3;
  const { data: upcomingData, refetch: refetchUpcoming } = useUpcomingPayments(30, !!summaryData);
  const { data: breakdownData, refetch: refetchBreakdown } = useCategoryBreakdown(stageOneEnabled);
  const { data: trialsData, refetch: refetchTrials } = useTrials(30, stageOneEnabled);
  const { data: savingsData, refetch: refetchSavings } = useDashboardSavings(stageTwoEnabled);
  const { data: trendsData, refetch: refetchTrends } = useDashboardTrends(6, trendType, stageThreeEnabled);
  const { data: remindersData, refetch: refetchReminders } = useReminders(stageThreeEnabled);
  const { data: healthData, refetch: refetchHealth } = useHealthScore(stageTwoEnabled);
  const { data: activityData, refetch: refetchActivity } = useDashboardActivity(10, stageThreeEnabled);

  const { data: budgetImpact, refetch: refetchBudgetImpact } = useBudgetImpact(stageTwoEnabled);
  const { data: persistentIncome } = usePersistentIncome();
  const { data: subscriptions = [], refetch: refetchSubscriptions } = useSubscriptions();
  useNotificationPreview(false);

  useEffect(() => {
    if (!summaryData) {
      setRenderDeferredSections(false);
      setSecondaryStage(0);
      return;
    }

    let stageTwoTimer: ReturnType<typeof setTimeout> | undefined;
    let stageThreeTimer: ReturnType<typeof setTimeout> | undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      setRenderDeferredSections(true);
      setSecondaryStage(1);
      stageTwoTimer = setTimeout(() => setSecondaryStage(2), 450);
      stageThreeTimer = setTimeout(() => setSecondaryStage(3), 1100);
    });

    return () => {
      task.cancel?.();
      if (stageTwoTimer) clearTimeout(stageTwoTimer);
      if (stageThreeTimer) clearTimeout(stageThreeTimer);
    };
  }, [summaryData]);

  const isLoading = isSummaryLoading;
  const isError = isSummaryError;
  const hasData = !!summaryData;

  const baseCurrency = summaryData?.baseCurrency ?? 'PLN';
  const summaryMonthlyTotal = summaryData?.monthlyTotal ?? 0;
  const localMonthlyTotal = useMemo(
    () => getCountedMonthlyTotal(subscriptions),
    [subscriptions]
  );
  const countedCurrencies = useMemo(
    () => Array.from(new Set(
      subscriptions
        .filter((subscription) => subscription.status !== 'canceled' && subscription.includeInStats !== false)
        .map((subscription) => subscription.currency || baseCurrency)
    )),
    [baseCurrency, subscriptions]
  );
  const canUseLocalMonthlyTotal = subscriptions.length > 0 &&
    countedCurrencies.length <= 1 &&
    (countedCurrencies[0] || baseCurrency) === baseCurrency;
  const monthlyTotal = canUseLocalMonthlyTotal ? localMonthlyTotal : summaryMonthlyTotal;
  const yearlyTotal = monthlyTotal * 12;
  const overdueCount = summaryData?.overdueCount ?? 0;
  const averagePerService = summaryData?.activeSubscriptionsCount && summaryData.activeSubscriptionsCount > 0
    ? monthlyTotal / summaryData.activeSubscriptionsCount
    : 0;
  const reliableUpcomingItems = useMemo(() => {
    const localItems = buildUpcomingPaymentsFromSubscriptions(subscriptions, 30);
    const source = subscriptions.length > 0 ? localItems : (upcomingData?.items ?? []);

    return [...source]
      .map((item) => ({ item, daysLeft: daysUntilDate(item.nextPaymentDate) }))
      .filter((entry): entry is { item: UpcomingPaymentItem; daysLeft: number } =>
        entry.daysLeft !== null && entry.daysLeft >= 0 && entry.daysLeft <= 30
      )
      .sort((a, b) => {
        if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
        return a.item.name.localeCompare(b.item.name, 'pl');
      })
      .map((entry) => entry.item);
  }, [subscriptions, upcomingData]);
  const upcomingPaymentsCount = reliableUpcomingItems.length;
  const effectiveBudgetImpact = useMemo(() => {
    const localIncome = persistentIncome?.monthlyIncome ?? null;
    const localIncomeCurrency = persistentIncome?.incomeCurrency || baseCurrency;
    const hasLocalIncome = Number(localIncome || 0) > 0;
    const localCurrencyMatches = localIncomeCurrency === baseCurrency;

    if (hasLocalIncome && localCurrencyMatches) {
      const percentage = monthlyTotal > 0 && localIncome
        ? Math.round((monthlyTotal / localIncome) * 1000) / 10
        : 0;

      return {
        hasIncome: true,
        monthlyIncome: localIncome,
        incomeCurrency: localIncomeCurrency,
        monthlySubscriptionsTotal: monthlyTotal,
        subscriptionsIncomePercentage: percentage,
        currencyMismatch: false,
      };
    }

    if (budgetImpact?.hasIncome) {
      return {
        ...budgetImpact,
        currencyMismatch: false,
      };
    }

    return {
      hasIncome: false,
      monthlyIncome: localIncome,
      incomeCurrency: localIncomeCurrency,
      monthlySubscriptionsTotal: monthlyTotal,
      subscriptionsIncomePercentage: null,
      currencyMismatch: hasLocalIncome && !localCurrencyMatches,
    };
  }, [baseCurrency, budgetImpact, monthlyTotal, persistentIncome]);

  useEffect(() => {
    if (!__DEV__) return;

    console.log('[Dashboard] subscriptions snapshot', {
      count: subscriptions?.length,
      items: subscriptions?.map((item) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        billingCycle: item.billingCycle,
        status: item.status,
        isRecurringBill: item.isRecurringBill,
        nextPaymentDate: item.nextPaymentDate,
      })),
    });

    console.log('[Dashboard] summary snapshot', {
      monthlyTotal,
      yearlyTotal,
      averagePerService,
      localMonthlyTotal,
      summaryMonthlyTotal,
      canUseLocalMonthlyTotal,
      countedCurrencies,
      rawDashboardResponse: summaryData,
    });
  }, [
    averagePerService,
    canUseLocalMonthlyTotal,
    countedCurrencies,
    localMonthlyTotal,
    monthlyTotal,
    subscriptions,
    summaryData,
    summaryMonthlyTotal,
    yearlyTotal,
  ]);

  // Memoized Category Breakdown Data
  const memoizedBreakdownItems = useMemo(() => {
    if (!breakdownData?.items) return [];
    return breakdownData.items.map(item => ({
      ...item,
      color: getCategoryTone(appTheme, item.category).accent,
      label: (() => {
        switch (item.category) {
          case 'entertainment': return 'Rozrywka';
          case 'productivity': return 'Produktywność';
          case 'utilities': return 'Narzędzia';
          case 'finance': return 'Finanse';
          case 'health': return 'Zdrowie';
          default: return item.category;
        }
      })()
    }));
  }, [appTheme.colors.primary, breakdownData]);

  // Memoized Trend Data
  const memoizedTrends = useMemo(() => {
    if (!trendsData?.items) return { items: [], maxAmount: 1 };
    const items = trendsData.items;
    const maxAmount = Math.max(...items.map(i => i.amount), 1);
    return { items, maxAmount };
  }, [trendsData]);

  // Check if user has history (expenses in previous months)
  const hasHistory = useMemo(() => {
    if (!trendsData?.items || trendsData.items.length <= 1) return false;
    // Check all months except the last one (current month)
    const pastItems = trendsData.items.slice(0, -1);
    return pastItems.some(i => i.amount > 0);
  }, [trendsData]);

  // Sync Notifications
  useEffect(() => {
    const reminderItems = remindersData?.items;
    if (!reminderItems || !Array.isArray(reminderItems)) return;

    (async () => {
      try {
        await syncReminders(reminderItems);
      } catch (error) {
        if (__DEV__) {
          console.warn('[DashboardScreen] Reminder sync failed:', error);
        }
      }
    })();
  }, [remindersData]);

  useEffect(() => {
    const checkPermissions = async () => {
      const status = await getNotificationPermissionStatus();
      setNotifPermission(status);
    };
    checkPermissions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        refetchSummary(),
        refetchUpcoming(),
        refetchSubscriptions(),
      ]);

      await Promise.allSettled([
        stageOneEnabled ? refetchBreakdown() : Promise.resolve(),
        stageOneEnabled ? refetchTrials() : Promise.resolve(),
        stageTwoEnabled ? refetchSavings() : Promise.resolve(),
        stageThreeEnabled ? refetchTrends() : Promise.resolve(),
        stageThreeEnabled ? refetchReminders() : Promise.resolve(),
        stageTwoEnabled ? refetchHealth() : Promise.resolve(),
        stageThreeEnabled ? refetchActivity() : Promise.resolve(),
        stageTwoEnabled ? refetchBudgetImpact() : Promise.resolve(),
      ]);
    } catch {
      // Pull-to-refresh should never block the screen with technical noise.
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // THEME COLORS (inline simple theme for now)
  const theme = useMemo(() => ({
    background: appTheme.colors.bg,
    card: appTheme.colors.card,
    text: appTheme.colors.text,
    textDim: appTheme.colors.textMuted,
    border: appTheme.colors.border,
    primary: appTheme.colors.primary,
    success: appTheme.colors.success,
    warning: appTheme.colors.warning,
    error: appTheme.colors.danger,
  }), [appTheme]);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 132 + insets.bottom },
    appGlowOne: {
      position: 'absolute',
      width: width * 0.9,
      height: width * 0.9,
      borderRadius: width,
      backgroundColor: `${theme.primary}12`,
      top: -190,
      right: -170,
    },
    appGlowTwo: {
      position: 'absolute',
      width: width * 0.75,
      height: width * 0.75,
      borderRadius: width,
      backgroundColor: withAlpha(theme.primary, 0.08),
      top: 300,
      left: -180,
    },
    dashboardNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.primary}18`,
      borderRadius: 18,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: `${theme.primary}33`,
      gap: 10,
    },
    dashboardNoticeError: {
      backgroundColor: withAlpha(theme.error, 0.14),
      borderColor: withAlpha(theme.error, 0.32),
    },
    dashboardNoticeText: {
      flex: 1,
      color: theme.text,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    headerCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
    },
    shadow: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    shadowSm: {
      shadowColor: theme.background,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 16,
    },
    summaryMain: {
      marginBottom: 16,
    },
    headerGridLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textDim,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    headerAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    headerAmount: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.text,
    },
    headerCurrency: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textDim,
      marginLeft: 6,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 16,
    },
    summarySecondary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summarySecondaryItem: {
      flex: 1,
    },
    headerSecondaryAmount: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    mySubscriptionsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? theme.card : withAlpha(theme.primary, 0.12),
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
      borderWidth: 1,
      borderColor: isDark ? theme.border : withAlpha(theme.primary, 0.22),
    },
    mySubscriptionsBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    mySubscriptionsBtnIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    mySubscriptionsBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.primary,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.text,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textDim,
      marginTop: 2,
    },
    sectionContainer: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    todayHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    todaySubtitle: {
      color: theme.textDim,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
      marginTop: 4,
    },
    todayBadge: {
      minWidth: 34,
      height: 34,
      borderRadius: 14,
      backgroundColor: `${theme.primary}24`,
      borderWidth: 1,
      borderColor: `${theme.primary}3D`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayBadgeText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '900',
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
      marginRight: 4,
    },
    horizontalListPadding: {
      paddingRight: 20,
    },
    upcomingCard: {
      width: 150,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    upcomingCardWarning: {
      borderColor: theme.error,
      backgroundColor: withAlpha(theme.error, isDark ? 0.2 : 0.14),
    },
    upcomingTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    upcomingIconPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    upcomingIconPlaceholderWarning: {
      backgroundColor: theme.error + '20',
    },
    upcomingIconText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.primary,
    },
    upcomingIconTextWarning: {
      color: theme.error,
    },
    upcomingDate: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textDim,
    },
    upcomingDateWarning: {
      color: theme.error,
    },
    upcomingName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    upcomingAmount: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textDim,
    },
    breakdownCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    breakdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    breakdownIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    breakdownInfo: {
      flex: 1,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    breakdownLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    breakdownValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    trendsCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chartContainer: {
      height: 180,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    chartBarContainer: {
      alignItems: 'center',
      flex: 1,
    },
    chartBar: {
      width: 24,
      backgroundColor: theme.primary,
      borderRadius: 6,
      marginBottom: 8,
    },
    chartLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.textDim,
    },
    savingsCard: {
      backgroundColor: `${theme.primary}14`,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: `${theme.primary}33`,
    },
    savingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    savingsIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${theme.primary}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    savingsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    savingsAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.primary,
    },
    savingsFooter: {
      borderTopWidth: 1,
      borderTopColor: `${theme.primary}24`,
      paddingTop: 12,
    },
    savingsFooterText: {
      fontSize: 13,
      color: theme.textDim,
      lineHeight: 18,
    },
    overdueSection: {
      marginBottom: 20,
    },
    overdueBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: withAlpha(theme.error, 0.14),
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: withAlpha(theme.error, 0.26),
    },
    overdueBannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.error,
    },
    overdueActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.error,
      textDecorationLine: 'underline',
    },
    infoBox: {
      flexDirection: 'row',
      padding: 12,
      borderRadius: 12,
      gap: 10,
      alignItems: 'center',
    },
    infoBoxText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    budgetCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    budgetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    budgetTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    budgetProgressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    budgetProgressBarBg: {
      flex: 1,
      height: 10,
      backgroundColor: theme.border,
      borderRadius: 5,
      overflow: 'hidden',
    },
    budgetProgressBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 5,
    },
    budgetPercentage: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.primary,
    },
    budgetDesc: {
      fontSize: 13,
      color: theme.textDim,
      lineHeight: 18,
    },
    insightCard: {
      width: 240,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 16,
      borderLeftWidth: 4,
      shadowColor: theme.background,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    insightTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    insightDesc: {
      fontSize: 12,
      color: theme.textDim,
      lineHeight: 16,
    },
    healthCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 20,
      borderLeftWidth: 6,
      marginBottom: 24,
    },
    healthTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    scoreCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreText: {
      fontSize: 20,
      fontWeight: '800',
    },
    healthMain: {
      flex: 1,
    },
    healthLabel: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 2,
    },
    healthSummary: {
      fontSize: 13,
      color: theme.textDim,
      lineHeight: 18,
    },
    activityCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityMessage: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    activityDate: {
      fontSize: 11,
      color: theme.textDim,
      marginTop: 2,
    },
    typeToggle: {
      flexDirection: 'row',
      backgroundColor: theme.border,
      borderRadius: 12,
      padding: 2,
    },
    typePill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 10,
    },
    typePillActive: {
      backgroundColor: theme.card,
    },
    typePillText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textDim,
    },
    typePillTextActive: {
      color: theme.primary,
    },
    menuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    menuTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: 0,
    },
    menuSubtitle: {
      fontSize: 13,
      color: theme.textDim,
      marginTop: 3,
    },
    topIconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.background,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.border,
    },
    topActions: {
      flexDirection: 'row',
      gap: 10,
    },
    heroDashboardCard: {
      borderRadius: 28,
      padding: 24,
      marginBottom: 18,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
      elevation: 9,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: withAlpha(appTheme.colors.text, 0.22),
    },
    heroEyebrow: {
      color: withAlpha(appTheme.colors.text, 0.74),
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
    },
    heroAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    heroAmount: {
      color: appTheme.colors.text,
      fontSize: 42,
      fontWeight: '900',
      letterSpacing: 0,
    },
    heroCurrency: {
      color: withAlpha(appTheme.colors.text, 0.84),
      fontSize: 16,
      fontWeight: '800',
      marginLeft: 8,
    },
    heroMetaRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    heroMetaPill: {
      flex: 1,
      backgroundColor: withAlpha(appTheme.colors.text, 0.12),
      borderRadius: 16,
      padding: 12,
    },
    heroMetaValue: {
      color: appTheme.colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    heroMetaLabel: {
      color: withAlpha(appTheme.colors.text, 0.72),
      fontSize: 11,
      fontWeight: '700',
      marginTop: 3,
    },
    widgetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginBottom: 18,
    },
    widgetCard: {
      backgroundColor: theme.card,
      borderRadius: 22,
      padding: 18,
      shadowColor: theme.background,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    wideWidget: {
      width: '100%',
    },
    halfWidget: {
      width: (width - 54) / 2,
      minHeight: 168,
    },
    widgetTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    widgetIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.primary}21`,
      borderWidth: 1,
      borderColor: `${theme.primary}38`,
    },
    widgetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: 0,
    },
    widgetCaption: {
      fontSize: 12,
      color: theme.textDim,
      lineHeight: 17,
      marginTop: 4,
    },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 12,
    },
    paymentText: {
      flex: 1,
    },
    paymentName: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
    },
    paymentDate: {
      color: theme.textDim,
      fontSize: 12,
      marginTop: 2,
    },
    paymentAmount: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '800',
    },
    mutedEmptyText: {
      color: theme.textDim,
      fontSize: 13,
      lineHeight: 18,
    },
    subscriptionMetric: {
      fontSize: 32,
      fontWeight: '900',
      color: theme.text,
      marginTop: 8,
    },
    miniChart: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 5,
      height: 54,
      marginTop: 14,
    },
    miniChartTrack: {
      flex: 1,
      justifyContent: 'flex-end',
      borderRadius: 8,
      backgroundColor: `${theme.primary}16`,
      overflow: 'hidden',
    },
    miniChartBar: {
      width: '100%',
      minHeight: 6,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      backgroundColor: theme.primary,
      opacity: 0.22,
    },
    insightStrip: {
      backgroundColor: theme.card,
      borderRadius: 22,
      padding: 18,
      marginBottom: 18,
      shadowColor: theme.background,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 2,
    },
    insightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 9,
    },
    insightTextBlock: {
      flex: 1,
    },
    decisionGrid: {
      gap: 12,
      marginBottom: 18,
    },
    decisionCard: {
      backgroundColor: theme.card,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    decisionAccent: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.primary}24`,
      borderWidth: 1,
      borderColor: `${theme.primary}3D`,
    },
    decisionBody: {
      flex: 1,
    },
    decisionTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '900',
    },
    decisionDesc: {
      color: theme.textDim,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
      marginTop: 3,
    },
    decisionCta: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
      marginTop: 8,
    },
    fab: {
      position: 'absolute',
      bottom: Math.max(insets.bottom + 20, 30),
      right: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
  }), [theme, isDark, insets.bottom]);

  // SMART SUGGESTIONS GENERATOR
  const smartSuggestions = useMemo(() => {
    const list = [];
    
    if (overdueCount > 0) {
      list.push({
        id: 'overdue',
        title: overdueCount === 1 ? 'Jedna płatność wymaga uwagi' : 'Masz zaległe płatności',
        desc: overdueCount === 1
          ? 'Sprawdź najbliższą zaległą subskrypcję i oznacz płatność po opłaceniu.'
          : `${overdueCount} płatności wymagają sprawdzenia na liście subskrypcji.`,
        icon: AlertCircle,
        color: theme.error
      });
    }

    if (trialsData && trialsData.count > 0) {
      const nextTrial = trialsData.items[0];
      list.push({
        id: 'trial',
        title: 'Okres próbny kończy się wkrótce',
        desc: `Okres próbny ${nextTrial.name} kończy się za ${formatDays(nextTrial.daysLeft)}.`,
        icon: Clock,
        color: theme.warning
      });
    }

    const subscriptionsIncomePercentage = effectiveBudgetImpact.subscriptionsIncomePercentage ?? 0;
    if (effectiveBudgetImpact.hasIncome && subscriptionsIncomePercentage > 20) {
      list.push({
        id: 'budget',
        title: 'Wysoki udział subskrypcji',
        desc: `Subskrypcje odpowiadają za ${subscriptionsIncomePercentage.toFixed(1)}% miesięcznego dochodu.`,
        icon: TrendingUp,
        color: theme.primary
      });
    }

    if (savingsData && savingsData.monthlySavings > 0) {
      list.push({
        id: 'savings',
        title: 'Oszczędzasz miesięcznie',
        desc: `Anulowane usługi dają ${savingsData.monthlySavings.toFixed(2)} ${baseCurrency} oszczędności miesięcznie.`,
        icon: Activity,
        color: theme.success
      });
    }

    return list;
  }, [overdueCount, trialsData, effectiveBudgetImpact, savingsData, theme, baseCurrency]);

  const renderBudgetCard = () => {
    if (!effectiveBudgetImpact.hasIncome) return null;
    const subscriptionsIncomePercentage = effectiveBudgetImpact.subscriptionsIncomePercentage ?? 0;
    const monthlyIncome = effectiveBudgetImpact.monthlyIncome ?? 0;

    return (
      <View style={[dynamicStyles.budgetCard, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.budgetHeader}>
          <Wallet size={20} color={theme.primary} />
          <Text style={dynamicStyles.budgetTitle}>Udział subskrypcji</Text>
        </View>
        
        <View style={dynamicStyles.budgetProgressContainer}>
          <View style={dynamicStyles.budgetProgressBarBg}>
            <View 
              style={[
                dynamicStyles.budgetProgressBarFill, 
                { width: `${Math.min(subscriptionsIncomePercentage, 100)}%` }
              ]} 
            />
          </View>
          <Text style={dynamicStyles.budgetPercentage}>
            {subscriptionsIncomePercentage.toFixed(1)}%
          </Text>
        </View>
        
        <Text style={dynamicStyles.budgetDesc}>
          Subskrypcje kosztują {effectiveBudgetImpact.monthlySubscriptionsTotal.toFixed(2)} {baseCurrency} miesięcznie przy dochodzie {monthlyIncome.toFixed(2)} {effectiveBudgetImpact.incomeCurrency}.
        </Text>
      </View>
    );
  };

  const renderSmartInsights = () => {
    if (smartSuggestions.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Inteligentne wskazówki</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
        >
          {smartSuggestions.map(s => (
            <View key={s.id} style={[dynamicStyles.insightCard, { borderLeftColor: s.color }]}>
              <View style={dynamicStyles.insightHeader}>
                <s.icon size={18} color={s.color} />
                <Text style={dynamicStyles.insightTitle}>{s.title}</Text>
              </View>
              <Text style={dynamicStyles.insightDesc}>{s.desc}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };
  const renderHealthScore = () => {
    if (!healthData) return null;
    
    const { score, label, status, summary } = healthData;
    
    const getStatusColor = () => {
      return getStatusTone(appTheme, status).accent;
    };

    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Kondycja subskrypcji</Text>
        <TouchableOpacity 
          style={[dynamicStyles.healthCard, dynamicStyles.shadowSm, { borderLeftColor: getStatusColor() }]}
          activeOpacity={0.9}
        >
          <View style={dynamicStyles.healthTop}>
            <View style={[dynamicStyles.scoreCircle, { borderColor: getStatusColor() }]}>
              <Text style={[dynamicStyles.scoreText, { color: getStatusColor() }]}>{score}</Text>
            </View>
            <View style={dynamicStyles.healthMain}>
              <Text style={[dynamicStyles.healthLabel, { color: getStatusColor() }]}>{label}</Text>
              <Text style={dynamicStyles.healthSummary}>{summary}</Text>
            </View>
            <ChevronRight size={20} color={theme.textDim} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecentActivity = () => {
    if (!activityData || activityData.items.length === 0) return null;

    const getActivityTitle = (item: DashboardActivityItem) => {
      const name = item.subscription.name;
      switch (item.type) {
        case 'canceled':
          return `Anulowano ${name}`;
        case 'paid':
          return `Opłacono ${name}`;
        case 'created':
          return `Dodano ${name}`;
        case 'updated':
          return `Zaktualizowano ${name}`;
        default:
          return item.message;
      }
    };

    const getActivityMeta = (item: DashboardActivityItem) => {
      const date = new Date(item.createdAt).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      return item.subscription.provider ? `${item.subscription.provider} · ${date}` : date;
    };

    return (
      <View style={dynamicStyles.sectionContainer}>
        <View style={dynamicStyles.sectionHeader}>
          <Text style={dynamicStyles.sectionTitle}>Ostatnia aktywność</Text>
          <TouchableOpacity onPress={() => {/* Navigation for full history could go here */}}>
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>Zobacz wszystko</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[dynamicStyles.activityCard, dynamicStyles.shadowSm]}>
          {activityData.items.slice(0, 5).map((item, idx) => (
            <View key={item.id} style={[dynamicStyles.activityItem, idx === 0 && { borderTopWidth: 0 }]}>
              <View style={[dynamicStyles.activityIcon, { backgroundColor: item.type === 'paid' ? withAlpha(theme.primary, 0.13) : item.type === 'canceled' ? withAlpha(theme.error, 0.14) : theme.border }]}>
                <History size={16} color={item.type === 'paid' ? theme.primary : item.type === 'canceled' ? theme.error : theme.textDim} />
              </View>
              <View style={dynamicStyles.activityContent}>
                <Text style={dynamicStyles.activityMessage} numberOfLines={1}>
                  {getActivityTitle(item)}
                </Text>
                <Text style={dynamicStyles.activityDate} numberOfLines={1}>
                  {getActivityMeta(item)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={[dynamicStyles.headerCard, dynamicStyles.shadow]}>
        <View style={dynamicStyles.headerTop}>
          <Text style={dynamicStyles.sectionTitle}>Dashboard</Text>
          <View style={dynamicStyles.headerActions}>
            <TouchableOpacity onPress={() => setIsDark(!isDark)}>
              {isDark ? <Sun size={20} color={theme.textDim} /> : <Moon size={20} color={theme.textDim} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Bell size={20} color={theme.textDim} />
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
          <Text style={dynamicStyles.headerGridLabel}>Koszt subskrypcji / miesiąc</Text>
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
              {summaryData?.activeSubscriptionsCount && summaryData.activeSubscriptionsCount > 0 
                ? (monthlyTotal / summaryData.activeSubscriptionsCount).toFixed(2) 
                : '0.00'} {baseCurrency}
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.statsRow}>
          <View style={dynamicStyles.statBox}>
            <Text style={dynamicStyles.statValue}>{summaryData?.activeSubscriptionsCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Aktywne</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: theme.warning }]}>{summaryData?.trialsCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Okresy próbne</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: theme.error }]}>{summaryData?.overdueCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Zaległe</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: theme.primary }]}>{upcomingPaymentsCount}</Text>
            <Text style={dynamicStyles.statLabel}>Wkrótce</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={dynamicStyles.mySubscriptionsBtn} 
          onPress={() => navigation.navigate('SubscriptionList')}
          activeOpacity={0.8}
        >
          <View style={dynamicStyles.mySubscriptionsBtnContent}>
            <View style={dynamicStyles.mySubscriptionsBtnIcon}>
              <List size={20} color={appTheme.colors.darkText} />
            </View>
            <Text style={dynamicStyles.mySubscriptionsBtnText}>Moje subskrypcje</Text>
          </View>
          <ArrowRight size={20} color={theme.primary} />
        </TouchableOpacity>

        {notifPermission !== 'granted' && (
          <View style={[dynamicStyles.infoBox, { marginTop: 16, backgroundColor: withAlpha(theme.warning, 0.16) }]}>
            <Bell size={16} color={theme.warning} />
            <Text style={[dynamicStyles.infoBoxText, { color: theme.warning }]}>
              Powiadomienia są wyłączone. Włącz je w ustawieniach, aby nie przegapić płatności.
            </Text>
          </View>
        )}

        {overdueCount > 0 && (
          <View style={dynamicStyles.overdueSection}>
            <View style={dynamicStyles.overdueBanner}>
              <AlertCircle size={14} color={theme.error} style={{ marginRight: 6 }} />
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
    const data = savingsData;
    if (!data || data.canceledSubscriptionsCount === 0) return null;

    return (
      <View style={[dynamicStyles.savingsCard, dynamicStyles.shadowSm]}>
        <View style={dynamicStyles.savingsHeader}>
          <View style={dynamicStyles.savingsIconContainer}>
            <Activity size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={dynamicStyles.savingsTitle}>Szacowana oszczędność</Text>
            <Text style={dynamicStyles.savingsAmount}>
              ok. {data.monthlySavings.toFixed(2)} {data.baseCurrency} <Text style={{ fontSize: 12, fontWeight: '500' }}>/ mc</Text>
            </Text>
          </View>
        </View>
        <View style={dynamicStyles.savingsFooter}>
          <Text style={dynamicStyles.savingsFooterText}>
            To około {data.yearlySavings.toFixed(0)} {data.baseCurrency} mniej kosztów w skali roku dzięki {data.canceledSubscriptionsCount} anulowanym subskrypcjom.
          </Text>
        </View>
      </View>
    );
  };

  const renderUpcomingPayment = useCallback(({ item }: { item: UpcomingPaymentItem }) => {
    const daysLeft = daysUntilDate(item.nextPaymentDate) ?? 999;
    const isTomorrow = daysLeft <= 1;
    const dateLabel = formatRelativeDay(item.nextPaymentDate);

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
  }, [navigation, dynamicStyles, isDark]);

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
          isEndingSoon && { borderColor: theme.warning, backgroundColor: withAlpha(theme.warning, isDark ? 0.2 : 0.14) },
          dynamicStyles.shadowSm
        ]}>
          <View style={dynamicStyles.upcomingTop}>
            <View style={[
              dynamicStyles.upcomingIconPlaceholder, 
              { backgroundColor: withAlpha(theme.warning, 0.13) }
            ]}>
              <Clock size={16} color={theme.warning} />
            </View>
            <Text style={[
              dynamicStyles.upcomingDate, 
              { color: theme.warning }
            ]}>
              {daysLeft} d.
            </Text>
          </View>
          <Text style={dynamicStyles.upcomingName} numberOfLines={1}>{item.name}</Text>
          <Text style={dynamicStyles.upcomingAmount}>Koniec okresu próbnego</Text>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, dynamicStyles, isDark]);

  const renderCategoryBreakdown = () => {
    if (memoizedBreakdownItems.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Podział na kategorie</Text>
        <View style={[dynamicStyles.breakdownCard, dynamicStyles.shadowSm, { marginTop: 16 }]}>
          {memoizedBreakdownItems.map((item) => (
            <View key={item.category} style={dynamicStyles.breakdownItem}>
              <View style={[dynamicStyles.breakdownIcon, { backgroundColor: item.color + '15' }]}>
                <Activity size={20} color={item.color} />
              </View>
              <View style={dynamicStyles.breakdownInfo}>
                <View style={dynamicStyles.breakdownRow}>
                  <Text style={dynamicStyles.breakdownLabel}>{item.label}</Text>
                  <Text style={dynamicStyles.breakdownValue}>{item.monthlyAmount.toFixed(2)} {breakdownData?.baseCurrency}</Text>
                </View>
                <View style={dynamicStyles.progressBarBg}>
                  <View 
                    style={[
                      dynamicStyles.progressBarFill, 
                      { 
                        backgroundColor: item.color, 
                        width: `${item.percentage}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFinancialTip = () => {
    const activeSubscriptionsCount = summaryData?.activeSubscriptionsCount ?? 0;
    if (activeSubscriptionsCount >= 3 && hasHistory) return null;

    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Pełen obraz subskrypcji</Text>
        <View style={[dynamicStyles.breakdownCard, dynamicStyles.shadowSm, { marginTop: 8, borderColor: `${theme.primary}44`, backgroundColor: `${theme.primary}14` }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ backgroundColor: theme.primary, padding: 10, borderRadius: 12 }}>
              <Lightbulb size={24} color={appTheme.colors.darkText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                Widzisz pełen obraz subskrypcji?
              </Text>
              <Text style={{ fontSize: 13, color: theme.textDim, lineHeight: 20 }}>
                Dodaj wszystkie cykliczne usługi, okresy próbne i płatności, aby zobaczyć trend kosztów i łatwiej znaleźć miejsca do oszczędzania.
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTrendsChart = () => {
    if (!hasHistory) return null; // Show only after 1 month of data

    const { items, maxAmount } = memoizedTrends;
    if (items.length === 0) return null;

    return (
      <View style={dynamicStyles.sectionContainer}>
        <View style={dynamicStyles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={dynamicStyles.sectionTitle}>Trend kosztów subskrypcji</Text>
            <TrendingUp size={18} color={theme.primary} />
          </View>
          <View style={dynamicStyles.typeToggle}>
            <TouchableOpacity 
              onPress={() => setTrendType('planned')}
              style={[dynamicStyles.typePill, trendType === 'planned' && dynamicStyles.typePillActive]}
            >
              <Text style={[dynamicStyles.typePillText, trendType === 'planned' && dynamicStyles.typePillTextActive]}>Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setTrendType('real')}
              style={[dynamicStyles.typePill, trendType === 'real' && dynamicStyles.typePillActive]}
            >
              <Text style={[dynamicStyles.typePillText, trendType === 'real' && dynamicStyles.typePillTextActive]}>Real</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[dynamicStyles.trendsCard, dynamicStyles.shadowSm]}>
          <View style={dynamicStyles.chartContainer}>
            {items.map((item, idx) => {
              const height = (item.amount / maxAmount) * 120;
              return (
                <View key={idx} style={dynamicStyles.chartBarContainer}>
                  <View style={[dynamicStyles.chartBar, { height: Math.max(height, 5) }]} />
                  <Text style={dynamicStyles.chartLabel}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderMenuHeader = () => (
    <View style={dynamicStyles.menuHeader}>
      <View>
        <Text style={dynamicStyles.menuTitle}>Menu główne</Text>
        <Text style={dynamicStyles.menuSubtitle}>Subskrypcje pod kontrolą</Text>
      </View>
      <View style={dynamicStyles.topActions}>
        <TouchableOpacity style={dynamicStyles.topIconButton} onPress={() => navigation.navigate('Notifications')}>
          <Bell size={19} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={dynamicStyles.topIconButton} onPress={() => navigation.navigate('Settings')}>
          <Settings size={19} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeroWidget = () => {
    const activeCount = summaryData?.activeSubscriptionsCount ?? 0;
    const average = activeCount > 0 ? monthlyTotal / activeCount : 0;

    return (
      <LinearGradient colors={appTheme.gradients.hero} style={dynamicStyles.heroDashboardCard}>
        <Text style={dynamicStyles.heroEyebrow}>Całkowity koszt miesięczny</Text>
        <View style={dynamicStyles.heroAmountRow}>
          <Text style={dynamicStyles.heroAmount}>{monthlyTotal.toFixed(2)}</Text>
          <Text style={dynamicStyles.heroCurrency}>{baseCurrency}</Text>
        </View>
        <View style={dynamicStyles.heroMetaRow}>
          <View style={dynamicStyles.heroMetaPill}>
            <Text style={dynamicStyles.heroMetaValue}>{yearlyTotal.toFixed(0)} {baseCurrency}</Text>
            <Text style={dynamicStyles.heroMetaLabel}>Rocznie</Text>
          </View>
          <View style={dynamicStyles.heroMetaPill}>
            <Text style={dynamicStyles.heroMetaValue}>{average.toFixed(2)} {baseCurrency}</Text>
            <Text style={dynamicStyles.heroMetaLabel}>Średnio / usługa</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderUpcomingWidget = () => {
    const items = reliableUpcomingItems.slice(0, 2);

    return (
      <TouchableOpacity
        style={[dynamicStyles.widgetCard, dynamicStyles.wideWidget]}
        activeOpacity={0.86}
        onPress={() => navigation.navigate('PaymentCalendar')}
      >
        <View style={dynamicStyles.widgetTop}>
          <View>
            <Text style={dynamicStyles.widgetTitle}>Nadchodzące płatności</Text>
            <Text style={dynamicStyles.widgetCaption}>Najbliższe 2 terminy</Text>
          </View>
          <View style={dynamicStyles.widgetIcon}>
            <CalendarDays size={20} color={theme.primary} />
          </View>
        </View>

        {items.length === 0 ? (
          <Text style={dynamicStyles.mutedEmptyText}>Brak płatności w najbliższym okresie.</Text>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={dynamicStyles.paymentRow}
              activeOpacity={0.78}
              onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
            >
              <BrandMark name={item.name} provider={item.provider} />
              <View style={dynamicStyles.paymentText}>
                <Text style={dynamicStyles.paymentName} numberOfLines={1}>{item.name}</Text>
                <Text style={dynamicStyles.paymentDate}>
                  {formatShortDate(item.nextPaymentDate)} · {formatRelativeDay(item.nextPaymentDate)}
                </Text>
              </View>
              <Text style={dynamicStyles.paymentAmount}>{item.amount.toFixed(2)} {item.currency}</Text>
            </TouchableOpacity>
          ))
        )}
      </TouchableOpacity>
    );
  };

  const renderSubscriptionsWidget = () => (
    <TouchableOpacity
      style={[dynamicStyles.widgetCard, dynamicStyles.halfWidget]}
      activeOpacity={0.86}
      onPress={() => navigation.navigate('SubscriptionList')}
    >
      <View style={dynamicStyles.widgetTop}>
        <View style={dynamicStyles.widgetIcon}>
          <List size={20} color={theme.primary} />
        </View>
        <ChevronRight size={18} color={theme.textDim} />
      </View>
      <Text style={dynamicStyles.widgetTitle}>Twoje Subskrypcje</Text>
      <Text style={dynamicStyles.subscriptionMetric}>{summaryData?.activeSubscriptionsCount ?? 0}</Text>
      <Text style={dynamicStyles.widgetCaption}>
        {summaryData?.trialsCount ?? 0} okresów próbnych · {overdueCount} zaległych
      </Text>
    </TouchableOpacity>
  );

  const renderStatsWidget = () => {
    const bars = memoizedTrends.items.length > 0
      ? memoizedTrends.items.slice(-6).map(item => Math.max(0.18, item.amount / memoizedTrends.maxAmount))
      : [0.35, 0.54, 0.42, 0.7, 0.58, 0.82];
    const incomePercentage = effectiveBudgetImpact.subscriptionsIncomePercentage ?? 0;

    return (
      <TouchableOpacity
        style={[dynamicStyles.widgetCard, dynamicStyles.halfWidget]}
        activeOpacity={0.86}
        onPress={() => navigation.navigate('Statistics')}
      >
        <View style={dynamicStyles.widgetTop}>
          <View style={dynamicStyles.widgetIcon}>
            <BarChart3 size={20} color={theme.primary} />
          </View>
          <TrendingUp size={18} color={theme.primary} />
        </View>
        <Text style={dynamicStyles.widgetTitle}>Statystyki</Text>
        {effectiveBudgetImpact.hasIncome ? (
          <>
            <Text style={[dynamicStyles.subscriptionMetric, { color: theme.primary }]}>
              {incomePercentage.toFixed(1)}%
            </Text>
            <Text style={dynamicStyles.widgetCaption}>
              Twoje subskrypcje pochłaniają tyle miesięcznej wypłaty.
            </Text>
          </>
        ) : effectiveBudgetImpact.currencyMismatch ? (
          <>
            <Text style={[dynamicStyles.subscriptionMetric, { color: theme.warning }]}>Waluta</Text>
            <Text style={dynamicStyles.widgetCaption}>
              Dopasuj dochód do {baseCurrency}, aby policzyć procent.
            </Text>
          </>
        ) : (
          <>
            <View style={dynamicStyles.miniChart}>
              {bars.map((height, index) => (
                <View key={`${height}-${index}`} style={dynamicStyles.miniChartTrack}>
                  <View
                    style={[
                      dynamicStyles.miniChartBar,
                      {
                        height: `${Math.min(1, height) * 100}%`,
                        opacity: index === bars.length - 1 ? 1 : 0.28 + index * 0.08,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <Text style={dynamicStyles.widgetCaption}>{hasHistory ? 'Trend kosztów' : 'Dodaj dochód w Ustawieniach'}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderGuardWidget = () => {
    const riskCount = (summaryData?.trialsCount ?? 0) + overdueCount;

    return (
      <TouchableOpacity
        style={[dynamicStyles.widgetCard, dynamicStyles.halfWidget]}
        activeOpacity={0.86}
        onPress={() => navigation.navigate('Guard')}
      >
        <View style={dynamicStyles.widgetTop}>
          <View style={dynamicStyles.widgetIcon}>
            <ShieldCheck size={20} color={theme.primary} />
          </View>
          <Sparkles size={18} color={theme.primary} />
        </View>
        <Text style={dynamicStyles.widgetTitle}>Guard</Text>
        <Text style={dynamicStyles.subscriptionMetric}>{riskCount}</Text>
        <Text style={dynamicStyles.widgetCaption}>okresy próbne i ryzyka do pilnowania</Text>
      </TouchableOpacity>
    );
  };

  const renderTodayFocus = () => {
    const nextPayment = reliableUpcomingItems[0];
    const riskCount = (summaryData?.trialsCount ?? 0) + overdueCount;
    const focusCards = [
      nextPayment ? {
        id: 'payment',
        icon: CalendarDays,
        title: 'Najbliższa płatność',
        desc: `${nextPayment.name} · ${formatRelativeDay(nextPayment.nextPaymentDate)} · ${nextPayment.amount.toFixed(2)} ${nextPayment.currency}`,
        cta: 'Sprawdź termin',
        onPress: () => navigation.navigate('SubscriptionDetail', { id: nextPayment.id }),
      } : {
        id: 'calendar',
        icon: CalendarDays,
        title: 'Kalendarz płatności',
        desc: 'Zobacz, które tygodnie będą najdroższe i kiedy warto mieć bufor.',
        cta: 'Otwórz kalendarz',
        onPress: () => navigation.navigate('PaymentCalendar'),
      },
      riskCount > 0 ? {
        id: 'guard',
        icon: ShieldCheck,
        title: 'Guard wykrył ryzyko',
        desc: `${riskCount} rzeczy wymaga uwagi: okresy próbne, zaległości albo nadchodzące płatności.`,
        cta: 'Otwórz Guard',
        onPress: () => navigation.navigate('Guard'),
      } : {
        id: 'scan',
        icon: Sparkles,
        title: 'Audit skrzynki',
        desc: 'Wykryj historyczne subskrypcje, zmiany cen i rachunki do sprawdzenia.',
        cta: 'Otwórz Email Scan',
        onPress: () => navigation.navigate('EmailScan'),
      },
      {
        id: 'review-queue',
        icon: ShieldCheck,
        title: 'Kolejka decyzji',
        desc: 'Szybko oznacz: zostawiam, anulowac albo sprawdze pozniej.',
        cta: 'Otwórz kolejkę',
        onPress: () => navigation.navigate('SubscriptionReviewQueue'),
      },
    ];

    return (
      <View style={dynamicStyles.sectionContainer}>
        <View style={dynamicStyles.todayHeader}>
          <View>
            <Text style={dynamicStyles.sectionTitle}>Dziś do sprawdzenia</Text>
            <Text style={dynamicStyles.todaySubtitle}>Najkrótsza droga do decyzji, nie kolejna lista.</Text>
          </View>
          <View style={dynamicStyles.todayBadge}>
            <Text style={dynamicStyles.todayBadgeText}>{focusCards.length}</Text>
          </View>
        </View>
        <View style={dynamicStyles.decisionGrid}>
          {focusCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={dynamicStyles.decisionCard}
              activeOpacity={0.86}
              onPress={card.onPress}
            >
              <View style={dynamicStyles.decisionAccent}>
                <card.icon size={20} color={theme.primary} />
              </View>
              <View style={dynamicStyles.decisionBody}>
                <Text style={dynamicStyles.decisionTitle}>{card.title}</Text>
                <Text style={dynamicStyles.decisionDesc}>{card.desc}</Text>
                <Text style={dynamicStyles.decisionCta}>{card.cta}</Text>
              </View>
              <ChevronRight size={18} color={theme.textDim} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPremiumInsights = () => {
    const estimatedScore = Math.max(35, Math.min(100, 100 - overdueCount * 14 - (summaryData?.trialsCount ?? 0) * 4));
    const healthLabel = healthData
      ? `${healthData.label} · ${healthData.score}/100`
      : `Szacunkowo ${estimatedScore}/100 · dotknij po szczegóły`;
    const savingsLabel = savingsData && savingsData.monthlySavings > 0
      ? `Oszczędzasz ok. ${savingsData.monthlySavings.toFixed(2)} ${savingsData.baseCurrency} / mc`
      : 'Zobacz anulowane koszty i miesięczny efekt';
    const incomePercentage = effectiveBudgetImpact.subscriptionsIncomePercentage ?? null;

    return (
      <View style={dynamicStyles.insightStrip}>
        <TouchableOpacity
          style={dynamicStyles.insightRow}
          activeOpacity={0.84}
          onPress={() => navigation.navigate('HealthScoreDetails')}
        >
          <View style={dynamicStyles.widgetIcon}>
            <Sparkles size={18} color={theme.primary} />
          </View>
          <View style={dynamicStyles.insightTextBlock}>
            <Text style={dynamicStyles.insightTitle}>Kondycja subskrypcji</Text>
            <Text style={dynamicStyles.insightDesc}>{healthLabel}</Text>
          </View>
          <ChevronRight size={17} color={theme.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.insightRow}
          activeOpacity={0.84}
          onPress={() => navigation.navigate('SavingsDetails')}
        >
          <View style={dynamicStyles.widgetIcon}>
            <Activity size={18} color={theme.primary} />
          </View>
          <View style={dynamicStyles.insightTextBlock}>
            <Text style={dynamicStyles.insightTitle}>Oszczędności</Text>
            <Text style={dynamicStyles.insightDesc}>{savingsLabel}</Text>
          </View>
          <ChevronRight size={17} color={theme.textDim} />
        </TouchableOpacity>

        {effectiveBudgetImpact.hasIncome && (
          <View style={dynamicStyles.insightRow}>
            <View style={dynamicStyles.widgetIcon}>
              <Wallet size={18} color={theme.primary} />
            </View>
            <View style={dynamicStyles.insightTextBlock}>
              <Text style={dynamicStyles.insightTitle}>Wpływ na budżet</Text>
              <Text style={dynamicStyles.insightDesc}>
                Subskrypcje pochłaniają {(incomePercentage ?? 0).toFixed(1)}% Twojej wypłaty.
              </Text>
            </View>
          </View>
        )}
        {effectiveBudgetImpact.currencyMismatch && (
          <TouchableOpacity
            style={dynamicStyles.insightRow}
            activeOpacity={0.84}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={dynamicStyles.widgetIcon}>
              <Wallet size={18} color={theme.warning} />
            </View>
            <View style={dynamicStyles.insightTextBlock}>
              <Text style={dynamicStyles.insightTitle}>Dochód zapisany w innej walucie</Text>
              <Text style={dynamicStyles.insightDesc}>
                Ustaw dochód w {baseCurrency}, aby liczyć procent wypłaty bez zgadywania kursu.
              </Text>
            </View>
            <ChevronRight size={17} color={theme.textDim} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderDecisionCenter = () => {
    const nextPayment = reliableUpcomingItems[0];
    const nextTrial = trialsData?.items?.[0];
    const cards = [
      nextPayment ? {
        id: 'next-payment',
        icon: CalendarDays,
        title: 'Najbliższa płatność',
        desc: `${nextPayment.name} · ${formatRelativeDay(nextPayment.nextPaymentDate)} · ${nextPayment.amount.toFixed(2)} ${nextPayment.currency}`,
        cta: 'Otwórz szczegóły',
        onPress: () => navigation.navigate('SubscriptionDetail', { id: nextPayment.id }),
      } : {
        id: 'calendar',
        icon: CalendarDays,
        title: 'Kalendarz płatności',
        desc: 'Zobacz listę subskrypcji posortowaną po najbliższym terminie.',
        cta: 'Otwórz kalendarz',
        onPress: () => navigation.navigate('PaymentCalendar'),
      },
      nextTrial ? {
        id: 'trial',
        icon: Clock,
        title: 'Radar okresu próbnego',
        desc: `${nextTrial.name} kończy się za ${formatDays(nextTrial.daysLeft)}. To dobry moment na decyzję.`,
        cta: 'Sprawdź okres próbny',
        onPress: () => navigation.navigate('SubscriptionDetail', { id: nextTrial.id }),
      } : {
        id: 'email-scan',
        icon: Sparkles,
        title: 'Automatyczne wykrywanie',
        desc: 'Przeskanuj pocztę i dodawaj tylko te pozycje, które zatwierdzisz.',
        cta: 'Otwórz Gmail Scan',
        onPress: () => navigation.navigate('EmailScan'),
      },
    ];

    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Centrum decyzji</Text>
        <View style={dynamicStyles.decisionGrid}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={dynamicStyles.decisionCard}
              activeOpacity={0.86}
              onPress={card.onPress}
            >
              <View style={dynamicStyles.decisionAccent}>
                <card.icon size={20} color={theme.primary} />
              </View>
              <View style={dynamicStyles.decisionBody}>
                <Text style={dynamicStyles.decisionTitle}>{card.title}</Text>
                <Text style={dynamicStyles.decisionDesc}>{card.desc}</Text>
                <Text style={dynamicStyles.decisionCta}>{card.cta}</Text>
              </View>
              <ChevronRight size={18} color={theme.textDim} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderDashboardNotice = () => {
    if (isError) {
      return (
        <TouchableOpacity
          style={[dynamicStyles.dashboardNotice, dynamicStyles.dashboardNoticeError]}
          activeOpacity={0.8}
          onPress={handleRefresh}
        >
          <AlertCircle size={18} color={theme.error} />
          <Text style={dynamicStyles.dashboardNoticeText}>
            Nie udało się odświeżyć części danych. Pokazujemy ostatni znany stan. Dotknij, aby spróbować ponownie.
          </Text>
        </TouchableOpacity>
      );
    }

    if (isLoading && !hasData) {
      return (
        <View style={dynamicStyles.dashboardNotice}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={dynamicStyles.dashboardNoticeText}>Przygotowuję Twoje centrum decyzji...</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <View style={dynamicStyles.appGlowOne} />
      <View style={dynamicStyles.appGlowTwo} />
      <ScrollView 
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        scrollEventThrottle={16}
        decelerationRate="fast"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      >
        {renderMenuHeader()}
        <NetworkStatusBanner onRetry={handleRefresh} />
        {renderDashboardNotice()}
        {renderHeroWidget()}
        <View style={dynamicStyles.widgetGrid}>
          {renderUpcomingWidget()}
          {renderSubscriptionsWidget()}
          {renderStatsWidget()}
          {renderGuardWidget()}
        </View>
        {renderDeferredSections && (
          <>
            {renderPremiumInsights()}
            {renderTodayFocus()}
            {renderDecisionCenter()}
          </>
        )}

      </ScrollView>

      <TouchableOpacity 
        style={dynamicStyles.fab}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Plus size={30} color={appTheme.colors.darkText} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default DashboardScreen;
