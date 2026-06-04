import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from 'lucide-react-native';
import { useSubscriptions } from '../hooks/useSubscriptions';
import type { AppStackParamList } from '../types/navigation';
import type { BillingCycle, Subscription } from '../types/api';
import { LOCAL_SUBSCRIPTION_PLANS, PopularSubscription, SubscriptionPlanVariant } from '../data/subscriptionPlans';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { daysUntilDate, formatRelativeDay, parseAppDate } from '../utils/date';
import { goBackOrDashboard } from '../utils/navigation';

type GuardIssue = {
  id: string;
  title: string;
  desc: string;
  severity: 'critical' | 'warning' | 'info';
  subscriptionId?: string;
};

type PriceAlert = GuardIssue & {
  currentMonthly: number;
  catalogMonthly: number;
  currency: string;
};

const cycleLabels: Record<BillingCycle, string> = {
  monthly: 'miesięcznie',
  yearly: 'rocznie',
  weekly: 'tygodniowo',
  one_time: 'jednorazowo',
  custom: 'niestandardowo',
};

function toMonthlyAmount(amount: number, cycle: BillingCycle) {
  if (cycle === 'yearly') return amount / 12;
  if (cycle === 'weekly') return amount * 4.345;
  if (cycle === 'one_time') return 0;
  return amount;
}

function normalize(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż+ ]/gi, '')
    .trim();
}

function findCatalogPlan(subscription: Subscription): { service: PopularSubscription; plan?: SubscriptionPlanVariant } | null {
  const source = normalize(`${subscription.name} ${subscription.provider || ''}`);
  const service = LOCAL_SUBSCRIPTION_PLANS.find((item) => {
    const serviceName = normalize(item.name);
    const provider = normalize(item.provider);
    return source.includes(serviceName) || (!!provider && source.includes(provider));
  });

  if (!service) return null;

  if (!service.availablePlans || service.availablePlans.length === 0) {
    return { service };
  }

  const planName = normalize(subscription.planName);
  const exactPlan = planName
    ? service.availablePlans.find((plan) => normalize(plan.name) === planName)
    : undefined;

  if (exactPlan) return { service, plan: exactPlan };

  const currentMonthly = toMonthlyAmount(Number(subscription.amount || 0), subscription.billingCycle);
  const nearestPlan = service.availablePlans
    .map((plan) => ({
      plan,
      diff: Math.abs(toMonthlyAmount(plan.price, plan.billingCycle || 'monthly') - currentMonthly),
    }))
    .sort((a, b) => a.diff - b.diff)[0]?.plan;

  return { service, plan: nearestPlan };
}

function getSeverityColor(severity: GuardIssue['severity'], primary: string) {
  if (severity === 'critical') return vibrantTheme.colors.danger;
  if (severity === 'warning') return vibrantTheme.colors.warning;
  return primary;
}

