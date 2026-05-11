import React, { useMemo, useState } from 'react';
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
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Sparkles,
} from 'lucide-react-native';
import { useSubscriptions } from '../hooks/useSubscriptions';
import type { AppStackParamList } from '../types/navigation';
import type { Subscription } from '../types/api';
import { vibrantTheme } from '../theme/vibrantTheme';
import { daysUntilDate, formatRelativeDay, parseAppDate } from '../utils/date';

type CalendarItem = Subscription & {
  paymentDate: Date;
  daysLeft: number;
};

const HORIZONS = [30, 60, 90] as const;

function formatDateHeading(date: Date) {
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBrandInitial(item: CalendarItem) {
  return (item.name || item.provider || '?').charAt(0).toUpperCase();
}

export const PaymentCalendarScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList, 'PaymentCalendar'>>();
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(30);
  const { data: subscriptions = [], isLoading, isError, error, refetch, isRefetching } = useSubscriptions();

  const calendarItems = useMemo<CalendarItem[]>(() => {
    return subscriptions
      .filter((subscription) => subscription.status !== 'canceled')
      .map((subscription) => {
        const paymentDate = parseAppDate(subscription.nextPaymentDate);
        const daysLeft = daysUntilDate(subscription.nextPaymentDate);

        if (!paymentDate || daysLeft === null) return null;

        return {
          ...subscription,
          amount: Number(subscription.amount || 0),
          paymentDate,
          daysLeft,
        };
      })
      .filter((item): item is CalendarItem => {
        if (!item) return false;
        return item.daysLeft >= -7 && item.daysLeft <= horizon;
      })
      .sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
  }, [subscriptions, horizon]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, CalendarItem[]>();

    for (const item of calendarItems) {
      const key = getDateKey(item.paymentDate);
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      date: items[0].paymentDate,
      items,
      total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      currency: items[0]?.currency || 'PLN',
    }));
  }, [calendarItems]);

  const summary = useMemo(() => {
    const upcoming = calendarItems.filter((item) => item.daysLeft >= 0);
    const overdue = calendarItems.filter((item) => item.daysLeft < 0);
    const dueSoon = upcoming.filter((item) => item.daysLeft <= 7);
    const total = upcoming.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const next = upcoming[0] || null;

    return {
      total,
      currency: upcoming[0]?.currency || subscriptions[0]?.currency || 'PLN',
      count: upcoming.length,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      next,
    };
  }, [calendarItems, subscriptions]);

  const weekRail = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
      const key = getDateKey(date);
      const items = calendarItems.filter((item) => getDateKey(item.paymentDate) === key);

      return {
        key,
        date,
        count: items.length,
        total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      };
    });

    return days;
  }, [calendarItems]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={vibrantTheme.colors.primary} />
          <Text style={styles.centerText}>Buduję kalendarz płatności...</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centerState}>
          <AlertCircle size={32} color={vibrantTheme.colors.danger} />
          <Text style={styles.centerTitle}>Nie udało się pobrać płatności</Text>
          <Text style={styles.centerText}>{error?.message || 'Sprawdź połączenie i spróbuj ponownie.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (groupedItems.length === 0) {
      return (
        <View style={styles.centerState}>
          <Sparkles size={34} color={vibrantTheme.colors.primary} />
          <Text style={styles.centerTitle}>Spokojny horyzont</Text>
          <Text style={styles.centerText}>Nie widzę zaplanowanych płatności w wybranym okresie.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('AddSubscription')}>
            <Text style={styles.retryButtonText}>Dodaj subskrypcję</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.timeline}>
        {groupedItems.map((group) => (
          <View key={group.key} style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <View>
                <Text style={styles.dayTitle}>{formatDateHeading(group.date)}</Text>
                <Text style={styles.daySubtitle}>{formatRelativeDay(group.date)}</Text>
              </View>
              <Text style={styles.dayTotal}>
                {group.total.toFixed(2)} {group.currency}
              </Text>
            </View>

            {group.items.map((item) => {
              const isOverdue = item.daysLeft < 0;
              const isSoon = item.daysLeft >= 0 && item.daysLeft <= 3;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.paymentCard}
                  activeOpacity={0.86}
                  onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
                >
                  <View style={[styles.brandMark, isOverdue && styles.brandMarkDanger, isSoon && styles.brandMarkWarning]}>
                    <Text style={styles.brandMarkText}>{getBrandInitial(item)}</Text>
                  </View>
                  <View style={styles.paymentMain}>
                    <Text style={styles.paymentName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.paymentMeta} numberOfLines={1}>
                      {[item.provider, item.planName].filter(Boolean).join(' · ') || item.billingCycle}
                    </Text>
                  </View>
                  <View style={styles.paymentAmountBlock}>
                    <Text style={styles.paymentAmount}>{item.amount.toFixed(2)} {item.currency}</Text>
                    <Text style={[styles.paymentStatus, isOverdue && styles.paymentStatusDanger, isSoon && styles.paymentStatusWarning]}>
                      {formatRelativeDay(item.paymentDate)}
                    </Text>
                  </View>
                  <ChevronRight size={17} color={vibrantTheme.colors.textSubtle} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={vibrantTheme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Kalendarz płatności</Text>
          <Text style={styles.subtitle}>Cashflow subskrypcji bez zaskoczeń</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={vibrantTheme.colors.primary}
          />
        }
      >
        <LinearGradient colors={vibrantTheme.gradients.hero} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <CalendarDays size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.heroBadge}>{horizon} dni</Text>
          </View>
          <Text style={styles.heroLabel}>Zaplanowane obciążenia</Text>
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroAmount}>{summary.total.toFixed(2)}</Text>
            <Text style={styles.heroCurrency}>{summary.currency}</Text>
          </View>
          <View style={styles.heroMetrics}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{summary.count}</Text>
              <Text style={styles.heroMetricLabel}>płatności</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{summary.dueSoonCount}</Text>
              <Text style={styles.heroMetricLabel}>do 7 dni</Text>
            </View>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>{summary.overdueCount}</Text>
              <Text style={styles.heroMetricLabel}>po terminie</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.horizonTabs}>
          {HORIZONS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.horizonTab, horizon === value && styles.horizonTabActive]}
              onPress={() => setHorizon(value)}
            >
              <Text style={[styles.horizonTabText, horizon === value && styles.horizonTabTextActive]}>
                {value} dni
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.weekRail}>
          {weekRail.map((day) => {
            const isBusy = day.count > 0;

            return (
              <View key={day.key} style={[styles.weekDay, isBusy && styles.weekDayBusy]}>
                <Text style={[styles.weekDayName, isBusy && styles.weekDayNameBusy]}>
                  {day.date.toLocaleDateString('pl-PL', { weekday: 'short' })}
                </Text>
                <Text style={[styles.weekDayNumber, isBusy && styles.weekDayNumberBusy]}>
                  {day.date.getDate()}
                </Text>
                <View style={[styles.weekDot, isBusy && styles.weekDotBusy]} />
              </View>
            );
          })}
        </View>

        {summary.next && (
          <TouchableOpacity
            style={styles.nextCard}
            activeOpacity={0.86}
            onPress={() => navigation.navigate('SubscriptionDetail', { id: summary.next!.id })}
          >
            <View style={styles.nextIcon}>
              <Clock size={18} color={vibrantTheme.colors.primary} />
            </View>
            <View style={styles.nextBody}>
              <Text style={styles.nextTitle}>Najbliższa decyzja</Text>
              <Text style={styles.nextDesc}>
                {summary.next.name} · {formatRelativeDay(summary.next.paymentDate)} · {summary.next.amount.toFixed(2)} {summary.next.currency}
              </Text>
            </View>
            <CreditCard size={19} color={vibrantTheme.colors.textMuted} />
          </TouchableOpacity>
        )}

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: vibrantTheme.colors.bg },
  glowOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -130,
    right: -120,
    backgroundColor: 'rgba(32,246,181,0.16)',
  },
  glowTwo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: 80,
    left: -150,
    backgroundColor: 'rgba(124,58,237,0.16)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.card,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  headerText: { flex: 1 },
  title: {
    color: vibrantTheme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...vibrantTheme.shadows.glow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
  },
  heroCurrency: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  heroMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 16,
    padding: 12,
  },
  heroMetricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  heroMetricLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  horizonTabs: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  horizonTab: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.card,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  horizonTabActive: {
    backgroundColor: 'rgba(32,246,181,0.16)',
    borderColor: vibrantTheme.colors.primary,
  },
  horizonTabText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  horizonTabTextActive: {
    color: vibrantTheme.colors.primary,
  },
  weekRail: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  weekDay: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.card,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  weekDayBusy: {
    backgroundColor: 'rgba(32,246,181,0.14)',
    borderColor: 'rgba(32,246,181,0.32)',
  },
  weekDayName: {
    color: vibrantTheme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  weekDayNameBusy: {
    color: vibrantTheme.colors.primary,
  },
  weekDayNumber: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  weekDayNumberBusy: {
    color: vibrantTheme.colors.text,
  },
  weekDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'transparent',
    marginTop: 7,
  },
  weekDotBusy: {
    backgroundColor: vibrantTheme.colors.primary,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: vibrantTheme.colors.card,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    borderRadius: 22,
    padding: 16,
    marginTop: 16,
  },
  nextIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,246,181,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(32,246,181,0.24)',
  },
  nextBody: { flex: 1 },
  nextTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  nextDesc: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  timeline: {
    gap: 16,
    marginTop: 20,
  },
  dayGroup: {
    gap: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  dayTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  daySubtitle: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dayTotal: {
    color: vibrantTheme.colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,246,181,0.14)',
  },
  brandMarkDanger: {
    backgroundColor: 'rgba(255,77,109,0.16)',
  },
  brandMarkWarning: {
    backgroundColor: 'rgba(251,191,36,0.14)',
  },
  brandMarkText: {
    color: vibrantTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  paymentMain: { flex: 1 },
  paymentName: {
    color: vibrantTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  paymentMeta: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  paymentAmountBlock: {
    alignItems: 'flex-end',
    maxWidth: 118,
  },
  paymentAmount: {
    color: vibrantTheme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  paymentStatus: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  paymentStatusDanger: {
    color: vibrantTheme.colors.danger,
  },
  paymentStatusWarning: {
    color: vibrantTheme.colors.warning,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: vibrantTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: vibrantTheme.colors.border,
    padding: 24,
    marginTop: 20,
    minHeight: 190,
  },
  centerTitle: {
    color: vibrantTheme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  centerText: {
    color: vibrantTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: vibrantTheme.colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  retryButtonText: {
    color: vibrantTheme.colors.darkText,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default PaymentCalendarScreen;
