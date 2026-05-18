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
import { ArrowLeft, CheckCircle2, Info, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useHealthScore } from '../hooks/useHealthScore';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { vibrantTheme } from '../theme/vibrantTheme';
import { daysUntilDate } from '../utils/date';

type Nav = NativeStackNavigationProp<AppStackParamList, 'HealthScoreDetails'>;

function getLocalScore(subscriptions: ReturnType<typeof useSubscriptions>['data'], summary: ReturnType<typeof useDashboardSummary>['data']) {
  const active = (subscriptions ?? []).filter((item) => item.status !== 'canceled');
  const overdue = summary?.overdueCount ?? active.filter((item) => item.status === 'overdue').length;
  const trials = summary?.trialsCount ?? active.filter((item) => item.isTrial).length;
  const trialsEndingSoon = active.filter((item) => {
    const days = daysUntilDate(item.trialEndDate);
    return item.isTrial && days !== null && days >= 0 && days <= 7;
  }).length;
  const upcomingSoon = active.filter((item) => {
    const days = daysUntilDate(item.nextPaymentDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const missingCancelGuides = active.filter((item) => !item.cancelUrl).length;

  const score = Math.max(
    35,
    Math.min(
      100,
      100 -
        overdue * 14 -
        trialsEndingSoon * 9 -
        missingCancelGuides * 3 -
        Math.max(0, active.length - 10) * 2
    )
  );

  return {
    score,
    label: score >= 85 ? 'Bardzo dobra' : score >= 70 ? 'Stabilna' : score >= 55 ? 'Wymaga uwagi' : 'Ryzykowna',
    summary: 'Szacunek lokalny oparty na aktywnych usługach, trialach, zaległościach i brakujących linkach anulowania.',
    metrics: {
      activeSubscriptionsCount: active.length,
      trialsCount: trials,
      overdueCount: overdue,
      trialsEndingSoonCount: trialsEndingSoon,
      upcomingPaymentsSoonCount: upcomingSoon,
      missingCancelGuidesCount: missingCancelGuides,
      monthlySubscriptionsTotal: summary?.monthlyTotal ?? 0,
      subscriptionsIncomePercentage: null,
    },
    factors: [
      {
        type: overdue > 0 ? 'negative' : 'positive',
        title: overdue > 0 ? 'Zaległe płatności obniżają wynik' : 'Brak zaległości',
        description: overdue > 0 ? `${overdue} usług wymaga reakcji.` : 'Nie widzę aktywnych zaległości w subskrypcjach.',
        impact: overdue > 0 ? -overdue * 14 : 8,
      },
      {
        type: trialsEndingSoon > 0 ? 'negative' : 'positive',
        title: trialsEndingSoon > 0 ? 'Kończące się triale' : 'Triale pod kontrolą',
        description: trialsEndingSoon > 0 ? `${trialsEndingSoon} triali kończy się w najbliższych 7 dniach.` : 'Brak triali kończących się w tym tygodniu.',
        impact: trialsEndingSoon > 0 ? -trialsEndingSoon * 9 : 6,
      },
      {
        type: missingCancelGuides > 0 ? 'neutral' : 'positive',
        title: 'Gotowość do anulowania',
        description: missingCancelGuides > 0 ? `${missingCancelGuides} usług nie ma zapisanego linku anulowania.` : 'Najważniejsze usługi mają zapisane ścieżki anulowania.',
        impact: missingCancelGuides > 0 ? -missingCancelGuides * 3 : 5,
      },
    ],
  };
}

export function HealthScoreDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const summaryQuery = useDashboardSummary();
  const subscriptionsQuery = useSubscriptions();
  const healthQuery = useHealthScore(true);

  const localScore = useMemo(
    () => getLocalScore(subscriptionsQuery.data, summaryQuery.data),
    [subscriptionsQuery.data, summaryQuery.data]
  );

  const health = healthQuery.data ?? localScore;
  const isBackendScore = Boolean(healthQuery.data);
  const isRefreshing = summaryQuery.isRefetching || subscriptionsQuery.isRefetching || healthQuery.isRefetching;

  const scoreColor = health.score >= 85
    ? vibrantTheme.colors.success
    : health.score >= 70
      ? vibrantTheme.colors.primary
      : health.score >= 55
        ? vibrantTheme.colors.warning
        : vibrantTheme.colors.danger;

  const metricCards = [
    ['Aktywne', health.metrics.activeSubscriptionsCount],
    ['Triale', health.metrics.trialsCount],
    ['Zaległe', health.metrics.overdueCount],
    ['Do 7 dni', health.metrics.upcomingPaymentsSoonCount],
    ['Trial kończy się', health.metrics.trialsEndingSoonCount],
    ['Brak cancel linku', health.metrics.missingCancelGuidesCount],
  ];

  const onRefresh = () => {
    summaryQuery.refetch();
    subscriptionsQuery.refetch();
    healthQuery.refetch();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={vibrantTheme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Kondycja subskrypcji</Text>
          <Text style={styles.subtitle}>Jak stabilny jest Twój portfel usług</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={vibrantTheme.colors.primary} />}
      >
        <LinearGradient colors={vibrantTheme.gradients.hero} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <ShieldCheck size={26} color="#FFFFFF" />
            </View>
            <View style={styles.sourcePill}>
              {healthQuery.isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={styles.sourcePillText}>{isBackendScore ? 'Live score' : 'Lokalny szacunek'}</Text>
            </View>
          </View>
          <Text style={styles.heroLabel}>Obecny wynik</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{health.score}</Text>
            <Text style={styles.scoreSuffix}>/100</Text>
          </View>
          <Text style={styles.heroSummary}>{health.label} · {health.summary}</Text>
        </LinearGradient>

        <View style={styles.explainCard}>
          <View style={styles.cardHeader}>
            <Info size={19} color={vibrantTheme.colors.primary} />
            <Text style={styles.cardTitle}>Co to jest?</Text>
          </View>
          <Text style={styles.bodyText}>
            Health Score to szybki wskaźnik ryzyka subskrypcji. Im mniej zaległości, kończących się triali,
            nadchodzących płatności i usług bez ścieżki anulowania, tym wyższy wynik.
          </Text>
        </View>

        <View style={styles.grid}>
          {metricCards.map(([label, value]) => (
            <View key={String(label)} style={styles.metricCard}>
              <Text style={styles.metricValue}>{value}</Text>
              <Text style={styles.metricLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.explainCard}>
          <View style={styles.cardHeader}>
            <Sparkles size={19} color={vibrantTheme.colors.primary} />
            <Text style={styles.cardTitle}>Jak jest liczone?</Text>
          </View>
          <View style={styles.formulaRow}>
            <Text style={styles.formulaStrong}>100</Text>
            <Text style={styles.formulaText}>minus punkty ryzyka za zaległości, triale do 7 dni, płatności do 7 dni i brak przygotowanej ścieżki anulowania.</Text>
          </View>
          <View style={[styles.scoreBarTrack, { borderColor: scoreColor }]}>
            <View style={[styles.scoreBarFill, { width: `${health.score}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>

        <View style={styles.explainCard}>
          <View style={styles.cardHeader}>
            <TriangleAlert size={19} color={vibrantTheme.colors.warning} />
            <Text style={styles.cardTitle}>Czynniki wpływu</Text>
          </View>
          {health.factors.map((factor, index) => (
            <View key={`${factor.title}-${index}`} style={styles.factorRow}>
              {factor.type === 'positive' ? (
                <CheckCircle2 size={18} color={vibrantTheme.colors.success} />
              ) : (
                <TriangleAlert size={18} color={factor.type === 'negative' ? vibrantTheme.colors.danger : vibrantTheme.colors.warning} />
              )}
              <View style={styles.factorCopy}>
                <Text style={styles.factorTitle}>{factor.title}</Text>
                <Text style={styles.factorDesc}>{factor.description}</Text>
              </View>
              <Text style={[styles.factorImpact, { color: factor.impact < 0 ? vibrantTheme.colors.danger : vibrantTheme.colors.success }]}>
                {factor.impact > 0 ? '+' : ''}{factor.impact}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowOne: { position: 'absolute', top: -130, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.16)' },
  glowTwo: { position: 'absolute', bottom: 80, left: -140, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(139,92,246,0.14)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: vibrantTheme.colors.card, borderWidth: 1, borderColor: vibrantTheme.colors.border },
  headerCopy: { flex: 1 },
  title: { color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: vibrantTheme.colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 3 },
  content: { padding: 20, paddingBottom: 42 },
  hero: { borderRadius: 30, padding: 22, marginBottom: 16, ...vibrantTheme.shadows.glow },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heroIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  sourcePill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 12, paddingVertical: 8 },
  sourcePillText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  heroLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  score: { color: '#FFFFFF', fontSize: 76, fontWeight: '900', lineHeight: 82, letterSpacing: 0 },
  scoreSuffix: { color: 'rgba(255,255,255,0.78)', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  heroSummary: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 8 },
  explainCard: { backgroundColor: vibrantTheme.colors.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: vibrantTheme.colors.border, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { color: vibrantTheme.colors.text, fontSize: 16, fontWeight: '900' },
  bodyText: { color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: { width: '31.5%', minHeight: 86, borderRadius: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: vibrantTheme.colors.border, justifyContent: 'space-between' },
  metricValue: { color: vibrantTheme.colors.text, fontSize: 22, fontWeight: '900' },
  metricLabel: { color: vibrantTheme.colors.textMuted, fontSize: 11, fontWeight: '800' },
  formulaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  formulaStrong: { color: vibrantTheme.colors.primary, fontSize: 28, fontWeight: '900' },
  formulaText: { flex: 1, color: vibrantTheme.colors.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  scoreBarTrack: { height: 12, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 999 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: vibrantTheme.colors.border },
  factorCopy: { flex: 1 },
  factorTitle: { color: vibrantTheme.colors.text, fontSize: 13, fontWeight: '900' },
  factorDesc: { color: vibrantTheme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  factorImpact: { fontSize: 13, fontWeight: '900' },
});

export default HealthScoreDetailsScreen;
