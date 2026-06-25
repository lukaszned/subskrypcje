import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PressableScale } from '../components/PressableScale';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { SkeletonList } from '../components/LoadingState';
import { MetricTile } from '../components/ui/PremiumPrimitives';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useTheme } from '../theme/ThemeContext';
import { withAlpha } from '../theme/themeUtils';
import type { Subscription } from '../types/api';
import type { AppStackParamList } from '../types/navigation';
import { daysUntilDate, formatRelativeDay, formatShortDate } from '../utils/date';
import { goBackOrDashboard } from '../utils/navigation';
import { getEffectiveNextPaymentDate, getEffectiveNextPaymentDateString } from '../utils/subscriptionSchedule';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Navigation = NativeStackNavigationProp<AppStackParamList>;
type Decision = 'keep' | 'cancel' | 'later';
type ReviewType = 'overdue' | 'trial' | 'due' | 'expensive';

type ReviewItem = {
  id: string;
  type: ReviewType;
  subscription: Subscription;
  title: string;
  description: string;
  meta: string;
  tone: 'critical' | 'warning' | 'primary';
};

const getMonthlyAmount = (subscription: Subscription) => {
  if (subscription.billingCycle === 'yearly') return subscription.amount / 12;
  if (subscription.billingCycle === 'weekly') return subscription.amount * 4.33;
  if (subscription.billingCycle === 'one_time') return 0;
  if (subscription.billingCycle === 'custom') return subscription.isRecurringBill ? subscription.amount : 0;
  return subscription.amount;
};

const buildReviewItems = (subscriptions: Subscription[]): ReviewItem[] => {
  const active = subscriptions.filter((subscription) => subscription.status !== 'canceled');
  const items: ReviewItem[] = [];

  active.forEach((subscription) => {
    const effectiveNextPaymentDate = getEffectiveNextPaymentDateString(subscription);
    const paymentDays = daysUntilDate(getEffectiveNextPaymentDate(subscription));
    const trialDays = daysUntilDate(subscription.trialEndDate);
    const displayName = subscription.name || subscription.provider || 'Subskrypcja';

    if (subscription.status === 'overdue' || (paymentDays !== null && paymentDays < 0)) {
      items.push({
        id: `overdue-${subscription.id}`,
        type: 'overdue',
        subscription,
        title: 'Płatność po terminie',
        description: `${displayName} wymaga szybkiego sprawdzenia statusu płatności.`,
        meta: effectiveNextPaymentDate ? formatRelativeDay(effectiveNextPaymentDate) : 'Brak daty',
        tone: 'critical',
      });
    }

    if (subscription.isTrial && trialDays !== null && trialDays >= 0 && trialDays <= 7) {
      items.push({
        id: `trial-${subscription.id}`,
        type: 'trial',
        subscription,
        title: 'Okres próbny blisko końca',
        description: `${displayName} może zaraz przejść w płatny plan.`,
        meta: subscription.trialEndDate ? `Koniec ${formatShortDate(subscription.trialEndDate)}` : 'Okres próbny aktywny',
        tone: 'warning',
      });
    }

    if (paymentDays !== null && paymentDays >= 0 && paymentDays <= 5) {
      items.push({
        id: `due-${subscription.id}`,
        type: 'due',
        subscription,
        title: 'Nadchodzi płatność',
        description: `${displayName} pojawi się w kosztach w najbliższych dniach.`,
        meta: formatRelativeDay(effectiveNextPaymentDate),
        tone: 'primary',
      });
    }

    if (getMonthlyAmount(subscription) >= 45) {
      items.push({
        id: `expensive-${subscription.id}`,
        type: 'expensive',
        subscription,
        title: 'Wysoki miesięczny koszt',
        description: `${displayName} jest dobrym kandydatem do przeglądu planu lub współdzielenia.`,
        meta: `${subscription.amount.toFixed(2)} ${subscription.currency}`,
        tone: 'warning',
      });
    }
  });

  const priority: Record<ReviewType, number> = {
    overdue: 0,
    trial: 1,
    due: 2,
    expensive: 3,
  };

  return items.sort((a, b) => priority[a.type] - priority[b.type]).slice(0, 24);
};

export function SubscriptionReviewQueueScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme } = useTheme();
  const { data: subscriptions = [], isLoading, isError, refetch } = useSubscriptions();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const screenGradient = useMemo(
    () => [theme.colors.bg, theme.colors.bg2, theme.colors.bg] as const,
    [theme.colors.bg, theme.colors.bg2]
  );
  const reviewItems = useMemo(() => buildReviewItems(subscriptions), [subscriptions]);
  const doneCount = reviewItems.filter((item) => decisions[item.id]).length;
  const pendingCount = Math.max(reviewItems.length - doneCount, 0);
  const progress = reviewItems.length ? doneCount / reviewItems.length : 1;

  const setDecision = (itemId: string, decision: Decision) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDecisions((current) => ({ ...current, [itemId]: decision }));
  };

  const getToneColor = (tone: ReviewItem['tone']) => {
    if (tone === 'critical') return theme.colors.danger;
    if (tone === 'warning') return theme.colors.warning;
    return theme.colors.primary;
  };

  const getIcon = (type: ReviewType) => {
    if (type === 'overdue') return AlertTriangle;
    if (type === 'trial') return Clock3;
    if (type === 'due') return CalendarDays;
    if (type === 'expensive') return Sparkles;
    return Sparkles;
  };

  const renderContent = () => {
    if (isLoading && !subscriptions.length) {
      return (
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: theme.colors.text }]}>
            Buduję kolejkę decyzji
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textMuted }]}>
            Szukam okresów próbnych, płatności i kosztów wymagających uwagi.
          </Text>
          <SkeletonList rows={4} isDark />
        </View>
      );
    }

    if (isError && !subscriptions.length) {
      return (
        <ErrorState
          message="Nie udało się odświeżyć kolejki. Widok korzysta z istniejącej listy subskrypcji, gdy jest dostępna."
          onRetry={() => refetch()}
        />
      );
    }

    if (!reviewItems.length) {
      return (
        <EmptyState
          type="calm"
          title="Nie ma pilnych decyzji"
          message="Nie widzę teraz okresów próbnych, zaległych płatności ani drogich planów wymagających szybkiego przeglądu."
        />
      );
    }

    return (
      <View style={styles.queueList}>
        {reviewItems.map((item) => {
          const Icon = getIcon(item.type);
          const toneColor = getToneColor(item.tone);
          const decision = decisions[item.id];

          return (
            <PressableScale
              key={item.id}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: decision ? withAlpha(theme.colors.primary, 0.34) : theme.colors.border,
                  shadowColor: theme.colors.bg,
                },
              ]}
              onPress={() => navigation.navigate('SubscriptionDetail', { id: item.subscription.id })}
            >
              <View style={styles.reviewTopRow}>
                <View style={[styles.reviewIcon, { backgroundColor: withAlpha(toneColor, 0.12), borderColor: withAlpha(toneColor, 0.26) }]}>
                  <Icon size={20} color={toneColor} />
                </View>
                <View style={styles.reviewMain}>
                  <View style={styles.reviewTitleRow}>
                    <Text style={[styles.reviewTitle, { color: theme.colors.text }]}>{item.title}</Text>
                    <ChevronRight size={17} color={theme.colors.textSubtle} />
                  </View>
                  <Text style={[styles.reviewName, { color: theme.colors.textMuted }]}>
                    {item.subscription.name}
                    {item.subscription.provider ? ` · ${item.subscription.provider}` : ''}
                  </Text>
                  <Text style={[styles.reviewDesc, { color: theme.colors.textSubtle }]}>{item.description}</Text>
                </View>
              </View>

              <View style={styles.reviewMetaRow}>
                <Text style={[styles.metaPill, { color: toneColor, borderColor: withAlpha(toneColor, 0.3), backgroundColor: withAlpha(toneColor, 0.09) }]}>
                  {item.meta}
                </Text>
                <Text style={[styles.amountText, { color: theme.colors.text }]}>
                  {item.subscription.amount.toFixed(2)} {item.subscription.currency}
                </Text>
              </View>

              {decision ? (
                <View style={[styles.decisionDone, { backgroundColor: withAlpha(theme.colors.primary, 0.1), borderColor: withAlpha(theme.colors.primary, 0.28) }]}>
                  <CheckCircle2 size={16} color={theme.colors.primary} />
                  <Text style={[styles.decisionDoneText, { color: theme.colors.primary }]}>
                    {decision === 'keep' ? 'Oznaczono: zostawiam' : decision === 'cancel' ? 'Oznaczono: do anulowania' : 'Oznaczono: sprawdzę później'}
                  </Text>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <PressableScale
                    style={[styles.actionButton, { backgroundColor: withAlpha(theme.colors.primary, 0.1), borderColor: withAlpha(theme.colors.primary, 0.28) }]}
                    onPress={(event) => {
                      event.stopPropagation();
                      setDecision(item.id, 'keep');
                    }}
                  >
                    <CheckCircle2 size={15} color={theme.colors.primary} />
                    <Text style={[styles.actionText, { color: theme.colors.primary }]}>Zostawiam</Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.actionButton, { backgroundColor: withAlpha(theme.colors.danger, 0.13), borderColor: withAlpha(theme.colors.danger, 0.38) }]}
                    onPress={(event) => {
                      event.stopPropagation();
                      setDecision(item.id, 'cancel');
                    }}
                  >
                    <XCircle size={15} color={theme.colors.danger} />
                    <Text style={[styles.actionText, { color: theme.colors.danger }]}>Anulować</Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.actionButton, { backgroundColor: theme.colors.cardSoft, borderColor: theme.colors.border }]}
                    onPress={(event) => {
                      event.stopPropagation();
                      setDecision(item.id, 'later');
                    }}
                  >
                    <Clock3 size={15} color={theme.colors.textMuted} />
                    <Text style={[styles.actionText, { color: theme.colors.textMuted }]}>Później</Text>
                  </PressableScale>
                </View>
              )}
            </PressableScale>
          );
        })}
      </View>
    );
  };

  return (
    <LinearGradient colors={screenGradient} style={styles.screen}>
      <View style={[styles.glowTop, { backgroundColor: withAlpha(theme.colors.primary, 0.2) }]} />
      <View style={[styles.glowSide, { backgroundColor: withAlpha(theme.colors.cyan, 0.12) }]} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <PressableScale
            style={[styles.backButton, { backgroundColor: theme.cardBg, borderColor: theme.colors.border }]}
            onPress={() => goBackOrDashboard(navigation)}
          >
            <ArrowLeft size={22} color={theme.colors.text} />
          </PressableScale>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Centrum decyzji</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Kolejka decyzji</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={theme.gradients.primary} style={[styles.hero, theme.shadows.glow, { borderColor: withAlpha(theme.colors.darkText, 0.14), shadowColor: theme.colors.primary }]}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: withAlpha(theme.colors.text, 0.86) }]}>
                <ShieldCheck size={24} color={theme.colors.darkText} />
              </View>
              <Text style={[styles.heroBadge, { color: theme.colors.darkText, backgroundColor: withAlpha(theme.colors.text, 0.72) }]}>{pendingCount} do decyzji</Text>
            </View>
            <Text style={[styles.heroTitle, { color: theme.colors.darkText }]}>Szybki przegląd tego, co wymaga Twojej uwagi</Text>
            <Text style={[styles.heroDesc, { color: withAlpha(theme.colors.darkText, 0.78) }]}>
              Decyzje są lokalne i pomagają uporządkować priorytety. Nie anulujemy niczego automatycznie.
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: withAlpha(theme.colors.darkText, 0.16) }]}>
              <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%`, backgroundColor: theme.colors.darkText }]} />
            </View>
            <Text style={[styles.progressText, { color: withAlpha(theme.colors.darkText, 0.82) }]}>
              {doneCount}/{reviewItems.length || 0} oznaczone
            </Text>
          </LinearGradient>

          <View style={styles.summaryGrid}>
            <MetricTile label="sygnałów" value={reviewItems.length} icon={Sparkles} tone="muted" />
            <MetricTile label="decyzji" value={doneCount} icon={CheckCircle2} />
            <MetricTile
              label="pilnych"
              value={reviewItems.filter((item) => item.tone !== 'primary').length}
              icon={AlertTriangle}
              tone="warning"
            />
          </View>

          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  glowSide: {
    position: 'absolute',
    bottom: 80,
    left: -150,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 18,
  },
  hero: {
    borderRadius: 12,
    padding: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    marginBottom: 10,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  queueList: {
    gap: 14,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  reviewTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  reviewMain: {
    flex: 1,
    gap: 4,
  },
  reviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  reviewName: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  decisionDone: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  decisionDoneText: {
    fontSize: 13,
    fontWeight: '900',
  },
  centerState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
});
