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
  HelpCircle,
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
import type { Subscription } from '../types/api';
import type { AppStackParamList } from '../types/navigation';
import { daysUntilDate, formatRelativeDay, formatShortDate } from '../utils/date';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Navigation = NativeStackNavigationProp<AppStackParamList>;
type Decision = 'keep' | 'cancel' | 'later';
type ReviewType = 'overdue' | 'trial' | 'due' | 'missingCancel' | 'expensive';

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
  return subscription.amount;
};

const buildReviewItems = (subscriptions: Subscription[]): ReviewItem[] => {
  const active = subscriptions.filter((subscription) => subscription.status !== 'canceled');
  const items: ReviewItem[] = [];

  active.forEach((subscription) => {
    const paymentDays = daysUntilDate(subscription.nextPaymentDate);
    const trialDays = daysUntilDate(subscription.trialEndDate);
    const displayName = subscription.name || subscription.provider || 'Subskrypcja';

    if (subscription.status === 'overdue' || (paymentDays !== null && paymentDays < 0)) {
      items.push({
        id: `overdue-${subscription.id}`,
        type: 'overdue',
        subscription,
        title: 'Płatność po terminie',
        description: `${displayName} wymaga szybkiego sprawdzenia statusu płatności.`,
        meta: subscription.nextPaymentDate ? formatRelativeDay(subscription.nextPaymentDate) : 'Brak daty',
        tone: 'critical',
      });
    }

    if (subscription.isTrial && trialDays !== null && trialDays >= 0 && trialDays <= 7) {
      items.push({
        id: `trial-${subscription.id}`,
        type: 'trial',
        subscription,
        title: 'Trial blisko końca',
        description: `${displayName} moze zaraz przejsc w platny plan.`,
        meta: subscription.trialEndDate ? `Koniec ${formatShortDate(subscription.trialEndDate)}` : 'Trial aktywny',
        tone: 'warning',
      });
    }

    if (paymentDays !== null && paymentDays >= 0 && paymentDays <= 5) {
      items.push({
        id: `due-${subscription.id}`,
        type: 'due',
        subscription,
        title: 'Nadchodzi płatność',
        description: `${displayName} pojawi sie w kosztach w najblizszych dniach.`,
        meta: formatRelativeDay(subscription.nextPaymentDate),
        tone: 'primary',
      });
    }

    if (!subscription.cancelUrl) {
      items.push({
        id: `missing-cancel-${subscription.id}`,
        type: 'missingCancel',
        subscription,
        title: 'Brak szybkiej ścieżki anulowania',
        description: `${displayName} nie ma jeszcze zapisanego linku lub instrukcji anulowania.`,
        meta: 'Warto uzupełnić później',
        tone: 'primary',
      });
    }

    if (getMonthlyAmount(subscription) >= 45) {
      items.push({
        id: `expensive-${subscription.id}`,
        type: 'expensive',
        subscription,
        title: 'Wysoki miesieczny koszt',
        description: `${displayName} jest dobrym kandydatem do przegladu planu lub współdzielenia.`,
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
    missingCancel: 4,
  };

  return items.sort((a, b) => priority[a.type] - priority[b.type]).slice(0, 24);
};

export function SubscriptionReviewQueueScreen() {
  const navigation = useNavigation<Navigation>();
  const { theme } = useTheme();
  const { data: subscriptions = [], isLoading, isError, refetch } = useSubscriptions();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

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
    return HelpCircle;
  };

  const renderContent = () => {
    if (isLoading && !subscriptions.length) {
      return (
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: theme.colors.text }]}>
            Buduję kolejkę decyzji
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.textMuted }]}>
            Szukam triali, płatności i kosztów wymagających uwagi.
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
          message="Nie widzę teraz triali, zaległych płatności ani drogich planów wymagających szybkiego przeglądu."
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
                  backgroundColor: theme.colors.card,
                  borderColor: decision ? `${theme.colors.primary}55` : theme.colors.border,
                },
              ]}
              onPress={() => navigation.navigate('SubscriptionDetail', { id: item.subscription.id })}
            >
              <View style={styles.reviewTopRow}>
                <View style={[styles.reviewIcon, { backgroundColor: `${toneColor}1F`, borderColor: `${toneColor}44` }]}>
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
                <Text style={[styles.metaPill, { color: toneColor, borderColor: `${toneColor}55`, backgroundColor: `${toneColor}14` }]}>
                  {item.meta}
                </Text>
                <Text style={[styles.amountText, { color: theme.colors.text }]}>
                  {item.subscription.amount.toFixed(2)} {item.subscription.currency}
                </Text>
              </View>

              {decision ? (
                <View style={[styles.decisionDone, { backgroundColor: `${theme.colors.primary}16`, borderColor: `${theme.colors.primary}44` }]}>
                  <CheckCircle2 size={16} color={theme.colors.primary} />
                  <Text style={[styles.decisionDoneText, { color: theme.colors.primary }]}>
                    {decision === 'keep' ? 'Oznaczono: zostawiam' : decision === 'cancel' ? 'Oznaczono: do anulowania' : 'Oznaczono: sprawdzę później'}
                  </Text>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <PressableScale
                    style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}44` }]}
                    onPress={(event) => {
                      event.stopPropagation();
                      setDecision(item.id, 'keep');
                    }}
                  >
                    <CheckCircle2 size={15} color={theme.colors.primary} />
                    <Text style={[styles.actionText, { color: theme.colors.primary }]}>Zostawiam</Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.actionButton, { backgroundColor: 'rgba(255,77,109,0.13)', borderColor: 'rgba(255,77,109,0.38)' }]}
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
    <LinearGradient colors={theme.gradients.app} style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <PressableScale
            style={[styles.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => navigation.goBack()}
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
          <LinearGradient colors={theme.gradients.hero} style={[styles.hero, theme.shadows.glow]}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <ShieldCheck size={24} color={theme.colors.darkText} />
              </View>
              <Text style={styles.heroBadge}>{pendingCount} do decyzji</Text>
            </View>
            <Text style={styles.heroTitle}>Szybki przeglad tego, co wymaga Twojej uwagi</Text>
            <Text style={styles.heroDesc}>
              Decyzje sa lokalne i pomagaja uporzadkowac priorytety. Nie anulujemy niczego automatycznie.
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%` }]} />
            </View>
            <Text style={styles.progressText}>
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
    borderRadius: 16,
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
    borderRadius: 30,
    padding: 22,
    overflow: 'hidden',
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
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    color: '#071017',
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    marginBottom: 10,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#FFFFFF',
  },
  progressText: {
    color: 'rgba(255,255,255,0.88)',
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
    borderRadius: 20,
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  reviewTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
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
    borderRadius: 15,
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
    borderRadius: 15,
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
    borderRadius: 24,
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
