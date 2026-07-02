import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BarChart3, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useDashboardTrends } from '../hooks/useDashboardTrends';
import { useBudgetImpact } from '../hooks/useBudgetImpact';
import { usePersistentIncome } from '../hooks/usePersistentIncome';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { vibrantTheme } from '../theme/vibrantTheme';
import { useTheme } from '../theme/ThemeContext';
import { CATEGORY_LABELS } from '../types/api';
import type { BillingCycle, Subscription, SubscriptionCategory } from '../types/api';
import { goBackOrDashboard } from '../utils/navigation';

const CATEGORY_COLORS = [
  '#38BDF8',
  '#A78BFA',
  '#34D399',
  '#FBBF24',
  '#FB7185',
  '#60A5FA',
  '#F97316',
  '#2DD4BF',
  '#CBD5E1',
];

const CATEGORY_WHEEL_DOTS = 36;
const CATEGORY_WHEEL_SIZE = 160;
const CATEGORY_WHEEL_DOT_SIZE = 12;
const CATEGORY_WHEEL_RADIUS = 66;

function toMonthlyAmount(subscription: Pick<Subscription, 'amount' | 'billingCycle' | 'isRecurringBill'>) {
  const amount = Number(subscription.amount || 0);
  const cycle = subscription.billingCycle as BillingCycle;
  if (cycle === 'yearly') return amount / 12;
  if (cycle === 'weekly') return amount * 4.345;
  if (cycle === 'one_time') return 0;
  if (cycle === 'custom') return subscription.isRecurringBill ? amount : 0;
  return amount;
}