export const GuardScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Guard'>>();
  const { theme } = useTheme();
  const { data: subscriptions = [], isLoading, isError, error, refetch, isRefetching } = useSubscriptions();

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.status !== 'canceled'),
    [subscriptions]
  );

  const guardData = useMemo(() => {
    const overdue: GuardIssue[] = [];
    const trials: GuardIssue[] = [];
    const dueSoon: GuardIssue[] = [];
    const priceAlerts: PriceAlert[] = [];

    for (const subscription of activeSubscriptions) {
      const nextDays = daysUntilDate(subscription.nextPaymentDate);
      const trialDays = daysUntilDate(subscription.trialEndDate);

      if (subscription.status === 'overdue' || (nextDays !== null && nextDays < 0)) {
        overdue.push({
          id: `overdue-${subscription.id}`,
          title: subscription.name,
          desc: nextDays !== null ? formatRelativeDay(subscription.nextPaymentDate) : 'Płatność wymaga sprawdzenia',
          severity: 'critical',
          subscriptionId: subscription.id,
        });
      } else if (nextDays !== null && nextDays >= 0 && nextDays <= 7) {
        dueSoon.push({
          id: `due-${subscription.id}`,
          title: subscription.name,
          desc: `${formatRelativeDay(subscription.nextPaymentDate)} · ${Number(subscription.amount || 0).toFixed(2)} ${subscription.currency}`,
          severity: nextDays <= 1 ? 'warning' : 'info',
          subscriptionId: subscription.id,
        });
      }

      if (subscription.isTrial && trialDays !== null && trialDays >= 0 && trialDays <= 7) {
        trials.push({
          id: `trial-${subscription.id}`,
          title: subscription.name,
          desc: `Trial kończy się ${formatRelativeDay(subscription.trialEndDate).toLowerCase()}`,
          severity: trialDays <= 1 ? 'critical' : 'warning',
          subscriptionId: subscription.id,
        });
      }

      const catalog = findCatalogPlan(subscription);
      if (catalog?.plan) {
        const currentMonthly = toMonthlyAmount(Number(subscription.amount || 0), subscription.billingCycle);
        const catalogMonthly = toMonthlyAmount(catalog.plan.price, catalog.plan.billingCycle || 'monthly');
        const difference = currentMonthly - catalogMonthly;

        if (difference > 1) {
          priceAlerts.push({
            id: `price-${subscription.id}`,
            title: subscription.name,
            desc: `Płacisz ok. ${difference.toFixed(2)} ${subscription.currency} / mc powyżej katalogu (${catalog.plan.name}).`,
            severity: difference > 10 ? 'warning' : 'info',
            subscriptionId: subscription.id,
            currentMonthly,
            catalogMonthly,
            currency: subscription.currency,
          });
        }
      }
    }

    const riskPoints =
      overdue.length * 18 +
      trials.length * 14 +
      dueSoon.length * 6 +
      priceAlerts.length * 10;
    const score = Math.max(0, Math.min(100, 100 - riskPoints));
    const totalDueSoon = activeSubscriptions.reduce((sum, subscription) => {
      const nextDays = daysUntilDate(subscription.nextPaymentDate);
      if (nextDays !== null && nextDays >= 0 && nextDays <= 7) {
        return sum + Number(subscription.amount || 0);
      }
      return sum;
    }, 0);

    return {
      overdue,
      trials,
      dueSoon,
      priceAlerts,
      score,
      totalDueSoon,
      currency: activeSubscriptions[0]?.currency || 'PLN',
    };
  }, [activeSubscriptions]);

  const scoreLabel = guardData.score >= 85
    ? 'Spokojnie'
    : guardData.score >= 65
      ? 'Warto sprawdzić'
      : 'Wymaga uwagi';

  const renderIssue = (item: GuardIssue) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.issueRow, { borderTopColor: theme.colors.border }]}
      activeOpacity={0.86}
      onPress={() => item.subscriptionId && navigation.navigate('SubscriptionDetail', { id: item.subscriptionId })}
    >
      <View style={[styles.issueDot, { backgroundColor: getSeverityColor(item.severity, theme.colors.primary) }]} />
      <View style={styles.issueBody}>
        <Text style={[styles.issueTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.issueDesc, { color: theme.colors.textMuted }]} numberOfLines={2}>{item.desc}</Text>
      </View>
      <ChevronRight size={17} color={theme.colors.textSubtle} />
    </TouchableOpacity>
  );

  const renderSection = (
    title: string,
    caption: string,
    icon: React.ComponentType<any>,
    items: GuardIssue[],
    emptyText: string
  ) => {
    const Icon = icon;
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.colors.primary}1F`, borderColor: `${theme.colors.primary}33` }]}>
              <Icon size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
              <Text style={[styles.sectionCaption, { color: theme.colors.textMuted }]}>{caption}</Text>
            </View>
          </View>
          <Text style={[styles.sectionCount, { color: theme.colors.primary }]}>{items.length}</Text>
        </View>

        {items.length > 0 ? (
          <View style={styles.issueList}>{items.slice(0, 4).map(renderIssue)}</View>
        ) : (
          <Text style={[styles.emptySectionText, { color: theme.colors.textMuted }]}>{emptyText}</Text>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>Uruchamiam Sub-Sentry Guard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.glowTop, { backgroundColor: `${theme.colors.primary}26` }]} />
      <View style={[styles.glowBottom, { backgroundColor: `${theme.colors.cyan}20` }]} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={() => goBackOrDashboard(navigation)} accessibilityLabel="Wstecz">
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Sub-Sentry Guard</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Pilot bezpieczeństwa triali i płatności</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
      >
        {isError && (
          <View style={[styles.errorBanner, { borderColor: `${theme.colors.warning}44`, backgroundColor: `${theme.colors.warning}18` }]}>
            <AlertCircle size={17} color={theme.colors.warning} />
            <Text style={[styles.errorBannerText, { color: theme.colors.textMuted }]}>
              Nie udało się odświeżyć danych. Pokazuję ostatni znany stan. {error?.message || ''}
            </Text>
          </View>
        )}

        <LinearGradient colors={theme.gradients.hero} style={[styles.heroCard, { shadowColor: theme.colors.primary }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <ShieldCheck size={25} color="#FFFFFF" />
            </View>
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Demo Premium</Text>
            </View>
          </View>

          <Text style={styles.heroLabel}>Guard score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>{guardData.score}</Text>
            <Text style={styles.scoreSuffix}>/100</Text>
          </View>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>

          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{guardData.trials.length}</Text>
              <Text style={styles.heroMetricLabel}>triale</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{guardData.dueSoon.length}</Text>
              <Text style={styles.heroMetricLabel}>do 7 dni</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{guardData.totalDueSoon.toFixed(0)}</Text>
              <Text style={styles.heroMetricLabel}>{guardData.currency}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.paywallPreview, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.paywallIcon, { backgroundColor: `${theme.colors.primary}1F` }]}>
            <Sparkles size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.paywallBody}>
            <Text style={[styles.paywallTitle, { color: theme.colors.text }]}>Guard jako pakiet za 5 zł / mies.</Text>
            <Text style={[styles.paywallDesc, { color: theme.colors.textMuted }]}>Triale, radar płatności i price watch w jednym miejscu.</Text>
          </View>
        </View>

        {renderSection(
          'Trial Guard',
          'Najbliższe triale, które mogą zamienić się w płatność',
          Clock,
          guardData.trials,
          'Brak triali kończących się w najbliższych 7 dniach.'
        )}

        {renderSection(
          'Payment Stress Radar',
          'Płatności, które uderzą w budżet w najbliższym tygodniu',
          CalendarDays,
          [...guardData.overdue, ...guardData.dueSoon],
          'Najbliższy tydzień wygląda spokojnie.'
        )}

        {renderSection(
          'Price Watch',
          'Porównanie zapisanej ceny z lokalnym katalogiem planów',
          TrendingDown,
          guardData.priceAlerts,
          'Nie widzę cen wyższych niż katalog dla rozpoznanych usług.'
        )}

        <TouchableOpacity
          style={[styles.primaryCta, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
          activeOpacity={0.86}
          onPress={() => navigation.navigate('PaymentCalendar')}
        >
          <Bell size={19} color={theme.colors.darkText} />
          <Text style={[styles.primaryCtaText, { color: theme.colors.darkText }]}>Otwórz kalendarz płatności</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowTop: {
    position: 'absolute',
    top: -140,
    right: -140,
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 120,
    left: -150,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.card,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  headerText: { flex: 1 },
  title: { color: vibrantTheme.colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: vibrantTheme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 2 },
  content: { padding: 20, paddingBottom: 42 },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    ...vibrantTheme.shadows.glow,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  demoBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  demoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  heroLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  scoreValue: { color: '#FFFFFF', fontSize: 54, fontWeight: '900' },
  scoreSuffix: { color: 'rgba(255,255,255,0.72)', fontSize: 18, fontWeight: '900', marginLeft: 6 },
  scoreLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  heroMetrics: { flexDirection: 'row', gap: 10, marginTop: 22 },
  heroMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroMetricValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  heroMetricLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', marginTop: 2 },
  errorBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderColor: 'rgba(251,191,36,0.28)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { flex: 1, color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  paywallPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginTop: 18,
    marginBottom: 18,
  },
  paywallIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  paywallBody: { flex: 1 },
  paywallTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  paywallDesc: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 4 },
  sectionCard: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 26,
    padding: 16,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    marginBottom: 16,
    ...vibrantTheme.shadows.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  sectionTitle: { color: vibrantTheme.colors.text, fontSize: 15, fontWeight: '900' },
  sectionCaption: { color: vibrantTheme.colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2, maxWidth: 250 },
  sectionCount: { color: '#CBD5E1', fontSize: 18, fontWeight: '900' },
  issueList: { gap: 10 },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: vibrantTheme.colors.border,
  },
  issueDot: { width: 9, height: 9, borderRadius: 5 },
  issueBody: { flex: 1 },
  issueTitle: { color: vibrantTheme.colors.text, fontSize: 14, fontWeight: '900' },
  issueDesc: { color: vibrantTheme.colors.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 3 },
  emptySectionText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    paddingTop: 4,
  },
  primaryCta: {
    height: 54,
    borderRadius: 20,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    ...vibrantTheme.shadows.glow,
  },
  primaryCtaText: { color: vibrantTheme.colors.darkText, fontSize: 15, fontWeight: '900' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { color: vibrantTheme.colors.textMuted, fontSize: 14, fontWeight: '700', marginTop: 12 },
});

export default GuardScreen;
