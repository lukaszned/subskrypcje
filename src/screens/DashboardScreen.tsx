import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  Animated,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  History
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
import { useUserSettings } from '../hooks/useUserSettings';
import { syncReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { ErrorState } from '../components/ErrorState';
import { useBudgetImpact } from '../hooks/useBudgetImpact';
import { useNotificationPreview } from '../hooks/useNotificationPreview';
import { useHealthScore } from '../hooks/useHealthScore';
import { useDashboardActivity } from '../hooks/useDashboardActivity';
import { 
  UpcomingPaymentItem, 
  CategoryBreakdownItem,
  SubscriptionCategory
} from '../types/api';

const { width } = Dimensions.get('window');

const formatDays = (days: number) => {
  if (days === 1) return '1 dzień';
  return `${days} dni`;
};

// ─────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────
const Skeleton = React.memo(({ width, height, style, borderRadius = 8 }: any) => {
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
});

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
export const DashboardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Dashboard'>>();
  const { signOut } = useAuth();
  
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('granted');
  const [trendType, setTrendType] = useState<'planned' | 'real'>('planned');

  // Data
  const { data: summaryData, isLoading: isSummaryLoading, isError: isSummaryError, error: summaryError, refetch: refetchSummary } = useDashboardSummary();
  const { data: upcomingData, refetch: refetchUpcoming } = useUpcomingPayments(30);
  const { data: breakdownData, refetch: refetchBreakdown } = useCategoryBreakdown();
  const { data: trialsData, refetch: refetchTrials } = useTrials(30);
  const { data: savingsData, refetch: refetchSavings } = useDashboardSavings();
  const { data: trendsData, refetch: refetchTrends } = useDashboardTrends(6, trendType);
  const { data: remindersData, refetch: refetchReminders } = useReminders();
  const { data: healthData, refetch: refetchHealth } = useHealthScore();
  const { data: activityData, refetch: refetchActivity } = useDashboardActivity(10);

  const { data: settings, isError: isSettingsError, error: settingsError, refetch: refetchSettings } = useUserSettings();
  const { data: budgetImpact } = useBudgetImpact();
  const { data: notifPreview } = useNotificationPreview();

  const isLoading = isSummaryLoading;
  const isError = isSummaryError || isSettingsError;
  const hasData = !!summaryData;

  // DIAGNOSTIC LOGGING
  console.log('[DashboardScreen] State:', { isLoading, isError, hasData });
  if (isSummaryError) console.error('[DashboardScreen] Summary Error');
  if (isSettingsError) console.error('[DashboardScreen] Settings Error:', settingsError);

  const monthlyTotal = summaryData?.monthlyTotal ?? 0;
  const yearlyTotal = summaryData?.yearlyTotal ?? 0;
  const baseCurrency = summaryData?.baseCurrency ?? 'PLN';
  const overdueCount = summaryData?.overdueCount ?? 0;

  // Memoized Category Breakdown Data
  const memoizedBreakdownItems = useMemo(() => {
    if (!breakdownData?.items) return [];
    return breakdownData.items.map(item => ({
      ...item,
      color: (() => {
        switch (item.category) {
          case 'entertainment': return '#6366F1';
          case 'productivity': return '#10B981';
          case 'utilities': return '#3B82F6';
          case 'finance': return '#F59E0B';
          case 'health': return '#EF4444';
          default: return '#64748B';
        }
      })(),
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
  }, [breakdownData]);

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
    if (reminderItems && Array.isArray(reminderItems) && reminderItems.length > 0) {
      // Synchronizujemy powiadomienia w tle, nie blokujemy UI
      (async () => {
        try {
          await syncReminders(reminderItems);
        } catch (e) {
          console.warn('Notification sync failed', e);
        }
      })();
    }
  }, [remindersData]);

  useEffect(() => {
    const checkPermissions = async () => {
      // W Expo Go notifications działają inaczej, ale zostawiamy logikę
      setNotifPermission('granted');
    };
    checkPermissions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSummary(),
        refetchUpcoming(),
        refetchBreakdown(),
        refetchTrials(),
        refetchSavings(),
        refetchTrends(),
        refetchReminders(),
        refetchSettings(),
        refetchHealth(),
        refetchActivity(),
      ]);
    } catch (e) {
      console.warn('Refresh failed', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // THEME COLORS (inline simple theme for now)
  const theme = useMemo(() => ({
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    textDim: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  }), [isDark]);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    headerCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
    },
    shadow: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
    },
    shadowSm: {
      shadowColor: '#000',
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
      backgroundColor: isDark ? '#1E293B' : '#EEF2FF',
      borderRadius: 16,
      padding: 16,
      marginTop: 20,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E0E7FF',
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
      backgroundColor: isDark ? '#451a1a' : '#FEF2F2',
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
      backgroundColor: '#ECFDF5',
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#A7F3D0',
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
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    savingsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#065F46',
    },
    savingsAmount: {
      fontSize: 20,
      fontWeight: '800',
      color: '#059669',
    },
    savingsFooter: {
      borderTopWidth: 1,
      borderTopColor: '#D1FAE5',
      paddingTop: 12,
    },
    savingsFooterText: {
      fontSize: 13,
      color: '#047857',
      lineHeight: 18,
    },
    overdueSection: {
      marginBottom: 20,
    },
    overdueBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF2F2',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#FEE2E2',
    },
    overdueBannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: '#DC2626',
    },
    overdueActionText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#DC2626',
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
      shadowColor: '#000',
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
  }), [theme, isDark]);

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
        title: 'Trial kończy się wkrótce',
        desc: `Trial ${nextTrial.name} kończy się za ${formatDays(nextTrial.daysLeft)}.`,
        icon: Clock,
        color: theme.warning
      });
    }

    const subscriptionsIncomePercentage = budgetImpact?.subscriptionsIncomePercentage ?? 0;
    if (budgetImpact?.hasIncome && subscriptionsIncomePercentage > 20) {
      list.push({
        id: 'budget',
        title: 'Wysoki udział subskrypcji',
        desc: `Subskrypcje odpowiadają za ${subscriptionsIncomePercentage}% miesięcznego dochodu.`,
        icon: TrendingUp,
        color: theme.primary
      });
    }

    if (savingsData && savingsData.monthlySavings > 0) {
      list.push({
        id: 'savings',
        title: 'Oszczędzasz środki',
        desc: `Anulowane usługi dają ${savingsData.monthlySavings.toFixed(2)} ${baseCurrency} oszczędności miesięcznie.`,
        icon: Activity,
        color: theme.success
      });
    }

    return list;
  }, [overdueCount, trialsData, budgetImpact, savingsData, theme, baseCurrency]);

  const renderBudgetCard = () => {
    if (!budgetImpact || !budgetImpact.hasIncome) return null;
    const subscriptionsIncomePercentage = budgetImpact.subscriptionsIncomePercentage ?? 0;
    const monthlyIncome = budgetImpact.monthlyIncome ?? 0;

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
            {subscriptionsIncomePercentage}%
          </Text>
        </View>
        
        <Text style={dynamicStyles.budgetDesc}>
          Subskrypcje kosztują {budgetImpact.monthlySubscriptionsTotal.toFixed(2)} {baseCurrency} miesięcznie przy dochodzie {monthlyIncome.toFixed(2)} {budgetImpact.incomeCurrency}.
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
      switch (status) {
        case 'excellent': return '#10B981';
        case 'good': return '#6366F1';
        case 'needs_attention': return '#F59E0B';
        case 'risky': return '#EF4444';
        default: return theme.primary;
      }
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
            <ChevronRight size={20} color="#CBD5E1" />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecentActivity = () => {
    if (!activityData || activityData.items.length === 0) return null;

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
              <View style={[dynamicStyles.activityIcon, { backgroundColor: item.type === 'paid' ? '#F0FDF4' : item.type === 'canceled' ? '#FEF2F2' : '#F1F5F9' }]}>
                <History size={16} color={item.type === 'paid' ? '#10B981' : item.type === 'canceled' ? '#EF4444' : '#64748B'} />
              </View>
              <View style={dynamicStyles.activityContent}>
                <Text style={dynamicStyles.activityMessage}>{item.message}</Text>
                <Text style={dynamicStyles.activityDate}>
                  {new Date(item.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const monthlyTotal = Number(summaryData?.monthlyTotal) || 0;
    const yearlyTotal = Number(summaryData?.yearlyTotal) || 0;
    const overdueCount = Number(summaryData?.overdueCount) || 0;
    const baseCurrency = summaryData?.baseCurrency || 'PLN';

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
            <Text style={[dynamicStyles.statValue, { color: '#D97706' }]}>{summaryData?.trialsCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Triale</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: '#DC2626' }]}>{summaryData?.overdueCount ?? 0}</Text>
            <Text style={dynamicStyles.statLabel}>Zaległe</Text>
          </View>
          <View style={[dynamicStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
            <Text style={[dynamicStyles.statValue, { color: '#4F46E5' }]}>{summaryData?.upcomingPaymentsCount ?? 0}</Text>
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
              <List size={20} color="#FFFFFF" />
            </View>
            <Text style={dynamicStyles.mySubscriptionsBtnText}>Moje subskrypcje</Text>
          </View>
          <ArrowRight size={20} color={theme.primary} />
        </TouchableOpacity>

        {notifPermission !== 'granted' && (
          <View style={[dynamicStyles.infoBox, { marginTop: 16, backgroundColor: '#FEF3C7' }]}>
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
    const data = savingsData;
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
          isEndingSoon && { borderColor: '#D97706', backgroundColor: isDark ? '#3d2b10' : '#FFFBEB' },
          dynamicStyles.shadowSm
        ]}>
          <View style={dynamicStyles.upcomingTop}>
            <View style={[
              dynamicStyles.upcomingIconPlaceholder, 
              { backgroundColor: '#F59E0B20' }
            ]}>
              <Clock size={16} color="#D97706" />
            </View>
            <Text style={[
              dynamicStyles.upcomingDate, 
              { color: '#D97706' }
            ]}>
              {daysLeft} d.
            </Text>
          </View>
          <Text style={dynamicStyles.upcomingName} numberOfLines={1}>{item.name}</Text>
          <Text style={dynamicStyles.upcomingAmount}>Koniec triala</Text>
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
    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Pełen obraz subskrypcji</Text>
        <View style={[dynamicStyles.breakdownCard, dynamicStyles.shadowSm, { marginTop: 8, borderColor: theme.primary, backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ backgroundColor: theme.primary, padding: 10, borderRadius: 12 }}>
              <Lightbulb size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
                Widzisz pełen obraz subskrypcji?
              </Text>
              <Text style={{ fontSize: 13, color: theme.textDim, lineHeight: 20 }}>
                Dodaj wszystkie cykliczne usługi, triale i płatności, aby zobaczyć trend kosztów i łatwiej znaleźć miejsca do oszczędzania.
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

  // MAIN RENDER
  if (isLoading && !hasData) {
    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <View style={dynamicStyles.content}>
          <Skeleton width="100%" height={240} borderRadius={24} style={{ marginBottom: 24 }} />
          <Skeleton width={180} height={24} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Skeleton width={150} height={100} borderRadius={20} />
            <Skeleton width={150} height={100} borderRadius={20} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isError && !hasData) {
    const errorDetails = isSummaryError
      ? `Summary Error: ${summaryError?.message || JSON.stringify(summaryError)}`
      : isSettingsError ? `Settings Error: ${settingsError?.message || JSON.stringify(settingsError)}` : 'Unknown error';

    const checkConnectivity = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
        const res = await fetch(`${baseUrl}/health`);
        const data = await res.json();
        Alert.alert('Połączenie OK', `Serwer odpowiedział: ${JSON.stringify(data)}\nURL: ${baseUrl}`);
      } catch (err: any) {
        Alert.alert('Błąd połączenia', `Nie udało się połączyć z serwerem!\nURL: ${process.env.EXPO_PUBLIC_API_BASE_URL}\nBłąd: ${err.message}`);
      }
    };

    return (
      <SafeAreaView style={dynamicStyles.safeArea}>
        <ErrorState 
          isDark={isDark} 
          message="Nie udało się pobrać danych z serwera. Sprawdź połączenie." 
          details={errorDetails}
          onRetry={handleRefresh}
          onSignOut={handleSignOut}
        />
        <TouchableOpacity 
          style={{ padding: 15, alignItems: 'center' }} 
          onPress={checkConnectivity}
        >
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Sprawdź połączenie z backendem</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const upcomingItems = upcomingData?.items ?? [];

  return (
    <SafeAreaView style={dynamicStyles.safeArea}>
      <ScrollView 
        style={dynamicStyles.container}
        contentContainerStyle={dynamicStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      >
        {renderHeader()}

        {renderHealthScore()}

        {renderSmartInsights()}
        {renderBudgetCard()}

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.horizontalListPadding}>
              {upcomingItems.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {renderUpcomingPayment({ item })}
                  {idx < upcomingItems.length - 1 && <View style={{ width: 16 }} />}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        )}

        {trialsData && trialsData.items.length > 0 && (
          <View style={dynamicStyles.sectionContainer}>
            <View style={dynamicStyles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Kończące się okresy próbne</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dynamicStyles.horizontalListPadding}>
              {trialsData.items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {renderTrialItem({ item })}
                  {idx < trialsData.items.length - 1 && <View style={{ width: 16 }} />}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        )}

        {renderCategoryBreakdown()}

        {renderRecentActivity()}
        {renderFinancialTip()}
        {renderTrendsChart()}
      </ScrollView>

      <TouchableOpacity 
        style={[
          {
            position: 'absolute',
            bottom: 30,
            right: 30,
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
          }
        ]}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Plus size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default DashboardScreen;