export const StatisticsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'Statistics'>>();
  const { theme } = useTheme();
  const { data: summary } = useDashboardSummary();
  const { data: trends } = useDashboardTrends(6, 'planned');
  const { data: budget } = useBudgetImpact();
  const { data: persistentIncome } = usePersistentIncome();
  const { data: subscriptions = [] } = useSubscriptions();

  const trendItems = (trends?.items ?? []).slice(-6);
  const maxAmount = Math.max(...trendItems.map((item) => item.amount), 1);
  const savingSimulation = useMemo(() => {
    const active = subscriptions
      .filter((item) => item.status !== 'canceled' && item.includeInStats !== false)
      .map((item) => ({ subscription: item, monthly: toMonthlyAmount(item) }))
      .filter((item) => item.monthly > 0)
      .sort((a, b) => b.monthly - a.monthly);

    const top = active[0];
    const currentMonthly = summary?.monthlyTotal ?? active.reduce((sum, item) => sum + item.monthly, 0);
    const afterMonthly = top ? Math.max(0, currentMonthly - top.monthly) : currentMonthly;

    return {
      top,
      currentMonthly,
      afterMonthly,
      monthlySaving: top?.monthly ?? 0,
      yearlySaving: (top?.monthly ?? 0) * 12,
      currency: summary?.baseCurrency || top?.subscription.currency || 'PLN',
    };
  }, [subscriptions, summary]);
  const budgetView = useMemo(() => {
    const baseCurrency = summary?.baseCurrency || savingSimulation.currency;
    const income = persistentIncome?.monthlyIncome ?? null;
    const incomeCurrency = persistentIncome?.incomeCurrency || baseCurrency;

    if (income && income > 0 && incomeCurrency === baseCurrency) {
      return {
        hasIncome: true,
        percentage: Math.round((savingSimulation.currentMonthly / income) * 1000) / 10,
        currencyMismatch: false,
      };
    }

    if (budget?.hasIncome) {
      return {
        hasIncome: true,
        percentage: Number(budget.subscriptionsIncomePercentage || 0),
        currencyMismatch: false,
      };
    }

    return {
      hasIncome: false,
      percentage: 0,
      currencyMismatch: Boolean(income && income > 0 && incomeCurrency !== baseCurrency),
    };
  }, [budget, persistentIncome, savingSimulation, summary]);
  const categoryBreakdown = useMemo(() => {
    const totals = new Map<SubscriptionCategory, { amount: number; count: number }>();

    subscriptions
      .filter((item) => item.status !== 'canceled' && item.includeInStats !== false)
      .forEach((item) => {
        const monthly = toMonthlyAmount(item);
        if (monthly <= 0) return;

        const category = (item.category || 'other') as SubscriptionCategory;
        const current = totals.get(category) || { amount: 0, count: 0 };
        totals.set(category, { amount: current.amount + monthly, count: current.count + 1 });
      });

    const totalMonthly = Array.from(totals.values()).reduce((sum, item) => sum + item.amount, 0);
    const items = Array.from(totals.entries())
      .map(([category, value], index) => ({
        category,
        label: CATEGORY_LABELS[category] || category,
        amount: value.amount,
        count: value.count,
        percentage: totalMonthly > 0 ? (value.amount / totalMonthly) * 100 : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      currency: summary?.baseCurrency || subscriptions.find((item) => item.currency)?.currency || 'PLN',
      totalMonthly,
      items,
    };
  }, [subscriptions, summary?.baseCurrency]);
  const categoryWheelDots = useMemo(() => {
    if (categoryBreakdown.totalMonthly <= 0 || categoryBreakdown.items.length === 0) return [];

    let cursor = 0;
    const ranges = categoryBreakdown.items.map((item) => {
      cursor += item.percentage;
      return { end: cursor, color: item.color };
    });

    return Array.from({ length: CATEGORY_WHEEL_DOTS }, (_, index) => {
      const angle = (index / CATEGORY_WHEEL_DOTS) * Math.PI * 2 - Math.PI / 2;
      const point = ((index + 0.5) / CATEGORY_WHEEL_DOTS) * 100;
      const range = ranges.find((item) => point <= item.end) || ranges[ranges.length - 1];

      return {
        index,
        color: range?.color || theme.colors.border,
        left: (CATEGORY_WHEEL_SIZE - CATEGORY_WHEEL_DOT_SIZE) / 2 + Math.cos(angle) * CATEGORY_WHEEL_RADIUS,
        top: (CATEGORY_WHEEL_SIZE - CATEGORY_WHEEL_DOT_SIZE) / 2 + Math.sin(angle) * CATEGORY_WHEEL_RADIUS,
      };
    });
  }, [categoryBreakdown, theme.colors.border]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackOrDashboard(navigation)} style={[styles.iconButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} accessibilityLabel="Wstecz">
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Statystyki</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: theme.colors.cardStrong }]}>
          <View style={styles.heroIcon}>
            <BarChart3 size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.heroLabel}>Koszt miesięczny</Text>
          <Text style={styles.heroValue}>
            {(summary?.monthlyTotal ?? 0).toFixed(2)} {summary?.baseCurrency ?? 'PLN'}
          </Text>
          <Text style={styles.heroHint}>Trendy i budżet subskrypcji w jednym miejscu.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Trend kosztów</Text>
            <TrendingUp size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.chartShell}>
            <View style={styles.chartGridLine} />
            <View style={[styles.chartGridLine, styles.chartGridLineMiddle]} />
            <View style={styles.chartPlot}>
              {trendItems.length > 0 ? (
                trendItems.map((item, index) => {
                  const ratio = Math.max(0.14, Math.min(1, item.amount / maxAmount));
                  const isLast = index === trendItems.length - 1;

                  return (
                    <View key={`${item.month}-${index}`} style={styles.chartColumn}>
                      <View style={styles.chartBarTrack}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              height: `${ratio * 100}%`,
                              backgroundColor: isLast ? theme.colors.primary : `${theme.colors.primary}38`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.chartValue, isLast && { color: theme.colors.primary }]}>
                        {Math.round(item.amount)}
                      </Text>
                      <Text style={styles.chartLabel} numberOfLines={1}>
                        {String(item.label || item.month).slice(0, 3)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyChart}>
                  <BarChart3 size={22} color="#9AA8A0" />
                  <Text style={styles.emptyChartText}>Trend pojawi się po dodaniu historii płatności.</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {(budgetView.hasIncome || budgetView.currencyMismatch) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Wpływ na budżet</Text>
              <Wallet size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.metricValue}>
              {budgetView.currencyMismatch ? 'Waluta' : `${budgetView.percentage.toFixed(1)}%`}
            </Text>
            <Text style={styles.metricHint}>
              {budgetView.currencyMismatch
                ? 'Dochód jest zapisany w innej walucie niż podsumowanie. Dopasuj walutę w ustawieniach.'
                : 'Taki udział miesięcznego dochodu zajmują aktualne subskrypcje.'}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Symulacja oszczędności</Text>
            <PiggyBank size={20} color={theme.colors.primary} />
          </View>
          {savingSimulation.top ? (
            <>
              <View style={styles.savingHeroRow}>
                <View>
                  <Text style={styles.savingLabel}>Po anulowaniu</Text>
                  <Text style={styles.savingName} numberOfLines={1}>{savingSimulation.top.subscription.name}</Text>
                </View>
                <TrendingDown size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.savingMetricGrid}>
                <View style={styles.savingMetric}>
                  <Text style={styles.savingMetricLabel}>Miesięcznie mniej</Text>
                  <Text style={[styles.savingMetricValue, { color: theme.colors.primary }]}>
                    {savingSimulation.monthlySaving.toFixed(2)} {savingSimulation.currency}
                  </Text>
                </View>
                <View style={styles.savingMetric}>
                  <Text style={styles.savingMetricLabel}>Rocznie mniej</Text>
                  <Text style={[styles.savingMetricValue, { color: theme.colors.primary }]}>
                    {savingSimulation.yearlySaving.toFixed(0)} {savingSimulation.currency}
                  </Text>
                </View>
              </View>
              <View style={styles.beforeAfterTrack}>
                <View style={styles.beforeAfterRow}>
                  <Text style={styles.beforeAfterLabel}>Teraz</Text>
                  <Text style={styles.beforeAfterValue}>{savingSimulation.currentMonthly.toFixed(2)} {savingSimulation.currency}</Text>
                </View>
                <View style={styles.beforeAfterRow}>
                  <Text style={styles.beforeAfterLabel}>Po decyzji</Text>
                  <Text style={[styles.beforeAfterValue, { color: theme.colors.primary }]}>
                    {savingSimulation.afterMonthly.toFixed(2)} {savingSimulation.currency}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.simulationCta, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.86}
                onPress={() => navigation.navigate('SubscriptionDetail', { id: savingSimulation.top!.subscription.id })}
              >
                <Text style={styles.simulationCtaText}>Sprawdź tę subskrypcję</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.metricHint}>
              Dodaj aktywne subskrypcje, a pokażemy najprostszy scenariusz obniżenia miesięcznych kosztów.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rozkład kategorii</Text>
            <BarChart3 size={20} color={theme.colors.primary} />
          </View>
          {categoryBreakdown.items.length > 0 ? (
            <>
              <View style={styles.categoryWheel}>
                {categoryWheelDots.map((dot) => (
                  <View
                    key={dot.index}
                    style={[
                      styles.categoryWheelDot,
                      {
                        backgroundColor: dot.color,
                        left: dot.left,
                        top: dot.top,
                        transform: [{ rotate: `${dot.index * (360 / CATEGORY_WHEEL_DOTS)}deg` }],
                      },
                    ]}
                  />
                ))}
                <View style={[styles.categoryWheelCenter, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
                  <Text style={[styles.categoryWheelAmount, { color: theme.colors.text }]}>
                    {Math.round(categoryBreakdown.totalMonthly)}
                  </Text>
                  <Text style={[styles.categoryWheelCurrency, { color: theme.colors.textMuted }]}>
                    {categoryBreakdown.currency}/mc
                  </Text>
                </View>
              </View>

              <View style={styles.categoryRows}>
                {categoryBreakdown.items.map((item) => (
                  <View key={item.category} style={styles.categoryRow}>
                    <View style={styles.categoryRowTop}>
                      <View style={styles.categoryNameWrap}>
                        <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                        <Text style={styles.categoryName} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </View>
                      <Text style={styles.categoryAmount}>
                        {item.amount.toFixed(2)} {categoryBreakdown.currency}
                      </Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          { width: `${Math.max(4, item.percentage)}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryShare}>
                      {item.percentage.toFixed(1)}% kosztu miesięcznego · {item.count} szt.
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.metricHint}>
              Dodaj aktywne subskrypcje, a pokażemy miesięczny rozkład kosztów według kategorii.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.card,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '900', color: vibrantTheme.colors.text },
  content: { padding: 20, paddingBottom: 48 },
  heroCard: {
    borderRadius: 12,
    padding: 24,
    backgroundColor: vibrantTheme.colors.cardStrong,
    marginBottom: 18,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroLabel: { color: vibrantTheme.colors.primary, fontSize: 13, fontWeight: '800' },
  heroValue: { color: vibrantTheme.colors.text, fontSize: 42, fontWeight: '900', marginTop: 6 },
  heroHint: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  card: {
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  cardTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900' },
  chartShell: {
    height: 190,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  chartGridLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 32,
    height: 1,
    backgroundColor: vibrantTheme.colors.border,
  },
  chartGridLineMiddle: {
    top: 92,
  },
  chartPlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 9,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '72%',
    minHeight: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  chartValue: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 7,
  },
  chartValueActive: {
    color: vibrantTheme.colors.primary,
  },
  chartLabel: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  emptyChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricValue: { color: vibrantTheme.colors.primary, fontSize: 34, fontWeight: '900' },
  metricHint: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  savingHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  savingLabel: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  savingName: {
    color: vibrantTheme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
    maxWidth: 230,
  },
  savingMetricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  savingMetric: {
    flex: 1,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.18)',
  },
  savingMetricLabel: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  savingMetricValue: {
    color: '#CBD5E1',
    fontSize: 17,
    fontWeight: '900',
  },
  beforeAfterTrack: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  beforeAfterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  beforeAfterLabel: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  beforeAfterValue: {
    color: vibrantTheme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  simulationCta: {
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.primary,
  },
  simulationCtaText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 14,
    fontWeight: '900',
  },
  categoryWheel: {
    width: CATEGORY_WHEEL_SIZE,
    height: CATEGORY_WHEEL_SIZE,
    borderRadius: CATEGORY_WHEEL_SIZE / 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  categoryWheelDot: {
    position: 'absolute',
    width: CATEGORY_WHEEL_DOT_SIZE,
    height: 18,
    borderRadius: 999,
  },
  categoryWheelCenter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: vibrantTheme.colors.cardStrong,
    borderColor: vibrantTheme.colors.border,
  },
  categoryWheelAmount: {
    color: vibrantTheme.colors.text,
    fontSize: 27,
    fontWeight: '900',
  },
  categoryWheelCurrency: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  categoryRows: {
    gap: 14,
  },
  categoryRow: {
    gap: 8,
  },
  categoryRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryAmount: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  categoryShare: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
});

export default StatisticsScreen;
