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
import { syncReminders } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { ErrorState } from '../components/ErrorState';
import { NetworkStatusBanner } from '../components/NetworkStatusBanner';
import { useBudgetImpact } from '../hooks/useBudgetImpact';
import { useNotificationPreview } from '../hooks/useNotificationPreview';
import { useHealthScore } from '../hooks/useHealthScore';
import { useDashboardActivity } from '../hooks/useDashboardActivity';
import { 
  UpcomingPaymentItem, 
  CategoryBreakdownItem,
  SubscriptionCategory,
  DashboardActivityItem
} from '../types/api';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { daysUntilDate, formatRelativeDay, formatShortDate } from '../utils/date';

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

const getBrandToken = (name?: string | null, provider?: string | null): BrandToken => {
  const source = `${name || ''} ${provider || ''}`.toLowerCase();

  if (source.includes('netflix')) return { bg: '#050505', fg: '#E50914', label: 'N', weight: '900' };
  if (source.includes('spotify')) return { bg: '#1DB954', fg: '#FFFFFF', label: 'S', weight: '900' };
  if (source.includes('hbo') || source.includes('max')) return { bg: '#1B0B3B', fg: '#FFFFFF', label: 'max', weight: '900' };
  if (source.includes('youtube')) return { bg: '#FF0000', fg: '#FFFFFF', label: '▶', weight: '900' };
  if (source.includes('disney')) return { bg: '#123C69', fg: '#FFFFFF', label: 'D+', weight: '900' };
  if (source.includes('amazon') || source.includes('prime')) return { bg: '#0F172A', fg: '#FF9900', label: 'a', weight: '900' };
  if (source.includes('apple') || source.includes('icloud')) return { bg: '#111827', fg: '#FFFFFF', label: 'A', weight: '900' };
  if (source.includes('chatgpt') || source.includes('openai')) return { bg: '#10A37F', fg: '#FFFFFF', label: 'AI', weight: '900' };
  if (source.includes('google') || source.includes('play')) return { bg: '#FFFFFF', fg: '#4285F4', label: 'G', weight: '900' };
  if (source.includes('canva')) return { bg: '#00C4CC', fg: '#FFFFFF', label: 'C', weight: '900' };
  if (source.includes('xbox')) return { bg: '#107C10', fg: '#FFFFFF', label: 'X', weight: '900' };
  if (source.includes('allegro')) return { bg: '#FF5A00', fg: '#FFFFFF', label: 'A', weight: '900' };
  if (source.includes('strava')) return { bg: '#FC4C02', fg: '#FFFFFF', label: 'S', weight: '900' };

  return {
    bg: '#F1F5F9',
    fg: '#334155',
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
  const brand = getBrandToken(name, provider);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        backgroundColor: brand.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: brand.bg === '#FFFFFF' ? 1 : 0,
        borderColor: '#E2E8F0',
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
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { theme: appTheme } = useTheme();
  
  const [isDark, setIsDark] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('granted');
  const [trendType, setTrendType] = useState<'planned' | 'real'>('planned');
  const [renderDeferredSections, setRenderDeferredSections] = useState(false);

  // Data
  const { data: summaryData, isLoading: isSummaryLoading, isError: isSummaryError, error: summaryError, refetch: refetchSummary } = useDashboardSummary();
  const secondaryEnabled = false;
  const { data: upcomingData, refetch: refetchUpcoming } = useUpcomingPayments(30, !!summaryData);
  const { data: breakdownData, refetch: refetchBreakdown } = useCategoryBreakdown(secondaryEnabled);
  const { data: trialsData, refetch: refetchTrials } = useTrials(30, secondaryEnabled);
  const { data: savingsData, refetch: refetchSavings } = useDashboardSavings(secondaryEnabled);
  const { data: trendsData, refetch: refetchTrends } = useDashboardTrends(6, trendType, secondaryEnabled);
  const { data: remindersData, refetch: refetchReminders } = useReminders(secondaryEnabled);
  const { data: healthData, refetch: refetchHealth } = useHealthScore(secondaryEnabled);
  const { data: activityData, refetch: refetchActivity } = useDashboardActivity(10, secondaryEnabled);

  const { data: budgetImpact, refetch: refetchBudgetImpact } = useBudgetImpact(secondaryEnabled);
  useNotificationPreview(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setRenderDeferredSections(true);
    });

    return () => task.cancel?.();
  }, []);

  const isLoading = isSummaryLoading;
  const isError = isSummaryError;
  const hasData = !!summaryData;

  // DIAGNOSTIC LOGGING
  console.log('[DashboardScreen] State:', { isLoading, isError, hasData });
  if (isSummaryError) console.warn('[DashboardScreen] Summary Error:', summaryError);

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
          case 'productivity': return appTheme.colors.primary;
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
      await Promise.allSettled([
        refetchSummary(),
        refetchUpcoming(),
      ]);

      if (secondaryEnabled) {
        await Promise.allSettled([
          refetchBreakdown(),
          refetchTrials(),
          refetchSavings(),
          refetchTrends(),
          refetchReminders(),
          refetchHealth(),
          refetchActivity(),
          refetchBudgetImpact(),
        ]);
      }
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
      backgroundColor: `${theme.primary}1F`,
      top: -160,
      right: -140,
    },
    appGlowTwo: {
      position: 'absolute',
      width: width * 0.75,
      height: width * 0.75,
      borderRadius: width,
      backgroundColor: 'rgba(139,92,246,0.14)',
      top: 260,
      left: -140,
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
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
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
      shadowColor: '#0F2A1B',
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
      borderColor: 'rgba(255,255,255,0.22)',
    },
    heroEyebrow: {
      color: 'rgba(255,255,255,0.74)',
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
    },
    heroAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    heroAmount: {
      color: '#FFFFFF',
      fontSize: 42,
      fontWeight: '900',
      letterSpacing: 0,
    },
    heroCurrency: {
      color: '#D8F5E5',
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
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: 12,
    },
    heroMetaValue: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    heroMetaLabel: {
      color: 'rgba(255,255,255,0.72)',
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
      shadowColor: '#000000',
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
      shadowColor: '#1C3025',
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
        title: 'Oszczędzasz miesięcznie',
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
        case 'excellent': return theme.primary;
        case 'good': return theme.primary;
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
              <View style={[dynamicStyles.activityIcon, { backgroundColor: item.type === 'paid' ? `${theme.primary}20` : item.type === 'canceled' ? '#FEF2F2' : theme.border }]}>
                <History size={16} color={item.type === 'paid' ? theme.primary : item.type === 'canceled' ? '#EF4444' : theme.textDim} />
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
    const activeSubscriptionsCount = summaryData?.activeSubscriptionsCount ?? 0;
    if (activeSubscriptionsCount >= 3 && hasHistory) return null;

    return (
      <View style={dynamicStyles.sectionContainer}>
        <Text style={dynamicStyles.sectionTitle}>Pełen obraz subskrypcji</Text>
        <View style={[dynamicStyles.breakdownCard, dynamicStyles.shadowSm, { marginTop: 8, borderColor: `${theme.primary}44`, backgroundColor: `${theme.primary}14` }]}>
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
    const items = (upcomingData?.items ?? []).slice(0, 2);

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
        <ChevronRight size={18} color="#B6C4BA" />
      </View>
      <Text style={dynamicStyles.widgetTitle}>Twoje Subskrypcje</Text>
      <Text style={dynamicStyles.subscriptionMetric}>{summaryData?.activeSubscriptionsCount ?? 0}</Text>
      <Text style={dynamicStyles.widgetCaption}>
        {summaryData?.trialsCount ?? 0} triali · {overdueCount} zaległych
      </Text>
    </TouchableOpacity>
  );

  const renderStatsWidget = () => {
    const bars = memoizedTrends.items.length > 0
      ? memoizedTrends.items.slice(-6).map(item => Math.max(0.18, item.amount / memoizedTrends.maxAmount))
      : [0.35, 0.54, 0.42, 0.7, 0.58, 0.82];

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
        <Text style={dynamicStyles.widgetCaption}>{hasHistory ? 'Trend kosztów' : 'Zbieramy historię'}</Text>
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
        <Text style={dynamicStyles.widgetCaption}>triale i ryzyka do pilnowania</Text>
      </TouchableOpacity>
    );
  };

  const renderTodayFocus = () => {
    const nextPayment = upcomingData?.items?.[0];
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
        desc: `${riskCount} rzeczy wymaga uwagi: triale, zaległości albo brak gotowej ścieżki anulowania.`,
        cta: 'Otwórz Guard',
        onPress: () => navigation.navigate('Guard'),
      } : {
        id: 'scan',
        icon: Sparkles,
        title: 'Audit skrzynki',
        desc: 'Wykryj historyczne subskrypcje, zmiany cen i rachunki do review.',
        cta: 'Otwórz Email Scan',
        onPress: () => navigation.navigate('EmailScan'),
      },
      {
        id: 'review-queue',
        icon: ShieldCheck,
        title: 'Kolejka decyzji',
        desc: 'Szybko oznacz: zostawiam, anulowac albo sprawdze pozniej.',
        cta: 'Otworz review',
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
    const incomePercentage = budgetImpact?.subscriptionsIncomePercentage ?? null;

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

        {budgetImpact?.hasIncome && (
          <View style={dynamicStyles.insightRow}>
            <View style={dynamicStyles.widgetIcon}>
              <Wallet size={18} color={theme.primary} />
            </View>
            <View style={dynamicStyles.insightTextBlock}>
              <Text style={dynamicStyles.insightTitle}>Wpływ na budżet</Text>
              <Text style={dynamicStyles.insightDesc}>
                Subskrypcje to {incomePercentage ?? 0}% miesięcznego dochodu.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDecisionCenter = () => {
    const nextPayment = upcomingData?.items?.[0];
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
        title: 'Trial radar',
        desc: `${nextTrial.name} kończy się za ${formatDays(nextTrial.daysLeft)}. To dobry moment na decyzję.`,
        cta: 'Sprawdź trial',
        onPress: () => navigation.navigate('SubscriptionDetail', { id: nextTrial.id }),
      } : {
        id: 'email-scan',
        icon: Sparkles,
        title: 'Automatyczne wykrywanie',
        desc: 'Przeskanuj Gmaila i dodawaj tylko te kandydatury, które zatwierdzisz.',
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
            Nie udalo sie odswiezyc czesci danych. Pokazujemy ostatni znany stan. Dotknij, aby sprobowac ponownie.
          </Text>
        </TouchableOpacity>
      );
    }

    if (isLoading && !hasData) {
      return (
        <View style={dynamicStyles.dashboardNotice}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={dynamicStyles.dashboardNoticeText}>Przygotowuje Twoje centrum decyzji...</Text>
        </View>
      );
    }

    return null;
  };

  // MAIN RENDER
  if (false && isLoading && !hasData) {
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

  if (false && isError && !hasData) {
    const errorDetails = isSummaryError
      ? `Summary Error: ${summaryError?.message || JSON.stringify(summaryError)}`
      : 'Unknown error';

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

        {false && (<>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={dynamicStyles.horizontalListPadding}>
              {upcomingItems.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {renderUpcomingPayment({ item })}
                  {idx < upcomingItems.length - 1 && <View style={{ width: 16 }} />}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        )}

        {(trialsData?.items?.length ?? 0) > 0 && (
          <View style={dynamicStyles.sectionContainer}>
            <View style={dynamicStyles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Kończące się okresy próbne</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={dynamicStyles.horizontalListPadding}>
              {(trialsData?.items ?? []).map((item, idx) => (
                <React.Fragment key={item.id}>
                  {renderTrialItem({ item })}
                  {idx < (trialsData?.items.length ?? 0) - 1 && <View style={{ width: 16 }} />}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>
        )}

        {renderCategoryBreakdown()}

        {renderRecentActivity()}
        {renderFinancialTip()}
        {renderTrendsChart()}
        </>)}
      </ScrollView>

      <TouchableOpacity 
        style={dynamicStyles.fab}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Plus size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default DashboardScreen;
